'use strict';
// Exercise real HTTP, TLS, proxy and hot-reload behavior, including hostile requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { once } = require('node:events');
const { fork } = require('node:child_process');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const web = path.resolve(process.env.SECURITY_WEB_APP || path.join(__dirname, '../../desktop/web-app'));
const requireWeb = createRequire(path.join(web, 'package.json'));
const requireTool = createRequire(requireWeb.resolve('react-scripts/package.json'));
const { createDevServerConfig, httpsConfig } = require(path.join(web, 'scripts/dev-server-config.cjs'));
const WebSocket = requireTool('ws');
const scratch = path.join(web, 'node_modules/.cache/alloflow-security-tests');
fs.mkdirSync(scratch, { recursive: true });

function fixture(publicPath = '/') {
  const dir = fs.mkdtempSync(path.join(scratch, 'dev-server-'));
  const paths = { appPath: dir, appSrc: path.join(dir, 'src'), appPublic: path.join(dir, 'public'),
    proxySetup: path.join(dir, 'src/setupProxy.js'), publicUrlOrPath: publicPath };
  fs.mkdirSync(paths.appSrc);
  fs.mkdirSync(paths.appPublic);
  fs.writeFileSync(path.join(paths.appPublic, 'index.html'), '<!doctype html><title>AlloFlow fixture</title>');
  fs.writeFileSync(path.join(paths.appPublic, 'asset.txt'), 'public asset');
  fs.writeFileSync(path.join(dir, 'private.txt'), 'PRIVATE_OUTSIDE_PUBLIC');
  fs.writeFileSync(path.join(paths.appSrc, 'entry.js'), 'globalThis.fixture = "BEFORE_UPDATE"; if(module.hot) module.hot.accept();');
  return paths;
}

function request(port, url = '/', { headers = {}, method = 'GET', body, tls = false, ca } = {}) {
  return new Promise((resolve, reject) => {
    const req = (tls ? https : http).request({ hostname: '127.0.0.1', port, path: url, method, headers,
      ...(ca ? { ca } : {}) }, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.setTimeout(10000, () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end(body);
  });
}

async function serve(t, paths, overrides = {}) {
  const compiler = requireTool('webpack')({ mode: 'development', context: paths.appPath,
    entry: './src/entry.js', devtool: 'eval-source-map',
    output: { path: path.join(paths.appPath, 'output'), filename: 'bundle.js', publicPath: paths.publicUrlOrPath },
    infrastructureLogging: { level: 'error' }, stats: 'errors-only' });
  const options = createDevServerConfig({ paths, requireTool, env: {}, ...overrides });
  options.devMiddleware.stats = 'errors-only';
  const Server = requireTool('webpack-dev-server');
  const server = new Server({ ...options, port: 0, open: false, setupExitSignals: false }, compiler);
  t.after(async () => {
    await server.stop();
    await new Promise((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
  });
  await server.start();
  await new Promise((resolve, reject) => server.middleware.waitUntilValid((stats) =>
    stats.hasErrors() ? reject(new Error(stats.toString('errors-only'))) : resolve()));
  return { server, port: server.server.address().port };
}

async function socket(t, port, pathname, origin) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}${pathname}`, { origin });
  const messages = [];
  ws.on('message', (raw) => messages.push(JSON.parse(String(raw))));
  t.after(() => ws.terminate());
  await once(ws, 'open');
  return { ws, messages };
}

async function eventually(check) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail('Timed out waiting for hot-reload messages');
}

test('configuration defaults to loopback and rejects broad trust settings', () => {
  const paths = fixture();
  const config = (env) => createDevServerConfig({ paths, requireTool, env });
  assert.equal(config({}).host, '127.0.0.1');
  assert.equal(config({}).allowedHosts, 'auto');
  assert.throws(() => config({ DANGEROUSLY_DISABLE_HOST_CHECK: 'true' }), /explicit preview/);
  for (const host of ['*', '.example.test', 'http://example.test', 'example.test:3000', 'example.test/path']) {
    assert.throws(() => config({ ALLOFLOW_DEV_ALLOWED_HOSTS: host }), /exact hostnames/);
  }
  for (const value of ['*', 'null', 'https://example.test/path', 'https://name:pass@example.test', 'https://example.test\n.evil.test']) {
    assert.throws(() => config({ ALLOFLOW_DEV_ALLOWED_ORIGINS: value }), /exact http/);
  }
  assert.equal(config({ HOST: '0.0.0.0' }).host, '0.0.0.0');
  assert.throws(() => httpsConfig(paths, { HTTPS: 'true', SSL_CRT_FILE: 'cert.pem' }), /both/);
});

test('preview serves assets, SPA routes and source maps while rejecting hostile hosts and origins', { timeout: 60000 }, async (t) => {
  const paths = fixture('/preview/');
  fs.writeFileSync(paths.proxySetup, 'module.exports = app => app.get("/custom-api", (req,res) => res.json({ok:true}));');
  const { port } = await serve(t, paths, { env: { WDS_SOCKET_PATH: '/hot-reload',
    ALLOFLOW_DEV_ALLOWED_HOSTS: 'preview.example.test', ALLOFLOW_DEV_ALLOWED_ORIGINS: 'https://preview.example.test' } });
  const own = `http://127.0.0.1:${port}`;
  const asset = await request(port, '/preview/bundle.js');
  assert.equal(asset.status, 200);
  assert.match(asset.body, /BEFORE_UPDATE/);
  assert.equal(asset.headers['access-control-allow-origin'], undefined);
  assert.equal(asset.headers['cross-origin-resource-policy'], 'same-origin');
  assert.equal((await request(port, '/preview/asset.txt')).body, 'public asset');
  assert.match((await request(port, '/preview/client/route', { headers: { accept: 'text/html' } })).body, /AlloFlow fixture/);
  assert.match((await request(port, '/preview/service-worker.js')).body, /skipWaiting/);
  assert.equal((await request(port, '/custom-api')).status, 200);
  assert.equal((await request(port, '/preview/bundle.js', { headers: { origin: own } })).status, 200);
  assert.equal((await request(port, '/preview/bundle.js', { headers: { host: 'evil.example.test' } })).status, 403);
  assert.equal((await request(port, '/preview/bundle.js', { headers: { host: 'preview.example.test' } })).status, 200);
  for (const origin of ['https://evil.example.test', 'null', `http://127.0.0.1:${port + 1}`]) {
    for (const route of ['/preview/bundle.js', '/custom-api', '/__get-internal-source']) {
      assert.equal((await request(port, route, { headers: { origin } })).status, 403);
    }
  }
  const crossSite = { 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'no-cors', 'sec-fetch-dest': 'script' };
  assert.equal((await request(port, '/preview/bundle.js', { headers: crossSite })).status, 403);
  assert.equal((await request(port, '/preview/bundle.js', { headers: { ...crossSite, 'sec-fetch-site': 'same-site' } })).status, 403);
  const approved = await request(port, '/custom-api', { headers: { origin: 'https://preview.example.test' } });
  assert.equal(approved.status, 200);
  assert.equal(approved.headers['access-control-allow-origin'], 'https://preview.example.test');
  for (const url of ['/preview/../private.txt', '/preview/%2e%2e/private.txt', '/preview-sibling/private.txt']) {
    assert.doesNotMatch((await request(port, url)).body, /PRIVATE_OUTSIDE_PUBLIC/);
  }
  for (const url of ['/__get-internal-source', '/__get-internal-source?fileName=bogus',
    '/__get-internal-source?fileName=webpack-internal%3A%2F%2F%2Fmissing']) {
    assert.equal((await request(port, url)).status, 400);
  }
  const source = await request(port, '/__get-internal-source?fileName=webpack-internal%3A%2F%2F%2F.%2Fsrc%2Fentry.js');
  assert.equal(source.status, 200);
  assert.match(source.body, /BEFORE_UPDATE/);

  const { messages } = await socket(t, port, '/hot-reload', own);
  await eventually(() => messages.some((entry) => entry.type === 'hash'));
  const oldHash = messages.find((entry) => entry.type === 'hash').data;
  fs.writeFileSync(path.join(paths.appSrc, 'entry.js'), 'globalThis.fixture = "AFTER_UPDATE"; if(module.hot) module.hot.accept();');
  await eventually(() => messages.some((entry) => entry.type === 'hash' && entry.data !== oldHash));
  assert.match((await request(port, '/preview/bundle.js')).body, /AFTER_UPDATE/);
  const rejected = new WebSocket(`ws://127.0.0.1:${port}/hot-reload`, { origin: 'https://evil.example.test' });
  rejected.on('error', () => {});
  t.after(() => rejected.terminate());
  const [, response] = await once(rejected, 'unexpected-response');
  assert.equal(response.statusCode, 403);
  rejected.terminate();
});

test('CRA package proxy preserves API POST and WebSocket forwarding', { timeout: 60000 }, async (t) => {
  const upstream = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ method: req.method, body })); });
  });
  const echo = new WebSocket.Server({ server: upstream });
  echo.on('connection', (ws) => ws.on('message', (raw) => ws.send(raw.toString())));
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  t.after(async () => { for (const client of echo.clients) client.terminate(); upstream.closeAllConnections(); await new Promise((resolve) => echo.close(resolve)); await new Promise((resolve) => upstream.close(resolve)); });
  const paths = fixture();
  const { prepareProxy } = requireTool('react-dev-utils/WebpackDevServerUtils');
  const proxy = prepareProxy(`http://127.0.0.1:${upstream.address().port}`, paths.appPublic, '/');
  const { port } = await serve(t, paths, { proxy });
  const response = await request(port, '/api/echo', { method: 'POST', body: 'preserved request',
    headers: { 'content-type': 'text/plain', origin: `http://127.0.0.1:${port}` } });
  assert.deepEqual(JSON.parse(response.body), { method: 'POST', body: 'preserved request' });
  assert.equal((await request(port, '/api/echo', { headers: { origin: 'https://evil.example.test' } })).status, 403);
  const ws = new WebSocket(`ws://127.0.0.1:${port}/api/socket`, { origin: `http://127.0.0.1:${port}` });
  t.after(() => ws.terminate());
  await once(ws, 'open');
  ws.send('proxy echo');
  assert.equal(String((await once(ws, 'message'))[0]), 'proxy echo');
  ws.terminate();
  for (const origin of ['https://evil.example.test', `http://127.0.0.1:${port + 1}`]) {
    const denied = new WebSocket(`ws://127.0.0.1:${port}/api/socket`, { origin });
    denied.on('error', () => {});
    t.after(() => denied.terminate());
    const [, response] = await once(denied, 'unexpected-response');
    assert.equal(response.statusCode, 403);
    denied.terminate();
  }
});

test('custom proxy setup retains Express settings and app locals', { timeout: 60000 }, async (t) => {
  const paths = fixture();
  fs.writeFileSync(paths.proxySetup, `module.exports = app => {
    app.set('fixture-setting', 'configured');
    app.locals.fixtureValue = 'local value';
    app.get('/custom-settings', (req,res) => res.json({setting:req.app.get('fixture-setting'), local:req.app.locals.fixtureValue}));
  };`);
  const { port } = await serve(t, paths);
  const response = await request(port, '/custom-settings');
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { setting: 'configured', local: 'local value' });
  assert.equal((await request(port, '/custom-settings', { headers: { origin: 'https://evil.example.test' } })).status, 403);
});

test('error-overlay sources stay ahead of catch-all custom proxies', { timeout: 60000 }, async (t) => {
  const paths = fixture();
  fs.writeFileSync(paths.proxySetup, 'module.exports = app => app.use((req,res) => res.json({customProxy:true}));');
  const { port } = await serve(t, paths);
  const source = await request(port, '/__get-internal-source?fileName=webpack-internal%3A%2F%2F%2F.%2Fsrc%2Fentry.js');
  assert.equal(source.status, 200);
  assert.match(source.body, /BEFORE_UPDATE/);
  assert.deepEqual(JSON.parse((await request(port, '/custom-api')).body), { customProxy: true });
  assert.equal((await request(port, '/__get-internal-source', { headers: { origin: 'https://evil.example.test' } })).status, 403);
});

test('explicitly trusted origins can preflight JSON API calls without opening other origins', { timeout: 60000 }, async (t) => {
  const paths = fixture();
  fs.writeFileSync(paths.proxySetup, `module.exports = app => {
    app.post('/custom-api', (req,res) => res.json({received:true}));
    app.options('/custom-api', (req,res) => res.status(502).end('Preflight reached the application'));
  };`);
  const trusted = 'https://preview.example.test';
  const { port } = await serve(t, paths, { env: { ALLOFLOW_DEV_ALLOWED_ORIGINS: trusted } });
  const headers = { origin: trusted, 'access-control-request-method': 'POST',
    'access-control-request-headers': 'authorization, content-type, x-preview-client' };
  const preflight = await request(port, '/custom-api', { method: 'OPTIONS', headers });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers['access-control-allow-origin'], trusted);
  assert.match(preflight.headers['access-control-allow-methods'], /POST/);
  assert.equal(preflight.headers['access-control-allow-headers'], headers['access-control-request-headers']);
  assert.equal(preflight.headers['access-control-allow-credentials'], undefined);
  const response = await request(port, '/custom-api', { method: 'POST', body: '{}',
    headers: { origin: trusted, 'content-type': 'application/json', authorization: 'Bearer fixture-only' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers['access-control-allow-origin'], trusted);
  assert.equal((await request(port, '/custom-api', { method: 'OPTIONS', headers: { ...headers, origin: 'https://evil.example.test' } })).status, 403);
  assert.equal((await request(port, '/custom-api', { method: 'OPTIONS', headers: { ...headers, 'access-control-request-method': 'TRACE' } })).status, 403);
  assert.equal((await request(port, '/custom-api', { method: 'OPTIONS', headers: { ...headers, 'access-control-request-headers': 'bad header' } })).status, 403);
  assert.match(preflight.headers.vary, /Origin/);
  assert.match(preflight.headers.vary, /Access-Control-Request-Headers/);
});

test('HTTPS works with the replacement certificate generator and validates custom certificate settings', { timeout: 60000 }, async (t) => {
  const paths = fixture();
  const { server, port } = await serve(t, paths, { https: true });
  const ca = server.options.server.options.cert;
  const result = await request(port, '/bundle.js', { tls: true, ca, headers: { origin: `https://127.0.0.1:${port}` } });
  assert.equal(result.status, 200);
  assert.match(result.body, /BEFORE_UPDATE/);
  fs.writeFileSync(path.join(paths.appPath, 'cert.pem'), ca);
  fs.writeFileSync(path.join(paths.appPath, 'key.pem'), server.options.server.options.key);
  const custom = httpsConfig(paths, { HTTPS: 'true', SSL_CRT_FILE: 'cert.pem', SSL_KEY_FILE: 'key.pem' });
  assert.deepEqual(custom.cert, Buffer.from(ca));
  const second = await serve(t, paths, { https: custom });
  assert.equal((await request(second.port, '/', { tls: true, ca })).status, 200);
});

test('actual CRA launcher compiles React with refresh support and shuts down cleanly', { timeout: 120000 }, async (t) => {
  const paths = fixture();
  fs.writeFileSync(path.join(paths.appPath, 'package.json'), JSON.stringify({ name: 'alloflow-start-fixture',
    version: '1.0.0', browserslist: ['last 1 chrome version'] }));
  fs.writeFileSync(path.join(paths.appPublic, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.writeFileSync(path.join(paths.appSrc, 'index.js'),
    'import React from "react"; import {createRoot} from "react-dom/client"; createRoot(document.getElementById("root")).render(<h1>Launcher fixture</h1>);');
  const reservation = http.createServer();
  await new Promise((resolve) => reservation.listen(0, '127.0.0.1', resolve));
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const worker = path.join(paths.appPath, 'launcher.cjs');
  fs.writeFileSync(worker, `
    require(${JSON.stringify(path.join(web, 'scripts/start.cjs'))}).start().then(async ({server, close}) => {
      process.once('message', async () => { await close(); process.disconnect(); });
      await new Promise((resolve, reject) => server.middleware.waitUntilValid(stats => stats.hasErrors() ? reject(new Error(stats.toString('errors-only'))) : resolve()));
      process.send({ready:true});
    }).catch(error => { console.error(error); process.exit(1); });
  `);
  const child = fork(worker, { cwd: paths.appPath, silent: true, windowsHide: true,
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), HTTPS: 'false', PUBLIC_URL: '/', BROWSER: 'none',
      CI: 'true', DISABLE_ESLINT_PLUGIN: 'true', DANGEROUSLY_DISABLE_HOST_CHECK: 'false',
      ALLOFLOW_DEV_ALLOWED_HOSTS: '', ALLOFLOW_DEV_ALLOWED_ORIGINS: '', WDS_SOCKET_HOST: '', WDS_SOCKET_PORT: '', WDS_SOCKET_PATH: '/ws' } });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  const exited = once(child, 'exit');
  t.after(() => { if (child.exitCode === null) child.kill(); });
  await Promise.race([once(child, 'message'), exited.then(() => { throw new Error(output); })]);
  assert.match((await request(port, '/')).body, /static\/js\/bundle.js/);
  const bundle = await request(port, '/static/js/bundle.js');
  assert.equal(bundle.status, 200);
  assert.match(bundle.body, /Launcher fixture/);
  assert.match(bundle.body, /react-refresh/);
  child.send('stop');
  const [code] = await exited;
  assert.equal(code, 0, output);
});
