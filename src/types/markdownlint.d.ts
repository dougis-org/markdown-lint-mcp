declare module 'markdownlint' {
  export interface Options {
    files?: string[];
    strings?: { [key: string]: string };
    config?: object | string;
    resultVersion?: number;
    frontMatter?: string | null;
    fix?: boolean;
    [key: string]: unknown;
  }

  export interface LintError {
    lineNumber: number;
    ruleNames: string[];
    ruleDescription: string;
    ruleInformation: string | null;
    errorDetail: string | null;
    errorRange: [number, number] | null;
    fixInfo?: unknown;
    fixedContent?: string;
    [key: string]: unknown;
  }

  export type LintResult = LintError;
  export type LintResults = {
    [filename: string]: LintError[];
  };

  export interface Markdownlint {
    sync(options: Options | null): LintResults;
    promise?(options: Options | null): Promise<LintResults>;
    [key: string]: unknown;
  }

  const markdownlint: Markdownlint;
  export default markdownlint;

  // Also export from top-level for the augmented module
  export { LintError, LintResult, LintResults, Markdownlint };
}

declare namespace markdownlint {
  type Options = import('markdownlint').Options;
  type LintError = import('markdownlint').LintError;
  type LintResult = import('markdownlint').LintResult;
  type LintResults = import('markdownlint').LintResults;
}
