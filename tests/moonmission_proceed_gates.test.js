// Moon Mission — one proceed per phase, and decisions that cannot be dodged.
//
// Drives the REAL onClick handlers: the tool uses no React hooks, so render(ctx)
// can be called directly and the returned element tree walked for buttons.
// Pins four holes a review found:
//   • while a mission event (or its outcome card) was on screen the phase buttons
//     stayed live — a second click paid XP and log again and re-rolled the event;
//   • the outcome card's Continue could later REWIND the mission to the event's
//     original target;
//   • after an off-window TLI, pressing Arrive without choosing cost nothing at
//     all, which beat both real mid-course options;
//   • Begin EVA was live the moment the descent started, so the one graded
//     piloting task could be skipped.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

function mount(state) {
  loadTool(FILE, ID);
  const store = newStore({ moonMission: Object.assign({}, state) });
  const tree = () => window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
  return { store, tree, mm: () => store.toolData.moonMission };
}

// Walk a React element tree and collect every <button> with its props.
function buttons(node, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => buttons(n, out)); return out; }
  if (node.type === 'button') out.push(node.props);
  const kids = node.props && node.props.children;
  if (kids != null) buttons(kids, out);
  return out;
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}
function find(app, re) {
  // Phase buttons are named by their text; the longer line is their title.
  const hit = buttons(app.tree()).filter((p) => re.test(String(p['aria-label'] || p.title || '')) || re.test(textOf(p.children)));
  if (hit.length !== 1) throw new Error('expected one button for ' + re + ', found ' + hit.length);
  return hit[0];
}

beforeEach(() => {
  resetStemLab();
  vi.spyOn(Math, 'random').mockReturnValue(0.999);   // no random event fires unless a test seeds one
});
afterEach(() => vi.restoreAllMocks());

const EVENT = { id: 'test_evt', title: 'Test event', scenario: 'x', options: [] };

function finishedEntryState(angle = -6.5) {
  loadTool(FILE, ID);
  const profile = window.MoonMissionPure.entryProfile(angle);
  const terminal = profile.events.splash ? 'splash' : 'skip';
  return {
    missionPhase: 9, missionXP: 0, missionLog: [], reentryStatus: terminal === 'splash' ? 4 : 5,
    entryRun: { version: 1, angle, time: profile.summary.duration, recovery: 0, recorded: true },
    entryOutcome: { ...profile.summary, angle, modelVersion: 1, completed: true, terminal },
  };
}

function finishedLaunchState() {
  loadTool(FILE, ID);
  const profile = window.MoonMissionPure.launchProfile();
  return {
    missionPhase: 1, missionXP: 0, missionLog: [], launchStatus: 'orbit',
    launchRun: { version: 1, time: profile.summary.duration, recorded: true },
    launchResult: { version: 1, ...profile.summary },
  };
}

// Mount the real canvas action dispatcher without painting a browser window. The
// result button delegates to this live instance rather than mutating saved state.
function attachLaunchCanvas(app) {
  let ref;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'canvas' && node.props['data-launch-canvas']) ref = node.ref || node.props.ref;
    walk(node.props && node.props.children);
  };
  walk(app.tree());
  const gradient = { addColorStop() {} };
  const context = new Proxy({}, { get: (target, key) => {
    if (key === 'measureText') return text => ({ width: String(text).length * 6 });
    if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
    return target[key] || (() => {});
  }, set: (target, key, value) => { target[key] = value; return true; } });
  const canvas = document.createElement('canvas');
  canvas.getContext = () => context;
  document.body.appendChild(canvas);
  let nextFrame;
  vi.stubGlobal('requestAnimationFrame', callback => { nextFrame = callback; return 1; });
  ref(canvas);
  return {
    event: { currentTarget: { closest: () => ({ querySelector: () => canvas }) } },
    close() { canvas.remove(); if (nextFrame) nextFrame(0); vi.unstubAllGlobals(); },
  };
}

describe('Moon Mission proceed gates', () => {
  it('a pending event disables the phase button, and its handler refuses too', () => {
    const app = mount({ missionPhase: 1, activeEvent: EVENT, eventPhaseTarget: 2, missionXP: 0 });
    const btn = find(app, /Proceed to Earth orbit/i);
    expect(btn.disabled).toBe(true);
    btn.onClick();
    expect(app.mm().missionPhase).toBe(1);
    expect(app.mm().missionXP).toBe(0);
  });

  it('an outcome card on screen blocks the phase button as well', () => {
    const app = mount({ missionPhase: 1, eventOutcome: { label: 'x', outcome: 'y' }, eventPhaseTarget: 2, missionXP: 0 });
    expect(find(app, /Proceed to Earth orbit/i).disabled).toBe(true);
  });

  it('the launch cannot be skipped: Proceed to Orbit waits for orbit', () => {
    // It was live from T-5: a click on the pad logged "Launch successful! Reached
    // Earth orbit" and paid 20 XP with the Saturn V still standing.
    for (const launchStatus of [undefined, 'countdown', 'stage1', 'stage2', 'stage3']) {
      const app = mount({ missionPhase: 1, launchStatus, animPaused: false, missionXP: 0, missionLog: [] });
      const btn = find(app, /Proceed to Earth orbit/i);
      expect(btn.disabled, `disabled at ${launchStatus || 'mount'}`).toBe(true);
      btn.onClick();
      expect(app.mm().missionPhase, `handler refuses at ${launchStatus || 'mount'}`).toBe(1);
      expect(app.mm().missionXP).toBe(0);
    }
    const orbit = mount(finishedLaunchState());
    expect(find(orbit, /Proceed to Earth orbit/i).disabled, 'enabled once in orbit').toBe(false);
  });

  it('a paused student can show the launch result before proceeding, without claiming orbit on the pad', () => {
    // Reduced motion retains a deliberate route forward, while the completion
    // gate still requires the model's insertion result.
    const app = mount({ missionPhase: 1, launchStatus: 'countdown', animPaused: true, missionXP: 0, missionLog: [] });
    const btn = find(app, /Proceed to Earth orbit/i);
    expect(btn.disabled).toBe(true);
    btn.onClick();
    expect(app.mm().missionPhase).toBe(1);
    expect(app.mm().missionXP).toBe(0);
    const launchCanvas = attachLaunchCanvas(app);
    try { find(app, /Show launch result/i).onClick(launchCanvas.event); }
    finally { launchCanvas.close(); }
    expect(app.mm().missionPhase).toBe(1);
    expect(app.mm().launchResult.outcome).toBe('orbit');
    expect(app.mm().launchRun.recorded).toBe(true);
    expect(app.mm().missionXP, 'viewing the result does not pay the proceed reward').toBe(0);
    const ready = find(app, /Proceed to Earth orbit/i);
    expect(ready.disabled).toBe(false);
    ready.onClick();
    expect(app.mm().missionPhase).toBe(2);
    expect(app.mm().missionXP).toBe(20);
  });

  it('a double click pays once and advances once', () => {
    // In orbit: the button now waits for the ascent, so orbit is the only moment a
    // double click can happen.
    const app = mount(finishedLaunchState());
    const btn = find(app, /Proceed to Earth orbit/i);
    btn.onClick();
    btn.onClick();
    expect(app.mm().missionPhase).toBe(2);
    expect(app.mm().missionXP).toBe(20);
  });

  it('Continue after an event only ever moves forward, and clears its target', () => {
    const back = mount({ missionPhase: 4, eventOutcome: { label: 'x', outcome: 'y' }, eventPhaseTarget: 3 });
    find(back, /Continue Mission/i).onClick();
    expect(back.mm().missionPhase).toBe(4);
    expect(back.mm().eventPhaseTarget).toBe(null);
    expect(back.mm().eventOutcome).toBe(null);

    const fwd = mount({ missionPhase: 3, eventOutcome: { label: 'x', outcome: 'y' }, eventPhaseTarget: 4 });
    find(fwd, /Continue Mission/i).onClick();
    expect(fwd.mm().missionPhase).toBe(4);
  });

  it('arrival requires a measured encounter regardless of earlier timing or correction choices', () => {
    const open = mount({ missionPhase: 3, tliAccuracy: { onTime: false, offByDeg: 24 } });
    const arrive = find(open, /Arrive at the Moon/i);
    expect(arrive.disabled).toBe(true);
    expect(textOf(open.tree())).toMatch(/Review a trajectory that reaches/);
    arrive.onClick();
    expect(open.mm().missionPhase).toBe(3);

    for (const choice of ['corrected', 'skipped']) {
      const done = mount({ missionPhase: 3, tliAccuracy: { onTime: false, offByDeg: 24 }, mccChoice: choice });
      expect(find(done, /Arrive at the Moon/i).disabled, choice).toBe(true);
    }
    const onTime = mount({ missionPhase: 3, tliAccuracy: { onTime: true, offByDeg: 0 } });
    expect(find(onTime, /Arrive at the Moon/i).disabled).toBe(true);
    const p = window.MoonMissionPure.transitProfile();
    const measured = mount({ missionPhase: 3, transitPlan: p.controls,
      transitRun: { version: 1, time: p.summary.duration, recorded: true }, transitResult: { version: 1, ...p.summary } });
    expect(find(measured, /Arrive at the Moon/i).disabled).toBe(false);
  });

  it('the moonwalk waits for a landing attempt', () => {
    const flying = mount({ missionPhase: 5, descentStarted: true });
    const eva = find(flying, /Begin extravehicular activity/i);
    expect(eva.disabled).toBe(true);
    expect(textOf(flying.tree())).toMatch(/unlocks once the lander is on the surface/);
    eva.onClick();
    expect(flying.mm().missionPhase).toBe(5);

    const landed = mount({ missionPhase: 5, descentStarted: true,
      landingResult: { crashed: false, score: 80, grade: 'B', vVel: 1.5, hVel: 1, fuel: 20 } });
    expect(find(landed, /Begin extravehicular activity/i).disabled).toBe(false);
  });

  it('entry completion requires the recorded physical splashdown, including when animation is paused', () => {
    const ready = finishedEntryState();
    const incompleteStates = [
      { entryRun: undefined, entryOutcome: undefined, reentryStatus: 0 },
      { entryRun: { ...ready.entryRun, time: ready.entryRun.time - 1, recorded: false }, entryOutcome: undefined },
      { entryRun: { ...ready.entryRun, recorded: false } },
      { entryOutcome: { ...ready.entryOutcome, completed: false } },
      { entryOutcome: { angle: -6.5, peakG: 6.5, outcome: 'nominal' } },
      { entryRun: undefined, reentryStatus: 4 },
    ];
    for (const incomplete of incompleteStates) {
      const app = mount({ ...ready, ...incomplete, animPaused: true });
      const button = find(app, /Complete the mission with Pacific Ocean splashdown/i);
      expect(button.disabled).toBe(true);
      button.onClick();
      expect(app.mm().missionPhase).toBe(9);
      expect(app.mm().missionXP).toBe(0);
    }
  });

  it('entry completion advances and pays its 50 XP only once', () => {
    const app = mount(finishedEntryState());
    const button = find(app, /Complete the mission with Pacific Ocean splashdown/i);
    expect(button.disabled).toBe(false);
    button.onClick();
    button.onClick();
    expect(app.mm().missionPhase).toBe(10);
    expect(app.mm().missionXP).toBe(50);
    expect(app.mm().missionLog.filter((entry) => /SPLASHDOWN! Mission complete/.test(entry.text))).toHaveLength(1);
  });

  it('reviewing an earlier entry moment preserves an already recorded splashdown', () => {
    const ready = finishedEntryState();
    const app = mount({ ...ready, animPaused: true, entryRun: { ...ready.entryRun, time: 120 } });
    const button = find(app, /Complete the mission with Pacific Ocean splashdown/i);
    expect(button.disabled).toBe(false);
    button.onClick();
    expect(app.mm().missionPhase).toBe(10);
    expect(app.mm().missionXP).toBe(50);
  });

  it('a terminal skip cannot complete the mission or collect splashdown XP', () => {
    const app = mount(finishedEntryState(-5));
    const button = find(app, /Complete the mission with Pacific Ocean splashdown/i);
    expect(button.disabled).toBe(true);
    button.onClick();
    expect(app.mm().missionPhase).toBe(9);
    expect(app.mm().missionXP).toBe(0);
  });

  it('a pending event or its outcome blocks entry completion even after physical splashdown', () => {
    for (const pending of [{ activeEvent: EVENT }, { eventOutcome: { label: 'x', outcome: 'y' } }]) {
      const app = mount({ ...finishedEntryState(), ...pending, eventPhaseTarget: 10 });
      const button = find(app, /Complete the mission with Pacific Ocean splashdown/i);
      expect(button.disabled).toBe(true);
      button.onClick();
      expect(app.mm().missionPhase).toBe(9);
      expect(app.mm().missionXP).toBe(0);
    }
  });
});
