import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for Space Explorer: destination science data against
// independent reference values, and the deterministic mission engine
// (drains, tech mitigations, power allocation, crew selection).

const sourcePath = 'stem_lab/stem_tool_spaceexplorer.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_spaceexplorer.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function extractScope(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')();
}

const engine = extractScope('var BADGES = [', 'function buildMissionDossier', [
  'BADGES', 'DESTINATIONS', 'TECH_TREE', 'CREW_POOL', 'selectCrew', 'RESOURCES',
  'DESTINATION_DRAINS', 'MISSION_MODIFIERS', 'getInitialResources',
  'getPipPool', 'normalizeAllocation', 'applyTurnDrain', 'INTERIOR_ZONES', 'INTERIOR_CONDITIONS', 'getInteriorCondition', 'evaluateInteriorTranslation', 'applyInteriorReadinessBonus'
]);

const byId = {};
for (const d of engine.DESTINATIONS) byId[d.id] = d;

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'spaceExplorer');
});

describe('destination science data', () => {
  it('surface gravities match published values within 10%', () => {
    // Independent reference (m/s²). Proxima b is speculative and excluded.
    const reference = {
      mars: 3.71, europa: 1.314, titan: 1.352, enceladus: 0.113,
      venus_cloud: 8.87, moon_base: 1.62, io: 1.796, asteroid: 0.14
    };
    for (const id of Object.keys(reference)) {
      const g = byId[id].gravity;
      expect(Math.abs(g - reference[id]) / reference[id], id + ' gravity ' + g).toBeLessThan(0.1);
    }
    expect(byId.proxima.gravity).toBeGreaterThan(0);
  });

  it('Psyche is presented honestly (regression pins)', () => {
    // Was gravity 0.06 (half the published estimate) and 'worth
    // $10,000 quadrillion' stated as fact.
    expect(byId.asteroid.gravity).toBe(0.14);
    expect(byId.asteroid.desc).toContain('thought experiment');
    expect(src).not.toContain('worth $10,000 quadrillion');
  });

  it('every destination is complete: hazards, science focus, difficulty, unlock tier', () => {
    expect(engine.DESTINATIONS.length).toBe(9);
    for (const d of engine.DESTINATIONS) {
      expect(d.hazards.length, d.id).toBeGreaterThanOrEqual(3);
      expect(d.scienceFocus.length, d.id).toBeGreaterThanOrEqual(2);
      expect(d.difficulty, d.id).toBeGreaterThanOrEqual(1);
      expect(d.difficulty, d.id).toBeLessThanOrEqual(5);
      expect(Number.isInteger(d.unlockAt), d.id).toBe(true);
      expect(d.travelDays, d.id).toBeGreaterThan(0);
    }
    const starters = engine.DESTINATIONS.filter((d) => d.unlockAt === 0);
    expect(starters.length).toBeGreaterThanOrEqual(2);
  });

  it('badge descriptions agree with the data they count (regression pin)', () => {
    const badgeById = {};
    for (const b of engine.BADGES) {
      expect(badgeById[b.id], 'duplicate badge ' + b.id).toBeUndefined();
      badgeById[b.id] = b;
    }
    // 'Complete all 6 destinations' shipped while there were 9.
    expect(badgeById.explorer.desc).not.toMatch(/\d/);
    expect(badgeById.techmaster.desc).toContain(String(engine.TECH_TREE.length));
  });
});

describe('mission engine', () => {
  it('every drain table entry names a real destination and only drains', () => {
    for (const id of Object.keys(engine.DESTINATION_DRAINS)) {
      expect(byId[id], id).toBeTruthy();
      const drain = engine.DESTINATION_DRAINS[id];
      for (const k of Object.keys(drain)) {
        expect(engine.RESOURCES[k], id + '.' + k).toBeTruthy();
        expect(drain[k], id + '.' + k).toBeLessThan(0);
      }
    }
  });

  it('turn drain applies raw values with zeroed life support, and clamps at 0', () => {
    const start = { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const alloc = { life: 0, science: 4, shields: 3, comms: 3 };
    const after = engine.applyTurnDrain(start, byId.mars, [], alloc);
    expect(after.o2).toBe(82);
    expect(after.power).toBe(78);
    expect(after.fuel).toBe(88);
    expect(after.morale).toBe(74);
    const nearEmpty = engine.applyTurnDrain({ o2: 1, power: 1, hull: 1, morale: 1, fuel: 1, science: 0 }, byId.mars, [], alloc);
    expect(nearEmpty.o2).toBe(0);
    expect(nearEmpty.fuel).toBe(0);
  });

  it('life-support pips offset O2 drain one-for-one but never generate O2', () => {
    const start = { o2: 50, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const after = engine.applyTurnDrain(start, byId.mars, [], { life: 8, science: 1, shields: 1, comms: 0 });
    expect(after.o2).toBe(50);
  });

  it('tech mitigations scale the drains as advertised', () => {
    const start = { o2: 80, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 };
    const alloc = { life: 0, science: 4, shields: 3, comms: 3 };
    // Europa drains o2 -4; recycler cuts 30% -> round(-2.8) = -3.
    const recycled = engine.applyTurnDrain(start, byId.europa, ['recycler'], alloc);
    expect(recycled.o2).toBe(77);
    // Titan drains fuel -3; ion drive cuts 40% -> round(-1.8) = -2.
    const ion = engine.applyTurnDrain(start, byId.titan, ['ion_drive'], alloc);
    expect(ion.fuel).toBe(88);
  });

  it('power allocation always normalizes to the pip pool', () => {
    expect(engine.getPipPool([])).toBe(10);
    expect(engine.getPipPool(['solar_v2'])).toBe(12);
    const sum = (a) => a.life + a.science + a.shields + a.comms;
    expect(sum(engine.normalizeAllocation({ life: 1, science: 1, shields: 1, comms: 1 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation({ life: 20, science: 0, shields: 0, comms: 0 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation({ life: 0, science: 0, shields: 0, comms: 0 }, []))).toBe(10);
    expect(sum(engine.normalizeAllocation(null, ['solar_v2']))).toBe(12);
  });

  it('initial resources honor caps, difficulty penalties, and crew bonuses', () => {
    const easy = engine.getInitialResources(byId.mars, [], []);
    expect(easy.o2).toBe(85);
    const hard = engine.getInitialResources(byId.proxima, [], []);
    expect(hard.o2).toBe(85 - 10 - 15);
    expect(hard.morale).toBe(75 - 10);
    const teched = engine.getInitialResources(byId.mars, ['solar_v2'], []);
    expect(teched.power).toBe(100);
  });

  it('selectCrew returns 4 unique members and always includes the Commander', () => {
    for (const d of engine.DESTINATIONS) {
      const crew = engine.selectCrew(d);
      expect(crew.length, d.id).toBe(4);
      expect(new Set(crew.map((c) => c.name)).size, d.id).toBe(4);
      expect(crew.some((c) => c.role === 'Commander'), d.id).toBe(true);
    }
  });
});


describe('microgravity interior orientation', () => {
  it('defines a complete connected cabin with distinct astronaut activities', () => {
    expect(engine.INTERIOR_ZONES.map((zone) => zone.id)).toEqual([
      'flightdeck', 'lab', 'medbay', 'engineering'
    ]);
    expect(new Set(engine.INTERIOR_ZONES.map((zone) => zone.activity)).size).toBe(4);
    for (const zone of engine.INTERIOR_ZONES) {
      expect(zone.activity.length, zone.id).toBeGreaterThan(20);
      expect(zone.challenge.length, zone.id).toBeGreaterThan(20);
    }
  });

  it('models handrails, gentle translation, and unsafe momentum distinctly', () => {
    const rail = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'rail');
    expect(rail.valid).toBe(true);
    expect(rail.controlled).toBe(true);
    expect(rail.stoppingDistance).toBe(0);

    const shortPush = engine.evaluateInteriorTranslation('flightdeck', 'lab', 'gentle');
    expect(shortPush.controlled).toBe(true);
    expect(shortPush.speed).toBeLessThan(0.25);

    const longPush = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'gentle');
    expect(longPush.controlled).toBe(false);
    expect(longPush.feedback).toContain('shorter legs');

    const hardPush = engine.evaluateInteriorTranslation('lab', 'engineering', 'hard');
    expect(hardPush.controlled).toBe(false);
    expect(hardPush.stoppingDistance).toBeGreaterThan(2);
    expect(hardPush.feedback).toContain('no air drag');

    expect(engine.evaluateInteriorTranslation('lab', 'lab', 'rail').valid).toBe(false);
  });

  it('makes station maneuvers harder to cross while keeping handrails reliable', () => {
    expect(engine.INTERIOR_CONDITIONS.map((condition) => condition.id)).toEqual(['stable', 'maneuver']);

    const stableCrossing = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'stable');
    const maneuverCrossing = engine.evaluateInteriorTranslation('flightdeck', 'medbay', 'gentle', 'maneuver');
    expect(stableCrossing.controlled).toBe(true);
    expect(maneuverCrossing.controlled).toBe(false);
    expect(maneuverCrossing.speed).toBeGreaterThan(stableCrossing.speed);
    expect(maneuverCrossing.condition.id).toBe('maneuver');
    expect(maneuverCrossing.feedback).toContain('attitude maneuver');

    const shortManeuver = engine.evaluateInteriorTranslation('flightdeck', 'lab', 'gentle', 'maneuver');
    expect(shortManeuver.controlled).toBe(true);
    expect(shortManeuver.feedback).toContain('short crossing');

    const railManeuver = engine.evaluateInteriorTranslation('flightdeck', 'engineering', 'rail', 'maneuver');
    expect(railManeuver.controlled).toBe(true);
    expect(railManeuver.stoppingDistance).toBe(0);
    expect(railManeuver.feedback).toContain('braking point');

    const fallback = engine.getInteriorCondition('unknown-condition');
    expect(fallback.id).toBe('stable');
  });

  it('applies the cabin readiness morale effect once and respects the resource cap', () => {
    const ready = {
      readinessComplete: true,
      controlledMoves: 2,
      tasks: { lab: true, medbay: true }
    };
    const first = engine.applyInteriorReadinessBonus({ morale: 70, o2: 80 }, ready, false);
    expect(first.applied).toBe(true);
    expect(first.moraleBonus).toBe(3);
    expect(first.resources.morale).toBe(73);
    expect(first.resources.o2).toBe(80);

    const repeated = engine.applyInteriorReadinessBonus(first.resources, ready, true);
    expect(repeated.applied).toBe(false);
    expect(repeated.resources.morale).toBe(73);

    const capped = engine.applyInteriorReadinessBonus({ morale: 99 }, ready, false);
    expect(capped.applied).toBe(true);
    expect(capped.moraleBonus).toBe(1);
    expect(capped.resources.morale).toBe(100);

    const incomplete = engine.applyInteriorReadinessBonus({ morale: 70 }, { readinessComplete: true, controlledMoves: 1, tasks: { lab: true, medbay: true } }, false);
    expect(incomplete.applied).toBe(false);
    expect(incomplete.resources.morale).toBe(70);
  });
});
describe('render and deployment', () => {
  it('renders the mission select shell', () => {
    const html = renderTool('spaceExplorer', { spaceExplorer: {} });
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('Mars');
  });

  it('renders a readable first-run path with responsive destination actions', () => {
    const html = renderTool('spaceExplorer', { spaceExplorer: {} });
    expect(html).toContain('data-spaceexplorer-ux="mission-select"');
    expect(html).toContain('data-spaceexplorer-quickstart="true"');
    expect(html).toContain('Pick a destination');
    expect(html).toContain('se-destination-grid');
    expect(html).toContain('Recommended');
    expect(html).toContain('Start mission');
    expect(html).toContain('Mission guide: rules, resources, crew, and upgrades');
  });

  it('pins the scoped contrast, focus, target-size, and responsive contracts', () => {
    expect(src).toContain("_seUx.id = 'se-usability-css'");
    expect(src).toContain('min-height:44px');
    expect(src).toContain('outline:3px solid var(--se-focus)');
    expect(src).toContain('@media (prefers-contrast:more)');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('.se-resource-grid{grid-template-columns:repeat(2');
    expect(src).toContain('[class~="text-xs"]{font-size:.8125rem');
    expect(src).toContain("statusLevel === 'Critical'");
    expect(src).toContain("statusLevel === 'Low'");
    expect(src).toContain("statusLevel === 'Stable'");
  });

  it('renders mission wayfinding, safe exit, presets, and non-modal event semantics', () => {
    const base = {
      destination: 'mars',
      resources: { o2: 82, power: 78, hull: 100, morale: 74, fuel: 88, science: 5 },
      crew: [],
      turn: 1,
      powerAllocation: { life: 4, science: 2, shields: 2, comms: 2 }
    };
    const allocation = renderTool('spaceExplorer', {
      spaceExplorer: { ...base, missionPhase: 'allocate' }
    });
    expect(allocation).toContain('data-spaceexplorer-progress="true"');
    expect(allocation).toContain('aria-current="step"');
    expect(allocation).toContain('Use balanced preset');
    expect(allocation).toContain('Prioritize');
    expect(allocation).toContain('End current mission');
    expect(allocation).toContain('Back to briefing');
    expect(allocation).toContain('Cabin orientation optional');

    const event = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        missionPhase: 'event',
        activeEvent: {
          emoji: '!',
          title: 'Dust front',
          category: 'environment',
          description: 'A fast dust front is crossing the landing corridor.',
          stemConcepts: ['atmospheric science'],
          choices: [
            { label: 'Measure first', quality: 'optimal', effects: { science: 5 }, outcome: 'Measured.', scienceReward: 'Evidence improves the route.' },
            { label: 'Wait', quality: 'adequate', effects: {}, outcome: 'Waited.', scienceReward: 'Time reduces uncertainty.' },
            { label: 'Rush', quality: 'poor', effects: { hull: -5 }, outcome: 'Damaged.', scienceReward: 'Dust carries momentum.' }
          ]
        }
      }
    });
    expect(event).toContain('role="region"');
    expect(event).not.toContain('aria-modal="true"');
    expect(event).toContain('aria-keyshortcuts="1"');
    expect(event).toContain('data-resource-status="stable"');
    expect(event).toContain('Stable');
  });

  it('guards number shortcuts while a learner is typing', () => {
    expect(src).toContain('/^(INPUT|TEXTAREA|SELECT|BUTTON)$/');
    expect(src).toContain('(e.target && e.target.isContentEditable)');
    expect(src).toContain("if (!/^[1-9]$/.test(e.key)) return;");
  });


  it('renders an accessible perspective cabin trainer with equivalent controls', () => {
    const base = {
      missionPhase: 'briefing',
      destination: 'mars',
      resources: { o2: 85, power: 80, hull: 100, morale: 75, fuel: 90, science: 0 },
      crew: []
    };
    const html = renderTool('spaceExplorer', { spaceExplorer: base });
    expect(html).toContain('data-spaceexplorer-interior="true"');
    expect(html).toContain('data-spaceexplorer-interior-visual="perspective"');
    expect(html).toContain('Perspective view of the mission cabin');
    expect(html).toContain('data-spaceexplorer-interior-target="lab"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('data-spaceexplorer-interior-strategy="rail"');
    expect(html).toContain('Handrail travel');
    expect(html).toContain('Gentle push + brake');
    expect(html).toContain('Hard push');
    expect(html).toContain('0 of 2 activities');
    expect(html).toContain('data-spaceexplorer-interior-condition="stable"');
    expect(html).toContain('data-spaceexplorer-interior-condition="maneuver"');
    expect(html).toContain('data-spaceexplorer-interior-route-preview="stable"');
    expect(html).toContain('data-spaceexplorer-interior-prediction="gentle"');
    expect(html).toContain('Controlled arrival predicted');


    const maneuver = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          position: 'flightdeck', target: 'medbay', condition: 'maneuver',
          tasks: {}, controlledMoves: 0, maneuverControlledMoves: 0,
          recoveryCount: 0, attempts: 0, lastResult: null,
          feedback: '', readinessComplete: false
        }
      }
    });
    expect(maneuver).toContain('data-spaceexplorer-interior-condition-status="maneuver"');
    expect(maneuver).toContain('data-spaceexplorer-interior-route-preview="maneuver"');
    expect(maneuver).toContain('ATTITUDE MANEUVER ACTIVE');
    expect(maneuver).toContain('data-spaceexplorer-interior-prediction="rail"');
    expect(maneuver).toContain('data-predicted-control="controlled"');
    expect(maneuver).toContain('data-spaceexplorer-interior-prediction="gentle"');
    expect(maneuver).toContain('data-predicted-control="recovery"');
    expect(maneuver).toContain('Recovery likely');
    const ready = renderTool('spaceExplorer', {
      spaceExplorer: {
        ...base,
        interiorOrientation: {
          position: 'medbay',
          target: 'medbay',
          tasks: { lab: true, medbay: true },
          controlledMoves: 2,
          recoveryCount: 0,
          attempts: 2,
          lastResult: null,
          feedback: 'Cabin orientation complete.',
          readinessComplete: true
        }
      }
    });
    expect(ready).toContain('Cabin ready');
    expect(ready).toContain('Cabin ready ? orientation complete');
    expect(ready).toContain('data-spaceexplorer-interior-position="medbay"');
  });

  it('surfaces cabin readiness in preflight, the active HUD, and debrief', () => {
    const readyOrientation = {
      position: 'medbay', target: 'medbay', condition: 'maneuver',
      tasks: { lab: true, medbay: true },
      controlledMoves: 2, maneuverControlledMoves: 1, recoveryCount: 0, attempts: 2,
      lastResult: null, feedback: 'Cabin orientation complete.', readinessComplete: true
    };
    const base = {
      destination: 'mars',
      resources: { o2: 82, power: 78, hull: 100, morale: 77, fuel: 88, science: 5 },
      crew: [], turn: 1,
      powerAllocation: { life: 4, science: 2, shields: 2, comms: 2 },
      interiorOrientation: readyOrientation,
      interiorReadinessApplied: true,
      interiorReadinessBonus: 3
    };

    const allocation = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'allocate', interiorReadinessApplied: false } });
    expect(allocation).toContain('First launch: up to +3 morale');

    const active = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'explore' } });
    expect(active).toContain('data-spaceexplorer-readiness-applied="true"');
    expect(active).toContain('Cabin practice applied');
    expect(allocation).toContain('Maneuver route practiced.');

    const debrief = renderTool('spaceExplorer', { spaceExplorer: { ...base, missionPhase: 'debrief', missionResult: 'success' } });
    expect(debrief).toContain('data-spaceexplorer-interior-review="true"');
    expect(debrief).toContain('Cabin readiness review');
    expect(debrief).toContain('First-launch effect: +3 morale applied');
    expect(debrief).toContain('Maneuver-safe');
    expect(src).toContain('var current = prev.spaceExplorer || {};');
  });
  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
