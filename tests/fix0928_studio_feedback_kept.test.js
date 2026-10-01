// 2026-09-28 decision 5: AI feedback on Notes and Anchor Charts stays visible while the
// learner revises. Before this, the first keystroke of a revision deleted it. Now an edit
// keeps it and labels it as feedback on an earlier draft (on screen and in the
// submission), asking again replaces it, and asking again about unchanged work earns
// no XP, so kept feedback cannot be used to farm points.
// Mutation check: FIX0928_STUDIO_RESPONSE / FIX0928_NOTES_MODULE / FIX0928_ANCHOR_MODULE
// load candidate copies (for example the pre-fix modules).
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let api, root, host;
beforeAll(() => {
  global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  new Function(readFileSync(process.env.FIX0928_STUDIO_RESPONSE || resolve('studio_response_module.js'), 'utf8'))();
  new Function(readFileSync(process.env.FIX0928_NOTES_MODULE || resolve('note_taking_templates_module.js'), 'utf8'))();
  new Function(readFileSync(process.env.FIX0928_ANCHOR_MODULE || resolve('anchor_charts_module.js'), 'utf8'))();
  api = window.AlloModules.StudioResponse;
});
afterEach(() => { try { if (root) act(() => root.unmount()); } catch (_) {} root = null; host?.remove(); host = null; vi.restoreAllMocks(); });

const t = () => '';
async function change(input, value) { await act(async () => Simulate.change(input, { target: { value } })); }
function harness(initial, extra = {}) {
  let control;
  function Harness() {
    const [resource] = React.useState(initial), [responses, setResponses] = React.useState({});
    control = { resource, responses };
    const View = resource.type === 'anchor-chart' ? window.AlloModules.AnchorChartView : window.AlloModules.NoteTakingView;
    return React.createElement(api.Boundary, { View, generatedContent: resource, isTeacherMode: false, studentResponses: responses, studentWorkStatus: 'saved',
      onResponseChange: (id, studio) => setResponses(p => ({ ...p, [id]: { studio } })), handleNoteUpdate: vi.fn(), allowRuntimeAi: true, t, ...extra });
  }
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(React.createElement(Harness)));
  return () => control;
}
const replies = (...list) => { const queue = list.map(item => JSON.stringify(item)); return vi.fn(async () => queue.shift()); };

const notes = () => ({ id: 'n', type: 'note-taking', data: { title: 'Notes', templateType: 'cornell-notes', cues: [{ id: 'c1', text: 'Cue one' }, { id: 'c2', text: 'Cue two' }], notes: [{ id: 'n1', text: 'Plants make sugar' }, { id: 'n2', text: 'Leaves hold chlorophyll' }], summary: '' } });
const noteReply = (strength, quality) => ({ strength, growthNudge: 'Add an example.', rubric: { completion: 3, quality, alignment: 4 } });
const notesLabel = () => host.querySelector('[data-notes-feedback-earlier-draft]');
const askNotes = () => act(async () => { host.querySelector('[data-help-key="notes_feedback_button"]').click(); await Promise.resolve(); });
const notesField = () => [...host.querySelectorAll('textarea')].find(el => (el.value || '') === 'Plants make sugar');

describe('Notes: feedback is kept and labelled while the learner revises', () => {
  it('keeps feedback after an edit, labels it, and marks the submission; unchanged work has no label', async () => {
    const provider = replies(noteReply('Clear sugar note', 10)), score = vi.fn();
    const get = harness(notes(), { callGemini: provider, handleScoreUpdate: score });
    await askNotes();
    expect(get().responses.n.studio.feedback.strength).toBe('Clear sugar note');
    expect(notesLabel()).toBeNull();
    expect(api.toSubmission(get().resource, get().responses.n.studio).data.feedback).toMatchObject({ strength: 'Clear sugar note', earlierDraft: false });
    await change(notesField(), 'Plants make sugar from light');
    expect(get().responses.n.studio.feedback.strength).toBe('Clear sugar note');
    expect(host.textContent).toContain('Clear sugar note');
    expect(notesLabel()?.textContent).toBe('Feedback on an earlier draft of your notes. Keep it in view while you revise, or ask for new feedback.');
    expect(notesLabel().getAttribute('role')).toBe('status');
    expect(api.toSubmission(get().resource, get().responses.n.studio).data.feedback).toMatchObject({ strength: 'Clear sugar note', earlierDraft: true });
    // Undoing the edit makes it current again.
    await change([...host.querySelectorAll('textarea')].find(el => el.value === 'Plants make sugar from light'), 'Plants make sugar');
    expect(notesLabel()).toBeNull();
  });

  it('asking again replaces the feedback; unchanged work earns no XP, a revised draft can', async () => {
    const provider = replies(noteReply('First read', 10), noteReply('Second read', 15), noteReply('Third read', 15)), score = vi.fn();
    const get = harness(notes(), { callGemini: provider, handleScoreUpdate: score });
    await askNotes();
    expect(score).toHaveBeenCalledTimes(1);
    expect(score).toHaveBeenLastCalledWith(22, 'Cornell Notes Feedback', 'n');
    expect(get().responses.n.studio.prevFeedbackScore).toBe(22);
    await askNotes();
    expect(get().responses.n.studio.feedback.strength).toBe('Second read');
    expect(score).toHaveBeenCalledTimes(1);
    expect(get().responses.n.studio.prevFeedbackScore).toBe(22);
    expect(host.textContent).not.toContain('+1 XP');
    await change(notesField(), 'Plants make sugar from light and water');
    expect(get().responses.n.studio.feedback.strength).toBe('Second read');
    await askNotes();
    expect(get().responses.n.studio.feedback.strength).toBe('Third read');
    expect(notesLabel()).toBeNull();
    expect(score).toHaveBeenCalledTimes(2);
    expect(provider).toHaveBeenCalledTimes(3);
  });

  it('a backup keeps the draft fingerprint but not the submission marker', async () => {
    const get = harness(notes(), { callGemini: replies(noteReply('Kept', 10)), handleScoreUpdate: vi.fn() });
    await askNotes();
    await change(notesField(), 'Edited');
    const r = get().resource, backup = JSON.parse(api.serializeBackup(r, get().responses.n.studio));
    expect(backup.studio.feedback.earlierDraft).toBe(true);
    const restored = api.readBackup(r, backup);
    expect(restored.feedback.strength).toBe('Kept');
    expect(restored.feedback.draftFingerprint).toMatch(/^notes-v1:/);
    expect('earlierDraft' in restored.feedback).toBe(false);
  });
});

const chart = () => ({ id: 'a', type: 'anchor-chart', data: { title: 'Water cycle', sections: [{ id: 's1', label: 'Explain', bullets: ['TEACHER ANSWER'], bulletIds: ['b1'] }], interactive: { armed: true, rubric: 'Explain evaporation' } } });
const anchorReply = (strength, suggestedXP) => ({ strength, growthNudge: 'Say why.', suggestedXP });
const anchorLabel = () => host.querySelector('[data-anchor-feedback-earlier-draft]');
const submitChart = () => act(async () => { [...host.querySelectorAll('button')].find(b => b.textContent.includes('Submit for AI feedback')).click(); await Promise.resolve(); await Promise.resolve(); });

describe('Anchor Charts: feedback is kept and labelled while the learner revises', () => {
  it('keeps feedback after an edit, labels it, and marks the submission; unchanged work has no label', async () => {
    const addXp = vi.fn(), get = harness(chart(), { callGemini: replies(anchorReply('You named evaporation.', 40)), addXp, addToast: vi.fn() });
    await change(host.querySelector('input[type="text"]'), 'Water rises as vapor');
    await submitChart();
    expect(get().responses.a.studio.feedback.strength).toBe('You named evaporation.');
    expect(anchorLabel()).toBeNull();
    expect(api.toSubmission(get().resource, get().responses.a.studio).data.feedback).toMatchObject({ strength: 'You named evaporation.', earlierDraft: false });
    await change(host.querySelector('input[type="text"]'), 'Water rises as vapor when heated');
    expect(get().responses.a.studio.feedback.strength).toBe('You named evaporation.');
    expect(host.textContent).toContain('You named evaporation.');
    expect(anchorLabel()?.textContent).toBe('Feedback on an earlier draft of your chart. Keep it in view while you revise, or submit again for new feedback.');
    expect(anchorLabel().getAttribute('role')).toBe('status');
    expect(api.toSubmission(get().resource, get().responses.a.studio).data.feedback).toMatchObject({ strength: 'You named evaporation.', earlierDraft: true });
  });

  it('asking again replaces the feedback; unchanged answers earn no XP, revised answers earn only the gain', async () => {
    const addXp = vi.fn(), provider = replies(anchorReply('First', 40), anchorReply('Second', 90), anchorReply('Third', 70));
    const get = harness(chart(), { callGemini: provider, addXp, addToast: vi.fn() });
    await change(host.querySelector('input[type="text"]'), 'Water rises');
    await submitChart();
    expect(addXp.mock.calls).toEqual([[40]]);
    await submitChart();
    expect(get().responses.a.studio.feedback).toMatchObject({ strength: 'Second', xpAwarded: 0 });
    expect(addXp.mock.calls).toEqual([[40]]);
    expect(get().responses.a.studio.prevFeedbackScore).toBe(40);
    await change(host.querySelector('input[type="text"]'), 'Water rises as vapor');
    await submitChart();
    expect(get().responses.a.studio.feedback.strength).toBe('Third');
    expect(anchorLabel()).toBeNull();
    expect(addXp.mock.calls).toEqual([[40], [30]]);
  });

  it('a failed request leaves the kept feedback in place', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    let call = 0;
    const provider = vi.fn(async () => { call++; if (call === 1) return JSON.stringify(anchorReply('Kept feedback', 40)); throw new Error('offline'); });
    const get = harness(chart(), { callGemini: provider, addXp: vi.fn(), addToast: vi.fn() });
    await change(host.querySelector('input[type="text"]'), 'Water rises');
    await submitChart();
    await change(host.querySelector('input[type="text"]'), 'Water rises as vapor');
    await submitChart();
    expect(host.querySelector('[role="alert"]')).not.toBeNull();
    expect(get().responses.a.studio.feedback.strength).toBe('Kept feedback');
    expect(anchorLabel()).not.toBeNull();
  });

  it('reads older saves: the raw-answers fingerprint counts as current, a missing one as earlier', () => {
    const r = chart(), studentAnswers = { s1: { b1: 'Water rises' } };
    const legacy = { strength: 'Old', growthNudge: 'Older', draftFingerprint: JSON.stringify(studentAnswers) };
    expect(api.toSubmission(r, { schemaVersion: 1, studentAnswers, feedback: legacy }).data.feedback.earlierDraft).toBe(false);
    expect(api.toSubmission(r, { schemaVersion: 1, studentAnswers: { s1: { b1: 'Changed' } }, feedback: legacy }).data.feedback.earlierDraft).toBe(true);
    expect(api.toSubmission(r, { schemaVersion: 1, studentAnswers, feedback: { strength: 'Unknown draft', growthNudge: 'x' } }).data.feedback.earlierDraft).toBe(true);
    expect(api.toSubmission(r, { schemaVersion: 1, studentAnswers, feedback: null }).data.feedback).toBeNull();
  });
});
