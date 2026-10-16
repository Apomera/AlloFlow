import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * The four-forces overlay (F) had two defects that only a screenshot could see.
 *
 * 1. It was drawn at the top of the HUD block, but the world keeps painting for
 *    another ~500 lines after that — drawAirportGround, drawRunway, ground
 *    shadows, traffic, landmark sprites, weather, city lights, particles. The
 *    card spans y 260..444 and the horizon sits near y 397 in level flight, so
 *    the terrain painted over its bottom third. Worst exactly when a student
 *    first presses F: parked at an airport, where drawAirportGround fires and
 *    buried the Weight arrow and its value entirely.
 *
 * 2. Lift and Weight were labelled at the ARROW TIP while Thrust and Drag were
 *    pinned near the origin, so the vertical pair slid into the horizontal pair
 *    as the forces shrank. On a parked aircraft — all four zero — "Lift: 0 lbs"
 *    printed straight through "Thrust: 0 lbs".
 *
 * Neither throws, neither is in the DOM, and no contrast, aria or render gate
 * can reach canvas text. Hence a source-order test.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

describe('flightsim four-forces overlay', () => {
  it('is drawn after the world layers that used to bury it', () => {
    eachSource((source, path) => {
      const forces = source.indexOf('drawForces(gfx, W - 112, 352');
      expect(forces, `${path}: the force diagram call is gone`).toBeGreaterThan(-1);
      // Every one of these paints part of the scene. All must run BEFORE the card.
      for (const later of ['drawRunway(gfx, W, H', 'drawParticles(gfx, W, H']) {
        const at = source.indexOf(later);
        expect(at, `${path}: ${later} is gone`).toBeGreaterThan(-1);
        expect(at, `${path}: ${later} paints over the force diagram again`).toBeLessThan(forces);
      }
    });
  });

  it('keeps the accessible DOM help above the canvas force diagram', () => {
    eachSource((source, path) => {
      // Help is now scrollable DOM. Canvas paint order cannot establish that
      // it covers the force card: its stacking level must exceed the flight
      // canvas, and the live flying view must actually render the reference.
      const helpStart = source.indexOf('var renderFlightHelp =');
      expect(helpStart, `${path}: the accessible help renderer is gone`).toBeGreaterThan(-1);
      const helpBlock = source.slice(helpStart, source.indexOf('var challengeObjectiveText =', helpStart));
      const helpLayer = helpBlock.match(/position: 'absolute',\s*zIndex: (\d+)/);
      expect(helpLayer, `${path}: help no longer has an overlay stacking level`).not.toBeNull();
      expect(helpBlock, `${path}: the help reference lost its accessible region`).toContain("role: 'region'");
      expect(helpBlock, `${path}: help lost its DOM close control`).toContain("id: 'skyschool-close-help'");
      const surface = source.indexOf("role: 'application'");
      const canvasStart = source.lastIndexOf("h('canvas',", surface);
      const helpRender = source.indexOf('d.showHelp && renderFlightHelp()', surface);
      expect(canvasStart, `${path}: the interactive canvas is gone`).toBeGreaterThan(-1);
      expect(helpRender, `${path}: flying no longer renders the help region`).toBeGreaterThan(surface);
      const canvasLayer = source.slice(canvasStart, helpRender).match(/zIndex: (\d+)/);
      expect(canvasLayer, `${path}: the interactive canvas lost its stacking level`).not.toBeNull();
      expect(Number(helpLayer[1]), `${path}: the canvas can cover the help reference`).toBeGreaterThan(Number(canvasLayer[1]));
    });
  });

  it('gives each force label a fixed slot so they cannot overlap', () => {
    eachSource((source, path) => {
      // A tip-anchored label (ex, ey) converges on the origin as its force goes
      // to zero and overprints whichever label is pinned there.
      const start = source.indexOf('var drawForces =');
      const block = source.slice(start, source.indexOf('var terrainHash =', start));
      expect(block.length, `${path}: could not isolate drawForces`).toBeGreaterThan(800);
      expect(block, `${path}: force labels are positioned at the arrow tip again`)
        .not.toMatch(/fillText\(a\.label, ex, ey/);
      for (const slot of ['cx, cy - 64', 'cx, cy + 78', 'cx + 88, cy - 26', 'cx - 88, cy + 42']) {
        expect(block, `${path}: force label slot ${slot} is gone`).toContain(slot);
      }
    });
  });

  it('states each force as one translatable sentence', () => {
    eachSource((source, path) => {
      // 'Lift: ' + n + ' lbs' cannot be translated as three pieces.
      expect(source, `${path}: force labels are glued from fragments again`)
        .not.toMatch(/label: '(Lift|Weight|Thrust|Drag): ' \+/);
      expect(source, `${path}: the force labels are no longer translatable`)
        .toContain("stem.flightsim.forces_label_lift");
    });
  });
});
