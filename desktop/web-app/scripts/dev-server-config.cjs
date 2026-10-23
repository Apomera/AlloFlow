'use strict';

const fs = require('node:fs');
const path = require('node:path');

function list(value) {
  return (value || '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function origin(value) {
  if (typeof value !== 'string' || /[\s\x00-\x1f\x7f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) && url.origin === value ? value : null;
  } catch { return null; }
}

function browserRequestAllowed(req, extraOrigins) {
  const supplied = req.headers.origin;
  const expected = origin(`${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`);
  if (supplied !== undefined) {
    return !!origin(supplied) && (supplied === expected || extraOrigins.has(supplied));
  }
  // Normal navigations and non-browser clients work; cross-site subresources
  // must not expose the development bundle when a browser omits Origin.
  return !['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])
    || (req.method === 'GET' && req.headers['sec-fetch-mode'] === 'navigate'
      && req.headers['sec-fetch-dest'] === 'document');
}

function createDevServerConfig({ paths, proxy, https = false, env = process.env, requireTool }) {
  if (env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true') {
    throw new Error('Use ALLOFLOW_DEV_ALLOWED_HOSTS for explicit preview hostnames; disabling host checks is unsupported.');
  }
  const hosts = list(env.ALLOFLOW_DEV_ALLOWED_HOSTS);
  for (const host of hosts) {
    let valid = false;
    try { valid = new URL('http://' + host).hostname === host; } catch { /* Invalid hostname. */ }
    if (!valid || /[\s*\/@?#]/.test(host) || host.startsWith('.')) {
      throw new Error('ALLOFLOW_DEV_ALLOWED_HOSTS must contain exact hostnames without ports, schemes or wildcards.');
    }
  }
  const extraOrigins = new Set(list(env.ALLOFLOW_DEV_ALLOWED_ORIGINS));
  for (const value of extraOrigins) {
    if (!origin(value)) throw new Error('ALLOFLOW_DEV_ALLOWED_ORIGINS must contain exact http(s) origins without paths.');
  }
  const publicPath = paths.publicUrlOrPath;
  if (!publicPath.startsWith('/') || !publicPath.endsWith('/') || publicPath.startsWith('//')) {
    throw new Error('The development public path must be an absolute path ending in /.');
  }
  const sockPath = env.WDS_SOCKET_PATH || '/ws';
  if (!sockPath.startsWith('/') || /[\s?#]/.test(sockPath)) throw new Error('WDS_SOCKET_PATH must be an absolute URL path.');
  const config = {
    host: env.HOST || '127.0.0.1',
    allowedHosts: hosts.length ? hosts : 'auto',
    compress: true,
    hot: true,
    server: https ? { type: 'https', options: typeof https === 'object' ? https : {} } : 'http',
    static: { directory: paths.appPublic, publicPath: [publicPath],
      watch: { ignored: requireTool('react-dev-utils/ignoredFiles')(paths.appSrc) } },
    client: { webSocketURL: { hostname: env.WDS_SOCKET_HOST || undefined, pathname: sockPath, port: env.WDS_SOCKET_PORT || undefined },
      overlay: { errors: true, warnings: false } },
    webSocketServer: { type: 'ws', options: { path: sockPath,
      verifyClient: ({ req }, done) => done(browserRequestAllowed(req, extraOrigins), 403, 'Browser origin is not allowed') } },
    // Preserve the trailing slash: stripping it can expose sibling in-memory paths.
    devMiddleware: { publicPath },
    historyApiFallback: { disableDotRule: true, index: publicPath + 'index.html' },
    setupMiddlewares(middlewares, server) {
      const guard = { name: 'alloflow-browser-origin', middleware(req, res, next) {
        if (!browserRequestAllowed(req, extraOrigins)) {
          res.statusCode = 403;
          res.end('Browser origin is not allowed');
          return;
        }
        res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
        if (extraOrigins.has(req.headers.origin)) {
          res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
          res.setHeader('Vary', 'Origin');
        }
        next();
      } };
      // Keep upstream host validation first, and run our guard before source,
      // editor, proxy and static middlewares (including src/setupProxy.js).
      const hostIndex = middlewares.findIndex((entry) => entry.name === 'host-header-check');
      middlewares.splice(hostIndex + 1, 0, guard);
      const router = requireTool('express').Router();
      if (fs.existsSync(paths.proxySetup)) require(paths.proxySetup)(router);
      // CRA's overlay expects the old _stats property. Track compiler results
      // through webpack's public hook instead of depending on server internals.
      let stats;
      server.compiler.hooks.done.tap('AlloFlowSourceMaps', (result) => { stats = result; });
      const evalSource = requireTool('react-dev-utils/evalSourceMapMiddleware')({ get _stats() { return stats; } });
      router.use((req, res, next) => {
        if (req.url.startsWith('/__get-internal-source')) {
          const id = typeof req.query.fileName === 'string' && /^webpack-internal:\/\/\/(.+)$/.exec(req.query.fileName)?.[1];
          const compilation = stats?.compilation;
          const sourceModule = id && compilation && Array.from(compilation.modules)
            .find((entry) => compilation.chunkGraph.getModuleId(entry) == id);
          if (!sourceModule || typeof sourceModule.originalSource !== 'function' || !sourceModule.originalSource()) {
            res.status(400).end('Invalid source request');
            return;
          }
        }
        evalSource(req, res, next);
      });
      middlewares.splice(hostIndex + 2, 0, { name: 'alloflow-source-and-custom-proxy', middleware: router });
      // Reset stale production service workers before the SPA history fallback.
      const historyIndex = middlewares.findIndex((entry) => entry.name === 'connect-history-api-fallback');
      middlewares.splice(historyIndex < 0 ? middlewares.length : historyIndex, 0,
        { name: 'alloflow-development-worker', middleware: requireTool('react-dev-utils/noopServiceWorkerMiddleware')(publicPath) });
      middlewares.push({ name: 'alloflow-public-path', middleware: requireTool('react-dev-utils/redirectServedPathMiddleware')(publicPath) });
      return middlewares;
    },
  };
  if (proxy) config.proxy = proxy.map((entry) => ({ ...entry,
    context(pathname, req) {
      if (req.headers.upgrade?.toLowerCase() === 'websocket' && !browserRequestAllowed(req, extraOrigins)) {
        req.socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');
        return false;
      }
      // Browser WebSocket handshakes omit Accept. CRA's HTTP fallback heuristic
      // otherwise drops them, leaving the connection waiting indefinitely.
      if (req.headers.upgrade?.toLowerCase() === 'websocket' && !req.headers.accept) {
        return entry.context(pathname, { ...req, headers: { ...req.headers, accept: '*/*' } });
      }
      return entry.context(pathname, req);
    },
  }));
  return config;
}

function httpsConfig(paths, env = process.env) {
  if (env.HTTPS !== 'true') return false;
  if (!!env.SSL_CRT_FILE !== !!env.SSL_KEY_FILE) throw new Error('Set both SSL_CRT_FILE and SSL_KEY_FILE for a custom HTTPS certificate.');
  if (!env.SSL_CRT_FILE) return true;
  // Node's TLS server validates the key/certificate pair, including ECDSA keys.
  return { cert: fs.readFileSync(path.resolve(paths.appPath, env.SSL_CRT_FILE)),
    key: fs.readFileSync(path.resolve(paths.appPath, env.SSL_KEY_FILE)) };
}

module.exports = { createDevServerConfig, browserRequestAllowed, httpsConfig };
