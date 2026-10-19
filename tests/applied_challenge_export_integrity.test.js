import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
let React, DOM, act, AC, View, root, host;
const raw = () => ({ title: 'Garden comparison', family: 'design', scope: 'standard', instructions: 'Plan only; do not carry out the comparison.', sourceExcerpt: 'PRIVATE_SOURCE_TEXT', plan: { learningTarget: 'Use infiltration to compare designs.', sourceSelection: 'PRIVATE_SELECTED_TEXT' }, brief: { context: 'A fictional garden.', drivingQuestion: 'Which design should we compare?', lockedLessonFacts: ['Water can soak into soil.'], factVerified: true, factLocked: true, criteria: ['Compare two designs.'], evidenceBoundary: 'Measurements remain unknown until the comparison is completed.' }, workspace: { response: 'LEARNER_DRAFT', artifactUrl: 'https://example.org/work', artifactDescription: 'MY_LINK_EXPLANATION' }, feedback: { strength: 'AI_FEEDBACK', nextStep: 'Recheck the comparison.' }, validationCycles: [{ id: 'check', family: 'design', source: 'peer', plan: { methodId: 'constraint-test', testQuestion: 'Compare the runoff.', criterion: 'No more than one cup of runoff.', expectedFinding: 'I predict slower watering reduces runoff.', changeThreshold: 'Change if runoff does not fall.', evidenceMode: 'data' }, observation: { evidence: 'The peer noticed unequal water volumes.', outcome: 'challenges' }, decision: { action: 'revise', reasoning: 'Use equal volumes to make the comparison fair.', revisionSummary: 'I specified equal volumes.', nextStep: 'Ask the teacher to review the revised comparison.' } }] });
const resource = extra => ({ id: 'export-integrity', type: 'applied-challenge', data: AC.normalize({ ...raw(), ...extra }) });
const parse = html => new DOMParser().parseFromString(html, 'text/html');
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react')); DOM = require(resolve('desktop/web-app/node_modules/react-dom/client')); act = React.act;
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  const compiled = execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').transformSync(require('fs').readFileSync('applied_challenge_source.jsx','utf8'), {loader:'jsx',format:'esm',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',target:'es2020'}).code)"], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  const api = new Function('React', compiled + '\nreturn {View:AppliedChallengeView,normalize:normalizeAppliedChallengeData,renderPreset:renderAppliedChallengePreset,exportModel:appliedChallengeExportModel};')(React);
  AC = api; View = api.View; window.AlloModules.AppliedChallenge = api;
  new Function(readFileSync('export_source.jsx', 'utf8'))();
}, 60000);
afterEach(async () => { if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); delete window.PptxGenJS; sessionStorage.clear(); });

describe('Applied Problem Solving print content integrity', () => {
  it.each(['task', 'paper', 'response', 'teacher'])('the actual %s print control preserves directions and the appropriate work', async preset => {
    const item = resource(), writes = [];
    vi.spyOn(window, 'open').mockReturnValue({ document: { open() {}, close() {}, write: html => writes.push(html) } });
    host = document.createElement('div'); document.body.append(host); root = DOM.createRoot(host);
    await act(async () => root.render(React.createElement(View, { generatedContent: item, isTeacherMode: preset === 'teacher', activeProfileId: 'export-learner', allowRuntimeAi: false, handleNoteUpdate: () => {}, addToast: () => {} })));
    const selector = [...host.querySelectorAll('select')].find(node => [...node.options].some(option => option.value === 'paper'));
    await act(async () => { selector.value = preset; selector.dispatchEvent(new Event('change', { bubbles: true })); });
    await act(async () => [...host.querySelectorAll('button')].find(node => node.textContent === 'Open print / PDF preview').click());
    expect(writes).toHaveLength(1);
    const doc = parse(writes[0]), text = doc.body.textContent;
    expect(text).toContain(item.data.instructions);
    if (preset !== 'response') expect(text).toContain(item.data.brief.evidenceBoundary);
    if (['response', 'teacher'].includes(preset)) {
      expect(text).toContain('LEARNER_DRAFT'); expect(text).toContain(item.data.validationCycles[0].decision.nextStep);
    } else expect(text).not.toMatch(/LEARNER_DRAFT|MY_LINK_EXPLANATION|AI_FEEDBACK|I predict slower/);
    expect(text).not.toMatch(/PRIVATE_SOURCE_TEXT|PRIVATE_SELECTED_TEXT/);
    expect(doc.querySelector('script,textarea,input')).toBeNull();
  });

  it.each(['response', 'teacher'])('keeps all saved validation fields and meaningful labels in the %s copy', preset => {
    const data = resource().data, cycle = AC.exportModel(data).validationCycles[0], doc = parse(AC.renderPreset(data, preset)), text = doc.body.textContent;
    for (const value of [cycle.sourceLabel, cycle.plan.methodLabel, cycle.plan.evidenceModeLabel, cycle.plan.testQuestion, cycle.plan.criterion, cycle.plan.expectedFinding, cycle.plan.changeThreshold, cycle.observation.outcomeLabel, cycle.observation.evidence, cycle.decision.actionLabel, cycle.decision.reasoning, cycle.decision.revisionSummary, cycle.decision.nextStep]) expect(text, value).toContain(value);
    for (const label of ['Plan the check', 'Observe or gather evidence', 'Decide and revise', 'a prediction, not a result', 'Next check or action']) expect(text).toContain(label);
    expect(text.includes('AI_FEEDBACK')).toBe(preset === 'teacher');
  });

  it('preserves the source and learner decision for an AI-originated check without presenting its prediction as an observation', () => {
    const data = raw(); data.validationCycles[0] = { ...data.validationCycles[0], source: 'ai', importedChallenge: { challenge: 'What if the soil is compacted?', whyItMatters: 'The soil condition can affect infiltration.', question: 'How could you check the soil condition?' }, disposition: 'adapt', dispositionReason: 'I narrowed the advice to our soil condition.' };
    const doc = parse(AC.renderPreset(data, 'response')), text = doc.body.textContent;
    for (const value of Object.values(data.validationCycles[0].importedChallenge)) expect(text).toContain(value);
    expect(text).toContain(data.validationCycles[0].dispositionReason);
    const stages = [...doc.querySelectorAll('.aps-copy-check-stage')]; expect(stages).toHaveLength(3);
    expect(stages[0].textContent).toContain(data.validationCycles[0].plan.expectedFinding);
    expect(stages[1].textContent).not.toContain(data.validationCycles[0].plan.expectedFinding);
  });

  it('escapes authored instructions and validation content as text', () => {
    const data = raw(); data.instructions = 'Use x < 4 and do not run <script>alert(1)</script>.'; data.validationCycles[0].decision.nextStep = '<img src=x onerror=alert(1)> is literal text.';
    const doc = parse(AC.renderPreset(data, 'teacher'));
    expect(doc.querySelector('script,img')).toBeNull(); expect(doc.body.textContent).toContain(data.instructions); expect(doc.body.textContent).toContain(data.validationCycles[0].decision.nextStep);
  });
});

describe('Applied Problem Solving slide review status', () => {
  async function slides(brief, translator = key => key) {
    const records = [], written = vi.fn(async () => {});
    window.PptxGenJS = class {
      constructor() { this.ShapeType = { rect: 'rect', line: 'line', ellipse: 'ellipse' }; }
      defineSlideMaster() {}
      addSlide() { const row = { text: [], notes: [] }; records.push(row); return { addText: value => row.text.push(value), addNotes: value => row.notes.push(value), addShape() {}, addTable() {}, addImage() {} }; }
      writeFile = written;
    };
    const item = resource(); item.data.brief = { ...item.data.brief, ...brief };
    const exports = window.AlloModules.createExport({ liveRef: { current: { history: [item], sourceTopic: 'Garden', gradeLevel: '5', addToast: vi.fn(), t: translator } }, warnLog: vi.fn(), debugLog: vi.fn(), escapeXml: value => value, generateUUID: () => 'id' });
    await exports.handleExportSlides(); expect(written).toHaveBeenCalledTimes(1);
    return { records, serialized: JSON.stringify(records) };
  }
  it.each([{ factVerified: false, factLocked: true }, { factVerified: true, factLocked: false }, { factVerified: undefined, factLocked: undefined }])('keeps a pending review warning in slide text and notes for %j', async brief => {
    const result = await slides(brief);
    expect(result.serialized).toContain('Lesson facts awaiting teacher review');
    expect(result.serialized).not.toContain('Teacher-verified lesson facts');
    expect(result.records.some(row => row.notes.some(note => note.includes('Lesson facts awaiting teacher review')))).toBe(true);
    expect(result.serialized).not.toMatch(/PRIVATE_SOURCE_TEXT|PRIVATE_SELECTED_TEXT|LEARNER_DRAFT|AI_FEEDBACK|MY_LINK_EXPLANATION/);
  });
  it('preserves an explicitly verified legacy brief without a factLocked property', async () => {
    const result = await slides({ factVerified: true, factLocked: undefined });
    expect(result.serialized).toContain('Teacher-verified lesson facts'); expect(result.serialized).not.toContain('awaiting teacher review');
  });
  it('uses existing translated review labels in the actual slide exporter', async () => {
    const result = await slides({ factVerified: false }, key => key === 'applied_challenge.brief.facts_pending' ? 'Statements pending review (translated)' : key);
    expect(result.serialized).toContain('Statements pending review (translated)');
  });
});
