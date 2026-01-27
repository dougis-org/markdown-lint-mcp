import { fix } from '../../src/rules/md025';

describe('MD025 front matter title handling', () => {
  test('detects front matter title with default pattern', () => {
    const lines = ['---', 'title: Example', '---', '# Heading', '# Another'];
    const fixed = fix(lines);
    // When front matter title exists, headings should be demoted (no top-level headings remain)
    expect(fixed.some(line => line.startsWith('# '))).toBe(false);
  });

  test('handles custom front_matter_title string safely', () => {
    const lines = ['---', 'MyTitle=Example', '---', '# Heading', '# Another'];
    const fixed = fix(lines, { front_matter_title: 'MyTitle=' });
    expect(fixed.some(line => line.startsWith('# '))).toBe(false);
  });
});
