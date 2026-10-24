import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let tool, api, host, root, latest, xp, writes;
const hooks = () => window.__testHooks.flightSim;
const badgeSection = () => host.querySelector('#skyschool-sec-badges');
async function mount(seed = {}) {
  if (root) await act(async () => root.unmount());
  host?.remove();
  host = document.createElement('div'); document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  function App() {
    const [data, setData] = React.useState({ flightSim: { view: 'menu', menuSections: { badges: true }, railCollapsed: false, ...seed } });
    latest = data.flightSim;
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      awardXP: (id, points, reason, done) => { xp.push({ id, points, reason }); if (done) done(points); },
      update: (id, key, value) => {
        writes.push({ [key]: value });
        setData(previous => ({ ...previous, [id]: { ...previous[id], [key]: value } }));
      },
      updateMulti: (id, patch) => setData(previous => ({ ...previous, [id]: { ...previous[id], ...patch } })),
    }));
  }
  await act(async () => root.render(React.createElement(App)));
}
beforeEach(() => {
  vi.useFakeTimers(); resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; window.__testHooks = {};
  tool = loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
  xp = []; writes = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({});
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  delete window.__RR_TEST_EXPORTS__; delete window.__testHooks;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});

describe('Sky School saved badge evidence', () => {
  it('keeps only own current achievement IDs set to exact true without changing the save', () => {
    const saved = Object.assign(Object.create({ first_takeoff: true }), {
      mile_high: true, speed100: false, stratosphere: 'true', night_flight: 1, retired: true,
    });
    expect(api.normalizeFlightEarnedBadges(saved)).toEqual({ mile_high: true });
    expect(saved).toMatchObject({ mile_high: true, speed100: false, stratosphere: 'true', night_flight: 1, retired: true });
    expect(Object.hasOwn(saved, 'first_takeoff')).toBe(false);
  });

  it('does not manufacture badges from malformed saved containers', () => {
    for (const saved of [undefined, null, false, 'first_takeoff', ['mile_high'], 7]) {
      expect(api.normalizeFlightEarnedBadges(saved)).toEqual({});
    }
    const savedArray = []; savedArray.first_takeoff = true;
    expect(api.normalizeFlightEarnedBadges(savedArray)).toEqual({});
  });

  it('uses the same valid badge count and locked states throughout the menu', async () => {
    const saved = Object.assign(Object.create({ first_takeoff: true }), {
      mile_high: true, speed100: false, stratosphere: 'true', retired: true,
    });
    await mount({ earnedBadges: saved });
    const section = badgeSection();
    expect(section.textContent).toContain('1/' + api.ACHIEVEMENTS.length + ' earned');
    expect(section.querySelectorAll('[data-badge-state="earned"]')).toHaveLength(1);
    expect(section.querySelectorAll('[data-badge-state="locked"]')).toHaveLength(api.ACHIEVEMENTS.length - 1);
    expect(section.querySelector('[data-badge-state="earned"]').getAttribute('aria-label')).toContain('One Mile Up — earned.');
    expect(host.querySelector('[data-flightsim-briefing]').textContent).toContain('Badges1/' + api.ACHIEVEMENTS.length);
    expect(latest.earnedBadges).toBe(saved);
    expect(writes.filter(patch => Object.hasOwn(patch, 'earnedBadges'))).toHaveLength(0);
  });

  it('leaves all badges locked when a saved flag map is a string or array', async () => {
    for (const earnedBadges of ['first_takeoff', ['mile_high']]) {
      await mount({ earnedBadges });
      expect(badgeSection().textContent).toContain('0/' + api.ACHIEVEMENTS.length + ' earned');
      expect(badgeSection().querySelectorAll('[data-badge-state="earned"]')).toHaveLength(0);
    }
  });

  it('allows actual new evidence to earn a badge previously stored as a truthy invalid flag', async () => {
    await mount({ earnedBadges: { rescue_one: 'false', mile_high: true, retired: true }, rescuesCompleted: 1, unrelated: 'preserved' });
    await act(async () => hooks().checkAchievements());
    expect(latest.earnedBadges).toEqual({ mile_high: true, rescue_one: true });
    expect(latest.unrelated).toBe('preserved');
    expect(xp).toHaveLength(1);
    expect(xp[0].reason).toBe('SkySchool badge: Coast Guard Pilot');
    expect(badgeSection().textContent).toContain('2/' + api.ACHIEVEMENTS.length + ' earned');
    expect(badgeSection().querySelectorAll('[data-badge-state="earned"]')).toHaveLength(2);
  });

  it('does not award badges from invalid flags alone or rewrite a save just by checking', async () => {
    await mount({ earnedBadges: { first_takeoff: 'true', mile_high: 1, speed100: false, retired: true } });
    await act(async () => hooks().checkAchievements());
    expect(xp).toHaveLength(0);
    expect(writes.filter(patch => Object.hasOwn(patch, 'earnedBadges'))).toHaveLength(0);
    expect(badgeSection().querySelectorAll('[data-badge-state="earned"]')).toHaveLength(0);
  });

  it('retains genuine earlier badges and awards new evidence only once across same-tick checks and remount', async () => {
    await mount({ earnedBadges: { mile_high: true, rescue_one: false }, rescuesCompleted: 1 });
    await act(async () => { hooks().checkAchievements(); hooks().checkAchievements(); });
    expect(latest.earnedBadges).toEqual({ mile_high: true, rescue_one: true });
    expect(xp).toHaveLength(1);
    expect(writes.filter(patch => Object.hasOwn(patch, 'earnedBadges'))).toHaveLength(1);
    const saved = JSON.parse(JSON.stringify(latest));
    await mount(saved);
    await act(async () => hooks().checkAchievements());
    expect(xp).toHaveLength(1);
    expect(badgeSection().querySelectorAll('[data-badge-state="earned"]')).toHaveLength(2);
  });
  it('ignores duplicate and unknown airport visits when evaluating a new airport badge', async () => {
    await mount({ visitedAirports: ['kpwm', 'kpwm', 'retired', 'unknown', 'kpwm'] });
    await act(async () => hooks().checkAchievements());
    expect(latest.earnedBadges?.airports_3).not.toBe(true);
    expect(xp).toHaveLength(0);
    await mount({ visitedAirports: api.WAYPOINTS.slice(0, 3).map(item => item.id) });
    await act(async () => hooks().checkAchievements());
    expect(latest.earnedBadges.airports_3).toBe(true);
    expect(xp).toHaveLength(1);
  });

  it('does not award a rescue badge from malformed mission counters', async () => {
    for (const rescuesCompleted of ['1', Infinity, -1, 1.5]) {
      await mount({ rescuesCompleted });
      await act(async () => hooks().checkAchievements());
      expect(latest.earnedBadges?.rescue_one).not.toBe(true);
      expect(xp).toHaveLength(0);
    }
  });

  it('keeps Start Here mission progress consistent with valid completed mission counts', async () => {
    for (const [rescuesCompleted, surveysCompleted, done] of [
      ['1', 0, false], [0, '2', false], [Infinity, 0, false], [-1, 0, false],
      [0, 1.5, false], [1, 0, true], [0, 2, true],
    ]) {
      await mount({ rescuesCompleted, surveysCompleted });
      expect(host.querySelector('[data-flight-start-step="mission"]').getAttribute('data-done')).toBe(String(done));
    }
  });

  it('shows the same canonical badge count in the flying HUD and the saved debrief', async () => {
    await mount({ earnedBadges: { mile_high: true, speed100: false, stratosphere: 'true', retired: true } });
    const launch = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === 'Free Flight');
    expect(launch).toBeTruthy();
    await act(async () => launch.click());
    expect(latest.view).toBe('flying');
    expect(host.querySelector('[title="Badges earned"]').textContent).toContain('1/' + api.ACHIEVEMENTS.length);
    const exit = [...host.querySelectorAll('button')].find(node => node.textContent.trim() === '✕ Exit');
    expect(exit).toBeTruthy();
    await act(async () => exit.click());
    expect(latest.view).toBe('debrief');
    expect(latest.lastDebrief.badges).toBe(1);
    expect(latest.earnedBadges).toEqual({ mile_high: true, speed100: false, stratosphere: 'true', retired: true });
  });

});
