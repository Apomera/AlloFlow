// solarSystem — orrery planet labels must stay readable while the system runs.
//
// Reported symptom: the labels "bounce around too much to be readable". Three
// separate causes, all in the animation loop:
//   1. `labelContainer.innerHTML = ''` plus a fresh createElement per planet on
//      EVERY frame - ~9 DOM nodes destroyed and rebuilt 60x a second;
//   2. fractional `left`/`top` in px, so the text re-rasterised on sub-pixel
//      boundaries every frame and shimmered even when barely moving;
//   3. no separation, so the inner planets - which bunch up near the Sun in
//      screen space - stacked their labels on top of each other.
//
// A screenshot cannot show any of this, because all three are properties of
// motion ACROSS frames. So drive the real source block instead and assert the
// properties directly. Source-literal extraction: solarSystem is ~1 MB, too
// slow for loadTool.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const COPIES = [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

let src;
beforeAll(() => { src = fs.readFileSync(COPIES[0], 'utf8'); });

// ── Minimal stand-ins for the pieces the block touches ──
function fakeElement() {
  const el = {
    style: { cssText: '', transform: '', display: '' },
    textContent: '',
    _id: Math.random(),
  };
  return el;
}
function fakeContainer() {
  const c = { children: [], _solarLabelCache: null };
  c.appendChild = (el) => { c.children.push(el); return el; };
  Object.defineProperty(c, 'innerHTML', {
    get() { return ''; },
    set() { c.children.length = 0; },
  });
  return c;
}
function vec(x, y, z) {
  return {
    x, y, z,
    clone() { return vec(this.x, this.y, this.z); },
    project() { return this; }, // identity camera: NDC == world, keeps the test about layout
  };
}
function fakeMesh(name, x, y) {
  return { position: vec(x, y, 0), geometry: { parameters: { radius: 0 } }, userData: { name } };
}

function buildRunner() {
  const start = src.indexOf('                if (labelContainer) {');
  expect(start, 'label update block not found').toBeGreaterThan(-1);
  const marker = '// HUD telemetry update';
  const end = src.indexOf(marker, start);
  expect(end).toBeGreaterThan(start);
  const block = src.slice(start, end);
  expect(block, 'block must be the persistent-label implementation').toContain('_solarLabelCache');
  // eslint-disable-next-line no-new-func
  return new Function(
    'labelContainer', 'planetMeshes', 'camera', 'W', 'H', 'canvas', 'document',
    block,
  );
}

describe('solarSystem — orrery label stability', () => {
  it('ships the same file to the CDN and the desktop bundle', () => {
    expect(fs.readFileSync(COPIES[0], 'utf8')).toBe(fs.readFileSync(COPIES[1], 'utf8'));
  });

  it('does not tear down and rebuild the labels every frame', () => {
    const run = buildRunner();
    const container = fakeContainer();
    const doc = { createElement: fakeElement };
    const canvas = { dataset: {} };
    const meshes = [fakeMesh('Mercury', 0.1, 0.1), fakeMesh('Earth', -0.4, 0.3)];

    run(container, meshes, {}, 800, 600, canvas, doc);
    const firstNodes = container.children.slice();
    expect(firstNodes).toHaveLength(2);

    for (let frame = 0; frame < 30; frame += 1) {
      meshes[0].position.x = Math.cos(frame * 0.3) * 0.4;
      meshes[0].position.y = Math.sin(frame * 0.3) * 0.4;
      run(container, meshes, {}, 800, 600, canvas, doc);
    }
    // Same element objects, still exactly two of them.
    expect(container.children).toHaveLength(2);
    expect(container.children[0]).toBe(firstNodes[0]);
    expect(container.children[1]).toBe(firstNodes[1]);
  });

  it('positions labels on whole pixels via transform, never fractional left/top', () => {
    const run = buildRunner();
    const container = fakeContainer();
    const doc = { createElement: fakeElement };
    const meshes = [fakeMesh('Mars', 0.333333, 0.177777)];
    for (let i = 0; i < 40; i += 1) run(container, meshes, {}, 801, 601, { dataset: {} }, doc);

    const el = container.children[0];
    const match = el.style.transform.match(/translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px/);
    expect(match, 'expected a translate3d transform, got: ' + el.style.transform).toBeTruthy();
    expect(Number.isInteger(Number(match[1]))).toBe(true);
    expect(Number.isInteger(Number(match[2]))).toBe(true);
    // left/top must stay pinned at 0 - transform is the single owner of position.
    expect(el.style.cssText).toContain('left:0');
    expect(el.style.cssText).toContain('top:0');
  });

  it('eases toward the planet instead of snapping, which is what read as bounce', () => {
    const run = buildRunner();
    const container = fakeContainer();
    const doc = { createElement: fakeElement };
    const mesh = fakeMesh('Mercury', 0, 0);
    run(container, [mesh], {}, 800, 600, { dataset: {} }, doc);
    const readX = () => Number(container.children[0].style.transform.match(/translate3d\((-?[\d.]+)px/)[1]);
    const settled = readX();

    // Teleport the planet across the screen, as a fast inner orbit effectively does.
    mesh.position.x = 0.9;
    run(container, [mesh], {}, 800, 600, { dataset: {} }, doc);
    const afterOneFrame = readX();
    const target = (0.9 * 0.5 + 0.5) * 800;

    // It must move toward the target, but must NOT arrive in a single frame.
    expect(afterOneFrame).toBeGreaterThan(settled);
    expect(afterOneFrame).toBeLessThan(target - 1);

    // ...and it must actually converge, not lag forever.
    for (let i = 0; i < 90; i += 1) run(container, [mesh], {}, 800, 600, { dataset: {} }, doc);
    expect(Math.abs(readX() - target)).toBeLessThan(2);
  });

  it('separates labels that would otherwise stack near the Sun', () => {
    const run = buildRunner();
    const container = fakeContainer();
    const doc = { createElement: fakeElement };
    // Four inner planets crowded into nearly the same screen point.
    const meshes = ['Mercury', 'Venus', 'Earth', 'Mars'].map((n, i) => fakeMesh(n, 0.001 * i, 0.001 * i));
    for (let i = 0; i < 60; i += 1) run(container, meshes, {}, 800, 600, { dataset: {} }, doc);

    const ys = container.children.map((el) => Number(el.style.transform.match(/,\s*(-?[\d.]+)px,\s*0\)/)[1]));
    ys.sort((a, b) => a - b);
    for (let i = 1; i < ys.length; i += 1) {
      expect(ys[i] - ys[i - 1], 'labels ' + i + ' and ' + (i - 1) + ' overlap').toBeGreaterThanOrEqual(15);
    }
  });

  it('rewrites the label chrome only when selection changes, not every frame', () => {
    const run = buildRunner();
    const container = fakeContainer();
    const doc = { createElement: fakeElement };
    const canvas = { dataset: {} };
    const meshes = [fakeMesh('Saturn', 0.2, 0.2)];
    run(container, meshes, {}, 800, 600, canvas, doc);

    const el = container.children[0];
    let writes = 0;
    let stored = el.style.cssText;
    Object.defineProperty(el.style, 'cssText', {
      get() { return stored; },
      set(v) { writes += 1; stored = v; },
    });

    for (let i = 0; i < 20; i += 1) run(container, meshes, {}, 800, 600, canvas, doc);
    expect(writes, 'chrome must not be rewritten per frame').toBe(0);

    canvas.dataset.selected = 'Saturn';
    run(container, meshes, {}, 800, 600, canvas, doc);
    expect(writes, 'selection change must restyle exactly once').toBe(1);
    for (let i = 0; i < 10; i += 1) run(container, meshes, {}, 800, 600, canvas, doc);
    expect(writes).toBe(1);
  });

  it('drops the label cache when the container is cleared, so it cannot hold detached nodes', () => {
    expect(src).toMatch(/function clearSolarLabels\(\)[\s\S]{0,600}_solarLabelCache = null;/);
  });

  it('drives the orbit integrator and the Earth-days clock off one shared base rate', () => {
    expect(src).toMatch(/const SOLAR_BASE_RATE = [\d.]+;/);
    expect(src).toMatch(/time \+= SOLAR_BASE_RATE \* speed;/);
    expect(src).toMatch(/var timeScale = SOLAR_BASE_RATE \* speed \* \(isPaused \? 0 : 1\);/);
    // A stray literal here is how the clock and the planets drift apart.
    expect(src.match(/0\.008 \* speed/g) || []).toEqual([]);
  });
});
