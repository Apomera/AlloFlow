#!/usr/bin/env node
'use strict';
// A quick smoke check of AlloFlow Packets in a real browser (Playwright Chromium), 2026-11-17 (review 2.8). The tests run in
// jsdom, which enforces no Content-Security-Policy and loads no scripts by address: a file shown inside a page's frame is
// held to that page's rule too, and a broken script load hangs nothing there. This check catches that kind of fault.
//   1. Every Packets page opens with no error, no refused load ("Content Security Policy", "Refused to") and no failed
//      request to this site.
//   2. Student files made by the real builders (math practice, a math check, vocabulary, a read-along, Word Sounds) open
//      on their own, inside Open a practice file (a srcdoc frame) and inside Try it (a blob: frame); each starts, shows
//      a question, loads its reading fonts, and the browser refuses nothing.
// "Skipped is not passed": a state that could not be reached is counted as a failure.
//
//   node dev-tools/check_packets_smoke.cjs          (about 1 to 3 minutes; one browser)
// Heavy: not part of the default test run. Do not run it beside vitest or another browser sweep (shared machine).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const { chromium } = require(path.join(ROOT, 'node_modules/playwright'));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

function serve() {
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let rel = decodeURIComponent(String(req.url).split('?')[0].split('#')[0]);
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(ROOT, '.' + rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port + '/' })));
}

// Student files, made in node by the real builders.
function makeFiles() {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8')).call(g, g);
  const loader = g.AlloWordSoundsTakeHome;
  const out = {};
  const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
  out.mathPractice = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }), loader }).html;
  const PC = require(path.join(ROOT, 'packet_check_builder.js'));
  out.mathCheck = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Smoke check', problems: PC.parseProblems('2+3, 7-4, 6x7, 9+8'), timeLimitS: 60 }), loader }).html;
  const RA = require(path.join(ROOT, 'packet_read_along_builder.js'));
  const sentences = RA.splitPassage('The kite sailed over the trees. Mia looked for it all afternoon.');
  const clip = 'data:audio/mpeg;base64,' + Buffer.from([0xff, 0xf3, 0x44, 0xc4]).toString('base64');
  out.readAlong = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Smoke read-along', sentences, clips: Object.fromEntries(sentences.map((s) => [RA.clipKey(s.text), clip])) }), loader }).html;
  try {
    const tool = require(path.join(ROOT, 'dev-tools/make_word_sounds_packet.cjs'));
    const parts = tool.loadParts();
    const banks = tool.loadBanks({ shards: false });
    out.wordSounds = null;
    out._wordSoundsPromise = parts.builder.buildPacket({ words: ['cat', 'dog', 'sun'], activities: ['isolation'], seed: 7, core: parts.core, dictionary: parts.dictionary, banks, loader: parts.loader, wordlist: parts.wordlist, allowUnconverted: true })
      .then((r) => { out.wordSounds = r.html; }, () => {});
  } catch (_) { /* counted as skipped below */ }
  return out;
}

(async () => {
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + JSON.stringify(detail).slice(0, 300) : '')); };
  const files = makeFiles();
  if (files._wordSoundsPromise) await files._wordSoundsPromise;
  const { server, base } = await serve();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  const watch = (page) => {
    const bad = [];
    page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t) || m.type() === 'error') bad.push(t.slice(0, 200)); });
    page.on('pageerror', (e) => bad.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) bad.push('http ' + r.status() + ' ' + r.url().slice(base.length)); });
    return bad;
  };
  try {
    // 1. Every page.
    const pages = fs.readdirSync(ROOT).filter((f) => /^packets[\w-]*\.html$/.test(f)).sort();
    for (const name of pages) {
      const page = await context.newPage();
      const bad = watch(page);
      try {
        await page.goto(base + name, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(1200);
        check('page ' + name + ' opens with no error or refused load', bad.length === 0, bad.slice(0, 3));
      } catch (e) { check('page ' + name + ' opens', false, String(e).slice(0, 200)); }
      await page.close();
    }
    // 2. Every kind of file, three ways.
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'packets-smoke-'));
    for (const [kind, html] of Object.entries(files)) {
      if (kind.startsWith('_')) continue;
      if (!html) { check('file ' + kind + ' could be made', false, 'skipped: the builder did not make it'); continue; }
      const file = path.join(tmp, kind + '.html');
      fs.writeFileSync(file, html);
      const runs = async (page, frame, where) => {
        const bad = watch(page);
        try {
          await frame.waitForSelector('#learner-name', { timeout: 20000 });
          await frame.fill('#learner-name', 'Smoke');
          await frame.click('#app button.primary');
          await page.waitForTimeout(800);
          const state = await frame.evaluate(async () => {
            const lt = document.querySelector('[data-tools-open]');
            if (lt) { lt.click(); const b = document.querySelector('[data-tool="font-1"]'); if (b) b.click(); }
            await new Promise((r) => setTimeout(r, 400));
            await document.fonts.ready;
            return { heading: (document.querySelector('#app h2') || {}).textContent || '', fonts: [...document.fonts].map((f) => f.status) };
          });
          const fontsOk = state.fonts.length === 0 || state.fonts.includes('loaded');
          check('file ' + kind + ' ' + where + ': starts, shows a screen, loads its fonts, nothing refused', !!state.heading && fontsOk && bad.length === 0, { heading: state.heading.slice(0, 40), fonts: state.fonts, bad: bad.slice(0, 2) });
        } catch (e) { check('file ' + kind + ' ' + where, false, String(e).slice(0, 200)); }
      };
      // On its own, from the disk.
      let page = await context.newPage();
      await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
      await runs(page, page.mainFrame(), 'on its own');
      await page.close();
      // In Open a practice file.
      page = await context.newPage();
      await page.goto(base + 'packets-open.html', { waitUntil: 'load' });
      await page.setInputFiles('#file', file);
      await page.waitForTimeout(1200);
      try { await page.getByRole('button', { name: 'Start', exact: true }).click({ timeout: 10000 }); } catch (_) {}
      await page.waitForTimeout(1200);
      const openFrame = page.frames().find((f) => f !== page.mainFrame());
      if (openFrame) await runs(page, openFrame, 'in Open a practice file'); else check('file ' + kind + ' in Open a practice file', false, 'no frame');
      await page.close();
      // In Try it (a blob: address made on this site, by a page that stays open).
      const maker = await context.newPage();
      await maker.goto(base + 'packets-results.html', { waitUntil: 'load' });
      const url = await maker.evaluate((text) => URL.createObjectURL(new Blob([text], { type: 'text/html' })), html);
      page = await context.newPage();
      await page.goto(base + 'packets-try.html#' + url, { waitUntil: 'load' });
      await page.waitForTimeout(2000);
      const tryFrame = page.frames().find((f) => f !== page.mainFrame());
      if (tryFrame) await runs(page, tryFrame, 'in Try it'); else check('file ' + kind + ' in Try it', false, 'no frame');
      await page.close();
      await maker.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + ' of ' + results.length + ' checks pass.');
  process.exitCode = failed.length ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 1; });
