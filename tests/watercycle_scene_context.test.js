import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SOURCE_PATH = resolve(process.cwd(), 'stem_lab/stem_tool_watercycle.js');
const MIRROR_PATH = resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js');
const source = readFileSync(SOURCE_PATH, 'utf8');

function sourceBetween(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  expect(from, start).toBeGreaterThan(-1);
  expect(to, end).toBeGreaterThan(from);
  return source.slice(from, to);
}

// Execute the actual renderer derivations. The selected process label is supplied
// as it is by STAGES; the journey names and orientation mapping come from source.
const deriveScene = new Function('d', 'currentStageLabel', [
  "'use strict';",
  sourceBetween('          var journeyActiveStageMap = {', '          var resolvedStage = STAGES.find'),
  sourceBetween('          var currentSubsurfacePhase = d.journeyActive', '          var currentSubsurfacePhaseLabel ='),
  sourceBetween('          var wcScenePreviewStateMap = {', '          var currentStageFlow = activeJourneyMatterEnergy'),
  sourceBetween('          var journeyStateLabels = {', '          var journeyTransitionStatus ='),
  'return { resolvedStageId, currentSubsurfacePhase, lensState: wcSceneLensState,',
  '  lensLabel: wcSceneLensLabel, lensZone: wcSceneLensZone, cameraModeLabel: wcSceneLensMode,',
  '  journeyLabel, immersiveStageLabel, journeyStateLabel, guideProcessLabel: wcCanvasGuideProcessLabel };',
].join('\n'));

const previews = [
  ['evaporation', 'Evaporation', 'evaporating', 'Atmosphere', 'sky'],
  ['condensation', 'Condensation', 'condensing', 'Atmosphere', 'sky'],
  ['precipitation', 'Precipitation', 'precipitating', 'Atmosphere', 'sky'],
  ['collection', 'Collection', 'ocean', 'Landscape overview', 'overview'],
  ['transpiration', 'Transpiration', 'transpiring', 'Landscape overview', 'overview'],
  ['infiltration', 'Infiltration', 'infiltrating', 'Soil pore space', 'subsurface'],
];
const rememberedStates = [
  undefined, 'idle', 'ocean', 'evaporating', 'condensing', 'precipitating',
  'ground_choice', 'river_runoff', 'infiltrating', 'aquifer_flow', 'plant_absorb',
  'transpiring', 'complete', 'unknown_saved_state',
];
const journeyContexts = [
  ['ocean', 'collection', 'Ocean storage', 'Landscape overview', 'overview'],
  ['evaporating', 'evaporation', 'Evaporation', 'Atmosphere', 'sky'],
  ['condensing', 'condensation', 'Condensation', 'Atmosphere', 'sky'],
  ['precipitating', 'precipitation', 'Precipitation', 'Atmosphere', 'sky'],
  ['ground_choice', 'precipitation', 'Land pathway choice', 'Surface routing', 'surface'],
  ['river_runoff', 'collection', 'River runoff', 'Surface routing', 'surface'],
  ['infiltrating', 'infiltration', 'Infiltration', 'Soil pore space', 'subsurface'],
  ['aquifer_flow', 'infiltration', 'Aquifer flow', 'Subsurface discharge', 'subsurface'],
  ['plant_absorb', 'transpiration', 'Plant uptake', 'Landscape overview', 'overview'],
  ['transpiring', 'transpiration', 'Transpiration', 'Landscape overview', 'overview'],
  ['complete', 'collection', 'Cycle complete', 'Landscape overview', 'overview'],
];

describe('Water Cycle resolved scene context', () => {
  it.each(previews)('inactive %s preview ignores remembered parcel state', (stage, name, lensState, label, zone) => {
    for (const remembered of rememberedStates) {
      for (const paused of [false, true]) {
        const state = Object.freeze({ activeStage: stage, journeyActive: false, journeyState: remembered, journeyPaused: paused });
        const result = deriveScene(state, name);
        expect(result.resolvedStageId, String(remembered)).toBe(stage);
        expect(result.lensState, String(remembered)).toBe(lensState);
        expect(result.lensLabel, String(remembered)).toBe(label);
        expect(result.lensZone, String(remembered)).toBe(zone);
        expect(result.immersiveStageLabel).toBe(name + ' preview');
        expect(result.guideProcessLabel).toBe(name);
        expect(result.journeyLabel).toBe('Ready to start');
      }
    }
  });

  it.each(journeyContexts)('active %s retains its lens and human journey name', (state, stage, name, label, zone) => {
    for (const paused of [false, true]) {
      const result = deriveScene(Object.freeze({ activeStage: 'collection', journeyActive: true, journeyState: state, journeyPaused: paused }), 'Selected process');
      expect(result.resolvedStageId).toBe(stage);
      expect(result.lensState).toBe(state);
      expect(result.lensLabel).toBe(label);
      expect(result.lensZone).toBe(zone);
      expect(result.journeyLabel).toBe(name);
      expect(result.immersiveStageLabel).toBe(name);
      expect(result.journeyStateLabel).toBe(name);
      expect(result.guideProcessLabel).toBe(name);
    }
  });

  it('an active journey without a saved state begins with Ocean storage', () => {
    const result = deriveScene(Object.freeze({ journeyActive: true, activeStage: 'transpiration' }), 'Transpiration');
    expect(result.resolvedStageId).toBe('collection');
    expect(result.lensState).toBe('ocean');
    expect(result.lensLabel).toBe('Landscape overview');
    expect(result.lensZone).toBe('overview');
    expect(result.journeyLabel).toBe('Ocean storage');
    expect(result.immersiveStageLabel).toBe('Ocean storage');
  });

  it('an inactive default preview shows evaporation even after aquifer flow', () => {
    const result = deriveScene(Object.freeze({ journeyActive: false, journeyState: 'aquifer_flow' }), 'Evaporation');
    expect(result.resolvedStageId).toBe('evaporation');
    expect(result.lensState).toBe('evaporating');
    expect(result.lensLabel).toBe('Atmosphere');
    expect(result.lensZone).toBe('sky');
    expect(result.immersiveStageLabel).toBe('Evaporation preview');
  });

  it('unknown restored active names retain the existing descriptive fallback', () => {
    const result = deriveScene(Object.freeze({ journeyActive: true, journeyState: 'unknown_saved_state', activeStage: 'collection' }), 'Collection');
    expect(result.journeyLabel).toBe('Water droplet in motion');
    expect(result.immersiveStageLabel).toBe('Water droplet in motion');
    expect(result.guideProcessLabel).toBe('Water droplet in motion');
  });

  it('camera status remains independent of pause, process, and stored journey name', () => {
    for (const cameraMode of ['follow', 'orbit']) {
      for (const paused of [false, true]) {
        for (const active of [false, true]) {
          const state = Object.freeze({ journeyActive: active, journeyState: 'aquifer_flow', activeStage: 'condensation', journeyPaused: paused, wc3dCameraMode: cameraMode });
          expect(deriveScene(state, 'Condensation').cameraModeLabel).toBe(cameraMode === 'orbit' ? 'Free orbit' : 'Follow camera');
        }
      }
    }
  });

  it('deriving display context leaves saved progress, choices, writing, and camera status intact', () => {
    const state = Object.freeze({
      journeyActive: false, activeStage: 'precipitation', journeyState: 'plant_absorb',
      journeyPaused: true, journeyReplayProgress: 0.74, journeyLastPath: 'plant',
      journeyPaths: Object.freeze({ runoff: 2, infiltrate: 1, plant: 3 }),
      wc3dCameraMode: 'orbit', climTemp: 31,
      wcProcessCompare: Object.freeze({ first: 'evaporation', second: 'transpiration', notes: Object.freeze({ 'evaporation|transpiration': 'My explanation' }) }),
    });
    const before = JSON.stringify(state);
    const result = deriveScene(state, 'Precipitation');
    expect(result.lensLabel).toBe('Atmosphere');
    expect(result.cameraModeLabel).toBe('Free orbit');
    expect(result.journeyLabel).toBe('Ready to start');
    expect(JSON.stringify(state)).toBe(before);
    expect(state.journeyState).toBe('plant_absorb');
    expect(state.journeyReplayProgress).toBe(0.74);
    expect(state.journeyPaths.plant).toBe(3);
    expect(state.wcProcessCompare.notes['evaporation|transpiration']).toBe('My explanation');
  });

  it('source and public context implementations are identical', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});
