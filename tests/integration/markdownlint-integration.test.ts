import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';

describe('markdownlint integration (real package)', () => {
  it('runs the real markdownlint and reports trailing spaces', () => {
    const testMarkdown = '# Title\n\nLine with trailing spaces   \n';

    const runnerPath = path.join(__dirname, '../../scripts/markdownlint-runner.mjs');
    const proc = spawnSync(process.execPath, [runnerPath], {
      input: JSON.stringify({ strings: { 'test.md': testMarkdown }, config: { default: true } }),
      encoding: 'utf8',
      timeout: 5000,
    });

    if (proc.status !== 0) {
      throw new Error(`runner failed: ${proc.stderr || proc.stdout}`);
    }

    const results = JSON.parse(proc.stdout || '{}');
    // Expect output to include 'test.md' key and an array of issues
    expect(results['test.md']).toBeDefined();
    const issues = results['test.md'];
    expect(Array.isArray(issues)).toBe(true);
    // There should be at least one issue and at least one should be 'Trailing spaces' (MD009)
    const hasTrailing = issues.some((i: any) => i.ruleNames && i.ruleNames.includes('MD009'));
    expect(hasTrailing).toBe(true);
  });
});
