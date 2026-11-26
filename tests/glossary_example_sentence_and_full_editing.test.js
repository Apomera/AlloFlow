import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { React, ReactDOMClient, act } from './helpers/games_live_harness.js';

const REPO = process.cwd().replace(/\\/g, '/');
const require = createRequire(import.meta.url);
const { glossaryMediaProps } = require(REPO + '/tests/helpers/glossary_media_fixture.cjs');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function loadScript(relPath) {
  new Function(readFileSync(REPO + '/' + relPath, 'utf8'))();
}

beforeAll(() => {
  window.React = React;
  if (!window.lucide) {
    const icon = () => React.createElement('span', { 'aria-hidden': 'true' });
    window.lucide = new Proxy({}, { get: () => icon });
  }
  loadScript('syllable_table_en.js');
  loadScript('word_sounds_pronunciations.js');
  loadScript('games_module.js');
  loadScript('glossary_helpers_module.js');
  loadScript('generate_dispatcher_module.js');
  loadScript('host_handlers_module.js');
  loadScript('view_sidebar_panels_module.js');
  loadScript('view_glossary_module.js');
  loadScript('export_module.js');
}, 60000);

const cleanups = [];
afterEach(() => {
  cleanups.splice(0).reverse().forEach((fn) => fn());
  delete window.__alloStudentAiDisabled;
  delete window.__alloQrStudentMode;
  vi.restoreAllMocks();
});

function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
  act(() => root.render(element));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); quiet.mockRestore(); });
  return {
    container,
    rerender(next) { act(() => root.render(next)); },
  };
}

function setInputValue(el, value) {
  if (el.tagName === 'SELECT') {
    el.value = value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('Glossary example sentence toggle, full editing, and printable flashcard controls', () => {
  it('GlossaryPanel renders Include example sentence toggle and wires setIncludeExampleSentence', () => {
    window.__alloAiUsable = () => true;
    const setIncludeExampleSentence = vi.fn();
    const GlossaryPanel = window.AlloModules.GlossaryPanel;
    expect(typeof GlossaryPanel).toBe('function');
    const { container } = mount(React.createElement(GlossaryPanel, {
      t: (_k, fb) => fb || _k,
      InfoTooltip: () => null,
      expandedTools: ['glossary'],
      glossaryTier2Count: 4,
      setGlossaryTier2Count: () => {},
      glossaryTier3Count: 4,
      setGlossaryTier3Count: () => {},
      glossaryDefinitionLevel: 'Same as Source Text',
      setGlossaryDefinitionLevel: () => {},
      includeEtymology: false,
      setIncludeEtymology: () => {},
      includeExampleSentence: false,
      setIncludeExampleSentence,
      glossaryCustomInstructions: '',
      setGlossaryCustomInstructions: () => {},
      isProcessing: false,
      hasSourceOrAnalysis: true,
      handleGenerate: () => {},
    }));
    const cb = container.querySelector('[data-help-key="glossary_example_sentence_info"] input[type="checkbox"]');
    expect(cb).not.toBeNull();
    expect(cb.checked).toBe(false);
    expect(cb.disabled).toBe(false);
    act(() => { cb.click(); });
    expect(setIncludeExampleSentence).toHaveBeenCalledWith(true);
    delete window.__alloAiUsable;
  });

  it('generate_dispatcher includes and parses example sentence when includeExampleSentence is enabled', () => {
    const gd = window.AlloModules.GenDispatcher;
    const seed = { kind: 'word-list', terms: ['photosynthesis'], termLanguage: 'English' };
    const promptOn = gd.buildWordListGlossaryPrompt(seed, { includeExampleSentence: true });
    const promptOff = gd.buildWordListGlossaryPrompt(seed, { includeExampleSentence: false });
    expect(promptOn).toContain('"example"');
    expect(promptOn).toContain('model sentence');
    expect(promptOff).toContain('Do not add an example field');

    const parsedOn = gd.parseWordListGlossary(
      [{ id: 0, term: 'photosynthesis', def: 'How plants make food from sunlight.', tier: 'Domain-Specific', pos: 'noun', example: 'Leaves use photosynthesis to turn sunlight into sugar.' }],
      seed,
      { includeExampleSentence: true }
    );
    expect(parsedOn[0].example).toBe('Leaves use photosynthesis to turn sunlight into sugar.');

    const parsedOff = gd.parseWordListGlossary(
      [{ id: 0, term: 'photosynthesis', def: 'How plants make food from sunlight.', tier: 'Domain-Specific', example: 'Should be dropped.' }],
      seed,
      { includeExampleSentence: false }
    );
    expect(parsedOff[0].example).toBeUndefined();

    const nativePrompt = gd.buildNativeGlossaryPrompt({
      languagePlan: { baseLanguage: 'Spanish', translationLanguages: [] },
      includeExampleSentence: true,
      text: 'Las plantas hacen fotosíntesis.',
    });
    expect(nativePrompt).toContain('"example":"One clear grade-appropriate sentence');
  });

  it('handleGenerateTermExampleSentence generates and commits an example sentence and respects AI-off guard', async () => {
    const gh = window.AlloModules.GlossaryHelpers;
    expect(typeof gh.handleGenerateTermExampleSentence).toBe('function');
    let state = { id: 'g1', type: 'glossary', data: [{ entryId: 'e1', term: 'habitat', def: 'The natural home of a living thing.' }] };
    const setGeneratedContent = vi.fn((updater) => { state = typeof updater === 'function' ? updater(state) : updater; });
    const setIsGeneratingExampleSentence = vi.fn();
    const addToast = vi.fn();
    const callGemini = vi.fn().mockResolvedValue('{"example":"A frog lives in a wetland habitat."}');
    const deps = {
      generatedContent: state,
      gradeLevel: '5th Grade',
      setIsGeneratingExampleSentence,
      setGeneratedContent,
      setHistory: vi.fn(),
      callGemini,
      warnLog: vi.fn(),
      addToast,
      t: () => '',
      beginGlossaryTask: (idx, fields, kind) => ({
        isCurrent: () => true,
        visible: () => true,
        signal: undefined,
        busy: (setter, on) => setter({ [idx]: on }),
        cancel: () => {},
        finish: () => {},
        commit: (fn) => {
          const patch = fn(state.data[idx]);
          state = { ...state, data: state.data.map((r, i) => (i === idx ? { ...r, ...patch } : r)) };
          return true;
        },
      }),
    };
    await gh.handleGenerateTermExampleSentence(0, 'habitat', deps);
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(state.data[0].example).toBe('A frog lives in a wetland habitat.');
    expect(addToast).toHaveBeenCalledWith('Example sentence added.', 'success');

    // Respect AI-disabled guard
    window.__alloStudentAiDisabled = true;
    await gh.handleGenerateTermExampleSentence(0, 'habitat', deps);
    expect(callGemini).toHaveBeenCalledTimes(1);
  });

  it('host handleGlossaryChange supports atomic object patches, undefined deletion, and etymologyByLang', () => {
    let content = {
      id: 'g2',
      type: 'glossary',
      data: [{ term: 'habitat', def: 'Home', syllables: ['hab', 'i', 'tat'], stressedSyllable: 0, ipa: '/ˈhæb.ɪ.tæt/', etymologyByLang: { English: 'Latin' } }],
    };
    let history = [content];
    const handlers = window.AlloModules.createHostHandlers({
      get generatedContent() { return content; },
      setGeneratedContent: (next) => { content = next; },
      setHistory: (fn) => { history = fn(history); },
    });
    handlers.handleGlossaryChange(0, 'etymologyByLang', 'Del latín habitare.', 'Spanish');
    expect(content.data[0].etymologyByLang.Spanish).toBe('Del latín habitare.');

    handlers.handleGlossaryChange(0, { syllables: undefined, stressedSyllable: undefined, ipa: undefined });
    expect('syllables' in content.data[0]).toBe(false);
    expect('stressedSyllable' in content.data[0]).toBe(false);
    expect('ipa' in content.data[0]).toBe(false);
    expect(history[0].data[0].etymologyByLang.Spanish).toBe('Del latín habitare.');
  });

  it('GlossaryView lets teachers edit all fields (POS, emoji, syllables, stress, phonetic, IPA, example, context, etymology, roots, translated etymology) and reflects overrides in details + phonics popup', () => {
    const GlossaryView = window.AlloModules.GlossaryView;
    const base = glossaryMediaProps({
      isTeacherMode: true,
      isEditingGlossary: true,
      includeEtymology: true,
      includeExampleSentence: true,
      displayLanguages: ['Spanish'],
      selectedLanguages: ['Spanish'],
    });
    let resource = {
      id: 'gl-edit',
      type: 'glossary',
      baseLanguage: 'English',
      data: [{
        entryId: 'e-photo',
        term: 'photosynthesis',
        def: 'How plants make food using sunlight.',
        tier: 'Domain-Specific',
        pos: 'noun',
        emoji: '🌿',
        example: 'Plants rely on photosynthesis every day.',
        contextSentence: 'Photosynthesis converts light energy into sugar.',
        etymology: 'From Greek photo (light) + synthesis (putting together).',
        etymologyByLang: { English: 'From Greek photo + synthesis.', Spanish: 'Del griego photo y synthesis.' },
        roots: [{ root: 'photo', lang: 'Greek', meaning: 'light', related: ['photon'] }],
        translations: { Spanish: 'fotosíntesis: Proceso de las plantas.' },
      }],
    };
    const hostHandlers = window.AlloModules.createHostHandlers({
      get generatedContent() { return resource; },
      setGeneratedContent: (next) => { resource = next; },
      setHistory: () => {},
    });
    const onUpdateResource = (id, updater) => {
      resource = updater(resource);
      return true;
    };
    const buildProps = (overrides = {}) => ({
      ...base,
      activeView: 'glossary',
      isTeacherMode: true,
      isEditingGlossary: true,
      includeEtymology: true,
      includeExampleSentence: true,
      displayLanguages: ['Spanish'],
      selectedLanguages: ['Spanish'],
      generatedContent: resource,
      filteredGlossaryData: resource.data.map((item, idx) => ({ ...item, _originalIdx: idx })),
      handleGlossaryChange: (...args) => hostHandlers.handleGlossaryChange(...args),
      onUpdateResource,
      handleGenerateTermExampleSentence: vi.fn(),
      handleGenerateTermEtymology: vi.fn(),
      handlePhonicsClick: vi.fn(),
      ...overrides,
    });

    const { container, rerender } = mount(React.createElement(GlossaryView, buildProps()));

    // Edit POS, Emoji, Syllables, Stress, Phonetic, IPA
    const posSelect = container.querySelector('[data-glossary-edit-pos]');
    expect(posSelect).not.toBeNull();
    act(() => setInputValue(posSelect, 'verb'));
    expect(resource.data[0].pos).toBe('verb');

    const emojiInput = container.querySelector('[data-glossary-edit-emoji]');
    act(() => setInputValue(emojiInput, '☀️'));
    expect(resource.data[0].emoji).toBe('☀️');

    const sylInput = container.querySelector('[data-glossary-edit-syllables]');
    act(() => setInputValue(sylInput, 'pho-to-syn-the-sis'));
    expect(resource.data[0].syllables).toEqual(['pho', 'to', 'syn', 'the', 'sis']);

    rerender(React.createElement(GlossaryView, buildProps()));
    const stressBtn2 = container.querySelector('[data-glossary-stress-btn="2"]');
    expect(stressBtn2).not.toBeNull();
    act(() => stressBtn2.click());
    expect(resource.data[0].stressedSyllable).toBe(2);

    rerender(React.createElement(GlossaryView, buildProps()));
    act(() => setInputValue(container.querySelector('[data-glossary-edit-phonetic]'), 'foh-toh-SIN-thuh-sis'));
    act(() => setInputValue(container.querySelector('[data-glossary-edit-ipa]'), '/ˌfoʊ.toʊˈsɪn.θə.sɪs/'));
    expect(resource.data[0].phoneticSpelling).toBe('foh-toh-SIN-thuh-sis');
    expect(resource.data[0].ipa).toBe('/ˌfoʊ.toʊˈsɪn.θə.sɪs/');

    // Edit example sentence, context sentence, etymology, source roots, and Spanish etymology
    act(() => setInputValue(container.querySelector('[data-glossary-edit-example]'), 'Green leaves use photosynthesis in summer.'));
    expect(resource.data[0].example).toBe('Green leaves use photosynthesis in summer.');

    act(() => setInputValue(container.querySelector('[data-glossary-edit-context]'), 'In sunlight, photosynthesis begins.'));
    expect(resource.data[0].contextSentence).toBe('In sunlight, photosynthesis begins.');

    act(() => setInputValue(container.querySelector('[data-glossary-edit-etymology]'), 'Greek photo + synthesis.'));
    expect(resource.data[0].etymology).toBe('Greek photo + synthesis.');

    act(() => container.querySelector('[data-glossary-add-root]').click());
    expect(resource.data[0].roots).toHaveLength(2);

    rerender(React.createElement(GlossaryView, buildProps()));
    const secondRootInput = container.querySelector('[data-glossary-root-row="1"] [data-glossary-root-field="root"]');
    act(() => setInputValue(secondRootInput, 'synthesis'));
    expect(resource.data[0].roots[1].root).toBe('synthesis');

    const spanishEty = container.querySelector('[data-glossary-edit-etymology-lang="Spanish"]');
    expect(spanishEty).not.toBeNull();
    act(() => setInputValue(spanishEty, 'Proviene del griego antiguo.'));
    expect(resource.data[0].etymologyByLang.Spanish).toBe('Proviene del griego antiguo.');

    // Exit edit mode and verify custom syllables, bold stress, phonetic, IPA, POS, and example sentence render
    rerender(React.createElement(GlossaryView, buildProps({
      isEditingGlossary: false,
      phonicsData: { word: 'photosynthesis', data: null, isLoading: false, aiStatus: 'disabled', rect: { left: 20, top: 20, bottom: 50 } },
      closePhonics: () => {},
    })));
    expect(container.querySelector('[data-glossary-details]').textContent).toContain('pho·to·syn·the·sis');
    expect(container.querySelector('[data-glossary-stressed="true"]').textContent).toBe('syn');
    expect(container.querySelector('[data-glossary-phonetic]').textContent).toContain('/foh-toh-SIN-thuh-sis/');
    expect(container.querySelector('[data-glossary-ipa]').textContent).toContain('/ˌfoʊ.toʊˈsɪn.θə.sɪs/');
    expect(container.querySelector('[data-glossary-example-sentence]').textContent).toContain('Green leaves use photosynthesis in summer.');

    // Phonics popup honors saved teacher overrides even when AI is disabled!
    const popup = container.querySelector('[aria-labelledby="glossary-phonics-popup-title"]');
    expect(popup).not.toBeNull();
    expect(popup.textContent).toContain('/foh-toh-SIN-thuh-sis/');
    expect(popup.textContent).toContain('/ˌfoʊ.toʊˈsɪn.θə.sɪs/');
    expect(popup.querySelector('[data-phonics-stressed="true"]').textContent).toBe('syn');

    // Regression: rendering phonicsData.data.syllables produces zero React missing-key warnings
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    rerender(React.createElement(GlossaryView, buildProps({
      isEditingGlossary: false,
      phonicsData: {
        word: 'photosynthesis',
        data: { phoneticSpelling: 'foh-toh-SIN-thuh-sis', ipa: '/ˌfoʊ.toʊˈsɪn.θə.sɪs/', syllables: ['pho', 'to', 'syn', 'the', 'sis'] },
        isLoading: false,
        rect: { left: 20, top: 20, bottom: 50 },
      },
      closePhonics: () => {},
    })));
    const keyWarnings = consoleErr.mock.calls.filter((args) => String(args[0] || '').includes('unique "key" prop'));
    expect(keyWarnings).toEqual([]);
  });

  it('handleExportFlashcards supports B&W mode, Hide Backs, and Show-on-cards field toggles including example sentence and pronunciation', async () => {
    let capturedBlob;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => { capturedBlob = blob; return 'blob:fc-test'; });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const cards = [{
      term: 'photosynthesis',
      def: 'How plants make food using sunlight.',
      pos: 'noun',
      syllables: ['pho', 'to', 'syn', 'the', 'sis'],
      stressedSyllable: 2,
      phoneticSpelling: 'foh-toh-SIN-thuh-sis',
      ipa: '/ˌfoʊ.toʊˈsɪn.θə.sɪs/',
      example: 'Leaves use photosynthesis in the sun.',
      contextSentence: 'Photosynthesis occurs inside chloroplasts.',
      etymology: 'From Greek photo and synthesis.',
      roots: [{ root: 'photo', lang: 'Greek', meaning: 'light', related: ['photon'] }],
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      translations: { Spanish: 'fotosíntesis: Cómo las plantas producen alimento.' },
    }];
    const api = window.AlloModules.createExport({
      liveRef: { current: { generatedContent: { id: 'fc-1', type: 'glossary', title: 'Biology', data: cards }, t: (k) => k } },
      escapeXml: (v) => String(v),
    });

    api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false });
    const html = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsText(capturedBlob);
    });

    // Verify rendered content & CSS rules
    expect(html).toContain('body.fc-bw');
    expect(html).toContain('filter: grayscale(100%)');
    expect(html).toContain('body.fc-hide-def .fc-field-def');
    expect(html).toContain('body.fc-hide-image .fc-field-image');
    expect(html).toContain('Leaves use photosynthesis in the sun.');
    expect(html).toContain('<strong class="syl-stress">syn</strong>');

    // Execute the embedded interactive study script inside a live document fragment/iframe-like DOM
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const studyScript = doc.querySelector('script[data-flashcard-study]');
    expect(studyScript).not.toBeNull();
    new Function('document', studyScript.textContent)(doc);

    // 1. Black & White toggle
    const bwBtn = doc.querySelector('[data-fc-action="toggle-bw"]');
    expect(bwBtn).not.toBeNull();
    expect(bwBtn.getAttribute('aria-pressed')).toBe('false');
    bwBtn.click();
    expect(doc.body.classList.contains('fc-bw')).toBe(true);
    expect(bwBtn.getAttribute('aria-pressed')).toBe('true');

    // 2. Hide Backs toggle & per-card Flip
    const hideBacksBtn = doc.querySelector('[data-fc-action="hide-backs"]');
    expect(hideBacksBtn).not.toBeNull();
    hideBacksBtn.click();
    const card = doc.querySelector('.card-container');
    expect(card.classList.contains('fc-back-hidden')).toBe(true);
    expect(hideBacksBtn.getAttribute('aria-pressed')).toBe('true');

    // Flipping a card while Hide Backs is active reveals the back and hides the front
    const cardFlipBtn = card.querySelector('[data-card-study="flip"]');
    cardFlipBtn.click();
    expect(card.classList.contains('fc-back-hidden')).toBe(false);
    expect(card.classList.contains('fc-front-hidden')).toBe(true);

    // 3. Field toggles (Definitions, Images, Pronunciation & POS, Translations, Example sentence, In the text, Word roots)
    for (const field of ['def', 'image', 'details', 'translation', 'example', 'context', 'etymology']) {
      const btn = doc.querySelector(`[data-fc-toggle-field="${field}"]`);
      expect(btn).not.toBeNull();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      btn.click();
      expect(doc.body.classList.contains(`fc-hide-${field}`)).toBe(true);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      btn.click();
      expect(doc.body.classList.contains(`fc-hide-${field}`)).toBe(false);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    }

    // 4. blackAndWhite export option initializes body with fc-bw
    api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false, blackAndWhite: true });
    const bwHtml = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsText(capturedBlob);
    });
    expect(bwHtml).toContain('<body class="fc-bw">');
  });
});
