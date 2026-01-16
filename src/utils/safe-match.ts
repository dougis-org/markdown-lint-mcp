export function findWordMatches(line: string, search: string): number[] {
  const results: number[] = [];
  if (!search) return results;

  const lowerLine = line.toLowerCase();
  const lowerSearch = search.toLowerCase();

  let start = 0;
  while (true) {
    const idx = lowerLine.indexOf(lowerSearch, start);
    if (idx === -1) break;

    // Check boundaries: before and after should not be word characters
    const before = line[idx - 1];
    const after = line[idx + lowerSearch.length];

    const beforeIsWord = before ? /[A-Za-z0-9_]/.test(before) : false;
    const afterIsWord = after ? /[A-Za-z0-9_]/.test(after) : false;

    if (!beforeIsWord && !afterIsWord) {
      results.push(idx);
    }

    start = idx + 1; // continue searching
  }

  return results;
}

export function hasFrontMatterTitle(line: string, pattern?: string): boolean {
  const trimmed = line.trim();

  if (!pattern) {
    // default behavior: match `title:` or `title =` case-insensitive with optional whitespace
    return /^title\s*[:=]/i.test(trimmed);
  }

  // If pattern is a simple substring, use includes/startsWith checks
  const normalized = pattern.trim().toLowerCase();
  if (normalized.length > 200) return false; // avoid pathological patterns

  // Simple heuristic: if pattern contains regex meta, fallback to substring match
  if (/[\\\[\]\^\$\.|?*+()]/.test(normalized)) {
    // fall back to simple includes for safety
    return trimmed.toLowerCase().includes(normalized.replace(/[\\\[\]\^\$\.|?*+()]/g, ''));
  }

  return trimmed.toLowerCase().includes(normalized);
}

export function endsWithPunctuation(content: string, punctuation?: string): boolean {
  if (!punctuation) return /[.,;:!?]$/.test(content);
  if (punctuation.length === 0) return false;
  if (punctuation.length > 200) return false; // avoid pathological configs

  const lastChar = content.charAt(content.length - 1);
  return punctuation.includes(lastChar);
}
