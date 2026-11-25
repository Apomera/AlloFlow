import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const adapters = require(path.join(ROOT, 'packet_sort_write_adapters.js'));
const choice = require(path.join(ROOT, 'packet_choice_builder.js'));
const verifyCore = require(path.join(ROOT, 'packets_verify_core.js'));
const stationBilingual = require(path.join(ROOT, 'packets_station_bilingual.js'));
const qrCrypto = require(path.join(ROOT, 'packets_qr_crypto.js'));
const siteBuild = require(path.join(ROOT, 'dev-tools', 'build_packets_site.cjs'));

function readRoot(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

function bootPacket(html) {
  const saved = [];
  const dom = new JSDOM(html, {
    url: 'https://packets.local/student.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      let nextUrl = 1;
      const blobs = new Map();
      win.URL.createObjectURL = (blob) => {
        const u = 'blob:test-' + (nextUrl++);
        blobs.set(u, blob);
        return u;
      };
      win.URL.revokeObjectURL = () => {};
      win.print = () => { win.__printed = (win.__printed || 0) + 1; };
      const origClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function () {
        const dl = this.getAttribute('download');
        const href = this.getAttribute('href');
        if (dl && href && blobs.has(href)) {
          const blob = blobs.get(href);
          saved.push({ name: dl, blob });
          return;
        }
        return origClick.apply(this, arguments);
      };
    },
  });
  const doc = dom.window.document;
  return {
    dom,
    win: dom.window,
    doc,
    saved,
    async readSaved(ext) {
      const hit = saved.filter((s) => s.name.endsWith(ext)).pop();
      if (!hit) return null;
      return { name: hit.name, text: await hit.blob.text() };
    },
    start(learner = 'BlueHeron7') {
      const inp = doc.getElementById('learner-name');
      if (inp) inp.value = learner;
      const btn = doc.querySelector('button.primary');
      if (!btn) throw new Error('Start button not found');
      btn.click();
    },
  };
}

function advanceDelay(win, ms = 400) {
  const origNow = win.Date.now.bind(win.Date);
  const origPerf = win.performance.now.bind(win.performance);
  let shift = ms;
  win.Date.now = () => origNow() + shift;
  win.performance.now = () => origPerf() + shift;
  return {
    bump(extra = 400) { shift += extra; },
  };
}

describe('Wave 11 static invariants, CSP, a11y, US spelling, and site build drift', () => {
  const html = readRoot('packets-choice.html');
  const css = readRoot('packets-choice.css');
  const jsFiles = [
    'packet_sort_write_adapters.js',
    'packet_choice_builder.js',
    'packets-choice.js',
  ];

  it('enforces strict CSP, landmarks, proof fold, footer feedback link, and Look inside wording on packets-choice.html', () => {
    expect(html).toMatch(/^<!doctype html>\s*<html lang="en">/i);
    const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(cspMatch).toBeTruthy();
    const csp = cspMatch[1];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("form-action 'none'");
    expect(csp).toContain("base-uri 'none'");
    const beforeCsp = html.slice(0, cspMatch.index).replace(/^[\s\S]*?<head>/i, '');
    expect(beforeCsp).not.toMatch(/<(?!meta\b)[a-z]/i);

    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    expect(html).not.toMatch(/\sstyle\s*=/i);
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/<form\b/i);
    expect(html).not.toMatch(/type="email"/i);

    expect(html).toContain('<link rel="icon" type="image/svg+xml" href="packets-mark.svg">');
    expect(html).toContain('<a class="skip" href="#main">');
    expect(html).toContain('<main id="main" tabindex="-1"');
    expect((html.match(/AlloFlow Packets/g) || []).length).toBe(1);
    expect(html).toContain('<span id="product-name">AlloFlow Packets</span>');
    expect(html).toMatch(/<details class="proof">/);
    expect(html).not.toMatch(/<details class="proof"[^>]*\bopen\b/);
    expect(html).toContain('This page runs without AI. No account. Nothing you choose leaves your device.');

    const fbIdx = html.indexOf('<a href="packets-feedback.html#from-packets-choice">Send feedback</a>');
    const moreIdx = html.indexOf('<a href="./">More from AlloFlow</a>');
    expect(fbIdx).toBeGreaterThan(0);
    expect(moreIdx).toBeGreaterThan(fbIdx);

    expect(html).toContain('<a href="packets-verify.html">Look inside a file</a>');
    expect(html).not.toMatch(/Check a file/i);

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    expect(doc.querySelectorAll('h1').length).toBe(1);
    const levels = Array.from(doc.querySelectorAll('h1,h2,h3,h4,h5,h6')).map((h) => Number(h.tagName.slice(1)));
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
    const ids = Array.from(doc.querySelectorAll('[id]')).map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const btn of doc.querySelectorAll('button')) {
      expect(btn.getAttribute('type')).toBe('button');
    }
    for (const el of doc.querySelectorAll('[aria-describedby]')) {
      for (const ref of el.getAttribute('aria-describedby').trim().split(/\s+/)) {
        expect(doc.getElementById(ref)).toBeTruthy();
      }
    }
    for (const ctrl of doc.querySelectorAll('input,select,textarea')) {
      const hasLabel = (ctrl.id && doc.querySelector(`label[for="${ctrl.id}"]`)) || ctrl.closest('label') || ctrl.getAttribute('aria-label');
      expect(Boolean(hasLabel)).toBe(true);
    }
  });

  it('enforces CSS invariants on packets-choice.css', () => {
    expect(css).not.toMatch(/:root\b/);
    expect(css).not.toMatch(/--[a-z0-9-]+\s*:/i);
    const prePrint = css.split('@media print')[0];
    expect(prePrint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).not.toMatch(/@import|url\s*\(|@font-face|@keyframes|\banimation\b/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
    expect(css).not.toContain('AlloFlow Packets');
  });

  it('enforces zero markup sinks, zero third-party URLs, zero product-name leaks, and US English across all new files', () => {
    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    const sinks = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/;
    const urls = /https?:\/\//i;
    expect(html).not.toMatch(british);
    expect(html).not.toMatch(urls);
    expect(css).not.toMatch(british);
    expect(css).not.toMatch(urls);

    for (const name of jsFiles) {
      const src = readRoot(name);
      expect(src, `${name} must not have markup sinks`).not.toMatch(sinks);
      expect(src, `${name} must not have third-party URLs`).not.toMatch(urls);
      expect(src, `${name} must not duplicate product name`).not.toContain('AlloFlow Packets');
      expect(src, `${name} must use US spelling`).not.toMatch(british);
    }
  });

  it('passes dev-tools/build_packets_site.cjs plan() with zero drift and includes all new Wave 2A files', () => {
    const p = siteBuild.plan();
    for (const f of [
      'packets-choice.html',
      'packets-choice.css',
      'packets-choice.js',
      'packet_sort_write_adapters.js',
      'packet_choice_builder.js',
      'packets_station_bilingual.js',
    ]) {
      expect(p.files.has(f), `site build plan should include ${f}`).toBe(true);
    }
  });
});

describe('Wave 11 verifyPacket (closed, look=0, notExpected=0) across all variants', () => {
  it('passes verifyPacket cleanly for all 4 activities, Check modes, Bilingual RTL, Station Mode, and Sealed QR', () => {
    const keys = qrCrypto.generateKeyPair('Wave 11 Teacher');
    const variants = [
      { label: 'concept_sort practice (with SVG icons)', tpl: 'sci_states_matter_sort', opts: {} },
      { label: 'concept_sort check mode', tpl: 'sci_states_matter_sort', opts: { mode: 'probe', form: 'Form A', teacherCode: '4321' } },
      { label: 'sequence_order practice', tpl: 'sci_water_cycle_seq', opts: {} },
      { label: 'sequence_order check mode', tpl: 'ss_bill_to_law_seq', opts: { mode: 'probe', form: 'Form B', timeLimitS: 180 } },
      { label: 'tiered_writing practice', tpl: 'ela_claim_evidence_write', opts: {} },
      { label: 'choice_board Science 3-path', tpl: 'sci_ecosystems_choice', opts: {} },
      { label: 'choice_board ELA Cloze 3-path', tpl: 'ela_story_elements_choice', opts: {} },
      {
        label: 'choice_board Bilingual (es+ar RTL) + Station + Sealed QR',
        tpl: 'ss_civic_branches_choice',
        opts: {
          homeLanguages: ['es', 'ar'],
          bilingualGlossary: [{ en: 'veto', translations: { es: 'veto', ar: 'نقض' } }],
          stationMode: true,
          qrPublicKey: keys.publicKey,
        },
      },
    ];

    for (const v of variants) {
      const tpl = choice.templateById(v.tpl);
      const built = choice.buildChoicePacket({
        title: tpl.title,
        activity: tpl.activity,
        items: [tpl.item],
        adapters,
        loader,
        stationBilingual,
        qrCrypto,
        ...v.opts,
      });
      const report = verifyCore.verifyPacket(built.html);
      expect(report.result, `${v.label} result`).toBe('closed');
      expect(report.counts.look, `${v.label} look`).toBe(0);
      expect(report.counts.notExpected, `${v.label} notExpected`).toBe(0);
    }
  });
});

describe('Wave 11 student packet end-to-end gameplay (JSDOM)', () => {
  it('Concept Sort: supports drag, click-to-place, keyboard select, logs misconceptions, retries, and passes Check mode', async () => {
    const tpl = choice.templateById('sci_states_matter_sort');
    const built = choice.buildChoicePacket({
      title: tpl.title,
      activity: 'concept_sort',
      items: [tpl.item],
      adapters,
      loader,
    });
    const app = bootPacket(built.html);
    app.start('Owl4');

    // Verify embedded static SVG icons rendered cleanly
    expect(app.doc.querySelectorAll('img.cs-icon-img').length).toBeGreaterThan(0);

    // Place cards using drag-and-drop (c2 -> solid), click-select + place-here (c1 -> liquid intentionally wrong),
    // and keyboard <select> (c3-c6) to verify all three interaction paths AND keyboard focus preservation.
    const c1Btn = app.doc.querySelector('[data-cs-card-btn="c1"]');
    c1Btn.click();
    expect(app.doc.activeElement.getAttribute('data-cs-card-btn')).toBe('c1');
    app.doc.querySelector('[data-cs-place="liquid"]').click();
    expect(app.doc.activeElement).not.toBe(app.doc.body);
    expect(app.doc.activeElement.getAttribute('data-cs-card-btn')).toBe('c1');

    const c2Card = app.doc.querySelector('[data-cs-card="c2"]');
    const solidBin = app.doc.querySelector('[data-cs-bin="solid"]');
    const dtData = {};
    const dt = { setData(k, v) { dtData[k] = v; }, getData(k) { return dtData[k] || ''; }, effectAllowed: '' };
    const dragEv = new app.win.Event('dragstart', { bubbles: true });
    dragEv.dataTransfer = dt;
    c2Card.dispatchEvent(dragEv);
    const dropEv = new app.win.Event('drop', { bubbles: true, cancelable: true });
    dropEv.dataTransfer = dt;
    solidBin.dispatchEvent(dropEv);

    const assign = (cardId, catId) => {
      const sel = app.doc.querySelector(`[data-cs-select="${cardId}"]`);
      sel.value = catId;
      sel.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    };
    assign('c3', 'liquid');
    expect(app.doc.activeElement.getAttribute('data-cs-select')).toBe('c3');
    assign('c4', 'liquid');
    assign('c5', 'gas');
    assign('c6', 'gas');

    // First attempt: 5/6 -> retry with misconception recorded
    app.doc.querySelector('[data-cs-check]').click();
    expect(app.doc.querySelector('[data-cs-grade="wrong"]')).toBeTruthy();

    // Fix c1 into solid and submit second try
    assign('c1', 'solid');
    app.doc.querySelector('[data-cs-check]').click();
    const nextBtn = app.doc.querySelector('[data-next]');
    expect(nextBtn.hidden).toBe(false);
    nextBtn.click();

    // Save JSON and verify misconception + retry recovery
    app.doc.querySelector('[data-save-json]').click();
    const savedJson = await app.readSaved('.json');
    expect(savedJson).toBeTruthy();
    const parsed = loader.parseResult(savedJson.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.summary.afterRetry).toBe(1);
    expect(parsed.result.items[0].correct).toBe(true);
    expect(parsed.result.items[0].responses[0]).toContain('Ice cube->Liquid');
    expect(parsed.result.items[0].responses[1]).toContain('6/6 sorted');

    // Check mode (probe) scoring test
    const checkBuilt = choice.buildChoicePacket({
      title: 'Matter Check',
      activity: 'concept_sort',
      mode: 'probe',
      items: [tpl.item],
      adapters,
      loader,
    });
    const checkApp = bootPacket(checkBuilt.html);
    const clock = advanceDelay(checkApp.win, 500);
    checkApp.start('Fox9');
    checkApp.doc.querySelector('[data-check-begin]').click();
    clock.bump(500);
    for (const card of tpl.item.cards) {
      const sel = checkApp.doc.querySelector(`[data-cs-select="${card.id}"]`);
      sel.value = card.category;
      sel.dispatchEvent(new checkApp.win.Event('change', { bubbles: true }));
    }
    checkApp.doc.querySelector('[data-cs-check]').click();
    checkApp.doc.querySelector('[data-save-json]').click();
    const checkJson = await checkApp.readSaved('.json');
    const checkParsed = loader.parseResult(checkJson.text);
    expect(checkParsed.ok).toBe(true);
    expect(checkParsed.result.mode).toBe('probe');
    expect(checkParsed.result.score.scoreUnit).toBe('items_correct');
    expect(checkParsed.result.score.itemsCorrect).toBe(1);
  });

  it('Sequence Order: deterministically shuffles, supports Up/Down and click-to-place, and scores both Practice and Check modes', async () => {
    const tpl = choice.templateById('sci_water_cycle_seq');
    const built = choice.buildChoicePacket({
      title: tpl.title,
      activity: 'sequence_order',
      items: [tpl.item],
      adapters,
      loader,
    });
    const app = bootPacket(built.html);
    app.start('River3');

    const getOrder = () => Array.from(app.doc.querySelectorAll('[data-sq-step]')).map((n) => n.getAttribute('data-sq-step'));
    const wantOrder = ['s1', 's2', 's3', 's4'];
    expect(getOrder()).not.toEqual(wantOrder);

    // Exercise click-to-place ("Place" -> "Place at #1") for s1, then Up/Down & slot select for the rest
    if (getOrder()[0] !== 's1') {
      app.doc.querySelector('[data-sq-pick="s1"]').click();
      app.doc.querySelector('[data-sq-place-at="0"]').click();
    }
    expect(getOrder()[0]).toBe('s1');

    // Arrange remaining steps via slot picker / Up button
    for (let targetIdx = 1; targetIdx < wantOrder.length; targetIdx++) {
      const id = wantOrder[targetIdx];
      const sel = app.doc.querySelector(`[data-sq-slot="${id}"]`);
      sel.value = String(targetIdx);
      sel.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    }
    expect(getOrder()).toEqual(wantOrder);

    // Quick Up/Down + boundary focus check: move s2 up to index 0 (disabling Up) -> focus falls back to enabled Down!
    app.doc.querySelector('[data-sq-up="s2"]').click();
    expect(getOrder()[0]).toBe('s2');
    expect(app.doc.activeElement).not.toBe(app.doc.body);
    expect(app.doc.activeElement.getAttribute('data-sq-down')).toBe('s2');
    expect(app.doc.activeElement.disabled).toBe(false);
    // Move s2 back to index 1
    app.doc.querySelector('[data-sq-down="s2"]').click();
    expect(getOrder()).toEqual(wantOrder);

    // Quick Up/Down check at bottom boundary: move s4 up then back down to last index (disabling Down -> focuses Up)
    app.doc.querySelector('[data-sq-up="s4"]').click();
    expect(getOrder()[2]).toBe('s4');
    app.doc.querySelector('[data-sq-down="s4"]').click();
    expect(getOrder()).toEqual(wantOrder);
    expect(app.doc.activeElement.getAttribute('data-sq-up')).toBe('s4');
    expect(app.doc.activeElement.disabled).toBe(false);

    app.doc.querySelector('[data-sq-check]').click();
    app.doc.querySelector('[data-next]').click();
    app.doc.querySelector('[data-save-json]').click();
    const parsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.summary.firstTry).toBe(1);
    expect(parsed.result.items[0].responses[0]).toContain('4/4 | order:1,2,3,4');

    // Check mode (probe) scoring test for Sequence Order
    const seqCheck = choice.buildChoicePacket({
      title: 'Water Cycle Check',
      activity: 'sequence_order',
      mode: 'probe',
      items: [tpl.item],
      adapters,
      loader,
    });
    const seqApp = bootPacket(seqCheck.html);
    const clock = advanceDelay(seqApp.win, 500);
    seqApp.start('Hawk6');
    seqApp.doc.querySelector('[data-check-begin]').click();
    clock.bump(500);
    for (let targetIdx = 0; targetIdx < wantOrder.length; targetIdx++) {
      const id = wantOrder[targetIdx];
      const sel = seqApp.doc.querySelector(`[data-sq-slot="${id}"]`);
      sel.value = String(targetIdx);
      sel.dispatchEvent(new seqApp.win.Event('change', { bubbles: true }));
    }
    seqApp.doc.querySelector('[data-sq-check]').click();
    seqApp.doc.querySelector('[data-save-json]').click();
    const seqCheckParsed = loader.parseResult((await seqApp.readSaved('.json')).text);
    expect(seqCheckParsed.ok).toBe(true);
    expect(seqCheckParsed.result.mode).toBe('probe');
    expect(seqCheckParsed.result.score.scoreUnit).toBe('items_correct');
    expect(seqCheckParsed.result.score.itemsCorrect).toBe(1);
  });

  it('Tiered Writing: supports 3 toggleable scaffold levels, word bank, live word count, rubric, print sheet, and logs scaffold supports', async () => {
    const tpl = choice.templateById('ela_claim_evidence_write');
    const built = choice.buildChoicePacket({
      title: tpl.title,
      activity: 'tiered_writing',
      items: [tpl.item],
      adapters,
      loader,
    });
    const app = bootPacket(built.html);
    app.start('Pine2');

    // Starts at Level 1 (frames + word bank)
    expect(app.doc.querySelector('[data-tw-level="frames"]').getAttribute('aria-pressed')).toBe('true');
    const bankChips = app.doc.querySelectorAll('[data-tw-bank-word]');
    expect(bankChips.length).toBeGreaterThanOrEqual(4);
    bankChips[0].click();
    bankChips[1].click();
    expect(app.doc.querySelector('[data-tw-wordcount]').textContent).toMatch(/Words:\s*\d+/);

    // Switch to Level 2 (Sentence Starters + Checklist) — carries over assembled text
    app.doc.querySelector('[data-tw-level="starters"]').click();
    expect(app.doc.querySelector('[data-tw-level="starters"]').getAttribute('aria-pressed')).toBe('true');
    app.doc.querySelector('[data-tw-starter]').click();
    app.doc.querySelector('[data-tw-check="0"]').click();
    app.doc.querySelector('[data-tw-check="1"]').click();

    // Switch to Level 3 (Independent + Checklist) and write full response
    app.doc.querySelector('[data-tw-level="independent"]').click();
    const editor = app.doc.querySelector('[data-tw-editor]');
    editor.value = 'Schools should build outdoor science gardens because students show higher hands-on engagement, measure plant growth in math, and donate fresh greens to the cafeteria even when summer volunteers are needed.';
    editor.dispatchEvent(new app.win.Event('input', { bubbles: true }));
    expect(app.doc.querySelector('[data-tw-wordcount]').textContent).toContain('Words: 30');

    // Trigger print helper
    app.doc.querySelector('[data-tw-print-btn]').click();
    expect(app.win.__printed).toBe(1);
    expect(app.doc.querySelector('[data-tw-print-text]').textContent).toContain('outdoor science gardens');

    // Finish writing & inspect saved JSON
    app.doc.querySelector('[data-tw-submit]').click();
    app.doc.querySelector('[data-next]').click();
    app.doc.querySelector('[data-save-json]').click();
    const parsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsed.ok).toBe(true);
    const it0 = parsed.result.items[0];
    expect(it0.correct).toBe(true);
    expect(it0.supports.scaffold_independent).toBe(1);
    expect(it0.supports.scaffold_switch).toBeGreaterThanOrEqual(2);
    expect(it0.supports.word_bank_tap).toBeGreaterThanOrEqual(2);
    expect(it0.supports.starter_tap).toBe(1);
    expect(it0.supports.checklist_checked).toBe(2);
    expect(it0.responses[0]).toMatch(/^L3\(indep\) 30w c2\/3:/);
  });

  it('Choice Board: switches pathways before finishing, records mastery + chosen modality in CSV, JSON, and Sealed QR, and renders RTL Bilingual overlay', async () => {
    const keys = qrCrypto.generateKeyPair('Choice Teacher');
    const tpl = choice.templateById('sci_ecosystems_choice');
    const built = choice.buildChoicePacket({
      title: tpl.title,
      activity: 'choice_board',
      items: [tpl.item],
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: [{ en: 'producers', translations: { es: 'productores', ar: 'المنتجون' } }],
      qrPublicKey: keys.publicKey,
      adapters,
      loader,
      stationBilingual,
      qrCrypto,
    });

    const app = bootPacket(built.html);
    app.start('Cedar8');

    // Verify Bilingual home-language overlay with RTL Arabic
    const arBtn = app.doc.querySelector('[data-bilingual-lang="ar"]');
    expect(arBtn).toBeTruthy();
    arBtn.click();
    const rtlNode = app.doc.querySelector('[data-bilingual-banner][dir="rtl"]');
    expect(rtlNode).toBeTruthy();

    // Pick Tiered Writing first, then switch before finishing to Concept Sort
    app.doc.querySelector('[data-cb-pick="tiered_writing"]').click();
    app.doc.querySelector('[data-cb-switch]').click();
    app.doc.querySelector('[data-cb-pick="concept_sort"]').click();

    const sortCards = tpl.item.pathways[0].data.cards;
    for (const c of sortCards) {
      const sel = app.doc.querySelector(`[data-cs-select="${c.id}"]`);
      sel.value = c.category;
      sel.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    }
    app.doc.querySelector('[data-cs-check]').click();
    expect(app.doc.querySelector('[data-cb-switch]').hidden).toBe(true);
    app.doc.querySelector('[data-next]').click();

    // 1. JSON check
    app.doc.querySelector('[data-save-json]').click();
    const jsonFile = await app.readSaved('.json');
    const parsedJson = loader.parseResult(jsonFile.text);
    expect(parsedJson.ok).toBe(true);
    expect(parsedJson.result.items[0].correct).toBe(true);
    expect(parsedJson.result.items[0].supports.modality_concept_sort).toBe(1);
    expect(parsedJson.result.items[0].supports.modality_switch).toBe(1);
    expect(parsedJson.result.items[0].responses[0]).toMatch(/^mod:concept_sort \| 6\/6 sorted/);

    // 2. CSV check
    app.doc.querySelector('[data-save-csv]').click();
    const csvFile = await app.readSaved('.csv');
    expect(csvFile.text).toContain('modality_concept_sort:1');
    expect(csvFile.text).toContain('mod:concept_sort | 6/6 sorted');

    // 3. Sealed QR check (decrypt with teacher secret key!)
    app.doc.querySelector('[data-qr-toggle]').click();
    const qrCodeText = app.doc.querySelector('[data-qr-code]').textContent.trim();
    expect(qrCodeText.startsWith('AFQR1:')).toBe(true);
    const unsealed = qrCrypto.unsealResult(qrCodeText, keys.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.items[0].correct).toBe(true);
    expect(unsealed.result.items[0].supports.modality_concept_sort).toBe(1);
    expect(unsealed.result.items[0].responses[0]).toContain('mod:concept_sort');

    // Also test Cloze / Short-Answer pathway inside ELA Choice Board
    const elaTpl = choice.templateById('ela_story_elements_choice');
    const elaBuilt = choice.buildChoicePacket({
      title: elaTpl.title,
      activity: 'choice_board',
      items: [elaTpl.item],
      adapters,
      loader,
    });
    const elaApp = bootPacket(elaBuilt.html);
    elaApp.start('Wren5');
    elaApp.doc.querySelector('[data-cb-pick="cloze_short"]').click();
    const words = ['setting', 'conflict', 'climax', 'resolution'];
    words.forEach((w, idx) => {
      const inp = elaApp.doc.querySelector(`[data-cz-input="${idx}"]`);
      inp.focus();
      elaApp.doc.querySelector(`[data-cz-word="${w}"]`).click();
    });
    elaApp.doc.querySelector('[data-cz-check]').click();
    elaApp.doc.querySelector('[data-next]').click();
    elaApp.doc.querySelector('[data-save-json]').click();
    const elaParsed = loader.parseResult((await elaApp.readSaved('.json')).text);
    expect(elaParsed.ok).toBe(true);
    expect(elaParsed.result.items[0].correct).toBe(true);
    expect(elaParsed.result.items[0].supports.modality_cloze_short).toBe(1);
    expect(elaParsed.result.items[0].supports.word_bank_tap).toBe(4);

    // Verify Cloze [blank] reveal replaces [blank] cleanly instead of leaving literal [blank]
    const bracketBuilt = choice.buildChoicePacket({
      title: 'Bracket Blank Choice',
      activity: 'choice_board',
      items: [{
        id: 'cb-bracket',
        word: 'Bracket Cloze',
        goal: 'Test bracket blank reveal',
        pathways: [
          {
            id: 'p_cloze',
            kind: 'cloze_short',
            title: 'Bracket Cloze',
            summary: 'Fill in [blank]',
            data: {
              prompt: 'Fill in the blank.',
              questions: [{ id: 'q1', text: 'Water vapor cools during [blank].', answers: ['condensation'] }],
            },
          },
          elaTpl.item.pathways[0],
        ],
      }],
      adapters,
      loader,
    });
    const brApp = bootPacket(bracketBuilt.html);
    brApp.start('Lark7');
    brApp.doc.querySelector('[data-cb-pick="cloze_short"]').click();
    const brInput = brApp.doc.querySelector('[data-cz-input="0"]');
    brInput.value = 'evaporation';
    brApp.doc.querySelector('[data-cz-check]').click();
    brApp.doc.querySelector('[data-cz-check]').click();
    const revealText = brApp.doc.querySelector('[data-cz-reveal]').textContent;
    expect(revealText).toContain('Water vapor cools during condensation.');
    expect(revealText).not.toContain('[blank]');
  });
});

describe('Wave 11 educator maker page (packets-choice.html) & reopen round-trip', () => {
  it('loads packets-choice.html, selects a template, enables Bilingual + Station Mode, builds a verified packet, and reopens it cleanly', () => {
    const html = readRoot('packets-choice.html');
    const dom = new JSDOM(html, { url: 'https://packets.local/packets-choice.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const win = dom.window;
    const doc = win.document;

    let blobCounter = 0;
    const builtBlobs = [];
    win.URL.createObjectURL = (b) => { builtBlobs.push(b); return 'blob:maker-' + (++blobCounter); };
    win.URL.revokeObjectURL = () => {};

    const scripts = [
      'packets-page.js',
      'word_sounds_take_home_loader.js',
      'packet_sort_write_adapters.js',
      'packet_choice_builder.js',
      'packets_station_bilingual.js',
      'packets_qr_crypto.js',
      'packets_verify_core.js',
      'packets_handoff.js',
      'packets_zip.js',
      'packets-choice.js',
    ];
    for (const s of scripts) {
      vm.runInContext(readRoot(s), dom.getInternalVMContext(), { filename: s });
    }
    doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true }));

    // Step 1: pick ELA Story Elements Choice Board template
    const elaCard = doc.querySelector('[data-template-id="ela_story_elements_choice"]');
    expect(elaCard).toBeTruthy();
    elaCard.click();
    doc.getElementById('next-1').click();

    // Step 2: toggle Spanish home language + Station Mode
    const esCheck = doc.querySelector('input[data-lang-code="es"]');
    expect(esCheck).toBeTruthy();
    esCheck.checked = true;
    esCheck.dispatchEvent(new win.Event('change', { bubbles: true }));
    const stationCb = doc.getElementById('f-station-mode');
    stationCb.checked = true;
    stationCb.dispatchEvent(new win.Event('change', { bubbles: true }));

    // Step 3: build file + test batch .zip UI
    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    expect(doc.getElementById('save').hidden).toBe(false);
    expect(doc.getElementById('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:maker-/);
    expect(builtBlobs.length).toBeGreaterThan(0);

    const batchTa = doc.getElementById('f-batch-names');
    batchTa.value = 'Maple1\nCedar2\nBirch3';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(false);
    expect(doc.getElementById('batch-make').textContent).toContain('3 students');

    // Programmatic build + attachQrKey parity + reopen round-trip verification
    const tpl = choice.templateById('ela_story_elements_choice');
    const built = choice.buildChoicePacket({
      title: 'ELA Unit 2 Choice Board',
      activity: 'choice_board',
      items: [tpl.item],
      homeLanguages: ['es'],
      stationMode: true,
      learner: 'Maple12',
      adapters,
      loader,
      stationBilingual,
    });
    const verified = verifyCore.verifyPacket(built.html);
    expect(verified.result).toBe('closed');
    expect(verified.counts.look).toBe(0);
    expect(verified.counts.notExpected).toBe(0);

    const keys = qrCrypto.generateKeyPair('Attach Test');
    const attached = loader.attachQrKey(built.html, keys.publicKey, { qrCrypto });
    expect(attached.ok).toBe(true);
    const verifiedAttached = verifyCore.verifyPacket(attached.html);
    expect(verifiedAttached.result).toBe('closed');
    expect(verifiedAttached.counts.look).toBe(0);
    expect(verifiedAttached.counts.notExpected).toBe(0);

    const reopened = choice.readChoicePacket(built.html, verifyCore);
    expect(reopened.ok).toBe(true);
    expect(reopened.title).toBe('ELA Unit 2 Choice Board');
    expect(reopened.activity).toBe('choice_board');
    expect(reopened.homeLanguages).toEqual(['es']);
    expect(reopened.stationMode).toBe(true);
    expect(reopened.learner).toBe('Maple12');
    expect(reopened.items[0].pathways.length).toBe(3);
  });
});
