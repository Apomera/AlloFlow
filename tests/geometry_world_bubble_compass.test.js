// The Professor Block speech bubble is a world-anchored sprite, so a camera pose can put it behind the compass strip,
// where it read as a clipped banner. GW_BUBBLE_SRC points the suite at another copy for the fail-first proof.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync(process.env.GW_BUBBLE_SRC || 'stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
function helper() {
  const a = source.indexOf('function geometrySpriteCoversElement('), b = source.indexOf('  function geometryPaintGuideCompass(', a);
  if (a < 0 || b < a) throw new Error('helper missing');
  return new Function(source.slice(a, b) + ';return geometrySpriteCoversElement;')();
}
const rect = (left, top, width, height) => ({ getBoundingClientRect: () => ({ left, top, width, height, right: left + width, bottom: top + height }) });
function pose() {
  const camera = new THREE.PerspectiveCamera(60, 1191 / 596, 0.1, 500);
  camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1); camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.scale.set(2.5, 0.6, 1);
  return { camera, sprite };
}
const CANVAS = rect(37, 230, 1191, 596), STRIP = rect(502, 242, 260, 32);

describe('speech bubble against the guide compass', () => {
  it('reports a covering bubble at the top of the view', () => {
    const covers = helper(), { camera, sprite } = pose();
    // Viewport centre x sits inside the strip; ndc y near the top puts it on the strip.
    sprite.position.set(0, 2.2, -5); sprite.updateMatrixWorld();
    expect(covers(sprite, camera, CANVAS, STRIP)).toBe(true);
  });
  it('clears a bubble in the middle of the view, one behind the camera, and a hidden compass', () => {
    const covers = helper(), { camera, sprite } = pose();
    sprite.position.set(0, -0.5, -5); expect(covers(sprite, camera, CANVAS, STRIP)).toBe(false);
    sprite.position.set(0, 2.2, 5); expect(covers(sprite, camera, CANVAS, STRIP)).toBe(false);
    sprite.position.set(0, 2.2, -5);
    expect(covers(sprite, camera, CANVAS, rect(0, 0, 0, 0))).toBe(false);
    expect(covers(sprite, camera, CANVAS, null)).toBe(false);
  });
  it('the frame loop slides the bubble clear of both panels, and drops it only when it cannot', () => {
    const a = source.indexOf('npc._speechBubble.position.y = npc.data.position[1] + 3.6'), loop = source.slice(a, source.indexOf('// "Press E" prompt', a));
    expect(loop).toContain("var sbPanels = [document.querySelector('.gw-guide-compass'), document.querySelector('.gw-learning-compass')];");
    expect(loop).toContain('geometrySpriteDropToClear(npc._speechBubble, engine.camera, engine.renderer.domElement, sbPanels, 0.75)');
    expect(loop).toContain('if (sbDrop < 0) npc._speechBubble.material.opacity = 0;');
    expect(loop).toContain('npc.qMark.material.opacity = 0');
  });
});

describe('sliding the bubble under the compass', () => {
  function tools() {
    const a = source.indexOf('function geometrySpriteCoversElement('), b = source.indexOf('  function geometryPaintGuideCompass(', a);
    return new Function(source.slice(a, b) + ';return { covers: geometrySpriteCoversElement, drop: geometrySpriteDropToClear };')();
  }
  // The tool's own camera: fov 75 at eye height, looking level, with a professor whose bubble rests 3.6 above the floor.
  function atDistance(d, eye = 1.6) {
    const camera = new THREE.PerspectiveCamera(75, 1191 / 596, 0.1, 200);
    camera.position.set(0, eye, 0); camera.lookAt(0, eye, -1); camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial()); sprite.scale.set(2.5, 0.6, 1); sprite.position.set(0, 3.6, -d);
    return { camera, sprite };
  }
  // Tall enough that the resting bubble reaches it at every distance in the bubble's range.
  const TALL_STRIP = rect(502, 242, 260, 90);

  it('clears the panel without moving further than the name label', () => {
    const { covers, drop } = tools();
    let helped = 0;
    for (let d = 3.5; d <= 6; d += 0.25) {
      const { camera, sprite } = atDistance(d);
      const rests = covers(sprite, camera, CANVAS, TALL_STRIP);
      const moved = drop(sprite, camera, CANVAS, [TALL_STRIP, null], 0.75);
      if (moved < 0) { expect(sprite.position.y).toBe(3.6); continue; }
      expect(covers(sprite, camera, CANVAS, TALL_STRIP)).toBe(false);
      expect(moved).toBeLessThanOrEqual(0.75);
      if (rests) { expect(moved).toBeGreaterThan(0); helped++; }
    }
    expect(helped).toBeGreaterThan(0);
  });

  it('does not move a bubble that is already clear', () => {
    const { drop } = tools();
    const { camera, sprite } = atDistance(5);
    expect(drop(sprite, camera, CANVAS, [rect(0, 0, 0, 0), null], 0.75)).toBe(0);
    expect(sprite.position.y).toBe(3.6);
  });

  it('gives up and puts it back when no allowed slide clears the panel', () => {
    const { drop } = tools();
    const { camera, sprite } = atDistance(3.5);
    expect(drop(sprite, camera, CANVAS, [rect(37, 230, 1191, 596)], 0.75)).toBe(-1);
    expect(sprite.position.y).toBe(3.6);
  });
});

describe('what a slid bubble would otherwise hide', () => {
  function tools() {
    const a = source.indexOf('function geometryGuideCameraBasis('), b = source.indexOf('  function geometryPaintGuideCompass(', a);
    return new Function(source.slice(a, b) + ';return { box: geometrySpriteScreenBox, beside: geometryMarkerBesideBubble, hide: geometryHideLabelsBehindBubbles };')();
  }
  function scene() {
    const camera = new THREE.PerspectiveCamera(75, 1191 / 596, 0.1, 200);
    camera.position.set(0, 1.6, 0); camera.lookAt(0, 1.6, -1); camera.updateMatrixWorld(); camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    return { camera };
  }
  const sprite = (x, y, z, w, h, opacity = 1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ opacity })); s.position.set(x, y, z); s.scale.set(w, h, 1); return s; };
  const overlap = (p, q) => p.left < q.right && p.right > q.left && p.top < q.bottom && p.bottom > q.top;

  it('stands the question mark beside the bubble, at its height, not on it', () => {
    const { box, beside } = tools(), { camera } = scene();
    const bubble = sprite(0, 2.9, -5, 2.5, 0.6), mark = sprite(0, 3.05, -5, 0.42, 0.42);
    expect(beside(mark, bubble, camera, CANVAS, [])).toBe(true);
    expect(mark.position.y).toBe(2.9);
    expect(mark.position.x).toBeGreaterThan(1.25);
    expect(overlap(box(mark, camera, CANVAS), box(bubble, camera, CANVAS))).toBe(false);
  });
  it('takes the other side when a panel holds the first', () => {
    const { beside } = tools(), { camera } = scene();
    const bubble = sprite(0, 2.9, -5, 2.5, 0.6), mark = sprite(0, 3.05, -5, 0.42, 0.42);
    expect(beside(mark, bubble, camera, CANVAS, [rect(700, 230, 528, 596)])).toBe(true);
    expect(mark.position.x).toBeLessThan(-1.25);
  });
  it('reports failure and puts the mark back when panels hold both sides', () => {
    const { beside } = tools(), { camera } = scene();
    const bubble = sprite(0, 2.9, -5, 2.5, 0.6), mark = sprite(0, 3.05, -5, 0.42, 0.42);
    expect(beside(mark, bubble, camera, CANVAS, [rect(37, 230, 1191, 596)])).toBe(false);
    expect([mark.position.x, mark.position.y, mark.position.z]).toEqual([0, 3.05, -5]);
  });
  it('hides a farther guide name card behind a showing bubble, and only then', () => {
    const { hide } = tools(), { camera } = scene();
    const near = { label: sprite(0, 2.45, -5, 2, 0.5), _speechBubble: sprite(0, 3.2, -5, 2.5, 0.6, 0.95) };
    // Same line of sight as the bubble: (3.2 - 1.6) / 5 = (5.44 - 1.6) / 12.
    const behind = { label: sprite(0, 5.44, -12, 2, 0.5) };
    const aside = { label: sprite(9, 5.44, -12, 2, 0.5) };
    const closer = { label: sprite(0, 2.55, -3, 0.5, 0.2) };
    hide([near, behind, aside, closer], camera, CANVAS);
    expect(behind.label.visible).toBe(false);
    expect(aside.label.visible).toBe(true);
    expect(near.label.visible).toBe(true);
    expect(closer.label.visible).toBe(true);
    near._speechBubble.material.opacity = 0;
    hide([near, behind, aside, closer], camera, CANVAS);
    expect(behind.label.visible).toBe(true);
  });
  it('the frame loop uses both', () => {
    expect(source).toContain('geometryMarkerBesideBubble(npc.qMark, npc._speechBubble, engine.camera, engine.renderer.domElement, sbPanels)');
    expect(source).toContain('geometryHideLabelsBehindBubbles(engine.npcs, engine.camera, engine.renderer.domElement)');
  });
});
