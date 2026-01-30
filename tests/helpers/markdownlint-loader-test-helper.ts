/**
 * Test helper utilities for markdownlint-loader tests.
 * Centralizes common test setup patterns to reduce duplication and complexity.
 */
import { jest } from '@jest/globals';
import type { Options, LintResults } from 'markdownlint';

/**
 * Mock module shape for a working markdownlint API.
 */
interface MockLintFunction {
  (_options: unknown): LintResults | Promise<LintResults>;
}

/**
 * Common test data fixtures
 */
export const testFixtures = {
  syncResult: { 'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'sync' }] },
  promiseResult: { 'file.md': [{ lineNumber: 2, ruleNames: ['MD998'], errorDetail: 'promise' }] },
  legacySyncResult: {
    'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'legacy' }],
  },
  legacyPromiseResult: {
    'file.md': [{ lineNumber: 1, ruleNames: ['MD996'], errorDetail: 'legacy promise' }],
  },
  legacyCallableResult: { 'file.md': [{ ruleNames: ['MD995'], lineNumber: 1 }] },
  legacyDefaultResult: { 'file.md': [{ ruleNames: ['MD994'], lineNumber: 1 }] },
  testOptions: { strings: { 'file.md': 'x' }, config: {} },
};

/**
 * Setup helper for mocking markdownlint modules in isolated module contexts.
 * Centralizes the repetitive pattern of mocking subpath and legacy imports.
 *
 * @param mocks - Configuration object specifying which modules to mock and how
 */
export async function setupMarkdownlintMocks(mocks: {
  syncModule?: { implementation?: MockLintFunction; shouldThrow?: boolean };
  promiseModule?: { implementation?: MockLintFunction; shouldThrow?: boolean };
  legacyModule?: {
    sync?: MockLintFunction;
    promise?: MockLintFunction;
    callable?: MockLintFunction;
    callableAsDefault?: MockLintFunction;
  };
}): Promise<void> {
  // Mock ESM sync subpath
  if (mocks.syncModule !== undefined) {
    if (mocks.syncModule.shouldThrow) {
      jest.doMock('markdownlint/sync', () => {
        throw new Error('Not found');
      });
    } else {
      jest.doMock('markdownlint/sync', () => ({
        lint: mocks.syncModule!.implementation,
      }));
    }
  }

  // Mock ESM promise subpath
  if (mocks.promiseModule !== undefined) {
    if (mocks.promiseModule.shouldThrow) {
      jest.doMock('markdownlint/promise', () => {
        throw new Error('Not found');
      });
    } else {
      jest.doMock('markdownlint/promise', () => ({
        lint: mocks.promiseModule!.implementation,
      }));
    }
  }

  // Mock legacy module
  if (mocks.legacyModule !== undefined) {
    const legacyExports: Record<string, unknown> = {};

    if (mocks.legacyModule.sync) {
      legacyExports.sync = mocks.legacyModule.sync;
    }
    if (mocks.legacyModule.promise) {
      legacyExports.promise = mocks.legacyModule.promise;
    }
    if (mocks.legacyModule.callableAsDefault) {
      legacyExports.default = mocks.legacyModule.callableAsDefault;
    }

    // If only callable (no other exports), make the module itself the function
    if (mocks.legacyModule.callable && !mocks.legacyModule.sync && !mocks.legacyModule.promise) {
      jest.doMock('markdownlint', () => mocks.legacyModule!.callable);
    } else {
      jest.doMock('markdownlint', () => legacyExports);
    }
  }
}

/**
 * Execute a loader test in an isolated module context with specified mocks.
 *
 * @param mocks - Module mock configuration
 * @param testFn - Test function that receives the imported loader module
 * @returns Result of the test function
 */
export async function runWithMockedLoader<T>(
  mocks: Parameters<typeof setupMarkdownlintMocks>[0],
  testFn: (loader: any) => Promise<T>
): Promise<T> {
  return jest.isolateModulesAsync(async () => {
    await setupMarkdownlintMocks(mocks);
    const loader = await import('../../src/utils/markdownlint-loader');
    loader.resetFallbackCount();
    return testFn(loader);
  });
}

/**
 * Standard test assertion helper for verifying lint results and fallback counts.
 *
 * @param result - The result from runLint or runFix
 * @param expectedRuleNames - Array of expected rule names in result['file.md'][0]
 * @param expectedFallbackCount - Expected fallback count
 * @param fallbackCountGetter - Function to get current fallback count from loader
 */
export function assertLintResult(
  result: LintResults,
  expectedRuleNames: string[],
  expectedFallbackCount: number,
  fallbackCountGetter: () => number
): void {
  expect(result['file.md']).toBeDefined();
  expect(result['file.md'][0].ruleNames).toEqual(expectedRuleNames);
  expect(fallbackCountGetter()).toBe(expectedFallbackCount);
}
