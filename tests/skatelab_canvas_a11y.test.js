import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_skatelab.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_skatelab.js';

describe('Skate Lab motion canvas semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the simulation canvas and retains its dynamic scene label', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    // The static "Interactive skate motion simulation canvas" label this used to
    // require was a SECOND aria-label in the same props object. Duplicate keys
    // are legal JavaScript and the last wins, so it never reached the DOM; only
    // the dynamic scene label ever did. Assert what the element really exposes.
    const at = source.indexOf("'aria-label': (function() {");
    expect(at, 'canvas should carry the dynamic scene label').toBeGreaterThan(-1);
    const opener = source.lastIndexOf("h('canvas'", at);
    expect(opener).toBeGreaterThan(-1);
    const props = source.slice(opener, at);
    expect(props, 'canvas should declare role="img"').toMatch(/role:\s*'img'/);
    expect((props.match(/'aria-label'\s*:/g) || []).length,
      'canvas should declare aria-label once, not twice').toBe(0);
    expect(source).toContain("'aria-describedby': 'sk-canvas-summary'");
  });

  it('draws the actual aerodynamic force in both views and describes its energy transfer', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const laneStart = source.indexOf('function drawLaneInset2D(ctx, sim, sample, width)');
    const sideStart = source.indexOf('function drawGap2D(ctx, width, height, sim, sample, config)');
    const orbitStart = source.indexOf('function drawGap3D(ctx, width, height, sim, sample, config)');
    const sceneStart = source.indexOf('function drawScene(canvas, sim, progress, config)');

    expect(laneStart).toBeGreaterThan(-1);
    expect(sideStart).toBeGreaterThan(laneStart);
    expect(orbitStart).toBeGreaterThan(sideStart);
    expect(sceneStart).toBeGreaterThan(orbitStart);

    const laneInset = source.slice(laneStart, sideStart);
    const sideView = source.slice(sideStart, orbitStart);
    const orbitView = source.slice(orbitStart, sceneStart);

    expect(laneInset).toContain('sample.airForceZ');
    expect(laneInset).toContain("'F_air,z'");
    expect(sideView).toContain('sample.airForceX');
    expect(sideView).toContain('sample.airForceY');
    expect(sideView).toContain("'F_air'");
    expect(orbitView).toContain('sample.airForceX');
    expect(orbitView).toContain('sample.airForceY');
    expect(orbitView).toContain('sample.airForceZ');
    expect(orbitView).toContain("'F_air'");
    expect(source).toContain('The amber F-air arrow points opposite air-relative motion.');
    expect(source).toContain('air-relative dissipation');
    expect(source).toContain('resulting net aerodynamic energy change');
    expect(source).toContain('.sk-ledger-wind{background:var(--sk-compare)}');
  });
});
