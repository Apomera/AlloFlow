// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement;
const act = React.act;
const evidence = Object.freeze({ prediction: 'Compare the parents first', observations: Object.freeze(['Keep this explanation']) });
const siblingDraft = Object.freeze({ draft: 'An unfinished ecology investigation', revision: 7 });
let config, banks, host, root, outside, latest, setStore, changes, xp, toast, audio, ai, actDescriptor;

const query = selector => host.querySelector(selector);
const section = mode => query(`[data-punnett-${mode}]`);
const question = mode => query(`#punnett-${mode}-question`);
const status = mode => query(`#punnett-${mode}-feedback`);
const answers = mode => [...section(mode).querySelectorAll('[data-punnett-answer]')];
const next = mode => query(`[data-punnett-${mode}-continue]`);
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').trim();
  return element.textContent.trim();
}
function buttonNamed(mode, text) {
  return [...section(mode).querySelectorAll('button')].find(button => nameOf(button).includes(text));
}
function difficulty(text) {
  return [...section('challenge').querySelectorAll('[role="group"] button')]
    .find(button => nameOf(button).includes(text));
}
function bank(mode) {
  return mode === 'challenge' ? banks.CHALLENGE_QS[latest.punnett._chalDiff] : banks.BATTLE_QS;
}
function current(mode) {
  return bank(mode)[latest.punnett[mode === 'challenge' ? '_chalIdx' : '_battleRound']];
}
function answer(mode, correct = true) {
  const item = current(mode);
  const index = correct ? item.correct : (item.correct + 1) % item.a.length;
  return section(mode).querySelector(`[data-punnett-answer="${index}"]`);
}
function xpCalls(id) { return xp.mock.calls.filter(call => call[0] === id); }
function expectEvidencePreserved() {
  expect(latest.siblingTool).toBe(siblingDraft);
  expect(latest.punnett.learningEvidence).toBe(evidence);
  expect(evidence.observations).toEqual(['Keep this explanation']);
  expect(latest.punnett.parent1).toEqual(['A', 'a']);
  expect(latest.punnett.parent2).toEqual(['a', 'a']);
  for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function initial(mode, patch = {}) {
  return {
    siblingTool: siblingDraft,
    punnett: {
      subtool: mode, _visited: { challenge: true, battle: true },
      _chalDiff: 'easy', _chalIdx: 0, _chalScore: 0, _chalStreak: 0, _chalFeedback: null, _chalTotalScore: 2,
      _battleActive: false, _battleRound: 0, _battleHP: 100, _battleEnemyHP: 100,
      _battleFeedback: null, _battleScore: 0, _battleResult: null,
      researchPoints: 17, _studiedVocab: {}, learningEvidence: evidence,
      parent1: ['A', 'a'], parent2: ['a', 'a'], ...patch
    }
  };
}
function Host({ seed }) {
  const [store, update] = React.useState(seed);
  latest = store; setStore = update;
  const setToolData = React.useCallback(arg => {
    changes(arg);
    update(prev => typeof arg === 'function' ? arg(prev) : arg);
  }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, addToast: toast,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(mode = 'challenge', patch = {}) {
  outside.focus();
  await act(async () => { root.render(h(Host, { seed: initial(mode, patch) })); });
}
async function commit(patch) {
  await act(async () => { setStore(prev => ({ ...prev, punnett: { ...prev.punnett, ...patch } })); });
}
async function activate(element) {
  expect(element).toBeDefined(); expect(element).not.toBeNull();
  element.focus();
  await act(async () => { element.click(); });
}
async function repeatClicks(...elements) {
  for (const element of elements) { expect(element).toBeDefined(); expect(element).not.toBeNull(); }
  elements[0].focus();
  await act(async () => { for (const element of elements) element.click(); });
}
async function advance(milliseconds = 30000) {
  await act(async () => { vi.advanceTimersByTime(milliseconds); });
}
function expectQuestionSemantics(mode) {
  const heading = question(mode), controls = answers(mode), item = current(mode);
  expect(heading.tagName).toBe('H3'); expect(heading.tabIndex).toBe(-1);
  expect(heading.textContent).toBe(item.q);
  const group = controls[0].closest('[role="group"]');
  expect(group.getAttribute('aria-labelledby')).toBe(heading.id);
  expect(nameOf(group)).toBe(item.q);
  expect(controls).toHaveLength(item.a.length);
  for (const [index, button] of controls.entries()) {
    expect(button.tagName).toBe('BUTTON'); expect(button.textContent).toContain(item.a[index]);
    expect(button.getAttribute('data-punnett-answer')).toBe(String(index));
    expect(button.getAttribute('aria-disabled')).not.toBe('true'); expect(button.disabled).toBe(false);
  }
  expect(status(mode).tagName).toBe('P'); expect(status(mode).getAttribute('role')).toBe('status');
  expect(status(mode).textContent.trim()).toBe('');
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT');
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; vi.useFakeTimers();
  const registry = resetStemLab(); audio = vi.fn(() => null); registry.audioContext = audio;
  config = loadTool('stem_lab/stem_tool_punnett.js', 'punnett'); banks = window.__punnettPure;
  changes = vi.fn(); xp = vi.fn(); toast = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  outside = document.createElement('button'); outside.textContent = 'Host navigation';
  host = document.createElement('div'); document.body.append(outside, host);
  root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    root = null; host = null; setStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor);
    else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Punnett challenge feedback and explicit progression', () => {
  it('names each difficulty and question group, exposes selection, and focuses only an explicitly selected difficulty', async () => {
    await mount();
    expect(document.activeElement).toBe(outside); expectQuestionSemantics('challenge');
    const group = difficulty('Beginner').closest('[role="group"]');
    expect(nameOf(group)).toBe('Challenge difficulty');
    const choices = ['Beginner', 'Intermediate', 'Advanced'];
    for (const [index, text] of choices.entries()) {
      const button = difficulty(text);
      expect(button.tagName).toBe('BUTTON'); expect(button.hasAttribute('aria-label')).toBe(false);
      expect(button.getAttribute('aria-pressed')).toBe(index === 0 ? 'true' : 'false');
    }
    for (const [label, value] of [['Intermediate', 'medium'], ['Advanced', 'hard'], ['Beginner', 'easy']]) {
      await activate(difficulty(label));
      expect(latest.punnett._chalDiff).toBe(value); expect(latest.punnett._chalIdx).toBe(0);
      expect(document.activeElement).toBe(question('challenge')); expectQuestionSemantics('challenge');
      for (const text of choices) expect(difficulty(text).getAttribute('aria-pressed')).toBe(text === label ? 'true' : 'false');
    }
    expect(xp).not.toHaveBeenCalled(); expect(audio).not.toHaveBeenCalled(); expectEvidencePreserved();
  });

  it('holds correct feedback and answer focus indefinitely, guards repeated submissions, and advances only on Continue', async () => {
    await mount();
    const selected = answer('challenge'), wrong = answer('challenge', false), live = status('challenge');
    await repeatClicks(selected, selected, wrong);
    expect(latest.punnett._chalIdx).toBe(0); expect(latest.punnett._chalScore).toBe(1); expect(latest.punnett._chalStreak).toBe(1);
    expect(xpCalls('chalQ_easy_0')).toEqual([['chalQ_easy_0', 10, 'Challenge easy']]);
    expect(status('challenge')).toBe(live); expect(live.textContent).toContain('Correct!');
    expect(selected.textContent).toContain('Your answer'); expect(selected.textContent).toContain('Correct answer');
    expect(document.activeElement).toBe(selected);
    for (const button of answers('challenge')) {
      expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false);
    }
    const frozen = latest, writes = changes.mock.calls.length;
    await activate(wrong); await advance();
    expect(latest).toBe(frozen); expect(changes).toHaveBeenCalledTimes(writes); expect(xpCalls('chalQ_easy_0')).toHaveLength(1);
    expect(status('challenge')).toBe(live); expect(document.activeElement).toBe(wrong);
    let focused;
    question('challenge').addEventListener('focus', () => { focused = { index: latest.punnett._chalIdx, text: question('challenge').textContent, feedback: live.textContent }; }, { once: true });
    const continueButton = next('challenge'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._chalIdx).toBe(1); expect(latest.punnett._chalScore).toBe(1);
    expect(document.activeElement).toBe(question('challenge')); expectQuestionSemantics('challenge');
    expect(focused).toEqual({ index: 1, text: banks.CHALLENGE_QS.easy[1].q, feedback: '' });
    expect(status('challenge')).toBe(live); expectEvidencePreserved();
  });

  it('explains an incorrect answer without color dependence, resets the streak, and preserves feedback through a vocabulary dialog', async () => {
    await mount('challenge', { _chalScore: 2, _chalStreak: 2 });
    const item = current('challenge'), wrong = answer('challenge', false), correct = answer('challenge');
    await repeatClicks(wrong, correct);
    expect(latest.punnett._chalScore).toBe(2); expect(latest.punnett._chalStreak).toBe(0); expect(xp).not.toHaveBeenCalled();
    expect(status('challenge').textContent).toContain('Incorrect'); expect(status('challenge').textContent).toContain(item.a[item.correct]);
    expect(wrong.textContent).toContain('Your answer'); expect(wrong.textContent).not.toContain('Correct answer');
    expect(correct.textContent).toContain('Correct answer'); expect(document.activeElement).toBe(wrong);
    const study = section('challenge').querySelector(`[data-punnett-vocab-term="${item.concept}"]`);
    await activate(study);
    const modal = query('[data-punnett-vocab-dialog]'); expect(modal).not.toBeNull();
    const close = modal.querySelector('button[aria-label="Close flashcard"]'); expect(document.activeElement).toBe(close);
    await activate(close);
    expect(document.activeElement).toBe(study); expect(latest.punnett._chalIdx).toBe(0);
    expect(status('challenge').textContent).toContain(item.a[item.correct]);
    await advance(); expect(latest.punnett._chalIdx).toBe(0);
    await activate(next('challenge'));
    expect(latest.punnett._chalIdx).toBe(1); expect(document.activeElement).toBe(question('challenge'));
    expectQuestionSemantics('challenge'); expectEvidencePreserved();
  });

  it('preserves the 10, 10, 15 XP streak progression without allowing repeated answers to multiply score or XP', async () => {
    await mount();
    for (let index = 0; index < 3; index++) {
      const selected = answer('challenge'); await repeatClicks(selected, selected);
      expect(latest.punnett._chalScore).toBe(index + 1); expect(latest.punnett._chalStreak).toBe(index + 1);
      expect(xpCalls(`chalQ_easy_${index}`)).toEqual([[`chalQ_easy_${index}`, index === 2 ? 15 : 10, 'Challenge easy']]);
      if (index === 2) expect(status('challenge').textContent).toContain('Streak bonus');
      await advance(); expect(latest.punnett._chalIdx).toBe(index);
      await activate(next('challenge')); expect(document.activeElement).toBe(question('challenge'));
    }
    expect(latest.punnett._chalIdx).toBe(3); expect(latest.punnett.researchPoints).toBe(17);
    expect(xp.mock.calls.filter(call => call[0].startsWith('chalQ_')).map(call => call[1])).toEqual([10, 10, 15]);
    expectEvidencePreserved();
  });

  it('completes the last question once on Continue, focuses completion and Retry, and recognizes old saved completions without re-awarding', async () => {
    const count = banks.CHALLENGE_QS.easy.length;
    await mount('challenge', { _chalIdx: count - 1, _chalScore: 4, _chalTotalScore: 6 });
    await activate(answer('challenge'));
    expect(latest.punnett._chalTotalScore).toBe(6); expect(query('[data-punnett-challenge-result]')).toBeNull();
    await advance(); expect(latest.punnett._chalIdx).toBe(count - 1);
    const continueButton = next('challenge'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._chalIdx).toBe(count); expect(latest.punnett._chalScore).toBe(5); expect(latest.punnett._chalTotalScore).toBe(11);
    const result = query('[data-punnett-challenge-result]');
    expect(result.tagName).toBe('H3'); expect(result.tabIndex).toBe(-1); expect(document.activeElement).toBe(result);
    expect(result.textContent).toContain('Complete'); expect(answers('challenge')).toHaveLength(0);
    await advance(); expect(latest.punnett._chalTotalScore).toBe(11);
    const retry = buttonNamed('challenge', 'Retry Easy'); expect(retry.hasAttribute('aria-label')).toBe(false);
    await activate(retry);
    expect(latest.punnett._chalIdx).toBe(0); expect(latest.punnett._chalScore).toBe(0); expect(latest.punnett._chalStreak).toBe(0);
    expect(latest.punnett._chalTotalScore).toBe(11); expect(document.activeElement).toBe(question('challenge')); expectQuestionSemantics('challenge');
    const rewards = xp.mock.calls.length, writes = changes.mock.calls.length;
    await commit({ _chalIdx: count - 1, _chalScore: 5, _chalFeedback: `🏆 Complete! Score: 5/${count}` });
    expect(query('[data-punnett-challenge-result]')).not.toBeNull(); expect(answers('challenge')).toHaveLength(0);
    expect(buttonNamed('challenge', 'Retry Easy')).toBeDefined();
    await advance(); expect(latest.punnett._chalTotalScore).toBe(11);
    expect(changes).toHaveBeenCalledTimes(writes); expect(xp).toHaveBeenCalledTimes(rewards); expectEvidencePreserved();
  });
});

describe('Punnett Gene Defense feedback and explicit resolution', () => {
  it('starts explicitly and exposes named, clamped health meters and a named answer group', async () => {
    await mount('battle'); expect(document.activeElement).toBe(outside);
    await activate(buttonNamed('battle', 'Start Battle'));
    expect(document.activeElement).toBe(question('battle')); expectQuestionSemantics('battle');
    const meters = [...section('battle').querySelectorAll('[role="meter"]')]; expect(meters).toHaveLength(2);
    for (const [index, label] of ['Your cell health', 'Mutation virus health'].entries()) {
      expect(nameOf(meters[index])).toBe(label); expect(meters[index].getAttribute('aria-valuemin')).toBe('0');
      expect(meters[index].getAttribute('aria-valuemax')).toBe('100'); expect(meters[index].getAttribute('aria-valuenow')).toBe('100');
      expect(meters[index].getAttribute('aria-valuetext')).toBe('100 HP remaining');
    }
    await commit({ _battleHP: 170, _battleEnemyHP: -25 });
    expect(meters[0].getAttribute('aria-valuenow')).toBe('100'); expect(meters[0].getAttribute('aria-valuetext')).toBe('100 HP remaining');
    expect(meters[1].getAttribute('aria-valuenow')).toBe('0'); expect(meters[1].getAttribute('aria-valuetext')).toBe('0 HP remaining');
    expect(latest.punnett._battleResult).toBeNull(); expect(xp).not.toHaveBeenCalled(); expectEvidencePreserved();
  });

  it('applies correct-answer damage once, holds feedback and focus, then focuses only the explicitly continued round', async () => {
    await mount('battle', { _battleActive: true }); expect(document.activeElement).toBe(outside);
    const item = current('battle'), selected = answer('battle'), wrong = answer('battle', false), live = status('battle');
    await repeatClicks(selected, selected, wrong);
    expect(latest.punnett._battleEnemyHP).toBe(100 - item.dmg); expect(latest.punnett._battleHP).toBe(100);
    expect(latest.punnett._battleScore).toBe(1); expect(latest.punnett._battleRound).toBe(0);
    expect(selected.textContent).toContain('Your answer'); expect(selected.textContent).toContain('Correct answer');
    expect(document.activeElement).toBe(selected); expect(status('battle')).toBe(live); expect(live.textContent).toContain(`-${item.dmg} HP`);
    for (const button of answers('battle')) { expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false); }
    const frozen = latest, writes = changes.mock.calls.length;
    await activate(wrong); await advance();
    expect(latest).toBe(frozen); expect(changes).toHaveBeenCalledTimes(writes); expect(document.activeElement).toBe(wrong);
    expect(xpCalls('battleWin')).toHaveLength(0);
    const continueButton = next('battle'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._battleRound).toBe(1); expect(latest.punnett._battleScore).toBe(1);
    expect(document.activeElement).toBe(question('battle')); expectQuestionSemantics('battle'); expect(status('battle')).toBe(live);
    expectEvidencePreserved();
  });

  it('shows selected and correct answer text after a mistake, applies 15 damage once, and waits for Continue', async () => {
    await mount('battle', { _battleActive: true, _battleHP: 74, _battleScore: 2 });
    const item = current('battle'), wrong = answer('battle', false), correct = answer('battle');
    await repeatClicks(wrong, wrong, correct);
    expect(latest.punnett._battleHP).toBe(59); expect(latest.punnett._battleEnemyHP).toBe(100); expect(latest.punnett._battleScore).toBe(2);
    expect(status('battle').textContent).toContain('-15 HP'); expect(status('battle').textContent).toContain(item.a[item.correct]);
    expect(wrong.textContent).toContain('Your answer'); expect(wrong.textContent).not.toContain('Correct answer');
    expect(correct.textContent).toContain('Correct answer'); expect(document.activeElement).toBe(wrong);
    await advance(); expect(latest.punnett._battleRound).toBe(0); expect(latest.punnett._battleHP).toBe(59);
    await activate(next('battle'));
    expect(latest.punnett._battleRound).toBe(1); expect(latest.punnett._battleHP).toBe(59);
    expect(document.activeElement).toBe(question('battle')); expectQuestionSemantics('battle'); expect(xpCalls('battleWin')).toHaveLength(0);
    expectEvidencePreserved();
  });

  it('resolves victory and its normal rewards only once after explicit Continue, with a focused result heading', async () => {
    const first = banks.BATTLE_QS[0];
    await mount('battle', { _battleActive: true, _battleEnemyHP: first.dmg, _battleHP: 82, _battleScore: 2 });
    await activate(answer('battle'));
    expect(latest.punnett._battleEnemyHP).toBe(0); expect(latest.punnett._battleScore).toBe(3);
    await advance();
    expect(latest.punnett._battleActive).toBe(true); expect(latest.punnett._battleResult).toBeNull();
    expect(latest.punnett._battleWon).not.toBe(true); expect(xpCalls('battleWin')).toHaveLength(0);
    const continueButton = next('battle'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._battleActive).toBe(false); expect(latest.punnett._battleResult).toBe('won'); expect(latest.punnett._battleWon).toBe(true);
    const result = query('[data-punnett-battle-result]');
    expect(result.tagName).toBe('H3'); expect(result.tabIndex).toBe(-1); expect(document.activeElement).toBe(result);
    expect(result.textContent).toContain('Victory'); expect(xpCalls('battleWin')).toEqual([['battleWin', 30, 'Gene Defense Victory']]);
    expect(xpCalls('punnettBadge_geneDefender')).toHaveLength(1);
    await advance();
    expect(xpCalls('battleWin')).toHaveLength(1); expect(xpCalls('punnettChal_battle_won')).toHaveLength(1);
    expect(latest.punnett.researchPoints).toBe(47); expect(latest.punnett._completedChallenges.battle_won).toBe(true);
    expectEvidencePreserved();
  });

  it('resolves a zero-health loss only on Continue and restarts with a focused first question and full health', async () => {
    await mount('battle', { _battleActive: true, _battleHP: 10, _battleEnemyHP: 77, _battleScore: 2 });
    await activate(answer('battle', false)); await advance();
    expect(latest.punnett._battleHP).toBe(0); expect(latest.punnett._battleResult).toBeNull(); expect(latest.punnett._battleActive).toBe(true);
    const continueButton = next('battle'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._battleResult).toBe('lost'); expect(latest.punnett._battleActive).toBe(false);
    expect(document.activeElement).toBe(query('[data-punnett-battle-result]'));
    expect(xpCalls('battleWin')).toHaveLength(0); expect(latest.punnett._battleWon).not.toBe(true);
    await activate(buttonNamed('battle', 'Battle Again'));
    expect(latest.punnett._battleActive).toBe(true); expect(latest.punnett._battleResult).toBeNull();
    expect(latest.punnett._battleRound).toBe(0); expect(latest.punnett._battleScore).toBe(0);
    expect(latest.punnett._battleHP).toBe(100); expect(latest.punnett._battleEnemyHP).toBe(100);
    expect(document.activeElement).toBe(question('battle')); expectQuestionSemantics('battle'); expectEvidencePreserved();
  });

  it('reaches question-bank exhaustion by Continue, focuses the result, and allows an explicit fresh attempt', async () => {
    const count = banks.BATTLE_QS.length, last = banks.BATTLE_QS[count - 1];
    expect(last.dmg).toBeLessThan(100);
    await mount('battle', { _battleActive: true, _battleRound: count - 1, _battleHP: 61, _battleEnemyHP: 100, _battleScore: 3 });
    await activate(answer('battle')); await advance();
    expect(latest.punnett._battleRound).toBe(count - 1); expect(query('[data-punnett-battle-result]')).toBeNull();
    const continueButton = next('battle'); await repeatClicks(continueButton, continueButton);
    expect(latest.punnett._battleRound).toBe(count); expect(latest.punnett._battleActive).toBe(true); expect(latest.punnett._battleResult).toBeNull();
    const result = query('[data-punnett-battle-result]');
    expect(result.tagName).toBe('H3'); expect(result.tabIndex).toBe(-1); expect(document.activeElement).toBe(result);
    expect(answers('battle')).toHaveLength(0); expect(latest.punnett._battleEnemyHP).toBe(100 - last.dmg);
    await advance(); expect(latest.punnett._battleRound).toBe(count); expect(xpCalls('battleWin')).toHaveLength(0);
    await activate(buttonNamed('battle', 'Try Again'));
    expect(latest.punnett._battleRound).toBe(0); expect(latest.punnett._battleScore).toBe(0);
    expect(latest.punnett._battleHP).toBe(100); expect(latest.punnett._battleEnemyHP).toBe(100);
    expect(document.activeElement).toBe(question('battle')); expectQuestionSemantics('battle'); expectEvidencePreserved();
  });
});

describe('Punnett quiz mode and difficulty transitions', () => {
  it('retains pending explanations across modes and never lets old answer timers overwrite a new difficulty or round', async () => {
    await mount(); await activate(answer('challenge'));
    const challengeFeedback = latest.punnett._chalFeedback;
    const battleTab = query('#punnett-activity-battle'); await activate(battleTab);
    expect(document.activeElement).toBe(battleTab);
    await activate(buttonNamed('battle', 'Start Battle')); await activate(answer('battle'));
    const battleFeedback = latest.punnett._battleFeedback, damage = current('battle').dmg;
    const challengeTab = query('#punnett-activity-challenge'); await activate(challengeTab);
    expect(document.activeElement).toBe(challengeTab); expect(status('challenge').textContent).toBe(challengeFeedback);
    await activate(difficulty('Intermediate'));
    expect(document.activeElement).toBe(question('challenge')); expect(latest.punnett._chalDiff).toBe('medium');
    expect(latest.punnett._chalIdx).toBe(0); expect(latest.punnett._chalScore).toBe(0); expect(latest.punnett._chalStreak).toBe(0);
    const frozen = latest, writes = changes.mock.calls.length;
    await advance(120000);
    expect(latest).toBe(frozen); expect(changes).toHaveBeenCalledTimes(writes);
    expect(latest.punnett._battleRound).toBe(0); expect(latest.punnett._battleFeedback).toBe(battleFeedback);
    expect(latest.punnett._battleEnemyHP).toBe(100 - damage); expectQuestionSemantics('challenge');
    await activate(query('#punnett-activity-battle'));
    expect(status('battle').textContent).toBe(battleFeedback); expect(latest.punnett._battleRound).toBe(0);
    await activate(next('battle'));
    expect(latest.punnett._battleRound).toBe(1); expect(document.activeElement).toBe(question('battle'));
    expect(latest.punnett._chalDiff).toBe('medium'); expect(latest.punnett._chalIdx).toBe(0);
    expectEvidencePreserved();
  });
});
