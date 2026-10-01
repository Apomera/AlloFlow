// Dino Lab — the Sites tab stated the idea and then let you read past it.
//
// Its subtitle says formations matter because they were "laid down in the
// right place at the right time", and then shows twelve cards. The reasoning a
// palaeontologist actually does is the inverse: you have a question, so WHICH
// rock do you go and dig? That was the one tab in the tool with no click, no
// input and no state write.
//
// "Where would you dig?" asks for a formation given an animal to study. Each
// option shows its age, so the age/place reasoning is visible rather than
// remembered.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function sites() {
  const open = SRC.indexOf('var SITES = [');
  expect(open, 'SITES not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  ];', open);
  // eslint-disable-next-line no-new-func
  return new Function('return ' + SRC.slice(open + 12, close + 4).replace(/\n {2}\];/, ']'))();
}

// Run the tool's OWN option builder rather than retyping it. A retyped copy
// passes even when the tool drops the answer from every question — that
// happened on the records challenge and is the reason this reads from source.
function optionsFor(list, i) {
  const open = SRC.indexOf('var siteOthers = SITES.filter');
  expect(open, 'the site option builder was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('siteOptions.sort(', open);
  const body = SRC.slice(open, close);
  // eslint-disable-next-line no-new-func
  return new Function('SITES', 'siteQ', 'siteBase', 'modIndex', 'd',
    body + '\nreturn siteOptions;')(list, list[i], i, () => i, {});
}

function targetFor(site) {
  return String(site.famous || '').split(',')[0].trim();
}

describe('every brief can be answered', () => {
  it('has enough sites for the activity to mean anything', () => {
    expect(sites().length).toBeGreaterThanOrEqual(8);
  });

  it('always offers the right formation', () => {
    const list = sites();
    const broken = list
      .map((s, i) => ({ s, opts: optionsFor(list, i) }))
      .filter(({ s, opts }) => opts.indexOf(s) === -1 && !opts.some((o) => o.id === s.id))
      .map(({ s }) => s.name);
    expect(broken, 'sites not offered in their own question: ' + broken.join(', ')).toEqual([]);
  });

  it('always offers four distinct formations', () => {
    const list = sites();
    const thin = list
      .map((s, i) => ({ s, opts: optionsFor(list, i) }))
      .filter(({ opts }) => opts.length !== 4 || new Set(opts.map((o) => o.id)).size !== 4)
      .map(({ s }) => s.name);
    expect(thin, 'sites with fewer than four distinct options: ' + thin.join(', ')).toEqual([]);
  });

  it('never poses a brief two options could both answer', () => {
    // The target is the first name in `famous`. If a distractor also lists it,
    // the question has two right answers and the learner is marked wrong for
    // reasoning correctly — worse than no activity.
    const list = sites();
    const ambiguous = [];
    list.forEach((s, i) => {
      const target = targetFor(s);
      if (!target) return;
      const rival = optionsFor(list, i)
        .filter((o) => o.id !== s.id)
        .filter((o) => o.famous && o.famous.toLowerCase().indexOf(target.toLowerCase()) !== -1);
      if (rival.length) ambiguous.push(`${target}: ${s.name} and ${rival.map((r) => r.name).join(', ')}`);
    });
    expect(ambiguous, 'briefs with more than one right answer:\n  ' + ambiguous.join('\n  ')).toEqual([]);
  });

  it('gives every site a first famous find to ask about', () => {
    const empty = sites().filter((s) => !targetFor(s)).map((s) => s.name);
    expect(empty, 'sites with no famous find: ' + empty.join(', ')).toEqual([]);
  });
});

describe('the challenge shows the reasoning, not just the answer', () => {
  it('exists on the sites tab', () => {
    expect(SRC).toContain('Where would you dig?');
    expect(SRC).toContain('var siteQ = SITES[modIndex(d.siteIdx, SITES.length)]');
    expect(SRC).toContain('siteChallenge,');
  });

  it('puts the age on every option', () => {
    // Age is the evidence. Without it the question is recall; with it the
    // learner can rule out a Jurassic formation for a Cretaceous animal.
    expect(SRC).toMatch(/st\.name \+ ', ' \+ st\.when/);
    expect(SRC).toMatch(/\}, st\.when\)/);
  });

  it('explains the answer with age AND place', () => {
    expect(SRC).toMatch(/siteQ\.name \+ ', ' \+ siteQ\.where/);
    expect(SRC).toMatch(/siteQ\.when \+ '\. Known for ' \+ siteQ\.famous/);
  });

  it('asks and answers from the site data, not a second copy', () => {
    expect(SRC).toMatch(/siteQ\.famous/);
    expect(SRC).toMatch(/siteQ\.where/);
  });

  it('locks the answer and keeps choices focusable', () => {
    expect(SRC).toContain('if (siteAnswered) return;');
    expect(SRC).toContain("'aria-disabled': siteAnswered ? 'true' : undefined");
    expect(SRC).not.toMatch(/disabled: siteAnswered/);
  });

  it('marks state in the accessible name, not only in colour', () => {
    expect(SRC).toContain("'. Correct answer.'");
    expect(SRC).toContain("'. You chose this. Wrong age or place.'");
    expect(SRC).toContain("'. Choose this formation.'");
  });

  it('wraps around and does not score', () => {
    expect(SRC).toContain('% SITES.length');
    const open = SRC.indexOf('var siteQ = SITES[');
    const block = SRC.slice(open, SRC.indexOf('siteChallenge,', open));
    expect(block).not.toMatch(/siteCorrect|siteScore|correctCount/);
  });
});
