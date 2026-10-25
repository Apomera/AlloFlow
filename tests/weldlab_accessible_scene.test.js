import { stripWeldlabAccessibleNavigation } from './helpers/weldlab_wcag_navigation_restore.js';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { restoreAccessibleScene, ACCESSIBLE_SCENE_BASELINE } from './helpers/weldlab_accessible_scene_restore.js';

const source = readFileSync(resolve(process.env.WELDLAB_SRC || 'stem_lab/stem_tool_weldlab.js'), 'utf8').replace(/\r\n/g, '\n');
function region(text, start, end) {
  const from = text.indexOf(start), to = text.indexOf(end, from);
  if (from < 0 || to <= from) throw new Error('Missing scene test boundary: ' + start);
  return text.slice(from, to);
}
const SCENE_START = '      function WeldBeadLab3D(props) {';
const SCENE_END = '\n      // ─────────────────────────────────────────────────────';
const sceneSource = region(source, SCENE_START, SCENE_END);
const h = (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity).filter(Boolean) });
const t = (_key, fallback) => fallback;
function nodes(tree) { return [tree, ...(tree.children || []).flatMap(child => typeof child === 'object' ? nodes(child) : [])]; }

// Exercise the component's actual button callbacks without creating a WebGL
// context. Its unchanged Three.js effect is excluded here, and pinned below.
function cameraTree(status = 'ready', camera = { az: 0.35, el: 0.66, r: 3.05 }) {
  const syncCamera = vi.fn();
  const scene = camera && { camAngle: camera, syncCamera };
  let refIndex = 0, stateIndex = 0;
  const useRef = value => ({ current: refIndex++ === 2 ? scene : value });
  const useState = value => [stateIndex++ === 0 ? status : value, () => {}];
  const render = new Function('h', 'useRef', 'useState', 'useEffect', '__alloT', 'DEFECT_3D_COLOR', 'return (' + sceneSource + ');')(
    h, useRef, useState, () => {}, t, {}
  );
  return { tree: render({ liveRef: { current: {} }, ariaLabel: 'Current weld geometry.' }), camera, syncCamera };
}
function button(tree, hook, value) {
  const found = nodes(tree).find(n => n.type === 'button' && Object.hasOwn(n.props, hook) && (value === undefined || n.props[hook] === value));
  expect(found, hook + '=' + value).toBeTruthy();
  return found;
}
function keyboard(camera) {
  const code = region(sceneSource, '            function onKey(e) {', "            canvas.addEventListener('keydown', onKey);");
  return new Function('camAngle', 'syncCamera', code + '\nreturn onKey;')(camera, () => {});
}
function press(key, handler) { handler({ key, preventDefault() {} }); }
const hash = value => createHash('sha256').update(value).digest('hex');
function luminance(rgb) {
  return rgb.map(v => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; })
    .reduce((a, value, i) => a + value * [0.2126, 0.7152, 0.0722][i], 0);
}
function contrast(a, b) { const la = luminance(a), lb = luminance(b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); }

describe('WeldLab camera actions without dragging', () => {
  it('matches existing keyboard orbit and zoom actions on the same camera', () => {
    for (const [hook, value, key] of [
      ['data-weld-scene-orbit', 'left', 'ArrowLeft'],
      ['data-weld-scene-orbit', 'right', 'ArrowRight'],
      ['data-weld-scene-zoom', 'in', '+'],
      ['data-weld-scene-zoom', 'out', '-'],
    ]) {
      const { tree, camera, syncCamera } = cameraTree();
      const expected = { ...camera };
      press(key, keyboard(expected));
      button(tree, hook, value).props.onClick();
      expect(camera).toEqual(expected);
      expect(syncCamera).toHaveBeenCalledTimes(1);
    }
  });

  it('keeps zoom inside existing bounds and retains tilt and reset behavior', () => {
    const { tree, camera } = cameraTree();
    for (let i = 0; i < 40; i++) button(tree, 'data-weld-scene-zoom', 'in').props.onClick();
    expect(camera.r).toBe(1.6);
    for (let i = 0; i < 40; i++) button(tree, 'data-weld-scene-zoom', 'out').props.onClick();
    expect(camera.r).toBe(7.5);
    for (let i = 0; i < 40; i++) button(tree, 'data-weld-scene-tilt', 'up').props.onClick();
    expect(camera.el).toBe(Math.PI / 2 - 0.05);
    for (let i = 0; i < 40; i++) button(tree, 'data-weld-scene-tilt', 'down').props.onClick();
    expect(camera.el).toBe(0.05);
    button(tree, 'data-weld-scene-reset').props.onClick();
    expect(camera).toEqual({ az: 0.35, el: 0.66, r: 3.05 });
  });

  it('places labeled native controls after the canvas, with room for touch and wrapping', () => {
    const { tree } = cameraTree();
    const all = nodes(tree), group = all.find(n => Object.hasOwn(n.props, 'data-weld-scene-controls'));
    expect(group.props.role).toBe('group');
    expect(group.props['aria-label']).toBe('3D scene camera controls');
    expect(group.props.className).toContain('flex-wrap');
    expect(group.props.className).not.toContain('absolute');
    expect(tree.children.indexOf(group)).toBeGreaterThan(tree.children.findIndex(n => n.type === 'canvas'));
    expect(group.children).toHaveLength(7);
    for (const control of group.children) {
      expect(control.type).toBe('button');
      expect(control.props.type).toBe('button');
      expect(control.props['aria-label']).toBeTruthy();
      expect(control.props.style.minHeight).toBeGreaterThanOrEqual(44);
      expect(control.props.style.minWidth).toBeGreaterThanOrEqual(44);
    }
    expect(all.find(n => n.type === 'canvas').props['aria-label']).toContain('camera buttons below');
  });

  it('does not present actions before scene readiness and tolerates a disposed scene', () => {
    for (const status of ['loading', 'error']) {
      expect(nodes(cameraTree(status).tree).some(n => Object.hasOwn(n.props, 'data-weld-scene-controls'))).toBe(false);
    }
    const { tree, syncCamera } = cameraTree('ready', null);
    for (const control of nodes(tree).filter(n => n.type === 'button')) expect(() => control.props.onClick()).not.toThrow();
    expect(syncCamera).not.toHaveBeenCalled();
  });

  it('preserves every existing scene instruction, effect, model and interaction byte outside the additive patch', () => {
    const restored = restoreAccessibleScene(stripWeldlabAccessibleNavigation(source));
    expect(hash(region(restored, SCENE_START, SCENE_END))).toBe(ACCESSIBLE_SCENE_BASELINE.originalSceneHash);
    expect(hash(region(restored, '      function BackBar(props) {', '      function StatCard(props) {'))).toBe(ACCESSIBLE_SCENE_BASELINE.originalBackBarHash);
    expect(restored).not.toContain('data-weld-scene-orbit');
    expect(restored).not.toContain('a11y14: camera actions');
    expect(restoreAccessibleScene(restored)).toBe(restored);
  });
});

describe('WeldLab header menu readability', () => {
  it('keeps Menu text above 4.5:1 on its opaque normal and hover backgrounds', () => {
    const render = new Function('h', '__alloT', 'setView', 'upd', 'return (' + region(source, '      function BackBar(props) {', '      function StatCard(props) {') + ');')(h, t, () => {}, () => {});
    const menu = button(render({ icon: '🔥', title: 'Weld Lab' }), 'data-weld-menu-button');
    const tokens = menu.props.className.split(/\s+/);
    expect(tokens).toContain('bg-white');
    expect(tokens).toContain('hover:bg-slate-100');
    expect(tokens).toContain('text-orange-900');
    expect(tokens.some(value => /^bg-white\//.test(value))).toBe(false);
    for (const background of [[255, 255, 255], [241, 245, 249]]) expect(contrast([124, 45, 18], background)).toBeGreaterThanOrEqual(4.5);
  });
});
