// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const read = (file) => readFileSync(file, 'utf8');
const desktopModules = resolve('desktop/web-app/node_modules');
const React = require(resolve(desktopModules, 'react'));
const { createRoot } = require(resolve(desktopModules, 'react-dom/client'));
const { act } = require(resolve(desktopModules, 'react-dom/test-utils'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const PNG_1X1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const SVG_URI = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%2010%22%3E%3Ccircle%20cx%3D%225%22%20cy%3D%225%22%20r%3D%224%22%2F%3E%3C%2Fsvg%3E';

function createFakeIndexedDB() {
  const stores = new Map();
  const dbObj = {
    objectStoreNames: {
      contains: (name) => stores.has(name),
    },
    createObjectStore: (name) => {
      if (!stores.has(name)) stores.set(name, new Map());
      return {};
    },
    transaction: (storeName) => {
      if (!stores.has(storeName)) stores.set(storeName, new Map());
      const map = stores.get(storeName);
      const tx = {
        oncomplete: null,
        onerror: null,
        onabort: null,
        objectStore: () => ({
          put: (row) => {
            map.set(row.id, row);
            queueMicrotask(() => {
              if (typeof tx.oncomplete === 'function') tx.oncomplete();
            });
            return {};
          },
          get: (id) => map.get(id),
        }),
      };
      return tx;
    },
    close: () => {},
  };
  return {
    stores,
    indexedDB: {
      open: (name, version) => {
        const req = {
          result: dbObj,
          error: null,
          onupgradeneeded: null,
          onsuccess: null,
          onerror: null,
          onblocked: null,
        };
        queueMicrotask(() => {
          if (typeof req.onupgradeneeded === 'function') req.onupgradeneeded();
          if (typeof req.onsuccess === 'function') req.onsuccess();
        });
        return req;
      },
    },
  };
}

function loadHostHandoffHandlers(overrides = {}) {
  const src = read('AlloFlowANTI.txt');
  const start = src.indexOf('const resolvePacketsDraftLang =');
  const end = src.indexOf('useEffect(() => {\n    window.__alloRunDictationTextCleanup', start);
  const altEnd = end >= 0 ? end : src.indexOf('useEffect(() => {\r\n    window.__alloRunDictationTextCleanup', start);
  expect(start).toBeGreaterThan(0);
  expect(altEnd).toBeGreaterThan(start);
  const snippet = src.slice(start, altEnd);

  const fakeIdb = createFakeIndexedDB();
  const openSpy = vi.fn();
  const addToast = vi.fn();
  const warnLog = vi.fn();
  const win = {
    indexedDB: fakeIdb.indexedDB,
    open: openSpy,
    AlloFlowLang: {
      bcp47Full: (name) => ({ English: 'en-US', Spanish: 'es-ES', French: 'fr-FR' }[name] || name),
    },
    ...(overrides.window || {}),
  };
  const factory = new Function(
    'window',
    'generatedContent',
    'sourceTopic',
    'leveledTextLanguage',
    'currentUiLanguage',
    'addToast',
    'warnLog',
    `${snippet}\nreturn { handleSendToVocabPacket, handleSendToWordSoundsPacket };`
  );
  const handlers = factory(
    win,
    overrides.generatedContent || null,
    overrides.sourceTopic || '',
    overrides.leveledTextLanguage || 'English',
    overrides.currentUiLanguage || 'English',
    addToast,
    warnLog
  );
  return { ...handlers, fakeIdb, openSpy, addToast, warnLog };
}

function loadViewModule(file, moduleKey) {
  window.React = React;
  window.AlloModules = window.AlloModules || {};
  delete window.AlloModules[moduleKey];
  const code = read(file);
  new Function(code)();
  return window.AlloModules[moduleKey];
}

let activeRoots = [];
function mountComponent(Component, props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(React.createElement(Component, props));
  });
  activeRoots.push({ root, container });
  return container;
}

afterEach(() => {
  activeRoots.forEach(({ root, container }) => {
    act(() => root.unmount());
    container.remove();
  });
  activeRoots = [];
  delete window.__alloSendToVocabPacket;
  delete window.__alloSendToWordSoundsPacket;
  delete window.AlloPacketPrintCards;
  vi.restoreAllMocks();
});

describe('Wave 4 Main App -> Packets 1-Click Handoffs', () => {
  it('registers and cleans up window.__alloSendToVocabPacket and __alloSendToWordSoundsPacket in AlloFlowANTI.txt', () => {
    const src = read('AlloFlowANTI.txt');
    expect(src).toContain('window.__alloSendToVocabPacket = handleSendToVocabPacket;');
    expect(src).toContain('window.__alloSendToWordSoundsPacket = handleSendToWordSoundsPacket;');
    expect(src).toContain('if (window.__alloSendToVocabPacket === handleSendToVocabPacket) delete window.__alloSendToVocabPacket;');
    expect(src).toContain('if (window.__alloSendToWordSoundsPacket === handleSendToWordSoundsPacket) delete window.__alloSendToWordSoundsPacket;');
  });

  it('handleSendToVocabPacket writes vocab draft to IndexedDB and opens packets-vocab.html#import-draft', async () => {
    const { handleSendToVocabPacket, fakeIdb, openSpy, addToast } = loadHostHandoffHandlers({
      sourceTopic: 'Ecosystems',
    });

    const ok = await handleSendToVocabPacket({
      title: 'Habitats & Biomes',
      lang: 'Spanish',
      entries: [
        {
          term: 'habitat',
          def: 'The natural home of a plant or animal.',
          contextSentence: 'A pond is a habitat for frogs.',
          partOfSpeech: 'noun',
          tier: 'Tier 3',
          image: PNG_1X1,
          imageAlt: 'Pond habitat',
        },
        {
          word: 'predator',
          meaning: 'An animal that hunts other animals.',
          example: 'The owl is a predator at night.',
          pos: 'noun',
          tier: 'Tier 2',
          imgUri: 'https://evil.example/tracker.png',
          alt: 'Blocked external image',
        },
      ],
    });

    expect(ok).toBe(true);
    const saved = fakeIdb.stores.get('files')?.get('draft');
    expect(saved).toBeTruthy();
    expect(saved.id).toBe('draft');
    expect(typeof saved.at).toBe('number');
    expect(saved.draft).toEqual({
      kind: 'vocab',
      title: 'Habitats & Biomes',
      lang: 'es',
      entries: [
        {
          word: 'habitat',
          meaning: 'The natural home of a plant or animal.',
          example: 'A pond is a habitat for frogs.',
          pos: 'noun',
          tier: 'Tier 3',
          imgUri: PNG_1X1,
          alt: 'Pond habitat',
        },
        {
          word: 'predator',
          meaning: 'An animal that hunts other animals.',
          example: 'The owl is a predator at night.',
          pos: 'noun',
          tier: 'Tier 2',
          imgUri: '',
          alt: 'Blocked external image',
        },
      ],
    });
    expect(openSpy).toHaveBeenCalledWith('packets-vocab.html#import-draft', '_blank', 'noopener');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Vocabulary Packet'), 'success');
  });

  it('handleSendToVocabPacket warns and returns false when glossary has no valid words', async () => {
    const { handleSendToVocabPacket, openSpy, addToast } = loadHostHandoffHandlers();
    const ok = await handleSendToVocabPacket({ entries: [] });
    expect(ok).toBe(false);
    expect(openSpy).not.toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('vocabulary word'), 'warning');
  });

  it('handleSendToWordSoundsPacket writes word_sounds draft with mapped activities and safe pictures', async () => {
    const { handleSendToWordSoundsPacket, fakeIdb, openSpy, addToast } = loadHostHandoffHandlers();

    const ok = await handleSendToWordSoundsPacket({
      title: 'SH Digraph Practice',
      lang: 'English',
      pattern: 'sh digraph',
      words: [
        { word: 'ship', image: PNG_1X1 },
        { word: 'SHIP' },
        { targetWord: 'shell', imgUri: 'javascript:alert(1)' },
        'fish',
      ],
      activities: ['syllable_counting', 'decoding', 'manipulation', 'syllable_blending', 'tracing', 'unknown_mode'],
      pictures: {
        fish: SVG_URI,
        __proto__: PNG_1X1,
      },
    });

    expect(ok).toBe(true);
    const saved = fakeIdb.stores.get('files')?.get('draft');
    expect(saved).toBeTruthy();
    expect(saved.id).toBe('draft');
    expect(saved.draft).toEqual({
      kind: 'word_sounds',
      title: 'SH Digraph Practice',
      lang: 'en',
      words: ['ship', 'shell', 'fish'],
      pattern: 'sh digraph',
      activities: ['counting', 'mapping', 'missing_letter', 'blending', 'letter_tracing'],
      pictures: {
        fish: SVG_URI,
        ship: PNG_1X1,
      },
    });
    expect(openSpy).toHaveBeenCalledWith('packets-make.html#import-draft', '_blank', 'noopener');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Word Sounds Packet'), 'success');
  });

  it('GlossaryView exposes teacher-only Send to Vocabulary Packet and Download Vocabulary Worksheet actions', async () => {
    const GlossaryView = loadViewModule('view_glossary_module.js', 'GlossaryView');
    const sendSpy = vi.fn().mockResolvedValue(true);
    window.__alloSendToVocabPacket = sendSpy;

    const capturedBlobs = [];
    const origCreateObjectURL = window.URL.createObjectURL;
    const origRevokeObjectURL = window.URL.revokeObjectURL;
    window.URL.createObjectURL = vi.fn((blob) => {
      capturedBlobs.push(blob);
      return 'blob:vocab-worksheet';
    });
    window.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const sampleGlossary = {
      id: 'gl-1',
      type: 'glossary',
      title: 'Weather Words',
      language: 'English',
      data: [
        {
          term: 'cyclone',
          def: 'A storm with strong spinning winds.',
          contextSentence: 'The cyclone moved across the warm ocean.',
          tier: 'Tier 3',
          image: PNG_1X1,
          imageAlt: 'Spinning storm diagram',
        },
        {
          term: 'humid',
          def: 'Having a lot of moisture in the air.',
          contextSentence: 'Summer afternoons can feel very humid.',
          tier: 'Tier 2',
        },
      ],
    };

    const baseProps = {
      t: (k) => k,
      generatedContent: sampleGlossary,
      filteredGlossaryData: sampleGlossary.data,
      isTeacherMode: true,
      activeView: 'glossary',
      glossaryFilter: 'all',
      glossarySearchTerm: '',
      setGlossarySearchTerm: () => {},
      handleExportFlashcards: () => {},
      handleSetGlossaryFilterToAll: () => {},
      handleSetGlossaryFilterToAcademic: () => {},
      handleSetGlossaryFilterToDomain: () => {},
      handleToggleIsEditingGlossary: () => {},
      isGeneratingTermImage: {},
      isGeneratingEtymology: {},
      glossaryRefinementInputs: {},
      refiningTermImage: {},
      glossaryImageProgress: {},
      selectedLanguages: [],
      displayLanguages: [],
    };

    const teacherRoot = mountComponent(GlossaryView, baseProps);

    // Open Present & Export panel
    const exportToggle = teacherRoot.querySelector('[data-glossary-export-toggle]');
    expect(exportToggle).toBeTruthy();
    act(() => { exportToggle.click(); });

    const sendBtn = teacherRoot.querySelector('[data-testid="glossary-send-vocab-packet"]');
    const wsBtn = teacherRoot.querySelector('[data-testid="glossary-download-worksheet"]');
    expect(sendBtn).toBeTruthy();
    expect(wsBtn).toBeTruthy();

    await act(async () => { sendBtn.click(); });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    const payload = sendSpy.mock.calls[0][0];
    expect(payload.title).toBe('Weather Words');
    expect(payload.entries).toHaveLength(2);
    expect(payload.entries[0].word).toBe('cyclone');
    expect(payload.entries[0].imgUri).toBe(PNG_1X1);

    // Trigger Download Vocabulary Worksheet (fallback monochrome generator)
    act(() => { wsBtn.click(); });
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(capturedBlobs).toHaveLength(1);
    const fallbackHtml = await capturedBlobs[0].text();
    expect(fallbackHtml).toContain("script-src 'none'");
    expect(fallbackHtml).not.toMatch(/<script\b/i);
    expect(fallbackHtml).toContain('data-vocab-part="matching"');
    expect(fallbackHtml).toContain('data-vocab-part="cloze"');
    expect(fallbackHtml).toContain('data-vocab-part="pictures"');
    expect(fallbackHtml).toContain('data-vocab-answer-key="true"');
    expect(fallbackHtml).toContain(PNG_1X1);

    // Also verify reuse of window.AlloPacketPrintCards.buildVocabWorksheetHtml when loaded
    const cards = require('../packets-print-cards.js');
    window.AlloPacketPrintCards = cards;
    act(() => { wsBtn.click(); });
    expect(capturedBlobs).toHaveLength(2);
    const cardsHtml = await capturedBlobs[1].text();
    expect(cardsHtml).toContain("script-src 'none'");
    expect(cardsHtml).toContain('Weather Words');

    // Student mode must NOT render teacher-only handoff or worksheet buttons
    const studentRoot = mountComponent(GlossaryView, { ...baseProps, isTeacherMode: false });
    expect(studentRoot.querySelector('[data-testid="glossary-send-vocab-packet"]')).toBeNull();
    expect(studentRoot.querySelector('[data-testid="glossary-download-worksheet"]')).toBeNull();

    window.URL.createObjectURL = origCreateObjectURL;
    window.URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('WordSoundsPreviewView exposes teacher-only Send to Word Sounds Packet button beside worksheet button', async () => {
    const WordSoundsPreviewView = loadViewModule('view_word_sounds_preview_module.js', 'WordSoundsPreviewView');
    const sendSpy = vi.fn().mockResolvedValue(true);
    window.__alloSendToWordSoundsPacket = sendSpy;

    const sampleLesson = {
      id: 'ws-1',
      title: 'Digraph SH Lesson',
      sessionConfig: { language: 'English', pattern: 'sh digraph' },
      data: [
        { word: 'ship', image: PNG_1X1 },
        { word: 'shop' },
      ],
    };

    const teacherRoot = mountComponent(WordSoundsPreviewView, {
      t: (k) => k,
      isTeacherMode: true,
      generatedContent: sampleLesson,
      wsActivitySequence: ['syllable_counting', 'mapping'],
    });

    const wsBtn = teacherRoot.querySelector('[data-ws-worksheet-btn="true"]');
    const sendBtn = teacherRoot.querySelector('[data-testid="word-sounds-send-packet"]');
    expect(wsBtn).toBeTruthy();
    expect(sendBtn).toBeTruthy();

    await act(async () => { sendBtn.click(); });
    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith({
      title: 'Digraph SH Lesson',
      lang: 'English',
      words: ['ship', 'shop'],
      pattern: 'sh digraph',
      activities: ['syllable_counting', 'mapping'],
      pictures: { ship: PNG_1X1 },
    });

    // Student mode must NOT render Send to Word Sounds Packet
    const studentRoot = mountComponent(WordSoundsPreviewView, {
      t: (k) => k,
      isTeacherMode: false,
      generatedContent: sampleLesson,
      wsActivitySequence: ['counting'],
    });
    expect(studentRoot.querySelector('[data-testid="word-sounds-send-packet"]')).toBeNull();
  });
});
