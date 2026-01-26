import { validate } from '../../src/rules/md044';

describe('MD044 robustness against regex-like names', () => {
  test('handles names with regex metacharacters without using RegExp', () => {
    const lines = ['this is a test with evilpattern'];
    const config = { names: ['evil(pattern)', 'test'] } as any;

    const results = validate(lines, config);
    expect(Array.isArray(results)).toBe(true);
  });

  test('handles very long name safely', () => {
    const longName = 'a'.repeat(10000);
    const lines = ['this is a line with ' + longName + ' inside'];
    const config = { names: [longName] } as any;

    const results = validate(lines, config);
    expect(Array.isArray(results)).toBe(true);
  });
});
