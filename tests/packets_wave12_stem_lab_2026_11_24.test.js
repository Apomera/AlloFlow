import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const stem = require(path.join(ROOT, 'packet_stem_lab_builder.js'));
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
    url: 'https://packets.local/stem-student.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      let nextUrl = 1;
      const blobs = new Map();
      win.URL.createObjectURL = (blob) => {
        const u = 'blob:stem-' + (nextUrl++);
        blobs.set(u, blob);
        return u;
      };
      win.URL.revokeObjectURL = () => {};
      const origClick = win.HTMLAnchorElement.prototype.click;
      win.HTMLAnchorElement.prototype.click = function () {
        const dl = this.getAttribute('download');
        const href = this.getAttribute('href');
        if (dl && href && blobs.has(href)) {
          saved.push({ name: dl, blob: blobs.get(href) });
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
    start(learner = 'Aspen6') {
      const inp = doc.getElementById('learner-name');
      if (inp) inp.value = learner;
      const btn = doc.querySelector('button.primary');
      if (!btn) throw new Error('Start button not found');
      btn.click();
    },
  };
}

function makeClock(win, startShift = 500) {
  const origNow = win.Date.now.bind(win.Date);
  const origPerf = win.performance.now.bind(win.performance);
  let shift = startShift;
  win.Date.now = () => origNow() + shift;
  win.performance.now = () => origPerf() + shift;
  return { bump(ms = 500) { shift += ms; } };
}

describe('Wave 12 Mini-STEM Lab static invariants, CSP, a11y, US spelling, and site build drift', () => {
  const html = readRoot('packets-stem-lab.html');
  const css = readRoot('packets-stem-lab.css');
  const jsFiles = ['packet_stem_lab_builder.js', 'packets-stem-lab.js'];

  it('enforces strict CSP, landmarks, proof fold, footer feedback link, and Look inside wording on packets-stem-lab.html', () => {
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

    const fbIdx = html.indexOf('<a href="packets-feedback.html#from-packets-stem-lab">Send feedback</a>');
    const moreIdx = html.indexOf('<a href="./">More from AlloFlow</a>');
    expect(fbIdx).toBeGreaterThan(0);
    expect(moreIdx).toBeGreaterThan(fbIdx);

    expect(html).toContain('<a href="packets-verify.html">Look inside a file</a>');
    expect(html).not.toMatch(/Check a file/i);

    const dom = new JSDOM(html);
    const doc = dom.window.document;
    expect(doc.querySelectorAll('h1').length).toBe(1);
    expect(doc.getElementById('f-teacher-code').getAttribute('type')).toBe('password');
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

  it('enforces CSS invariants, zero markup sinks/URLs/promise/British words, and zero site-build drift', () => {
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

    const british = /practis|standardis|licence|colour|\bmarking\b|\bmarked\b|\btick(?:ed|s)?\b|USB stick|\bwhilst\b|\bmaths\b|favour|behaviour|\bcentre\b/i;
    const promise = /\b(safe|secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i;
    const sinks = /\b(?:innerHTML|outerHTML|insertAdjacentHTML|document\.write)\b/;
    const urls = /https?:\/\//i;

    expect(html).not.toMatch(british);
    expect(html).not.toMatch(promise);
    expect(html).not.toMatch(urls);
    expect(css).not.toMatch(british);
    expect(css).not.toMatch(urls);

    for (const name of jsFiles) {
      const src = readRoot(name);
      expect(src, `${name} sinks`).not.toMatch(sinks);
      expect(src, `${name} urls`).not.toMatch(urls);
      expect(src, `${name} product name`).not.toContain('AlloFlow Packets');
      expect(src, `${name} british`).not.toMatch(british);
      expect(src, `${name} promise`).not.toMatch(promise);
    }

    const plan = siteBuild.plan();
    for (const f of [
      'packets-stem-lab.html',
      'packets-stem-lab.css',
      'packets-stem-lab.js',
      'packet_stem_lab_builder.js',
      'packets_station_bilingual.js',
    ]) {
      expect(plan.files.has(f), `plan includes ${f}`).toBe(true);
    }
  });
});

describe('Wave 12 verifyPacket (closed, look=0, notExpected=0) across all 3 STEM labs', () => {
  it('passes verifyPacket cleanly for all 6 starter labs in Practice & Check, Adaptive, Bilingual RTL, Station Mode, Sealed QR, and attachQrKey', () => {
    const keys = qrCrypto.generateKeyPair('STEM Teacher');
    const allStarters = stem.starters();
    expect(allStarters.length).toBe(6);

    for (const st of allStarters) {
      for (const mode of ['practice', 'probe']) {
        const built = stem.buildStemLabPacket({
          title: st.title,
          activity: st.activity,
          mode,
          items: st.items,
          datasetCsv: st.datasetCsv,
          datasetTitle: st.title,
          unit: st.unit,
          stretchItems: st.stretchItems,
          adaptiveScaffold: mode === 'practice',
          teacherCode: mode === 'probe' ? '7890' : undefined,
          homeLanguages: ['es', 'ar'],
          bilingualGlossary: { current: { es: 'corriente', ar: 'تيار' } },
          stationMode: true,
          qrPublicKey: keys.publicKey,
          loader,
          stationBilingual,
          qrCrypto,
        });
        const report = verifyCore.verifyPacket(built.html);
        expect(report.result, `${st.id} (${mode}) result`).toBe('closed');
        expect(report.counts.look, `${st.id} (${mode}) look`).toBe(0);
        expect(report.counts.notExpected, `${st.id} (${mode}) notExpected`).toBe(0);
      }
    }

    const plainLab = stem.buildStemLabPacket({
      title: allStarters[0].title,
      activity: allStarters[0].activity,
      items: allStarters[0].items,
      loader,
    });
    const attached = loader.attachQrKey(plainLab.html, keys.publicKey, { qrCrypto });
    expect(attached.ok).toBe(true);
    const rep = verifyCore.verifyPacket(attached.html);
    expect(rep.result).toBe('closed');
    expect(rep.counts.look).toBe(0);
    expect(rep.counts.notExpected).toBe(0);
  });
});

describe('Wave 12 STEM Lab end-to-end JSDOM gameplay (Practice, Check, CSV/JSON/Sealed QR)', () => {
  it('Simple Circuit Lab: toggles series/parallel switches with focus retention, solves Ohm law, guards Check empty-submit, and round-trips Sealed QR', async () => {
    // 1. Practice mode series circuit
    const series = stem.starterById('circuit_series_basics');
    const pracBuilt = stem.buildStemLabPacket({
      title: series.title,
      activity: 'stem_circuit',
      mode: 'practice',
      items: series.items,
      adaptiveScaffold: true,
      stretchItems: series.stretchItems,
      loader,
    });
    const app = bootPacket(pracBuilt.html);
    app.start('Spruce4');

    // Item 1: Toggle Switch A only -> circuit stays open, focus stays on sw1
    app.doc.querySelector('[data-cir-sw="sw1"]').click();
    expect(app.doc.activeElement.getAttribute('data-cir-sw')).toBe('sw1');
    expect(app.doc.querySelector('[data-cir-readout]').textContent).toContain('Status: Open');
    app.doc.querySelector('[data-cir-choice="0"]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 2: Close both switches -> Total R: 6 ohms, Total I: 1.00 A
    app.doc.querySelector('[data-cir-sw="sw1"]').click();
    app.doc.querySelector('[data-cir-sw="sw2"]').click();
    expect(app.doc.querySelector('[data-cir-readout]').textContent).toContain('Status: Closed');
    expect(app.doc.querySelector('[data-cir-readout]').textContent).toContain('6 ohms');
    expect(app.doc.querySelector('[data-cir-readout]').textContent).toContain('1.00 A');
    const inp2 = app.doc.querySelector('[data-cir-input]');
    inp2.value = '6';
    app.doc.querySelector('[data-cir-submit]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 3: Current = 1 A
    app.doc.querySelector('[data-cir-input]').value = '1.0';
    app.doc.querySelector('[data-cir-submit]').click();
    app.doc.querySelector('[data-next]').click();

    app.doc.querySelector('[data-save-json]').click();
    const parsedPrac = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsedPrac.ok).toBe(true);
    expect(parsedPrac.result.summary.firstTry).toBe(3);
    expect(parsedPrac.result.items[0].supports.lab_circuit_toggle).toBe(1);

    // 2. Parallel Circuit in Check mode + empty-submit guard + Sealed QR round-trip
    const keys = qrCrypto.generateKeyPair('Circuit Teacher');
    const par = stem.starterById('circuit_parallel_lab');
    const chkBuilt = stem.buildStemLabPacket({
      title: par.title,
      activity: 'stem_circuit',
      mode: 'probe',
      items: par.items,
      qrPublicKey: keys.publicKey,
      loader,
      qrCrypto,
    });
    const chkApp = bootPacket(chkBuilt.html);
    const clock = makeClock(chkApp.win, 600);
    chkApp.start('Birch8');
    chkApp.doc.querySelector('[data-check-begin]').click();

    // Empty submit in Check mode MUST NOT crash (ctx.feedback is absent in Check mode!)
    clock.bump(600);
    expect(() => chkApp.doc.querySelector('[data-cir-submit]').click()).not.toThrow();
    expect(chkApp.doc.querySelector('[data-cir-local-note]').hidden).toBe(false);

    // Toggle Main + Branch 1 -> 1 bulb lit
    chkApp.doc.querySelector('[data-cir-sw="swm"]').click();
    chkApp.doc.querySelector('[data-cir-sw="sw1"]').click();
    expect(chkApp.doc.querySelector('[data-cir-readout]').textContent).toContain('Lit bulbs: 1 of 2');
    chkApp.doc.querySelector('[data-cir-input]').value = '1';
    chkApp.doc.querySelector('[data-cir-submit]').click();

    // Item 2: Close all 3 switches -> 4.00 A
    clock.bump(600);
    chkApp.doc.querySelector('[data-cir-sw="swm"]').click();
    chkApp.doc.querySelector('[data-cir-sw="sw1"]').click();
    chkApp.doc.querySelector('[data-cir-sw="sw2"]').click();
    expect(chkApp.doc.querySelector('[data-cir-readout]').textContent).toContain('4.00 A');
    chkApp.doc.querySelector('[data-cir-input]').value = '4';
    chkApp.doc.querySelector('[data-cir-submit]').click();

    // Item 3: Equivalent R = 3 ohms
    clock.bump(600);
    chkApp.doc.querySelector('[data-cir-input]').value = '3';
    chkApp.doc.querySelector('[data-cir-submit]').click();

    chkApp.doc.querySelector('[data-save-json]').click();
    const chkJson = loader.parseResult((await chkApp.readSaved('.json')).text);
    expect(chkJson.ok).toBe(true);
    expect(chkJson.result.mode).toBe('probe');
    expect(chkJson.result.score.scoreUnit).toBe('items_correct');
    expect(chkJson.result.score.itemsCorrect).toBe(3);

    chkApp.doc.querySelector('[data-qr-toggle]').click();
    const code = chkApp.doc.querySelector('[data-qr-code]').textContent.trim();
    const unsealed = qrCrypto.unsealResult(code, keys.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.score.itemsCorrect).toBe(3);
  });

  it('Data & Graph Explorer: filters CSV groups, switches Bar vs Dot/Range chart, computes live stats, and passes Practice & Check modes', async () => {
    const plant = stem.starterById('data_plant_growth');
    const built = stem.buildStemLabPacket({
      title: plant.title,
      activity: 'stem_data_explorer',
      mode: 'practice',
      items: plant.items,
      datasetCsv: plant.datasetCsv,
      datasetTitle: plant.title,
      unit: plant.unit,
      loader,
    });
    const app = bootPacket(built.html);
    app.start('Cedar2');

    // Filter to Full Sun -> Mean = 16 cm; switch to Dot / Range plot
    app.doc.querySelector('[data-dat-filter="Full Sun"]').click();
    expect(app.doc.querySelector('[data-dat-stat="mean"]').textContent).toBe('16 cm');
    app.doc.querySelector('[data-dat-chart="dot"]').click();
    expect(app.doc.querySelector('[data-dat-dots]')).toBeTruthy();
    app.doc.querySelector('[data-dat-input]').value = '16';
    app.doc.querySelector('[data-dat-submit]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 2: Partial Shade -> Range = 5 cm
    app.doc.querySelector('[data-dat-filter="Partial Shade"]').click();
    expect(app.doc.querySelector('[data-dat-stat="range"]').textContent).toBe('5 cm');
    app.doc.querySelector('[data-dat-input]').value = '5';
    app.doc.querySelector('[data-dat-submit]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 3: Evidence claim MC
    app.doc.querySelector('[data-dat-choice="0"]').click();
    app.doc.querySelector('[data-next]').click();

    app.doc.querySelector('[data-save-json]').click();
    const parsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.summary.firstTry).toBe(3);
    expect(parsed.result.items[0].supports.lab_data_filter).toBe(1);
    expect(parsed.result.items[0].supports.lab_chart_switch).toBe(1);

    // Check mode empty-submit guard
    const ramp = stem.starterById('data_ramp_speed');
    const chk = stem.buildStemLabPacket({
      title: ramp.title,
      activity: 'stem_data_explorer',
      mode: 'probe',
      items: ramp.items,
      datasetCsv: ramp.datasetCsv,
      datasetTitle: ramp.title,
      unit: ramp.unit,
      loader,
    });
    const cApp = bootPacket(chk.html);
    const clock = makeClock(cApp.win, 600);
    cApp.start('Elm9');
    cApp.doc.querySelector('[data-check-begin]').click();
    clock.bump(600);
    expect(() => cApp.doc.querySelector('[data-dat-submit]').click()).not.toThrow();
    expect(cApp.doc.querySelector('[data-dat-local-note]').hidden).toBe(false);
    cApp.doc.querySelector('[data-dat-input]').value = '40';
    cApp.doc.querySelector('[data-dat-submit]').click();
    clock.bump(600);
    cApp.doc.querySelector('[data-dat-input]').value = '60';
    cApp.doc.querySelector('[data-dat-submit]').click();
    clock.bump(600);
    cApp.doc.querySelector('[data-dat-choice="0"]').click();
    cApp.doc.querySelector('[data-save-json]').click();
    const cParsed = loader.parseResult((await cApp.readSaved('.json')).text);
    expect(cParsed.ok).toBe(true);
    expect(cParsed.result.score.scoreUnit).toBe('items_correct');
    expect(cParsed.result.score.itemsCorrect).toBe(3);
  });

  it('Geometry Lab: supports keyboard tile grid, area+perimeter grading, triangle dimensions, angle classification, and ray builder', async () => {
    // 1. Tiles + Dimensions (Practice)
    const gridLab = stem.starterById('geom_area_perimeter');
    const gBuilt = stem.buildStemLabPacket({
      title: gridLab.title,
      activity: 'stem_geometry_grid',
      mode: 'practice',
      items: gridLab.items,
      loader,
    });
    const app = bootPacket(gBuilt.html);
    app.start('Pine7');

    // Verify ARIA role="group" (not invalid role="grid" with direct buttons) and keyboard ArrowRight/ArrowDown navigation
    expect(app.doc.querySelector('[data-geo-grid]').getAttribute('role')).toBe('group');
    const t00 = app.doc.querySelector('[data-geo-tile="0-0"]');
    t00.focus();
    t00.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-geo-tile')).toBe('0-1');
    app.doc.activeElement.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-geo-tile')).toBe('1-1');

    // Item 1: Shade 3x4 = 12 tiles -> Area 12, Perimeter 14
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) app.doc.querySelector(`[data-geo-tile="${r}-${c}"]`).click();
    }
    expect(app.doc.querySelector('[data-geo-readout]').textContent).toContain('Shaded Area: 12 sq units | Perimeter: 14 units');
    app.doc.querySelector('[data-geo-submit]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 2: Area 12 AND Perimeter 14
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) app.doc.querySelector(`[data-geo-tile="${r}-${c}"]`).click();
    }
    app.doc.querySelector('[data-geo-submit]').click();
    app.doc.querySelector('[data-next]').click();

    // Item 3: Right triangle area 15 (start 4x4 -> inc base to 6, inc height to 5 -> 6*5/2 = 15)
    app.doc.querySelector('[data-geo-inc="base"]').click();
    app.doc.querySelector('[data-geo-inc="base"]').click();
    app.doc.querySelector('[data-geo-inc="height"]').click();
    expect(app.doc.querySelector('[data-geo-readout]').textContent).toContain('Area: 15 sq units');
    app.doc.querySelector('[data-geo-submit]').click();
    app.doc.querySelector('[data-next]').click();

    app.doc.querySelector('[data-save-json]').click();
    const gParsed = loader.parseResult((await app.readSaved('.json')).text);
    expect(gParsed.ok).toBe(true);
    expect(gParsed.result.summary.firstTry).toBe(3);

    // 2. Angle Classifier & Ray Builder in Check mode
    const angleLab = stem.starterById('geom_angles_triangles');
    const aBuilt = stem.buildStemLabPacket({
      title: angleLab.title,
      activity: 'stem_geometry_grid',
      mode: 'probe',
      items: angleLab.items,
      loader,
    });
    const aApp = bootPacket(aBuilt.html);
    const clock = makeClock(aApp.win, 600);
    aApp.start('Wren1');
    aApp.doc.querySelector('[data-check-begin]').click();

    // Item 1: 120 deg -> obtuse (key 3)
    clock.bump(600);
    aApp.doc.dispatchEvent(new aApp.win.KeyboardEvent('keydown', { key: '3', bubbles: true }));
    // Item 2: 45 deg -> acute
    clock.bump(600);
    aApp.doc.querySelector('[data-geo-angle-pick="acute"]').click();
    // Item 3: Build 90 deg from 30 deg (+15 three times = 75, +5 three times = 90 — exercises fine 5-deg steps too!)
    clock.bump(600);
    for (let k = 0; k < 3; k++) aApp.doc.querySelector('[data-geo-angle-inc]').click();
    for (let k = 0; k < 3; k++) aApp.doc.querySelector('[data-geo-angle-inc-fine]').click();
    expect(aApp.doc.querySelector('[data-geo-deg]').textContent).toBe('90 deg');
    aApp.doc.querySelector('[data-geo-submit]').click();

    aApp.doc.querySelector('[data-save-json]').click();
    const aParsed = loader.parseResult((await aApp.readSaved('.json')).text);
    expect(aParsed.ok).toBe(true);
    expect(aParsed.result.score.scoreUnit).toBe('items_correct');
    expect(aParsed.result.score.itemsCorrect).toBe(3);

    // Verify boundary initial disabled state (startDeg=5 -> dec buttons start disabled) and 50-deg reachability (+15, +15, +15 = 50)
    const boundBuilt = stem.buildStemLabPacket({
      title: 'Angle Boundary Test',
      activity: 'stem_geometry_grid',
      mode: 'practice',
      items: [{ id: 'geo-b1', word: 'Build 50', prompt: 'Build 50 deg.', geoMode: 'angle', targetType: 'build_angle', startDeg: 5, targetDeg: 50 }],
      loader,
    });
    const bApp = bootPacket(boundBuilt.html);
    bApp.start('Owl3');
    expect(bApp.doc.querySelector('[data-geo-angle-dec]').disabled).toBe(true);
    expect(bApp.doc.querySelector('[data-geo-angle-dec-fine]').disabled).toBe(true);
    for (let k = 0; k < 3; k++) bApp.doc.querySelector('[data-geo-angle-inc]').click();
    expect(bApp.doc.querySelector('[data-geo-deg]').textContent).toBe('50 deg');
    bApp.doc.querySelector('[data-geo-submit]').click();
    expect(bApp.doc.querySelector('[data-next]').hidden).toBe(false);

    // Verify dims mode supports perimeter target in Practice mode (not just area)
    const perimDimsBuilt = stem.buildStemLabPacket({
      title: 'Dims Perimeter Test',
      activity: 'stem_geometry_grid',
      mode: 'practice',
      items: [{
        id: 'geo-dp1',
        word: 'Perimeter Rectangle',
        prompt: 'Build a rectangle with perimeter 18.',
        geoMode: 'dims',
        shape: 'rectangle',
        startBase: 4,
        startHeight: 4,
        maxDim: 10,
        targetType: 'perimeter',
        targetPerimeter: 18,
      }],
      loader,
    });
    const dpApp = bootPacket(perimDimsBuilt.html);
    dpApp.start('Fox6');
    // Start is 4x4 (perim 16) -> wrong first try -> increase base to 5 (5x4 -> perim 18) -> correct
    dpApp.doc.querySelector('[data-geo-submit]').click();
    expect(dpApp.doc.querySelector('[data-next]').hidden).toBe(true);
    dpApp.doc.querySelector('[data-geo-inc="base"]').click();
    expect(dpApp.doc.querySelector('[data-geo-readout]').textContent).toContain('Perimeter: 18 units');
    dpApp.doc.querySelector('[data-geo-submit]').click();
    expect(dpApp.doc.querySelector('[data-next]').hidden).toBe(false);
  });
});

describe('Wave 12 educator maker page (packets-stem-lab.html) & reopen round-trip', () => {
  it('loads packets-stem-lab.html, updates default title when switching radios, builds verified packet, and reopens Practice & Check files', async () => {
    const html = readRoot('packets-stem-lab.html');
    const dom = new JSDOM(html, { url: 'https://packets.local/packets-stem-lab.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const win = dom.window;
    const doc = win.document;

    let blobCounter = 0;
    const builtBlobs = [];
    win.URL.createObjectURL = (b) => { builtBlobs.push(b); return 'blob:stem-maker-' + (++blobCounter); };
    win.URL.revokeObjectURL = () => {};

    const scripts = [
      'packets-page.js',
      'word_sounds_take_home_loader.js',
      'packet_stem_lab_builder.js',
      'packets_station_bilingual.js',
      'packets_qr_crypto.js',
      'packets_verify_core.js',
      'packets_handoff.js',
      'packets_zip.js',
      'packets-stem-lab.js',
    ];
    for (const s of scripts) {
      vm.runInContext(readRoot(s), dom.getInternalVMContext(), { filename: s });
    }
    doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true }));

    // Switch lab radio from Circuit Lab to Data & Graph Explorer -> verify default title updates cleanly!
    const dataRadio = doc.querySelector('input[name="activity"][value="stem_data_explorer"]');
    dataRadio.checked = true;
    dataRadio.dispatchEvent(new win.Event('change', { bubbles: true }));
    doc.getElementById('next-1').click();

    // Toggle Spanish + Station Mode -> build in Step 3
    const esCb = doc.querySelector('input[data-lang-code="es"]');
    esCb.checked = true;
    esCb.dispatchEvent(new win.Event('change', { bubbles: true }));
    doc.getElementById('f-station-mode').checked = true;
    doc.getElementById('f-station-mode').dispatchEvent(new win.Event('change', { bubbles: true }));

    doc.getElementById('next-2').click();
    expect(doc.getElementById('f-title').value).toBe('Plant Growth Data Explorer');
    expect(doc.getElementById('summary').hidden).toBe(false);
    expect(doc.getElementById('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:stem-maker-/);
    expect(builtBlobs.length).toBeGreaterThan(0);

    const batchTa = doc.getElementById('f-batch-names');
    batchTa.value = 'Maple1\nCedar2';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(false);

    // Reopen round-trip
    const st = stem.starterById('data_plant_growth');
    const built = stem.buildStemLabPacket({
      title: 'Plant Growth Check',
      activity: 'stem_data_explorer',
      mode: 'probe',
      items: st.items,
      datasetCsv: st.datasetCsv,
      datasetTitle: st.title,
      unit: st.unit,
      homeLanguages: ['es'],
      stationMode: true,
      learner: 'Maple1',
      loader,
      stationBilingual,
    });
    const reopened = stem.readStemLabPacket(built.html, verifyCore);
    expect(reopened.ok).toBe(true);
    expect(reopened.title).toBe('Plant Growth Check');
    expect(reopened.activity).toBe('stem_data_explorer');
    expect(reopened.mode).toBe('probe');
    expect(reopened.homeLanguages).toEqual(['es']);
    expect(reopened.stationMode).toBe(true);
    expect(reopened.learner).toBe('Maple1');
    expect(reopened.datasetCsv).toContain('Full Sun');

    // Reopen a sealed Geometry Check in the maker UI -> must show '?' instead of 'undefined'
    const geoSt = stem.starterById('geom_area_perimeter');
    const geoCheck = stem.buildStemLabPacket({
      title: 'Sealed Geo Check',
      activity: 'stem_geometry_grid',
      mode: 'probe',
      items: geoSt.items,
      loader,
    });
    const reopenGeo = new win.File([geoCheck.html], 'sealed-geo-check.html', { type: 'text/html' });
    const reopenInput = doc.getElementById('reopen-file');
    Object.defineProperty(reopenInput, 'files', { value: [reopenGeo], configurable: true });
    reopenInput.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 25));
    const geoQsVal = doc.getElementById('f-geo-qs').value;
    expect(geoQsVal).not.toContain('undefined');
    expect(geoQsVal).toContain('area=?');
  });
});
