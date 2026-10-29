import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { resetStemLab, loadTool, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const physics = require(resolve(process.cwd(), 'stem_lab/stem_tool_magnetism.js'));
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function scan(path = 'axial', strength = 1, noise = 0, distances = [50, 100, 175]) {
  return physics.fieldScanSeries([{ x: 0, y: 0, angle: 0, polarity: 1, strength }], path, distances, 0, noise)
    .map((row, index) => ({ ...row, id: index + 1, strength }));
}

function seed(extra = {}) {
  return {
    tab: 'field', fieldView: 'map', fieldMapProbe: { x: 90, y: 0 },
    fieldMapPath: 'axial', fieldMapStrength: 1, fieldMapNoise: 0,
    fieldMapSamples: scan(), fieldMapReference: [], fieldMapSelected: 0,
    fieldMapCompareSelected: 1, fieldMapGraphScale: 'linear', fieldMapModel: 3,
    ...extra,
  };
}

function mount(extra = {}) {
  resetStemLab();
  const cfg = loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  let latest;
  function Harness() {
    const [toolData, setToolData] = React.useState({ magnetism: seed(extra) });
    latest = toolData.magnetism;
    return cfg.render({
      React, toolData, setToolData, t: (_key, fallback) => fallback,
      addToast: () => {}, announceToSR: () => {}, awardXP: () => {},
      callGemini: null, aiHintsEnabled: false,
    });
  }
  act(() => root.render(React.createElement(Harness)));
  return { host, state: () => latest, close() { act(() => root.unmount()); host.remove(); } };
}

function choose(select, index) {
  act(() => {
    select.value = String(index);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('magnetism two-reading inference', () => {
  it('recovers a provisional inverse-cube slope in either comparison direction', () => {
    const [near, far] = scan();
    const forward = physics.fieldReadingComparison(near, far);
    expect(forward).toMatchObject({ valid: true, controlled: true, distanceRatio: 2, fieldRatio: 0.125 });
    expect(forward.exponent).toBeCloseTo(-3, 10);
    expect(forward.reason).toContain('provisional');
    const reverse = physics.fieldReadingComparison(far, near);
    expect(reverse).toMatchObject({ controlled: true, distanceRatio: 0.5, fieldRatio: 8 });
    expect(reverse.exponent).toBeCloseTo(-3, 10);
  });

  it('withholds causal inference when angle, strength, uncertainty, or distance control fails', () => {
    const [near, far] = scan();
    const otherRay = scan('equatorial')[1];
    for (const [second, message] of [
      [otherRay, 'angle changed'],
      [{ ...far, strength: 2 }, 'strength changed'],
      [{ ...far, noisePercent: 10 }, 'uncertainty changed'],
      [near, 'another distance'],
      [{ ...far, distance: 120 }, 'does not match'],
    ]) {
      const compared = physics.fieldReadingComparison(near, second);
      expect(compared).toMatchObject({ valid: true, controlled: false, exponent: null });
      expect(compared.fieldRatio).toBeGreaterThan(0);
      expect(compared.reason.toLowerCase()).toContain(message);
    }
  });

  it('reports conservative ratio bounds without interpreting them as statistical confidence', () => {
    const [near, far] = scan();
    const result = physics.fieldReadingComparison({ ...near, uncertainty: 1 }, { ...far, uncertainty: 0.5 });
    expect(result.ratioRange.min).toBeCloseTo(1.5 / 17, 10);
    expect(result.ratioRange.max).toBeCloseTo(2.5 / 15, 10);
    expect(result.rangeReason).toContain('not a confidence interval');
    const zeroDenominator = physics.fieldReadingComparison({ ...near, uncertainty: 16 }, far);
    expect(zeroDenominator.ratioRange).toBeNull();
    expect(zeroDenominator.rangeReason).toContain('reach zero');
    expect(physics.fieldReadingComparison(near, null)).toMatchObject({ valid: false, exponent: null, fieldRatio: null });
    expect(physics.fieldReadingComparison(near, { ...far, measuredMagnitude: Infinity }).valid).toBe(false);
  });
});

describe('magnetism recorded-point comparison UI', () => {
  it('selects A and B across both scans without moving the live probe or rewriting evidence', () => {
    const original = scan();
    const reference = scan('axial', 2);
    const live = mount({ fieldMapSamples: original, fieldMapReference: reference });
    try {
      const panel = () => live.host.querySelector('[data-field-reading-comparison]');
      expect(panel().textContent).toContain('Distance ratio rB / rA2.00×');
      expect(panel().textContent).toContain('Field ratio |B|B / |B|A0.125×');
      expect(panel().textContent).toContain('Two-point exponent-3.00');
      expect(panel().textContent).toContain('provisional');
      choose(live.host.querySelector('#mag-field-reading-select'), 3);
      choose(live.host.querySelector('#mag-field-comparison-reading-select'), 1);
      expect(panel().textContent).toContain('A: Reference 1 → B: Current 2');
      expect(panel().getAttribute('data-controlled')).toBe('false');
      expect(panel().textContent).toContain('Magnet strength changed');
      expect(panel().textContent).not.toContain('Two-point exponent');
      expect(live.state().fieldMapProbe).toEqual({ x: 90, y: 0 });
      expect(live.state().fieldMapSamples).toEqual(original);
      expect(live.state().fieldMapReference).toEqual(reference);
      const marker = live.host.querySelector('[data-field-recorded-marker="A"]');
      expect(marker.getAttribute('data-run')).toBe('Reference');
      expect(marker.getAttribute('data-point')).toBe('1');
      expect(live.host.querySelector('[data-field-live-probe]').getAttribute('data-x')).toBe('90');
    } finally { live.close(); }
  });

  it('contains the far equatorial recorded point and uses the expanded world coordinates for clicks', () => {
    const live = mount({ fieldMapPath: 'equatorial', fieldMapSamples: scan('equatorial'), fieldMapCompareSelected: 2 });
    try {
      const map = live.host.querySelector('[data-field-map]');
      const marker = live.host.querySelector('[data-field-recorded-marker="B"]');
      expect(Number(map.getAttribute('data-map-radius-y'))).toBeGreaterThan(175);
      expect(marker.getAttribute('data-y')).toBe('-175');
      const firstPoint = marker.querySelector('path').getAttribute('d').match(/^M([^,]+),([^L]+)/);
      expect(Number(firstPoint[2])).toBeGreaterThanOrEqual(34);
      expect(Number(firstPoint[2]) + 30).toBeLessThanOrEqual(266);
      map.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, width: 400, height: 304, right: 400, bottom: 304 });
      const radiusY = Number(map.getAttribute('data-map-radius-y'));
      const screenY = 92;
      const expectedY = ((screenY - 34) / 232 * 2 - 1) * radiusY;
      act(() => map.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 199, clientY: screenY })));
      expect(live.state().fieldMapProbe.x).toBeCloseTo(0, 8);
      expect(live.state().fieldMapProbe.y).toBeCloseTo(expectedY, 8);
      expect(live.state().fieldMapSamples[2].y).toBe(-175);
    } finally { live.close(); }
  });

  it('labels both selectors and keeps a one-reading observation free of an invented exponent', () => {
    resetStemLab();
    loadTool('stem_lab/stem_tool_magnetism.js', 'magnetism');
    const host = document.createElement('div');
    host.innerHTML = renderTool('magnetism', { magnetism: seed({ fieldMapSamples: scan().slice(0, 1) }) });
    const comparison = host.querySelector('[data-field-reading-comparison]');
    expect(host.querySelector('label[for="mag-field-reading-select"]').textContent).toBe('Inspect recorded measurement');
    expect(host.querySelector('label[for="mag-field-comparison-reading-select"]').textContent).toBe('Compare with reading B');
    expect(comparison.textContent).toContain('Repeated readings at one position');
    expect(comparison.textContent).not.toContain('Two-point exponent');
  });
});
