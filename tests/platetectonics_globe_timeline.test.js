import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Execute the shipped renderer's actual frame function. React/DOM controls and
// real canvas output are covered separately by tectonics_globe_timeline_qa.cjs.
const source = fs.readFileSync('stem_lab/stem_tool_platetectonics.js', 'utf8');
const start = source.indexOf('                function drawEarth(now) {');
const end = source.indexOf('                drawEarth();', start);
const createFrame = new Function('env', 'with (env) { return ' + source.slice(start, end).trim() + '; }');

function clock({ era = 3, speed = 1, visible = false } = {}) {
  const data = { timelineEra: era, timelapsePlaying: true, timelapseSpeed: speed };
  const updates = [], pending = new Map(), draws = [];
  let time = 0, id = 0;
  const dataNode = { getAttribute(name) { return String(data[{ 'data-tl-era': 'timelineEra', 'data-tl-playing': 'timelapsePlaying', 'data-tl-speed': 'timelapseSpeed' }[name]]); } };
  const canvas = { isConnected: true, parentElement: { clientWidth: 328 }, style: {}, _geoLongitude: 25, closest: () => ({ querySelector: () => dataNode }) };
  const context = new Proxy({}, { get: (_target, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  const env = { canvas, performance: { now: () => time }, requestAnimationFrame: fn => { pending.set(++id, fn); return id; }, cancelAnimationFrame: handle => pending.delete(handle),
    ptOnScreen: () => visible, ptReducedMotion: () => true, ERAS_COUNT: 8, eraMap: [0, 1, 2, 3, 4, 5, 6, 7],
    upd: patch => { updates.push(patch); Object.assign(data, patch); },
    W: 520, H: 320, cx: 260, cy: 160, R: 130, tick: 0, ctx: context,
    window: {}, AlloTectonicsGeo: { draw: (_ctx, geometry) => draws.push(geometry) },
    ERA_CONTINENTS: Array.from({ length: 8 }, (_, i) => ({ name: String(i), ocean: '#112233', land: '#445566' })),
    ERAS: Array.from({ length: 8 }, () => ({ mya: 'Present' })), __alloT: (_key, fallback) => fallback };
  const frame = createFrame(env); frame();
  const advance = (seconds, fps = 60) => { for (let i = 0; i < Math.round(seconds * fps); i++) { time += 1000 / fps; const callbacks = [...pending.values()]; pending.clear(); callbacks.forEach(fn => fn(time)); } };
  return { data, updates, canvas, pending, draws, env, advance };
}

describe('Globe timeline playback', () => {
  it('advances the selected era while the globe is below the viewport', () => {
    const model = clock(); model.advance(3);
    expect(model.data.timelineEra).toBe(4);
    expect(model.canvas._tlState.progress).toBeCloseTo(4.44, 8);
    expect(model.draws).toHaveLength(0);
  });
  it('uses elapsed time consistently at 30 and 60 frames per second and honors playback speed', () => {
    const slowFrames = clock(), fastFrames = clock(), doubled = clock({ speed: 2 });
    slowFrames.advance(3, 30); fastFrames.advance(3, 60); doubled.advance(3, 30);
    expect(slowFrames.canvas._tlState.progress).toBeCloseTo(fastFrames.canvas._tlState.progress, 8);
    expect(doubled.canvas._tlState.progress - 3).toBeCloseTo(2 * (fastFrames.canvas._tlState.progress - 3), 8);
  });
  it('finishes paused at Modern and does not repeat the completion update while idle', () => {
    const model = clock({ era: 6 }); model.advance(4);
    expect(model.data).toMatchObject({ timelineEra: 7, timelapsePlaying: false });
    expect(model.updates).toEqual([{ timelineEra: 7, timelapsePlaying: false }]);
    model.advance(30);
    expect(model.updates).toHaveLength(1);
    expect(model.canvas._tlState.progress).toBe(7);
  });
  it('holds a manually selected era while paused, then resumes from that selection', () => {
    const model = clock(); model.advance(2);
    Object.assign(model.data, { timelineEra: 1, timelapsePlaying: false }); model.advance(5);
    expect(model.canvas._tlState.progress).toBe(1);
    model.data.timelapsePlaying = true; model.advance(3);
    expect(model.data.timelineEra).toBe(2);
  });
  it('keeps the viewing longitude stable while eras change and fits the phone canvas', () => {
    const model = clock({ visible: true }); model.advance(3);
    expect(model.draws.length).toBeGreaterThan(1);
    expect(new Set(model.draws.map(draw => draw.lon0))).toEqual(new Set([25]));
    expect(model.canvas.width).toBe(328);
    expect(model.env.cx).toBe(164);
    expect(model.env.R).toBe(130);
  });
  it('stops scheduling frames when the globe is unmounted', () => {
    const model = clock(); model.canvas.isConnected = false; model.advance(1);
    expect(model.pending.size).toBe(0);
    expect(model.updates).toHaveLength(0);
  });
});
