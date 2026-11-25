import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(__dirname, '..');
require(path.join(ROOT, 'word_sounds_take_home_loader.js'));
const loader = globalThis.AlloWordSoundsTakeHome;
const aac = require(path.join(ROOT, 'packet_aac_builder.js'));
const verifyCore = require(path.join(ROOT, 'packets_verify_core.js'));
const stationBilingual = require(path.join(ROOT, 'packets_station_bilingual.js'));
const qrCrypto = require(path.join(ROOT, 'packets_qr_crypto.js'));
const siteBuild = require(path.join(ROOT, 'dev-tools', 'build_packets_site.cjs'));

function readRoot(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

// Minimal valid 1x1 transparent PNG and minimal valid PCM WAV base64 data URIs for local media tests
const SAMPLE_PNG_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const SAMPLE_WAV_URI = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

function bootPacket(html, opts = {}) {
  const saved = [];
  const spoken = [];
  const audioPlayed = [];
  const voiceListeners = new Set();
  const dom = new JSDOM(html, {
    url: 'https://packets.local/aac-board.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    beforeParse(win) {
      let nextUrl = 1;
      const blobs = new Map();
      win.URL.createObjectURL = (blob) => {
        const u = 'blob:aac-' + (nextUrl++);
        blobs.set(u, blob);
        return u;
      };
      win.URL.revokeObjectURL = () => {};
      win.Audio = class {
        constructor() { this.src = ''; this.paused = true; this.playbackRate = 1; }
        play() {
          this.paused = false;
          audioPlayed.push(this.src);
          setTimeout(() => { this.paused = true; if (typeof this.onended === 'function') this.onended(); }, 0);
          return Promise.resolve();
        }
        pause() { this.paused = true; }
      };
      if (opts.voices !== undefined) {
        win.SpeechSynthesisUtterance = class {
          constructor(text) {
            this.text = text;
            this.voice = null;
            this.lang = '';
            this.rate = 1;
          }
        };
        win.speechSynthesis = {
          getVoices: () => opts.voices,
          speak: (u) => { spoken.push({ text: u.text, lang: u.lang, rate: u.rate, voiceName: u.voice && u.voice.name, localService: u.voice && u.voice.localService }); },
          cancel: () => {},
          addEventListener: (ev, fn) => { if (ev === 'voiceschanged') voiceListeners.add(fn); },
          removeEventListener: (ev, fn) => { if (ev === 'voiceschanged') voiceListeners.delete(fn); },
        };
      }
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
    spoken,
    audioPlayed,
    voiceListeners,
    async readSaved(ext) {
      const hit = saved.filter((s) => s.name.endsWith(ext)).pop();
      if (!hit) return null;
      return { name: hit.name, text: await hit.blob.text() };
    },
    openBoard(learner = 'Sam') {
      const inp = doc.getElementById('learner-name');
      if (inp) inp.value = learner;
      const btn = doc.querySelector('button.primary');
      if (!btn) throw new Error('Start button not found');
      btn.click();
    },
  };
}

describe('Wave 13 Offline AAC static invariants, CSP, a11y, US spelling, and site build drift', () => {
  const html = readRoot('packets-aac.html');
  const css = readRoot('packets-aac.css');
  const jsFiles = ['packet_aac_builder.js', 'packets-aac.js'];

  it('enforces strict CSP, landmarks, proof fold, footer feedback link, exact file count, and Look inside wording on packets-aac.html', () => {
    expect(html).toMatch(/^<!doctype html>\s*<html lang="en">/i);
    const cspMatch = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i);
    expect(cspMatch).toBeTruthy();
    const csp = cspMatch[1];
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("media-src data:");
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

    // Exact file count & MB estimate check
    const refs = [...html.matchAll(/<(?:script|link)\b[^>]*?\s(?:src|href)="([^"]+)"/gi)].map((m) => m[1]);
    const loadedFiles = ['packets-aac.html', ...refs];
    expect(loadedFiles.length).toBe(14);
    expect(html).toContain('<span id="file-count">fourteen</span>');
    const totalBytes = loadedFiles.reduce((sum, f) => sum + fs.statSync(path.join(ROOT, f)).size, 0);
    const actualMb = totalBytes / (1024 * 1024);
    const mbMatch = html.match(/about\s+([0-9.]+)\s+MB/i);
    expect(mbMatch).toBeTruthy();
    expect(Math.abs(Number(mbMatch[1]) - actualMb)).toBeLessThan(0.15);

    const fbIdx = html.indexOf('<a href="packets-feedback.html#from-packets-aac">Send feedback</a>');
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

  it('keeps packets-aac.css token-driven without hex before @media print, and keeps JS/HTML free of innerHTML, URLs, promise words, and UK spelling', () => {
    expect(css).not.toMatch(/:root\b/);
    expect(css).not.toMatch(/--[a-z0-9-]+\s*:/i);
    expect(css).not.toMatch(/@import\b|url\s*\(|@font-face\b|@keyframes\b|\banimation\b/i);
    const beforePrint = css.split(/@media\s+print/i)[0];
    expect(beforePrint).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(css).toContain(':focus-visible');
    expect(css).toContain('prefers-reduced-motion');
    expect(css).toContain('forced-colors: active');
    expect(css).toContain('@media print');
    expect(css).toContain('.print-cat-pronoun');
    expect(css).toContain('.print-cat-verb');
    expect(css).toContain('.print-cat-noun');
    expect(css).toContain('.print-cat-descriptor');
    expect(css).toContain('.print-cat-social');
    expect(css).toContain('.print-cat-question');

    for (const f of jsFiles) {
      const src = readRoot(f);
      expect(src).not.toMatch(/\binnerHTML\b|\bouterHTML\b|\binsertAdjacentHTML\b|\bdocument\.write\b/);
      expect(src).not.toMatch(/https?:\/\//i);
      expect(src).not.toMatch(/AlloFlow Packets/);
      expect(src).not.toMatch(/\bAI\b/);
      expect(src).not.toMatch(/\bgetUserMedia\b|\bSpeechRecognition\b|\bMediaRecorder\b/);
      expect(src).not.toMatch(/\b(practise|colour|centre|maths)\b/i);
    }
    const visibleText = new JSDOM(html).window.document.body.textContent;
    expect(visibleText).not.toMatch(/\b(practise|colour|centre|maths)\b/i);
    expect(visibleText).not.toMatch(/\b(safe|secure|guarantee|certif\w*|compliant|tamper-proof|trusted|bulletproof)\b/i);
    expect(visibleText).not.toContain('!');

    const plan = siteBuild.plan();
    for (const f of ['packets-aac.html', 'packet_aac_builder.js', 'packets-aac.js', 'packets-aac.css', 'packets_station_bilingual.js']) {
      expect(plan.files.has(f), `plan includes ${f}`).toBe(true);
    }
  });
});

describe('Wave 13 Offline AAC Builder & verifyPacket parity', () => {
  it('passes verifyPacket cleanly (result=closed, look=0, notExpected=0) for all 5 starters, all grid layouts, media uploads, Bilingual RTL, Station Mode, Sealed QR, and attachQrKey', () => {
    const keys = qrCrypto.generateKeyPair();
    for (const st of aac.starters()) {
      const built = aac.buildAacPacket({
        title: st.title,
        starterId: st.id,
        gridLayout: st.gridLayout,
        lang: st.lang,
        folders: st.folders,
        homeLanguages: st.defaultHomeLanguages.length ? st.defaultHomeLanguages : undefined,
        loader,
        stationBilingual,
      });
      const rep = verifyCore.verifyPacket(built.html);
      expect(rep.result, st.id).toBe('closed');
      expect(rep.counts.look, st.id).toBe(0);
      expect(rep.counts.notExpected, st.id).toBe(0);
      expect(built.manifest.speech.engine).toBe('speechSynthesis');
      expect(built.manifest.aac.gridLayout).toBe(st.gridLayout);
      expect(built.html).toContain('forced-colors: active');
      expect(built.html).toContain('[data-lt-colors="1"] .aac-tile');
      expect(built.html).toContain('[data-lt-colors="3"] .aac-tile');
      expect(built.html).toContain('@media (prefers-color-scheme:dark)');
      expect(built.html).not.toContain('body[data-colors=');
      expect(built.html).toContain('.aac-tab.is-active{border-color:var(--accent);background:var(--accent);color:var(--accent-ink)}');
      expect(built.html).toContain('.aac-chip{display:inline-flex;align-items:center;gap:6px;min-height:44px');
      expect(built.html).toContain('.aac-cat-pronoun');
      expect(built.html).toContain('.aac-cat-verb');
      expect(built.html).toContain('.aac-cat-noun');
      expect(built.html).toContain('.aac-cat-descriptor');
      expect(built.html).toContain('.aac-cat-social');
      expect(built.html).toContain('.aac-cat-question');
    }

    // Disallow svg+xml in validateMediaDataUri while permitting PNG/JPEG/WebP/GIF
    expect(aac.validateMediaDataUri('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', 'image')).toBe('');
    expect(aac.validateMediaDataUri(SAMPLE_PNG_URI, 'image')).toBe(SAMPLE_PNG_URI);

    // All grid layouts + Bilingual RTL (ar, es) + Station Mode + Sealed QR + embedded PNG & WAV media
    const base = aac.starterById('core_16_first_words');
    const customFolders = aac.normalizeFolders(base.folders);
    customFolders[0].tiles[0].imageId = 'img_i';
    customFolders[0].tiles[0].audioId = 'aud_i';
    const full = aac.buildAacPacket({
      title: 'Full Feature AAC Board',
      gridLayout: '5x4',
      folders: customFolders,
      images: { img_i: SAMPLE_PNG_URI },
      audio: { aud_i: SAMPLE_WAV_URI },
      homeLanguages: ['es', 'ar'],
      bilingualGlossary: { help: { es: 'ayuda', ar: '\u0645\u0633\u0627\u0639\u062f\u0629' } },
      stationMode: true,
      qrPublicKey: keys.publicKey,
      learner: 'A&B<1>',
      loader,
      qrCrypto,
      stationBilingual,
    });
    const fullRep = verifyCore.verifyPacket(full.html);
    expect(fullRep.result).toBe('closed');
    expect(fullRep.counts.look).toBe(0);
    expect(fullRep.counts.notExpected).toBe(0);
    expect(fullRep.counts.pictures).toBeGreaterThanOrEqual(1);
    expect(fullRep.counts.sounds).toBeGreaterThanOrEqual(1);
    expect(aac.codeName(full.html)).toBe('A&B<1>');

    // attachQrKey parity on an unsealed AAC packet
    const plain = aac.buildAacPacket({ title: 'Plain AAC', gridLayout: '2x2', folders: base.folders, loader });
    const attached = loader.attachQrKey(plain.html, keys.publicKey, { qrCrypto });
    expect(attached.ok).toBe(true);
    const attRep = verifyCore.verifyPacket(attached.html);
    expect(attRep.result).toBe('closed');
    expect(attRep.counts.look).toBe(0);
    expect(attRep.counts.notExpected).toBe(0);

    // withCodeName special character escaping
    const named = aac.withCodeName(plain.html, 'Lee\u2028<script>&1');
    expect(aac.codeName(named)).toBe('Lee\u2028<script>&1');
    expect(verifyCore.verifyPacket(named).result).toBe('closed');
  });
});

describe('Wave 13 Offline AAC Interactive Runtime (Sentence Strip, Local Speech, Keyboard & Switch Scan, Carryover Log)', () => {
  it('builds sentences across Core & Fringe tabs, speaks with localService-only voices (rejecting cloud voices), plays embedded audio clips, and supports Mute/Backspace/Clear', async () => {
    const base = aac.starterById('core_16_first_words');
    const folders = aac.normalizeFolders(base.folders);
    folders[0].tiles[0].imageId = 'img_i';
    folders[0].tiles[0].audioId = 'aud_i';
    const built = aac.buildAacPacket({
      title: 'Core 16 Board',
      gridLayout: '4x4',
      folders,
      images: { img_i: SAMPLE_PNG_URI },
      audio: { aud_i: SAMPLE_WAV_URI },
      loader,
    });

    // 1) Cloud-only voice (localService: false) MUST be rejected and show visible banner
    const cloudApp = bootPacket(built.html, {
      voices: [{ name: 'Cloud Voice', lang: 'en-US', localService: false }],
    });
    cloudApp.openBoard('Riley');
    const banner = cloudApp.doc.querySelector('[data-aac-voice-banner]');
    expect(banner.hidden).toBe(false);
    expect(banner.textContent).toContain('Recorded teacher clips');
    cloudApp.doc.querySelector('[data-aac-tile="c5"]').click(); // "want" (no audio clip)
    expect(cloudApp.spoken.length).toBe(0); // cloud voice never called!

    // 2) Local voice (localService: true) + embedded audio clip + Core/Fringe tabs + Sentence Strip
    const localApp = bootPacket(built.html, {
      voices: [
        { name: 'Cloud EN', lang: 'en-US', localService: false },
        { name: 'Local EN', lang: 'en-US', localService: true },
        { name: 'Local ES', lang: 'es-ES', localService: true },
      ],
    });
    localApp.openBoard('Jordan');
    expect(localApp.doc.querySelector('[data-aac-voice-banner]').hidden).toBe(true);

    // Tile with uploaded picture renders <img> cleanly
    const imgEl = localApp.doc.querySelector('[data-aac-tile="c1"] img.aac-tile-img');
    expect(imgEl).toBeTruthy();
    expect(imgEl.getAttribute('src')).toBe(SAMPLE_PNG_URI);

    // Tap "I" (embedded audio clip -> plays audio clip) + "want" (local TTS)
    localApp.doc.querySelector('[data-aac-tile="c1"]').click();
    expect(localApp.audioPlayed.length).toBe(1);
    expect(localApp.audioPlayed[0]).toBe(SAMPLE_WAV_URI);

    localApp.doc.querySelector('[data-aac-tile="c5"]').click(); // "want"
    expect(localApp.spoken.length).toBe(1);
    expect(localApp.spoken[0].text).toBe('want');
    expect(localApp.spoken[0].localService).toBe(true);
    expect(localApp.spoken[0].voiceName).toBe('Local EN');

    // Switch to Quick Needs fringe tab and tap "water"
    const needsTab = localApp.doc.querySelector('[data-aac-tab="needs"]');
    needsTab.click();
    expect(needsTab.getAttribute('aria-selected')).toBe('true');
    localApp.doc.querySelector('[data-aac-tile="n1"]').click(); // "water"

    // Verify 3 chips in strip ("I", "want", "water")
    const chips = localApp.doc.querySelectorAll('[data-aac-chip]');
    expect(chips.length).toBe(3);
    expect(Array.from(chips).map((c) => c.textContent)).toEqual(['\uD83D\uDC64I', '\uD83E\uDEF4want', '\uD83D\uDCA7water']);

    // Adjust speech rate to 0.85x and press Speak sentence
    const rateSel = localApp.doc.querySelector('[data-aac-rate]');
    rateSel.value = '0.85';
    rateSel.dispatchEvent(new localApp.win.Event('change', { bubbles: true }));
    localApp.doc.querySelector('[data-aac-speak]').click();
    const lastSpoken = localApp.spoken[localApp.spoken.length - 1];
    expect(lastSpoken.text).toBe('I want water');
    expect(lastSpoken.rate).toBe(0.85);
    expect(lastSpoken.localService).toBe(true);

    // Backspace removes "water"; Mute shows explicit banner; Clear empties strip
    localApp.doc.querySelector('[data-aac-backspace]').click();
    expect(localApp.doc.querySelectorAll('[data-aac-chip]').length).toBe(2);

    localApp.doc.querySelector('[data-aac-mute]').click();
    expect(localApp.doc.querySelector('[data-aac-voice-banner]').hidden).toBe(false);
    expect(localApp.doc.querySelector('[data-aac-voice-banner]').textContent).toContain('Speech is muted');
    const beforeMutedCount = localApp.spoken.length;
    localApp.doc.querySelector('[data-aac-speak]').click();
    expect(localApp.spoken.length).toBe(beforeMutedCount);

    localApp.doc.querySelector('[data-aac-clear]').click();
    expect(localApp.doc.querySelectorAll('[data-aac-chip]').length).toBe(0);
    expect(localApp.doc.querySelector('[data-aac-speak]').disabled).toBe(true);

    // Bilingual Core EN/ES picks local Spanish voice on Spanish tab
    const biStarter = aac.starterById('bilingual_core_en_es');
    const biBuilt = aac.buildAacPacket({
      title: biStarter.title,
      gridLayout: biStarter.gridLayout,
      folders: biStarter.folders,
      homeLanguages: ['es'],
      loader,
      stationBilingual,
    });
    const biApp = bootPacket(biBuilt.html, {
      voices: [
        { name: 'Local EN', lang: 'en-US', localService: true },
        { name: 'Local ES', lang: 'es-MX', localService: true },
      ],
    });
    biApp.openBoard('Mateo');
    expect(biApp.doc.querySelector('[data-aac-grid]').getAttribute('role')).toBe('tabpanel');
    biApp.doc.querySelector('[data-aac-tab="core-es"]').click();
    biApp.doc.querySelector('[data-aac-tile="bs2"]').click(); // "quiero"
    expect(biApp.spoken[0].text).toBe('quiero');
    expect(biApp.spoken[0].voiceName).toBe('Local ES');
  });

  it('supports 2D Arrow-key navigation, Auto-Scan (1-switch) and Step-Scan (2-switch) row-column scanning, and non-scored carryover CSV/JSON/Sealed QR export', async () => {
    const keys = qrCrypto.generateKeyPair();
    const base = aac.starterById('core_16_first_words');
    const built = aac.buildAacPacket({
      title: 'Switch Scan Core Board',
      gridLayout: '4x4',
      folders: base.folders,
      defaultScanMs: 1000,
      qrPublicKey: keys.publicKey,
      loader,
      qrCrypto,
    });

    const app = bootPacket(built.html, {
      voices: [{ name: 'Local EN', lang: 'en-US', localService: true }],
    });
    app.openBoard('Maya');

    // 2D Arrow-key navigation across 4x4 grid
    const t0 = app.doc.querySelector('[data-aac-pos="0-0"]');
    t0.focus();
    t0.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-aac-pos')).toBe('0-1');
    app.doc.activeElement.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-aac-pos')).toBe('1-1');
    app.doc.activeElement.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(app.doc.activeElement.getAttribute('data-aac-pos')).toBe('1-0');

    // Switch to Two-Switch Step-Scan mode and select Row 1, Column 1 ("go" -> wait: Row 0 = I, you, more, help; Row 1 = want, go, stop, like)
    const modeSel = app.doc.querySelector('[data-aac-scan-mode]');
    modeSel.value = 'two_switch';
    modeSel.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    app.doc.querySelector('[data-aac-scan-toggle]').click();

    // Row 0 highlighted initially
    expect(app.doc.querySelectorAll('.aac-tile.is-scan-row').length).toBe(4);
    expect(app.doc.querySelector('[data-aac-pos="0-0"]').classList.contains('is-scan-row')).toBe(true);

    // Switch 2 (ArrowRight) moves highlight to Row 1
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(app.doc.querySelector('[data-aac-pos="1-0"]').classList.contains('is-scan-row')).toBe(true);

    // Switch 1 (Space) enters cell scan on Row 1, cell 0 ("want")
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    expect(app.doc.querySelector('[data-aac-pos="1-0"]').classList.contains('is-scan-cell')).toBe(true);

    // Switch 2 (Next button) moves to cell 1 ("go")
    app.doc.querySelector('[data-aac-scan-next]').click();
    expect(app.doc.querySelector('[data-aac-pos="1-1"]').classList.contains('is-scan-cell')).toBe(true);

    // Switch 1 (Enter) activates "go" -> adds to strip and returns to row scan
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(app.doc.querySelectorAll('[data-aac-chip]').length).toBe(1);
    expect(app.doc.querySelector('[data-aac-chip="0"]').textContent).toContain('go');

    // Escape stops scanning and restores focus to toggle button
    app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(app.doc.querySelector('[data-aac-scan-toggle]').getAttribute('aria-pressed')).toBe('false');
    expect(app.doc.activeElement).toBe(app.doc.querySelector('[data-aac-scan-toggle]'));

    // Also verify Auto-Scan timer advances rows automatically, selects row -> cell via Space, and pause/stop cleans up
    modeSel.value = 'auto';
    modeSel.dispatchEvent(new app.win.Event('change', { bubbles: true }));
    const autoCallbacks = [];
    const origSetInterval = app.win.setInterval;
    const origClearInterval = app.win.clearInterval;
    app.win.setInterval = (fn) => { autoCallbacks.push(fn); return autoCallbacks.length; };
    app.win.clearInterval = () => {};
    try {
      app.doc.querySelector('[data-aac-scan-toggle]').click();
      expect(app.doc.querySelector('[data-aac-scan-pause]').hidden).toBe(false);
      // Advance 1 timer tick -> Row 0 advances to Row 1 ("want", "go", "stop", "like")
      autoCallbacks[autoCallbacks.length - 1]();
      expect(app.doc.querySelector('[data-aac-pos="1-0"]').classList.contains('is-scan-row')).toBe(true);
      // Pause toggle -> Space directly resumes and enters Row 1 cell scan cleanly!
      app.doc.querySelector('[data-aac-scan-pause]').click();
      expect(app.doc.querySelector('[data-aac-scan-pause]').getAttribute('aria-pressed')).toBe('true');
      app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(app.doc.querySelector('[data-aac-scan-pause]').getAttribute('aria-pressed')).toBe('false');
      expect(app.doc.querySelector('[data-aac-pos="1-0"]').classList.contains('is-scan-cell')).toBe(true);
      app.doc.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      expect(app.doc.querySelectorAll('[data-aac-chip]').length).toBe(2);
      expect(app.doc.querySelector('[data-aac-chip="1"]').textContent).toContain('want');

      // Non-scan interactive controls (like folder tabs) must NOT be hijacked while scan is active
      const coreTab = app.doc.querySelector('[data-aac-tab="core"]');
      coreTab.focus();
      coreTab.dispatchEvent(new app.win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      expect(app.doc.querySelector('[data-aac-tab="needs"]').getAttribute('aria-selected')).toBe('true');

      // Stop scan cleanly
      app.doc.querySelector('[data-aac-scan-toggle]').click();
    } finally {
      app.win.setInterval = origSetInterval;
      app.win.clearInterval = origClearInterval;
    }

    // Tap one fringe word, speak sentence, and verify lifecycle stop() cleans up voiceschanged listener on screen exit
    expect(app.voiceListeners.size).toBe(1);
    app.doc.querySelector('[data-aac-tile="n1"]').click(); // "water" (already on needs tab from ArrowRight!)
    app.doc.querySelector('[data-aac-speak]').click();
    expect(app.doc.querySelector('[data-aac-stats]').textContent).toContain('1 message spoken | 2 core | 1 fringe');

    app.doc.querySelector('[data-aac-finish]').click();
    expect(app.voiceListeners.size).toBe(0);

    // Verify JSON, CSV, and Sealed QR round-trip (non-scored practice!)
    app.doc.querySelector('[data-save-json]').click();
    const jsonSaved = await app.readSaved('.json');
    const parsed = loader.parseResult(jsonSaved.text);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.summary.items).toBe(0);
    expect(parsed.result.summary.practised).toBe(1);
    expect(parsed.result.items[0].supports.aac_core_tap).toBe(2);
    expect(parsed.result.items[0].supports.aac_fringe_tap).toBe(1);
    expect(parsed.result.items[0].supports.aac_sentence_spoken).toBe(1);
    expect(parsed.result.items[0].supports.aac_scan_used).toBeGreaterThanOrEqual(1);

    app.doc.querySelector('[data-save-csv]').click();
    const csvSaved = await app.readSaved('.csv');
    expect(csvSaved.text).toContain('alloflow-packet-result/1');
    expect(csvSaved.text).toContain('aac_board');

    app.doc.querySelector('[data-qr-toggle]').click();
    const sealedCode = app.doc.querySelector('[data-qr-code]').textContent.trim();
    const unsealed = qrCrypto.unsealResult(sealedCode, keys.secretKey);
    expect(unsealed.ok).toBe(true);
    expect(unsealed.result.summary.practised).toBe(1);
  });
});

describe('Wave 13 Educator/SLP/Family Maker Page (packets-aac.html), Printable Backup & Reopen Round-Trip', () => {
  it('loads packets-aac.html, edits buttons and folders, renders printable backup, builds verified packet, and reopens saved .html', async () => {
    const html = readRoot('packets-aac.html');
    const dom = new JSDOM(html, { url: 'https://packets.local/packets-aac.html', runScripts: 'outside-only', pretendToBeVisual: true });
    const win = dom.window;
    const doc = win.document;

    let blobCounter = 0;
    const builtBlobs = [];
    win.URL.createObjectURL = (b) => { builtBlobs.push(b); return 'blob:aac-maker-' + (++blobCounter); };
    win.URL.revokeObjectURL = () => {};

    const scripts = [
      'packets-page.js',
      'word_sounds_take_home_loader.js',
      'packet_aac_builder.js',
      'packets_station_bilingual.js',
      'packets_qr_crypto.js',
      'packets_verify_core.js',
      'packets_handoff.js',
      'packets_zip.js',
      'packets-aac.js',
    ];
    for (const s of scripts) {
      vm.runInContext(readRoot(s), dom.getInternalVMContext(), { filename: s });
    }
    doc.dispatchEvent(new win.Event('DOMContentLoaded', { bubbles: true }));

    // Select Bilingual Core (EN / ES) starter -> verify Spanish home-language toggle & title update
    doc.querySelector('[data-starter-id="bilingual_core_en_es"]').click();
    doc.getElementById('next-1').click();
    expect(doc.querySelector('input[data-lang-code="es"]').checked).toBe(true);

    // Add two custom buttons back-to-back in Step 2 -> verify distinct monotonic IDs & edit label/category
    doc.getElementById('add-tile').click();
    doc.getElementById('add-tile').click();
    const tLabel = doc.getElementById('t-label');
    tLabel.value = 'music';
    tLabel.dispatchEvent(new win.Event('input', { bubbles: true }));
    const tCat = doc.getElementById('t-cat');
    tCat.value = 'noun';
    tCat.dispatchEvent(new win.Event('change', { bubbles: true }));
    const savedDraft = JSON.parse(win.localStorage.getItem('alloflow-packets-aac:v1'));
    const tiles = savedDraft.folders[0].tiles;
    expect(tiles[tiles.length - 1].id).not.toBe(tiles[tiles.length - 2].id);

    // Proceed to Step 3 -> build verified packet + printable backup board
    doc.getElementById('next-2').click();
    expect(doc.getElementById('summary').hidden).toBe(false);
    expect(doc.getElementById('summary-facts').textContent).toContain('Verified offline');
    expect(doc.getElementById('try').getAttribute('href')).toMatch(/^packets-try\.html#blob:aac-maker-/);
    expect(doc.getElementById('print-board').hidden).toBe(false);
    expect(doc.getElementById('print-board-sheet').hidden).toBe(false);
    expect(doc.querySelectorAll('#print-board-preview .print-cell').length).toBeGreaterThanOrEqual(25);
    expect(builtBlobs.length).toBeGreaterThan(0);

    // Batch .zip mode -> click #batch-make and verify real ZIP bytes via AlloPacketZip.readZip
    const batchTa = doc.getElementById('f-batch-names');
    batchTa.value = 'River1\nCedar2';
    batchTa.dispatchEvent(new win.Event('input', { bubbles: true }));
    expect(doc.getElementById('batch-make').hidden).toBe(false);
    const beforeZipCount = builtBlobs.length;
    doc.getElementById('batch-make').click();
    expect(builtBlobs.length).toBe(beforeZipCount + 1);
    const zipBuf = new Uint8Array(await builtBlobs[builtBlobs.length - 1].arrayBuffer());
    const zipEntries = win.AlloPacketZip.readZip(zipBuf);
    expect(zipEntries.length).toBe(2);
    expect(zipEntries.every((e) => e.crcOk)).toBe(true);
    expect(zipEntries.map((e) => aac.codeName(new TextDecoder().decode(e.bytes)))).toEqual(['River1', 'Cedar2']);

    // Reopen round-trip via file picker
    const st = aac.starterById('feelings_sensory_breaks');
    const savedBoard = aac.buildAacPacket({
      title: 'Saved Sensory Board',
      starterId: st.id,
      gridLayout: '3x3',
      folders: st.folders,
      homeLanguages: ['ar'],
      stationMode: true,
      learner: 'Kai4',
      loader,
      stationBilingual,
    });
    const reopened = aac.readAacPacket(savedBoard.html, verifyCore);
    expect(reopened.ok).toBe(true);
    expect(reopened.title).toBe('Saved Sensory Board');
    expect(reopened.gridLayout).toBe('3x3');
    expect(reopened.homeLanguages).toEqual(['ar']);
    expect(reopened.stationMode).toBe(true);
    expect(reopened.learner).toBe('Kai4');

    const reopenFile = new win.File([savedBoard.html], 'sensory-board.html', { type: 'text/html' });
    const reopenInput = doc.getElementById('reopen-file');
    Object.defineProperty(reopenInput, 'files', { value: [reopenFile], configurable: true });
    reopenInput.dispatchEvent(new win.Event('change', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 30));
    expect(doc.getElementById('reopen-line').textContent).toContain('Saved Sensory Board');
    expect(doc.getElementById('reopen-line').textContent).toContain('3x3');
  });
});
