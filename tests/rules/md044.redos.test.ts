import { validate, fix } from '../../src/rules/md044';

describe('MD044 safety and correctness', () => {
  test('handles names with special characters safely', () => {
    const lines = ['We use C++ in this project.'];
    const violations = validate(lines, { names: ['C++'] });
    expect(violations.length).toBe(0);

    const fixed = fix(['we use c++ here.'], { names: ['C++'] });
    expect(fixed[0]).toContain('C++');
  });

  test('handles very long name input without hanging', () => {
    const longName = 'a'.repeat(2000);
    const lines = [`this line contains ${longName}`];
    // Should not throw or hang
    const violations = validate(lines, { names: [longName] });
    expect(Array.isArray(violations)).toBe(true);
  });
});