import logger from './logger.js';
import type { Markdownlint, Options, LintResult } from 'markdownlint';

/**
 * Module-level state tracking fallback API usage.
 * Note: This is not thread-safe and is intended for debugging/observability only.
 * In concurrent scenarios, consider using a more robust state management pattern.
 */
let fallbackCount = 0;

/**
 * Interface describing the possible module export shapes for markdownlint.
 * The module can export:
 * - A lint function (ESM subpath export)
 * - A sync function at the top level
 * - A promise function at the top level
 * - A default export with sync/promise methods
 * - A callable function directly
 */
interface MarkdownlintModule {
  lint?: ((options: Options) => { [filename: string]: LintResult[] }) | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>);
  sync?: (options: Options) => { [filename: string]: LintResult[] };
  promise?: (options: Options) => Promise<{ [filename: string]: LintResult[] }>;
  default?: Markdownlint | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>);
  [key: string]: unknown;
}

/**
 * Attempt to import from ESM subpath exports (markdownlint 0.40.0+).
 * Priority order:
 * 1. markdownlint/sync (preferred - deterministic, synchronous)
 * 2. markdownlint/promise (fallback - async, but more compatible)
 * 3. Legacy module-level exports (backward compatibility)
 */
async function loadMarkdownlint(): Promise<{
  module:
    | MarkdownlintModule
    | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>);
  apiPath: 'sync' | 'async' | 'legacy-sync' | 'legacy-async' | 'error';
  errors: string[];
}> {
  const errors: string[] = [];

  // Step 1: Try markdownlint/sync (ESM subpath)
  try {
    logger.debug('markdownlint: attempting ESM subpath import markdownlint/sync');
    const syncModule = await import('markdownlint/sync');
    if (syncModule && typeof syncModule.lint === 'function') {
      logger.debug('markdownlint: successfully imported markdownlint/sync with lint export');
      return {
        module: syncModule as MarkdownlintModule,
        apiPath: 'sync',
        errors: [],
      };
    }
    errors.push('markdownlint/sync exists but does not export lint function');
  } catch (error) {
    errors.push(`markdownlint/sync import failed: ${(error as Error).message}`);
  }

  // Step 2: Try markdownlint/promise (ESM subpath)
  try {
    logger.debug('markdownlint: attempting ESM subpath import markdownlint/promise');
    const promiseModule = await import('markdownlint/promise');
    if (promiseModule && typeof promiseModule.lint === 'function') {
      logger.warn(
        'markdownlint: ESM sync subpath unavailable, falling back to markdownlint/promise'
      );
      fallbackCount++;
      return {
        module: promiseModule as MarkdownlintModule,
        apiPath: 'async',
        errors: errors,
      };
    }
    errors.push('markdownlint/promise exists but does not export lint function');
  } catch (error) {
    errors.push(`markdownlint/promise import failed: ${(error as Error).message}`);
  }

  // Step 3: Try legacy module-level exports (backward compatibility)
  try {
    logger.debug('markdownlint: attempting legacy module import');
    const md = await import('markdownlint');
    const candidate = (md as Record<string, unknown>).default ?? md;

    // Check for legacy .sync export
    if (candidate && typeof (candidate as MarkdownlintModule).sync === 'function') {
      logger.warn('markdownlint: using legacy module-level sync export');
      return {
        module: candidate as MarkdownlintModule,
        apiPath: 'legacy-sync',
        errors: errors,
      };
    }

    // Check for legacy .promise export
    if (candidate && typeof (candidate as MarkdownlintModule).promise === 'function') {
      logger.warn('markdownlint: using legacy module-level promise export');
      fallbackCount++;
      return {
        module: candidate as MarkdownlintModule,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }

    // Check if candidate itself is callable (legacy default export as function)
    if (typeof candidate === 'function') {
      logger.warn('markdownlint: using legacy callable default export');
      fallbackCount++;
      return {
        module: candidate as (options: Options) => Promise<{ [filename: string]: LintResult[] }>,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }

    // Check if candidate.default is callable (legacy { default: async function })
    if (candidate && typeof (candidate as MarkdownlintModule).default === 'function') {
      logger.warn('markdownlint: using legacy callable .default export');
      fallbackCount++;
      return {
        module: candidate as MarkdownlintModule,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }
  } catch (error) {
    errors.push(`legacy module import failed: ${(error as Error).message}`);
  }

  // All import paths exhausted
  const errorSummary = errors.join('; ');
  const message = `Unsupported markdownlint API shape. Attempted imports: markdownlint/sync, markdownlint/promise, markdownlint (legacy). Details: ${errorSummary}`;
  logger.error(message);
  return {
    module: {} as MarkdownlintModule,
    apiPath: 'error',
    errors: errors,
  };
}

export async function runLint(options: Options): Promise<{ [filename: string]: LintResult[] }> {
  const { module: candidate, apiPath, errors } = await loadMarkdownlint();

  if (apiPath === 'error') {
    const errorMsg = `Unsupported markdownlint API shape. Attempted imports: markdownlint/sync, markdownlint/promise, markdownlint (legacy). Errors: ${errors.join('; ')}`;
    throw new Error(errorMsg);
  }

  // ESM sync subpath or legacy sync
  if (apiPath === 'sync' || apiPath === 'legacy-sync') {
    const module = candidate as MarkdownlintModule;
    const lintFn = module.lint ?? module.sync;
    if (typeof lintFn === 'function') {
      const result = lintFn(options);
      // If result is a promise, await it
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }
  }

  // ESM async subpath
  if (apiPath === 'async') {
    const module = candidate as MarkdownlintModule;
    if (typeof module.lint === 'function') {
      const result = module.lint(options);
      // If result is a promise, await it
      if (result instanceof Promise) {
        return await result;
      }
      return result;
    }
  }

  // Legacy async paths
  if (apiPath === 'legacy-async') {
    const module = candidate as MarkdownlintModule;

    // Try .promise export
    if (typeof module.promise === 'function') {
      return await module.promise(options);
    }

    // Try callable module/default (allow errors to propagate to caller)
    if (typeof candidate === 'function') {
      return await (
        candidate as (options: Options) => Promise<{ [filename: string]: LintResult[] }>
      )(options);
    }

    if (typeof module.default === 'function') {
      return await (
        module.default as (options: Options) => Promise<{ [filename: string]: LintResult[] }>
      )(options);
    }
  }

  throw new Error('Unsupported markdownlint API shape (unable to invoke lint function)');
}

export async function runFix(options: Options): Promise<{ [filename: string]: LintResult[] }> {
  const optsWithFix = Object.assign({}, options, { fix: true }) as Options;
  return await runLint(optsWithFix);
}

export function getFallbackCount(): number {
  return fallbackCount;
}

export function resetFallbackCount(): void {
  fallbackCount = 0;
}
