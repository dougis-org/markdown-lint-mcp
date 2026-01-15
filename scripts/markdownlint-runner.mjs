#!/usr/bin/env node
// Small runner script to execute the ESM `markdownlint` package in a separate
// Node process so Jest (which runs in CJS context) doesn't need to load the
// ESM module directly.
import fs from 'fs';
import process from 'process';

try {
  const input = JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
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
