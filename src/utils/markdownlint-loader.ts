import logger from './logger.js';
import type { Markdownlint, Options, LintResults } from 'markdownlint';

/**
 * Module-level state tracking fallback API usage.
 * Note: This is not thread-safe and is intended for debugging/observability only.
 * In concurrent scenarios, consider using a more robust state management pattern.
 */
let fallbackCount = 0;

/**
 * Type describing the possible module export shapes for markdownlint.
 * Includes both ESM subpath exports (which use `lint` directly) and legacy module exports.
 * Using `unknown` to allow any module shape since different versions have different APIs.
 */
type MarkdownlintModule = unknown;

/**
 * Attempt to import from ESM subpath exports (markdownlint 0.40.0+).
 * Priority order:
 * 1. markdownlint/sync (preferred - deterministic, synchronous)
 * 2. markdownlint/promise (fallback - async, but more compatible)
 * 3. Legacy module-level exports (backward compatibility)
 */
async function loadMarkdownlint(): Promise<{
  module: unknown;
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
        module: syncModule as unknown as MarkdownlintModule,
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
        module: promiseModule as unknown as MarkdownlintModule,
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
    if (candidate && typeof (candidate as Record<string, unknown>).sync === 'function') {
      logger.warn('markdownlint: using legacy module-level sync export');
      return {
        module: candidate,
        apiPath: 'legacy-sync',
        errors: errors,
      };
    }

    // Check for legacy .promise export
    if (candidate && typeof (candidate as Record<string, unknown>).promise === 'function') {
      logger.warn('markdownlint: using legacy module-level promise export');
      fallbackCount++;
      return {
        module: candidate as Markdownlint,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }

    // Check if candidate itself is callable (legacy default export as function)
    if (typeof candidate === 'function') {
      logger.warn('markdownlint: using legacy callable default export');
      fallbackCount++;
      return {
        module: candidate,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }

    // Check if candidate.default is callable (legacy { default: async function })
    if (candidate && typeof (candidate as Record<string, unknown>).default === 'function') {
      logger.warn('markdownlint: using legacy callable .default export');
      fallbackCount++;
      return {
        module: candidate,
        apiPath: 'legacy-async',
        errors: errors,
      };
    }
  } catch (error) {
    errors.push(`legacy module import failed: ${(error as Error).message}`);
  }

  // All import paths exhausted
  const errorSummary = errors.join('; ');
  const message =
    `Unsupported markdownlint API shape. Attempted: /sync, /promise, legacy. ` +
    `Details: ${errorSummary}`;
  logger.error(message);
  return {
    module: {},
    apiPath: 'error',
    errors: errors,
  };
}

export async function runLint(options: Options): Promise<LintResults> {
  const { module: candidate, apiPath, errors } = await loadMarkdownlint();

  if (apiPath === 'error') {
    const errorDetails = errors.join('; ');
    const errorMsg =
      `Unsupported markdownlint API shape. Attempted: /sync, /promise, legacy. ` +
      `Errors: ${errorDetails}`;
    throw new Error(errorMsg);
  }

  // ESM sync subpath or legacy sync
  if (apiPath === 'sync' || apiPath === 'legacy-sync') {
    const module = candidate as Record<string, unknown>;
    const lintFn = (module.lint ?? module.sync) as unknown;
    if (typeof lintFn === 'function') {
      const result = (lintFn as Function)(options);
      // If result is a promise, await it
      if (result instanceof Promise) {
        return await result;
      }
      return result as LintResults;
    }
  }

  // ESM async subpath
  if (apiPath === 'async') {
    const module = candidate as Record<string, unknown>;
    const lintFn = module.lint as unknown;
    if (typeof lintFn === 'function') {
      const result = (lintFn as Function)(options);
      // If result is a promise, await it
      if (result instanceof Promise) {
        return await result;
      }
      return result as LintResults;
    }
  }

  // Legacy async paths
  if (apiPath === 'legacy-async') {
    const module = candidate as Record<string, unknown>;

    // Try .promise export
    if (typeof module.promise === 'function') {
      return await (module.promise as Function)(options);
    }

    // Try callable module/default (allow errors to propagate to caller)
    if (typeof candidate === 'function') {
      return await (candidate as (options: Options | null) => Promise<LintResults>)(options);
    }

    if (typeof module.default === 'function') {
      return await (module.default as (options: Options | null) => Promise<LintResults>)(options);
    }
  }

  throw new Error('Unsupported markdownlint API shape (unable to invoke lint function)');
}

export async function runFix(options: Options): Promise<LintResults> {
  const optsWithFix = Object.assign({}, options, { fix: true }) as Options;
  return await runLint(optsWithFix);
}

export function getFallbackCount(): number {
  return fallbackCount;
}

export function resetFallbackCount(): void {
  fallbackCount = 0;
}
