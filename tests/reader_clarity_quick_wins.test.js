// Reader clarity quick wins (2026-10-29).
// - An original with supports has no Edit button by design; it now says why and
//   offers to open the text it was made from (the analysis, else the source box).
// - "Think about this section" is a quiet section break, not a boxed button.
// - The gap between adapted paragraphs grows with the text size.
// - Analyze Source carries a subtitle naming it as the place to revise the source.
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const TEXT = 'Plants need light. Roots take in water.';
const SECTIONS = '## Leaves\n\nLeaves collect light. They make food.\n\n## Roots\n\nRoots take in water. They hold the plant in place.';
let React, createRoot, act, View, contract, pure, phase, root, host;

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.AlloLanguageContext = React.createContext({ t: key => key });
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('pure_helpers_module.js');
  loadAlloModule('phase_n_misc_helpers_module.js');
  contract = window.AlloModules.InstructionalContext;
  pure = window.AlloModules.PureHelpers;
  phase = window.AlloModules.PhaseNHelpers;
});

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('alloflow_reading_show_changes', 'off');
  delete window.AlloModules.SimplifiedView;
  new Function(readFileSync(process.env.ALLO_VIEW_CANDIDATE || 'view_simplified_module.js', 'utf8'))();
  View = window.AlloModules.SimplifiedView;
  window.__alloGetReadAloudAudioSummary = texts => ({ total: texts.length, ready: texts.length, stale: 0, corrupt: 0, missing: 0 });
});

afterEach(() => {
  if (root) act(() => root.unmount());
  host?.remove(); root = null; host = null;
  delete window.__alloOpenSourceForRevision;
  delete window.__alloGetReadAloudAudioSummary;
  vi.restoreAllMocks();
});

function original({ fromAnalysis = true } = {}) {
  const snapshot = contract.createSourceSnapshot(TEXT, fromAnalysis
    ? { language: 'English', sourceArtifactId: 'analysis-1', selection: 'saved-analysis' }
    : { language: 'English', selection: 'input' });
  return contract.createSupportedReading(snapshot, { id: 'original-1' });
}
const analysis = { id: 'analysis-1', type: 'analysis', data: { originalText: TEXT }, config: { language: 'English' } };
function adapted(data = TEXT) {
  return { id: 'adapted-1', type: 'simplified', data, sourceFamilyId: 'plants', instructionalText: { form: 'adapted', role: 'supplemental' },
    config: { language: 'English', grade: '5' }, sourceSnapshot: contract.createSourceSnapshot(data, { language: 'English' }) };
}

function mount(extra = {}) {
  const noop = () => {};
  const props = {
    ComplexityGauge: () => null, t: key => key, gradeLevel: '5', leveledTextLanguage: 'English', selectedVoice: 'Kore', voiceSpeed: 1,
    isTeacherMode: true, isZenMode: false, isStudentPreview: false, isProcessing: false, readingLearnerKey: 'clarity-learner',
    isTeacherToolbarExpanded: false, isEditingLeveledText: false, interactionMode: 'read',
    inputText: '', studentInterests: [], textEditorRef: React.createRef(),
    splitTextToSentences: text => pure.splitTextToSentences(text, {}), getSideBySideContent: () => null,
    handleSpeak: vi.fn(), stopPlayback: vi.fn(), cursorStyles: {}, getContentDirection: () => 'ltr', isRtlLang: () => false,
    renderFormattedText: text => text,
    formatInteractiveText: (text, cloze) => phase.formatInteractiveText(text, cloze, false, { highlightGlossaryTerms: value => value, latestGlossary: [], MathSymbol: ({ text: value }) => value }),
    SourceReferencesPanel: () => null, playbackState: { currentIdx: -1 }, highlightGlossaryTerms: text => text, latestGlossary: [],
    setFocusedParagraphIndex: noop, setComplexityLevel: noop, setSaveOriginalOnAdjust: noop,
    handleToggleIsEditingLeveledText: vi.fn(), handleSimplifiedTextChange: vi.fn(), handleFormatText: noop,
    handleWordClick: noop, handleQuickAddGlossary: noop, handlePhonicsClick: noop, setSelectionMenu: noop,
    onReadOriginal: noop, onOpenReadingArtifact: noop, onFocusViewChange: vi.fn(),
    setIsCompareMode: vi.fn(), setInteractionMode: vi.fn(), setReadingTheme: vi.fn(),
    handleToggleIsTeacherToolbarExpanded: vi.fn(), closeDefinition: noop, closePhonics: noop, closeRevision: noop, ...extra,
  };
  if (!props.history) props.history = [props.generatedContent];
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  act(() => root.render(React.createElement(View, props)));
  return props;
}
const find = selector => host.querySelector(selector);
const editButton = () => find('[data-help-key="simplified_edit"]');

describe('original with supports explains where to revise', () => {
  it('replaces the missing Edit button with a note and opens the analysis it came from', () => {
    const hook = vi.fn(() => 'analysis');
    window.__alloOpenSourceForRevision = hook;
    const item = original();
    mount({ generatedContent: item, history: [analysis, item] });
    expect(editButton()).toBeNull();
    const note = find('[data-original-revision-note]');
    expect(note.textContent).toContain('kept word-for-word');
    const revise = find('[data-original-revise]');
    expect(revise.textContent).toBe('Revise in Analyze Source');
    act(() => revise.click());
    expect(hook).toHaveBeenCalledWith('analysis-1');
  });

  it('sends a teacher to the source box when the original came from it', () => {
    const hook = vi.fn(() => 'input');
    window.__alloOpenSourceForRevision = hook;
    const item = original({ fromAnalysis: false });
    mount({ generatedContent: item, history: [item] });
    const revise = find('[data-original-revise]');
    expect(revise.textContent).toBe('Revise the source text');
    act(() => revise.click());
    expect(hook).toHaveBeenCalledWith(null);
  });

  it('treats a deleted analysis like the source box', () => {
    const hook = vi.fn();
    window.__alloOpenSourceForRevision = hook;
    const item = original();
    mount({ generatedContent: item, history: [item] });
    act(() => find('[data-original-revise]').click());
    expect(hook).toHaveBeenCalledWith(null);
  });

  it('does not send a teacher to a source that is not an analysis', () => {
    const hook = vi.fn();
    window.__alloOpenSourceForRevision = hook;
    const item = original();
    const sameIdReading = { id: 'analysis-1', type: 'simplified', data: TEXT };
    mount({ generatedContent: item, history: [sameIdReading, item] });
    expect(find('[data-original-revise]').textContent).toBe('Revise the source text');
    act(() => find('[data-original-revise]').click());
    expect(hook).toHaveBeenCalledWith(null);
  });

  it('keeps the note but offers no button on a host without the hook', () => {
    const item = original();
    mount({ generatedContent: item, history: [analysis, item] });
    expect(find('[data-original-revision-note]')).not.toBeNull();
    expect(find('[data-original-revise]')).toBeNull();
  });

  it('leaves adapted text with its Edit button and no note', () => {
    window.__alloOpenSourceForRevision = vi.fn();
    mount({ generatedContent: adapted() });
    expect(editButton()).not.toBeNull();
    expect(find('[data-original-revision-note]')).toBeNull();
  });

  it('shows nothing to students or in Zen mode', () => {
    window.__alloOpenSourceForRevision = vi.fn();
    const item = original();
    mount({ generatedContent: item, history: [analysis, item], isZenMode: true });
    expect(find('[data-original-revision-note]')).toBeNull();
    act(() => root.unmount()); host.remove();
    mount({ generatedContent: item, history: [analysis, item], isTeacherMode: false });
    expect(find('[data-original-revision-note]')).toBeNull();
  });
});

describe('section question marker and paragraph spacing', () => {
  it('draws the section question as a quiet break that still opens the questions', () => {
    mount({ generatedContent: adapted(SECTIONS), isTeacherMode: false, isZenMode: true });
    const toggle = find('[data-section-think="0"] [data-section-think-toggle]');
    expect(toggle).not.toBeNull();
    expect(toggle.className).not.toMatch(/\bborder\b/);
    expect(toggle.textContent).toContain('Think about this section');
    expect(toggle.previousElementSibling.getAttribute('aria-hidden')).toBe('true');
    act(() => toggle.click());
    expect(find('[data-section-think="0"] [data-section-prompts]')).not.toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
  });

  it('spaces adapted paragraphs relative to the text size', () => {
    mount({ generatedContent: adapted(SECTIONS), isTeacherMode: false, isZenMode: true });
    const paragraphs = host.querySelectorAll('[data-reading-paragraph]');
    expect(paragraphs.length).toBeGreaterThan(1);
    for (const node of paragraphs) {
      expect(node.style.marginBottom).toBe('1.15em');
      expect(node.className).not.toMatch(/\bmb-4\b/);
    }
  });
});

describe('original paragraphs separated by one line break', () => {
  const LONG_A = 'Plants make their own food by using the energy in sunlight, water drawn up from the soil, and carbon dioxide taken in from the surrounding air.';
  const LONG_B = 'The roots of a plant anchor it firmly in the ground and take up the water and minerals that every other part of the growing plant depends on.';
  const POEM = 'The rose is red,\nthe violet blue,\nthe honey sweet,\nand so are you.';
  function originalOf(text) {
    return contract.createSupportedReading(contract.createSourceSnapshot(text, { language: 'English', selection: 'input' }), { id: 'spacing-' + text.length });
  }
  const lines = () => [...host.querySelectorAll('[data-original-source] [data-reading-paragraph]')];

  it('shows long single-break lines as spaced paragraphs without changing the text', () => {
    const text = LONG_A + '\n' + LONG_B;
    mount({ generatedContent: originalOf(text), isTeacherMode: false, isZenMode: true });
    expect(lines()).toHaveLength(2);
    for (const node of lines()) {
      expect(node.style.display).toBe('inline-block');
      expect(node.style.marginBottom).toBe('0.75em');
    }
    expect(find('[data-original-source]').textContent).toBe(text);
  });

  it('leaves short lines such as a poem as they are', () => {
    mount({ generatedContent: originalOf(POEM), isTeacherMode: false, isZenMode: true });
    expect(lines().length).toBe(4);
    for (const node of lines()) expect(node.style.marginBottom).toBe('');
  });

  it('leaves text that already has blank lines between paragraphs as it is', () => {
    const text = LONG_A + '\n\n' + LONG_B + '\n' + LONG_A;
    mount({ generatedContent: originalOf(text), isTeacherMode: false, isZenMode: true });
    for (const node of lines()) expect(node.style.marginBottom).toBe('');
    expect(find('[data-original-source]').textContent).toBe(text);
  });
});

describe('fill in the blanks on an original', () => {
  const GLOSSARY = [{ term: 'roots', def: 'Plant parts under the ground.' }];
  // Stands in for the host's highlighter: the real one renders ClozeInput blanks.
  function blankingHighlighter(solved = false) {
    return vi.fn((text, glossary, isCloze, _dark, key) => {
      if (!isCloze) return text;
      return String(text).split(/(roots)/i).map((part, index) => /^roots$/i.test(part)
        ? React.createElement('input', { key: index, 'data-cloze-blank': true, 'data-cloze-solved': String(solved), 'data-key': key, 'aria-label': 'blank' })
        : part);
    });
  }
  const passage = () => find('[data-original-source]');

  it('draws blanks over the glossary terms while the stored original stays word-for-word', () => {
    const item = original({ fromAnalysis: false });
    const stored = item.data;
    const highlight = blankingHighlighter();
    mount({ generatedContent: item, isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', latestGlossary: GLOSSARY, highlightGlossaryTerms: highlight });
    const blanks = passage().querySelectorAll('[data-cloze-blank]');
    expect(blanks).toHaveLength(1);
    expect(blanks[0].getAttribute('data-key')).toMatch(/^original\.\d+$/);
    expect(highlight.mock.calls.every(call => call[2] === true)).toBe(true);
    expect(passage().textContent).toContain('Plants need light.');
    expect(item.data).toBe(stored);
  });

  it('offers the activity on an original that has glossary terms', () => {
    const item = original({ fromAnalysis: false });
    mount({ generatedContent: item, isTeacherMode: false, isZenMode: true, latestGlossary: GLOSSARY, highlightGlossaryTerms: blankingHighlighter() });
    expect(find('[data-help-key="simplified_cloze_mode"]')).not.toBeNull();
  });

  it('celebrates when every blank in the original is solved', () => {
    const item = original({ fromAnalysis: false });
    mount({ generatedContent: item, isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', latestGlossary: GLOSSARY, highlightGlossaryTerms: blankingHighlighter(true), ConfettiExplosion: () => null });
    expect(find('[data-a11y-overlay="nonmodal-status"]')).not.toBeNull();
  });

  it('stays in reading mode side by side, where the other pane would show the answers', () => {
    const item = original({ fromAnalysis: false });
    const highlight = blankingHighlighter();
    mount({ generatedContent: item, isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', isCompareMode: true, latestGlossary: GLOSSARY, highlightGlossaryTerms: highlight });
    expect(host.querySelectorAll('[data-cloze-blank]')).toHaveLength(0);
    expect(highlight.mock.calls.some(call => call[2] === true)).toBe(false);
  });

  it('stays in reading mode on an original with no glossary terms', () => {
    const item = original({ fromAnalysis: false });
    mount({ generatedContent: item, isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', latestGlossary: [], highlightGlossaryTerms: blankingHighlighter() });
    expect(passage().querySelectorAll('[data-cloze-blank]')).toHaveLength(0);
    expect(find('[data-help-key="simplified_cloze_mode"]')).toBeNull();
    expect(passage().textContent).toBe(item.data);
  });
});

describe('word card after a correct fill-in-the-blank answer', () => {
  const helpers = () => {
    if (!window.AlloModules.TextUtilityHelpers) new Function(readFileSync(process.env.ALLO_TEXT_HELPERS_CANDIDATE || 'text_utility_helpers_module.js', 'utf8'))();
    return window.AlloModules.TextUtilityHelpers;
  };
  const ROOTS = { term: 'roots', def: 'Plant parts under the ground.', image: { src: 'data:image/png;base64,AA==', alt: 'Roots in soil' }, translations: { Spanish: 'raíces: partes de la planta' } };
  const solve = (item = ROOTS, word = 'roots') => act(() => { window.dispatchEvent(new CustomEvent('allo:cloze-solved', { detail: { item, word, language: 'English' } })); });
  afterEach(() => { localStorage.removeItem('alloflow_cloze_word_cards'); });

  it('gives the card the same fields the hover card shows', () => {
    const fields = helpers().glossaryCardFields;
    expect(fields(ROOTS, 'English')).toEqual({ term: 'roots', emoji: '', image: { src: 'data:image/png;base64,AA==', alt: 'Roots in soil' }, definition: 'Plant parts under the ground.', translation: '' });
    expect(fields(ROOTS, 'Spanish').translation).toBe('raíces: partes de la planta');
    expect(fields({ term: 'leaf', definition: 'A flat green part.', image: 'leaf.png', emoji: '🍃' }, 'English')).toMatchObject({ image: { src: 'leaf.png', alt: 'leaf' }, definition: 'A flat green part.', emoji: '🍃' });
  });

  it('announces a newly solved blank once, and not one that was already solved', () => {
    const { highlightGlossaryTerms } = helpers();
    const heard = [];
    const listen = event => heard.push(event.detail.item.term);
    window.addEventListener('allo:cloze-solved', listen);
    const render = solvedIds => {
      const blanks = [];
      function ClozeStub(props) { blanks.push(props); return null; }
      const deps = { leveledTextLanguage: 'English', clozeInstanceSet: { has: id => solvedIds.includes(id) }, setClozeInstanceSet: vi.fn(), playSound: vi.fn(), handleScoreUpdate: vi.fn(), generatedContent: { id: 'g' }, ClozeInput: ClozeStub };
      const out = highlightGlossaryTerms('The roots drink.', [ROOTS], true, false, deps, 'k');
      out.filter(node => node && node.props && node.props.onCorrect).forEach(node => node.props.onCorrect('roots'));
      return deps;
    };
    const fresh = render([]);
    expect(heard).toEqual(['roots']);
    expect(fresh.setClozeInstanceSet).toHaveBeenCalledTimes(1);
    render(['cloze-k-1-roots']);
    expect(heard).toEqual(['roots']);
    window.removeEventListener('allo:cloze-solved', listen);
  });

  it('shows one card with picture, word and definition, replaced by the next answer', () => {
    helpers();
    const props = mount({ generatedContent: adapted(SECTIONS), isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', latestGlossary: [ROOTS] });
    expect(find('[data-cloze-word-card]')).toBeNull();
    solve();
    expect(find('[data-cloze-word-card-term]').textContent).toBe('roots');
    expect(find('[data-cloze-word-card-definition]').textContent).toBe('Plant parts under the ground.');
    expect(find('[data-cloze-word-card] img').getAttribute('alt')).toBe('Roots in soil');
    solve({ term: 'leaf', def: 'A flat green part.' }, 'leaf');
    expect(host.querySelectorAll('[data-cloze-word-card]')).toHaveLength(1);
    expect(find('[data-cloze-word-card-term]').textContent).toBe('leaf');
    act(() => find('[data-cloze-word-card-listen]').click());
    expect(props.handleSpeak).toHaveBeenCalledWith('leaf. A flat green part.', expect.any(String), 0, true, 'English');
    act(() => find('[data-cloze-word-card-close]').click());
    expect(find('[data-cloze-word-card]')).toBeNull();
  });

  it('can be switched off, and remembers that on this device', () => {
    helpers();
    mount({ generatedContent: adapted(SECTIONS), isTeacherMode: false, isZenMode: true, interactionMode: 'cloze', latestGlossary: [ROOTS] });
    act(() => find('[data-cloze-word-cards-toggle]').click());
    expect(localStorage.getItem('alloflow_cloze_word_cards')).toBe('off');
    solve();
    expect(find('[data-cloze-word-card]')).toBeNull();
  });

  it('does not appear outside fill in the blanks', () => {
    helpers();
    mount({ generatedContent: adapted(SECTIONS), isTeacherMode: false, isZenMode: true, interactionMode: 'read', latestGlossary: [ROOTS] });
    solve();
    expect(find('[data-cloze-word-cards]')).toBeNull();
  });
});

describe('Analyze Source subtitle', () => {
  it('names the tool as the place to revise the source, in both string copies and the shipped module', () => {
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      expect(JSON.parse(readFileSync(file, 'utf8')).sidebar.tool_analysis_sub).toBe('Check and revise your source text');
    }
    const module = readFileSync('view_sidebar_panels_module.js', 'utf8');
    const header = module.slice(module.indexOf('t("sidebar.tool_analysis")'), module.indexOf('t("sidebar.tool_analysis")') + 400);
    expect(header).toContain('t("sidebar.tool_analysis_sub") || "Check and revise your source text"');
  });
});

describe('host hook that opens the source for revision', () => {
  for (const file of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt']) {
    const anti = readFileSync(file, 'utf8');
    const line = anti.split('\n').find(l => l.startsWith('      window.__alloOpenSourceForRevision = '));
    function load({ history = [], restore = vi.fn(() => Promise.resolve(true)) } = {}) {
      const deps = {
        _resourceMutationStateRef: { current: { history } }, learningWebRestoreViewRef: { current: restore },
        setIsEditingAnalysis: vi.fn(), setExpandedTools: vi.fn(),
      };
      new Function(...Object.keys(deps), line)(...Object.values(deps));
      return { ...deps, restore, open: window.__alloOpenSourceForRevision };
    }

    it(`${file}: opens the analysis and switches on its editor`, async () => {
      expect(line).toBeTruthy();
      expect(anti).toContain('delete window.__alloOpenSourceForRevision;');
      const h = load({ history: [analysis] });
      expect(h.open('analysis-1')).toBe('analysis');
      expect(h.restore).toHaveBeenCalledWith(analysis);
      await Promise.resolve(); await Promise.resolve();
      expect(h.setIsEditingAnalysis).toHaveBeenCalledWith(true);
      expect(h.setExpandedTools).not.toHaveBeenCalled();
    });

    it(`${file}: leaves the editor off when the analysis could not open`, async () => {
      const h = load({ history: [analysis], restore: vi.fn(() => Promise.resolve(false)) });
      h.open('analysis-1');
      await Promise.resolve(); await Promise.resolve();
      expect(h.setIsEditingAnalysis).not.toHaveBeenCalled();
    });

    it(`${file}: opens the source box when there is no analysis to open`, () => {
      const h = load({ history: [{ id: 'x', type: 'simplified' }] });
      expect(h.open('x')).toBe('input');
      expect(h.open(null)).toBe('input');
      expect(h.restore).not.toHaveBeenCalled();
      const updater = h.setExpandedTools.mock.calls[0][0];
      expect(updater(['glossary'])).toEqual(['glossary', 'source-input']);
      expect(updater(['source-input'])).toEqual(['source-input']);
    });
  }
});
