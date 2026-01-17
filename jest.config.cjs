const { defaults } = require('jest-config');

/**
 * Custom Jest config that maps `markdownlint` to a local adapter file which re-exports
 * the ESM package but lives inside the repo (so jest can transform it if needed).
 */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
    '^.+\\.mjs$': 'babel-jest',
  },
  moduleNameMapper: {
    '^markdownlint$': '<rootDir>/test/jest-markdownlint-adapter.mjs',
  },
  transformIgnorePatterns: [
    // allow markdownlint to be transformed
    '/node_modules/(?!markdownlint)/',
  ],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: ['**/tests/**/*.test.(ts|tsx)'],
};
