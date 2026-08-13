import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

let P;
const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');

beforeAll(() => {
  window.StemLab = { registerTool() {}, isRegistered() { return false; } };
  delete window.__alloGeologyPure;
  // eslint-disable-next-line no-new-func
  new Function(fs.readFileSync(sourcePath, 'utf8'))();
  P = window.__alloGeologyPure;
  if (!P) throw new Error('geology pure hook not exposed');
});

beforeEach(() => {
  P.setScene('crust');
  P.setGrid('standard');
});

describe('Geology Explorer guided missions', () => {
  it('keeps the working-tree and deploy mirrors byte-identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(fs.readFileSync(sourcePath, 'utf8'));
  });

  it('defines one question and three observable checks for every scene', () => {
    const missions = P.missions();
    expect(Object.keys(missions)).toEqual(['crust', 'geode', 'deepEarth', 'subduction', 'ridge', 'hotspot']);
    for (const [id, mission] of Object.entries(missions)) {
      expect(mission.question, id).toBeTruthy();
      expect(mission.notice, id).toHaveLength(3);
      expect(mission.checklist, id).toHaveLength(3);
      expect(mission.evidencePrompt, id).toBeTruthy();
      if (id !== 'crust') {
        expect(mission.signal, id).toMatchObject({ steps: expect.any(Array) });
        expect(mission.signal.steps).toHaveLength(3);
      }
    }
  });

  it('builds a three-stage visual journey from each scene mission', () => {
    const geodeJourney = P.sceneJourney('geode');
    expect(geodeJourney).toHaveLength(3);
    expect(geodeJourney.map((step) => step.label)).toEqual(['Wall rind', 'Banded pulses', 'Open-space crystals']);
    expect(geodeJourney[1].body).toContain('pulses');

    const crustJourney = P.sceneJourney('crust');
    expect(crustJourney).toHaveLength(3);
    expect(crustJourney.map((step) => step.key)).toEqual(['layers', 'cross-cutting', 'heat']);
  });

  it('defines three evidence beacons for every scene with valid palette keys', () => {
    for (const id of P.scenes()) {
      const beacons = P.sceneBeacons(id);
      expect(beacons, id).toHaveLength(3);
      expect(new Set(beacons.map((item) => item.id)).size).toBe(3);
      expect(beacons.every((item) => item.key && item.label && item.detail)).toBe(true);
    }
  });

  it('defines staged evidence beacons for every scene', () => {
    for (const id of P.scenes()) {
      const beacons = P.sceneBeacons(id);
      expect(beacons, id).toHaveLength(3);
      expect(beacons.map((item) => item.stage)).toEqual([0, 1, 2]);
      expect(beacons.every((item) => item.key && item.label && item.detail)).toBe(true);
    }
  });

  it('defines scene-aware process cues with three stages and an accessible evidence axis', () => {
    for (const id of P.scenes()) {
      const cue = P.processCues(id);
      expect(cue.title, id).toBeTruthy();
      expect(cue.summary, id).toBeTruthy();
      expect(cue.depth, id).toBeTruthy();
      expect(cue.axis, id).toMatchObject({
        label: expect.any(String),
        value: expect.any(String),
        gradient: expect.any(String),
        labels: expect.any(Array),
        ariaLabel: expect.any(String)
      });
      expect(cue.axis.labels, id).toHaveLength(3);
      expect(cue.steps, id).toHaveLength(3);
      expect(cue.steps.every((step) => step.label && step.detail)).toBe(true);
    }
    expect(P.processCues('geode').axis.label).toBe('Growth axis');
    expect(P.processCues('subduction').axis.ariaLabel).toContain('cold incoming plate');
    expect(P.processCues('ridge').axis.labels).toEqual(['Older flank', 'Axis / youngest', 'Older flank']);
    expect(P.processCues('hotspot').axis.value).toBe('Distance from plume');
  });

  it('builds a three-stage formation timeline for every scene', () => {
    for (const id of P.scenes()) {
      const timeline = P.sceneTimeline(id);
      expect(timeline, id).toHaveLength(3);
      expect(timeline.map((item) => item.index)).toEqual([0, 1, 2]);
      expect(timeline.every((item) => item.label && item.body && item.beaconId && item.cueLabel)).toBe(true);
    }
  });

  it('isolates only the selected material when the focus lens is active', () => {
    expect(P.focusLensIncludes('sandstone', 'sandstone', true)).toBe(true);
    expect(P.focusLensIncludes('shale', 'sandstone', true)).toBe(false);
    expect(P.focusLensIncludes('shale', 'sandstone', false)).toBe(true);
    expect(P.focusLensIncludes('shale', null, true)).toBe(true);
  });

  it('describes and clamps the front-to-back cutaway without calling it geological depth', () => {
    expect(P.cutawayReadout(0, 14)).toEqual({ step: 0, max: 13, percent: 0, label: 'Full block' });
    expect(P.cutawayReadout(13, 14)).toEqual({ step: 13, max: 13, percent: 93, label: '93% cut away from front · final section' });
    expect(P.cutawayReadout(99, 14).step).toBe(13);
    expect(P.cutawayReadout(-4, 14).step).toBe(0);
  });

  it('skips voids and already removed voxels when finding the next excavatable layer', () => {
    const voxels = {
      '2,0,3': { key: 'void' },
      '2,1,3': { key: 'agate' },
      '2,2,3': { key: 'quartz' }
    };
    expect(P.firstSolidVoxelY(voxels, {}, 2, 3, 3)).toBe(1);
    expect(P.firstSolidVoxelY(voxels, { '2,1,3': 1 }, 2, 3, 3)).toBe(2);
    expect(P.firstSolidVoxelY(voxels, { '2,1,3': 1, '2,2,3': 1 }, 2, 3, 3)).toBeNull();
  });

  it('previews only the latest removed voxel that is visible in the current presentation', () => {
    const target = { x: 1, y: 2, z: 4, key: 'shale' };
    const lookup = { '1,2,4': target };
    const history = ['stale', '1,2,4'];
    const removed = { '1,2,4': 1 };
    expect(P.undoPreviewTarget(history, lookup, removed, 0, false, 3, { shale: 2 })).toBe(target);
    expect(P.undoPreviewTarget(history, lookup, removed, 5, false, 3, { shale: 2 })).toBeNull();
    expect(P.undoPreviewTarget(history, lookup, removed, 0, true, 3, { shale: 2 })).toBeNull();
    expect(P.undoPreviewTarget(history, lookup, removed, 0, false, 1, { shale: 2 })).toBeNull();
    expect(P.undoPreviewTarget(history, lookup, {}, 0, false, 3, { shale: 2 })).toBeNull();
  });

  it('restores material, lens, and camera presentation after an engine rebuild', () => {
    const calls = [];
    const engine = {
      setHighlight(value) { calls.push(['highlight', value]); },
      setFocusLens(value) { calls.push(['lens', value]); },
      setView(value) { calls.push(['view', value]); }
    };
    expect(P.restoreEnginePresentation(engine, 'shale', true, 'top')).toBe(true);
    expect(calls).toEqual([['highlight', 'shale'], ['lens', true], ['view', 'top']]);
    expect(P.restoreEnginePresentation(null, 'shale', true, 'top')).toBe(false);
  });

  it('tracks evidence-linked progress for the visual journey', () => {
    expect(P.sceneJourneyProgress('geode', { sceneSignals: { geode: 1 } })).toEqual([true, true, false]);
    expect(P.sceneJourneyProgress('crust', {
      identifiedByScene: { crust: { soil: 1, sandstone: 1, shale: 1, intrusion: 1, marble: 1 } },
      notebook: { evidence: [{ scene: 'crust', kind: 'core' }] }
    })).toEqual([true, true, true]);
  });

  it('keeps the mission state scene-scoped and exposes the evidence workflow', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('identifiedByScene');
    expect(source).toContain('d.quizByScene');
    expect(source).toContain('function sceneMissionPanel');
    expect(source).toContain('function sceneJourneyPanel');
    expect(source).toContain('function sceneBeaconPanel');
    expect(source).toContain('function startBeaconTour');
    expect(source).toContain('function processCuePanel');
    expect(source).toContain('function cameraOrientationPanel');
    expect(source).toContain('function formationTimelinePanel');
    expect(source).toContain('data-geology-formation-timeline');
    expect(source).toContain('sceneTimeline: sceneTimelineFor');
    expect(source).toContain('data-geology-camera-compass');
    expect(source).toContain('data-geology-process-overlay');
    expect(source).toContain('data-geology-focus-lens');
    expect(source).toContain('data-geology-focus-state');
    expect(source).toContain('eng.setFocusLens');
    expect(source).toContain('focusLensIncludes: focusLensIncludes');
    expect(source).toContain('restoreEnginePresentation: restoreEnginePresentation');
    expect(source).toContain('restoreEnginePresentation(window[ENGINE_KEY]');
    expect(source).toContain('eng.undoExcavate');
    expect(source).toContain('eng.setUndoPreview');
    expect(source).toContain('data-geology-undo-preview-control');
    expect(source).toContain('undoPreviewSourceGeo.dispose()');
    expect(source).toContain('hoverSourceGeo.dispose()');
    expect(source).toContain('eng.excavateAt');
    expect(source).toContain('if (!excavate || focusLens || !isFinite(x)');
    expect(source).toContain('formedAt > showStage');
    expect(source).toContain('onExcavateChange');
    expect(source).toContain('data-geology-undo-excavation');
    expect(source).toContain('data-geology-cutaway-readout');
    expect(source).toContain('waterMesh.scale.y = (NZ - sliceZ) / NZ');
    expect(source).not.toContain('waterMesh.scale.z');
    expect(source).toContain('SCENE.palette[v.key] || ROCKS[v.key]');
    expect(source).not.toContain('rockFacts(rockKeyAt(v.x, below, v.z), below)');
    expect(source).not.toContain('ROCKS[v.key].name');
    expect(source).toContain('processCues: sceneProcessCueFor');
    expect(source).toContain('data-geology-evidence-trail');
    expect(source).toContain('Carry trail into CER');
    expect(source).toContain('data-geology-beacon-overlay');
    expect(source).toContain('sceneBeacons: sceneBeaconsFor');
    expect(source).toContain('data-geology-journey');
    expect(source).toContain('focusJourneyTarget');
    expect(source).toContain('data-geology-journey-complete');
    expect(source).toContain('function sceneSignalPanel');
    expect(source).toContain('function reconstructPanel');
    expect(source).toContain("palette = SCENE.palette || ROCKS");
    expect(source).toContain('Explain your evidence');
    expect(source).toContain('Export field note');
  });

  it('keeps timeline, tour, and camera controls synchronized without stealing focus', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain('setBeaconTourStep(stage)');
    expect(source).toContain('if (beacon.view) setCameraView(beacon.view)');
    expect(source).toContain("'aria-valuetext': 'Stage '");
    expect(source).toContain("'data-geology-camera-view': vw[0]");
    expect(source).toContain('pointer-events-none absolute bottom-12 left-2');
    expect(source).toContain("style: { maxWidth: 'min(19rem, calc(100% - 6rem))' }");
    expect(source).toContain('flex min-h-11 min-w-11 items-center justify-center');
    expect(source).not.toContain('max-w-[min(19rem,calc(100%-4rem))]');
    expect(source).not.toContain("document.querySelector('[data-geology-target=\"beacons\"]')");
  });

  it('keeps every scene?s pure generator selectable for content-level smoke tests', () => {
    const scenes = P.scenes();
    for (const id of scenes) {
      P.setScene(id);
      expect(P.sceneId()).toBe(id);
    }
  });
});
