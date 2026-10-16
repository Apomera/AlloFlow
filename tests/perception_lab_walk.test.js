import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const load = file => new Function(readFileSync(resolve(process.cwd(), file), 'utf8'))();
let walk, scene, host, root, latest, replace, viewers, close;
const query = selector => host.querySelector(selector);
async function click(selector) {
  const node = typeof selector === 'string' ? query(selector) : selector;
  expect(node).toBeTruthy();
  await act(async () => node.click());
}
async function input(selector, value) {
  const node = query(selector);
  expect(node).toBeTruthy();
  await act(async () => {
    const proto = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function pointer(type, x, y, extra = {}) {
  const stage = query('[data-walk-stage]');
  if (!stage.setPointerCapture) stage.setPointerCapture = vi.fn();
  if (!stage.hasPointerCapture) stage.hasPointerCapture = () => true;
  if (!stage.releasePointerCapture) stage.releasePointerCapture = vi.fn();
  await act(async () => {
    const event = new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: extra.pointerType || 'mouse' } });
    stage.dispatchEvent(event);
  });
}
async function mount(seed = {}, strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionWalk: seed, perceptionGallery: { models: { shape: { note: 'Gallery draft' } } }, otherTool: { preserved: 37 } });
    latest = data; replace = setData;
    return React.createElement(walk.Component, { ctx: makeCtx({ toolData: data, setToolData: setData }), onClose: close });
  }
  host = document.createElement('div'); document.body.append(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, React.createElement(Harness)) : React.createElement(Harness)));
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  load('stem_lab/perception_walk.js');
  load('stem_lab/perception_walk_scene.js');
  walk = window.StemLab.PerceptionWalk; scene = window.StemLab.PerceptionWalkScene;
  close = vi.fn(); viewers = [];
  scene.createViewer = vi.fn(() => {
    let report = () => {}, layout = () => {};
    const viewer = { attach: vi.fn(() => report('ready')), push: vi.fn(), dispose: vi.fn(), status: () => 'ready',
      onStatusChange: fn => { report = fn; }, report: value => report(value), pick: vi.fn(() => null), interact: vi.fn(() => null),
      blockCoordinate: vi.fn(() => null), continuationCoordinate: vi.fn(() => null), onLayout: fn => { layout = fn; return vi.fn(); }, layout: value => layout(value) };
    viewers.push(viewer); return viewer;
  });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
  vi.restoreAllMocks(); delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('first-person perception models', () => {
  it('aligns twelve physical ring fragments in projection and preserves actual depth', () => {
    const parts = scene.ringParts();
    expect(parts).toHaveLength(12);
    expect(new Set(parts.map(part => part.depth)).size).toBe(3);
    parts.forEach((part, index) => {
      part.points.forEach(point => {
        const factor = 9 / (9 - point.z);
        expect(Math.hypot((point.x + 12) * factor, (point.y - 1.65) * factor)).toBeCloseTo(1.35);
        expect(point.y).toBeGreaterThan(0);
      });
      const end = part.points.at(-1), next = parts[(index + 1) % parts.length].points[0];
      expect((end.x + 12) / (9 - end.z)).toBeCloseTo((next.x + 12) / (9 - next.z));
      expect((end.y - 1.65) / (9 - end.z)).toBeCloseTo((next.y - 1.65) / (9 - next.z));
    });
  });

  it('matches unequal physical blocks only at proportional perspective distances', () => {
    const blocks = scene.scaleObjects(3), heights = blocks.map(block => block.height / (9 - block.z));
    expect(blocks[0].height).toBe(2.4); expect(blocks[1].height).toBe(1.2);
    expect(heights[0]).toBeCloseTo(heights[1]);
    expect(scene.scaleObjects(99)[1].z).toBe(6); expect(scene.scaleObjects(-99)[1].z).toBe(-1);
    const tokens = scene.tokenObjects();
    expect(tokens).toHaveLength(3); expect(new Set(tokens.map(token => token.id)).size).toBe(3);
    expect(tokens.every(token => token.z < 1.8 && token.x > 10 && token.x < 14)).toBe(true);
    expect(scene.cameraDirection({ yaw: 90, pitch: 0 }).x).toBeCloseTo(1);
    expect(scene.cameraDirection({ yaw: 0, pitch: 0 }).z).toBe(-1);
  });

  it('makes the parallax spheres similar in apparent size but different in sideways motion', () => {
    const objects = scene.parallaxObjects();
    expect(objects.map(item => item.choice)).toEqual(['A', 'B', 'C']);
    expect(objects.map(item => item.id)).toEqual(['parallax-A', 'parallax-B', 'parallax-C']);
    const apparentRadii = objects.map(item => item.radius / (9 - item.z));
    apparentRadii.forEach(radius => expect(radius).toBeCloseTo(0.07));
    const shifts = objects.map(item => Math.abs((item.x - 22) / (9 - item.z) - (item.x - 24) / (9 - item.z)));
    expect(shifts[2]).toBeGreaterThan(shifts[0]);
    expect(shifts[0]).toBeGreaterThan(shifts[1]);
    expect(objects[2].z).toBeGreaterThan(objects[0].z);
    objects[0].radius = 900;
    expect(scene.parallaxObjects()[0].radius).toBe(0.56);
  });

  it('keeps every parallax sphere separately visible throughout the observation area', () => {
    const objects = scene.parallaxObjects();
    for (let x = 22.8; x <= 25.40001; x += 0.2) for (let z = 8.5; z <= 11.00001; z += 0.25) {
      const silhouettes = objects.map(item => {
        const dx = item.x - x, depth = z - item.z;
        const center = Math.atan2(dx, depth), radius = Math.asin(item.radius / Math.hypot(dx, depth));
        return { left: center - radius, right: center + radius };
      }).sort((a, b) => a.left - b.left);
      expect(silhouettes[0].right).toBeLessThan(silhouettes[1].left);
      expect(silhouettes[1].right).toBeLessThan(silhouettes[2].left);
      expect(silhouettes[0].left).toBeGreaterThan(-40 * Math.PI / 180);
      expect(silhouettes[2].right).toBeLessThan(40 * Math.PI / 180);
    }
  });

  it('extends the walkable bounds through the eighteenth bay without changing existing spawns', () => {
    expect(walk.spawn('parallax')).toEqual({ x: 24, z: 9, yaw: 0, pitch: 0 });
    expect(walk.normalizePlayer({ x: 999, z: 9, yaw: 0, pitch: 0 }).x).toBe(223.3);
    expect(walk.normalizePlayer({ x: -99, z: 9, yaw: 0, pitch: 0 }).x).toBe(-19.3);
    expect(walk.movePlayer({ x: 24, z: 9, yaw: 0, pitch: 0 }, 'right', 2, -1).x).toBeCloseTo(26);
    expect(walk.spawn('scale')).toEqual({ x: 0, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('contour')).toEqual({ x: 36, z: 6.5, yaw: 0, pitch: 0 });
    expect(walk.spawn('context')).toEqual({ x: 48, z: 7, yaw: 0, pitch: 0 });
    expect(walk.spawn('continuity')).toEqual({ x: 60, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('shadow')).toEqual({ x: 72, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('change')).toEqual({ x: 84, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('rotation')).toEqual({ x: 96, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('relief')).toEqual({ x: 108, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('shape')).toEqual({ x: 120, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('motion')).toEqual({ x: 132, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('frame')).toEqual({ x: 144, z: 9, yaw: 0, pitch: 0 });
    expect(walk.spawn('weave')).toEqual({ x: 156, z: 9, yaw: 0, pitch: 0 });
  });

  it('keeps the camera outside each parallax sphere during movement and saved-state recovery', () => {
    for (const item of scene.parallaxObjects()) {
      const recovered = walk.normalize({ activity: 'parallax', player: { x: item.x, z: item.z, yaw: 0, pitch: 0 } }).player;
      expect(Math.hypot(recovered.x - item.x, recovered.z - item.z)).toBeGreaterThan(item.radius);
      let player = { x: item.x, z: item.z + item.radius + 1, yaw: 0, pitch: 0 };
      for (let i = 0; i < 5; i++) player = walk.movePlayer(player, 'forward', 2, -1);
      expect(player.z).toBeGreaterThan(item.z + item.radius);
      expect(Object.values(player).every(Number.isFinite)).toBe(true);
    }
  });

  it('normalizes parallax records and precision without retaining invalid samples or choices', () => {
    const raw = { activity: 'parallax', precise: true, parallax: { choice: 'C', samples: [
      { x: 24, z: 9, yaw: 45, pitch: 15 }, { x: 25.4, z: 9, yaw: -90, pitch: -20 }, { x: 26.8, z: 9 }
    ] } };
    const before = structuredClone(raw), normalized = walk.normalize(raw);
    expect(normalized.precise).toBe(true);
    expect(normalized.parallax).toEqual({ round: 0, completed: [], choice: 'C', samples: [
      { x: 24, z: 9, yaw: 0, pitch: 0 }, { x: 25.4, z: 9, yaw: 0, pitch: 0 }
    ] });
    expect(walk.normalize({ precise: 'true', parallax: { choice: 'other', samples: [null, { x: NaN, z: 9 }, { x: 30, z: 9 }] } }).parallax).toEqual({ round: 0, completed: [], choice: '', samples: [] });
    expect(walk.normalize({ precise: 'true' }).precise).toBe(false);
    for (const invalid of [{ x: 24.4, z: 9 }, { x: 26, z: 9.4 }]) {
      expect(walk.normalize({ parallax: { samples: [{ x: 24, z: 9 }, invalid] } }).parallax.samples).toHaveLength(1);
    }
    expect(raw).toEqual(before);
  });

  it('records only two separated, same-depth viewpoints and never solves from a guess alone', () => {
    const seed = walk.normalize({ activity: 'parallax', player: { x: 24, z: 9, yaw: 10, pitch: 5 }, parallax: { choice: 'C' } });
    const before = structuredClone(seed), first = walk.recordView(seed);
    expect(first.parallax.samples).toEqual([{ x: 24, z: 9, yaw: 0, pitch: 0 }]);
    expect(walk.checkAnswer(first)).toBe(false);
    expect(walk.recordView(first).parallax.samples).toHaveLength(1);
    expect(walk.recordView({ ...first, player: { x: 25.4, z: 9.5, yaw: 0, pitch: 0 } }).parallax.samples).toHaveLength(1);
    const second = walk.recordView({ ...first, player: { x: 25.4, z: 9, yaw: 0, pitch: 0 } });
    expect(second.parallax.samples).toHaveLength(2);
    expect(walk.checkAnswer(second)).toBe(true);
    expect(walk.checkAnswer({ ...second, parallax: { ...second.parallax, choice: 'A' } })).toBe(false);
    expect(walk.checkAnswer({ ...second, parallax: { ...second.parallax, choice: 'B' } })).toBe(false);
    expect(walk.recordView({ ...second, player: { x: 27, z: 9, yaw: 0, pitch: 0 } }).parallax.samples).toEqual(second.parallax.samples);
    expect(walk.recordView({ ...seed, player: { x: 19, z: 9, yaw: 0, pitch: 0 } }).parallax.samples).toEqual([]);
    expect(walk.recordView({ ...seed, player: { x: 27, z: 9, yaw: 0, pitch: 0 } }).parallax.samples).toEqual([]);
    expect(walk.recordView({ ...seed, player: { x: 24, z: 8, yaw: 0, pitch: 0 } }).parallax.samples).toEqual([]);
    expect(walk.recordView({ ...seed, activity: 'ring' }).parallax.samples).toEqual([]);
    expect(seed).toEqual(before);
  });

  it('normalizes independent state without mutating the saved input', () => {
    const raw = { activity: 'unknown', player: { x: Infinity, z: NaN, yaw: 'no', pitch: 999 }, blockZ: 99,
      collected: [0, 0, 1, 2, 7, null], progress: { ring: { solved: true, assisted: true } }, notes: { ring: 'n'.repeat(2000) } };
    const before = structuredClone(raw), state = walk.normalize(raw);
    expect(raw).toEqual(before);
    expect(state.activity).toBe('ring');
    expect(state.blockZ).toBe(6);
    expect(state.collected).toEqual([0, 1, 2]);
    expect(Object.values(state.player).every(Number.isFinite)).toBe(true);
    expect(state.notes.ring.length).toBeLessThanOrEqual(1000);
    expect(walk.normalize({ blockZ: -10 }).blockZ).toBe(-1);
    expect(Object.keys(walk.normalize(null).progress)).toEqual(['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length', 'silhouette', 'anamorphosis']);
  });

  it('normalizes puzzle rotations and matching choices without retaining invalid saved values', () => {
    const raw = { contour: { angles: [-45, 585, NaN, 'bad'], selected: 99, choice: 'pentagon' },
      context: { selected: ['A', 'A', 'other', 'C', 'D'], neutral: 'true' } };
    const before = structuredClone(raw), normalized = walk.normalize(raw);
    expect(normalized.contour.angles).toEqual([315, 225, 270, 180]);
    expect(normalized.contour.selected).toBe(3);
    expect(normalized.contour.choice).toBe('');
    expect(normalized.context).toEqual({ selected: ['A', 'C'], neutral: false });
    expect(walk.normalize({}).contour).toEqual({ angles: [90, 0, 270, 180], selected: 0, choice: '' });
    expect(walk.normalize({}).context).toEqual({ selected: [], neutral: false });
    expect(raw).toEqual(before);
  });

  it('requires all four correctly rotated corners, a shape answer, and a visible contour', () => {
    const answer = { activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 },
      contour: { angles: [315, 225, 135, 45], selected: 0, choice: 'square' } };
    expect(walk.checkAnswer(answer)).toBe(true);
    for (let index = 0; index < 4; index++) {
      const angles = [...answer.contour.angles]; angles[index] += 8;
      expect(walk.checkAnswer({ ...answer, contour: { ...answer.contour, angles } })).toBe(false);
      angles[index] = answer.contour.angles[index] - 7.5;
      expect(walk.checkAnswer({ ...answer, contour: { ...answer.contour, angles } })).toBe(true);
    }
    expect(walk.checkAnswer({ ...answer, contour: { ...answer.contour, choice: 'circle' } })).toBe(false);
    expect(walk.checkAnswer({ ...answer, contour: { ...answer.contour, choice: 'triangle' } })).toBe(false);
    expect(walk.checkAnswer({ ...answer, player: { ...answer.player, yaw: 180 } })).toBe(false);
    expect(walk.checkAnswer({ ...answer, contour: { ...answer.contour, angles: [675, -135, 495, -315] } })).toBe(true);
  });

  it('requires the equal physical tile colors independently of the surround mode', () => {
    const answer = { activity: 'context', player: { x: 48, z: 7, yaw: 0, pitch: 0 }, context: { selected: ['A', 'C'], neutral: false } };
    expect(walk.checkAnswer(answer)).toBe(true);
    expect(walk.checkAnswer({ ...answer, context: { ...answer.context, neutral: true } })).toBe(true);
    for (const pair of [['A', 'B'], ['B', 'D'], ['C', 'D'], ['A'], ['C'], []]) {
      expect(walk.checkAnswer({ ...answer, context: { selected: pair, neutral: true } })).toBe(false);
    }
  });

  it('keeps the matching tiles physically fixed while arranging independent surrounds', () => {
    const tiles = scene.contextObjects(), corners = scene.contourObjects();
    expect(tiles.map(item => item.choice)).toEqual(['A', 'B', 'C', 'D']);
    expect(tiles.map(item => item.tileColor)).toEqual([0x888888, 0xa0a0a0, 0x888888, 0x707070]);
    expect(tiles[0].backgroundColor).not.toBe(tiles[2].backgroundColor);
    expect(corners.map(item => item.index)).toEqual([0, 1, 2, 3]);
    expect(corners.map(item => item.angle)).toEqual([90, 0, 270, 180]);
    expect(Math.min(...corners.map(item => item.y))).toBe(0.75);
    tiles[0].tileColor = 0; corners[0].angle = 13;
    expect(scene.contextObjects()[0].tileColor).toBe(0x888888);
    expect(scene.contourObjects()[0].angle).toBe(90);
  });

  it('bounds corner rotations to reachable front-side manipulation and leaves other saved work alone', () => {
    const seed = walk.normalize({ activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 },
      notes: { contour: 'Keep the observation' }, context: { selected: ['A'], neutral: true } });
    const before = structuredClone(seed), rotated = walk.turnCorner(seed, 2, -225);
    expect(rotated.contour.angles[2]).toBe(135);
    expect(rotated.player).toEqual(seed.player); expect(rotated.context).toEqual(seed.context); expect(rotated.notes).toEqual(seed.notes);
    expect(seed).toEqual(before);
    expect(walk.turnCorner(seed, 4, 45)).toEqual(seed);
    expect(walk.turnCorner(seed, 0, 'bad')).toEqual(seed);
    expect(walk.turnCorner({ ...seed, activity: 'ring' }, 0, 45).contour).toEqual(seed.contour);
    expect(walk.turnCorner({ ...seed, player: { x: 36, z: -1, yaw: 180, pitch: 0 } }, 0, 45).contour).toEqual(seed.contour);
    expect(walk.turnCorner({ ...seed, player: { x: 48, z: 7, yaw: 0, pitch: 0 } }, 0, 45).contour).toEqual(seed.contour);
  });

  it('limits matching selection to two distinct tiles and allows changing an existing pair', () => {
    const seed = walk.normalize({ activity: 'context', context: { selected: ['A'], neutral: false }, contour: { choice: 'triangle' } });
    const before = structuredClone(seed), pair = walk.toggleTile(seed, 'B');
    expect(pair.context.selected).toEqual(['A', 'B']);
    expect(walk.toggleTile(pair, 'C')).toEqual(pair);
    expect(walk.toggleTile(pair, 'bad')).toEqual(pair);
    const removed = walk.toggleTile(pair, 'B'), changed = walk.toggleTile(removed, 'C');
    expect(changed.context.selected).toEqual(['A', 'C']);
    expect(changed.contour).toEqual(seed.contour); expect(changed.progress).toEqual(seed.progress);
    expect(seed).toEqual(before);
  });

  it('normalizes the hidden-line offset and keeps its saved work independent', () => {
    const raw = { activity: 'continuity', continuityOffset: '-0.25', player: walk.spawn('continuity'),
      progress: { continuity: { hints: 2, solved: true } }, notes: { continuity: 'Follow the diagonal.' } };
    const before = structuredClone(raw), normalized = walk.normalize(raw);
    expect(normalized.activity).toBe('continuity');
    expect(normalized.continuityOffset).toBe(-0.25);
    expect(normalized.progress.continuity).toEqual({ hints: 2, solved: true, assisted: false });
    expect(normalized.notes.continuity).toBe('Follow the diagonal.');
    expect(walk.normalize(normalized)).toEqual(normalized);
    expect(raw).toEqual(before);
    for (const value of [undefined, null, '', 'bad', NaN, Infinity]) {
      expect(walk.normalize({ continuityOffset: value }).continuityOffset).toBe(0.8);
    }
    expect(walk.normalize({ continuityOffset: -999 }).continuityOffset).toBe(-1.2);
    expect(walk.normalize({ continuityOffset: 999 }).continuityOffset).toBe(1.2);
  });

  it('only moves the continuation from its reachable front side without changing other work', () => {
    const seed = walk.normalize({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0.8,
      blockZ: 3, notes: { continuity: 'Keep the observation.' }, progress: { ring: { solved: true } } });
    const before = structuredClone(seed), moved = walk.moveContinuation(seed, 0.25);
    expect(walk.canMoveContinuation(seed)).toBe(true);
    expect(moved.continuityOffset).toBe(0.25);
    expect(moved.player).toEqual(seed.player);
    expect(moved.blockZ).toBe(seed.blockZ);
    expect(moved.notes).toEqual(seed.notes);
    expect(moved.progress).toEqual(seed.progress);
    expect(moved.progress.continuity.solved).toBe(false);
    expect(seed).toEqual(before);
    expect(walk.moveContinuation(seed, 999).continuityOffset).toBe(1.2);
    expect(walk.moveContinuation(seed, -999).continuityOffset).toBe(-1.2);
    expect(walk.moveContinuation(moved, 'bad').continuityOffset).toBe(0.25);
    for (const patch of [{ activity: 'context' }, { player: { x: 60, z: -2, yaw: 180, pitch: 0 } },
      { player: { x: 48, z: 7, yaw: 0, pitch: 0 } }]) {
      const unreachable = walk.normalize({ ...seed, ...patch });
      expect(walk.canMoveContinuation(unreachable)).toBe(false);
      expect(walk.moveContinuation(unreachable, 0)).toEqual(unreachable);
    }
    const depthAtReach = Math.sqrt(12 ** 2 - (2.995 + seed.continuityOffset - 1.65) ** 2);
    expect(walk.canMoveContinuation({ ...seed, player: { x: 61.7, z: depthAtReach, yaw: 0, pitch: 0 } })).toBe(true);
    expect(walk.canMoveContinuation({ ...seed, player: { x: 61.7, z: depthAtReach + 0.001, yaw: 0, pitch: 0 } })).toBe(false);
  });

  it('keeps every marked observation position reachable throughout the rod height range', () => {
    for (const x of [59.4, 59.6, 59.8, 60, 60.2, 60.4, 60.6]) {
      for (const z of [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11]) {
        for (const continuityOffset of [-1.2, -0.8, 0, 0.8, 1.2]) {
          const state = { activity: 'continuity', player: { x, z, yaw: 0, pitch: 0 }, continuityOffset };
          expect(walk.canMoveContinuation(state)).toBe(true);
          expect(walk.evidence(state).continuityFacing).toBe(true);
          expect(walk.moveContinuation(state, -1.2).continuityOffset).toBe(-1.2);
          expect(walk.moveContinuation(state, 1.2).continuityOffset).toBe(1.2);
        }
      }
    }
  });

  it('rejects a height change that would take an otherwise reachable rod beyond reach', () => {
    const seed = walk.normalize({ activity: 'continuity', player: { x: 61.7, z: 11.8, yaw: 0, pitch: 0 }, continuityOffset: 0.8,
      notes: { continuity: 'Keep this edge-of-reach observation.' } });
    const before = structuredClone(seed);
    expect(walk.canMoveContinuation(seed)).toBe(true);
    expect(walk.canMoveContinuation({ ...seed, continuityOffset: 1.2 })).toBe(false);
    expect(walk.moveContinuation(seed, 1.2)).toEqual(seed);
    const closer = walk.moveContinuation(seed, 0);
    expect(closer.continuityOffset).toBe(0);
    expect(walk.canMoveContinuation(closer)).toBe(true);
    expect(closer.player).toEqual(seed.player);
    expect(closer.notes).toEqual(seed.notes);
    expect(seed).toEqual(before);
  });

  it('requires physical line alignment and a straight-ahead observation viewpoint', () => {
    const answer = { activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0 };
    expect(walk.checkAnswer(answer)).toBe(true);
    expect(walk.evidence(answer)).toMatchObject({ continuityFacing: true, continuityOffset: 0 });
    for (const offset of [-0.06, 0.06]) expect(walk.checkAnswer({ ...answer, continuityOffset: offset })).toBe(true);
    for (const offset of [-0.060001, 0.060001, 0.8]) expect(walk.checkAnswer({ ...answer, continuityOffset: offset })).toBe(false);
    for (const patch of [{ x: 60.61 }, { x: 59.39 }, { z: 6.99 }, { z: 11.01 }, { z: -2 }, { yaw: 180 }, { pitch: 25 }]) {
      const state = { ...answer, player: { ...answer.player, ...patch } };
      expect(walk.evidence(state).continuityFacing).toBe(false);
      expect(walk.checkAnswer(state)).toBe(false);
    }
    for (const patch of [{ x: 60.59 }, { x: 59.41 }, { z: 7 }, { z: 11 }]) {
      expect(walk.checkAnswer({ ...answer, player: { ...answer.player, ...patch } })).toBe(true);
    }
    const faced = walk.faceExhibit({ ...answer, player: { ...answer.player, yaw: 120, pitch: 25 } });
    expect(faced).toEqual(walk.spawn('continuity'));
  });

  it('renders two equal-slope rods that share a line only at zero continuation offset', () => {
    const rods = scene.continuationObjects(0);
    expect(rods.map(rod => rod.id)).toEqual(['continuity-fixed', 'continuity-rod']);
    expect(rods.map(rod => [rod.from.x, rod.to.x])).toEqual([[57.2, 59.4], [60.6, 62.8]]);
    for (const rod of rods) for (const point of [rod.from, rod.to]) {
      expect(point.z).toBe(0);
      expect(point.y).toBeCloseTo(2.4 + 0.35 * (point.x - 60));
    }
    const offset = scene.continuationObjects(0.8);
    expect(offset[0]).toEqual(rods[0]);
    for (const endpoint of ['from', 'to']) {
      expect(offset[1][endpoint].y - rods[1][endpoint].y).toBeCloseTo(0.8);
      expect(offset[1][endpoint].x).toBe(rods[1][endpoint].x);
    }
    const slope = rod => (rod.to.y - rod.from.y) / (rod.to.x - rod.from.x);
    expect(slope(offset[0])).toBeCloseTo(0.35);
    expect(slope(offset[1])).toBeCloseTo(0.35);
    expect(scene.continuationObjects(NaN)).toEqual(offset);
    expect(scene.continuationObjects(999)[1].from.y - rods[1].from.y).toBeCloseTo(1.2);
    expect(scene.continuationObjects(-999)[1].from.y - rods[1].from.y).toBeCloseTo(-1.2);
    rods[1].from.y = 99;
    expect(scene.continuationObjects(0)[1].from.y).not.toBe(99);
  });

  it('allows inspecting behind the hidden-line panel only by walking around its edge', () => {
    let player = walk.spawn('continuity');
    player = walk.movePlayer(player, 'right', 4, -1);
    player = walk.movePlayer(player, 'forward', 10, -1);
    expect(player.x).toBeCloseTo(64);
    expect(player.z).toBeLessThan(-0.5);
    expect(walk.canMoveContinuation({ activity: 'continuity', player })).toBe(false);
    expect(walk.checkAnswer({ activity: 'continuity', player, continuityOffset: 0 })).toBe(false);
  });

  it('moves relative to heading while keeping movement and turn controls finite', () => {
    const origin = { x: 0, z: 9, yaw: 0, pitch: 0 };
    const forward = walk.movePlayer(origin, 'forward', 1, 3);
    expect(forward.z).toBeLessThan(origin.z); expect(forward.x).toBeCloseTo(origin.x);
    const back = walk.movePlayer(origin, 'back', 1, 3);
    expect(back.z).toBeGreaterThan(origin.z);
    expect(walk.movePlayer(origin, 'left', 1, 3).x).toBeLessThan(0);
    expect(walk.movePlayer(origin, 'right', 1, 3).x).toBeGreaterThan(0);
    expect(walk.movePlayer(origin, 'turnRight', 1, 3).yaw).not.toBe(0);
    expect(walk.movePlayer(origin, 'lookUp', 1, 3).pitch).not.toBe(0);
    expect(origin).toEqual({ x: 0, z: 9, yaw: 0, pitch: 0 });
    let player = origin;
    for (let i = 0; i < 200; i++) player = walk.movePlayer(player, 'back', 1, 3);
    expect(Object.values(player).every(Number.isFinite)).toBe(true);
    expect(player.z).toBeLessThan(100);
  });

  it('normalizes progressive hints independently and without mutating saved records', () => {
    const raw = { progress: { ring: { hints: 99 }, scale: { hints: -3 }, occlusion: { hints: 1.8 } } };
    const before = structuredClone(raw), normalized = walk.normalize(raw);
    expect(normalized.progress.ring.hints).toBe(2);
    expect(normalized.progress.scale.hints).toBe(0);
    expect(normalized.progress.occlusion.hints).toBe(1);
    expect(normalized.progress.ring.assisted).toBe(false);
    expect(walk.normalize({}).progress.ring.hints).toBe(0);
    expect(walk.normalize({ progress: { ring: { hints: 'bad' } } }).progress.ring.hints).toBe(0);
    expect(raw).toEqual(before);
  });

  it('moves a block within reach without sweeping its rail through the player', () => {
    const before = walk.normalize({ activity: 'scale', player: { x: 0.95, z: 2, yaw: 0, pitch: 0 }, blockZ: -1, notes: { scale: 'Keep this note' } });
    const saved = structuredClone(before), moved = walk.moveBlock(before, 6);
    expect(moved.blockZ).toBeLessThanOrEqual(1.35);
    expect(moved.player).toEqual(before.player);
    expect(moved.notes).toEqual(before.notes);
    expect(moved.progress).toEqual(before.progress);
    expect(before).toEqual(saved);
    const unreachable = walk.normalize({ activity: 'scale', player: { x: -12, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 });
    expect(walk.moveBlock(unreachable, 5).blockZ).toBe(3);
    const reachable = walk.normalize({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 3 });
    expect(walk.moveBlock(reachable, 999).blockZ).toBe(6);
    expect(walk.moveBlock(reachable, -999).blockZ).toBe(-1);
    const opposite = walk.normalize({ activity: 'scale', player: { x: 0.95, z: 2, yaw: 0, pitch: 0 }, blockZ: 6 });
    expect(walk.moveBlock(opposite, -1).blockZ).toBeGreaterThanOrEqual(2.65);
    const edge = walk.normalize({ activity: 'scale', player: { x: 6.95, z: 3, yaw: 0, pitch: 0 }, blockZ: 3 });
    const bounded = walk.moveBlock(edge, -1);
    expect(Math.hypot(bounded.player.x - 0.95, bounded.player.z - bounded.blockZ)).toBeLessThanOrEqual(7.00001);
  });

  it('computes a facing direction independently of player position and saved work', () => {
    for (const activity of ['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length', 'silhouette', 'anamorphosis']) {
      const seed = walk.normalize({ activity, player: { x: 4, z: 11, yaw: 160, pitch: 20 }, blockZ: 2 });
      const before = structuredClone(seed), faced = walk.faceExhibit(seed);
      expect(faced.x).toBe(seed.player.x); expect(faced.z).toBe(seed.player.z); expect(faced.pitch).toBe(0);
      expect(Number.isFinite(faced.yaw)).toBe(true); expect(faced.yaw).not.toBe(seed.player.yaw);
      expect(seed).toEqual(before);
    }
  });

  it('distinguishes correct viewpoints, projected sizes, and collected evidence', () => {
    const ring = walk.normalize({ activity: 'ring', player: { x: -12, z: 9, yaw: 0, pitch: 0 } });
    expect(walk.checkAnswer(ring)).toBe(true);
    expect(walk.checkAnswer({ ...ring, player: { ...ring.player, x: -10 } })).toBe(false);
    const scale = walk.normalize({ activity: 'scale', player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 });
    expect(walk.checkAnswer(scale)).toBe(true);
    expect(walk.checkAnswer({ ...scale, blockZ: -1 })).toBe(false);
    const occlusion = walk.normalize({ activity: 'occlusion', collected: [0, 1, 2] });
    expect(walk.checkAnswer(occlusion)).toBe(true);
    expect(walk.checkAnswer({ ...occlusion, collected: [0, 1] })).toBe(false);
  });

  it('prevents tunnelling through the screen and collecting through its opaque surface', () => {
    let player = { x: 12, z: 6, yaw: 0, pitch: 0 };
    for (let i = 0; i < 12; i++) player = walk.movePlayer(player, 'forward', 4, -1);
    expect(player.z).toBeGreaterThanOrEqual(2.55);
    for (const id of [0, 1, 2]) {
      expect(walk.canCollect({ player }, id)).toBe(false);
      expect(walk.canCollect({ player: { x: 12, z: 0, yaw: 0, pitch: 0 } }, id)).toBe(true);
      expect(walk.canCollect({ player: { x: 12, z: 0 }, collected: [id] }, id)).toBe(false);
    }
    expect(walk.canCollect({ player: { x: -12, z: 9 } }, 0)).toBe(false);
    expect(walk.canCollect({}, 4)).toBe(false);
  });

  it('recovers saved viewpoints inside physical barriers before movement resumes', () => {
    const examples = [
      { player: { x: 12, z: 2, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [9.65, 14.35, 1.45, 2.55] },
      { player: { x: -0.95, z: -3, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [-1.8, -0.1, -3.65, -2.35] },
      { player: { x: 0.95, z: 3, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [0.35, 1.55, 2.4, 3.6] },
      { player: { x: 36, z: 0, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [32.75, 39.25, -0.65, 0.35] },
      { player: { x: 48, z: 0, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [45.3, 50.7, -0.4, 0.4] },
      { player: { x: 46.5, z: 4, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [46.15, 46.85, 3.65, 4.35] },
      { player: { x: 60, z: 0, yaw: 0, pitch: 0 }, blockZ: 3, bounds: [56.85, 63.15, -0.5, 0.6] }
    ];
    for (const example of examples) {
      const normalized = walk.normalize(example), p = normalized.player, b = example.bounds;
      expect(p.x > b[0] && p.x < b[1] && p.z > b[2] && p.z < b[3]).toBe(false);
      const moved = walk.movePlayer(p, 'back', 0.2, example.blockZ);
      expect(Object.values(moved).every(Number.isFinite)).toBe(true);
    }
  });

  it('prevents a large movement step from tunnelling through either new display or its switch stand', () => {
    for (const [x, startZ, minimumZ] of [[36, 3, 0.35], [48, 3, 0.4], [46.5, 6, 4.35], [60, 3, 0.6]]) {
      let player = { x, z: startZ, yaw: 0, pitch: 0 };
      for (let step = 0; step < 3; step++) player = walk.movePlayer(player, 'forward', 8, -1);
      expect(player.z).toBeGreaterThanOrEqual(minimumZ);
      expect(player.x).toBe(x);
    }
  });
});

describe('first-person perception interactions', () => {
  it('adjusts the hidden line with slider and fine-step alternatives without automatically solving', async () => {
    await mount({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0.8 });
    expect(query('[data-walk-continuity-offset]').disabled).toBe(false);
    await input('[data-walk-continuity-offset]', 0.5);
    await click('[data-walk-continuity-up]');
    expect(latest.perceptionWalk.continuityOffset).toBeCloseTo(0.55);
    await click('[data-walk-continuity-down]');
    expect(latest.perceptionWalk.continuityOffset).toBeCloseTo(0.5);
    await click('[data-walk-precision]'); await click('[data-walk-continuity-up]');
    expect(latest.perceptionWalk.continuityOffset).toBeCloseTo(0.51);
    await click('[data-walk-continuity-down]');
    expect(latest.perceptionWalk.continuityOffset).toBeCloseTo(0.5);
    await input('[data-walk-continuity-offset]', 0);
    expect(latest.perceptionWalk.progress.continuity.solved).toBe(false);
    await click('[data-walk-hint]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.continuity).toEqual({ solved: true, assisted: false, hints: 1 });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('drags the picked continuation by world-coordinate delta without moving the camera', async () => {
    await mount({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0.8 });
    const viewer = viewers.at(-1), before = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'continuity-rod', distance: 9 });
    viewer.continuationCoordinate.mockImplementation((x, y) => 2.4 + (100 - y) / 50);
    await pointer('pointerdown', 100, 100);
    expect(latest.perceptionWalk.continuityOffset).toBe(0.8);
    await pointer('pointermove', 100, 120);
    expect(latest.perceptionWalk.continuityOffset).toBeCloseTo(0.4);
    expect(latest.perceptionWalk.player).toEqual(before);
    await pointer('pointermove', 100, 500);
    expect(latest.perceptionWalk.continuityOffset).toBe(-1.2);
    expect(latest.perceptionWalk.player).toEqual(before);
    await pointer('pointerup', 100, 500);
    expect(viewer.push.mock.calls.at(-1)[0].continuityOffset).toBe(-1.2);
  });

  it('cancels a continuation drag after pointer cancellation or renderer failure', async () => {
    await mount({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0.8 });
    const viewer = viewers.at(-1);
    viewer.pick.mockReturnValue({ id: 'continuity-rod', distance: 9 });
    viewer.continuationCoordinate.mockImplementation((x, y) => (100 - y) / 50);
    await pointer('pointerdown', 100, 100); await pointer('pointercancel', 100, 100); await pointer('pointermove', 100, 140);
    expect(latest.perceptionWalk.continuityOffset).toBe(0.8);
    await pointer('pointerdown', 100, 100); await act(async () => viewer.report('failed')); await pointer('pointermove', 100, 140);
    expect(latest.perceptionWalk.continuityOffset).toBe(0.8);
    expect(query('[data-walk-continuity-plan]')).toBeTruthy();
  });

  it('disables continuation adjustments beyond reach and requires returning to the observation area', async () => {
    await mount({ activity: 'continuity', player: { x: 60, z: 12, yaw: 0, pitch: 0 }, continuityOffset: 0 });
    for (const selector of ['[data-walk-continuity-offset]', '[data-walk-continuity-up]', '[data-walk-continuity-down]']) {
      expect(query(selector).disabled).toBe(true);
    }
    await click('[data-walk-check]');
    expect(walk.normalize(latest.perceptionWalk).progress.continuity.solved).toBe(false);
    await click('[data-walk-home]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('continuity'));
    expect(latest.perceptionWalk.progress.continuity.solved).toBe(true);
  });

  it('preserves hidden-line observations and sibling work across switching and reset', async () => {
    await mount({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0,
      progress: { context: { solved: true, hints: 2 }, continuity: { solved: true, hints: 1 } },
      notes: { continuity: 'The two pieces share one slope.', context: 'Keep the gray comparison.' },
      context: { selected: ['A', 'C'], neutral: true } });
    await click('[data-walk-activity="context"]'); await click('[data-walk-activity="continuity"]');
    expect(query('[data-walk-note]').value).toBe('The two pieces share one slope.');
    expect(latest.perceptionWalk.continuityOffset).toBe(0);
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.continuityOffset).toBe(0.8);
    expect(latest.perceptionWalk.progress.continuity).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.continuity).toBe('The two pieces share one slope.');
    expect(latest.perceptionWalk.progress.context).toEqual({ solved: true, assisted: false, hints: 2 });
    expect(latest.perceptionWalk.context).toEqual({ selected: ['A', 'C'], neutral: true });
    expect(latest.perceptionGallery).toEqual({ models: { shape: { note: 'Gallery draft' } } });
  });

  it('keeps reveal-assisted hidden-line work separate and supports the renderer fallback', async () => {
    await mount({ activity: 'continuity', player: walk.spawn('continuity'), continuityOffset: 0 });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.continuity).toMatchObject({ solved: false, assisted: true });
    await act(async () => viewers.at(-1).report('failed'));
    expect(query('[data-walk-continuity-plan]')).toBeTruthy();
    await input('[data-walk-continuity-offset]', 0.25);
    expect(latest.perceptionWalk.continuityOffset).toBe(0.25);
    await click('[data-walk-reset]'); await input('[data-walk-continuity-offset]', 0); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.continuity).toMatchObject({ solved: true, assisted: false });
  });

  it('enters the new bay naturally when stepping across its boundary', async () => {
    await mount({ activity: 'context', player: { x: 53.9, z: 9, yaw: 0, pitch: 0 } });
    await click('[data-walk-move="right"]');
    expect(latest.perceptionWalk.activity).toBe('continuity');
    expect(query('[data-walk-activity="continuity"]').getAttribute('aria-pressed')).toBe('true');
    expect(latest.perceptionWalk.player.x).toBeCloseTo(54.1);
  });

  it('rotates picked physical corners by pointer delta without moving the camera', async () => {
    await mount({ activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 } });
    const viewer = viewers.at(-1), before = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'contour-2', distance: 6.5 });
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 160, 130); await pointer('pointerup', 160, 130);
    expect(latest.perceptionWalk.contour.selected).toBe(2);
    expect(latest.perceptionWalk.contour.angles[2]).toBe(300);
    expect(latest.perceptionWalk.player).toEqual(before);
    expect(query('[data-walk-corner="2"]').checked).toBe(true);
    await pointer('pointerdown', 100, 100); await pointer('pointercancel', 100, 100); await pointer('pointermove', 180, 100);
    expect(latest.perceptionWalk.contour.angles[2]).toBe(300);
  });

  it('solves contour work with angle alternatives and non-reveal hints', async () => {
    await mount({ activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 } });
    await input('[data-walk-corner-angle]', 350); await click('[data-walk-corner-left]');
    expect(latest.perceptionWalk.contour.angles[0]).toBe(35);
    await click('[data-walk-corner-right]'); expect(latest.perceptionWalk.contour.angles[0]).toBe(350);
    await click('[data-walk-contour-choice="square"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.contour.solved).toBe(false);
    await click('[data-walk-hint]');
    for (const [index, angle] of [315, 225, 135, 45].entries()) {
      await click('[data-walk-corner="' + index + '"]'); await input('[data-walk-corner-angle]', angle);
    }
    await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.contour).toEqual({ solved: true, assisted: false, hints: 1 });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('selects two tiles, rejects a third, and toggles the real neutral surround switch', async () => {
    await mount({ activity: 'context', player: { x: 48, z: 7, yaw: 0, pitch: 0 } });
    const viewer = viewers.at(-1);
    viewer.pick.mockReturnValue({ id: 'context-A', distance: 7 });
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.context.selected).toEqual(['A']); expect(query('[data-walk-context-tile="A"]').checked).toBe(true);
    await click('[data-walk-context-tile="B"]'); await click('[data-walk-context-tile="C"]');
    expect(latest.perceptionWalk.context.selected).toEqual(['A', 'B']);
    expect(query('[data-walk-status]').textContent).toMatch(/two|2|remove|deselect/i);
    await click('[data-walk-context-tile="B"]'); await click('[data-walk-context-tile="C"]');
    expect(latest.perceptionWalk.context.selected).toEqual(['A', 'C']);
    viewer.pick.mockReturnValue({ id: 'context-switch', distance: 4 });
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.context.neutral).toBe(true); expect(query('[data-walk-context-neutral]').checked).toBe(true);
    await click('[data-walk-check]'); expect(latest.perceptionWalk.progress.context).toMatchObject({ solved: true, assisted: false });
  });

  it('resets only the current new puzzle while retaining notes and sibling progress', async () => {
    await mount({ activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 },
      contour: { angles: [315, 225, 135, 45], selected: 2, choice: 'square' },
      context: { selected: ['A', 'C'], neutral: true }, progress: { context: { solved: true, hints: 2 } },
      notes: { contour: 'Keep this contour note.', context: 'Keep this context note.' } });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.contour).toMatchObject({ solved: false, assisted: true });
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.contour).toEqual({ angles: [90, 0, 270, 180], selected: 0, choice: '' });
    expect(latest.perceptionWalk.context).toEqual({ selected: ['A', 'C'], neutral: true });
    expect(latest.perceptionWalk.progress.context).toEqual({ solved: true, assisted: false, hints: 2 });
    expect(latest.perceptionWalk.notes.contour).toBe('Keep this contour note.');
    await click('[data-walk-activity="context"]'); await click('[data-walk-reset]');
    expect(latest.perceptionWalk.context).toEqual({ selected: [], neutral: false });
    expect(latest.perceptionWalk.notes.context).toBe('Keep this context note.');
    expect(latest.perceptionGallery).toEqual({ models: { shape: { note: 'Gallery draft' } } });
  });

  it('retains rotation and tile alternatives when the renderer is unavailable', async () => {
    await mount({ activity: 'contour', player: { x: 36, z: 6.5, yaw: 0, pitch: 0 } });
    await act(async () => viewers.at(-1).report('failed'));
    expect(query('[data-walk-plan]')).toBeTruthy();
    await click('[data-walk-corner="3"]'); await input('[data-walk-corner-angle]', 45);
    expect(latest.perceptionWalk.contour.angles[3]).toBe(45);
    await click('[data-walk-activity="context"]'); await click('[data-walk-context-tile="A"]'); await click('[data-walk-context-tile="C"]');
    await click('[data-walk-context-neutral]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.context).toMatchObject({ solved: true, assisted: false });
  });

  it('records, revisits, selects, and independently solves a parallax comparison with hints', async () => {
    await mount({ activity: 'parallax', player: { x: 24, z: 9, yaw: 0, pitch: 0 } });
    await click('[data-walk-choice="C"]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.parallax.solved).toBe(false);
    await click('[data-walk-hint]'); await click('[data-walk-record]');
    expect(latest.perceptionWalk.parallax.samples).toHaveLength(1);
    await click('[data-walk-record]'); expect(latest.perceptionWalk.parallax.samples).toHaveLength(1);
    await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, player: { x: 25.4, z: 9, yaw: 0, pitch: 0 } } })));
    await click('[data-walk-record]');
    expect(latest.perceptionWalk.parallax.samples).toHaveLength(2);
    await click('[data-walk-view="0"]'); expect(latest.perceptionWalk.player).toEqual({ x: 24, z: 9, yaw: 0, pitch: 0 });
    await click('[data-walk-view="1"]'); expect(latest.perceptionWalk.player).toEqual({ x: 25.4, z: 9, yaw: 0, pitch: 0 });
    await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.parallax).toMatchObject({ solved: true, assisted: false, hints: 1 });
    expect(latest.otherTool).toEqual({ preserved: 37 });
  });

  it('selects actual ray-picked parallax objects and resets only the fourth challenge records', async () => {
    await mount({ activity: 'parallax', player: { x: 24, z: 9, yaw: 0, pitch: 0 },
      progress: { ring: { solved: true } }, notes: { parallax: 'Nearer objects shift more.' } });
    const viewer = viewers.at(-1); viewer.pick.mockReturnValue({ id: 'parallax-B', distance: 12 });
    await pointer('pointerdown', 100, 100); await pointer('pointerup', 100, 100);
    expect(latest.perceptionWalk.parallax.choice).toBe('B');
    expect(query('[data-walk-choice="B"]').checked).toBe(true);
    await click('[data-walk-record]'); await click('[data-walk-reveal]'); await click('[data-walk-reset]');
    expect(latest.perceptionWalk.parallax).toEqual({ round: 0, completed: [], samples: [], choice: '' });
    expect(latest.perceptionWalk.progress.parallax).toEqual({ solved: false, assisted: false, hints: 0 });
    expect(latest.perceptionWalk.notes.parallax).toBe('Nearer objects shift more.');
    expect(latest.perceptionWalk.progress.ring.solved).toBe(true);
  });

  it('keeps reveal-assisted parallax work separate from independent solves', async () => {
    await mount({ activity: 'parallax', player: { x: 24, z: 9, yaw: 0, pitch: 0 }, parallax: { choice: 'C', samples: [
      { x: 24, z: 9, yaw: 0, pitch: 0 }, { x: 25.4, z: 9, yaw: 0, pitch: 0 }
    ] } });
    await click('[data-walk-reveal]'); await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.parallax).toMatchObject({ solved: false, assisted: true });
    await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-plan]')).toBeTruthy();
    expect(query('[data-walk-choice="C"]').checked).toBe(true);
    expect(latest.perceptionWalk.parallax.samples).toHaveLength(2);
  });

  it('uses a persisted precision checkbox for button and keyboard steps while retaining Shift precision', async () => {
    await mount({ activity: 'parallax', player: { x: 24, z: 9, yaw: 0, pitch: 0 } });
    await click('[data-walk-move="right"]'); expect(latest.perceptionWalk.player.x).toBeCloseTo(24.2);
    await click('[data-walk-precision]'); expect(latest.perceptionWalk.precise).toBe(true);
    await click('[data-walk-move="right"]'); expect(latest.perceptionWalk.player.x).toBeCloseTo(24.25);
    await click('[data-walk-move="turnRight"]'); expect(latest.perceptionWalk.player.yaw).toBeCloseTo(1);
    const stage = query('[data-walk-stage]');
    await act(async () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(latest.perceptionWalk.player.yaw).toBeCloseTo(2);
    await click('[data-walk-precision]');
    await act(async () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, bubbles: true })));
    expect(latest.perceptionWalk.player.yaw).toBeCloseTo(3);
    await act(async () => stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(latest.perceptionWalk.player.yaw).toBeCloseTo(8);
  });

  it('persists two non-reveal hints per challenge and resets only the current hints', async () => {
    await mount({ activity: 'ring', player: { x: -12, z: 9, yaw: 0, pitch: 0 } });
    await click('[data-walk-hint]');
    expect(query('[data-walk-hints]').textContent.trim()).not.toBe('');
    expect(latest.perceptionWalk.progress.ring).toMatchObject({ hints: 1, assisted: false });
    await click('[data-walk-hint]');
    expect(query('[data-walk-hint]').disabled).toBe(true);
    await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.ring).toMatchObject({ hints: 2, solved: true, assisted: false });
    await click('[data-walk-activity="scale"]');
    expect(latest.perceptionWalk.progress.scale.hints).toBe(0);
    await click('[data-walk-hint]'); await input('[data-walk-note]', 'A preserved measurement note.');
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.progress.scale).toMatchObject({ hints: 0, solved: false, assisted: false });
    expect(latest.perceptionWalk.notes.scale).toBe('A preserved measurement note.');
    await click('[data-walk-activity="ring"]');
    expect(latest.perceptionWalk.progress.ring.hints).toBe(2);
    expect(query('[data-walk-hint]').disabled).toBe(true);
  });

  it('faces the current exhibit without moving and hides misleading offscreen readings', async () => {
    await mount({ activity: 'ring', player: { x: -12, z: 9, yaw: 179, pitch: 30 } });
    expect(query('[data-walk-evidence]').textContent).toContain('Out of view');
    await click('[data-walk-face]');
    expect(latest.perceptionWalk.player).toMatchObject({ x: -12, z: 9, yaw: 0, pitch: 0 });
    expect(query('[data-walk-evidence]').textContent).not.toContain('Out of view');
    await click('[data-walk-activity="scale"]');
    await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, player: { x: 2, z: 8, yaw: 160, pitch: -20 } } })));
    expect(query('[data-walk-evidence]').textContent).toContain('Out of view');
    await click('[data-walk-face]');
    expect(latest.perceptionWalk.player.x).toBe(2); expect(latest.perceptionWalk.player.z).toBe(8);
    expect(latest.perceptionWalk.player.yaw).toBeLessThan(0); expect(latest.perceptionWalk.player.pitch).toBe(0);
  });

  it('uses projected waypoints and returns keyboard focus to the destination activity', async () => {
    await mount();
    await act(async () => viewers.at(-1).layout([
      { id: 'ring', x: 0.2, y: 0.3, visible: true, distance: 8 },
      { id: 'scale', x: 0.5, y: 0.3, visible: true, distance: 12 },
      { id: 'occlusion', x: 0.8, y: 0.3, visible: false, distance: 25 }
    ]));
    expect(query('[data-walk-waypoint="scale"]')).toBeTruthy();
    expect(query('[data-walk-waypoint="occlusion"]')).toBeFalsy();
    await click('[data-walk-waypoint="scale"]');
    expect(latest.perceptionWalk.activity).toBe('scale');
    expect(latest.perceptionWalk.player).toEqual(walk.spawn('scale'));
    expect(document.activeElement).toBe(query('[data-walk-activity="scale"]'));
  });

  it('drags a picked block by its initial coordinate delta without moving the camera', async () => {
    await mount({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 1 });
    const viewer = viewers.at(-1), before = structuredClone(latest.perceptionWalk.player);
    viewer.pick.mockReturnValue({ id: 'scale-block', distance: 4 });
    viewer.blockCoordinate.mockImplementation(x => 3 + (x - 100) / 20);
    await pointer('pointerdown', 100, 100);
    expect(latest.perceptionWalk.blockZ).toBe(1);
    await pointer('pointermove', 140, 100);
    expect(latest.perceptionWalk.blockZ).toBe(3);
    expect(latest.perceptionWalk.player).toEqual(before);
    await pointer('pointermove', 1000, 100);
    expect(latest.perceptionWalk.blockZ).toBe(6);
    expect(latest.perceptionWalk.player).toEqual(before);
    await pointer('pointerup', 1000, 100);
  });

  it('keeps ordinary pointer drags looking and cancels a block drag on pointer cancellation', async () => {
    await mount({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 1 });
    const viewer = viewers.at(-1);
    await pointer('pointerdown', 100, 100); await pointer('pointermove', 140, 120); await pointer('pointerup', 140, 120);
    expect(latest.perceptionWalk.player.yaw).not.toBe(0);
    expect(latest.perceptionWalk.player.pitch).not.toBe(0);
    viewer.pick.mockReturnValue({ id: 'scale-block', distance: 4 });
    viewer.blockCoordinate.mockImplementation(x => (x - 100) / 20);
    await pointer('pointerdown', 100, 100); await pointer('pointercancel', 100, 100); await pointer('pointermove', 140, 100);
    expect(latest.perceptionWalk.blockZ).toBe(1);
  });

  it('cancels an active block drag when the renderer loses its context', async () => {
    await mount({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 }, blockZ: 1 });
    const viewer = viewers.at(-1);
    viewer.pick.mockReturnValue({ id: 'scale-block', distance: 4 });
    viewer.blockCoordinate.mockImplementation(x => (x - 100) / 20);
    await pointer('pointerdown', 100, 100);
    await act(async () => viewer.report('failed'));
    await pointer('pointermove', 140, 100);
    expect(latest.perceptionWalk.blockZ).toBe(1);
    expect(query('[data-walk-plan]')).toBeTruthy();
  });

  it('changes activities without overwriting other tools and returns to the gallery', async () => {
    await mount();
    for (const activity of ['ring', 'scale', 'occlusion', 'parallax', 'contour', 'context', 'continuity', 'shadow', 'change', 'rotation', 'relief', 'shape', 'motion', 'frame', 'weave', 'landing', 'aperture', 'length', 'silhouette', 'anamorphosis']) {
      await click('[data-walk-activity="' + activity + '"]');
      expect(latest.perceptionWalk.activity).toBe(activity);
      expect(query('[data-walk-stage]')).toBeTruthy();
    }
    expect(latest.perceptionGallery).toEqual({ models: { shape: { note: 'Gallery draft' } } });
    expect(latest.otherTool).toEqual({ preserved: 37 });
    expect(host.textContent).not.toMatch(/\\u[0-9a-f]{4}/i);
    await click('[data-walk-close]'); expect(close).toHaveBeenCalledOnce();
  });

  it('keeps reveal-assisted progress separate from independent solves', async () => {
    await mount({ activity: 'ring', player: { x: -12, z: 9, yaw: 0, pitch: 0 } });
    await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.ring).toMatchObject({ solved: true, assisted: false });
    await click('[data-walk-activity="scale"]');
    await input('[data-walk-note]', 'Half as tall, half as far away.');
    await click('[data-walk-reveal]');
    expect(latest.perceptionWalk.progress.scale).toMatchObject({ solved: false, assisted: true });
    await act(async () => replace(data => ({ ...data, perceptionWalk: { ...data.perceptionWalk, player: { x: 0, z: 9, yaw: 0, pitch: 0 }, blockZ: 3 } })));
    await click('[data-walk-check]');
    expect(latest.perceptionWalk.progress.scale.solved).toBe(false);
    await click('[data-walk-reset]');
    expect(latest.perceptionWalk.progress.scale).toMatchObject({ solved: false, assisted: false });
    expect(latest.perceptionWalk.notes.scale).toBe('Half as tall, half as far away.');
  });

  it('updates bounded block position, per-activity notes, and first-person controls', async () => {
    await mount({ activity: 'scale', player: { x: 0, z: 5, yaw: 0, pitch: 0 } });
    await click('[data-walk-select-block]');
    await input('[data-walk-block-z]', 3);
    expect(latest.perceptionWalk.blockZ).toBe(3);
    await input('[data-walk-note]', 'Scale note');
    await click('[data-walk-activity="ring"]');
    await input('[data-walk-note]', 'Ring note');
    const before = { ...latest.perceptionWalk.player };
    await click('[data-walk-move="forward"]');
    expect(latest.perceptionWalk.player).not.toEqual(before);
    await click('[data-walk-activity="scale"]');
    expect(query('[data-walk-note]').value).toBe('Scale note');
    expect(latest.perceptionWalk.notes.ring).toBe('Ring note');
  });

  it('keeps keyboard movement local to the focused scene and leaves note typing alone', async () => {
    await mount();
    const stage = query('[data-walk-stage]'), before = { ...latest.perceptionWalk.player };
    await act(async () => {
      stage.focus();
      stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
      stage.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', code: 'KeyW', bubbles: true }));
    });
    expect(latest.perceptionWalk.player).not.toEqual(before);
    const after = { ...latest.perceptionWalk.player };
    await act(async () => {
      const note = query('[data-walk-note]'); note.focus();
      note.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', code: 'KeyW', bubbles: true }));
    });
    expect(latest.perceptionWalk.player).toEqual(after);
  });

  it('changes the active bay by walking without teleporting or moving focus', async () => {
    await mount({ activity: 'ring', player: { x: -6.05, z: 9, yaw: 0, pitch: 0 } });
    const stage = query('[data-walk-stage]');
    await act(async () => {
      stage.focus(); stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
    });
    expect(latest.perceptionWalk.activity).toBe('scale');
    expect(latest.perceptionWalk.player.x).toBeGreaterThan(-6);
    expect(latest.perceptionWalk.player.x).toBeLessThan(-5);
    expect(latest.perceptionWalk.player.z).toBe(9);
    expect(document.activeElement).toBe(stage);
  });

  it('preserves work across diagram fallback and cleans up on unmount', async () => {
    await mount({}, true);
    await input('[data-walk-note]', 'Perspective changes with position.');
    const before = structuredClone(latest.perceptionWalk);
    await click('[data-walk-diagram-toggle]');
    expect(query('[data-walk-plan]')).toBeTruthy();
    expect(latest.perceptionWalk).toEqual(before);
    await click('[data-walk-diagram-toggle]');
    expect(latest.perceptionWalk).toEqual(before);
    await act(async () => root.unmount()); root = null;
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(viewers.some(viewer => viewer.dispose.mock.calls.length > 0)).toBe(true);
  });
});
