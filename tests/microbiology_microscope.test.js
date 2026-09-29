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
