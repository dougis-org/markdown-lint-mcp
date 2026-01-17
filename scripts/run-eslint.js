#!/usr/bin/env node
import { ESLint } from 'eslint';

(async () => {
  try {
    const eslint = new ESLint({ overrideConfigFile: '.eslintrc.cjs', ignore: false });
    const results = await eslint.lintFiles(['src/**/*.ts']);
    const formatter = await eslint.loadFormatter('stylish');
    const resultText = formatter.format(results);
    console.log(resultText);
    const errorCount = results.reduce((sum, r) => sum + r.errorCount, 0);
    process.exit(errorCount > 0 ? 2 : 0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();