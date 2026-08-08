import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleApiRequest, initializeBackend } from './src/router.js';
import { localPort } from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// React production build is at: project-root/dist
const distRoot = path.resolve(__dirname, '..', 'dist');

const apiPrefixes = [
  '/health',
  '/decorations',
  '/customers',
  '/vendors',
  '/service-areas',
  '/orders',
  '/availability',
];

function isApiRequest(pathname) {
  return (
    pathname === '/health' ||
    apiPrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    )
  );
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };

  return types[extension] || 'application/octet-stream';
}

async function serveFrontend(req, res) {
  const requestUrl = new URL(
    req.url,
    `http://${req.headers.host || 'localhost'}`
  );

  let pathname;

  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Invalid URL');
    return;
  }

  // Remove trailing slash except for root
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  let relativePath = pathname === '/' ? 'index.html' : pathname.slice(1);

  // Prevent path traversal
  const requestedPath = path.resolve(distRoot, relativePath);

  if (
    requestedPath !== distRoot &&
    !requestedPath.startsWith(`${distRoot}${path.sep}`)
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  try {
    const fileInfo = await fs.stat(requestedPath);

    if (fileInfo.isFile()) {
      const content = await fs.readFile(requestedPath);

      res.writeHead(200, {
        'Content-Type': getContentType(requestedPath),
        'Cache-Control': pathname === '/' ? 'no-cache' : 'public, max-age=31536000',
      });

      res.end(content);
      return;
    }
  } catch {
    // File doesn't exist — continue to SPA fallback.
  }

  // React Router / SPA fallback
  try {
    const indexPath = path.join(distRoot, 'index.html');
    const indexContent = await fs.readFile(indexPath);

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });

    res.end(indexContent);
  } catch (error) {
    console.error('Unable to serve React application:', error);

    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=utf-8',
    });

    res.end('Frontend build is not available.');
  }
}

async function main() {
  await initializeBackend();

  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      );

      if (isApiRequest(requestUrl.pathname) || req.method === 'OPTIONS') {
        await handleApiRequest(req, res);
        return;
      }

      await serveFrontend(req, res);
    } catch (error) {
      console.error('Request error:', error);

      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
        });
      }

      res.end(JSON.stringify({ error: 'Internal server error.' }));
    }
  });

  const port = Number(process.env.PORT || localPort);

  server.listen(port, '0.0.0.0', () => {
    console.log(`DecorFesto server listening on port ${port}`);
    console.log(`Serving React app from ${distRoot}`);
  });
}

main().catch((error) => {
  console.error('Failed to start DecorFesto:', error);
  process.exit(1);
});