import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, ReactDOM, H, rules, host, root;
const card = extra => ({ id: 'water', target: 'Water', type: 'keyword-association', mode: 'generated', essentialFacts: ['H2O'], factLocked: true, factVerified: true, aiExample: 'A water drop.', mapping: 'The drop reminds me of water.', ...extra });
const resource = c => ({ id: 'ma-integrity', type: 'memory-aid', title: 'Science', data: { schemaVersion: 2, authorshipMode: 'generated', cards: [c] } });

beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ReactDOM = require(resolve('desktop/web-app/node_modules/react-dom/client'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('memory_aid_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  H = window.AlloModules.MemoryAid._testing;
  rules = window.AlloModules.MemoryAid.exportRules;
});
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.PptxGenJS;
  vi.restoreAllMocks();
});

describe('Recall prompts do not copy short answers', () => {
  it.each([
    ['H2O', 'What is the formula H2O?'],
    ['Paris', 'Which city is PARIS?'],
    ['42', 'What gives the answer (42)?'],
    ['NaCl', 'What compound is NaCl?'],
  ])('removes %s from live and exported no-hints prompts', (answer, question) => {
    const c = card({ essentialFacts: [answer], recallQuestion: question });
    expect(H.memoryAidRecallQuestion(c)).toBe('');
    const html = rules.renderPreset(resource(c).data, 'no-hints');
    expect(html).not.toContain(question);
    expect(html).not.toContain(answer);
  });
  it('keeps genuine topic questions and avoids matching parts of words or numbers', () => {
    expect(H.memoryAidRecallQuestion(card({ recallQuestion: 'What is water’s chemical formula?' }))).toBe('What is water’s chemical formula?');
    expect(H.memoryAidRecallQuestion(card({ essentialFacts: ['4'], recallQuestion: 'What do 24 drops contain?' }))).toBe('What do 24 drops contain?');
    expect(H.memoryAidRecallQuestion(card({ essentialFacts: ['ion'], recallQuestion: 'Describe the motion.' }))).toBe('Describe the motion.');
  });
  it('does not render the copied answer in the actual unsupported-recall panel', async () => {
    host = document.createElement('div'); document.body.append(host); root = ReactDOM.createRoot(host);
    await React.act(async () => root.render(React.createElement(window.AlloModules.MemoryAidView, { generatedContent: resource(card({ recallQuestion: 'What is the formula H2O?' })), isTeacherMode: false, activeProfileId: 'recall-integrity', handleNoteUpdate() {}, addToast() {} })));
    const click = async label => {
      const button = [...host.querySelectorAll('button')].find(el => !el.closest('[hidden]') && el.textContent === label);
      expect(button, label).toBeTruthy(); await React.act(async () => button.click());
    };
    await click('Try recall');
    const without = [...host.querySelectorAll('input[type=radio]')].find(el => !el.closest('[hidden]') && el.parentElement.textContent === 'Without hints');
    expect(without).toBeTruthy(); await React.act(async () => without.click());
    await click('Start recall practice');
    const panel = host.querySelector('.memory-aid-practice-panel');
    expect(panel.textContent).not.toContain('H2O');
    expect(panel.textContent).toContain('Facts hidden');
  });
});

function preview(c) {
  return window.AlloModules.ExportHandlers.getSlidesPreviewHTML({ sourceTopic: 'Science', gradeLevel: '5', getExportableHistory: () => [resource(c)] });
}
async function pptx(c) {
  const texts = [], writeFile = vi.fn(async () => {}), toast = vi.fn();
  window.PptxGenJS = class {
    defineSlideMaster() {}
    addSlide() { return { addText(value) { texts.push(typeof value === 'string' ? value : value.map(run => run.text).join('\n')); }, addNotes() {}, addShape() {} }; }
    writeFile = writeFile;
  };
  const exporter = window.AlloModules.createExport({ liveRef: { current: { sourceTopic: 'Science', gradeLevel: '5', history: [resource(c)], addToast: toast, t: key => key } }, warnLog() {}, debugLog() {}, escapeXml: text => text, generateUUID: () => 'id' });
  expect(await exporter.handleExportSlides()).toBe(true);
  expect(writeFile).toHaveBeenCalledOnce();
  return texts.join('\n');
}
describe('Personalized slide explanations follow the current cue', () => {
  const oldMapping = 'The statue keeps its pose, like a solid keeps its shape.';
  const original = () => H.normalizeMemoryAidCard(card({ essentialFacts: ['Solids keep their shape.'], aiExample: 'A statue holds its pose.', mapping: oldMapping }), 0, {});
  it('omits archived mapping from both preview and actual PPTX export', async () => {
    const c = H.applyMemoryAidCardPatch(original(), { studentDraft: 'My ice cube keeps its shape.' });
    for (const text of [preview(c), await pptx(c)]) {
      expect(text).toContain('My ice cube keeps its shape.');
      expect(text).not.toContain(oldMapping);
    }
  });
  it('exports current learner connections in both lanes and escapes preview text', async () => {
    let c = H.applyMemoryAidCardPatch(original(), { studentDraft: 'My ice cube keeps its shape.' });
    c = { ...c, studentConnections: [{ factKey: H.memoryAidConnectionFactKeys(c)[0], cueKey: H.memoryAidConnectionKey(c), cue: '<cube>', explanation: 'My cube stays the same shape.' }] };
    const html = preview(c), deck = await pptx(c);
    expect(html).toContain('&lt;cube&gt;'); expect(html).not.toContain('<cube>');
    expect(deck).toContain('<cube>: Solids keep their shape. My cube stays the same shape.');
    expect(html).toContain('My cube stays the same shape.');
    expect(deck).not.toContain(oldMapping);
  });
  it('keeps the original mapping when the original cue is still current', async () => {
    expect(preview(original())).toContain(oldMapping);
    expect(await pptx(original())).toContain(oldMapping);
  });
  it('withholds a cue awaiting review even if the shared export helpers are unavailable', async () => {
    const c = { ...original(), cueNeedsReview: true }, memory = window.AlloModules.MemoryAid;
    try {
      delete window.AlloModules.MemoryAid;
      for (const text of [preview(c), await pptx(c)]) {
        expect(text).not.toContain(c.aiExample); expect(text).not.toContain(oldMapping);
      }
    } finally { window.AlloModules.MemoryAid = memory; }
  });
});
