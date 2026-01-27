# Changelog

All notable changes to the markdown-lint-mcp project will be documented in this file.

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
- **Documentation Updates**:
  - Enhanced CONTRIBUTING.md with comprehensive installation and setup instructions
  - Added detailed breakdown of all production and development dependencies
  - Updated all version requirements throughout documentation to match new minimum requirements
  - Added explicit npm version requirement (7.0.0+) to both package.json and documentation
  - Enhanced dependencies documentation with which npm scripts use each tool
- **Dependency Version Updates** - Updated all packages to latest stable versions:
  - `@modelcontextprotocol/sdk`: ^1.0.0 → ^1.25.0
  - `markdownlint`: ^0.34.0 → ^0.40.0
  - `typescript`: ^5.0.0 → ^5.9.0
  - `jest`: ^29.5.0 → ^30.2.0
  - `@jest/globals`: ^30.0.3 → ^30.2.0
  - `@types/jest`: ^29.5.0 → ^30.0.0
  - `@types/node`: ^20.0.0 → ^25.0.0
  - `eslint`: ^8.40.0 → ^9.0.0
  - `@typescript-eslint/eslint-plugin`: ^6.0.0 → ^8.53.0
  - `@typescript-eslint/parser`: ^6.0.0 → ^8.53.0
  - `eslint-config-prettier`: ^9.0.0 → ^10.0.0
  - `eslint-plugin-jest`: ^27.2.0 → ^29.12.0
  - `eslint-plugin-prettier`: ^5.0.0 → ^5.5.0
  - `prettier`: ^3.0.0 → ^3.7.0
  - `ts-jest`: ^29.1.0 → ^29.4.0
- **package.json**:
  - Added explicit npm engine requirement: `npm >= 7.0.0`
  - Updated all dependency versions to latest stable releases

### Added
- Comprehensive CONTRIBUTING.md with:
  - Complete system requirements documentation
  - Step-by-step installation guide
  - Detailed project structure overview
  - Development workflow instructions
  - Code quality standards and best practices
  - Testing guidelines and coverage requirements
  - CI/CD pipeline documentation
  - Troubleshooting section with common issues and solutions
  - Links to relevant resources
  - Documentation of which npm scripts use each development tool

### Planned
- Testing framework with Jest
- Enhanced project structure
- ESLint and Prettier configuration
- GitHub Actions CI/CD pipeline
- Enhanced documentation
- Improved error handling
- Performance optimizations

## [1.0.0] - Initial Release

### Added
- Basic MCP server implementation
- Integration with markdownlint library
- Three MCP tools:
  - `lint_markdown`: Analyze Markdown files for issues
  - `fix_markdown`: Automatically fix Markdown issues
  - `get_configuration`: Display current linting rules
- Custom fix implementations for common Markdown issues
- Configuration support via .markdownlint.json
- Basic error handling
- README.md with project overview
- USAGE.md with basic usage instructions
