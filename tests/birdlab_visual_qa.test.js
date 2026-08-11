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
    expect(CORE_STATES.length).toBeGreaterThan(0);
    expect(EXHAUSTIVE_STATES.length).toBeGreaterThanOrEqual(360);

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
    for (const behavior of ['feeder-grab-go', 'hover-aim-dive', 'ground-forage-flush']) {
      expect(coreStateData, 'missing core behavior checkpoints: ' + behavior).toContain(behavior);
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
      'targetId',
      'dwellProgress',
    ]) {
      expect(
        EXHAUSTIVE_STATES.some((state) => Object.prototype.hasOwnProperty.call(state, field)),
        'missing state field: ' + field,
      ).toBe(true);
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
  });
});
