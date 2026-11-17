// Slides export under the app's DEFAULT settings (2026-11-16).
//
// The app's saved export settings start with Teacher Key off. The slide export
// reads that as "student deck", which is the same rule every other export uses.
// Three things went wrong with it:
//   1. Flashcards lost their backs (fronts only), although a card's back is its
//      content, not an answer key.
//   2. Lesson plan, UDL advice, analysis and alignment slides vanished with no
//      message at all.
//   3. With Teacher Key on, the lesson plan slide read field names the app's
//      lesson plan does not write, so objectives and the hook were missing.
// Every earlier slide test passed an explicit audience, so none ran the default.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const mdDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

// The app's own defaults for the fields the slide export reads (AlloFlowANTI.txt, exportConfig).
const APP_DEFAULT_CONFIG = { includeTeacherKey: false, annotations: [] };

const flashcards = { id: 'fc1', type: 'flashcards', title: 'Plant cell cards', data: { cards: [{ front: 'Chloroplast', back: 'BACK_SITE_OF_PHOTOSYNTHESIS' }, { front: 'Vacuole', back: 'BACK_STORES_WATER' }] } };
// The shape view_lesson_plan_source.jsx reads and the generator writes.
const lessonPlan = {
  id: 'lp1', type: 'lesson-plan', title: 'Photosynthesis lesson plan',
  data: {
    essentialQuestion: 'EQ_HOW_DO_PLANTS_MAKE_FOOD',
    objectives: ['OBJ_EXPLAIN_INPUTS', 'OBJ_NAME_OUTPUTS'],
    materialsNeeded: ['MAT_LEAF_SAMPLES'],
    hook: 'HOOK_COVERED_LEAF_DEMO',
    directInstruction: 'DI_MODEL_THE_EQUATION',
    guidedPractice: 'GP_LABEL_THE_DIAGRAM',
    independentPractice: 'IP_EXIT_TICKET',
    closure: 'CLOSURE_ONE_SENTENCE_SUMMARY',
  },
};
const udlAdvice = { id: 'udl1', type: 'udl-advice', title: 'UDL advice', data: 'UDL_TEACHER_ADVICE_TEXT' };

function setup(exportConfig) {
  const slides = [];
  window.PptxGenJS = class {
    constructor() { this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' }; }
    defineSlideMaster() {}
    addSlide() {
      const s = {
        texts: [],
        addText(t) { this.texts.push(typeof t === 'string' ? t : JSON.stringify(t)); },
        addShape() {}, addTable(rows) { this.texts.push(JSON.stringify(rows)); }, addNotes() {}, addImage() {},
      };
      slides.push(s);
      return s;
    }
    writeFile({ fileName }) { return Promise.resolve(fileName); }
  };
  const toasts = [];
  const exporter = window.AlloModules.createExport({
    liveRef: { current: {
      history: [flashcards, lessonPlan, udlAdvice],
      generatedContent: flashcards,
      sourceTopic: 'Photosynthesis', gradeLevel: 'Grade 5', studentResponses: {},
      exportConfig,
      addToast: (message, kind) => toasts.push({ message: String(message), kind }),
      t: (k) => k,
      getDefaultTitle: (type) => String(type || 'Resource'),
      language: 'en', leveledTextLanguage: 'English', outputLanguage: 'English',
    } },
    warnLog: () => {}, debugLog: () => {},
    escapeXml: (v) => String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    generateUUID: (() => { let n = 0; return () => 'uuid-' + (++n); })(),
  });
  const text = () => slides.map((s) => s.texts.join('\n')).join('\n');
  return { exporter, slides, toasts, text };
}

beforeAll(() => {
  const React = require(resolve(mdDir, 'react'));
  globalThis.React = window.React = React;
  globalThis.ReactDOM = window.ReactDOM = require(resolve(mdDir, 'react-dom'));
  loadAlloModule('module_scope_extras_module.js');
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('applied_challenge_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_module.js');
  loadAlloModule('export_handlers_module.js');
}, 60000);

afterEach(() => { vi.restoreAllMocks(); });

describe('Slides export with the app default settings (Teacher Key off)', () => {
  it('keeps both sides of every flashcard', async () => {
    const s = setup(APP_DEFAULT_CONFIG);
    expect(await s.exporter.handleExportSlides()).toBe(true);
    expect(s.text()).toContain('Chloroplast');
    expect(s.text()).toContain('BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(s.text()).toContain('BACK_STORES_WATER');
  });

  it('leaves teacher resources out of the student deck and says which ones', async () => {
    const s = setup(APP_DEFAULT_CONFIG);
    await s.exporter.handleExportSlides();
    expect(s.text()).not.toContain('HOOK_COVERED_LEAF_DEMO');
    expect(s.text()).not.toContain('UDL_TEACHER_ADVICE_TEXT');
    const notice = s.toasts.find((x) => /teacher resource/.test(x.message));
    expect(notice, 'a notice names what was left out').toBeTruthy();
    expect(notice.message).toContain('2 teacher resource(s)');
    expect(notice.message).toContain('Photosynthesis lesson plan');
    expect(notice.message).toContain('UDL advice');
    expect(notice.message).toContain('Teacher Key');
  });

  it('a check (assessment mode) hides card backs and shows no left-out notice', async () => {
    const s = setup({ ...APP_DEFAULT_CONFIG, assessmentMode: true });
    await s.exporter.handleExportSlides();
    expect(s.text()).toContain('Chloroplast');
    expect(s.text()).not.toContain('BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(s.toasts.some((x) => /teacher resource/.test(x.message))).toBe(false);
  });
});

describe('Slides export with Teacher Key on', () => {
  it('builds the lesson plan slides from the fields the app writes', async () => {
    const s = setup({ ...APP_DEFAULT_CONFIG, includeTeacherKey: true });
    expect(await s.exporter.handleExportSlides()).toBe(true);
    const text = s.text();
    for (const marker of ['EQ_HOW_DO_PLANTS_MAKE_FOOD', 'OBJ_EXPLAIN_INPUTS', 'OBJ_NAME_OUTPUTS', 'MAT_LEAF_SAMPLES', 'HOOK_COVERED_LEAF_DEMO', 'DI_MODEL_THE_EQUATION', 'GP_LABEL_THE_DIAGRAM', 'IP_EXIT_TICKET', 'CLOSURE_ONE_SENTENCE_SUMMARY']) {
      expect(text, marker).toContain(marker);
    }
    expect(text.split('CLOSURE_ONE_SENTENCE_SUMMARY').length - 1, 'closure appears once').toBe(1);
    expect(text).toContain('UDL_TEACHER_ADVICE_TEXT');
    expect(text).toContain('BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(s.toasts.some((x) => /teacher resource/.test(x.message))).toBe(false);
  });
});

describe('Slide preview with the app default settings', () => {
  it('shows flashcard backs, and hides them only in a check', () => {
    const preview = (exportConfig) => window.AlloModules.ExportHandlers.getSlidesPreviewHTML({
      sourceTopic: 'Photosynthesis', gradeLevel: 'Grade 5', getExportableHistory: () => [flashcards], exportConfig,
    });
    expect(preview(APP_DEFAULT_CONFIG)).toContain('BACK_SITE_OF_PHOTOSYNTHESIS');
    expect(preview({ ...APP_DEFAULT_CONFIG, assessmentMode: true })).not.toContain('BACK_SITE_OF_PHOTOSYNTHESIS');
  });
});
