import logger from './logger.js';

let fallbackCount = 0;

export type MarkdownlintModule = any;

/**
 * Normalize import and return the usable markdownlint object
 */
async function loadMarkdownlint(): Promise<MarkdownlintModule> {
  const md = await import('markdownlint');
  const candidate = (md as any).default ?? md;
  return candidate as MarkdownlintModule;
}

export async function runLint(options: any): Promise<any> {
  const candidate = await loadMarkdownlint();

  if (candidate && typeof candidate.sync === 'function') {
    logger.info('markdownlint: using sync API');
    return candidate.sync(options);
  }

  if (candidate && typeof candidate.promise === 'function') {
    logger.warn('markdownlint: sync API missing, using promise API fallback');
    fallbackCount++;
    return await candidate.promise(options);
  }

  // Some modules might be callable as default function returning a promise
  if (typeof candidate === 'function') {
    try {
      logger.warn('markdownlint: module is callable; attempting to call as function (promise)');
      fallbackCount++;
      return await candidate(options);
    } catch {
      // fall through to error
    }
  }

  throw new Error('Unsupported markdownlint API shape (no sync/promise/callable export)');
}

export async function runFix(options: any): Promise<any> {
  const optsWithFix = Object.assign({}, options, { fix: true });
  return await runLint(optsWithFix);
}

export function getFallbackCount(): number {
  return fallbackCount;
}

export function resetFallbackCount(): void {
  fallbackCount = 0;
}
