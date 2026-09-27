import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the shipped pure functions without mounting the much larger UI.
const source = readFileSync('stem_lab/stem_tool_bridgelab.js', 'utf8');
const sandbox = { window: { StemLab: { registerTool() {} } }, console };
vm.runInNewContext(source.replace("window.StemLab.registerTool('bridgeLab', {", `
  window.bridgeModel = { solveTrussMOJ, buildTrussSpec, bridgeGoverningAnalysis,
    bridgeNormalizeSettings, bridgeLateralBracing, bridgeCrossingAnalysis, BRIDGE_MODEL_VERSION, MATERIALS };
  window.StemLab.registerTool('bridgeLab', {`), sandbox);
const model = sandbox.window.bridgeModel;
const steel = model.MATERIALS.find(material => material.id === 'steel');
const settings = overrides => ({ span: 30, height: 6, nBays: 4, loadPerJoint: 50,
  crossSectionMm2: 5000, trussStyle: 'warren', loadMode: 'uniform', ...overrides });

function expectJointEquilibrium(spec, result) {
  expect(result.ok, result.reason).toBe(true);
  for (const joint of spec.joints) {
    let fx = (spec.loads[joint.id]?.fx || 0) + (result.reactions[joint.id]?.fx || 0);
    let fy = (spec.loads[joint.id]?.fy || 0) + (result.reactions[joint.id]?.fy || 0);
    for (const member of spec.members) {
      if (member.j1 !== joint.id && member.j2 !== joint.id) continue;
      const other = spec.joints.find(candidate => candidate.id === (member.j1 === joint.id ? member.j2 : member.j1));
      const length = Math.hypot(other.x - joint.x, other.y - joint.y);
      fx += result.memberForces[member.id] * (other.x - joint.x) / length;
      fy += result.memberForces[member.id] * (other.y - joint.y) / length;
    }
    expect(fx, `horizontal equilibrium at ${joint.id}`).toBeCloseTo(0, 7);
    expect(fy, `vertical equilibrium at ${joint.id}`).toBeCloseTo(0, 7);
  }
}

describe('Bridge Lab structural analysis', () => {
  it('matches a hand-solvable triangle, including horizontal force and moment balance', () => {
    const joints = [{ id: 'A', x: 0, y: 0 }, { id: 'B', x: 10, y: 0 }, { id: 'C', x: 5, y: 5 }];
    const members = [{ id: 'AB', j1: 'A', j2: 'B' }, { id: 'AC', j1: 'A', j2: 'C' }, { id: 'BC', j1: 'B', j2: 'C' }];
    const supports = { A: 'pin', B: 'roller' };
    const result = model.solveTrussMOJ(joints, members, { C: { fy: -100 } }, supports);
    expect(result.ok).toBe(true);
    expect(result.memberForces.AB).toBeCloseTo(50, 8);
    expect(result.memberForces.AC).toBeCloseTo(-50 * Math.SQRT2, 8);
    expect(result.memberForces.BC).toBeCloseTo(-50 * Math.SQRT2, 8);
    expect(result.reactions.A.fy).toBeCloseTo(50, 8);
    const sideLoaded = model.solveTrussMOJ(joints, members, { C: { fx: 20, fy: -100 } }, supports);
    expect(sideLoaded.reactions.A.fx).toBeCloseTo(-20, 8);
    expect(sideLoaded.reactions.A.fy).toBeCloseTo(40, 8);
    expect(sideLoaded.reactions.B.fy).toBeCloseTo(60, 8);
  });

  it.each(['warren', 'pratt', 'howe'])('balances every joint for %s across all supported bay counts and vehicle positions', style => {
    for (let nBays = 3; nBays <= 8; nBays++) {
      for (const position of [0, 0.01, 0.125, 0.3, 0.5, 0.8, 0.99, 1]) {
        const spec = model.buildTrussSpec(style, 30, nBays, 6, { mode: 'vehicle', position, totalKN: 150 });
        const result = model.solveTrussMOJ(spec.joints, spec.members, spec.loads, spec.supports);
        expectJointEquilibrium(spec, result);
        expect(result.reactions.B0.fy).toBeCloseTo(150 * (1 - position), 7);
        expect(result.reactions[`B${nBays}`].fy).toBeCloseTo(150 * position, 7);
        expect(result.maxResidualKN).toBeLessThan(1e-7);
      }
    }
  });

  it('counts all Warren loads and only the members actually drawn', () => {
    const gov = model.bridgeGoverningAnalysis(settings(), steel);
    expect(gov.analysis.W).toBe(200);
    expect(gov.analysis.loadJointCount).toBe(4);
    expect(gov.analysis.totalLen).toBeCloseTo(30 + 22.5 + 8 * Math.hypot(3.75, 6), 8);
    expect(gov.analysis.Mmax).toBeCloseTo(750, 8);
    expect(gov.analysis.reactionsLeft).toBeCloseTo(100, 8);
    expect(gov.analysis.reactionsRight).toBeCloseTo(100, 8);
    expect(gov.analysis.maxForce).toBeCloseTo(Math.max(...Object.values(gov.moj.memberForces).map(Math.abs)), 8);
  });

  it.each(['warren', 'pratt', 'howe', 'ktruss'])('preserves zero demand and support-position loads for %s', trussStyle => {
    for (const override of [
      { loadMode: 'uniform', loadPerJoint: 0 },
      { loadMode: 'vehicle', vehicleLoad: 0, vehiclePos: 0.5 },
      { loadMode: 'vehicle', vehicleLoad: 150, vehiclePos: 0 },
      { loadMode: 'vehicle', vehicleLoad: 150, vehiclePos: 1 }
    ]) {
      const gov = model.bridgeGoverningAnalysis(settings({ trussStyle, ...override }), steel);
      expect(gov.analysis.maxForce).toBeCloseTo(0, 8);
      expect(gov.maxStress).toBeCloseTo(0, 8);
      expect(gov.safetyFactor).toBe(Infinity);
      expect(gov.bucklingMargin).toBe(Infinity);
      expect(gov.governingCompression.forceKN).toBe(0);
      expect(gov.compressionCases).toHaveLength(0);
    }
  });

  it('uses K-truss vehicle load, location, member lengths, and lateral bracing in the approximation', () => {
    const d = settings({ trussStyle: 'ktruss', loadMode: 'vehicle', vehicleLoad: 180, vehiclePos: 0.25 });
    const gov = model.bridgeGoverningAnalysis(d, steel);
    expect(gov.supportsMOJ).toBe(false);
    expect(gov.analysis.W).toBe(180);
    expect(gov.analysis.reactionsLeft).toBeCloseTo(135, 8);
    expect(gov.analysis.reactionsRight).toBeCloseTo(45, 8);
    expect(gov.analysis.Mmax).toBeCloseTo(1012.5, 8);
    expect(gov.analysis.totalLen).toBeCloseTo(30 + 15 + 18 + 2 * Math.hypot(7.5, 6) + 8 * Math.hypot(7.5, 3), 8);
    const sparse = model.bridgeGoverningAnalysis({ ...d, lateralBraceEvery: 2 }, steel);
    expect(sparse.bucklingMargin).toBeCloseTo(gov.bucklingMargin / 4, 8);
  });

  it('scales force linearly and member buckling capacity with area squared', () => {
    const base = model.bridgeGoverningAnalysis(settings(), steel);
    const twiceLoad = model.bridgeGoverningAnalysis(settings({ loadPerJoint: 100 }), steel);
    const twiceArea = model.bridgeGoverningAnalysis(settings({ crossSectionMm2: 10000 }), steel);
    expect(twiceLoad.maxStress).toBeCloseTo(base.maxStress * 2, 8);
    expect(twiceLoad.governingSF).toBeCloseTo(base.governingSF / 2, 8);
    expect(twiceArea.safetyFactor).toBeCloseTo(base.safetyFactor * 2, 8);
    expect(twiceArea.bucklingMargin).toBeCloseTo(base.bucklingMargin * 4, 8);
  });

  it('caps the sparse-bracing length at the actual top chord end restraints', () => {
    const warren = model.bridgeGoverningAnalysis(settings({ lateralBraceEvery: 4 }), steel);
    const pratt = model.bridgeGoverningAnalysis(settings({ trussStyle: 'pratt', lateralBraceEvery: 4 }), steel);
    expect(warren.unbracedLenM).toBeCloseTo(22.5, 8);
    expect(pratt.unbracedLenM).toBeCloseTo(15, 8);
    expect(model.bridgeGoverningAnalysis(settings({ lateralBraceEvery: 1 }), steel).unbracedLenM).toBeCloseTo(7.5, 8);
    expect(model.bridgeGoverningAnalysis(settings({ trussStyle: 'pratt', lateralBraceEvery: 1 }), steel).unbracedLenM).toBeCloseTo(7.5, 8);
  });

  it('checks the shorter final brace interval at its actual member length', () => {
    const gov = model.bridgeGoverningAnalysis(settings({ nBays: 6, lateralBraceEvery: 2 }), steel);
    expect(Array.from(gov.lateralBracing.stations)).toEqual([2.5, 12.5, 22.5, 27.5]);
    expect(Array.from(gov.lateralBracing.intervals, interval => interval.lengthM)).toEqual([10, 10, 5]);
    expect(gov.compressionCases.find(member => member.id === 'TC0')).toMatchObject({
      lengthMm: 10000, ownLengthMm: 5000, braceStartM: 2.5, braceEndM: 12.5, outOfPlane: true
    });
    expect(gov.compressionCases.find(member => member.id === 'TC4')).toMatchObject({
      lengthMm: 5000, ownLengthMm: 5000, braceStartM: 22.5, braceEndM: 27.5, outOfPlane: false
    });
    // Reflection preserves these two chord forces. Their different brace
    // lengths make the end interval four times as resistant to Euler buckling.
    const left = gov.compressionCases.find(member => member.id === 'TC0');
    const right = gov.compressionCases.find(member => member.id === 'TC4');
    expect(left.forceKN).toBeCloseTo(right.forceKN, 8);
    const capacity = member => Math.PI ** 2 * 200000 * 5000 ** 2 / 12 / member.lengthMm ** 2 / 1000;
    expect(capacity(right) / capacity(left)).toBeCloseTo(4, 8);
  });

  it.each(['warren', 'pratt', 'howe'])('uses actual enclosing brace intervals for every %s compression chord', trussStyle => {
    for (let nBays = 3; nBays <= 8; nBays++) {
      for (let lateralBraceEvery = 1; lateralBraceEvery <= nBays; lateralBraceEvery++) {
        const gov = model.bridgeGoverningAnalysis(settings({ trussStyle, nBays, lateralBraceEvery }), steel);
        const joints = Object.fromEntries(gov.spec.joints.map(joint => [joint.id, joint]));
        for (const memberCase of gov.compressionCases) {
          const member = gov.spec.members.find(member => member.id === memberCase.id);
          if (!member.id.startsWith('TC')) continue;
          const start = Math.min(joints[member.j1].x, joints[member.j2].x);
          const end = Math.max(joints[member.j1].x, joints[member.j2].x);
          expect(memberCase.braceStartM).toBeLessThanOrEqual(start + 1e-9);
          expect(memberCase.braceEndM).toBeGreaterThanOrEqual(end - 1e-9);
          expect(memberCase.lengthMm).toBeCloseTo((memberCase.braceEndM - memberCase.braceStartM) * 1000, 7);
        }
      }
    }
  });

  it('rejects malformed and singular structures instead of returning non-finite forces', () => {
    const spec = model.buildTrussSpec('warren', 30, 4, 6, 50);
    const solve = (joints = spec.joints, members = spec.members, loads = spec.loads, supports = spec.supports) => model.solveTrussMOJ(joints, members, loads, supports);
    expect(solve([{ ...spec.joints[0], x: NaN }, ...spec.joints.slice(1)]).ok).toBe(false);
    expect(solve([...spec.joints.slice(0, -1), spec.joints[0]]).ok).toBe(false);
    expect(solve(undefined, [{ ...spec.members[0], j2: 'missing' }, ...spec.members.slice(1)]).ok).toBe(false);
    expect(solve(undefined, [{ ...spec.members[0], j2: 'B0' }, ...spec.members.slice(1)]).ok).toBe(false);
    expect(solve(undefined, undefined, { T0: { fy: Infinity } }).ok).toBe(false);
    expect(solve(undefined, undefined, { missing: { fy: -10 } }).ok).toBe(false);
    expect(solve(undefined, undefined, undefined, { B0: 'fixed' }).ok).toBe(false);
    expect(solve(spec.joints.map(joint => ({ ...joint, y: 0 }))).ok).toBe(false);
    expect(solve(undefined, spec.members.slice(1)).ok).toBe(false);
    expect(model.buildTrussSpec('warren', 30, Infinity, 6, 50).ok).toBe(false);
  });

  it('normalizes corrupt restored settings without losing notes or valid zero loads', () => {
    const restored = { span: Infinity, height: -3, nBays: 5.7, crossSectionMm2: 9e9,
      loadPerJoint: 0, vehicleLoad: 0, vehiclePos: NaN, lateralBraceEvery: 100,
      trussStyle: 'unknown', materialId: 'unknown', designNotes: 'Keep this evidence', tab: 'cases' };
    const normalized = model.bridgeNormalizeSettings(restored);
    expect(normalized).toMatchObject({ span: 30, height: 2, nBays: 6, crossSectionMm2: 30000,
      loadPerJoint: 0, vehicleLoad: 0, vehiclePos: 0.5, lateralBraceEvery: 6,
      trussStyle: 'warren', materialId: 'steel', designNotes: restored.designNotes, tab: 'cases' });
    expect(restored.nBays).toBe(5.7);
    const gov = model.bridgeGoverningAnalysis(restored);
    expect(gov.moj.ok).toBe(true);
    expect(gov.maxStress).toBe(0);
  });

  it('repairs restored view, optimizer, and text values without invalid controls', () => {
    const normalized = model.bridgeNormalizeSettings({ optTargetSF: -9, zoom3d: Infinity,
      rot3d: { rotY: Infinity, rotX: 900 }, tab: 'missing', designName: {}, designNotes: ['not text'] });
    expect(normalized).toMatchObject({ optTargetSF: 1.5, zoom3d: 1, rot3d: { rotY: 26, rotX: 78 },
      tab: 'build', designName: '', designNotes: '' });
    const valid = model.bridgeNormalizeSettings({ optTargetSF: 5, zoom3d: 3, rot3d: { rotY: -400, rotX: -20 }, tab: 'inquiry' });
    expect(valid).toMatchObject({ optTargetSF: 5, zoom3d: 3, rot3d: { rotY: -40, rotX: -20 }, tab: 'inquiry' });
  });
});

describe('Bridge Lab full-crossing force envelope', () => {
  it('includes supports and every real load-transfer point with optional chart samples', () => {
    const d = settings({ nBays: 6, vehicleLoad: 150 });
    const critical = model.bridgeCrossingAnalysis(d, steel);
    const chart = model.bridgeCrossingAnalysis(d, steel, { includeSamples: true });
    expect(critical.ok).toBe(true);
    expect(Array.from(critical.criticalPositions)).toEqual([0, 1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12, 11 / 12, 1]);
    expect(critical.samples).toHaveLength(8);
    expect(chart.samples.length).toBeGreaterThan(51);
    expect(chart.maxForce).toBeCloseTo(critical.maxForce, 8);
    expect(chart.worst.sf).toBeCloseTo(critical.worst.sf, 8);
    for (const endpoint of [critical.samples[0], critical.samples.at(-1)]) {
      expect(endpoint).toMatchObject({ sf: null, member: null, mode: 'none', status: 'safe' });
    }
    expect(model.BRIDGE_MODEL_VERSION).toBe('bridge-crossing-v2');
  });

  it.each([
    { trussStyle: 'warren', nBays: 7, lateralBraceEvery: 2, vehicleLoad: 183 },
    { trussStyle: 'pratt', nBays: 5, lateralBraceEvery: 3, vehicleLoad: 87 },
    { trussStyle: 'howe', nBays: 8, lateralBraceEvery: 3, vehicleLoad: 250 }
  ])('bounds every dense-sweep member force for $trussStyle and attains the reported extrema', geometry => {
    const d = settings({ ...geometry, crossSectionMm2: 8000, loadMode: 'vehicle' });
    const envelope = model.bridgeCrossingAnalysis(d, steel);
    expect(envelope.ok).toBe(true);
    const extremes = Object.fromEntries(envelope.memberExtremes.map(member => [member.id, member]));
    let sampledWorst = Infinity;
    for (let step = 0; step <= 137; step++) {
      const gov = model.bridgeGoverningAnalysis({ ...d, vehiclePos: step / 137 }, steel);
      sampledWorst = Math.min(sampledWorst, gov.governingSF);
      for (const [id, force] of Object.entries(gov.moj.memberForces)) {
        expect(force).toBeLessThanOrEqual(extremes[id].tensionKN + 1e-7);
        expect(force).toBeGreaterThanOrEqual(-extremes[id].compressionKN - 1e-7);
      }
    }
    expect(sampledWorst + 1e-7).toBeGreaterThanOrEqual(envelope.worst.sf);
    for (const extreme of envelope.memberExtremes) {
      for (const sense of ['tension', 'compression']) {
        if (extreme[`${sense}Position`] == null) continue;
        const gov = model.bridgeGoverningAnalysis({ ...d, vehiclePos: extreme[`${sense}Position`] }, steel);
        expect(gov.moj.memberForces[extreme.id]).toBeCloseTo(extreme[`${sense}KN`] * (sense === 'compression' ? -1 : 1), 7);
      }
      if (extreme.worstPosition != null) {
        const gov = model.bridgeGoverningAnalysis({ ...d, vehiclePos: extreme.worstPosition }, steel);
        const force = Math.abs(gov.moj.memberForces[extreme.id]);
        const strengthSF = steel.yieldMPa * d.crossSectionMm2 / 1000 / force;
        const compression = gov.compressionCases.find(member => member.id === extreme.id);
        const bucklingSF = compression ? Math.PI ** 2 * steel.modulusGPa * d.crossSectionMm2 ** 2 / 12 / compression.lengthMm ** 2 / force : Infinity;
        expect(extreme.worstSF).toBeCloseTo(Math.min(strengthSF, bucklingSF), 7);
      }
    }
    const worst = model.bridgeGoverningAnalysis({ ...d, vehiclePos: envelope.worst.position }, steel);
    expect(worst.governingSF).toBeCloseTo(envelope.worst.sf, 8);
    expect(envelope.worst.member).toBe(envelope.worst.mode === 'buckling' ? worst.governingCompression.id : worst.governingStrength.id);
  });

  it('records force reversal and compression demand even if the starting position has no demand', () => {
    const d = settings({ nBays: 6, vehicleLoad: 150, vehiclePos: 0 });
    const envelope = model.bridgeCrossingAnalysis(d, steel);
    expect(envelope.memberExtremes.some(member => member.tensionKN > 0 && member.compressionKN > 0)).toBe(true);
    expect(envelope.compressionCases.length).toBeGreaterThan(0);
    for (const memberCase of envelope.compressionCases) {
      const member = envelope.memberExtremes.find(member => member.id === memberCase.id);
      expect(memberCase.forceKN).toBeCloseTo(member.compressionKN, 8);
      expect(memberCase.position).toBe(member.compressionPosition);
    }
    expect(envelope.worst.position).toBeGreaterThan(0);
    expect(envelope.worst.position).toBeLessThan(1);
  });

  it('identifies the actual governing member when material strength controls the crossing', () => {
    const d = settings({ span: 10, height: 2, nBays: 8, crossSectionMm2: 30000, vehicleLoad: 500 });
    const envelope = model.bridgeCrossingAnalysis(d, steel);
    expect(envelope.worst.mode).toBe('strength');
    const gov = model.bridgeGoverningAnalysis({ ...d, loadMode: 'vehicle', vehiclePos: envelope.worst.position }, steel);
    expect(envelope.worst.member).toBe(gov.governingStrength.id);
    expect(Math.abs(gov.moj.memberForces[envelope.worst.member])).toBeCloseTo(envelope.maxForce, 7);
    expect(envelope.worst.sf).toBeCloseTo(steel.yieldMPa * d.crossSectionMm2 / 1000 / envelope.maxForce, 8);
  });

  it('keeps optimizer demands independent of section area, material, and current vehicle position', () => {
    const d = settings({ nBays: 6, vehicleLoad: 150, vehiclePos: 0.8, lateralBraceEvery: 2 });
    const base = model.bridgeCrossingAnalysis(d, steel);
    const alternate = model.bridgeCrossingAnalysis({ ...d, crossSectionMm2: 12000, vehiclePos: 0 }, model.MATERIALS.find(material => material.id === 'wood'));
    expect(alternate.maxForce).toBeCloseTo(base.maxForce, 8);
    expect(alternate.compressionCases).toEqual(base.compressionCases);
    expect(alternate.worst.sf).not.toBeCloseTo(base.worst.sf, 5);
  });

  it('returns serializable no-demand evidence for a zero vehicle load', () => {
    const envelope = model.bridgeCrossingAnalysis(settings({ vehicleLoad: 0 }), steel, { includeSamples: true });
    expect(envelope).toMatchObject({ ok: true, maxForce: 0, worst: null, compressionCases: [] });
    expect(envelope.samples.every(sample => sample.sf === null && sample.mode === 'none')).toBe(true);
    expect(envelope.memberExtremes.every(member => member.worstSF === null && member.worstPosition === null)).toBe(true);
    expect(JSON.parse(JSON.stringify(envelope))).toEqual(envelope);
  });

  it('declines K-truss member envelopes instead of presenting approximate forces as exact', () => {
    const envelope = model.bridgeCrossingAnalysis(settings({ trussStyle: 'ktruss' }), steel);
    expect(envelope.ok).toBe(false);
    expect(envelope.reason).toContain('exact truss solution');
    expect(envelope.samples).toHaveLength(0);
    expect(envelope.worst).toBeNull();
  });
});
