import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { loadConfiguration, getDefaultConfig } from '../../src/utils/file';

describe('file utils - loadConfiguration safety', () => {
  it('reads .markdownlint.json from a safe directory', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mlint-'));
    const cfgPath = path.join(tmp, '.markdownlint.json');
    await fs.writeFile(cfgPath, JSON.stringify({ MD041: false }));

    const cfg = await loadConfiguration(tmp);
    expect(cfg.MD041).toBe(false);

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it('does not read config from directory outside workspace root', async () => {
    const outside = path.resolve(process.cwd(), '..');
    const cfg = await loadConfiguration(outside);
    expect(cfg).toEqual(getDefaultConfig());
  });

  it('rejects symlink inside workspace that points outside workspace', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mlint-out-'));
    const outsideCfg = path.join(outside, '.markdownlint.json');
    await fs.writeFile(outsideCfg, JSON.stringify({ MD041: false }));

    const linkPath = path.join(process.cwd(), 'tmp-outside-link');
    try {
      // Ensure no existing link
      await fs.rm(linkPath, { recursive: true, force: true });
      await fs.symlink(outside, linkPath, 'dir');

      const cfg = await loadConfiguration(linkPath);
      expect(cfg).toEqual(getDefaultConfig());
    } finally {
      // cleanup
      await fs.rm(linkPath, { recursive: true, force: true });
      await fs.rm(outside, { recursive: true, force: true });
    }
  });

  it('accepts an absolute path that is inside the workspace', async () => {
    const local = path.join(process.cwd(), 'tmp-local-dir');
    try {
      await fs.rm(local, { recursive: true, force: true });
      await fs.mkdir(local);
      await fs.writeFile(path.join(local, '.markdownlint.json'), JSON.stringify({ MD041: false }));

      const cfg = await loadConfiguration(local);
      expect(cfg.MD041).toBe(false);
    } finally {
      await fs.rm(local, { recursive: true, force: true });
    }
  });
});