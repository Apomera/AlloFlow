import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let physics;

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_skatelab.js', 'skatelab');
  physics = window.__alloSkatePhysicsPure;
});

function halfpipe(overrides = {}) {
  return physics.simHalfpipe({
    pumps: 3,
    trickId: 'kickflip',
    vehicle: 'skate',
    gravity: 9.81,
    surfaceId: 'standard',
    ...overrides,
  });
}

describe('Skate Lab halfpipe energy ledger', () => {
  it('conserves input energy across mechanical and thermal reservoirs', () => {
    for (const surfaceId of ['wax', 'standard', 'rough']) {
      const result = halfpipe({ surfaceId });

      expect(result.mechanicalJ + result.thermalJ).toBeCloseTo(result.energyInputJ, 10);
      expect(result.mechanicalJ).toBeCloseTo(
        (physics.constants.riderKg + result.vehicle.mass) * result.gravity * result.hAir,
        10,
      );
    }
  });

  it('turns a larger fraction of launch energy into heat on rough surfaces', () => {
    const wax = halfpipe({ surfaceId: 'wax' });
    const standard = halfpipe({ surfaceId: 'standard' });
    const rough = halfpipe({ surfaceId: 'rough' });

    expect(rough.thermalJ).toBeGreaterThan(standard.thermalJ);
    expect(standard.thermalJ).toBeGreaterThan(wax.thermalJ);
    expect(wax.hAir).toBeGreaterThan(standard.hAir);
    expect(standard.hAir).toBeGreaterThan(rough.hAir);
  });

  it('scales height and airtime inversely with gravity at fixed launch speed', () => {
    const earth = halfpipe({ gravity: 9.81 });
    const moon = halfpipe({ gravity: 1.62 });
    const gravityRatio = earth.gravity / moon.gravity;

    expect(moon.hAir / earth.hAir).toBeCloseTo(gravityRatio, 10);
    expect(moon.airTime / earth.airTime).toBeCloseTo(gravityRatio, 10);
    expect(moon.mechanicalJ).toBeCloseTo(earth.mechanicalJ, 10);
  });

  it('shows the three-reservoir ledger in the accessible equation walkthrough', () => {
    const html = renderTool('skatelab', {
      skatelab: {
        mode: 'halfpipe',
        pumps: 3,
        trickId: 'kickflip',
        vehicle: 'skate',
        gravity: 9.81,
        surfaceId: 'rough',
        showFormula: true,
      },
    });

    expect(html).toContain('Energy ledger');
    expect(html).toContain('mechanical');
    expect(html).toContain('thermal');
    expect(html).toContain('J input');
  });

  it('does not retain the incorrect Moon-energy or 30-degree guidance', () => {
    const source = readFileSync('stem_lab/stem_tool_skatelab.js', 'utf8');

    expect(source).not.toContain('PE = mgh stay the same on the Moon if h doesn\'t change');
    expect(source).not.toContain('~30° works best when you need to land at the same height');
    expect(source).toContain('range peaks at 45°');
  });
});
