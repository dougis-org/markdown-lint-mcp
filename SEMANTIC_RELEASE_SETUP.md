# Semantic Release Setup Guide

This guide explains how semantic-release has been configured for automated versioning, changelog generation, and npm publishing on merges to main.

## What is Semantic Release?

Semantic Release automates the versioning and publishing process based on commit messages. It:

- **Analyzes commits** using the Conventional Commits specification
- **Automatically determines** version bumps (major/minor/patch)
- **Generates changelogs** automatically
- **Creates GitHub releases** with notes
- **Publishes to npm** when version changes
- **Tags the repository** with version numbers

## Commit Message Convention

For semantic-release to work, follow the **Conventional Commits** specification:

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature (triggers **minor** version bump)
- **fix**: A bug fix (triggers **patch** version bump)
- **perf**: A performance improvement (triggers **patch** version bump)
- **docs**: Documentation changes (no release)
- **style**: Code style changes (no release)
- **refactor**: Code refactoring (no release)
- **test**: Test additions/updates (no release)
- **chore**: Chore/maintenance (no release)

### Breaking Changes

For **major** version bumps, add `BREAKING CHANGE:` in the footer:

```
feat: redesign API

BREAKING CHANGE: API endpoints have been completely redesigned
```

### Examples

✅ **Patch release** (1.0.2 → 1.0.3):
```
fix: correct markdown parsing for code blocks
```

✅ **Minor release** (1.0.2 → 1.1.0):
```
feat: add support for custom validation rules
```

✅ **Major release** (1.0.2 → 2.0.0):
```
feat: redesign core API

BREAKING CHANGE: Configuration format has changed
```

## GitHub Setup

### Required Secrets

You need to set up two secrets in your GitHub repository settings:

1. **`GITHUB_TOKEN`** (automatically provided by GitHub Actions)
   - Used by semantic-release to create releases and push commits.
   - Ensure the release job in your workflow file has `permissions: contents: write`.

2. **`NPM_TOKEN`** (required - you must create this)
   - Used to publish to npm
   - Go to https://www.npmjs.com/settings/~profile/tokens
   - Create a new token with **Automation** or **Publish** permissions
   - Copy the token and add it as a secret named `NPM_TOKEN`

### Steps to Add NPM_TOKEN

1. Go to your npm account: https://www.npmjs.com/settings/~profile/tokens
2. Click "Generate New Token"
3. Select "Automation" as the token type (recommended for CI/CD)
4. Copy the generated token
5. Go to your GitHub repo → Settings → Secrets and variables → Actions
6. Click "New repository secret"
7. Name: `NPM_TOKEN`
8. Value: Paste your npm token
9. Click "Add secret"

## How It Works

### On Push to Main

1. Tests run and must pass
2. If tests pass, semantic-release:
   - Analyzes all commits since last release
   - Determines the version bump needed
   - Updates `package.json` and `package-lock.json`
   - Generates/updates `CHANGELOG.md`
   - Commits changes with `[skip ci]` tag
   - Creates a git tag (e.g., `v1.1.0`)
   - Publishes to npm
   - Creates a GitHub release with notes

3. If no release-worthy commits (only docs/chore), nothing happens

## Workflow Configuration

The updated `.github/workflows/ci.yml` includes:

- **Permissions**: `contents: write` for creating tags/releases
- **Release job**: Runs after tests pass on main branches
- **Conditions**: Only runs on pushes to main (not PRs)
- **Environment variables**: Passes GitHub and npm tokens

## Configuration File

The `.releaserc.json` file configures semantic-release with:

- **Commit analyzer**: Uses conventionalcommits preset
- **Release rules**: Maps commit types to version bumps
- **Changelog**: Auto-generates `CHANGELOG.md`
- **Git plugin**: Commits version updates
- **NPM plugin**: Publishes to npm
- **GitHub plugin**: Creates releases

## Testing Locally (Optional)

To test semantic-release locally without publishing:

```bash
# Dry run (doesn't publish or push)
npx semantic-release --dry-run
```

This shows what *would* happen without actually doing it.

## Troubleshooting

### No Release Created

If semantic-release runs but creates no release:

- Check commit messages follow Conventional Commits
- Verify the last commit was merged to main (not in a branch)
- Check CI logs for analyzer output

### Permission Denied Errors

- Verify `NPM_TOKEN` is set in repository secrets
- Verify `GITHUB_TOKEN` has `contents: write` permission (should be default in modern GitHub)
- Check token permissions aren't expired

### Release Not Published to npm

- Verify `NPM_TOKEN` has "Automation" or "Publish" permissions
- Check npm package visibility isn't restricted to organization
- Verify package version isn't already published

### Git Tag/Release Not Created

- Verify `contents: write` permission is enabled
- Check GitHub token isn't restricted
- Look for `GITHUB_TOKEN` environment variable in logs

## Further Reading

- [Semantic Release Documentation](https://github.com/semantic-release/semantic-release)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
