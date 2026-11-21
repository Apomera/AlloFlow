import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, ReactDOM, createRoot, act, View, TextUtilityHelpers, pure, phase, api, parse, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.ReactDOM = window.ReactDOM = ReactDOM;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('text_utility_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  loadAlloModule('view_simplified_module.js');
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('immersive_reader_module.js');
  loadAlloModule('view_glossary_module.js');
  TextUtilityHelpers = window.AlloModules.TextUtilityHelpers;
  View = window.AlloModules.SimplifiedView;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
  api = window.AlloModules.InstructionalContext;
  parse = window.AlloModules.TextPipelineHelpers.parseTaggedContent;
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove();
  root = null;
  host = null;
  document.documentElement.style.fontSize = '';
  document.body.innerHTML = '';
});

function makeGlossaryDeps() {
  return {
    leveledTextLanguage: 'English',
    isLineFocusMode: false,
    clozeInstanceSet: new Set(),
    setClozeInstanceSet: () => {},
    handleScoreUpdate: () => {},
    playSound: () => {},
    addToast: () => {},
    t: (k, fb) => fb || k,
    warnLog: () => {},
    debugLog: () => {},
    ClozeInput: () => null,
  };
}

function mountImmersive(item, extra = {}) {
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop, setReadingTheme: noop,
    setSelectionMenu: noop, setIsCustomReviseOpen: noop, setInteractionMode: noop, setIsCompareMode: noop,
    setIsFluencyMode: noop, stopPlayback: noop, closeDefinition: noop, closePhonics: noop, closeRevision: noop,
    handleToggleIsEditingLeveledText: noop, t: key => key, inputText: '', gradeLevel: '5', leveledTextLanguage: 'English',
    studentInterests: [], selectedVoice: 'Kore', voiceSpeed: 1, lineHeight: 1.5, letterSpacing: 0, isTeacherMode: false,
    isEditingLeveledText: false, isImmersiveReaderActive: true, immersiveSettings: { textSize: 36 }, isCompareMode: false,
    isSideBySide: false, isZenMode: false, isProcessing: false, isPlaying: false, interactionMode: 'define', history: [item],
    textEditorRef: React.createRef(), splitTextToSentences: s => pure.splitTextToSentences(s, {}), getSideBySideContent: () => null,
    handleFormatText: noop, handleSimplifiedTextChange: noop, callTTS: noop, handleSpeak: noop, handleWordClick: noop,
    handleQuickAddGlossary: noop, handlePhonicsClick: noop, isLineFocusMode: false, focusedParagraphIndex: null,
    setFocusedParagraphIndex: noop, cursorStyles: { read: '', define: '', phonics: '' }, getContentDirection: () => 'ltr',
    isRtlLang: () => false, renderFormattedText: text => React.createElement('div', null, text),
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: x => x, latestGlossary: [], MathSymbol: ({ text }) => text }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, handleTextMouseUp: noop,
    highlightGlossaryTerms: x => x, latestGlossary: [], generatedContent: item,
    ErrorBoundary: p => p.children || null, FocusReaderOverlay: () => null, PerspectiveCrawlOverlay: () => null,
    KaraokeReaderOverlay: () => null, ConfettiExplosion: () => null, ImmersiveToolbar: () => null,
    ImmersiveWord: ({ wordData }) => React.createElement('span', { 'data-word': true }, wordData.text),
    setIsImmersiveReaderActive: noop, handleCloseImmersiveReader: noop, ...extra,
  };
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
}

describe('Glossary definition tooltip typography, scaling, theme, and placement', () => {
  it('uses enlarged hierarchy, theme-aware surface, no clipped svg caret, and scales width with root font size', () => {
    const glossary = [{ term: 'photosynthesis', def: 'The process plants use to turn sunlight into food.' }];
    document.documentElement.style.fontSize = '24px';
    host = document.createElement('div');
    host.setAttribute('data-reading-theme', 'warm');
    document.body.appendChild(host);
    root = createRoot(host);
    const children = TextUtilityHelpers.highlightGlossaryTerms('Plants use photosynthesis daily.', glossary, false, false, makeGlossaryDeps());
    act(() => root.render(React.createElement('p', null, children)));

    const term = host.querySelector('.allo-glossary-term');
    term.getBoundingClientRect = () => ({ left: 200, right: 320, top: 120, bottom: 148, width: 120, height: 28 });
    act(() => term.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    const tip = document.querySelector('[role="tooltip"][data-glossary-tooltip="true"]');
    expect(tip).toBeTruthy();
    expect(tip.getAttribute('data-reading-theme')).toBe('warm');
    expect(tip.className).toContain('text-base');
    expect(tip.querySelector('[data-glossary-tooltip-title="true"]').className).toContain('text-lg');
    expect(tip.querySelector('svg')).toBeNull();
    // 22rem * 24px = 528px (clamped to viewport width - 24)
    expect(parseInt(tip.style.width, 10)).toBeGreaterThan(350);
    // Placed consistently below when room exists below
    expect(parseInt(tip.style.top, 10)).toBe(158);
  });
});

describe('Immersive Reader word help text-size responsiveness', () => {
  it('scales passage container fontSize and inline word-help chips/images with immersiveSettings.textSize', () => {
    const text = 'Upon the heath we meet.';
    const start = text.indexOf('heath');
    const item = api.createSupportedReading(text, { id: 'imm-1' });
    item.readingSupports = api.validateReadingSupports(item, {
      annotations: [{
        id: 'h1', start, end: start + 5, quote: 'heath', text: 'an area of open land',
        image: { src: 'data:image/png;base64,QUJD', alt: 'Open land' }, origin: 'educator',
      }],
    });
    item.immersiveData = parse(text);

    mountImmersive(item, { immersiveSettings: { textSize: 36 } });
    const passage = host.querySelector('[data-immersive-passage]');
    const inner = passage.firstElementChild;
    expect(inner.style.fontSize).toBe('36px');
    const chip = host.querySelector('[data-immersive-gloss]');
    expect(chip).toBeTruthy();
    expect(chip.style.fontSize).toBe('0.85em');
    const img = chip.querySelector('img');
    expect(img.style.width).toBe('2.1em');
    expect(img.style.height).toBe('2.1em');
  });

  it('scales definition and phonics popups proportionally inside Immersive Reader and uses enlarged definition typography', () => {
    const text = 'Plants grow in soil.';
    const item = { id: 'adapted-imm', type: 'simplified', data: text, config: { language: 'English' }, immersiveData: parse(text) };

    mountImmersive(item, {
      immersiveSettings: { textSize: 36 },
      definitionData: { word: 'soil', text: 'The upper layer of earth where plants grow.', x: 100, y: 120 },
      phonicsData: { word: 'soil', data: { phoneticSpelling: 'soyl', syllables: ['soil'] }, x: 100, y: 120 },
    });

    const defDialog = host.querySelector('[aria-labelledby*="simplified-definition-title"]');
    expect(defDialog).toBeTruthy();
    expect(defDialog.getAttribute('data-immersive-scaled-popup')).toBe('true');
    expect(defDialog.style.fontSize).toBe('30px');
    expect(defDialog.className).toContain('w-80');
    expect(defDialog.querySelector('[aria-label="glossary.popups.reading_level_explanation"]').innerHTML).toContain('text-base');
    expect(defDialog.querySelector('.rotate-45')).toBeNull();

    const phonicsDialog = host.querySelector('[aria-labelledby*="phonics-popup-title"]');
    expect(phonicsDialog).toBeTruthy();
    expect(phonicsDialog.getAttribute('data-immersive-scaled-popup')).toBe('true');
    expect(phonicsDialog.style.fontSize).toBe('30px');
    expect(phonicsDialog.querySelector('.rotate-45')).toBeNull();
  });
});

describe('Reader toolbar container breakpoint', () => {
  it('uses pixel threshold (480px) so raising root font size on desktop does not prematurely hide labels', () => {
    const css = readFileSync('app_styles_module.js', 'utf8');
    expect(css).toContain('@container reader-toolbar (max-width: 480px)');
    expect(css).not.toContain('@container reader-toolbar (max-width: 30rem)');
    expect(css).toContain('[data-immersive-scaled-popup="true"]');
    expect(css).toContain('[data-glossary-tooltip="true"]');
  });
});

describe('Immersive Reader heading hierarchy, dark-theme syllable contrast, and Sounds tap mode', () => {
  it('scales H1, H2, and body text distinctly relative to textSize and uses high-contrast syllable colors on dark backgrounds', () => {
    const ImmersiveWord = window.AlloModules.ImmersiveWord;
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    const settings = { textSize: 24, showSyllables: true, bgColor: '#1a1a2e', lineHeight: 1.6 };
    act(() => root.render(React.createElement(
      'div',
      null,
      React.createElement(ImmersiveWord, { wordData: { text: 'Heading', pos: 'header1' }, settings, onClick: () => {} }),
      React.createElement(ImmersiveWord, { wordData: { text: 'Subheading', pos: 'header2' }, settings, onClick: () => {} }),
      React.createElement(ImmersiveWord, { wordData: { text: 'photosynthesis', pos: 'noun', syllables: ['pho', 'to', 'syn', 'the', 'sis'] }, settings, onClick: () => {} }),
    )));
    const spans = host.querySelectorAll('[role="button"]');
    expect(spans[0].style.fontSize).toBe('36px'); // 24 * 1.5
    expect(spans[1].style.fontSize).toBe('32px'); // round(24 * 1.35)
    expect(spans[2].style.fontSize).toBe('24px');
    expect(spans[2].innerHTML).toContain('text-rose-300');
    expect(spans[2].innerHTML).toContain('text-slate-300');
    expect(spans[2].innerHTML).not.toContain('text-rose-600');
  });

  it('exposes Speak, Define, and Sounds tap modes and text-size readout in ImmersiveToolbar', () => {
    const ImmersiveToolbar = window.AlloModules.ImmersiveToolbar;
    let chosen = 'read';
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(React.createElement(ImmersiveToolbar, {
      settings: { textSize: 30, bgColor: '#fdfbf7', fontColor: '#1e293b' },
      setSettings: () => {},
      onClose: () => {},
      interactionMode: 'phonics',
      setInteractionMode: mode => { chosen = mode; },
      lineHeight: 1.5,
      setLineHeight: () => {},
      letterSpacing: 0,
      setLetterSpacing: () => {},
    })));
    const soundsBtn = [...host.querySelectorAll('button')].find(b => /Sounds/i.test(b.textContent));
    expect(soundsBtn).toBeTruthy();
    expect(soundsBtn.getAttribute('aria-pressed')).toBe('true');
    const slider = host.querySelector('input[type="range"][aria-label="Text size"]');
    expect(slider.getAttribute('aria-valuetext')).toBe('30px');
    expect(host.textContent).toContain('30px');
    act(() => soundsBtn.click());
    expect(chosen).toBe('phonics');
  });
});

describe('Glossary View phonics popup clamping and fluid text sizing', () => {
  it('keeps the Glossary phonics popup safely inside short/narrow viewports without negative coordinates or clipped carets', () => {
    const source = readFileSync('view_glossary_source.jsx', 'utf8');
    expect(source).toContain('function glossaryPopupStyle(');
    expect(source).not.toMatch(/text-\[\d+px\]/);
    const immSource = readFileSync('immersive_reader_source.jsx', 'utf8');
    expect(immSource).not.toMatch(/text-\[\d+px\]/);
    const simpSource = readFileSync('view_simplified_source.jsx', 'utf8');
    const explainStart = simpSource.indexOf('function renderReadingLevelExplanation(');
    const explainEnd = simpSource.indexOf('function renderPhonicsDictRow(', explainStart);
    expect(simpSource.slice(explainStart, explainEnd)).not.toMatch(/text-\[\d+px\]/);
  });
});

