// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = process.cwd();
const req = createRequire(path.join(ROOT, 'desktop', 'web-app', 'package.json'));
const React = req('react');
const ReactDOMServer = req('react-dom/server');
const { createRoot } = req('react-dom/client');
const { act } = React;

function loadModuleIntoWindow(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  // Execute in global scope so browser IIFE modules register on window.
  const fn = new Function(code);
  fn();
}

function setBionicSetting(on) {
  const state = {
    fontId: 'default',
    baseFontSize: 16,
    lineHeight: 1.6,
    letterSpacing: 0,
    colorOverlay: 'none',
    readingRuler: false,
    readingTheme: 'default',
    bionic: !!on,
  };
  const listeners = window.__testReadingListeners || (window.__testReadingListeners = new Set());
  window.__alloReadingSettings = {
    get: () => ({ ...state }),
    set: (patch) => {
      Object.assign(state, patch || {});
      listeners.forEach((cb) => { try { cb({ ...state }); } catch (_) {} });
      window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...state } }));
    },
    subscribe: (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
  if (on) document.documentElement.setAttribute('data-allo-bionic', '1');
  else document.documentElement.removeAttribute('data-allo-bionic');
  listeners.forEach((cb) => { try { cb({ ...state }); } catch (_) {} });
  window.dispatchEvent(new CustomEvent('alloflow:reading-settings-changed', { detail: { ...state } }));
}

describe('Universal Bionic Reading runtime and resource views', () => {
  beforeEach(() => {
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    window.AlloIcons = new Proxy({}, {
      get: () => (props) => React.createElement('span', { 'data-icon': '1', ...props }),
    });
    window.sanitizeHtml = (h) => String(h || '').replace(/<script[\s\S]*?<\/script>/gi, '');
    window.__testReadingListeners = new Set();
    loadModuleIntoWindow('ui_font_library_module.js');
    setBionicSetting(false);
  });

  afterEach(() => {
    setBionicSetting(false);
    document.body.innerHTML = '';
  });

  it('provides global React, HTML, and reversible DOM Bionic Reading helpers', () => {
    expect(typeof window.__alloIsBionicOn).toBe('function');
    expect(typeof window.__alloUseBionic).toBe('function');
    expect(typeof window.__alloBionicReact).toBe('function');
    expect(typeof window.__alloBionicHtml).toBe('function');
    expect(typeof window.__alloApplyBionicDom).toBe('function');

    expect(window.__alloIsBionicOn()).toBe(false);
    setBionicSetting(true);
    expect(window.__alloIsBionicOn()).toBe(true);

    // React helper splits words into bold lead + dimmed tail without dropping spaces or punctuation.
    const nodes = window.__alloBionicReact('Photosynthesis makes glucose!');
    const markup = ReactDOMServer.renderToStaticMarkup(React.createElement('p', null, nodes));
    expect(markup).toContain('<b class="font-bold font-inherit">Photosy</b><span class="font-normal opacity-85 font-inherit">nthesis</span>');
    expect(markup).toContain('<b class="font-bold font-inherit">mak</b><span class="font-normal opacity-85 font-inherit">es</span>');
    expect(markup).toContain('!');

    // HTML helper transforms prose text nodes and skips script/style/code/pre/svg/math.
    const rawHtml = '<p>Solar energy powers plants.</p><code>const x = 1;</code><svg><text>Axis</text></svg><script>var keep = 1;</script>';
    const bionicHtml = window.__alloBionicHtml(rawHtml);
    expect(bionicHtml).toContain('<b style="font-weight:700">Sol</b>ar');
    expect(bionicHtml).toContain('<code>const x = 1;</code>');
    expect(bionicHtml).toContain('<svg><text>Axis</text></svg>');
    expect(bionicHtml).toContain('<script>var keep = 1;</script>');

    // DOM helper applies and cleanly restores original text nodes.
    const host = document.createElement('div');
    host.innerHTML = '<p>Water evaporates quickly.</p><button>Click me</button>';
    document.body.appendChild(host);
    window.__alloApplyBionicDom(host, true);
    expect(host.querySelectorAll('[data-allo-bionic-dom="1"]').length).toBeGreaterThan(0);
    expect(host.querySelector('button').querySelector('[data-allo-bionic-dom="1"]')).toBeNull();
    expect(host.querySelector('p').textContent).toBe('Water evaporates quickly.');
    window.__alloApplyBionicDom(host, false);
    expect(host.querySelectorAll('[data-allo-bionic-dom="1"]').length).toBe(0);
    expect(host.querySelector('p').textContent).toBe('Water evaporates quickly.');
  });

  it('reactively toggles __alloUseBionic via alloflow:reading-settings-changed', () => {
    function Sample() {
      const on = window.__alloUseBionic();
      return React.createElement('div', { 'data-on': on ? '1' : '0' }, on ? window.__alloBionicReact('Ecosystem balance') : 'Ecosystem balance');
    }
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    act(() => { root.render(React.createElement(Sample)); });
    expect(container.querySelector('[data-on="0"]')).not.toBeNull();
    expect(container.querySelectorAll('b.font-bold').length).toBe(0);

    act(() => { setBionicSetting(true); });
    expect(container.querySelector('[data-on="1"]')).not.toBeNull();
    expect(container.querySelectorAll('b.font-bold').length).toBe(2);
    expect(container.textContent).toBe('Ecosystem balance');

    act(() => { setBionicSetting(false); });
    expect(container.querySelector('[data-on="0"]')).not.toBeNull();
    expect(container.querySelectorAll('b.font-bold').length).toBe(0);
    expect(container.textContent).toBe('Ecosystem balance');

    act(() => { root.unmount(); });
  });

  it('applies Bionic Reading across Glossary, Directions, Timeline, Sentence Frames, Concept Sort, Cloze Panel, DBQ, Socratic Chat, and Outline', () => {
    const t = (k) => k;
    loadModuleIntoWindow('view_directions_result_module.js');
    loadModuleIntoWindow('view_sentence_frames_module.js');
    loadModuleIntoWindow('view_cloze_interaction_panel_module.js');
    loadModuleIntoWindow('view_concept_sort_module.js');
    loadModuleIntoWindow('view_timeline_module.js');
    loadModuleIntoWindow('view_dbq_module.js');
    loadModuleIntoWindow('view_socratic_chat_module.js');
    loadModuleIntoWindow('view_outline_module.js');
    loadModuleIntoWindow('view_renderers_module.js');
    loadModuleIntoWindow('view_glossary_module.js');

    const DirectionsResultView = window.AlloModules.DirectionsResult.DirectionsResultView;
    const SentenceFramesView = window.AlloModules.SentenceFramesView;
    const ClozeInteractionPanel = window.AlloModules.ClozeInteractionPanel.ClozeInteractionPanel;
    const ConceptSortView = window.AlloModules.ConceptSortView;
    const TimelineView = window.AlloModules.TimelineView;
    const DBQView = window.AlloModules.DbqView;
    const SocraticChat = window.AlloModules.SocraticChat.SocraticChat;
    const OutlineView = window.AlloModules.OutlineView;
    const ViewRenderers = window.AlloModules.ViewRenderers;
    const GlossaryView = window.AlloModules.GlossaryView;

    const expectWord = (markup, word) => {
      const cut = word.length <= 3 ? Math.max(1, word.length - 1) : Math.ceil(word.length * 0.45);
      expect(markup).toContain('<b class="font-bold font-inherit">' + word.slice(0, cut) + '</b><span class="font-normal opacity-85 font-inherit">' + word.slice(cut) + '</span>');
    };

    // 1. DirectionsResultView: bodyHtml sanitized first, then Bionic applied; goals & choice board bolded.
    const dirProps = {
      title: 'Lab Directions',
      bodyHtml: '<p>Measure temperature carefully.</p><script>alert(1)</script>',
      choiceBoardView: {
        title: 'Choose one',
        prompt: 'Pick an activity below.',
        items: [{ resourceId: 'r1', label: 'Solar Lab', description: 'Explore sunlight absorption.' }],
      },
      goalViews: [{ id: 'g1', label: 'Complete two observations', kind: 'auto', done: false }],
      t,
    };
    setBionicSetting(false);
    const dirOff = ReactDOMServer.renderToStaticMarkup(React.createElement(DirectionsResultView, dirProps));
    expect(dirOff).not.toContain('font-bold font-inherit');
    expect(dirOff).not.toContain('<script>');
    setBionicSetting(true);
    const dirOn = ReactDOMServer.renderToStaticMarkup(React.createElement(DirectionsResultView, dirProps));
    expect(dirOn).toContain('<b style="font-weight:700">Meas</b>ure');
    expectWord(dirOn, 'Explore');
    expectWord(dirOn, 'Complete');
    expect(dirOn).not.toContain('<script>');

    // 2. SentenceFramesView: list prompts + paragraph non-blank prose bolded, blank input untouched.
    const sfProps = {
      t,
      generatedContent: {
        id: 'sf1',
        data: {
          mode: 'paragraph',
          text: 'Gravity pulls [object] toward Earth.',
          wordBank: ['planets'],
        },
      },
      leveledTextLanguage: 'English',
      studentResponses: {},
      isTeacherMode: false,
      isEditingScaffolds: false,
      handleStudentInput: () => {},
      getRows: () => 2,
      renderFormattedText: (s) => s,
    };
    const sfOn = ReactDOMServer.renderToStaticMarkup(React.createElement(SentenceFramesView, sfProps));
    expectWord(sfOn, 'Gravity');
    expectWord(sfOn, 'planets');
    expect(sfOn).toContain('placeholder="object"');

    // 3. ClozeInteractionPanel: chip text bolded while payload stays intact.
    const clozeOn = ReactDOMServer.renderToStaticMarkup(React.createElement(ClozeInteractionPanel, {
      activeView: 'simplified',
      interactionMode: 'cloze',
      latestGlossary: [{ term: 'evaporation', def: 'liquid turning to vapor' }],
      leveledTextLanguage: 'English',
      t,
      handleSetInteractionModeToRead: () => {},
      setClozeCompletedSet: () => {},
      setClozeInstanceSet: () => {},
    }));
    expectWord(clozeOn, 'evaporation');

    // 4. ConceptSortView: categories and item cards bolded in teacher review.
    const csOn = ReactDOMServer.renderToStaticMarkup(React.createElement(ConceptSortView, {
      t,
      isTeacherMode: true,
      isIndependentMode: false,
      generatedContent: {
        id: 'cs1',
        data: {
          categories: [{ id: 'c1', label: 'Renewable Energy' }],
          items: [{ id: 'i1', categoryId: 'c1', content: 'Wind turbines generate electricity.' }],
        },
      },
    }));
    expectWord(csOn, 'Renewable');
    expectWord(csOn, 'turbines');

    // 5. TimelineView: event cards bolded when not editing, raw input when editing.
    const tlBase = {
      t,
      isTeacherMode: true,
      isIndependentMode: false,
      generatedContent: {
        id: 'tl1',
        data: [{ date: '1776', event: 'Declaration signed in Philadelphia.' }],
      },
      leveledTextLanguage: 'English',
      timelineImageSize: 96,
      isGeneratingTimelineImage: {},
      timelineRefinementInputs: {},
      dismissedVerifications: new Set(),
      TIMELINE_MODE_DEFINITIONS: {},
    };
    const tlOn = ReactDOMServer.renderToStaticMarkup(React.createElement(TimelineView, { ...tlBase, isEditingTimeline: false }));
    expectWord(tlOn, 'Declaration');
    const tlEdit = ReactDOMServer.renderToStaticMarkup(React.createElement(TimelineView, { ...tlBase, isEditingTimeline: true }));
    expect(tlEdit).toContain('value="Declaration signed in Philadelphia."');

    // 6. DBQView: historical context + document excerpt + questions bolded.
    const dbqOn = ReactDOMServer.renderToStaticMarkup(React.createElement(DBQView, {
      t,
      isTeacherMode: false,
      gradeLevel: '8th Grade',
      generatedContent: {
        id: 'dbq1',
        data: {
          title: 'Industrial Revolution',
          historicalContext: 'Factories transformed urban economies rapidly.',
          documents: [{
            id: 'A',
            title: 'Mill Letter',
            excerpt: 'Machines produced fabric faster than hand looms.',
            sourcingQuestions: ['Who wrote this letter?'],
            analysisQuestions: ['How did machines change work?'],
          }],
          synthesisPrompt: 'Evaluate industrial change.',
        },
      },
      studentResponses: {},
      handleStudentInput: () => {},
      handleScoreUpdate: () => {},
    }));
    expectWord(dbqOn, 'Factories');
    expectWord(dbqOn, 'Machines');

    // 7. SocraticChat: user bubble and fallback reply bolded.
    const socOn = ReactDOMServer.renderToStaticMarkup(React.createElement(SocraticChat, {
      t,
      socraticMessages: [
        { role: 'user', text: 'Why do volcanoes erupt?' },
        { role: 'model', text: 'Pressure builds beneath the crust.' },
      ],
      socraticInput: '',
      isSocraticThinking: false,
    }));
    expectWord(socOn, 'volcanoes');
    expectWord(socOn, 'Pressure');

    // 8. OutlineView + ViewRenderers.renderOutlineContent: branch title + items bolded.
    const outlineRes = {
      id: 'out1',
      type: 'outline',
      data: {
        main: 'Water Cycle',
        structureType: 'Structured Outline',
        branches: [{ title: 'Condensation Stage', items: ['Cooling vapor forms droplets.'] }],
      },
    };
    const outlineOn = ReactDOMServer.renderToStaticMarkup(React.createElement(OutlineView, {
      t,
      generatedContent: outlineRes,
      isTeacherMode: false,
      isInteractiveMap: false,
      renderOutlineContent: () => ViewRenderers.renderOutlineContent({
        generatedContent: outlineRes,
        isTeacherMode: false,
        isEditingOutline: false,
        leveledTextLanguage: 'English',
        t,
      }),
    }));
    expectWord(outlineOn, 'Condensation');
    expectWord(outlineOn, 'droplets');

    // 9. GlossaryView: definition and context sentence bolded when not editing.
    const glossItem = {
      term: 'Mitochondria',
      def: 'Organelles that release energy inside cells.',
      contextSentence: 'Cells rely on mitochondria during movement.',
      _originalIdx: 0,
    };
    const glossOn = ReactDOMServer.renderToStaticMarkup(React.createElement(GlossaryView, {
      t,
      generatedContent: {
        id: 'gl1',
        type: 'glossary',
        data: [glossItem],
      },
      filteredGlossaryData: [glossItem],
      history: [],
      flashcardOptions: [],
      displayLanguages: [],
      selectedLanguages: [],
      leveledTextLanguage: 'English',
      currentUiLanguage: 'English',
      isTeacherMode: false,
      isEditingGlossary: false,
      showGlossaryContext: true,
      glossaryImageSize: 80,
      isGeneratingTermImage: {},
      isGeneratingEtymology: {},
      glossaryRefinementInputs: {},
      getRows: () => 2,
    }));
    expectWord(glossOn, 'Organelles');
    expectWord(glossOn, 'mitochondria');

    // 10. LessonTeachingScriptView: teaching script prose bolded when expanded.
    loadModuleIntoWindow('view_lesson_teaching_script_module.js');
    const LessonTeachingScriptView = window.AlloModules.LessonTeachingScriptView;
    const ltsHost = document.createElement('div');
    document.body.appendChild(ltsHost);
    const ltsRoot = createRoot(ltsHost);
    act(() => {
      ltsRoot.render(React.createElement(LessonTeachingScriptView, {
        t,
        isTeacherMode: true,
        generatedContent: {
          id: 'lp1',
          type: 'lesson-plan',
          title: 'Ecosystems Lesson',
          data: {
            teachingScripts: [{
              id: 'v1',
              title: 'Opening Mini-Lesson',
              scope: 'segment',
              durationMinutes: 10,
              steps: [{
                id: 's1',
                title: 'Engage Students',
                minutes: 10,
                phase: 'hook',
                teacherSays: 'Observe how sunlight warms the greenhouse terrarium.',
                teacherDoes: 'Point to the thermometer reading.',
                studentsDo: 'Record observations in notebooks.',
                checkQuestion: 'Why does trapped warmth stay inside?',
              }],
            }],
          },
        },
        history: [],
        capabilities: { canGenerate: false, canResearch: false },
      }));
    });
    const expandBtn = ltsHost.querySelector('button[aria-expanded]');
    expect(expandBtn).not.toBeNull();
    act(() => { expandBtn.click(); });
    expectWord(ltsHost.innerHTML, 'greenhouse');
    expectWord(ltsHost.innerHTML, 'terrarium');
    expectWord(ltsHost.innerHTML, 'trapped');
    act(() => { ltsRoot.unmount(); });
  });

  it('updates header bionic_scope copy across strings and header module', () => {
    const core = fs.readFileSync(path.join(ROOT, 'ui_strings_core.js'), 'utf8');
    const full = fs.readFileSync(path.join(ROOT, 'ui_strings.js'), 'utf8');
    const header = fs.readFileSync(path.join(ROOT, 'view_header_module.js'), 'utf8');
    const expected = 'Applies across reading passages, quizzes, glossaries, study guides, lessons, library books, and activities.';
    expect(core).toContain(expected);
    expect(full).toContain(expected);
    expect(header).toContain(expected);
    expect(header).toContain('header_settings_text_syllables');
    expect(header).toContain('header_settings_text_ruler');
    expect(core).toContain('"syllables": "Syllable Breaks (a·b·c)"');
    expect(full).toContain('"syllables": "Syllable Breaks (a·b·c)"');
  });

  it('supports zero-AI universal Syllable Breaks alone and combined with Bionic Reading', () => {
    loadModuleIntoWindow('syllable_table_en.js');
    expect(typeof window.__alloSetSyllables).toBe('function');
    expect(typeof window.__alloSplitSyllables).toBe('function');

    // Verified English word splits offline with preserved casing; 1-syllable word stays whole.
    expect(window.__alloSplitSyllables('Temperature')).toEqual(['Tem', 'per', 'a', 'ture']);
    expect(window.__alloSplitSyllables('cat')).toBeNull();

    // Syllables ON, Bionic OFF: accessible aria-hidden non-selectable dots, zero <b> bold tags.
    setBionicSetting(false);
    window.__alloSetSyllables(true);
    expect(window.__alloIsSyllablesOn()).toBe(true);
    expect(window.__alloIsBionicOnlyOn()).toBe(false);
    expect(window.__alloIsBionicOn()).toBe(true);

    const sylOnly = ReactDOMServer.renderToStaticMarkup(
      React.createElement('p', null, window.__alloBionicReact('Temperature rises quickly.'))
    );
    expect(sylOnly).toContain('<span aria-hidden="true" class="select-none opacity-60">·</span>');
    expect(sylOnly).toContain('data-allo-syllable-word="1"');
    expect(sylOnly).not.toContain('<b class="font-bold font-inherit">');

    // Syllables ON + Bionic ON: composes both cleanly in one pass.
    setBionicSetting(true);
    const combined = ReactDOMServer.renderToStaticMarkup(
      React.createElement('p', null, window.__alloBionicReact('Temperature rises'))
    );
    expect(combined).toContain('data-allo-bionic-word="1"');
    expect(combined).toContain('data-allo-syllable-word="1"');
    expect(combined).toContain('<b class="font-bold font-inherit">');
    expect(combined).toContain('<span aria-hidden="true" class="select-none opacity-60">·</span>');

    // HTML export helper also applies syllables while skipping code/script/svg.
    setBionicSetting(false);
    const htmlOut = window.__alloBionicHtml('<p>Temperature rises.</p><code>Temperature</code>');
    expect(htmlOut).toContain('<span aria-hidden="true" style="user-select:none;opacity:.6">·</span>');
    expect(htmlOut).toContain('<code>Temperature</code>');

    // Aa shared reading settings panel exposes the Syllable Breaks toggle and syncs it.
    const handle = window.AlloModules.UIFontLibrary.openReadingSettings({});
    expect(handle).not.toBeNull();
    const sylCheckbox = handle.element.querySelector('input[id$="-syllables"]');
    expect(sylCheckbox).not.toBeNull();
    expect(sylCheckbox.checked).toBe(true);
    sylCheckbox.checked = false;
    sylCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(window.__alloIsSyllablesOn()).toBe(false);
    handle.close(false);
  });

  it('tags English parts of speech on-device in Immersive Reader when AI is off', async () => {
    loadModuleIntoWindow('syllable_table_en.js');
    loadModuleIntoWindow('phase_n_misc_helpers_module.js');
    let saved = null;
    const toasts = [];
    const deps = {
      leveledTextLanguage: 'English',
      generatedContent: { id: 'r1', type: 'simplified', data: 'Bright sunlight warms the green plants quickly.' },
      isAnalyzingPos: false,
      setIsAnalyzingPos: () => {},
      // The handler now commits through a functional update that only replaces the
      // resource it started on; apply it to that same resource.
      setGeneratedContent: (next) => { saved = typeof next === 'function' ? next(deps.generatedContent) : next; },
      setHistory: () => {},
      addToast: (msg, kind) => { toasts.push({ msg, kind }); },
      t: (k) => k,
      warnLog: () => {},
      callGemini: null,
      _stripForImmersive: (s) => String(s || ''),
      chunkText: (s) => [s],
      parseTaggedContent: (tagged) => tagged,
    };
    await window.AlloModules.PhaseNHelpers.handleGeneratePOSData(deps);
    expect(saved).not.toBeNull();
    expect(saved.posEnriched).toBe(true);
    expect(saved.posSource).toBe('on-device');
    expect(saved.immersiveData).toContain('<a>Bright</a>');
    expect(saved.immersiveData).toContain('<v>warms</v>');
    expect(saved.immersiveData).toContain('<n>plants</n>');
    expect(saved.immersiveData).toContain('<d>quick·ly</d>');
    expect(toasts.some((item) => item.kind === 'success')).toBe(true);
  });

  it('supports zero-AI Spanish & bilingual syllable breaks cleanly offline', () => {
    // Explicit Spanish langHint and accented Spanish words split accurately with casing preserved.
    expect(window.__alloSplitSyllables('Educación')).toEqual(['E', 'du', 'ca', 'ción']);
    expect(window.__alloSplitSyllables('fotosíntesis')).toEqual(['fo', 'to', 'sín', 'te', 'sis']);
    expect(window.__alloSplitSyllables('mariposa', 'es')).toEqual(['ma', 'ri', 'po', 'sa']);
    expect(window.__alloSplitSyllables('Subrayar', 'Spanish')).toEqual(['Sub', 'ra', 'yar']);
    // Bilingual: verified English words inside Spanish text fall back to CMU rather than Spanish rules, while unknown non-Spanish strings stay whole.
    expect(window.__alloSplitSyllables('watching', 'es')).toEqual(['watch', 'ing']);
    expect(window.__alloSplitSyllables('xkcdth', 'es')).toBeNull();

    setBionicSetting(false);
    window.__alloSetSyllables(true);
    const esReact = ReactDOMServer.renderToStaticMarkup(
      React.createElement('p', null, window.__alloBionicReact('La mariposa estudia fotosíntesis.', { lang: 'es', syllables: true, bionic: false }))
    );
    expect(esReact).toContain('ma<span aria-hidden="true" class="select-none opacity-60">·</span>ri<span aria-hidden="true" class="select-none opacity-60">·</span>po<span aria-hidden="true" class="select-none opacity-60">·</span>sa');
    expect(esReact).toContain('fo<span aria-hidden="true" class="select-none opacity-60">·</span>to<span aria-hidden="true" class="select-none opacity-60">·</span>sín<span aria-hidden="true" class="select-none opacity-60">·</span>te<span aria-hidden="true" class="select-none opacity-60">·</span>sis');

    const esHtml = window.__alloBionicHtml('<p>La mariposa vuela.</p>', { lang: 'es', syllables: true, bionic: false });
    expect(esHtml).toContain('ma<span aria-hidden="true" style="user-select:none;opacity:.6">·</span>ri<span aria-hidden="true" style="user-select:none;opacity:.6">·</span>po<span aria-hidden="true" style="user-select:none;opacity:.6">·</span>sa');
  });

  it('applies Bionic Reading and Syllables to MathView word problems, real-world connections, hints, and steps without touching math notation', () => {
    loadModuleIntoWindow('syllable_table_en.js');
    loadModuleIntoWindow('view_math_module.js');
    loadModuleIntoWindow('phase_k_helpers_module.js');
    const MathView = window.AlloModules.MathView;
    const rawFormatInlineText = window.AlloModules.PhaseKHelpers.formatInlineText;
    const Icon = () => React.createElement('span', null, 'icon');
    const MathSymbol = ({ text }) => React.createElement('span', { 'data-math-symbol': '1' }, text);
    const formatInlineText = (txt, enableGlossary = false, isDarkBg = false) => rawFormatInlineText(txt, enableGlossary, isDarkBg, {
      isPlaying: false,
      focusMode: true,
      MathSymbol,
      t: (k) => k,
    });

    setBionicSetting(true);
    window.__alloSetSyllables(true);

    const mathBaseProps = {
      t: (k) => k,
      isIndependentMode: false,
      isEditingMath: false,
      gradeLevel: '5th Grade',
      mathSubject: 'Arithmetic',
      mathResourceId: 'm1',
      generatedContent: {
        id: 'm1',
        type: 'math',
        data: {
          title: 'Garden Perimeter',
          problems: [{
            id: 'p1',
            title: 'Garden Perimeter',
            question: 'Calculate the perimeter of a rectangular garden with width $4x + 2$.',
            realWorld: 'Architects measure boundaries before ordering materials.',
            answer: '16x + 8',
            steps: [{ explanation: 'Multiply each dimension carefully.', latex: '2(4x+2)' }],
          }],
        },
      },
      formatMathQuestion: (p) => p.question,
      formatInlineText,
      MathSymbol,
      studentResponses: {},
      mathHintData: {},
      mathCheckResults: {},
      Calculator: Icon, Eye: Icon, EyeOff: Icon, RefreshCw: Icon, ChevronDown: Icon,
      Edit3: Icon, Plus: Icon, Trash2: Icon, Check: Icon, Sparkles: Icon, HelpCircle: Icon,
      Send: Icon, Volume2: Icon, Printer: Icon, Copy: Icon, Award: Icon, Lightbulb: Icon,
    };

    const plainText = (markup) => markup.replace(/<[^>]+>/g, '');

    // 1. Teacher view: word problem, real-world connection, and steps formatted while LaTeX stays raw.
    const teacherHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(MathView, {
      ...mathBaseProps,
      isTeacherMode: true,
      showMathAnswers: true,
    }));
    expect(teacherHtml).toContain('data-allo-bionic-word="1"');
    expect(teacherHtml).toContain('data-allo-syllable-word="1"');
    expect(plainText(teacherHtml)).toContain('pe·rim·e·ter');
    expect(plainText(teacherHtml)).toContain('ma·te·ri·als');
    expect(teacherHtml).toContain('<span data-math-symbol="1">$4x + 2$</span>');
    expect(teacherHtml).toContain('2(4x+2)');

    // 2. Student view with hint: hint prose formatted.
    const hintHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(MathView, {
      ...mathBaseProps,
      isTeacherMode: false,
      showMathAnswers: false,
      mathHintData: { m1: { p1: { hints: ['Combine opposite dimensions first.'], count: 1 } } },
    }));
    expect(plainText(hintHtml)).toContain('di·men·sions');

    // 3. Student view after check: feedback and expandable solution steps formatted.
    const checkedHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(MathView, {
      ...mathBaseProps,
      isTeacherMode: false,
      showMathAnswers: false,
      mathCheckResults: { m1: { p1: { checked: true, verdict: 'correct', score: 100, feedback: 'Wonderful calculation!' } } },
    }));
    expect(plainText(checkedHtml)).toContain('Won·der·ful');
    expect(plainText(checkedHtml)).toContain('cal·cu·la·tion');
    expect(plainText(checkedHtml)).toContain('Mul·ti·ply');
    expect(checkedHtml).toContain('2(4x+2)');
  });

  it('exposes responsive 1/3/5-line Reading Ruler height only when Reading Ruler is enabled', () => {
    const state = {
      fontId: 'default', fontFamily: '', fontClass: '',
      baseFontSize: 18, lineHeight: 1.8, letterSpacing: 0,
      colorOverlay: 'none', readingRuler: false, rulerLines: 3,
      readingTheme: 'default', readingThemes: ['default'], bionic: false, fonts: [],
    };
    const listeners = new Set();
    window.__alloReadingSettings = {
      get: () => ({ ...state }),
      set: (patch) => {
        Object.assign(state, patch);
        listeners.forEach((fn) => fn({ ...state }));
      },
      subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    };

    const handle = window.AlloModules.UIFontLibrary.openReadingSettings({});
    const rulerCheckbox = handle.element.querySelector('input[id$="-ruler"]');
    const rulerLinesFieldset = handle.element.querySelector('[data-rs-ruler-lines="1"]');
    expect(rulerCheckbox).not.toBeNull();
    expect(rulerLinesFieldset).not.toBeNull();
    // Hidden by default when Reading Ruler is OFF (zero clutter).
    expect(rulerLinesFieldset.hidden).toBe(true);

    // Turning Reading Ruler ON reveals the 1/3/5-line selector and persists changes.
    rulerCheckbox.checked = true;
    rulerCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(rulerLinesFieldset.hidden).toBe(false);
    const fiveLines = handle.element.querySelector('input[name$="-ruler-lines"][value="5"]');
    expect(fiveLines).not.toBeNull();
    fiveLines.checked = true;
    fiveLines.dispatchEvent(new Event('change', { bubbles: true }));
    expect(state.rulerLines).toBe(5);
    handle.close(false);

    // Verify App.jsx uses font-size/line-height responsive formula and header exposes conditional controls.
    const appSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'src', 'App.jsx'), 'utf8');
    const headerMod = fs.readFileSync(path.join(ROOT, 'view_header_module.js'), 'utf8');
    expect(appSrc).toContain('Math.round(baseFontSize * lineHeight * rulerLines + 12)');
    expect(appSrc).toContain('allo_reading_ruler_lines');
    expect(headerMod).toContain('header_settings_text_ruler_lines');
  });

  it('carries Syllables and reading CSS into standalone HTML/IMS and Flashcards exports', () => {
    const exportMod = fs.readFileSync(path.join(ROOT, 'export_module.js'), 'utf8');
    expect(exportMod).toContain('_imsReaderCss');
    expect(exportMod).toContain('_imsBodyHtml');
    expect(exportMod).toContain('__alloIsSyllablesOn');
    expect(exportMod).toContain('readerSettings.syllables');
  });

  it('adds zero-AI Syllable Breaks option to Print Cards and Vocabulary Packets', () => {
    loadModuleIntoWindow('syllable_table_en.js');
    loadModuleIntoWindow('packets-print-cards.js');

    // 1. Print Cards: default OFF keeps words plain; checking #pc-syllables splits cards & word list.
    const pc = window.AlloPacketPrintCards;
    pc.open({
      words: ['butterfly', 'sun', 'telescope'],
      title: 'Science Words',
      pictures: false,
      syllables: window.AlloModules.SyllableTableEn,
    });
    const view = document.getElementById('print-cards-view');
    expect(view).not.toBeNull();
    expect(view.querySelectorAll('.pc-dot').length).toBe(0);
    const sylBox = view.querySelector('#pc-syllables');
    expect(sylBox).not.toBeNull();
    expect(sylBox.checked).toBe(false);
    sylBox.checked = true;
    sylBox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(view.querySelectorAll('.pc-dot').length).toBeGreaterThan(0);
    const firstCard = view.querySelector('.pc-word');
    expect(firstCard.textContent).toBe('but·ter·fly');
    expect(firstCard.querySelector('.pc-dot').getAttribute('aria-hidden')).toBe('true');
    pc.close();
    view.remove();

    // 2. Vocabulary packet builder + takeHomeVocab: embeds lesson.syllables and toggles cleanly.
    loadModuleIntoWindow('word_sounds_take_home_loader.js');
    loadModuleIntoWindow('packet_vocab_builder.js');
    const loader = window.AlloWordSoundsTakeHome;
    const vocabBuilder = window.AlloPacketVocab;
    const sampleRows = [
      { key: 'butterfly', word: 'butterfly', senseId: 's1', def: 'a colorful flying insect', example: 'The butterfly landed gently.', pos: 'noun', own: true, wrong: [
        { id: 'w1', word: 'volcano', def: 'a mountain that erupts lava', from: 'own' },
        { id: 'w2', word: 'telescope', def: 'a tool for seeing far stars', from: 'own' },
        { id: 'w3', word: 'umbrella', def: 'a cover that blocks rain', from: 'own' },
      ] },
      { key: 'volcano', word: 'volcano', senseId: 's2', def: 'a mountain that erupts lava', example: 'The volcano rumbled loudly.', pos: 'noun', own: true, wrong: [
        { id: 'w1', word: 'butterfly', def: 'a colorful flying insect', from: 'own' },
        { id: 'w2', word: 'telescope', def: 'a tool for seeing far stars', from: 'own' },
        { id: 'w3', word: 'umbrella', def: 'a cover that blocks rain', from: 'own' },
      ] },
      { key: 'telescope', word: 'telescope', senseId: 's3', def: 'a tool for seeing far stars', example: 'She looked through the telescope.', pos: 'noun', own: true, wrong: [
        { id: 'w1', word: 'butterfly', def: 'a colorful flying insect', from: 'own' },
        { id: 'w2', word: 'volcano', def: 'a mountain that erupts lava', from: 'own' },
        { id: 'w3', word: 'umbrella', def: 'a cover that blocks rain', from: 'own' },
      ] },
      { key: 'umbrella', word: 'umbrella', senseId: 's4', def: 'a cover that blocks rain', example: 'Carry an umbrella in storms.', pos: 'noun', own: true, wrong: [
        { id: 'w1', word: 'butterfly', def: 'a colorful flying insect', from: 'own' },
        { id: 'w2', word: 'volcano', def: 'a mountain that erupts lava', from: 'own' },
        { id: 'w3', word: 'telescope', def: 'a tool for seeing far stars', from: 'own' },
      ] },
    ];
    const lesson = vocabBuilder.lessonFromVocab({
      loader,
      rows: sampleRows,
      types: ['meaning'],
      mode: 'practice',
      readAloud: false,
      syllables: window.AlloModules.SyllableTableEn,
    });
    expect(lesson.syllables).toBeTruthy();
    expect(lesson.syllables.butterfly).toBe('but·ter·fly');
    expect(lesson.syllables.telescope).toBe('tel·e·scope');

    // Render one vocab item via _vocabChoice and toggle its Syllables button ON and OFF.
    const host = document.createElement('div');
    document.body.appendChild(host);
    const prefs = {};
    const supports = [];
    const elHelper = (tag, attrs, kids) => {
      const node = document.createElement(tag);
      Object.entries(attrs || {}).forEach(([k, v]) => {
        if (k === 'text') node.textContent = v;
        else if (k === 'on') Object.entries(v).forEach(([ev, fn]) => node.addEventListener(ev, fn));
        else if (k === 'hidden') node.hidden = !!v;
        else if (v != null) node.setAttribute(k, String(v));
      });
      (kids || []).forEach((kid) => {
        if (kid == null) return;
        node.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
      });
      return node;
    };
    const item = lesson.blocks[0].items.find((it) => it.ask === 'butterfly') || lesson.blocks[0].items[0];
    loader._vocabChoice(item, {
      root: host,
      el: elHelper,
      fmt: (s) => s,
      L: {
        vocab_meaning_question: 'What does this word mean?',
        vocab_meaning_read: 'Read aloud',
        vocab_meaning_hear: 'Hear it',
        vocab_meaning_read_choice: 'Hear choice {n}',
        vocab_meaning_blank: 'blank',
      },
      syllables: lesson.syllables,
      toolPref: (k, v) => (v !== undefined ? (prefs[k] = v ? 1 : 0) : prefs[k]),
      support: (name) => supports.push(name),
      isDone: () => false,
      answer: () => 'ok',
    }, 'vocab_meaning_', false);

    const sylToggle = host.querySelector('[data-vocab-syllables="1"]');
    expect(sylToggle).not.toBeNull();
    expect(sylToggle.getAttribute('aria-pressed')).toBe('false');
    sylToggle.click();
    expect(sylToggle.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('[data-read]').textContent).toContain('·');
    expect(supports).toContain('syllables');
    sylToggle.click();
    expect(sylToggle.getAttribute('aria-pressed')).toBe('false');
    expect(host.querySelector('[data-read]').textContent).not.toContain('·');
    host.remove();
  });

  it('adds zero-AI Read Selection button to ReadThisPagePanelView with speechSynthesis fallback', () => {
    loadModuleIntoWindow('view_cold_path_surfaces_module.js');
    const ReadThisPagePanelView = window.AlloModules.ReadThisPagePanelView;
    const spoken = [];
    let cancelled = 0;
    const prevSynth = window.speechSynthesis;
    const prevUtt = window.SpeechSynthesisUtterance;
    const prevPlayer = window.AlloSpeechPlayer;
    window.AlloSpeechPlayer = null;
    window.SpeechSynthesisUtterance = function FakeUtterance(txt) { this.text = txt; };
    window.speechSynthesis = {
      cancel: () => { cancelled++; },
      speak: (u) => { spoken.push(u.text); },
    };

    let currentSel = '';
    const origGetSel = window.getSelection;
    window.getSelection = () => ({ toString: () => currentSel });

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const Icon = () => React.createElement('span', null, 'ear');
    let stopped = 0;

    act(() => {
      root.render(React.createElement(ReadThisPagePanelView, {
        Ear: Icon,
        _readThisPageItemAt: () => {},
        closeReadThisPage: () => {},
        focusNarrationEnabled: false,
        getReadableContent: () => [{ type: 'text', text: 'Sample paragraph.' }],
        readAllReadThisPage: () => {},
        rtpCurrentIndex: -1,
        rtpPanelRef: { current: null },
        rtpPlaybackState: 'idle',
        setFocusNarrationEnabled: () => {},
        stopReadThisPage: () => { stopped++; },
        t: () => '',
        theme: 'light',
      }));
    });

    const selBtn = host.querySelector('#rtp-read-selection-btn');
    expect(selBtn).not.toBeNull();

    // Clicking with no text selected displays a polite inline hint instead of failing.
    act(() => { selBtn.click(); });
    expect(host.textContent).toContain('Highlight any text on the page first');
    expect(spoken.length).toBe(0);

    // Highlighting text and clicking Selection speaks it offline via speechSynthesis.
    currentSel = 'Photosynthesis converts sunlight into energy.';
    act(() => { selBtn.click(); });
    expect(spoken).toEqual(['Photosynthesis converts sunlight into energy.']);

    // Clicking Stop cancels speechSynthesis and invokes stopReadThisPage.
    const stopBtn = Array.from(host.querySelectorAll('button')).find((b) => b.textContent.includes('Stop'));
    act(() => { stopBtn.click(); });
    expect(cancelled).toBeGreaterThanOrEqual(1);
    expect(stopped).toBeGreaterThanOrEqual(1);

    act(() => { root.unmount(); });
    host.remove();
    window.getSelection = origGetSel;
    window.speechSynthesis = prevSynth;
    window.SpeechSynthesisUtterance = prevUtt;
    window.AlloSpeechPlayer = prevPlayer;
  });

  it('provides zero-AI Spanish POS and syllable tagging on-device in Immersive Reader', async () => {
    loadModuleIntoWindow('phase_n_misc_helpers_module.js');
    let saved = null;
    const toasts = [];
    await window.AlloModules.PhaseNHelpers.handleGeneratePOSData({
      leveledTextLanguage: 'Spanish',
      generatedContent: { id: 'es1', type: 'simplified', data: 'La educación natural ayuda rápidamente a las plantas verdes.' },
      isAnalyzingPos: false,
      setIsAnalyzingPos: () => {},
      // Functional update applied to the same resource (see the English test above).
      setGeneratedContent: (next) => { saved = typeof next === 'function' ? next({ id: 'es1', type: 'simplified' }) : next; },
      setHistory: () => {},
      addToast: (msg, kind) => { toasts.push({ msg, kind }); },
      t: (k) => k,
      warnLog: () => {},
      callGemini: null,
      _stripForImmersive: (s) => String(s || ''),
      chunkText: (s) => [s],
      parseTaggedContent: (tagged) => tagged,
    });
    expect(saved).not.toBeNull();
    expect(saved.posEnriched).toBe(true);
    expect(saved.posSource).toBe('on-device');
    expect(saved.immersiveData).toContain('<n>e·du·ca·ción</n>');
    expect(saved.immersiveData).toContain('<a>na·tu·ral</a>');
    expect(saved.immersiveData).toContain('<v>a·yu·da</v>');
    expect(saved.immersiveData).toContain('<d>rá·pi·da·men·te</d>');
    expect(saved.immersiveData).toContain('<n>plan·tas</n>');
    expect(saved.immersiveData).toContain('<a>ver·des</a>');
    expect(toasts.some((item) => item.kind === 'success')).toBe(true);
  });

  it('brings applyBionicDom to full Syllable Breaks + Spanish parity and reverses cleanly', () => {
    loadModuleIntoWindow('syllable_table_en.js');
    const div = document.createElement('div');
    div.innerHTML = '<p>Temperature rises</p><p>La mariposa vuela</p><code>Temperature</code>';

    // Syllables-only DOM transform (English)
    setBionicSetting(false);
    window.__alloSetSyllables(true);
    window.__alloApplyBionicDom(div, true, { bionic: false, syllables: true });
    expect(div.querySelector('p').textContent).toBe('Tem·per·a·ture ris·es');
    expect(div.querySelector('code').textContent).toBe('Temperature');
    expect(div.querySelectorAll('b').length).toBe(0);

    // Spanish combined Bionic + Syllables DOM transform
    window.__alloApplyBionicDom(div, true, { bionic: true, syllables: true, lang: 'es' });
    expect(div.querySelectorAll('p')[1].textContent).toBe('La ma·ri·po·sa vue·la');
    expect(div.querySelectorAll('b').length).toBeGreaterThan(0);

    // Cleanly reversible back to original plain text
    window.__alloApplyBionicDom(div, false);
    expect(div.querySelectorAll('[data-allo-bionic-dom]').length).toBe(0);
    expect(div.querySelectorAll('p')[0].textContent).toBe('Temperature rises');
    expect(div.querySelectorAll('p')[1].textContent).toBe('La mariposa vuela');
  });

  it('wires zero-AI phonics syllables, Document Builder bionic HTML, Vocab Print Cards, Analysis/Brainstorm reactivity, and ruler keyboard nudging', () => {
    const ce = fs.readFileSync(path.join(ROOT, 'content_engine_module.js'), 'utf8');
    const gl = fs.readFileSync(path.join(ROOT, 'view_glossary_module.js'), 'utf8');
    const simp = fs.readFileSync(path.join(ROOT, 'view_simplified_module.js'), 'utf8');
    const rl = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');
    const dp = fs.readFileSync(path.join(ROOT, 'doc_pipeline_module.js'), 'utf8');
    const an = fs.readFileSync(path.join(ROOT, 'view_analysis_module.js'), 'utf8');
    const br = fs.readFileSync(path.join(ROOT, 'view_brainstorm_module.js'), 'utf8');
    const pvHtml = fs.readFileSync(path.join(ROOT, 'packets-vocab.html'), 'utf8');
    const pvJs = fs.readFileSync(path.join(ROOT, 'packets-vocab.js'), 'utf8');
    const app = fs.readFileSync(path.join(ROOT, 'desktop', 'web-app', 'src', 'App.jsx'), 'utf8');
    const ws = fs.readFileSync(path.join(ROOT, 'word_sounds_take_home_loader.js'), 'utf8');

    // Item 1: zero-AI phonics syllables + Reading Library language-aware bionic & offline define/phonics
    expect(ce).toContain('localSyllables');
    expect(gl).toContain('data-phonics-local-syllables');
    expect(simp).toContain('data-phonics-local-syllables');
    expect(rl).toContain('lang: displayLanguage');
    expect(rl).toContain('__alloSplitSyllables');
    expect(rl).toContain('AlloDictionary');

    // Item 2: Document Builder / Printable Worksheet applies __alloBionicHtml
    expect(dp).toContain('__alloBionicHtml');

    // Item 3: Vocabulary Packet Maker wires Print word cards
    expect(pvHtml).toContain('packets-print-cards.css');
    expect(pvHtml).toContain('packets-print-cards.js');
    expect(pvHtml).toContain('id="print-cards"');
    expect(pvJs).toContain('AlloPacketPrintCards');

    // Item 4: Analysis & Brainstorm subscribe to __alloUseBionic
    expect(an).toContain('__alloUseBionic');
    expect(br).toContain('__alloUseBionic');

    // Item 5: Reading Ruler Alt+Arrow keyboard nudging + Vocab persisted 'syllables' toolPref
    expect(app).toContain("event.key !== 'ArrowUp' && event.key !== 'ArrowDown'");
    expect(ws).toContain("ctx.toolPref('syllables'");
  });

  it('provides zero-AI offline picture dictionary lookup with SVG safety guard', () => {
    expect(typeof window.__alloLookupWordPicture).toBe('function');
    const prevMatcher = window.AlloWordPictureMatcher;
    const prevSym = window.AlloModules.WordSoundsSymbols;

    window.AlloModules.WordSoundsSymbols = {
      ready: () => true,
      has: (w) => w.toLowerCase() === 'volcano' || w.toLowerCase() === 'unsafe',
      get: (w) => {
        if (w.toLowerCase() === 'volcano') return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>', set: 'mulberry' };
        if (w.toLowerCase() === 'unsafe') return { svg: '<svg><script>alert(1)</script></svg>', set: 'mulberry' };
        return null;
      },
    };
    window.AlloWordPictureMatcher = {
      matchWord: ({ word }) => (word.toLowerCase() === 'photosynthesis'
        ? { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><rect width="20" height="20"/></svg>', set: 'diagram' }
        : null),
    };

    const symPic = window.__alloLookupWordPicture('volcano');
    expect(symPic).not.toBeNull();
    expect(symPic.set).toBe('mulberry');
    expect(symPic.dataUri.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(symPic.credit).toContain('Mulberry');

    const diagPic = window.__alloLookupWordPicture('photosynthesis');
    expect(diagPic).not.toBeNull();
    expect(diagPic.set).toBe('diagram');
    expect(diagPic.credit).toContain('Diagram');

    // Unsafe SVGs containing <script> are strictly refused.
    expect(window.__alloLookupWordPicture('unsafe')).toBeNull();

    window.AlloWordPictureMatcher = prevMatcher;
    window.AlloModules.WordSoundsSymbols = prevSym;
  });

  it('passes leveledTextLanguage through formatInlineText and formatInteractiveText for unaccented Spanish syllable breaks', () => {
    loadModuleIntoWindow('phase_k_helpers_module.js');
    loadModuleIntoWindow('phase_n_misc_helpers_module.js');
    document.documentElement.lang = 'en';
    setBionicSetting(false);
    window.__alloSetSyllables(true);

    const kOut = ReactDOMServer.renderToStaticMarkup(React.createElement('p', null,
      window.AlloModules.PhaseKHelpers.formatInlineText('La mariposa estudia en la escuela.', false, false, {
        isPlaying: false,
        focusMode: false,
        leveledTextLanguage: 'Spanish',
        MathSymbol: ({ text }) => React.createElement('span', null, text),
        t: (k) => k,
      })
    ));
    const plainK = kOut.replace(/<[^>]+>/g, '');
    expect(plainK).toContain('ma·ri·po·sa');
    expect(plainK).toContain('es·cue·la');

    const nOut = ReactDOMServer.renderToStaticMarkup(React.createElement('p', null,
      window.AlloModules.PhaseNHelpers.formatInteractiveText('La mariposa estudia.', false, false, {
        focusMode: false,
        leveledTextLanguage: 'Spanish',
        latestGlossary: [],
        highlightGlossaryTerms: (s) => s,
        toFocusText: (s) => s,
        MathSymbol: ({ text }) => React.createElement('span', null, text),
        t: (k) => k,
      }, '')
    ));
    expect(nOut.replace(/<[^>]+>/g, '')).toContain('ma·ri·po·sa');
  });

  it('wires offline Define picture cards, Present-Export sheet supports, Read-Along paper bold start, and Learning Hub studio supports', () => {
    const ce = fs.readFileSync(path.join(ROOT, 'content_engine_module.js'), 'utf8');
    const simp = fs.readFileSync(path.join(ROOT, 'view_simplified_module.js'), 'utf8');
    const rl = fs.readFileSync(path.join(ROOT, 'reading_library_module.js'), 'utf8');
    const gl = fs.readFileSync(path.join(ROOT, 'view_glossary_module.js'), 'utf8');
    const peHtml = fs.readFileSync(path.join(ROOT, 'packets-present-export.html'), 'utf8');
    const peJs = fs.readFileSync(path.join(ROOT, 'packets-present-export.js'), 'utf8');
    const raHtml = fs.readFileSync(path.join(ROOT, 'packets-read-along.html'), 'utf8');
    const raJs = fs.readFileSync(path.join(ROOT, 'packets-read-along.js'), 'utf8');
    const ma = fs.readFileSync(path.join(ROOT, 'memory_aid_module.js'), 'utf8');
    const rh = fs.readFileSync(path.join(ROOT, 'research_hub_module.js'), 'utf8');
    const sf = fs.readFileSync(path.join(ROOT, 'story_forge_module.js'), 'utf8');
    const pt = fs.readFileSync(path.join(ROOT, 'poet_tree_module.js'), 'utf8');

    expect(ce).toContain('__alloLookupWordPicture');
    expect(simp).toContain('data-word-help-picture');
    expect(rl).toContain('data-rl-word-picture');
    expect(gl).toContain('glossaryBaseLanguage');

    expect(peHtml).toContain('id="pe-opt-syllables"');
    expect(peHtml).toContain('id="pe-opt-bold"');
    expect(peJs).toContain('applySheetReadingSupports');

    expect(raHtml).toContain('id="print-bold"');
    expect(raJs).toContain('appendPaperText');

    expect(ma).toContain('__alloUseBionic');
    expect(rh).toContain('__alloUseBionic');
    expect(sf).toContain('__alloUseBionic');
    expect(pt).toContain('__alloBionicHtml');
  });

  it('supports zero-AI Spanish syllable breaks in Read-Along packets and paper handouts', () => {
    loadModuleIntoWindow('word_sounds_take_home_loader.js');
    loadModuleIntoWindow('packet_read_along_builder.js');
    const loader = window.AlloWordSoundsTakeHome;
    const ra = window.AlloPacketReadAlong;
    expect(typeof ra.syllabifySpanish).toBe('function');
    const esSyl = ra.syllableText('La mariposa estudia fotosíntesis en la escuela.', ra.syllabifySpanish, { spanish: true });
    expect(esSyl).toContain('ma·ri·po·sa');
    expect(esSyl).toContain('fo·to·sín·te·sis');
    expect(esSyl).toContain('es·cue·la');

    const made = ra.lessonFromReadAlong({
      loader,
      title: 'La mariposa',
      text: 'La mariposa estudia fotosíntesis.',
      lang: 'es',
    });
    expect(made.syllables).not.toBeNull();
    expect(made.syllables.sentences).toBe(1);
    expect(made.lesson.blocks[0].items[0].lines[0].syl).toContain('ma·ri·po·sa');
  });

  it('applies Spanish syllable breaks to bilingual Spanish translation columns in English-hosted GlossaryView', () => {
    loadModuleIntoWindow('syllable_table_en.js');
    loadModuleIntoWindow('view_glossary_module.js');
    const GlossaryView = window.AlloModules.GlossaryView;
    document.documentElement.lang = 'en';
    setBionicSetting(false);
    window.__alloSetSyllables(true);

    const item = {
      term: 'Butterfly',
      def: 'A colorful flying insect.',
      translations: { Spanish: 'Mariposa: insecto que vuela por la escuela.' },
      _originalIdx: 0,
    };
    const html = ReactDOMServer.renderToStaticMarkup(React.createElement(GlossaryView, {
      t: (k) => k,
      generatedContent: { id: 'gl-bi', type: 'glossary', language: 'English', data: [item] },
      filteredGlossaryData: [item],
      history: [],
      flashcardOptions: [],
      displayLanguages: ['Spanish'],
      selectedLanguages: ['Spanish'],
      leveledTextLanguage: 'English',
      currentUiLanguage: 'English',
      isTeacherMode: false,
      isEditingGlossary: false,
      showGlossaryContext: false,
      glossaryImageSize: 80,
      isGeneratingTermImage: {},
      isGeneratingEtymology: {},
      glossaryRefinementInputs: {},
      getRows: () => 2,
    }));
    const plain = html.replace(/<[^>]+>/g, '');
    expect(plain).toContain('col·or·ful');
    expect(plain).toContain('Ma·ri·po·sa');
    expect(plain).toContain('es·cue·la');
  });
});
