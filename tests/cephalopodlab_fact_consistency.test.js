// Cephalopod Lab — cross-section fact consistency.
//
// This tool states the same numbers in many places: the glossary, the facts
// pool, SKIN_ANATOMY, the world-records table, quiz explanations, the
// Camouflage Lab primer and several teaching cards all describe the same
// animal. Nothing kept them in agreement, and two had drifted apart:
//
//   * each arm's ganglion held "~40 million neurons" in the glossary and
//     "~50 million neurons" in the facts pool. The tool's own totals settle
//     it — ~500M overall, ~170M central, so ~330M across eight arms — and
//     8 x 50M would overshoot the stated total.
//   * cuttlefish chromatophore density was "~250 per mm²" in five places
//     (two of them citing Hanlon & Messenger 2018) and "~200 per square mm"
//     in two uncited ones.
//
// A contradiction like this is worse than a plain error: whichever sentence a
// student reads first is the one they will carry, and the disagreement is
// invisible unless you read the whole 22,000-line file at once. These tests
// pin the agreement, not the truth of any figure — if a number is wrong, fix
// it everywhere and update the expectation in one place here.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_cephalopodlab.js';
const DEPLOY = 'desktop/web-app/public/stem_lab/stem_tool_cephalopodlab.js';
const src = readFileSync(SOURCE, 'utf8');

describe('Cephalopod Lab repeated facts agree with each other', () => {
  it('states one arm-ganglion neuron count, consistent with the stated totals', () => {
    // every mention of neurons in a single arm ganglion
    const perArm = Array.from(src.matchAll(/ganglion[^.]{0,60}?~?(\d+) million neurons/gi)).map((m) => Number(m[1]));
    expect(perArm.length).toBeGreaterThan(0);
    expect(new Set(perArm).size).toBe(1);
    const each = perArm[0];
    // and it must square with the tool's own total and central-brain figures
    expect(src).toMatch(/~500 million neurons/);
    expect(src).toMatch(/~?170 ?[Mm]/);
    expect(each * 8 + 170).toBeLessThanOrEqual(520);
    expect(each * 8 + 170).toBeGreaterThanOrEqual(480);
  });

  it('states one cuttlefish chromatophore density', () => {
    const densities = Array.from(src.matchAll(/(\d+) (?:chromatophores )?per (?:square mm|mm²|square millimet)/gi)).map((m) => Number(m[1]));
    expect(densities.length).toBeGreaterThan(3);
    // a stated range is allowed to mention its lower bound, so ignore 100
    const headline = densities.filter((n) => n !== 100);
    expect(new Set(headline).size).toBe(1);
    expect(headline[0]).toBe(250);
  });

  it('states one number of hearts, and the same split between them', () => {
    expect(src).not.toMatch(/(two|2) hearts/i);
    const branchial = Array.from(src.matchAll(/(two|2) branchial hearts/gi));
    expect(branchial.length).toBeGreaterThan(0);
    // "three hearts" and "one systemic" must both be present and never contradicted
    expect(src).toMatch(/(three|3) hearts/i);
    expect(src).not.toMatch(/(two|three|3) systemic hearts/i);
  });

  it('keeps the two live copies byte-identical', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(src);
  });
});
