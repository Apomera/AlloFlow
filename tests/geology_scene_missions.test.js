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

  it('defines scene-aware process cues with three stages and depth context', () => {
    for (const id of P.scenes()) {
      const cue = P.processCues(id);
      expect(cue.title, id).toBeTruthy();
      expect(cue.summary, id).toBeTruthy();
      expect(cue.depth, id).toBeTruthy();
      expect(cue.steps, id).toHaveLength(3);
      expect(cue.steps.every((step) => step.label && step.detail)).toBe(true);
    }
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
    expect(source).toContain('data-geology-camera-compass');
    expect(source).toContain('data-geology-process-overlay');
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

  it('keeps every scene?s pure generator selectable for content-level smoke tests', () => {
    const scenes = P.scenes();
    for (const id of scenes) {
      P.setScene(id);
      expect(P.sceneId()).toBe(id);
    }
  });
});
