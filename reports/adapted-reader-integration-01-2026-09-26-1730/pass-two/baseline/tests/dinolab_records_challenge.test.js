// Dino Lab — the Records tab warned about estimates, then read like facts.
//
// The tab's own subtitle says "Many of these are best estimates, since the very
// largest animals are known from incomplete skeletons" — and then lists twelve
// superlatives as settled answers to read. Nothing asked the learner to commit
// to anything, so the caveat had nowhere to land.
//
// "Call it before you look" puts a guess between the student and the answer.
// A learner who has committed notices that the real answer arrives with a
// range, and that records change hands as new bones come out of the ground.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function records() {
  const open = SRC.indexOf('var RECORDS = [');
  expect(open, 'RECORDS not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  ];', open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open + 14, close + 4).replace(/\n {2}\];/, ']'))();
}

// Run the tool's OWN option builder. The first version of this file retyped
// the arithmetic here, and mutating the tool to `var recOptions = []` — which
// drops the correct answer from every single question — still passed. A test
// that carries its own copy of the logic is testing itself.
function optionsFor(list, i) {
  const open = SRC.indexOf('var recOthers = RECORDS.filter');
  expect(open, 'the option builder was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('recOptions.sort();', open) + 'recOptions.sort();'.length;
  const body = SRC.slice(open, close);
  // eslint-disable-next-line no-new-func
  return new Function('RECORDS', 'recQ', 'recBase', 'modIndex', 'd',
    body + '\nreturn recOptions;')(list, list[i], i, () => i, {});
}

describe('every record can actually be answered', () => {
  it('has enough records for the activity to mean anything', () => {
    expect(records().length).toBeGreaterThanOrEqual(8);
  });

  it('always offers the right answer among the choices', () => {
    // An option set that omitted the holder would be unanswerable, and the
    // deterministic index arithmetic makes that easy to break silently.
    const list = records();
    const broken = list
      .map((r, i) => ({ r, opts: optionsFor(list, i) }))
      .filter(({ r, opts }) => opts.indexOf(r.holder) === -1)
      .map(({ r }) => r.title);
    expect(broken, 'records whose own holder is not offered: ' + broken.join(', ')).toEqual([]);
  });

  it('always offers four distinct choices', () => {
    const list = records();
    const thin = list
      .map((r, i) => ({ r, opts: optionsFor(list, i) }))
      .filter(({ opts }) => opts.length !== 4 || new Set(opts).size !== opts.length)
      .map(({ r }) => r.title);
    expect(thin, 'records with fewer than four distinct options: ' + thin.join(', ')).toEqual([]);
  });

  it('never offers the same holder twice in one question', () => {
    const list = records();
    for (let i = 0; i < list.length; i++) {
      const opts = optionsFor(list, i);
      expect(new Set(opts).size).toBe(opts.length);
    }
  });
});

describe('the challenge behaves like the others in this tool', () => {
  it('exists on the records tab', () => {
    expect(SRC).toContain('Call it before you look');
    expect(SRC).toContain('var recQ = RECORDS[modIndex(d.recordIdx, RECORDS.length)]');
    expect(SRC).toContain('recChallenge,');
  });

  it('asks and answers from the record data, not a second copy', () => {
    expect(SRC).toMatch(/recQ\.title/);
    expect(SRC).toMatch(/recQ\.holder/);
    expect(SRC).toMatch(/recQ\.detail/);
  });

  it('locks the answer after one pick', () => {
    expect(SRC).toContain('if (recAnswered) return;');
  });

  it('names the holder even when the learner missed it', () => {
    // The detail line carries the estimate AND its hedging, which is the
    // reason this activity exists.
    expect(SRC).toMatch(/recQ\.holder \+ '\. ',\s*\n\s*recQ\.detail/);
  });

  it('marks state in the accessible name, not only in colour', () => {
    expect(SRC).toContain("'. Correct answer.'");
    expect(SRC).toContain("'. You chose this. Not the record holder.'");
    expect(SRC).toContain("'. Choose this dinosaur.'");
  });

  it('keeps answered choices focusable', () => {
    expect(SRC).toContain("'aria-disabled': recAnswered ? 'true' : undefined");
    expect(SRC).not.toMatch(/disabled: recAnswered/);
  });

  it('wraps around and does not score', () => {
    expect(SRC).toContain('% RECORDS.length');
    const open = SRC.indexOf('var recQ = RECORDS[');
    const block = SRC.slice(open, SRC.indexOf('recChallenge,', open));
    expect(block).not.toMatch(/recordCorrect|recordScore|correctCount/);
  });

  it('leaves the estimate caveat in place', () => {
    // If the subtitle ever loses its hedge, the activity is teaching
    // superlatives as certainties again.
    expect(SRC).toMatch(/best estimates/);
    expect(SRC).toMatch(/incomplete skeletons/);
  });
});
