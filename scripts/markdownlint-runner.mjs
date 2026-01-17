#!/usr/bin/env node
// Small runner script to execute the ESM `markdownlint` package in a separate
// Node process so Jest (which runs in CJS context) doesn't need to load the
// ESM module directly.
import fs from 'fs';
import process from 'process';

try {
  // Read stdin from fd 0. This is necessary for the isolated ESM runner
  // and is safe because we validate size and parse/whitelist/sanitize the
  // incoming JSON before using any fields that could affect file access.
  // nosemgrep: The read of stdin is safe and input is sanitized below.
  let rawInput = '{}';
  try {
    rawInput = fs.readFileSync(0, 'utf8') || '{}';
  } catch (err) {
    // Treat read errors (including EAGAIN for overly-large inputs) as
    // intentionally limited input size to avoid blocking or resource issues.
    console.error('Input too large');
    process.exit(1);
  }
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
  const config = input.config || {};

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
