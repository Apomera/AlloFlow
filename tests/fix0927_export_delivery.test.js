// Export fidelity: QTI/IMS report failure honestly, QTI keeps quiz pictures,
// STUDENT files and IMS packages omit teacher material, and in-app
// resource:ID links become working anchors (or plain names) in exports.
// FIX0927_EXPORT_MOD / FIX0927_DOC_MOD / FIX0927_VEP_SRC point at saved
// pre-fix copies for mutation checks.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[char]));
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
let pipeline;

beforeAll(() => {
  window.React = window.React || {};
  new Function(readFileSync(process.env.FIX0927_EXPORT_MOD || 'export_module.js', 'utf8'))();
  loadAlloModule('export_handlers_module.js');
  new Function(readFileSync(process.env.FIX0927_DOC_MOD || 'doc_pipeline_module.js', 'utf8'))();
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Resource',
    state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false },
  });
});
afterEach(() => { vi.restoreAllMocks(); delete window.JSZip; });

const createExport = (live) => window.AlloModules.createExport({ liveRef: { current: live }, warnLog: vi.fn(), debugLog: vi.fn(), escapeXml, generateUUID: () => '12345678-1234-1234-1234-123456789abc' });
const mockZip = () => {
  const state = {};
  window.JSZip = class MockZip {
    constructor() { state.zip = this; this.files = new Map(); this.options = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); }
    file(name, value, options) { this.files.set(name, value); if (options) this.options.set(name, options); }
  };
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  return state;
};
const pictureQuiz = () => ({ type: 'quiz', title: 'Pictures', data: { questions: [
  { type: 'mcq', question: 'Which leaf is a maple?', imageUrl: PNG, imageAltText: 'Two leaves', options: ['', ''], optionImageUrls: [PNG, 'blob:teacher-only'], optionImageAltTexts: ['Maple leaf', 'Oak leaf'], correctAnswer: '' },
] } });

describe('QTI and IMS report failure instead of counting as delivered', () => {
  it('returns false on every QTI failure path and true on success', async () => {
    const addToast = vi.fn();
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: pictureQuiz() })).toBe(false);
    mockZip();
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: { type: 'faq', data: [] } })).toBe(false);
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: { type: 'quiz', data: { questions: [{ question: 'Q', options: ['A', 'B'], correctAnswer: 'C' }] } } })).toBe(false);
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: { type: 'quiz', data: { questions: [{ question: 'Q', options: ['A', 'B'], correctAnswer: 'A' }] } } })).toBe(true);
    window.JSZip = class FailingZip { file() {} generateAsync() { return Promise.reject(new Error('disk full')); } };
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: { type: 'quiz', data: { questions: [{ question: 'Q', options: ['A', 'B'], correctAnswer: 'A' }] } } })).toBe(false);
    expect(await createExport({ history: [], addToast, t: (k) => k }).handleExportIMS({ liveHtml: '<!DOCTYPE html><html><body><p>Live</p></body></html>' })).toBe(false);
  });
  it('returns false on IMS failure paths and true on success', async () => {
    const addToast = vi.fn();
    expect(await createExport({ history: [], addToast, t: (k) => k }).handleExportIMS({ liveHtml: '<p>x</p>' })).toBe(false);
    mockZip();
    expect(await createExport({ history: [], addToast, t: (k) => k }).handleExportIMS({})).toBe(false);
    expect(await createExport({ history: [], addToast, t: (k) => k }).handleExportIMS({ liveHtml: '<!DOCTYPE html><html><body><p>Live</p></body></html>', liveTitle: 'Doc' })).toBe(true);
  });
});

describe('QTI keeps question and choice pictures', () => {
  it('packages inline pictures as matimage files and reports the ones that cannot travel', async () => {
    const state = mockZip();
    const addToast = vi.fn();
    expect(await createExport({ addToast, t: (k) => k }).handleExportQTI({ generatedContent: pictureQuiz() })).toBe(true);
    const xml = state.zip.files.get('assessment.xml');
    expect(new DOMParser().parseFromString(xml, 'application/xml').querySelector('parsererror')).toBeNull();
    expect(xml).toContain('<matimage imagtype="image/png" uri="images/q1.png" label="Two leaves"/>');
    expect(xml).toContain('uri="images/q1-choice-1.png" label="Maple leaf"');
    expect(xml).not.toContain('blob:teacher-only');
    expect(state.zip.options.get('images/q1.png')).toEqual({ base64: true });
    expect(state.zip.files.get('imsmanifest.xml')).toContain('<file href="images/q1-choice-1.png"/>');
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('1 picture(s) could not be packaged'), 'warning');
  });
});

describe('student-facing documents exclude teacher material', () => {
  const plan = { id: 'plan1', type: 'lesson-plan', title: 'Plan', config: {}, data: { essentialQuestion: 'PLAN QUESTION', objectives: ['Objective'], hook: 'Open with [the maple quiz](resource:quiz1) and [a deleted map](resource:gone42).', directInstruction: 'Model', guidedPractice: 'Guide', independentPractice: 'Solo', closure: 'Close' } };
  const quiz = { id: 'quiz1', type: 'quiz', title: 'Maple quiz', data: { questions: [{ type: 'mcq', question: 'Maple?', options: ['Yes', 'No'], correctAnswer: 'Yes' }] } };
  it('marks the lesson plan teacher-only so the STUDENT file drops it, while a plan print keeps it', () => {
    const html = pipeline.generateFullPackHTML([plan, quiz], 'Leaves', false, {}, { includeTeacherKey: true, includeLessonPlan: true, includeQuiz: true });
    const { studentHtml, teacherHtml } = window.AlloModules.ExportHandlers.separateStudentTeacherHtml(html);
    expect(studentHtml).not.toContain('PLAN QUESTION');
    expect(studentHtml).toContain('Maple?');
    expect(teacherHtml).toContain('PLAN QUESTION');
    const printOnly = pipeline.generateFullPackHTML([plan], 'Plan', false, {}, { includeTeacherKey: false, includeLessonPlan: true });
    expect(printOnly).toContain('PLAN QUESTION');
  });
  it('rewrites resource links to in-document anchors or plain names', () => {
    const html = pipeline.generateFullPackHTML([plan, quiz], 'Leaves', false, {}, { includeTeacherKey: false, includeLessonPlan: true, includeQuiz: true });
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelectorAll('a[href^="resource:"]')).toHaveLength(0);
    const link = Array.from(doc.querySelectorAll('a')).find((a) => a.textContent === 'the maple quiz');
    expect(link.getAttribute('href')).toBe('#quiz1');
    expect(link.hasAttribute('target')).toBe(false);
    expect(doc.getElementById('quiz1')).not.toBeNull();
    expect(doc.body.textContent).toContain('a deleted map');
  });
});

const vepSource = readFileSync(process.env.FIX0927_VEP_SRC || 'view_export_preview_source.jsx', 'utf8');
function builderPackageExport(scope) {
  const start = vepSource.indexOf('  const runPackageExport = React.useCallback(');
  const end = vepSource.indexOf('  // `sink` (optional)', start);
  const names = Object.keys(scope);
  return new Function('React', ...names, vepSource.slice(start, end) + '\nreturn runPackageExport;')({ useCallback: (fn) => fn }, ...names.map((name) => scope[name]));
}
const builderScope = (overrides) => ({
  altExportBusy: '', addToast: vi.fn(), t: () => '', onExportSuccess: vi.fn(),
  beginAlternativeExport: () => true, finishAlternativeExport: () => {},
  qtiAssessments: [{ key: 'q', item: { type: 'quiz' } }], selectedQtiKey: 'q', h5pActivities: [], selectedH5PKey: '',
  handleExportQTI: vi.fn(async () => undefined), handleExportH5P: vi.fn(async () => true), handleExportIMS: vi.fn(async () => true),
  getCleanBuilderDocument: () => {
    const doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body><main><p>Student page</p><div class="page-break"></div><div class="teacher-view"><p>ANSWER KEY TEXT</p></div><div data-allo-teacher-only="lesson-plan"><p>PLAN TEXT</p></div></main></body></html>', 'text/html');
    const clone = doc.documentElement.cloneNode(true);
    return { clone, title: 'Doc', html: '<!DOCTYPE html>\n' + clone.outerHTML };
  },
  ...overrides,
});

describe('Builder package export', () => {
  it('does not record a QTI or IMS export as delivered unless the handler reports success', async () => {
    for (const result of [undefined, false]) {
      const scope = builderScope({ handleExportQTI: vi.fn(async () => result), handleExportIMS: vi.fn(async () => result) });
      const run = builderPackageExport(scope);
      await run('qti'); await run('ims');
      expect(scope.onExportSuccess).not.toHaveBeenCalled();
    }
    const scope = builderScope({ handleExportQTI: vi.fn(async () => true) });
    await builderPackageExport(scope)('qti');
    expect(scope.onExportSuccess).toHaveBeenCalledWith({ kind: 'package', format: 'qti' });
  });
  it('packages only the student copy in IMS', async () => {
    const scope = builderScope();
    await builderPackageExport(scope)('ims');
    const { liveHtml } = scope.handleExportIMS.mock.calls[0][0];
    expect(liveHtml).toContain('Student page');
    expect(liveHtml).not.toContain('ANSWER KEY TEXT');
    expect(liveHtml).not.toContain('PLAN TEXT');
    expect(liveHtml).not.toContain('page-break');
    expect(scope.addToast).toHaveBeenCalledWith(expect.stringContaining('student copy only'), 'info');
  });
  it('flags leftover resource links in the export preflight', () => {
    const start = vepSource.indexOf('const _BUILDER_STYLE_GALLERY');
    const end = vepSource.indexOf('function ExportPreviewView');
    const preflight = new Function(vepSource.slice(start, end) + '\nreturn _builderExportPreflight;')();
    const doc = new DOMParser().parseFromString('<!DOCTYPE html><html lang="en"><head><title>T</title></head><body><h1>H</h1><p><a href="resource:abc">Quiz</a></p></body></html>', 'text/html');
    expect(preflight(doc, 'html').issues.map((issue) => issue.code)).toContain('resource-links');
  });
});
