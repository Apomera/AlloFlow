import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_perception.js';
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire'];
const { act } = React;
let engine, config, host, root, latest, latestAll, edit, changeProfile, announce, navigate, frames, media, mediaListeners;

function flatten(nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => {
    if (!node || typeof node !== 'object') return [];
    return [node, ...flatten(node.children || [])];
  });
}
const scene = (id, model) => flatten(engine.scene(id, model));
const targets = nodes => nodes.filter(node => node.props?.['data-perception-target']).map(node => ({ tag: node.tag, props: node.props }));
const context = nodes => nodes.filter(node => node.props?.['data-perception-context']);

async function mount(seed = {}) {
  function Harness() {
    const [toolData, setToolData] = React.useState({ perceptionLab: seed, otherTool: { marker: 77 }, artStudio: { pixelSize: 32, customSetting: true } });
    const [profile, setProfile] = React.useState('first-learner');
    latest = toolData.perceptionLab;
    latestAll = toolData;
    edit = state => setToolData(previous => ({ ...previous, perceptionLab: state }));
    changeProfile = setProfile;
    return config.render(makeCtx({ toolData, setToolData, activeProfileId: profile, announceToSR: announce, setStemLabTool: navigate }));
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
  const setter = Object.getOwnPropertyDescriptor(node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, String(value));
    node.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  config = loadTool(FILE, 'perceptionLab');
  engine = window.StemLab.PerceptionEngine;
  announce = vi.fn();
  navigate = vi.fn();
  frames = new Map();
  mediaListeners = new Set();
  media = { matches: false, addEventListener: (_, listener) => mediaListeners.add(listener), removeEventListener: (_, listener) => mediaListeners.delete(listener) };
  vi.stubGlobal('matchMedia', vi.fn(() => media));
  let frameId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove();
  root = host = null;
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Perception Lab experiment geometry', () => {
  it('registers a dedicated tool with six independently normalized experiments', () => {
    const state = engine.normalize();
    expect(config.id).toBe('perceptionLab');
    expect(state.experiment).toBe('brightness');
    expect(Object.keys(state.models).sort()).toEqual([...IDS].sort());
    expect(new Set(Object.values(state.models)).size).toBe(IDS.length);
  });

  it.each(['brightness', 'ebbinghaus', 'mullerLyer'])('removing %s surroundings preserves the complete target geometry', id => {
    const model = engine.normalize().models[id];
    const visible = scene(id, { ...model, context: true });
    const removed = scene(id, { ...model, context: false });
    expect(targets(visible).length).toBeGreaterThanOrEqual(2);
    expect(context(visible).length).toBeGreaterThan(0);
    expect(context(removed)).toHaveLength(0);
    expect(targets(removed)).toEqual(targets(visible));
  });

  it('brightness-context changes keep both target fills and dimensions identical', () => {
    const baseline = targets(scene('brightness', { contrast: 0, target: 128 }));
    const stronger = targets(scene('brightness', { contrast: 100, target: 128 }));
    expect(stronger).toEqual(baseline);
    expect(new Set(stronger.map(node => node.props.fill)).size).toBe(1);
  });

  it('Ebbinghaus surround controls do not resize either central disk', () => {
    const smaller = targets(scene('ebbinghaus', { surround: 12, gap: 6 }));
    const larger = targets(scene('ebbinghaus', { surround: 60, gap: 30 }));
    expect(larger).toEqual(smaller);
    expect(new Set(larger.map(node => node.props.r)).size).toBe(1);
    expect(Number(larger[0].props.r)).toBeGreaterThan(0);
  });

  it('keeps every surrounding disk separate across the full radius and gap ranges', () => {
    for (const surround of [20, 36, 50]) for (const gap of [4, 12, 28]) {
      const disks = context(scene('ebbinghaus', { surround, gap }));
      expect(disks).toHaveLength(12);
      for (let a = 0; a < disks.length; a++) for (let b = a + 1; b < disks.length; b++) {
        const p = disks[a].props, q = disks[b].props;
        expect(Math.hypot(p.cx - q.cx, p.cy - q.cy)).toBeGreaterThanOrEqual(p.r + q.r);
      }
    }
  });

  it('keeps center squares visible on the shared background after removing context', () => {
    for (const target of [48, 128, 208]) {
      const nodes = scene('brightness', { target, context: false });
      const background = nodes.find(node => node.tag === 'rect' && node.props.width === 720);
      expect(background.props.fill).toBe('#ffffff');
      expect(targets(nodes)[0].props.fill).not.toBe(background.props.fill);
    }
  });

  it('Muller-Lyer fin controls never change shaft length', () => {
    const narrow = targets(scene('mullerLyer', { angle: 15, fin: 18 }));
    const wide = targets(scene('mullerLyer', { angle: 75, fin: 70 }));
    expect(wide).toEqual(narrow);
    const lengths = wide.map(node => Math.hypot(Number(node.props.x2) - Number(node.props.x1), Number(node.props.y2) - Number(node.props.y1)));
    expect(lengths[0]).toBeGreaterThan(0);
    expect(new Set(lengths).size).toBe(1);
  });

  it.each(IDS)('%s scenes remain finite for malformed state', id => {
    const defaults = engine.normalize().models[id];
    const corrupted = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, typeof value === 'number' ? Infinity : value]));
    const rendered = scene(id, { ...corrupted, reveal: true });
    expect(rendered.length).toBeGreaterThan(0);
    expect(JSON.stringify(rendered)).not.toMatch(/NaN|Infinity/);
    for (const node of rendered) for (const value of Object.values(node.props || {})) {
      if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
    }
  });

  it('hostile values cannot change the current experiment or escape bounded target brightness', () => {
    expect(engine.normalize({ experiment: '<script>' }).experiment).toBe('brightness');
    expect(engine.normalize({ models: { brightness: { target: -900 } } }).models.brightness.target).toBe(48);
    expect(engine.normalize({ models: { brightness: { target: 900 } } }).models.brightness.target).toBe(208);
    for (const value of [null, [], 'garbage']) expect(() => engine.normalize(value)).not.toThrow();
  });

  it('Cafe-wall measurement guides remain horizontal at every offset and mortar extreme', () => {
    for (const offset of [0, 50, 100]) for (const mortar of [1, 5, 14]) {
      const guides = scene('cafeWall', { offset, mortar, reveal: true }).filter(node => node.props?.['data-perception-guide']);
      expect(guides.length).toBeGreaterThan(4);
      for (const guide of guides) {
        expect(guide.tag).toBe('line');
        expect(guide.props.y1).toBe(guide.props.y2);
        expect(guide.props.x2).toBeGreaterThan(guide.props.x1);
        expect(guide.props.y1).toBeLessThan(480);
      }
    }
  });

  it('Necker face cues preserve all twelve projected cube edges', () => {
    const edges = model => scene('necker', model).filter(node => node.props?.['data-perception-edge']);
    const baseline = edges({ cue: 'none' });
    expect(baseline).toHaveLength(12);
    expect(edges({ cue: 'front' })).toEqual(baseline);
    expect(edges({ cue: 'back' })).toEqual(baseline);
    expect(scene('necker', { cue: 'front', context: false }).filter(node => node.tag === 'polygon')).toHaveLength(0);
  });

  it('moire rotates only the overlay and removing it leaves the base grid intact', () => {
    const grid = (nodes, value) => nodes.find(node => node.props?.['data-perception-grid'] === value);
    const flat = scene('moire', { angle: 0, spacing: 12 });
    const crossed = scene('moire', { angle: 15, spacing: 12 });
    expect(grid(crossed, 'base')).toEqual(grid(flat, 'base'));
    expect(grid(flat, 'overlay').props.transform).toBe('rotate(0 400 240)');
    expect(grid(crossed, 'overlay').props.transform).toBe('rotate(15 400 240)');
    const removed = scene('moire', { angle: 15, spacing: 12, context: false });
    expect(grid(removed, 'overlay')).toBeUndefined();
    expect(grid(removed, 'base')).toEqual(grid(flat, 'base'));
  });

  it('normalizes persisted records, caps notebook size, and bounds observations and notes', () => {
    const state = engine.normalize({ models: { brightness: { prediction: '<script>', note: 'a'.repeat(1000) } }, studies: Array.from({ length: 30 }, (_, id) => ({ id: String(id), experiment: 'brightness', model: { prediction: 'Left', note: 'b'.repeat(1000), contrast: 1000 } })) });
    expect(state.models.brightness.prediction).toBe('');
    expect(state.models.brightness.note).toHaveLength(500);
    expect(state.studies).toHaveLength(24);
    expect(state.studies[0].id).toBe('6');
    expect(state.studies.at(-1).model).toMatchObject({ prediction: 'Left', contrast: 100, note: 'b'.repeat(500) });
    expect(engine.normalize({ studies: [{ experiment: '<script>' }], comparison: { experiment: 'missing' } })).toMatchObject({ studies: [], comparison: null });
  });
});

describe('Perception Lab learner workflow', () => {
  it('renders meaningful SVG descriptions and associates every numeric control with a label', () => {
    for (const experiment of IDS) {
      const html = renderTool('perceptionLab', { perceptionLab: { experiment } });
      const holder = document.createElement('div');
      holder.innerHTML = html;
      const output = holder.querySelector('svg[role="img"]');
      expect(output, experiment).toBeTruthy();
      expect(output.querySelector('title')?.textContent.length, experiment).toBeGreaterThan(3);
      expect(output.querySelector('desc')?.textContent.length, experiment).toBeGreaterThan(15);
      for (const slider of holder.querySelectorAll('input[type="range"]')) {
        expect(slider.id, experiment).toBeTruthy();
        expect(holder.querySelector('label[for="' + slider.id + '"]'), slider.id).toBeTruthy();
      }
    }
  });

  it('changes surroundings through real controls while preserving the target and other experiments', async () => {
    await mount();
    const before = [...host.querySelectorAll('[data-perception-target]')].map(node => node.outerHTML);
    await input('perception-contrast', 25);
    expect(latest.models.brightness.contrast).toBe(25);
    expect([...host.querySelectorAll('[data-perception-target]')].map(node => node.outerHTML)).toEqual(before);
    const others = structuredClone(latest.models.ebbinghaus);
    await click('Remove surroundings');
    expect(latest.models.brightness.context).toBe(false);
    expect(host.querySelectorAll('[data-perception-context]')).toHaveLength(0);
    expect([...host.querySelectorAll('[data-perception-target]')].map(node => node.outerHTML)).toEqual(before);
    expect(latest.models.ebbinghaus).toEqual(others);
  });

  it('restores externally loaded experiment settings without replacing other tool data', async () => {
    await mount();
    const state = engine.normalize({ experiment: 'mullerLyer', models: { mullerLyer: { angle: 60, fin: 55, reveal: true } } });
    await act(async () => edit(state));
    expect(Number(host.querySelector('#perception-angle').value)).toBe(60);
    expect(Number(host.querySelector('#perception-fin').value)).toBe(55);
    expect(latest.experiment).toBe('mullerLyer');
    expect(latest.models.mullerLyer.reveal).toBe(true);
    expect(latestAll.otherTool).toEqual({ marker: 77 });
  });

  it('keeps drawing measurements hidden until an explicit reveal and supports hiding them again', async () => {
    await mount();
    expect(host.querySelector('[data-perception-result]')).toBeNull();
    expect(host.querySelectorAll('[data-perception-guide]')).toHaveLength(0);
    expect(host.querySelector('svg desc').textContent).not.toContain('Both squares: RGB');
    expect(announce).not.toHaveBeenCalled();
    await click('Reveal measurements');
    expect(latest.models.brightness.reveal).toBe(true);
    expect(host.querySelector('[data-perception-result]').textContent).toContain('Both squares: RGB 128, 128, 128.');
    expect(host.querySelectorAll('[data-perception-guide]').length).toBeGreaterThan(0);
    expect(host.querySelector('svg desc').textContent).toContain('Both squares: RGB');
    await click('Reveal measurements');
    expect(host.querySelector('[data-perception-result]')).toBeNull();
  });

  it('pins an immutable comparison with distinct accessible SVG descriptions', async () => {
    await mount();
    await input('perception-contrast', 35);
    await click('Pin comparison');
    const pinned = structuredClone(latest.comparison);
    const markup = host.querySelector('#perception-stage-reference').outerHTML;
    await input('perception-contrast', 90);
    expect(latest.models.brightness.contrast).toBe(90);
    expect(latest.comparison).toEqual(pinned);
    expect(host.querySelector('#perception-stage-reference').outerHTML).toBe(markup);
    const currentTitle = host.querySelector('#perception-stage-current title').id;
    expect(host.querySelector('#perception-stage-reference title').id).not.toBe(currentTitle);
    await click('Clear comparison');
    expect(latest.comparison).toBeNull();
    expect(host.querySelector('#perception-stage-reference')).toBeNull();
  });

  it('saves a chosen impression and note, then restores exact settings after another experiment', async () => {
    await mount();
    expect(button('Save observation').disabled).toBe(true);
    await click('Left');
    await input('perception-note', 'The left square looked brighter before removing its background.');
    await input('perception-contrast', 31);
    await click('Remove surroundings');
    await click('Save observation');
    expect(latest.studies).toHaveLength(1);
    const saved = structuredClone(latest.studies[0]);
    expect(saved.model).toMatchObject({ prediction: 'Left', context: false, contrast: 31, note: 'The left square looked brighter before removing its background.' });
    await act(async () => host.querySelector('[data-perception-experiment="cafeWall"]').click());
    await input('perception-offset', 72);
    await click('Restore observation');
    expect(latest.experiment).toBe('brightness');
    expect(latest.models.brightness).toEqual(saved.model);
    expect(latest.models.cafeWall.offset).toBe(72);
    expect(latest.studies[0]).toEqual(saved);
    expect(latestAll.otherTool).toEqual({ marker: 77 });
    expect(announce).toHaveBeenCalledWith('Observation settings restored.');
  });

  it('resets only the selected experiment and exits expanded view with Escape', async () => {
    await mount(engine.normalize({ models: { brightness: { contrast: 26, prediction: 'Left' }, cafeWall: { offset: 75 } } }));
    await click('Expand viewing area');
    expect(latest.expanded).toBe(true);
    await act(async () => host.querySelector('[data-perception-lab]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(latest.expanded).toBe(false);
    await click('Reset this experiment');
    expect(latest.models.brightness).toEqual(engine.normalize().models.brightness);
    expect(latest.models.cafeWall.offset).toBe(75);
  });

  it('exports the exact current SVG and announces failure without success when creation fails', async () => {
    vi.useFakeTimers();
    const create = vi.fn(() => 'blob:perception'), revoke = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
    const downloads = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ href: this.href, file: this.download }); });
    await mount();
    await input('perception-contrast', 48);
    await click('Reveal measurements');
    const svg = host.querySelector('#perception-stage-current').cloneNode(true);
    svg.setAttribute('width', '800'); svg.setAttribute('height', '480');
    svg.removeAttribute('class'); svg.setAttribute('style', 'background:#fff;overflow:hidden');
    const serialized = new XMLSerializer().serializeToString(svg);
    const blobSpy = vi.spyOn(globalThis, 'Blob');
    await click('Export SVG');
    expect(blobSpy).toHaveBeenCalledWith([serialized], { type: 'image/svg+xml;charset=utf-8' });
    expect(downloads).toEqual([{ href: 'blob:perception', file: 'perception-brightness.svg' }]);
    expect(announce).toHaveBeenCalledWith('Current experiment exported as SVG.');
    await act(async () => vi.runOnlyPendingTimers());
    expect(revoke).toHaveBeenCalledWith('blob:perception');
    announce.mockClear();
    create.mockImplementation(() => { throw new Error('no object URL'); });
    await click('Export SVG');
    expect(announce).toHaveBeenCalledWith('Export could not be created. Try again.');
    expect(announce).not.toHaveBeenCalledWith('Current experiment exported as SVG.');
  });

  it('opens registered science tools and preserves existing Art Studio settings during handoff', async () => {
    await mount({ experiment: 'cafeWall', models: { cafeWall: { offset: 66, mortar: 8 } } });
    await click('Open Optics Lab');
    expect(navigate).toHaveBeenCalledWith('opticsLab');
    await click('Open Art Studio');
    expect(navigate).toHaveBeenCalledWith('artStudio');
    // The lab uses drawing units; Op Art stores mortar as a percentage of its
    // complete row height. Eight units in a 60+8-unit row rounds to 12%.
    expect(latestAll.artStudio).toMatchObject({ tab: 'opArt', opStyle: 'cafeWall', opCafeOffset: 66, opCafeMortar: 12, pixelSize: 32, customSetting: true });
  });

  it('starts moire static, captures the displayed angle when paused, and rejects stale frames', async () => {
    await mount({ experiment: 'moire', models: { moire: { angle: 5 } } });
    expect(frames.size).toBe(0);
    await click('Play slow rotation');
    expect(frames.size).toBe(1);
    const frame = async time => act(async () => { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); });
    await frame(0);
    await frame(1000);
    const displayed = Number(host.querySelector('#perception-angle').value);
    expect(displayed).toBeGreaterThan(5);
    const stale = frames.values().next().value;
    await click('Pause rotation');
    expect(latest.models.moire.angle).toBe(displayed);
    expect(frames.size).toBe(0);
    await act(async () => stale(2000));
    expect(Number(host.querySelector('#perception-angle').value)).toBe(displayed);
  });

  it('cancels animation and local status when the active learner changes', async () => {
    await mount({ experiment: 'moire', models: { moire: { prediction: 'Both' } } });
    await click('Pin comparison');
    await click('Play slow rotation');
    const stale = frames.values().next().value;
    expect(frames.size).toBe(1);
    await act(async () => changeProfile('next-learner'));
    expect(frames.size).toBe(0);
    expect(host.querySelector('[role="status"]').textContent).toBe('');
    await act(async () => stale(1000));
    expect(frames.size).toBe(0);
    expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
  });

  it('freezes the displayed frame when reduced motion changes and keeps still controls usable', async () => {
    await mount({ experiment: 'moire', models: { moire: { angle: 5 } } });
    await click('Play slow rotation');
    const frame = async time => act(async () => { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); });
    await frame(0); await frame(1000);
    const displayed = Number(host.querySelector('#perception-angle').value), stale = frames.values().next().value;
    await act(async () => { media.matches = true; [...mediaListeners].forEach(listener => listener({ matches: true })); });
    expect(latest.models.moire.angle).toBe(displayed);
    expect(button('Play slow rotation').disabled).toBe(true);
    expect(frames.size).toBe(0);
    await act(async () => stale(2000));
    expect(Number(host.querySelector('#perception-angle').value)).toBe(displayed);
    await input('perception-angle', 12);
    expect(latest.models.moire.angle).toBe(12);
    await act(async () => { media.matches = false; [...mediaListeners].forEach(listener => listener({ matches: false })); });
    expect(button('Play slow rotation').disabled).toBe(false);
    expect(frames.size).toBe(0);
  });

  it('freezes the displayed angle when the page is hidden', async () => {
    await mount({ experiment: 'moire' }); await click('Play slow rotation');
    const frame = async time => act(async () => { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); });
    await frame(0); await frame(900);
    const displayed = Number(host.querySelector('#perception-angle').value);
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(frames.size).toBe(0);
    expect(latest.models.moire.angle).toBe(displayed);
    hidden.mockReturnValue(false);
    await act(async () => document.dispatchEvent(new Event('visibilitychange')));
    expect(button('Play slow rotation').getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps the shipped source and desktop public source identical', () => {
    expect(readFileSync('desktop/web-app/public/' + FILE, 'utf8')).toBe(readFileSync(FILE, 'utf8'));
  });
});
