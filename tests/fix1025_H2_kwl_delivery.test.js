// Lane H2 (2026-10-25): KWL teacher examples never reach a student copy.
// The outline generator marks Know / Want as teacher examples (branch.teacherExample,
// data.kwlTeacherExamples) and empties Learned. Each student route empties the
// example items but keeps the branch (so the student prompt renders); each teacher
// copy labels them. A KWL without the flags is unchanged everywhere.
//   1. Student boundary: SessionTransport.studentSafeResources, FirestoreSync
//      prepareSessionResourcesForWrite, LiveAac serializeResourceForStudentPack.
//   2. Exports: HTML pack (student split vs teacher key), PowerPoint (student vs
//      teacher audience), NotebookLM Markdown (answer-key gate).
//   3. Editor: handleOutlineChange keeps the flags.
//   4. Glossary contextSentence in the flashcard file and the Markdown.
// Mutation runs point H2_ST_SRC / H2_FS_SRC / H2_AAC_SRC / H2_DOC_MOD / H2_EXPORT_MOD /
// H2_PREVIEW_SRC / H2_HOST_MOD at scratch copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const { buildLiveAacModule } = require('../_build_live_aac_module.js');
const read = (env, file) => fs.readFileSync(process.env[env] || file, 'utf8');

const KNOW = 'KNOW_EXAMPLE plants need light';
const WANT = 'WANT_EXAMPLE how roots drink';
const KNOW_ES = 'KNOW_ES las plantas';
const LABEL = 'Teacher examples (hidden from students)';
const PROMPTS = ['What do you already know?', 'What do you want to know?', 'What did you learn?'];
const kwl = () => ({ id: 'kwl-1', type: 'outline', title: 'Plant KWL', data: {
  main: 'Plant needs', structureType: 'KWL Chart', kwlTeacherExamples: true,
  branches: [
    { title: 'Know', items: [KNOW], items_en: [KNOW_ES], teacherExample: true },
    { title: 'Want to Know', items: [WANT], teacherExample: true },
    { title: 'Learned', items: [] },
  ] } });
const legacy = () => ({ id: 'kwl-legacy', type: 'outline', title: 'Old KWL', data: {
  main: 'Plant needs', structureType: 'KWL Chart',
  branches: [{ title: 'Know', items: [KNOW] }, { title: 'Want to Know', items: [WANT] }, { title: 'Learned', items: [] }] } });

// ------------------------------------------------------------ 1. student boundary
function loadLanes() {
  const win = { React: {}, AlloModules: {} };
  new Function('window', read('H2_ST_SRC', 'session_transport_module.js'))(win);
  new Function('window', read('H2_FS_SRC', 'firestore_sync_module.js'))(win);
  new Function('window', buildLiveAacModule(read('H2_AAC_SRC', 'live_aac_source.jsx')))(win);
  const deps = channel => ({ sanitizeHistoryForCloud: win.sanitizeHistoryForCloud, stripUndefined: win.stripUndefined, audioChannel: channel });
  return {
    win, ST: win.AlloModules.SessionTransport,
    pack: (item, channel = 'student-pack') => win.AlloModules.LiveAac.serializeResourceForStudentPack(item, deps(channel)),
    live: item => win.prepareSessionResourcesForWrite([item]).resources[0],
  };
}
const expectStripped = (out) => {
  const text = JSON.stringify(out);
  expect(text.includes('KNOW_EXAMPLE'), 'Know example leaked').toBe(false);
  expect(text.includes('WANT_EXAMPLE'), 'Want example leaked').toBe(false);
  expect(text.includes('KNOW_ES'), 'translated example leaked').toBe(false);
  const [know, want, learned] = out.data.branches;
  expect(know).toMatchObject({ title: 'Know', items: [], items_en: [], teacherExample: true });
  expect(want).toMatchObject({ title: 'Want to Know', items: [], teacherExample: true });
  expect(learned).toMatchObject({ title: 'Learned', items: [] });
  expect(out.data.kwlTeacherExamples).toBe(true);
  expect(out.data.structureType).toBe('KWL Chart');
};
const lanes = [
  ['SessionTransport.studentSafeResources', api => api.ST.studentSafeResources([kwl()], ['lesson-plan'])[0], api => api.ST.studentSafeResources([legacy()], ['lesson-plan'])[0]],
  ['live session document', api => api.live(kwl()), api => api.live(legacy())],
  ['student pack file', api => api.pack(kwl()), api => api.pack(legacy())],
  ['homework QR', api => api.pack(kwl(), 'qr'), api => api.pack(legacy(), 'qr')],
  ['mailbox live pack', api => api.pack(kwl(), 'live'), api => api.pack(legacy(), 'live')],
];

describe('student boundary: KWL teacher examples stay on the teacher device', () => {
  it.each(lanes)('%s empties the example items and keeps the branches', (_, run) => {
    expectStripped(run(loadLanes()));
  });
  it.each(lanes)('%s leaves a legacy KWL untouched', (_, __, runLegacy) => {
    const out = runLegacy(loadLanes());
    expect(out.data.branches.map(b => b.items)).toEqual([[KNOW], [WANT], []]);
  });
  it('the teacher copy passed in is not mutated, and both transports publish the stripped copy', async () => {
    const api = loadLanes();
    const teacher = kwl();
    const before = JSON.stringify(teacher);
    api.ST.studentSafeResources([teacher], []); api.live(teacher); api.pack(teacher);
    expect(JSON.stringify(teacher)).toBe(before);
    const writes = [];
    const firebase = api.ST.createFirebaseTransport({ teacherOnlyTypes: [], uploadAssets: items => items,
      prepareResources: items => ({ resources: items }), write: payload => { writes.push(payload); } });
    await firebase.publishResources([kwl()]);
    expectStripped(writes[0].resources[0]);
    const pushed = [];
    const mailbox = api.ST.createMailboxTransport({ teacherOnlyTypes: [], seen: {}, fingerprint: item => JSON.stringify(item), pushItem: item => { pushed.push(item); } });
    await mailbox.publishResources([kwl()]);
    expectStripped(pushed[0]);
  });
});

// ------------------------------------------------------------ 2. exports
describe('HTML pack export', () => {
  let pipeline;
  beforeAll(() => {
    window.React = window.React || require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
    loadAlloModule('export_handlers_module.js');
    new Function(read('H2_DOC_MOD', 'doc_pipeline_module.js'))();
    pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: key => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'KWL',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false },
    });
  });
  const split = item => window.AlloModules.ExportHandlers.separateStudentTeacherHtml(
    pipeline.generateFullPackHTML([item], 'Plants', false, {}, { includeTeacherKey: true, includeOutline: true }));
  const text = html => new DOMParser().parseFromString(html, 'text/html').body.textContent;

  it('the student copy prints the prompts instead of the examples', () => {
    const { studentHtml } = split(kwl());
    const body = text(studentHtml);
    expect(body.includes('KNOW_EXAMPLE'), 'Know example in student file').toBe(false);
    expect(body.includes('WANT_EXAMPLE'), 'Want example in student file').toBe(false);
    expect(studentHtml.includes('KNOW_EXAMPLE')).toBe(false);
    for (const prompt of PROMPTS) expect(body.includes(prompt), prompt).toBe(true);
    expect(body.includes(LABEL)).toBe(false);
  });
  it('the teacher copy keeps the examples under the label', () => {
    const { teacherHtml } = split(kwl());
    const body = text(teacherHtml);
    expect(body.includes(KNOW), 'teacher copy has the Know example').toBe(true);
    expect(body.includes(WANT), 'teacher copy has the Want example').toBe(true);
    expect(body.split(LABEL).length - 1).toBeGreaterThanOrEqual(2);
  });
  it('a legacy KWL prints its items in the student copy, with no prompt and no label', () => {
    const { studentHtml, teacherHtml } = split(legacy());
    const body = text(studentHtml);
    expect(body.includes(KNOW)).toBe(true);
    expect(body.includes(WANT)).toBe(true);
    for (const marker of [...PROMPTS, LABEL]) expect(body.includes(marker), marker).toBe(false);
    // As before, the teacher key does not repeat a legacy organizer.
    const count = html => text(html).split(KNOW).length - 1;
    expect(count(teacherHtml)).toBe(count(studentHtml));
  });
});

describe('PowerPoint export', () => {
  beforeAll(() => {
    global.React = window.React = window.React || require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
    loadAlloModule('export_handlers_module.js');
    delete window.AlloModules.Export;
    new Function(read('H2_EXPORT_MOD', 'export_module.js'))();
  });
  afterEach(() => { delete window.PptxGenJS; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  const flatten = (value) => (Array.isArray(value) ? value.map(run => (run && run.text) || '').join('\n') : String(value == null ? '' : value));
  const slides = async (history, audience) => {
    const record = [];
    window.PptxGenJS = class {
      constructor() { this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' }; this.writeFile = vi.fn().mockResolvedValue('ok'); }
      defineSlideMaster() {}
      addSlide() { const slide = { addText: v => record.push(flatten(v)), addNotes: v => record.push(String(v)), addShape() {}, addImage() {}, addTable() {} }; return slide; }
    };
    const api = window.AlloModules.createExport({
      liveRef: { current: { history, sourceTopic: 'Plants', gradeLevel: '5', addToast: vi.fn(), t: key => key } },
      warnLog: vi.fn(), debugLog: vi.fn(), escapeXml: String, generateUUID: () => 'uuid',
    });
    await api.handleExportSlides({ audience });
    return record.join('\n');
  };
  it('the student deck shows the prompts and not the examples', async () => {
    const all = await slides([kwl()], 'student');
    expect(all.includes('KNOW_EXAMPLE')).toBe(false);
    expect(all.includes('WANT_EXAMPLE')).toBe(false);
    for (const prompt of PROMPTS) expect(all.includes(prompt), prompt).toBe(true);
    expect(all.includes(LABEL)).toBe(false);
  });
  it('the teacher deck keeps the examples under the label', async () => {
    const all = await slides([kwl()], 'teacher');
    expect(all.includes(KNOW)).toBe(true);
    expect(all.includes(WANT)).toBe(true);
    expect(all.split(LABEL).length - 1).toBe(2);
  });
  it('a legacy KWL deck is the same for both audiences', async () => {
    const student = await slides([legacy()], 'student');
    expect(student.includes(KNOW) && student.includes(WANT)).toBe(true);
    expect(student).toBe(await slides([legacy()], 'teacher'));
    for (const marker of [...PROMPTS, LABEL]) expect(student.includes(marker), marker).toBe(false);
  });
});

describe('NotebookLM Markdown export', () => {
  const src = read('H2_PREVIEW_SRC', 'view_export_preview_source.jsx');
  const start = src.indexOf('function _kwlMarkdownLines(');
  const end = src.indexOf('\n}\n', start);
  const lines = start < 0 || end < 0 ? null : new Function(src.slice(start, end + 2) + '\nreturn _kwlMarkdownLines;')();
  const esc = v => (v == null ? '' : String(v));
  it('the helper exists and the Markdown export uses it', () => {
    expect(lines, '_kwlMarkdownLines not found').toBeTypeOf('function');
    expect(src.includes('_kwlMarkdownLines(d, esc, ')).toBe(true);
  });
  it('without the teacher key: prompts, no examples', () => {
    const md = lines(kwl().data, esc, false, k => k).join('\n');
    expect(md.includes('KNOW_EXAMPLE') || md.includes('WANT_EXAMPLE')).toBe(false);
    for (const prompt of PROMPTS) expect(md.includes(prompt), prompt).toBe(true);
  });
  it('with the teacher key: examples under the label', () => {
    const md = lines(kwl().data, esc, true, k => k).join('\n');
    expect(md.includes(KNOW) && md.includes(WANT)).toBe(true);
    expect(md.split(LABEL).length - 1).toBe(2);
  });
  it('a legacy KWL prints its items either way', () => {
    const expected = ['- Know', '  - ' + KNOW, '- Want to Know', '  - ' + WANT, '- Learned'];
    expect(lines(legacy().data, esc, false, k => k)).toEqual(expected);
    expect(lines(legacy().data, esc, true, k => k)).toEqual(expected);
  });
  it('the glossary Markdown includes the context sentence', () => {
    expect(src.includes("if (typeof g.contextSentence === 'string' && g.contextSentence.trim()) out.push('  - _In the text:_ ' + esc(g.contextSentence.trim()));")).toBe(true);
  });
});

// ------------------------------------------------------------ 3. editor
describe('editing a KWL keeps its teacher-example flags', () => {
  beforeAll(() => {
    if (process.env.H2_HOST_MOD) { delete window.AlloModules.createHostHandlers; new Function(read('H2_HOST_MOD', ''))(); }
    else loadAlloModule('host_handlers_module.js');
  });
  const edit = (...args) => {
    let content = kwl();
    const host = window.AlloModules.createHostHandlers({
      get generatedContent() { return content; },
      setGeneratedContent: next => { content = typeof next === 'function' ? next(content) : next; },
      setHistory: () => {}, addToast: () => {}, t: key => key,
    });
    host.handleOutlineChange(...args);
    return content;
  };
  it('rewriting an example keeps teacherExample on the branch and kwlTeacherExamples on the content', () => {
    const out = edit(0, 'item', 'A rewritten example', 0);
    expect(out.data.branches[0]).toMatchObject({ items: ['A rewritten example'], teacherExample: true });
    expect(out.data.branches[1].teacherExample).toBe(true);
    expect(out.data.kwlTeacherExamples).toBe(true);
  });
  it('renaming a column and editing the main topic keep the flags', () => {
    expect(edit(1, 'title', 'Wonder').data.branches[1]).toMatchObject({ title: 'Wonder', teacherExample: true });
    const main = edit(null, 'main', 'New topic');
    expect(main.data.kwlTeacherExamples).toBe(true);
    expect(main.data.branches.map(b => b.teacherExample === true)).toEqual([true, true, false]);
  });
});

// ------------------------------------------------------------ 4. glossary flashcard file
const XML_ESCAPE = v => String(v).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
describe('flashcard file export shows the context sentence', () => {
  it('standard cards print "In the text:" as escaped text; a card without one prints none', () => {
    delete window.AlloModules.Export;
    new Function(read('H2_EXPORT_MOD', 'export_module.js'))();
    const files = [];
    vi.stubGlobal('Blob', class { constructor(parts) { this.text = parts.join(''); files.push(this); } });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:h2');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const data = [
      { entryId: 'leaf', term: 'Leaf', def: 'A plant part.', contextSentence: 'Each <b>leaf</b> & stem grew.' },
      { entryId: 'root', term: 'Root', def: 'The part under the ground.' },
    ];
    const api = window.AlloModules.createExport({ liveRef: { current: { generatedContent: { id: 'deck', type: 'glossary', data }, addToast: vi.fn(), t: key => key } }, escapeXml: XML_ESCAPE });
    api.handleExportFlashcards('standard', { includeAudio: false, useReadingSettings: false });
    const doc = new DOMParser().parseFromString(files.at(-1).text, 'text/html');
    const cards = [...doc.querySelectorAll('.card-container')];
    expect(cards).toHaveLength(2);
    const line = cards[0].querySelector('[data-context-sentence]');
    expect(line, 'context line on the Leaf card').not.toBeNull();
    // Markup in the AI quote is text, never elements (the definition's own path may strip it).
    const shown = line.textContent.replace(/\s+/g, ' ').trim();
    expect(['In the text: Each <b>leaf</b> & stem grew.', 'In the text: Each leaf & stem grew.'], shown).toContain(shown);
    expect(line.querySelector('b')).toBeNull();
    expect(cards[1].querySelector('[data-context-sentence]')).toBeNull();
    vi.unstubAllGlobals(); vi.restoreAllMocks();
  });
});
