// Dino Lab - the reconstruction's legs never moved.
//
// A full jointed rig is not available here: bones are cylinders positioned at
// the MIDPOINT between two absolute world points and added flat to the model
// root, so there is no hip->knee->ankle hierarchy to rotate. What there is, in
// body view, is one limb shell per leg whose geometry is re-origined to
// points[0] (limbSkinRoot = the hip) - so rotating that mesh swings the whole
// limb from the joint, which is anatomically honest.
//
// The phasing is the part that carries the biology: diagonal couplets for
// quadrupeds (left-fore with right-hind), plain alternation for bipeds.
//
// Everything below runs the tool's OWN expressions pulled from source. A
// retyped copy passes even when the shipped code is broken - that happened on
// the records challenge in this same tool.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function swingFn() {
  const open = SRC.indexOf('var legPhase = (legEntry.side > 0');
  expect(open, 'the gait was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('legEntry.mesh.rotation.z', open);
  // eslint-disable-next-line no-new-func
  return new Function('idleTime', 'idleMotion', 'legEntry',
    SRC.slice(open, close) + '\nreturn { swing: swing, amount: amount };');
}

const LEGS = {
  hindL: { front: false, side: 1 },
  hindR: { front: false, side: -1 },
  foreL: { front: true, side: 1 },
  foreR: { front: true, side: -1 },
};

function swings(t) {
  const f = swingFn();
  const out = {};
  for (const [name, leg] of Object.entries(LEGS)) out[name] = f(t, { phase: 3.29 }, leg).swing;
  return out;
}

describe('the gait is a real gait', () => {
  it('moves every leg', () => {
    const f = swingFn();
    for (const [name, leg] of Object.entries(LEGS)) {
      let min = Infinity, max = -Infinity;
      for (let t = 0; t < 60; t += 0.05) {
        const v = f(t, { phase: 3.29 }, leg).swing;
        min = Math.min(min, v); max = Math.max(max, v);
      }
      expect(max - min, `${name} never swings`).toBeGreaterThan(1.5);
    }
  });

  it('alternates left and right - a biped does not hop', () => {
    // Both hind legs swinging together would read as hopping, not walking.
    for (const t of [0.4, 0.9, 2.3, 5.1]) {
      const s = swings(t);
      expect(Math.sign(s.hindL), `hind legs in step at t=${t}`).not.toBe(Math.sign(s.hindR));
    }
  });

  it('pairs the DIAGONAL limbs, which is how tetrapods walk', () => {
    // Left-fore travels with right-hind. This is the couplet that keeps three
    // feet down; getting it backwards produces a camel-like pace.
    for (const t of [0.4, 0.9, 2.3, 5.1]) {
      const s = swings(t);
      expect(Math.sign(s.foreL), `foreL/hindR broken at t=${t}`).toBe(Math.sign(s.hindR));
      expect(Math.sign(s.foreR), `foreR/hindL broken at t=${t}`).toBe(Math.sign(s.hindL));
    }
  });

  it('never paces - same-side limbs stay opposed', () => {
    for (const t of [0.4, 0.9, 2.3, 5.1]) {
      const s = swings(t);
      expect(Math.sign(s.foreL), `left side pacing at t=${t}`).not.toBe(Math.sign(s.hindL));
      expect(Math.sign(s.foreR), `right side pacing at t=${t}`).not.toBe(Math.sign(s.hindR));
    }
  });

  it('keeps the swing small enough not to skate', () => {
    // The model does not translate across the ground. A big stride on a
    // stationary animal reads as skating, so this is an idle weight-shift.
    const f = swingFn();
    for (const [name, leg] of Object.entries(LEGS)) {
      const amount = f(1, { phase: 3.29 }, leg).amount;
      expect(amount, `${name} stride is too large for a stationary model`).toBeLessThan(0.05);
      expect(amount, `${name} stride is invisible`).toBeGreaterThan(0.005);
    }
  });

  it('swings the hind limbs harder than the fore limbs', () => {
    const f = swingFn();
    const hind = f(1, { phase: 3.29 }, LEGS.hindL).amount;
    const fore = f(1, { phase: 3.29 }, LEGS.foreL).amount;
    expect(hind, 'forelimbs swing as hard as the hind limbs').toBeGreaterThan(fore);
  });
});

describe('it is wired to the model correctly', () => {
  it('collects a leg entry for each limb', () => {
    expect(SRC).toContain('legs: [],');
    expect(SRC).toContain('idleMotion.legs.push({');
    expect(SRC).toMatch(/mesh: upperLimbShell/);
    expect(SRC).toMatch(/front: !!front/);
    expect(SRC).toMatch(/side: sideSign/);
  });

  it('registers inside addLeg, which runs for all four limbs', () => {
    const legFn = SRC.indexOf('function addLeg(');
    const push = SRC.indexOf('idleMotion.legs.push(');
    const firstCall = SRC.indexOf('addLeg(hip.x', legFn);
    expect(push).toBeGreaterThan(legFn);
    expect(push).toBeLessThan(firstCall);
    expect((SRC.match(/^\s*addLeg\(/gm) || []).length).toBe(4);
  });

  it('only registers where the limb shell really exists', () => {
    // addSoftTissueChain returns [] without showBody, so [0] would be
    // undefined and .rotation.clone() would throw, blanking the 3D view.
    // Walk braces backwards from the shell to find the enclosing guard.
    const shell = SRC.indexOf('var upperLimbShell');
    let depth = 0, i = shell;
    while (i > 0) {
      const ch = SRC[i];
      if (ch === '}') depth++;
      else if (ch === '{') { if (depth === 0) break; depth--; }
      i--;
    }
    const head = SRC.slice(Math.max(0, i - 60), i + 1).split('\n').pop().trim();
    expect(head, 'the limb shell is not guarded by showBody').toContain('showBody');
    expect(SRC.indexOf('idleMotion.legs.push(')).toBeGreaterThan(i);
  });

  it('pivots the limb at the hip, not at its middle', () => {
    // This is what makes the swing anatomical: the chain re-origins its
    // geometry to points[0] and places the mesh there, and for a leg
    // points[0] is limbSkinRoot.
    const chain = SRC.indexOf('function addSoftTissueChain');
    const body = SRC.slice(chain, chain + 700);
    expect(body).toMatch(/surfaceGeometry\.translate\(-points\[0\]\.x/);
    expect(body).toMatch(/mesh\.position\.copy\(points\[0\]\)/);
    const legChain = SRC.slice(SRC.indexOf('var upperLimbShell'), SRC.indexOf('var upperLimbShell') + 160);
    expect(legChain).toMatch(/\[limbSkinRoot,/);
  });

  it('offsets from the rest pose instead of overwriting it', () => {
    expect(SRC).toContain('legEntry.mesh.rotation.z = legEntry.baseRotation.z + swing * amount;');
    expect(SRC).toContain('baseRotation: upperLimbShell.rotation.clone()');
  });
});

describe('it obeys the motion contract', () => {
  it('reads the pausable clock, not wall time', () => {
    const open = SRC.indexOf('var legPhase = (legEntry.side > 0');
    const block = SRC.slice(open, SRC.indexOf('legEntry.mesh.rotation.z', open));
    expect(block).toContain('idleTime');
    expect(block, 'the gait bypasses pause and reduced motion')
      .not.toMatch(/performance\.now|Date\.now/);
  });

  it('gives different species different timing', () => {
    const f = swingFn();
    const a = f(5, { phase: 1.88 }, LEGS.hindL).swing;
    const b = f(5, { phase: 4.23 }, LEGS.hindL).swing;
    expect(Math.abs(a - b), 'every species walks in lockstep').toBeGreaterThan(0.001);
  });
});
