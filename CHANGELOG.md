# Changelog

All notable changes to the markdownlint-mcp project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
- Resilient markdownlint loading to support both `sync` and promise/callable shapes; fixes `*.sync is not a function` runtime errors (GH-7).

## [1.0.1] - 2026-01-18

### Fixed
- Correct: Corrected MCP server name to `markdown-lint-mcp` and exported `SERVER_NAME` as the single source-of-truth. (see commit 375b899)

### Changed
- **Node.js Minimum Version**: Increased minimum required version from 16.0.0 to 20.0.0
  - Updated to support only current and maintained LTS versions
  - Updated engines in package.json to reflect this requirement
- **CI/CD Pipeline Updates**:
  - Test matrix now includes: Node.js 20.x (Iron), 22.x (Jod), 24.x (Krypton), and 25.x (Current)
  - Updated GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `codecov/codecov-action@v4`
  - Coverage reports now uploaded for Node.js 25.x (latest version) instead of 24.x
  - NPM publish job now uses Node.js 24.x LTS (latest stable) for releases
  - Updated GitHub Actions: `actions/checkout@v4`, `actions/setup-node@v4`, `codecov/codecov-action@v4`
  - Coverage reports now uploaded for Node.js 25.x (latest version) instead of 24.x
  - NPM publish job now uses Node.js 24.x LTS (latest stable) for releases
