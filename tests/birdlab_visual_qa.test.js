import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const harnessPath = path.join(root, 'dev-tools', 'birdlab_visual_qa.mjs');

async function loadHarness() {
  return import(pathToFileURL(harnessPath).href);
}

describe('BirdLab visual-state QA harness', () => {
  it('exports unique core and exhaustive state manifests with required coverage', async () => {
    expect(fs.existsSync(harnessPath)).toBe(true);
    const { CORE_STATES, EXHAUSTIVE_STATES, validateStateMatrix } = await loadHarness();

    expect(Array.isArray(CORE_STATES)).toBe(true);
    expect(Array.isArray(EXHAUSTIVE_STATES)).toBe(true);
    expect(CORE_STATES.length).toBeGreaterThanOrEqual(68);
    expect(EXHAUSTIVE_STATES.length).toBeGreaterThanOrEqual(387);

    for (const states of [CORE_STATES, EXHAUSTIVE_STATES]) {
      const ids = states.map((state) => state && state.id);
      expect(ids.every((id) => typeof id === 'string' && id.length > 0)).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }

    const exhaustiveIds = new Set(EXHAUSTIVE_STATES.map((state) => state.id));
    expect(CORE_STATES.every((state) => exhaustiveIds.has(state.id))).toBe(true);
    expect(validateStateMatrix()).toMatchObject({
      ok: true,
      exhaustiveCount: EXHAUSTIVE_STATES.length,
      coreCount: CORE_STATES.length,
    });

    const coreStateData = JSON.stringify(CORE_STATES);
    for (const behavior of [
      'feeder-grab-go', 'hover-aim-dive', 'ground-forage-flush',
      'paddle-dabble-recover', 'snag-land-sentinel-launch',
    ]) {
      expect(coreStateData, 'missing core behavior checkpoints: ' + behavior).toContain(behavior);
    }
    const scriptedStates = CORE_STATES.filter((state) => state.behaviorId);
    expect(scriptedStates.length).toBeGreaterThan(0);
    for (const state of scriptedStates) {
      if (state.targetId) {
        expect(state.dwellProgress).toBeGreaterThan(0);
        expect(state.frozenBehavior).toMatchObject({
          script: state.behaviorId,
          state: state.behaviorCheckpoint,
        });
      } else {
        expect(state.frozenBehavior).toBeNull();
      }
    }

    for (const script of ['paddle-dabble-recover', 'snag-land-sentinel-launch']) {
      const scriptStates = scriptedStates.filter((state) => state.behaviorId === script);
      const naturalStates = scriptStates.filter((state) => !state.targetId);
      const acquiredStates = scriptStates.filter((state) => !!state.targetId);
      expect(naturalStates.length, script + ' natural checkpoints').toBeGreaterThan(0);
      expect(naturalStates.every((state) => state.dwellProgress === 0 && state.frozenBehavior === null)).toBe(true);
      expect(acquiredStates.length, script + ' acquired checkpoints').toBeGreaterThan(0);
      expect(acquiredStates.every((state) => state.dwellProgress > 0 && state.frozenBehavior?.script === script)).toBe(true);
      expect(acquiredStates.every((state) => state.frozenBehavior?.state === state.behaviorCheckpoint)).toBe(true);
    }

    const habitats = new Set(EXHAUSTIVE_STATES.map((state) => state.habitat));
    const lenses = new Set(EXHAUSTIVE_STATES.map((state) => state.lens));
    const conditions = new Set(EXHAUSTIVE_STATES.map((state) => state.condition));
    for (const habitat of ['forest', 'marsh', 'backyard', 'coast', 'mountain']) {
      expect(habitats.has(habitat), 'missing habitat state: ' + habitat).toBe(true);
    }
    for (const lens of ['wide', 'left', 'center', 'right']) {
      expect(lenses.has(lens), 'missing lens state: ' + lens).toBe(true);
    }
    for (const condition of ['dawn', 'day', 'dusk']) {
      expect(conditions.has(condition), 'missing condition state: ' + condition).toBe(true);
    }

    for (const field of [
      'viewport',
      'reducedMotion',
      'sceneMotion',
      'lifecycleMs',
      'behaviorMs',
      'frozenBehavior',
      'targetId',
      'dwellProgress',
      'assignmentSearchActive',
      'assignmentComplete',
      'assignmentDate',
      'assignmentClueStage',
      'hintSpecies',
    ]) {
      expect(
        EXHAUSTIVE_STATES.some((state) => Object.prototype.hasOwnProperty.call(state, field)),
        'missing state field: ' + field,
      ).toBe(true);
    }

    const targetStates = CORE_STATES.filter((state) => state.targetScenario);
    expect(targetStates.length).toBeGreaterThanOrEqual(5);
    expect(targetStates.map((state) => state.targetScenario)).toEqual(expect.arrayContaining([
      'target-active',
      'target-complete',
      'target-mobile',
      'target-reduced',
      'target-acquiring',
      'target-clue-field-mark-mobile',
      'target-clue-posture-reduced',
    ]));
    expect(targetStates.every((state) => /^\d{4}-\d{2}-\d{2}$/.test(state.assignmentDate))).toBe(true);
    expect(targetStates.some((state) => state.assignmentComplete)).toBe(true);
    expect(targetStates.some((state) => state.assignmentSearchActive && state.viewport.id === 'mobile')).toBe(true);
    expect(targetStates.some((state) => state.assignmentSearchActive && state.reducedMotion)).toBe(true);
    expect(targetStates.some((state) => state.assignmentSearchActive && state.targetId && state.dwellProgress > 0)).toBe(true);

    const clueStates = CORE_STATES.filter((state) => state.assignmentClueStage);
    expect(new Set(clueStates.map((state) => state.assignmentClueStage))).toEqual(new Set([
      'habitat', 'silhouette', 'behavior', 'field-mark', 'spatial',
    ]));
    expect(clueStates.every((state) => state.assignmentSearchActive && !state.assignmentComplete)).toBe(true);
    expect(clueStates.filter((state) => state.assignmentClueStage !== 'spatial').every((state) => !state.targetId)).toBe(true);
    expect(clueStates.some((state) => state.assignmentClueStage === 'spatial')).toBe(true);
    const mobileFieldMark = clueStates.find((state) => state.targetScenario === 'target-clue-field-mark-mobile');
    expect(mobileFieldMark).toMatchObject({ assignmentClueStage: 'field-mark' });
    expect(mobileFieldMark.viewport.id).toBe('mobile');
    const reducedPosture = clueStates.find((state) => state.targetScenario === 'target-clue-posture-reduced');
    expect(reducedPosture).toMatchObject({ assignmentClueStage: 'behavior', reducedMotion: true });
  });

  it('renders natural signature poses separately from acquired frozen checkpoints', async () => {
    const { CORE_STATES, renderScenarios } = await loadHarness();
    for (const specimen of [
      { script: 'paddle-dabble-recover', pose: 'mallard-dabble' },
      { script: 'snag-land-sentinel-launch', pose: 'eagle-flight' },
    ]) {
      const naturalStates = CORE_STATES.filter((state) => state.behaviorId === specimen.script && !state.targetId);
      expect(naturalStates.length, specimen.script + ' natural render states').toBeGreaterThan(0);
      const naturalResults = await renderScenarios(naturalStates);
      const signatureResult = naturalResults.find((result) => result.markup.includes('data-birdlab-field-pose="' + specimen.pose + '"'));
      expect(signatureResult, specimen.script + ' never naturally renders ' + specimen.pose).toBeTruthy();
      const naturalHost = document.createElement('div');
      naturalHost.innerHTML = signatureResult.markup;
      const naturalNodes = [...naturalHost.querySelectorAll('[data-birdlab-behavior="' + specimen.script + '"]')];
      const naturalActor = naturalNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
      const naturalTarget = naturalNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
      expect(naturalActor).toBeTruthy();
      expect(naturalTarget).toBeTruthy();
      expect(naturalActor.getAttribute('data-birdlab-behavior-pose')).toBe(specimen.pose);
      expect(naturalActor.hasAttribute('data-birdlab-behavior-frozen')).toBe(false);
      for (const attribute of ['data-birdlab-behavior-state', 'data-birdlab-behavior-pose']) {
        expect(naturalActor.getAttribute(attribute)).toBe(naturalTarget.getAttribute(attribute));
      }

      const acquiredState = CORE_STATES.find((state) => state.behaviorId === specimen.script && state.targetId && state.frozenBehavior);
      expect(acquiredState, specimen.script + ' acquired render state').toBeTruthy();
      const [acquiredResult] = await renderScenarios([acquiredState]);
      const acquiredHost = document.createElement('div');
      acquiredHost.innerHTML = acquiredResult.markup;
      const acquiredNodes = [...acquiredHost.querySelectorAll('[data-birdlab-behavior="' + specimen.script + '"]')];
      const acquiredActor = acquiredNodes.find((node) => node.querySelector('.birdlab-scene-actor'));
      const acquiredTarget = acquiredNodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
      expect(acquiredActor).toBeTruthy();
      expect(acquiredTarget).toBeTruthy();
      for (const attribute of ['data-birdlab-behavior-state', 'data-birdlab-behavior-pose', 'data-birdlab-behavior-frozen']) {
        expect(acquiredActor.getAttribute(attribute)).toBe(acquiredTarget.getAttribute(attribute));
      }
      expect(acquiredActor.getAttribute('data-birdlab-behavior-frozen')).toBe('true');
    }
  });

  it('captures impact, dabble wake, and hint containment checkpoints on the live lattice', async () => {
    const { CORE_STATES, renderScenarios } = await loadHarness();
    const kingfisherImpact = CORE_STATES.find((state) => state.behaviorId === 'hover-aim-dive'
      && state.lifecycleMs === 13000 && !state.targetId);
    expect(kingfisherImpact).toMatchObject({
      habitat: 'marsh',
      behaviorCheckpoint: expect.stringMatching(/^(?:dive|impact)$/),
    });

    const mallardCheckpoints = new Map(
      CORE_STATES.filter((state) => state.behaviorId === 'paddle-dabble-recover' && !state.targetId)
        .map((state) => [state.lifecycleMs, state]),
    );
    expect(mallardCheckpoints.get(9000)).toMatchObject({ behaviorCheckpoint: 'paddle' });
    expect(mallardCheckpoints.get(12000)).toMatchObject({ behaviorCheckpoint: 'dabble', behaviorPose: 'mallard-dabble' });
    expect(mallardCheckpoints.get(14000)).toMatchObject({ behaviorCheckpoint: 'recover' });

    const hintStates = CORE_STATES.filter((state) => state.hintSpecies === 'kingfisher' && state.lifecycleMs === 11000);
    expect(hintStates).toHaveLength(3);
    expect(new Set(hintStates.map((state) => state.motionMode))).toEqual(new Set(['live', 'manual-paused', 'reduced']));
    expect(hintStates.every((state) => state.habitat === 'marsh' && !state.targetId && state.dwellProgress === 0)).toBe(true);

    const results = await renderScenarios([kingfisherImpact, ...mallardCheckpoints.values(), ...hintStates]);
    const impactResult = results.find((result) => result.state.id === kingfisherImpact.id);
    const impactHost = document.createElement('div');
    impactHost.innerHTML = impactResult.markup;
    const impactNodes = impactHost.querySelectorAll('.birdlab-kingfisher-impact');
    expect(impactNodes).toHaveLength(1);
    expect(impactNodes[0].closest('.birdlab-motion-subject')).toBeNull();
    expect(impactNodes[0].querySelector('.birdlab-kingfisher-splash')).toBeTruthy();
    expect(impactNodes[0].querySelector('.birdlab-kingfisher-ripple')).toBeTruthy();

    for (const [lifecycleMs, checkpoint] of mallardCheckpoints) {
      if (![9000, 12000, 14000].includes(lifecycleMs)) continue;
      const result = results.find((candidate) => candidate.state.id === checkpoint.id);
      const host = document.createElement('div');
      host.innerHTML = result.markup;
      const nodes = [...host.querySelectorAll('[data-birdlab-species="mallard"][data-birdlab-behavior="paddle-dabble-recover"]')];
      const actor = nodes.find((node) => node.querySelector('.birdlab-scene-actor'));
      const target = nodes.find((node) => node.querySelector('[data-birdlab-kind="bird"]'));
      const actorMotion = actor.querySelector('.birdlab-motion-subject');
      const targetMotion = target.querySelector('.birdlab-motion-subject');
      expect(actorMotion.getAttribute('class')).toBe(targetMotion.getAttribute('class'));
      expect(actorMotion.classList.contains('birdlab-motion-subject--dabbling')).toBe(checkpoint.behaviorCheckpoint === 'dabble');
      expect(actor.querySelector('.birdlab-mallard-contact--' + checkpoint.behaviorCheckpoint)).toBeTruthy();
    }

    for (const state of hintStates) {
      const result = results.find((candidate) => candidate.state.id === state.id);
      const host = document.createElement('div');
      host.innerHTML = result.markup;
      const actor = [...host.querySelectorAll('[data-birdlab-species="kingfisher"]')]
        .find((node) => node.querySelector('.birdlab-scene-actor'));
      expect(actor.querySelector('.birdlab-motion-subject').classList.contains('birdlab-motion-subject--anchored')).toBe(true);
      expect(actor.querySelector('.birdlab-anatomy-motion--pinned-safe')).toBeTruthy();
      expect(host.querySelector('[data-birdlab-scene-shell]').classList.contains('birdlab-scene--motion-off'))
        .toBe(state.motionMode !== 'live');
    }
  });

  it('keeps check and capture as explicit package commands', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const verifyCommand = pkg.scripts && pkg.scripts['verify:birdlab-visual'];
    const captureCommand = pkg.scripts && pkg.scripts['visual:birdlab'];

    expect(verifyCommand).toContain('dev-tools/birdlab_visual_qa.mjs');
    expect(verifyCommand).toContain('--check');
    expect(captureCommand).toContain('dev-tools/birdlab_visual_qa.mjs');
    expect(captureCommand).toContain('--capture');

    const harnessSource = fs.readFileSync(harnessPath, 'utf8');
    expect(harnessSource).toContain('--check');
    expect(harnessSource).toContain('--capture');
    expect(harnessSource).toContain('assertTargetSearchDoesNotRewriteScene');
    expect(harnessSource).toContain('assignmentClueStage: state.assignmentClueStage');
    expect(harnessSource).toContain("'data-birdlab-target-clue-stage'");
    expect(harnessSource).toContain("'data-birdlab-target-clue-kind'");
    expect(harnessSource).toContain("'data-birdlab-target-clue-spatial'");
    expect(harnessSource).toMatch(/assignmentClueStage[^\n]*spatial|spatial[^\n]*assignmentClueStage/);
    expect(harnessSource).toContain('frozenBehavior: state.frozenBehavior');
    expect(harnessSource).toContain("'data-birdlab-behavior-frozen'");
    expect(harnessSource).toContain('must freeze its acquired behavior checkpoint');
    expect(harnessSource).toContain("querySelector('[data-birdlab-target-search]')");
    expect(harnessSource).toContain("querySelector('[data-birdlab-target-search-state]')");
    expect(harnessSource).toContain("querySelectorAll('[data-birdlab-assignment-target=\"true\"]')");
  });
});
