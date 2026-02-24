import { spawn, execSync } from 'child_process';

jest.setTimeout(20000);

describe('integration: server startup', () => {
  test('dist/index.js starts and reports running', async () => {
    // Build project first
    execSync('npm run build', { stdio: 'inherit' });

    const proc = spawn('node', ['dist/index.js'], { cwd: process.cwd(), env: process.env });

    let output = '';
    const waitFor = 'MCP server running on stdio';

    const p = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`Timeout waiting for server to start. Output:\n${output}`));
      }, 10000);

      proc.stdout.on('data', d => {
        output += d.toString();
      });

      proc.stderr.on('data', d => {
        output += d.toString();
        if (output.includes(waitFor)) {
          clearTimeout(timeout);
          proc.kill('SIGKILL');
          resolve();
        }
      });

      proc.on('error', err => {
        clearTimeout(timeout);
        reject(err);
      });

      proc.on('exit', code => {
        // If the process exits early without emitting the running message, fail
        if (!output.includes(waitFor)) {
          clearTimeout(timeout);
          reject(new Error(`Process exited with ${code}. Output:\n${output}`));
        }
      });
    });

    await p;
  });
});
