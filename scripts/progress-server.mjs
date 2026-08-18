import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.EHF_PROGRESS_PORT ?? '4174', 10);
const root = fileURLToPath(new URL('../progress/', import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8'
};

const server = createServer(async (request, response) => {
  const requestPath = new URL(request.url ?? '/', `http://${host}:${port}`).pathname;
  const relativePath = requestPath === '/' ? 'index.html' : requestPath.slice(1);
  const normalizedPath = normalize(relativePath);

  if (normalizedPath.startsWith('..') || normalizedPath.includes('/../')) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(join(root, normalizedPath));
    response.writeHead(200, {
      'Content-Type': contentTypes[extname(normalizedPath)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(body);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      response.writeHead(404).end('Not found');
      return;
    }
    console.error(error);
    response.writeHead(500).end('Internal server error');
  }
});

server.listen(port, host, () => {
  console.log(`EHF route progress: http://${host}:${port}`);
});
