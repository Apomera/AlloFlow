// Dino Lab's Ecosystems tab claimed "These animals shared one place and time."
//
// A formation is a stack of ROCK, not a snapshot. By the tool's own catalog,
// 21 of 64 multi-species formations span more than 10 million years - Cedar
// Mountain spans 39 My, so Utahraptor (135-130 mya) and Eolambia (100-96 mya)
// are listed as one community despite never overlapping by ~30 My.
//
// The tool teaches exactly this lesson elsewhere: "All the famous dinosaurs
// lived at the same time" is one of its myth cards. The tab was contradicting
// it. The span was already computed for the header, so saying it out loud
// costs nothing and turns the error into the point.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function catalog() {
  const starts = [...SRC.matchAll(/id: '([a-z0-9_]+)', name: '([^']+)', common: '([^']+)',/g)]
    .map((m) => ({ i: m.index, common: m[3] }));
  expect(starts.length, 'catalog entries not found').toBeGreaterThan(300);
  return starts.map((st, k) => {
    // Bound each entry by the NEXT entry, never a fixed window - a fixed
    // window bleeds into the following record and invents contradictions.
    const end = k + 1 < starts.length ? starts[k + 1].i : st.i + 1500;
    const b = SRC.slice(st.i, end);
    return {
      common: st.common,
      formation: (b.match(/formation: '([^']*)'/) || [])[1],
      hi: Number((b.match(/myaHi: ([0-9.]+)/) || [])[1]),
      lo: Number((b.match(/myaLo: ([0-9.]+)/) || [])[1]),
    };
  });
}

function byFormation() {
  const out = {};
  for (const d of catalog()) {
    if (!d.formation || d.formation === 'Various') continue;
    if (!Number.isFinite(d.hi) || !Number.isFinite(d.lo)) continue;
    (out[d.formation] = out[d.formation] || []).push(d);
  }
  return out;
}

describe('the claim the tab used to make was false', () => {
  it('has formations whose members never overlapped in time', () => {
    // If this ever becomes empty the honest wording is no longer needed -
    // but while it holds, "shared one place and time" is wrong.
    const groups = byFormation();
    const nonOverlapping = [];
    for (const [f, v] of Object.entries(groups)) {
      for (let i = 0; i < v.length; i++) {
        for (let j = i + 1; j < v.length; j++) {
          const a = v[i], b = v[j];
          if (Math.min(a.hi, b.hi) < Math.max(a.lo, b.lo)) {
            nonOverlapping.push(`${f}: ${a.common} vs ${b.common}`);
          }
        }
      }
    }
    expect(nonOverlapping.length,
      'no non-overlapping pairs remain - revisit the wording').toBeGreaterThan(0);
  });

  it('has formations spanning far more than a lifetime', () => {
    const wide = Object.entries(byFormation())
      .map(([f, v]) => ({ f, span: Math.max(...v.map((x) => x.hi)) - Math.min(...v.map((x) => x.lo)) }))
      .filter((r) => r.span > 10);
    expect(wide.length, 'no wide formations found').toBeGreaterThan(0);
  });
});

describe('the tab now says something true', () => {
  it('no longer asserts they shared one place and time', () => {
    expect(SRC).not.toContain('These animals shared one place and time');
  });

  it('says they share a rock formation instead', () => {
    expect(SRC).toContain('These animals are all found in the same rock formation');
  });

  it('states the span in millions of years', () => {
    expect(SRC).toContain("' million years, so not every animal here met the others.'");
    expect(SRC).toMatch(/A formation is a stack of rock, not a single moment/);
  });

  it('derives the span from the dates the tab already computed', () => {
    // Not a second copy of the arithmetic, and not a hardcoded number.
    expect(SRC).toContain('var ecoSpan = Math.max(0, Math.round(myaHi - myaLo));');
    const decl = SRC.indexOf('var ecoSpan =');
    const calc = SRC.indexOf('list.forEach(function (dn) { if (dn.myaHi > myaHi)');
    expect(calc, 'the span source disappeared').toBeGreaterThan(-1);
    expect(decl, 'ecoSpan is computed before myaHi/myaLo are known').toBeGreaterThan(calc);
  });

  it('still allows the honest positive case', () => {
    // A genuinely tight formation should not be told its animals never met.
    expect(SRC).toContain('These layers formed over a short enough span that these animals could have met.');
    expect(SRC).toMatch(/ecoSpan > 5 \?/);
  });
});
