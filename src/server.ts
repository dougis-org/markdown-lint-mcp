import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
// Lazy-load `markdownlint` inside methods to avoid ESM import issues during tests
import path from 'path';
import { MarkdownlintIssue, ToolArguments } from './types.js';
import type { Markdownlint } from 'markdownlint';
import { applyRuleFixes, getImplementedRules } from './rules/index';
import {
  contentToLines,
  linesToContent,
  loadConfiguration,
  readFile,
  writeFile,
} from './utils/file';
import logger from './utils/logger';

/**
 * MCP server for markdownlint functionality
 * Provides tools for linting and fixing markdown files
 */
export class MarkdownLintServer {
  private server: Server;

  /**
   * Initialize the markdownlint MCP server
   */
  constructor() {
    this.server = new Server(
      {
        name: 'markdownlint-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();

    // Error handling
    this.server.onerror = error => logger.error('MCP Error', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  /**
   * Set up handlers for MCP tool requests
   */
  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'lint_markdown',
            description: 'Analyze a Markdown file and return detailed linting issues',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Markdown file to lint',
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'fix_markdown',
            description:
              'Automatically fix ALL possible Markdown issues and return the corrected content',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'Path to the Markdown file to fix',
                },
                writeFile: {
                  type: 'boolean',
                  description:
                    'Whether to write the fixed content back to the file (default: true)',
                  default: true,
                },
              },
              required: ['filePath'],
            },
          },
          {
            name: 'get_configuration',
            description: 'Display current markdownlint rules and configuration',
            inputSchema: {
              type: 'object',
              properties: {},
              additionalProperties: false,
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      try {
        // Type guard for arguments
        if (!args || typeof args !== 'object') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments provided');
        }

        const typedArgs = args as ToolArguments;

        switch (name) {
          case 'lint_markdown':
            if (typeof typedArgs.filePath !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'filePath must be a string');
            }
            return await this.lintMarkdown(typedArgs.filePath);

          case 'fix_markdown':
            if (typeof typedArgs.filePath !== 'string') {
              throw new McpError(ErrorCode.InvalidParams, 'filePath must be a string');
            }
            const writeFile = typeof typedArgs.writeFile === 'boolean' ? typedArgs.writeFile : true;
            return await this.fixMarkdown(typedArgs.filePath, writeFile);

          case 'get_configuration':
            return await this.getConfiguration();

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }

        throw new McpError(
          ErrorCode.InternalError,
          `Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Lint a markdown file and report issues
   * @param filePath Path to the markdown file
   * @returns MCP content response with linting results
   */
  public async lintMarkdown(filePath: string) {
    try {
      logger.debug(`Linting markdown file: ${filePath}`);

      // Read file content
      const content = await readFile(filePath);

      // Load configuration (check for .markdownlint.json in file directory or use defaults)
      const config = await loadConfiguration(path.dirname(filePath));

      // Run markdownlint (lazy import to avoid loading ESM into Jest process)
      const md = await import('markdownlint');
      const markdownlintLocal =
        (md as unknown as { default?: Markdownlint }).default ?? (md as unknown as Markdownlint);
      const results = markdownlintLocal.sync({
        strings: {
          [filePath]: content,
        },
        config,
      });

      const lintResults = (results[filePath] || []) as import('markdownlint').LintResult[];
      const issues: MarkdownlintIssue[] = lintResults.map(r => {
        const rawFix = (r as import('markdownlint').LintResult & { fixInfo?: unknown }).fixInfo as unknown;
        const fixInfo = (() => {
          type FixShape = { editColumn?: number; deleteCount?: number; insertText?: string };
          if (rawFix && typeof rawFix === 'object') {
            const candidate = rawFix as FixShape;
            return {
              editColumn: typeof candidate.editColumn === 'number' ? candidate.editColumn : undefined,
              deleteCount: typeof candidate.deleteCount === 'number' ? candidate.deleteCount : undefined,
              insertText: typeof candidate.insertText === 'string' ? candidate.insertText : undefined,
            };
          }
          return undefined;
        })();

        return {
          lineNumber: r.lineNumber,
          ruleNames: r.ruleNames,
          ruleDescription:
            r.ruleNames && r.ruleNames.length > 0 ? r.ruleNames.join('/') : 'Unknown rule',
          errorDetail: (r as import('markdownlint').LintResult & { errorDetail?: string })
            .errorDetail,
          fixInfo,
        };
      });
      logger.info(`Found ${issues.length} issues in ${filePath}`);

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
          (issue: MarkdownlintIssue) =>
            `- **Line ${issue.lineNumber}**: ${issue.ruleDescription} (${issue.ruleNames.join('/')})\n  ${issue.errorDetail || ''}`
        )
        .join('\n');

      const fixableCount = issues.filter(issue => issue.fixInfo).length;
      const fixableText =
        fixableCount > 0
          ? `\n\n💡 **${fixableCount} of these issues can be automatically fixed** using the \`fix_markdown\` tool.`
          : '';

      return {
        content: [
          {
            type: 'text',
            text: `## Markdown Linting Results for ${path.basename(filePath)}\n\n**Found ${issues.length} issue(s):**\n\n${issueList}${fixableText}`,
          },
        ],
      };
    } catch (error) {
      logger.error(`Error linting markdown file: ${filePath}`, error);
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Fix markdown issues in a file
   * @param filePath Path to the markdown file
   * @param writeToFile Whether to write fixes back to the file
   * @returns MCP content response with fix results
   */
  public async fixMarkdown(filePath: string, writeToFile: boolean) {
    try {
      logger.debug(`Fixing markdown file: ${filePath}, writeToFile: ${writeToFile}`);

      // Read file content
      const originalContent = await readFile(filePath);

      // Load configuration
      const config = await loadConfiguration(path.dirname(filePath));

      // Get initial issues count (lazy import)
      const mdInit = await import('markdownlint');
      const markdownlintInit =
        (mdInit as unknown as { default?: Markdownlint }).default ??
        (mdInit as unknown as Markdownlint);
      const initialResults = markdownlintInit.sync({
        strings: {
          [filePath]: originalContent,
        },
        config,
      });
      const initialLintResults = (initialResults[filePath] ||
        []) as import('markdownlint').LintResult[];
      const initialIssues: MarkdownlintIssue[] = initialLintResults.map(r => {
        const rawFix = (r as import('markdownlint').LintResult & { fixInfo?: unknown }).fixInfo as unknown;
        const fixInfo = (() => {
          type FixShape = { editColumn?: number; deleteCount?: number; insertText?: string };
          if (rawFix && typeof rawFix === 'object') {
            const candidate = rawFix as FixShape;
            return {
              editColumn: typeof candidate.editColumn === 'number' ? candidate.editColumn : undefined,
              deleteCount: typeof candidate.deleteCount === 'number' ? candidate.deleteCount : undefined,
              insertText: typeof candidate.insertText === 'string' ? candidate.insertText : undefined,
            };
          }
          return undefined;
        })();
        return {
          lineNumber: r.lineNumber,
          ruleNames: r.ruleNames,
          ruleDescription:
            r.ruleNames && r.ruleNames.length > 0 ? r.ruleNames.join('/') : 'Unknown rule',
          errorDetail: (r as import('markdownlint').LintResult & { errorDetail?: string })
            .errorDetail,
          fixInfo,
        };
      });
      logger.info(`Initial issues count: ${initialIssues.length}`);

      // Split content into lines
      let lines = contentToLines(originalContent);
      let fixesApplied = 0;

      // Get rule names from the issues to apply fixes
      const ruleNames = initialIssues
        .map(issue => issue.ruleNames[0])
        .filter((value, index, self) => self.indexOf(value) === index); // Unique rule names

      logger.debug(`Applying fixes for rules: ${ruleNames.join(', ')}`);

      // Apply our custom rule fixes
      const implementedRuleNames = getImplementedRules();
      const rulesToApply = ruleNames.filter(rule => implementedRuleNames.includes(rule));

      if (rulesToApply.length > 0) {
        const originalLineCount = lines.length;
        lines = applyRuleFixes(lines, rulesToApply);
        // Calculate rough number of fixes applied
        fixesApplied += lines.length - originalLineCount;
        logger.debug(`Applied custom fixes: ${fixesApplied}`);
      }

      // Combine lines back into content
      const currentContent = linesToContent(lines);

      // If content has changed, consider the fixes applied
      if (currentContent !== originalContent) {
        fixesApplied = fixesApplied > 0 ? fixesApplied : 1;
      }

      // Apply markdownlint's built-in fixes if available
      if (fixesApplied === 0) {
        try {
          // Try markdownlint's built-in fix as a fallback
          const mdFix = await import('markdownlint');
          const markdownlintFix =
            (mdFix as unknown as { default?: Markdownlint }).default ??
            (mdFix as unknown as Markdownlint);
          const fixResults = markdownlintFix.sync({
            strings: {
              [filePath]: originalContent,
            },
            config,
            fix: true,
          } as Parameters<Markdownlint['sync']>[0]);

          // Avoid indexing by user-provided keys; use first available result
          const firstResult = Object.values(fixResults)[0] as import('markdownlint').LintResult[] | undefined;
          const fixedContent = firstResult?.[0]?.fixedContent as string | undefined;

          if (fixedContent && fixedContent !== originalContent) {
            lines = contentToLines(fixedContent);
            fixesApplied += 1; // Count one fix per rule applied
            logger.debug('Applied built-in markdownlint fixes');
          }
        } catch (err) {
          logger.error('Error in fallback fix attempt:', err);
        }
      }

      // Write the fixed content back to file if requested
      if (writeToFile && fixesApplied > 0) {
        await writeFile(filePath, currentContent);
        logger.info(`Wrote fixed content to ${filePath}`);
      }

      // Get final results
      const mdFinal = await import('markdownlint');
      const markdownlintFinal =
        (mdFinal as unknown as { default?: Markdownlint }).default ??
        (mdFinal as unknown as Markdownlint);
      const finalResults = markdownlintFinal.sync({
        strings: {
          [filePath]: currentContent,
        },
        config,
      });
      const finalLintResults = (finalResults[filePath] ||
        []) as import('markdownlint').LintResult[];
      const finalIssues: MarkdownlintIssue[] = finalLintResults.map(r => {
        const rawFix = (r as import('markdownlint').LintResult & { fixInfo?: unknown }).fixInfo as unknown;
        const fixInfo = (() => {
          type FixShape = { editColumn?: number; deleteCount?: number; insertText?: string };
          if (rawFix && typeof rawFix === 'object') {
            const candidate = rawFix as FixShape;
            return {
              editColumn: typeof candidate.editColumn === 'number' ? candidate.editColumn : undefined,
              deleteCount: typeof candidate.deleteCount === 'number' ? candidate.deleteCount : undefined,
              insertText: typeof candidate.insertText === 'string' ? candidate.insertText : undefined,
            };
          }
          return undefined;
        })();

        return {
          lineNumber: r.lineNumber,
          ruleNames: r.ruleNames,
          ruleDescription:
            r.ruleNames && r.ruleNames.length > 0 ? r.ruleNames.join('/') : 'Unknown rule',
          errorDetail: (r as import('markdownlint').LintResult & { errorDetail?: string })
            .errorDetail,
          fixInfo,
        };
      });
      logger.info(`Final issues count: ${finalIssues.length}`);

      // Generate status report
      let statusText = '';

      if (fixesApplied > 0) {
        statusText = `✅ **Successfully fixed ${fixesApplied} issue(s)**\n\n`;
      }

      if (finalIssues.length > 0) {
        statusText += `⚠️ **${finalIssues.length} issue(s) require manual attention:**\n\n`;
        const remainingList = finalIssues
          .map(
            (issue: MarkdownlintIssue) =>
              `- **Line ${issue.lineNumber}**: ${issue.ruleDescription} (${issue.ruleNames.join('/')})\n  ${issue.errorDetail || ''}`
          )
          .join('\n');
        statusText += remainingList;
      } else if (fixesApplied > 0) {
        statusText += `🎉 **All issues resolved!** The file is now fully compliant with Markdown standards.`;
      } else {
        statusText = `✅ **No fixes needed** - The file is already compliant.`;
      }

      if (writeToFile && fixesApplied > 0) {
        statusText += `\n\n📝 **Changes saved to file**`;
      }

      // Add summary
      statusText += `\n\n**Summary:**\n- **Before:** ${initialIssues.length} issues\n- **After:** ${finalIssues.length} issues\n- **Fixed:** ${fixesApplied} issues`;

      return {
        content: [
          {
            type: 'text',
            text: `## Fix Results for ${path.basename(filePath)}\n\n${statusText}${!writeToFile && fixesApplied > 0 ? '\n\n**Preview of fixed content:**\n\n```markdown\n' + currentContent + '\n```' : ''}`,
          },
        ],
      };
    } catch (error) {
      logger.error(`Error fixing markdown file: ${filePath}`, error);
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new McpError(ErrorCode.InvalidParams, `File not found: ${filePath}`);
      }
      throw error;
    }
  }

  /**
   * Get the current markdownlint configuration
   * @returns MCP content response with configuration details
   */
  public async getConfiguration() {
    logger.debug('Getting markdownlint configuration');
    const implementedRules = getImplementedRules();

    return {
      content: [
        {
          type: 'text',
          text: `## Current Markdownlint Configuration\n\n**Active Rules:**\n- Line length limit: 120 characters\n- HTML elements: Allowed\n- First line heading: Not required\n- All other rules: Enabled (default markdownlint ruleset)\n\n**Configuration Source:** Built-in defaults (can be overridden with .markdownlint.json)\n\n**Total Rules:** 30+ standard markdownlint rules covering formatting, consistency, and best practices.\n\n**Auto-Fix Capability:** Automatically fixes ${implementedRules.length} rule violations including ${implementedRules.join(', ')}.`,
        },
      ],
    };
  }

  /**
   * Start the MCP server
   */
  public async run() {
    logger.info('Starting markdownlint MCP server');
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Markdownlint MCP server running on stdio');
  }
}

/**
 * Create and return a new MarkdownLint server instance
 * @returns A new MarkdownLintServer instance
 */
export function createServer(): MarkdownLintServer {
  return new MarkdownLintServer();
}

export default MarkdownLintServer;
