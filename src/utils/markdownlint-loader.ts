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
 * Try to import ESM sync subpath (markdownlint 0.40.0+).
 * Returns the module and success indicator, or null if unavailable.
 */
async function tryImportSyncSubpath(
  errors: string[]
): Promise<{ module: unknown; success: boolean }> {
  try {
    logger.debug('markdownlint: attempting ESM subpath import markdownlint/sync');
    const syncModule = await import('markdownlint/sync');
    if (syncModule && typeof syncModule.lint === 'function') {
      logger.debug('markdownlint: successfully imported markdownlint/sync with lint export');
      return { module: syncModule as unknown as MarkdownlintModule, success: true };
    }
    errors.push('markdownlint/sync exists but does not export lint function');
  } catch (error) {
    errors.push(`markdownlint/sync import failed: ${(error as Error).message}`);
  }
  return { module: null, success: false };
}

/**
 * Try to import ESM promise subpath (markdownlint 0.40.0+).
 * Returns the module and success indicator, or null if unavailable.
 */
async function tryImportPromiseSubpath(
  errors: string[]
): Promise<{ module: unknown; success: boolean }> {
  try {
    logger.debug('markdownlint: attempting ESM subpath import markdownlint/promise');
    const promiseModule = await import('markdownlint/promise');
    if (promiseModule && typeof promiseModule.lint === 'function') {
      logger.warn(
        'markdownlint: ESM sync subpath unavailable, falling back to markdownlint/promise'
      );
      fallbackCount++;
      return { module: promiseModule as unknown as MarkdownlintModule, success: true };
    }
    errors.push('markdownlint/promise exists but does not export lint function');
  } catch (error) {
    errors.push(`markdownlint/promise import failed: ${(error as Error).message}`);
  }
  return { module: null, success: false };
}

/**
 * Check for legacy sync export on the given module candidate.
 * Returns true and logs if found, incrementing fallback counter if needed.
 */
function tryLegacySyncExport(candidate: unknown, errors: string[]): boolean {
  if (candidate && typeof (candidate as Record<string, unknown>).sync === 'function') {
    logger.warn('markdownlint: using legacy module-level sync export');
    return true;
  }
  return false;
}

/**
 * Check for legacy promise/callable exports on the given module candidate.
 * Returns the detected API type ('legacy-async' or null) and increments fallback if detected.
 */
function tryLegacyAsyncExport(candidate: unknown, errors: string[]): 'legacy-async' | null {
  const mod = candidate as Record<string, unknown>;

  // Check for legacy .promise export
  if (typeof mod.promise === 'function') {
    logger.warn('markdownlint: using legacy module-level promise export');
    fallbackCount++;
    return 'legacy-async';
  }

  // Check if candidate itself is callable (legacy default export as function)
  if (typeof candidate === 'function') {
    logger.warn('markdownlint: using legacy callable default export');
    fallbackCount++;
    return 'legacy-async';
  }

  // Check if candidate.default is callable (legacy { default: async function })
  if (typeof mod.default === 'function') {
    logger.warn('markdownlint: using legacy callable .default export');
    fallbackCount++;
    return 'legacy-async';
  }

  return null;
}

/**
 * Try to import and detect legacy module-level exports (backward compatibility).
 * Returns the module and detected API path, or null if unavailable.
 */
async function tryImportLegacyModule(
  errors: string[]
): Promise<{ module: unknown; apiPath: 'legacy-sync' | 'legacy-async' | null; success: boolean }> {
  try {
    logger.debug('markdownlint: attempting legacy module import');
    const md = await import('markdownlint');
    const candidate = (md as Record<string, unknown>).default ?? md;

    if (tryLegacySyncExport(candidate, errors)) {
      return { module: candidate, apiPath: 'legacy-sync', success: true };
    }

    const asyncApiPath = tryLegacyAsyncExport(candidate, errors);
    if (asyncApiPath) {
      return { module: candidate as Markdownlint, apiPath: asyncApiPath, success: true };
    }
  } catch (error) {
    errors.push(`legacy module import failed: ${(error as Error).message}`);
  }
  return { module: null, apiPath: null, success: false };
}

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
  const syncResult = await tryImportSyncSubpath(errors);
  if (syncResult.success) {
    return {
      module: syncResult.module,
      apiPath: 'sync',
      errors: [],
    };
  }

  // Step 2: Try markdownlint/promise (ESM subpath)
  const promiseResult = await tryImportPromiseSubpath(errors);
  if (promiseResult.success) {
    return {
      module: promiseResult.module,
      apiPath: 'async',
      errors: errors,
    };
  }

  // Step 3: Try legacy module-level exports (backward compatibility)
  const legacyResult = await tryImportLegacyModule(errors);
  if (legacyResult.success && legacyResult.apiPath) {
    return {
      module: legacyResult.module,
      apiPath: legacyResult.apiPath,
      errors: errors,
    };
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

/**
 * Invoke a lint function, handling both sync and async return values.
 * @param lintFn - The lint function to invoke
 * @param options - Options to pass to the lint function
 * @returns Promise that resolves to LintResults
 */
async function invokeLintFunction(lintFn: Function, options: Options): Promise<LintResults> {
  const result = lintFn(options);
  // If result is a promise, await it
  if (result instanceof Promise) {
    return await result;
  }
  return result as LintResults;
}

/**
 * Execute the lint function from an ESM subpath module (sync or async).
 * @param module - The imported markdownlint module
 * @param options - Options to pass to lint
 * @returns Promise that resolves to LintResults
 */
async function runLintFromSubpath(module: Record<string, unknown>, options: Options): Promise<LintResults> {
  const lintFn = module.lint as unknown;
  if (typeof lintFn === 'function') {
    return invokeLintFunction(lintFn as Function, options);
  }
  throw new Error('Unsupported markdownlint API shape (lint export not found)');
}

/**
 * Execute the lint function from a legacy module export.
 * Tries multiple export shapes: .sync, .promise, callable, .default callable.
 * @param module - The imported markdownlint module
 * @param candidate - The candidate module (module or module.default)
 * @param options - Options to pass to lint
 * @returns Promise that resolves to LintResults
 */
async function runLintFromLegacy(
  module: Record<string, unknown>,
  candidate: unknown,
  options: Options
): Promise<LintResults> {
  // Try .sync export
  if (typeof module.sync === 'function') {
    return await invokeLintFunction(module.sync as Function, options);
  }

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

  throw new Error('Unsupported markdownlint API shape (unable to invoke lint function)');
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

  const module = candidate as Record<string, unknown>;

  // ESM sync subpath or async subpath
  if (apiPath === 'sync' || apiPath === 'async') {
    return runLintFromSubpath(module, options);
  }

  // Legacy async paths
  if (apiPath === 'legacy-sync' || apiPath === 'legacy-async') {
    return runLintFromLegacy(module, candidate, options);
  }

  throw new Error('Unsupported markdownlint API shape (unknown apiPath)');
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
