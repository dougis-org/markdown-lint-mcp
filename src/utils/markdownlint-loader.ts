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
 * - A sync function at the top level
 * - A promise function at the top level
 * - A default export with sync/promise methods
 * - A callable function directly
 */
interface MarkdownlintModule {
  sync?: (options: Options) => { [filename: string]: LintResult[] };
  promise?: (options: Options) => Promise<{ [filename: string]: LintResult[] }>;
  default?: Markdownlint | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>);
  [key: string]: unknown;
}

/**
 * Normalize import and return the usable markdownlint object
 */
async function loadMarkdownlint(): Promise<
  MarkdownlintModule | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>)
> {
  const md = await import('markdownlint');
  const candidate = (md as Record<string, unknown>).default ?? md;
  return candidate as
    | MarkdownlintModule
    | ((options: Options) => Promise<{ [filename: string]: LintResult[] }>);
}

export async function runLint(options: Options): Promise<{ [filename: string]: LintResult[] }> {
  const candidate = await loadMarkdownlint();

  if (candidate && typeof (candidate as MarkdownlintModule).sync === 'function') {
    logger.debug('markdownlint: using sync API');
    return (candidate as MarkdownlintModule).sync!(options);
  }

  if (candidate && typeof (candidate as MarkdownlintModule).promise === 'function') {
    logger.warn('markdownlint: sync API missing, using promise API fallback');
    fallbackCount++;
    return await (candidate as MarkdownlintModule).promise!(options);
  }

  // Check if candidate itself is callable (for default export as function)
  if (typeof candidate === 'function') {
    try {
      logger.warn('markdownlint: module is callable; attempting to call as function (promise)');
      fallbackCount++;
      return await (
        candidate as (options: Options) => Promise<{ [filename: string]: LintResult[] }>
      )(options);
    } catch (error) {
      logger.warn(
        'markdownlint: callable module invocation failed; falling back to unsupported API error',
        error
      );
    }
  }

  // Check if candidate.default is callable (for { default: async function })
  if (candidate && typeof (candidate as MarkdownlintModule).default === 'function') {
    try {
      logger.warn('markdownlint: module has callable default; attempting to call (promise)');
      fallbackCount++;
      const defaultFn = (candidate as MarkdownlintModule).default as (
        options: Options,
      ) => Promise<{ [filename: string]: LintResult[] }>;
      return await defaultFn(options);
    } catch (error) {
      logger.warn(
        'markdownlint: callable default invocation failed; falling back to unsupported API error',
        error
      );
    }
  }

  throw new Error('Unsupported markdownlint API shape (no sync/promise/callable export)');
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
