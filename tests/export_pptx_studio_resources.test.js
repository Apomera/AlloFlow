import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

// PowerPoint export of studio resources (2026-09-02).
//
// handleExportSlides used to handle a fixed type list and drop everything else
// while the toast still said "PowerPoint downloaded!". Now the four studios
// get dedicated slides, any other resource goes through the shared
// deny-listed summarizer, and anything with no slide form is named in a toast.

const require = createRequire(import.meta.url);
const escapeXml = (value) => String(value == null ? '' : value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

beforeAll(() => {
  global.React = window.React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
});

afterEach(() => {
  delete window.PptxGenJS;
  vi.restoreAllMocks();
});

const flatten = (text) => (Array.isArray(text) ? text.map((run) => (run && run.text) || '').join('\n') : String(text == null ? '' : text));

function recordingStub(record) {
  return class MockPptx {
    constructor() {
      this.ShapeType = { rect: 'rect', ellipse: 'ellipse', line: 'line' };
      this.writeFile = vi.fn().mockResolvedValue('ok');
      record.writeFile = this.writeFile;
    }
    defineSlideMaster() {}
    addSlide() {
      const slide = { texts: [], notes: [] };
      slide.addText = (text, options) => { slide.texts.push({ text: flatten(text), placeholder: options && options.placeholder }); };
      slide.addNotes = (text) => slide.notes.push(String(text));
      slide.addShape = vi.fn();
      slide.addImage = vi.fn();
      slide.addTable = (rows) => { slide.texts.push({ text: rows.map((row) => row.map((cell) => (cell && cell.text) || cell || '').join(' | ')).join('\n') }); };
      record.slides.push(slide);
      return slide;
    }
  };
}

function runExport(history) {
  const record = { slides: [] };
  window.PptxGenJS = recordingStub(record);
  const addToast = vi.fn();
  const t = (key, params) => {
    if (key === 'export_status.ppt_skipped') return '{count} left out: {titles}';
    return key.indexOf('memory_aid.') === 0 ? undefined : key;
  };
  const api = window.AlloModules.createExport({
    liveRef: { current: { history, sourceTopic: 'Matter', gradeLevel: '5', addToast, t } },
    warnLog: vi.fn(), debugLog: vi.fn(), escapeXml, generateUUID: () => 'uuid',
  });
  return api.handleExportSlides().then((ok) => ({ ok, record, addToast, allText: record.slides.map((s) => s.texts.map((x) => x.text).join('\n')).join('\n====\n') }));
}

const memoryAid = {
  id: 'ma', type: 'memory-aid', title: 'Remember Matter',
  data: {
    instructions: 'Study the cue first.', sourceExcerpt: 'PRIVATE_SOURCE_EXCERPT', lessonRef: { sourceTextSnippet: 'PRIVATE_SNIPPET' },
    cards: [
      { id: 'c1', target: 'States of matter', essentialFacts: ['Solids retain shape.'], factLocked: true, factVerified: true, type: 'analogy-pattern', mode: 'generated', aiExample: 'A statue stays shaped.', studentDraft: 'My statue cue', mapping: 'Statue = solid.', visualImage: 'data:image/png;base64,' + 'A'.repeat(300), feedback: { strength: 'PRIVATE_FEEDBACK' }, practiceAttempts: [{ response: 'PRIVATE_RECALL' }] },
      { id: 'c2', target: 'Water cycle', essentialFacts: ['Evaporation comes first.'], factLocked: false, factVerified: true, type: 'sequence-cue', mode: 'generated', aiExample: 'Every Cloud Pours Rain' },
    ],
  },
};
const anchorChart = { id: 'ac', type: 'anchor-chart', title: 'Writing process', data: { chartType: 'process', sections: [{ label: 'Plan', bullets: ['Brainstorm ideas', 'Pick a focus'], icon: 'data:image/png;base64,QUJD' }, { label: 'Draft', bullets: ['Write freely'] }] } };
const cornell = { id: 'nt', type: 'note-taking', title: 'Cornell notes', data: { templateType: 'cornell-notes', cues: [{ text: 'What is erosion?' }], notes: [{ text: 'Wearing away of rock.' }], summary: 'Erosion moves material.' } };
const challenge = { id: 'ch', type: 'applied-challenge', title: 'Bridge Decision', data: { family: 'decide', sourceExcerpt: 'PRIVATE_SOURCE_EXCERPT', brief: { context: 'The town must choose a bridge design.', role: 'City engineer', audience: 'Council', drivingQuestion: 'Which design balances cost and safety?', lockedLessonFacts: ['Steel resists tension well.'], openQuestions: ['What is the budget?'] }, workspace: { framing: 'PRIVATE_STUDENT_WORK' }, feedback: { strength: 'PRIVATE_FEEDBACK' } } };
const persona = { id: 'p', type: 'persona', title: 'Chat with Curie', data: { transcript: [{ role: 'user', text: 'PRIVATE_CHAT' }] } };
const analysis = { id: 'an', type: 'analysis', title: 'Source analysis', data: { summary: 'The passage explains states of matter.', keyIdeas: ['Solids', 'Liquids'], sourceExcerpt: 'PRIVATE_SOURCE_EXCERPT' } };

describe('PowerPoint export of studio resources', () => {
  it('builds memory aid slides through the shared rules and never leaks private fields', async () => {
    const { ok, allText, record } = await runExport([memoryAid]);
    expect(ok).toBe(true);
    expect(record.writeFile).toHaveBeenCalled();
    expect(allText).toContain('Study the cue first.');
    expect(allText).toContain('States of matter');
    expect(allText).toContain('My statue cue');
    expect(allText).toContain('Solids retain shape.');
    const stateSlide = record.slides.find((s) => s.texts.some((x) => x.text.includes('States of matter')));
    const waterSlide = record.slides.find((s) => s.texts.some((x) => x.text.includes('Water cycle')));
    // A projected deck is student-facing: no teacher-review vocabulary on it.
    expect(stateSlide.texts.map((x) => x.text).join('\n')).toContain('Facts to remember');
    expect(waterSlide.texts.map((x) => x.text).join('\n')).toContain('Your teacher is still checking these facts');
    expect(allText).not.toContain('Teacher-verified facts');
    expect(allText).not.toContain('Facts awaiting teacher review');
    for (const secret of ['PRIVATE_SOURCE_EXCERPT', 'PRIVATE_SNIPPET', 'PRIVATE_FEEDBACK', 'PRIVATE_RECALL', 'AAAAAAAA']) expect(allText).not.toContain(secret);
  });

  it('projects a cue for a card whose student has not drafted one yet', async () => {
    // Without the shared ladder this slide was a target and a fact list.
    const scaffolded = { id: 'c3', target: 'Order of operations', essentialFacts: ['Parentheses first.'], factLocked: true, factVerified: true, type: 'sequence-cue', mode: 'scaffolded', scaffoldSteps: ['Name each operation.'] };
    const { allText } = await runExport([{ ...memoryAid, data: { ...memoryAid.data, cards: [scaffolded] } }]);
    expect(allText).toContain('Build it with support');
    expect(allText).toContain('Name each operation.');
  });

  it('renders anchor charts, Cornell notes, and applied challenge briefs', async () => {
    const { allText, record } = await runExport([anchorChart, cornell, challenge]);
    expect(allText).toContain('Plan');
    expect(allText).toContain('Brainstorm ideas');
    expect(allText).toContain('Write freely');
    expect(allText).not.toContain('QUJD');
    expect(allText).toContain('What is erosion?');
    expect(allText).toContain('Wearing away of rock.');
    expect(allText).toContain('Erosion moves material.');
    expect(allText).toContain('Which design balances cost and safety?');
    expect(allText).toContain('The town must choose a bridge design.');
    expect(allText).toContain('Steel resists tension well.');
    expect(allText).toContain('What is the budget?');
    for (const secret of ['PRIVATE_SOURCE_EXCERPT', 'PRIVATE_STUDENT_WORK', 'PRIVATE_FEEDBACK']) expect(allText).not.toContain(secret);
    expect(record.slides.length).toBeGreaterThanOrEqual(1 + 2 + 2 + 2);
  });

  it('routes other resources through the summarizer and names what it left out', async () => {
    const { addToast, allText } = await runExport([analysis, persona]);
    expect(allText).toContain('The passage explains states of matter.');
    expect(allText).toContain('Solids');
    expect(allText).not.toContain('PRIVATE_SOURCE_EXCERPT');
    expect(allText).not.toContain('PRIVATE_CHAT');
    expect(allText).not.toContain('{"');
    const messages = addToast.mock.calls.map((call) => call[0]);
    expect(messages).toContain('export_status.ppt_success');
    expect(messages.some((m) => m === '1 left out: Chat with Curie')).toBe(true);
  });

  it('stays silent about omissions when nothing was left out', async () => {
    const { addToast } = await runExport([anchorChart]);
    expect(addToast.mock.calls.map((call) => call[0]).some((m) => /left out/.test(m))).toBe(false);
  });
});
