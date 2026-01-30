import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import {
  testFixtures,
  setupMarkdownlintMocks,
  runWithMockedLoader,
  assertLintResult,
} from './helpers/markdownlint-loader-test-helper';

// Tests for the markdownlint loader

describe('markdownlint-loader (ESM subpath imports)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export runLint and runFix', async () => {
    const loader = await import('../src/utils/markdownlint-loader');
    expect(loader).toHaveProperty('runLint');
    expect(loader).toHaveProperty('runFix');
  });

  /**
   * Test scenarios for ESM subpath import strategy.
   * Each test exercises a different combination of:
   * - markdownlint/sync availability and exports
   * - markdownlint/promise availability and exports
   * - Expected API path chosen (sync | async | error)
   * - Fallback counter behavior
   *
   * Note: Tests use jest mocks with isolateModulesAsync to simulate different API shapes.
   */
  describe('parameterized subpath import scenarios', () => {
    it('should use sync API from markdownlint/sync when available', async () => {
      await runWithMockedLoader(
        {
          syncModule: {
            implementation: (_opts: unknown) => testFixtures.syncResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD999'], 0, () => loader.getFallbackCount());
        }
      );
    });

    it('should fall back to promise API when sync unavailable', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: {
            implementation: async (_opts: unknown) => testFixtures.promiseResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD998'], 1, () => loader.getFallbackCount());
        }
      );
    });

    it('should fall back to promise API when sync missing lint export', async () => {
      await runWithMockedLoader(
        {
          syncModule: {
            implementation: undefined,
          },
          promiseModule: {
            implementation: async (_opts: unknown) => testFixtures.promiseResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD998'], 1, () => loader.getFallbackCount());
        }
      );
    });

    it('should throw actionable error when both sync and promise fail', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: { shouldThrow: true },
        },
        async (loader) => {
          await expect(loader.runLint(testFixtures.testOptions)).rejects.toThrow(
            /attempted.*markdownlint\/sync.*markdownlint\/promise/i
          );
        }
      );
    });
  });

  describe('backward compatibility with legacy API shapes', () => {
    it('should handle module-level sync export (legacy)', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: { shouldThrow: true },
          legacyModule: {
            sync: (_opts: unknown) => testFixtures.legacySyncResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD999'], 0, () => loader.getFallbackCount());
        }
      );
    });

    it('should handle module-level promise export (legacy)', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: { shouldThrow: true },
          legacyModule: {
            promise: async (_opts: unknown) => testFixtures.legacyPromiseResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD996'], 1, () => loader.getFallbackCount());
        }
      );
    });

    it('should handle callable module (legacy)', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: { shouldThrow: true },
          legacyModule: {
            callable: async (options: unknown) => testFixtures.legacyCallableResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD995'], 1, () => loader.getFallbackCount());
        }
      );
    });

    it('should handle object with callable default property (legacy)', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: { shouldThrow: true },
          legacyModule: {
            callableAsDefault: async (options: unknown) => testFixtures.legacyDefaultResult,
          },
        },
        async (loader) => {
          const res = await loader.runLint(testFixtures.testOptions);
          assertLintResult(res, ['MD994'], 1, () => loader.getFallbackCount());
        }
      );
    });
  });

  describe('fix operation', () => {
    it('should set fix option in runFix with sync API', async () => {
      await runWithMockedLoader(
        {
          syncModule: {
            implementation: (_options: unknown) => ({ calledWith: _options }),
          },
        },
        async (loader) => {
          const res = await loader.runFix(testFixtures.testOptions);
          expect(res.calledWith).toHaveProperty('fix', true);
        }
      );
    });

    it('should set fix option in runFix with async fallback', async () => {
      await runWithMockedLoader(
        {
          syncModule: { shouldThrow: true },
          promiseModule: {
            implementation: async (_options: unknown) => ({ calledWith: _options }),
          },
        },
        async (loader) => {
          const res = await loader.runFix(testFixtures.testOptions);
          expect(res.calledWith).toHaveProperty('fix', true);
          expect(loader.getFallbackCount()).toBe(1);
        }
      );
    });
  });
});
