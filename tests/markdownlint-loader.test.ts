import { jest, describe, it, expect, beforeEach } from '@jest/globals';

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
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => ({
          lint: (_opts: unknown) => ({
            'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'sync' }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD999']);
        expect(loader.getFallbackCount()).toBe(0); // No fallback used
      });
    });

    it('should fall back to promise API from markdownlint/promise when sync unavailable', async () => {
      await jest.isolateModulesAsync(async () => {
        // Simulate sync import failure
        jest.doMock('markdownlint/sync', () => {
          throw new Error('markdownlint/sync not available');
        });

        jest.doMock('markdownlint/promise', () => ({
          lint: async (_opts: unknown) => ({
            'file.md': [{ lineNumber: 2, ruleNames: ['MD998'], errorDetail: 'promise' }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD998']);
        expect(loader.getFallbackCount()).toBe(1); // Fallback was used
      });
    });

    it('should fall back to promise API when sync missing lint export', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => ({})); // Empty object, no lint

        jest.doMock('markdownlint/promise', () => ({
          lint: async (_opts: unknown) => ({
            'file.md': [{ lineNumber: 3, ruleNames: ['MD997'], errorDetail: 'promise' }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD997']);
        expect(loader.getFallbackCount()).toBe(1);
      });
    });

    it('should throw actionable error when both sync and promise fail', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => {
          throw new Error('sync not available');
        });

        jest.doMock('markdownlint/promise', () => {
          throw new Error('promise not available');
        });

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        await expect(loader.runLint({ strings: { 'file.md': 'x' }, config: {} })).rejects.toThrow(
          /attempted.*markdownlint\/sync.*markdownlint\/promise/i
        );
      });
    });
  });

  describe('backward compatibility with legacy API shapes', () => {
    it('should handle module-level sync export (legacy)', async () => {
      await jest.isolateModulesAsync(async () => {
        // Simulate both subpath imports unavailable, fallback to legacy module export
        jest.doMock('markdownlint/sync', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint/promise', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint', () => ({
          sync: (_opts: unknown) => ({
            'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'legacy' }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD999']);
        expect(loader.getFallbackCount()).toBe(0); // Legacy sync, no fallback counter
      });
    });

    it('should handle module-level promise export (legacy)', async () => {
      await jest.isolateModulesAsync(async () => {
        // Simulate both subpath imports unavailable, fallback to legacy .promise export
        jest.doMock('markdownlint/sync', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint/promise', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint', () => ({
          promise: async (_opts: unknown) => ({
            'file.md': [{ lineNumber: 1, ruleNames: ['MD996'], errorDetail: 'legacy promise' }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD996']);
        expect(loader.getFallbackCount()).toBe(1); // Legacy async, increment fallback
      });
    });

    it('should handle callable module (legacy)', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint/promise', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint', () =>
          // Default export is the callable function itself
          async (options: unknown) => ({
            'file.md': [{ ruleNames: ['MD995'], lineNumber: 1 }],
          })
        );

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD995']);
        expect(loader.getFallbackCount()).toBe(1); // Callable is async, increment fallback
      });
    });

    it('should handle object with callable default property (legacy)', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint/promise', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint', () => ({
          default: async (options: unknown) => ({
            'file.md': [{ ruleNames: ['MD994'], lineNumber: 1 }],
          }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
        expect(res['file.md'][0].ruleNames).toEqual(['MD994']);
        expect(loader.getFallbackCount()).toBe(1); // Object with callable default is async, increment fallback
      });
    });
  });

  describe('fix operation', () => {
    it('should set fix option in runFix with sync API', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => ({
          lint: (_options: unknown) => ({ calledWith: _options }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        const res = await loader.runFix({ strings: { 'file.md': 'x' }, config: {} });
        expect(res.calledWith).toHaveProperty('fix', true);
      });
    });

    it('should set fix option in runFix with async fallback', async () => {
      await jest.isolateModulesAsync(async () => {
        jest.doMock('markdownlint/sync', () => {
          throw new Error('Not found');
        });

        jest.doMock('markdownlint/promise', () => ({
          lint: async (_options: unknown) => ({ calledWith: _options }),
        }));

        const loader = await import('../src/utils/markdownlint-loader');
        loader.resetFallbackCount();
        const res = await loader.runFix({ strings: { 'file.md': 'x' }, config: {} });
        expect(res.calledWith).toHaveProperty('fix', true);
        expect(loader.getFallbackCount()).toBe(1);
      });
    });
  });
});
