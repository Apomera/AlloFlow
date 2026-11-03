import { writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { GlHarness } from './helpers/stem_gl_harness';

test.describe.configure({ timeout: 300_000, retries: 0 });
test.use({ trace: 'off', video: 'off' });
const harness = new GlHarness({
  toolFile: 'stem_lab/stem_tool_roadready.js', toolId: 'roadReady', width: 640, height: 480,
  preScripts: ['stem_lab/stem_lab_module.js'], probes: 'window.__testHooks = {};',
});
test.beforeAll(async () => { await harness.start(); });
test.afterAll(async () => { await harness.stop(); });
test.afterEach(async ({ page }) => { await harness.destroy(page); });

test('native siren audio follows approaching/receding motion and listener-relative stereo', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as any;
    w.__RR_TEST_EXPORTS__ = {};
    Math.random = () => 0.5;
    const probe = w.__sirenAudioProbe = { events: [], nodes: [], edges: new Map(), phase: null };
    const owners = new WeakMap();
    const base = w.BaseAudioContext.prototype;
    for (const [method, parameter] of [['createOscillator', 'frequency'], ['createStereoPanner', 'pan'],
      ['createBiquadFilter', 'frequency'], ['createGain', 'gain']]) {
      const original = base[method];
      base[method] = function (...args: any[]) {
        const node = original.apply(this, args), record = { node, method, id: probe.nodes.length };
        probe.nodes.push(record);
        owners.set(node[parameter], record);
        return node;
      };
    }
    const connect = w.AudioNode.prototype.connect;
    w.AudioNode.prototype.connect = function (...args: any[]) {
      const destinations = probe.edges.get(this) || [];
      destinations.push(args[0]); probe.edges.set(this, destinations);
      return connect.apply(this, args);
    };
    const reachesPanner = (node: any, depth = 0): boolean => {
      if (node instanceof w.StereoPannerNode) return true;
      return depth < 8 && (probe.edges.get(node) || []).some((next: any) => reachesPanner(next, depth + 1));
    };
    const target = w.AudioParam.prototype.setTargetAtTime;
    w.AudioParam.prototype.setTargetAtTime = function (value: number, time: number, constant: number) {
      const owner = owners.get(this), hook = w.__testHooks?.roadReady;
      if (probe.phase && hook?.emergencyRef.current && owner &&
          (owner.method === 'createStereoPanner' ||
            (owner.method === 'createOscillator' && reachesPanner(owner.node)))) {
        const source = hook.emergencyRef.current;
        probe.events.push({ phase: probe.phase.label,
          parameter: owner.method === 'createStereoPanner' ? 'pan' : 'frequency',
          value, time, constant, simTime: hook.timeRef.current,
          emittedFrequency: source.sirenFreq + Math.sin(hook.timeRef.current * 8) * 200,
          contextState: owner.node.context.state });
      }
      return target.call(this, value, time, constant);
    };
  });
  await harness.mount(page, { roadReady: { view: 'scenarioBriefing', scenario: 'suburban',
    pendingScenario: 'suburban', vehicle: 'sedan', reducedMotion: true, calmDrive: true,
    emergencyDrillMode: true,
  } }, undefined, { expectCanvas: false });
  await page.waitForFunction(() => !!(window as any).__testHooks?.roadReady?.startDriving);
  await page.evaluate(() => (window as any).__testHooks.roadReady.startDriving('suburban', 'sedan'));
  await page.getByRole('button', { name: 'Fasten seatbelt', exact: true }).click();
  await page.waitForFunction(() => (window as any).__testHooks.roadReady.timeRef.current >= 4.2,
    undefined, { timeout: 90_000 });
  await page.locator('#wrap').click({ position: { x: 4, y: 4 } });
  await page.evaluate(() => {
    const w = window as any, hook = w.__testHooks.roadReady;
    for (const ref of [hook.trafficRef, hook.pedsRef, hook.cyclistsRef, hook.signalsRef]) {
      Object.defineProperty(ref, 'current', { configurable: true, get: () => [], set: () => {} });
    }
    hook.wildlifeRef.current = null;
    hook.gearRef.current = 'P';
    hook.timeRef.current = 20.1;
  });
  await page.waitForFunction(() => {
    const w = window as any;
    return w.__testHooks.roadReady.emergencyRef.current &&
      w.__sirenAudioProbe.nodes.some((record: any) => record.method === 'createStereoPanner');
  }, undefined, { timeout: 90_000 });
  const graph = await page.evaluate(() => {
    const w = window as any, probe = w.__sirenAudioProbe;
    const oscillator = probe.nodes.find((record: any) => record.method === 'createOscillator' &&
      (probe.edges.get(record.node) || []).some((gain: any) =>
        (probe.edges.get(gain) || []).some((filter: any) =>
          (probe.edges.get(filter) || []).some((pan: any) => pan instanceof w.StereoPannerNode))));
    if (!oscillator) throw new Error('No oscillator connected through gain/filter/stereo panner');
    const gain = probe.edges.get(oscillator.node)[0];
    const filter = probe.edges.get(gain)[0], panner = probe.edges.get(filter)[0];
    return { connectedToDestination: (probe.edges.get(panner) || []).includes(oscillator.node.context.destination),
      initialGain: gain.gain.value, contextState: oscillator.node.context.state };
  });
  expect(graph.connectedToDestination).toBe(true);
  expect(graph.contextState).toBe('running');
  expect(graph.initialGain).toBeCloseTo(0.025, 5);

  const phases: any[] = [];
  for (const direction of [-1, 1]) for (const side of [-1, 1]) for (const motion of ['approaching', 'receding']) {
    const label = `${direction}/${side}/${motion}`;
    await page.evaluate(({ direction, side, motion, label }) => {
      const w = window as any, hook = w.__testHooks.roadReady, RR = w.__RR_TEST_EXPORTS__.roadReady;
      const world = hook.infiniteWorldRef.current, station = 80;
      const lane = -direction * (side > 0 ? 1.6 : 4.8);
      const playerPoint = RR.mainRoadWorldPoint(world, station, lane);
      Object.assign(hook.carRef.current, { x: playerPoint.x, y: playerPoint.y,
        heading: direction * Math.PI / 2 - playerPoint.heading, speed: 0 });
      const sourceLane = lane - direction * side * 3.2;
      const ahead = motion === 'approaching' ? -35 : 5;
      const sourcePoint = RR.mainRoadWorldPoint(world, station + ahead * direction, sourceLane);
      const previous = hook.emergencyRef.current;
      if (!previous) throw new Error('Emergency encounter ended between audio phases');
      hook.emergencyRef.current = { kind: previous.kind, sirenFreq: previous.sirenFreq,
        x: sourcePoint.x, y: sourcePoint.y, heading: direction * Math.PI / 2 - sourcePoint.heading,
        speed: 20, _cruiseSpeed: 20, _roadStation: station + ahead * direction,
        _laneOff: sourceLane, _homeLaneOff: sourceLane, _travelSign: direction,
        life: 1000, checked: true, responded: true };
      w.__sirenAudioProbe.phase = { label, started: hook.timeRef.current };
    }, { direction, side, motion, label });
    await page.waitForFunction(label => {
      const probe = (window as any).__sirenAudioProbe;
      return probe.events.filter((event: any) => event.phase === label && event.parameter === 'frequency').length >= 4;
    }, label, { timeout: 60_000 });
    const events = await page.evaluate(label => {
      const probe = (window as any).__sirenAudioProbe;
      probe.phase = null;
      return probe.events.filter((event: any) => event.phase === label);
    }, label);
    const frequency = events.filter((event: any) => event.parameter === 'frequency');
    const pan = events.filter((event: any) => event.parameter === 'pan');
    expect(frequency.length).toBeGreaterThanOrEqual(4);
    expect(pan.length).toBeGreaterThanOrEqual(4);
    expect(new Set(frequency.map((event: any) => event.simTime)).size).toBe(frequency.length);
    for (const event of frequency) {
      expect(event.contextState).toBe('running');
      if (motion === 'approaching') expect(event.value / event.emittedFrequency).toBeGreaterThan(1);
      else expect(event.value / event.emittedFrequency).toBeLessThan(1);
    }
    for (const event of pan) {
      expect(event.value * side).toBeGreaterThan(0);
      expect(Math.abs(event.value)).toBeLessThanOrEqual(1);
    }
    phases.push({ direction, side, motion, frequency, pan });
  }
  const stats = await page.evaluate(() => ({
    crashes: (window as any).__testHooks.roadReady.statsRef.current.crashes,
    errors: (window as any).__events.errors,
  }));
  expect(stats.crashes).toBe(0);
  expect(stats.errors).toEqual([]);
  await harness.destroy(page);
  await page.waitForFunction(() => (window as any).__sirenAudioProbe.nodes.every(
    (record: any) => record.node.context.state === 'closed'));
  writeFileSync('tmp/roadready-siren-pass/browser-result.json', JSON.stringify({
    graph, phases, stats, contextClosedOnUnmount: true,
  }, null, 2) + '\n');
});
