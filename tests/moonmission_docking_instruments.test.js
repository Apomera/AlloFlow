import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

const metric = (state, key) => P.dockingInstruments(state).metrics.find(item => item.key === key);
const observed = (extra = {}) => ({ ...P.dockingState(), ...extra });

describe('Moon Mission docking contact instruments', () => {
  it('maps physical quantities to fixed signed scales without altering the measured state', () => {
    const state = Object.freeze(observed({ x: -0.3, vy: 0.1, vx: 0.05 }));
    const before = { ...state }, instrument = P.dockingInstruments(state);
    expect(state).toEqual(before);
    expect(instrument.title).toBe('Current approach measurements');
    expect(instrument.note).toContain('do not predict');
    expect(instrument.metrics.map(item => item.key)).toEqual(['offset', 'closing', 'drift']);
    const expected = [
      { key: 'offset', value: -0.3, min: -2, max: 2, limit: 0.6, position: 42.5, bandStart: 35, bandEnd: 65, reading: '0.30 m inward' },
      { key: 'closing', value: 0.1, min: -0.4, max: 0.4, limit: 0.2, position: 62.5, bandStart: 50, bandEnd: 75, reading: '0.100 m/s closing' },
      { key: 'drift', value: 0.05, min: -0.3, max: 0.3, limit: 0.1, position: 175 / 3, bandStart: 100 / 3, bandEnd: 200 / 3, reading: '0.050 m/s outward' },
    ];
    for (const target of expected) {
      const actual = instrument.metrics.find(item => item.key === target.key);
      for (const [key, value] of Object.entries(target)) {
        if (typeof value === 'number') expect(actual[key]).toBeCloseTo(value, 10);
        else expect(actual[key]).toBe(value);
      }
      expect(actual.within).toBe(true);
      expect(actual.offScale).toBe(false);
      expect(actual.status).toBe('Within contact limit');
    }
    instrument.metrics[0].value = 999;
    expect(state).toEqual(before);
    expect(metric(state, 'offset').value).toBe(-0.3);
  });

  it('includes both radial boundaries and excludes values just beyond them at full precision', () => {
    for (const [key, field, limit, digits] of [['offset', 'x', 0.6, 2], ['drift', 'vx', 0.1, 3]]) {
      expect(P.docking[key === 'offset' ? 'portTolerance' : 'maxLateral']).toBe(limit);
      for (const sign of [-1, 1]) {
        const at = metric(observed({ [field]: sign * limit }), key);
        const inside = metric(observed({ [field]: sign * (limit - 1e-9) }), key);
        const beyond = metric(observed({ [field]: sign * (limit + 1e-9) }), key);
        expect(at.within).toBe(true);
        expect(inside.within).toBe(true);
        expect(beyond.within).toBe(false);
        expect(beyond.status).toBe('Outside contact limit');
        expect(beyond.reading).toMatch(new RegExp('^> ' + limit.toFixed(digits).replace('.', '\\.') + ' '));
        expect(beyond.reading.endsWith(sign < 0 ? 'inward' : 'outward')).toBe(true);
      }
    }
  });

  it('requires positive closing speed and keeps tiny motion distinct from zero', () => {
    expect(P.docking.maxClosing).toBe(0.2);
    const checks = [[-0.2, false], [-1e-9, false], [0, false], [1e-9, true], [0.2 - 1e-9, true], [0.2, true], [0.2 + 1e-9, false]];
    for (const [vy, within] of checks) {
      const actual = metric(observed({ vy }), 'closing');
      expect(actual.within, String(vy)).toBe(within);
      expect(actual.status).toBe(within ? 'Within contact limit' : 'Outside contact limit');
    }
    expect(metric(observed({ vy: 0.2 + 1e-9 }), 'closing').reading).toBe('> 0.200 m/s closing');
    expect(metric(observed({ vy: 1e-9 }), 'closing').reading).toBe('< 0.001 m/s closing');
    expect(metric(observed({ vy: -1e-9 }), 'closing').reading).toBe('< 0.001 m/s separating');
    expect(metric(observed({ x: 1e-9 }), 'offset').reading).toBe('< 0.01 m outward');
    expect(metric(observed({ vx: -1e-9 }), 'drift').reading).toBe('< 0.001 m/s inward');
    expect(metric(observed({ x: 0 }), 'offset').reading).toBe('0.00 m aligned');
    expect(metric(observed({ vy: 0 }), 'closing').reading).toBe('0.000 m/s no axial motion');
    expect(metric(observed({ vx: 0 }), 'drift').reading).toBe('0.000 m/s no radial motion');
  });

  it('clips only the marker, preserving the full signed measurement and direction', () => {
    for (const [key, field, extent] of [['offset', 'x', 2], ['closing', 'vy', 0.4], ['drift', 'vx', 0.3]]) {
      for (const sign of [-1, 1]) {
        const edge = metric(observed({ [field]: sign * extent }), key);
        const clipped = metric(observed({ [field]: sign * extent * 3 }), key);
        expect(edge.offScale).toBe(false);
        expect(clipped.offScale).toBe(true);
        expect(clipped.position).toBe(sign < 0 ? 0 : 100);
        expect(clipped.value).toBe(sign * extent * 3);
        expect(clipped.within).toBe(false);
      }
    }
  });

  it('labels terminal measurements according to the recorded event without claiming safe docking', () => {
    for (const status of ['docked', 'collision']) {
      const result = P.dockingInstruments(observed({ status }));
      expect(result.title).toBe('Recorded contact measurements');
      expect(result.note).toContain('model assessed contact');
    }
    expect(P.dockingInstruments(observed({ status: 'missed' })).title).toBe('Final approach measurements');
    expect(P.dockingInstruments(observed({ status: 'flying' })).title).toBe('Current approach measurements');
  });

  it('shows unavailable measurements safely without classifying them as in limit', () => {
    for (const value of [undefined, null, NaN, Infinity, -Infinity, '0.1']) {
      const result = P.dockingInstruments({ x: value, vx: value, vy: value });
      for (const actual of result.metrics) {
        expect(actual.within).toBe(false);
        expect(actual.position).toBe(50);
        expect(actual.reading).toBe('Measurement unavailable');
        expect(actual.status).toBe('Measurement unavailable');
        expect(actual.offScale).toBe(false);
      }
    }
  });

  it('reports actual safe, unsafe and missed contacts without changing the physics or receipts', () => {
    const initial = observed({ x: 0, y: -0.001, vx: 0, vy: 0.1 });
    const cases = [
      [initial, 'docked'], [{ ...initial, vy: 0.8 }, 'collision'],
      [{ ...initial, vx: 0.2 }, 'collision'], [{ ...initial, x: 1 }, 'collision'],
      [{ ...initial, x: 5 }, 'missed'],
    ];
    for (const [start, status] of cases) {
      const before = { ...start };
      const end = P.dockingStep(start, 1, {}), snapshot = { ...end };
      const receipt = P.cleanDockingPlayback({ dockingRun: end }).dockingResult;
      const instrument = P.dockingInstruments(end);
      expect(start).toEqual(before);
      expect(end).toEqual(snapshot);
      expect(end.status).toBe(status);
      expect(end.y).toBe(0);
      expect(instrument.metrics.every(item => item.within)).toBe(status === 'docked');
      expect(P.cleanDockingPlayback({ dockingRun: end }).dockingResult).toEqual(receipt);
      expect(P.dockingStep(end, 10, 'guided')).toEqual(snapshot);
    }
  });
});
