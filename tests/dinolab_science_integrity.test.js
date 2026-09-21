// Dino Lab — the palaeontology a learner is taught, and the precision it claims.
//
// Audited 2026-09-21. One real defect: the Chicxulub evidence card said the
// crater "dates to exactly 66 million years ago". The number is right; the word
// was not. That card sits in KPG_EVIDENCE, an activity whose whole point is
// asking a student to WEIGH evidence — and a radiometric date is a measurement
// with an uncertainty. Renne et al. 2013 put the impact at 66.043 ± 0.043 Ma.
// Forty thousand years on a 66-million-year-old event is a far better thing to
// tell a learner than "exactly", because the tightness is WHY the crater can be
// tied to the boundary layer at all.
//
// Everything else checked out and is pinned here, because these are the facts a
// well-meaning content edit breaks silently.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function species() {
  return [...SRC.matchAll(
    /\{ id: '([a-z0-9]+)', name: '([^']+)'[^}]*?group: '([a-z]+)'[^}]*?clade: '([^']+)'/g,
  )].map((m) => ({ id: m[1], name: m[2], group: m[3], clade: m[4] }));
}

describe('the evidence cards do not overclaim', () => {
  it('gives the impact date with its uncertainty, not as exact', () => {
    const card = /A buried ~180 km crater[^']*/.exec(SRC);
    expect(card, 'the Chicxulub evidence card was not found').toBeTruthy();
    expect(card[0]).not.toMatch(/\bexactly\b/);
    // The stated age must still be right: 66.04 Ma, ±~40 kyr.
    expect(card[0]).toMatch(/66\.0\d million/);
    expect(card[0]).toMatch(/40,000|43,000/);
  });

  it('keeps the crater diameter inside the published range', () => {
    const m = /~(\d+) km crater/.exec(SRC);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(150);
    expect(Number(m[1])).toBeLessThanOrEqual(200);
  });

  it('only uses "exactly" to flag what is still open', () => {
    // Every other use in this tool is "Exactly how X worked is still debated",
    // which signals uncertainty rather than asserting it away. A new one that
    // closes a question instead of opening it is the thing to catch.
    // Scoped to MEASUREMENT claims. "exactly the set you want" (UI text) and
    // "exactly as birds do" (a true comparison) are fine; the failure mode is
    // asserting a date, age or size is known exactly when it is an estimate.
    const bad = [...SRC.matchAll(/exactly[^'\n]{0,40}?(million years|years ago|tonnes|metres|meters)/gi)]
      .map((m) => m[0].slice(0, 60));
    expect(bad, 'a measurement claimed as exact: ' + bad.join(' | ')).toEqual([]);
  });

  it('still names the asteroid AND the volcanism', () => {
    // The consensus is an impact with Deccan volcanism as a contributing
    // factor. An answer that dropped either half would be teaching a
    // simplification the tool's own evidence list contradicts.
    const m = /What likely caused the end-Cretaceous extinction[\s\S]{0,200}?options: \[([^\]]+)\][\s\S]{0,40}?answer: (\d+)/.exec(SRC);
    expect(m, 'the extinction quiz item was not found').toBeTruthy();
    const options = m[1].split(/',\s*'/).map((o) => o.replace(/^'|'$/g, ''));
    const chosen = options[Number(m[2])];
    expect(chosen).toMatch(/asteroid/i);
    expect(chosen).toMatch(/volcan/i);
    expect(SRC).toMatch(/Deccan/);
  });
});

describe('the species table is taxonomically honest', () => {
  it('parses enough entries for this to mean anything', () => {
    expect(species().length).toBeGreaterThanOrEqual(15);
  });

  it('does not file a pterosaur as a dinosaur', () => {
    // The tool asks "Which 'dinosaur' was NOT actually a dinosaur?" and grades
    // Pteranodon. If the table called it a theropod, the tool would contradict
    // its own quiz.
    const p = species().find((s) => s.id === 'pteranodon');
    expect(p, 'Pteranodon is not in the table').toBeTruthy();
    expect(['theropod', 'sauropod', 'ornithischian']).not.toContain(p.group);
    expect(p.clade).toMatch(/Pterosauria/i);
  });

  it('puts the famous animals in the right major group', () => {
    const want = {
      tyrannosaurus: 'theropod',
      velociraptor: 'theropod',
      therizinosaurus: 'theropod',
      compsognathus: 'theropod',
      triceratops: 'ornithischian',
      stegosaurus: 'ornithischian',
      iguanodon: 'ornithischian',
    };
    const rows = species();
    const wrong = [];
    for (const [id, group] of Object.entries(want)) {
      const r = rows.find((s) => s.id === id);
      if (r && r.group !== group) wrong.push(`${r.name}: ${r.group}, expected ${group}`);
    }
    expect(wrong).toEqual([]);
  });

  it('uses only recognised major groups', () => {
    const allowed = new Set(['theropod', 'sauropod', 'ornithischian', 'other']);
    const odd = [...new Set(species().map((s) => s.group))].filter((g) => !allowed.has(g));
    expect(odd, 'unrecognised group value(s): ' + odd.join(', ')).toEqual([]);
  });
});

describe('the size claims match published figures', () => {
  it('keeps Pteranodon wingspan at the figure for Pteranodon', () => {
    // ~7 m is right for Pteranodon longiceps. It would be wrong for
    // Quetzalcoatlus (10-11 m), so the claim and the animal have to stay
    // together — this test exists because I nearly "fixed" a correct number.
    const m = /Wingspan up to about (\d+) meters/.exec(SRC);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(6);
    expect(Number(m[1])).toBeLessThanOrEqual(8);
    expect(SRC).toMatch(/Pteranodon longiceps/);
  });

  it('keeps the titanosaur mass estimate in range', () => {
    const m = /titanosaur estimated near (\d+) tonnes/.exec(SRC);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(60);
    expect(Number(m[1])).toBeLessThanOrEqual(80);
  });

  it('keeps the longest-neck claim at the measured length', () => {
    // Mamenchisaurus sinocanadorum, ~15.1 m (Moore et al. 2023).
    const m = /neck estimates reach (\d+) meters/.exec(SRC);
    expect(m).toBeTruthy();
    expect(Number(m[1])).toBeGreaterThanOrEqual(13);
    expect(Number(m[1])).toBeLessThanOrEqual(16);
  });
});
