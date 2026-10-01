
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host, DbqView, TimelineView;
const t = key => ({ 'ui_common.completed': 'Completed', 'common.reset': 'Reset' }[key] || '');
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
beforeAll(() => {
  window.React = globalThis.React = React;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_dbq_module.js');
  loadAlloModule('view_timeline_module.js');
  DbqView = window.AlloModules.DbqView;
  TimelineView = window.AlloModules.TimelineView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.callGeminiVision;
  vi.restoreAllMocks();
});
function render(Component, props) {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  act(() => root.render(React.createElement(Component, props)));
}
function button(text) {
  const found = [...host.querySelectorAll('button')].find(node => node.textContent.includes(text));
  expect(found, 'Expected button ' + text).toBeTruthy();
  return found;
}
const modes = [
  { name: 'source reliability', tab: 'documents', button: 'Compare My Assessment', key: '_reliabilityAI_A', answer: '_reliability_A', changed: { reasoning: 'A revised reliability judgement.' }, result: { reliabilityRating: 'somewhat reliable', reasoning: 'Review the evidence.' } },
  { name: 'document analysis', tab: 'documents', button: 'Check My Analysis', key: '_docFeedback_A', answer: 'doc-A-sourcing-0', changed: 'A revised source analysis.', result: { overallRating: 'proficient', modelResponse: 'Use the date and context.' } },
  { name: 'corroboration', tab: 'corroboration', button: 'Check My Corroboration', key: '_corrobFeedback', answer: '_corrobNotes', changed: { 0: 'Sources now disagree.' }, result: { overallRating: 'proficient', modelCorroboration: 'Compare both accounts.' } },
  { name: 'essay', tab: 'essay', button: 'Get AI Feedback', key: '_aiFeedback', answer: '_essayText', changed: 'A revised essay with different reasoning.', result: { overallScore: 3, strengths: ['Specific evidence.'] } },
  { name: 'vocabulary', tab: 'documents', button: 'Vocab Help', key: '_docVocab_A', answer: null, result: [{ word: 'source', definition: 'Where evidence comes from.' }] }
];
function fixture(mode = modes[3]) {
  const state = {
    generatedContent: { id: 'dbq-one', type: 'dbq', data: { title: 'Evidence', documents: [{ id: 'A', title: 'Source A', excerpt: 'A first-hand source from the town.', sourcingQuestions: ['Who wrote it?'], analysisQuestions: [] }], corroborationClaims: [{ claim: 'The sources agree.' }], synthesisPrompt: 'Explain using evidence.', rubric: [] } },
    responses: { _dbqTab: mode.tab, _essayText: 'Document A describes the town and supports my argument.', _reliability_A: { reasoning: 'It was written by a witness.' }, 'doc-A-sourcing-0': 'The witness wrote it.', _corrobNotes: { 0: 'Both sources discuss the town.' } },
    feedbackScopeKey: 'learner-one',
    callGemini: vi.fn()
  };
  const onInput = vi.fn((id, key, value) => { state.responses = { ...state.responses, [key]: value }; refresh(); });
  const onScore = vi.fn();
  const refresh = () => render(DbqView, { ...state, studentResponses: { [state.generatedContent.id]: state.responses }, handleStudentInput: onInput, handleScoreUpdate: onScore, cleanJson: value => value, t, gradeLevel: '8th Grade', addToast: vi.fn() });
  refresh();
  return { state, onInput, onScore, refresh };
}
describe('DBQ revision ownership and recovery', () => {
  it.each(modes)('$name never persists a loading marker and deduplicates rapid clicks', async mode => {
    const request = deferred(), f = fixture(mode); f.state.callGemini.mockReturnValue(request.promise); f.refresh();
    act(() => { button(mode.button).click(); button(mode.button).click(); });
    expect(f.state.callGemini).toHaveBeenCalledTimes(1);
    expect(f.onInput).not.toHaveBeenCalled();
    await act(async () => request.resolve(JSON.stringify(mode.result)));
    expect(f.state.responses[mode.key]).toEqual(mode.result);
    expect(f.state.responses._dbqFeedbackInputs[mode.key]).toBeTypeOf('string');
  });
  it.each(modes)('$name rejects a result after its answer or source is revised', async mode => {
    const request = deferred(), f = fixture(mode); f.state.callGemini.mockReturnValue(request.promise); f.refresh();
    act(() => button(mode.button).click());
    if (mode.answer) f.state.responses = { ...f.state.responses, [mode.answer]: mode.changed };
    else f.state.generatedContent = { ...f.state.generatedContent, data: { ...f.state.generatedContent.data, title: 'A revised source investigation' } };
    f.refresh();
    await act(async () => request.resolve(JSON.stringify(mode.result)));
    expect(f.onInput).not.toHaveBeenCalled();
    expect(f.onScore).not.toHaveBeenCalled();
    expect(button(mode.button).disabled).toBe(false);
  });
  it.each(['resource', 'learner', 'AI access', 'unmount'])('ignores pending essay feedback after changing %s', async change => {
    const request = deferred(), f = fixture(); f.state.callGemini.mockReturnValue(request.promise); f.refresh();
    act(() => button('Get AI Feedback').click());
    if (change === 'resource') f.state.generatedContent = { ...f.state.generatedContent, id: 'dbq-two' };
    if (change === 'learner') f.state.feedbackScopeKey = 'learner-two';
    if (change === 'AI access') f.state.callGemini = null;
    if (change === 'unmount') act(() => root.render(React.createElement('p', null, 'Closed')));
    else f.refresh();
    await act(async () => request.resolve(JSON.stringify({ overallScore: 4 })));
    expect(f.onInput).not.toHaveBeenCalled();
    expect(f.onScore).not.toHaveBeenCalled();
  });
  it('allows source reliability to be retried after an error', async () => {
    const f = fixture(modes[0]); f.state.callGemini.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(JSON.stringify(modes[0].result)); f.refresh();
    await act(async () => button('Compare My Assessment').click());
    expect(host.textContent).toContain('Could not analyze. Try again.');
    expect(button('Compare My Assessment').disabled).toBe(false);
    await act(async () => button('Compare My Assessment').click());
    expect(f.state.responses._reliabilityAI_A).toEqual(modes[0].result);
    expect(f.onScore).toHaveBeenCalledTimes(1);
  });
  it('marks completed feedback stale after editing and supports a new check', async () => {
    const f = fixture(); f.state.callGemini.mockResolvedValue(JSON.stringify({ overallScore: 3, strengths: ['Unique old feedback.'] })); f.refresh();
    await act(async () => button('Get AI Feedback').click());
    expect(host.textContent).toContain('Unique old feedback.');
    f.state.responses = { ...f.state.responses, _essayText: 'A completely revised argument.' }; f.refresh();
    expect(host.textContent).not.toContain('Unique old feedback.');
    expect(host.textContent).toContain('Your work or source changed.');
    await act(async () => button('Get AI Feedback').click());
    expect(f.state.callGemini).toHaveBeenCalledTimes(2);
  });
  it.each([null, [], { overallScore: 400 }, { overallScore: 3, strengths: 'not a list' }])('rejects malformed essay feedback without awarding points: %j', async result => {
    const f = fixture(); f.state.callGemini.mockResolvedValue(JSON.stringify(result)); f.refresh();
    await act(async () => button('Get AI Feedback').click());
    expect(host.textContent).toContain('Could not generate feedback. Try again.');
    expect(f.onScore).not.toHaveBeenCalled();
  });
  it('recovers obsolete persisted loading flags', async () => {
    const f = fixture(modes[0]); f.state.responses._reliabilityAI_A = 'loading'; f.state.callGemini.mockResolvedValue(JSON.stringify(modes[0].result)); f.refresh();
    expect(button('Compare My Assessment').disabled).toBe(false);
    await act(async () => button('Compare My Assessment').click());
    expect(f.state.responses._reliabilityAI_A).toEqual(modes[0].result);
  });
  it('keeps ordinary work available while feedback controls are disabled', () => {
    const f = fixture(); f.state.callGemini = null; f.refresh();
    expect(button('Get AI Feedback').disabled).toBe(true);
    expect(host.querySelector('textarea[aria-label="Synthesis essay"]').disabled).toBe(false);
    expect(host.textContent).toContain('AI feedback is unavailable in this session.');
  });
  it('accepts numeric document identifiers in the essay evidence tracker', () => {
    const f = fixture(); f.state.generatedContent.data.documents[0].id = 1;
    expect(() => f.refresh()).not.toThrow();
    expect(host.textContent).toContain('Doc 1');
  });
  it('uses named native rubric buttons, preserves selection, and excludes obsolete scores from the average', () => {
    const f = fixture();
    f.state.generatedContent.data.rubric = [{ criteria: 'Evidence', 1: 'Beginning evidence', 2: 'Developing evidence', 3: 'Proficient evidence', 4: 'Advanced evidence' }, { criteria: 'Reasoning', 1: 'Beginning reasoning', 2: 'Developing reasoning', 3: 'Proficient reasoning', 4: 'Advanced reasoning' }];
    f.state.responses = { _dbqTab: 'rubric', _selfScores: { Evidence: 3, Deleted: '99', Reasoning: 'invalid' } }; f.refresh();
    const selected = host.querySelector('button[aria-label="Evidence: 3 — Proficient"]');
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(host.querySelector('th[scope="row"]').textContent).toBe('Evidence');
    expect(host.textContent).not.toContain('Deleted');
    expect(host.textContent).not.toContain('NaN');
    expect(host.textContent).not.toContain('AVERAGE');
    const next = host.querySelector('button[aria-label="Reasoning: 4 — Advanced"]');
    act(() => { next.focus(); next.click(); });
    expect(document.activeElement).toBe(next);
    expect(next.getAttribute('aria-pressed')).toBe('true');
    expect(f.state.responses._selfScores.Reasoning).toBe('4');
    expect(host.textContent).toContain('3.5/4');
  });
  it('offers corroboration feedback for an agree/disagree-only comparison', () => {
    const f = fixture(modes[2]); f.state.generatedContent.data.corroborationClaims = []; f.state.responses = { _dbqTab: 'corroboration', 'corrob-agree-A': 'Agrees with B.' }; f.refresh();
    expect(button('Check My Corroboration')).toBeTruthy();
  });
});
function timelineFixture() {
  const request = deferred();
  const state = { generatedContent: { id: 'sequence-one', type: 'timeline', data: { items: [{ id: 'first', date: '1', event: 'First event', image: 'data:image/png;base64,AAAA' }, { id: 'second', date: '2', event: 'Second event', image: 'data:image/png;base64,BBBB' }] } }, leveledTextLanguage: 'English' };
  window.callGeminiVision = vi.fn();
  window.AlloModules.AltText = { hashImage: value => 'hash:' + value, draftAlts: vi.fn(() => request.promise) };
  window.AlloModules.ImageAltField = props => React.createElement('button', { type: 'button', 'data-alt-id': props.id, onClick: props.onRegenerate, disabled: props.busy }, 'Describe ' + props.id);
  const change = vi.fn();
  const refresh = () => render(TimelineView, { ...state, t, isTeacherMode: true, isEditingTimeline: true, dismissedVerifications: new Set(), isGeneratingTimelineImage: {}, timelineRefinementInputs: {}, TIMELINE_MODE_DEFINITIONS: {}, timelineImageSize: 150, initialImageSize: 150, handleTimelineChange: change });
  refresh();
  return { state, request, refresh, change };
}
describe('Sequence picture-description ownership', () => {
  it.each(['navigation', 'reorder', 'manual description', 'picture replacement', 'language'])('preserves the current sequence after %s while description generation is pending', async change => {
    const f = timelineFixture();
    act(() => button('Describe timeline-alt-0').click());
    if (change === 'navigation') f.state.generatedContent = { ...f.state.generatedContent, id: 'sequence-two' };
    else if (change === 'language') f.state.leveledTextLanguage = 'Spanish';
    else {
      const items = [...f.state.generatedContent.data.items];
      if (change === 'reorder') items.reverse();
      else items[0] = { ...items[0], ...(change === 'manual description' ? { alt: 'My description', altSource: 'author' } : { image: 'new-picture' }) };
      f.state.generatedContent = { ...f.state.generatedContent, data: { items } };
    }
    f.refresh();
    await act(async () => f.request.resolve([{ alt: 'A model description', source: 'vision' }]));
    expect(f.change).not.toHaveBeenCalled();
  });
  it('updates a current picture and announces the result once', async () => {
    const f = timelineFixture();
    act(() => { button('Describe timeline-alt-0').click(); button('Describe timeline-alt-0').click(); });
    expect(window.AlloModules.AltText.draftAlts).toHaveBeenCalledTimes(1);
    await act(async () => f.request.resolve([{ alt: 'An accessible description', source: 'vision' }]));
    expect(f.change).toHaveBeenCalledWith(0, expect.objectContaining({ alt: 'An accessible description' }));
    expect([...host.querySelectorAll('[role=status]')].filter(node => node.textContent === 'Picture description updated.')).toHaveLength(1);
  });
  it('shows a retryable description error without an unhandled rejection', async () => {
    const f = timelineFixture();
    act(() => button('Describe timeline-alt-0').click());
    await act(async () => f.request.reject(new Error('offline')));
    expect(host.textContent).toContain('Could not generate a picture description. Try again.');
    expect(button('Describe timeline-alt-0').disabled).toBe(false);
  });
});

