// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const sibling = Object.freeze({ fieldNote: 'Keep the ecology evidence.', revision: 9 });
const reference = Object.freeze({ expSection: null, savedReferenceNote: 'Keep the inheritance reasoning.' });
const evidence = Object.freeze({ observations: Object.freeze(['Compare the coding and protein evidence.']) });
const history = Object.freeze([Object.freeze({ id: 'saved-control', label: 'Control', dnaSequence: 'ATGAAATAA', mutationLog: [] })]);
const easy = Object.freeze({ type: 'static', question: 'How many strands does DNA have?', answer: '2', hint: 'Think "double" helix' });
const alternative = Object.freeze({ type: 'static', question: 'A mutation that does NOT change the amino acid?', answer: 'Silent,Synonymous', hint: 'Also called synonymous' });
const generated = Object.freeze({ question: 'What molecule carries the genetic message?', answer: 'mRNA,Messenger RNA', hint: 'The RNA message.' });
let config, host, root, outside, latest, updateStore, changes, xp, announce, provider, tts, imagen, actDescriptor;
const query = selector => host.querySelector(selector);
const workspace = () => query('[data-dna-quiz="challenge"]');
const answer = () => query('#dna-challenge-answer');
const check = () => query('#dna-challenge-check');
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  const copy = element.cloneNode(true); copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove()); return copy.textContent.replace(/\s+/g, ' ').trim();
}
function initial(patch = {}) {
  return { ecology: sibling, dna: reference, dnaLab: {
    tab: 'challenge', visitedTabs: { challenge: true }, dnaFocusMode: false, dnaGradeOverride: '9-12',
    dnaSequence: 'ATGAAATAA', dnaReportNote: 'Keep my uncertainty reflection.', learningEvidence: evidence, dnaExperimentHistory: history,
    dnaEvidenceClaim: 'Compare codons before explaining the protein.', dnaEvidenceScore: 2,
    challengeTier: 0, challengeQ: null, challengeAnswer: '', challengeFeedback: '', challengeStreak: 0, score: 20, aiChallengeLoading: false,
    ...patch
  } };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce,
    callGemini: provider, callTTS: tts, callImagen: imagen }));
}
async function mount(patch = {}, withAI = false) {
  provider = withAI ? vi.fn() : null; outside.focus(); await act(async () => { root.render(h(Host, { seed: initial(patch) })); });
}
async function patch(values) { await act(async () => { updateStore(prev => ({ ...prev, dnaLab: { ...prev.dnaLab, ...values } })); }); }
async function activate(element, focus = true) {
  expect(element).not.toBeNull(); expect(element).toBeDefined(); if (focus) element.focus(); await act(async () => { element.click(); });
}
async function input(value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(answer(), value);
    answer().dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function key(options = {}) {
  const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true, ...options });
  await act(async () => { answer().dispatchEvent(event); }); return event;
}
function deferred() {
  let resolve, reject; const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; }); return { promise, resolve, reject };
}
async function settle(request, value, reject = false) {
  await act(async () => { request[reject ? 'reject' : 'resolve'](value); await Promise.resolve(); await Promise.resolve(); });
}
function status() {
  const node = query('#dna-challenge-status'); expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status');
  expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true'); return node;
}
function preserved() {
  expect(latest.ecology).toBe(sibling); expect(latest.dna).toBe(reference); expect(latest.dnaLab.learningEvidence).toBe(evidence);
  expect(latest.dnaLab.dnaExperimentHistory).toBe(history); expect(latest.dnaLab.dnaSequence).toBe('ATGAAATAA');
  expect(latest.dnaLab.dnaReportNote).toBe('Keep my uncertainty reflection.');
  expect(latest.dnaLab.dnaEvidenceClaim).toBe('Compare codons before explaining the protein.'); expect(latest.dnaLab.dnaEvidenceScore).toBe(2);
  expect(tts).not.toHaveBeenCalled(); expect(imagen).not.toHaveBeenCalled();
}
function expectUnchanged(before) { expect(latest).toBe(before); expect(latest.dnaLab).toBe(before.dnaLab); preserved(); }
function expectNativeGuard(button, guarded) {
  expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false);
  expect(button.getAttribute('aria-disabled')).toBe(String(guarded));
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); tts = vi.fn(); imagen = vi.fn(); provider = null;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('DNA Challenge accessible questions and deliberate navigation', () => {
  it('starts quietly, labels the answer from visible content and keeps one persistent polite result node', async () => {
    await mount(); expect(workspace()).not.toBeNull(); expect(document.activeElement).toBe(outside); expect(changes).not.toHaveBeenCalled();
    const live = status(); expect(live.textContent).toBe(''); vi.spyOn(Math, 'random').mockReturnValue(0); await activate(query('#dna-challenge-start'));
    const question = query('#dna-challenge-question'); expect(question.tagName).toBe('H3'); expect(question.tabIndex).toBe(-1); expect(question.textContent).toBe(easy.question);
    expect(document.activeElement).toBe(question); expect(query('#dna-challenge-status')).toBe(live); expect(answer().tagName).toBe('INPUT'); expect(answer().type).toBe('text');
    expect(answer().labels).toHaveLength(1); expect(answer().labels[0].textContent.trim()).toBe('Your answer'); expect(answer().labels[0].className).not.toContain('sr-only');
    const descriptions = answer().getAttribute('aria-describedby').split(/\s+/); expect(descriptions).toContain(question.id);
    expect(descriptions.some(id => id !== question.id && document.getElementById(id)?.textContent.trim().length > 0)).toBe(true);
    expectNativeGuard(check(), true); expect(answer().readOnly).toBe(false); expect(workspace().querySelector('[role="alert"]')).toBeNull(); preserved();
  });

  it('exposes next-question difficulty without replacing an active question and retains each scientific bank tier', async () => {
    await mount(); vi.spyOn(Math, 'random').mockReturnValue(0);
    const hard = query('[data-dna-challenge-tier="2"]'), group = hard.closest('[role="group"]'); expect(nameOf(group)).toBe('Difficulty for next question');
    await activate(hard); expect(hard.getAttribute('aria-pressed')).toBe('true'); await activate(query('#dna-challenge-start'));
    expect(latest.dnaLab.challengeQ).toMatchObject({ type: 'static', question: 'Name the enzyme that joins Okazaki fragments.', answer: 'Ligase' });
    for (const [tier, expected] of [[1, { question: 'What enzyme unwinds DNA during replication?', answer: 'Helicase' }], [0, easy]]) {
      const current = latest.dnaLab.challengeQ; await input('Keep my draft until Next.'); await activate(query(`[data-dna-challenge-tier="${tier}"]`));
      expect(latest.dnaLab.challengeQ).toBe(current); expect(answer().value).toBe('Keep my draft until Next.');
      for (let i = 0; i < 3; i++) expect(query(`[data-dna-challenge-tier="${i}"]`).getAttribute('aria-pressed')).toBe(String(i === tier));
      await activate(query('#dna-challenge-next')); expect(latest.dnaLab.challengeQ).toMatchObject(expected); expect(answer().value).toBe(''); expect(document.activeElement).toBe(query('#dna-challenge-question'));
    }
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('moves focus on explicit Start and Next while leaving programmatic generation quiet', async () => {
    await mount(); vi.spyOn(Math, 'random').mockReturnValue(0); await activate(query('#dna-challenge-start'), false);
    expect(document.activeElement).toBe(outside); await activate(query('#dna-challenge-next')); expect(document.activeElement).toBe(query('#dna-challenge-question'));
    outside.focus(); await activate(query('#dna-challenge-next'), false); expect(document.activeElement).toBe(outside); expect(xp).not.toHaveBeenCalled(); preserved();
  });
});

describe('DNA Challenge answer checking and original rewards', () => {
  it('accepts exact trimmed case-insensitive comma alternatives without accepting partial terms', async () => {
    await mount({ challengeQ: alternative }); await input('syn'); await activate(check()); expect(latest.dnaLab.score).toBe(20); expect(xp).not.toHaveBeenCalled();
    await input('  sYnOnYmOuS  '); await activate(check()); expect(latest.dnaLab.challengeSolved).toBe(true); expect(latest.dnaLab.score).toBe(30); expect(latest.dnaLab.challengeStreak).toBe(1);
    expect(xp.mock.calls).toEqual([['dnaLab', 10, 'Challenge correct']]); expect(status().textContent).toMatch(/Correct/i); preserved();
  });

  it('allows wrong-answer revision and Hint through one status without duplicate screen-reader announcements', async () => {
    await mount({ challengeQ: easy, challengeStreak: 2 }); const live = status(); await input('3'); await activate(check());
    expect(latest.dnaLab.challengeSolved).not.toBe(true); expect(latest.dnaLab.challengeStreak).toBe(0); expect(answer().readOnly).toBe(false); expect(live.textContent).toContain('2');
    await activate(query('#dna-challenge-hint')); expect(query('#dna-challenge-status')).toBe(live); expect(live.textContent).toContain(easy.hint); expect(xp).not.toHaveBeenCalled();
    await input('2'); await activate(check()); expect(latest.dnaLab.score).toBe(30); expect(latest.dnaLab.challengeStreak).toBe(1); expect(answer().readOnly).toBe(true);
    expect(live.textContent).toMatch(/Correct/i); expect(announce).not.toHaveBeenCalled(); expect(workspace().querySelector('[role="alert"]')).toBeNull(); preserved();
  });

  it('preserves the fifth-answer streak bonus, quiz and streak badges and ten-XP award', async () => {
    await mount({ challengeQ: easy, challengeAnswer: '2', challengeStreak: 4, score: 45, badges: {} }); await activate(check());
    expect(latest.dnaLab.score).toBe(60); expect(latest.dnaLab.challengeStreak).toBe(5); expect(status().textContent).toContain('+5');
    expect(latest.dnaLab.badges.quizWhiz).toBe(true); expect(latest.dnaLab.badges.streakMaster).toBe(true);
    expect(xp.mock.calls).toEqual([['dnaLab', 10, 'Challenge correct']]); preserved();
  });

  it('awards a generated question once under same-turn Enter/Check and later repeated activation', async () => {
    await mount({ challengeQ: easy, challengeAnswer: '2' }); answer().focus(); const button = check();
    await act(async () => { answer().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); button.click(); button.click(); });
    expect(latest.dnaLab.score).toBe(30); expect(latest.dnaLab.challengeStreak).toBe(1); expect(xp.mock.calls).toEqual([['dnaLab', 10, 'Challenge correct']]);
    const before = latest, text = status().textContent; await activate(button); await key(); expectUnchanged(before); expect(status().textContent).toBe(text); expectNativeGuard(check(), true);
    vi.spyOn(Math, 'random').mockReturnValue(0); await activate(query('#dna-challenge-next')); expect(latest.dnaLab.challengeSolved).toBe(false); expect(answer().readOnly).toBe(false);
    await input('2'); await activate(check()); expect(latest.dnaLab.score).toBe(40); expect(xp).toHaveBeenCalledTimes(2); preserved();
  });

  it('honors saved solved progress and infers older successful feedback when the flag is absent', async () => {
    await mount({ challengeQ: easy, challengeAnswer: '2', challengeFeedback: '✅ Correct!', score: 30, challengeStreak: 1 });
    expect(answer().readOnly).toBe(true); expectNativeGuard(check(), true); const before = latest; await activate(check()); await key(); expectUnchanged(before); expect(xp).not.toHaveBeenCalled();
    await patch({ challengeSolved: true, challengeFeedback: '💡 Think double helix.' }); expect(answer().readOnly).toBe(true); const saved = latest;
    await activate(check()); expectUnchanged(saved); expect(latest.dnaLab.score).toBe(30); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('ignores held Enter and IME composition, prevents default on a deliberate Enter and guards whitespace', async () => {
    await mount({ challengeQ: easy, challengeAnswer: '2' });
    for (const options of [{ repeat: true }, { isComposing: true }, { keyCode: 229 }]) { const before = latest; await key(options); expectUnchanged(before); }
    expect(xp).not.toHaveBeenCalled(); await input('   '); const blank = latest; expectNativeGuard(check(), true); await activate(check()); await key(); expectUnchanged(blank);
    await input('2'); const event = await key(); expect(event.defaultPrevented).toBe(true); expect(latest.dnaLab.score).toBe(30); expect(xp).toHaveBeenCalledTimes(1); preserved();
  });
});

describe('DNA Challenge owned AI generation and cancellation', () => {
  it('keeps native request focus during loading and Stop cancels local waiting without applying a late response', async () => {
    await mount({}, true); const request = deferred(); provider.mockReturnValueOnce(request.promise); const trigger = query('#dna-challenge-ai-start'); await activate(trigger);
    expect(latest.dnaLab.aiChallengeLoading).toBe(true); expectNativeGuard(trigger, true); expect(document.activeElement).toBe(trigger); expect(nameOf(trigger)).toContain(trigger.textContent.trim());
    await activate(query('#dna-challenge-ai-stop')); expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(document.activeElement).toBe(trigger);
    const before = latest; await settle(request, JSON.stringify(generated)); expectUnchanged(before); expect(latest.dnaLab.challengeQ).toBeNull(); expect(document.activeElement).toBe(trigger); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('makes the old answer read-only while waiting and focuses a valid owned AI question when its trigger still owns focus', async () => {
    await mount({ challengeQ: easy, challengeAnswer: 'Keep this old draft.' }, true); const request = deferred(); provider.mockReturnValueOnce(request.promise);
    const trigger = query('#dna-challenge-ai-next'); await activate(trigger); expect(answer().readOnly).toBe(true); expectNativeGuard(check(), true); expectNativeGuard(trigger, true);
    const before = latest; await activate(check(), false); expectUnchanged(before); expect(provider).toHaveBeenCalledTimes(1);
    expect(provider.mock.calls[0].slice(1)).toEqual([true, false, 0.7]); expect(provider.mock.calls[0][0]).toMatch(/genetics.*quiz question/i);
    trigger.focus(); await settle(request, '```json\n' + JSON.stringify(generated) + '\n```');
    expect(latest.dnaLab.challengeQ).toMatchObject({ type: 'ai', question: generated.question, answer: generated.answer, hint: generated.hint, isAI: true });
    expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(latest.dnaLab.challengeSolved).toBe(false); expect(answer().value).toBe(''); expect(answer().readOnly).toBe(false);
    expect(document.activeElement).toBe(query('#dna-challenge-question')); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('updates a valid AI question quietly when the learner has moved focus elsewhere', async () => {
    await mount({ challengeQ: easy }, true); const request = deferred(); provider.mockReturnValueOnce(request.promise); await activate(query('#dna-challenge-ai-next')); outside.focus();
    await settle(request, JSON.stringify(generated)); expect(latest.dnaLab.challengeQ.question).toBe(generated.question); expect(document.activeElement).toBe(outside); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('lets static Next take ownership and prevents its question, loading and focus from being overwritten', async () => {
    await mount({ challengeQ: easy }, true); vi.spyOn(Math, 'random').mockReturnValue(0); const request = deferred(); provider.mockReturnValueOnce(request.promise);
    await activate(query('#dna-challenge-ai-next')); await activate(query('#dna-challenge-next')); const before = latest, focused = document.activeElement;
    expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(latest.dnaLab.challengeQ).toMatchObject(easy); await settle(request, JSON.stringify(generated));
    expectUnchanged(before); expect(document.activeElement).toBe(focused); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('invalidates pending requests when next-question difficulty changes or the learner leaves the activity', async () => {
    await mount({}, true); const first = deferred(), second = deferred(); provider.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await activate(query('#dna-challenge-ai-start')); const hard = query('[data-dna-challenge-tier="2"]'); await activate(hard);
    expect(latest.dnaLab.challengeTier).toBe(2); expect(latest.dnaLab.aiChallengeLoading).toBe(false); const afterTier = latest;
    await settle(first, JSON.stringify(generated)); expectUnchanged(afterTier); expect(document.activeElement).toBe(hard);
    await activate(query('#dna-challenge-ai-start')); await patch({ tab: 'learn' }); outside.focus(); const afterLeave = latest;
    expect(latest.dnaLab.aiChallengeLoading).toBe(false); await settle(second, JSON.stringify(generated)); expectUnchanged(afterLeave); expect(document.activeElement).toBe(outside);
    await patch({ tab: 'challenge' }); expect(latest.dnaLab.challengeQ).toBeNull(); expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('keeps a newer request loading when an older canceled request resolves first', async () => {
    await mount({}, true); const first = deferred(), second = deferred(); provider.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    await activate(query('#dna-challenge-ai-start')); await activate(query('#dna-challenge-ai-stop')); await activate(query('#dna-challenge-ai-start'));
    const current = latest; await settle(first, JSON.stringify({ question: 'Obsolete question', answer: 'old' })); expectUnchanged(current); expect(latest.dnaLab.aiChallengeLoading).toBe(true);
    await settle(second, JSON.stringify(generated)); expect(latest.dnaLab.challengeQ.question).toBe(generated.question); expect(latest.dnaLab.aiChallengeLoading).toBe(false);
    expect(provider).toHaveBeenCalledTimes(2); expect(document.activeElement).toBe(query('#dna-challenge-question')); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('accepts a plain valid response and safely falls back for malformed fields, synchronous throws and rejection', async () => {
    await mount({}, true); vi.spyOn(Math, 'random').mockReturnValue(0); provider.mockReturnValueOnce(JSON.stringify({ question: generated.question, answer: generated.answer }));
    await activate(query('#dna-challenge-ai-start')); expect(latest.dnaLab.challengeQ).toMatchObject({ question: generated.question, answer: generated.answer, hint: '' });
    const failures = [() => JSON.stringify({ question: {}, answer: '2' }), () => JSON.stringify({ question: 'A question', answer: 2 }),
      () => JSON.stringify({ question: generated.question, answer: generated.answer, hint: { text: 'Invalid hint object' } }),
      () => JSON.stringify({ question: ' ', answer: ' ' }), () => { throw new Error('Provider unavailable'); }, () => Promise.reject(new Error('Provider rejected'))];
    for (const response of failures) {
      provider.mockImplementationOnce(response); await activate(query('#dna-challenge-ai-next'));
      expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(latest.dnaLab.challengeQ).toMatchObject(easy); expect(latest.dnaLab.challengeSolved).toBe(false);
      expect(answer().value).toBe(''); expect(answer().readOnly).toBe(false); expect(latest.dnaLab.score).toBe(20);
    }
    expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('recovers saved orphan loading without contacting a provider or deleting the current question', async () => {
    await mount({ challengeQ: easy, challengeAnswer: 'Keep this answer.', aiChallengeLoading: true }, true);
    expect(provider).not.toHaveBeenCalled(); expect(latest.dnaLab.aiChallengeLoading).toBe(false); expect(latest.dnaLab.challengeQ).toBe(easy); expect(answer().value).toBe('Keep this answer.');
    expect(answer().readOnly).toBe(false); expect(document.activeElement).toBe(outside); expect(xp).not.toHaveBeenCalled(); preserved();
  });

  it('does not apply an AI response or steal host focus after the tool unmounts', async () => {
    await mount({ challengeQ: easy }, true); const request = deferred(); provider.mockReturnValueOnce(request.promise); await activate(query('#dna-challenge-ai-next'));
    const before = latest; await act(async () => { root.unmount(); }); root = null; outside.focus();
    await settle(request, JSON.stringify(generated)); expect(latest).toBe(before); expect(document.activeElement).toBe(outside); expect(host.childElementCount).toBe(0);
    expect(xp).not.toHaveBeenCalled(); preserved();
  });
});
