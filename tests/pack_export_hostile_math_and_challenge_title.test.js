// Text in a math problem or an Applied Challenge title cannot become live markup in an exported pack.
//
// WHY (2026-11-16): a review fed hostile text through every resource type of
// the HTML pack export. Two places still put it into the page as markup, in the
// student, teacher and worksheet files alike:
//   - Math. The export formats math with processMathHTML, which it reads from
//     window. The app never puts it there, so the export used its fallback,
//     which returned the text unchanged: unescaped (and not formatted either).
//   - The Applied Challenge heading, which used the title as it was.
// Both predate Gemini's escaping work. A student opening the file runs it.
import { beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const PROBE = '"><xss-probe></xss-probe><img src=x onerror=window.__hit=1>';
let pipeline;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  // The app loads its text helpers at startup; the export must use them.
  loadAlloModule('text_pipeline_helpers_module.js');
  loadAlloModule('doc_pipeline_module.js');
  const stub = async () => '';
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: stub, callGeminiVision: stub, callImagen: async () => null, addToast: () => {},
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key), isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: (type) => String(type || 'Resource'),
    state: { history: [], exportConfig: { audience: 'student', includeTeacherKey: false, annotations: [] } },
  });
}, 60000);

const MATH = { id: 'math', type: 'math', title: 'Equations', data: { problems: [{ question: 'Solve 2x = 10 ' + PROBE, answer: '5 ' + PROBE, steps: ['Divide by 2 ' + PROBE], realWorld: 'Pies.' }] } };
const CHALLENGE = { id: 'app', type: 'applied-challenge', title: 'Build a bridge ' + PROBE, data: { instructions: 'Prototype.', brief: { context: 'Well.', drivingQuestion: 'Design?' }, supports: { phasePrompts: { workingQuestion: 'Frame.' } } } };
const MODES = [
  ['student', false, { audience: 'student', includeTeacherKey: false }],
  ['teacher', false, { audience: 'teacher', includeTeacherKey: true }],
  ['worksheet', true, { audience: 'student', includeTeacherKey: false }],
];
const exportPack = (items, worksheet, config) => {
  const log = console.log; console.log = () => {};
  try {
    return new JSDOM(pipeline.generateFullPackHTML(items, 'Pack', worksheet, {}, { includeMath: true, annotations: [], ...config })).window.document;
  } finally { console.log = log; }
};

describe.each(MODES)('%s export', (_mode, worksheet, config) => {
  it('a math problem\'s text stays text, and its formatting still applies', () => {
    const doc = exportPack([MATH], worksheet, config);
    expect(doc.querySelectorAll('xss-probe, [onerror]')).toHaveLength(0);
    const math = Array.from(doc.querySelectorAll('.math-symbol'));
    expect(math.length).toBeGreaterThan(0);
    expect(math.some(el => el.textContent.includes('<xss-probe>'))).toBe(true);
  });

  it('an Applied Challenge title stays text', () => {
    const doc = exportPack([CHALLENGE], worksheet, config);
    expect(doc.querySelectorAll('xss-probe, [onerror]')).toHaveLength(0);
    const heading = doc.querySelector('.applied-challenge-export h2.resource-header');
    expect(heading.textContent).toContain('Build a bridge "><xss-probe></xss-probe>');
  });
});

describe('math formatting in the export', () => {
  it('uses the app\'s math formatting rather than passing text through', () => {
    const doc = exportPack([{ id: 'm2', type: 'math', title: 'Fractions', data: { problems: [{ question: 'What is $\\frac{1}{2}$ of 10?', answer: '5', steps: [] }] } }], false, MODES[1][2]);
    const html = Array.from(doc.querySelectorAll('.math-symbol')).map(el => el.innerHTML).join(' ');
    expect(html).not.toContain('\\frac{1}{2}');
  });

  it('still escapes when the app\'s math helpers are not loaded', () => {
    const helpers = window.AlloModules.TextPipelineHelpers;
    delete window.AlloModules.TextPipelineHelpers;
    try {
      const doc = exportPack([MATH], false, MODES[0][2]);
      expect(doc.querySelectorAll('xss-probe, [onerror]')).toHaveLength(0);
    } finally { window.AlloModules.TextPipelineHelpers = helpers; }
  });
});
