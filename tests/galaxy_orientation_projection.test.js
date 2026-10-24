import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { React, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY ORIENTATION MODEL')[1].split('// END GALAXY ORIENTATION MODEL')[0];
const model = new Function(block + ';return {project:galaxyOrientationProjection,render:renderGalaxyOrientationDiagram,display:renderGalaxyOrientationDisplay,apply:galaxyApplyOrientationDisplay};')();
const origin = { x: 0, y: 0, z: 0 };
function camera(elevation, azimuth = 0, radius = 2, target = origin) {
  const angle = elevation * Math.PI / 180;
  return { x: target.x + radius * Math.cos(angle) * Math.sin(azimuth), y: target.y + radius * Math.sin(angle), z: target.z + radius * Math.cos(angle) * Math.cos(azimuth) };
}

describe('Galaxy actual-camera reference-plane projection', () => {
  it.each([-90, -84, -45, -27, 0, 27, 45, 84, 90])('projects signed elevation %i° and the correct apparent plane thickness', elevation => {
    const result = model.project(camera(elevation), origin);
    expect(result.elevation).toBeCloseTo(elevation, 7);
    expect(result.roundedElevation).toBe(elevation);
    expect(result.minorRatio).toBeCloseTo(Math.abs(Math.sin(elevation * Math.PI / 180)), 7);
    expect(result.normal.y2).toBeCloseTo(50 - 36 * Math.cos(elevation * Math.PI / 180), 2);
    expect(result.front + result.back).not.toMatch(/NaN|Infinity/);
  });

  it('uses the real look target and direction independently of zoom or world translation', () => {
    const reference = model.project(camera(27, 0.7, 2), origin);
    const target = { x: -0.7, y: 0.2, z: 0.8 };
    const translated = model.project(camera(27, 0.7, 0.3, target), target);
    for (const field of ['front', 'back', 'axes', 'normal', 'preset', 'next', 'roundedElevation']) expect(translated[field]).toEqual(reference[field]);
    expect(translated.elevation).toBeCloseTo(reference.elevation, 9);
    // A direction derived from the origin instead of the selected look target differs.
    expect(model.project(camera(27, 0.7, 0.3, target), origin).elevation).not.toBeCloseTo(reference.elevation, 2);
  });

  it('reverses the near half of the projected plane when orbiting below it', () => {
    function ys(path) { return path.match(/-?\d+(?:\.\d+)?/g).map(Number).filter((value, index) => index % 2 === 1); }
    expect(Math.max(...ys(model.project(camera(45), origin).front))).toBeGreaterThan(50);
    expect(Math.min(...ys(model.project(camera(-45), origin).front))).toBeLessThan(50);
    expect(Math.max(...ys(model.project(camera(-45), origin).front))).toBe(50);
  });

  it('shows azimuth changes in the reference axes without changing the plane thickness', () => {
    const a = model.project(camera(27, 0), origin);
    const b = model.project(camera(27, Math.PI / 2), origin);
    expect(a.minorRatio).toBeCloseTo(b.minorRatio, 9);
    expect(a.front).toBe(b.front);
    expect(a.axes).not.toEqual(b.axes);
  });

  it('cycles the exact presets predictably and takes a free orbit to face-on first', () => {
    for (const [elevation, preset, next] of [[90 - 0.1 * 180 / Math.PI, 'face', 'angled'], [27, 'angled', 'edge'], [0, 'edge', 'face'], [41, 'free', 'face'], [-27, 'free', 'face']]) {
      expect(model.project(camera(elevation), origin)).toMatchObject({ preset, next });
    }
  });

  it.each([[null, origin], [origin, null], [origin, origin], [{ x: 0, y: Infinity, z: 0 }, origin], [{ x: 0, y: 1 }, origin], [{ x: 0, y: '1', z: 0 }, origin]])('rejects missing or invalid camera geometry without fabricating a view', (position, target) => {
    expect(model.project(position, target)).toBeNull();
  });
});

describe('Galaxy native orientation display', () => {
  function makeDisplay(tag = 'button') {
    const node = document.createElement(tag);
    node.innerHTML = ReactDOMServer.renderToStaticMarkup(model.render(React, 32));
    node.insertAdjacentHTML('beforeend', '<span data-galaxy-orientation-reference></span><span data-galaxy-orientation-elevation></span>');
    return node;
  }

  it('updates child geometry and accessible navigation without replacing the SVG', () => {
    const node = makeDisplay();
    const svg = node.querySelector('svg');
    const projection = model.project(camera(-27), origin);
    model.apply(node, projection, 'Galaxy disk');
    expect(node.querySelector('svg')).toBe(svg);
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(node.querySelector('[data-galaxy-orientation-front]').getAttribute('d')).toBe(projection.front);
    expect(node.querySelector('[data-galaxy-orientation-normal]').getAttribute('y2')).toBe(String(projection.normal.y2));
    expect(node.querySelector('[data-galaxy-orientation-reference]').textContent).toBe('Galaxy disk');
    expect(node.querySelector('[data-galaxy-orientation-elevation]').textContent).toBe('-27°');
    expect(node.getAttribute('aria-label')).toMatch(/Galaxy disk.*-27°.*Switch to Face-on view/);
    expect(node.getAttribute('data-next-view')).toBe('face');
    model.apply(node, model.project(camera(27), origin), 'Model plane');
    expect(node.querySelector('svg')).toBe(svg);
    expect(node.querySelector('[data-galaxy-orientation-elevation]').textContent).toBe('+27°');
    expect(node.getAttribute('aria-label')).toMatch(/Model plane.*Switch to Edge-on view/);
  });

  it('gives the readonly panel a description without claiming a button action or celestial bearings', () => {
    const node = makeDisplay('div');
    model.apply(node, model.project(camera(0), origin), 'Model plane', (key, fallback) => fallback);
    expect(node.querySelector('[data-galaxy-orientation-elevation]').textContent).toBe('0°');
    expect(node.getAttribute('aria-label')).toContain('Positive is above; negative is below');
    expect(node.getAttribute('aria-label')).not.toMatch(/Switch to|north|east/i);
    expect(node.textContent).not.toMatch(/NaN|undefined/);
  });

  it('keeps the stage control compact and exposes a larger noninteractive diagram in the View card', () => {
    const holder = document.createElement('div');
    holder.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(React.Fragment, null,
      model.display(React, { compact: true, spiral: true, onCycle() {} }),
      model.display(React, { compact: false, spiral: false })
    ));
    const button = holder.querySelector('button[data-galaxy-orientation]');
    expect(button.style.height).toBe('44px');
    expect(button.style.minHeight).toBe('44px');
    expect(button.className).toContain('lg:flex');
    expect(button.querySelector('svg').getAttribute('width')).toBe('32');
    const panel = holder.querySelector('[data-galaxy-orientation-panel]');
    expect(panel.tagName).toBe('DIV');
    expect(panel.getAttribute('role')).toBe('img');
    expect(panel.querySelector('svg').getAttribute('width')).toBe('80');
    expect(panel.querySelector('[data-galaxy-orientation-reference]').textContent).toBe('Model plane');
    expect(panel.textContent).toContain('even when inspecting a nebula');
  });
});
