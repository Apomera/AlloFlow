'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { EventEmitter, once: eventOnce } = require('node:events');
const { createRequire } = require('node:module');
const { test } = require('node:test');

const web = path.resolve(process.env.SECURITY_WEB_APP || path.join(__dirname, '../../desktop/web-app'));
const requireWeb = createRequire(path.join(web, 'package.json'));
const scratch = path.join(web, 'node_modules/.cache/alloflow-security-tests');
fs.mkdirSync(scratch, { recursive: true });
const fixture = () => fs.mkdtempSync(path.join(scratch, 'dependencies-'));
const listen = async (server) => {
  server.listen(0, '127.0.0.1');
  await eventOnce(server, 'listening');
  return 'http://127.0.0.1:' + server.address().port;
};
const close = (server) => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

test('Tailwind variants, nesting, CSS transforms and minification preserve styled selectors', async () => {
  const postcss = requireWeb('postcss');
  const classes = ['flex', 'hover:bg-blue-500', 'md:grid-cols-2', 'group-hover:opacity-50',
    'dark:text-white', 'aria-checked:bg-red-500', 'w-[calc(100%-2rem)]', '[&>svg]:h-4'];
  const result = await postcss([
    requireWeb('tailwindcss/nesting'),
    requireWeb('tailwindcss')({ content: [{ raw: '<div class="' + classes.join(' ') + '"></div>', extension: 'html' }],
      darkMode: 'class', corePlugins: { preflight: false } }),
    requireWeb('postcss-flexbugs-fixes'),
    requireWeb('postcss-preset-env')({ stage: 3, autoprefixer: { flexbox: 'no-2009' } }),
    requireWeb('cssnano')({ preset: 'default' }),
  ]).process('@tailwind utilities; .card { & > a:focus-visible { color: red; } }', { from: undefined });
  const found = new Map();
  const parser = requireWeb('postcss-selector-parser');
  result.root.walkRules((rule) => parser((selectors) => selectors.walkClasses((node) => {
    found.set(node.value, rule);
  })).processSync(rule.selector));
  for (const value of classes) assert.ok(found.has(value), 'Missing generated utility: ' + value);
  assert.match(found.get('hover:bg-blue-500').selector, /:hover/);
  assert.equal(found.get('md:grid-cols-2').parent.name, 'media');
  assert.match(found.get('md:grid-cols-2').parent.params, /min-width:\s*768px/);
  assert.match(found.get('group-hover:opacity-50').selector, /\.group:hover/);
  assert.match(found.get('aria-checked:bg-red-500').selector, /\[aria-checked=true\]/);
  assert.match(found.get('[&>svg]:h-4').selector, />svg/);
  assert.match(result.css, /\.card>a:focus-visible\{color:red\}/);
  // Optional local comparison artifact; CI assertions above exercise the public behavior.
  if (process.env.SECURITY_CSS_RESULT) fs.writeFileSync(process.env.SECURITY_CSS_RESULT, result.css);
});

test('selector parsing preserves escapes and flat selectors while rejecting excessive nesting', () => {
  const parser = requireWeb('postcss-selector-parser');
  const flat = '.a#b'.repeat(10000);
  assert.equal(parser().processSync(flat), flat);
  const escaped = '.hover\\:bg-blue-500:hover > [data-label="a,b"]:not(.hidden)';
  assert.equal(parser().processSync(escaped), escaped);
  assert.throws(() => parser().astSync(':not('.repeat(1000) + '.a' + ')'.repeat(1000)), /depth|nest/i);
});

test('YAML configuration loaders preserve aliases and return structured errors for excessive nesting', async () => {
  const dir = fixture();
  const configPath = path.join(dir, '.fixture.yaml');
  fs.writeFileSync(configPath, 'enabled: true\npaths: &paths [src, public]\ncopy: *paths\n');
  const loaders = [requireWeb('cosmiconfig'),
    createRequire(requireWeb.resolve('fork-ts-checker-webpack-plugin'))('cosmiconfig')];
  for (const loader of loaders) {
    const result = await loader.cosmiconfig('fixture').load(configPath);
    assert.deepEqual(result.config, { enabled: true, paths: ['src', 'public'], copy: ['src', 'public'] });
  }
  const yaml = createRequire(requireWeb.resolve('cosmiconfig'))('yaml');
  assert.throws(() => yaml.parse('['.repeat(5000) + '1' + ']'.repeat(5000)), (error) => {
    // The v1 security backport wraps recursion errors as normal YAML errors;
    // unlike v2, it does not introduce a configurable nesting limit.
    assert.match(error.name, /^YAML.*Error$/);
    assert.ok(error.message.length > 0);
    return true;
  });
  const loadConfig = createRequire(requireWeb.resolve('tailwindcss'))('postcss-load-config');
  fs.writeFileSync(path.join(dir, '.postcssrc.yml'), 'map: false\nplugins: {}\n');
  const result = await loadConfig({}, dir);
  assert.equal(result.options.map, false);
  assert.deepEqual(result.plugins, []);
});

test('proxy event waits settle on abort and the existing HTTP proxy still connects and reports failures', { timeout: 10000 }, async (t) => {
  const requireAgent = createRequire(requireWeb.resolve('http-proxy-agent'));
  const module = requireAgent('@tootallnate/once');
  const once = module.default || module;
  const emitter = new EventEmitter();
  const controller = new AbortController();
  const wait = once(emitter, 'ready', { signal: controller.signal });
  controller.abort();
  let timer;
  try {
    await assert.rejects(Promise.race([wait, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Aborted wait did not settle')), 500);
    })]), { name: 'AbortError' });
  } finally { clearTimeout(timer); }
  assert.equal(emitter.listenerCount('ready'), 0);
  assert.equal(emitter.listenerCount('error'), 0);
  await assert.rejects(once(emitter, 'ready', { signal: controller.signal }), { name: 'AbortError' });
  const proxy = http.createServer((req, res) => {
    assert.equal(req.url, 'http://example.invalid/fixture?q=1');
    res.end('proxied fixture');
  });
  t.after(() => { proxy.closeAllConnections(); return close(proxy); });
  const address = await listen(proxy);
  const Agent = requireWeb('http-proxy-agent');
  const request = (agent) => new Promise((resolve, reject) => {
    const req = http.get('http://example.invalid/fixture?q=1', { agent }, (res) => {
      let data = ''; res.setEncoding('utf8');
      res.on('data', (chunk) => { data += chunk; }); res.on('end', () => resolve(data));
    });
    req.on('error', reject);
  });
  const agent = new Agent(address);
  t.after(() => agent.destroy());
  assert.equal(await request(agent), 'proxied fixture');
  const unused = http.createServer();
  const refused = await listen(unused);
  await close(unused);
  const badAgent = new Agent(refused);
  t.after(() => badAgent.destroy());
  await assert.rejects(request(badAgent), { code: 'ECONNREFUSED' });
});

test('SockJS connections retain unique v4 IDs and messaging with the bounds-checked UUID library', { timeout: 10000 }, async (t) => {
  const uuid = createRequire(requireWeb.resolve('sockjs'))('uuid');
  for (const generate of [uuid.v3, uuid.v5]) {
    assert.throws(() => generate('fixture', uuid.v5.DNS, new Uint8Array(8), 4), RangeError);
    const expected = generate('fixture', uuid.v5.DNS);
    const buffer = new Uint8Array(20).fill(170);
    generate('fixture', uuid.v5.DNS, buffer, 2);
    assert.equal(uuid.stringify(buffer, 2), expected);
    assert.deepEqual([...buffer.slice(0, 2), ...buffer.slice(18)], [170, 170, 170, 170]);
  }
  const server = http.createServer();
  const sockets = new Set();
  const sockjs = requireWeb('sockjs').createServer({ log() {} });
  const ids = new Set();
  sockjs.on('connection', (connection) => {
    assert.equal(uuid.validate(connection.id), true);
    assert.equal(uuid.version(connection.id), 4);
    ids.add(connection.id);
    connection.on('data', (data) => connection.write(data));
  });
  sockjs.installHandlers(server, { prefix: '/fixture' });
  t.after(() => {
    for (const socket of sockets) socket.terminate();
    server.closeAllConnections();
    return close(server);
  });
  const address = await listen(server);
  const WebSocket = requireWeb('ws');
  for (let i = 0; i < 2; i++) {
    const socket = new WebSocket(address.replace('http:', 'ws:') + '/fixture/websocket');
    sockets.add(socket);
    await eventOnce(socket, 'open');
    const message = eventOnce(socket, 'message');
    socket.send('message-' + i);
    assert.equal((await message)[0].toString(), 'message-' + i);
    socket.close();
    await eventOnce(socket, 'close');
  }
  assert.equal(ids.size, 2);
});
