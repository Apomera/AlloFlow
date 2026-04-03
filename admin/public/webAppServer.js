/**
 * AlloFlow Web App Server
 * Serves the built AlloFlow web app on a local port (default 3000).
 * Injects local AI config auto-detection into the served HTML so the
 * web app auto-connects to local Ollama and Piper with zero setup.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let server = null;
let serverPort = 3000;

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

/**
 * Build the config injection script.
 * This script runs before the React app and writes the local AI config
 * into localStorage so AIProvider picks it up automatically.
 */
function buildConfigScript() {
  const configPath = path.join(os.homedir(), '.alloflow', 'ai_config.json');
  let configJson = '{}';
  try {
    if (fs.existsSync(configPath)) {
      configJson = fs.readFileSync(configPath, 'utf-8');
      // Validate it's actually JSON
      JSON.parse(configJson);
    }
  } catch (err) {
    console.warn('[webapp] Could not read ai_config.json:', err.message);
    configJson = '{}';
  }

  return `<script>
/* AlloFlow Local Config Auto-Injection */
(function() {
  try {
    var cfg = ${configJson};
    if (cfg && cfg.backend) {
      localStorage.setItem('alloflow_ai_config', JSON.stringify(cfg));
      console.log('[AlloFlow] Local AI config applied: backend=' + cfg.backend);
    }
  } catch(e) {
    console.warn('[AlloFlow] Config injection failed:', e);
  }
})();
</script>`;
}

/**
 * Resolve the web app build directory.
 * In dev: ../prismflow-deploy/build (relative to admin/public/)
 * In production: process.resourcesPath/webapp
 */
function resolveWebAppDir(isPackaged) {
  if (isPackaged) {
    return path.join(process.resourcesPath, 'webapp');
  }
  // Dev mode — try the prismflow-deploy build folder
  return path.join(__dirname, '..', '..', 'prismflow-deploy', 'build');
}

/**
 * Start the web app HTTP server.
 * @param {number} port - Port to listen on (default 3000)
 * @param {boolean} isPackaged - Whether the app is packaged (electron production)
 * @returns {Promise<number>} The port the server is listening on
 */
function startWebAppServer(port, isPackaged) {
  serverPort = port || 3000;
  const webAppDir = resolveWebAppDir(isPackaged);

  if (!fs.existsSync(webAppDir)) {
    console.warn('[webapp] Web app directory not found:', webAppDir);
    return Promise.reject(new Error('Web app build not found at ' + webAppDir));
  }

  const indexPath = path.join(webAppDir, 'index.html');
  if (!fs.existsSync(indexPath)) {
    return Promise.reject(new Error('index.html not found in web app build'));
  }

  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      // CORS headers for local development
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // Parse URL path, strip query strings
      let urlPath = (req.url || '/').split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      // Sanitize path to prevent directory traversal
      const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, '');
      const filePath = path.join(webAppDir, safePath);

      // Ensure the resolved path is within webAppDir
      if (!filePath.startsWith(webAppDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      // Static assets (JS/CSS/media under /static/ or known extensions) must
      // NEVER fall back to index.html — a missing hash-named file means the
      // service worker has a stale reference. Return 404 so the browser
      // discards the stale cache entry rather than parsing HTML as JS.
      const isStaticAsset = urlPath.startsWith('/static/') ||
        ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
         '.ico', '.woff', '.woff2', '.ttf', '.map'].includes(path.extname(urlPath).toLowerCase());

      if (isStaticAsset && !fs.existsSync(filePath)) {
        res.writeHead(404);
        res.end('Not Found');
        return;
      }

      // Serve index.html with injected config for SPA routes
      if (!fs.existsSync(filePath) || urlPath === '/index.html') {
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');

          // Inject local config script after <head>
          const configScript = buildConfigScript();
          html = html.replace('<head>', '<head>' + configScript);

          res.writeHead(200, {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          });
          res.end(html);
        } catch (err) {
          console.error('[webapp] Error serving index.html:', err.message);
          res.writeHead(500);
          res.end('Internal Server Error');
        }
        return;
      }

      // Serve static files
      try {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const content = fs.readFileSync(filePath);

        // Service worker and manifest must never be cached so version
        // updates take effect immediately
        const noCache = ['/service-worker.js', '/manifest.json'].includes(urlPath);
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': noCache
            ? 'no-store, no-cache, must-revalidate'
            : 'public, max-age=31536000, immutable',
        });
        res.end(content);
      } catch (err) {
        // True file-not-found — static assets already handled above, so
        // this can only be a SPA route; serve index.html.
        if (isStaticAsset) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        try {
          let html = fs.readFileSync(indexPath, 'utf-8');
          const configScript = buildConfigScript();
          html = html.replace('<head>', '<head>' + configScript);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
          res.end(html);
        } catch (innerErr) {
          res.writeHead(500);
          res.end('Internal Server Error');
        }
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.warn(`[webapp] Port ${serverPort} in use, trying ${serverPort + 1}`);
        serverPort++;
        server.listen(serverPort, '127.0.0.1');
      } else {
        reject(err);
      }
    });

    server.listen(serverPort, '127.0.0.1', () => {
      console.log(`[webapp] AlloFlow web app serving at http://localhost:${serverPort}`);
      resolve(serverPort);
    });
  });
}

/**
 * Stop the web app server.
 */
function stopWebAppServer() {
  if (server) {
    try {
      server.close();
      console.log('[webapp] Web app server stopped');
    } catch (err) {
      console.warn('[webapp] Error stopping web app server:', err.message);
    }
    server = null;
  }
}

/**
 * Get the current web app server port.
 */
function getWebAppPort() {
  return serverPort;
}

module.exports = {
  startWebAppServer,
  stopWebAppServer,
  getWebAppPort,
};
