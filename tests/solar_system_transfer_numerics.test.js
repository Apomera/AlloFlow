import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_solarsystem.js', 'utf8');
const modelSource = source.slice(source.indexOf('  function hohmann('), source.indexOf('  /** Synodic period'));
const debriefSource = source.slice(source.indexOf('  function readTransferDebrief('), source.indexOf('  function saveTransferDebrief('));
const { rendezvous, burns, position, anomaly, readDebrief } = new Function(
  'var PI=Math.PI,TAU=2*PI,AU_KM=1.496e8,G_SI=6.674e-11,M_SUN=1.989e30;' + modelSource + debriefSource +
  ';return {rendezvous:transferRendezvous,burns:hohmann,position:transferEllipsePosition,anomaly:transferEccentricAnomaly,readDebrief:readTransferDebrief};'
)();

const TAU = 2 * Math.PI;
const AU_METERS = 1.496e11;
const MU = 6.674e-11 * 1.989e30;
const RADII = [0.387, 0.723, 1, 1.524, 5.203, 9.537, 19.19, 30.07];

// An independent bracket follows |E - M| <= e, rather than the renderer's
// full-orbit bracket. Cartesian coordinates then follow the focus geometry.
function oracleAnomaly(mean, eccentricity) {
  let lower = Math.max(0, mean - eccentricity);
  let upper = Math.min(TAU, mean + eccentricity);
  for (let step = 0; step < 90; step++) {
    const eccentric = (lower + upper) / 2;
    const residual = eccentric - eccentricity * Math.sin(eccentric) - mean;
    if (residual > 0) upper = eccentric;
    else lower = eccentric;
  }
  return (lower + upper) / 2;
}

function oracleFlight(from, to, progress) {
  const axis = (from + to) / 2;
  const eccentricity = Math.abs(to - from) / (from + to);
  const direction = to > from ? 1 : -1;
  const mean = (direction > 0 ? 0 : Math.PI) + Math.PI * progress;
  const eccentric = oracleAnomaly(mean, eccentricity);
  return {
    axis, eccentricity, mean, eccentric,
    x: direction * axis * (Math.cos(eccentric) - eccentricity),
    y: direction * axis * Math.sqrt(1 - eccentricity ** 2) * Math.sin(eccentric),
    radius: axis * (1 - eccentricity * Math.cos(eccentric)),
    days: Math.PI * Math.sqrt((axis * AU_METERS) ** 3 / MU) / 86400 * progress,
  };
}

function expectGeometry(from, to, progress) {
  const expected = oracleFlight(from, to, progress);
  const actual = rendezvous(from, to, progress, 0);
  const eccentric = anomaly(expected.mean, expected.eccentricity);
  expect(Math.abs(eccentric - expected.eccentricity * Math.sin(eccentric) - expected.mean)).toBeLessThan(2e-14);
  expect(actual.ship.x).toBeCloseTo(expected.x, 10);
  expect(actual.ship.y).toBeCloseTo(expected.y, 10);
  expect(actual.ship.r).toBeCloseTo(expected.radius, 10);
  expect(Math.hypot(actual.ship.x, actual.ship.y)).toBeCloseTo(actual.ship.r, 10);
  expect(actual.elapsedDays).toBeCloseTo(expected.days, 8);
  const center = (from - to) / 2;
  const minor = expected.axis * Math.sqrt(1 - expected.eccentricity ** 2);
  expect(((actual.ship.x - center) / expected.axis) ** 2 + (actual.ship.y / minor) ** 2).toBeCloseTo(1, 10);
  expect(actual.ship.y).toBeGreaterThanOrEqual(-1e-12);
  return actual;
}

describe('bounded transfer timing and geometry', () => {
  it.each([
    ['Mercury to Neptune at 6.3%', 0.387, 30.07, 0.063],
    ['Mercury to Neptune at 7.6%', 0.387, 30.07, 0.076],
    ['Neptune to Mercury at 93.7%', 30.07, 0.387, 0.937],
    ['Neptune to Mercury at 93.8%', 30.07, 0.387, 0.938],
  ])('keeps %s at the point corresponding to elapsed time', (_name, from, to, progress) => {
    const actual = expectGeometry(from, to, progress);
    expect(Number.isFinite(actual.ship.x + actual.ship.y + actual.ship.r)).toBe(true);
  });

  it('keeps high-eccentricity native time samples continuous and radius monotonic', () => {
    for (const [from, to] of [[0.387, 30.07], [30.07, 0.387]]) {
      let previous = rendezvous(from, to, 0, 0);
      for (let step = 1; step <= 1000; step++) {
        const actual = expectGeometry(from, to, step / 1000);
        expect(actual.elapsedDays).toBeGreaterThan(previous.elapsedDays);
        expect((actual.ship.r - previous.ship.r) * Math.sign(to - from)).toBeGreaterThanOrEqual(-1e-11);
        expect(actual.ship.r).toBeGreaterThanOrEqual(Math.min(from, to) - 1e-11);
        expect(actual.ship.r).toBeLessThanOrEqual(Math.max(from, to) + 1e-11);
        previous = actual;
      }
      expect(previous.separation).toBeLessThan(1e-10);
    }
  });

  it('matches independent elapsed-time positions for every directed planet pair', () => {
    for (const from of RADII) for (const to of RADII) {
      if (from === to) continue;
      for (let step = 0; step <= 32; step++) expectGeometry(from, to, step / 32);
      const departure = rendezvous(from, to, 0, 0);
      const arrival = rendezvous(from, to, 1, 0);
      expect(departure.ship.x).toBeCloseTo(from, 12);
      expect(arrival.ship.x).toBeCloseTo(-to, 12);
      expect(arrival.separation).toBeLessThan(1e-10);
    }
  });

  it('computes signed Sun-frame burns and reverse-route symmetry from circular speeds', () => {
    for (const from of RADII) for (const to of RADII) {
      if (from === to) continue;
      const circularFrom = Math.sqrt(MU / (from * AU_METERS)) / 1000;
      const circularTo = Math.sqrt(MU / (to * AU_METERS)) / 1000;
      const expectedDeparture = circularFrom * (Math.sqrt(2 * to / (from + to)) - 1);
      const expectedArrival = circularTo * (1 - Math.sqrt(2 * from / (from + to)));
      const actual = burns(from, to);
      const reverse = burns(to, from);
      expect(actual.signedDv1).toBeCloseTo(expectedDeparture, 10);
      expect(actual.signedDv2).toBeCloseTo(expectedArrival, 10);
      expect(Math.sign(actual.signedDv1)).toBe(Math.sign(to - from));
      expect(Math.sign(actual.signedDv2)).toBe(Math.sign(to - from));
      expect(actual.dvTotal).toBeCloseTo(Math.abs(expectedDeparture) + Math.abs(expectedArrival), 10);
      expect(reverse.dv1).toBeCloseTo(actual.dv2, 10);
      expect(reverse.dv2).toBeCloseTo(actual.dv1, 10);
      expect(reverse.transitYrs).toBe(actual.transitYrs);
    }
  });

  it('treats every same-radius route as no trip or impulse at every inspection time', () => {
    for (const radius of RADII) for (const progress of [0, 0.063, 0.5, 0.938, 1]) {
      const actual = rendezvous(radius, radius, progress, 30);
      expect(actual.same).toBe(true);
      expect(actual.ship).toEqual({ x: radius, y: 0, r: radius });
      expect(actual.origin).toEqual({ x: radius, y: 0 });
      expect(actual.destination).toEqual({ x: radius, y: 0 });
      expect(actual.elapsedDays).toBe(0);
      expect(actual.transitDays).toBe(0);
      expect(actual.separation).toBe(0);
      const impulse = burns(radius, radius);
      expect(impulse.transitYrs).toBe(0);
      expect(impulse.dvTotal).toBeCloseTo(0, 12);
    }
  });

  it('retains exact apsis anchors and circular phase geometry', () => {
    for (const eccentricity of [0, 0.2, 0.6, 0.9745871228289062]) {
      for (const mean of [0, Math.PI, TAU]) {
        expect(anomaly(mean, eccentricity)).toBe(mean);
        const point = position(5, eccentricity, mean);
        expect(point.y).toBe(0);
        expect(point.r).toBeCloseTo(mean === Math.PI ? 5 * (1 + eccentricity) : 5 * (1 - eccentricity), 12);
      }
    }
    for (const mean of [0.2, 1, 2, 4, 6]) {
      const point = position(3, 0, mean);
      expect(point.E).toBe(mean);
      expect(point.x).toBeCloseTo(3 * Math.cos(mean), 12);
      expect(point.y).toBeCloseTo(3 * Math.sin(mean), 12);
      expect(point.r).toBe(3);
    }
  });
});

const snapshot = {
  route: 'earth-mars', from: 'Earth', to: 'Mars', planet: 'Mars', offset: 30,
  days: 258.9, referenceGap: 0, testGap: 0.78888045, timestamp: 100, missionStartedAt: 50,
};
const note = {
  snapshot, changed: 'destination', explanation: 'The test destination misses the spacecraft at arrival.',
  question: 'Would reversing the offset give the same gap?', savedSignature: 'earlier signature',
};

describe('restored transfer debrief reads', () => {
  it('retains valid numeric captures, writing and optional follow-up metadata without rewriting saves', () => {
    const followUp = { launchedAt: 90, offset: 30, prediction: 'The shifted destination will miss.' };
    const raw = { 'earth-mars': { ...note, snapshot: { ...snapshot, followUp } }, other: { draft: 'Retain other route' } };
    const before = structuredClone(raw);
    const view = readDebrief(raw, 'earth-mars');
    expect(view).not.toBe(raw['earth-mars']);
    expect(view.snapshot).toBe(raw['earth-mars'].snapshot);
    expect(view.snapshot.followUp).toBe(followUp);
    expect(view.explanation).toBe(note.explanation);
    expect(view.question).toBe(note.question);
    expect(view.savedSignature).toBe(note.savedSignature);
    expect(raw).toEqual(before);
  });

  it('treats absent, non-object, array and inherited route records as uncaptured', () => {
    for (const raw of [undefined, null, 'notes', [], { 'earth-mars': null }, { 'earth-mars': [] },
      { 'earth-mars': 'draft' }, Object.create({ 'earth-mars': note })]) {
      const view = readDebrief(raw, 'earth-mars');
      expect(view.snapshot).toBeNull();
      expect(view.explanation).toBe('');
      expect(view.question).toBe('');
      expect(view.savedSignature).toBe('');
    }
  });

  it('keeps incomplete or nonfinite snapshot fields out of rendered numeric readings', () => {
    const patches = [
      {}, { route: 'mars-earth' }, { from: '' }, { from: 'Mars' }, { to: {} }, { planet: [] },
      { offset: 0 }, { offset: NaN }, { offset: 91 }, { days: 0 }, { days: '258.9' },
      { referenceGap: -1 }, { referenceGap: Infinity }, { testGap: undefined }, { testGap: -1 }, { timestamp: Infinity },
    ];
    for (const patch of patches) {
      const raw = { 'earth-mars': { ...note, snapshot: Object.keys(patch).length ? { ...snapshot, ...patch } : {} } };
      const original = raw['earth-mars'].snapshot;
      const before = structuredClone(raw);
      expect(readDebrief(raw, 'earth-mars').snapshot).toBeNull();
      expect(raw['earth-mars'].snapshot).toBe(original);
      expect(raw).toEqual(before);
    }
  });

  it('rejects malformed prediction links without rendering object children or silently repairing captures', () => {
    for (const followUp of [false, [], {}, { launchedAt: 90, offset: 30, prediction: {} },
      { launchedAt: Infinity, offset: 30, prediction: 'Predict a miss' },
      { launchedAt: 101, offset: 30, prediction: 'Predict a miss' },
      { launchedAt: 90, offset: -30, prediction: 'Predict a miss' }]) {
      const raw = { 'earth-mars': { ...note, snapshot: { ...snapshot, followUp } } };
      const original = raw['earth-mars'].snapshot;
      expect(readDebrief(raw, 'earth-mars').snapshot).toBeNull();
      expect(raw['earth-mars'].snapshot).toBe(original);
      expect(raw['earth-mars'].snapshot.followUp).toBe(followUp);
    }
  });

  it('derives empty writing for malformed fields while retaining a valid capture and raw drafts', () => {
    const raw = { 'earth-mars': { ...note, changed: {}, explanation: 42, question: ['question'], savedSignature: true } };
    const before = structuredClone(raw);
    const view = readDebrief(raw, 'earth-mars');
    expect(view.snapshot).toBe(snapshot);
    expect(view.changed).toBe('');
    expect(view.explanation).toBe('');
    expect(view.question).toBe('');
    expect(view.savedSignature).toBe('');
    expect(raw).toEqual(before);
  });
});
