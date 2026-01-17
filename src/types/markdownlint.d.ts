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

  export interface LintResult {
    ruleNames: string[];
    lineNumber: number;
    ruleInfo: { [key: string]: unknown };
    errorRange?: [number, number];
    [key: string]: unknown;
  }

  export interface Markdownlint {
    sync(options: Options): { [filename: string]: LintResult[] };
    promise?(options: Options): Promise<{ [filename: string]: LintResult[] }>;
    [key: string]: unknown;
  }

  const markdownlint: Markdownlint;
  export default markdownlint;
}

declare namespace markdownlint {
  type Options = import('markdownlint').Options;
  type LintResult = import('markdownlint').LintResult;
}
