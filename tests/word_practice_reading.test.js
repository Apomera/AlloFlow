// Word Practice and the reading settings (2026-10-20): the "Aa" button in the
// setup dialog and the live player (never in the offline file), text sizes in
// rem so the size setting applies, and "Use my reading settings" for the
// offline HTML (embedded font, reader CSS, font-src data: in its policy).
import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const DIR = process.env.LANE_DIR || '.';
const REPO = process.cwd().replace(/\\/g, '/');
const { JSDOM, VirtualConsole } = createRequire(REPO + '/package.json')('jsdom');
const MODULE = readFileSync(DIR + '/word_practice_module.js', 'utf8');
const FONT_LIBRARY = readFileSync(REPO + '/ui_font_library_module.js', 'utf8');
const STRICT_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; media-src data: blob:; img-src data:";
const FONTS = [
  { id: 'default', label: 'Default (System)', family: '', cssClass: '' },
  { id: 'verdana', label: 'Verdana', family: 'Verdana, Geneva, sans-serif', cssClass: 'font-verdana' },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic' },
];
const OPEN_DYSLEXIC = { fontId: 'opendyslexic', fontFamily: "'OpenDyslexic', sans-serif", fontClass: 'font-opendyslexic', baseFontSize: 20, lineHeight: 1.8, letterSpacing: 0.05 };

const windows = [];
afterEach(() => { while (windows.length) windows.pop().close(); });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const flush = async () => { for (let i = 0; i < 6; i++) await tick(); };

function load({ bridge = true, fontLibrary = true, settings = {} } = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><button id="launch">Launch</button></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example', virtualConsole: new VirtualConsole() });
  const win = dom.window; windows.push(win);
  if (fontLibrary) win.eval(FONT_LIBRARY);
  const state = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: FONTS, ...settings };
  const listeners = new Set();
  if (bridge) {
    win.__alloReadingSettings = {
      get: () => ({ ...state }),
      set: (patch) => { Object.assign(state, patch); listeners.forEach((fn) => fn({ ...state })); },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    };
  }
  win.eval(MODULE);
  return { win, doc: win.document, ui: win.AlloModules.WordPractice, listeners };
}
const buttons = (scope, text) => [...scope.querySelectorAll('button')].filter((node) => node.textContent === text);
const buttonIn = (scope, text) => buttons(scope, text)[0];
const checkboxFor = (doc, text) => [...doc.querySelectorAll('label')].find((label) => label.querySelector('span')?.textContent === text)?.querySelector('input[type=checkbox]');
const panelOf = (doc) => doc.querySelector('[data-allo-reading-settings]');
function captureDownloads(win) {
  const blobs = [];
  win.URL.createObjectURL = (blob) => { blobs.push(blob); return 'blob:practice-' + blobs.length; };
  win.URL.revokeObjectURL = () => {};
  win.HTMLAnchorElement.prototype.click = function () {};
  return blobs;
}
const cspOf = (html) => (/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(html) || [])[1];
function runOffline(html) {
  const offline = new JSDOM(html, { runScripts: 'dangerously', virtualConsole: new VirtualConsole() });
  windows.push(offline.window);
  return offline.window;
}

// Font sizes as [selector, value, inMedia]; a tiny resolver turns rem/px/vw/clamp into px.
function fontSizes(css) {
  const out = [];
  const collect = (block, media) => {
    const rule = /([^{}]+)\{([^{}]*)\}/g; let m;
    while ((m = rule.exec(block))) {
      const decl = /(?:^|;)\s*font(-size)?\s*:\s*([^;]+)/g; let d;
      while ((d = decl.exec(m[2]))) {
        const value = d[1] ? d[2].trim() : (/^([^\s/]+)/.exec(d[2].trim()) || [])[1];
        if (value && value !== 'inherit') out.push([m[1].trim(), value, media]);
      }
    }
  };
  const mediaBlock = /@media([^{]*)\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g;
  collect(css.replace(mediaBlock, (all, query, body) => { collect(body, query.trim()); return ''; }), '');
  return out;
}
function px(value, root, vw) {
  const clamp = /^clamp\((.+)\)$/.exec(value.trim());
  if (clamp) { const [lo, mid, hi] = clamp[1].split(',').map((v) => px(v, root, vw)); return Math.min(Math.max(mid, lo), hi); }
  const n = /^(-?[\d.]+)(px|rem|vw)$/.exec(value.trim());
  if (!n) throw new Error('cannot resolve font size ' + value);
  return Number(n[1]) * (n[2] === 'px' ? 1 : n[2] === 'rem' ? root : vw / 100);
}
// The look before this change, at a 16 px root.
const PX_BEFORE = {
  '.awp': '16px', '.awp h1': '26px', '.awp-note': '14px', '.awp-word': 'clamp(34px,9vw,112px)', '.awp-detail': 'clamp(20px,3vw,34px)',
  '.awp-phonemes': 'clamp(28px,6vw,72px)', '.awp-choices button': 'clamp(20px,3vw,30px)', '.awp-feedback': '20px',
  '@.awp h1': '22px', '@.awp-word': 'clamp(30px,11vw,72px)',
};

describe('the "Aa" button', () => {
  it('sits beside Close in the setup dialog, named and translated, and opens the panel inside the dialog', () => {
    const t = (key) => ({ 'reading_settings.title': 'Ajustes de lectura', 'reading_settings.use_mine': 'Usar mis ajustes de lectura' })[key] || key;
    const { win, doc, ui } = load();
    ui.open({ words: ['ship', 'rain'], t });
    const dialog = doc.querySelector('.awp-dialog');
    const aa = buttonIn(dialog, 'Aa');
    expect(aa, 'an Aa button in the dialog').toBeTruthy();
    expect(aa.type).toBe('button');
    expect(aa.getAttribute('aria-label')).toBe('Ajustes de lectura');
    expect(aa.getAttribute('aria-haspopup')).toBe('dialog');
    expect(aa.parentElement, 'in the header, next to Close').toBe(buttonIn(dialog, 'Close').parentElement);
    expect(aa.closest('.awp-head')).toBeTruthy();
    aa.click();
    const panel = panelOf(doc);
    expect(panel, 'the panel opened').toBeTruthy();
    expect(dialog.contains(panel), 'inside the dialog, so its focus trap and the inert siblings cannot cut it off').toBe(true);
    expect(panel.querySelector('h2').textContent).toBe('Ajustes de lectura');
    expect(aa.getAttribute('aria-expanded')).toBe('true');
    const width = (node) => win.getComputedStyle(node).width;
    expect(width(dialog.querySelector('.awp-fields input[type=number]')), 'control: the field rule still styles its own inputs').toBe('100%');
    expect(width(panel.querySelector('input[type=radio]')), 'Word Practice field styles leave the panel radios alone').not.toBe('100%');
    expect(width(panel.querySelector('input[type=range]'))).not.toBe('100%');
    aa.click();
    expect(panelOf(doc), 'a second press closes it').toBe(null);
    expect(checkboxFor(doc, 'Usar mis ajustes de lectura'), 'the export option is translated').toBeTruthy();
  });

  it('the live player has its own Aa beside Full screen; it opens in the dialog, or in the full-screen player', async () => {
    const { win, doc, ui, listeners } = load();
    ui.open({ words: ['ship', 'rain'], options: { repetitions: 1, shuffle: false } });
    const dialog = doc.querySelector('.awp-dialog');
    const setupAa = buttonIn(dialog.querySelector('.awp-head'), 'Aa');
    buttonIn(doc, 'Present').click(); await tick();
    const player = doc.querySelector('.awp-player');
    const aa = buttonIn(player, 'Aa');
    expect(aa, 'an Aa button in the player').toBeTruthy();
    expect(aa.getAttribute('aria-label')).toBe('Reading settings');
    expect(aa.getAttribute('aria-haspopup')).toBe('dialog');
    expect(aa.parentElement).toBe(buttonIn(player, 'Full screen').parentElement);
    expect(setupAa.hidden, 'one Aa while presenting').toBe(true);
    aa.click();
    expect(dialog.contains(panelOf(doc))).toBe(true);
    aa.click();
    expect(panelOf(doc)).toBe(null);
    Object.defineProperty(doc, 'fullscreenElement', { configurable: true, value: player });
    aa.click();
    const panel = panelOf(doc);
    expect(player.contains(panel), 'inside the full-screen element').toBe(true);
    // Keys pressed in the panel belong to the panel, not the card deck.
    panel.querySelector('button').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
    expect(doc.querySelector('.awp-word').textContent).toBe('ship');
    delete doc.fullscreenElement;
    buttonIn(player, 'Back to setup').click();
    expect(listeners.size, 'leaving the player closes its panel').toBe(0);
    expect(setupAa.hidden, 'back in setup, the dialog Aa returns').toBe(false);
  });

  it('is absent, with no export option, when the host has no reading-settings bridge or panel', async () => {
    for (const setup of [{ bridge: false }, { fontLibrary: false }]) {
      const { win, doc, ui } = load(setup);
      expect(() => ui.open({ words: ['ship'] })).not.toThrow();
      expect(buttonIn(doc, 'Aa'), JSON.stringify(setup)).toBeUndefined();
      expect(checkboxFor(doc, 'Use my reading settings')).toBeUndefined();
      buttonIn(doc, 'Present').click(); await tick();
      expect(buttonIn(doc, 'Aa')).toBeUndefined();
      buttonIn(doc, 'Close').click();
      win.close();
    }
  });

  it('closing the dialog closes the panel and drops its subscription', () => {
    const { doc, ui, listeners } = load();
    const controller = ui.open({ words: ['ship'] });
    buttonIn(doc, 'Aa').click();
    expect(listeners.size).toBe(1);
    controller.close();
    expect(listeners.size, 'the panel stopped listening').toBe(0);
    expect(panelOf(doc)).toBe(null);
  });

  it('is never in the offline file, even when downloaded from a host that has it', async () => {
    const { win, doc, ui } = load();
    const blobs = captureDownloads(win);
    ui.open({ words: ['ship'] });
    buttonIn(doc, 'Download HTML').click(); await flush();
    const offline = runOffline(await blobs[0].text());
    expect(offline.document.querySelector('.awp-word').textContent).toBe('ship');
    expect(buttonIn(offline.document, 'Full screen'), 'the player rendered').toBeTruthy();
    expect(buttonIn(offline.document, 'Aa')).toBeUndefined();
    expect(offline.document.querySelector('.awp-aa')).toBe(null);
  });
});

describe('text size follows the reading settings', () => {
  it('no px font sizes remain; at a 16 px root the sizes match the old look, and a larger root makes every one larger', () => {
    const { doc, ui } = load();
    ui.open({ words: ['ship'] });
    const css = doc.querySelector('.awp-overlay > style').textContent;
    const sizes = fontSizes(css);
    expect(sizes.length).toBeGreaterThanOrEqual(10);
    const withPx = sizes.filter(([, value]) => /\dpx/.test(value));
    expect(withPx, 'font sizes still in px').toEqual([]);
    for (const [selector, value, media] of sizes) {
      const key = (media ? '@' : '') + selector;
      for (const vw of [320, 800, 2000]) {
        if (PX_BEFORE[key]) expect(px(value, 16, vw), key + ' at ' + vw + ' px wide').toBeCloseTo(px(PX_BEFORE[key], 16, vw), 5);
        // A clamp whose vw term sits between its bounds may stay put; at the edges the rem bounds rule.
        if (vw === 800) expect(px(value, 32, vw)).toBeGreaterThanOrEqual(px(value, 16, vw));
        else expect(px(value, 32, vw), key + ' grows with the root size at ' + vw + ' px wide').toBeGreaterThan(px(value, 16, vw));
      }
    }
    expect(/\.awp \.awp-aa\{[^}]*min-width:44px/.test(css) && /\.awp button\{[^}]*min-height:44px/.test(css), 'Aa keeps a 44 px target at any text size').toBe(true);
    expect(Object.keys(PX_BEFORE).every((key) => sizes.some(([s, , m]) => (m ? '@' : '') + s === key)), 'every old size is still styled').toBe(true);
    const fontOverrides = [...css.matchAll(/([^{}]+)\{[^{}]*font-family\s*:[^;}]*!important[^{}]*\}/g)];
    expect(fontOverrides.every(([, selector]) => selector.includes('[data-awp-card-font]:not([data-awp-card-font=default])')), 'only an explicitly selected card font can override reading settings').toBe(true);
  });

  it('the projected word\'s own size uses rem bounds that scale', async () => {
    const { win, doc, ui } = load();
    const assigned = [];
    // jsdom drops clamp() from inline styles, so record what the player assigns.
    let proto = Object.getPrototypeOf(doc.createElement('div').style);
    while (proto && !Object.getOwnPropertyDescriptor(proto, 'fontSize')) proto = Object.getPrototypeOf(proto);
    Object.defineProperty(proto, 'fontSize', { configurable: true, set(v) { assigned.push(String(v)); }, get() { return ''; } });
    ui.open({ words: ['ship'], options: { repetitions: 1, shuffle: false } });
    buttonIn(doc, 'Present').click(); await tick();
    expect(doc.querySelector('.awp-word').textContent).toBe('ship');
    const value = assigned.at(-1);
    expect(value, 'an inline size for the word').toBeTruthy();
    expect(/\dpx/.test(value), value).toBe(false);
    for (const vw of [320, 800, 2000]) {
      expect(px(value, 16, vw), value).toBeCloseTo(px('clamp(30px,9vw,112px)', 16, vw), 5);
      if (vw !== 800) expect(px(value, 32, vw)).toBeGreaterThan(px(value, 16, vw));
    }
  });
});

describe('"Use my reading settings" in the offline HTML', () => {
  const fontFetch = (win, calls) => async (url) => { calls.push(String(url)); return { ok: true, arrayBuffer: async () => new win.Uint8Array([1, 2, 3]).buffer }; };

  it('is off by default, beside the audio option; when checked, the file embeds the font and the reader CSS, and allows font-src data:', async () => {
    const { win, doc, ui } = load({ settings: OPEN_DYSLEXIC });
    const calls = []; win.fetch = fontFetch(win, calls);
    const blobs = captureDownloads(win);
    ui.open({ words: ['ship', 'rain'], options: { repetitions: 1, shuffle: false } });
    const box = checkboxFor(doc, 'Use my reading settings');
    expect(box, 'the option exists').toBeTruthy();
    expect(box.checked, 'off by default').toBe(false);
    expect(box.closest('.awp-fields')).toBe(checkboxFor(doc, 'Include prepared audio').closest('.awp-fields'));
    expect(doc.getElementById(box.getAttribute('aria-describedby')).textContent).toBe('The HTML file uses your font, text size and spacing.');
    box.checked = true;
    buttonIn(doc, 'Download HTML').click();
    expect(doc.querySelector('.awp-status').textContent, 'a status line while preparing').toBe('Adding your reading settings…');
    expect(blobs.length, 'not downloaded before the font is ready').toBe(0);
    await flush();
    expect(blobs.length).toBe(1);
    expect(doc.querySelector('.awp-status').textContent).toBe('HTML downloaded. Open the file in a browser to practice offline.');
    expect(calls.length, 'the font files were fetched to embed').toBeGreaterThan(0);
    const html = await blobs[0].text();
    expect(cspOf(html)).toBe(STRICT_CSP + '; font-src data:');
    const offline = runOffline(html);
    const style = offline.document.querySelector('style').textContent;
    expect(style.includes("@font-face{font-family:'OpenDyslexic';src:url(data:font/woff;base64,AQID)"), 'embedded @font-face').toBe(true);
    expect(/url\((?!data:)/.test(style), 'no remote font URL').toBe(false);
    expect(style.includes('html{font-size:20px}'), 'reader text size').toBe(true);
    expect(style.includes("font-family:'OpenDyslexic', sans-serif !important"), 'reader font family').toBe(true);
    expect(style.includes('line-height:1.8 !important;letter-spacing:0.05em !important'), 'reader spacing').toBe(true);
    expect(offline.document.querySelector('.awp-word').textContent).toBe('ship');
  });

  it('without the option the file is unchanged: downloaded at once, strict policy, no reader CSS or font', async () => {
    const { win, doc, ui } = load({ settings: OPEN_DYSLEXIC });
    const calls = []; win.fetch = fontFetch(win, calls);
    const blobs = captureDownloads(win);
    ui.open({ words: ['ship'], options: { repetitions: 1, shuffle: false } });
    const liveCss = doc.querySelector('.awp-overlay > style').textContent;
    buttonIn(doc, 'Download HTML').click();
    expect(blobs.length, 'synchronous, as before').toBe(1);
    const html = await blobs[0].text();
    expect(cspOf(html)).toBe(STRICT_CSP);
    expect(html.includes('<style>body{margin:0;background:#f5f7fb}' + liveCss + '</style>'), 'the same stylesheet as before, nothing added').toBe(true);
    expect(html.includes('@font-face')).toBe(false);
    expect(calls.length).toBe(0);
    const input = { words: ['ship'] }, opts = { repetitions: 1, shuffle: false };
    const plain = ui.buildHtml(input, opts);
    expect(ui.buildHtml(input, opts, undefined, undefined, null)).toBe(plain);
    expect(ui.buildHtml(input, opts, undefined, undefined, { css: '', fontCss: '' })).toBe(plain);
  });

  it('a font that cannot be embedded still downloads, with the system font, and says so', async () => {
    const { win, doc, ui } = load({ settings: OPEN_DYSLEXIC });
    win.fetch = async () => { throw new Error('offline'); };
    const blobs = captureDownloads(win);
    ui.open({ words: ['ship'] });
    checkboxFor(doc, 'Use my reading settings').checked = true;
    buttonIn(doc, 'Download HTML').click(); await flush();
    expect(blobs.length, 'still downloaded').toBe(1);
    expect(doc.querySelector('.awp-status').textContent).toBe('HTML downloaded. Open the file in a browser to practice offline. Your font could not be added to the file, so it uses the system font.');
    const html = await blobs[0].text();
    expect(html.includes('@font-face')).toBe(false);
    expect(cspOf(html), 'no font, no font-src').toBe(STRICT_CSP);
    expect(html.includes('html{font-size:20px}'), 'size and spacing still apply').toBe(true);
  });

  it('a system font needs nothing embedded and reports no problem', async () => {
    const { win, doc, ui } = load({ settings: { fontId: 'verdana', fontFamily: 'Verdana, Geneva, sans-serif', fontClass: 'font-verdana', baseFontSize: 24 } });
    const calls = []; win.fetch = fontFetch(win, calls);
    const blobs = captureDownloads(win);
    ui.open({ words: ['ship'] });
    checkboxFor(doc, 'Use my reading settings').checked = true;
    buttonIn(doc, 'Download HTML').click(); await flush();
    expect(calls.length).toBe(0);
    expect(doc.querySelector('.awp-status').textContent).toBe('HTML downloaded. Open the file in a browser to practice offline.');
    const html = await blobs[0].text();
    expect(cspOf(html)).toBe(STRICT_CSP);
    expect(html.includes('font-family:Verdana, Geneva, sans-serif !important') && html.includes('html{font-size:24px}')).toBe(true);
  });

  it('reader CSS cannot close the style element', () => {
    const { ui } = load();
    const html = ui.buildHtml({ words: ['ship'] }, { repetitions: 1, shuffle: false }, undefined, undefined, { css: 'body{}</style><script>window.bad=1</script>', fontCss: '' });
    const offline = runOffline(html);
    expect(offline.bad).toBeUndefined();
    expect(offline.document.querySelectorAll('script').length).toBe(1);
    expect(offline.document.querySelector('.awp-word').textContent).toBe('ship');
  });
});
