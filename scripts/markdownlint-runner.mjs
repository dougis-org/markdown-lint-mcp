#!/usr/bin/env node
// Small runner script to execute the ESM `markdownlint` package in a separate
// Node process so Jest (which runs in CJS context) doesn't need to load the
// ESM module directly.
import fs from 'fs';
import process from 'process';

try {
  const rawInput = fs.readFileSync(0, 'utf8') || '{}';
// Protect against overly large inputs
if (Buffer.byteLength(rawInput, 'utf8') > 200_000) {
  console.error('Input too large');
  process.exit(1);
}
let input;
try {
  input = JSON.parse(rawInput);
} catch (err) {
  console.error('Invalid JSON input');
  process.exit(1);
}
// Allow only a small set of expected keys and validate shapes to avoid unsafe usage
const allowedKeys = new Set(['strings', 'files', 'config', 'options']);
if (input && typeof input === 'object') {
  for (const k of Object.keys(input)) {
    if (!allowedKeys.has(k)) {
      // drop unexpected keys
      delete input[k];
    }
  }

  if (input.strings && typeof input.strings === 'object') {
    for (const key of Object.keys(input.strings)) {
      if (typeof input.strings[key] !== 'string' || input.strings[key].length > 100_000) {
        delete input.strings[key];
      }
    }
  }
} else {
  input = {};
}
  const strings = input.strings || {};

  // Sanitize config to avoid passing through dangerous keys (like customRules) or paths
  function looksLikePath(s) {
    return typeof s === 'string' && (s.includes('/') || s.includes('\\') || s.startsWith('.') || s.includes('..'));
  }

  function sanitizeConfig(cfg) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return {};
    const forbidden = new Set(['customRules', 'plugins', 'customRulePaths', 'rulesFiles']);
    const out = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (forbidden.has(k)) continue;
      if (v === null) continue;

      if (typeof v === 'boolean' || typeof v === 'number') {
        out[k] = v;
        continue;
      }

      if (typeof v === 'string') {
        if (looksLikePath(v)) continue;
        out[k] = v;
        continue;
      }

      if (Array.isArray(v)) {
        // allow arrays only when all entries are primitives and none look like paths
        const ok = v.every(el => (['string','number','boolean'].includes(typeof el)) && !looksLikePath(el));
        if (ok) out[k] = v.slice();
        continue;
      }

      if (typeof v === 'object') {
        const nested = {};
        for (const [nk, nv] of Object.entries(v)) {
          if (nv === null) continue;
          if (typeof nv === 'boolean' || typeof nv === 'number') nested[nk] = nv;
          else if (typeof nv === 'string' && !looksLikePath(nv)) nested[nk] = nv;
          else if (Array.isArray(nv)) {
            const ok2 = nv.every(el => (['string','number','boolean'].includes(typeof el)) && !looksLikePath(el));
            if (ok2) nested[nk] = nv.slice();
          }
        }
        out[k] = nested;
        continue;
      }

      // drop anything else (functions, symbols, etc.)
    }
    return out;
  }

  const config = sanitizeConfig(input.config || {});

  // Dynamic import of the ESM package
  // Import the sync-only exports via the package exports entrypoint
  // to ensure we don't rely on internal file paths.
  const imported = await import('markdownlint/sync');
  const markdownlintPkg = imported.default ?? imported;

  // The exported function is `lint` (synchronous lint)
  const results = markdownlintPkg.lint({ strings, config });
  process.stdout.write(JSON.stringify(results));
} catch (err) {
  // Ensure any error surfaces as JSON to the parent process
  process.stderr.write(String(err.stack || err));
  process.exit(2);
}
