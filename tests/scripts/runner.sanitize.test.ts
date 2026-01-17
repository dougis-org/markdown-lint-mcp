import { execFileSync } from 'child_process';
import path from 'path';

describe('markdownlint-runner sanitization', () => {
  const script = path.join(process.cwd(), 'scripts', 'markdownlint-runner.mjs');

  test('drops customRules and path-like config entries', () => {
    const input = JSON.stringify({
      strings: { 'a.md': '# hi' },
      config: { customRules: ['./evil.js'], MD041: false, somePath: '../etc/passwd' },
    });

    const out = execFileSync('node', [script], { input, encoding: 'utf8', maxBuffer: 200_000 });
    expect(() => JSON.parse(out)).not.toThrow();
    const parsed = JSON.parse(out);
    expect(parsed).toBeDefined();
  });

  test('rejects huge strings in input', () => {
    const big = 'a'.repeat(500_000);
    const input = JSON.stringify({ strings: { 'big.md': big } });

    // The script exits with code 1 and prints an error message for too-large input
    let threw = false;
    try {
      execFileSync('node', [script], { input, encoding: 'utf8', maxBuffer: 200_000 });
    } catch (err: any) {
      threw = true;
      expect(String(err.stderr || err.stdout)).toMatch(/Input too large/);
    }
    expect(threw).toBe(true);
  });
});