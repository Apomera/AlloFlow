import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('Beehive Queen mode - real-time RTS behavior', () => {
  let host;
  let root;
  let latest;
  let config;
  let originalRaf;
  let originalCancelRaf;

  async function mountQueen(overrides = {}) {
    const initialQueen = Object.assign({
      active: true,
      paused: false,
      speed: 1,
      day: 0,
      hiveHealth: 100,
      territory: 50,
      rival: { name: 'Thistle Crown', health: 100, strength: 360, stores: 35, structures: 3, pressure: 10, intel: 0 },
    }, overrides);
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', queen: initialQueen } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
  }

  beforeEach(() => {
    vi.useFakeTimers();
    resetStemLab();
    config = loadTool('stem_lab/stem_tool_beehive.js', 'beehive');
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform: vi.fn() });
    originalRaf = globalThis.requestAnimationFrame;
    originalCancelRaf = globalThis.cancelAnimationFrame;
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn(() => 1);
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = vi.fn();
    host = document.createElement('div');
    document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    if (host) host.remove();
    globalThis.requestAnimationFrame = window.requestAnimationFrame = originalRaf;
    globalThis.cancelAnimationFrame = window.cancelAnimationFrame = originalCancelRaf;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('advances economy and rival AI automatically at 1x speed', async () => {
    await mountQueen();
    expect(latest.beehive.queen.day).toBe(0);

    await act(async () => { vi.advanceTimersByTime(2450); await Promise.resolve(); });

    expect(latest.beehive.queen.day).toBe(1);
    expect(latest.beehive.queen.rival.strength).toBeGreaterThan(360);
    expect(latest.beehive.queen.feedback.text).toContain('Cycle 1');
    expect(host.textContent).toContain('Cycle 1');
    expect(latest.beehive.queen.lastImpact.kind).toBe('cycle');
    expect(latest.beehive.queen.lastImpact.cycle).toBe(1);
    expect(latest.beehive.queen.lastImpact.changes.some((change) => change.label === 'Rival power')).toBe(true);
    expect(latest.beehive.queen.lastImpact.changes.some((change) => change.label === 'QMP')).toBe(true);
    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    expect(timeline.querySelector('[data-rts-impact-kind="cycle"]')).toBeTruthy();
    expect(timeline.querySelector('[data-rts-impact-metric="rival-power"]')).toBeTruthy();
    expect(timeline.querySelectorAll('[data-rts-forecast]')).toHaveLength(3);
  });

  it('stops simulation cycles while paused', async () => {
    await mountQueen({ paused: true });
    await act(async () => { vi.advanceTimersByTime(7200); await Promise.resolve(); });

    expect(latest.beehive.queen.day).toBe(0);
    expect(host.textContent).toContain('PAUSED');
  });

  it('keeps the contextual recommendation actionable when scouting is unaffordable', async () => {
    await mountQueen();
    expect(host.querySelector('[data-beehive-coach-action="scout-rival"]')).toBeTruthy();

    await mountQueen({ resources: { nectar: 1, pollen: 20, wax: 1, royalJelly: 5 } });
    const fallback = host.querySelector('[data-beehive-coach-action="pause-plan"] button');
    expect(fallback).toBeTruthy();
    expect(fallback.textContent).toContain('Pause & plan');
    expect(host.textContent).toContain('Wait for nectar, then scout');
    await act(async () => { fallback.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.paused).toBe(true);
  });

  it('surfaces economy, territory, pause, and placement feedback on the battlefield', async () => {
    await mountQueen({
      paused: true,
      buildMode: 'guard',
      threats: [{ id: 'wasp-1', type: 'wasp', label: 'Wasp raiders', icon: '!', hp: 20, maxHp: 20, strength: 20 }]
    });

    expect(host.querySelector('[data-beehive-rts-economy="true"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-battlefield-overlay="true"]')).toBeTruthy();
    expect(host.querySelector('[data-beehive-command-sequence="true"]')).toBeTruthy();
    expect(host.querySelectorAll('[data-command-ready]').length).toBeGreaterThan(0);
    expect(host.querySelectorAll('[data-structure-ready]').length).toBeGreaterThan(0);
    expect(host.querySelector('[data-structure-preview="brood"]').textContent).toContain('nurse and forager capacity');
    expect(host.querySelector('[data-structure-ready="true"][aria-label*="Effect:"]')).toBeTruthy();
    expect(host.textContent).toContain('TACTICAL PAUSE');
    expect(host.textContent).toContain('PLACE GUARD POST');
    expect(host.textContent).toContain('1 active threat');
    expect(host.textContent).toContain('Live economy');
    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    expect(timeline).toBeTruthy();
    expect(timeline.getAttribute('aria-labelledby')).toBe('beehive-rts-timeline-title');
    expect(timeline.querySelector('[data-rts-impact-kind="awaiting"]')).toBeTruthy();
    expect(timeline.querySelector('[data-rts-forecast="next-cycle"]').textContent).toContain('Clock paused');
    expect(timeline.querySelector('[data-rts-forecast="raid"]').textContent).toContain('4 cycles');
    expect(timeline.querySelector('[data-rts-forecast="rival-build"]').textContent).toContain('5 cycles');
  });

  it('puts the battlefield first and makes essential commands immediately actionable', async () => {
    await mountQueen({ paused: true });
    const canvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    const dock = host.querySelector('[data-beehive-battlefield-dock="true"]');
    const timeline = host.querySelector('[data-beehive-rts-timeline="true"]');
    const advisor = host.querySelector('[aria-label="Strategic advisor"]');
    expect(canvas).toBeTruthy();
    expect(dock).toBeTruthy();
    expect(timeline).toBeTruthy();
    expect(advisor).toBeTruthy();
    expect(canvas.compareDocumentPosition(dock) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(dock.compareDocumentPosition(timeline) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(timeline.compareDocumentPosition(advisor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const scout = dock.querySelector('[data-quick-command="scout_rival"]');
    expect(scout).toBeTruthy();
    expect(scout.disabled).toBe(false);
    expect(scout.getAttribute('aria-label')).toContain('Effect: Reveal rival power; shift forage +2% immediately.');
    expect(dock.querySelector('[data-command-preview="scout_rival"]').textContent).toContain('Reveal rival power');
    await act(async () => { scout.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.rival.intel).toBeGreaterThan(0);
    expect(host.textContent).toContain('Rival intel');
    expect(latest.beehive.queen.lastImpact.kind).toBe('command');
    expect(latest.beehive.queen.lastImpact.title).toBe('Scout Rival');
    expect(latest.beehive.queen.lastImpact.changes.map((change) => change.label)).toEqual(expect.arrayContaining(['Forage control', 'Rival intel', 'Scouts', 'Nectar']));
    const impact = host.querySelector('[data-rts-impact-kind="command"]');
    expect(impact.textContent).toContain('Scouts report rival power');
    expect(impact.querySelector('[data-rts-impact-metric="rival-intel"]')).toBeTruthy();
  });

  it('uses structure selection plus a battlefield click for direct building', async () => {
    await mountQueen({ paused: true });
    const guardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Guard Post'));
    expect(guardButton).toBeTruthy();

    await act(async () => { guardButton.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.buildMode).toBe('guard');

    const canvas = host.querySelector('[data-beehive-queen-canvas="true"]');
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 400, right: 500, bottom: 400, x: 0, y: 0, toJSON() {} });
    await act(async () => {
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 150, clientY: 180 }));
      await Promise.resolve();
    });

    expect(latest.beehive.queen.structures).toHaveLength(4);
    expect(latest.beehive.queen.structures.at(-1).type).toBe('guard');
    expect(latest.beehive.queen.structures.at(-1).x).toBeCloseTo(0.3);
    expect(latest.beehive.queen.buildMode).toBeNull();
    expect(latest.beehive.queen.feedback.text).toContain('Guard Post online');
    expect(latest.beehive.queen.lastImpact.kind).toBe('structure');
    expect(latest.beehive.queen.lastImpact.title).toBe('Guard Post built');
    expect(latest.beehive.queen.lastImpact.changes.map((change) => change.label)).toEqual(expect.arrayContaining(['Structures', 'Wax']));
    const buildImpact = host.querySelector('[data-rts-impact-kind="structure"]');
    expect(buildImpact.querySelector('[data-rts-impact-metric="structures"]')).toBeTruthy();
    expect(buildImpact.querySelector('[data-rts-impact-why="true"]').textContent).toContain('completed at the selected comb cell');
  });

  it('offers non-canvas placement shortcuts for keyboard and touch users', async () => {
    await mountQueen({ paused: true });
    const guardButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Guard Post'));
    await act(async () => { guardButton.click(); await Promise.resolve(); });
    const innerCore = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Inner core'));
    expect(innerCore).toBeTruthy();

    await act(async () => { innerCore.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.structures).toHaveLength(4);
    expect(latest.beehive.queen.structures.at(-1).type).toBe('guard');
    expect(latest.beehive.queen.structures.at(-1).x).toBeCloseTo(0.18);
    expect(latest.beehive.queen.buildMode).toBeNull();
  });

  it('persists native learning and mastery disclosure state', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'beekeeper', beeView: 'scene', day: 5 } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

    const brief = host.querySelector('[data-beehive-learning-brief="true"]');
    const journey = host.querySelector('[data-beehive-journey-disclosure="true"]');
    expect(brief.open).toBe(false);
    expect(journey.open).toBe(false);

    await act(async () => { brief.open = true; brief.dispatchEvent(new Event('toggle')); await Promise.resolve(); });
    expect(latest.beehive.missionBriefOpen).toBe(true);
    await act(async () => { journey.open = true; journey.dispatchEvent(new Event('toggle')); await Promise.resolve(); });
    expect(latest.beehive.journeyOpen).toBe(true);
  });

  it('exposes Beekeeper scene hotspots as real keyboard and touch controls', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'beekeeper', beeView: 'scene', day: 5 } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });

    const dock = host.querySelector('[data-beehive-scene-actions="true"]');
    expect(dock).toBeTruthy();
    const inspect = Array.from(dock.querySelectorAll('button')).find((button) => button.textContent.includes('Inspect hive'));
    const meadow = Array.from(dock.querySelectorAll('button')).find((button) => button.textContent.includes('Explore meadow'));
    expect(inspect).toBeTruthy();
    expect(meadow).toBeTruthy();

    await act(async () => { inspect.click(); await Promise.resolve(); });
    expect(latest.beehive.showInspect).toBe(true);
    await act(async () => { meadow.click(); await Promise.resolve(); });
    expect(latest.beehive.beeView).toBe('pollination');
  });

  it('pauses and resumes Drone Flight from the visible control panel', async () => {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'drone', drone: { active: true, paused: false, difficulty: 'easy' } } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const pauseButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Pause flight'));
    expect(pauseButton).toBeTruthy();
    await act(async () => { pauseButton.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(true);
    expect(host.textContent).toContain('Resume flight');

    const resumeButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Resume flight'));
    await act(async () => { resumeButton.click(); await Promise.resolve(); });
    expect(latest.beehive.drone.paused).toBe(false);
  });

  it('blocks Beekeeper fast-forward while a decision event is unresolved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const event = { id: 'storm', emoji: '!', label: 'Storm front', desc: 'High winds reach the apiary.', effect: { honey: -2 }, lesson: 'Colonies shelter during storms.' };
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'beekeeper', day: 10, activeEvent: event } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const fastForward = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('5 days'));
    expect(fastForward).toBeTruthy();
    await act(async () => { fastForward.click(); await Promise.resolve(); });
    expect(latest.beehive.day).toBe(10);
  });

  it('starts the selected Expert rival with genuinely stronger RTS parameters', async () => {
    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'queen', queen: { active: false, difficulty: 'standard', career: { matches: 0, wins: 0, bestCycle: null, bestScore: 0 } } } });
      latest = toolData;
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    const expertButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Expert') && button.textContent.includes('Nightshade Wing'));
    expect(expertButton).toBeTruthy();
    await act(async () => { expertButton.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.difficulty).toBe('expert');

    const beginButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Begin Your Reign'));
    await act(async () => { beginButton.click(); await Promise.resolve(); });
    expect(latest.beehive.queen.active).toBe(true);
    expect(latest.beehive.queen.difficulty).toBe('expert');
    expect(latest.beehive.queen.rival.name).toBe('Nightshade Wing');
    expect(latest.beehive.queen.rival.strength).toBe(430);
    expect(latest.beehive.queen.resources.wax).toBe(11); // Expert start wax 9 + prepared field report +2
  });

  it('records an RTS victory once and preserves it as a journey milestone', async () => {
    await mountQueen({
      paused: true,
      rival: { name: 'Thistle Crown', health: 1, strength: 40, stores: 10, structures: 1, pressure: 5, intel: 100 },
      career: { matches: 0, wins: 0, bestCycle: null, bestScore: 0 },
      resultRecorded: false
    });
    const raidButton = Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Launch Raid'));
    expect(raidButton).toBeTruthy();
    await act(async () => { raidButton.click(); await Promise.resolve(); });

    expect(latest.beehive.queen.result).toBe('victory');
    expect(latest.beehive.queen.resultRecorded).toBe(true);
    expect(latest.beehive.queen.career.matches).toBe(1);
    expect(latest.beehive.queen.career.wins).toBe(1);
    expect(host.textContent).toContain('1 RTS win');
  });

  it('draws the live TAKE OFF - REACH DCA - FIND QUEEN route ribbon', async () => {
    let frameCallback;
    const gradient = { addColorStop: vi.fn() };
    const fillText = vi.fn();
    const context = new Proxy({
      setTransform: vi.fn(), fillText,
      measureText: vi.fn(() => ({ width: 80 })),
      createLinearGradient: vi.fn(() => gradient),
      createRadialGradient: vi.fn(() => gradient),
    }, {
      get(target, prop) {
        if (prop in target) return target[prop];
        target[prop] = vi.fn();
        return target[prop];
      },
      set(target, prop, value) { target[prop] = value; return true; },
    });
    window.HTMLCanvasElement.prototype.getContext.mockReturnValue(context);
    globalThis.requestAnimationFrame = window.requestAnimationFrame = vi.fn((cb) => { frameCallback = cb; return 1; });

    const Component = () => {
      const [toolData, setToolData] = React.useState({ beehive: { viewMode: 'drone', drone: { active: true, paused: false, difficulty: 'easy' } } });
      return config.render(makeCtx({ toolData, setToolData }));
    };
    await act(async () => { root.render(React.createElement(Component)); await Promise.resolve(); });
    expect(frameCallback).toBeTypeOf('function');
    const flightStart = performance.now();
    await act(async () => { frameCallback(flightStart + 300); await Promise.resolve(); });

    const route = host.querySelector('[data-beehive-flight-route="true"]');
    expect(route.querySelectorAll('[data-flight-checkpoint]')).toHaveLength(3);
    const envelope = host.querySelector('[data-beehive-flight-envelope="true"]');
    expect(envelope.querySelectorAll('[data-flight-envelope-item]')).toHaveLength(5);
    expect(envelope.getAttribute('data-envelope-overall')).toBe('caution');
    expect(envelope.querySelector('[data-flight-envelope-item="energy"] [data-envelope-value]').textContent).toContain('%');
    expect(envelope.querySelector('[data-flight-envelope-item="bearing"] [data-envelope-status]').textContent).toBe('Aligned');
    expect(envelope.querySelector('[data-flight-envelope-item="hazard"] [data-envelope-status]').textContent).toBe('Clear');
    expect(route.querySelector('[aria-current="step"]').getAttribute('data-flight-checkpoint')).toBe('boosts');
    const thrust = host.querySelector('[data-flight-control="ArrowUp"]');
    expect(thrust.getAttribute('data-control-active')).toBe('false');
    await act(async () => {
      thrust.dispatchEvent(new Event('pointerdown', { bubbles: true, cancelable: true }));
      frameCallback(flightStart + 700);
      await Promise.resolve();
    });
    expect(thrust.getAttribute('data-control-active')).toBe('true');
    expect(host.querySelector('[data-flight-maneuver="action"]').textContent).toContain('Thrust');
    expect(host.querySelector('[data-flight-maneuver="impact"]').textContent).toContain('Distance');
    expect(host.querySelector('[data-flight-maneuver="impact"]').textContent).toContain('Energy');
    expect(host.querySelector('[data-beehive-flight-instruments="true"]').getAttribute('aria-label')).toContain('Flight envelope Adjust');
    expect(host.querySelector('[data-beehive-flight-instruments="true"]').getAttribute('aria-label')).toContain('Current maneuver Thrust');
    expect(envelope.querySelector('[data-flight-envelope-item="speed"] [data-envelope-advice]').textContent).toContain('momentum');
    await act(async () => {
      thrust.dispatchEvent(new Event('pointerup', { bubbles: true, cancelable: true }));
      frameCallback(flightStart + 1100);
      await Promise.resolve();
    });
    expect(thrust.getAttribute('data-control-active')).toBe('false');
    expect(host.querySelector('[data-flight-maneuver="action"]').textContent).toBe('Glide');

    const labels = fillText.mock.calls.map((call) => String(call[0]));
    expect(labels.some((label) => label.includes('TAKE OFF'))).toBe(true);
    expect(labels.some((label) => label.includes('REACH DCA'))).toBe(true);
    expect(labels.some((label) => label.includes('FIND QUEEN'))).toBe(true);
  });
});