import { createServer, SERVER_NAME } from '../server';

describe('MarkdownLintServer', () => {
  test('server exposes the correct package name', () => {
    const server = createServer();
    expect(server.serverName).toBe(SERVER_NAME);
  });
});
