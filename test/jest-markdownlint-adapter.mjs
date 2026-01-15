// ESM adapter that imports the upstream implementation directly from its
// internal module entry to avoid being remapped to itself by Jest's
// moduleNameMapper (which maps 'markdownlint' -> this file).
import * as upstream from '../node_modules/markdownlint/lib/markdownlint.mjs';

// Re-export helpers and the default export
export const { sync, promise, applyFix, applyFixes, getVersion } = upstream;
export * from 'markdownlint/lib/markdownlint.mjs';
export default upstream;
