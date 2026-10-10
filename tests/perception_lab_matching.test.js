import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_perception.js';
const MATCHES = [
  { id: 'brightness', reference: 128, min: 16, max: 240 },
  { id: 'ebbinghaus', reference: 48, min: 32, max: 72 },
  { id: 'mullerLyer', reference: 400, min: 250, max: 550 },
];
const { act } = React;
let engine, config, host, root, latest, latestAll, announce;

function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => {
    if (!node || typeof node !== 'object') return [];
    return [node, ...flatten(node.children || [])];
  });
}
const scene = (id, model) => flatten(engine.scene(id, model));
const targets = nodes => nodes.filter(node => node.props?.['data-perception-target']);
const contexts = nodes => nodes.filter(node => node.props?.['data-perception-context']);
const targetProps = nodes => targets(nodes).map(node => ({ tag: node.tag, props: node.props }));
const length = node => Math.hypot(Number(node.props.x2) - Number(node.props.x1), Number(node.props.y2) - Number(node.props.y1));

async function mount(seed = {}) {
  function Harness() {
    const [toolData, setToolData] = React.useState({ perceptionLab: seed, otherTool: { marker: 77 } });
    latest = toolData.perceptionLab;
    latestAll = toolData;
    return config.render(makeCtx({ toolData, setToolData, activeProfileId: 'matching-learner', announceToSR: announce }));
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Harness)));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy();
  return found;
}
const click = async label => act(async () => button(label).click());
async function input(id, value) {
  const node = host.querySelector('#' + id);
  expect(node, id).toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const shownTargets = () => [...host.querySelectorAll('#perception-stage-current [data-perception-target]')].map(node => node.outerHTML);

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool(FILE, 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception Lab matching model and measurements', () => {
  it.each(MATCHES)('$id restores old observations as equal-target Observe scenes', ({ id, reference, min }) => {
    const legacy = engine.normalizeModel(id, {});
    expect(legacy.matching).toBe(false);
    expect(legacy.swap).toBe(false);
    expect(legacy.matchValue).toBe(reference);
    expect(engine.measurements(id, { matching: false, matchValue: min })).toMatchObject({ reference, comparison: reference, difference: 0 });
    expect(targetProps(scene(id, { matching: false, matchValue: min }))).toEqual(targetProps(scene(id, {})));
  });

  it.each(MATCHES)('$id bounds matching values and rejects non-finite persisted values', ({ id, reference, min, max }) => {
    expect(engine.normalizeModel(id, { matching: true, matchValue: -1000 }).matchValue).toBe(min);
    expect(engine.normalizeModel(id, { matching: true, matchValue: 1000 }).matchValue).toBe(max);
    for (const matchValue of [NaN, Infinity, -Infinity, null, {}, [], '', 'bad']) {
      expect(engine.normalizeModel(id, { matching: true, matchValue }).matchValue).toBe(reference);
    }
    expect(engine.normalizeModel(id, { matching: 'true', swap: 'true' })).toMatchObject({ matching: false, swap: false });
    const rendered = scene(id, { matching: true, matchValue: Infinity, swap: true, reveal: true });
    for (const node of rendered) for (const value of Object.values(node.props || {})) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  });

  it('uses the selected center gray as the brightness reference and default matching value', () => {
    expect(engine.normalizeModel('brightness', { target: 172 }).matchValue).toBe(172);
    expect(engine.measurements('brightness', { target: 172, matching: true, matchValue: 150 })).toMatchObject({ reference: 172, comparison: 150, difference: -22, percent: null });
  });

  it.each([
    ['brightness', 144, 16, null],
    ['ebbinghaus', 60, 12, 25],
    ['mullerLyer', 350, -50, -12.5],
  ])('%s reports signed comparison differences in the correct domain', (id, matchValue, difference, percent) => {
    const result = engine.measurements(id, { matching: true, matchValue });
    expect(result.difference).toBe(difference);
    expect(result.comparison - result.reference).toBe(difference);
    if (percent === null) expect(result.percent).toBeNull();
    else expect(result.percent).toBeCloseTo(percent, 10);
    expect(result.unit).toEqual(expect.any(String));
    expect(result.unit.length).toBeGreaterThan(0);
  });
});

describe('Perception Lab matching scene geometry', () => {
  it.each(MATCHES)('$id adjusts only the comparison target and preserves context positions', ({ id, min, max }) => {
    const smaller = scene(id, { matching: true, matchValue: min });
    const larger = scene(id, { matching: true, matchValue: max });
    expect(targetProps(larger)[0]).toEqual(targetProps(smaller)[0]);
    expect(targetProps(larger)[1]).not.toEqual(targetProps(smaller)[1]);
    // Arrowhead attachment points move with a changing shaft. Circle rings and
    // brightness backgrounds stay fixed during target adjustment.
    if (id !== 'mullerLyer') expect(contexts(larger)).toEqual(contexts(smaller));
    if (id === 'brightness') {
      expect(targets(smaller)[1].props.fill).toBe('rgb(16,16,16)');
      expect(targets(larger)[1].props.fill).toBe('rgb(240,240,240)');
    } else if (id === 'ebbinghaus') {
      expect(targets(smaller)[1].props.r * 2).toBe(32);
      expect(targets(larger)[1].props.r * 2).toBe(72);
    } else {
      expect(length(targets(smaller)[1])).toBe(250);
      expect(length(targets(larger)[1])).toBe(550);
    }
  });

  it.each(MATCHES)('$id swaps context without moving or modifying either target', ({ id, max }) => {
    const original = scene(id, { matching: true, matchValue: max, swap: false });
    const swapped = scene(id, { matching: true, matchValue: max, swap: true });
    expect(targetProps(swapped)).toEqual(targetProps(original));
    expect(contexts(swapped)).not.toEqual(contexts(original));
    expect(targetProps(scene(id, { matching: true, matchValue: max, swap: true, context: false }))).toEqual(targetProps(original));
  });

  it('Ebbinghaus targets and surrounding disks remain disjoint throughout matching and swap ranges', () => {
    for (const matchValue of [32, 48, 72]) for (const surround of [20, 36, 50]) for (const gap of [4, 12, 28]) for (const swap of [false, true]) {
      const disks = scene('ebbinghaus', { matching: true, matchValue, surround, gap, swap }).filter(node => node.tag === 'circle' && !node.props['data-perception-guide']);
      expect(disks).toHaveLength(14);
      for (let i = 0; i < disks.length; i++) {
        const a = disks[i].props;
        for (let j = i + 1; j < disks.length; j++) {
          const b = disks[j].props;
          expect(Math.hypot(a.cx - b.cx, a.cy - b.cy) + 1e-8).toBeGreaterThanOrEqual(a.r + b.r);
        }
      }
    }
  });

  it('Muller-Lyer fins remain attached to the actual shaft endpoints at both matching limits', () => {
    for (const matchValue of [250, 550]) for (const swap of [false, true]) {
      const nodes = scene('mullerLyer', { matching: true, matchValue, angle: 75, fin: 75, swap });
      const shafts = targets(nodes);
      for (const fin of contexts(nodes)) {
        const shaft = shafts.find(node => node.props.y1 === fin.props.y1);
        expect(shaft).toBeTruthy();
        expect([shaft.props.x1, shaft.props.x2]).toContain(fin.props.x1);
      }
    }
  });
});

describe('Perception Lab matching learner controls', () => {
  it.each(MATCHES)('$id enters matching at a bounded unequal starting point and hides a previously revealed answer', async ({ id, reference, min, max }) => {
    await mount({ experiment: id, models: { [id]: { reveal: true, matchValue: max } } });
    expect(host.querySelector('[data-perception-result]')).toBeTruthy();
    await click('Match by eye');
    expect(latest.models[id]).toMatchObject({ matching: true, reveal: false });
    const entered = latest.models[id].matchValue;
    expect(Number.isInteger(entered)).toBe(true);
    expect(entered).toBeGreaterThanOrEqual(min); expect(entered).toBeLessThanOrEqual(max);
    expect(entered).not.toBe(reference); expect(entered).not.toBe(max);
    expect(host.querySelector('[data-perception-result]')).toBeNull();
    const slider = host.querySelector('#perception-match-value');
    expect(slider).toBeTruthy();
    const percentage = Math.round((entered - min) / (max - min) * 100);
    expect(slider.getAttribute('aria-valuetext')).toContain(percentage + ' percent of adjustment range');
    expect(slider.getAttribute('aria-valuetext')).toContain('drawing values hidden until reveal');
    expect(host.querySelector('label[for="perception-match-value"]')).toBeTruthy();
    if (id === 'brightness') expect(host.querySelector('#perception-target')).toBeNull();
  });

  it('supports small keyboard-operable matching changes, clamp boundaries, and explicit drawing-value equality', async () => {
    await mount();
    await click('Match by eye');
    const entered = latest.models.brightness.matchValue;
    // Leave room for the increment independently of the sampled starting point.
    if (entered === 240) await input('perception-match-value', 239);
    const incrementBase = latest.models.brightness.matchValue;
    await click('Increase comparison');
    expect(latest.models.brightness.matchValue).toBe(incrementBase + 1);
    await click('Decrease comparison');
    expect(latest.models.brightness.matchValue).toBe(incrementBase);
    await input('perception-match-value', 16);
    await click('Decrease comparison');
    expect(latest.models.brightness.matchValue).toBe(16);
    await input('perception-match-value', 240);
    await click('Increase comparison');
    expect(latest.models.brightness.matchValue).toBe(240);
    await click('Reveal measurements');
    await click('Equalize drawing values');
    expect(latest.models.brightness).toMatchObject({ matching: true, matchValue: 128, reveal: false });
    expect(host.querySelector('[data-perception-result]')).toBeNull();
  });

  it('round-trips two context swaps exactly while retaining an adjusted comparison', async () => {
    await mount({ experiment: 'ebbinghaus' });
    await click('Match by eye');
    await input('perception-match-value', 64);
    const original = host.querySelector('#perception-stage-current').innerHTML;
    const beforeTargets = shownTargets();
    await click('Swap surroundings');
    expect(latest.models.ebbinghaus.swap).toBe(true);
    expect(shownTargets()).toEqual(beforeTargets);
    await click('Swap surroundings');
    expect(latest.models.ebbinghaus.swap).toBe(false);
    expect(latest.models.ebbinghaus.matchValue).toBe(64);
    expect(host.querySelector('#perception-stage-current').innerHTML).toBe(original);
  });

  it('hides a changed reference gray in the comparison table until matching measurements are revealed', async () => {
    await mount();
    await click('Pin comparison');
    await input('perception-target', 160);
    await click('Match by eye');
    const row = () => host.querySelector('[data-perception-change="target"]');
    expect(row()).toBeTruthy();
    expect(row().querySelector('[data-perception-delta-value=before]').textContent).toContain('128');
    expect(row().querySelector('[data-perception-delta-value=current]').textContent).toBe('Hidden until reveal');
    expect(latest.models.brightness).toMatchObject({ target: 160, matching: true, reveal: false });
    expect(latest.models.brightness.matchValue).not.toBe(160);
    expect(latest.models.brightness.matchValue).not.toBe(128);
    await click('Reveal measurements');
    expect(row().querySelector('[data-perception-delta-value=current]').textContent).toBe('160 RGB');
    expect(latest.comparison.model.target).toBe(128);
  });

  it('transfers swapped brightness surroundings to Art Studio without replacing the perceptual match', async () => {
    await mount();
    await input('perception-target', 160);
    await click('Match by eye');
    await input('perception-match-value', 144);
    await click('Swap surroundings');
    const before = structuredClone(latest);
    await click('Open Art Studio');
    const art = latestAll.artStudio;
    expect(art).toMatchObject({ tab: 'opArt', opStyle: 'colorContrast', opPaused: true, opColorMode: 'custom', opSatA: 0, opSatB: 0, opCenterSat: 0 });
    expect(art.opLitA).toBeCloseTo(218 / 255 * 100, 10);
    expect(art.opLitB).toBeCloseTo(38 / 255 * 100, 10);
    expect(art.opCenterLit).toBeCloseTo(160 / 255 * 100, 10);
    expect(latest).toEqual(before);
    expect(latest.models.brightness).toMatchObject({ matching: true, matchValue: 144, target: 160, swap: true });
    expect(latestAll.otherTool).toEqual({ marker: 77 });
  });

  it('Observe shows equal targets while returning to Match begins a fresh comparison', async () => {
    await mount({ experiment: 'mullerLyer' });
    await click('Match by eye');
    await input('perception-match-value', 500);
    await click('Observe');
    expect(latest.models.mullerLyer).toMatchObject({ matching: false, matchValue: 500 });
    const actual = scene('mullerLyer', latest.models.mullerLyer);
    expect(targets(actual).map(length)).toEqual([400, 400]);
    await click('Match by eye');
    expect(latest.models.mullerLyer).toMatchObject({ matching: true, reveal: false });
    expect(latest.models.mullerLyer.matchValue).not.toBe(400);
    expect(latest.models.mullerLyer.matchValue).not.toBe(500);
    expect(latest.models.mullerLyer.matchValue).toBeGreaterThanOrEqual(250);
    expect(latest.models.mullerLyer.matchValue).toBeLessThanOrEqual(550);
    expect(latestAll.otherTool).toEqual({ marker: 77 });
  });

  it.each([
    ['brightness', 144, '128', '144', '16'],
    ['ebbinghaus', 60, '48', '60', '12'],
    ['mullerLyer', 350, '400', '350', '50'],
  ])('%s reveals the actual adjusted comparison and difference only on request', async (id, value, reference, comparison, difference) => {
    await mount({ experiment: id });
    await click('Match by eye');
    await input('perception-match-value', value);
    expect(host.querySelector('[data-perception-result]')).toBeNull();
    expect(host.querySelectorAll('#perception-stage-current [data-perception-guide]')).toHaveLength(0);
    await click('Reveal measurements');
    const reading = host.querySelector('[data-perception-result]');
    expect(reading).toBeTruthy();
    for (const expected of [reference, comparison, difference]) expect(reading.textContent).toContain(expected);
    expect(latest.models[id]).toMatchObject({ matching: true, matchValue: value, reveal: true });
  });
});
