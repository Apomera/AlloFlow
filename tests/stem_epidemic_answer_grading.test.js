// Answer grading for the Epidemic Lab's Challenge + Battle modes.
//
// Both graders used to ask whether the student's text CONTAINED the expected answer
// after stripping punctuation. That is wrong in both directions, and both directions
// were reachable by an ordinary student:
//   - the R_effective question expects "1", so "100", "0.1" and "I think 100" all scored
//   - "true" scored for "not true"
//   - "75 percent" missed "75%", and "the rate of transmission" missed "transmission rate"
// The Challenge pays XP and drives the streak badges, so a grader that can be farmed by
// typing a digit is worse than having no grader at all.
//
// These tests exercise the real exported grader, not a copy.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let answerMatches;
let normalizeAnswer;

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__EpidemicCore;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_epidemic.js'), 'utf8'))();
  const core = window.__EpidemicCore;
  if (!core || !core.answerMatches) throw new Error('grader not exposed (window.__EpidemicCore.answerMatches)');
  answerMatches = core.answerMatches;
  normalizeAnswer = core.normalizeAnswer;
});

const q = (a, alt) => ({ a, alt });

describe('Epidemic Lab answer grading — rejects what it used to accept', () => {
  it('a numeric answer of 1 does not match 100, 0.1 or a sentence containing a 1', () => {
    const rEff = q('1', ['1.0']);
    expect(answerMatches('1', rEff)).toBe(true);
    expect(answerMatches('1.0', rEff)).toBe(true);
    // Every one of these scored under the old contains() check.
    expect(answerMatches('100', rEff)).toBe(false);
    expect(answerMatches('0.1', rEff)).toBe(false);
    expect(answerMatches('1000', rEff)).toBe(false);
    expect(answerMatches('R is 100', rEff)).toBe(false);
  });

  it('a negated answer is not a correct answer', () => {
    const tf = q('true');
    expect(answerMatches('true', tf)).toBe(true);
    expect(answerMatches('not true', tf)).toBe(false);
    expect(answerMatches('untrue', tf)).toBe(false);
  });

  it('negation blocks the multi-word containment path too', () => {
    const sir = q('susceptible infected recovered');
    expect(answerMatches('susceptible, infected, and recovered', sir)).toBe(true);
    expect(answerMatches('it is not susceptible infected recovered', sir)).toBe(false);
  });

  it('an empty or whitespace answer never scores', () => {
    expect(answerMatches('', q('measles'))).toBe(false);
    expect(answerMatches('   ', q('measles'))).toBe(false);
  });
});

describe('Epidemic Lab answer grading — accepts what it used to reject', () => {
  it('percent spelled out equals the percent sign', () => {
    const herd = q('75%');
    expect(answerMatches('75%', herd)).toBe(true);
    expect(answerMatches('75 percent', herd)).toBe(true);
    expect(answerMatches('75', herd)).toBe(true);
  });

  it('word order does not decide a science answer', () => {
    const beta = q('transmission rate', ['rate of transmission']);
    expect(answerMatches('transmission rate', beta)).toBe(true);
    expect(answerMatches('the rate of transmission', beta)).toBe(true);
  });

  it('a correct answer inside a full sentence still scores', () => {
    const e = q('herd immunity', ['community immunity']);
    expect(answerMatches('I think it is herd immunity', e)).toBe(true);
  });

  it('alternate wordings listed on the question are honoured', () => {
    const method = q('euler', ['runge kutta', 'rk4', 'numerical integration']);
    expect(answerMatches('euler', method)).toBe(true);
    // Runge-Kutta is at least as standard an answer to "how is SIR solved numerically";
    // the original single-string key marked it wrong.
    expect(answerMatches('Runge-Kutta', method)).toBe(true);
    expect(answerMatches('RK4', method)).toBe(true);
    expect(answerMatches('guessing', method)).toBe(false);
  });

  it('an open question accepts any genuinely correct response', () => {
    // "Name one way to slow a pandemic" had exactly one accepted answer: vaccination.
    const slow = q('vaccination', ['masks', 'wearing masks', 'social distancing', 'washing hands', 'quarantine']);
    ['vaccination', 'masks', 'wearing masks', 'social distancing', 'washing hands', 'quarantine']
      .forEach((ans) => expect(answerMatches(ans, slow), ans + ' should score').toBe(true));
    expect(answerMatches('sneezing on people', slow)).toBe(false);
  });
});

describe('Epidemic Lab answer normalisation', () => {
  it('strips filler, case and punctuation without losing the answer', () => {
    expect(normalizeAnswer('  The Measles! ')).toBe('measles');
    expect(normalizeAnswer('75 percent')).toBe('75%');
  });

  it('keeps the operators an equation answer depends on', () => {
    expect(normalizeAnswer('beta*S*I - gamma*I')).toContain('*');
    expect(normalizeAnswer('1 - 1/R0')).toContain('/');
  });
});
