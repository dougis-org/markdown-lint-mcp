import { jest } from '@jest/globals';

// Tests for the markdownlint loader (RED first — loader implemented)

describe('markdownlint-loader (shape detection)', () => {
  test('loader module should export runLint and runFix', async () => {
    // Ensure the module exists and exports expected functions
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const loader = require('../src/utils/markdownlint-loader');
    expect(loader).toHaveProperty('runLint');
    expect(loader).toHaveProperty('runFix');
  });

  test('uses sync API when available', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      // Mock markdownlint with sync
      jest.doMock('markdownlint', () => ({
        sync: (opts: any) => ({ 'file.md': [{ lineNumber: 1, ruleNames: ['MD999'], errorDetail: 'sync' }] }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD999']);
    });
  });

  test('falls back to promise API when sync not available', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      // Mock markdownlint with promise
      jest.doMock('markdownlint', () => ({
        promise: async (opts: any) => ({ 'file.md': [{ lineNumber: 2, ruleNames: ['MD998'], errorDetail: 'promise' }] }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      // reset fallback counter
      loader.resetFallbackCount();
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD998']);
      expect(loader.getFallbackCount()).toBeGreaterThanOrEqual(1);
    });
  });

  test('throws on unsupported shapes', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      jest.doMock('markdownlint', () => ({}));

      const loader = await import('../src/utils/markdownlint-loader');
      loader.resetFallbackCount();
      await expect(loader.runLint({})).rejects.toThrow('Unsupported markdownlint API shape');
      expect(loader.getFallbackCount()).toBe(0);
    });
  });

  test('handles callable default module shape', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      // Mock callable module (function export)
      jest.doMock('markdownlint', () => (opts: any) => Promise.resolve({ 'file.md': [{ lineNumber: 3, ruleNames: ['MD997'] }] }));

      const loader = await import('../src/utils/markdownlint-loader');
      const res = await loader.runLint({ strings: { 'file.md': 'x' }, config: {} });
      expect(res['file.md'][0].ruleNames).toEqual(['MD997']);
    });
  });

  test('runFix sets fix option', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.resetModules();
      // Mock sync that echoes options
      jest.doMock('markdownlint', () => ({
        sync: (opts: any) => ({ calledWith: opts }),
      }));

      const loader = await import('../src/utils/markdownlint-loader');
      const res = await loader.runFix({ strings: { 'file.md': 'x' }, config: {} });
      expect(res.calledWith).toHaveProperty('fix', true);
    });
  });
});
