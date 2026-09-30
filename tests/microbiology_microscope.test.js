import fs from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const require = createRequire(import.meta.url);
const { act, Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
const source = fs.readFileSync('stem_lab/stem_tool_microbiology.js', 'utf8');
const start = source.indexOf('  var MicroMeasurements =');
const end = source.indexOf('  // Plugin registration', start);
const VirtualMicroscope = new Function('R', 'hh', 'microInkFor', '__alloMBT', source.slice(start, end) + '\nreturn VirtualMicroscope;')(
  React, React.createElement, value => value, (_key, fallback) => fallback
);
const measurementsCore = window.__MicrobiologyCore.measurements;
let root;
let container;
let latestState;
let updateState;
const previousActSetting = globalThis.IS_REACT_ACT_ENVIRONMENT;

afterEach(() => {
  if (root) act(() => root.unmount());
  root = null;
  container?.remove();
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActSetting;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function mount(seed = {}, awardXP = vi.fn()) {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = ReactDOMClient.createRoot(container);
  function Host() {
    const [state, setState] = React.useState({ selectedScope: 'lightbright', scopeOrganism: 'ecoli', magnification: 1000, microscopeFocus: 10, microscopeTargetFocus: 50, ...seed });
    latestState = state;
    updateState = patch => setState(prev => ({ ...prev, ...patch }));
    return React.createElement(VirtualMicroscope, { d: state, upd: updateState, awardXP, isDark: true });
  }
  act(() => root.render(React.createElement(Host)));
  return awardXP;
}
function button(name) {
  const match = [...container.querySelectorAll('button')].find(node => node.textContent.trim() === name);
  expect(match, name).toBeTruthy();
  return match;
}
function click(name) { act(() => button(name).click()); }
function text() { return container.textContent; }

function enterEstimate(value) {
  const input = container.querySelector('input[type="number"]');
  expect(input).toBeTruthy();
  act(() => Simulate.change(input, { target: { value: String(value) } }));
}
function estimateUnits(unit) {
  const select = [...container.querySelectorAll('select')].find(node => node.querySelector('option[value="nm"]'));
  expect(select).toBeTruthy();
  act(() => Simulate.change(select, { target: { value: unit } }));
}
function chooseSlide(name) {
  const group = container.querySelector('[aria-label="Organism slides"]');
  const slide = [...group.querySelectorAll('button')].find(node => node.textContent.includes(name));
  expect(slide).toBeTruthy();
  act(() => slide.click());
}
function zoomTo(value) {
  const select = container.querySelector('select');
  act(() => Simulate.change(select, { target: { value: String(value) } }));
}

function savedMeasurementContext(id, method, mag, zoom) {
  const referenceUm = { ecoli: 2, strep: 1, parame: 250, plasmo: 7.5, phage: 0.2 }[id];
  const fieldUm = (method === 'em' ? 40000 : 180000) / mag / zoom;
  const raw = fieldUm / 4, power = 10 ** Math.floor(Math.log(raw) / Math.LN10), factor = raw / power;
  const scaleUm = (factor >= 5 ? 5 : factor >= 2 ? 2 : 1) * power;
  return { version: 1, specimen: id, method, mag, zoom, fieldUm, scaleUm, referenceUm };
}

function parseMeasurementCSV(csv) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const character = csv[i];
    if (character === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++; } else quoted = !quoted;
    } else if (!quoted && character === ',') { row.push(field); field = ''; }
    else if (!quoted && (character === '\r' || character === '\n')) {
      if (character === '\r' && csv[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += character;
  }
  row.push(field); rows.push(row);
  const headers = rows.shift();
  return { headers, rows: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]]))) };
}

describe('Calibrated virtual microscope', () => {
  it('keeps light microscopy resolution separate from large saved magnification and display zoom', () => {
    const awardXP = mount({ scopeOrganism: 'phage', magnification: 100000, microscopeZoom: 50, microscopeFocus: 50 });
    expect(text()).toContain('Head and tail cannot be resolved with conventional light microscopy');
    expect(button('1,000×').getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('svg').textContent).toContain('Detail unavailable');
    expect(awardXP).not.toHaveBeenCalled();
    expect(latestState.microscopeSeenSlides).toBeUndefined();
    click('Use recommended setup');
    expect(latestState).toMatchObject({ selectedScope: 'em', magnification: 100000, microscopeZoom: 1 });
    expect(text()).toContain('A head, tail, and tail fibers');
    expect(container.querySelector('svg polygon')).not.toBeNull();
    expect(latestState.microscopeSeenSlides).toEqual(['phage']);
    expect(awardXP).toHaveBeenCalledTimes(1);
  });

  it('guides focus in both directions, provides assistance, and records an observed slide once', () => {
    const awardXP = mount();
    expect(text()).toContain('Increase the focus dial');
    expect(text()).toContain('Focus before describing');
    expect(latestState.microscopeSeenSlides).toBeUndefined();
    act(() => updateState({ microscopeFocus: 90 }));
    expect(text()).toContain('Decrease the focus dial');
    click('Focus assist');
    expect(latestState.microscopeFocus).toBe(50);
    expect(text()).toContain('A short rod-shaped cell');
    expect(latestState.microscopeSeenSlides).toEqual(['ecoli']);
    expect(button('Focus assist').disabled).toBe(true);
    act(() => updateState({ microscopeFocus: 10 }));
    click('Focus assist');
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(awardXP).toHaveBeenCalledWith(1);
    expect(container.querySelector('input[type="range"]').getAttribute('aria-valuetext')).toContain('Focused');
  });

  it('preserves observed-slide progress after remount and sanitizes unknown or duplicate IDs', () => {
    const awardXP = mount({ microscopeFocus: 50, microscopeSeenSlides: ['ecoli', 'ecoli', 'unknown', 'parame'] });
    expect(text()).toContain('Slides observed: 2/5');
    expect(awardXP).not.toHaveBeenCalled();
    const saved = { ...latestState };
    act(() => root.unmount());
    root = null;
    container.remove();
    mount(saved, awardXP);
    expect(text()).toContain('Slides observed: 2/5');
    expect(awardXP).not.toHaveBeenCalled();
  });

  it('calibrates the rendered rod and scale bar at multiple display zooms', () => {
    mount({ microscopeFocus: 50, microscopeZoom: 20 });
    const rodWidth = () => Number(container.querySelector('svg g rect').getAttribute('width'));
    const scaleWidth = () => {
      const d = [...container.querySelectorAll('svg > path')].at(-1).getAttribute('d');
      const numbers = d.match(/[\d.]+/g).map(Number);
      return numbers[2] - numbers[0];
    };
    expect(text()).toContain('Model field width: 9 µm');
    expect([...container.querySelectorAll('svg text')].at(-1).textContent).toBe('2 µm');
    expect(rodWidth() / scaleWidth()).toBeCloseTo(1, 8); // 2 µm rod / 2 µm bar
    const originalWidth = rodWidth();
    const zoom = container.querySelector('select');
    act(() => { zoom.value = '4'; zoom.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(latestState.microscopeZoom).toBe(4);
    expect(text()).toContain('Model field width: 45 µm');
    expect(rodWidth()).toBeCloseTo(originalWidth / 5, 8);
    expect(rodWidth() / scaleWidth()).toBeCloseTo(0.2, 8); // 2 µm rod / 10 µm bar
  });

  it('mounts a new slide atomically, resets focus, and gives honest host-cell measurements', () => {
    mount({ microscopeFocus: 50 });
    act(() => [...container.querySelectorAll('button')].find(node => node.textContent.includes('Plasmodium')).click());
    expect(latestState).toMatchObject({ scopeOrganism: 'plasmo', microscopeFocus: 10, microscopeTargetFocus: 36, microscopeZoom: 4 });
    click('Focus assist');
    expect(text()).toContain('The size reference measures the host cell');
    expect(text()).toContain('7.5 µm (host red blood cell diameter)');
    expect(latestState.microscopeSeenSlides).toEqual(['ecoli', 'plasmo']);
  });

  it('keeps invalid restored settings finite and reports cropping instead of silently shrinking the specimen', () => {
    mount({ scopeOrganism: 'parame', magnification: Infinity, microscopeFocus: NaN, microscopeTargetFocus: Infinity, microscopeZoom: 999 });
    expect(container.querySelector('input').value).toBe('10');
    expect(container.querySelector('svg').outerHTML).not.toMatch(/NaN|Infinity/);
    act(() => updateState({ magnification: 1000, microscopeZoom: 50, microscopeFocus: 62, microscopeTargetFocus: 62 }));
    expect(text()).toContain('The specimen extends beyond this field');
    expect(container.querySelector('svg').outerHTML).not.toMatch(/NaN|Infinity/);
  });
  it('keeps method references independent and replaces the legacy fake visibility slider with actual sizes', () => {
    const begin = source.indexOf('      function renderMicroscope() {');
    const finish = source.indexOf('        function diagnosticTechniquesSection()', begin);
    const makeRenderer = new Function('d', 'h', 'SCOPES', '__alloT', 'sectionCard', 'EMERALD', 'microAccentText', 'VirtualMicroscope', 'awardXP', 'upd', 'microbiologyDark', 'diagnosticTechniquesSection', source.slice(begin, finish) + '\n} return renderMicroscope;');
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = ReactDOMClient.createRoot(container);
    function ReferenceHost() {
      const [state, setState] = React.useState({ selectedScope: 'lightbright', magnification: 1000 });
      latestState = state;
      const scopes = [
        { id: 'lightbright', name: 'Light reference', what: 'Light method', limit: 'Light limit' },
        { id: 'afm', name: 'AFM reference', what: 'Atomic force method', limit: 'AFM limit' }
      ];
      const render = makeRenderer(state, React.createElement, scopes, (_key, fallback) => fallback,
        (title, body) => React.createElement('section', null, React.createElement('h3', null, title), body),
        '#10b981', color => color, () => null, () => {}, patch => setState(prev => ({ ...prev, ...patch })), true, () => null);
      return render();
    }
    act(() => root.render(React.createElement(ReferenceHost)));
    expect(container.querySelector('input[type="range"]')).toBeNull();
    expect(text()).toContain('1 µm = 1,000 nm');
    expect(text()).toContain('7.5 µm = 7,500 nm');
    click('AFM reference');
    expect(latestState).toEqual({ selectedScope: 'lightbright', magnification: 1000, microscopeReference: 'afm' });
    expect(text()).toContain('Atomic force method');
  });

});

describe('Microscope measurement practice', () => {
  it.each([
    { name: 'light-mode phage', id: 'phage', method: 'lightbright', mag: 1000, zoom: 50 },
    { name: 'low-resolution bacterium enlarged by display zoom', id: 'ecoli', method: 'lightbright', mag: 100, zoom: 50 },
    { name: 'feature too small for comparison', id: 'ecoli', method: 'lightbright', mag: 1000, zoom: 1 },
    { name: 'cropped chain of cocci', id: 'strep', method: 'lightbright', mag: 1000, zoom: 50 },
    { name: 'cropped paramecium', id: 'parame', method: 'lightbright', mag: 1000, zoom: 1 },
    { name: 'cropped electron-view phage', id: 'phage', method: 'em', mag: 100000, zoom: 4 }
  ])('rejects a restored checked result for $name while retaining its valid draft', specimen => {
    const context = savedMeasurementContext(specimen.id, specimen.method, specimen.mag, specimen.zoom);
    const draft = { value: String(context.referenceUm), unit: 'um', context };
    const result = { value: context.referenceUm, unit: 'um', context };
    const raw = { [specimen.id]: { draft, result } }, before = JSON.stringify(raw);
    const normalized = window.__MicrobiologyCore.measurements.normalize(raw);
    expect(normalized).toEqual({ [specimen.id]: { draft } });
    expect(normalized[specimen.id].draft.context).not.toBe(context);
    expect(window.__MicrobiologyCore.measurements.normalize({ [specimen.id]: { result } })).toEqual({});
    expect(JSON.stringify(raw)).toBe(before);
    mount({ scopeOrganism: specimen.id, selectedScope: specimen.method, magnification: specimen.mag, microscopeZoom: specimen.zoom, microscopeFocus: 50, microscopeMeasurements: raw });
    expect(container.querySelector('input[type="number"]').value).toBe(draft.value);
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(text()).not.toContain('Last saved result');
    expect(text()).toContain('Measurement notebook · 0/5');
    expect(button('Download measurement notebook').disabled).toBe(true);
  });

  it('keeps a measurable saved result when a newer draft belongs to an unmeasurable view', () => {
    const result = { value: 2, unit: 'um', context: savedMeasurementContext('ecoli', 'lightbright', 1000, 20) };
    const draft = { value: '3', unit: 'um', context: savedMeasurementContext('ecoli', 'lightbright', 1000, 1) };
    const raw = { ecoli: { result, draft } };
    expect(window.__MicrobiologyCore.measurements.normalize(raw)).toEqual(raw);
    mount({ microscopeFocus: 50, microscopeZoom: 1, microscopeMeasurements: raw });
    expect(container.querySelector('input[type="number"]').value).toBe('3');
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(text()).toContain('Last saved result · E. coli: within the practice band');
    expect(text()).toContain('Measurement notebook · 1/5');
    expect(latestState.microscopeMeasurements.ecoli).toEqual({ result, draft });
  });

  it.each([
    { id: 'strep', mag: 1000, zoom: 20, expected: 1, type: 'circle' },
    { id: 'parame', mag: 400, zoom: 1, expected: 250, type: 'ellipse' },
    { id: 'plasmo', mag: 1000, zoom: 4, expected: 7.5, type: 'circle' },
    { id: 'phage', mag: 100000, zoom: 1, expected: 0.2, type: 'phage' }
  ])('measures the actual drawn feature against the scale for $id', specimen => {
    mount({ scopeOrganism: specimen.id, selectedScope: specimen.id === 'phage' ? 'em' : 'lightbright', magnification: specimen.mag, microscopeZoom: specimen.zoom, microscopeFocus: 50 });
    let featureLength;
    if (specimen.type === 'circle') featureLength = Number(container.querySelector('svg g circle').getAttribute('r')) * 2;
    if (specimen.type === 'ellipse') featureLength = Number(container.querySelector('svg g ellipse').getAttribute('rx')) * 2;
    if (specimen.type === 'phage') {
      const headY = container.querySelector('svg polygon').getAttribute('points').split(' ').map(pair => Number(pair.split(',')[1]));
      const tailY = [...container.querySelectorAll('svg g g path')].flatMap(path => path.getAttribute('d').match(/-?[\d.]+/g).map(Number).filter((_value, index) => index % 2 === 1));
      featureLength = Math.max(...tailY) - Math.min(...headY);
    }
    enterEstimate(specimen.expected);
    click('Check and save estimate');
    const context = latestState.microscopeMeasurements[specimen.id].result.context;
    const bar = [...container.querySelectorAll('svg > path')].at(-1).getAttribute('d').match(/[\d.]+/g).map(Number);
    const barLength = bar[2] - bar[0];
    expect(featureLength / barLength * context.scaleUm).toBeCloseTo(specimen.expected, 8);
  });

  it('converts nanometers, compares one coccus, and stores the original calibration', () => {
    mount({ scopeOrganism: 'strep', microscopeFocus: 50, microscopeZoom: 20 });
    expect(text()).toContain('Diameter of one spherical cell, not the chain');
    enterEstimate(1000);
    estimateUnits('nm');
    click('Check and save estimate');
    const result = latestState.microscopeMeasurements.strep.result;
    expect(result).toMatchObject({ value: 1000, unit: 'nm', context: { version: 1, specimen: 'strep', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 1 } });
    expect(text()).toContain('Last saved result · Streptococcus: within the practice band');
    expect(text()).toContain('Difference: 0%');
    expect(text()).toContain('0.5 × 2 µm = 1 µm');
    expect(text()).toContain('Measurement notebook · 1/5');
  });

  it('uses an inclusive 20 percent practice band and clearly describes the band as model feedback', () => {
    mount({ scopeOrganism: 'strep', microscopeFocus: 50 });
    enterEstimate(0.8);
    click('Check and save estimate');
    expect(text()).toContain('Last saved result · Streptococcus: within the practice band');
    expect(text()).toContain('Difference: 20%');
    expect(text()).toContain('does not describe uncertainty in a real laboratory measurement');
    enterEstimate(1.21);
    click('Check and save estimate');
    expect(text()).toContain('Last saved result · Streptococcus: recheck the scale-bar comparison');
    expect(text()).toContain('Difference: 21%');
    expect(latestState.microscopeMeasurements.strep.result.value).toBe(1.21);
  });

  it('blocks a draft after magnification changes until the learner starts a fresh estimate', () => {
    mount({ microscopeFocus: 50, microscopeZoom: 20 });
    enterEstimate(2);
    click('400×');
    expect(text()).toContain('The view changed after this estimate was started');
    expect(button('Check and save estimate').disabled).toBe(true);
    estimateUnits('nm');
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(latestState.microscopeMeasurements.ecoli.draft.context.mag).toBe(1000);
    click('Start estimate for this view');
    expect(container.querySelector('input[type="number"]').value).toBe('');
    enterEstimate(2000);
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.result).toMatchObject({ value: 2000, unit: 'nm', context: { mag: 400, scaleUm: 5, fieldUm: 22.5 } });
    expect(text()).toContain('Difference: 0%');
  });

  it('retains the saved result context when zoom or unsaved input units change', () => {
    mount({ microscopeFocus: 50, microscopeZoom: 20 });
    enterEstimate(2);
    click('Check and save estimate');
    const original = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli.result));
    estimateUnits('nm');
    expect(latestState.microscopeMeasurements.ecoli.result).toEqual(original);
    zoomTo(4);
    expect(text()).toContain('This saved result belongs to the earlier view');
    expect(text()).toContain('Saved view: Light microscope · 1,000× · display zoom 20× · Scale bar 2 µm');
    expect(latestState.microscopeMeasurements.ecoli.result).toEqual(original);
    expect(button('Check and save estimate').disabled).toBe(true);
  });

  it('keeps drafts and saved results with their specimens across slide swaps and remounts', () => {
    const awards = mount({ microscopeFocus: 50 });
    enterEstimate(2);
    click('Check and save estimate');
    chooseSlide('Plasmodium');
    expect(container.querySelector('input[type="number"]').value).toBe('');
    expect(text()).not.toContain('Last saved result · Plasmodium');
    click('Focus assist');
    enterEstimate(7.5);
    click('Check and save estimate');
    expect(text()).toContain('Diameter of the host red blood cell, not the parasite ring');
    expect(latestState.microscopeMeasurements.plasmo.result.context.referenceUm).toBe(7.5);
    expect(Object.keys(latestState.microscopeMeasurements).sort()).toEqual(['ecoli', 'plasmo']);
    chooseSlide('E. coli');
    expect(container.querySelector('input[type="number"]').value).toBe('2');
    expect(text()).toContain('Last saved result · E. coli: within the practice band');
    expect(text()).toContain('Measurement notebook · 2/5');
    const saved = { ...latestState };
    const awardCount = awards.mock.calls.length;
    act(() => root.unmount());
    root = null;
    container.remove();
    mount(saved, awards);
    expect(text()).toContain('Measurement notebook · 2/5');
    expect(latestState.microscopeMeasurements.ecoli.result.value).toBe(2);
    expect(awards).toHaveBeenCalledTimes(awardCount);
  });

  it('requires resolvable, focused, uncropped, sufficiently enlarged features for measurement', () => {
    mount({ microscopeZoom: 1 });
    enterEstimate(2);
    expect(button('Check and save estimate').disabled).toBe(true);
    click('Focus assist');
    expect(text()).toContain('Increase display zoom');
    expect(button('Check and save estimate').disabled).toBe(true);
    zoomTo(20);
    click('Start estimate for this view');
    enterEstimate(2);
    expect(button('Check and save estimate').disabled).toBe(false);
    chooseSlide('Paramecium');
    click('Focus assist');
    enterEstimate(250);
    expect(text()).toContain('Reduce magnification or display zoom until the whole feature fits');
    expect(button('Check and save estimate').disabled).toBe(true);
    chooseSlide('T4 bacteriophage');
    click('Focus assist');
    enterEstimate(200);
    estimateUnits('nm');
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(latestState.microscopeMeasurements.phage.result).toBeUndefined();
    click('Use recommended setup');
    click('Start estimate for this view');
    enterEstimate(200);
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.phage.result.context).toMatchObject({ method: 'em', referenceUm: 0.2, scaleUm: 0.1 });
    expect(text()).toContain('2 × 100 nm = 200 nm');
  });

  it('rejects blank, nonpositive, and nonfinite-sized estimates without erasing the last valid result', () => {
    mount({ microscopeFocus: 50 });
    expect(button('Check and save estimate').disabled).toBe(true);
    for (const value of ['0', '-2', '1e300']) {
      enterEstimate(value);
      expect(button('Check and save estimate').disabled).toBe(true);
      expect(container.querySelector('input[type="number"]').getAttribute('aria-invalid')).toBe('true');
      expect(latestState.microscopeMeasurements.ecoli.result).toBeUndefined();
    }
    enterEstimate(2);
    click('Check and save estimate');
    enterEstimate('');
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(latestState.microscopeMeasurements.ecoli.result.value).toBe(2);
  });

  it('discards restored measurements with wrong specimen or calibration and keeps reference answers in a closed disclosure', () => {
    const badContext = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 900, scaleUm: 2, referenceUm: 2 };
    mount({ microscopeFocus: 50, microscopeMeasurements: { ecoli: { result: { value: 2, unit: 'um', context: badContext } }, strep: { result: { value: 2, unit: 'um', context: { ...badContext, fieldUm: 9 } } }, unknown: { result: { value: 2 } } } });
    expect(text()).not.toContain('Last saved result');
    expect(text()).toContain('Measurement notebook · 0/5');
    const disclosure = [...container.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Reveal reference size and calibration');
    expect(disclosure).toBeTruthy();
    expect(disclosure.open).toBe(false);
    expect(disclosure.textContent).toContain('Reference size: 2 µm');
    expect([...container.querySelectorAll('h4')].map(node => node.textContent).join(' ')).not.toContain('2 µm');
    enterEstimate(2);
    click('Check and save estimate');
    expect(Object.keys(latestState.microscopeMeasurements)).toEqual(['ecoli']);
  });
});

function captureNotebookDownload() {
  const contents = [];
  const links = [];
  const NativeBlob = globalThis.Blob;
  const NativeURL = globalThis.URL;
  class CapturedBlob extends NativeBlob {
    constructor(parts, options) {
      super(parts, options);
      contents.push(parts.join(''));
    }
  }
  class CapturedURL extends NativeURL {}
  // Own descriptors also work with read-only methods inherited from a shared worker.
  Object.defineProperties(CapturedURL, {
    createObjectURL: { configurable: true, writable: true, value: vi.fn(() => 'blob:micro-notebook-test') },
    revokeObjectURL: { configurable: true, writable: true, value: vi.fn() }
  });
  vi.stubGlobal('Blob', CapturedBlob);
  vi.stubGlobal('URL', CapturedURL);
  const linkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
    links.push({ filename: this.download, href: this.href });
  });
  return { contents, links, linkClick, createUrl: CapturedURL.createObjectURL, revokeUrl: CapturedURL.revokeObjectURL };
}

describe('Microscope notebook review and export', () => {
  it('isolates download mocks from inherited read-only URL methods and restores the original global', () => {
    mount({ microscopeFocus: 50 });
    enterEstimate(2); click('Check and save estimate');
    const OriginalURL = globalThis.URL;
    const originalDescriptors = ['createObjectURL', 'revokeObjectURL'].map(key =>
      [key, Object.getOwnPropertyDescriptor(OriginalURL, key)]);
    const inheritedCreate = vi.fn(), inheritedRevoke = vi.fn();
    class ReadOnlyURL extends OriginalURL {}
    Object.defineProperties(ReadOnlyURL, {
      createObjectURL: { configurable: true, writable: false, value: inheritedCreate },
      revokeObjectURL: { configurable: true, writable: false, value: inheritedRevoke }
    });
    vi.stubGlobal('URL', ReadOnlyURL);
    const download = captureNotebookDownload();
    vi.useFakeTimers();
    click('Download measurement notebook');
    act(() => vi.advanceTimersByTime(1000));
    expect(download.links).toEqual([{ filename: 'micro-lab-microscope-notebook.txt', href: 'blob:micro-notebook-test' }]);
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:micro-notebook-test');
    expect(inheritedCreate).not.toHaveBeenCalled();
    expect(inheritedRevoke).not.toHaveBeenCalled();
    expect(Object.getOwnPropertyDescriptor(ReadOnlyURL, 'revokeObjectURL').writable).toBe(false);
    for (const [key, descriptor] of originalDescriptors) {
      expect(Object.getOwnPropertyDescriptor(OriginalURL, key)).toEqual(descriptor);
    }
    vi.unstubAllGlobals();
    expect(globalThis.URL).toBe(OriginalURL);
  });

  it('shows notebook progress before the first result and provides accessible shortcuts', () => {
    mount();
    expect(text()).toContain('Measurement notebook · 0/5');
    expect(button('Download measurement notebook').disabled).toBe(true);
    click('Open measurement notebook · 0/5');
    const notebook = [...container.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Measurement notebook · 0/5');
    expect(notebook.open).toBe(true);
    expect(document.activeElement).toBe(notebook.querySelector('summary'));
    expect(notebook.querySelectorAll('li')).toHaveLength(5);
    expect(notebook.textContent.match(/No checked estimate yet./g)).toHaveLength(5);
    click('Go to size estimate');
    expect(document.activeElement).toBe(container.querySelector('input[type="number"]'));
    click('Prepare slide · T4 bacteriophage');
    expect(latestState).toMatchObject({ scopeOrganism: 'phage', selectedScope: 'em', magnification: 100000, microscopeZoom: 1, microscopeFocus: 10, microscopeTargetFocus: 56 });
    expect(text()).toContain('recommended view prepared. Focus the specimen');
    expect(button('Check and save estimate').disabled).toBe(true);
  });

  it('restores the exact saved view with focus assist while preserving unfinished input and checked evidence', () => {
    mount({ magnification: 400, microscopeZoom: 50, microscopeFocus: 50 });
    enterEstimate(2);
    click('Check and save estimate');
    enterEstimate(3);
    estimateUnits('nm');
    const originalEntry = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli));
    click('Prepare slide · T4 bacteriophage');
    expect(latestState.selectedScope).toBe('em');
    click('Review saved view · E. coli');
    expect(latestState).toMatchObject({ scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 400, microscopeZoom: 50, microscopeFocus: 50, microscopeTargetFocus: 50 });
    expect(latestState.microscopeMeasurements.ecoli).toEqual(originalEntry);
    expect(container.querySelector('input[type="number"]').value).toBe('3');
    expect(container.querySelector('select[aria-label="Estimate units"]').value).toBe('nm');
    expect(button('Focus assist').disabled).toBe(true);
    expect(document.activeElement).toBe(container.querySelector('input[type="number"]'));
    expect(text()).toContain('saved viewing settings restored with focus assist');
    expect(text()).toContain('Your working estimate and checked result were kept');
  });

  it('explains high and low estimates and offers conditional unit guidance without changing the entry', () => {
    mount({ microscopeFocus: 50 });
    enterEstimate(2000);
    click('Check and save estimate');
    expect(text()).toContain('above the drawing reference');
    expect(text()).toContain('A unit mix-up may explain this difference');
    expect(latestState.microscopeMeasurements.ecoli.result).toMatchObject({ value: 2000, unit: 'um' });
    expect(container.querySelector('input[type="number"]').value).toBe('2000');
    expect(container.querySelector('select[aria-label="Estimate units"]').value).toBe('um');
    enterEstimate(1);
    click('Check and save estimate');
    expect(text()).toContain('below the drawing reference');
    expect(text()).not.toContain('A unit mix-up may explain this difference');
    enterEstimate(2);
    click('Check and save estimate');
    expect(text()).toContain('matches the drawing reference');
  });

  it('exports all five checked specimens with original units, exact features and saved calibration', () => {
    mount({ microscopeFocus: 50 });
    enterEstimate(2);
    click('Check and save estimate');
    for (const specimen of [
      { name: 'Streptococcus', value: 1000, unit: 'nm' },
      { name: 'Paramecium', value: 250, unit: 'um' },
      { name: 'Plasmodium', value: 7.5, unit: 'um' },
      { name: 'T4 bacteriophage', value: 200, unit: 'nm' }
    ]) {
      click('Prepare slide · ' + specimen.name);
      click('Focus assist');
      enterEstimate(specimen.value);
      estimateUnits(specimen.unit);
      click('Check and save estimate');
    }
    expect(text()).toContain('Measurement notebook · 5/5');
    enterEstimate(999); // unfinished replacement must not enter the evidence report
    zoomTo(4); // the current view must not replace saved calibration in the export
    const saved = JSON.parse(JSON.stringify(latestState.microscopeMeasurements));
    const download = captureNotebookDownload();
    vi.useFakeTimers();
    click('Download measurement notebook');
    expect(download.links).toEqual([{ filename: 'micro-lab-microscope-notebook.txt', href: 'blob:micro-notebook-test' }]);
    const report = download.contents[0];
    expect(report).toContain('Slides with a checked estimate: 5/5');
    for (const name of ['E. coli', 'Streptococcus', 'Paramecium', 'Plasmodium', 'T4 bacteriophage']) expect(report).toContain(name);
    expect(report).toContain('Diameter of one spherical cell, not the chain');
    expect(report).toContain('Diameter of the host red blood cell, not the parasite ring');
    expect(report).toContain('Your estimate: 200 nm');
    expect(report).toContain('Estimate converted to micrometers: 0.2 µm');
    expect(report).toContain('Electron view · 100,000× · display zoom 1× · Scale bar 100 nm');
    expect(report).toContain('Model field width: 400 nm');
    expect(report).toContain('Scale-bar comparison: 2 × 100 nm = 200 nm');
    expect(report).toContain('these are not measurements of biological samples or diagnostic results');
    expect(report).toContain('does not describe uncertainty in a real laboratory measurement');
    expect(report).not.toContain('999');
    expect(report).not.toContain('No checked estimate yet');
    expect(latestState.microscopeMeasurements).toEqual(saved);
    expect(document.querySelector('a[download="micro-lab-microscope-notebook.txt"]')).toBeNull();
    expect(download.revokeUrl).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:micro-notebook-test');
  });

  it('marks unfinished slides honestly in a partial report and handles download failure without losing evidence', () => {
    mount({ microscopeFocus: 50 });
    enterEstimate(2);
    click('Check and save estimate');
    const download = captureNotebookDownload();
    vi.useFakeTimers();
    click('Download measurement notebook');
    expect(download.contents[0]).toContain('Slides with a checked estimate: 1/5');
    expect(download.contents[0].match(/No checked estimate yet./g)).toHaveLength(4);
    act(() => vi.advanceTimersByTime(1000));
    const saved = JSON.parse(JSON.stringify(latestState.microscopeMeasurements));
    download.linkClick.mockImplementationOnce(() => { throw new Error('download unavailable'); });
    click('Download measurement notebook');
    expect(text()).toContain('The notebook download could not start');
    expect(latestState.microscopeMeasurements).toEqual(saved);
    expect(document.querySelector('a[download="micro-lab-microscope-notebook.txt"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });
});

describe('Microscope measurement CSV evidence', () => {
  const ecoliContext = () => savedMeasurementContext('ecoli', 'lightbright', 1000, 20);
  const checked = (value, unit = 'um', context = ecoliContext()) => ({ value, unit, context });
  const historyEntry = () => ({
    result: checked(2.1234567890123),
    previousResult: checked(1000, 'nm', savedMeasurementContext('ecoli', 'em', 10000, 1)),
    draft: { value: '3000', unit: 'nm', context: savedMeasurementContext('ecoli', 'lightbright', 400, 50) }
  });

  it('exports all five features and checked versions with exact units and their own saved calibration', () => {
    const raw = {
      ecoli: historyEntry(),
      strep: { result: checked(1000, 'nm', savedMeasurementContext('strep', 'lightbright', 1000, 20)) },
      parame: { result: checked(250, 'um', savedMeasurementContext('parame', 'lightbright', 400, 1)) },
      plasmo: { result: checked(7.5, 'um', savedMeasurementContext('plasmo', 'lightbright', 1000, 4)) },
      phage: { result: checked(200, 'nm', savedMeasurementContext('phage', 'em', 100000, 1)) }
    };
    const before = JSON.stringify(raw), rows = measurementsCore.exportRows(raw);
    expect(rows.map(row => [row.specimen_id, row.record_kind])).toEqual([
      ['ecoli', 'current_checked'], ['ecoli', 'previous_checked'], ['ecoli', 'pending_draft'],
      ['strep', 'current_checked'], ['parame', 'current_checked'], ['plasmo', 'current_checked'], ['phage', 'current_checked']
    ]);
    expect(rows[0]).toMatchObject({ original_value_text: '2.1234567890123', original_unit: 'um', estimate_um: 2.1234567890123,
      viewing_method: 'lightbright', magnification_x: 1000, display_zoom_x: 20, field_width_um: 9, scale_bar_um: 2, reference_um: 2, within_practice_band: true });
    expect(rows[0].absolute_error_pct).toBeCloseTo(6.172839450615, 9);
    expect(rows[1]).toMatchObject({ original_value_text: '1000', original_unit: 'nm', estimate_um: 1,
      viewing_method: 'em', magnification_x: 10000, display_zoom_x: 1, field_width_um: 4, scale_bar_um: 1, reference_um: 2, absolute_error_pct: 50, within_practice_band: false });
    expect(rows[2]).toMatchObject({ original_value_text: '3000', estimate_um: 3, magnification_x: 400, display_zoom_x: 50, reference_um: null, absolute_error_pct: null, within_practice_band: null });
    expect(rows[3].measured_feature).toContain('one spherical cell');
    expect(rows[4].measured_feature).toContain('excluding cilia');
    expect(rows[5].measured_feature).toContain('host red blood cell, not the parasite');
    expect(rows[6]).toMatchObject({ specimen_name: 'T4 bacteriophage', original_value_text: '200', original_unit: 'nm', estimate_um: 0.2, reference_um: 0.2 });
    expect(rows[6].measured_feature).toContain('lowest tail-fiber tip');
    for (const row of rows) {
      expect(row.calibration_note).toContain('historical focus is not stored');
      expect(row.calibration_note).toContain('Draft readiness is not confirmed');
      expect(row.model_note).toContain('not laboratory uncertainty');
    }
    expect(measurementsCore.exportRows(JSON.parse(before))).toEqual(rows);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('rejects invalid or orphan checked evidence and omits empty and already checked drafts', () => {
    for (const raw of [null, [], 'bad', {}, { unknown: { result: checked(2) } },
      { ecoli: { previousResult: checked(2) } }, { ecoli: { result: checked('2') } },
      { ecoli: { result: checked(2, 'um', { ...ecoliContext(), fieldUm: 0 }) } },
      { ecoli: { draft: { value: '  ', unit: 'um', context: ecoliContext() } } },
      { ecoli: { draft: { value: '2', unit: 'um', context: { ...ecoliContext(), specimen: 'phage' } } } }]) {
      expect(measurementsCore.exportRows(raw)).toEqual([]); expect(measurementsCore.exportCSV(raw)).toBeNull();
    }
    const raw = { ecoli: { result: checked(2), previousResult: checked(2), draft: { value: '2e0', unit: 'um', context: ecoliContext() } } };
    expect(measurementsCore.exportRows(raw).map(row => row.record_kind)).toEqual(['current_checked']);
    const retained = measurementsCore.exportRows({ ecoli: { result: checked(0), previousResult: checked(4), draft: { value: '3', unit: 'um', context: ecoliContext() } } });
    expect(retained).toHaveLength(1); expect(retained[0]).toMatchObject({ record_kind: 'pending_draft', original_value_text: '3', reference_um: null });
  });

  it('preserves invalid numeric drafts and only converts strict finite positive values without grading them', () => {
    for (const value of ['0x2', '+2', '2.', ' 2 ', '5e-324', '1e-999', 'NaN', '1e10', '0', '-2']) {
      const row = measurementsCore.exportRows({ ecoli: { draft: { value, unit: 'nm', context: ecoliContext() } } })[0];
      expect(row).toMatchObject({ record_kind: 'pending_draft', original_value_text: value, original_unit: 'nm', value_status: 'invalid_numeric',
        estimate_um: null, reference_um: null, absolute_error_pct: null, within_practice_band: null });
    }
    for (const [value, unit, converted] of [['2e3', 'nm', 2], ['.2', 'um', 0.2], ['5e-324', 'um', Number.MIN_VALUE], ['5e-321', 'nm', Number.MIN_VALUE]]) {
      const row = measurementsCore.exportRows({ ecoli: { draft: { value, unit, context: ecoliContext() } } })[0];
      expect(row).toMatchObject({ original_value_text: value, value_status: 'valid_numeric', estimate_um: converted,
        reference_um: null, absolute_error_pct: null, within_practice_band: null });
    }
  });

  it('keeps unresolved, cropped and too-small draft views without claiming readiness or a checked estimate', () => {
    for (const [id, method, mag, zoom] of [['phage', 'lightbright', 1000, 20], ['parame', 'lightbright', 1000, 1], ['ecoli', 'lightbright', 1000, 1]]) {
      const context = savedMeasurementContext(id, method, mag, zoom);
      const rows = measurementsCore.exportRows({ [id]: { draft: { value: '225', unit: 'nm', context } } });
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ specimen_id: id, record_kind: 'pending_draft', estimate_um: 0.225,
        viewing_method: method, magnification_x: mag, display_zoom_x: zoom, field_width_um: context.fieldUm, scale_bar_um: context.scaleUm,
        reference_um: null, absolute_error_pct: null, within_practice_band: null });
      expect(rows[0].calibration_note).toContain('Draft readiness is not confirmed');
    }
  });

  it('writes a stable CSV schema and safely quotes malformed draft formulas, commas, quotes and newlines', () => {
    const headers = ['specimen_id', 'specimen_name', 'measured_feature', 'record_kind', 'original_value_text', 'original_unit', 'estimate_um', 'value_status',
      'viewing_method', 'magnification_x', 'display_zoom_x', 'field_width_um', 'scale_bar_um', 'reference_um', 'absolute_error_pct', 'within_practice_band', 'model_note', 'calibration_note'];
    for (const value of ['=SUM(1,2)\n"draft"', '  +2', '\t@draft', '-2', '"a,b"\nsecond line', 'x'.repeat(40)]) {
      const csv = measurementsCore.exportCSV({ ecoli: { draft: { value, unit: 'um', context: ecoliContext() } } });
      const parsed = parseMeasurementCSV(csv), original = value.slice(0, 32);
      expect(parsed.headers).toEqual(headers); expect(parsed.rows).toHaveLength(1);
      expect(parsed.rows[0].original_value_text).toBe((/^\s*[=+@-]/.test(original) ? "'" : '') + original);
      expect(parsed.rows[0]).toMatchObject({ estimate_um: '', reference_um: '', absolute_error_pct: '', within_practice_band: '', value_status: 'invalid_numeric' });
      expect(Object.values(parsed.rows[0]).every(value => typeof value === 'string')).toBe(true);
    }
    const numeric = parseMeasurementCSV(measurementsCore.exportCSV({ ecoli: { result: checked(2) } })).rows[0];
    expect(numeric).toMatchObject({ original_value_text: '2', estimate_um: '2', absolute_error_pct: '0', within_practice_band: 'true' });
  });

  it('enables CSV for an unchecked-only notebook while keeping empty downloads and checked-only TXT disabled', () => {
    const awards = mount();
    expect(button('Download measurement CSV').disabled).toBe(true); expect(button('Download measurement notebook').disabled).toBe(true);
    const draft = { value: '=2+2', unit: 'nm', context: savedMeasurementContext('phage', 'lightbright', 1000, 20) };
    act(() => updateState({ microscopeMeasurements: { phage: { draft } } }));
    const trigger = button('Download measurement CSV');
    expect(trigger.id).toBe('micro-measurement-download-csv'); expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-describedby')).toBe('micro-measurement-csv-help');
    expect(button('Download measurement notebook').disabled).toBe(true);
    const download = captureNotebookDownload(); vi.useFakeTimers(); click('Download measurement CSV');
    expect(parseMeasurementCSV(download.contents[0]).rows[0]).toMatchObject({ specimen_id: 'phage', record_kind: 'pending_draft', original_value_text: "'=2+2", viewing_method: 'lightbright', estimate_um: '', reference_um: '' });
    expect(latestState.microscopeMeasurements).toEqual({ phage: { draft } }); expect(awards).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1000));
  });

  it('downloads original contexts without substituting the current view or changing focus, work or awards', () => {
    const entry = historyEntry(), awards = mount({ scopeOrganism: 'phage', selectedScope: 'em', magnification: 100000, microscopeZoom: 1,
      microscopeMeasurements: { ecoli: entry }, microscopeSeenSlides: ['ecoli'] });
    const before = JSON.parse(JSON.stringify(latestState)), download = captureNotebookDownload(); vi.useFakeTimers();
    const trigger = button('Download measurement CSV'); trigger.focus(); click('Download measurement CSV');
    expect(download.links).toEqual([{ filename: 'micro-lab-microscope-notebook.csv', href: 'blob:micro-notebook-test' }]);
    expect(parseMeasurementCSV(download.contents[0]).rows.map(row => [row.record_kind, row.viewing_method, row.magnification_x, row.display_zoom_x])).toEqual([
      ['current_checked', 'lightbright', '1000', '20'], ['previous_checked', 'em', '10000', '1'], ['pending_draft', 'lightbright', '400', '50']
    ]);
    expect(latestState).toEqual(before); expect(document.activeElement).toBe(trigger); expect(awards).not.toHaveBeenCalled();
    const notice = container.querySelector('#micro-measurement-csv-status');
    expect(notice.getAttribute('role')).toBe('status'); expect(notice.getAttribute('aria-live')).toBe('polite');
    expect(notice.textContent).toContain('CSV download has started');
    expect(document.querySelector('a[download="micro-lab-microscope-notebook.csv"]')).toBeNull();
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledWith('blob:micro-notebook-test');
  });

  it('reports CSV failures, cleans links and URLs, retries, and reannounces repeated successful downloads', () => {
    mount({ microscopeMeasurements: { ecoli: historyEntry() } });
    const before = JSON.parse(JSON.stringify(latestState)), download = captureNotebookDownload(); vi.useFakeTimers();
    const trigger = button('Download measurement CSV'); trigger.focus();
    download.createUrl.mockImplementationOnce(() => { throw new Error('URL unavailable'); });
    click('Download measurement CSV'); expect(container.querySelector('#micro-measurement-csv-status').textContent).toContain('could not download');
    download.linkClick.mockImplementationOnce(() => { throw new Error('download unavailable'); });
    click('Download measurement CSV'); expect(container.querySelector('#micro-measurement-csv-status').textContent).toContain('could not download');
    expect(document.querySelector('a[download="micro-lab-microscope-notebook.csv"]')).toBeNull();
    click('Download measurement CSV');
    const notice = container.querySelector('#micro-measurement-csv-status span'); expect(notice.textContent).toContain('download has started');
    click('Download measurement CSV'); expect(container.querySelector('#micro-measurement-csv-status span')).not.toBe(notice);
    expect(latestState).toEqual(before); expect(document.activeElement).toBe(trigger);
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(3);
  });

  it('clears stale CSV feedback on evidence edits and keeps exact export data through a JSON remount', () => {
    mount({ microscopeMeasurements: { ecoli: historyEntry() } });
    const download = captureNotebookDownload(); vi.useFakeTimers(); click('Download measurement CSV');
    enterEstimate('3500');
    expect(container.querySelector('#micro-measurement-csv-status').textContent).toBe('');
    click('Download measurement CSV');
    const report = download.contents[1], saved = JSON.parse(JSON.stringify(latestState));
    expect(parseMeasurementCSV(report).rows.find(row => row.record_kind === 'pending_draft').original_value_text).toBe('3500');
    act(() => root.unmount()); root = null; container.remove(); mount(saved);
    expect(container.querySelector('#micro-measurement-csv-status').textContent).toBe('');
    click('Download measurement CSV'); expect(download.contents[2]).toBe(report);
    expect(latestState).toEqual(saved);
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(3);
  });

  it('permanently clears old CSV feedback after edits are reversed or previous estimates are restored twice', () => {
    mount({ microscopeMeasurements: { ecoli: historyEntry() } });
    const download = captureNotebookDownload(); vi.useFakeTimers();
    const initialCSV = measurementsCore.exportCSV(latestState.microscopeMeasurements);
    const status = () => container.querySelector('#micro-measurement-csv-status').textContent;
    click('Download measurement CSV'); expect(status()).toContain('download has started');
    enterEstimate('3500'); expect(status()).toBe('');
    enterEstimate('3000');
    expect(measurementsCore.exportCSV(latestState.microscopeMeasurements)).toBe(initialCSV);
    expect(status()).toBe('');
    download.linkClick.mockImplementationOnce(() => { throw new Error('download unavailable'); });
    click('Download measurement CSV'); expect(status()).toContain('could not download');
    click('Restore previous estimate · E. coli'); expect(status()).toBe('');
    click('Restore previous estimate · E. coli');
    expect(measurementsCore.exportCSV(latestState.microscopeMeasurements)).toBe(initialCSV);
    expect(status()).toBe('');
    act(() => vi.advanceTimersByTime(1000)); expect(download.revokeUrl).toHaveBeenCalledTimes(2);
  });

  it('reflects an explicit previous-estimate restore in checked rows while preserving the independent draft', () => {
    mount({ microscopeMeasurements: { ecoli: historyEntry() } });
    const draft = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli.draft));
    const download = captureNotebookDownload(); vi.useFakeTimers(); click('Download measurement CSV');
    click('Restore previous estimate · E. coli');
    expect(container.querySelector('#micro-measurement-csv-status').textContent).toBe('');
    click('Download measurement CSV');
    const rows = parseMeasurementCSV(download.contents[1]).rows;
    expect(rows[0]).toMatchObject({ record_kind: 'current_checked', original_value_text: '1000', original_unit: 'nm', viewing_method: 'em' });
    expect(rows[1]).toMatchObject({ record_kind: 'previous_checked', original_value_text: '2.1234567890123', original_unit: 'um', viewing_method: 'lightbright' });
    expect(rows[2]).toMatchObject({ record_kind: 'pending_draft', original_value_text: '3000', reference_um: '', within_practice_band: '' });
    expect(latestState.microscopeMeasurements.ecoli.draft).toEqual(draft);
    act(() => vi.advanceTimersByTime(1000));
  });
});

describe('Decimal microscope estimates', () => {
  const context = () => savedMeasurementContext('ecoli', 'lightbright', 1000, 20);
  const checked = value => ({ value, unit: 'um', context: context() });

  it('accepts decimal and scientific notation while rejecting coerced or out-of-range inputs', () => {
    for (const [input, expected] of [['2.50', 2.5], ['.2', 0.2], ['2e+3', 2000], ['2E3', 2000], [2, 2], ['1e9', 1e9]]) {
      expect(measurementsCore.parseEstimate(input, 'um')).toBe(expected);
    }
    for (const input of ['', ' ', ' 2 ', '+2', '2.', ' 2e+3 ', '0x2', '0b10', '0o2', '1,000', '2px', '2e', 'Infinity', 'NaN', '0', '-2', '1e10', '1e-999', null, [], {}, true, Infinity, NaN]) {
      expect(measurementsCore.parseEstimate(input, 'um')).toBe(null);
    }
    expect(measurementsCore.parseEstimate('2', 'mm')).toBe(null);
  });

  it('requires conversion to remain positive without rejecting finite representable scientific estimates', () => {
    expect(measurementsCore.parseEstimate('5e-324', 'nm')).toBe(null);
    expect(measurementsCore.parseEstimate(Number.MIN_VALUE, 'nm')).toBe(null);
    expect(measurementsCore.parseEstimate('5e-324', 'um')).toBe(Number.MIN_VALUE);
    expect(measurementsCore.parseEstimate('5e-321', 'nm')).toBe(5e-321);
    expect(measurementsCore.parseEstimate('2e3', 'nm')).toBe(2000);
  });

  it('rejects underflowed current or previous evidence while preserving an independent working draft', () => {
    const draft = { value: '5e-324', unit: 'nm', context: context() };
    const result = checked(2), bad = { value: Number.MIN_VALUE, unit: 'nm', context: context() };
    const raw = { ecoli: { draft, result: bad, previousResult: result } }, before = JSON.stringify(raw);
    expect(measurementsCore.normalize(raw)).toEqual({ ecoli: { draft } });
    expect(measurementsCore.normalize({ ecoli: { draft, result, previousResult: bad } })).toEqual({ ecoli: { draft, result } });
    expect(measurementsCore.normalize({ ecoli: { draft, result: { ...result, value: '2' } } })).toEqual({ ecoli: { draft } });
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('keeps invalid restored decimal drafts pending even if Number coercion matches the checked result', () => {
    const entry = { draft: { value: '0x2', unit: 'um', context: context() }, result: checked(2) };
    expect(measurementsCore.pending(entry)).toBe(true);
    expect(measurementsCore.pending({ ...entry, draft: { ...entry.draft, value: '2e0' } })).toBe(false);
    expect(measurementsCore.pending({ ...entry, draft: { ...entry.draft, value: '5e-324', unit: 'nm' } })).toBe(true);
  });

  it('preserves a hexadecimal restored draft and saved history until the learner enters a valid decimal', () => {
    const entry = { draft: { value: '0x2', unit: 'um', context: context() }, result: checked(2), previousResult: checked(4) };
    const awards = mount({ microscopeZoom: 20, microscopeFocus: 50, microscopeSeenSlides: ['ecoli'], microscopeMeasurements: { ecoli: entry } });
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(container.querySelector('input[type="number"]').getAttribute('aria-invalid')).toBe('true');
    expect(text()).toContain('Enter a decimal number');
    expect(latestState.microscopeMeasurements.ecoli).toEqual(entry);
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli).toEqual(entry);
    enterEstimate('2e0'); expect(button('Check and save estimate').disabled).toBe(false);
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.result).toEqual(entry.result);
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(entry.previousResult);
    expect(awards).not.toHaveBeenCalled();
  });

  it('blocks nanometer underflow through JSON reload and exports valid evidence after correction', () => {
    const entry = { draft: { value: '5e-324', unit: 'nm', context: context() }, result: checked(2), previousResult: checked(4) };
    mount({ microscopeZoom: 20, microscopeFocus: 50, microscopeSeenSlides: ['ecoli'], microscopeMeasurements: { ecoli: entry } });
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(text()).toContain('too small to remain above zero in micrometers');
    const saved = JSON.parse(JSON.stringify(latestState));
    act(() => root.unmount()); root = null; container.remove(); mount(saved);
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(latestState.microscopeMeasurements.ecoli).toEqual(entry);
    enterEstimate('2e3'); click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.result).toEqual({ value: 2000, unit: 'nm', context: context() });
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(entry.result);
    const download = captureNotebookDownload(); vi.useFakeTimers();
    click('Download measurement notebook');
    expect(download.contents[0]).toContain('Your estimate: 2000 nm');
    expect(download.contents[0]).toContain('Estimate converted to micrometers: 2 µm');
    expect(download.contents[0]).not.toContain('Estimate converted to micrometers: 0 µm');
    act(() => vi.advanceTimersByTime(1000));
  });

  it('does not enable checking a restored spelling that the native number field displays as blank', () => {
    const entry = { draft: { value: '+2', unit: 'um', context: context() }, result: checked(2) };
    mount({ microscopeZoom: 20, microscopeFocus: 50, microscopeSeenSlides: ['ecoli'], microscopeMeasurements: { ecoli: entry } });
    for (const value of ['+2', '2.', ' 2 ']) {
      act(() => updateState({ microscopeMeasurements: { ecoli: { ...entry, draft: { ...entry.draft, value } } } }));
      expect(container.querySelector('input[type="number"]').value).toBe('');
      expect(button('Check and save estimate').disabled).toBe(true);
      expect(latestState.microscopeMeasurements.ecoli.draft.value).toBe(value);
      expect(latestState.microscopeMeasurements.ecoli.result).toEqual(entry.result);
    }
    enterEstimate('2e+0'); expect(container.querySelector('input[type="number"]').value).toBe('2e+0');
    expect(button('Check and save estimate').disabled).toBe(false);
  });
});

describe('Previous checked microscope estimates', () => {
  function entryWithHistory(id = 'ecoli') {
    const context = savedMeasurementContext(id, 'lightbright', 1000, 20);
    return {
      draft: { value: '3000', unit: 'nm', context: savedMeasurementContext(id, 'lightbright', 400, 50) },
      result: { value: 2, unit: 'um', context },
      previousResult: { value: 1000, unit: 'nm', context: savedMeasurementContext(id, 'em', 10000, 1) }
    };
  }
  function openHistory(id = 'ecoli') {
    const notebook = [...container.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent.startsWith('Measurement notebook'));
    if (!notebook.open) act(() => notebook.querySelector('summary').click());
    const preview = container.querySelector(`[data-measurement-history="${id}"]`);
    expect(preview).toBeTruthy();
    if (!preview.open) act(() => preview.querySelector('summary').click());
    return preview;
  }

  it('keeps one independent validated previous result, strips nested history, and preserves the draft', () => {
    const entry = entryWithHistory();
    entry.previousResult.previousResult = { value: 999 };
    entry.previousResult.context.extra = 'discard';
    const raw = { ecoli: entry }, before = JSON.stringify(raw);
    const clean = measurementsCore.normalize(raw);
    expect(clean.ecoli.draft).toEqual(entry.draft);
    expect(clean.ecoli.result).toEqual(entry.result);
    expect(clean.ecoli.previousResult).toEqual({ value: 1000, unit: 'nm', context: savedMeasurementContext('ecoli', 'em', 10000, 1) });
    expect(clean.ecoli.previousResult).not.toBe(entry.previousResult);
    expect(clean.ecoli.previousResult.context).not.toBe(entry.previousResult.context);
    expect(measurementsCore.normalize(clean)).toEqual(clean);
    expect(JSON.stringify(raw)).toBe(before);
  });

  it('rejects orphaned, identical, damaged, unresolved and cropped history without losing valid evidence', () => {
    const entry = entryWithHistory();
    const badContexts = [
      { ...entry.previousResult.context, specimen: 'strep' },
      { ...entry.previousResult.context, referenceUm: 2000 },
      { ...entry.previousResult.context, fieldUm: 99 },
      { ...entry.previousResult.context, scaleUm: 99 },
      savedMeasurementContext('ecoli', 'lightbright', 1000, 1),
      savedMeasurementContext('ecoli', 'em', 100000, 50)
    ];
    for (const previousResult of [null, [], 'bad', entry.result, { ...entry.previousResult, value: 0 }, { ...entry.previousResult, value: Infinity }, { ...entry.previousResult, unit: 'mm' }, ...badContexts.map(context => ({ ...entry.previousResult, context }))]) {
      expect(measurementsCore.normalize({ ecoli: { ...entry, previousResult } })).toEqual({ ecoli: { draft: entry.draft, result: entry.result } });
    }
    expect(measurementsCore.normalize({ ecoli: { ...entry, result: null } })).toEqual({ ecoli: { draft: entry.draft } });
    expect(measurementsCore.normalize({ ecoli: { previousResult: entry.previousResult } })).toEqual({});
    const phageContext = savedMeasurementContext('phage', 'em', 100000, 1);
    const phage = { result: { value: 200, unit: 'nm', context: phageContext }, previousResult: { value: 100, unit: 'nm', context: savedMeasurementContext('phage', 'lightbright', 1000, 20) } };
    expect(measurementsCore.normalize({ phage })).toEqual({ phage: { result: phage.result } });
  });

  it('retains the displaced estimate only on a changed check and preserves history on identical checks', () => {
    mount({ microscopeFocus: 50 });
    enterEstimate(4); click('Check and save estimate');
    const first = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli.result));
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toBeUndefined();
    expect(container.querySelector('[data-measurement-history]')).toBeNull();
    enterEstimate(2);
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toBeUndefined();
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(first);
    enterEstimate('2.0'); click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(first);
    const second = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli.result));
    click('400×'); zoomTo(50); click('Start estimate for this view'); enterEstimate(2);
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(second);
    expect(latestState.microscopeMeasurements.ecoli.result.context).toMatchObject({ mag: 400, zoom: 50 });
    expect(Object.keys(latestState.microscopeMeasurements.ecoli.previousResult).sort()).toEqual(['context', 'unit', 'value']);
    const before = JSON.parse(JSON.stringify(latestState.microscopeMeasurements));
    click('Check and save estimate');
    expect(latestState.microscopeMeasurements).toEqual(before);
    enterEstimate(0);
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(latestState.microscopeMeasurements.ecoli.previousResult).toEqual(second);
  });

  it('previews both original units and calibrations with separate reference comparisons and no editable evidence', () => {
    const entry = entryWithHistory();
    entry.result.value = 2.1234567890123;
    mount({ microscopeMeasurements: { ecoli: entry } });
    const before = JSON.parse(JSON.stringify(latestState));
    expect(container.querySelector('[data-measurement-history="ecoli"]').open).toBe(false);
    const preview = openHistory();
    expect(preview.querySelector('summary').textContent).toBe('Compare checked estimates · E. coli');
    const current = preview.querySelector('[data-measurement-version="current"]');
    const previous = preview.querySelector('[data-measurement-version="previous"]');
    expect(current.textContent).toContain('Your estimate: 2.1234567890123 µm');
    expect(current.textContent).toContain('6.17% · above the drawing reference');
    expect(current.textContent).toContain('Light microscope · 1,000× · display zoom 20× · Scale bar 2 µm');
    expect(current.textContent).toContain('Model field width: 9 µm');
    expect(previous.textContent).toContain('Your estimate: 1000 nm');
    expect(previous.textContent).toContain('Estimate converted to micrometers: 1 µm');
    expect(previous.textContent).toContain('50% · below the drawing reference');
    expect(previous.textContent).toContain('Electron view · 10,000× · display zoom 1× · Scale bar 1 µm');
    expect(previous.textContent).toContain('Model field width: 4 µm');
    for (const panel of [current, previous]) {
      expect(panel.textContent).toContain('Length of the rod-shaped cell, from end to end');
      expect(panel.textContent).toContain('Reference size: 2 µm');
      expect(panel.textContent).toContain('Practice band (±20%): 1.6 µm–2.4 µm');
      expect(panel.querySelectorAll('input,textarea,select,button')).toHaveLength(0);
      expect(panel.querySelector('h5').id).toBe(panel.getAttribute('aria-labelledby'));
    }
    expect(preview.textContent).toContain('does not describe uncertainty in a real laboratory measurement');
    expect(button('Restore previous estimate · E. coli').getAttribute('aria-describedby')).toBe('micro-measurement-history-ecoli-note');
    expect(latestState).toEqual(before);
  });

  it('reversibly restores another slide’s estimate while keeping every draft, view setting, focus and progress field', () => {
    const entry = entryWithHistory();
    const phageDraft = { value: '250', unit: 'nm', context: savedMeasurementContext('phage', 'lightbright', 1000, 20) };
    const awards = mount({ scopeOrganism: 'phage', magnification: 1000, microscopeZoom: 50, microscopeFocus: 92, microscopeTargetFocus: 13, microscopeLabels: false, microscopeSeenSlides: ['ecoli'], microscopeMeasurements: { ecoli: entry, phage: { draft: phageDraft } } });
    openHistory();
    const before = JSON.parse(JSON.stringify(latestState));
    click('Restore previous estimate · E. coli');
    expect(latestState).toEqual({ ...before, microscopeMeasurements: { ...before.microscopeMeasurements, ecoli: { ...entry, result: entry.previousResult, previousResult: entry.result } } });
    expect(awards).not.toHaveBeenCalled();
    expect(document.activeElement.id).toBe('micro-measurement-history-ecoli-current');
    expect(document.activeElement.textContent).toBe('Current checked estimate');
    expect(container.querySelector('[data-measurement-history-notice="ecoli"]').textContent).toContain('Your working estimate and microscope settings were kept');
    expect(text()).toContain('Measurement notebook · 1/5');
    click('Restore previous estimate · E. coli');
    expect(latestState).toEqual(before);
    expect(awards).not.toHaveBeenCalled();
    enterEstimate(275);
    expect(container.querySelector('[data-measurement-history-notice="ecoli"]').textContent).toBe('');
  });

  it('keeps history separate by slide through JSON reload without persisting restore messages or moving focus later', () => {
    vi.useFakeTimers();
    const strepContext = savedMeasurementContext('strep', 'lightbright', 1000, 20);
    const strep = { result: { value: 1, unit: 'um', context: strepContext }, previousResult: { value: 2, unit: 'um', context: strepContext } };
    mount({ microscopeMeasurements: { ecoli: entryWithHistory(), strep } });
    openHistory(); click('Restore previous estimate · E. coli');
    const saved = JSON.parse(JSON.stringify(latestState));
    expect(saved.microscopeMeasurements.strep).toEqual(strep);
    act(() => root.unmount()); root = null; container.remove();
    mount(saved);
    expect(latestState).toEqual(saved);
    expect(container.querySelectorAll('[data-measurement-history]')).toHaveLength(2);
    expect(container.querySelector('[data-measurement-history-notice="ecoli"]').textContent).toBe('');
    const notebookButton = button('Open measurement notebook · 2/5'); notebookButton.focus();
    act(() => vi.runOnlyPendingTimers());
    expect(document.activeElement).toBe(notebookButton);
    openHistory('strep'); click('Restore previous estimate · Streptococcus');
    expect(latestState.microscopeMeasurements.ecoli).toEqual(saved.microscopeMeasurements.ecoli);
    expect(latestState.microscopeMeasurements.strep).toEqual({ result: strep.previousResult, previousResult: strep.result });
  });

  it('does not focus an estimate inside a collapsed comparison', () => {
    mount({ microscopeMeasurements: { ecoli: entryWithHistory() } });
    const notebookButton = button('Open measurement notebook · 1/5'); notebookButton.focus();
    click('Restore previous estimate · E. coli');
    expect(document.activeElement).toBe(notebookButton);
    expect(container.querySelector('[data-measurement-history="ecoli"]').open).toBe(false);
    expect(latestState.microscopeMeasurements.ecoli.result.value).toBe(1000);
  });

  it('exports current and previous evidence with their own units and calibration, keeping working notes separate', () => {
    const entry = entryWithHistory();
    entry.result.value = 2.1234567890123;
    mount({ microscopeMeasurements: { ecoli: entry } });
    const before = JSON.parse(JSON.stringify(latestState));
    const download = captureNotebookDownload(); vi.useFakeTimers();
    click('Download measurement notebook');
    const report = download.contents[0];
    const [current, remaining] = report.split('Previous checked estimate (available to restore)');
    const previous = remaining.split('2. Streptococcus')[0];
    expect(current).toContain('Current checked estimate\nYour estimate: 2.1234567890123 µm');
    expect(current).toContain('Difference: 6.17% · above the drawing reference');
    expect(current).toContain('Light microscope · 1,000× · display zoom 20× · Scale bar 2 µm');
    expect(previous).toContain('Your estimate: 1000 nm');
    expect(previous).toContain('Difference: 50% · below the drawing reference');
    expect(previous).toContain('Electron view · 10,000× · display zoom 1× · Scale bar 1 µm');
    expect(previous).toContain('Model field width: 4 µm');
    expect(report).toContain('The current checked estimate and any previous checked estimate are included for each slide. Working estimates remain saved in the lab.');
    expect(report).not.toContain('3000');
    expect(report.match(/No checked estimate yet./g)).toHaveLength(4);
    expect(latestState).toEqual(before);
    act(() => vi.advanceTimersByTime(1000));
    expect(download.revokeUrl).toHaveBeenCalledWith('blob:micro-notebook-test');
    expect(document.querySelector('a[download="micro-lab-microscope-notebook.txt"]')).toBeNull();
  });
});

describe('Resume microscope working measurements', () => {
  it('shows both contexts and resumes an edited working estimate without replacing its checked result', () => {
    mount({ microscopeFocus: 50, microscopeZoom: 20 });
    enterEstimate(2); click('Check and save estimate');
    click('400×'); zoomTo(50); click('Start estimate for this view');
    enterEstimate(3000); estimateUnits('nm');
    const entry = JSON.parse(JSON.stringify(latestState.microscopeMeasurements.ecoli));
    click('Prepare slide · T4 bacteriophage');
    const working = container.querySelector('[data-measurement-draft="ecoli"]');
    expect(working.textContent).toContain('Working estimate (not yet checked): 3000 nm');
    expect(working.textContent).toContain('Working view: Light microscope · 400× · display zoom 50× · Scale bar 2 µm');
    expect(container.querySelector('[data-measurement-slide="ecoli"]').textContent).toContain('Light microscope · 1,000× · display zoom 20×');
    click('Resume working view · E. coli');
    expect(latestState).toMatchObject({ scopeOrganism: 'ecoli', selectedScope: 'lightbright', magnification: 400, microscopeZoom: 50, microscopeFocus: 50, microscopeTargetFocus: 50 });
    expect(latestState.microscopeMeasurements.ecoli).toEqual(entry);
    expect(container.querySelector('input[type="number"]').value).toBe('3000');
    expect(container.querySelector('select[aria-label="Estimate units"]').value).toBe('nm');
    expect(document.activeElement).toBe(container.querySelector('input[type="number"]'));
    expect(button('Check and save estimate').disabled).toBe(false);
    expect(text()).toContain('working viewing settings restored with focus assist');
    expect(text()).toContain('This saved result belongs to the earlier view');
    click('Review saved view · E. coli');
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(text()).toContain('Resume its working view from the notebook');
    expect(latestState.microscopeMeasurements.ecoli).toEqual(entry);
  });

  it('resumes an unchecked draft after JSON reload without manufacturing a saved result', () => {
    const draft = { value: '225', unit: 'nm', context: savedMeasurementContext('phage', 'em', 50000, 1) };
    mount({ microscopeMeasurements: { phage: { draft } } });
    const saved = JSON.parse(JSON.stringify(latestState));
    act(() => root.unmount()); root = null; container.remove();
    mount(saved);
    click('Resume working view · T4 bacteriophage');
    expect(latestState).toMatchObject({ scopeOrganism: 'phage', selectedScope: 'em', magnification: 50000, microscopeZoom: 1, microscopeFocus: 56 });
    expect(latestState.microscopeMeasurements.phage).toEqual({ draft });
    expect(button('Check and save estimate').disabled).toBe(false);
    expect(button('Download measurement notebook').disabled).toBe(true);
    expect(text()).toContain('Measurement notebook · 0/5');
  });

  it.each([
    { id: 'ecoli', name: 'E. coli', method: 'lightbright', mag: 1000, zoom: 1, hint: 'Increase display zoom so the feature is large enough' },
    { id: 'parame', name: 'Paramecium', method: 'lightbright', mag: 1000, zoom: 1, hint: 'Reduce magnification or display zoom until the whole feature fits' },
    { id: 'phage', name: 'T4 bacteriophage', method: 'lightbright', mag: 1000, zoom: 20, hint: 'Use the recommended setup so this feature is visible' }
  ])('restores the $id working view while keeping its unmet readiness checks', specimen => {
    const draft = { value: '5', unit: 'nm', context: savedMeasurementContext(specimen.id, specimen.method, specimen.mag, specimen.zoom) };
    mount({ microscopeMeasurements: { [specimen.id]: { draft } } });
    click('Resume working view · ' + specimen.name);
    expect(latestState).toMatchObject({ scopeOrganism: specimen.id, selectedScope: specimen.method, magnification: specimen.mag, microscopeZoom: specimen.zoom });
    expect(latestState.microscopeMeasurements[specimen.id]).toEqual({ draft });
    expect(button('Check and save estimate').disabled).toBe(true);
    expect(text()).toContain(specimen.hint);
    expect(text()).not.toContain('The view changed after this estimate was started');
  });

  it('does not present blank or already checked estimates as pending work', () => {
    const context = savedMeasurementContext('ecoli', 'lightbright', 1000, 20);
    mount({ microscopeMeasurements: {
      ecoli: { draft: { value: '2', unit: 'um', context }, result: { value: 2, unit: 'um', context } },
      phage: { draft: { value: '', unit: 'nm', context: savedMeasurementContext('phage', 'em', 100000, 1) } }
    } });
    expect(container.querySelectorAll('[data-measurement-draft]')).toHaveLength(0);
    expect(text()).not.toContain('Resume working view');
    expect(button('Review saved view · E. coli')).toBeTruthy();
    expect(button('Prepare slide · T4 bacteriophage')).toBeTruthy();
  });
});
