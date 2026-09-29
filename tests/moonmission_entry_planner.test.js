import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, newStore, resetStemLab, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const child of node) { const found = find(child, predicate); if (found) return found; } return null; }
  return predicate(node) ? node : find(node.props && node.props.children, predicate);
}
function mount(extra = {}) {
  const awardXP = vi.fn();
  const returnProfile = window.MoonMissionPure.returnProfile(extra.entryAngle);
  const arrival = { returnRun: { version: 1, angle: returnProfile.angle, time: returnProfile.summary.duration, recorded: true }, returnResult: { version: 1, ...returnProfile.summary } };
  const store = newStore({ moonMission: { missionPhase: 8, missionXP: 47, missionLog: [], ...arrival, ...extra } });
  const tree = () => window.StemLab._registry.moonMission.render(makeCtx({ toolData: store.toolData, awardXP }, store));
  const prop = (name, value) => find(tree(), (node) => node.props && node.props[name] === value).props;
  const html = () => { const el = document.createElement('div'); el.innerHTML = ReactDOMServer.renderToStaticMarkup(tree()); return el; };
  return { tree, prop, html, awardXP, data: () => store.toolData.moonMission };
}

beforeEach(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission');
  vi.spyOn(Math, 'random').mockReturnValue(0.999);
});
afterEach(() => vi.restoreAllMocks());

describe('entry planner uses the trajectory model', () => {
  it.each([
    ['shallow', -5, 'skip'],
    ['reference', -6.5, 'nominal'],
    ['steep', -9, 'steep'],
  ])('%s preset predicts the profile metrics at %s degrees', (id, angle, outcome) => {
    const app = mount();
    app.prop('data-entry-preset', id).onClick();
    const profile = window.MoonMissionPure.entryProfile(angle), page = app.html();
    const metric = (key) => page.querySelector('[data-entry-predicted-value="' + key + '"]').textContent;
    expect(app.data().entryAngle).toBe(angle);
    expect(page.querySelector('[data-entry-preset="' + id + '"]').getAttribute('aria-pressed')).toBe('true');
    expect(page.querySelector('[data-entry-predicted-outcome]').getAttribute('data-entry-predicted-outcome')).toBe(outcome);
    expect(profile.summary.outcome).toBe(outcome);
    expect(metric('peakG')).toBe(profile.summary.peakG.toFixed(1) + ' g');
    expect(metric('peakHeatFlux')).toBe((profile.summary.peakHeatFlux / 1e6).toFixed(2) + ' MW/m²');
    expect(metric('heatLoad')).toBe((profile.summary.heatLoad / 1e6).toFixed(1) + ' MJ/m²');
    expect(metric('duration')).toBe((profile.summary.duration / 60).toFixed(1) + ' min');
    expect(page.querySelector('[data-entry-plan-model-note]').textContent).toMatch(/approximate atmosphere.*convective energy transfer/);
    expect(app.data().entryOutcome).toBeUndefined();
    expect(app.data().missionXP).toBe(47);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('lets the slider choose only finite angles in its displayed range', () => {
    const app = mount();
    const slider = () => app.prop('id', 'mm-entry-angle');
    expect(slider().min).toBe(-9);
    expect(slider().max).toBe(-4);
    slider().onChange({ target: { value: '-7.1' } });
    expect(app.data().entryAngle).toBe(-7.1);
    expect(slider()['aria-valuetext']).toContain('-7.1 degrees');
    slider().onChange({ target: { value: 'NaN' } });
    expect(app.data().entryAngle).toBe(-7.1);
    slider().onChange({ target: { value: '-40' } });
    expect(app.data().entryAngle).toBe(-9);
    slider().onChange({ target: { value: '2' } });
    expect(app.data().entryAngle).toBe(-4);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('begins a fresh unrecorded run once, clears the former result and preserves attempts without XP', () => {
    const previous = { angle: -6.5, outcome: 'nominal', peakG: 6.9, completed: true, modelVersion: 1 };
    const attempts = [previous];
    const app = mount({ entryAngle: -5, entryOutcome: previous, entryAttempts: attempts,
      entryRun: { version: 1, angle: -6.5, time: 800, recovery: 7, recorded: true }, reentryStatus: 4,
      entryPaused: true, entryMigrationNote: 'Older result', animPaused: true });
    const begin = app.prop('data-entry-begin', 'true');
    begin.onClick();
    begin.onClick();
    expect(app.data().entryRun).toEqual({ version: 1, angle: -5, time: 0, recovery: 0, recorded: false });
    expect(app.data().entryOutcome).toBeNull();
    expect(app.data().reentryStatus).toBe(0);
    expect(app.data().entryPaused).toBe(false);
    expect(app.data().entryMigrationNote).toBeNull();
    expect(app.data().animPaused).toBe(true);
    expect(app.data().missionPhase).toBe(9);
    expect(app.data().entryAttempts).toEqual(attempts);
    expect(app.data().missionXP).toBe(47);
    expect(app.data().missionLog).toHaveLength(1);
    expect(app.data().missionLog[0].text).toContain('Beginning entry at -5.0°');
    expect(app.data().missionLog[0].text).not.toMatch(/skipped|splashdown|crew wore/);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it.each([
    { activeEvent: { id: 'waiting', title: 'Waiting', options: [] } },
    { eventOutcome: { label: 'Pending outcome', outcome: 'Waiting' } },
  ])('refuses to launch while a mission event is pending: %j', (pending) => {
    const app = mount(pending);
    const begin = app.prop('data-entry-begin', 'true');
    expect(begin.disabled).toBe(true);
    begin.onClick();
    expect(app.data().missionPhase).toBe(8);
    expect(app.data().entryRun).toBeUndefined();
    expect(app.data().missionXP).toBe(47);
    expect(app.awardXP).not.toHaveBeenCalled();
  });

  it('uses the same bounded default for preview and launched saved-angle values', () => {
    const app = mount({ entryAngle: Infinity });
    expect(app.prop('id', 'mm-entry-angle').value).toBe(-6.5);
    app.prop('data-entry-begin', 'true').onClick();
    expect(app.data().entryRun.angle).toBe(-6.5);
  });
});
