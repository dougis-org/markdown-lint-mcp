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
});