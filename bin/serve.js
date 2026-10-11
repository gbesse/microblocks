#!/usr/bin/env node
import http from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { message } from '../src/i18n.js';
const root = fileURLToPath(new URL('../', import.meta.url));
export function createDemoServer() {
  return http.createServer(async (req, res) => {
    const locale = new URL(req.url, 'http://localhost').searchParams.get('lang');
    const lang = ['fr', 'en', 'es'].includes(locale) ? locale : 'fr';
    try {
      const port = res.socket.localPort;
      if (
        !['127.0.0.1:' + port, 'localhost:' + port].includes(req.headers.host) ||
        req.method !== 'GET'
      )
        throw Error();
      const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const relative = path === '/' ? 'public/index.html' : path.slice(1);
      if (!/^(public|src|fixtures)\//.test(relative)) throw Error();
      const file = await realpath(resolve(root, relative));
      const allowed = ['public', 'src', 'fixtures'].some((dir) =>
        file.startsWith(resolve(root, dir) + sep),
      );
      const type = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
      }[extname(file)];
      if (!allowed || !type) throw Error();
      res.writeHead(200, {
        'Content-Type': type + '; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; connect-src 'self'; frame-ancestors 'none'",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(message('notFound', lang));
    }
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4321);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(message('invalidInput', 'fr'));
    process.exitCode = 2;
  } else {
    const server = createDemoServer();
    server.on('error', () => {
      console.error(message('serverError', 'fr'));
      process.exitCode = 2;
    });
    server.listen(port, '127.0.0.1', () =>
      console.log(message('listening', 'fr', { url: 'http://127.0.0.1:' + port })),
    );
  }
}
