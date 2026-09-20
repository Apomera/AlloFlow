import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);

// Full production HTML and jsdom parsing can exceed 5s on a busy Windows host.
vi.setConfig({ testTimeout: 30000 });
let pipeline;

beforeAll(() => {
  // The Memory Aid export branch reads verification, alt-text, and cue rules
  // from window.AlloModules.MemoryAid.exportRules (one derivation shared with
  // the live view) and fails safe without it, so load the module as the app does.
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '{}';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub,
    callGeminiVision: stub,
    callImagen: async () => null,
    addToast: () => {},
    t: (key) => key,
    isRtlLang: () => false,
    updateExportPreview: () => {},
    getDefaultTitle: () => 'Document',
    state: {},
  });
});


describe('AlloPack quiz print contracts', () => {
  const pack = (questions, worksheet, teacher = false) => new DOMParser().parseFromString(
    pipeline.generateFullPackHTML([{id:'pack-quiz',type:'quiz',title:'Quiz',data:{questions}}], 'Lesson', worksheet, {}, {includeTeacherKey:teacher,annotations:[]}), 'text/html');
  it.each([false,true])('renders shortAnswer as a written response (worksheet=%s)', (worksheet) => {
    const questions=[{type:'shortAnswer',question:'Explain how rain forms.',expectedAnswer:'Condensed droplets grow and fall.'}];
    const student=pack(questions,worksheet);
    expect(student.querySelector('[data-item-type="short-answer"]')).not.toBeNull();
    expect(student.querySelector('[data-item-type="mcq"]')).toBeNull();
    expect(student.body.textContent).not.toContain('Condensed droplets grow and fall.');
    expect(!!student.querySelector('textarea[data-allo-response-key="pack-quiz:q0:short"]')).toBe(!worksheet);
    expect(pack(questions,worksheet,true).body.textContent).toContain('Condensed droplets grow and fall.');
  });
  it.each([
    [['1','2','3','4'],'1',0],
    [['2','6','3','18'],'2',0], // Linear Equations catalog question.
    [['3','2','5','7'],'3',0], // Making Ten catalog question.
    [['B','A','C','D'],'B',0],
    [['Rain','Snow','Wind','Sun'],'2',2],
    [['Rain','Snow','Wind','Sun'],'B',1],
  ])('resolves option text before legacy index/letter keys: %s / %s', (options,correctAnswer,expected) => {
    const doc=pack([{type:'mcq',question:'Choose the answer.',options,correctAnswer}],false);
    expect(doc.querySelector('[data-item-type="mcq"]').getAttribute('data-correct')).toBe(String(expected));
  });
});
