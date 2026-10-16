import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const translate = (key, fallback) => key.split('.').reduce((value, part) => value?.[part], strings) || fallback || key;
const flatten = node => !node || typeof node !== 'object' ? [] : (Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)]);
let reducedMotion, frameCallbacks, frameId, now;

function context2d() {
  const stack = [];
  const state = { font: '10px sans-serif', globalAlpha: 1, textRecords: [] };
  state.fillText = (text, x, y) => state.textRecords.push({ text, x, y });
  state.clearRect = () => { state.textRecords = []; };
  state.save = () => stack.push({ font: state.font, globalAlpha: state.globalAlpha, fillStyle: state.fillStyle, strokeStyle: state.strokeStyle, textAlign: state.textAlign, textBaseline: state.textBaseline });
  state.restore = () => Object.assign(state, stack.pop() || {});
  state.measureText = text => ({ width: String(text).length * (parseFloat(/([\d.]+)px/.exec(state.font)?.[1]) || 10) * 0.56 });
  state.createLinearGradient = state.createRadialGradient = () => ({ addColorStop() {} });
  return new Proxy(state, { get: (target, key) => key in target ? target[key] : () => {} });
}

function setup() {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'neuron' } });
  const canvas = document.createElement('canvas');
  const ctx = context2d();
  canvas.getContext = () => ctx;
  Object.defineProperties(canvas, {
    clientWidth: { get: () => 1160 }, clientHeight: { get: () => 1160 * canvas.height / canvas.width },
    clientLeft: { value: 2 }, clientTop: { value: 2 },
    offsetWidth: { get: () => canvas.clientWidth + 4 }, offsetHeight: { get: () => canvas.clientHeight + 4 }
  });
  canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: canvas.offsetWidth, height: canvas.offsetHeight });
  document.body.appendChild(canvas);
  const render = () => {
    const nodes = flatten(tool.render(makeCtx({ t: translate }, store)));
    const canvasNode = nodes.find(node => node.props?.['data-brainatlas-canvas'] === 'true');
    canvas.width = canvasNode.props.width;
    canvas.height = canvasNode.props.height;
    canvasNode.ref(canvas);
    return nodes;
  };
  render();
  return { canvas, ctx, store, render };
}

function frame(milliseconds = 50) {
  now += milliseconds;
  const pending = [...frameCallbacks.values()];
  frameCallbacks.clear();
  pending.forEach(callback => callback(now));
}

beforeEach(() => {
  resetStemLab(); vi.useFakeTimers();
  reducedMotion = false; frameCallbacks = new Map(); frameId = 0; now = 1000;
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('matchMedia', () => ({ matches: reducedMotion }));
  vi.stubGlobal('requestAnimationFrame', vi.fn(callback => { const id = ++frameId; frameCallbacks.set(id, callback); return id; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn(id => frameCallbacks.delete(id)));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});

afterEach(() => {
  window.__alloBrainAtlasCanvasCleanup?.();
  document.querySelectorAll('canvas, #allo-live-brainatlas').forEach(element => element.remove());
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Brain Atlas action-potential study playback', () => {
  it('keeps each selected phase, waveform marker and highlighted explanation in agreement', () => {
    const { canvas, ctx } = setup();
    const labels = ['Resting', 'Stimulus', 'Depolarization', 'Peak', 'Repolarization', 'Recovery'];
    const voltageRanges = [[-70, -70], [-70, -55], [-55, 30], [30, 30], [-70, 30], [-80, -70]];
    for (let index = 0; index < labels.length; index++) {
      canvas._brainNeuronControl('phase', index);
      const chart = canvas._brainActionPotential;
      expect(chart.state.phaseIndex).toBe(index);
      expect(chart.state.label).toBe(labels[index]);
      expect(chart.state.voltage).toBeGreaterThanOrEqual(voltageRanges[index][0]);
      expect(chart.state.voltage).toBeLessThanOrEqual(voltageRanges[index][1]);
      expect(chart.marker.x).toBeCloseTo(chart.plot.x + chart.state.x * chart.plot.w, 6);
      expect(chart.marker.y).toBeCloseTo(chart.plot.y + (40 - chart.state.voltage) / 130 * chart.plot.h, 6);
      expect(chart.activeCard).toBe(chart.state.cardIndex);
      expect(canvas._brainNeuronPlayback).toMatchObject({ position: index + .5, playing: false });
      expect(ctx.textRecords.some(record => String(record.text).includes(labels[index]))).toBe(true);
    }
  });

  it('holds the peak at +30 mV instead of labeling the falling trace as an overshoot', () => {
    const { canvas } = setup();
    canvas._brainNeuronControl('phase', 3);
    expect(canvas._brainActionPotential.state).toMatchObject({ phaseIndex: 3, label: 'Peak', voltage: 30, x: .48 });
    canvas._brainNeuronControl('toggle');
    for (let index = 0; index < 3; index++) frame(50);
    expect(canvas._brainActionPotential.state).toMatchObject({ phaseIndex: 3, label: 'Peak', voltage: 30, x: .48 });
  });

  it('allows reduced-motion learners to inspect every phase without starting animation', () => {
    reducedMotion = true;
    const { canvas } = setup();
    expect(canvas._brainNeuronPlayback.playing).toBe(false);
    for (let index = 0; index < 6; index++) {
      canvas._brainNeuronControl('phase', index);
      expect(canvas._brainActionPotential.state.phaseIndex).toBe(index);
      expect(canvas._brainNeuronPlayback.playing).toBe(false);
      const position = canvas._brainNeuronPlayback.position;
      frame(1000);
      expect(canvas._brainNeuronPlayback.position).toBe(position);
    }
  });

  it('pauses at the current position and preserves it across rerenders and resume', () => {
    const { canvas, store, render } = setup();
    canvas._brainNeuronControl('phase', 2);
    const pausedPosition = canvas._brainNeuronPlayback.position;
    frame(1000);
    expect(canvas._brainNeuronPlayback.position).toBe(pausedPosition);
    store.toolData.brainAtlas.selectedRegion = 'myelin';
    render();
    expect(canvas._brainNeuronPlayback).toMatchObject({ position: pausedPosition, playing: false });
    canvas._brainNeuronControl('toggle');
    expect(canvas._brainNeuronPlayback.position).toBeCloseTo(pausedPosition, 6);
    frame(50); frame(50);
    expect(canvas._brainNeuronPlayback.position).toBeGreaterThan(pausedPosition);
    canvas._brainNeuronControl('toggle');
    const stoppedPosition = canvas._brainNeuronPlayback.position;
    frame(1000);
    expect(canvas._brainNeuronPlayback).toMatchObject({ position: stoppedPosition, playing: false });
  });

  it('removes the command and stops scheduled updates when the neuron canvas is cleaned up', () => {
    const { canvas, ctx } = setup();
    canvas._brainCleanup();
    expect(canvas._brainNeuronControl).toBeFalsy();
    const lastChart = canvas._brainActionPotential;
    const lastText = [...ctx.textRecords];
    frame(1000);
    expect(canvas._brainActionPotential).toBe(lastChart);
    expect(ctx.textRecords).toEqual(lastText);
    expect(frameCallbacks.size).toBe(0);
  });
});
