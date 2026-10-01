import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
// DIRECTIONS_FIX_ROOT points every read at a saved copy of the files (mutation checks).
const ROOT = process.env.DIRECTIONS_FIX_ROOT || process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const require = createRequire(import.meta.url);
const host = read('AlloFlowANTI.txt');
const normStart = host.indexOf('function _alloNormalizeDirectionsData(');
const normalize = new Function(host.slice(normStart, host.indexOf('\n}\n', normStart) + 2) + ';return _alloNormalizeDirectionsData;')();
// Saved exactly as the composer builds the draft and addDirectionsToPack stores the normalizer's output.
const draft = { body: 'Do the steps.', softGate: true,
  objectives: [{ id: 'goal', kind: 'visited', label: 'Open the glossary', resourceRef: 'res-a' }],
  choiceBoard: { enabled: true, title: 'Your choice', prompt: 'Pick one first.',
    choices: [{ resourceRef: 'res-a', label: 'Glossary', icon: 'G', description: 'Match words' }, { resourceRef: 'res-b', label: 'Quiz', icon: '', description: 'Answer 5 questions' }] } };
const savedDirections = () => ({ id: 'directions-en', type: 'directions', title: 'Pick a task', data: normalize(draft) });
const echoTranslation = prompt => {
  const input = JSON.parse(prompt.match(/Input JSON: (\{.*\})\n/)[1]);
  const es = value => 'ES ' + value;
  return JSON.stringify({ title: es(input.title), body: es(input.body), labels: input.labels.map(es),
    choiceBoard: input.choiceBoard && { title: es(input.choiceBoard.title), prompt: es(input.choiceBoard.prompt),
      items: input.choiceBoard.items.map(card => ({ resourceRef: 'evil', resourceId: 'evil', label: es(card.label), description: es(card.description) })) } });
};
const translate = item => window.AlloModules.PhaseKHelpers.translateResourceItem(item, 'Spanish', { callGemini: vi.fn(async prompt => echoTranslation(prompt)), cleanJson: text => text, warnLog: () => {} });
const remapSource = () => {
  const source = read('host_handlers_source.jsx');
  const start = source.indexOf('// Directions goal tethers must follow the translation');
  const end = source.indexOf('__d.setHistory(prev => [...prev, ...newItems]);', start);
  expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
  return new Function('newItems', '_translatedIdMap', source.slice(start, end));
};
beforeAll(() => {
  global.React = window.React = require(resolve('desktop/web-app/node_modules/react'));
  loadAlloModule(process.env.DIRECTIONS_FIX_ROOT ? resolve(ROOT, 'phase_k_helpers_module.js') : 'phase_k_helpers_module.js');
});
describe('directions translate choice-board prose while retaining navigation identity', () => {
  it('uses the saved choices[] shape the normalizer produces', () => {
    const saved = savedDirections();
    expect(saved.data.choiceBoard.choices.map(card => card.resourceRef)).toEqual(['res-a', 'res-b']);
    expect(saved.data.choiceBoard).not.toHaveProperty('items');
  });
  it('translates every visible card field and ignores model changes to ids', async () => {
    const original = savedDirections();
    const callGemini = vi.fn(async prompt => echoTranslation(prompt));
    const result = await window.AlloModules.PhaseKHelpers.translateResourceItem(original, 'Spanish', { callGemini, cleanJson: text => text, warnLog: () => {} });
    const prompt = callGemini.mock.calls[0][0];
    expect(prompt).toContain('Match words'); expect(prompt).toContain('Answer 5 questions');
    expect(result.data.choiceBoard).toEqual({ enabled: true, title: 'ES Your choice', prompt: 'ES Pick one first.', choices: [
      { resourceRef: 'res-a', label: 'ES Glossary', icon: 'G', description: 'ES Match words' },
      { resourceRef: 'res-b', label: 'ES Quiz', description: 'ES Answer 5 questions' }] });
    expect(normalize(result.data).choiceBoard.choices.map(card => card.label)).toEqual(['ES Glossary', 'ES Quiz']);
    expect(result.data.objectives[0]).toEqual({ ...original.data.objectives[0], label: 'ES Open the glossary' });
    expect(result.data.softGate).toBe(true); expect(original.data.choiceBoard.choices[0].label).toBe('Glossary');
  });
  it('drops the stray empty items[] older translations wrote, and still reads a legacy items[] board', async () => {
    const stray = savedDirections(); stray.data.choiceBoard = { ...stray.data.choiceBoard, items: [] };
    expect((await translate(stray)).data.choiceBoard).not.toHaveProperty('items');
    const legacy = { id: 'old', type: 'directions', title: 'Old', data: { body: 'x', objectives: [], choiceBoard: { enabled: true, title: 'T', prompt: 'P', items: [{ resourceId: 'r1', label: 'Read', description: 'Read it' }] } } };
    const out = (await translate(legacy)).data.choiceBoard;
    expect(out.items).toEqual([{ resourceId: 'r1', label: 'ES Read', description: 'ES Read it' }]);
    expect(out).not.toHaveProperty('choices');
  });
  it('remaps choice cards and goal references in the actual translate-all handoff', async () => {
    const translated = await translate(savedDirections());
    translated.data.choiceBoard.items = [];
    const items = [translated];
    remapSource()(items, { 'res-a': 'res-a-es', 'res-b': 'res-b-es' });
    expect(items[0].data.objectives[0].resourceRef).toBe('res-a-es');
    expect(items[0].data.choiceBoard.choices.map(card => card.resourceRef)).toEqual(['res-a-es', 'res-b-es']);
    expect(items[0].data.choiceBoard).not.toHaveProperty('items');
    expect(normalize(items[0].data).choiceBoard.choices.map(card => card.resourceRef)).toEqual(['res-a-es', 'res-b-es']);
    const legacy = [{ type: 'directions', data: { objectives: [], choiceBoard: { items: [{ resourceId: 'a' }, { resourceId: 'b' }] } } }];
    remapSource()(legacy, { a: 'a-es' });
    expect(legacy[0].data.choiceBoard.items.map(card => card.resourceId)).toEqual(['a-es', 'b']);
  });
});
