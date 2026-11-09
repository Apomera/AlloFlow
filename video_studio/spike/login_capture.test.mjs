// Run: node --test login_capture.test.mjs   (needs a browser: system Edge by default; SPIKE_BROWSER=chrome|chromium to change)
// Drives the real captureLogin against a tiny local "site", with a script standing in for the person who signs in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const { captureLogin } = require('./login_capture.cjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const browser = process.env.SPIKE_BROWSER || 'msedge';

// A site that is "signed in" only when it finds the session the login step created.
const SITE = `<!doctype html><title>Demo site</title><body><h1 id="who">Signed out</h1><script>
  const ok = document.cookie.includes('sid=demo123') && localStorage.getItem('session') === 'demo123';
  document.getElementById('who').textContent = ok ? 'Welcome, Demo Teacher' : 'Signed out';
</script>`;
const signIn = page => page.evaluate(() => { document.cookie = 'sid=demo123; path=/'; localStorage.setItem('session', 'demo123'); });

async function withSite(fn) {
  const server = http.createServer((req, res) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(SITE); });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try { return await fn('http://127.0.0.1:' + server.address().port + '/?magic=ONE-TIME-TOKEN'); }
  finally { await new Promise(r => server.close(r)); }
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'login-capture-'));
const quiet = () => { const lines = []; return { lines, log: m => lines.push(m) }; };

test('captureLogin saves the session a person created, and a new browser context starts signed in from it', async () => {
  const dir = tmp();
  try {
    await withSite(async url => {
      const q = quiet();
      const r = await captureLogin({ url, name: 'demo', spikeDir: dir, chromium, browser, headless: true, until: async () => {}, onPage: signIn, log: q.log });
      assert.equal(r.statePath, path.join(dir, 'auth', 'demo.json'));
      assert.ok(fs.existsSync(r.statePath));
      assert.ok(r.cookies >= 1 && r.origins >= 1, JSON.stringify(r));
      assert.ok(!fs.existsSync(r.statePath + '.tmp'), 'no half-written temp file is left behind');
      // never prints the one-time token in the address, nor the session value
      assert.ok(!q.lines.join('\n').includes('ONE-TIME-TOKEN'), q.lines.join('\n'));
      assert.ok(!q.lines.join('\n').includes('demo123'));
      assert.match(q.lines.join('\n'), /not inside a git repository/); // a temp folder: no ignore check was possible, and it says so

      // The point of it all: a fresh context (which is what compile_tutorial.cjs makes) is already signed in.
      const b = await chromium.launch({ headless: true, ...(browser === 'chromium' ? {} : { channel: browser }) });
      try {
        const signedOut = await (await b.newContext()).newPage();
        await signedOut.goto(url);
        assert.equal(await signedOut.textContent('#who'), 'Signed out');
        const ctx = await b.newContext({ storageState: r.statePath });
        const page = await ctx.newPage();
        await page.goto(url);
        assert.equal(await page.textContent('#who'), 'Welcome, Demo Teacher');
      } finally { await b.close(); }
    });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('captureLogin refuses to write a session where git would not ignore it', async () => {
  const dir = tmp();
  try {
    assert.equal(spawnSync('git', ['init', '-q'], { cwd: dir }).status, 0);
    await assert.rejects(
      captureLogin({ url: 'http://127.0.0.1:1/', name: 'demo', spikeDir: dir, chromium, browser, headless: true, until: async () => {}, log: () => {} }),
      /Refusing to save a login: git does not ignore/);
    assert.ok(!fs.existsSync(path.join(dir, 'auth', 'demo.json')), 'nothing was written');
    // ...and once the folder is ignored, the same call goes through.
    fs.writeFileSync(path.join(dir, '.gitignore'), 'auth/\n');
    await withSite(async url => {
      const r = await captureLogin({ url, name: 'demo', spikeDir: dir, chromium, browser, headless: true, until: async () => {}, onPage: signIn, log: () => {} });
      assert.ok(fs.existsSync(r.statePath));
      assert.equal(spawnSync('git', ['check-ignore', '-q', '--', r.statePath], { cwd: dir }).status, 0);
    });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('captureLogin rejects a bad name, a non-web address and a file: page before opening any browser', async () => {
  const dir = tmp();
  try {
    const base = { spikeDir: dir, chromium, browser, headless: true, until: async () => {}, log: () => {} };
    await assert.rejects(captureLogin({ ...base, url: 'https://example.org/', name: '../escape' }), /saved-login name/);
    await assert.rejects(captureLogin({ ...base, url: 'file:///C:/secrets.html', name: 'demo' }), /http\(s\)/);
    await assert.rejects(captureLogin({ ...base, url: 'javascript:alert(1)', name: 'demo' }), /http\(s\)/);
    await assert.rejects(captureLogin({ ...base, url: '', name: 'demo' }), /http\(s\)/);
    assert.ok(!fs.existsSync(path.join(dir, 'auth', 'demo.json')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('the real spike folder is a git-ignored home for saved logins', () => {
  assert.equal(spawnSync('git', ['check-ignore', '-q', '--', path.join(here, 'auth', 'whatever.json')], { cwd: here }).status, 0);
});
