// Glossary batch 2 (2026-10-19): translation, direction, alt text, Tab stops,
// the pronunciation pop-up, and Word Practice, checked on the shipped modules.
//
// The glossary view, Document Builder and exporter load from their built
// modules; Word Practice runs in its own JSDOM window, as the app loads it.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require('./helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const UI = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const realT = (key) => {
  const value = String(key).split('.').reduce((o, k) => o && o[k], UI);
  return typeof value === 'string' ? value : undefined;
};
// A pack that translates a few keys and leaves the rest to English.
const packT = (map) => (key) => (key in map ? map[key] : realT(key) || key);

beforeAll(() => {
  window.React = React;
  new Function(readFileSync(process.env.GLOSSARY_VIEW_MODULE || 'view_glossary_module.js', 'utf8'))();
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
});

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.__alloStudentAiDisabled;
});

class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() { return this.state.error ? React.createElement('p', { 'data-crash': '1' }, String(this.state.error.message)) : this.props.children; }
}
function mountView(element) {
  const container = document.createElement('div');
  document.body.append(container);
  const root = ReactDOMClient.createRoot(container);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(React.createElement(Boundary, null, element)));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
  return container;
}
const view = (props) => React.createElement(window.AlloModules.GlossaryView, props);
const words = () => [
  { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', tier: 'Academic', translations: { Arabic: 'ورقة: جزء من النبات', Spanish: 'hoja: parte de una planta' } },
  { entryId: 'root', term: 'Root', def: 'The part of a plant under the ground.', tier: 'Domain-Specific', translations: { Arabic: 'جذر: تحت الأرض', Spanish: 'raíz: bajo la tierra' } },
  { entryId: 'stem', term: 'Stem', def: 'Holds the plant up.', tier: 'Domain-Specific', translations: { Arabic: 'ساق: تحمل النبات', Spanish: 'tallo: sostiene la planta' } },
];
function Deck({ extra = {} }) {
  const [index, setIndex] = React.useState(0);
  const data = words();
  return view(glossaryMediaProps({
    t: realT, isInteractiveFlashcards: true, generatedContent: { id: 'deck', type: 'glossary', data },
    filteredGlossaryData: data.map((item, i) => ({ ...item, _originalIdx: i })),
    flashcardIndex: index, setFlashcardIndex: (v) => setIndex(typeof v === 'function' ? v : () => v),
    isRtlLang: (lang) => lang === 'Arabic',
    setQuizSelectedOption: () => {}, setFlashcardFeedback: () => {}, setFlashcardScore: () => {}, setFlashcardOptions: () => {},
    setIsFlashcardFlipped: () => {}, setIsFlashcardQuizMode: () => {}, setStandardDeckLang: () => {}, ...extra,
  }));
}

describe('flash cards set the direction of right-to-left translations', () => {
  const textDir = (container, text) => [...container.querySelectorAll('[dir]')].filter((el) => el.textContent.includes(text)).at(-1)?.getAttribute('dir');
  it('Standard Deck support language: Arabic reads right to left, Spanish left to right', () => {
    expect(textDir(mountView(React.createElement(Deck, { extra: { standardDeckLang: 'Arabic' } })), 'ورقة')).toBe('rtl');
    expect(textDir(mountView(React.createElement(Deck, { extra: { standardDeckLang: 'Spanish' } })), 'hoja')).toBe('ltr');
  });
  it('Language Deck: the translated term is marked right to left', () => {
    const container = mountView(React.createElement(Deck, { extra: { flashcardMode: 'language', flashcardLang: 'Arabic' } }));
    const heading = [...container.querySelectorAll('h2')].find((h) => h.textContent.includes('ورقة'));
    expect(heading, 'the Arabic term heading').toBeTruthy();
    expect(heading.getAttribute('dir')).toBe('rtl');
  });
});

describe('flash-card progress dots are one Tab stop', () => {
  const dotsOf = (container) => {
    const group = [...container.querySelectorAll('[role="group"]')].find((g) => g.querySelector('button[tabindex]'));
    return [...group.querySelectorAll('button')];
  };
  const press = (el, key) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
  it('only the current card\'s dot is in the Tab order; arrows, Home and End move between dots', () => {
    const dots = dotsOf(mountView(React.createElement(Deck)));
    expect(dots).toHaveLength(3);
    expect(dots.map((d) => d.tabIndex)).toEqual([0, -1, -1]);
    dots[0].focus();
    press(dots[0], 'ArrowRight');
    expect(document.activeElement).toBe(dots[1]);
    press(dots[1], 'End');
    expect(document.activeElement).toBe(dots[2]);
    press(dots[2], 'ArrowRight');
    expect(document.activeElement, 'stops at the last dot').toBe(dots[2]);
    press(dots[2], 'Home');
    expect(document.activeElement).toBe(dots[0]);
  });
});

describe('the pronunciation pop-up says why there is no AI help', () => {
  const popup = (phonics) => {
    const container = mountView(view(glossaryMediaProps({ t: realT, phonicsData: { word: 'leaf', x: 10, y: 10, isLoading: false, data: null, ...phonics } })));
    return container.querySelector('[data-phonics-status]');
  };
  it('a timed-out check says so and offers a retry that runs the lookup again', () => {
    const retry = vi.fn();
    const box = popup({ aiStatus: 'error', aiErrorReason: 'timeout', retry, getAiAvailability: () => 'available' });
    expect(box.getAttribute('data-phonics-status')).toBe('error');
    expect(box.textContent.includes('took too long'), box.textContent).toBe(true);
    act(() => box.querySelector('[data-phonics-retry]').click());
    expect(retry).toHaveBeenCalledTimes(1);
  });
  it('AI turned off for the class: says so, and offers no retry that cannot work', () => {
    const box = popup({ aiStatus: 'disabled', retry: vi.fn(), getAiAvailability: () => 'disabled' });
    expect(box.getAttribute('data-phonics-status')).toBe('ai-disabled');
    expect(box.textContent.includes('turned off'), box.textContent).toBe(true);
    expect(box.querySelector('[data-phonics-retry]')).toBeNull();
  });
  it('the student AI switch alone also counts as turned off', () => {
    window.__alloStudentAiDisabled = true;
    const box = popup({ aiStatus: 'error', retry: vi.fn() });
    expect(box.getAttribute('data-phonics-status')).toBe('ai-disabled');
  });
  it('no retry while AI is unavailable in this app', () => {
    const box = popup({ aiStatus: 'error', aiErrorReason: 'not_available', retry: vi.fn(), getAiAvailability: () => 'unavailable' });
    expect(box.querySelector('[data-phonics-retry]')).toBeNull();
  });
});

describe('glossary strings come from the language pack, numbers inside the sentence', () => {
  it('the game word count is one translated sentence, not a number glued to English', () => {
    const t = packT({ 'glossary.activities.available_count': 'Hay {count} palabras para los juegos.' });
    const container = mountView(view(glossaryMediaProps({ t, isTeacherMode: true, generatedContent: { id: 'g', type: 'glossary', data: words() }, filteredGlossaryData: words().map((w, i) => ({ ...w, _originalIdx: i })) })));
    act(() => container.querySelector('button[aria-controls="glossary-games-tools"]').click());
    const pool = container.querySelector('[id="glossary-activity-pool"]');
    expect(pool, 'the activity pool status').toBeTruthy();
    expect(pool.textContent.includes('Hay 3 palabras para los juegos.'), pool.textContent).toBe(true);
    expect(pool.textContent.includes('words available'), pool.textContent).toBe(false);
  });
  it('every key the batch added is in ui_strings.js with its English', () => {
    for (const [key, english] of [
      ['glossary.popups.timeout', 'The pronunciation check took too long.'],
      ['glossary.activities.pair_count', '{count} pairs'],
      ['glossary.images.too_large', 'Choose an image smaller than 10 MB.'],
      ['glossary_health.reanalyze', 'Re-analyze'],
      ['export.h5p_ready', 'H5P package ready.'],
      ['common.export_screening_csv', 'Export Screening CSV'],
      ['word_practice.title', 'Present & Export'],
      ['word_practice.card_progress', 'Card {n} of {total}'],
    ]) expect(realT(key), key).toBe(english);
  });
});

describe('Document Builder glossary: language, direction and pictures', () => {
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
  function pack(data, mode, t = (key) => key) {
    window.AlloModules.ModuleScopeExtras = { getSpeechLangCode: (n) => ({ Arabic: 'ar-SA', Spanish: 'es-ES' })[n] || 'en-US', isRtlLang: (n) => n === 'Arabic' };
    cleanups.push(() => { delete window.AlloModules.ModuleScopeExtras; });
    const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t, isRtlLang: (n) => n === 'Arabic', updateExportPreview: () => {}, getDefaultTitle: () => 'Vocabulary', state: {} });
    const html = pipeline.generateFullPackHTML([{ type: 'glossary', id: 'g1', title: 'Vocabulary', data }], 'Pack', true, {}, { includeGlossary: true, includeTeacherKey: false, annotations: [], glossaryDisplayMode: mode });
    return new DOMParser().parseFromString(html, 'text/html');
  }
  const data = [
    { term: 'Leaf', def: 'A plant part', image, translations: { Arabic: 'ورقة', Spanish: 'hoja', Karen: 'lah' } },
    { term: 'Root', def: 'Under the ground', image, imageAlt: 'A carrot-shaped root', imageAltHash: 'img-stale-00000000' },
    { term: 'Stem', def: 'Holds the plant up', image, imageDecorative: true },
  ];
  it.each(['table', 'flash-cards'])('each translation carries its language and direction (%s)', (mode) => {
    const doc = pack(data, mode);
    const span = (text) => [...doc.querySelectorAll('span[dir]')].find((el) => el.textContent === text);
    expect(span('ورقة')?.getAttribute('dir')).toBe('rtl');
    expect(span('ورقة')?.getAttribute('lang')).toBe('ar');
    expect(span('hoja')?.getAttribute('lang')).toBe('es');
    expect(span('hoja')?.getAttribute('dir')).toBe('ltr');
    expect(span('lah')?.getAttribute('dir'), 'an unknown language').toBe('auto');
    expect(span('lah')?.hasAttribute('lang'), 'an unknown language must not be labelled English').toBe(false);
  });
  it.each(['table', 'flash-cards'])('a picture without a usable description is named by its term; only a decorative one is silent (%s)', (mode) => {
    const doc = pack(data, mode);
    const imgs = [...doc.querySelectorAll('img')];
    expect(imgs.map((img) => img.getAttribute('alt'))).toEqual(['Leaf', 'Root', '']);
    expect(imgs.map((img) => img.getAttribute('role'))).toEqual([null, null, 'presentation']);
  });
  it('card labels and controls come from the language pack', () => {
    const t = (key) => ({ 'glossary.export_cards_aria': 'Tarjetas del glosario', 'glossary.export_no_translations': '(sin traducciones)' })[key] || key;
    // Language cards note a card that has no translation when others do.
    const doc = pack([{ term: 'Leaf', def: 'A plant part', translations: { Spanish: 'hoja' } }, { term: 'Root', def: 'Under the ground' }], 'language-cards', t);
    expect(doc.querySelector('[aria-label="Tarjetas del glosario"]'), 'the card list label').toBeTruthy();
    expect(doc.body.textContent.includes('(sin traducciones)'), 'the empty-translations note').toBe(true);
    expect(doc.body.textContent.includes('(no translations)'), 'English leaked').toBe(false);
  });
});

describe('exporter', () => {
  it('flash-card HTML names an undescribed picture by its term', () => {
    const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    const blobs = [];
    vi.useFakeTimers();
    vi.stubGlobal('Blob', class { constructor(parts) { this.parts = parts; blobs.push(this); } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:cards');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const escapeXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    window.AlloModules.createExport({ liveRef: { current: { generatedContent: { type: 'glossary', data: [{ term: 'Leaf', def: 'A plant part.', image }, { term: 'Stem', def: 'Holds it up.', image: image + '%20', imageDecorative: true }] }, t: (k) => realT(k) || k, addToast: vi.fn() } }, escapeXml }).handleExportFlashcards('standard');
    const doc = new DOMParser().parseFromString(blobs.at(-1).parts.join(''), 'text/html');
    const [img, decorative] = doc.querySelectorAll('img');
    expect(img?.getAttribute('alt')).toBe('Leaf');
    expect(img?.getAttribute('role')).toBeNull();
    expect(decorative?.getAttribute('alt'), 'a picture marked decorative stays silent').toBe('');
    expect(decorative?.getAttribute('role')).toBe('presentation');
  });
  it('H5P messages come from the language pack, with English when the pack lacks one', async () => {
    vi.stubGlobal('JSZip', function JSZip() {});
    const run = async (t) => {
      const addToast = vi.fn();
      await window.AlloModules.createExport({ liveRef: { current: { generatedContent: { type: 'adventure', data: {} }, t, addToast } }, escapeXml: String }).handleExportH5P();
      return addToast.mock.calls[0][0];
    };
    expect(await run((k) => ({ 'export.h5p_unsupported_type': 'La exportación H5P admite cuestionarios, glosarios y tarjetas.' })[k] || k)).toBe('La exportación H5P admite cuestionarios, glosarios y tarjetas.');
    expect(await run((k) => k)).toBe('H5P export supports quizzes, glossaries, and flashcards.');
  });
});

describe('Word Practice: translated dialog and player, offline file language', () => {
  const coreSource = readFileSync('word_practice_core.js', 'utf8');
  const uiSource = readFileSync('word_practice_ui.js', 'utf8');
  const windows = [];
  function load() {
    const dom = new JSDOM('<!doctype html><html><body><button id="launch">Launch</button></body></html>', { runScripts: 'outside-only', url: 'https://alloflow.example' });
    windows.push(dom.window); cleanups.push(() => { while (windows.length) windows.pop().close(); });
    dom.window.eval(coreSource); dom.window.eval(uiSource);
    return dom.window;
  }
  const buttonIn = (doc, text) => [...doc.querySelectorAll('button')].find((node) => node.textContent === text);
  const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
  const SPANISH = {
    'word_practice.title': 'Presentar y exportar', 'word_practice.present': 'Presentar', 'word_practice.coverage': '{count} palabras',
    'word_practice.next': 'Siguiente', 'word_practice.card_progress': 'Tarjeta {n} de {total}', 'word_practice.download_html': 'Descargar HTML',
  };
  const t = (key) => SPANISH[key] || key;

  it('the setup dialog and the live player use the pack, with English for keys it lacks', async () => {
    const win = load();
    win.AlloModules.WordPractice.open({ words: ['ship', 'rain'], options: { repetitions: 1, shuffle: false }, t });
    const doc = win.document;
    expect(doc.querySelector('[role="dialog"]').getAttribute('aria-label')).toBe('Presentar y exportar');
    expect(doc.querySelector('h1').textContent).toBe('Presentar y exportar');
    expect([...doc.querySelectorAll('.awp-note')].some((p) => p.textContent === '2 palabras'), 'coverage line with its number').toBe(true);
    expect(buttonIn(doc, 'Download PowerPoint'), 'an untranslated key keeps its English').toBeTruthy();
    buttonIn(doc, 'Presentar').click(); await tick();
    expect(buttonIn(doc, 'Siguiente'), 'the player got the translated label').toBeTruthy();
    expect(buttonIn(doc, 'Previous'), 'English for a player key the pack lacks').toBeTruthy();
    expect(doc.querySelector('.awp-progress').textContent).toBe('Tarjeta 1 de 2');
  });

  it('the offline HTML file carries the explicit interface language independently from lesson content', () => {
    const win = load();
    win.AlloModules.ModuleScopeExtras = { getSpeechLangCode: (n) => (n === 'Arabic' ? 'ar-SA' : 'en-US'), isRtlLang: (n) => n === 'Arabic' };
    const html = win.AlloModules.WordPractice.buildHtml({ words: [{ word: 'ship', termLanguage: 'English' }], language: 'Arabic' }, { repetitions: 1 }, undefined, { next: 'التالي', practice_label: 'تدريب الكلمات' }, undefined, 'Arabic');
    expect(html.startsWith('<!doctype html><html lang="ar" dir="rtl">'), html.slice(0, 60)).toBe(true);
    const offline = new JSDOM(html, { runScripts: 'dangerously' });
    windows.push(offline.window);
    expect(buttonIn(offline.window.document, 'التالي'), 'translated Next in the offline player').toBeTruthy();
    expect(buttonIn(offline.window.document, 'Previous'), 'English for the rest').toBeTruthy();
    expect(offline.window.document.querySelector('main').getAttribute('aria-label')).toBe('تدريب الكلمات');
    expect(offline.window.document.querySelector('.awp-word').lang).toBe('en');
    expect(win.AlloModules.WordPractice.buildHtml({ words: ['ship'], language: 'fr' }).startsWith('<!doctype html><html lang="en" dir="ltr">')).toBe(true);
    delete win.AlloModules.ModuleScopeExtras;
    expect(win.AlloModules.WordPractice.buildHtml({ words: ['ship'], language: 'Arabic' }, undefined, undefined, undefined, undefined, 'Arabic').startsWith('<!doctype html><html lang="ar" dir="rtl">'), 'the portable resolver recognizes the explicit Arabic interface without host helpers').toBe(true);
  });

  it('closing right after a download does not cancel it; the link is released later', () => {
    const win = load();
    const revoked = [], timers = [];
    win.URL.createObjectURL = () => 'blob:practice';
    win.URL.revokeObjectURL = (url) => revoked.push(url);
    win.HTMLAnchorElement.prototype.click = () => {};
    win.setTimeout = (fn, ms) => { timers.push({ fn, ms }); return timers.length; };
    win.AlloModules.WordPractice.open({ words: ['ship'], t });
    buttonIn(win.document, 'Descargar HTML').click();
    return Promise.resolve().then(() => Promise.resolve()).then(() => {
      buttonIn(win.document, 'Close').click();
      expect(revoked, 'revoked on close').toEqual([]);
      const release = timers.find((timer) => timer.ms === 30000);
      expect(release, 'a delayed release').toBeTruthy();
      release.fn();
      expect(revoked).toEqual(['blob:practice']);
    });
  });
});
