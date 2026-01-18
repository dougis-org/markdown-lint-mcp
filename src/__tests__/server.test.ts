import { createServer } from '../server';

test('server exposes the correct package name', () => {
  const server = createServer();
  expect(server.serverName).toBe('markdown-lint-mcp');
});
