// AI Literacy Lab — what it tells students about AI detectors.
//
// This tool teaches 6-12 students when using AI is legitimate. It had exactly
// one sentence about the mirror-image question — being ACCUSED of using it —
// and that sentence asserted "Schools increasingly detect AI-written text" as
// fact. Two problems with that, and this suite exists to keep both fixed:
//
//   It is not true in the way a student would read it. OpenAI withdrew its own
//   detector in 2023 for low accuracy. A detector score is a guess.
//
//   The errors are not evenly distributed. The published false positives land
//   on writers with simpler sentence structure and narrower vocabulary — which
//   describes non-native English writers and a good share of the students with
//   language and learning differences this platform is built for. A tool that
//   warns those students about AI without warning them about this is telling
//   them half the story, and the dangerous half.
//
// The tests also pin the ethical anchor. "Detectors are unreliable" must never
// be allowed to drift into "so you can get away with it" — the integrity
// question does not depend on detection, and the tool has to keep saying so.

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = fs.readFileSync(path.join(process.cwd(), 'stem_lab', 'stem_tool_llm_literacy.js'), 'utf8');

function table(startMark) {
  const a = SRC.indexOf(startMark);
  expect(a, 'table not found: ' + startMark).toBeGreaterThan(-1);
  const b = SRC.indexOf('\n  ];', a);
  return new Function('return ' + SRC.slice(a + startMark.length - 1, b) + '\n  ]')();
}

const MISCONCEPTIONS = table('var MISCONCEPTIONS = [');
const FACTS = table('var DETECTOR_FACTS = [');
const PROTECT = table('var DETECTOR_PROTECT = [');

/** The body of the section-6 component, so "is it wired in" is a real check. */
function udlComponent() {
  const a = SRC.indexOf('function UDLRubric()');
  expect(a, 'UDLRubric not found').toBeGreaterThan(-1);
  const b = SRC.indexOf('\n      function ', a + 10);
  return SRC.slice(a, b === -1 ? SRC.length : b);
}

describe('what it now says about detectors', () => {
  it('no longer tells students schools reliably detect AI text', () => {
    expect(SRC).not.toMatch(/Schools increasingly detect AI-written text/);
  });

  it('says plainly that a detector cannot prove authorship', () => {
    const m = MISCONCEPTIONS.find((x) => /detector can prove/i.test(x.myth));
    expect(m, 'the detector misconception is gone').toBeTruthy();
    expect(m.fact).toMatch(/cannot/i);
    expect(m.fact).toMatch(/a guess, not evidence/i);
  });

  it('names the evidence rather than asserting unreliability', () => {
    const all = FACTS.map((f) => f.head + ' ' + f.body).join(' ');
    expect(all, 'OpenAI withdrawing its own detector').toMatch(/OpenAI/);
    expect(all).toMatch(/January 2023/);
    expect(all, 'the non-native-writer bias finding').toMatch(/Patterns in 2023/);
    expect(all).toMatch(/non-native English speakers/i);
    expect(all, 'a school that acted on it').toMatch(/Vanderbilt/);
  });

  it('tells the students most at risk that it is the tool at fault, not them', () => {
    const all = FACTS.map((f) => f.body).join(' ');
    expect(all).toMatch(/more likely to be flagged/i);
    expect(all).toMatch(/fault in the detector, not in your writing/i);
  });
});

describe('it does not turn into a loophole', () => {
  // The failure mode of writing this section at all: a student reads
  // "detectors do not work" and hears "nobody can catch me."
  it('keeps integrity separate from detection, in both places it comes up', () => {
    const anchor = FACTS.find((f) => /honest answer/i.test(f.head));
    expect(anchor, 'no integrity anchor among the detector facts').toBeTruthy();
    expect(anchor.body).toMatch(/nothing to do with whether anyone can catch it/i);

    const plagiarism = MISCONCEPTIONS.find((x) => /plagiarism-proof/i.test(x.myth));
    expect(plagiarism.fact).toMatch(/whether or not anyone can tell/i);
  });

  it('says out loud how the section is meant to be read', () => {
    expect(SRC).toMatch(/detectors being unreliable is not a reason to think you can get away with it/i);
  });

  it('gives advice that costs an honest student nothing', () => {
    expect(PROTECT.length).toBeGreaterThanOrEqual(4);
    const all = PROTECT.join(' ');
    expect(all, 'version history is the actionable one').toMatch(/version history/i);
    expect(all).toMatch(/outline|notes/i);
    expect(all, 'what to do when accused').toMatch(/besides a detector percentage/i);
  });
});

describe('it is actually reachable', () => {
  it('renders inside section 6, before the comprehension check', () => {
    const udl = udlComponent();
    expect(udl, 'panel is not in UDLRubric').toMatch(/DETECTOR_FACTS\.map/);
    expect(udl).toMatch(/DETECTOR_PROTECT\.map/);
    expect(udl.indexOf('DETECTOR_FACTS.map'))
      .toBeLessThan(udl.indexOf("comprehensionCheck('udl')"));
  });

  it('carries a heading and is keyed, like the rest of the tool', () => {
    const udl = udlComponent();
    expect(udl).toMatch(/If you are accused and you did not do it/);
    expect(udl, 'list children need keys').toMatch(/key: i/);
  });

  it('points readers from the myth list to the section that explains it', () => {
    const pointing = MISCONCEPTIONS.filter((m) => /See Section 6/.test(m.fact));
    expect(pointing.length, 'no cross-reference to section 6').toBeGreaterThanOrEqual(2);
  });
});

describe('counts the tool reports about itself', () => {
  it('does not hardcode a section total that drifts', () => {
    // The session report said "of 6" while SECTION_ORDER had grown to eight,
    // so a student who worked through everything could export a report
    // claiming more sections than the tool has.
    expect(SRC).not.toMatch(/Sections explored \| ' \+ Object\.keys\(visited\)\.length \+ ' of 6/);
    expect(SRC).toMatch(/' of ' \+ SECTION_ORDER\.length/);
  });

  it('has more sections than the stale number claimed', () => {
    const a = SRC.indexOf('var SECTION_ORDER = [');
    const b = SRC.indexOf('\n      ];', a);
    const ids = [...SRC.slice(a, b).matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(6);
    expect(ids).toContain('udl');
  });
});

describe('mirrors stay in step', () => {
  it('keeps source and public copies identical', () => {
    const pub = fs.readFileSync(
      path.join(process.cwd(), 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_llm_literacy.js'), 'utf8');
    expect(SRC).toBe(pub);
  });
});
