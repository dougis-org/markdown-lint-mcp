# Contributing to markdown-lint-mcp

Thank you for your interest in contributing to this project! This comprehensive guide will help you get started with development, testing, and contribution workflows.

## Table of Contents

- [System Requirements](#system-requirements)
- [Installation & Setup](#installation--setup)
- [Development Workflow](#development-workflow)
- [Code Quality Standards](#code-quality-standards)
- [Testing](#testing)
- [Before You Submit](#before-you-submit)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [License](#license)

---

## System Requirements

### Required Software

- **Node.js**: Version 20.0.0 or higher (LTS recommended)
  - Officially tested on: Node.js 20.x and 22.x (LTS)
  - Newer Node.js versions (e.g., 24.x, 25.x) may work but are not guaranteed in CI
  - Verify with: `node --version`
  - Installation: https://nodejs.org/

- **npm**: Version 7.0.0 or higher (comes with Node.js)
  - Verify with: `npm --version`

### Supported Node.js Versions

The project is officially tested and supported on:
- Node.js 20.x (LTS)
- Node.js 22.x (LTS)

Note: Node.js 24.x and 25.x may work, but they are not part of the official CI matrix and may have incompatibilities.

### Optional Tools

- **Git**: For version control (required for cloning and contributing)
  - Verify with: `git --version`
  - Installation: https://git-scm.com/
- **VS Code** or preferred code editor (recommended for development)

---

## Installation & Setup

### Step 1: Fork and Clone the Repository

```bash
# Fork on GitHub (visit https://github.com/dougis-org/markdown-lint-mcp)
# Then clone your fork
# Use the clone URL shown on your fork's GitHub page (replace YOUR-USERNAME and repo name if you renamed it):
git clone https://github.com/YOUR-USERNAME/markdown-lint-mcp.git
cd markdown-lint-mcp

# Add upstream remote to stay synchronized
git remote add upstream https://github.com/dougis-org/markdown-lint-mcp.git
```

### Step 2: Install All Dependencies

```bash
npm install
```

This command automatically installs all required tools. Running `npm install` will install both production and development dependencies specified in `package.json`. All tools needed for npm scripts are included and will be installed automatically.

**Production Dependencies:**
- `@modelcontextprotocol/sdk@^1.25.0` - Model Context Protocol SDK for building MCP servers
- `markdownlint@^0.40.0` - Core markdown linting engine

**Development Dependencies (Automatically Installed):**
- `typescript@^5.9.0` - TypeScript compiler for strict type checking
  - Used by: `npm run build`, `npm run dev`
- `ts-jest@^29.4.0` - Jest preset for TypeScript support
  - Used by: `npm test`, `npm run test:watch`, `npm run test:coverage`
- `jest@^30.2.0` - Testing framework
  - Used by: `npm test`, `npm run test:watch`, `npm run test:coverage`
- `@jest/globals@^30.2.0` - Jest global types
  - Used by: jest tests
- `@types/jest@^30.0.0` - Jest type definitions
  - Used by: jest tests
- `@types/node@^25.0.0` - Node.js API types
  - Used by: TypeScript compilation
- `eslint@^9.0.0` - Code linting tool
  - Used by: `npm run lint`, `npm run lint:fix`
- `@typescript-eslint/eslint-plugin@^8.53.0` - TypeScript linting rules
  - Used by: `npm run lint`, `npm run lint:fix`
- `@typescript-eslint/parser@^8.53.0` - TypeScript parser for ESLint
  - Used by: `npm run lint`, `npm run lint:fix`
- `eslint-config-prettier@^10.0.0` - Prettier integration for ESLint
  - Used by: `npm run lint`, `npm run lint:fix`
- `eslint-plugin-prettier@^5.5.0` - ESLint plugin for Prettier formatting
  - Used by: `npm run lint`, `npm run lint:fix`
- `eslint-plugin-jest@^29.12.0` - ESLint plugin for Jest best practices
  - Used by: `npm run lint`, `npm run lint:fix`
- `prettier@^3.7.0` - Code formatter
  - Used by: `npm run format`

All these tools are installed automatically when you run `npm install` - no additional installation steps are needed.

### Step 3: Verify Installation

Test that everything is working:

```bash
npm run build    # Compiles TypeScript to dist/
npm test         # Runs full test suite
npm run lint     # Checks code quality with ESLint
```

All three commands should complete successfully without errors.

---

## Development Workflow

### Project Structure

```
markdown-lint-mcp/
├── src/                       # TypeScript source code
│   ├── index.ts              # Main MCP server entry point
│   ├── tools/                # MCP tool implementations
│   │   ├── lintMarkdown.ts
│   │   ├── fixMarkdown.ts
│   │   └── getConfiguration.ts
│   └── utils/                # Utility modules
├── tests/                     # Jest test files (*.test.ts)
├── dist/                      # Compiled JavaScript output (generated)
├── .github/
│   └── workflows/            # GitHub Actions CI/CD
├── coverage/                 # Test coverage reports (generated)
├── node_modules/             # Installed dependencies (generated)
├── package.json              # Project metadata and dependencies
├── package-lock.json         # Dependency lock file
├── tsconfig.json             # TypeScript compiler options
├── jest.config.cjs           # Jest testing configuration
├── eslint.config.cjs         # ESLint (flat) configuration
├── .prettierrc               # Prettier formatting rules
├── README.md                 # User-facing documentation
└── CONTRIBUTING.md           # This file
```

### Build & Compilation

```bash
# TypeScript compilation (one-time)
npm run build

# Clean rebuild
rm -rf dist && npm run build
```

Output goes to `dist/` directory as ES modules.

### Running the Server

```bash
# Start the compiled MCP server
npm start

# Development mode with auto-reload
npm run dev
```

### Code Formatting

```bash
# Automatically format all code with Prettier
npm run format

# Format specific file
npx prettier --write src/myfile.ts

# Check what would be formatted (without applying)
npx prettier --check src/
```

### Running the Linter

```bash
# Check for linting issues
npm run lint

# Automatically fix fixable linting issues
npm run lint:fix

# Lint specific file
npx eslint src/myfile.ts --fix
```

---

## Code Quality Standards

### TypeScript Configuration

The project uses strict TypeScript settings (`tsconfig.json`):

- **Strict mode**: Full type checking enabled
- **Target**: ES2022 JavaScript standard
- **Module system**: ESNext with node resolution
- **Source maps**: Generated for debugging

### ESLint Rules

Key linting rules are enforced:

- **Code formatting**: Prettier integration mandatory
- **Console usage**: Only `warn` and `error` are allowed
- **Type annotations**: Explicit function return types not required, but consider them
- **Any types**: Warned when used (avoid `any` when possible)
- **Unused variables**: Error - unused parameters must be prefixed with `_`
- **Jest best practices**: Tests must be valid and not disabled/focused

### Code Style

Prettier formats code with these settings:

- **Line width**: 100 characters
- **Indentation**: 2 spaces
- **Quotes**: Single quotes for JavaScript
- **Semicolons**: Required
- **Trailing commas**: ES5 compatible
- **Bracket spacing**: `{ foo: bar }`
- **Arrow functions**: Parentheses avoided where possible

---

## Testing

### Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="lint"
```

### Test Structure

Tests are located in the `tests/` directory with `*.test.ts` naming convention.

**Jest Configuration:**
- **Test environment**: Node.js
- **Preset**: ts-jest for TypeScript support
- **Coverage threshold**: Minimum 80% for branches, functions, lines, and statements

### Writing Tests

1. **Follow existing patterns** in `tests/` directory
2. **Use descriptive test names**: `describe` blocks and `it()` statements should be clear
3. **Test both happy paths and edge cases**
4. **Maintain 80%+ coverage** for new code
5. **Mock external dependencies** appropriately

### Coverage Requirements

- **Minimum 80% coverage** across all metrics
- Coverage reports generated in `coverage/` directory
- Check coverage: `npm run test:coverage`

---

## Before You Submit

### Pre-commit Checklist

Before pushing or creating a pull request, ensure:

```bash
# 1. Build compiles without errors
npm run build

# 2. All tests pass
npm test

# 3. No linting errors
npm run lint

# 4. Code is properly formatted
npm run format

# 5. Coverage meets threshold
npm run test:coverage
```

Or run all checks at once:

```bash
npm run prepublishOnly  # Runs test and lint
```

### Git Workflow

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** with atomic commits:
   ```bash
   git commit -m "feat: descriptive message"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create a Pull Request** with:
   - Clear title describing the change
   - Description of what and why
   - Link to any related issues
   - Evidence that tests pass and coverage maintained

### Commit Message Convention

Follow conventional commits for clarity:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation only
- `style:` - Code style/formatting
- `refactor:` - Code refactoring
- `perf:` - Performance improvement
- `test:` - Adding/updating tests
- `ci:` - CI/CD changes

### Pull Request Requirements

Your PR must:

- ✅ Pass all CI/CD checks (GitHub Actions)
  - Build succeeds on Node.js 20.x and 22.x (official CI matrix)
  - All tests pass
  - Linting passes
- ✅ Maintain or improve code coverage (minimum 80%)
- ✅ Include tests for new functionality
- ✅ Update documentation if needed
- ✅ Have a clear, descriptive title and description
- ✅ Be based on current `main` branch

---

## Pull Request Process

1. Ensure all tests pass and the build is successful
2. Update the documentation with details of changes, including new features, APIs, or breaking changes
3. The versioning scheme we use is [SemVer](http://semver.org/). The maintainers will handle the version updates
4. Your pull request will be reviewed by at least one maintainer
5. Once approved, your pull request will be merged by a maintainer

---

## CI/CD Pipeline

The project uses GitHub Actions for automated testing and publishing.

### On Pull Request

- Tests run on Node.js 20.x and 22.x (official CI matrix). Newer Node.js versions may be tried in separate workflows.
- Code is linted with ESLint
- Coverage reports uploaded to Codecov on the project's designated runner (currently Node.js 22.x)
- Build artifacts verified

### On Release

- Package is automatically published to NPM using a maintained LTS Node.js version (e.g., Node.js 22.x)
- Requires all tests to pass
- Triggered when a release is created on GitHub

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json dist/
npm install
npm run build
```

### Tests Fail with Type Errors

```bash
# Ensure TypeScript compilation works
npx tsc --noEmit

# Regenerate types
npm install
```

### Linting Issues Won't Fix

```bash
# Try ESLint with --fix flag explicitly
npx eslint src --ext .ts --fix

# Then format with Prettier
npm run format
```

### Coverage Below Threshold

```bash
# Check which files are missing coverage
npm run test:coverage

# Review coverage report
open coverage/lcov-report/index.html
```

---

## Resources

- **Model Context Protocol**: https://modelcontextprotocol.io/
- **markdownlint Rules**: https://github.com/DavidAnson/markdownlint/blob/main/README.md#rules
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **ESLint Guide**: https://eslint.org/docs/rules/

---

## Issue Reporting

### Bug Reports

When reporting bugs, please include:

1. A clear and descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Environment information (OS, Node.js version, etc.)
6. Any relevant logs or error messages

### Feature Requests

For feature requests, please include:

1. A clear and descriptive title
2. A detailed description of the proposed feature
3. Any relevant examples or use cases
4. An explanation of why this feature would be valuable

---

## License

By contributing to this project, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

---

Thank you for contributing to markdown-lint-mcp! 🎉
