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
  'getPipPool', 'normalizeAllocation', 'applyTurnDrain'
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

describe('render and deployment', () => {
  it('renders the mission select shell', () => {
    const html = renderTool('spaceExplorer', { spaceExplorer: {} });
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain('Mars');
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
