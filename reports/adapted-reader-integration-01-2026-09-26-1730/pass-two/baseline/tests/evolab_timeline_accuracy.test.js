// The Discovery Timeline's history has to be right, and its arithmetic has to agree
// with the dates it states itself.
//
// Background (2026-09-15). The timeline carries 20 entries of real history — names,
// years, countries, and a "why it mattered" paragraph each. Spot-checking found the
// scholarship careful (the Kettlewell entry even carries Majerus's 2012 replication
// and the methodological criticism that prompted it), but TWO arithmetic errors that
// every reader could have caught from the entries' own text:
//
//   * McClintock's headline said "ignored for 30 years" while the body of the SAME
//     entry said "35 years later", "35-year wait" and "35-year delay". 1948 -> 1983
//     is 35. The headline is the line shown in the collapsed timeline, so the wrong
//     number was the one most students saw and the right one was hidden behind a click.
//
//   * Mendel's entry says "published in 1866" and "sat unread until 1900", then calls
//     it "the 35-year delay". That is 34. And the error had SPREAD: McClintock's entry
//     cited "Mendel's 35-year delay" as a parallel, so one wrong figure was being used
//     to corroborate another, and a Teacher Notes discussion question repeated it.
//
// Both were invisible to every other gate: the tool rendered, the text was translated,
// the a11y tree was fine. Nothing checks whether a number in prose is true.
//
// This file pins the dates and re-derives every stated gap from them.
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const SRC = fs.readFileSync(path.resolve('stem_lab/stem_tool_evolab.js'), 'utf8');

// Parse the timeline entries out of the source: id, year, and the whole entry body.
function timelineEntries() {
  const entries = [];
  const re = /\{\s*\n\s*id: '([a-z]+)', year: (\d{4}),([\s\S]*?)\n\s*tag: '([a-z]+)'/g;
  let m;
  while ((m = re.exec(SRC)) !== null) {
    entries.push({ id: m[1], year: Number(m[2]), body: m[3], tag: m[4] });
  }
  return entries;
}

describe('EvoLab discovery timeline: structure', () => {
  it('parses the expected set of entries', () => {
    const e = timelineEntries();
    // If this drops, the parser above has gone blind and every other test in this
    // file would pass vacuously on an empty list.
    expect(e.length, 'entries found: ' + e.map((x) => x.id).join(', ')).toBeGreaterThanOrEqual(18);
    const ids = e.map((x) => x.id);
    for (const required of ['linnaeus', 'lamarck', 'darwinwallace', 'mendel', 'weismann', 'mcclintock', 'kettlewell', 'margulis', 'kimura', 'grants', 'lenski']) {
      expect(ids, 'missing timeline entry: ' + required).toContain(required);
    }
  });

  it('is in chronological order, which the UI relies on', () => {
    const e = timelineEntries();
    const years = e.map((x) => x.year);
    const sorted = [...years].sort((a, b) => a - b);
    expect(years, 'timeline years out of order: ' + years.join(', ')).toEqual(sorted);
  });

  it('every entry year is a plausible date, not a typo', () => {
    for (const e of timelineEntries()) {
      expect(e.year, e.id + ' has year ' + e.year).toBeGreaterThanOrEqual(1700);
      expect(e.year, e.id + ' has year ' + e.year).toBeLessThanOrEqual(2030);
    }
  });
});

describe('EvoLab discovery timeline: the dates behind the claims', () => {
  // These are the anchor dates the prose computes its gaps from. Pinning them means
  // a future edit that changes a date must also revisit the arithmetic below.
  const ANCHORS = [
    ['mendel', 1866, 'published in 1866'],
    ['mendel', 1900, 'sat unread until 1900'],
    ['mcclintock', 1983, 'Nobel Prize in 1983'],
    ['grants', 1981, 'Boag & Grant, Science 1981'],
    ['kettlewell', 2012, 'published in 2012']
  ];

  for (const [id, year, phrase] of ANCHORS) {
    it(`${id} still states ${year} ("${phrase}")`, () => {
      const e = timelineEntries().find((x) => x.id === id);
      expect(e, 'no timeline entry with id ' + id).toBeTruthy();
      expect(e.body, `${id} no longer contains "${phrase}"`).toContain(phrase);
    });
  }

  it('Mendel: every stated gap equals 1900 - 1866 = 34 years', () => {
    const e = timelineEntries().find((x) => x.id === 'mendel');
    const gap = 1900 - 1866;
    expect(gap).toBe(34);
    // Collect every "N years" / "N-year" figure in the entry and check the ones that
    // refer to the delay. The 8 years of pea crossing (1856-1863) is a different span.
    const figures = [...e.body.matchAll(/(\d+)[- ]year/g)].map((m) => Number(m[1]));
    const delays = figures.filter((n) => n > 20);
    expect(delays.length, 'no delay figure found in the Mendel entry').toBeGreaterThan(0);
    for (const n of delays) {
      expect(n, `Mendel entry claims a ${n}-year delay; 1900 - 1866 = ${gap}`).toBe(gap);
    }
  });

  it('McClintock: every stated gap equals 1983 - 1948 = 35 years', () => {
    const e = timelineEntries().find((x) => x.id === 'mcclintock');
    const gap = 1983 - e.year;
    expect(gap).toBe(35);
    // The entry legitimately carries TWO gaps: her own 35-year wait, and a deliberate
    // cross-reference to Mendel's 34-year delay. Strip the cross-reference clause
    // first, or this test forbids the very sentence the previous test requires.
    const ownText = e.body.replace(/mirrors Mendel\\?'s \d+-year delay/g, '');
    const figures = [...ownText.matchAll(/(\d+)[- ]year/g)].map((m) => Number(m[1]));
    const delays = figures.filter((n) => n > 20);
    expect(delays.length, 'no delay figure found in the McClintock entry').toBeGreaterThan(0);
    for (const n of delays) {
      expect(n, `McClintock entry claims a ${n}-year gap; 1983 - ${e.year} = ${gap}`).toBe(gap);
    }
  });

  it('a headline never contradicts its own entry body', () => {
    // This is the exact shape of the bug: the collapsed view said 30, the expanded
    // view said 35 three times. The headline is what most students read.
    const problems = [];
    for (const e of timelineEntries()) {
      const hl = e.body.match(/headline: (?:t\('[^']*', )?'((?:\\'|[^'])+)'/);
      if (!hl) continue;
      const inHeadline = [...hl[1].matchAll(/(\d+)[- ]year/g)].map((m) => Number(m[1])).filter((n) => n > 20);
      if (!inHeadline.length) continue;
      const rest = e.body.slice(e.body.indexOf(hl[0]) + hl[0].length);
      const inBody = [...rest.matchAll(/(\d+)[- ]year/g)].map((m) => Number(m[1])).filter((n) => n > 20);
      for (const h of inHeadline) {
        if (inBody.length && !inBody.includes(h)) {
          problems.push(`${e.id}: headline says ${h} years, body says ${[...new Set(inBody)].join('/')}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('EvoLab discovery timeline: cross-references agree', () => {
  it('McClintock\'s comparison to Mendel uses the corrected figure', () => {
    // The original bug propagated: a wrong number in one entry was quoted by another
    // as corroboration. If the two entries ever disagree again, this fails.
    const mc = timelineEntries().find((x) => x.id === 'mcclintock');
    const ref = mc.body.match(/mirrors Mendel\\?'s (\d+)-year delay/);
    expect(ref, 'McClintock entry no longer cross-references Mendel').toBeTruthy();
    expect(Number(ref[1]), 'cross-reference disagrees with 1900 - 1866').toBe(34);
  });

  it('the Teacher Notes discussion question matches the timeline entries', () => {
    // A teacher reads this one out loud, so a stale figure here is spoken aloud to a
    // whole class. It was the last place the wrong number survived.
    const q = SRC.match(/'Mendel\\'s work was ignored for (\d+) years\. McClintock\\'s for (\d+) years\./);
    expect(q, 'the Mendel/McClintock discussion question has moved or changed shape').toBeTruthy();
    expect(Number(q[1]), 'Teacher Notes says Mendel was ignored for ' + q[1] + ' years').toBe(34);
    expect(Number(q[2]), 'Teacher Notes says McClintock was ignored for ' + q[2] + ' years').toBe(35);
  });

  it('the source comment above the timeline agrees too', () => {
    // Where the next person looks first. It carried both wrong figures.
    const c = SRC.match(/\/\/ Mendel \(ignored for (\d+) years/);
    expect(c, 'the timeline source comment has changed shape').toBeTruthy();
    expect(Number(c[1])).toBe(34);
    expect(SRC, 'source comment should state McClintock 1948 -> 1983').toContain('35 years from the');
  });
});

// NOTE — a gap found during this audit but deliberately NOT gated here.
// All 20 timeline entries' headline/short/why fields are bare English literals:
// about 32 KB of student-facing prose outside the i18n system, in a tool whose UI
// is otherwise fully translated. check_stem_aria_i18n cannot see it (that ratchet
// inspects accessible-name ATTRIBUTES only, by design), so nothing is watching it.
// Fixing it means ~60 new keys in ui_strings.js, which other sessions are editing
// concurrently — a change to schedule, not to slip into an accuracy pass.
// A size ratchet was attempted here and removed: counting per parsed entry and
// counting on raw source disagreed (32,465 vs a raw count that also swept up
// identically-named fields in other components), and a ratchet whose number cannot
// be explained is worse than none. Recorded in the round-41 memory note instead.

describe('EvoLab discovery timeline: attribution is not quietly narrowed', () => {
  // Several entries deliberately name people usually left out. A later edit that
  // trims a name to shorten a line would be a real loss, and nothing else checks it.
  const SHARED_CREDIT = [
    ['darwinwallace', ['Darwin', 'Wallace']],
    ['franklinwatsoncrick', ['Franklin', 'Wilkins', 'Watson', 'Crick']],
    ['rediscovery', ['Vries', 'Correns', 'Tschermak']],
    ['popgenetics', ['Fisher', 'Haldane', 'Wright']],
    ['grants', ['Boag', 'Grant']]
  ];
  for (const [id, names] of SHARED_CREDIT) {
    it(`${id} still credits ${names.join(', ')}`, () => {
      const e = timelineEntries().find((x) => x.id === id);
      expect(e, 'no timeline entry with id ' + id).toBeTruthy();
      // Check the `name:` FIELD, which is what renders as the credit line — not the
      // entry body and not a slice of the source. Two vacuous versions preceded this
      // one, both caught by deleting Wallace and watching the test still pass:
      //   1. `SRC.slice(SRC.indexOf("id: '"+id+"'"), +2000)` — the first occurrence
      //      of 'darwinwallace' is in the SEQ_IDS array hundreds of lines earlier, so
      //      the window covered unrelated code (feedback_slice_indexof_fails_open).
      //   2. the parsed entry body — its PROSE says "Wallace independently arrived...",
      //      so the name survived in the paragraph after being cut from the credit.
      // The credit line is the claim being defended, so that is what must be asserted.
      const nameField = e.body.match(/name: (?:t\('[^']*', )?'((?:\\'|[^'])+)'/);
      expect(nameField, `${id} has no parseable name field`).toBeTruthy();
      for (const n of names) {
        expect(nameField[1], `${id} credit line is "${nameField[1]}" — no longer names ${n}`).toContain(n);
      }
    });
  }
});
