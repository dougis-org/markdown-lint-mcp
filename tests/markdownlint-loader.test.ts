import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Tests for the markdownlint loader

describe('markdownlint-loader (shape detection)', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('should export runLint and runFix', async () => {
    const loader = await import('../src/utils/markdownlint-loader');
    expect(loader).toHaveProperty('runLint');
    expect(loader).toHaveProperty('runFix');
  });

  it('should use sync API when available', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('markdownlint', () => ({
        sync: (_opts: unknown) => ({
          'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'sync' }],
        }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD999']);
    });
  });

  it('should fall back to promise API when sync not available', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('markdownlint', () => ({
        promise: async (_opts: unknown) => ({
          'file.md': [{ lineNumber: 2, ruleNames: ['MD998'], errorDetail: 'promise' }],
        }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      loader.resetFallbackCount();
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD998']);
      expect(loader.getFallbackCount()).toBe(1);
    });
  });

  it('should throw on unsupported shapes', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('markdownlint', () => ({}));

      const loader = await import('../src/utils/markdownlint-loader');
      loader.resetFallbackCount();
      await expect(loader.runLint({})).rejects.toThrow('Unsupported markdownlint API shape');
      expect(loader.getFallbackCount()).toBe(0);
    });
  });

  it('should handle callable module shape', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('markdownlint', () => ({
        default: async (options: unknown) => ({
          'file.md': [{ ruleNames: ['MD997'], lineNumber: 1 }],
        }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      loader.resetFallbackCount();
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD997']);
      expect(loader.getFallbackCount()).toBe(1);
    });
  });

  it('should set fix option in runFix', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('markdownlint', () => ({
        sync: (_options: unknown) => ({ calledWith: _options }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      const res = await loader.runFix({ strings: { 'file.md': 'x' }, config: {} });
      expect(res.calledWith).toHaveProperty('fix', true);
    });
  });
});
