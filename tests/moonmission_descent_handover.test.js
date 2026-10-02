import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, newStore, makeCtx } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
const clone = value => JSON.parse(JSON.stringify(value));
function completed(duration = 720, extra = {}) {
  const profile = P.approachProfile({ duration });
  return { difficulty: 'pilot', approachPlan: { ...profile.plan },
    approachRun: { version: 1, duration, time: profile.summary.duration, recorded: true },
    approachResult: { ...profile.summary }, ...extra };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const hit = find(child, predicate); if (hit) return hit; } return null; }
  return predicate(node) ? node : find(node.props?.children, predicate);
}
const text = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number'
  ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children);
function app(extra = {}) {
  const store = newStore({ moonMission: { missionPhase: 5, missionXP: 0, missionLog: [], soundOff: true, animPaused: true, ...extra } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData }, store));
  return { store, tree, data: () => store.toolData.moonMission,
    begin() { const button = find(tree(), n => n.type === 'button' && n.props['data-descent-begin']); expect(button).toBeTruthy(); button.props.onClick(); } };
}
const effects = (hoverFuel, drift = 0, boulders = false) => [{
  title: 'Descent decision', chosen: 'Continue',
  effects: { hoverFuel, drift, ...(boulders ? { site: 'boulders' } : {}) },
}];

describe('computed approach to manual landing handover', () => {
  it.each([600, 720, 900])('carries the %s second crossing into the local flight without resetting mass or motion', duration => {
    const profile = P.approachProfile({ duration }), end = profile.samples.at(-1);
    const receipt = P.descentHandover(completed(duration)), D = P.descent;
    const reserve = D.isp * D.earthG / D.g * Math.log(end.mass / D.dryMass);
    expect(receipt).toMatchObject({ version: 1, source: 'approach', difficulty: 'pilot', planDuration: duration,
      requestedEventFuel: 0, eventFuelApplied: 0, eventDrift: 0, boulders: false });
    expect(receipt.priorTime).toBe(end.time);
    expect(receipt.priorDownrange).toBe(end.downrange);
    expect(receipt.baseFuel).toBeCloseTo(reserve, 10);
    expect(receipt.mass).toBeCloseTo(end.mass, 9);
    expect(receipt.propellant).toBeCloseTo(end.mass - D.dryMass, 9);
    expect(receipt.state).toEqual({ alt: end.altitude, vVel: end.radialSpeed, hVel: end.tangentialSpeed,
      fuel: receipt.baseFuel, thrust: end.throttle, tilt: end.pitch, x: 0, elapsed: 0 });
    expect(P.descentMass(receipt.state.fuel)).toBeCloseTo(end.mass, 9);
    expect(P.cleanDescentStart(receipt)).toEqual(receipt);
  });

  it('keeps measured flight independent of difficulty while practice uses the selected reserve', () => {
    const actual = ['tourist', 'pilot', 'commander'].map(difficulty => P.descentHandover(completed(720, { difficulty })));
    expect(actual.map(r => r.state)).toEqual([actual[0].state, actual[0].state, actual[0].state]);
    for (const [difficulty, fuel] of [['tourist', 160], ['pilot', 110], ['commander', 90]]) {
      const receipt = P.descentHandover(completed(720, { difficulty, descentMode: 'practice' }));
      expect(receipt).toMatchObject({ source: 'practice', difficulty, planDuration: null, priorTime: 0, priorDownrange: 0, baseFuel: fuel });
      expect(receipt.state).toEqual({ alt: P.descent.handoverAlt, vVel: P.descent.handoverVv,
        hVel: P.descent.handoverHv, fuel, thrust: 0, tilt: 0, x: 0, elapsed: 0 });
    }
  });

  it('requires a validated recorded approach rather than a claimed completion or a result alone', () => {
    const good = completed(), corrupt = clone(good); corrupt.approachResult.mass += 1;
    for (const raw of [{}, { approachResult: good.approachResult }, corrupt,
      { ...good, approachRun: { ...good.approachRun, recorded: false } },
      { ...good, approachRun: { ...good.approachRun, version: 2 } },
      { ...good, approachPlan: { version: 1, duration: 900 } }]) {
      const receipt = P.descentHandover(raw);
      expect(receipt.source).toBe('practice'); expect(receipt.state.fuel).toBe(110);
    }
    const rewound = P.descentHandover({ ...good, approachRun: { ...good.approachRun, time: 100 } });
    expect(rewound.source).toBe('approach');
    expect(rewound.priorTime).toBe(good.approachResult.duration);
  });

  it('applies authored fuel and drift once, with zero fuel allowed and no artificial ten second floor', () => {
    const clean = P.descentHandover(completed()), cost = P.descentHandover(completed(720, { decisionLog: effects(10, 3, true) }));
    expect(cost.baseFuel).toBe(clean.baseFuel);
    expect(cost.requestedEventFuel).toBe(10); expect(cost.eventFuelApplied).toBe(10);
    expect(cost.state.fuel).toBeCloseTo(clean.state.fuel - 10, 10);
    expect(cost.state.hVel).toBe(clean.state.hVel + 3); expect(cost.boulders).toBe(true);
    expect(cost.mass).toBeCloseTo(P.descentMass(cost.state.fuel), 10);
    expect(P.cleanDescentStart(cost)).toEqual(cost);
    for (const raw of [completed(900, { decisionLog: effects(1000) }),
      { difficulty: 'commander', descentMode: 'practice', decisionLog: effects(1000) }]) {
      const empty = P.descentHandover(raw);
      expect(empty.state.fuel).toBe(0); expect(empty.mass).toBe(P.descent.dryMass);
      expect(empty.propellant).toBe(0); expect(empty.state.thrust).toBe(0);
      expect(empty.eventFuelApplied).toBe(empty.baseFuel); expect(empty.requestedEventFuel).toBe(1000);
    }
  });

  it('returns detached receipts and validates the snapshot independently of future planner choices', () => {
    const raw = completed(600, { decisionLog: effects(8, 3) }), before = clone(raw);
    const receipt = P.descentHandover(raw), restored = P.cleanDescentStart(clone(receipt));
    expect(restored).toEqual(receipt); expect(restored).not.toBe(receipt); expect(restored.state).not.toBe(receipt.state);
    const future = completed(900, { descentStart: clone(receipt) });
    expect(P.descentHandover(future).planDuration).toBe(900);
    expect(P.cleanDescentStart(future.descentStart)).toEqual(receipt);
    expect(raw).toEqual(before);
    const altered = clone(receipt); altered.state.alt = 1;
    expect(P.cleanDescentStart(receipt).state.alt).toBeCloseTo(300, 6);
    expect(P.cleanDescentStart(altered)).toBeNull();
  });

  it('rejects corruption of every claimed receipt field instead of accepting partial saved evidence', () => {
    for (const receipt of [P.descentHandover(completed(600, { decisionLog: effects(8, 3, true) })),
      P.descentHandover({ descentMode: 'practice', difficulty: 'commander', decisionLog: effects(10, 3) })]) {
      for (const key of Object.keys(receipt)) {
        const bad = clone(receipt);
        if (key === 'state') { bad.state = null; }
        else if (key === 'version') { bad[key] = 2; }
        else if (key === 'source' || key === 'difficulty') { bad[key] = 'forged'; }
        else if (key === 'boulders') { bad[key] = 'true'; }
        else if (key === 'planDuration') { bad[key] = 721; }
        else { bad[key] = Number.NaN; }
        expect(P.cleanDescentStart(bad), `${receipt.source}: ${key}`).toBeNull();
        const missing = clone(receipt); delete missing[key];
        expect(P.cleanDescentStart(missing), `${receipt.source}: missing ${key}`).toBeNull();
      }
      for (const key of Object.keys(receipt.state)) {
        const bad = clone(receipt); bad.state[key] += 1;
        expect(P.cleanDescentStart(bad), `${receipt.source}: state.${key}`).toBeNull();
      }
      for (const key of ['mass', 'propellant', 'baseFuel', 'priorTime', 'priorDownrange', 'eventFuelApplied']) {
        const bad = clone(receipt); bad[key] += 1;
        expect(P.cleanDescentStart(bad), `${receipt.source}: changed ${key}`).toBeNull();
      }
    }
    for (const raw of [null, {}, [], 'receipt']) expect(P.cleanDescentStart(raw)).toBeNull();
  });

  it('makes the same pilot command respond to the actual remaining tank mass', () => {
    const short = P.descentHandover(completed(600)), long = P.descentHandover(completed(900));
    const a = clone(short.state), b = clone(long.state);
    expect(short.mass).toBeGreaterThan(long.mass); expect(a.fuel).toBeGreaterThan(b.fuel);
    for (let i = 0; i < 120; i++) { P.descentStep(a, { throttle: 0.6 }, 1 / 60); P.descentStep(b, { throttle: 0.6 }, 1 / 60); }
    expect(b.vVel).toBeGreaterThan(a.vVel);
    expect(a.fuel).toBeLessThan(short.state.fuel); expect(b.fuel).toBeLessThan(long.state.fuel);
    expect(P.descentMass(a.fuel)).toBeGreaterThan(P.descentMass(b.fuel));
  });


  it('stores the validated start receipt when Begin is pressed, before the live canvas is mounted', () => {
    const raw = completed(600, { decisionLog: effects(8, 3) }), expected = P.descentHandover(raw), view = app(raw);
    expect(view.data().descentStarted).not.toBe(true); view.begin();
    expect(view.data().descentStarted).toBe(true); expect(view.data().descentStart).toEqual(expected);
    expect(P.cleanDescentStart(view.data().descentStart)).toEqual(expected);
    Object.assign(view.data(), completed(900)); view.tree();
    expect(view.data().descentStart).toEqual(expected); expect(view.data().missionXP).toBe(0);
  });

  it('keeps a completed legacy landing without a receipt in practice when retrying', () => {
    const legacy = { crashed: true, vVel: 22, hVel: 4, score: 0, grade: '', fuel: 95, fuelUnit: 's' };
    const view = app({ ...completed(900), descentStarted: true, landingResult: legacy, landingAttempts: [legacy] });
    const retry = find(view.tree(), n => n.type === 'button' && n.props['aria-label'] === 'Retry the powered descent from the start');
    expect(retry).toBeTruthy(); retry.props.onClick(); view.begin();
    expect(view.data().descentStart.source).toBe('practice'); expect(view.data().descentStart.state.fuel).toBe(110);
    expect(view.data().landingAttempts).toEqual([legacy]); expect(view.data().missionXP).toBe(0);
  });

  it('retains detached landing provenance in the flight report and replay archive after planner changes', () => {
    const receipt = P.descentHandover(completed(600)), result = { crashed: false, vVel: 1, hVel: 0.5, score: 80,
      grade: 'A', fuel: 40, fuelUnit: 's', start: clone(receipt) };
    const raw = { ...completed(900), missionPhase: 10, landingResult: result, landingAttempts: [result] };
    const summary = P.flightSummary(raw);
    expect(summary.landing.start).toEqual(receipt); expect(summary.landing.start).not.toBe(result.start);
    expect(summary.landing.start.state).not.toBe(result.start.state);
    expect(P.flightReport(summary)).toContain('Landing start: Computed handover (600 s guidance)');
    expect(P.flightReport(summary)).toContain('Powered segment: ' + receipt.priorTime.toFixed(1) + ' s');
    const view = app(raw), replay = find(view.tree(), n => n.type === 'button' && /Fly Another Mission/.test(text(n.props.children)));
    expect(replay).toBeTruthy(); replay.props.onClick();
    expect(view.data().flightHistory.at(-1).landing.start).toEqual(receipt);
    expect(view.data().descentStart).toBeNull(); expect(view.data().landingResult).toBeNull();
    const bad = clone(receipt); bad.mass += 1;
    expect(P.flightSummary({ ...raw, landingResult: { ...result, start: bad } }).landing.start).toBeNull();
  });

  it('keeps retained practice labels and computed availability tied to the immutable receipt', () => {
    const practice = P.descentHandover({ descentMode: 'practice', difficulty: 'pilot' });
    const view = app({ difficulty: 'commander', descentMode: 'practice', descentStart: practice });
    const card = find(view.tree(), n => n.props?.['data-descent-start-card']);
    expect(text(card)).toContain('Pilot difficulty sets this practice reserve');
    expect(text(card)).toContain('110.0 s');
    const computed = app({ descentMode: 'approach', descentStart: P.descentHandover(completed(600)) });
    const radio = find(computed.tree(), n => n.props?.['data-descent-start-mode'] === 'approach');
    expect(radio.props.disabled).toBe(false); expect(radio.props.checked).toBe(true);
  });

  it('bounds hostile aggregate scenario inputs without introducing fuel or infinite motion', () => {
    const raw = completed(720, { decisionLog: Array.from({ length: 1100 }, () => ({ effects: {
      hoverFuel: Number.MAX_VALUE, drift: Number.MAX_VALUE, site: 'boulders' } })) });
    const receipt = P.descentHandover(raw);
    expect(receipt.state.fuel).toBe(0); expect(receipt.state.thrust).toBe(0);
    expect(receipt.requestedEventFuel).toBe(1000000); expect(receipt.eventDrift).toBe(10000);
    expect(Object.values(receipt.state).every(Number.isFinite)).toBe(true);
    expect(P.cleanDescentStart(receipt)).toEqual(receipt);
  });

  it('begins the first manual step with inherited actual throttle and attitude, including engine impulse', () => {
    const receipt = P.descentHandover(completed()), st = clone(receipt.state), D = P.descent;
    const dt = 1 / 120, m0 = receipt.mass, throttle = st.thrust, initialTilt = st.tilt;
    const spent = throttle * D.maxThrust * dt / (D.isp * D.earthG);
    const impulse = D.isp * D.earthG * Math.log(m0 / (m0 - spent));
    const midTilt = initialTilt * Math.exp(-dt / (2 * D.attitudeLag));
    const expectedV = st.vVel + impulse * Math.cos(midTilt) - P.lunarGravity(st.alt + st.vVel * dt / 2) * dt;
    const expectedH = st.hVel + impulse * Math.sin(midTilt);
    P.descentStep(st, { throttle }, dt);
    expect(st.thrust).toBeCloseTo(throttle, 12);
    expect(st.vVel).toBeCloseTo(expectedV, 10); expect(st.hVel).toBeCloseTo(expectedH, 10);
    expect(st.tilt).toBeCloseTo(initialTilt * Math.exp(-dt / D.attitudeLag), 12);
    expect(P.descentMass(st.fuel)).toBeCloseTo(m0 - spent, 9);
    expect(st.elapsed).toBe(dt); expect(st.alt).toBeLessThan(receipt.state.alt);
  });
});
