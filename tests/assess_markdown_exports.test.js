// Quiz exports and the Assess view's light markdown (**bold**, *italic*).
// PowerPoint keeps the emphasis as styled text runs and exports quizzes whose items have no options
// (short answer, fill-in-the-blank) instead of crashing; QTI and Google Forms get the words without the
// markers, with answer keys still matching their options; the Markdown file bolds only the "Q1." label.
//
// Mutation check: MD_EXPORT_MODULE=<pre-change export_module.js> and
// MD_EXPORT_PREVIEW_SOURCE=<pre-change view_export_preview_source.jsx> make these tests fail.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
const previewSource = readFileSync(process.env.MD_EXPORT_PREVIEW_SOURCE || 'view_export_preview_source.jsx', 'utf8');

beforeAll(() => {
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  window.AlloLanguageContext = React.createContext({ t: key => key });
  window.__alloT = key => key;
  window.AlloIcons = window.AlloIcons || {};
  window.AlloModules = window.AlloModules || {};
  new Function('window', readFileSync('view_quiz_module.js', 'utf8'))(window);
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule(process.env.MD_EXPORT_MODULE || 'export_module.js');
});

afterEach(() => {
  delete window.PptxGenJS;
  delete window.JSZip;
  vi.restoreAllMocks();
});

const quiz = {
  id: 'quiz-md', type: 'quiz', title: 'Animals',
  data: { questions: [
    { type: 'mcq', question: 'Which animal is **not** a mammal?', options: ['*Felis catus*', 'Salmon', 'Whale'], correctAnswer: 'Salmon' },
    { type: 'short-answer', question: 'Explain *why* whales breathe air.', expectedAnswer: 'They are **mammals** with lungs.' }
  ] }
};

const createExport = (live) => window.AlloModules.createExport({ liveRef: { current: live }, warnLog: vi.fn(), debugLog: vi.fn(), escapeXml, generateUUID: () => '12345678-1234-1234-1234-123456789abc' });

describe('PowerPoint', () => {
  it('keeps emphasis as runs and exports items without options', async () => {
    const slides = [];
    window.PptxGenJS = class {
      constructor() { this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' }; this.writeFile = vi.fn().mockResolvedValue('ok'); }
      defineSlideMaster() {}
      addSlide() { const slide = { texts: [], notes: [], addText(text, options) { slide.texts.push({ text, options }); }, addNotes(n) { slide.notes.push(n); }, addShape() {}, addImage() {}, addTable() {} }; slides.push(slide); return slide; }
    };
    const addToast = vi.fn();
    const api = createExport({ history: [quiz], sourceTopic: 'Animals', gradeLevel: '5', addToast, t: key => key });
    const ok = await api.handleExportSlides();
    expect(ok, JSON.stringify(addToast.mock.calls)).not.toBe(false);
    const runArrays = slides.flatMap(s => s.texts.map(x => x.text)).filter(Array.isArray);
    const runs = runArrays.flat();
    const stem = runArrays.find(a => a.some(r => r.text === 'not'));
    expect(stem.map(r => r.text).join('')).toBe('Which animal is not a mammal?');
    expect(stem.find(r => r.text === 'not').options.color).not.toBe(stem.find(r => r.text !== 'not').options.color);
    expect(runs.find(r => r.text === 'Felis catus')?.options.italic).toBe(true);
    expect(runs.find(r => r.text === 'why')?.options.italic).toBe(true);
    const all = JSON.stringify(slides.map(s => [s.texts.map(x => x.text), s.notes]));
    expect(all).not.toContain('**');
  });
});

describe('QTI', () => {
  it('writes the words without markers and keeps the key on the right option', async () => {
    let zip;
    window.JSZip = class { constructor() { zip = this; this.files = new Map(); this.generateAsync = vi.fn().mockResolvedValue(new Blob()); } file(name, value) { this.files.set(name, value); } folder() { return this; } };
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:qti');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const api = createExport({ generatedContent: quiz, sourceTopic: 'Animals', addToast: vi.fn(), t: key => key });
    await api.handleExportQTI();
    const xml = [...zip.files.values()].filter(v => typeof v === 'string').join('\n');
    expect(xml).toContain('Which animal is not a mammal?');
    expect(xml).toContain('Felis catus');
    expect(xml).not.toContain('**');
    expect(xml).not.toMatch(/\*Felis/);
  });
});

describe('printed worksheet / HTML pack', () => {
  let pipeline;
  beforeAll(() => {
    loadAlloModule('instructional_context_module.js');
    loadAlloModule('text_pipeline_helpers_module.js');
    loadAlloModule(process.env.MD_DOC_PIPELINE || 'doc_pipeline_module.js');
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => { throw Error('Local export only'); }, callGeminiVision: async () => { throw Error('Local export only'); },
      callImagen: async () => null, addToast() {}, t: key => key, isRtlLang: () => false, updateExportPreview() {}, getDefaultTitle: () => 'Assess',
      state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} }
    });
  });
  const render = (questions, teacher = false) => new DOMParser().parseFromString(pipeline.generateResourceHTML({ id: 'ws', type: 'quiz', title: 'Animals', data: { questions } }, teacher, {}, { includeTeacherKey: teacher, includeOriginalReading: false }), 'text/html');

  it('formats stems and options, escapes markup, and leaves money and blanks alone', () => {
    const doc = render([
      { type: 'mcq', question: 'Which animal is **not** a mammal? <img src=x data-injected=1>', options: ['*Felis catus*', 'Salmon', 'It costs $5 or $10'], correctAnswer: 'Salmon' },
      { type: 'fill-blank', question: 'A **river** carves a ___ over time.', expectedFill: 'valley' }
    ]);
    const body = doc.body;
    expect([...body.querySelectorAll('strong strong, strong')].map(el => el.textContent)).toEqual(expect.arrayContaining(['not', 'river']));
    expect([...body.querySelectorAll('em')].map(el => el.textContent)).toContain('Felis catus');
    expect(body.querySelector('[data-injected]')).toBeNull();
    expect(body.textContent).toContain('It costs $5 or $10');
    expect(body.textContent).toContain('A river carves a ___ over time.');
    expect(body.textContent).not.toContain('**');
  });

  it('keeps the teacher key readable and attribute values plain', () => {
    const doc = render([{ type: 'short-answer', question: 'Why do *whales* breathe air?', expectedAnswer: 'They are **mammals**.' }], true);
    expect([...doc.body.querySelectorAll('.answer-key strong, .answer-key em')].map(el => el.textContent)).toContain('mammals');
    const attrs = [...doc.querySelectorAll('*')].flatMap(el => [...el.attributes].map(a => a.value)).join(' ');
    expect(attrs).not.toContain('<strong>');
  });
});

describe('Google Forms and Markdown', () => {
  function helpers() {
    const start = previewSource.indexOf('// __ALLO_DRIVE_DELIVERY_BEGIN__'), end = previewSource.indexOf('// __ALLO_DRIVE_DELIVERY_END__', start);
    const sandbox = { window: { AlloModules: { QuizView: window.AlloModules.QuizView } } };
    vm.runInNewContext(previewSource.slice(start, end) + '\nthis.toForm = _alloQuizToFormItems;', sandbox);
    return sandbox;
  }
  it('gives Forms plain words and an answer index that still points at the key', () => {
    const items = helpers().toForm(quiz.data);
    const mcq = items.find(item => /mammal/.test(JSON.stringify(item)));
    const flat = JSON.stringify(items);
    expect(flat).toContain('Which animal is not a mammal?');
    expect(flat).not.toContain('*');
    expect(JSON.stringify(mcq)).toContain('Felis catus');
    const options = mcq.options || mcq.choices || [];
    const answer = [].concat(mcq.answer ?? mcq.correct ?? mcq.correctIndex ?? mcq.answers ?? []);
    expect(answer.map(i => (typeof i === 'number' ? options[i] : i)).map(o => (o && o.value) || o)).toContain('Salmon');
  });
  it('bolds only the question label in the Markdown file', () => {
    expect(previewSource.includes("out.push('**Q' + (i + 1) + '.** ' + esc(q.question), '');"), 'Markdown export bolds only the Q label').toBe(true);
  });
});
