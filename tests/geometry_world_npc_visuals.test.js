import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8').replace(/\r\n/g, '\n');
function slice(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  if (a < 0 || b < a) throw Error('Missing production guide helper: ' + start);
  return source.slice(a, b);
}
const helpers = slice('  function geometryGuideState(', '  // ── Non-visual wayfinding ──');
const create = slice('engine.createNPC = function(data)', 'engine.loadLesson = function(lesson)');
const animate = slice('// Animate NPCs — bob, rotate, face player when close', '// ── NPC proximity chime');
const clearStart = source.lastIndexOf('engine.npcs.forEach(function(n)', source.indexOf('engine.createNPC = function(data)'));
const clearEnd = source.indexOf('engine.npcs = [];', clearStart) + 'engine.npcs = [];'.length;
if (clearStart < 0 || clearEnd < clearStart) throw Error('Missing production NPC resource disposal');
const cleanup = source.slice(clearStart, clearEnd);

function canvas(width = 640, height = 160) {
  const ops = [];
  const context = new Proxy({
    measureText(text) { return { width: String(text).length * 16 }; },
    canvas: null,
  }, { get(target, name) { if (name in target) return target[name]; return (...args) => ops.push([name, ...args]); } });
  const result = { width, height, ops, getContext() { return context; } }; context.canvas = result;
  return result;
}
const engines = [];
function fixture(question = true) {
  const win = { THREE, matchMedia() { return { matches: false }; } };
  const doc = { createElement() { return canvas(); } };
  const engine = { scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(), npcs: [], _answeredRef: {}, clock: { getElapsedTime: () => 1 }, renderer: { domElement: { closest: () => null } } };
  const api = new Function('window', helpers + ';return {state:geometryGuideState,parts:geometryGuideLabelParts,basis:geometryGuideCameraBasis,bearing:geometryGuideBearing,paint:geometryPaintGuideCompass,refresh:geometryRefreshGuideSprites,paintCanvas:geometryPaintGuideCanvas};')(win);
  new Function('engine', 'window', 'document', 'geometryWorldSrgbColor', helpers + create)(engine, win, doc, (T, hex) => new T.Color(hex).convertSRGBToLinear());
  engine.createNPC({ name: '2. Sora - Arrival Quay', position: [1, 1, 2], color: 0x297062, dialogue: 'Explore the harbor with me.', ...(question ? { question: { text: 'How many cubes?' } } : {}) });
  engine.disposeNpcs = () => new Function('engine', cleanup)(engine);
  engines.push(engine);
  return { engine, npc: engine.npcs[0], api, win, doc };
}
afterEach(() => engines.splice(0).forEach(engine => engine.disposeNpcs()));

describe('Geometry World guide visuals and compass', () => {
  it.each([[0, -1, 'north'], [1, 0, 'east'], [0, 1, 'south'], [-1, 0, 'west']])('keeps the guide ahead and left/right bearings correct while facing %s,%s (%s)', (fx, fz) => {
    const { engine, api } = fixture();
    engine.camera.position.set(5, 3, 7); engine.camera.lookAt(5 + fx, 2.5, 7 + fz);
    const basis = api.basis(engine.camera), rx = -fz, rz = fx;
    expect(api.bearing(basis, fx * 10, fz * 10)).toBeCloseTo(0, 8);
    expect(api.bearing(basis, rx * 10, rz * 10)).toBeCloseTo(Math.PI / 2, 8);
    expect(api.bearing(basis, -rx * 10, -rz * 10)).toBeCloseTo(-Math.PI / 2, 8);
    expect(Math.abs(api.bearing(basis, -fx * 10, -fz * 10))).toBeCloseTo(Math.PI, 8);
    expect(api.bearing(basis, fx * -10 + rx, fz * -10 + rz)).toBeGreaterThan(Math.PI / 2);
    expect(api.bearing(basis, fx * -10 - rx, fz * -10 - rz)).toBeLessThan(-Math.PI / 2);
  });

  it('uses the world camera transform and stays finite for straight-down preview cameras', () => {
    const { engine, api } = fixture();
    const parent = new THREE.Group(); parent.rotation.y = -Math.PI / 2; parent.add(engine.camera);
    expect(api.bearing(api.basis(engine.camera), 10, 0)).toBeCloseTo(0, 8);
    parent.rotation.y = 0; engine.camera.rotation.x = -Math.PI / 2;
    expect(Number.isFinite(api.bearing(api.basis(engine.camera), 1, 0))).toBe(true);
  });

  it('distinguishes ungraded discoveries from open questions and completed activities', () => {
    const { api, npc } = fixture();
    expect(api.state(npc.data, false, null).kind).toBe('question');
    expect(api.state(npc.data, true, null).kind).toBe('complete');
    expect(api.state({ name: 'Explorer' }, true, null).kind).toBe('discovery');
    expect(api.state(npc.data, false, { npcName: 'A different guide' }).tracked).toBe(false);
  });

  it('separates authored names and locations without mutating their exact dialogue identity', () => {
    const { api, npc } = fixture(); const before = JSON.stringify(npc.data);
    expect(api.parts(npc.data)).toEqual({ name: '2. Sora', detail: 'Arrival Quay' });
    expect(api.parts({ name: 'Harbor Welcome' })).toEqual({ name: 'Harbor Welcome', detail: 'Discovery guide' });
    expect(JSON.stringify(npc.data)).toBe(before);
    const labelText = npc.label.material.map.image.ops.filter(op => op[0] === 'fillText').map(op => op[1]);
    expect(labelText).toEqual(['2. Sora', 'Arrival Quay']);
    expect(labelText).not.toContain('?');
  });

  it('reuses sprite and texture identities and uploads only when guide state changes', () => {
    const { engine, npc, api } = fixture();
    const sprites = [npc.label, npc.prompt, npc.qMark], textures = sprites.map(s => s.material.map), versions = textures.map(t => t.version);
    for (let i = 0; i < 20; i++) api.refresh(engine, npc, 0, false);
    expect(textures.map(t => t.version)).toEqual(versions);
    engine._activityWaypoint = { npcName: npc.data.name }; api.refresh(engine, npc, 0, false);
    expect(npc.label.userData.geometryGuideState).toEqual({ kind: 'question', tracked: true, contrast: false });
    engine._answeredRef[0] = true; engine._activityWaypoint = null; api.refresh(engine, npc, 0, true);
    expect(npc.label.userData.geometryGuideState).toEqual({ kind: 'complete', tracked: false, contrast: true });
    sprites.forEach((sprite, i) => { expect(sprite.material.map).toBe(textures[i]); expect(textures[i].version).toBe(versions[i] + 2); expect(sprite.material.toneMapped).toBe(false); expect(sprite.material.depthWrite).toBe(false); });
  });

  it('uses the existing Talk touch action instead of a keyboard key on coarse-pointer devices', () => {
    const { engine, npc, api } = fixture(); engine._guideTouch = true;
    api.refresh(engine, npc, 0, false);
    expect(npc.prompt.material.map.image.ops.filter(op => op[0] === 'fillText').at(-1)[1]).toBe('Tap Talk');
  });

  it('draws the pinned guide last at its exact bearing and returns its matching name', () => {
    const { engine, npc, api } = fixture(); engine.camera.position.set(0, 0, 0); engine.camera.lookAt(0, 0, -1);
    npc.body.position.set(0, 1, -10); engine._activityWaypoint = { npcName: npc.data.name };
    const output = canvas(260, 32);
    expect(api.paint(output.getContext('2d'), 260, 32, engine, false)).toBe(npc.data.name);
    expect(output.ops.filter(op => op[0] === 'arc').at(-1).slice(1, 4)).toEqual([130, 21, 9]);
    engine._activityWaypoint = null;
    expect(api.paint(output.getContext('2d'), 260, 32, engine, false)).toBe('');
    const text = output.ops.filter(op => op[0] === 'fillText').map(op => op[1]);
    expect(text).not.toContain('?'); expect(text).not.toContain('✓');
  });

  it('keeps hidden guide objects hidden and avoids late sprite allocation during Showcase', () => {
    const { engine, npc, win, doc } = fixture();
    engine._showcase = {}; [npc.body, npc.head, npc.label, npc.prompt, npc.qMark].forEach(o => { o.visible = false; });
    const count = engine.scene.children.length;
    new Function('engine', 'window', 'document', 'answeredNpcs', 'dt', helpers + animate)(engine, win, doc, {}, 0.016);
    expect(engine.scene.children).toHaveLength(count);
    expect(npc._speechBubble).toBeUndefined(); expect(npc._ring).toBeUndefined();
    [npc.body, npc.head, npc.label, npc.prompt, npc.qMark].forEach(o => expect(o.visible).toBe(false));
  });

  it('disposes each owned guide texture once and leaves no NPC scene objects on lesson clear', () => {
    const { engine, npc } = fixture();
    const disposed = [0, 0, 0];
    [npc.label, npc.prompt, npc.qMark].forEach((sprite, i) => sprite.material.map.addEventListener('dispose', () => disposed[i]++));
    engine.disposeNpcs();
    expect(disposed).toEqual([1, 1, 1]); expect(engine.npcs).toEqual([]); expect(engine.scene.children).toEqual([]);
  });
});

it('keeps the high-contrast location subtitle black on its white card', () => {
  const { npc, api } = fixture();
  const label = canvas();
  api.paintCanvas(label, 'label', npc.data, { kind: 'question', tracked: false }, true);
  expect(label.getContext('2d').fillStyle).toBe('#000000');
});
