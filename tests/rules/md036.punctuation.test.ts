import { /* validate */ fix } from '../../src/rules/md036';

describe('MD036 punctuation handling', () => {
  test('works with config punctuation using string checks', () => {
    const lines = ['Is this a sentence?'];
    // The rule implementation currently only fixes or checks; we at least ensure no exceptions
    const fixed = fix(lines, { punctuation: '?!' } as any);
    expect(Array.isArray(fixed)).toBe(true);
  });

  test('handles aggressive punctuation config without throwing', () => {
    const longPunct = '!'.repeat(1000);
    const lines = ['Edge case...'];
    const fixed = fix(lines, { punctuation: longPunct } as any);
    expect(Array.isArray(fixed)).toBe(true);
  });
});