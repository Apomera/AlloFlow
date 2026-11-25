import { afterAll, describe, expect, it } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { TextDecoder, TextEncoder } from 'node:util';
import { JSDOM } from 'jsdom';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const parse = (file) => new JSDOM(read(file)).window.document;
const squash = (text) => String(text || '').replace(/\s+/g, ' ').trim();
const tick = () => new Promise((r) => setTimeout(r, 0));
const waitFor = async (fn, what) => {
  for (let i = 0; i < 400; i++) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('Timed out waiting for ' + what);
};

const opened = [];
afterAll(() => {
  opened.forEach((w) => { try { w.close(); } catch (_) {} });
});

function fakeIndexedDB() {
  const databases = new Map();
  return {
    open(name, version) {
      const req = {};
      queueMicrotask(() => {
        let db = databases.get(name);
        const fresh = !db;
        if (fresh) { db = { stores: new Map(), version }; databases.set(name, db); }
        const handle = {
          objectStoreNames: { contains: (s) => db.stores.has(s) },
          createObjectStore(s, opts) { db.stores.set(s, { keyPath: opts.keyPath, rows: new Map() }); },
          close() {},
          transaction(names, mode) {
            const list = Array.isArray(names) ? names : [names];
            const working = new Map(list.map((s) => [s, new Map(db.stores.get(s).rows)]));
            const tx = { mode: mode || 'readonly', error: null, pending: 0, over: false };
            const finish = () => queueMicrotask(() => {
              if (tx.over || tx.pending) return;
              tx.over = true;
              for (const [s, rows] of working) db.stores.get(s).rows = rows;
              if (tx.oncomplete) tx.oncomplete({ target: tx });
            });
            const ask = (run) => {
              const one = {};
              tx.pending++;
              queueMicrotask(() => {
                if (tx.over) return;
                try { one.result = run(); } catch (err) {
                  tx.error = err; tx.over = true;
                  if (one.onerror) one.onerror({ target: one, preventDefault() {} });
                  if (tx.onabort) tx.onabort({ target: tx, preventDefault() {} });
                  return;
                }
                if (one.onsuccess) one.onsuccess({ target: one });
                tx.pending--;
                finish();
              });
              return one;
            };
            tx.objectStore = (s) => {
              const rows = working.get(s), keyPath = db.stores.get(s).keyPath;
              return {
                get: (k) => ask(() => (rows.has(k) ? JSON.parse(rows.get(k)) : undefined)),
                getAll: () => ask(() => [...rows.keys()].sort().map((k) => JSON.parse(rows.get(k)))),
                count: () => ask(() => rows.size),
                put: (v) => ask(() => { rows.set(v[keyPath], JSON.stringify(v)); return v[keyPath]; }),
                delete: (k) => ask(() => { rows.delete(k); }),
                clear: () => ask(() => { rows.clear(); }),
              };
            };
            finish();
            return tx;
          },
        };
        req.result = handle;
        if (fresh && req.onupgradeneeded) req.onupgradeneeded({ target: req });
        if (req.onsuccess) req.onsuccess({ target: req });
      });
      return req;
    },
  };
}

function makeDropEvent(w, file) {
  const ev = new w.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { files: [file], types: ['Files'] } });
  return ev;
}

describe('Wave 1-3: shared starter word sets and present-export relief', () => {
  it('exports 7 offline CSP-safe K-12 starter word sets and keeps packets-present-export.js under 55 KB', () => {
    const starters = require('../packets_word_starters.js');
    expect(Array.isArray(starters.LIST)).toBe(true);
    expect(starters.LIST).toHaveLength(7);
    expect(starters.list()).toHaveLength(7);
    for (const s of starters.LIST) {
      expect(s.id).toBeTruthy();
      expect(s.title).toBeTruthy();
      expect(s.words.length).toBeGreaterThanOrEqual(6);
      expect(starters.get(s.id)).toEqual(s);
    }
    const starterSrc = read('packets_word_starters.js');
    expect(starterSrc).not.toMatch(/https?:\/\/|fetch\s*\(|innerHTML|eval\s*\(|new Function/);

    const peBytes = statSync('packets-present-export.js').size;
    expect(peBytes).toBeLessThan(55000);
    const peHtml = parse('packets-present-export.html');
    const scripts = [...peHtml.querySelectorAll('script[src]')].map((s) => s.getAttribute('src'));
    expect(scripts.indexOf('packets_word_starters.js')).toBeGreaterThanOrEqual(0);
    expect(scripts.indexOf('packets_word_starters.js')).toBeLessThan(scripts.indexOf('packets-present-export.js'));
    expect(peHtml.querySelector('#about-page .about-body')).toBeTruthy();
    expect(peHtml.getElementById('pe-clear-local').textContent.trim()).toBe('Forget my choices');
    expect(read('packets-present-export.js')).toContain('function svgRefusalFallback');
  });

  it('loads starter word sets in Vocabulary Maker Step 1', () => {
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-vocab.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    const sel = d.getElementById('f-starter');
    expect(sel).toBeTruthy();
    expect(d.getElementById('starter-row').hidden).toBe(false);
    expect(sel.options.length).toBe(8);
    sel.value = 'science-math';
    sel.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.getElementById('f-words').value).toContain('habitat');
    expect(d.getElementById('f-words').value).toContain('fraction');
    expect(sel.value).toBe('');
  });
});

describe('Wave 1-3: shared .top-menu switcher across all 6 makers', () => {
  const MAKERS = [
    ['packets-make.html', 'Word Sounds'],
    ['packets-vocab.html', 'Vocabulary'],
    ['packets-math-practice.html', 'Math Fact Practice'],
    ['packets-check.html', 'Math Check'],
    ['packets-read-along.html', 'Read-Along'],
    ['packets-symbol-runner.html', 'Symbol Runner'],
  ];

  it('renders the pure-HTML Switch maker menu in .top-row with aria-current="page" on the current maker', () => {
    for (const [file, label] of MAKERS) {
      const doc = parse(file);
      const menu = doc.querySelector('.top-row details.top-menu');
      expect(menu, file).toBeTruthy();
      expect(squash(menu.querySelector('summary').textContent), file).toBe('Switch maker');
      const nav = menu.querySelector('nav[aria-label="Other Packets tools"]');
      expect(nav, file).toBeTruthy();
      const links = [...nav.querySelectorAll('a[href]')];
      // 2026-11-24: Switch maker expanded from 8 to 18 tools after adding the 10 zero-AI expansion makers/libraries.
      expect(links.length, file).toBe(18);
      const current = links.filter((a) => a.getAttribute('aria-current') === 'page');
      expect(current.map((a) => [a.getAttribute('href'), a.textContent.trim()]), file).toEqual([[file, label]]);
    }
    // Check & Math Practice file counts (Wave 42: packets-check.html adds packets_docx.js -> 16; Math Practice lazy-loads -> 13).
    const checkDoc = parse('packets-check.html');
    expect(1 + checkDoc.querySelectorAll('link').length + checkDoc.querySelectorAll('script[src]').length).toBe(16);
    const mpDoc = parse('packets-math-practice.html');
    expect(1 + mpDoc.querySelectorAll('link').length + mpDoc.querySelectorAll('script[src]').length).toBe(13);
  });
});

describe('Wave 1-3: Word Sounds Maker upgrades', () => {
  function openMake() {
    const dom = new JSDOM(read('packets-make.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-make.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:https://packets.test/1';
    w.URL.revokeObjectURL = () => {};
    w.fetch = async (url) => {
      const p = String(url).replace(/^https?:\/\/[^/]+\//, '');
      const text = read(p);
      return { ok: true, status: 200, text: async () => text, json: async () => JSON.parse(text) };
    };
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    return { w, d, $: (id) => d.getElementById(id) };
  }

  it('removes orphaned .fields around #pick-top and adds mobile CSS rules for shape pills and group rows', () => {
    const doc = parse('packets-make.html');
    expect(doc.getElementById('pick-top').parentElement.classList.contains('fields')).toBe(false);
    const css = read('packets-make.css');
    expect(css).toMatch(/@media \(max-width: 29\.99rem\)[\s\S]*\.group-row \.group-fields \{ grid-template-columns: 1fr; \}/);
    expect(css).toMatch(/@media \(max-width: 29\.99rem\)[\s\S]*#f-shapes\.pill-list \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  });

  it('supports 3 quick recipes, multi-stage hiding #f-stage + clear counters, own-mode Use all N words, voice hash, and Symbol Runner link', async () => {
    const { w, d, $ } = openMake();
    await waitFor(() => !$('step-1').hidden && $('loading').hidden, 'Word Sounds maker boot');

    // 3 quick recipes inside #quick
    const recipes = [...d.querySelectorAll('#quick button[data-recipe]')];
    expect(recipes.map((b) => b.getAttribute('data-recipe'))).toEqual(['blending-cvc', 'digraphs-blends', 'spelling-practice']);
    recipes[0].click();
    expect(recipes[0].getAttribute('aria-pressed')).toBe('true');
    expect($('quick-line').textContent).toContain('CVC');
    $('next-1').click();
    expect($('step-2').hidden).toBe(false);

    // Multi-stage hides #stage-single-wrap & disables #f-stage while keeping #f-stage in DOM; counter + clear work
    const multi = $('f-multi-stage');
    multi.checked = true;
    multi.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect($('stage-single-wrap').hidden).toBe(true);
    expect($('f-stage').disabled).toBe(true);
    expect($('stage-multi-field').hidden).toBe(false);
    const stageBoxes = [...d.querySelectorAll('#stage-pills input[type="checkbox"]')];
    stageBoxes[0].checked = true;
    stageBoxes[0].dispatchEvent(new w.Event('change', { bubbles: true }));
    stageBoxes[1].checked = true;
    stageBoxes[1].dispatchEvent(new w.Event('change', { bubbles: true }));
    expect($('stage-multi-count').textContent).toBe('2 selected');
    expect($('stage-multi-meta').hidden).toBe(false);
    $('stage-multi-clear').click();
    expect($('stage-multi-meta').hidden).toBe(true);

    // Shape pills counter + clear
    const shapeBoxes = [...d.querySelectorAll('#f-shapes input[type="checkbox"]')];
    shapeBoxes[0].checked = true;
    shapeBoxes[0].dispatchEvent(new w.Event('change', { bubbles: true }));
    expect($('shape-count').textContent).toBe('1 selected');
    expect($('shape-meta').hidden).toBe(false);
    $('shape-clear').click();
    expect($('shape-meta').hidden).toBe(true);

    // Own mode: Use all N words button + dynamic voice #words= link
    const ownRadio = d.querySelector('input[name="mode"][value="own"]');
    ownRadio.checked = true;
    ownRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    $('f-own').value = 'cat, dog, sun, map, hat, bed, pig, top, cup, bus, red, pen, fan, box, fox, jam';
    $('f-own').dispatchEvent(new w.Event('input', { bubbles: true }));
    await waitFor(() => !$('own-limit-note').hidden, 'own-limit-note');
    expect($('own-use-all').textContent).toMatch(/Use all \d+ words/);
    $('own-use-all').click();
    expect($('own-limit-note').hidden).toBe(true);

    // Unrecorded word wires #own-voice-link dynamically without encodeURIComponent
    $('f-own').value = 'cat, zylox';
    $('f-own').dispatchEvent(new w.Event('input', { bubbles: true }));
    await waitFor(() => $('own-voice-link').getAttribute('href').includes('#words='), 'own-voice-link hash');
    expect($('own-voice-link').getAttribute('href')).toBe('packets-voice.html#words=zylox');

    // Step 3 Symbol Runner link inside #paper
    const pickRadio = d.querySelector('input[name="mode"][value="pick"]');
    pickRadio.checked = true;
    pickRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    const srLink = $('open-symbol-runner');
    expect(srLink).toBeTruthy();
    expect(srLink.closest('#paper')).toBeTruthy();
  });
});

describe('Wave 1-3: Vocabulary Maker upgrades', () => {
  function openVocab() {
    const dom = new JSDOM(read('packets-vocab.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-vocab.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    const revoked = [];
    const previewStops = [];
    const savedZips = [];
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.Blob = class { constructor(parts, opts) { this.parts = parts; this.body = parts.map((p) => (typeof p === 'string' ? p : Buffer.from(p).toString('latin1'))).join(''); this.type = opts && opts.type; this.size = this.body.length; } };
    w.URL.createObjectURL = (blob) => { if (blob && blob.type === 'application/zip') savedZips.push(blob); return 'blob:https://packets.test/' + (revoked.length + 1); };
    w.URL.revokeObjectURL = (u) => revoked.push(u);
    w.HTMLAnchorElement.prototype.click = function () {};
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    const origHost = w.AlloPacketHandoff.hostPreview;
    w.AlloPacketHandoff.hostPreview = (opts) => {
      const s = origHost ? origHost(opts) : {};
      return {
        update() {},
        stop() { previewStops.push('stop'); if (s && s.stop) s.stop(); },
      };
    };
    return { w, d, $: (id) => d.getElementById(id), revoked, previewStops, savedZips };
  }

  it('has 3-button .actions-file, Paper & screen after #summary-list, .more live summary, pagehide cleanup, reopen close/drop, and batch orderSeed rotation', async () => {
    const { w, d, $, revoked, previewStops, savedZips } = openVocab();
    expect([...d.querySelectorAll('#step-3 .actions-file button, #step-3 .actions-file a')].map((n) => n.id)).toEqual(['back-3', 'try', 'save']);
    const listIdx = [...$('step-3').children].indexOf($('summary-list'));
    const paperIdx = [...$('step-3').children].indexOf($('paper'));
    expect(paperIdx).toBeGreaterThan(listIdx);
    expect($('paper').contains($('print-cards'))).toBe(true);
    expect($('paper').contains($('open-present-export'))).toBe(true);
    expect($('paper').contains($('open-symbol-runner'))).toBe(true);
    expect($('more').classList.contains('more')).toBe(true);
    expect($('more-now').textContent.length).toBeGreaterThan(5);

    // Load starter set (verified in Step 1), then use bank fixture words -> Step 2 -> Step 3
    $('f-starter').value = 'science-math';
    $('f-starter').dispatchEvent(new w.Event('change', { bubbles: true }));
    expect($('f-words').value).toContain('habitat');
    $('f-words').value = 'habitat, predator, prey, cell, bat, adapt, camouflage';
    $('f-words').dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 320));
    $('next-1').click();
    await waitFor(() => !$('step-2').hidden, 'vocab step 2');
    $('next-2').click();
    await waitFor(() => !$('summary').hidden, 'vocab step 3 built');
    expect($('open-symbol-runner').getAttribute('href')).toMatch(/^packets-symbol-runner\.html#symbols=/);

    // Batch rotate checkbox appears for 2+ students and produces distinct orderSeed per student
    $('f-batch-names').value = 'BlueHeron7\nRedFox4\nOakLeaf2';
    $('f-batch-names').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect($('batch-rotate-wrap').hidden).toBe(false);
    $('f-batch-rotate').checked = true;
    $('f-batch-rotate').dispatchEvent(new w.Event('change', { bubbles: true }));
    $('batch-make').click();
    await waitFor(() => savedZips.length === 1, 'vocab zip built');
    const rawZip = Buffer.concat(savedZips[0].parts.map((p) => Buffer.from(p))).toString('utf8');
    const matches = [...rawZip.matchAll(/var lesson=(\{[\s\S]*?\});\nvar labels=/g)].map((m) => JSON.parse(m[1]));
    expect(matches.length).toBe(3);
    const orders = matches.map((les) => (Array.isArray(les.sequence) ? les.sequence.join(',') : ''));
    expect(orders.every(Boolean)).toBe(true);
    expect(new Set(orders).size).toBeGreaterThan(1);

    // Reopen close + drop
    const sampleHtml = d.getElementById('try').getAttribute('href');
    expect(sampleHtml).toContain('packets-try.html#blob:');
    const dropped = { name: 'bad.html', size: 100, arrayBuffer: async () => new TextEncoder().encode('<html>not a packet</html>').buffer };
    d.querySelector('main').dispatchEvent(makeDropEvent(w, dropped));
    await waitFor(() => !$('reopen-note').hidden, 'vocab drop reopen note');
    $('reopen-close').click();
    expect($('reopen-note').hidden).toBe(true);

    // pagehide stops preview & revokes blob URL
    w.dispatchEvent(new w.Event('pagehide'));
    expect(revoked.length).toBeGreaterThan(0);
    expect(previewStops.length).toBeGreaterThan(0);
  });
});

describe('Wave 1-3: Read-Along Maker upgrades', () => {
  it('fixes all undefined CSS tokens, places #reopen above Step 1, folds Step 4 supports, groups 25 voices, and wires #from=read-along', async () => {
    const css = read('packets-read-along.css');
    expect(css).not.toMatch(/var\(--soft\)|var\(--ok\)|var\(--warn\)/);

    const doc = parse('packets-read-along.html');
    const wrapChildren = [...doc.querySelector('main .wrap').children];
    const firstSheet = doc.querySelector('main .wrap section.sheet');
    expect(wrapChildren.indexOf(doc.getElementById('reopen'))).toBeLessThan(wrapChildren.indexOf(firstSheet));
    expect(doc.getElementById('reopen-close')).toBeTruthy();
    expect(doc.querySelector('a[href="packets-pictures.html#from=read-along"]')).toBeTruthy();

    // 3 optgroups with exact 25 voices (4 + 16 + 5)
    const groups = [...doc.querySelectorAll('#f-voice optgroup')];
    expect(groups.map((g) => [g.getAttribute('label'), g.querySelectorAll('option').length])).toEqual([
      ['Recommended', 4],
      ['More US voices', 16],
      ['More British voices', 5],
    ]);
    expect(doc.getElementById('hear-sample').getAttribute('type')).toBe('button');

    // Step 4 save-first layout before #more-supports
    const step4 = doc.querySelector('section[aria-labelledby="file-title"]');
    const s4 = [...step4.children];
    expect(s4.indexOf(step4.querySelector('.actions-file'))).toBeLessThan(s4.indexOf(doc.getElementById('more-supports')));
    expect(doc.getElementById('more-supports').classList.contains('more')).toBe(true);

    // Live JSDOM test: hostPreview describe, auto vs custom split buttons, .is-on support cards, #hear-sample, reopen close & drop
    const dom = new JSDOM(read('packets-read-along.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-read-along.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:https://packets.test/ra1';
    w.URL.revokeObjectURL = () => {};
    let hostedOpts = null;
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    w.AlloPacketHandoff.hostPreview = (opts) => { hostedOpts = opts; return { update() {}, stop() {} }; };

    d.getElementById('f-text').value = 'The red fox jumped over the log. Then the fox ran down the hill. Next it rested by a tree.';
    d.getElementById('f-text').dispatchEvent(new w.Event('input', { bubbles: true }));
    await waitFor(() => d.querySelectorAll('#line-rows [data-split-page]').length > 0, 'ra sentence rows');
    // Auto mode hides split button wrappers
    const autoSplits = [...d.querySelectorAll('#line-rows [data-split-page]')];
    expect(autoSplits.length).toBeGreaterThan(0);
    expect(autoSplits.every((b) => b.closest('li').hidden === true)).toBe(true);
    // Custom mode reveals split button wrappers
    const pageMode = d.getElementById('f-page-mode');
    pageMode.value = 'custom';
    pageMode.dispatchEvent(new w.Event('change', { bubbles: true }));
    const customSplits = [...d.querySelectorAll('#line-rows [data-split-page]')];
    expect(customSplits.every((b) => b.closest('li').hidden === false)).toBe(true);

    // Support cards .is-on & live .more-now summary
    const pos = d.getElementById('f-pos');
    expect(pos.closest('.ra-support-card').classList.contains('is-on')).toBe(false);
    pos.checked = true;
    pos.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(pos.closest('.ra-support-card').classList.contains('is-on')).toBe(true);
    expect(d.getElementById('more-supports-now').textContent).toContain('Parts of speech');

    // Step 4 build passes describe callback to hostPreview
    await waitFor(() => !!hostedOpts, 'read-along hostPreview');
    expect(typeof hostedOpts.describe).toBe('function');
    const items = hostedOpts.describe({ blocks: [{ activity: 'read_along', items: [{ id: 'p1', lines: [{ text: 'The red fox jumped over the log.' }] }] }] });
    expect(items[0].label).toMatch(/^Page 1 — The red fox/);

    // Drop reopen & close
    const dropped = { name: 'bad.html', size: 80, arrayBuffer: async () => new TextEncoder().encode('<html>not read-along</html>').buffer };
    d.querySelector('main').dispatchEvent(makeDropEvent(w, dropped));
    await waitFor(() => !d.getElementById('reopen-note').hidden, 'ra reopen note');
    d.getElementById('reopen-close').click();
    expect(d.getElementById('reopen-note').hidden).toBe(true);
  });
});

describe('Wave 1-3: Symbol Runner Maker upgrades', () => {
  it('syncs dynamic title, fixes custom vs preset radio state, passes describe to hostPreview, calls stop() on pagehide, and supports reopen close/drop', async () => {
    expect(read('packets-symbol-runner.css')).toMatch(/@media \(max-width: 480px\)[\s\S]*\.sr-sub\s*\{[\s\S]*margin-left:\s*0\.75rem/);

    const dom = new JSDOM(read('packets-symbol-runner.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-symbol-runner.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:https://packets.test/sr1';
    w.URL.revokeObjectURL = () => {};
    let hostedOpts = null;
    const stopCalls = [];
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    w.AlloPacketHandoff.hostPreview = (opts) => {
      hostedOpts = opts;
      return {
        update() {},
        stop() { stopCalls.push('stop'); },
        close() { throw new Error('close() must not be called'); },
      };
    };

    // Dynamic title synced on load (not hardcoded stale "Symbol Runner Practice")
    expect(d.getElementById('sr-title').value).not.toBe('Symbol Runner Practice');
    expect(d.getElementById('sr-title').value).toContain('practice');
    // Preset hides #sr-custom-field
    expect(d.getElementById('sr-custom-field').hidden).toBe(true);
    // Selecting custom reveals #sr-custom-field
    const customRadio = d.querySelector('input[name="sr-set"][value="custom"]');
    customRadio.checked = true;
    customRadio.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.getElementById('sr-custom-field').hidden).toBe(false);
    d.getElementById('sr-custom').value = 'a, b, c, d';
    d.getElementById('sr-custom').dispatchEvent(new w.Event('input', { bubbles: true }));
    expect(d.getElementById('sr-title').value).toBe('My symbols practice');

    // Step 2 -> Step 3 -> Try it builds and wires describe + stop() on pagehide
    w.open = () => ({ closed: false, location: { href: '' }, close() {} });
    d.getElementById('sr-next-1').click();
    d.getElementById('sr-next-2').click();
    d.getElementById('sr-try-packet').click();
    await waitFor(() => !!hostedOpts, 'symbol runner hostPreview');
    expect(typeof hostedOpts.describe).toBe('function');
    const items = hostedOpts.describe({ blocks: [{ activity: 'symbol_runner', items: [{ id: 's1', word: 'a' }] }] });
    expect(items[0].label).toContain('— a');

    w.dispatchEvent(new w.Event('pagehide'));
    expect(stopCalls).toEqual(['stop']);

    // Drop reopen & close
    const dropped = { name: 'bad.html', size: 80, arrayBuffer: async () => new TextEncoder().encode('<html>not symbol runner</html>').buffer };
    d.querySelector('main').dispatchEvent(makeDropEvent(w, dropped));
    await waitFor(() => !d.getElementById('reopen-note').hidden, 'sr reopen note');
    d.getElementById('reopen-close').click();
    expect(d.getElementById('reopen-note').hidden).toBe(true);
  });
});

describe('Wave 1-3: Math Fact Practice & Math Check upgrades', () => {
  it('Math Fact Practice: non-destructive previewOmit + Restore, pagehide cleanup, Try an example set, reopen close/drop', async () => {
    const dom = new JSDOM(read('packets-math-practice.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-math-practice.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    const revoked = [];
    const previewStops = [];
    let hostedOpts = null;
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    w.Blob = class { constructor(parts, opts) { this.body = parts.join(''); this.type = opts && opts.type; this.size = Buffer.byteLength(this.body); } };
    w.URL.createObjectURL = () => 'blob:https://packets.test/mp1';
    w.URL.revokeObjectURL = (u) => revoked.push(u);
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }
    w.AlloPacketHandoff.hostPreview = (opts) => {
      hostedOpts = opts;
      return { update() {}, stop() { previewStops.push('stop'); } };
    };

    // Try an example set under My own facts
    const ownKind = d.querySelector('input[name="kind"][value="own"]');
    ownKind.checked = true;
    ownKind.dispatchEvent(new w.Event('change', { bubbles: true }));
    expect(d.getElementById('own-example-row').hidden).toBe(false);
    d.getElementById('own-example').click();
    expect(d.getElementById('f-facts').value.trim().length).toBeGreaterThan(10);
    expect(d.getElementById('own-example-row').hidden).toBe(true);

    // Switch to Multiplication -> x7 preset -> Cover, copy, compare -> Step 3
    const mulKind = d.querySelector('input[name="kind"][value="mul"]');
    mulKind.checked = true;
    mulKind.dispatchEvent(new w.Event('change', { bubbles: true }));
    const set7 = d.querySelector('input[name="set"][value="mul-7"]');
    set7.checked = true;
    set7.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();
    const ccc = d.querySelector('input[name="method"][value="ccc"]');
    ccc.checked = true;
    ccc.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-2').click();
    await waitFor(() => !!hostedOpts && !d.getElementById('summary').hidden, 'math practice step 3');
    const beforeSummary = d.getElementById('summary-facts').textContent;

    // Non-destructive Preview remove keeps kind === 'mul' and set === 'mul-7', renders Restore button
    const res = await hostedOpts.onAction({ action: 'remove', index: 0 });
    expect(res.html).toBeTruthy();
    expect(JSON.parse(w.localStorage.getItem('alloflow-packets-math-practice/1')).kind).toBe('mul');
    expect(d.getElementById('preview-note').textContent).toContain('1 fact removed in Preview.');
    expect(d.getElementById('summary-facts').textContent).not.toBe(beforeSummary);

    // Clicking Restore brings back the full set
    d.getElementById('preview-restore').click();
    await waitFor(() => !d.getElementById('preview-note'), 'math practice restored');
    expect(d.getElementById('summary-facts').textContent).toBe(beforeSummary);

    // Drop reopen & close + pagehide cleanup
    const dropped = { name: 'bad.html', size: 80, arrayBuffer: async () => new TextEncoder().encode('<html>not math</html>').buffer };
    d.querySelector('main').dispatchEvent(makeDropEvent(w, dropped));
    await waitFor(() => !d.getElementById('reopen-note').hidden, 'mp reopen note');
    d.getElementById('reopen-close').click();
    expect(d.getElementById('reopen-note').hidden).toBe(true);

    w.dispatchEvent(new w.Event('pagehide'));
    expect(revoked.length).toBeGreaterThan(0);
    expect(previewStops.length).toBeGreaterThan(0);
  });

  it('Math Check: Try an example set under My own problems and reopen close/drop', async () => {
    const dom = new JSDOM(read('packets-check.html'), { runScripts: 'outside-only', pretendToBeVisual: true, url: 'https://packets.test/packets-check.html' });
    const w = dom.window, d = w.document;
    opened.push(w);
    w.TextEncoder = TextEncoder;
    w.TextDecoder = TextDecoder;
    w.HTMLElement.prototype.scrollIntoView = function () {};
    for (const script of d.querySelectorAll('script[src]')) {
      const src = script.getAttribute('src');
      if (src === 'packets_vocab_bank_en.js') w.eval(read('tests/fixtures/packets_vocab_bank_fixture.js'));
      else w.eval(read(src));
    }

    const own = d.querySelector('input[name="check"][value="own"]');
    own.checked = true;
    own.dispatchEvent(new w.Event('change', { bubbles: true }));
    d.getElementById('next-1').click();
    expect(d.getElementById('own-example-row').hidden).toBe(false);
    d.getElementById('own-example').click();
    expect(d.getElementById('f-problems').value.trim().length).toBeGreaterThan(10);
    expect(d.getElementById('own-example-row').hidden).toBe(true);
    expect(d.getElementById('own-line').textContent).toContain('can be used.');

    const dropped = { name: 'bad.html', size: 80, arrayBuffer: async () => new TextEncoder().encode('<html>not check</html>').buffer };
    d.querySelector('main').dispatchEvent(makeDropEvent(w, dropped));
    await waitFor(() => !d.getElementById('reopen-note').hidden, 'check reopen note');
    d.getElementById('reopen-close').click();
    expect(d.getElementById('reopen-note').hidden).toBe(true);
  });
});

describe('Wave 1-3: Hub & Pictures companion upgrades', () => {
  it('updates packets.html meta description and adds a quiet link to packets-pictures.html', () => {
    const doc = parse('packets.html');
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content');
    expect(desc).toMatch(/vocabulary/i);
    expect(desc).toMatch(/Symbol Runner/);
    expect(desc).toMatch(/read-along/i);
    expect(doc.querySelector('a[href="packets-pictures.html"]')).toBeTruthy();
  });

  it('packets-pictures.js handles #from=read-along, auto-runs offline diagram search with 0 fetches, and advances #more= queue', async () => {
    const dom = new JSDOM(read('packets-pictures.html'), {
      runScripts: 'outside-only',
      pretendToBeVisual: true,
      url: 'https://packets.test/packets-pictures.html#word=cat&more=dog,sun&from=read-along',
    });
    const w = dom.window, d = w.document;
    opened.push(w);
    const fetches = [];
    w.fetch = (u) => { fetches.push(String(u)); return Promise.reject(new Error('no network')); };
    w.TextEncoder = TextEncoder;
    Object.defineProperty(w, 'indexedDB', { value: fakeIndexedDB(), configurable: true });
    const fakeSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#3730a3"/></svg>';
    const searchedOffline = [];
    w.AlloWordPictureMatcher = {
      searchSymbolsWithDiagrams(word) {
        searchedOffline.push(word);
        return [{ label: 'Diagram ' + word, word, svg: fakeSvg }];
      },
    };
    for (const file of ['packets-page.js', 'packets_my_words.js', 'packets-pictures.js']) w.eval(read(file));

    await waitFor(() => d.querySelectorAll('#pics-offline li').length === 1, 'offline auto-search for cat');
    expect(fetches).toEqual([]);
    expect(d.getElementById('online-on').checked).toBe(false);
    expect(d.getElementById('back-link').getAttribute('href')).toBe('packets-read-along.html');
    expect(d.getElementById('back-link').textContent).toBe('Back to Make a read-along');
    expect(d.getElementById('queue-note').hidden).toBe(false);
    expect(d.getElementById('queue-note').textContent).toContain('dog, sun');

    // Save built-in diagram for 'cat' -> advances queue to 'dog' and auto-searches offline diagrams for 'dog'
    d.querySelector('#pics-offline li button').click();
    await waitFor(() => d.getElementById('word').value === 'dog' && searchedOffline.includes('dog'), 'queue advanced to dog');
    expect(d.getElementById('saved-line').textContent).toContain('Saved for the word cat.');
    expect(d.getElementById('saved-line').textContent).toContain('Next word ready above: dog');
    expect(fetches).toEqual([]);

    // Skip 'dog' -> moves to 'sun'
    d.getElementById('queue-skip').click();
    await waitFor(() => d.getElementById('word').value === 'sun' && searchedOffline.includes('sun'), 'queue skipped to sun');
    expect(d.getElementById('queue-note').hidden).toBe(true);

    // Save final word 'sun' -> reports list complete
    d.querySelector('#pics-offline li button').click();
    await waitFor(() => d.getElementById('saved-line').textContent.includes('All words in your list are done'), 'queue complete');
    expect(fetches).toEqual([]);
  });
});
