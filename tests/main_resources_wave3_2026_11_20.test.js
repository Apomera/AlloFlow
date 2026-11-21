import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { transformSync } = require('@babel/core');
const { act } = React;

const roots = [];

function mount(Component, props) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  roots.push(root);
  act(() => root.render(React.createElement(Component, props)));
  return { host, rerender: (nextProps) => act(() => root.render(React.createElement(Component, nextProps))) };
}

function loadExportHandlers() {
  const source = readFileSync(resolve('export_handlers_module.js'), 'utf8');
  const context = {
    window: { AlloModules: {} },
    document,
    navigator: {},
    console: { log() {}, warn() {}, error() {} },
    Blob,
    URL,
  };
  vm.runInNewContext(source, context);
  return context.window.AlloModules.ExportHandlers;
}

let Footer;

beforeAll(() => {
  globalThis.React = window.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  window.sanitizeHtml = (v) => String(v == null ? '' : v);
  if (!window.matchMedia) {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  }
  const footerSrc = readFileSync(resolve('resource_clarity_footer_source.jsx'), 'utf8');
  Footer = new Function(
    'React',
    transformSync(footerSrc, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code + ';return ResourceClarityFooter;'
  )(React);
  for (const mod of [
    'alt_text_module.js',
    'visual_panel_module.js',
    'view_image_module.js',
    'view_dbq_module.js',
    'view_directions_result_module.js',
    'view_lesson_plan_module.js',
  ]) {
    new Function(readFileSync(resolve(mod), 'utf8'))();
  }
});

afterEach(() => {
  roots.splice(0).forEach((root) => act(() => root.unmount()));
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  delete window.AlloSpeechPlayer;
});

describe('Wave 3: UDL Read This Page (getReadableContent)', () => {
  it('uses actual quiz title instead of hardcoded Exit Ticket and narrates embedded charts in simplified text', () => {
    const handlers = loadExportHandlers();
    const quizItems = handlers.getReadableContent({
      activeView: 'quiz',
      generatedContent: {
        type: 'quiz',
        title: 'Water Cycle Check-In',
        data: { title: 'Water Cycle Check-In', questions: [{ question: 'What is evaporation?', options: ['Liquid to gas'] }] },
      },
    });
    expect(quizItems[0].text).toContain('Water Cycle Check-In');
    expect(quizItems[0].text).not.toContain('Exit Ticket');

    const simItems = handlers.getReadableContent({
      activeView: 'simplified',
      generatedContent: {
        type: 'simplified',
        data: 'Rivers flow downhill.\n\n[[CHART: {"title":"Rainfall by Month","description":"Spring is wettest.","data":[{"label":"Apr","value":12},{"label":"May","value":15}]}]]\n\nPlants need rain.',
      },
    });
    const mediaItem = simItems.find((item) => item.type === 'media');
    expect(mediaItem).toBeTruthy();
    expect(mediaItem.text).toContain('Chart: Rainfall by Month');
    expect(mediaItem.text).toContain('Spring is wettest.');
    expect(mediaItem.text).toContain('Apr: 12');
    expect(simItems.map((i) => i.text).join(' ')).toContain('Rivers flow downhill.');
    expect(simItems.map((i) => i.text).join(' ')).toContain('Plants need rain.');
  });

  it('extracts structured reading-order items for main resources without leaking teacher keys in student mode', () => {
    const handlers = loadExportHandlers();
    const dbqItems = handlers.getReadableContent({
      activeView: 'dbq',
      generatedContent: {
        type: 'dbq',
        data: {
          title: 'Industrial Cities',
          essentialQuestion: 'How did factories change cities?',
          documents: [{ label: 'Document A', title: 'Mill Letter', excerpt: 'Work began at dawn.', questions: ['Who wrote this?'] }],
          synthesisPrompt: 'Write an essay using two documents.',
        },
      },
    });
    expect(dbqItems.map((i) => i.text).join(' | ')).toContain('Mill Letter');
    expect(dbqItems.map((i) => i.text).join(' | ')).toContain('Work began at dawn.');

    const mathStudent = handlers.getReadableContent({
      activeView: 'math',
      isStudentMode: true,
      generatedContent: {
        type: 'math',
        data: { title: 'Fractions', problems: [{ question: '1/2 + 1/2 = ?', answer: 'SECRET_ANSWER_1' }] },
      },
    });
    expect(mathStudent.map((i) => i.text).join(' | ')).toContain('Problem 1: 1/2 + 1/2 = ?');
    expect(mathStudent.map((i) => i.text).join(' | ')).not.toContain('SECRET_ANSWER_1');

    const anchorStudent = handlers.getReadableContent({
      activeView: 'anchor-chart',
      isStudentMode: true,
      generatedContent: {
        type: 'anchor-chart',
        data: {
          title: 'States of Matter',
          interactive: { armed: true },
          sections: [{ label: 'Solid', bullets: ['HIDDEN_REFERENCE_BULLET'] }],
        },
      },
    });
    expect(anchorStudent.map((i) => i.text).join(' | ')).toContain('Solid');
    expect(anchorStudent.map((i) => i.text).join(' | ')).not.toContain('HIDDEN_REFERENCE_BULLET');

    const dirItems = handlers.getReadableContent({
      activeView: 'directions',
      generatedContent: {
        type: 'directions',
        data: {
          title: 'Station Directions',
          steps: [{ title: 'Read Passage', details: 'Highlight two key facts.' }],
          goals: [{ text: 'Finish the summary' }],
        },
      },
    });
    expect(dirItems.map((i) => i.text).join(' | ')).toContain('Step 1: Read Passage. Highlight two key facts.');
    expect(dirItems.map((i) => i.text).join(' | ')).toContain('Finish the summary');
  });
});

describe('Wave 3: ResourceClarityFooter pre-share checks', () => {
  it('flags partial simplified checks, unreviewed math edits, ungrounded topic timelines, and non-passage starts', () => {
    const history = [{ id: 'r1', title: 'Item 1' }];
    const base = { history, index: 0, teacher: true, sync: false, hasPrev: false, hasNext: false, onNavigate: vi.fn(), t: (k) => k };

    const { host: h1 } = mount(Footer, {
      ...base,
      resource: {
        id: 'sim1',
        type: 'simplified',
        data: 'Short text',
        levelCheck: { checkedChars: 4000, totalChars: 9000 },
        alignmentCheck: { checkedChars: 5000, totalChars: 9000 },
        lessonPath: { seed: { kind: 'topic', text: 'Volcanoes' } },
      },
    });
    expect(h1.textContent).toContain('4000 of 9000');
    expect(h1.textContent).toContain('5000 of 9000');
    expect(h1.textContent).toContain('topic start');

    const { host: h2 } = mount(Footer, {
      ...base,
      resource: { id: 'm1', type: 'math', data: { _verification: { reviewRequired: true }, problems: [] } },
    });
    expect(h2.textContent).toContain('math set was edited and needs teacher review');

    const { host: h3 } = mount(Footer, {
      ...base,
      resource: { id: 'tl1', type: 'timeline', data: { items: [{ verification: { factual: true, position: true } }], research: { hasGrounding: false } } },
    });
    expect(h3.textContent).toContain('without grounded web sources');
  });
});

describe('Wave 3: VisualPanel Pointer Events, Caption Edit Button & ImageView Student Gate', () => {
  it('wires Pointer Events + touchAction and provides an accessible Edit button on captions', () => {
    const vpSource = readFileSync(resolve('visual_panel_source.jsx'), 'utf8');
    expect(vpSource).toContain('onPointerDown={(e) => handleDrawStart(e, panelIdx)}');
    expect(vpSource).toContain('onPointerMove={handleDrawMove}');
    expect(vpSource).toContain('onPointerUp={handleDrawEnd}');
    expect(vpSource).toContain("touchAction: drawingMode ? 'none' : undefined");
    expect(vpSource).toContain('onPointerDown={(e) => handleAiLabelMouseDown(panelIdx, labelIdx, e)}');
    expect(vpSource).toContain('onPointerDown={(e) => handleLabelMouseDown(panelIdx, uLabel.id, e)}');
    expect(vpSource).toContain('onPointerDown={(e) => handleAnchorMouseDown(panelIdx, pt.key, pt.type, e)}');

    const { host } = mount(window.AlloModules.VisualPanelGrid, {
      visualPlan: {
        layout: 'single',
        title: 'Cell',
        panels: [{ id: 'p1', imageUrl: 'data:image/png;base64,AA==', alt: 'Cell diagram', caption: 'Plant cell parts', labels: [] }],
      },
      t: (k) => (k === 'common.edit' ? 'Edit' : ''),
      onUpdatePanel: vi.fn(),
      onUpdateLabel: vi.fn(),
    });
    const editBtn = host.querySelector('[data-visual-caption-edit="0"]');
    expect(editBtn).not.toBeNull();
    act(() => editBtn.click());
    const textarea = host.querySelector('textarea[aria-label="Edit caption for panel 1"]');
    expect(textarea).not.toBeNull();
    expect(textarea.value).toBe('Plant cell parts');
  });

  it('hides the teacher red AI disclaimer box in student mode on ImageView', () => {
    const t = (k) => (k === 'visuals.warning.title' ? 'AI Visual Notice' : '');
    const baseProps = {
      generatedContent: { id: 'img1', type: 'image', data: { imageUrl: 'data:image/png;base64,AA==', altText: 'Diagram' } },
      t,
      leveledTextLanguage: 'English',
      singleImageFileRef: React.createRef(),
      imageRefinementInput: '',
      addToast: vi.fn(),
      VisualPanelGrid: window.AlloModules.VisualPanelGrid,
    };
    const { host: studentHost } = mount(window.AlloModules.ImageView, { ...baseProps, isTeacherMode: false });
    expect(studentHost.textContent).not.toContain('AI Visual Notice');

    const { host: teacherHost } = mount(window.AlloModules.ImageView, { ...baseProps, isTeacherMode: true });
    expect(teacherHost.textContent).toContain('AI Visual Notice');
  });
});

describe('Wave 3+4: DBQ Reference Drawer & Complete Print Packet', () => {
  const dbqResource = {
    id: 'dbq1',
    type: 'dbq',
    data: {
      title: 'Canal Trade',
      historicalContext: 'Canals connected farms to cities.',
      synthesisPrompt: 'Did canals improve daily life?',
      documents: [
        { id: 'A', title: 'Merchant Diary', excerpt: 'Shipping prices fell by half in 1826.', sourcingQuestions: ['Who wrote this?'] },
      ],
      rubric: [{ criteria: 'Evidence', 1: 'None', 2: 'Some', 3: 'Clear', 4: 'Strong' }],
    },
  };

  it('shows My Documents & Saved Quotes drawer on Essay tab and inserts quotes into the essay', () => {
    const inputs = {};
    const handleStudentInput = vi.fn((_id, key, val) => { inputs[key] = val; });
    const { host } = mount(window.AlloModules.DbqView, {
      generatedContent: dbqResource,
      studentResponses: {
        dbq1: {
          _dbqTab: 'essay',
          _essayText: 'Canals helped farmers.',
          _annotations: { A: [{ id: 1, text: 'Shipping prices fell by half', note: 'Economic impact' }] },
        },
      },
      handleStudentInput,
      t: () => '',
      gradeLevel: '7th Grade',
      isTeacherMode: false,
    });
    const drawer = host.querySelector('[data-dbq-essay-reference-drawer]');
    expect(drawer).not.toBeNull();
    expect(drawer.textContent).toContain('Merchant Diary');
    expect(drawer.textContent).toContain('Shipping prices fell by half');

    const insertBtn = host.querySelector('[data-dbq-insert-quote="A-0"]');
    expect(insertBtn).not.toBeNull();
    act(() => insertBtn.click());
    expect(inputs._essayText).toBe('Canals helped farmers. "Shipping prices fell by half" (Document A)');
  });

  it('includes annotations, source reliability, and rubric self-assessment in the DBQ Print Packet', () => {
    let writtenHtml = '';
    const popupDoc = document.implementation.createHTMLDocument('print');
    popupDoc.write = (html) => { writtenHtml += html; };
    popupDoc.close = vi.fn();
    vi.spyOn(window, 'open').mockReturnValue({
      document: popupDoc,
      focus: vi.fn(),
      print: vi.fn(),
    });
    const { host } = mount(window.AlloModules.DbqView, {
      generatedContent: dbqResource,
      studentResponses: {
        dbq1: {
          _annotations: { A: [{ id: 1, text: 'Shipping prices fell by half', note: 'Key proof' }] },
          _reliability_A: { rating: 'Somewhat Reliable', bias: 'Economic', reasoning: 'Merchant benefited from trade.' },
          _selfScores: { Evidence: '3' },
        },
      },
      handleStudentInput: vi.fn(),
      t: () => '',
      gradeLevel: '7th Grade',
      isTeacherMode: false,
    });
    const printBtn = [...host.querySelectorAll('button')].find((b) => /print/i.test(b.textContent || ''));
    expect(printBtn).toBeTruthy();
    act(() => printBtn.click());
    expect(writtenHtml).toContain('Shipping prices fell by half');
    expect(writtenHtml).toContain('Key proof');
    expect(writtenHtml).toContain('Somewhat Reliable');
    expect(writtenHtml).toContain('Merchant benefited from trade.');
    expect(writtenHtml).toContain('Self-score: 3/4');
  });
});

describe('Wave 3: Directions, Lesson Plan, Persona Chat, Word Sounds & Theme Styles', () => {
  it('wraps manual goals in <label> and reads directions aloud via Listen button', () => {
    const speak = vi.fn(() => Promise.resolve());
    window.AlloSpeechPlayer = { speak, isPlaying: () => false, stop: vi.fn() };
    const onToggleManual = vi.fn();
    const { host } = mount(window.AlloModules.DirectionsResult.DirectionsResultView, {
      t: () => '',
      title: 'Today’s Quest',
      bodyHtml: '<p>Start with the reading passage.</p>',
      showQuestMap: false,
      stationViews: [],
      goalViews: [{ id: 'g1', label: 'Complete two reflections', kind: 'manual', done: false }],
      choiceBoardView: null,
      onToggleManual,
    });
    const goalLabel = [...host.querySelectorAll('label')].find((l) => l.textContent.includes('Complete two reflections'));
    expect(goalLabel).toBeTruthy();
    expect(goalLabel.querySelector('input[type="checkbox"]')).not.toBeNull();
    act(() => goalLabel.click());
    expect(onToggleManual).toHaveBeenCalledWith('g1');

    const listenBtn = host.querySelector('[data-directions-listen="true"]');
    expect(listenBtn).not.toBeNull();
    act(() => listenBtn.click());
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0][0]).toContain('Today’s Quest');
    expect(speak.mock.calls[0][0]).toContain('Start with the reading passage.');
    expect(speak.mock.calls[0][0]).toContain('Complete two reflections');
  });

  it('adapts LessonPlanView heading to Study Guide / Family Guide and localizes learner projection notice', () => {
    const t = (k) => (k === 'lesson_plan.learner_projection_notice' ? 'LOCALIZED_LEARNER_NOTICE' : k);
    const basePlan = {
      id: 'lp1',
      type: 'lesson-plan',
      config: { generationInputs: { mode: 'study' } },
      data: { objectives: ['Analyze data'], activities: ['Chart rainfall'] },
    };
    const { host: studyHost } = mount(window.AlloModules.LessonPlanView, {
      generatedContent: basePlan,
      isTeacherMode: false,
      isIndependentMode: true,
      gradeLevel: '6th Grade',
      sourceTopic: 'Weather',
      t,
    });
    expect(studyHost.querySelector('h2').textContent).toBe('Study Guide');

    const { host: familyHost } = mount(window.AlloModules.LessonPlanView, {
      generatedContent: { ...basePlan, config: { generationInputs: { mode: 'family' } } },
      isTeacherMode: false,
      isParentMode: true,
      gradeLevel: '6th Grade',
      sourceTopic: 'Weather',
      t,
    });
    expect(familyHost.querySelector('h2').textContent).toBe('Family Guide');

    const { host: legacyHost } = mount(window.AlloModules.LessonPlanView, {
      generatedContent: { ...basePlan, config: { generationInputs: { mode: 'teacher' } } },
      isTeacherMode: false,
      gradeLevel: '6th Grade',
      sourceTopic: 'Weather',
      t,
    });
    expect(legacyHost.textContent).toContain('LOCALIZED_LEARNER_NOTICE');
  });

  it('fixes Persona Chat contrast/hover/Role Swap label, Word Sounds setup labels, and Dark/High-Contrast CSS', () => {
    const personaSrc = readFileSync(resolve('view_persona_chat_source.jsx'), 'utf8');
    expect(personaSrc).not.toContain('text-yellow-700 fill-current');
    expect(personaSrc).toContain('text-amber-200 fill-current');
    expect(personaSrc).toContain('hover:from-indigo-800 hover:to-purple-800');
    expect(personaSrc).toContain("t('persona.role_swap_short') : 'Role Swap'");

    const wsSrc = readFileSync(resolve('word_sounds_setup_source.jsx'), 'utf8');
    expect(wsSrc).toContain("aria-label={tf('word_sounds.minimize_setup', 'Minimize Word Sounds setup')}");
    expect(wsSrc).toMatch(/<h3\b[^>]*>\{tf\('word_sounds\.session_type'/);
    expect(wsSrc).toContain('htmlFor="ws-probe-skill"');
    expect(wsSrc).toContain('htmlFor="ws-syllable-min"');
    expect(wsSrc).toContain('htmlFor="ws-syllable-max"');

    const stylesMod = readFileSync(resolve('app_styles_module.js'), 'utf8');
    expect(stylesMod).toContain('.theme-dark [class*="bg-rose-50/"]');
    expect(stylesMod).toContain('.theme-dark [class*="hover:bg-slate-100"]');
    expect(stylesMod).toContain('.theme-dark [class*="hover:bg-yellow-100"]');
    expect(stylesMod).toContain('.theme-contrast [class*="bg-blue-50/"]');
    expect(stylesMod).toContain('.theme-contrast [class*="bg-amber-50/"]');
  });
});
