// The subsurface camera must be UNDER the ground, above the droplet.
//
// Defect (fixed 2026-09-21 @3c91e1b30): choosing Underground showed a tree
// trunk and a pale water plane. The labels, the parcel and the cutaway were all
// correct -- the CAMERA was not. `cameraTargets3d` put it at y +0.40 while the
// droplet sank to -1.78, so it framed the ground the droplet had just gone
// under. The scene was already fading the land, dropping its depthWrite and
// hiding the background forest: it prepared a cutaway that nothing looked into.
//
// A fixed height cannot fix it, because both subsurface states travel a long
// way vertically along their curve -- infiltration runs -0.82 down to -1.78,
// and the aquifer discharge climbs -2.18 back up to -0.72 as it returns to the
// ocean. So the camera tracks the droplet and clamps below the land surface.
//
// This pins the BEHAVIOUR by evaluating the shipped expressions against the
// shipped curves, not the spelling of any one line. A rewording stays free; the
// framing stays pinned. See feedback_slice_indexof_fails_open for why the
// region is sliced with real anchors rather than a character count.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { sliceBetween } from './helpers/anchored_slice.js';

const WATER_CYCLE_PATHS = [
  'stem_lab/stem_tool_watercycle.js',
  'desktop/web-app/public/stem_lab/stem_tool_watercycle.js',
];

// Top of the land box: position.y -1.8, BoxGeometry height 1.5 -> -1.05.
// Asserted from source below so a moved land surface fails this test loudly
// rather than silently invalidating the clamp.
const LAND_TOP = -1.05;

function readTool(filePath) {
  return readFileSync(filePath, 'utf8');
}

// Pull a [x, y, z] table (stageTargets3d / cameraTargets3d) out of the source.
function parseTargets(source, name) {
  const block = sliceBetween(source, 'var ' + name + ' = {', '};', { file: name });
  const out = {};
  for (const m of block.matchAll(/(\w+):\s*\[\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)\s*\]/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

// Pull the control points of a makeJourneyCurve3d(...) entry.
function parseCurve(source, stateName) {
  const at = source.indexOf(stateName + ': makeJourneyCurve3d(');
  expect(at, `${stateName} curve must exist`).toBeGreaterThan(-1);
  const open = source.indexOf('[[', at);
  const close = source.indexOf(']]', open);
  return JSON.parse(source.slice(open, close + 2));
}

describe.each(WATER_CYCLE_PATHS)('%s subsurface camera', (filePath) => {
  const source = readTool(filePath);

  it('keeps the land surface where the clamp assumes it is', () => {
    // The clamp constant is only meaningful while the land sits here, and the
    // land is positioned exactly once at creation (no later move or scale).
    expect(source).toContain('land3d.position.set(4.8, -1.8, -0.6)');
    expect(source).toContain('new THREE.BoxGeometry(9, 1.5, 7)');
    expect(-1.8 + 1.5 / 2).toBeCloseTo(LAND_TOP, 5);
  });

  it('tracks the droplet instead of sitting at a fixed height', () => {
    // A constant camera y for these states is the defect this replaced.
    const region = sliceBetween(
      source,
      'var cameraGoal3d = new THREE.Vector3(',
      'syncJourneyRoute3d(state3d);',
      { file: filePath, label: 'camera goal' },
    );
    expect(region).toMatch(/state3d === 'infiltrating'/);
    expect(region).toMatch(/state3d === 'aquifer_flow'/);
    expect(region).toMatch(/cameraGoal3d\.y\s*=/);
    expect(region, 'the camera must derive its height from the droplet')
      .toMatch(/target3d\.y/);
  });

  it('frames every point of both subsurface curves from inside the cutaway', () => {
    // Evaluate the SHIPPED rule against the SHIPPED curves.
    const region = sliceBetween(
      source,
      'var cameraGoal3d = new THREE.Vector3(',
      'syncJourneyRoute3d(state3d);',
      { file: filePath, label: 'camera goal' },
    );
    const lift = Number((region.match(/target3d\.y\s*\+\s*([\d.]+)/) || [])[1]);
    const clamp = Number((region.match(/Math\.min\(tracked3d,\s*(-?[\d.]+)\)/) || [])[1]);
    expect(lift, 'camera lift above the droplet').toBeGreaterThan(0);
    expect(clamp, 'clamp must hold the camera under the land surface').toBeLessThan(LAND_TOP);

    const cameraFor = (dropletY) => {
      const tracked = dropletY + lift;
      return dropletY < LAND_TOP ? Math.min(tracked, clamp) : tracked;
    };

    for (const state of ['infiltrating', 'aquifer_flow']) {
      for (const point of parseCurve(source, state)) {
        const dropletY = point[1];
        const cameraY = cameraFor(dropletY);
        // Always looking DOWN at the droplet, never up through soil at it.
        expect(cameraY, `${state}: camera must stay above the droplet at y=${dropletY}`)
          .toBeGreaterThan(dropletY);
        // And while the droplet is underground, so is the camera.
        if (dropletY < LAND_TOP) {
          expect(cameraY, `${state}: camera must stay under the land surface at y=${dropletY}`)
            .toBeLessThan(LAND_TOP);
        }
      }
    }
  });

  it('still frames the static targets, which is what reduced motion uses', () => {
    // With prefers-reduced-motion the droplet sits at stageTargets3d rather
    // than following the curve, so that path needs the same guarantee.
    const stage = parseTargets(source, 'stageTargets3d');
    const region = sliceBetween(
      source,
      'var cameraGoal3d = new THREE.Vector3(',
      'syncJourneyRoute3d(state3d);',
      { file: filePath, label: 'camera goal' },
    );
    const lift = Number((region.match(/target3d\.y\s*\+\s*([\d.]+)/) || [])[1]);
    const clamp = Number((region.match(/Math\.min\(tracked3d,\s*(-?[\d.]+)\)/) || [])[1]);

    for (const state of ['infiltrating', 'aquifer_flow']) {
      const dropletY = stage[state][1];
      const cameraY = dropletY < LAND_TOP ? Math.min(dropletY + lift, clamp) : dropletY + lift;
      expect(cameraY).toBeGreaterThan(dropletY);
      expect(cameraY).toBeLessThan(LAND_TOP);
    }
  });
});
