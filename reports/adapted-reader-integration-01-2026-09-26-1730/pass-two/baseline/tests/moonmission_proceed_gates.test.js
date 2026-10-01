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
    const orbit = mount({ missionPhase: 1, launchStatus: 'orbit', animPaused: false, missionXP: 0, missionLog: [] });
    expect(find(orbit, /Proceed to Earth orbit/i).disabled, 'enabled once in orbit').toBe(false);
  });

  it('a paused (or reduced-motion) student is never stranded on the pad', () => {
    // Pausing freezes the ascent, so waiting for orbit would be a dead end.
    const app = mount({ missionPhase: 1, launchStatus: 'countdown', animPaused: true, missionXP: 0, missionLog: [] });
    const btn = find(app, /Proceed to Earth orbit/i);
    expect(btn.disabled).toBe(false);
    btn.onClick();
    expect(app.mm().missionPhase).toBe(2);
  });

  it('a double click pays once and advances once', () => {
    // In orbit: the button now waits for the ascent, so orbit is the only moment a
    // double click can happen.
    const app = mount({ missionPhase: 1, launchStatus: 'orbit', missionXP: 0, missionLog: [] });
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

  it('an off-window TLI must answer the mid-course correction before arrival', () => {
    const open = mount({ missionPhase: 3, tliAccuracy: { onTime: false, offByDeg: 24 } });
    const arrive = find(open, /Arrive at the Moon/i);
    expect(arrive.disabled).toBe(true);
    expect(textOf(open.tree())).toMatch(/Arrival waits for that decision/);
    arrive.onClick();
    expect(open.mm().missionPhase).toBe(3);

    for (const choice of ['corrected', 'skipped']) {
      const done = mount({ missionPhase: 3, tliAccuracy: { onTime: false, offByDeg: 24 }, mccChoice: choice });
      expect(find(done, /Arrive at the Moon/i).disabled, choice).toBe(false);
    }
    const onTime = mount({ missionPhase: 3, tliAccuracy: { onTime: true, offByDeg: 0 } });
    expect(find(onTime, /Arrive at the Moon/i).disabled).toBe(false);
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
});
