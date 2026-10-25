'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const net = require('node:net');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const audit = path.resolve(__dirname, '../../a11y-audit');
const requireAudit = createRequire(path.join(audit, 'package.json'));
const { requestAction, localModule, handleRequest, launchOptions } = require(path.join(audit, 'browser-policy.cjs'));
const scratch = path.join(audit, 'node_modules/.cache/security-tests');
fs.mkdirSync(scratch, { recursive: true });
const fixture = () => fs.mkdtempSync(path.join(scratch, 'policy-'));
const listen = async (server) => {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return server.address().port;
};
const close = (server) => new Promise((resolve) => server.close(resolve));

test('request policy accepts exact origins and blocks URL lookalikes and credential tricks', () => {
  const target = 'https://audit.example.test';
  assert.equal(requestAction(target + '/page?q=1', target).kind, 'continue');
  assert.equal(requestAction(target + ':443/page', target).kind, 'continue');
  assert.equal(requestAction('https://alloflow-cdn.pages.dev/stem_lab/tool.js?v=1', target).kind, 'local');
  for (const value of [target + '.evil.test/', target + ':444/', 'http://audit.example.test/',
    target + '@evil.test/', 'https://user:pass@audit.example.test/',
    'https://alloflow-cdn.pages.dev.evil.test/tool.js',
    'https://evil.test/alloflow-cdn.pages.dev/tool.js',
    'https://alloflow-cdn.pages.dev@evil.test/tool.js',
    'http://alloflow-cdn.pages.dev/tool.js', 'file:///fixture.js', 'not a URL']) {
    assert.equal(requestAction(value, target).kind, 'abort', value);
  }
  assert.equal(requestAction('http://127.0.0.1:3000/api', 'http://127.0.0.1:3000').kind, 'continue');
  assert.equal(requestAction('http://127.0.0.1:3001/api', 'http://127.0.0.1:3000').kind, 'abort');
});

test('local module substitution preserves lookup order and never reads non-script files', (t) => {
  const root = fixture();
  fs.mkdirSync(path.join(root, 'stem_lab'));
  fs.mkdirSync(path.join(root, 'desktop/web-app/public'), { recursive: true });
  fs.writeFileSync(path.join(root, 'tool.js'), 'root module');
  fs.writeFileSync(path.join(root, 'stem_lab/tool.js'), 'stem module');
  fs.writeFileSync(path.join(root, 'desktop/web-app/public/public.mjs'), 'public module');
  for (const name of ['.env', 'package.json', 'private.pem', '.git-token.txt', '.hidden.js']) {
    fs.writeFileSync(path.join(root, name), 'SYNTHETIC_PRIVATE_FIXTURE');
    assert.equal(localModule(root, '/' + name), null);
  }
  assert.equal(localModule(root, '/nested/tool.js').toString(), 'stem module');
  assert.equal(localModule(root, '/public.mjs').toString(), 'public module');
  for (const value of ['/missing.js', '/%ZZ.js', '/..%5cprivate.js', '/%00.js']) assert.equal(localModule(root, value), null);
  // Simulate file-symlink resolution on Windows too, without requiring the
  // separate Create Symbolic Links privilege. Directory junctions are real below.
  const realpath = fs.realpathSync;
  let linkTarget;
  t.mock.method(fs, 'realpathSync', (file) => file === path.join(root, 'linked.js')
    ? path.join(root, linkTarget) : realpath(file));
  for (linkTarget of ['private.pem', '.hidden.js']) assert.equal(localModule(root, '/linked.js'), null);
});

test('local module substitution rejects a directory junction outside the repository', () => {
  const workspace = fixture();
  const root = path.join(workspace, 'repo');
  const outside = path.join(workspace, 'outside');
  fs.mkdirSync(root); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'external.js'), 'SYNTHETIC_OUTSIDE_FIXTURE');
  fs.symlinkSync(outside, path.join(root, 'stem_lab'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.equal(localModule(root, '/external.js'), null);
});

test('request interception awaits operations, fails closed on rejection and ignores resolved requests', async () => {
  const calls = [];
  const root = fixture();
  fs.writeFileSync(path.join(root, 'tool.js'), 'globalThis.localTool = true;');
  const context = { targetOrigin: 'https://audit.example.test', repoRoot: root };
  const req = (url, extra = {}) => ({ url: () => url, isInterceptResolutionHandled: () => false,
    continue: async () => { calls.push('continue'); }, abort: async () => { calls.push('abort'); },
    respond: async (response) => { calls.push(response.body.toString()); }, ...extra });
  await handleRequest(req(context.targetOrigin + '/api'), context);
  await handleRequest(req('https://alloflow-cdn.pages.dev/tool.js'), context);
  await handleRequest(req('https://alloflow-cdn.pages.dev/.env'), context);
  await handleRequest(req(context.targetOrigin, { continue: async () => { throw new Error('Page closed'); } }), context);
  await handleRequest(req(context.targetOrigin, { isInterceptResolutionHandled: () => true }), context);
  await handleRequest(req('https://evil.test', { abort: async () => { throw new Error('Page closed'); } }), context);
  assert.deepEqual(calls, ['continue', 'globalThis.localTool = true;', 'abort', 'abort']);
});

test('browser sandbox remains enabled unless the operator explicitly opts out', () => {
  assert.deepEqual(launchOptions({}), { headless: true, args: [] });
  assert.deepEqual(launchOptions({ ALLOFLOW_AUDIT_NO_SANDBOX: 'true' }).args, []);
  assert.deepEqual(launchOptions({ ALLOFLOW_AUDIT_NO_SANDBOX: '1' }).args, ['--no-sandbox', '--disable-setuid-sandbox']);
});

test('browser download proxy support still forwards HTTP requests', { timeout: 15000 }, async (t) => {
  const proxy = http.createServer((req, res) => {
    assert.equal(req.url, 'http://fixture.invalid/download.zip');
    res.end('proxied download fixture');
  });
  t.after(() => { proxy.closeAllConnections(); return close(proxy); });
  const port = await listen(proxy);
  const { ProxyAgent } = requireAudit('proxy-agent');
  const agent = new ProxyAgent({ getProxyForUrl: () => 'http://127.0.0.1:' + port });
  t.after(() => agent.destroy());
  const result = await new Promise((resolve, reject) => {
    http.get('http://fixture.invalid/download.zip', { agent }, (res) => {
      let body = ''; res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; }); res.on('end', () => resolve(body));
    }).on('error', reject);
  });
  assert.equal(result, 'proxied download fixture');
});

test('patched FTP client retains listing parsing, get-uri downloads and cache checks', { timeout: 15000 }, async (t) => {
  const { parseList } = requireAudit('basic-ftp');
  const normal = '-rw-r--r-- 1 owner group 13 Jan 1 2020 fixture.pac\r\n';
  const malformed = '-rw-r--r-- 1 ' + 'a '.repeat(16000) + '!\r\n';
  const parsed = parseList(malformed + normal);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].name, 'fixture.pac');
  assert.equal(parsed[0].size, 13);
  const servers = new Set();
  const sockets = new Set();
  const commands = [];
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await Promise.all([...servers].map(close));
  });
  const control = net.createServer((socket) => {
    sockets.add(socket);
    socket.setEncoding('utf8');
    socket.write('220 fixture FTP\r\n');
    let input = '', dataReady, queue = Promise.resolve();
    socket.on('data', (chunk) => {
      input += chunk;
      let end;
      while ((end = input.indexOf('\r\n')) >= 0) {
        const line = input.slice(0, end); input = input.slice(end + 2);
        queue = queue.then(async () => {
          const command = line.split(' ')[0]; commands.push(command);
          if (command === 'USER') socket.write('331 password required\r\n');
          else if (command === 'PASS') socket.write('230 logged in\r\n');
          else if (command === 'FEAT') socket.write('211-Features\r\n UTF8\r\n MLST\r\n211 End\r\n');
          else if (command === 'MDTM') socket.write('500 use directory listing\r\n');
          else if (command === 'EPSV') {
            const dataServer = net.createServer(); servers.add(dataServer);
            dataReady = once(dataServer, 'connection').then(([data]) => { sockets.add(data); return data; });
            socket.write('229 Entering Extended Passive Mode (|||' + await listen(dataServer) + '|)\r\n');
          } else if (command === 'MLSD' || command === 'RETR') {
            socket.write('150 opening data connection\r\n');
            const data = await dataReady;
            const done = once(data, 'close');
            data.end(command === 'MLSD' ? 'type=file;size=12;modify=20200101000000; fixture.pac\r\n' : 'PAC fixture\n');
            await done;
            socket.write('226 transfer complete\r\n');
          } else if (command === 'QUIT') socket.end('221 bye\r\n');
          else socket.write('200 command accepted\r\n');
        }).catch((error) => socket.destroy(error));
      }
    });
    socket.on('error', () => {});
  });
  servers.add(control);
  const port = await listen(control);
  const { getUri } = requireAudit('get-uri');
  const url = new URL('ftp://fixture:fixture@127.0.0.1:' + port + '/fixture.pac');
  const stream = await getUri(url);
  let body = '';
  for await (const chunk of stream) body += chunk;
  assert.equal(body, 'PAC fixture\n');
  assert.ok(commands.includes('MLSD')); assert.ok(commands.includes('RETR'));
  await assert.rejects(getUri(url, { cache: stream }), { code: 'ENOTMODIFIED' });
});
