#!/usr/bin/env node
'use strict';
// The accessibility gate for AlloFlow Packets (2026-11-12): the site pages (packets*.html) in their main states and
// the practice files and checks they make, in a real browser (Playwright Chromium), with axe-core (WCAG 2.0/2.1/2.2
// A + AA rules) and the checks axe does not make:
//   keyboard   every visible control is reached by Tab from the top of the page; in a file, also by Tab forward
//              from where the file puts the focus on each screen (no Shift+Tab, no wrapping round)
//   focus      each control reached by Tab looks different when it has the focus (outline, shadow, border, color)
//   reflow     no sideways scroll at 640 and 320 CSS px wide (1280 px at 200% and 400% zoom)
//   motion     with prefers-reduced-motion: reduce, nothing animates or has a transition longer than 0.01 s
//   live       right and wrong feedback in a file reaches a live region (role status/alert or aria-live)
//   names      every button has a name with a word in it (an audio button that is only a symbol fails)
// axe runs at 1280 and 375 px wide, and again in dark mode for the files (the site pages have no dark mode).
// Landmark and heading rules (axe best practice) run at 1280 px too. axe is first run on a page with three known faults:
// if it does not find them, the run stops (a gate that cannot fail is worse than none).
// "Skipped is not passed": every state that could not be reached, and every check that could not run, is listed and
// counted, and makes the run fail.
//
//   node dev-tools/check_packets_a11y.cjs                    everything (about 140 states, 9 to 22 minutes; one browser)
//   node dev-tools/check_packets_a11y.cjs --only check       the states whose name contains "check"
//   node dev-tools/check_packets_a11y.cjs --json out.json    also write every finding as JSON
//   npm run check:packets-a11y
// Heavy: it is not part of the default test run. tests/packets_a11y_static.test.js holds the fast checks.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const args = process.argv.slice(2);
const argOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const ONLY = argOf('--only');
const JSON_OUT = argOf('--json');
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

// ---------------------------------------------------------------------------
// The files, made in node by the same builders the maker pages call.
// ---------------------------------------------------------------------------
async function makeFiles(dir) {
  const g = { crypto: require('node:crypto').webcrypto };
  g.window = g;
  new Function('window', read('word_sounds_take_home_loader.js')).call(g, g);
  const loader = g.AlloWordSoundsTakeHome;
  const checks = require(path.join(ROOT, 'packet_check_builder.js'));
  const facts = require(path.join(ROOT, 'packet_math_practice_builder.js'));
  const vocab = require(path.join(ROOT, 'packet_vocab_builder.js'));
  const tool = require(path.join(ROOT, 'dev-tools/make_word_sounds_packet.cjs'));
  const symbolsTool = require(path.join(ROOT, 'dev-tools/build_word_sounds_symbols.cjs'));
  const parts = tool.loadParts();
  // Stand-in sounds: every key has a short clip. The page the file draws depends on the code, not the sound banks.
  const clip = (tag) => 'data:audio/wav;base64,' + Buffer.concat([Buffer.from('RIFF0000WAVE'), Buffer.from(String(tag))]).toString('base64');
  const bank = (name) => new Proxy({}, {
    get: (_, key) => (typeof key === 'string' ? clip(name + '/' + key) : undefined),
    getOwnPropertyDescriptor: (_, key) => (typeof key === 'string' ? { value: clip(name + '/' + key), enumerable: true, configurable: true, writable: false } : undefined),
  });
  const BANKS = { words: bank('words'), phonemes: bank('phonemes'), isolation: bank('isolation'), instructions: bank('instructions') };
  const CVC = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top'];
  const KNOWN = ['cat', 'dog', 'sun', 'pig', 'bed', 'hat', 'map', 'cup', 'pen', 'top', 'sit', 'fan', 'hop', 'red', 'run', 'mug', 'bat', 'rat', 'man', 'log', 'hen', 'net', 'lip', 'bug', 'rug'];
  const ws = (over) => parts.builder.buildPacket({ words: CVC.slice(0, 4), activities: parts.builder.SUPPORTED_ACTIVITIES, title: 'Short a words', seed: 7, core: parts.core,
    dictionary: parts.dictionary, banks: BANKS, loader, wordlist: parts.wordlist, knownWords: KNOWN, length: 2, createdAt: '2026-11-12T00:00:00.000Z', ...over });
  const BANKJSON = JSON.parse(read('psychometric_math_probes.json').replace(/^﻿/, ''));
  const form = (measure, grade, extra) => checks.lessonFromMathForm({ bank: BANKJSON, measure, grade, form: 'A', ...extra });
  const check = (lesson, extra) => checks.buildCheckPacket({ lesson, loader, ...extra });
  const vbank = require(path.join(ROOT, 'tests/fixtures/packets_vocab_bank_fixture.js'));
  await vbank.load();
  const rows = vocab.draftRows({ words: vocab.parseWords('habitat, predator, prey, cell, bat, adapt, camouflage').words, bank: vbank });
  const vfile = (mode, types) => { const lesson = vocab.lessonFromVocab({ loader, rows, types, mode }); return vocab.buildVocabPacket({ lesson, loader, rows, bank: vbank }); };
  const mfile = (mode) => facts.buildMathPracticePacket({ lesson: facts.lessonFromMathPractice({ loader, mode, factSet: 'mul-7' }), loader });
  const out = {};
  const put = (name, made, about) => {
    const html = made && made.html;
    if (!html) throw new Error('Could not make ' + name);
    fs.writeFileSync(path.join(dir, name + '.html'), html);
    out[name] = { file: name + '.html', about, lesson: JSON.parse(/var lesson=(.*);\nvar labels=/.exec(html)[1]) };
  };
  put('ws', await ws({}), 'Word Sounds practice, every activity, no pictures');
  put('ws-pictures', await ws({ pictures: true, symbols: symbolsTool.loadSymbols(), activities: ['isolation', 'blending', 'rhyming'] }), 'Word Sounds practice with pictures');
  put('check-qd', check(form('quantity_discrimination', 'K')), 'Quantity Discrimination check');
  put('check-mn', check(form('missing_number', '1')), 'Missing Number check');
  put('check-mc', check(form('math_computation', '3'), { teacherCode: 'tulip-47' }), 'Math Fluency check with a teacher code');
  put('check-qd-untimed', check(form('quantity_discrimination', 'K', { untimed: true })), 'Quantity Discrimination check, untimed (an accommodation)');
  put('check-own', check(checks.lessonFromMathProblems({ title: 'Facts to 20', problems: checks.parseProblems('7+8,12-5,6x4,20/4'), timeLimitS: 90 })), 'A check of the teacher\'s own problems');
  put('facts-ccc', mfile('ccc'), 'Math fact practice: cover, copy, compare');
  put('facts-rehearsal', mfile('rehearsal'), 'Math fact practice: rehearsal with known facts');
  put('vocab', vfile('practice', ['meaning', 'word', 'blank']), 'Vocabulary practice');
  put('vocab-check', vfile('check', ['meaning', 'word']), 'Vocabulary check');
  return out;
}

// ---------------------------------------------------------------------------
// A static server for the repo, and the made files under /__gen/.
// ---------------------------------------------------------------------------
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.csv': 'text/csv; charset=utf-8', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8' };
function serve(genDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let url = decodeURIComponent(String(req.url).split('?')[0].split('#')[0]);
      const base = url.startsWith('/__gen/') ? genDir : ROOT;
      if (url.startsWith('/__gen/')) url = url.slice(6);
      const file = path.normalize(path.join(base, url));
      if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ---------------------------------------------------------------------------
// In-page probes (run with page.evaluate; they use only their arguments)
// ---------------------------------------------------------------------------
const FOCUSABLE = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [tabindex]:not([tabindex="-1"]), [contenteditable=""], [contenteditable=true]';
function probeControls(selector) {
  // Visible, enabled controls a keyboard user should be able to Tab to. Each gets a data-a11y-n.
  const visible = (el) => {
    if (el.closest('[inert],[aria-hidden=true]')) return false;
    if (el.disabled) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return false; if (n.tagName === 'DETAILS' && !n.open && n !== el && !(el.closest('summary') && el.closest('summary').parentElement === n)) return false; }
    return true;
  };
  let n = 0;
  const list = [];
  document.querySelectorAll(selector).forEach((el) => {
    if (el.tagName === 'INPUT' && el.type === 'radio' && !el.checked && document.querySelector('input[type=radio][name="' + el.name + '"]:checked')) return; // a radio group is one tab stop
    if (el.tagName === 'INPUT' && el.type === 'radio' && !el.checked && [...document.querySelectorAll('input[type=radio][name="' + el.name + '"]')][0] !== el) return;
    // An input the page keeps off screen and opens with its own button (input type=file hidden) does not count.
    if (!visible(el) && !(el.tagName === 'INPUT' && !el.disabled && /^(radio|checkbox)$/.test(el.type) && el.closest('label') && visible(el.closest('label')))) return;
    el.setAttribute('data-a11y-n', String(++n));
    const name = (el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('title') || el.id || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 50);
    list.push({ n, tag: el.tagName.toLowerCase(), name, id: el.id || '' });
  });
  return list;
}
function probeStyleOf(n) {
  const el = n > 0 ? document.querySelector('[data-a11y-n="' + n + '"]') : null;
  if (!el) return null;
  const pick = (node) => { const s = getComputedStyle(node); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderTopWidth, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
  // The ring may be on the control or on a box around it (:focus-within on a label or a card): 4 levels up.
  const out = [pick(el)];
  for (let p = el.parentElement, i = 0; p && i < 4; p = p.parentElement, i++) out.push(pick(p));
  return out.join('#');
}
function probeActive() {
  const a = document.activeElement;
  if (!a || a === document.body || a === document.documentElement) return { n: 0, tag: a ? a.tagName.toLowerCase() : '' };
  if (a.tagName === 'IFRAME') return { n: -1, tag: 'iframe' };
  // -2: a stop this probe did not list (the walk goes on past it).
  return { n: Number(a.getAttribute('data-a11y-n')) || -2, id: a.id || '', tag: a.tagName.toLowerCase(), name: (a.getAttribute('aria-label') || a.textContent || a.id || '').replace(/\s+/g, ' ').trim().slice(0, 40) };
}
function probeReflow() {
  const width = document.documentElement.clientWidth;
  const scroll = Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0);
  const wide = [];
  if (scroll > width + 1) {
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.right > width + 1 && r.width > 0 && wide.length < 400) {
        for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return; }
        wide.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '')).slice(0, 80) + ' (' + Math.round(r.right) + 'px)');
      }
    });
  }
  return { width, scroll, wide: wide.slice(-4) };
}
function probeMotion() {
  const secs = (v) => String(v).split(',').map((x) => parseFloat(x) * (/ms/.test(x) ? 0.001 : 1) || 0);
  const found = [];
  document.querySelectorAll('*').forEach((el) => {
    const s = getComputedStyle(el);
    const moving = (s.animationName !== 'none' && Math.max(...secs(s.animationDuration)) > 0.01 && s.animationPlayState !== 'paused')
      || (s.transitionProperty !== 'none' && Math.max(...secs(s.transitionDuration)) > 0.01);
    if (moving && found.length < 6) found.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '')) + ' ' + (s.animationName !== 'none' ? 'animation ' + s.animationName : 'transition ' + s.transitionProperty + ' ' + s.transitionDuration));
  });
  if (getComputedStyle(document.documentElement).scrollBehavior === 'smooth') found.push('html scroll-behavior: smooth');
  return found;
}
function probeNames() {
  // Buttons whose name has no letter or digit in it (an icon alone). A name from aria-labelledby is read too.
  const bad = [];
  document.querySelectorAll('button, [role=button], a[href]').forEach((el) => {
    if (el.closest('[inert],[aria-hidden=true]')) return;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const by = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean).map((id) => { const t = document.getElementById(id); return t ? t.textContent : ''; }).join(' ');
    const name = (by || el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
    if (!/[\p{L}\p{N}]/u.test(name)) bad.push((el.outerHTML || '').slice(0, 100));
  });
  return bad;
}
function probeLiveStart() {
  window.__a11yLive = [];
  const isLive = (n) => n && n.nodeType === 1 && n.closest('[aria-live]:not([aria-live=off]),[role=status],[role=alert],[role=log]');
  const ob = new MutationObserver((list) => {
    list.forEach((m) => {
      const target = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const live = isLive(target);
      if (!live) {
        // A node ADDED that is itself a live region with text counts only if it was added empty and then filled; a
        // status line drawn with its text already in it is often not read. Recorded apart.
        m.addedNodes && m.addedNodes.forEach((a) => { if (a.nodeType === 1 && a.matches('[aria-live],[role=status],[role=alert]') && a.textContent.trim()) window.__a11yLive.push({ text: a.textContent.trim().slice(0, 80), inserted: true }); });
        return;
      }
      const text = live.textContent.trim();
      if (text) window.__a11yLive.push({ text: text.slice(0, 80), inserted: false });
    });
  });
  ob.observe(document.body, { subtree: true, childList: true, characterData: true });
  window.__a11yLiveStop = () => ob.disconnect();
}

// ---------------------------------------------------------------------------
// The audit of one state
// ---------------------------------------------------------------------------
const findings = [];   // { state, check, rule, impact, count, detail }
const skipped = [];    // { state, what, why }
const passes = {};     // state -> list of checks run
function add(state, check, rule, count, detail, impact) { findings.push({ state, check, rule, impact: impact || '', count, detail: detail || '' }); }
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

// Landmarks and headings: axe files these under best practice, not under a WCAG number. Run them too (1280 px).
const STRUCTURE = { type: 'rule', values: ['landmark-one-main', 'region', 'page-has-heading-one', 'heading-order', 'landmark-unique', 'landmark-no-duplicate-main',
  'landmark-banner-is-top-level', 'landmark-contentinfo-is-top-level', 'landmark-main-is-top-level', 'landmark-complementary-is-top-level', 'empty-heading', 'empty-table-header'] };
async function axeRun(page, state, label, only) {
  const frames = page.frames();
  let total = 0;
  for (const frame of frames) {
    let result;
    try {
      const has = await frame.evaluate(() => typeof window.axe === 'object').catch(() => false);
      if (!has) await frame.evaluate(AXE);
      result = await frame.evaluate((runOnly) => window.axe.run(document, { runOnly, iframes: false, resultTypes: ['violations'] })
        .then((r) => ({ violations: r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary || '').split('\n').slice(1, 2).join(' ').trim()) })), incomplete: r.incomplete.length })), only || { type: 'tag', values: TAGS });
    } catch (error) {
      if (frame === page.mainFrame()) { skipped.push({ state, what: 'axe ' + label, why: String(error.message || error).split('\n')[0] }); return; }
      skipped.push({ state, what: 'axe ' + label + ' in a frame (' + frame.url().slice(0, 60) + ')', why: String(error.message || error).split('\n')[0] });
      continue;
    }
    const where = frame === page.mainFrame() ? '' : ' [frame]';
    result.violations.forEach((v) => { total += v.nodes.length; add(state, 'axe ' + label + where, v.id, v.nodes.length, v.nodes.slice(0, 3).join(' || '), v.impact); });
  }
  (passes[state] = passes[state] || []).push('axe ' + label);
  return total;
}

async function keyboard(page, state, isFile) {
  const controls = await page.evaluate(probeControls, FOCUSABLE);
  if (!controls.length) { skipped.push({ state, what: 'keyboard', why: 'no visible controls' }); return; }
  // The look of each control without the focus: take the focus away first (a file puts it in the answer box).
  await page.evaluate(() => { const a = document.activeElement; if (a && a !== document.body && a.blur) a.blur(); });
  const styles = await page.evaluate(([fn, list]) => { const style = new Function('return (' + fn + ')')(); const o = {}; list.forEach((n) => { o[n] = style(n); }); return o; }, [probeStyleOf.toString(), controls.map((c) => c.n)]);
  const walk = async (fromTop) => {
    // From the top: focus a stand-in at the start of <body> and take it away; Tab then starts there.
    if (fromTop) await page.evaluate(() => { const m = document.createElement('div'); m.tabIndex = -1; document.body.insertBefore(m, document.body.firstChild); m.focus(); m.remove(); });
    const seen = [], order = [];
    for (let i = 0; i < controls.length * 2 + 12; i++) {
      await page.keyboard.press('Tab');
      const a = await page.evaluate(([fa, fs]) => { const a = new Function('return (' + fa + ')')()(); a.style = new Function('return (' + fs + ')')()(a.n); return a; }, [probeActive.toString(), probeStyleOf.toString()]);
      if (a.n === -1 || a.n === -2) { order.push(a.tag); if (order.length > controls.length * 2 + 8) break; continue; }
      if (a.n === 0) { if (order.length) break; else continue; }
      if (seen.includes(a.n)) break;
      seen.push(a.n); order.push(a.n);
      if (fromTop) {
        if (a.style === styles[a.n]) { const c = controls.find((x) => x.n === a.n); add(state, 'focus', 'no-visible-focus', 1, c.tag + ' "' + c.name + '"'); }
      }
    }
    return seen;
  };
  const top = await walk(true);
  const missed = controls.filter((c) => !top.includes(c.n));
  if (missed.length) add(state, 'keyboard', 'not-reached-by-tab', missed.length, missed.slice(0, 6).map((c) => c.tag + (c.id ? '#' + c.id : '') + ' "' + c.name + '"').join(', '));
  if (isFile) {
    // From the top of the screen (its heading, where the file puts the focus when a screen opens), forward only:
    // every control of the file, the reading tools too, must come after it. No Shift+Tab, no wrapping round.
    const at = await page.evaluate(() => { const h = document.querySelector('#app h2[tabindex="-1"]'); if (h) h.focus(); return !!h && document.activeElement === h; });
    if (!at) skipped.push({ state, what: 'keyboard from the screen heading', why: 'no screen heading to start from' });
    else {
      const fwd = [];
      for (let i = 0; i < controls.length + 6; i++) {
        await page.keyboard.press('Tab');
        const a = await page.evaluate(probeActive);
        if (a.n === -1 || a.n === -2) continue;
        if (a.n <= 0 || fwd.includes(a.n)) break;
        fwd.push(a.n);
      }
      const back = controls.filter((c) => !fwd.includes(c.n));
      if (back.length) add(state, 'keyboard', 'needs-shift-tab', back.length, 'From the screen heading, Tab forward never reaches: ' + back.slice(0, 6).map((c) => c.tag + (c.id ? '#' + c.id : '') + ' "' + c.name + '"').join(', '));
    }
  }
  (passes[state] = passes[state] || []).push('keyboard', 'focus');
}

const DEBUG = !!process.env.A11Y_DEBUG;
const lap = (label, t) => { if (DEBUG) console.log('  ' + label + ' ' + (Date.now() - t) + ' ms'); return Date.now(); };
async function audit(page, state, { isFile, dark }) {
  let t = Date.now();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(80);
  await axeRun(page, state, '1280');
  await axeRun(page, state, 'structure', STRUCTURE);
  await page.setViewportSize({ width: 375, height: 800 });
  await page.waitForTimeout(80);
  await axeRun(page, state, '375');
  t = lap('axe x2', t);
  for (const width of [640, 320]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForTimeout(80);
    const r = await page.evaluate(probeReflow);
    if (r.scroll > r.width + 1) add(state, 'reflow', 'horizontal-scroll-' + width, 1, 'content ' + r.scroll + ' px wide in ' + r.width + ' px: ' + r.wide.join(', '));
  }
  (passes[state] = passes[state] || []).push('reflow 640', 'reflow 320');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(60);
  const motion = await page.evaluate(probeMotion);
  if (motion.length) add(state, 'motion', 'moves-with-reduced-motion', motion.length, motion.join('; '));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  passes[state].push('motion');
  const names = await page.evaluate(probeNames);
  if (names.length) add(state, 'names', 'button-name-without-a-word', names.length, names.slice(0, 3).join(' || '));
  passes[state].push('names');
  t = lap('reflow motion names', t);
  if (dark) {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(80);
    await axeRun(page, state, 'dark');
    await page.emulateMedia({ colorScheme: 'light' });
  }
  t = lap('dark', t);
  await keyboard(page, state, isFile);
  lap('keyboard', t);
}

// ---------------------------------------------------------------------------
// Getting to each state
// ---------------------------------------------------------------------------
const wait = (page, ms) => page.waitForTimeout(ms);
async function clickVisible(page, selector) {
  const loc = page.locator(selector).filter({ visible: true }).first();
  await loc.click({ timeout: 4000 });
}
// The first choice of a group of radios/checkboxes inside a container (clicked through its label).
async function pickFirst(page, container) {
  const input = page.locator(container + ' input[type=radio], ' + container + ' input[type=checkbox]').first();
  const label = page.locator(container + ' label').filter({ has: input }).first();
  if (await label.count()) await label.click({ timeout: 4000 }); else await input.check({ timeout: 4000, force: true });
}

// In a file: the reading tools, the start screen, answering.
const file = {
  start: async (page, name = 'Robin4') => {
    await page.waitForSelector('#app h2', { timeout: 8000 });
    const input = page.locator('#learner-name');
    if (await input.count()) await input.fill(name);
    await page.locator('#app button.primary').first().click();
    await wait(page, 350);
  },
  // Answers the item on screen with the first thing to press. Returns true once a Next button shows.
  answerOnce: async (page) => {
    // Cover, copy, compare and rehearsal: a new fact is shown first, with a button that covers it.
    const cover = page.locator('[data-cover]').filter({ visible: true }).first();
    if (await cover.count()) { await cover.click(); await wait(page, 350); }
    const pad = page.locator('[data-pad-input]').filter({ visible: true }).first();
    if (await pad.count()) {
      await pad.focus(); await page.keyboard.type('1'); await wait(page, 100);
      const next = page.locator('#app [data-key="next"]').filter({ visible: true }).first();
      if (await next.count()) await next.click(); else await page.keyboard.press('Enter');
      await wait(page, 350); return;
    }
    const choice = page.locator('#app [data-choice]:not([disabled]):not([aria-disabled=true]), #app [data-key]:not([disabled])').filter({ visible: true }).first();
    if (await choice.count()) { await choice.click(); await wait(page, 350); return; }
    const any = page.locator('#app .card button:not([disabled]):not([data-say]):not([data-read-aloud])').filter({ visible: true }).first();
    if (await any.count()) { await any.click(); await wait(page, 350); }
  },
};

function siteStates() {
  const S = [];
  const site = (name, url, steps) => S.push({ name, url, steps, isFile: false, dark: false });
  site('hub', '/packets.html', async () => {});
  site('hub: proof open', '/packets.html', async (p) => { await p.locator('details.proof > summary').first().click(); });
  site('it', '/packets-it.html', async () => {});
  // Word Sounds maker
  const make1 = async (p) => { await p.waitForSelector('#step-1:not([hidden])', { timeout: 15000 }); };
  site('make: step 1', '/packets-make.html', make1);
  const make2 = async (p) => { await make1(p); await pickFirst(p, '#strands'); await p.click('#next-1'); await p.waitForSelector('#step-2:not([hidden])', { timeout: 8000 }); };
  site('make: step 2', '/packets-make.html', make2);
  site('make: step 2, word list open', '/packets-make.html', async (p) => { await make2(p); await p.evaluate(() => document.querySelectorAll('#step-2 details:not([hidden])').forEach((d) => { d.open = true; })); });
  const make3 = async (p) => { await make2(p); await wait(p, 600); await p.click('#next-2'); await p.waitForSelector('#step-3:not([hidden])', { timeout: 8000 }); await p.waitForSelector('#save:not([hidden])', { timeout: 60000 }); };
  site('make: step 3, file ready', '/packets-make.html', make3);
  site('make: step 3, options open', '/packets-make.html', async (p) => { await make3(p); await p.evaluate(() => document.querySelectorAll('#step-3 details:not([hidden]), #about-page').forEach((d) => { d.open = true; })); });
  // Check maker
  const check1 = async (p) => { await p.waitForSelector('#step-1:not([hidden])', { timeout: 15000 }); };
  site('check: step 1', '/packets-check.html', check1);
  const check2 = async (p) => { await check1(p); await p.locator('#checks label').first().click(); await p.click('#next-1'); await p.waitForSelector('#step-2:not([hidden])', { timeout: 8000 }); await p.locator('#grades label').first().click(); await wait(p, 200); };
  site('check: step 2', '/packets-check.html', check2);
  site('check: step 2, options open', '/packets-check.html', async (p) => { await check2(p); await p.evaluate(() => document.querySelectorAll('#step-2 details:not([hidden]), #about-page').forEach((d) => { d.open = true; })); });
  site('check: step 2, untimed chosen', '/packets-check.html', async (p) => { await check2(p); await p.click('#untimed-box > summary'); await p.locator('label').filter({ has: p.locator('#f-untimed') }).click(); await wait(p, 200); });
  site('check: step 2, own problems', '/packets-check.html', async (p) => { await check1(p); await p.locator('#checks label').last().click(); await p.click('#next-1'); await p.waitForSelector('#step-2:not([hidden])'); await p.fill('#f-problems', '7+8, 12-5, 6x4, 20/0'); await wait(p, 500); });
  const check3 = async (p) => { await check2(p); await p.click('#next-2'); await p.waitForSelector('#save:not([hidden])', { timeout: 30000 }); };
  site('check: step 3, file ready', '/packets-check.html', check3);
  site('check: step 3, saved', '/packets-check.html', async (p) => { await check3(p); await p.evaluate(() => { const a = document.getElementById('after-save'); if (a) a.hidden = false; document.querySelectorAll('#step-3 details').forEach((d) => { d.open = true; }); }); });
  // Math fact practice maker
  const mp1 = async (p) => { await p.waitForSelector('#step-1:not([hidden])', { timeout: 15000 }); };
  site('math practice: step 1', '/packets-math-practice.html', mp1);
  const mp2 = async (p) => { await mp1(p); await pickFirst(p, '#kinds'); await wait(p, 200); if (await p.locator('#sets input').count()) await pickFirst(p, '#sets'); await p.click('#next-1'); await p.waitForSelector('#step-2:not([hidden])', { timeout: 8000 }); };
  site('math practice: step 2', '/packets-math-practice.html', mp2);
  site('math practice: step 3, file ready', '/packets-math-practice.html', async (p) => { await mp2(p); await pickFirst(p, '#methods'); await p.click('#next-2'); await p.waitForSelector('#save:not([hidden])', { timeout: 30000 }); await p.evaluate(() => document.querySelectorAll('#step-3 details, #about-page').forEach((d) => { d.open = true; })); });
  // Vocabulary maker
  const v1 = async (p) => { await p.waitForSelector('#step-1:not([hidden])', { timeout: 30000 }); };
  site('vocab: step 1', '/packets-vocab.html', v1);
  const v2 = async (p) => { await v1(p); await p.fill('#f-words', 'habitat, predator, prey, cell, adapt'); await wait(p, 300); await p.click('#next-1'); await p.waitForSelector('#step-2:not([hidden])', { timeout: 30000 }); await wait(p, 500); };
  site('vocab: step 2, meanings', '/packets-vocab.html', v2);
  const v3 = async (p) => { await v2(p); await p.click('#next-2'); await p.waitForSelector('#step-3:not([hidden])', { timeout: 8000 }); await wait(p, 500); };
  site('vocab: step 3', '/packets-vocab.html', v3);
  site('vocab: step 3, check chosen, options open', '/packets-vocab.html', async (p) => { await v3(p); const radios = p.locator('#modes label'); if (await radios.count() > 1) await radios.nth(1).click(); await wait(p, 600); await p.evaluate(() => document.querySelectorAll('#step-3 details, #about-page').forEach((d) => { d.open = true; })); });
  // Results
  site('results: empty', '/packets-results.html', async (p) => { await p.waitForSelector('#state-empty'); });
  const r1 = async (p) => { await p.click('#samples'); await p.waitForSelector('#state-check:not([hidden]), #state-results:not([hidden])', { timeout: 15000 }); };
  site('results: samples read', '/packets-results.html', r1);
  const r2 = async (p) => { await r1(p); if (await p.locator('#show-results').filter({ visible: true }).count()) await p.click('#show-results'); await p.waitForSelector('#state-results:not([hidden])', { timeout: 15000 }); await wait(p, 300); };
  site('results: group', '/packets-results.html', r2);
  site('results: one student', '/packets-results.html', async (p) => { await r2(p); await p.locator('#group-table .name-link').first().click(); await p.waitForSelector('#view-learner:not([hidden])', { timeout: 8000 }); await wait(p, 300); });
  // Verify, open, pictures
  site('verify: empty', '/packets-verify.html', async () => {});
  site('verify: a check file', '/packets-verify.html', async (p, gen) => { await p.setInputFiles('#files', path.join(gen.dir, 'check-mc.html')); await p.waitForSelector('#reports:not([hidden])', { timeout: 15000 }); await wait(p, 800); await p.evaluate(() => document.querySelectorAll('#reports details').forEach((d, i) => { if (i < 3) d.open = true; })); });
  site('verify: a practice file', '/packets-verify.html', async (p, gen) => { await p.setInputFiles('#files', path.join(gen.dir, 'ws-pictures.html')); await p.waitForSelector('#reports:not([hidden])', { timeout: 15000 }); await wait(p, 800); });
  site('open: empty', '/packets-open.html', async () => {});
  const o1 = async (p, gen) => { await p.setInputFiles('#file', path.join(gen.dir, 'vocab.html')); await p.waitForSelector('#found:not([hidden])', { timeout: 15000 }); await wait(p, 300); };
  site('open: a file loaded', '/packets-open.html', o1);
  site('open: the file running', '/packets-open.html', async (p, gen) => { await o1(p, gen); await p.click('#start'); await p.waitForSelector('#run:not([hidden])', { timeout: 8000 }); await wait(p, 1500); });
  site('pictures: start', '/packets-pictures.html', async () => {});
  site('pictures: a picture chosen', '/packets-pictures.html', async (p) => {
    await p.fill('#word', 'cat');
    const png = path.join(os.tmpdir(), 'a11y-cat.png');
    fs.writeFileSync(png, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==', 'base64'));
    await p.setInputFiles('#file', png); await wait(p, 1200);
  });
  return S;
}

function fileStates(gen) {
  const S = [];
  const f = (name, key, steps) => S.push({ name, url: '/__gen/' + gen.files[key].file, steps, isFile: true, dark: true, key });
  // Practice files: start, each activity's first question (the file's own "continue" from a kept place), a wrong and
  // a right answer, the end.
  const practice = (key, label) => {
    const lesson = gen.files[key].lesson;
    const storageKey = 'alloflow-take-home:' + lesson.lessonId + ':' + lesson.revision;
    const items = [];
    lesson.blocks.forEach((b) => b.items.forEach((it) => items.push({ activity: b.activity, id: it.id })));
    const at = (index) => async (p) => {
      await p.waitForSelector('#app h2', { timeout: 8000 });
      await p.evaluate(([k, idx, list]) => {
        const now = new Date().toISOString();
        localStorage.setItem(k, JSON.stringify({ name: 'Robin4', index: idx, startedAt: now, startedLocal: now, sessionId: 'a11y', items: list.map((e) => ({ itemId: e.id, activity: e.activity, responses: [], attempts: 0, firstTry: false, correct: false, done: false, supports: {} })) }));
      }, [storageKey, index, items]);
      await p.reload();
      await p.waitForSelector('#app h2', { timeout: 8000 });
      await p.locator('#app button.primary').first().click();
      await wait(p, 350);
    };
    f(label + ': start', key, async (p) => { await p.waitForSelector('#app h2', { timeout: 8000 }); });
    f(label + ': start, reading tools open', key, async (p) => { await p.waitForSelector('#app h2'); await p.click('[data-tools-open]'); await wait(p, 100); });
    f(label + ': start, about this file open', key, async (p) => { await p.waitForSelector('#app h2'); const b = p.locator('[data-about-open]'); if (await b.count()) await b.first().click(); await wait(p, 100); });
    f(label + ': high contrast colors', key, async (p) => { await file.start(p); await p.click('[data-tools-open]'); await p.click('[data-tool="colors-1"]'); await p.click('[data-tools-close]'); await wait(p, 100); });
    f(label + ': soft colors, larger text', key, async (p) => { await file.start(p); await p.click('[data-tools-open]'); await p.click('[data-tool="colors-2"]'); await p.click('[data-tool="size-2"]'); await p.click('[data-tools-close]'); await wait(p, 100); });
    const firsts = [];
    items.forEach((it, i) => { if (!firsts.some((x) => x.activity === it.activity)) firsts.push({ activity: it.activity, index: i }); });
    firsts.forEach((x) => f(label + ': question, ' + x.activity, key, at(x.index)));
    f(label + ': feedback after an answer', key, async (p) => { await at(0)(p); await p.evaluate(probeLiveStart); await file.answerOnce(p); await wait(p, 300); });
    f(label + ': the end (results)', key, at(items.length));
  };
  practice('ws', 'ws');
  practice('ws-pictures', 'ws pictures');
  practice('facts-ccc', 'facts ccc');
  practice('facts-rehearsal', 'facts rehearsal');
  practice('vocab', 'vocab');
  // Checks: start, a practice item and its feedback, get ready, a question, the stop box, the end, the teacher screen.
  const checkFlow = (key, label, code) => {
    const toPractice = async (p) => { await file.start(p); };
    const toReady = async (p) => {
      await toPractice(p);
      for (let i = 0; i < 6 && !(await p.locator('[data-check-begin]').count()); i++) {
        await file.answerOnce(p);
        const next = p.locator('#app button.primary').filter({ visible: true }).filter({ hasNotText: /^$/ });
        if (await p.locator('[data-check-begin]').count()) break;
        if (await next.count()) { await next.last().click().catch(() => {}); await wait(p, 350); }
      }
      await p.waitForSelector('[data-check-begin]', { timeout: 4000 });
    };
    const toItem = async (p) => { await toReady(p); await p.click('[data-check-begin]'); await wait(p, 350); };
    const toEnd = async (p) => { await toItem(p); await file.answerOnce(p); await p.click('[data-stop]'); await p.click('[data-stop-yes]'); await wait(p, 300); };
    f(label + ': start', key, async (p) => { await p.waitForSelector('#app h2', { timeout: 8000 }); });
    f(label + ': practice item', key, toPractice);
    f(label + ': practice feedback', key, async (p) => { await toPractice(p); await p.evaluate(probeLiveStart); await file.answerOnce(p); await wait(p, 300); });
    f(label + ': get ready', key, toReady);
    f(label + ': a question', key, toItem);
    f(label + ': a question, reading tools open', key, async (p) => { await toItem(p); await p.click('[data-tools-open]'); await wait(p, 100); });
    f(label + ': stop box', key, async (p) => { await toItem(p); await p.click('[data-stop]'); await wait(p, 100); });
    f(label + ': the end', key, toEnd);
    f(label + ': teacher screen', key, async (p) => {
      await toEnd(p);
      // With a teacher code the screen asks for it at once; without one, a button opens it.
      if (code) { await p.fill('#teacher-code', code); await p.click('[data-teacher-show]'); await p.waitForSelector('[data-review]', { timeout: 15000 }); }
      else { await p.click('[data-teacher-open]'); await wait(p, 150); }
      await wait(p, 200);
    });
  };
  checkFlow('check-qd', 'check QD');
  checkFlow('check-mn', 'check MN');
  checkFlow('check-mc', 'check MC (code)', 'tulip-47');
  checkFlow('check-own', 'check own');
  checkFlow('check-qd-untimed', 'check QD untimed');
  // A vocabulary check opens with a sample question (2026-11-13, packet_vocab_builder.js sampleFor), as a math check
  // does: the same states, through it. (Before, it had no practice item: start, a question, the end, teacher screen.)
  checkFlow('vocab-check', 'vocab check');
  return S;
}

// ---------------------------------------------------------------------------
async function main() {
  const { chromium } = require('playwright');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'packets-a11y-'));
  const t0 = Date.now();
  const files = await makeFiles(dir);
  const gen = { dir, files };
  const server = await serve(dir);
  const origin = 'http://127.0.0.1:' + server.address().port;
  const states = siteStates().concat(fileStates(gen)).filter((s) => !ONLY || s.name.toLowerCase().includes(ONLY.toLowerCase()));
  let tm = lap('files and server', t0);
  const browser = await chromium.launch();
  tm = lap('launch', tm);
  let reached = 0;
  {
    const context = await browser.newContext({ bypassCSP: true });
    const page = await context.newPage();
    await page.setContent('<!doctype html><html><head><title>t</title></head><body><main><img src="x.png"><button></button><p style="color:#bbb;background:#fff">low contrast</p></main></body></html>');
    const before = findings.length;
    await axeRun(page, '(self-test)', 'self-test');
    const rules = findings.slice(before).map((x) => x.rule).sort();
    findings.length = before;
    delete passes['(self-test)'];
    await context.close();
    if (!['button-name', 'color-contrast', 'image-alt'].every((r) => rules.includes(r))) { console.error('axe self-test failed: found ' + (rules.join(', ') || 'nothing') + ' on a page with three known faults'); process.exit(2); }
  }
  for (const s of states) {
    const began = Date.now();
    const context = await browser.newContext({ bypassCSP: true, viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference', colorScheme: 'light' });
    const page = await context.newPage();
    page.setDefaultTimeout(8000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 160)));
    try {
      await page.goto(origin + s.url, { waitUntil: 'load', timeout: 30000 });
      tm = lap('load', tm);
      await s.steps(page, gen);
      tm = lap('steps', tm);
      await wait(page, 150);
      reached++;
    } catch (error) {
      skipped.push({ state: s.name, what: 'the whole state', why: 'could not get there: ' + String(error.message || error).split('\n')[0].slice(0, 200) });
      await context.close();
      continue;
    }
    if (s.name.includes('feedback')) {
      const live = await page.evaluate(() => { const l = window.__a11yLive || []; if (window.__a11yLiveStop) window.__a11yLiveStop(); return l; });
      const said = live.filter((x) => !x.inserted);
      if (!said.length) add(s.name, 'live', 'feedback-not-announced', 1, live.length ? 'only inserted with its text already in it: ' + live.map((x) => x.text).join(' / ') : 'no live region changed after the answer');
      (passes[s.name] = passes[s.name] || []).push('live');
    }
    try { await audit(page, s.name, s); } catch (error) { skipped.push({ state: s.name, what: 'part of the audit', why: String(error.message || error).split('\n')[0].slice(0, 200) }); }
    if (errors.length) add(s.name, 'page', 'script-error', errors.length, errors.slice(0, 2).join(' || '));
    await context.close();
    process.stderr.write(s.name + ' ' + Math.round((Date.now() - began) / 100) / 10 + ' s' + String.fromCharCode(10));
  }
  tm = lap('states', tm);
  // On this laptop Chromium can take most of a minute to shut down: wait 5 s, then end it.
  await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
  if (server.closeAllConnections) server.closeAllConnections();
  server.close();
  tm = lap('close', tm);
  fs.rmSync(dir, { recursive: true, force: true });
  tm = lap('rm', tm);
  process.stdout.write('\n');

  // Report: per state, then the totals by rule.
  const byState = {};
  findings.forEach((x) => { (byState[x.state] = byState[x.state] || []).push(x); });
  const lines = [];
  for (const s of states) {
    const list = byState[s.name] || [];
    const skip = skipped.filter((x) => x.state === s.name);
    lines.push((list.length || skip.length ? 'FAIL ' : 'ok   ') + s.name + (list.length ? '  (' + list.length + ' finding' + (list.length > 1 ? 's' : '') + ')' : ''));
    list.forEach((x) => lines.push('       ' + x.check + '  ' + x.rule + (x.impact ? ' [' + x.impact + ']' : '') + ' x' + x.count + '  ' + x.detail.slice(0, 300)));
    skip.forEach((x) => lines.push('       SKIPPED ' + x.what + ': ' + x.why));
  }
  const byRule = {};
  findings.forEach((x) => { const k = x.check.replace(/ \[frame\]$/, '').replace(/^axe .*/, 'axe') + ' ' + x.rule; byRule[k] = byRule[k] || { states: 0, nodes: 0 }; byRule[k].states++; byRule[k].nodes += x.count; });
  lines.push('', 'By rule (states, elements):');
  Object.keys(byRule).sort().forEach((k) => lines.push('  ' + k + ': ' + byRule[k].states + ' states, ' + byRule[k].nodes));
  lines.push('', 'States: ' + states.length + ' planned, ' + reached + ' reached. Findings: ' + findings.length + ' (' + findings.reduce((a, x) => a + x.count, 0) + ' elements). Skipped: ' + skipped.length + '. ' + Math.round((Date.now() - t0) / 1000) + ' s.');
  if (skipped.length) lines.push('Skipped is not passed: ' + skipped.map((x) => x.state + ' (' + x.what + ')').join('; '));
  console.log(lines.join('\n'));
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify({ when: new Date().toISOString(), states: states.map((s) => s.name), reached, findings, skipped, byRule, passes }, null, 1));
  process.exitCode = findings.length || skipped.length ? 1 : 0;
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 2; });
module.exports = { makeFiles };
