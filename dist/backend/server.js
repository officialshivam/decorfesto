import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleApiRequest, initializeBackend } from './src/router.js';
import { getCorsHeaders, localPort } from './src/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/*
 * Resolve the React production build correctly.
 *
 * Local development:
 *   project/
 *   ├── backend/server.js
 *   └── dist/
 *
 * Hostinger deployment:
 *   dist/
 *   ├── index.html
 *   ├── assets/
 *   └── backend/
 *       └── server.js
 *
 * Therefore:
 * - Local backend/server.js -> ../dist
 * - Hostinger dist/backend/server.js -> ..
 */
import syncFs from 'node:fs';

const distCandidate = path.resolve(__dirname, '..', 'dist');
const distRoot = syncFs.existsSync(path.join(distCandidate, 'index.html'))
  ? distCandidate
  : path.resolve(__dirname, '..');

function isApiRequest(pathname, req) {
  const acceptHeader = req?.headers?.accept || '';
  if (acceptHeader.includes('text/html')) {
    return false;
  }

  const explicitApiPrefixes = [
    '/health',
    '/auth',
    '/payments',
    '/decorations',
    '/customers',
    '/vendors',
    '/service-areas',
    '/charges',
    '/availability',
  ];

  if (explicitApiPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (pathname === '/admin/dashboard' || pathname.startsWith('/admin/charges') || pathname.startsWith('/admin/users')) {
    return true;
  }

  if (pathname === '/vendor/me' || pathname.startsWith('/vendor/orders') || pathname.startsWith('/vendor/profile')) {
    return true;
  }

  if (pathname === '/orders' || pathname.startsWith('/orders/')) {
    return true;
  }

  return false;
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
    res.writeHead(400, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end('Invalid URL');
    return;
  }

  // Remove trailing slash except for root.
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  const relativePath =
    pathname === '/' ? 'index.html' : pathname.slice(1);

  // Prevent path traversal.
  const requestedPath = path.resolve(
    distRoot,
    relativePath
  );

  if (
    requestedPath !== distRoot &&
    !requestedPath.startsWith(`${distRoot}${path.sep}`)
  ) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end('Forbidden');
    return;
  }

  try {
    const fileInfo = await fs.stat(requestedPath);

    if (fileInfo.isFile()) {
      const content = await fs.readFile(requestedPath);

      res.writeHead(200, {
        'Content-Type': getContentType(requestedPath),
        'Cache-Control':
          pathname === '/'
            ? 'no-cache'
            : 'public, max-age=31536000',
      });

      res.end(content);
      return;
    }
  } catch {
    // File doesn't exist — continue to SPA fallback.
  }

  // React Router / SPA fallback.
  try {
    const indexPath = path.join(distRoot, 'index.html');
    const indexContent = await fs.readFile(indexPath);

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    });

    res.end(indexContent);
  } catch (error) {
    console.error(
      'Unable to serve React application:',
      error
    );

    console.error('Expected frontend build at:', distRoot);

    res.writeHead(500, {
      'Content-Type': 'text/plain; charset=utf-8',
    });

    res.end('Frontend build is not available.');
  }
}

function main() {
  const server = http.createServer(async (req, res) => {
    try {
      const requestUrl = new URL(
        req.url,
        `http://${req.headers.host || 'localhost'}`
      );

      if (
        isApiRequest(requestUrl.pathname, req) ||
        req.method === 'OPTIONS'
      ) {
        const handled = await handleApiRequest(req, res);
        if (handled !== false) {
          return;
        }
      }

      await serveFrontend(req, res);
    } catch (error) {
      console.error('Request error:', error);

      if (!res.headersSent) {
        res.writeHead(500, {
          'Content-Type': 'application/json',
          ...getCorsHeaders(req.headers),
        });
      }

      res.end(
        JSON.stringify({
          error: 'Internal server error.',
        })
      );
    }
  });

  const rawPort = process.env.PORT || localPort;
  const port = isNaN(Number(rawPort)) ? rawPort : Number(rawPort);

  server.listen(port, '0.0.0.0', () => {
    console.log(`DecorFesto server listening on ${port} (0.0.0.0)`);
    console.log(`Serving React app from ${distRoot}`);

    initializeBackend()
      .then(() => {
        console.log('Backend async initialization complete.');
      })
      .catch((err) => {
        console.warn('Backend async initialization warning:', err.message);
      });
  });
}

main();
