import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Blob as NodeBlob } from 'node:buffer';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const KEYS = ['convergence', 'upperY', 'context'];
const START = { convergence: 82, upperY: 164, context: true, prediction: 'Upper', note: 'Starting perspective impression' };
const CHANGED = { convergence: 17, upperY: 253, context: false };
const flatten = nodes => (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []);
let engine, config, root, host, latest, latestAll, writes, externalState, changeProfile, pending, deferUpdates, announce, scroll;
const query = selector => host.querySelector(selector);
const model = () => latest.models.ponzo;
const stage = () => query('#perception-stage-current');
const card = () => query('[data-perception-inquiry]');
const setting = () => query('[data-perception-inquiry-setting]');
const restore = scope => query('[data-perception-inquiry-restore="' + scope + '"]');
const adjust = slot => query('[data-perception-inquiry-adjust="' + slot + '"]');
const control = key => key === 'context' ? query('[data-perception-context-toggle]') : query('#perception-' + key);
const scene = raw => flatten(engine.scene('ponzo', raw));
const targets = raw => scene(raw).filter(node => node.props?.['data-perception-target']).map(node => ({ tag: node.tag, props: node.props }));
const rails = raw => scene(raw).filter(node => node.props?.['data-perception-context']);

function seed() {
  return engine.normalize({ experiment: 'ponzo', models: {
    ponzo: START, brightness: { target: 119, contrast: 63, prediction: 'Right', note: 'PRIVATE OTHER NOTE' },
  }, comparison: { experiment: 'brightness', model: { target: 163, note: 'PRIVATE PIN NOTE' } },
  studies: [{ id: 'existing', experiment: 'necker', date: '2026-10-06T12:00:00.000Z', model: { note: 'PRIVATE NOTEBOOK NOTE', prediction: 'Unsure' } }] });
}
async function mount(value = seed(), strict = false) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { kept: 91 } });
    const [profile, setProfile] = React.useState('ponzo-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = fn => setData(previous => ({ ...previous, perceptionLab: fn(previous.perceptionLab) }));
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: fn => { writes++; if (deferUpdates) pending.push(() => setData(fn)); else setData(fn); } }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness); await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const node = [...scope.querySelectorAll('button')].find(item => (item.getAttribute('aria-label') || item.textContent).trim() === label);
  expect(node, label).toBeTruthy(); return node;
}
async function click(node) { expect(node).toBeTruthy(); await act(async () => (typeof node === 'string' ? button(node) : node).click()); }
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
async function input(node, value) {
  expect(node).toBeTruthy(); const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function change(key, value) { if (key === 'context') { if (model().context !== value) await click(control(key)); } else await input(control(key), value); }
async function begin() {
  await act(async () => { card().open = true; card().dispatchEvent(new Event('toggle')); });
  await focus(query('[data-perception-inquiry-start]')); await click(query('[data-perception-inquiry-start]')); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy();
}
function preserved(before) {
  expect(latest.comparison).toEqual(before.comparison); expect(latest.studies).toEqual(before.studies);
  for (const id of Object.keys(before.models)) if (id !== 'ponzo') expect(latest.models[id]).toEqual(before.models[id]);
  expect(latestAll.otherTool).toEqual({ kept: 91 }); expect(latest.experiment).toBe('ponzo');
}
function expectGeometry(svg, raw) {
  expect(svg).toBeTruthy(); const expected = scene(raw).filter(node => ['line', 'rect', 'circle', 'polygon', 'path'].includes(node.tag));
  // JSDOM XML selector lists can group by tag instead of preserving drawing order.
  const actual = [...svg.querySelectorAll('*')].filter(node => ['line', 'rect', 'circle', 'polygon', 'path'].includes(node.tagName.toLowerCase())); expect(actual).toHaveLength(expected.length);
  const attribute = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
  expected.forEach((node, index) => { expect(actual[index].tagName.toLowerCase()).toBe(node.tag); for (const [key, value] of Object.entries(node.props || {})) {
    if (['id', 'key', 'style', 'clipPath'].includes(key)) continue;
    expect(actual[index].getAttribute(attribute[key] || key), key).toBe(String(value));
  } });
}
function downloads() {
  const blobs = [], links = [], create = vi.fn(blob => { blobs.push(blob); return 'blob:ponzo-' + blobs.length; });
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: vi.fn() });
  const blob = vi.spyOn(globalThis, 'Blob');
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { links.push({ name: this.download, href: this.href }); });
  return { blobs, links, blob };
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  announce = vi.fn(); writes = 0; deferUpdates = false; pending = []; scroll = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1); vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(window.Element.prototype, 'scrollIntoView', { configurable: true, writable: true, value: scroll });
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.Element.prototype.scrollIntoView; delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Ponzo perspective experiment normalization and scientific geometry', () => {
  it('registers seventh and last with separately normalized perspective controls', () => {
    const state = engine.normalize(), meta = engine.experiments.find(item => item.id === 'ponzo');
    expect(engine.experiments.at(-1)).toBe(meta); expect(engine.experiments).toHaveLength(7);
    expect(Object.keys(state.models)).toHaveLength(7); expect(state.models.ponzo).toEqual({ context: true, reveal: false, prediction: '', note: '', convergence: 90, upperY: 175 });
    expect(meta.controls.map(({ key, min, max, value }) => ({ key, min, max, value }))).toEqual([{ key: 'convergence', min: 0, max: 100, value: 90 }, { key: 'upperY', min: 150, max: 260, value: 175 }]);
    expect(meta.choices).toEqual(['Upper', 'Lower', 'Same', 'Unsure']); expect(meta.source).toMatch(/^https:\/\//);
  });
  it.each([null, undefined, true, false, {}, [], '', '  ', 'bad', NaN, Infinity, -Infinity].map(value => [value]))('falls back to finite default controls for malformed %j', value => {
    const m = engine.normalizeModel('ponzo', { convergence: value, upperY: value });
    expect(m.convergence).toBe(90); expect(m.upperY).toBe(175);
    expect(JSON.stringify(scene({ convergence: value, upperY: value, reveal: true }))).not.toMatch(/NaN|Infinity/);
    for (const node of scene({ convergence: value, upperY: value, reveal: true })) for (const prop of Object.values(node.props || {})) if (typeof prop === 'number') expect(Number.isFinite(prop)).toBe(true);
  });
  it.each([[ -999, 0, 150 ], [ 999, 100, 260 ], [ '18.6', 19, 150 ], [ '252.6', 100, 253 ]])('clamps and rounds %j without unbounded drawing coordinates', (raw, convergence, upperY) => {
    expect(engine.normalizeModel('ponzo', { convergence: raw, upperY: raw })).toMatchObject({ convergence, upperY });
    for (const node of scene({ convergence: raw, upperY: raw, reveal: true })) for (const [name, prop] of Object.entries(node.props || {})) if (/^(?:x1|x2|x|y1|y2|y)$/.test(name)) { expect(prop).toBeGreaterThanOrEqual(0); expect(prop).toBeLessThanOrEqual(name[0] === 'x' ? 800 : 480); }
  });
  it('discards matching, swap, trial metadata, invalid impressions, and extra saved model fields', () => {
    const state = engine.normalize({ experiment: 'ponzo', models: { ponzo: { matching: true, matchValue: 999, swap: true, prediction: 'Left', note: 'a'.repeat(600), extra: true } },
      studies: [{ id: 'perspective', experiment: 'ponzo', date: '', model: START, repeat: { id: 'fake', trial: 1, startValue: 30 } }] });
    expect(state.models.ponzo).not.toHaveProperty('matching'); expect(state.models.ponzo).not.toHaveProperty('swap'); expect(state.models.ponzo).not.toHaveProperty('matchValue'); expect(state.models.ponzo).not.toHaveProperty('extra');
    expect(state.models.ponzo.prediction).toBe(''); expect(state.models.ponzo.note).toHaveLength(500); expect(state.studies[0]).not.toHaveProperty('repeat');
    expect(engine.matching).not.toHaveProperty('ponzo'); expect(engine.measurements('ponzo', START)).toBeNull(); expect(engine.createStudy('ponzo', START, 'fake')).toBeNull();
  });
  it.each([0, 25, 50, 90, 100])('keeps equal target rectangles when convergence is %i, even with context removed', convergence => {
    const visible = targets({ convergence, upperY: 175, context: true }), removed = targets({ convergence, upperY: 175, context: false });
    expect(visible).toEqual(removed); expect(visible).toHaveLength(2);
    expect(visible.map(node => node.props['data-perception-target'])).toEqual(['upper', 'lower']);
    for (const node of visible) { expect(node.tag).toBe('rect'); expect(node.props).toMatchObject({ x: 280, width: 240, height: 12 }); }
    expect(visible[0].props.y).toBe(169); expect(visible[1].props.y).toBe(344); expect(visible[0].props.fill).toBe(visible[1].props.fill);
    const context = rails({ convergence }); expect(context).toHaveLength(2); expect(rails({ convergence, context: false })).toHaveLength(0);
    const topGap = 600 - 4.6 * convergence;
    expect(context.map(node => node.props)).toEqual([
      expect.objectContaining({ x1: 400 - topGap / 2, y1: 40, x2: 100, y2: 440 }),
      expect.objectContaining({ x1: 400 + topGap / 2, y1: 40, x2: 700, y2: 440 }),
    ]);
  });
  it('keeps the painted perspective rails clear of every target corner across allowed convergence and height extremes', () => {
    for (const convergence of [0, 25, 50, 90, 100]) for (const upperY of [150, 175, 220, 260]) {
      const context = rails({ convergence, upperY });
      for (const target of targets({ convergence, upperY })) for (const x of [target.props.x, target.props.x + target.props.width]) for (const y of [target.props.y, target.props.y + target.props.height]) {
        for (let index = 0; index < context.length; index++) {
          const rail = context[index].props, dx = rail.x2 - rail.x1, dy = rail.y2 - rail.y1;
          const railX = rail.x1 + (y - rail.y1) * dx / dy;
          if (index === 0) expect(railX).toBeLessThan(target.props.x);
          else expect(railX).toBeGreaterThan(target.props.x + target.props.width);
          const distance = Math.abs(dy * x - dx * y + rail.x2 * rail.y1 - rail.y2 * rail.x1) / Math.hypot(dx, dy);
          expect(distance, 'painted rail clearance at convergence ' + convergence + ', upperY ' + upperY).toBeGreaterThan(rail.strokeWidth / 2);
        }
      }
    }
  });
  it.each([150, 175, 220, 260])('moves only the upper target vertically to %i while preserving both widths and perspective rails', upperY => {
    const nodes = targets({ upperY }), baseline = targets({ upperY: 175 });
    expect(nodes[0].props.y).toBe(upperY - 6); expect(nodes[0]).toEqual({ ...baseline[0], props: { ...baseline[0].props, y: upperY - 6 } }); expect(nodes[1]).toEqual(baseline[1]);
    expect(rails({ upperY })).toEqual(rails({ upperY: 175 }));
  });
  it.each([[0,150], [0,260], [100,150], [100,260]])('reveals bounded endpoint guides without altering target geometry at convergence %i and upperY %i', (convergence, upperY) => {
    expect(targets({ convergence, upperY, reveal: true })).toEqual(targets({ convergence, upperY, reveal: false }));
    expect(scene({ convergence, upperY, reveal: false }).filter(node => node.props?.['data-perception-guide'])).toHaveLength(0);
    const guides = scene({ convergence, upperY, reveal: true }).filter(node => node.props?.['data-perception-guide']); expect(guides.length).toBeGreaterThan(0);
    const vertical = guides.filter(node => node.tag === 'line' && node.props.x1 === node.props.x2);
    expect(vertical.map(node => node.props.x1)).toContain(280); expect(vertical.map(node => node.props.x1)).toContain(520);
  });
});

describe('Ponzo saved work and observable controls', () => {
  it('imports a valid observation, deduplicates its second import, and rejects fabricated repeated-study metadata', () => {
    const record = { id: 'imported', experiment: 'ponzo', date: '2026-10-06T12:00:00.000Z', model: engine.normalizeModel('ponzo', START) };
    const parsed = engine.parseNotebook(JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: [record] })); expect(parsed).toEqual({ status: 'ready', records: [record] });
    const before = seed(), snapshot = structuredClone(before), plan = engine.planNotebookImport(before, parsed.records);
    expect(plan.status).toBe('ready'); expect(plan.added).toBe(1); expect(plan.state.studies.at(-1)).toEqual(record); expect(plan.state.models).toEqual(before.models); expect(plan.state.comparison).toEqual(before.comparison); expect(before).toEqual(snapshot);
    expect(engine.planNotebookImport(plan.state, parsed.records)).toMatchObject({ status: 'unchanged', added: 0, skipped: 1 });
    expect(engine.parseNotebook(JSON.stringify({ schema: 'alloflow.perception.notebook', version: 1, studies: [{ ...record, repeat: { id: 'fake', trial: 1, startValue: 30 } }] })).status).toBe('records');
  });
  it.each(['Upper', 'Lower', 'Same', 'Unsure'])('records and restores the valid %s impression with exact Ponzo settings', async prediction => {
    await mount(); await input(query('#perception-note'), 'A saved perspective note'); await change('upperY', 211); await change('convergence', 64); await click(prediction); await click('Save observation');
    const saved = structuredClone(latest.studies.at(-1)); expect(saved).toMatchObject({ experiment: 'ponzo', model: { upperY: 211, convergence: 64, prediction, note: 'A saved perspective note' } });
    await change('upperY', 257); await change('convergence', 5); const row = query('[data-perception-study="' + saved.id + '"]'); await click(button('Restore observation', row));
    expect(model()).toEqual(saved.model); expect(latest.studies.at(-1)).toEqual(saved); expect(latestAll.otherTool).toEqual({ kept: 91 });
  });
  it('keeps the pinned Ponzo drawing fixed during control and context edits', async () => {
    await mount(); await click('Pin comparison'); const pin = structuredClone(latest.comparison), markup = query('#perception-stage-reference').innerHTML;
    await change('convergence', 0); await change('upperY', 260); await change('context', false); expect(latest.comparison).toEqual(pin); expect(query('#perception-stage-reference').innerHTML).toBe(markup); expectGeometry(stage(), model());
    expect(button('Reveal measurements')).toBeTruthy(); expect([...host.querySelectorAll('button')].some(node => node.textContent.trim() === 'Start three matches')).toBe(false);
  });
  it('changes perspective and target position without adding matching controls or altering the saved state of other experiments', async () => {
    await mount(); const before = structuredClone(latest);
    for (const key of KEYS.slice(0,2)) { const node = control(key); expect(node.type).toBe('range'); expect(node.labels.length).toBeGreaterThan(0); await change(key, CHANGED[key]); }
    const geometry = [...stage().querySelectorAll('[data-perception-target]')].map(node => node.outerHTML); await change('context', false); expect([...stage().querySelectorAll('[data-perception-target]')].map(node => node.outerHTML)).toEqual(geometry);
    expect(query('[data-perception-match]')).toBeNull(); preserved(before); expectGeometry(stage(), model());
  });
});

describe('Ponzo direct one-setting inquiry and scoped restoration', () => {
  it.each(KEYS.flatMap(key => ['selected','others'].map(scope => [key,scope])))('plans only %s %s changes while preserving full observations and immutable inputs', (key, scope) => {
    const baseline = engine.normalizeModel('ponzo', START), current = { ...baseline, ...CHANGED, prediction: 'Unsure', note: 'Current note', reveal: true }, snapshot = structuredClone(current);
    const result = engine.planInquiryRestore('ponzo', baseline, current, key, scope), restored = KEYS.filter(item => scope === 'selected' ? item === key : item !== key);
    expect(result).toEqual({ selected: key, changes: restored.map(item => ({ key: item, before: baseline[item], after: current[item] })), model: { ...current, ...Object.fromEntries(restored.map(item => [item, baseline[item]])) } });
    expect(current).toEqual(snapshot); expect(baseline).toEqual(engine.normalizeModel('ponzo', START));
  });
  it.each(KEYS.flatMap(key => ['selected','others'].map(scope => [key,scope])))('restores %s %s through native controls and retains its captured drawing, note, pin, and notebook', async (key, scope) => {
    await mount(); await begin(); const first = structuredClone(model()), firstMarkup = query('#perception-stage-reference').innerHTML;
    await input(setting(), key); for (const item of KEYS) await change(item, CHANGED[item]); await input(query('#perception-note'), 'Keep current note'); await click('Unsure'); await click('Reveal measurements');
    const before = structuredClone(latest), wanted = { ...model() }; for (const item of KEYS) if (scope === 'selected' ? item === key : item !== key) wanted[item] = first[item];
    await focus(restore(scope)); await click(restore(scope)); expect(model()).toEqual(wanted); preserved(before); expect(query('#perception-stage-reference').innerHTML).toBe(firstMarkup); expectGeometry(stage(), wanted); expectGeometry(query('#perception-stage-reference'), first); expect(document.activeElement).toBe(control(key));
  });
  it.each(KEYS.flatMap(key => ['controls','scene'].map(slot => [key,slot])))('opens the chosen %s control from %s without writing saved data', async (key, slot) => {
    await mount(); await click('Focus experiment'); await begin(); await input(setting(), key); const controls = card().parentElement.closest('details');
    if (slot === 'scene') await act(async () => { controls.open = false; controls.dispatchEvent(new Event('toggle')); });
    const before = structuredClone(latestAll), count = writes; await focus(adjust(slot)); await click(adjust(slot));
    expect(controls.open).toBe(true); expect(card().open).toBe(true); expect(document.activeElement).toBe(control(key)); expect(scroll.mock.instances).toContain(control(key)); expect(latestAll).toEqual(before); expect(writes).toBe(count);
  });
  it.each(['profile','experiment','model'])('rejects a pending scoped restore after external %s replacement', async kind => {
    await mount(); await begin(); await change('convergence', 12); deferUpdates = true; await click(restore('selected')); expect(pending).toHaveLength(1);
    if (kind === 'profile') await act(async () => changeProfile('new-learner'));
    else await act(async () => externalState(value => kind === 'experiment' ? { ...value, experiment: 'cafeWall' } : { ...value, models: { ...value.models, ponzo: { ...value.models.ponzo, convergence: 44, note: 'External note' } } }));
    const before = structuredClone(latestAll); deferUpdates = false; await act(async () => pending.splice(0).forEach(run => run())); expect(latestAll).toEqual(before);
  });
});

describe('Ponzo portable inquiry, SVG, and PNG export', () => {
  it.each(KEYS)('exports %s chosen setting with exact paired drawings and safe complete notes', async key => {
    await mount(); await begin(); await input(setting(), key); const starting = structuredClone(model()); for (const item of KEYS) await change(item, CHANGED[item]); await click('Reveal measurements'); await click('Unsure');
    const note = 'Full line one\n<script>window.attack=1</script><img src="https://example.invalid/private"> & literal < >'; await input(query('#perception-note'), note);
    const current = structuredClone(model()), before = structuredClone(latestAll), count = writes, download = downloads(); await click(query('[data-perception-inquiry-report]'));
    const [parts, options] = download.blob.mock.calls[0]; expect(options.type).toBe('text/html;charset=utf-8'); const markup = parts.join(''), report = new DOMParser().parseFromString(markup, 'text/html');
    expect(download.links[0].name).toBe('perception-ponzo-inquiry.html'); expectGeometry(report.querySelector('[data-perception-inquiry-report-drawing="starting"]'), starting); expectGeometry(report.querySelector('[data-perception-inquiry-report-drawing="current"]'), current);
    expect(report.querySelector('[data-perception-inquiry-report-note="current"]').textContent).toContain(note); expect(report.querySelector('script,img,iframe,object,link,form')).toBeNull();
    expect(report.querySelector('[data-perception-inquiry-report-selected]').getAttribute('data-perception-inquiry-report-selected')).toBe(key);
    expect([...report.querySelector('[data-perception-inquiry-report-changes]').querySelectorAll('tbody tr')].map(row => row.getAttribute('data-perception-inquiry-report-setting'))).toEqual(KEYS);
    expect(report.querySelector('[data-perception-inquiry-report-status]').getAttribute('data-perception-inquiry-report-status')).toBe('multiple');
    expect(report.body.textContent).not.toMatch(/PRIVATE OTHER NOTE|PRIVATE PIN NOTE|PRIVATE NOTEBOOK NOTE/); expect(report.querySelector('a[href]')?.getAttribute('href')).toBe(engine.experiments.at(-1).source); expect(latestAll).toEqual(before); expect(writes).toBe(count);
    for (const node of report.querySelectorAll('*')) for (const attribute of node.attributes) expect(attribute.name).not.toMatch(/^on/i);
  });
  it('exports its actual current SVG while preserving pin, notes, notebook, and other experiments', async () => {
    await mount(); await change('upperY', 249); await click('Reveal measurements'); const before = structuredClone(latestAll), count = writes, download = downloads();
    await click('Export SVG'); const [parts, options] = download.blob.mock.calls[0], exported = new DOMParser().parseFromString(parts.join(''), 'image/svg+xml');
    expect(options.type).toBe('image/svg+xml;charset=utf-8'); expect(exported.querySelector('parsererror')).toBeNull(); expectGeometry(exported.documentElement, model()); expect(download.links[0].name).toBe('perception-ponzo.svg'); expect(latestAll).toEqual(before); expect(writes).toBe(count);
  });
  it('renders the current Ponzo SVG to a high resolution opaque PNG without workspace writes', async () => {
    vi.stubGlobal('Blob', NodeBlob); const created = new Map(), images = [], encodings = [], files = [];
    vi.stubGlobal('URL', { createObjectURL: vi.fn(blob => { const key = 'blob:ponzo-png-' + (created.size + 1); created.set(key, blob); return key; }), revokeObjectURL: vi.fn() });
    vi.spyOn(window, 'Image').mockImplementation(function () { this.removeAttribute = vi.fn(); images.push(this); });
    const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() }; vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context); vi.spyOn(window.HTMLCanvasElement.prototype, 'toBlob').mockImplementation(callback => encodings.push(callback));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { files.push({ name: this.download, blob: created.get(this.getAttribute('href')) }); });
    await mount(); await change('convergence', 100); await click('Reveal measurements'); const before = structuredClone(latestAll), count = writes; await click('Export PNG');
    const source = new DOMParser().parseFromString(await created.get(images[0].src).text(), 'image/svg+xml'); expectGeometry(source.documentElement, model());
    await act(async () => images[0].onload()); expect(context.fillStyle).toBe('#fff'); expect(context.fillRect).toHaveBeenCalledWith(0, 0, 2400, 1440); expect(context.drawImage).toHaveBeenCalledWith(images[0], 0, 0, 2400, 1440);
    await act(async () => encodings.shift()(new NodeBlob(['encoded'], { type: 'image/png' }))); expect(files[0].name).toBe('perception-ponzo.png'); expect(files[0].blob.type).toBe('image/png'); expect(latestAll).toEqual(before); expect(writes).toBe(count);
  });
});
