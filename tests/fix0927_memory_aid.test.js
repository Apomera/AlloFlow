// Memory Aid Studio fixes (2026-09-27 review of the 24 core resources).
//
// M3  A drawing brief ('planning' alt source) is never used as image alt text,
//     in the live visual panel or in the HTML export.
// M4  A target or fact edit still clears recall/application questions, cue
//     connections and a retargeted fun fact (intended contract), but the editor
//     now keeps what was cleared: "Restore for review" puts it back (never over
//     newer writing), and a case-only or typed-back edit restores it at once.
// M5  "Remove target" works where window.confirm is a no-op (Gemini Canvas):
//     it goes through window.AlloFlowUX.confirm.
// Low Learners see "Print my practice sheet", not "Preview student worksheet".
//
// Mutation: FIX0927_MA_MODULE and FIX0927_DP_MODULE point at pre-fix copies.
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const load = (file) => { const path = resolve(ROOT, file); new Function(readFileSync(path, 'utf8') + '\n//# sourceURL=' + path.replace(/\\/g, '/'))(); };

let React, ReactDOMClient, act, root, host, H, rules;
beforeAll(() => {
  React = require(resolve(ROOT, 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
  act = React.act;
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  load(process.env.FIX0927_MA_MODULE || 'memory_aid_module.js');
  load(process.env.FIX0927_DP_MODULE || 'doc_pipeline_module.js');
  H = window.AlloModules.MemoryAid._testing;
  rules = window.AlloModules.MemoryAid.exportRules;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = null; host = null;
  delete window.AlloFlowUX;
  vi.restoreAllMocks();
});

async function render(data, overrides = {}) {
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const props = { generatedContent: { id: 'ma-1', type: 'memory-aid', data }, isTeacherMode: false, isProcessing: false, handleNoteUpdate: vi.fn(), callGemini: vi.fn(async () => '{}'), addToast: vi.fn(), gradeLevel: '5th Grade', ...overrides };
  await act(async () => root.render(React.createElement(window.AlloModules.MemoryAidView, props)));
  return props;
}
const buttonByText = (text) => [...host.querySelectorAll('button')].find(b => b.textContent === text);
const latestCards = (handleNoteUpdate, seed) => handleNoteUpdate.mock.calls.filter(call => call[0] === 'cards').reduce((cards, call) => typeof call[1] === 'function' ? call[1](cards) : call[1], seed);

const card = (extra = {}) => ({
  id: 'c1', target: 'Water cycle', essentialFacts: ['Water evaporates when heated.', 'Vapor condenses into clouds.'], type: 'story-chain', mode: 'generated',
  aiExample: 'Sun lifts the water, clouds catch it.', mapping: 'Each step is one stage.', factLocked: true, factVerified: true, ...extra,
});
const dataWith = (cards) => ({ resourceId: 'ma-1', schemaVersion: 2, title: 'Water', selectionMode: 'auto-mix', reflectionLevel: 'quick', reasoningRequired: false, cards });

describe('M3: a drawing brief is never used as alt text', () => {
  const planned = card({ visualImage: 'data:image/png;base64,QUJDRA==', visualAlt: 'PLANNING-BRIEF-XYZ a sun above a lake', visualAltSource: 'planning', visualSource: 'ai-generated' });
  it('live visual panel', async () => {
    await render(dataWith([planned]), { isTeacherMode: true });
    const alts = [...host.querySelectorAll('img')].map(img => img.getAttribute('alt') || '');
    expect(alts.length).toBeGreaterThan(0);
    expect(alts.some(alt => alt.includes('PLANNING-BRIEF-XYZ'))).toBe(false);
  });
  it('HTML export (full pack and teacher key)', () => {
    const pipeline = window.AlloModules.createDocPipeline({ callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null, addToast: () => {}, t: (key) => key, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Document', state: {} });
    const item = { id: 'ma-export', type: 'memory-aid', title: 'Water', data: dataWith([planned]) };
    for (const includeTeacherKey of [false, true]) {
      const html = pipeline.generateFullPackHTML([item], 'Memory', false, {}, { includeTeacherKey, annotations: [] });
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const alts = [...doc.querySelectorAll('.memory-aid-export img')].map(img => img.getAttribute('alt') || '');
      expect(alts.length).toBeGreaterThan(0);
      expect(alts.some(alt => alt.includes('PLANNING-BRIEF-XYZ'))).toBe(false);
    }
  });
});

describe('M4: a target or fact edit no longer silently erases derived content', () => {
  // Clearing on a meaning change is the intended contract (unchanged here); the
  // editor now keeps what was cleared and offers it back.
  const QUESTION = 'Which process lifts water into the sky?';
  const derivedCard = () => card({ factLocked: false, factVerified: false, recallQuestion: QUESTION, applicationQuestion: 'APP-Q-XYZ', applicationGuidance: 'APP-G-XYZ', connections: [{ cue: 'Sun', factIndex: 0, explanation: 'heat' }] });
  let latest;
  async function renderLive(cards) {
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    function Harness() {
      const [resource, setResource] = React.useState({ id: 'ma-live', type: 'memory-aid', data: dataWith(cards) });
      latest = resource;
      return React.createElement(window.AlloModules.MemoryAidView, { generatedContent: resource, isTeacherMode: true, isProcessing: false, addToast: vi.fn(), gradeLevel: '5th Grade', callGemini: vi.fn(async () => '{}'),
        handleNoteUpdate: (field, value) => setResource(old => ({ ...old, data: { ...old.data, [field]: typeof value === 'function' ? value(old.data[field]) : value } })) });
    }
    await act(async () => root.render(React.createElement(Harness)));
    await act(async () => buttonByText('Edit resource').click());
  }
  const liveCard = () => H.normalizeMemoryAidCards(latest.data.cards)[0];
  async function typeFacts(text) {
    const area = host.querySelector('textarea[aria-label^="Required facts for"]');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(area, text); area.dispatchEvent(new Event('input', { bubbles: true })); });
  }
  it('offers the cleared questions and connections back after a fact edit', async () => {
    await renderLive([derivedCard()]);
    await typeFacts('Water evaporates when strongly heated.\nVapor condenses into clouds.');
    expect(liveCard().recallQuestion).toBe('');
    expect(host.textContent).toContain('cleared this card');
    await act(async () => buttonByText('Restore for review').click());
    expect(liveCard().recallQuestion).toBe(QUESTION);
    expect(liveCard().applicationQuestion).toBe('APP-Q-XYZ');
    expect(liveCard().applicationGuidance).toBe('APP-G-XYZ');
    expect(liveCard().connections.length).toBe(1);
    expect(buttonByText('Restore for review')).toBeUndefined();
  });
  it('a case-only edit, or typing the text back, keeps everything', async () => {
    await renderLive([derivedCard()]);
    await typeFacts('water evaporates when HEATED.\nVapor condenses into clouds.');
    expect(liveCard().recallQuestion).toBe(QUESTION);
    expect(buttonByText('Restore for review')).toBeUndefined();
    await typeFacts('Something else entirely.');
    expect(liveCard().recallQuestion).toBe('');
    await typeFacts('Water evaporates when heated.\nVapor condenses into clouds.');
    expect(liveCard().recallQuestion).toBe(QUESTION);
    expect(liveCard().connections.length).toBe(1);
    expect(buttonByText('Restore for review')).toBeUndefined();
  });
  it('restoring never overwrites a question the teacher wrote after the edit, and "Keep them cleared" dismisses', async () => {
    await renderLive([derivedCard()]);
    await typeFacts('A new fact.');
    const recall = host.querySelector('textarea[aria-label^="Recall question for"]');
    await act(async () => { Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(recall, 'NEW-TEACHER-QUESTION'); recall.dispatchEvent(new Event('input', { bubbles: true })); });
    await act(async () => buttonByText('Restore for review').click());
    expect(liveCard().recallQuestion).toBe('NEW-TEACHER-QUESTION');
    expect(liveCard().applicationQuestion).toBe('APP-Q-XYZ');
    await typeFacts('Another fact.');
    await act(async () => buttonByText('Keep them cleared').click());
    expect(buttonByText('Restore for review')).toBeUndefined();
    expect(liveCard().applicationQuestion).toBe('');
  });
});

describe('M5: Remove target works without window.confirm', () => {
  it('uses AlloFlowUX.confirm and removes only on confirm', async () => {
    vi.spyOn(window, 'confirm').mockImplementation(() => false);
    const confirm = vi.fn(async () => true);
    window.AlloFlowUX = { confirm };
    const second = card({ id: 'c2', target: 'Clouds' });
    const props = await render(dataWith([card(), second]), { isTeacherMode: true });
    await act(async () => buttonByText('Edit resource').click());
    const removeButtons = [...host.querySelectorAll('button')].filter(b => b.textContent === 'Remove target');
    expect(removeButtons.length).toBe(2);
    await act(async () => { removeButtons[1].click(); await Promise.resolve(); });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(latestCards(props.handleNoteUpdate, [card(), second]).map(c => c.id)).toEqual(['c1']);
  });
  it('keeps the target when the in-app dialog is cancelled', async () => {
    window.AlloFlowUX = { confirm: vi.fn(async () => false) };
    const props = await render(dataWith([card(), card({ id: 'c2', target: 'Clouds' })]), { isTeacherMode: true });
    await act(async () => buttonByText('Edit resource').click());
    await act(async () => { [...host.querySelectorAll('button')].filter(b => b.textContent === 'Remove target')[0].click(); await Promise.resolve(); });
    expect(props.handleNoteUpdate.mock.calls.filter(call => call[0] === 'cards').length).toBe(0);
  });
});

describe('Low: learners see learner wording, not "Preview student worksheet"', () => {
  it('learners get "Print my practice sheet"; teachers keep the preview label', async () => {
    await render(dataWith([card()]), { isTeacherMode: false });
    expect(buttonByText('Preview student worksheet')).toBeUndefined();
    expect(buttonByText('Print my practice sheet')).toBeTruthy();
    await act(async () => root.unmount()); host.remove(); root = null; host = null;
    await render(dataWith([card()]), { isTeacherMode: true });
    expect(buttonByText('Preview student worksheet')).toBeTruthy();
  });
});
