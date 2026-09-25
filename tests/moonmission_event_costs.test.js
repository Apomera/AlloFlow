// Moon Mission — the descent events change the landing they come before.
//
// The 1202 alarm and the boulder field are decided just before the powered descent,
// and every option only moved crew morale: Armstrong's real trade (fly past the
// boulders and spend the fuel) was free, and landing on the boulders cost nothing at
// the controls. Now each option carries its cost, the descent starts from it, the
// landing score counts a rough site, and the outcome card, the descent briefing and
// the debrief chain all say so. Handlers are the real ones (the tool has no hooks).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

function mount(state) {
  loadTool(FILE, ID);
  const store = newStore({ moonMission: Object.assign({}, state) });
  const tree = () => window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
  return { store, tree, mm: () => store.toolData.moonMission };
}
function walk(node, pred, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, pred, out)); return out; }
  if (pred(node)) out.push(node.props);
  const kids = node.props && node.props.children;
  if (kids != null) walk(kids, pred, out);
  return out;
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}
const buttonTitled = (app, re) => walk(app.tree(), (n) => n.type === 'button' && (re.test(String(n.props.title || '')) || re.test(textOf(n.props.children))));

beforeEach(() => resetStemLab());
afterEach(() => vi.restoreAllMocks());

// Undock with every event roll succeeding: the first eligible descent event fires.
function reachEvent(difficulty) {
  vi.spyOn(Math, 'random').mockReturnValue(0);
  const app = mount({ missionPhase: 4, difficulty, orbitStatus: 3 });
  const [undock] = buttonTitled(app, /Undock Lunar Module Eagle/);
  undock.onClick();
  return app;
}
function choose(app, re) {
  const [opt] = buttonTitled(app, re);
  expect(opt, 'option ' + re + ' not on screen').toBeTruthy();
  opt.onClick();
}

describe('Moon Mission descent events have costs', () => {
  it('flying past the boulders is recorded with its fuel cost and said on the outcome card', () => {
    const app = reachEvent('tourist');
    expect(app.mm().activeEvent.id).toBe('boulder_field');
    choose(app, /Take manual control and fly past the boulders/);
    const dec = app.mm().decisionLog[0];
    expect(dec.effects).toMatchObject({ hoverFuel: 10 });
    const outcome = renderTool(ID, { moonMission: app.mm() });
    expect(outcome).toMatch(/data-moonmission-event-impact="true"[^>]*>Flight impact: Flying 500 m past the boulders costs 10 s of hover fuel/);
  });

  it('trusting the 1202 alarm is free, and the card says that too', () => {
    const app = reachEvent('pilot');
    expect(app.mm().activeEvent.id).toBe('program_alarm');
    choose(app, /Trust the computer and continue/);
    const P = window.MoonMissionPure;
    expect(P.eventCosts(app.mm().decisionLog)).toMatchObject({ fuel: 0, drift: 0, boulders: false, items: [] });
    expect(renderTool(ID, { moonMission: app.mm() })).toContain('Flight impact: No cost to the landing');
  });

  it('adds up the costs, ignores entries without effects, and survives hostile ones', () => {
    loadTool(FILE, ID);
    const P = window.MoonMissionPure;
    const log = [
      { title: 'Program Alarm 1202!', chosen: 'Manual', effects: { hoverFuel: 8, drift: 3, note: 'n1' } },
      { title: 'Boulder Field at Landing Site!', chosen: 'Computer', effects: { site: 'boulders', note: 'n2' } },
      { title: 'Old save', chosen: 'x' },                       // pre-effects entry
      { title: 'Bad', effects: { hoverFuel: 'lots', drift: -9 } },
      null, 7, 'x',
    ];
    const c = P.eventCosts(log);
    expect(c.fuel).toBe(8);
    expect(c.drift).toBe(3);
    expect(c.boulders).toBe(true);
    expect(c.items.map((i) => i.title)).toEqual(['Program Alarm 1202', 'Boulder Field at Landing Site']);
    expect(P.eventCosts('nope')).toMatchObject({ fuel: 0, items: [] });
  });

  it('a rough site costs up to 20 points, never below zero, and the parts still add up', () => {
    loadTool(FILE, ID);
    const P = window.MoonMissionPure;
    const clean = P.landingScore(0.6, 0.3, 60);
    const rough = P.landingScore(0.6, 0.3, 60, true);
    expect(clean.total - rough.total).toBe(20);
    expect(rough.parts.find((p) => p.label === 'Boulder field').pts).toBe(-20);
    const poor = P.landingScore(2.9, 4.9, 0, true);   // base 10: the penalty stops at zero
    expect(poor.total).toBe(0);
    for (const sc of [clean, rough, poor]) expect(sc.parts.reduce((a, p) => a + p.pts, 0)).toBe(sc.total);
  });

  it('the descent briefing lists what the events cost before you take the controls', () => {
    loadTool(FILE, ID);
    const html = renderTool(ID, { moonMission: { missionPhase: 5, difficulty: 'pilot', decisionLog: [
      { title: 'Boulder Field at Landing Site!', chosen: 'Take manual control', quality: 'optimal',
        effects: { hoverFuel: 10, note: 'Flying 500 m past the boulders costs 10 s of hover fuel' } }] } });
    const card = (html.match(/data-moonmission-event-costs="true"[\s\S]*?<\/ul>/) || [])[0] || '';
    expect(card).toContain('Your calls on the way down change this landing:');
    expect(card).toContain('Boulder Field at Landing Site: ');
    expect(card).toContain('costs 10 s of hover fuel.');
  });

  it('the landing starts from those costs (the hinges in the flight loop)', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toContain('var _evCost = mmEventCosts(d.decisionLog);');
    expect(src).toMatch(/var hVel = MM_DESCENT\.handoverHv \+ \(_mcc === 'skipped' \? MM_DESCENT\.skipDrift : 0\) \+ _evCost\.drift;/);
    expect(src).toMatch(/var fuel = Math\.max\(10, .*- _evCost\.fuel\);/);
    expect(src).toContain('mmLandingScore(Math.abs(vVel), Math.abs(hVel), fuel, _evCost.boulders)');
  });

  it('the debrief chain names the costly call and totals what the landing started short', () => {
    loadTool(FILE, ID);
    const P = window.MoonMissionPure;
    const d = {
      tliAccuracy: { onTime: false, offByDeg: 22, side: 'early' }, mccChoice: 'skipped',
      landingResult: { crashed: false, score: 55, grade: 'C', vVel: 1.8, hVel: 1, fuel: 4, fuelUnit: 's' },
      decisionLog: [{ title: 'Boulder Field at Landing Site!', chosen: 'Abort and try again next orbit', quality: 'adequate',
        effects: { hoverFuel: 20, note: 'Going round again burns 20 s of hover fuel before the second attempt' } }],
    };
    const chain = P.causeChain(P.flightSummary(d, { quiz: 10, samples: 8 }, ''));
    const texts = chain.map((c) => c.call + ' -> ' + c.result);
    expect(texts[2]).toBe('At Boulder Field at Landing Site you chose "Abort and try again next orbit" -> going round again burns 20 s of hover fuel before the second attempt');
    expect(texts[3]).toMatch(/you started 45 s short \(25 s from the skipped correction, 20 s from Boulder Field at Landing Site\)$/);
  });
});
