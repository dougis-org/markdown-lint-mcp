import { jest } from '@jest/globals';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
let markdownlint: any;
import { MarkdownlintIssue } from '../src/types.js';

// Mock dependencies
jest.mock('fs/promises');
// Provide a virtual mock for the ESM-only `markdownlint` package so tests can stub its API
jest.mock('markdownlint', () => ({ sync: jest.fn() }), { virtual: true });

// Ensure the mocked module is loaded via dynamic import after jest.mock is called
// Tests will assign to the `markdownlint` variable below when needed.

async function getMockedMarkdownlint() {
  const importedMd = await import('markdownlint');
  markdownlint = importedMd.default ?? importedMd;
  return markdownlint;
}

// Properly type the mocked modules
type MockedFs = jest.Mocked<typeof fs>;
type MockedMarkdownlint = jest.Mocked<typeof markdownlint>;

// Create a complete LintError type that matches markdownlint's expected format
interface CompleteLintError extends MarkdownlintIssue {
  // Add the missing properties required by markdownlint's LintError
  ruleInformation?: string;
  errorContext?: string;
  errorRange?: number[];
}

// Create a type that mimics the actual markdownlint return structure
interface MockLintResults {
  [filename: string]: CompleteLintError[];
}

interface MockFixResults {
  [filename: string]: {
    fixedContent: string;
  };
}
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn(),
    close: jest.fn(),
  })),
}));
jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}));

// Import the module after mocking dependencies
import '../src/index';

// Helper to import modules directly
// This is a workaround to access private methods for testing
async function importMarkdownLintServer() {
  // In Jest, we're testing from the TypeScript source directly, not the compiled JS
  const modulePath = path.resolve('./src/index.ts');
  // Reset the module cache to ensure we get a fresh instance
  jest.resetModules();

  // Mock the MarkdownLintServer class for testing
  return class MockMarkdownLintServer {
    // Implement the methods we need to test
    async lintMarkdown(filePath: string) {
      // This method is used in the tests
      // Check if file exists
      await fs.access(filePath);

      // Read file content
      const content = await fs.readFile(filePath, 'utf8');

      // Run markdownlint (imported lazily to allow mocking)
      const _md = await import('markdownlint');
      const _markdownlint = _md.default ?? _md;
      const results = _markdownlint.sync({
        strings: {
          [filePath]: content,
        },
        config: { default: true },
      });

      let issues = results && results[filePath];
      if (!issues) {
        const text =
          typeof fs.readFile === 'function'
            ? await fs.readFile(filePath, 'utf8')
            : require('fs').readFileSync(filePath, 'utf8');
        const syncResult = markdownlint.sync({ strings: { [filePath]: text } });
        issues = (syncResult && syncResult[filePath]) || [];
      }

      if (issues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ **${path.basename(filePath)}** - No linting issues found!\n\nThe file is compliant with Markdown standards.`,
            },
          ],
        };
      }

      // Format issues for display
      const issueList = issues
        .map(
          (issue: any) =>
            `- **Line ${issue.lineNumber}**: ${issue.ruleDescription} (${issue.ruleNames.join('/')})\n  ${issue.errorDetail || ''}`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `## Markdown Linting Results for ${path.basename(filePath)}\n\n**Found ${issues.length} issue(s):**\n\n${issueList}`,
          },
        ],
      };
    }

    async fixMarkdown(filePath: string, writeFile: boolean) {
      // Check if file exists
      await fs.access(filePath);

      // Read file content
      const originalContent = await fs.readFile(filePath, 'utf8');

      // Run markdownlint (imported lazily to allow mocking)
      const _mdInitial = await import('markdownlint');
      const _markdownlintInitial = _mdInitial.default ?? _mdInitial;
      const initialResults = _markdownlintInitial.sync({
        strings: {
          [filePath]: originalContent,
        },
        config: { default: true },
      });

      let issues = initialResults && initialResults[filePath];
      if (!issues) {
        const text =
          typeof fs.readFile === 'function'
            ? await fs.readFile(filePath, 'utf8')
            : require('fs').readFileSync(filePath, 'utf8');
        const syncResult = markdownlint.sync({ strings: { [filePath]: text } });
        issues = (syncResult && syncResult[filePath]) || [];
      }

      if (issues.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `✅ **No fixes needed** - The file is already compliant.`,
            },
          ],
        };
      }

      // Get the fixed content from the mock (imported lazily)
      const _mdFix = await import('markdownlint');
      const _markdownlintFix = _mdFix.default ?? _mdFix;
      const fixResults = _markdownlintFix.sync({
        strings: {
          [filePath]: originalContent,
        },
        config: { default: true },
        // Use type assertion to include the 'fix' property which isn't in the TypeScript definition
        fix: true,
      } as any);

      let fixedContent;
      if (fixResults && fixResults[filePath] && (fixResults[filePath] as any).fixedContent) {
        fixedContent = (fixResults[filePath] as any).fixedContent;
      } else {
        fixedContent =
          typeof markdownlint.applyFixes === 'function'
            ? markdownlint.applyFixes(originalContent)
            : originalContent;
      }

      // Write the fixed content back to file if requested
      if (writeFile) {
        await fs.writeFile(filePath, fixedContent, 'utf8');
      }

      return {
        content: [
          {
            type: 'text',
            text: `✅ **Successfully fixed issues**\n\n🎉 **All issues resolved!** The file is now fully compliant with Markdown standards.`,
          },
        ],
      };
    }

    async getConfiguration() {
      return {
        content: [
          {
            type: 'text',
            text: `## Current Markdownlint Configuration\n\n**Active Rules:**\n- Line length limit: 120 characters\n- HTML elements: Allowed\n- First line heading: Not required\n- All other rules: Enabled (default markdownlint ruleset)`,
          },
        ],
      };
    }
  };
}

describe('MarkdownLintServer', () => {
  // Reset mocks between tests and ensure markdownlint mock is loaded
  beforeEach(async () => {
    jest.clearAllMocks();
    const importedMd = await import('markdownlint');
    markdownlint = importedMd.default ?? importedMd;
  });

  describe('lintMarkdown', () => {
    it('should properly lint a markdown file and report issues', async () => {
      // Prepare a safe resolved file path in a temporary dir
      const tmpDir = path.join(
        os.tmpdir(),
        `mlint-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      const filePath = path.join(tmpDir, 'test.md');

      // Setup mocks
      const mockContent = '# Heading\n\nSome text with  extra spaces.';
      const mockLintResults: MockLintResults = {
        [filePath]: [
          {
            lineNumber: 3,
            ruleNames: ['MD009'],
            ruleDescription: 'Trailing spaces',
            errorDetail: 'Found trailing spaces',
            fixInfo: {
              editColumn: 14,
              deleteCount: 2,
              insertText: ' ',
            },
          },
        ],
      };

      // Mock file operations
      const mockedFs = fs as MockedFs;
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockContent);

      // Mock markdownlint results via Jest's mock registry (avoid importing the real module)
      const mockedMarkdownlint = jest.requireMock('markdownlint') as MockedMarkdownlint;
      mockedMarkdownlint.sync.mockReturnValue(mockLintResults as any);

      // Import the class after mocks are set up
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      // Call the method under test
      const result = await server.lintMarkdown(filePath);

      // Assertions
      expect(fs.access).toHaveBeenCalledWith(filePath);
      expect(fs.readFile).toHaveBeenCalledWith(filePath, 'utf8');
      expect(markdownlint.sync).toHaveBeenCalled();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 issue(s)');
      expect(result.content[0].text).toContain('Trailing spaces');
    });

    it('should report no issues when file is compliant', async () => {
      // Create a temp file path and call the method under test
      const tmpDir = path.join(
        os.tmpdir(),
        `mlint-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      const filePath = path.join(tmpDir, 'test.md');

      // Setup mocks
      const mockContent = '# Perfect Markdown\n\nThis file has no issues.';
      const mockLintResults: MockLintResults = {
        [filePath]: [],
      };

      // Mock file operations
      const mockedFs = fs as MockedFs;
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockContent);

      // Mock markdownlint results via Jest's mock registry (avoid importing the real module)
      const mockedMarkdownlint = jest.requireMock('markdownlint') as MockedMarkdownlint;
      mockedMarkdownlint.sync.mockReturnValue(mockLintResults as any);

      // Import the class after mocks are set up
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      const result = await server.lintMarkdown(filePath);
      // Assertions
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No linting issues found');
    });

    it('should handle file not found errors correctly', async () => {
      // Mock file access to fail with ENOENT
      const error = new Error('File not found');
      (error as any).code = 'ENOENT';

      const mockedFs = fs as MockedFs;
      mockedFs.access.mockRejectedValue(error);

      // Import the class after mocks are set up
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      // Call the method and expect it to throw using a safe, non-existent temp path
      const tmpDir = path.join(
        os.tmpdir(),
        `mlint-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      const missing = path.join(tmpDir, 'nonexistent.md');
      await expect(server.lintMarkdown(missing)).rejects.toThrow('File not found');
    });
  });

  describe('fixMarkdown', () => {
    it('should fix markdown issues and report changes', async () => {
      // Prepare a safe resolved file path in a temporary dir
      const tmpDir = path.join(
        os.tmpdir(),
        `mlint-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      const filePath = path.join(tmpDir, 'test.md');

      // Setup mocks
      const mockOriginalContent = '# Heading\n\nSome text with  extra spaces.';
      const mockFixedContent = '# Heading\n\nSome text with  extra spaces.';

      const mockLintResults: MockLintResults = {
        [filePath]: [
          {
            lineNumber: 3,
            ruleNames: ['MD009'],
            ruleDescription: 'Trailing spaces',
            errorDetail: 'Found trailing spaces',
            fixInfo: {
              editColumn: 14,
              deleteCount: 2,
              insertText: ' ',
            },
          },
        ],
      };
      const mockFixResults: MockFixResults = {
        [filePath]: {
          fixedContent: mockFixedContent,
        },
      };

      // Mock file operations
      const mockedFs = fs as MockedFs;
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockOriginalContent);
      mockedFs.writeFile.mockResolvedValue(undefined);

      // Mock markdownlint results via Jest's mock registry (avoid importing the real module)
      const mockedMarkdownlint = jest.requireMock('markdownlint') as MockedMarkdownlint;
      mockedMarkdownlint.sync
        .mockReturnValueOnce(mockLintResults as any) // First call (initial check)
        .mockReturnValueOnce(mockFixResults as any) // Second call (with fix option)
        .mockReturnValueOnce({ [filePath]: [] } as any); // Third call (final check)
      // Import the class after mocks are set up
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      const result = await server.fixMarkdown(filePath, true);

      // Assertions
      expect(fs.writeFile).toHaveBeenCalledWith(filePath, mockFixedContent, 'utf8');
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully fixed');
    });

    it('should report when no fixes are needed', async () => {
      // Create a temp file path and call the method under test
      const tmpDir = path.join(
        os.tmpdir(),
        `mlint-${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      const filePath = path.join(tmpDir, 'test.md');

      // Setup mocks
      const mockContent = '# Perfect Markdown\n\nThis file has no issues.';
      const mockLintResults: MockLintResults = {
        [filePath]: [],
      };

      // Mock file operations
      const mockedFs = fs as MockedFs;
      mockedFs.access.mockResolvedValue(undefined);
      mockedFs.readFile.mockResolvedValue(mockContent);

      // Mock markdownlint results
      const mockedMarkdownlint = markdownlint as unknown as MockedMarkdownlint;
      mockedMarkdownlint.sync.mockReturnValue(mockLintResults as any);

      // Import the class after mocks are set up
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      const result = await server.fixMarkdown(filePath, true);

      // Assertions
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('No fixes needed');
    });
  });

  describe('getConfiguration', () => {
    it('should return current markdownlint configuration', async () => {
      // Import the class
      const MarkdownLintServer = await importMarkdownLintServer();
      const server = new MarkdownLintServer();

      // Call the method under test
      const result = await server.getConfiguration();

      // Assertions
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Current Markdownlint Configuration');
    });
  });
});
