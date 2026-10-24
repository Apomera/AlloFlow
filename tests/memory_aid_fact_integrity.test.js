import { beforeAll, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let React, DOM, act, api, H, S, root, host, resource, response;
const base = (extra = {}) => ({ id: 'solid', target: 'Solid shape', type: 'keyword-association', mode: 'generated', essentialFacts: ['A solid keeps its shape.'], factLocked: true, factVerified: true, aiExample: 'A solid statue keeps its shape.', mapping: 'The statue stays the same shape.', connections: [{ cue: 'statue', factIndex: 0, explanation: 'It keeps its own shape.' }], visualStatus: 'off', ...extra });
const data = card => ({ schemaVersion: 2, authorshipMode: 'generated', reflectionLevel: 'quick', cards: [card] });
const record = card => ({ id: 'fact-integrity', type: 'memory-aid', data: data(card) });
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react')); DOM = require(resolve('desktop/web-app/node_modules/react-dom/client')); act = React.act;
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync('memory_aid_source.jsx','utf8'), {loader:'jsx',format:'esm',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code)"], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  api = new Function('React', compiled + '\nreturn {View:MemoryAidView,exportRules:MEMORY_AID_EXPORT_RULES,H:{normalizeMemoryAidCard,normalizeMemoryAidCards,applyMemoryAidCardPatch,memoryAidPracticeReady,memoryAidPracticeCue,memoryAidCueBlock,memoryAidActiveConnections,buildMemoryAidReadAloudText,memoryAidCueFactBasis}};')(React);
  H = api.H; window.AlloModules.MemoryAid = { _testing: H, exportRules: api.exportRules };
  new Function(readFileSync(resolve('studio_response_module.js'), 'utf8'))(); S = window.AlloModules.StudioResponse;
}, 60000);
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; window.localStorage.clear(); window.sessionStorage.clear(); });
const visible = node => node && !node.closest('[hidden]');
const button = text => [...host.querySelectorAll('button')].find(node => visible(node) && node.textContent === text);
async function click(text) { expect(button(text), 'Button ' + text).toBeTruthy(); await act(async () => button(text).click()); }
async function input(node, value) { expect(node).toBeTruthy(); await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new Event('input', { bubbles: true })); }); }
async function mount(card, teacher = true, savedResponse = null, schemaVersion = 2) {
  resource = record(card); response = savedResponse; host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host);
  resource.data.schemaVersion = schemaVersion;
  function App() {
    const [current, setCurrent] = React.useState(resource), [work, setWork] = React.useState(response);
    resource = current; response = work;
    return savedResponse ? React.createElement(S.Boundary, { generatedContent: current, studentResponses: { [current.id]: { studio: work } }, View: api.View, activeProfileId: 'fact-learner', isTeacherMode: false, isProcessing: false, addToast: () => {}, onResponseChange: (id, next) => setWork(next) }) : React.createElement(api.View, { generatedContent: current, isTeacherMode: teacher, isProcessing: false, activeProfileId: 'fact-learner', addToast: () => {}, handleNoteUpdate: (field, value) => setCurrent(old => ({ ...old, data: { ...old.data, [field]: typeof value === 'function' ? value(old.data[field]) : value } })) });
  }
  await act(async () => root.render(React.createElement(App)));
}

describe('Memory Aid factual review integrity', () => {
  const disputed = () => base({ essentialFacts: ['Solids take container shape.', 'Solids take container volume.'], aiExample: 'A solid flows to fill its container.', mapping: 'Flowing solid fills its container.', factVerified: false, factCheck: { webVerified: true, summary: 'Two corrections.', sources: [], verdicts: [
    { fact: 'Solids take container shape.', verdict: 'disputed', correction: 'Solids keep their own shape.' },
    { fact: 'Solids take container volume.', verdict: 'disputed', correction: 'Solids keep their own volume.' },
  ] } });
  it('keeps unresolved disputes unverified through Done editing, but allows explicit teacher override', async () => {
    await mount(disputed()); await click('Edit resource'); await click('Use this correction'); await click('Apply corrected fact');
    expect(resource.data.cards[0].factVerified).toBe(false);
    await click('Done editing');
    expect(resource.data.cards[0].factVerified).toBe(false);
    expect(resource.data.cards[0].factCheck.verdicts.filter(row => row.verdict === 'disputed')).toHaveLength(1);
    expect(H.memoryAidPracticeReady(resource.data.cards[0]).ok).toBe(false);
    expect(host.textContent).toContain('0 memory targets marked teacher verified, 1 held for re-review.');
    await click('Edit resource'); await click('Mark facts teacher verified'); await click('Done editing');
    expect(resource.data.cards[0].factVerified).toBe(true);
    expect(resource.data.cards[0].cueNeedsReview).toBe(true);
  });
  it('preserves an ordinary legacy unverified card’s intentional Done editing verification', async () => {
    await mount(base({ factVerified: false })); await click('Edit resource'); await click('Done editing');
    expect(resource.data.cards[0].factVerified).toBe(true);
  });
  it('does not auto-verify unresolved disputes during the schema 1 migration', async () => {
    await mount(disputed(), true, null, 1);
    expect(resource.data.schemaVersion).toBe(2);
    expect(resource.data.cards[0].factVerified).toBe(false);
    expect(resource.data.cards[0].factCheck.verdicts.filter(row => row.verdict === 'disputed')).toHaveLength(2);
    expect(H.memoryAidPracticeReady(resource.data.cards[0]).ok).toBe(false);
  });
  it('still upgrades an ordinary schema 1 card without a dispute or teacher hold', async () => {
    await mount(base({ factVerified: false }), true, null, 1);
    expect(resource.data.schemaVersion).toBe(2);
    expect(resource.data.cards[0].factVerified).toBe(true);
  });
  it('keeps a corrected fact’s old mnemonic editable while withholding study and recall until reviewed', async () => {
    const card = disputed(); card.essentialFacts = card.essentialFacts.slice(0, 1); card.factCheck.verdicts = card.factCheck.verdicts.slice(0, 1);
    await mount(card); await click('Edit resource'); await click('Use this correction'); await click('Apply corrected fact'); await click('Done editing');
    const current = resource.data.cards[0];
    expect(current).toMatchObject({ factVerified: true, cueNeedsReview: true, aiExample: card.aiExample, mapping: card.mapping });
    const study = host.querySelector('.memory-aid-study');
    expect(study.textContent).not.toContain(card.aiExample); expect(study.textContent).not.toContain(card.mapping);
    expect(study.textContent).toContain('Solids keep their own shape.');
    await click('Try recall');
    expect(button('Start recall practice').disabled).toBe(true);
    expect(host.textContent).toContain('review the earlier memory cue before recall practice');
    await click('Edit resource');
    const cue = host.querySelector('[aria-label="AI example for Solid shape"]'); expect(cue.value).toBe(card.aiExample);
    await input(cue, 'A solid statue keeps its own shape.'); await input(host.querySelector('[aria-label="Mnemonic-to-fact mapping for Solid shape"]'), 'The statue has its own shape.');
    expect(resource.data.cards[0].cueNeedsReview).toBe(true);
    await click('I reviewed the cue against these facts'); await click('Done editing');
    expect(H.memoryAidPracticeReady(resource.data.cards[0]).ok).toBe(true);
    expect(host.querySelector('.memory-aid-study').textContent).toContain('A solid statue keeps its own shape.');
  });
  it('only marks substantive target/fact changes and preserves the text for review', () => {
    const card = base({ studentDraft: 'My own statue cue.' });
    expect(H.applyMemoryAidCardPatch(card, { essentialFacts: [' A SOLID   keeps its shape. '] }).cueNeedsReview).not.toBe(true);
    expect(H.applyMemoryAidCardPatch(card, { target: '  SOLID SHAPE  ' }).cueNeedsReview).not.toBe(true);
    for (const patch of [{ target: 'Liquid shape' }, { essentialFacts: ['A liquid takes the container shape.'] }]) {
      expect(H.applyMemoryAidCardPatch(card, patch)).toMatchObject({ cueNeedsReview: true, studentDraft: card.studentDraft, aiExample: card.aiExample, mapping: card.mapping });
    }
    expect(H.applyMemoryAidCardPatch(base({ aiExample: '', mapping: '', connections: [] }), { essentialFacts: ['A new fact.'] }).cueNeedsReview).not.toBe(true);
  });
  it('withholds stale cues and connections across read-aloud, shared cue blocks, and every print preset', () => {
    const card = base({ cueNeedsReview: true, studentDraft: 'OLD_LEARNER_CUE', mapping: 'OLD_MAPPING', aiExample: 'OLD_TEACHER_CUE' });
    expect(H.memoryAidCueBlock(card)).toMatchObject({ cue: '', steps: [], visualDescription: '', prompts: [], needsReview: true });
    expect(H.memoryAidActiveConnections(card)).toEqual([]);
    const speech = H.buildMemoryAidReadAloudText(card); expect(speech).toContain(card.essentialFacts[0]); expect(speech).not.toMatch(/OLD_/);
    for (const preset of ['study', 'recall', 'no-hints', 'teacher']) expect(api.exportRules.renderPreset(data(card), preset)).not.toMatch(/OLD_/);
    expect(H.memoryAidPracticeCue(card)).toBe('OLD_LEARNER_CUE');
  });
});

describe('Learner cue versions at the shared response boundary', () => {
  const saved = card => S.responseFromData('memory-aid', data({ ...card, studentDraft: 'My earlier personalized cue.' }), data(card));
  it('uses the same fact fingerprint with the shared helper and its standalone fallback', () => {
    const cards = [base(), base({ target: '  ＳＯＬＩＤ  Shape ', essentialFacts: [' A SOLID\n keeps its shape. ', '', null, 17] }), base({ target: 'İstanbul', essentialFacts: Array.from({ length: 12 }, (_, index) => 'Fact ' + index + ' '.repeat(4) + 'x'.repeat(700)) })];
    for (const card of cards) {
      const delegated = saved(card).cards[0].cueFactBasis;
      const rules = window.AlloModules.MemoryAid.exportRules;
      try {
        window.AlloModules.MemoryAid.exportRules = { ...rules, cueFactBasis: undefined };
        expect(saved(card).cards[0].cueFactBasis).toBe(delegated);
      } finally { window.AlloModules.MemoryAid.exportRules = rules; }
    }
  });
  it('binds a new personalized cue to its facts, while generated teacher cues need no learner binding', () => {
    const card = base(), work = saved(card);
    expect(work.cards[0].cueFactBasis).toBe(H.memoryAidCueFactBasis(card));
    expect(S.project(record(card), work).data.cards[0].cueNeedsReview).toBe(false);
    expect(S.project(record(card), S.emptyResponse(record(card))).data.cards[0].cueNeedsReview).toBe(false);
    expect(S.project(record({ ...card, target: ' SOLID SHAPE ' }), work).data.cards[0].cueNeedsReview).toBe(false);
  });
  it('cannot release an old learner cue when the teacher reviews a replacement resource cue', () => {
    const card = base(), work = saved(card);
    let revised = H.applyMemoryAidCardPatch(card, { essentialFacts: ['A liquid takes the container shape.'] });
    revised = H.applyMemoryAidCardPatch(revised, { aiExample: 'A liquid river flows.', factVerified: true, cueNeedsReview: false });
    const shown = S.project(record(revised), work).data.cards[0];
    expect(shown).toMatchObject({ cueNeedsReview: true, teacherCueNeedsReview: false, studentCueNeedsReview: true, studentDraft: 'My earlier personalized cue.' });
    expect(H.memoryAidPracticeReady(shown).ok).toBe(false);
    const unchangedSave = S.responseFromData('memory-aid', data({ ...shown, studentReasoning: 'An unrelated edit.' }), data(revised));
    expect(unchangedSave.cards[0].cueFactBasis).toBe(work.cards[0].cueFactBasis);
    expect(S.project(record(revised), unchangedSave).data.cards[0].studentCueNeedsReview).toBe(true);
  });
  it('requires a one-time check for an unsigned saved personalized cue and preserves the version in backups', () => {
    const card = base(), legacy = { schemaVersion: 1, cards: [{ id: card.id, studentDraft: 'Earlier unsigned cue.' }] };
    expect(S.project(record(card), legacy).data.cards[0].studentCueNeedsReview).toBe(true);
    const work = saved(card), restored = S.readBackup(record(card), S.backup(record(card), work));
    expect(restored.cards[0].cueFactBasis).toBe(work.cards[0].cueFactBasis);
    expect(S.project(record(card), restored).data.cards[0].studentCueNeedsReview).toBe(false);
  });
  it('lets the learner explicitly recheck only their cue against currently verified facts', async () => {
    const old = base(), work = saved(old), revised = base({ essentialFacts: ['A liquid takes the container shape.'], aiExample: 'A liquid flows.', cueNeedsReview: false });
    await mount(revised, false, work); await click('Make it mine');
    expect(host.querySelector('textarea[id$="-draft"]').value).toBe('My earlier personalized cue.');
    await input(host.querySelector('textarea[id$="-draft"]'), 'My revised flowing river cue.');
    expect(S.project(resource, response).data.cards[0].studentCueNeedsReview).toBe(true);
    await click('My cue matches the current facts');
    expect(response.cards[0].cueFactBasis).toBe(H.memoryAidCueFactBasis(revised));
    expect(H.memoryAidPracticeReady(S.project(resource, response).data.cards[0]).ok).toBe(true);
  });
  it.each([{ cueNeedsReview: true }, { factVerified: false }])('does not let learner confirmation override the teacher hold: %j', async hold => {
    const old = base(), work = saved(old), revised = base({ essentialFacts: ['Updated facts.'], ...hold });
    await mount(revised, false, work); await click('Make it mine');
    expect(button('My cue matches the current facts').disabled).toBe(true);
    expect(H.memoryAidPracticeReady(S.project(resource, response).data.cards[0]).ok).toBe(false);
  });
});
