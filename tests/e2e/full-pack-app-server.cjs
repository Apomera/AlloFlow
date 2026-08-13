/*
 * Build and serve the real AlloFlow app for Full Pack E2E tests without the
 * CRA development server. The app is unusually large, and react-scripts start
 * can open its TCP port long before webpack is able to answer HTTP requests.
 *
 * This runner uses a minimal production webpack graph with minification disabled,
 * keeps all generated artifacts in the OS temp directory, and serves public
 * assets directly from desktop/web-app/public. It never mutates source files.
 */
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const appDir = path.join(repoRoot, 'desktop', 'web-app');
const publicDir = path.join(appDir, 'public');
const port = Number(process.env.PORT || 3001);
const cacheKey = crypto.createHash('sha256').update(repoRoot).digest('hex').slice(0, 12);
const outputDir = path.join(os.tmpdir(), 'alloflow-full-pack-e2e-' + cacheKey);

const entryPath = path.join(__dirname, 'full-pack-app-entry.js');
const firebaseStubPath = path.join(__dirname, 'firebase-e2e-stub.js');
const swcLoaderPath = path.join(__dirname, 'swc-e2e-loader.cjs');

// Resolve package imports from the actual app regardless of Playwright's cwd.

process.chdir(appDir);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('Invalid Full Pack E2E port: ' + process.env.PORT);
}
if (!outputDir.startsWith(path.resolve(os.tmpdir()) + path.sep)) {
  throw new Error('Refusing to build outside the OS temporary directory.');
}

process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';
process.env.GENERATE_SOURCEMAP = 'false';
process.env.DISABLE_ESLINT_PLUGIN = 'true';
process.env.INLINE_RUNTIME_CHUNK = 'false';

const requireFromApp = relativePath => require(path.join(appDir, 'node_modules', relativePath));
const webpack = requireFromApp('webpack');

const config = {
  mode: 'production',
  context: appDir,
  target: ['web', 'es2020'],
  entry: entryPath,
  output: {
    path: outputDir,
    filename: 'static/js/main.js',
    publicPath: '/',
    clean: true,
  },
  cache: false,
  devtool: false,
  performance: false,
  optimization: {
    minimize: false,
    runtimeChunk: false,
    splitChunks: false,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json'],
    modules: [path.join(appDir, 'node_modules'), 'node_modules'],
    alias: {
      'firebase/app$': firebaseStubPath,
      'firebase/auth$': firebaseStubPath,
      'firebase/app-check$': firebaseStubPath,
      'firebase/firestore$': firebaseStubPath,
    },
  },
  module: {
    rules: [{
      test: /\.[cm]?jsx?$/,
      include: [path.join(appDir, 'src'), __dirname],
      use: { loader: swcLoaderPath },
    }],
  },
  plugins: [new webpack.DefinePlugin({
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env.PUBLIC_URL': JSON.stringify(''),
  })],
};

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.ogg': 'audio/ogg',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

const safeFile = (root, pathname) => {
  const candidate = path.resolve(root, '.' + pathname);
  return candidate === root || candidate.startsWith(root + path.sep) ? candidate : null;
};

const serveFile = (response, filePath) => {
  response.statusCode = 200;
  response.setHeader('Content-Type', mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  fs.createReadStream(filePath).on('error', () => {
    if (!response.headersSent) response.statusCode = 500;
    response.end();
  }).pipe(response);
};

const writeIndexHtml = () => {
  const template = fs.readFileSync(path.join(publicDir, 'index.html'), 'utf8');
  const bodyMarker = '</body>';
  if (template.split(bodyMarker).length !== 2) {
    throw new Error('Expected one closing body tag in the E2E HTML template.');
  }
  const html = template
    .split('%PUBLIC_URL%').join('')
    .replace(bodyMarker, '  <script src="/static/js/main.js"></script>\n' + bodyMarker);
  fs.writeFileSync(path.join(outputDir, 'index.html'), html, 'utf8');
};

const startServer = () => {
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || '/', 'http://127.0.0.1:' + port);
    if (requestUrl.pathname === '/__health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify({ ready: true, mode: 'production-static' }));
      return;
    }

    let pathname;
    try { pathname = decodeURIComponent(requestUrl.pathname); } catch (_) { pathname = '/'; }
    if (pathname === '/') pathname = '/index.html';
    const candidates = [safeFile(outputDir, pathname), safeFile(publicDir, pathname)].filter(Boolean);
    const exact = candidates.find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (exact) {
      serveFile(response, exact);
      return;
    }

    // React routes use the generated shell; asset requests retain a truthful 404.
    if (!path.extname(pathname)) {
      serveFile(response, path.join(outputDir, 'index.html'));
      return;
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end('Not found');
  });

  server.once('error', error => {
    console.error(`[full-pack-e2e] server failed: ${error.message}`);
    process.exit(1);
  });

  server.listen(port, '127.0.0.1', () => {
    console.log('[full-pack-e2e] ready http://127.0.0.1:' + port + '/__health');
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

console.log('[full-pack-e2e] compiling the real App.jsx host without minification or the Tailwind/Firebase graph...');
webpack(config, (error, stats) => {
  if (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
    return;
  }
  const report = stats.toJson({ all: false, errors: true, warnings: true, timings: true });
  if (stats.hasErrors()) {
    console.error('[full-pack-e2e] webpack errors:', report.errors);
    process.exitCode = 1;
    return;
  }
  if (report.warnings && report.warnings.length) {
    console.warn('[full-pack-e2e] webpack warnings: ' + report.warnings.length);
  }
  writeIndexHtml();
  console.log('[full-pack-e2e] compiled in ' + Math.round((report.time || 0) / 1000) + 's');
  startServer();
});