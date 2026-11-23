#!/usr/bin/env node
'use strict';
// Wave 1-6 End-to-End Real-Browser Chromium Playwright Verifier.
// Covers:
//   (a) packets-make.html Word Sounds Worksheet + Scaffolded/Independent presets + standalone HTML download
//   (b) packets-vocab.html Vocabulary Practice Worksheet (Parts 1-3) + presets + standalone HTML download
//   (c) packets-read-along.html#import-draft IndexedDB handoff + Teacher voice clip + Offline Symbol/Diagram picker + glossary/print controls
//   (d) speech_setup_module.js (alignSegmentsToSentences + DictationSourceStudio) in real Chromium with local React UMD (zero external CDN)
//   (e) packets-vocab.html#import-draft IndexedDB handoff (kind: 'vocab') + custom meanings/picture + Vocabulary Practice Worksheet
//   (f) packets-make.html#import-draft IndexedDB handoff (kind: 'word_sounds') + activities/picture + Word Sounds Activity Worksheet
//   (g) Read-Along Worksheet + 1-Click Classroom Bundle (.zip) across all 3 makers (packets-make, packets-vocab, packets-read-along)
//   (h) Wave 6 Live Chromium E2E: Read-Along POS schemes/styles/7-class + Reading Ruler/Extra-wide defaultTools + Check-In questions + presets -> live offline player; Math Fact Practice presets + monochrome worksheet + 4-file .zip bundle
//
// Usage: node dev-tools/check_wave1_wave3_e2e.cjs

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const ZIP = require(path.join(ROOT, 'packets_zip.js'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv; charset=utf-8',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8'
};

// Minimal local harness page for Scenario (d) — strictly same-origin, zero external CDN requests.
const SPEECH_SETUP_HARNESS_HTML = [
  '<!doctype html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8">',
  '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'self\'; style-src \'self\' \'unsafe-inline\'; media-src \'self\' blob: data:; connect-src \'self\'">',
  '<title>SpeechSetup E2E Harness</title>',
  '<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script>',
  '<script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script>',
  '<script src="/speech_setup_module.js"></script>',
  '</head>',
  '<body>',
  '<div id="root"></div>',
  '</body>',
  '</html>'
].join('\n');

function startStaticServer(dynamicRoutes) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(String(req.url || '/').split('?')[0].split('#')[0]);
      if (urlPath === '/__e2e/speech-setup.html') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(SPEECH_SETUP_HARNESS_HTML);
        return;
      }
      if (dynamicRoutes && dynamicRoutes.has(urlPath)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        res.end(dynamicRoutes.get(urlPath));
        return;
      }
      const rel = urlPath.replace(/^\/+/, '');
      const file = path.normalize(path.join(ROOT, rel));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('not found');
        return;
      }
      const ext = path.extname(file).toLowerCase();
      res.writeHead(200, {
        'content-type': MIME_TYPES[ext] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      fs.createReadStream(file).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// Generate a valid 16-bit mono PCM WAV data URI (8 kHz, ~0.12 s gentle 440 Hz tone)
// so Chromium's <audio> element recognizes it as valid playable WAV audio.
function makeValidWavDataUri() {
  const sampleRate = 8000;
  const numSamples = 960; // 0.12 s
  const dataSize = numSamples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20);  // PCM format
  buf.writeUInt16LE(1, 22);  // mono
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.round(Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 6000);
    buf.writeInt16LE(sample, 44 + i * 2);
  }
  return 'data:audio/wav;base64,' + buf.toString('base64');
}

function makeValidSvgDataUri(fillHex) {
  const fill = fillHex || '#2563eb';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect x="4" y="4" width="56" height="56" rx="12" fill="${fill}"/><circle cx="32" cy="32" r="14" fill="#ffffff"/></svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg, 'utf8').toString('base64');
}

async function seedHandoffDraft(page, origin, draft) {
  await page.goto(origin + '/packets-about.html', { waitUntil: 'load', timeout: 30000 });
  const record = { id: 'draft', at: Date.now(), draft };
  await page.evaluate((rec) => new Promise((resolve, reject) => {
    const req = indexedDB.open('alloflow-packets-handoff', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains('files')) {
        req.result.createObjectStore('files', { keyPath: 'id' });
      }
    };
    req.onerror = () => reject(req.error || new Error('IDB open failed'));
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').put(rec);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error || new Error('IDB put failed')); };
    };
  }), record);
}

async function readRemainingDraft(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const req = indexedDB.open('alloflow-packets-handoff', 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('files', 'readonly');
      const g = tx.objectStore('files').get('draft');
      g.onsuccess = () => { db.close(); resolve(g.result || null); };
      g.onerror = () => { db.close(); reject(g.error); };
    };
  }));
}

function attachGuards(page, origin) {
  const pageErrors = [];
  const unexpectedRequests = [];
  const failedResponses = [];

  page.on('pageerror', (err) => {
    pageErrors.push(String(err && err.stack ? err.stack : err));
  });
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith(origin + '/') || u === origin || u.startsWith('data:') || u.startsWith('blob:')) return;
    unexpectedRequests.push(req.method() + ' ' + u);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (u.startsWith(origin + '/') && res.status() >= 400 && !u.endsWith('/favicon.ico')) {
      failedResponses.push(res.status() + ' ' + u);
    }
  });

  return {
    assertClean(label) {
      assert.equal(pageErrors.length, 0, `[${label}] Uncaught pageerror(s): ${pageErrors.join(' | ')}`);
      assert.equal(unexpectedRequests.length, 0, `[${label}] Unexpected external network request(s): ${unexpectedRequests.join(' | ')}`);
      assert.equal(failedResponses.length, 0, `[${label}] Same-origin HTTP 4xx/5xx response(s): ${failedResponses.join(' | ')}`);
    }
  };
}

async function readDownloadedText(download) {
  const tmpPath = await download.path();
  assert.ok(tmpPath, 'Playwright download path should exist');
  return fs.readFileSync(tmpPath, 'utf8');
}

async function readDownloadedBytes(download) {
  const tmpPath = await download.path();
  assert.ok(tmpPath, 'Playwright download path should exist');
  return new Uint8Array(fs.readFileSync(tmpPath));
}

async function runScenarioA(browser, origin) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    await page.goto(origin + '/packets-make.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#step-1:not([hidden])');

    // Select both Sound Mapping (letter-bank hints) and Sound Counting (word display for syllable dots).
    await page.evaluate(() => {
      document.querySelectorAll('#strands input[type="checkbox"]').forEach((box) => {
        const want = box.value === 'mapping' || box.value === 'counting';
        if (box.checked !== want) box.click();
      });
    });
    await page.click('#next-1');
    await page.waitForSelector('#step-2:not([hidden])');

    // Enter multi-syllable + CVC words so both letter banks and syllable dots visibly change on preset toggle.
    await page.click('input[name="mode"][value="own"]');
    await page.waitForSelector('#f-own:visible');
    await page.fill('#f-own', 'basket, rabbit, sunset, cactus');
    await page.waitForTimeout(350);
    await page.click('#next-2');

    await page.waitForSelector('#step-3:not([hidden])');
    await page.waitForSelector('#save:not([hidden])', { timeout: 60000 });

    const wsBtn = page.locator('#print-worksheet');
    await wsBtn.waitFor({ state: 'visible' });
    await wsBtn.click();

    await page.waitForSelector('#print-worksheet-view:not([hidden])');
    const overlayCheck = await page.evaluate(() => {
      const view = document.getElementById('print-worksheet-view');
      const key = view ? view.querySelector('.pc-ws-key') : null;
      const keyStyle = key ? getComputedStyle(key) : null;
      return {
        bodyPcOn: document.body.classList.contains('pc-on'),
        sections: view ? view.querySelectorAll('.pc-ws-section').length : 0,
        items: view ? view.querySelectorAll('.pc-ws-item').length : 0,
        hasKey: !!key,
        keyBreakBefore: keyStyle ? keyStyle.breakBefore : ''
      };
    });
    assert.equal(overlayCheck.bodyPcOn, true, 'body.pc-on should be active when worksheet opens');
    assert.ok(overlayCheck.sections >= 2, 'Expected at least 2 activity sections on Word Sounds worksheet');
    assert.ok(overlayCheck.items >= 4, 'Expected rendered student prompt items');
    assert.equal(overlayCheck.hasKey, true, 'Teacher Answer Key section should render');
    assert.equal(overlayCheck.keyBreakBefore, 'page', 'Teacher Answer Key should have break-before: page');

    // Toggle Scaffolded preset
    const scaffoldedBtn = page.locator('#print-worksheet-view [data-ws-preset="scaffolded"]');
    const independentBtn = page.locator('#print-worksheet-view [data-ws-preset="independent"]');
    await scaffoldedBtn.click();
    // Allow lazy syllable table script to finish loading if not already loaded.
    await page.waitForFunction(() => !!(window.AlloModules && window.AlloModules.SyllableTableEn), null, { timeout: 15000 });
    await page.waitForFunction(() => {
      const v = document.getElementById('print-worksheet-view');
      return !!(v && v.querySelectorAll('.pc-dot').length > 0 && v.querySelectorAll('.pc-ws-bank').length > 0);
    }, null, { timeout: 10000 });

    const scaffState = await page.evaluate(() => {
      const v = document.getElementById('print-worksheet-view');
      return {
        scaffPressed: v.querySelector('[data-ws-preset="scaffolded"]').getAttribute('aria-pressed'),
        indPressed: v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed'),
        hintsChecked: document.getElementById('pc-ws-hints').checked,
        sylChecked: document.getElementById('pc-ws-syllables').checked,
        banks: v.querySelectorAll('.pc-ws-bank').length,
        dots: v.querySelectorAll('.pc-dot').length
      };
    });
    assert.equal(scaffState.scaffPressed, 'true', 'Scaffolded button should have aria-pressed="true"');
    assert.equal(scaffState.indPressed, 'false', 'Independent button should have aria-pressed="false"');
    assert.equal(scaffState.hintsChecked, true, 'Hints checkbox should be checked under Scaffolded preset');
    assert.equal(scaffState.sylChecked, true, 'Syllables checkbox should be checked under Scaffolded preset');
    assert.ok(scaffState.banks > 0, 'Scaffolded preset should render letter-bank hints');
    assert.ok(scaffState.dots > 0, 'Scaffolded preset should render syllable dots');

    // Toggle Independent preset
    await independentBtn.click();
    await page.waitForFunction(() => {
      const v = document.getElementById('print-worksheet-view');
      return !!(v && v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed') === 'true');
    });
    const indState = await page.evaluate(() => {
      const v = document.getElementById('print-worksheet-view');
      return {
        scaffPressed: v.querySelector('[data-ws-preset="scaffolded"]').getAttribute('aria-pressed'),
        indPressed: v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed'),
        hintsChecked: document.getElementById('pc-ws-hints').checked,
        sylChecked: document.getElementById('pc-ws-syllables').checked,
        banks: v.querySelectorAll('.pc-ws-bank').length,
        dots: v.querySelectorAll('.pc-dot').length
      };
    });
    assert.equal(indState.scaffPressed, 'false', 'Scaffolded button should flip to aria-pressed="false"');
    assert.equal(indState.indPressed, 'true', 'Independent button should flip to aria-pressed="true"');
    assert.equal(indState.hintsChecked, false, 'Hints checkbox should be unchecked under Independent preset');
    assert.equal(indState.sylChecked, false, 'Syllables checkbox should be unchecked under Independent preset');
    assert.equal(indState.banks, 0, 'Independent preset should remove letter-bank hints');
    assert.equal(indState.dots, 0, 'Independent preset should remove syllable dots');

    // Download standalone HTML worksheet
    const downloadBtn = page.locator('#print-worksheet-view button', { hasText: 'Download HTML worksheet' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      downloadBtn.click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('.html'), 'Downloaded filename should end with .html');
    const html = await readDownloadedText(download);
    assert.ok(html.startsWith('<!doctype html>'), 'Downloaded worksheet should be a valid HTML document');
    assert.ok(html.includes("script-src 'none'"), 'Downloaded worksheet must enforce script-src none CSP');
    assert.ok(html.includes('break-before:page'), 'Downloaded worksheet should include answer-key page break');
    assert.ok(html.includes('Teacher Answer Key'), 'Downloaded worksheet should include Teacher Answer Key');
    assert.equal(/https:\/\//i.test(html), false, 'Downloaded worksheet must contain zero https:// URLs');

    guards.assertClean('Scenario A (packets-make.html)');
    return {
      sections: overlayCheck.sections,
      items: overlayCheck.items,
      scaffBanks: scaffState.banks,
      scaffDots: scaffState.dots,
      downloadBytes: html.length,
      filename: download.suggestedFilename()
    };
  } finally {
    await context.close();
  }
}

async function runScenarioB(browser, origin) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    await page.goto(origin + '/packets-vocab.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#step-1:not([hidden])', { timeout: 30000 });

    // Words known to exist in vocab bank with definitions, examples, and offline symbols/diagrams.
    await page.fill('#f-words', 'habitat, predator, prey, cell, volcano, river');
    await page.waitForTimeout(350);
    await page.click('#next-1');
    await page.waitForSelector('#step-2:not([hidden])', { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.click('#next-2');
    await page.waitForSelector('#step-3:not([hidden])');
    await page.waitForSelector('#save:not([hidden])', { timeout: 60000 });

    // Enable school concept diagrams too so curriculum diagrams + symbols populate Part 3 cleanly.
    await page.evaluate(() => {
      const det = document.getElementById('picture-more');
      if (det) det.open = true;
    });
    const diagBox = page.locator('#f-diagrams');
    if (await diagBox.count() && !(await diagBox.isChecked())) {
      await diagBox.check();
      await page.waitForTimeout(400);
    }

    const wsBtn = page.locator('#print-worksheet');
    await wsBtn.waitFor({ state: 'visible', timeout: 15000 });
    await wsBtn.click();

    await page.waitForSelector('#print-vocab-worksheet-view:not([hidden])');
    // Wait for offline symbol pack / picture gathering to finish and render Part 1, 2, 3.
    await page.waitForFunction(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      if (!v) return false;
      const said = v.querySelector('.pc-said');
      const ready = said && /ready to print or download/i.test(said.textContent || '');
      const p3 = v.querySelector('[data-vocab-part="pictures"]');
      return !!(ready && p3 && p3.querySelectorAll('.pc-vocab-pic-tile').length > 0);
    }, null, { timeout: 30000 });

    const initialCheck = await page.evaluate(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      const p1 = v.querySelector('[data-vocab-part="matching"]');
      const p2 = v.querySelector('[data-vocab-part="cloze"]');
      const p3 = v.querySelector('[data-vocab-part="pictures"]');
      const key = v.querySelector('.pc-ws-key');
      const imgs = p3 ? Array.from(p3.querySelectorAll('img.pc-vocab-pic-img')).map((im) => im.getAttribute('src') || '') : [];
      return {
        bodyPcOn: document.body.classList.contains('pc-on'),
        hasP1: !!p1 && p1.querySelectorAll('.pc-vocab-match-word').length >= 4,
        hasP2: !!p2 && p2.querySelectorAll('.pc-ws-item').length >= 4,
        hasP3: !!p3 && p3.querySelectorAll('.pc-vocab-pic-tile').length >= 1,
        picTiles: p3 ? p3.querySelectorAll('.pc-vocab-pic-tile').length : 0,
        allImgsDataUri: imgs.length > 0 && imgs.every((s) => s.startsWith('data:image/')),
        hasKey: !!key,
        keyBreakBefore: key ? getComputedStyle(key).breakBefore : ''
      };
    });
    assert.equal(initialCheck.bodyPcOn, true, 'body.pc-on should be active for vocab worksheet');
    assert.equal(initialCheck.hasP1, true, 'Part 1 (word-to-meaning matching) should render');
    assert.equal(initialCheck.hasP2, true, 'Part 2 (fill-in-the-blank cloze) should render');
    assert.equal(initialCheck.hasP3, true, 'Part 3 (Name the Picture tiles) should render');
    assert.equal(initialCheck.allImgsDataUri, true, 'All Part 3 images should be inline data:image/ URIs');
    assert.equal(initialCheck.hasKey, true, 'Teacher Answer Key page should render');
    assert.equal(initialCheck.keyBreakBefore, 'page', 'Teacher Answer Key should have break-before: page');

    // Toggle Scaffolded preset
    const scaffBtn = page.locator('#print-vocab-worksheet-view [data-ws-preset="scaffolded"]');
    const indBtn = page.locator('#print-vocab-worksheet-view [data-ws-preset="independent"]');
    await scaffBtn.click();
    await page.waitForFunction(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      return !!(v && v.querySelector('[data-ws-preset="scaffolded"]').getAttribute('aria-pressed') === 'true'
        && v.querySelector('[data-vocab-word-bank="true"]')
        && v.querySelectorAll('.pc-dot').length > 0);
    }, null, { timeout: 15000 });

    const scaff = await page.evaluate(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      return {
        scaffPressed: v.querySelector('[data-ws-preset="scaffolded"]').getAttribute('aria-pressed'),
        indPressed: v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed'),
        hasWordBank: !!v.querySelector('[data-vocab-word-bank="true"]'),
        dots: v.querySelectorAll('.pc-dot').length
      };
    });
    assert.equal(scaff.scaffPressed, 'true');
    assert.equal(scaff.indPressed, 'false');
    assert.equal(scaff.hasWordBank, true);
    assert.ok(scaff.dots > 0, 'Scaffolded preset should render syllable dots on multisyllabic vocab words');

    // Toggle Independent preset
    await indBtn.click();
    await page.waitForFunction(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      return !!(v && v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed') === 'true');
    });
    const ind = await page.evaluate(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      return {
        scaffPressed: v.querySelector('[data-ws-preset="scaffolded"]').getAttribute('aria-pressed'),
        indPressed: v.querySelector('[data-ws-preset="independent"]').getAttribute('aria-pressed'),
        hasWordBank: !!v.querySelector('[data-vocab-word-bank="true"]'),
        dots: v.querySelectorAll('.pc-dot').length
      };
    });
    assert.equal(ind.scaffPressed, 'false');
    assert.equal(ind.indPressed, 'true');
    assert.equal(ind.hasWordBank, false, 'Independent preset should hide Word Bank');
    assert.equal(ind.dots, 0, 'Independent preset should remove syllable dots');

    // Download standalone HTML vocab worksheet
    const dlBtn = page.locator('#print-vocab-worksheet-view button', { hasText: 'Download HTML worksheet' });
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      dlBtn.click()
    ]);
    assert.ok(download.suggestedFilename().endsWith('.html'));
    const html = await readDownloadedText(download);
    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes("script-src 'none'"), 'Downloaded vocab worksheet must enforce script-src none CSP');
    assert.ok(html.includes('data-vocab-part="matching"'), 'Downloaded vocab HTML should contain Part 1');
    assert.ok(html.includes('data-vocab-part="cloze"'), 'Downloaded vocab HTML should contain Part 2');
    assert.ok(html.includes('data-vocab-part="pictures"'), 'Downloaded vocab HTML should contain Part 3');
    assert.ok(html.includes('Teacher Answer Key'), 'Downloaded vocab HTML should contain Teacher Answer Key');
    assert.equal(/https:\/\//i.test(html), false, 'Downloaded vocab worksheet must contain zero https:// URLs');

    guards.assertClean('Scenario B (packets-vocab.html)');
    return {
      picTiles: initialCheck.picTiles,
      scaffDots: scaff.dots,
      downloadBytes: html.length,
      filename: download.suggestedFilename()
    };
  } finally {
    await context.close();
  }
}

async function runScenarioC(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    // 1. Seed same-origin IndexedDB alloflow-packets-handoff (files store, key 'draft') matching #21 / packets_handoff.js contract
    await page.goto(origin + '/packets-about.html', { waitUntil: 'load', timeout: 30000 });
    const wavUri = makeValidWavDataUri();
    const sent1 = 'The volcano rumbled softly at dawn.';
    const sent2 = 'Orange lava glowed bright along the ridge.';
    const seededDraft = {
      id: 'draft',
      at: Date.now(),
      draft: {
        kind: 'read_along',
        title: 'Volcano Field Notes',
        text: sent1 + ' ' + sent2,
        lang: 'en',
        customSupports: [
          { line: 0, quote: 'volcano', text: 'An opening in Earth where hot melted rock comes out.' }
        ],
        clips: {
          [sent1]: { uri: wavUri, source: 'teacher' }
        }
      }
    };
    await page.evaluate((record) => new Promise((resolve, reject) => {
      const req = indexedDB.open('alloflow-packets-handoff', 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains('files')) {
          req.result.createObjectStore('files', { keyPath: 'id' });
        }
      };
      req.onerror = () => reject(req.error || new Error('IDB open failed'));
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put(record);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error || new Error('IDB put failed')); };
      };
    }), seededDraft);

    // 2. Navigate to packets-read-along.html#import-draft and verify automatic handoff import
    await page.goto(origin + '/packets-read-along.html#import-draft', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => {
      const titleEl = document.getElementById('f-title');
      return !!(titleEl && titleEl.value === 'Volcano Field Notes');
    }, null, { timeout: 15000 });

    const imported = await page.evaluate((s1Key) => {
      const titleVal = document.getElementById('f-title').value;
      const textVal = document.getElementById('f-text').value;
      const line1 = document.querySelector('#line-rows li[data-line="1"]');
      const line1State = line1 && line1.querySelector('.voice-state') ? line1.querySelector('.voice-state').textContent : '';
      const line1Play = line1 ? line1.querySelector('[data-play="1"]') : null;
      const line2 = document.querySelector('#line-rows li[data-line="2"]');
      const line2State = line2 && line2.querySelector('.voice-state') ? line2.querySelector('.voice-state').textContent : '';
      const supRows = document.querySelectorAll('#support-rows li');
      const api = window.AlloPacketReadAlongPage;
      const clipEntry = api && api.state && api.state.clips ? api.state.clips[s1Key] : null;
      return {
        titleVal,
        textVal,
        line1Made: !!(line1 && line1.classList.contains('is-made')),
        line1State,
        hasPlayBtn: !!line1Play,
        line2State,
        supportCount: supRows.length,
        supportText: supRows[0] ? supRows[0].textContent : '',
        clipSource: clipEntry ? clipEntry.source : '',
        clipUriPrefix: clipEntry ? String(clipEntry.uri || '').slice(0, 22) : '',
        panelOpen: !!document.getElementById('custom-supports-panel').open
      };
    }, sent1);

    assert.equal(imported.titleVal, 'Volcano Field Notes', 'Title should auto-populate from IDB draft');
    assert.ok(imported.textVal.includes(sent1) && imported.textVal.includes(sent2), 'Passage text should auto-populate');
    assert.equal(imported.line1Made, true, 'Sentence 1 should be marked as recorded');
    assert.ok(imported.line1State.includes('(your voice)'), 'Sentence 1 should display teacher voice clip status');
    assert.equal(imported.hasPlayBtn, true, 'Sentence 1 should expose Play button');
    assert.equal(imported.clipSource, 'teacher', 'Imported clip source must be teacher');
    assert.equal(imported.clipUriPrefix, 'data:audio/wav;base64,', 'Imported clip URI must be valid WAV data URI');
    assert.equal(imported.supportCount, 1, 'Imported custom support should appear in #support-rows');
    assert.ok(imported.supportText.includes('volcano'), 'Imported custom support text should match');
    assert.equal(imported.panelOpen, true, 'Custom supports panel should open when supports are imported');

    // Verify Play button invokes playback without error and draft was consumed from IDB
    await page.click('[data-play="1"]');
    await page.waitForTimeout(150);
    const idbRemaining = await page.evaluate(() => new Promise((resolve, reject) => {
      const req = indexedDB.open('alloflow-packets-handoff', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('files', 'readonly');
        const g = tx.objectStore('files').get('draft');
        g.onsuccess = () => { db.close(); resolve(g.result || null); };
        g.onerror = () => { db.close(); reject(g.error); };
      };
    }));
    assert.equal(idbRemaining, null, 'takeDraft() should consume and delete the draft from IndexedDB');

    // 3. Custom Support Editor + Offline Symbol/Diagram Picker (#sup-pic-offline)
    await page.fill('#sup-quote', 'volcano');
    await page.fill('#sup-text', 'A mountain opening where melted rock erupts.');
    await page.click('#sup-pic-offline');
    await page.waitForSelector('#sup-pic-picker:not([hidden])');
    await page.waitForSelector('#sup-pic-results .ra-sup-pick-btn', { timeout: 20000 });
    await page.locator('#sup-pic-results .ra-sup-pick-btn').first().click();

    await page.waitForSelector('#sup-pic-preview:not([hidden])');
    const previewSrc = await page.getAttribute('#sup-pic-preview', 'src');
    assert.ok(previewSrc && previewSrc.startsWith('data:image/svg+xml'), 'Offline picker should attach inline data:image/svg+xml preview');

    // Save the custom support and verify it persists in #support-rows with inline SVG
    await page.click('#sup-add');
    await page.waitForFunction(() => document.querySelectorAll('#support-rows li').length === 2);
    const savedSupImg = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('#support-rows img')).map((im) => im.getAttribute('src') || '');
      return imgs.some((s) => s.startsWith('data:image/svg+xml'));
    });
    assert.equal(savedSupImg, true, 'Saved custom support row should include inline data:image/svg+xml image');

    // 4. Verify #f-narrate-glossary & #print-supports presence and interaction
    await page.evaluate(() => {
      const m = document.getElementById('more-supports');
      if (m) m.open = true;
    });
    const dictBox = page.locator('#f-dict');
    await dictBox.check();
    await page.waitForSelector('#f-narrate-glossary-wrap:not([hidden])');
    const controls = await page.evaluate(() => {
      const ng = document.getElementById('f-narrate-glossary');
      const psWrap = document.getElementById('print-supports-wrap');
      const ps = document.getElementById('print-supports');
      return {
        hasNarrateGlossary: !!ng,
        narrateGlossaryVisible: !document.getElementById('f-narrate-glossary-wrap').hidden,
        hasPrintSupports: !!ps,
        printSupportsVisible: !!(psWrap && !psWrap.hidden),
        printSupportsCheckedInitially: !!(ps && ps.checked)
      };
    });
    assert.equal(controls.hasNarrateGlossary, true, '#f-narrate-glossary should exist');
    assert.equal(controls.narrateGlossaryVisible, true, '#f-narrate-glossary should unhide when Word meanings is enabled');
    assert.equal(controls.hasPrintSupports, true, '#print-supports should exist');
    assert.equal(controls.printSupportsVisible, true, '#print-supports should be visible when custom supports exist');
    assert.equal(controls.printSupportsCheckedInitially, true, '#print-supports should default to checked');

    await page.uncheck('#print-supports');
    const afterUncheck = await page.isChecked('#print-supports');
    assert.equal(afterUncheck, false, '#print-supports should toggle off cleanly');
    await page.check('#print-supports');
    const afterRecheck = await page.isChecked('#print-supports');
    assert.equal(afterRecheck, true, '#print-supports should toggle back on cleanly');

    guards.assertClean('Scenario C (packets-read-along.html#import-draft)');
    return {
      importedSupports: imported.supportCount,
      finalSupports: 2,
      previewPrefix: previewSrc.slice(0, 30),
      teacherClipVerified: true
    };
  } finally {
    await context.close();
  }
}

async function runScenarioD(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    await page.goto(origin + '/__e2e/speech-setup.html', { waitUntil: 'load', timeout: 30000 });

    const pureResult = await page.evaluate(() => {
      const ss = window.AlloModules && window.AlloModules.SpeechSetup;
      if (!ss || !ss._pure || typeof ss._pure.alignSegmentsToSentences !== 'function') {
        throw new Error('SpeechSetup._pure.alignSegmentsToSentences not found');
      }
      const align = ss._pure.alignSegmentsToSentences;
      const passage = 'The river flows east. Birds nest in tall reeds. Frogs sing at dusk.';
      const makeBlob = (tag) => new Blob([tag], { type: 'audio/wav' });
      const segs = [
        { id: 's1', text: 'The river flows east.', blob: makeBlob('c1') },
        // Merged two-sentence segment — must be skipped!
        { id: 'merged', text: 'Birds nest in tall reeds. Frogs sing at dusk.', blob: makeBlob('c23') },
        // Single-sentence clip for sentence 3 — must align!
        { id: 's3', text: 'Frogs sing at dusk', blob: makeBlob('c3') }
      ];
      const aligned = align(passage, segs);

      // Also verify asymmetric merged clip (long sentence + short sentence) is skipped
      const asymPassage = 'Scientists carefully observe shifting tectonic plates beneath the ocean floor every year. Lava cools fast.';
      const asymAligned = align(asymPassage, [
        { id: 'asym', text: 'Scientists carefully observe shifting tectonic plates beneath the ocean floor every year. Lava cools fast.', blob: makeBlob('ca') }
      ]);

      return {
        alignedSummary: aligned.map((m) => ({ sentenceIndex: m.sentenceIndex, segId: m.segment.id, score: m.score })),
        asymCount: asymAligned.length
      };
    });

    assert.equal(pureResult.alignedSummary.length, 2, 'Should align exactly the 2 single-sentence clips and skip merged clip');
    assert.equal(pureResult.alignedSummary[0].sentenceIndex, 0);
    assert.equal(pureResult.alignedSummary[0].segId, 's1');
    assert.equal(pureResult.alignedSummary[1].sentenceIndex, 2);
    assert.equal(pureResult.alignedSummary[1].segId, 's3');
    assert.equal(pureResult.asymCount, 0, 'Asymmetric merged multi-sentence clip must be skipped');

    // Mount DictationSourceStudio in real Chromium using local React UMD and exercise opt-in checkbox + Send to Read-Along callback
    await page.evaluate(() => {
      const React = window.React;
      const ReactDOM = window.ReactDOM;
      const Studio = window.AlloModules.SpeechSetup.DictationStudio;
      window.__e2eReadAlongCalls = [];
      const b1 = new Blob(['RIFF0000WAVE'], { type: 'audio/wav' });
      const b2 = new Blob(['RIFF1111WAVE'], { type: 'audio/wav' });
      const initialSegments = [
        { id: 'seg-1', text: 'The river flows east.', blob: b1, mimeType: 'audio/wav' },
        { id: 'seg-2', text: 'Frogs sing at dusk.', blob: b2, mimeType: 'audio/wav' }
      ];
      const el = React.createElement(Studio, {
        value: 'The river flows east. Frogs sing at dusk.',
        initialSegments,
        onChange: function () {},
        onSendToReadAlong: function (payload) {
          window.__e2eReadAlongCalls.push({
            text: payload.text,
            includeVoiceClips: payload.includeVoiceClips,
            segmentCount: Array.isArray(payload.segments) ? payload.segments.length : -1
          });
        }
      });
      ReactDOM.render(el, document.getElementById('root'));
    });

    await page.waitForSelector('[data-testid="dictation-include-voice-clips"]');
    await page.waitForSelector('[data-testid="dictation-send-read-along"]');

    const defaultChecked = await page.isChecked('[data-testid="dictation-include-voice-clips"]');
    assert.equal(defaultChecked, true, 'Voice clip opt-in toggle should default to checked when audio segments exist');
    const toggleLabel = await page.locator('label', { has: page.locator('[data-testid="dictation-include-voice-clips"]') }).textContent();
    assert.ok(toggleLabel.includes('Include my recorded voice clips (2)'), 'Toggle label should reflect 2 audio segments');

    // Send with voice clips enabled
    await page.click('[data-testid="dictation-send-read-along"]');
    // Uncheck and send again
    await page.uncheck('[data-testid="dictation-include-voice-clips"]');
    await page.click('[data-testid="dictation-send-read-along"]');

    const calls = await page.evaluate(() => window.__e2eReadAlongCalls);
    assert.equal(calls.length, 2, 'Expected 2 onSendToReadAlong invocations');
    assert.equal(calls[0].includeVoiceClips, true);
    assert.equal(calls[0].segmentCount, 2, 'Checked toggle should pass both blob segments');
    assert.equal(calls[1].includeVoiceClips, false);
    assert.equal(calls[1].segmentCount, 0, 'Unchecked toggle should omit blob segments');

    guards.assertClean('Scenario D (speech_setup_module.js / DictationSourceStudio)');
    return {
      alignedCount: pureResult.alignedSummary.length,
      asymMergedSkipped: pureResult.asymCount === 0,
      studioCallsVerified: calls.length
    };
  } finally {
    await context.close();
  }
}

async function runScenarioE(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    const svgUri = makeValidSvgDataUri('#0f766e');
    await seedHandoffDraft(page, origin, {
      kind: 'vocab',
      title: 'Ecosystem Glossary',
      lang: 'en',
      entries: [
        {
          word: 'estuary',
          meaning: 'Where a freshwater river meets the salty ocean tide.',
          example: 'Young fish shelter in the calm estuary.',
          pos: 'noun',
          tier: 'domain',
          imgUri: svgUri,
          alt: 'Estuary emblem'
        },
        {
          word: 'canopy',
          meaning: 'The leafy upper layer of branches in a forest.',
          example: 'Monkeys travel across the high canopy.',
          pos: 'noun',
          tier: 'domain',
          imgUri: '',
          alt: ''
        },
        {
          word: 'detritus',
          meaning: 'Small bits of dead plants and leaves on the ground.',
          example: 'Worms break down detritus into rich soil.',
          pos: 'noun',
          tier: 'domain',
          imgUri: '',
          alt: ''
        },
        {
          word: 'lichen',
          meaning: 'A hardy plant-like crust that grows on rocks and bark.',
          example: 'Green lichen covered the old stone wall.',
          pos: 'noun',
          tier: 'domain',
          imgUri: '',
          alt: ''
        }
      ]
    });

    await page.goto(origin + '/packets-vocab.html#import-draft', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('reopen-line');
      return !!(el && /Loaded 4 words from AlloFlow/i.test(el.textContent || ''));
    }, null, { timeout: 30000 });
    await page.waitForSelector('#step-3:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#save:not([hidden])', { timeout: 60000 });

    const hydrated = await page.evaluate(() => ({
      hash: window.location.hash,
      title: document.getElementById('f-title') ? document.getElementById('f-title').value : '',
      words: document.getElementById('f-words') ? document.getElementById('f-words').value : '',
      reopenLine: document.getElementById('reopen-line') ? document.getElementById('reopen-line').textContent : ''
    }));
    assert.equal(hydrated.hash, '', 'Hash #import-draft should be cleared via history.replaceState');
    assert.equal(hydrated.title, 'Ecosystem Glossary', 'Title should hydrate from vocab draft');
    assert.ok(/estuary/i.test(hydrated.words) && /canopy/i.test(hydrated.words) && /detritus/i.test(hydrated.words) && /lichen/i.test(hydrated.words), 'All 4 glossary words should hydrate into #f-words');
    assert.ok(/Loaded 4 words from AlloFlow/i.test(hydrated.reopenLine), 'Status should announce Loaded 4 words from AlloFlow');

    const idbRemaining = await readRemainingDraft(page);
    assert.equal(idbRemaining, null, 'takeDraft() should consume and delete the vocab draft from IndexedDB');

    const wsBtn = page.locator('#print-worksheet');
    await wsBtn.waitFor({ state: 'visible', timeout: 15000 });
    await wsBtn.click();

    await page.waitForSelector('#print-vocab-worksheet-view:not([hidden])');
    await page.waitForFunction(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      if (!v) return false;
      const said = v.querySelector('.pc-said');
      const ready = said && /ready to print or download/i.test(said.textContent || '');
      const p3 = v.querySelector('[data-vocab-part="pictures"]');
      return !!(ready && p3 && p3.querySelectorAll('.pc-vocab-pic-tile').length > 0);
    }, null, { timeout: 30000 });

    const wsCheck = await page.evaluate(() => {
      const v = document.getElementById('print-vocab-worksheet-view');
      const txt = v ? (v.textContent || '') : '';
      const imgs = v ? Array.from(v.querySelectorAll('img.pc-vocab-pic-img')).map((im) => im.getAttribute('src') || '') : [];
      return {
        hasTerms: /estuary/i.test(txt) && /canopy/i.test(txt) && /detritus/i.test(txt) && /lichen/i.test(txt),
        hasCustomMeanings: txt.includes('Where a freshwater river meets the salty ocean tide.')
          && txt.includes('The leafy upper layer of branches in a forest.'),
        picCount: imgs.length,
        hasInlineSvgTile: imgs.some((s) => s.startsWith('data:image/svg+xml'))
      };
    });
    assert.equal(wsCheck.hasTerms, true, 'Vocab worksheet should render all imported AlloFlow Glossary terms');
    assert.equal(wsCheck.hasCustomMeanings, true, 'Vocab worksheet should render imported AlloFlow custom meanings');
    assert.ok(wsCheck.picCount >= 1, 'Vocab worksheet should render at least 1 picture tile');
    assert.equal(wsCheck.hasInlineSvgTile, true, 'Vocab worksheet should render the imported inline SVG picture tile');

    guards.assertClean('Scenario E (packets-vocab.html#import-draft)');
    return {
      title: hydrated.title,
      reopenLine: hydrated.reopenLine,
      picCount: wsCheck.picCount,
      customMeaningsRendered: wsCheck.hasCustomMeanings
    };
  } finally {
    await context.close();
  }
}

async function runScenarioF(browser, origin) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  try {
    const svgUri = makeValidSvgDataUri('#7c3aed');
    await seedHandoffDraft(page, origin, {
      kind: 'word_sounds',
      title: 'Short-A Phonics Pack',
      lang: 'en',
      words: ['basket', 'rabbit', 'magnet', 'cactus'],
      pattern: 'short-a',
      activities: ['mapping', 'counting'],
      pictures: {
        basket: svgUri
      }
    });

    await page.goto(origin + '/packets-make.html#import-draft', { waitUntil: 'load', timeout: 30000 });
    await page.waitForFunction(() => {
      const el = document.getElementById('reopen-line');
      return !!(el && /Loaded 4 words from AlloFlow/i.test(el.textContent || ''));
    }, null, { timeout: 30000 });
    await page.waitForSelector('#step-3:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#save:not([hidden])', { timeout: 60000 });

    const hydrated = await page.evaluate(() => ({
      hash: window.location.hash,
      title: document.getElementById('f-title') ? document.getElementById('f-title').value : '',
      ownWords: document.getElementById('f-own') ? document.getElementById('f-own').value : '',
      reopenLine: document.getElementById('reopen-line') ? document.getElementById('reopen-line').textContent : '',
      reopenList: document.getElementById('reopen-list') ? document.getElementById('reopen-list').textContent : '',
      checkedActs: Array.from(document.querySelectorAll('#strands input[type="checkbox"]:checked')).map((b) => b.value)
    }));
    assert.equal(hydrated.hash, '', 'Hash #import-draft should be cleared via history.replaceState');
    assert.equal(hydrated.title, 'Short-A Phonics Pack', 'Title should hydrate from word_sounds draft');
    assert.ok(/basket/i.test(hydrated.ownWords) && /rabbit/i.test(hydrated.ownWords) && /magnet/i.test(hydrated.ownWords) && /cactus/i.test(hydrated.ownWords), 'All 4 phonics words should hydrate into #f-own');
    assert.ok(/Loaded 4 words from AlloFlow/i.test(hydrated.reopenLine), 'Status should announce Loaded 4 words from AlloFlow');
    assert.ok(/Included 1 picture from AlloFlow/i.test(hydrated.reopenList), 'Reopen list should note the carried-over AlloFlow picture');
    assert.ok(hydrated.checkedActs.includes('mapping') && hydrated.checkedActs.includes('counting'), 'Explicit draft activity IDs should hydrate');

    const idbRemaining = await readRemainingDraft(page);
    assert.equal(idbRemaining, null, 'takeDraft() should consume and delete the word_sounds draft from IndexedDB');

    const wsBtn = page.locator('#print-worksheet');
    await wsBtn.waitFor({ state: 'visible', timeout: 15000 });
    await wsBtn.click();

    await page.waitForSelector('#print-worksheet-view:not([hidden])');
    const wsCheck = await page.evaluate(() => {
      const v = document.getElementById('print-worksheet-view');
      const txt = v ? (v.textContent || '') : '';
      return {
        sections: v ? v.querySelectorAll('.pc-ws-section').length : 0,
        items: v ? v.querySelectorAll('.pc-ws-item').length : 0,
        hasAllWords: /basket/i.test(txt) && /rabbit/i.test(txt) && /magnet/i.test(txt) && /cactus/i.test(txt),
        hasTitle: txt.includes('Short-A Phonics Pack')
      };
    });
    assert.ok(wsCheck.sections >= 2, 'Word Sounds worksheet should render both imported activity sections');
    assert.ok(wsCheck.items >= 4, 'Word Sounds worksheet should render student items');
    assert.equal(wsCheck.hasAllWords, true, 'Word Sounds worksheet should render all 4 imported phonics words');
    assert.equal(wsCheck.hasTitle, true, 'Word Sounds worksheet should display the imported title');

    guards.assertClean('Scenario F (packets-make.html#import-draft)');
    return {
      title: hydrated.title,
      reopenLine: hydrated.reopenLine,
      activities: hydrated.checkedActs,
      sections: wsCheck.sections,
      items: wsCheck.items
    };
  } finally {
    await context.close();
  }
}

async function runScenarioG(browser, origin) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const guards = attachGuards(page, origin);
  const dec = new TextDecoder('utf-8');
  try {
    // 1. packets-make.html: 4-file Classroom Bundle (.zip)
    await page.goto(origin + '/packets-make.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#step-1:not([hidden])');
    await page.click('#quick-make');
    await page.waitForSelector('#step-3:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#download-bundle:not([hidden])', { timeout: 60000 });

    const [makeZipDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-bundle')
    ]);
    assert.ok(makeZipDl.suggestedFilename().endsWith('.zip'), 'Word Sounds bundle should end with .zip');
    const makeBytes = await readDownloadedBytes(makeZipDl);
    assert.deepEqual(Array.from(makeBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04], 'Word Sounds bundle must start with PK\\x03\\x04');
    const makeEntries = ZIP.readZip(makeBytes);
    assert.deepEqual(
      makeEntries.map((e) => e.name),
      [
        '01-Interactive-Packet.html',
        '02-Worksheet-Scaffolded.html',
        '03-Worksheet-Independent.html',
        '04-Teacher-Answer-Key.html'
      ],
      'Word Sounds bundle must contain all 4 expected files'
    );
    assert.equal(makeEntries.every((e) => e.crcOk), true, 'Word Sounds bundle ZIP CRCs must all be valid');
    const makeInteractive = dec.decode(makeEntries[0].bytes);
    const makeScaff = dec.decode(makeEntries[1].bytes);
    const makeInd = dec.decode(makeEntries[2].bytes);
    const makeKey = dec.decode(makeEntries[3].bytes);
    assert.ok(makeInteractive.includes("connect-src 'none'"), 'Word Sounds 01 interactive packet should enforce connect-src none');
    assert.ok(makeScaff.includes("script-src 'none'"), 'Word Sounds 02 scaffolded worksheet must enforce script-src none');
    assert.ok(makeInd.includes("script-src 'none'"), 'Word Sounds 03 independent worksheet must enforce script-src none');
    assert.ok(makeKey.includes("script-src 'none'"), 'Word Sounds 04 answer key must enforce script-src none');
    assert.ok(makeKey.includes('Teacher Answer Key') || makeKey.includes('For the teacher'), 'Word Sounds 04 must contain teacher answer key');

    // 2. packets-vocab.html: 4-file Classroom Bundle (.zip)
    await page.goto(origin + '/packets-vocab.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#step-1:not([hidden])', { timeout: 30000 });
    await page.fill('#f-words', 'habitat, predator, prey, cell, volcano');
    await page.waitForTimeout(350);
    await page.click('#next-1');
    await page.waitForSelector('#step-2:not([hidden])', { timeout: 30000 });
    await page.waitForTimeout(350);
    await page.click('#next-2');
    await page.waitForSelector('#step-3:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#download-bundle:not([hidden])', { timeout: 60000 });

    const [vocabZipDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-bundle')
    ]);
    assert.ok(vocabZipDl.suggestedFilename().endsWith('.zip'), 'Vocab bundle should end with .zip');
    const vocabBytes = await readDownloadedBytes(vocabZipDl);
    assert.deepEqual(Array.from(vocabBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04], 'Vocab bundle must start with PK\\x03\\x04');
    const vocabEntries = ZIP.readZip(vocabBytes);
    assert.deepEqual(
      vocabEntries.map((e) => e.name),
      [
        '01-Interactive-Packet.html',
        '02-Worksheet-Scaffolded.html',
        '03-Worksheet-Independent.html',
        '04-Teacher-Answer-Key.html'
      ],
      'Vocab bundle must contain all 4 expected files'
    );
    assert.equal(vocabEntries.every((e) => e.crcOk), true, 'Vocab bundle ZIP CRCs must all be valid');
    const vocabInteractive = dec.decode(vocabEntries[0].bytes);
    const vocabScaff = dec.decode(vocabEntries[1].bytes);
    const vocabInd = dec.decode(vocabEntries[2].bytes);
    const vocabKey = dec.decode(vocabEntries[3].bytes);
    assert.ok(vocabInteractive.includes("connect-src 'none'"), 'Vocab 01 interactive packet should enforce connect-src none');
    assert.ok(vocabScaff.includes("script-src 'none'") && vocabScaff.includes('data-vocab-word-bank="true"'), 'Vocab 02 scaffolded worksheet must have script-src none and word bank');
    assert.ok(vocabInd.includes("script-src 'none'") && !vocabInd.includes('data-vocab-word-bank="true"'), 'Vocab 03 independent worksheet must have script-src none and omit word bank');
    assert.ok(vocabKey.includes("script-src 'none'") && (vocabKey.includes('Teacher Answer Key') || vocabKey.includes('For the teacher')), 'Vocab 04 must have script-src none and teacher answer key');

    // 3. packets-read-along.html: Standalone Monochrome Worksheet + 3-file Classroom Bundle (.zip)
    await page.goto(origin + '/packets-read-along.html', { waitUntil: 'load', timeout: 30000 });
    await page.fill('#f-title', 'The Fox');
    await page.fill('#f-text', 'The fox ran to the den. It hid in the tall grass all afternoon.');
    await page.waitForSelector('#download-worksheet:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#download-bundle:not([hidden])', { timeout: 30000 });

    await page.evaluate(() => {
      const panel = document.getElementById('custom-supports-panel');
      if (panel) panel.open = true;
    });
    await page.fill('#sup-quote', 'den');
    await page.fill('#sup-text', 'A small wild animal home.');
    await page.click('#sup-add');
    await page.fill('#sup-quote', 'tall grass');
    await page.fill('#sup-text', 'Long grass where animals can hide.');
    await page.click('#sup-add');
    await page.waitForFunction(() => document.querySelectorAll('#support-rows li').length === 2);

    const [raWsDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-worksheet')
    ]);
    assert.ok(raWsDl.suggestedFilename().endsWith('.html'), 'Read-Along worksheet should end with .html');
    const raWsHtml = await readDownloadedText(raWsDl);
    assert.ok(raWsHtml.startsWith('<!doctype html>'), 'Read-Along worksheet should be valid HTML');
    assert.ok(raWsHtml.includes("script-src 'none'"), 'Read-Along worksheet must enforce script-src none');
    assert.ok(raWsHtml.includes('data-ra-part="passage"'), 'Read-Along worksheet must include Part 1 (passage)');
    assert.ok(raWsHtml.includes('data-ra-part="supports"'), 'Read-Along worksheet must include Part 2 (supports)');
    assert.ok(raWsHtml.includes('data-ra-part="matching"'), 'Read-Along worksheet must include Part 3 (matching)');
    assert.ok(raWsHtml.includes('data-ra-part="writing"'), 'Read-Along worksheet must include Part 4 (writing)');
    assert.ok(raWsHtml.includes('data-answer-key="true"'), 'Read-Along standalone worksheet must include Teacher Answer Key');
    assert.equal(/https:\/\//i.test(raWsHtml), false, 'Read-Along worksheet must contain zero https:// URLs');

    const [raZipDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-bundle')
    ]);
    assert.ok(raZipDl.suggestedFilename().endsWith('.zip'), 'Read-Along bundle should end with .zip');
    const raBytes = await readDownloadedBytes(raZipDl);
    assert.deepEqual(Array.from(raBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04], 'Read-Along bundle must start with PK\\x03\\x04');
    const raEntries = ZIP.readZip(raBytes);
    assert.deepEqual(
      raEntries.map((e) => e.name),
      [
        '01-Interactive-Read-Along.html',
        '02-Student-Worksheet.html',
        '03-Teacher-Answer-Key.html'
      ],
      'Read-Along bundle must contain all 3 expected files'
    );
    assert.equal(raEntries.every((e) => e.crcOk), true, 'Read-Along bundle ZIP CRCs must all be valid');
    const raInteractive = dec.decode(raEntries[0].bytes);
    const raStudent = dec.decode(raEntries[1].bytes);
    const raTeacher = dec.decode(raEntries[2].bytes);
    assert.ok(raInteractive.includes("connect-src 'none'"), 'Read-Along 01 interactive packet should enforce connect-src none');
    assert.ok(raStudent.includes("script-src 'none'") && !raStudent.includes('data-answer-key="true"'), 'Read-Along 02 student worksheet must enforce script-src none and omit answer key');
    assert.ok(raTeacher.includes("script-src 'none'") && raTeacher.includes('data-answer-key="true"'), 'Read-Along 03 teacher answer key must enforce script-src none and include answer key');

    guards.assertClean('Scenario G (Wave 5 Read-Along Worksheet + Classroom Bundles)');
    return {
      makeBundleFiles: makeEntries.length,
      vocabBundleFiles: vocabEntries.length,
      readAlongWsBytes: raWsHtml.length,
      readAlongBundleFiles: raEntries.length
    };
  } finally {
    await context.close();
  }
}

async function runScenarioH(browser, origin, dynamicRoutes) {
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(25000);
  const guards = attachGuards(page, origin);
  const dec = new TextDecoder('utf-8');
  try {
    // ------------------------------------------------------------------
    // H1: packets-read-along.html -> Built Offline Interactive HTML Player
    // ------------------------------------------------------------------
    await page.goto(origin + '/packets-read-along.html', { waitUntil: 'load', timeout: 30000 });
    await page.fill('#f-title', 'Meadow Fox Adventure');
    await page.fill(
      '#f-text',
      'The bright fox ran quickly across the green meadow and she hid quietly under the tall oak tree.'
    );
    await page.waitForSelector('#download-worksheet:not([hidden])', { timeout: 30000 });
    await page.waitForSelector('#save:not([hidden])', { timeout: 30000 });

    // Open More reading supports and configure POS (Fitzgerald Key, Pill, 7-class) + defaultTools (Reading Ruler + Extra wide)
    await page.evaluate(() => {
      const more = document.getElementById('more-supports');
      if (more) more.open = true;
    });
    await page.check('#f-pos');
    await page.waitForSelector('#pos-customizer:not([hidden])');
    await page.selectOption('#f-pos-scheme', 'fitzgerald');
    await page.selectOption('#f-pos-style', 'pill');
    await page.check('#f-pos-extended');
    await page.selectOption('#f-def-focus', '3');
    await page.selectOption('#f-def-spacing', '2');

    // Add a multiple-choice Check-In question
    await page.evaluate(() => {
      const panel = document.getElementById('check-questions-panel');
      if (panel) panel.open = true;
    });
    await page.fill('#chk-prompt', 'Where did the fox hide?');
    await page.selectOption('#chk-kind', 'mc');
    await page.fill('#chk-choices', 'In a cave\nUnder the tall oak tree\nBy the river');
    await page.selectOption('#chk-answer', '1');
    await page.click('#chk-add');
    await page.waitForFunction(() => document.querySelectorAll('#chk-list li').length === 1);

    // Save a local preset and verify persistence in localStorage + select
    await page.fill('#ra-preset-name', 'Wave 6 ELA Setup');
    await page.click('#ra-preset-save');
    await page.waitForFunction(() => {
      const sel = document.getElementById('ra-preset-select');
      return !!(sel && Array.from(sel.options).some((o) => /Wave 6 ELA Setup/.test(o.textContent || '')));
    });
    const raPresetStored = await page.evaluate(() => {
      const raw = localStorage.getItem('alloflow-ra-presets/1');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) && parsed.some((p) => p && p.name === 'Wave 6 ELA Setup');
    });
    assert.equal(raPresetStored, true, 'Read-Along preset should persist in localStorage');

    // Allow the debounced maker rebuild to finish with POS + defaultTools + Check-In question
    await page.waitForTimeout(700);
    await page.waitForSelector('#save:not([hidden])', { timeout: 30000 });

    // Verify standalone worksheet includes Check-In question + Teacher Answer Key
    const [raWsDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-worksheet')
    ]);
    const raWsHtml = await readDownloadedText(raWsDl);
    assert.ok(raWsHtml.includes("script-src 'none'"), 'H1 Read-Along worksheet must enforce script-src none');
    assert.ok(raWsHtml.includes('Where did the fox hide?'), 'H1 Read-Along worksheet must include Check-In question');
    assert.ok(raWsHtml.includes('data-answer-key="true"'), 'H1 Read-Along worksheet must include Teacher Answer Key');
    assert.ok(raWsHtml.includes('Under the tall oak tree'), 'H1 Read-Along worksheet answer key must include correct choice');

    // Capture the built interactive Read-Along HTML file via #save download
    const [raSaveDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#save')
    ]);
    assert.ok(raSaveDl.suggestedFilename().endsWith('.html'), 'H1 built Read-Along file should end with .html');
    const raBuiltHtml = await readDownloadedText(raSaveDl);
    assert.ok(raBuiltHtml.includes("connect-src 'none'"), 'H1 built Read-Along player must enforce connect-src none');
    assert.ok(raBuiltHtml.includes('"defaultTools"'), 'H1 built Read-Along HTML should embed lesson.defaultTools');

    // Open the built offline HTML player in a real Chromium page
    const playerRoute = '/__e2e/built-read-along-w6.html';
    dynamicRoutes.set(playerRoute, raBuiltHtml);
    const playerPage = await context.newPage();
    playerPage.setDefaultTimeout(20000);
    const playerGuards = attachGuards(playerPage, origin);
    let h1Summary = null;
    try {
      await playerPage.goto(origin + playerRoute, { waitUntil: 'load', timeout: 30000 });

      // Verify lesson.defaultTools auto-activates Reading Ruler (focus=3) and Extra wide (spacing=2)
      const initialTools = await playerPage.evaluate(() => {
        const root = document.documentElement;
        const ruler = document.querySelector('[data-reading-ruler]');
        const focusBtn = document.querySelector('[data-tool="focus-3"]');
        const rulerControls = document.querySelector('[data-ruler-controls]');
        return {
          focus3Pressed: focusBtn ? focusBtn.getAttribute('aria-pressed') : null,
          spacing: root.getAttribute('data-lt-spacing'),
          rulerExists: !!ruler,
          rulerHidden: ruler ? ruler.hidden : true,
          rulerControlsHidden: rulerControls ? rulerControls.hidden : true
        };
      });
      assert.equal(initialTools.focus3Pressed, 'true', 'lesson.defaultTools should auto-activate Reading Ruler (focus=3)');
      assert.equal(initialTools.spacing, '2', 'lesson.defaultTools should auto-activate Extra wide (spacing=2)');
      assert.equal(initialTools.rulerExists, true, '[data-reading-ruler] element must exist');
      assert.equal(initialTools.rulerHidden, false, '[data-reading-ruler] must be visible when focus=3');
      assert.equal(initialTools.rulerControlsHidden, false, '[data-ruler-controls] must be visible when focus=3');

      // Move pointer and verify [data-reading-ruler] repositions cleanly
      await playerPage.mouse.move(320, 220);
      await playerPage.waitForTimeout(80);
      const top1 = await playerPage.evaluate(() => {
        const r = document.querySelector('[data-reading-ruler]');
        return r ? parseFloat(r.style.top || '0') : 0;
      });
      await playerPage.mouse.move(320, 460);
      await playerPage.waitForTimeout(80);
      const top2 = await playerPage.evaluate(() => {
        const r = document.querySelector('[data-reading-ruler]');
        return r ? parseFloat(r.style.top || '0') : 0;
      });
      assert.ok(Math.abs(top2 - top1) >= 150, `Reading Ruler should follow pointer cleanly (top1=${top1}, top2=${top2})`);

      // Enter the Read-Along passage screen from the start screen
      const nameIn = playerPage.locator('#learner-name');
      if (await nameIn.isVisible()) {
        await nameIn.fill('Sam');
      }
      const startBtn = playerPage.locator('button.primary').first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
      }
      await playerPage.waitForSelector('button[data-read-along-pos]', { timeout: 15000 });
      await playerPage.waitForTimeout(200);

      // Ensure POS button is clickable (open any enclosing <details> if collapsed) and toggle POS on
      await playerPage.evaluate(() => {
        const btn = document.querySelector('button[data-read-along-pos]');
        let cur = btn;
        while (cur) {
          if (cur.tagName === 'DETAILS') cur.open = true;
          cur = cur.parentElement;
        }
      });
      await playerPage.locator('button[data-read-along-pos]').click();
      await playerPage.waitForSelector('[data-read-along-pos-legend]:not([hidden])');

      // Verify Fitzgerald Key + pill styling + 7-class POS + student-overridable selects
      const posCheck = await playerPage.evaluate(() => {
        const box = document.querySelector('[data-read-along-text]');
        const legend = document.querySelector('[data-read-along-pos-legend]');
        const schemeSel = legend ? legend.querySelector('select[data-pos-scheme]') : null;
        const styleSel = legend ? legend.querySelector('select[data-pos-style]') : null;
        const posSpans = Array.from(document.querySelectorAll('[data-pos]'));
        const classesPresent = Array.from(new Set(posSpans.map((s) => s.getAttribute('data-pos'))));
        return {
          hasFitzgeraldBox: !!(box && box.getAttribute('data-pos-scheme') === 'fitzgerald'),
          boxStyle: box ? box.getAttribute('data-pos-style') : '',
          schemeVal: schemeSel ? schemeSel.value : '',
          styleVal: styleSel ? styleSel.value : '',
          classesPresent
        };
      });
      assert.equal(posCheck.hasFitzgeraldBox, true, 'POS passage box should render with data-pos-scheme="fitzgerald"');
      assert.equal(posCheck.boxStyle, 'pill', 'POS passage box should render with data-pos-style="pill"');
      assert.equal(posCheck.schemeVal, 'fitzgerald', 'Student [data-pos-scheme] select should start on fitzgerald');
      assert.equal(posCheck.styleVal, 'pill', 'Student [data-pos-style] select should start on pill');
      assert.ok(
        posCheck.classesPresent.some((c) => ['p', 'r', 'c'].includes(c)),
        `Expected 7-class extended POS tag (p/r/c) in passage, got: ${posCheck.classesPresent.join(',')}`
      );

      // Verify student can override POS scheme and style live
      await playerPage.selectOption('[data-read-along-pos-legend] select[data-pos-scheme]', 'montessori');
      await playerPage.selectOption('[data-read-along-pos-legend] select[data-pos-style]', 'tags');
      const overriddenPos = await playerPage.evaluate(() => {
        const box = document.querySelector('[data-read-along-text]');
        return {
          hasMontessori: !!(box && box.getAttribute('data-pos-scheme') === 'montessori'),
          style: box ? box.getAttribute('data-pos-style') : '',
          tagsOn: box ? box.getAttribute('data-pos-tags') : ''
        };
      });
      assert.equal(overriddenPos.hasMontessori, true, 'Student override to montessori scheme should apply live');
      assert.equal(overriddenPos.style, 'tags', 'Student override to tags style should apply live');
      assert.equal(overriddenPos.tagsOn, '1', 'Tags style should set data-pos-tags="1"');

      // Verify [data-read-along-checks] renders the Check-In question and right choice shows positive feedback
      await playerPage.waitForSelector('[data-read-along-checks]');
      const checksText = await playerPage.locator('[data-read-along-checks]').innerText();
      assert.ok(checksText.includes('Where did the fox hide?'), '[data-read-along-checks] should render the question prompt');
      const rightChoiceBtn = playerPage.locator('[data-read-along-checks] .ra-chk-opts button', { hasText: 'Under the tall oak tree' });
      await rightChoiceBtn.click();
      await playerPage.waitForSelector('[data-read-along-checks] .ra-chk-fb[data-ok="1"]');
      const fbText = await playerPage.locator('[data-read-along-checks] .ra-chk-fb[data-ok="1"]').innerText();
      assert.ok(/nice work/i.test(fbText), `Expected positive feedback for right choice, got: ${fbText}`);

      playerGuards.assertClean('Scenario H1 (Built Read-Along Player)');
      h1Summary = {
        rulerDeltaPx: Math.round(top2 - top1),
        posClasses: posCheck.classesPresent.length,
        raBuiltBytes: raBuiltHtml.length,
        feedback: fbText.trim()
      };
    } finally {
      dynamicRoutes.delete(playerRoute);
      await playerPage.close();
    }

    // ------------------------------------------------------------------
    // H2: packets-math-practice.html Presets + Worksheet + 4-File Bundle (.zip)
    // ------------------------------------------------------------------
    await page.goto(origin + '/packets-math-practice.html', { waitUntil: 'load', timeout: 30000 });
    await page.waitForSelector('#step-1:not([hidden])');

    // Select a kind and fact set on Step 1 before saving the local teacher preset
    await page.locator('#kinds label').first().click();
    await page.waitForTimeout(200);
    if (await page.locator('#sets label').count()) {
      await page.locator('#sets label').first().click();
    }

    // Save a local teacher preset on Step 1
    await page.fill('#math-preset-name', 'Wave 6 Math 7s');
    await page.click('#math-preset-save');
    await page.waitForFunction(() => {
      const sel = document.getElementById('math-preset-select');
      return !!(sel && Array.from(sel.options).some((o) => /Wave 6 Math 7s/.test(o.textContent || '')));
    });

    // Apply the saved preset via #math-preset-select
    const presetVal = await page.evaluate(() => {
      const sel = document.getElementById('math-preset-select');
      const opt = Array.from(sel.options).find((o) => /Wave 6 Math 7s/.test(o.textContent || ''));
      return opt ? opt.value : '';
    });
    assert.ok(presetVal, 'Saved math preset option should have a value');
    await page.selectOption('#math-preset-select', '');
    await page.selectOption('#math-preset-select', presetVal);
    await page.waitForFunction(() => {
      const st = document.getElementById('math-preset-status');
      return !!(st && /loaded|applied|saved/i.test(st.textContent || ''));
    });

    // Advance to Step 2, select Cover, copy, compare, and advance to Step 3
    await page.click('#next-1');
    await page.waitForSelector('#step-2:not([hidden])');
    await page.locator('#methods input[name="method"][value="ccc"]').check();
    await page.click('#next-2');
    await page.waitForSelector('#step-3:not([hidden])');
    await page.waitForSelector('#download-worksheet:not([hidden])', { timeout: 60000 });
    await page.waitForSelector('#download-bundle:not([hidden])', { timeout: 60000 });

    // Download monochrome standalone Math Worksheet
    const [mathWsDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-worksheet')
    ]);
    assert.ok(mathWsDl.suggestedFilename().endsWith('.html'), 'Math worksheet should end with .html');
    const mathWsHtml = await readDownloadedText(mathWsDl);
    assert.ok(mathWsHtml.startsWith('<!doctype html>'), 'Math worksheet should be valid HTML');
    assert.ok(mathWsHtml.includes("script-src 'none'"), 'Math worksheet must enforce script-src none');
    assert.ok(mathWsHtml.includes('Teacher Answer Key'), 'Math worksheet must include Teacher Answer Key');
    assert.equal(/https:\/\//i.test(mathWsHtml), false, 'Math worksheet must contain zero https:// URLs');

    // Download 4-file Math Classroom Bundle (.zip)
    const [mathZipDl] = await Promise.all([
      page.waitForEvent('download'),
      page.click('#download-bundle')
    ]);
    assert.ok(mathZipDl.suggestedFilename().endsWith('.zip'), 'Math bundle should end with .zip');
    const mathZipBytes = await readDownloadedBytes(mathZipDl);
    assert.deepEqual(Array.from(mathZipBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04], 'Math bundle must start with PK\\x03\\x04');
    const mathEntries = ZIP.readZip(mathZipBytes);
    assert.deepEqual(
      mathEntries.map((e) => e.name),
      [
        '01-Interactive-Math-Practice.html',
        '02-Worksheet-Scaffolded.html',
        '03-Worksheet-Independent.html',
        '04-Teacher-Answer-Key.html'
      ],
      'Math bundle must contain all 4 expected files'
    );
    assert.equal(mathEntries.every((e) => e.crcOk), true, 'Math bundle ZIP CRCs must all be valid');
    const mathInteractive = dec.decode(mathEntries[0].bytes);
    const mathScaff = dec.decode(mathEntries[1].bytes);
    const mathInd = dec.decode(mathEntries[2].bytes);
    const mathKey = dec.decode(mathEntries[3].bytes);
    assert.ok(mathInteractive.includes("connect-src 'none'"), 'Math 01 interactive packet must enforce connect-src none');
    assert.ok(mathScaff.includes("script-src 'none'"), 'Math 02 scaffolded worksheet must enforce script-src none');
    assert.ok(mathInd.includes("script-src 'none'"), 'Math 03 independent worksheet must enforce script-src none');
    assert.ok(mathKey.includes("script-src 'none'") && mathKey.includes('Teacher Answer Key'), 'Math 04 must enforce script-src none and include Teacher Answer Key');

    guards.assertClean('Scenario H (Wave 6 Read-Along + Math Practice)');
    return {
      h1: h1Summary,
      h2: {
        mathWsBytes: mathWsHtml.length,
        mathBundleFiles: mathEntries.length
      }
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const { chromium } = require('playwright');
  const t0 = Date.now();
  const dynamicRoutes = new Map();
  const server = await startStaticServer(dynamicRoutes);
  const origin = 'http://127.0.0.1:' + server.address().port;
  let browser = null;

  try {
    browser = await chromium.launch();
    const results = [];

    const a = await runScenarioA(browser, origin);
    results.push({ name: 'A. packets-make.html Word Sounds Worksheet + Presets + Download', detail: JSON.stringify(a) });
    console.log('PASS  A. packets-make.html Word Sounds Worksheet + Presets + Download ->', JSON.stringify(a));

    const b = await runScenarioB(browser, origin);
    results.push({ name: 'B. packets-vocab.html Vocabulary Practice Worksheet (Parts 1-3) + Presets + Download', detail: JSON.stringify(b) });
    console.log('PASS  B. packets-vocab.html Vocabulary Practice Worksheet ->', JSON.stringify(b));

    const c = await runScenarioC(browser, origin);
    results.push({ name: 'C. packets-read-along.html#import-draft IDB Handoff + Voice Clip + Offline Picker', detail: JSON.stringify(c) });
    console.log('PASS  C. packets-read-along.html#import-draft IDB Handoff + Picker ->', JSON.stringify(c));

    const d = await runScenarioD(browser, origin);
    results.push({ name: 'D. speech_setup_module.js alignSegmentsToSentences + DictationSourceStudio', detail: JSON.stringify(d) });
    console.log('PASS  D. speech_setup_module.js + DictationSourceStudio ->', JSON.stringify(d));

    const e = await runScenarioE(browser, origin);
    results.push({ name: 'E. packets-vocab.html#import-draft IDB Handoff + Custom Meanings/Picture + Worksheet', detail: JSON.stringify(e) });
    console.log('PASS  E. packets-vocab.html#import-draft IDB Handoff + Worksheet ->', JSON.stringify(e));

    const f = await runScenarioF(browser, origin);
    results.push({ name: 'F. packets-make.html#import-draft IDB Handoff + Activities/Picture + Worksheet', detail: JSON.stringify(f) });
    console.log('PASS  F. packets-make.html#import-draft IDB Handoff + Worksheet ->', JSON.stringify(f));

    const g = await runScenarioG(browser, origin);
    results.push({ name: 'G. Wave 5 Read-Along Worksheet + Classroom Bundle (.zip) across all 3 makers', detail: JSON.stringify(g) });
    console.log('PASS  G. Wave 5 Read-Along Worksheet + Classroom Bundles (.zip) ->', JSON.stringify(g));

    const h = await runScenarioH(browser, origin, dynamicRoutes);
    results.push({ name: 'H. Wave 6 Read-Along Player (Ruler/POS/Checks) + Math Presets/Worksheet/Bundle', detail: JSON.stringify(h) });
    console.log('PASS  H. Wave 6 Read-Along Player + Math Practice ->', JSON.stringify(h));

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\nALL ${results.length}/8 Wave 1-6 real-browser Chromium E2E scenarios PASSED in ${elapsed}s (0 pageerrors, 0 unexpected network requests).`);
  } finally {
    if (browser) {
      await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
    }
    if (typeof server.closeAllConnections === 'function') server.closeAllConnections();
    server.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('FAIL  Wave 1-3 E2E:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  });
}

module.exports = { main, runScenarioH, startStaticServer };
