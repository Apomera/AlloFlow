// Scene 7 — Mountain belt (continent–continent collision) — for stem_tool_geologyexplorer.js.
// Pins the science the scene teaches (thrust stacking, a deep crustal root, regional
// metamorphism, sea-floor limestone on the summit, NO volcanoes) through the pure hook,
// and the completeness contract every scene must meet across the tool's registries.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop', 'web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

let P;
beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(source)();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});
beforeEach(() => { P.setScene('collision'); P.setGrid('standard'); });

const KEYS = ['molasse', 'foldedStrata', 'summitLimestone', 'thrustZone', 'schist', 'gneiss', 'leucogranite', 'suture', 'crustRoot', 'lithMantle', 'asthenosphere'];

function column(x, z = 0) {
  const g = P.grid(); const out = [];
  for (let y = 0; y < g.NY; y++) out.push(P.collisionKeyAt(x, y, z));
  return out;
}
function firstSolid(x) { return column(x).findIndex((k) => k !== 'void'); }
function firstIndex(x, key) { return column(x).indexOf(key); }

describe('Geology Explorer — mountain belt scene (registration + layout)', () => {
  it('is the seventh scene and lists every material it can generate', () => {
    expect(P.scenes()).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot', 'collision']);
    expect(P.sceneVoxelKeys('collision')).toEqual(KEYS);
    expect(P.sceneId()).toBe('collision');
  });

  it('reaches every material on the grid at every detail level (nothing taught is unreachable)', () => {
    ['low', 'standard', 'high'].forEach((res) => {
      P.setGrid(res);
      const g = P.grid(); const seen = new Set();
      for (let x = 0; x < g.NX; x++) for (let y = 0; y < g.NY; y++) seen.add(P.collisionKeyAt(x, y, 0));
      KEYS.forEach((k) => expect(seen.has(k), res + ' lacks ' + k).toBe(true));
      seen.delete('void');
      expect([...seen].sort()).toEqual([...KEYS].sort());
    });
  });

  it('is a z-uniform cross-section (the same key down every slice)', () => {
    const g = P.grid();
    for (let x = 0; x < g.NX; x += 3) for (let y = 0; y < g.NY; y += 2) {
      expect(P.collisionKeyAt(x, y, 0)).toBe(P.collisionKeyAt(x, y, g.NZ - 1));
    }
  });

  it('has real topography: sky above a summit that stands higher than the foreland and the plateau', () => {
    const g = P.grid();
    const summitX = Math.round(0.55 * (g.NX - 1));
    expect(P.collisionKeyAt(summitX, 0, 0)).toBe('void');            // the very top row is sky everywhere
    expect(firstSolid(summitX)).toBeLessThan(firstSolid(1));           // summit is higher than the foreland plain
    expect(firstSolid(summitX)).toBeLessThan(firstSolid(g.NX - 1));    // and higher than the plateau
    expect(firstSolid(g.NX - 1)).toBeLessThan(firstSolid(1));          // the plateau sits above the foreland
    expect(P.collisionTopo(0.1)).toBeGreaterThan(P.collisionTopo(0.55));
    expect(P.collisionTopo(1)).toBeGreaterThan(P.collisionTopo(0.55));
    expect(P.collisionTopo(1)).toBeLessThan(P.collisionTopo(0.1));
  });

  it('puts marine limestone on the summit and foreland gravel at the range front', () => {
    const g = P.grid();
    const summitX = Math.round(0.55 * (g.NX - 1));
    expect(column(summitX)[firstSolid(summitX)]).toBe('summitLimestone');
    expect(column(1)[firstSolid(1)]).toBe('molasse');
    expect(column(1)).not.toContain('summitLimestone');
  });

  it('dips the main thrust toward the plateau and keeps the underthrust plate beneath it', () => {
    const g = P.grid();
    const xs = [];
    for (let x = 0; x < g.NX; x++) if (firstIndex(x, 'thrustZone') >= 0) xs.push(x);
    expect(xs.length).toBeGreaterThanOrEqual(3);
    const depths = xs.map((x) => firstIndex(x, 'thrustZone'));
    for (let i = 1; i < depths.length; i++) expect(depths[i]).toBeGreaterThanOrEqual(depths[i - 1]);   // deeper to the right
    expect(depths[depths.length - 1]).toBeGreaterThan(depths[0]);
    xs.forEach((x) => {
      const col = column(x), t = col.lastIndexOf('thrustZone');
      expect(col[t + 1]).toBe('crustRoot');                              // footwall directly under the fault
    });
  });

  it('thickens the crust into a root under the range (Moho deeper under the summit than the foreland)', () => {
    const g = P.grid();
    const summitX = Math.round(0.6 * (g.NX - 1));
    const mantleAtForeland = column(1).findIndex((k) => k === 'lithMantle' || k === 'asthenosphere');
    const mantleUnderRange = column(summitX).findIndex((k) => k === 'lithMantle' || k === 'asthenosphere');
    expect(mantleAtForeland).toBeGreaterThan(0);
    expect(mantleUnderRange).toBeGreaterThan(mantleAtForeland);
    expect(column(summitX)[g.NY - 1]).toBe('asthenosphere');
  });

  it('grades metamorphism with burial and exhumes the core on the steep face', () => {
    const g = P.grid();
    const faceX = Math.round(0.47 * (g.NX - 1));
    const col = column(faceX);
    const gneissAt = col.indexOf('gneiss'), schistAt = col.indexOf('schist');
    expect(gneissAt).toBeGreaterThan(-1);
    expect(gneissAt - firstSolid(faceX)).toBeLessThanOrEqual(2);       // deep-formed rock sits near the surface here
    if (schistAt >= 0) expect(schistAt).toBeLessThan(gneissAt);         // lower grade above higher grade
    let sawStrataAboveGneiss = false;
    for (let x = 0; x < g.NX; x++) {
      const c = column(x), f = c.indexOf('foldedStrata'), gn = c.indexOf('gneiss');
      if (f >= 0 && gn >= 0) { expect(f).toBeLessThan(gn); sawStrataAboveGneiss = true; }
    }
    expect(sawStrataAboveGneiss).toBe(true);
  });

  it('keeps the leucogranite inside the hot core and the suture near the plateau edge', () => {
    const g = P.grid();
    for (let x = 0; x < g.NX; x++) {
      const c = column(x), p = c.indexOf('leucogranite');
      if (p < 0) continue;
      expect(c.slice(0, p)).not.toContain('crustRoot');                // it is a hanging-wall melt, not mantle-fed
      expect(c.slice(0, p).some((k) => k === 'schist' || k === 'summitLimestone' || k === 'foldedStrata' || k === 'gneiss')).toBe(true);
    }
    const sutureXs = [];
    for (let x = 0; x < g.NX; x++) if (firstIndex(x, 'suture') >= 0) sutureXs.push(x / (g.NX - 1));
    expect(sutureXs.length).toBeGreaterThan(0);
    sutureXs.forEach((fx) => expect(fx).toBeGreaterThan(0.65));
  });
});

describe('Geology Explorer — mountain belt science readouts', () => {
  it('geotherm: the summit is the coldest rock, the mantle the hottest, and nothing here is molten', () => {
    const t = (k) => P.collisionGeotherm(10, k);
    expect(t('summitLimestone').tempC).toBeLessThan(0);
    KEYS.forEach((k) => {
      expect(t(k).tempC).toBeLessThanOrEqual(t('asthenosphere').tempC);
      expect(t(k).state).toMatch(/solid|gravel/);
      expect(t(k).state).not.toMatch(/molten|erupting/);
    });
    expect(t('gneiss').tempC).toBeGreaterThan(t('schist').tempC);
    expect(t('schist').tempC).toBeGreaterThan(t('foldedStrata').tempC);
    expect(t('leucogranite').state).toMatch(/crystallised/);
  });

  it('measurement rows carry the structural position and the burial signal', () => {
    const facts = P.rockFacts('summitLimestone', 1);
    expect(facts.measurements.map((r) => r.id)).toEqual(['depth', 'structural-position', 'burial-signal', 'temperature']);
    expect(facts.measurements.find((r) => r.id === 'structural-position').value).toContain('above sea level');
    expect(facts.measurements.find((r) => r.id === 'burial-signal').emphasis).toBe(true);
    expect(P.rockFacts('crustRoot', 8).measurements.find((r) => r.id === 'burial-signal').value).toMatch(/isostasy/i);
    expect(facts.measurementSummary).toContain('degrees Celsius');
  });

  it('first-person probe reads the summit as summit limestone with its myth-bust', () => {
    const W = P.WORLD;
    const p = P.fpProbe(W.w * 0.05, W.h * 0.5 - 0.01, 0);     // top of the block at the summit column
    expect(p.key).toBe('summitLimestone');
    expect(p.blurb).toMatch(/summit/i);
    expect(p.bust).toMatch(/flood/i);
    const speech = P.fpAnnounceText(p);
    expect(speech).toContain('Summit limestone');
    expect(speech).toContain('Myth-bust');
  });

  it('every voxel key in EVERY scene has a first-person blurb (ridge and hotspot used to fall through to the crust map)', () => {
    P.scenes().forEach((sceneId) => {
      P.sceneVoxelKeys(sceneId).forEach((key) => {
        expect(P.fpBlurb(sceneId, key), sceneId + '/' + key).toMatch(/\S/);
      });
    });
  });

  it('uses grounded mining and supports the core rig like the other surface scenes', () => {
    expect(P.fpExplorerMode('collision')).toBe('mine');
    expect(P.coreRigSupported('collision')).toBe(true);
    KEYS.forEach((k) => expect(P.fpMaterialPhysics(k).kind).toBe('solid'));
    expect(P.fieldCollectibleKeys('collision')).toEqual(KEYS);
  });
});

describe('Geology Explorer — mountain belt registries (mission, quiz, sequence, comparison)', () => {
  it('mission checklist, hints, and route actions line up', () => {
    const mission = P.missions().collision;
    expect(mission.checklist.map((c) => c.id)).toEqual(['uplift', 'thicken', 'quiz']);
    expect(mission.signal.steps.map((s) => s.key)).toEqual(['thrustZone', 'gneiss', 'summitLimestone']);
    expect(mission.question).toMatch(/sea floor/i);
    const ctx = { identified: {}, identifiedCount: 0, quizAnswered: false, core: false, signalComplete: false, signalIndex: -1, evidence: [], hasKeys: () => false };
    const hint = P.nextMissionHint(mission, ctx, 'collision');
    expect(hint.id).toBe('uplift');
    expect(hint.text).toMatch(/summit limestone/i);
    expect(P.missionAction('uplift')).toMatchObject({ target: 'materials', mode: 'investigate' });
    expect(P.missionAction('thicken')).toMatchObject({ target: 'signal', mode: 'investigate' });
    const journey = P.sceneJourney('collision');
    expect(journey.map((s) => s.key)).toEqual(['thrustZone', 'gneiss', 'summitLimestone']);
    expect(P.sceneBeacons('collision').map((b) => b.key)).toEqual(['thrustZone', 'gneiss', 'summitLimestone']);
    expect(P.sceneTimeline('collision')).toHaveLength(3);
    expect(P.processCues('collision').axis.value).toBe('Crustal thickness');
    expect(P.orientation().collision.read).toMatch(/root/i);
    expect(P.vocabulary().collision.map((v) => v.term)).toEqual(['Thrust fault', 'Regional metamorphism', 'Isostasy']);
  });

  it('quiz bank pins the misconceptions with balanced answer positions and matching remediation', () => {
    const bank = P.quizBanks().collision;
    expect(bank.items).toHaveLength(4);
    const answer = (i) => bank.items[i].opts[bank.items[i].correct];
    expect(answer(0)).toMatch(/lifted/i);
    expect(answer(1)).toMatch(/25 km/);
    expect(answer(2)).toMatch(/no slab water or plume/i);
    expect(answer(3)).toMatch(/isostasy/i);
    const positions = bank.items.map((q) => q.correct);
    expect(positions.filter((p) => p === 0).length).toBe(2);
    bank.items.forEach((q, i) => {
      expect(q.opts).toHaveLength(2);
      const remedy = P.quizRemediation('collision', i);
      expect(remedy.id).toBe(['collision-summit', 'collision-gneiss', 'collision-volcano', 'collision-root'][i]);
      expect(remedy.remedy.length).toBeGreaterThan(40);
    });
    expect(P.quizRemediation('collision', 2).remedy).toMatch(/no volcanoes/i);
  });

  it('sequence challenge starts scrambled and accepts only the geologic order', () => {
    const challenge = P.sequenceChallenges().collision;
    const correct = challenge.items.map((i) => i.key);
    expect(correct).toEqual(['summitLimestone', 'suture', 'thrustZone', 'gneiss', 'molasse']);
    expect(P.sequenceIsCorrect('collision', P.sequenceInitialOrder('collision'))).toBe(false);
    expect(P.sequenceIsCorrect('collision', correct)).toBe(true);
  });

  it('comparison insights exist for the mountain belt against every other scene', () => {
    expect(P.sceneComparisons().collision.outcome).toMatch(/no volcanoes/i);
    P.scenes().filter((id) => id !== 'collision').forEach((other) => {
      const insight = P.sceneComparisonInsight('collision', other);
      expect(insight, other).not.toMatch(/Compare the driving process and the evidence pattern/);
      expect(insight.length).toBeGreaterThan(80);
    });
    expect(P.sceneComparisonInsight('subduction', 'collision')).toMatch(/cannot sink/i);
  });

  it('field expeditions target only materials the scene generates, in order', () => {
    const runs = P.fieldExpeditions().collision;
    expect(runs.map((r) => r.id)).toEqual(['summit', 'core']);
    runs.forEach((r) => r.targets.forEach((k) => expect(KEYS).toContain(k)));
    expect(P.fieldExpeditionFor('collision', 0).targets).toEqual(['molasse', 'foldedStrata', 'summitLimestone']);
  });

  it('exposes a 2D evidence map so the scene works with WebGL off', () => {
    const info = P.schematicInfo('collision', 'gneiss', 1);
    expect(info).toMatchObject({ sceneId: 'collision', title: 'Mountain belt 2D evidence map', activeIndex: 1, activeKey: 'gneiss', selectedLabel: 'Gneiss' });
    expect(source).toContain('function collisionSchematicDiagram(v)');
    expect(source).toContain('collision: collisionSchematicDiagram');
    KEYS.forEach((k) => expect(source).toContain("v.mark('" + (k === 'thrustZone' ? 'path' : (k === 'leucogranite' ? 'ellipse' : (k === 'asthenosphere' ? 'rect' : 'polygon'))) + "', '" + k + "'"));
  });

  it('3D scene hooks: heat light, atmosphere tint, process guide, and tracers all know the scene', () => {
    expect(source).toContain("collision: { color: 0xffb36b");
    expect(source).toContain('collision: 0xdbeafe');
    expect(source.split("SCENE.id === 'collision'").length - 1).toBeGreaterThanOrEqual(3);
  });

  it('3D landforms: a snow-capped alpine ridge with summit clouds, both slice-aware and reduced-motion-aware', () => {
    expect(source).toContain("cnv.dataset.geologyLandformRendering = 'snow-capped-alpine-ridge-relief'");
    expect(source).toContain("var isAlpine3d = landformStyle3d === 'alpine'");
    expect(source).toContain("'drifting-summit-cloud-sprites'");
    expect(source).toContain('function updateGeologyAlpineClouds3d(time3d)');
    expect(source).toContain('updateGeologyAlpineClouds3d(geologyMotionTime3d);');
    expect(source).toContain("if (SCENE.id === 'collision' && v.key === 'summitLimestone') col.lerp(WHITE, 0.5);");
    const clouds = source.slice(source.indexOf('function updateGeologyAlpineClouds3d'), source.indexOf('cnv.dataset.geologyVolcanicAtmosphereRendering'));
    expect(clouds).toContain('reducedMotion3d ? 0.61 : time3d');
    expect(clouds).toContain('cloudSprite3d.visible = !focusLens && cloudSprite3d.userData.geologyCloudBaseZ < cloudFrontZ3d + 0.4');
    const peaks = source.slice(source.indexOf("SCENE.id === 'collision') {\n      // The voxel block already carries"), source.indexOf("'snow-capped-alpine-ridge-relief'"));
    expect((peaks.match(/'alpine'/g) || []).length).toBe(4);   // six ridge horns via forEach + three foothills
  });

  it('ships the same bytes to the bundled desktop copy', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});

// The registries above are data; this proves the scene actually RENDERS through the
// host contract with WebGL off (the accessible 2D evidence map + material list path).
describe('Geology Explorer — mountain belt renders without WebGL', () => {
  let html;
  beforeAll(async () => {
    const harness = await import('./helpers/stem_widgets_smoke_harness.js');
    harness.resetStemLab();
    harness.loadTool('stem_lab/stem_tool_geologyexplorer.js', 'geologyExplorer');
    html = harness.renderTool('geologyExplorer', { geologyExplorer: { scene: 'collision', mode: 'investigate' } });
  });

  it('offers the seventh tab and lands on the collision scene', () => {
    expect((html.match(/role="tab"/g) || []).length).toBe(7);
    expect(html).toContain('Mountain belt');
    expect(html).toContain('data-geology-scene-schematic="collision"');
    expect(html).toContain('Mountain belt 2D evidence map');
  });

  it('shows the material list as rock types with every collision material and the process timeline', () => {
    expect(html).toContain('Rock types');
    ['Foreland basin gravel', 'Summit limestone', 'Thrust fault zone', 'Gneiss', 'Leucogranite', 'Suture-zone ophiolite', 'Continental crust &amp; root'].forEach((name) => {
      expect(html, name).toContain(name);
    });
    expect(html).toContain('Collision cause-and-effect');
    expect(html).toContain('Crust shortens and stacks');
    expect(html).not.toContain('Hotspot motion timeline');
  });

  it('draws every collision material in the evidence map with the shared selection/state contract', () => {
    KEYS.forEach((k) => expect(html, k).toContain('data-geology-schematic-material="' + k + '"'));
    expect(html).toContain('Sea-floor limestone on top');
    expect(html).toContain('Plates converge');
  });
});
