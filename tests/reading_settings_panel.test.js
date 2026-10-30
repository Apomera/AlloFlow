// Reading settings reachable everywhere (2026-10-20).
//
// The header's reading settings (font, size, line and letter spacing, color
// overlay, ruler) were out of reach inside full-screen activities, and overlays
// attached to <body> never got the chosen font. The host now publishes the
// settings through window.__alloReadingSettings and puts the font class on
// <body>; ui_font_library_module.js gives every screen one "Aa" panel and the
// CSS/font helpers exports use. The bridge runs from AlloFlowANTI.txt itself.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const FONTS = [
  { id: 'default', label: 'Default (System)', family: '', cssClass: '' },
  { id: 'opendyslexic', label: 'OpenDyslexic', family: "'OpenDyslexic', sans-serif", cssClass: 'font-opendyslexic', googleFont: null },
  { id: 'lexend', label: 'Lexend', family: "'Lexend', sans-serif", cssClass: 'font-lexend', googleFont: 'Lexend:wght@400;500;700' },
];

describe('host bridge (AlloFlowANTI.txt)', () => {
  const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
  const body = sliceBetween(anti, '  const readingSettingsRef = useRef(null);', '}, [selectedFont, baseFontSize, lineHeight, letterSpacing, colorOverlay, readingRuler, readingTheme, focusMode]);', { file: 'AlloFlowANTI.txt', includeEnd: true });
  const refs = [];
  let refIndex = 0;
  const THEMES = ['default', 'warm', 'dark', 'dyslexia'];
  const run = (given) => {
    const state = { READING_THEME_IDS: THEMES, readingTheme: 'default', focusMode: false, setReadingTheme: vi.fn(), setFocusMode: vi.fn(), ...given };
    refIndex = 0;
    const useRef = (v) => { const i = refIndex++; if (!refs[i]) refs[i] = { current: v }; return refs[i]; };
    const names = Object.keys(state);
    new Function('useRef', 'useEffect', ...names, body)(useRef, (fn) => fn(), ...names.map((k) => state[k]));
  };
  const setters = () => ({ setSelectedFont: vi.fn(), setBaseFontSize: vi.fn(), setLineHeight: vi.fn(), setLetterSpacing: vi.fn(), setColorOverlay: vi.fn(), setReadingRuler: vi.fn() });
  beforeEach(() => { refs.length = 0; delete window.__alloReadingSettings; window.FONT_OPTIONS = FONTS; document.body.className = 'font-sans'; });

  it('publishes the settings, puts the font class on <body> and sets CSS variables', () => {
    const fn = vi.fn();
    run({ selectedFont: 'opendyslexic', baseFontSize: 20, lineHeight: 1.8, letterSpacing: 0.05, colorOverlay: 'none', readingRuler: false, ...setters() });
    const api = window.__alloReadingSettings;
    expect(api.get()).toMatchObject({ fontId: 'opendyslexic', fontClass: 'font-opendyslexic', baseFontSize: 20, lineHeight: 1.8, letterSpacing: 0.05 });
    expect(document.body.classList.contains('font-opendyslexic')).toBe(true);
    expect(document.body.classList.contains('font-sans'), 'an unrelated body class is kept').toBe(true);
    expect(document.documentElement.style.getPropertyValue('--allo-reader-line-height')).toBe('1.8');
    const off = api.subscribe(fn);
    run({ selectedFont: 'lexend', baseFontSize: 20, lineHeight: 1.8, letterSpacing: 0.05, colorOverlay: 'none', readingRuler: false, ...setters() });
    expect(document.body.classList.contains('font-opendyslexic'), 'the previous font class is removed').toBe(false);
    expect(document.body.classList.contains('font-lexend')).toBe(true);
    expect(fn).toHaveBeenCalledWith(expect.objectContaining({ fontId: 'lexend' }));
    off();
  });

  it('set() clamps and routes each value to the host setter; unknown fonts are ignored', () => {
    const s = setters();
    run({ selectedFont: 'default', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, ...s });
    window.__alloReadingSettings.set({ fontId: 'nope', baseFontSize: 99, lineHeight: 0.4, letterSpacing: 0.333, colorOverlay: 'purple', readingRuler: true });
    expect(s.setSelectedFont).not.toHaveBeenCalled();
    expect(s.setBaseFontSize).toHaveBeenCalledWith(48);
    expect(s.setLineHeight).toHaveBeenCalledWith(1);
    expect(s.setLetterSpacing).toHaveBeenCalledWith(0.2);
    expect(s.setColorOverlay).not.toHaveBeenCalled();
    expect(s.setReadingRuler).toHaveBeenCalledWith(true);
    window.__alloReadingSettings.set({ fontId: 'lexend', colorOverlay: 'peach' });
    expect(s.setSelectedFont).toHaveBeenCalledWith('lexend');
    expect(s.setColorOverlay).toHaveBeenCalledWith('peach');
  });

  it('publishes the reading theme and bionic reading, and set() routes only known themes', () => {
    const s = { ...setters(), setReadingTheme: vi.fn(), setFocusMode: vi.fn() };
    run({ selectedFont: 'default', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, readingTheme: 'warm', focusMode: true, ...s });
    expect(window.__alloReadingSettings.get()).toMatchObject({ readingTheme: 'warm', readingThemes: THEMES, bionic: true });
    window.__alloReadingSettings.set({ readingTheme: 'purple', bionic: 'yes' });
    expect(s.setReadingTheme).not.toHaveBeenCalled();
    expect(s.setFocusMode).not.toHaveBeenCalled();
    window.__alloReadingSettings.set({ readingTheme: 'dark', bionic: false });
    expect(s.setReadingTheme).toHaveBeenCalledWith('dark');
    expect(s.setFocusMode).toHaveBeenCalledWith(false);
  });
});

describe('the reading-settings panel', () => {
  let lib, state, setSpy;
  beforeAll(() => {
    delete window.AlloModules;
    new Function(readFileSync(process.env.UI_FONT_LIBRARY_MODULE || 'ui_font_library_module.js', 'utf8'))();
    lib = window.AlloModules.UIFontLibrary;
  });
  beforeEach(() => {
    state = { fontId: 'default', fontFamily: '', fontClass: '', baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0, colorOverlay: 'none', readingRuler: false, fonts: FONTS };
    setSpy = vi.fn((p) => { Object.assign(state, p); window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...state } })); });
    window.__alloReadingSettings = {
      get: () => ({ ...state }),
      set: setSpy,
      subscribe: (fn) => { const h = (e) => fn(e.detail); window.addEventListener('alloflow:reading-settings-changed', h); return () => window.removeEventListener('alloflow:reading-settings-changed', h); },
    };
  });
  afterEach(() => { lib.closeReadingSettings(); document.body.innerHTML = ''; });

  const setup = () => {
    const dialog = document.createElement('section');
    dialog.setAttribute('role', 'dialog');
    const opener = document.createElement('button');
    opener.textContent = 'Aa';
    dialog.appendChild(opener);
    document.body.appendChild(dialog);
    return { dialog, opener };
  };
  const key = (el, k, extra = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...extra }));

  it('opens inside the opener\'s dialog with the current values, translated labels and focus on the first control', () => {
    const { dialog, opener } = setup();
    const t = (k) => ({ 'reading_settings.title': 'Ajustes de lectura', 'settings.text.size': 'Tamaño' })[k] || k;
    const handle = lib.openReadingSettings({ opener, t });
    const panel = handle.element;
    expect(dialog.contains(panel), 'inside the dialog, so a focus trap or inert siblings cannot cut it off').toBe(true);
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.querySelector('h2').textContent).toBe('Ajustes de lectura');
    expect(panel.textContent.includes('Tamaño')).toBe(true);
    expect(panel.textContent.includes('Line Height'), 'English fallback for an untranslated key').toBe(true);
    expect(document.activeElement).toBe(panel.querySelector('select'));
    expect(opener.getAttribute('aria-expanded')).toBe('true');
  });

  it('every control writes through the bridge at once and the readouts follow', () => {
    const { opener } = setup();
    const panel = lib.openReadingSettings({ opener }).element;
    const [size, line, spacing] = panel.querySelectorAll('input[type="range"]');
    size.value = '22'; size.dispatchEvent(new Event('input', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ baseFontSize: 22 });
    expect(panel.querySelector('output').textContent).toBe('22 px');
    line.value = '2'; line.dispatchEvent(new Event('input', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ lineHeight: 2 });
    spacing.value = '0.1'; spacing.dispatchEvent(new Event('input', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ letterSpacing: 0.1 });
    const select = panel.querySelector('select'); select.value = 'opendyslexic'; select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ fontId: 'opendyslexic' });
    const peach = panel.querySelector('input[type="radio"][value="peach"]'); peach.checked = true; peach.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ colorOverlay: 'peach' });
    const ruler = panel.querySelector('input[type="checkbox"]'); ruler.checked = true; ruler.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ readingRuler: true });
    [...panel.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'Larger text').click();
    expect(setSpy).toHaveBeenLastCalledWith({ baseFontSize: 23 });
    [...panel.querySelectorAll('button')].find((b) => b.textContent === 'Reset size & spacing').click();
    expect(setSpy).toHaveBeenLastCalledWith({ baseFontSize: 16, lineHeight: 1.6, letterSpacing: 0 });
  });

  it('shows bionic reading and the app-wide reading theme when the host publishes them, and writes both through', () => {
    Object.assign(state, { readingTheme: 'warm', readingThemes: ['default', 'warm', 'dark', 'dyslexia'], bionic: false });
    const { opener } = setup();
    const t = (k) => ({ 'header.reading_theme_dark': 'Oscuro', 'settings.reading_theme_desc': 'Para todo el contenido' })[k] || k;
    const panel = lib.openReadingSettings({ opener, t }).element;
    const theme = panel.querySelector('select[id$="-theme"]');
    expect([...theme.options].map((o) => o.value)).toEqual(['default', 'warm', 'dark', 'dyslexia']);
    expect(theme.value).toBe('warm');
    expect(theme.options[2].textContent).toBe('Oscuro');
    expect(theme.options[3].textContent, 'English fallback for an untranslated theme').toBe('Easy Read');
    expect(document.getElementById(theme.getAttribute('aria-describedby')).textContent, 'says it applies to every resource').toBe('Para todo el contenido');
    theme.value = 'dark'; theme.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ readingTheme: 'dark' });
    const bionic = panel.querySelector('input[id$="-bionic"]');
    bionic.checked = true; bionic.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setSpy).toHaveBeenLastCalledWith({ bionic: true });
    window.__alloReadingSettings.set({ readingTheme: 'default', bionic: false });
    expect(theme.value, 'the readout follows a change made elsewhere').toBe('default');
    expect(bionic.checked).toBe(false);
  });

  it('an older host without theme or bionic still gets the panel, minus those controls', () => {
    const { opener } = setup();
    const panel = lib.openReadingSettings({ opener }).element;
    expect(panel.querySelector('select[id$="-theme"]')).toBeNull();
    expect(panel.querySelector('input[id$="-bionic"]')).toBeNull();
    expect(panel.querySelectorAll('input[type="range"]').length).toBe(3);
  });

  it('Escape closes it and returns focus; Tab stays inside; the same opener toggles it; an outside press closes it', () => {
    const { opener } = setup();
    let panel = lib.openReadingSettings({ opener }).element;
    const focusables = [...panel.querySelectorAll('button,select,input')];
    focusables.at(-1).focus();
    key(focusables.at(-1), 'Tab');
    expect(document.activeElement, 'Tab from the last control wraps to the first').toBe(focusables[0]);
    key(panel, 'Escape');
    expect(panel.isConnected).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(opener.getAttribute('aria-expanded')).toBe('false');
    lib.openReadingSettings({ opener });
    expect(lib.openReadingSettings({ opener }), 'a second press on the same button closes it').toBeNull();
    expect(document.querySelector('[data-allo-reading-settings]')).toBeNull();
    panel = lib.openReadingSettings({ opener }).element;
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(panel.isConnected).toBe(false);
  });

  it('opens nothing when the host has not published the settings', () => {
    delete window.__alloReadingSettings;
    expect(lib.readingSettingsAvailable()).toBe(false);
    expect(lib.openReadingSettings({ opener: setup().opener })).toBeNull();
  });
});

describe('export helpers', () => {
  let lib;
  beforeAll(() => { lib = window.AlloModules.UIFontLibrary; });
  const s = { fontId: 'opendyslexic', fontFamily: "'OpenDyslexic', sans-serif", fontClass: 'font-opendyslexic', baseFontSize: 20, lineHeight: 2, letterSpacing: 0.1 };

  it('readerExportCss carries the font, size and spacing into an exported page', () => {
    const css = lib.readerExportCss(s);
    expect(css.includes("font-family:'OpenDyslexic', sans-serif !important")).toBe(true);
    expect(css.includes('html{font-size:20px}')).toBe(true);
    expect(css.includes('line-height:2 !important;letter-spacing:0.1em !important')).toBe(true);
    expect(lib.readerExportCss({ ...s, fontFamily: '' }).includes('font-family'), 'the default font adds no family').toBe(false);
  });

  it('exportFontFaceCss: a link for print windows, embedded data for offline files, nothing for system fonts', async () => {
    expect(await lib.exportFontFaceCss('default')).toEqual({ head: '', css: '' });
    expect((await lib.exportFontFaceCss('lexend')).head.includes('fonts.googleapis.com/css2?family=Lexend')).toBe(true);
    expect((await lib.exportFontFaceCss('opendyslexic')).css.includes('opendyslexic-latin-400-normal.woff')).toBe(true);
    const fetchSpy = vi.fn(async (url) => (String(url).includes('googleapis')
      ? { ok: true, text: async () => "@font-face{font-family:'Lexend';src:url(https://fonts.gstatic.com/s/lexend/a.woff2) format('woff2')}" }
      : { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }));
    vi.stubGlobal('fetch', fetchSpy);
    const embedded = await lib.exportFontFaceCss('lexend', { embed: true });
    expect(embedded.css.includes('data:font/woff2;base64,AQID'), embedded.css).toBe(true);
    expect(embedded.css.includes('gstatic'), 'no remote URL left').toBe(false);
    expect(await lib.exportFontFaceCss('lexend', { embed: true, maxBytes: 2 }), 'over the size cap: system font').toEqual({ head: '', css: '' });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await lib.exportFontFaceCss('opendyslexic', { embed: true }), 'network failure: system font').toEqual({ head: '', css: '' });
    vi.unstubAllGlobals();
  });

  // opendyslexic@2.1.0-beta1/open-dyslexic-*.woff returns 404 (checked 2026-10-20), so
  // choosing OpenDyslexic showed the fallback sans-serif. The app stylesheet and the
  // export helper must load the same faces, and neither the dead package path.
  it('the app stylesheet and the exports load OpenDyslexic from the same live files', () => {
    const urls = (src) => [...new Set(src.match(/https:\/\/cdn\.jsdelivr\.net\/npm\/[^'")\s]*dyslexic[^'")\s]*\.woff2?/gi) || [])].sort();
    const app = urls(readFileSync('app_styles_source.jsx', 'utf8'));
    const exportFaces = urls(readFileSync('ui_font_library_module.js', 'utf8'));
    expect(app.length, 'regular and bold in the app stylesheet').toBe(2);
    expect(exportFaces).toEqual(app);
    expect(app.some((u) => u.includes('opendyslexic@2.1.0-beta1')), app.join(' ')).toBe(false);
    expect(app.every((u) => /latin-(400|700)-normal\.woff$/.test(u)), app.join(' ')).toBe(true);
  });
});
