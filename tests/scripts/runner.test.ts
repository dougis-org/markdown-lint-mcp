import { execFileSync } from 'child_process';
import path from 'path';

describe('scripts/markdownlint-runner', () => {
  it('ignores dangerous config keys like customRules and does not throw', () => {
    const script = path.join(process.cwd(), 'scripts', 'markdownlint-runner.mjs');

    const input = {
      strings: { 'test.md': '# Title\n\nSome text' },
      config: { customRules: ['./does-not-exist.js'], MD041: false },
    };

    const out = execFileSync('node', [script], {
      input: JSON.stringify(input),
      encoding: 'utf8',
      maxBuffer: 200_000,
    });

    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out);
    expect(parsed).toBeDefined();
  });
});