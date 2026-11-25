#!/usr/bin/env node
'use strict';
// A quick smoke check of AlloFlow Packets in a real browser (Playwright Chromium), 2026-11-17 (review 2.8). The tests run in
// jsdom, which enforces no Content-Security-Policy and loads no scripts by address: a file shown inside a page's frame is
// held to that page's rule too, and a broken script load hangs nothing there. This check catches that kind of fault.
//   1. Every Packets page opens with no error, no refused load ("Content Security Policy", "Refused to") and no failed
//      request to this site.
//   2. Student files made by the real builders (math practice, a math check, vocabulary, a read-along, Symbol Runner,
//      Word Sounds) open on their own, inside Open a practice file (a srcdoc frame) and inside Try it (a blob: frame);
//      each starts, shows a question, loads its reading fonts, and the browser refuses nothing.
//   3. (2026-11-23) Sealed QR results: a check with a teacher key attached is finished in the browser, shows a QR image, its
//      code opens with the teacher's private key with every question in it, and Collect by sealed QR adds it.
//   4. (2026-11-23) With the browser's own QR reader switched off, Collect by sealed QR reads a photo of a code and (in
//      Chromium) a fake camera showing one, with vendor/jsqr-1.4.0.js.
// "Skipped is not passed": a state that could not be reached is counted as a failure.
//
//   node dev-tools/check_packets_smoke.cjs          (about 1 to 3 minutes; one browser)
//   node dev-tools/check_packets_smoke.cjs --browser=webkit [--phone]   (2026-11-17) Safari's engine; --phone uses an
//      iPhone-sized touch screen. This is Playwright's WebKit build on this computer, not Safari on a real iPhone or iPad.
//   node dev-tools/check_packets_smoke.cjs --root=<folder>   (2026-11-23) the same checks against a folder built by
//      dev-tools/build_packets_site.cjs, served with its _headers; every page must open with nothing missing (a 404 fails).
// Heavy: not part of the default test run. Do not run it beside vitest or another browser sweep (shared machine).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const ROOT = path.resolve(__dirname, '..');
const playwright = require(path.join(ROOT, 'node_modules/playwright'));
const ARG = (name) => { const hit = process.argv.slice(2).find((a) => a === '--' + name || a.startsWith('--' + name + '=')); return hit ? (hit.split('=')[1] || true) : null; };
const ENGINE = String(ARG('browser') || 'chromium');
if (!['chromium', 'webkit', 'firefox'].includes(ENGINE)) { console.error('Unknown --browser: ' + ENGINE); process.exit(2); }
const PHONE = !!ARG('phone');
// --root=<folder> (2026-11-23): serve that folder (one built by dev-tools/build_packets_site.cjs) instead of the repository,
// with the headers of its _headers file, as Cloudflare Pages would. Only what the server serves changes: the student files
// are still made by the repository's builders.
const SITE = ARG('root') ? path.resolve(String(ARG('root'))) : ROOT;
if (SITE !== ROOT && !fs.existsSync(path.join(SITE, 'packets.html'))) { console.error('--root has no packets.html: ' + SITE); process.exit(2); }
// Cloudflare's _headers: a path line (* matches anything), then indented "Name: value" lines; "! Name" drops a header
// an earlier rule set; a header set by two rules is joined with ", ".
function siteHeaders() {
  const file = path.join(SITE, '_headers');
  if (SITE === ROOT || !fs.existsSync(file)) return () => ({});
  const rules = [];
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { rules.push({ re: new RegExp('^' + line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/:[A-Za-z]\w*/g, '[^/]+') + '$'), set: [] }); continue; }
    const rule = rules[rules.length - 1];
    const t = line.trim();
    if (!rule) continue;
    if (t.startsWith('!')) rule.set.push({ drop: t.slice(1).trim().toLowerCase() });
    else { const at = t.indexOf(':'); rule.set.push({ name: t.slice(0, at).trim(), value: t.slice(at + 1).trim() }); }
  }
  return (urlPath) => {
    const out = {};
    for (const rule of rules) {
      if (!rule.re.test(urlPath)) continue;
      for (const h of rule.set) {
        if (h.drop) { for (const k of Object.keys(out)) if (k.toLowerCase() === h.drop) delete out[k]; continue; }
        const k = Object.keys(out).find((x) => x.toLowerCase() === h.name.toLowerCase());
        if (k) out[k] += ', ' + h.value; else out[h.name] = h.value;
      }
    }
    return out;
  };
}
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

function serve() {
  const headersFor = siteHeaders();
  const server = http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    let rel = decodeURIComponent(String(req.url).split('?')[0].split('#')[0]);
    const asked = rel;
    if (rel.endsWith('/')) rel += 'index.html';
    const file = path.resolve(SITE, '.' + rel);
    if (!file.startsWith(SITE)) { res.writeHead(403); res.end(); return; }
    fs.stat(file, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, Object.assign(headersFor(asked), { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-store' }));
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, base: 'http://127.0.0.1:' + server.address().port + '/' })));
}

// Student files, made in node by the real builders (all 6 activity types).
async function makeFiles() {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8')).call(g, g);
  const loader = g.AlloWordSoundsTakeHome;
  const out = {};
  const MP = require(path.join(ROOT, 'packet_math_practice_builder.js'));
  out.mathPractice = MP.buildMathPracticePacket({ lesson: MP.lessonFromMathPractice({ loader, mode: 'ccc', factSet: 'mul-7' }), loader }).html;
  const PC = require(path.join(ROOT, 'packet_check_builder.js'));
  out.mathCheck = PC.buildCheckPacket({ lesson: PC.lessonFromMathProblems({ title: 'Smoke check', problems: PC.parseProblems('2+3, 7-4, 6x7, 9+8'), timeLimitS: 60 }), loader }).html;
  // For part 3 (keys that start with _ are not run as files in part 2).
  out._loader = loader;
  const VB = require(path.join(ROOT, 'packet_vocab_builder.js'));
  const vbank = require(path.join(ROOT, 'tests/fixtures/packets_vocab_bank_fixture.js'));
  await vbank.load();
  const rows = VB.draftRows({ words: VB.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage').words, bank: vbank });
  out.vocab = VB.buildVocabPacket({ lesson: VB.lessonFromVocab({ loader, rows, types: ['meaning', 'word', 'blank'], mode: 'practice' }), loader, rows, bank: vbank }).html;
  const RA = require(path.join(ROOT, 'packet_read_along_builder.js'));
  const sentences = RA.splitPassage('The kite sailed over the trees. Mia looked for it all afternoon.');
  const clip = 'data:audio/mpeg;base64,' + Buffer.from([0xff, 0xf3, 0x44, 0xc4]).toString('base64');
  out.readAlong = RA.buildReadAlongPacket({ made: RA.lessonFromReadAlong({ loader, title: 'Smoke read-along', sentences, clips: Object.fromEntries(sentences.map((s) => [RA.clipKey(s.text), clip])) }), loader }).html;
  const SR = require(path.join(ROOT, 'packet_symbol_runner_builder.js'));
  out.symbolRunner = SR.buildSymbolRunnerPacket({ loader, symbolMode: 'confusable_letters', packetMode: 'practice', control: 'direct', count: 8, title: 'Smoke symbol runner' }).html;
  // 2026-11-24: Wave 2-5 zero-AI builders added to permanent smoke gate.
  const SWA = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
  const CH = require(path.join(ROOT, 'packet_choice_builder.js'));
  const chT = CH.templates();
  out.choiceBoard = CH.buildChoicePacket({ loader, adapters: SWA, lesson: CH.lessonFromChoice({ loader, adapters: SWA, title: 'Smoke choice board', mode: 'practice', choiceBoard: true, items: [chT[0].item, chT[1].item, chT[2].item] }) }).html;
  const MZ = require(path.join(ROOT, 'packet_maze_builder.js'));
  const mzP = MZ.passages().find((p) => p.bandKey === '4-5' && p.form === 'A') || MZ.passages()[0];
  out.mazeCheck = MZ.buildMazePacket({ loader, lesson: MZ.lessonFromMaze({ loader, passage: mzP.passage, title: mzP.title, mode: 'check', grade: mzP.bandKey, form: mzP.form, passageId: mzP.id }) }).html;
  const MM = require(path.join(ROOT, 'packet_manipulative_builder.js'));
  const mmS = MM.defaultStarterFor('manip_base_ten');
  out.manipulatives = MM.buildManipulativePacket({ loader, lesson: MM.lessonFromManipulatives({ loader, title: mmS.title, activity: 'manip_base_ten', items: mmS.items.slice(0, 2) }) }).html;
  const ST = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
  const stS = ST.starters().find((s) => s.activity === 'stem_data_explorer') || ST.starters()[0];
  out.stemLab = ST.buildStemLabPacket({ loader, lesson: ST.lessonFromStemLab(Object.assign({}, stS, { loader, title: stS.title, activity: stS.activity, items: stS.items.slice(0, 2) })) }).html;
  const LS = require(path.join(ROOT, 'packet_life_skills_builder.js'));
  out.lifeSkills = LS.buildLifeSkillsPacket({ loader, lesson: LS.lessonFromLifeSkills({ loader, title: 'Smoke life skills', blocks: LS.mixedDefaultBlocks() }) }).html;
  const AAC = require(path.join(ROOT, 'packet_aac_builder.js'));
  const aacS = AAC.starters()[0];
  out.aacBoard = AAC.buildAacPacket({ loader, title: aacS.title, folders: aacS.folders, grid: aacS.gridLayout || '4x3' }).html;
  const SEL = require(path.join(ROOT, 'packet_sel_builder.js'));
  out.selToolkit = SEL.buildSelPacket({ loader, lesson: SEL.lessonFromSel({ loader, title: 'Smoke SEL toolkit', blocks: SEL.mixedDefaultBlocks() }) }).html;
  const MC = require(path.join(ROOT, 'packets_main_app_compiler.js'));
  out.compiledActivity = MC.compileActivityPacket({ loader, artifact: MC.samples()[0].artifact }).html;
  try {
    const tool = require(path.join(ROOT, 'dev-tools/make_word_sounds_packet.cjs'));
    const parts = tool.loadParts();
    const banks = tool.loadBanks({ shards: false });
    out.wordSounds = null;
    try {
      const r = await parts.builder.buildPacket({ words: ['cat', 'dog', 'sun'], activities: ['isolation'], seed: 7, core: parts.core, dictionary: parts.dictionary, banks, loader: parts.loader, wordlist: parts.wordlist, allowUnconverted: true });
      out.wordSounds = r.html;
    } catch (_) { /* counted as skipped below */ }
  } catch (_) { /* counted as skipped below */ }
  return out;
}

// For part 4 (2026-11-23): a sealed code as a picture, and the same picture as a fake camera's video (Chromium only).
// The QR image is the one the student file draws (packets_qr_crypto.js qrPngDataUrl, 1-bit, with its white border).
function qrPictures(dir) {
  const zlib = require('node:zlib');
  const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
  const key = Q.generateKeyPair('smoke reader');
  const items = Array.from({ length: 25 }, (_, i) => ({ n: i + 1, itemId: 'math_ccc-' + i, activity: 'math_ccc', word: (3 + i) + ' x 7', target: String((3 + i) * 7), responses: [String((3 + i) * 7)],
    attempts: 1, firstTry: i % 4 !== 0, correct: true, done: true, ms: 1800, supports: {}, practice: null, flag: '' }));
  const result = { kind: 'alloflow-take-home-result', schemaVersion: 3, sessionId: 'smoke-reader', packet: { id: 'smoke', version: 'r1', form: '', mode: 'practice' }, lessonId: 'smoke', revision: 'r1',
    lessonTitle: 'Reader check', activityTitles: { math_ccc: 'Cover, copy, compare' }, learner: 'Reader1', startedLocal: '2026-11-23T09:00:00-05:00', finishedLocal: '2026-11-23T09:04:00-05:00',
    durationMs: 240000, activeMs: 200000, summary: { items: 25, done: 25, firstTry: 18, afterRetry: 7, missed: 0, practised: 0 }, items };
  const code = Q.sealResult(result, key.publicKey).code;
  const png = Buffer.from(Q.qrPngDataUrl(code).bytes);
  const pngPath = path.join(dir, 'sealed-qr.png');
  fs.writeFileSync(pngPath, png);
  const keyPath = path.join(dir, 'reader-key.json');
  fs.writeFileSync(keyPath, JSON.stringify(key));
  // The 1-bit PNG to rows of 0/255, then a 640 x 480 grey frame with the code in the middle, scaled up (a phone held close).
  let at = 8, w = 0, h = 0; const idat = [];
  while (at < png.length) { const len = png.readUInt32BE(at), type = png.toString('latin1', at + 4, at + 8), data = png.subarray(at + 8, at + 8 + len); if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); } if (type === 'IDAT') idat.push(data); at += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = 1 + Math.ceil(w / 8);
  const W = 640, H = 480, side = 440, x0 = (W - side) >> 1, y0 = (H - side) >> 1;
  const Y = Buffer.alloc(W * H, 170);
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
    const sx = Math.floor(x * w / side), sy = Math.floor(y * h / side);
    Y[(y0 + y) * W + x0 + x] = ((raw[sy * stride + 1 + (sx >> 3)] >> (7 - (sx & 7))) & 1) ? 255 : 0;
  }
  const UV = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
  const frames = [Buffer.from('YUV4MPEG2 W' + W + ' H' + H + ' F10:1 Ip A1:1 C420jpeg\n')];
  for (let f = 0; f < 6; f++) frames.push(Buffer.from('FRAME\n'), Y, UV);
  const videoPath = path.join(dir, 'sealed-qr.y4m');
  fs.writeFileSync(videoPath, Buffer.concat(frames));
  return { code, pngPath, keyPath, videoPath };
}

async function main() {
  const results = [];
  const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' | ' + JSON.stringify(detail).slice(0, 300) : '')); };
  const files = await makeFiles();
  const { server, base } = await serve();
  const pictureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'packets-smoke-qr-'));
  const pictures = qrPictures(pictureDir);
  const browser = await playwright[ENGINE].launch(ENGINE === 'chromium'
    ? { headless: true, args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--use-file-for-fake-video-capture=' + pictures.videoPath] }
    : { headless: true });
  const context = await browser.newContext(PHONE
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: ENGINE !== 'firefox', acceptDownloads: true }
    : { viewport: { width: 1280, height: 800 }, acceptDownloads: true });
  console.log('Browser: ' + ENGINE + ' ' + browser.version() + (PHONE ? ', phone-sized touch screen' : '') + (SITE !== ROOT ? '; serving ' + SITE : ''));
  const watch = (page) => {
    const bad = [];
    page.on('console', (m) => { const t = m.text(); if (/Content Security Policy|Refused to/i.test(t) || m.type() === 'error') bad.push(t.slice(0, 200)); });
    page.on('pageerror', (e) => bad.push('pageerror: ' + String(e && e.message || e).slice(0, 200)));
    page.on('response', (r) => { if (r.status() >= 400 && r.url().startsWith(base)) bad.push('http ' + r.status() + ' ' + r.url().slice(base.length)); });
    return bad;
  };
  try {
    // 1. Every page.
    const pages = fs.readdirSync(SITE).filter((f) => /^packets[\w-]*\.html$/.test(f)).sort();
    if (SITE !== ROOT) pages.push(''); // the built folder's front door, index.html at "/"
    for (const name of pages) {
      const page = await context.newPage();
      const bad = watch(page);
      try {
        await page.goto(base + name, { waitUntil: 'load', timeout: 60000 });
        await page.waitForTimeout(1200);
        check('page ' + (name || '/ (index.html)') + ' opens with no error or refused load', bad.length === 0, bad.slice(0, 3));
      } catch (e) { check('page ' + (name || '/ (index.html)') + ' opens', false, String(e).slice(0, 200)); }
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
    // 3. Sealed QR results (2026-11-23). A check with a teacher key attached is finished in the browser, shows a QR
    //    image, its code opens with the teacher's private key with every question in it, and Collect by sealed QR adds
    //    it. The tests do this in jsdom, which draws no image and enforces no page rule.
    try {
      const Q = require(path.join(ROOT, 'packets_qr_crypto.js'));
      const kp = Q.generateKeyPair('smoke');
      const sealed = files._loader.attachQrKey(files.mathCheck, kp.publicKey, { qrCrypto: Q });
      if (!sealed.ok) throw new Error('could not attach a key: ' + sealed.message);
      const file = path.join(tmp, 'sealed-check.html');
      fs.writeFileSync(file, sealed.html);
      let page = await context.newPage();
      let bad = watch(page);
      await page.goto('file:///' + file.replace(/\\/g, '/'), { waitUntil: 'load' });
      await page.waitForSelector('#learner-name', { timeout: 20000 });
      await page.fill('#learner-name', 'Smoke');
      await page.click('#app button.primary');
      let code = '';
      for (let step = 0; step < 80 && !code; step++) {
        await page.waitForTimeout(400);
        code = await page.evaluate(() => {
          const seen = (n) => !!n && !n.closest('[hidden]');
          const qr = document.querySelector('[data-teacher] [data-qr-toggle]') || document.querySelector('[data-qr-toggle]');
          if (qr) {
            if (qr.getAttribute('aria-expanded') !== 'true') qr.click();
            const box = document.querySelector('[data-qr-code]');
            return box ? box.textContent.trim() : '';
          }
          const next = document.querySelector('[data-practice-next]');
          if (seen(next)) { next.click(); return ''; }
          const begin = document.querySelector('[data-check-begin]');
          if (seen(begin)) { begin.click(); return ''; }
          const key = document.querySelector('[data-key="5"]'), go = document.querySelector('[data-key="next"]');
          if (seen(key) && seen(go)) { key.click(); go.click(); return ''; }
          const primary = [...document.querySelectorAll('#app button.primary')].find(seen);
          if (primary) primary.click();
          return '';
        });
      }
      const img = await page.evaluate(() => { const i = document.querySelector('img.qr-img'); return i ? { natural: i.naturalWidth, version: i.getAttribute('data-qr-version') } : null; });
      const opened = code ? Q.unsealResult(code, kp.secretKey) : { ok: false, reason: 'no code was shown' };
      const all = opened.ok && opened.result.items.filter((it) => !it.practice).length === 4;
      check('sealed check: finished in the browser, shows a QR image, and its code opens with every question in it',
        !!img && img.natural > 0 && all && bad.length === 0, { image: img, opened: opened.ok || opened.reason, items: opened.ok ? opened.result.items.length : 0, bad: bad.slice(0, 2) });
      await page.close();
      const keyFile = path.join(tmp, 'teacher-key.json');
      fs.writeFileSync(keyFile, JSON.stringify(kp));
      page = await context.newPage();
      bad = watch(page);
      await page.goto(base + 'packets-qr.html', { waitUntil: 'load', timeout: 60000 });
      await page.setInputFiles('#load-key-file', keyFile);
      await page.waitForSelector('#key-active:not([hidden])', { timeout: 10000 });
      await page.fill('#code-input', code);
      await page.click('#code-add');
      await page.waitForTimeout(400);
      const rows = await page.locator('#collected-body tr').count();
      const said = await page.locator('#collect-status').textContent();
      check('Collect by sealed QR: loads the key and adds the code from the real file', rows === 1 && bad.length === 0, { rows, said: String(said).slice(0, 120), bad: bad.slice(0, 2) });
      await page.close();
    } catch (e) { check('sealed QR round trip', false, String(e && e.message || e).slice(0, 240)); }
    // 4. (2026-11-23) Reading a code where the browser has no QR reader of its own (Windows Chrome and Edge, iPad Safari,
    //    Firefox): the page's own reader is switched off here, so vendor/jsqr-1.4.0.js must do it. A photo of a code, then
    //    a camera that shows one (Chromium's fake camera, playing the same picture).
    for (const how of ENGINE === 'chromium' ? ['photo', 'camera'] : ['photo']) {
      const page = await context.newPage();
      const bad = watch(page);
      try {
        if (how === 'camera') await context.grantPermissions(['camera'], { origin: base.replace(/\/$/, '') });
        await page.addInitScript(() => { Object.defineProperty(window, 'BarcodeDetector', { value: undefined, configurable: true, writable: true }); });
        await page.goto(base + 'packets-qr.html', { waitUntil: 'load', timeout: 60000 });
        const reader = await page.evaluate(() => ({ own: typeof window.BarcodeDetector === 'function', jsQR: typeof window.jsQR === 'function',
          camera: !document.getElementById('cam-toggle').disabled, photo: !document.getElementById('qr-img-btn').disabled }));
        await page.setInputFiles('#load-key-file', pictures.keyPath);
        await page.waitForSelector('#key-active:not([hidden])', { timeout: 10000 });
        if (how === 'photo') await page.setInputFiles('#qr-img-file', pictures.pngPath);
        else await page.click('#cam-toggle');
        let rows = 0;
        for (let waited = 0; waited < 20000 && !rows; waited += 250) { await page.waitForTimeout(250); rows = await page.locator('#collected-body tr').count(); }
        const said = await page.locator('#collect-status').textContent();
        if (how === 'camera') await page.click('#cam-toggle').catch(() => {});
        check('Collect by sealed QR without the browser\'s own QR reader: a ' + how + ' of a code is read (jsQR) and added',
          !reader.own && reader.jsQR && reader[how] && rows === 1 && /Reader1/.test(String(said)) && bad.length === 0, { reader, rows, said: String(said).slice(0, 120), bad: bad.slice(0, 2) });
      } catch (e) { check('Collect by sealed QR, reading a ' + how, false, String(e && e.message || e).slice(0, 240)); }
      await page.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + (results.length - failed.length) + ' of ' + results.length + ' checks pass.');
  process.exitCode = failed.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exitCode = 1; });
module.exports = { makeFiles };
