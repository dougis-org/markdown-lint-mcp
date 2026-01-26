import logger from './logger.js';

/**
 * Module-level state tracking fallback API usage.
 * Note: This is not thread-safe and is intended for debugging/observability only.
 * In concurrent scenarios, consider using a more robust state management pattern.
 */
let fallbackCount = 0;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MarkdownlintModule = any;

/**
 * Normalize import and return the usable markdownlint object
 */
async function loadMarkdownlint(): Promise<MarkdownlintModule> {
  const md = await import('markdownlint');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidate = (md as any).default ?? md;
  return candidate as MarkdownlintModule;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runLint(options: unknown): Promise<any> {
  const candidate = await loadMarkdownlint();

  if (candidate && typeof candidate.sync === 'function') {
    logger.debug('markdownlint: using sync API');
    return candidate.sync(options);
  }

  if (candidate && typeof candidate.promise === 'function') {
    logger.warn('markdownlint: sync API missing, using promise API fallback');
    fallbackCount++;
    return await candidate.promise(options);
  }

  // Check if candidate itself is callable (for default export as function)
  if (typeof candidate === 'function') {
    try {
      logger.warn('markdownlint: module is callable; attempting to call as function (promise)');
      fallbackCount++;
      return await candidate(options);
    } catch (error) {
      logger.warn(
        'markdownlint: callable module invocation failed; falling back to unsupported API error',
        error
      );
    }
  }

  // Check if candidate.default is callable (for { default: async function })
  if (candidate && typeof candidate.default === 'function') {
    try {
      logger.warn('markdownlint: module has callable default; attempting to call (promise)');
      fallbackCount++;
      return await candidate.default(options);
    } catch (error) {
      logger.warn(
        'markdownlint: callable default invocation failed; falling back to unsupported API error',
        error
      );
    }
  }

  throw new Error('Unsupported markdownlint API shape (no sync/promise/callable export)');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runFix(options: unknown): Promise<any> {
  const optsWithFix = Object.assign({}, options, { fix: true });
  return await runLint(optsWithFix);
}

export function getFallbackCount(): number {
  return fallbackCount;
}

export function resetFallbackCount(): void {
  fallbackCount = 0;
}
