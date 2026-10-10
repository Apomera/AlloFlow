import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['cafeWall', 'necker', 'moire'];
const SETTINGS = {
  cafeWall: [['offset', 72, 21], ['mortar', 11, 3], ['context', true, false]],
  necker: [['depth', 73, 112], ['context', true, false], ['cue', 'front', 'back']],
  moire: [['angle', 13.7, 4.2], ['spacing', 17, 11], ['context', true, false]],
};
const FULL_NOTE = ('Line one\n<script>window.reportAttack=1</script><img src="https://example.invalid/track" onerror="alert(1)"><svg onload="alert(2)">literal & < > " \'</svg>\n' + 'Learner observations stay intact. '.repeat(20)).slice(0, 500);
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes;
let deferUpdates, pendingUpdates, flushUpdates, frames, frameId;
let originalLang, originalDir;
const query = selector => host.querySelector(selector);
const card = () => query('[data-perception-inquiry]');
const capture = () => query('[data-perception-inquiry-start]');
const setting = () => query('[data-perception-inquiry-setting]');
const exportButton = () => query('[data-perception-inquiry-report]');
const model = () => latest.models[latest.experiment];
const rows = table => [...table.querySelectorAll('tbody tr')].map(row => [...row.children].map(cell => cell.textContent));

function seed(experiment = 'cafeWall') {
  return engine.normalize({ experiment, expanded: true,
    models: {
      brightness: { matching: true, target: 117, matchValue: 155, prediction: 'Right', note: 'PRIVATE OTHER EXPERIMENT NOTE' },
      cafeWall: { offset: 72, mortar: 11, context: true, prediction: 'Tilted', note: 'Starting wall note' },
      necker: { depth: 73, cue: 'front', context: true, prediction: 'Upper right', note: 'Starting cube note' },
      moire: { angle: 13.7, spacing: 17, context: true, prediction: 'Fine lines', note: 'Starting grid note' },
    }, comparison: { experiment: 'brightness', model: { target: 162, note: 'PRIVATE SAVED PIN' } },
    studies: [{ id: 'saved', experiment: 'necker', date: '2026-10-06T12:00:00.000Z', model: { prediction: 'Unsure', note: 'PRIVATE NOTEBOOK NOTE' } }],
  });
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('inquiry-report-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    flushUpdates = () => pendingUpdates.splice(0).forEach(setData);
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => { writes++; if (deferUpdates) pendingUpdates.push(update); else setData(update); },
      ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness); await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label) {
  const found = [...host.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
async function click(target) { expect(target).toBeTruthy(); await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
async function input(node, value) {
  expect(node).toBeTruthy(); const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function focus(node) { expect(node).toBeTruthy(); await act(async () => node.focus()); }
async function begin() { await act(async () => { card().open = true; card().dispatchEvent(new Event('toggle')); }); await focus(capture()); await click(capture()); expect(query('[data-perception-inquiry-comparison]')).toBeTruthy(); }
async function tick(time) { const scheduled = frames.entries().next().value; expect(scheduled).toBeTruthy(); frames.delete(scheduled[0]); await act(async () => scheduled[1](time)); }
const control = key => key === 'context' ? query('[data-perception-context-toggle]') : query('#perception-' + key);
async function change(key, value) { if (key === 'context') { if (model().context !== value) await click(control(key)); } else await input(control(key), value); }
function installDownloads() {
  const create = vi.fn(() => 'blob:perception-inquiry-report'), revoke = vi.fn(), downloads = [], timers = [];
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ filename: this.download, href: this.href }); });
  const NativeBlob = globalThis.Blob;
  const blob = vi.spyOn(globalThis, 'Blob').mockImplementation(function (parts, options) { return new NativeBlob(parts, options); });
  vi.spyOn(window, 'setTimeout').mockImplementation(function (callback, delay, ...args) { timers.push({ callback: () => callback(...args), delay }); return timers.length; });
  return { create, revoke, downloads, anchorClick, blob, timers };
}
function downloaded(downloads, index = 0) {
  const [parts, options] = downloads.blob.mock.calls[index];
  expect(options.type).toBe('text/html;charset=utf-8'); expect(downloads.create.mock.calls[index][0].type).toBe('text/html;charset=utf-8');
  const markup = parts.join(''); expect(markup).toMatch(/^<!doctype html>/i);
  return { markup, document: new DOMParser().parseFromString(markup, 'text/html') };
}
function flatten(nodes) { return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []); }
function expectGeometry(svg, id, values) {
  expect(svg).toBeTruthy(); expect(svg.tagName.toLowerCase()).toBe('svg'); expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 800 480');
  const expected = flatten(engine.scene(id, values)).filter(node => ['line', 'rect', 'circle', 'polygon', 'path'].includes(node.tag));
  const actual = [...svg.querySelectorAll('line,rect,circle,polygon,path')]; expect(actual).toHaveLength(expected.length);
  const attributes = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
  expected.forEach((node, index) => {
    expect(actual[index].tagName.toLowerCase()).toBe(node.tag);
    for (const [name, value] of Object.entries(node.props || {})) {
      if (['key', 'clipPath', 'id', 'style'].includes(name)) continue;
      expect(actual[index].getAttribute(attributes[name] || name), id + '.' + name).toBe(String(value));
    }
  });
  for (const node of flatten(engine.scene(id, values))) if (node.props?.['data-perception-grid']) {
    const grid = svg.querySelector('[data-perception-grid="' + node.props['data-perception-grid'] + '"]'); expect(grid).toBeTruthy(); expect(grid.getAttribute('transform')).toBe(node.props.transform ? String(node.props.transform) : null);
  }
}
function expectSafe(report) {
  const doc = report.document;
  expect(doc.querySelector('[data-perception-inquiry-report-document]')).toBeTruthy(); expect(doc.title.trim()).not.toBe('');
  expect(doc.documentElement.lang).not.toBe(''); expect(doc.querySelector('meta[charset]').getAttribute('charset').toLowerCase()).toBe('utf-8');
  expect(doc.querySelector('meta[name="viewport"]').getAttribute('content')).toContain('width=device-width');
  const csp = [...doc.querySelectorAll('meta[http-equiv]')].find(node => node.getAttribute('http-equiv').toLowerCase() === 'content-security-policy');
  expect(csp).toBeTruthy(); expect(csp.getAttribute('content')).toMatch(/default-src\s+'none'/); expect(csp.getAttribute('content')).toMatch(/style-src\s+'unsafe-inline'/);
  expect(csp.getAttribute('content')).toMatch(/base-uri\s+'none'/); expect(csp.getAttribute('content')).toMatch(/form-action\s+'none'/);
  expect(doc.querySelector('script,iframe,object,embed,link,base,form,img,video,audio,canvas,meta[http-equiv="refresh"]')).toBeNull();
  for (const node of doc.querySelectorAll('*')) for (const attr of node.attributes) {
    expect(attr.name).not.toMatch(/^on/i); expect(attr.name).not.toMatch(/^(?:src|srcset|action|formaction|poster)$/i);
    if (/href$/i.test(attr.name)) { expect(attr.value).not.toMatch(/^(?:javascript:|data:)/i); if (node.tagName.toLowerCase() !== 'a') expect(attr.value).not.toMatch(/^(?:https?:|\/\/)/i); }
  }
  const css = [...doc.querySelectorAll('style')].map(node => node.textContent).join('\n');
  expect(css).toMatch(/@media\s+print/); expect(css).toMatch(/@media\s*\(max-width:/); expect(css).toMatch(/forced-colors/); expect(css).not.toMatch(/@import|url\s*\(/i);
  const ids = [...doc.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
  expect(doc.querySelectorAll('[data-perception-inquiry-report-drawing]')).toHaveLength(2);
  for (const svg of doc.querySelectorAll('[data-perception-inquiry-report-drawing]')) {
    expect(svg.getAttribute('role')).toBe('img'); const refs = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean); expect(refs).toHaveLength(2);
    expect(refs).toEqual([svg.querySelector('title').id, svg.querySelector('desc').id]); refs.forEach(id => expect(doc.getElementById(id)).toBeTruthy());
  }
  expect(doc.body.textContent).not.toContain('PRIVATE OTHER EXPERIMENT NOTE'); expect(doc.body.textContent).not.toContain('PRIVATE SAVED PIN'); expect(doc.body.textContent).not.toContain('PRIVATE NOTEBOOK NOTE');
}
function expectPreserved(before, count) { expect(latestAll).toEqual(before); expect(writes).toBe(count); }
function expectReportPair(report, id, starting, current) {
  expectGeometry(report.document.querySelector('[data-perception-inquiry-report-drawing="starting"]'), id, starting);
  expectGeometry(report.document.querySelector('[data-perception-inquiry-report-drawing="current"]'), id, current);
  for (const [slot, value] of [['starting', starting], ['current', current]]) {
    expect(report.document.querySelector('[data-perception-inquiry-report-note="' + slot + '"]').textContent).toContain(value.note);
    expect(report.document.querySelector('[data-perception-inquiry-report-impression="' + slot + '"]').textContent).toContain(value.prediction || 'Not recorded');
  }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  originalLang = document.documentElement.getAttribute('lang'); originalDir = document.documentElement.getAttribute('dir'); announce = vi.fn(); writes = 0; deferUpdates = false; pendingUpdates = []; frames = new Map(); frameId = 0;
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener() {}, removeEventListener() {} })));
  vi.stubGlobal('HTMLDialogElement', window.HTMLDialogElement);
  Object.defineProperty(window.HTMLDialogElement.prototype, 'showModal', { configurable: true, writable: true, value() { this.open = true; } });
  Object.defineProperty(window.HTMLDialogElement.prototype, 'close', { configurable: true, writable: true, value() { this.open = false; } });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.set(++frameId, callback); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount()); host?.remove(); root = host = null; vi.restoreAllMocks(); vi.unstubAllGlobals();
  for (const [key, value] of [['lang', originalLang], ['dir', originalDir]]) if (value === null) document.documentElement.removeAttribute(key); else document.documentElement.setAttribute(key, value);
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
});

describe('Portable one-setting inquiry report plan', () => {
  it.each(IDS)('creates independent normalized %s snapshots with all changes in drawing order', id => {
    const baseline = seed(id).models[id], current = { ...baseline, ...Object.fromEntries(SETTINGS[id].map(([key, , value]) => [key, value])), reveal: true, prediction: 'Unsure', note: FULL_NOTE };
    const before = structuredClone(baseline), currentBefore = structuredClone(current), selected = SETTINGS[id][0][0];
    const changes = SETTINGS[id].map(([key, old, value]) => ({ key, before: old, after: value }));
    const result = engine.planInquiryReport(id, baseline, current, selected);
    expect(result).toEqual({ status: 'ready', experiment: id, selected, baseline: before, current: currentBefore, changes, otherChanges: changes.slice(1), selectedChanged: true, inquiryStatus: 'multiple' });
    expect(result.baseline).not.toBe(baseline); expect(result.current).not.toBe(current); expect(result.baseline).not.toBe(result.current); expect(baseline).toEqual(before); expect(current).toEqual(currentBefore);
    result.baseline.note = 'Mutated report baseline'; result.current[SETTINGS[id][0][0]] = 0; result.changes[0].before = 0;
    expect(baseline).toEqual(before); expect(current).toEqual(currentBefore);
  });
  it.each(IDS)('retains %s notes, impressions, and reveal independently without counting them as setting changes', id => {
    const baseline = seed(id).models[id], current = { ...baseline, prediction: 'Unsure', note: FULL_NOTE, reveal: true, unknown: 'discard me' };
    const result = engine.planInquiryReport(id, baseline, current, 'context');
    expect(result.inquiryStatus).toBe('unchanged'); expect(result.changes).toEqual([]); expect(result.otherChanges).toEqual([]); expect(result.selectedChanged).toBe(false);
    expect(result.baseline).toEqual(baseline); expect(result.current).toEqual(engine.normalizeModel(id, current)); expect(result.current.note).toBe(FULL_NOTE); expect(result.current).not.toHaveProperty('unknown');
  });
  it.each(IDS.flatMap(id => SETTINGS[id].map(([key, , value]) => [id, key, value])))('accepts chosen %s %s and identifies its sole change', (id, selected, value) => {
    const baseline = seed(id).models[id], current = { ...baseline, [selected]: value }, result = engine.planInquiryReport(id, baseline, current, selected);
    expect(result.selected).toBe(selected); expect(result.inquiryStatus).toBe('selected'); expect(result.selectedChanged).toBe(true); expect(result.otherChanges).toEqual([]);
    expect(result.changes).toEqual([{ key: selected, before: baseline[selected], after: value }]);
  });
  it.each(IDS)('honestly distinguishes a nonchosen %s change from chosen or multiple edits', id => {
    const baseline = seed(id).models[id], [[chosen], [other, , value], [third, , thirdValue]] = SETTINGS[id];
    const single = engine.planInquiryReport(id, baseline, { ...baseline, [other]: value }, chosen);
    expect(single.inquiryStatus).toBe('other'); expect(single.selectedChanged).toBe(false); expect(single.otherChanges).toEqual(single.changes);
    const multiple = engine.planInquiryReport(id, baseline, { ...baseline, [other]: value, [third]: thirdValue }, chosen);
    expect(multiple.inquiryStatus).toBe('multiple'); expect(multiple.selectedChanged).toBe(false); expect(multiple.otherChanges).toHaveLength(2);
  });
  it.each(IDS)('falls back to the first %s control for invalid chosen keys', id => {
    const baseline = seed(id).models[id];
    for (const selected of ['missing', 'reveal', 'note', '', null, undefined, {}]) expect(engine.planInquiryReport(id, baseline, baseline, selected).selected).toBe(SETTINGS[id][0][0]);
  });
  it('normalizes bounded drawing values and retains the 0.1 degree moire precision', () => {
    const result = engine.planInquiryReport('moire', { angle: 13.70001, spacing: 99 }, { angle: 14.26, spacing: -10, note: FULL_NOTE }, 'angle');
    expect(result.baseline.angle).toBe(13.7); expect(result.baseline.spacing).toBe(24); expect(result.current.angle).toBe(14.3); expect(result.current.spacing).toBe(8);
    expect(result.changes).toEqual([{ key: 'angle', before: 13.7, after: 14.3 }, { key: 'spacing', before: 24, after: 8 }]); expect(result.current.note).toBe(FULL_NOTE);
    expect(engine.planInquiryReport('cafeWall', { offset: -5, mortar: 99 }, { offset: 0, mortar: 14 }, 'offset').changes).toEqual([]);
    expect(engine.planInquiryReport('necker', { depth: 999, cue: 'invalid' }, { depth: 125, cue: 'none' }, 'depth').changes).toEqual([]);
  });
  it('makes separate models even when the same immutable model is passed for both views', () => {
    const baseline = Object.freeze(seed('moire').models.moire), result = engine.planInquiryReport('moire', baseline, baseline, 'angle');
    expect(result.baseline).toEqual(result.current); expect(result.baseline).not.toBe(result.current); result.current.note = 'new note'; expect(result.baseline.note).toBe(baseline.note);
  });
  it.each(['brightness', 'ebbinghaus', 'mullerLyer', 'missing', '', null, undefined, {}, 1])('withholds report data for unsupported inquiry experiment %j', id => {
    expect(engine.planInquiryReport(id, {}, {}, 'context')).toEqual({ status: 'unavailable' });
  });
  it.each([undefined, null, false, 0, '', [], 'model'].map(value => [value]))('withholds all report data for nonobject snapshot %j', bad => {
    expect(engine.planInquiryReport('moire', bad, {}, 'angle')).toEqual({ status: 'unavailable' });
    expect(engine.planInquiryReport('moire', {}, bad, 'angle')).toEqual({ status: 'unavailable' });
  });
  it.each(IDS)('supports normalizable empty %s snapshot objects', id => {
    const result = engine.planInquiryReport(id, {}, {}, 'context'); expect(result.status).toBe('ready'); expect(result.inquiryStatus).toBe('unchanged');
    expect(result.baseline).toEqual(engine.normalizeModel(id, {})); expect(result.current).toEqual(result.baseline); expect(result.current).not.toBe(result.baseline);
  });
});

describe('Portable captured and current inquiry HTML export', () => {
  it.each(IDS)('requires a captured %s starting view and removes export when the inquiry ends', async id => {
    await mount(seed(id)); expect(exportButton()).toBeNull(); await begin(); expect(exportButton().textContent).toBe('Export inquiry report'); expect(exportButton().disabled).toBe(false);
    await click(query('[data-perception-end-inquiry]')); expect(exportButton()).toBeNull();
  });
  it.each(['brightness', 'ebbinghaus', 'mullerLyer'])('leaves %s matching experiments without inquiry report controls', async id => { await mount(seed(id)); expect(exportButton()).toBeNull(); });
  it.each(IDS)('exports actual %s starting/current drawings, observations, and settings without workspace writes', async id => {
    await mount(seed(id)); await begin(); const starting = structuredClone(model());
    for (const [key, , value] of SETTINGS[id]) await change(key, value);
    await input(query('#perception-note'), 'Current full note\nsecond line'); await click('Unsure'); await click('Reveal measurements');
    const current = structuredClone(model()), before = structuredClone(latestAll), count = writes, baselineHTML = query('#perception-stage-reference').innerHTML;
    const downloads = installDownloads(); await focus(exportButton()); await click(exportButton());
    const report = downloaded(downloads); expectSafe(report); expectReportPair(report, id, starting, current);
    expect(downloads.downloads).toEqual([{ filename: 'perception-' + id + '-inquiry.html', href: 'blob:perception-inquiry-report' }]);
    const settings = report.document.querySelector('[data-perception-inquiry-report-settings]'); expect(settings.tagName).toBe('TABLE'); expect(rows(settings).length).toBeGreaterThanOrEqual(3);
    const changes = report.document.querySelector('[data-perception-inquiry-report-changes]'); expect(changes.tagName).toBe('TABLE'); expect(rows(changes)).toHaveLength(3);
    expect([...settings.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-perception-inquiry-report-setting'))).toEqual([...SETTINGS[id].map(([key]) => key), 'reveal']);
    expect([...changes.querySelectorAll('tbody tr')].map(row => row.getAttribute('data-perception-inquiry-report-setting'))).toEqual(SETTINGS[id].map(([key]) => key));
    expect(rows(settings).at(-1)).toEqual(['Measurements', 'Hidden', 'Revealed']);
    expect(report.document.querySelector('[data-perception-inquiry-report-selected]').getAttribute('data-perception-inquiry-report-selected')).toBe(SETTINGS[id][0][0]);
    expect(report.document.querySelector('[data-perception-inquiry-report-status]').getAttribute('data-perception-inquiry-report-status')).toBe('multiple');
    expect(report.document.querySelector('[data-perception-inquiry-report-status]').getAttribute('data-count')).toBe('3');
    expectPreserved(before, count); expect(query('#perception-stage-reference').innerHTML).toBe(baselineHTML); expect(document.activeElement).toBe(exportButton());
    expect(document.querySelector('a[download$=".html"]')).toBeNull(); expect(announce.mock.calls.at(-1)[0]).toMatch(/inquiry report exported/i);
  });
  it('preserves both full 500-character notes as literal text in a scriptless no-network report', async () => {
    const state = seed(); state.models.cafeWall.note = FULL_NOTE; await mount(state); await begin(); const starting = structuredClone(model());
    const currentNote = ('Current note\n' + FULL_NOTE).slice(0, 500); await input(query('#perception-note'), currentNote); await click('Unsure');
    const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads); expectSafe(report); expectReportPair(report, 'cafeWall', starting, model());
    expect(report.document.querySelector('[data-perception-inquiry-report-note="starting"]').textContent).toContain(FULL_NOTE);
    expect(report.document.querySelector('[data-perception-inquiry-report-note="current"]').textContent).toContain(currentNote);
    expect(report.markup).toContain('&lt;script&gt;'); expect(report.markup).not.toContain('<script>window.reportAttack'); expect(window.reportAttack).toBeUndefined();
  });
  it.each(IDS)('keeps captured and current %s measurement guides at their own recorded reveal state', async id => {
    const state = seed(id); state.models[id].reveal = true; await mount(state); await begin(); const starting = structuredClone(model());
    await click('Reveal measurements'); await change(SETTINGS[id][0][0], SETTINGS[id][0][2]); const downloads = installDownloads(); await click(exportButton());
    const report = downloaded(downloads); expectReportPair(report, id, starting, model());
    expect(report.document.querySelector('[data-perception-inquiry-report-guides="starting"]').textContent).toBe('Measurements: Revealed');
    expect(report.document.querySelector('[data-perception-inquiry-report-guides="current"]').textContent).toBe('Measurements: Hidden');
    expect(report.document.querySelector('[data-perception-inquiry-report-warning="guides"]').textContent).toMatch(/excluded from the drawing-setting count/i);
  });
  it.each(IDS)('reports no changed %s drawing settings when only note, impression, and guides change', async id => {
    await mount(seed(id)); await begin(); await input(query('#perception-note'), FULL_NOTE); await click('Unsure'); await click('Reveal measurements');
    const downloads = installDownloads(); await click(exportButton()); const doc = downloaded(downloads).document;
    expect(doc.querySelector('[data-perception-inquiry-report-status]').textContent).toMatch(/No drawing settings changed/i);
    expect(doc.querySelector('[data-perception-inquiry-report-changes]').querySelector('tbody tr')).toBeNull();
  });
  it('preserves empty notes and unrecorded impressions explicitly rather than borrowing a saved pin', async () => {
    const state = seed('moire'); state.models.moire.note = ''; state.models.moire.prediction = ''; await mount(state); await begin();
    const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads); expectSafe(report);
    for (const slot of ['starting', 'current']) {
      expect(report.document.querySelector('[data-perception-inquiry-report-note="' + slot + '"]').textContent).toMatch(/Not recorded/i);
      expect(report.document.querySelector('[data-perception-inquiry-report-impression="' + slot + '"]').textContent).toMatch(/Not recorded/i);
    }
  });
  it('keeps moire SVG references unique and self-contained in each exported view', async () => {
    await mount(seed('moire')); await begin(); await change('angle', 21.4); const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads); expectSafe(report);
    const titleIds = [...report.document.querySelectorAll('svg title')].map(node => node.id); expect(titleIds).toHaveLength(2); expect(new Set(titleIds).size).toBe(2);
    for (const svg of report.document.querySelectorAll('[data-perception-inquiry-report-drawing]')) for (const node of svg.querySelectorAll('[clip-path]')) {
      const id = node.getAttribute('clip-path').match(/^url\(#([^)]*)\)$/)?.[1]; expect(id).toBeTruthy(); expect(svg.querySelector('[id="' + id + '"]').tagName.toLowerCase()).toBe('clippath');
    }
  });
  it('snapshots the visible animated moire angle without pausing or persisting transient rotation', async () => {
    await mount(seed('moire')); await begin(); const starting = structuredClone(model()); await click('Play slow rotation'); await tick(0); await tick(800);
    const visible = Number(control('angle').value); expect(visible).not.toBe(starting.angle); const before = structuredClone(latestAll), count = writes, pending = frames.size;
    const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads);
    expectReportPair(report, 'moire', starting, { ...model(), angle: visible }); expectPreserved(before, count); expect(frames.size).toBe(pending); expect(button('Pause rotation')).toBeTruthy();
    expect(rows(report.document.querySelector('[data-perception-inquiry-report-settings]')).flat()).toContain(visible + '°'); await tick(1200); expect(Number(control('angle').value)).not.toBe(visible);
  });
  it('exports from the focused workspace and retains its dialog, chosen setting, and focus', async () => {
    await mount(seed('necker')); await click('Focus experiment'); await begin(); await input(setting(), 'cue'); await change('cue', 'back');
    const before = structuredClone(latestAll), count = writes, downloads = installDownloads(); await focus(exportButton()); await click(exportButton());
    expectSafe(downloaded(downloads)); expectPreserved(before, count); expect(query('[data-perception-focus-dialog]').open).toBe(true); expect(setting().value).toBe('cue'); expect(document.activeElement).toBe(exportButton());
  });
  it('reports both views even when a narrow layout displays only the starting drawing', async () => {
    await mount(seed('cafeWall')); await begin(); await change('offset', 23); await input(query('[data-perception-comparison-layout]'), 'switch'); await click(query('[data-perception-show-pinned]'));
    const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads); expectReportPair(report, 'cafeWall', seed().models.cafeWall, model());
    expect(query('[data-perception-show-pinned]').getAttribute('aria-pressed')).toBe('true');
  });
  it('exports the newest selected setting and current snapshot on each click without replacing the starting view', async () => {
    await mount(seed('moire'), { strict: true }); await begin(); const starting = structuredClone(model()), baselineHTML = query('#perception-stage-reference').innerHTML, downloads = installDownloads();
    await change('angle', 14.3); await click(exportButton()); const first = downloaded(downloads);
    await input(setting(), 'spacing'); await change('spacing', 9); await input(query('#perception-note'), 'A later observation'); await click(exportButton()); const second = downloaded(downloads, 1);
    expectReportPair(first, 'moire', starting, { ...starting, angle: 14.3 }); expectReportPair(second, 'moire', starting, model()); expect(downloads.downloads).toHaveLength(2); expect(query('#perception-stage-reference').innerHTML).toBe(baselineHTML);
    expect(first.document.body.textContent).not.toContain('A later observation'); expect(second.document.body.textContent).toContain('A later observation');
  });
  it.each(['profile', 'experiment'])('discards the inquiry export identity after an external %s switch', async kind => {
    await mount(seed()); await begin(); expect(exportButton()).toBeTruthy();
    if (kind === 'profile') await act(async () => changeProfile('other-learner')); else await act(async () => externalState(value => ({ ...value, experiment: 'moire' })));
    expect(exportButton()).toBeNull();
  });
  it('clears a temporary inquiry before a deferred experiment switch and never resurrects it on local renders', async () => {
    await mount(seed()); await begin(); const report = exportButton(), downloads = installDownloads(); deferUpdates = true;
    await act(async () => { query('[data-perception-experiment="moire"]').click(); report.click(); });
    expect(latest.experiment).toBe('cafeWall'); expect(pendingUpdates).toHaveLength(1); expect(exportButton()).toBeNull(); expect(downloads.downloads).toHaveLength(0);
    await focus(capture()); await act(async () => { card().open = false; card().dispatchEvent(new Event('toggle')); }); expect(exportButton()).toBeNull();
    deferUpdates = false; await act(async () => flushUpdates()); expect(latest.experiment).toBe('moire'); expect(exportButton()).toBeNull(); expect(downloads.downloads).toHaveLength(0);
  });
  it('retains the inquiry and export when the current experiment tile is reselected', async () => {
    await mount(seed('necker')); await begin(); await change('depth', 112); const before = structuredClone(model()), baseline = query('#perception-stage-reference').innerHTML;
    await click(query('[data-perception-experiment="necker"]')); expect(exportButton()).toBeTruthy(); expect(query('#perception-stage-reference').innerHTML).toBe(baseline);
    const downloads = installDownloads(); await click(exportButton()); expectReportPair(downloaded(downloads), 'necker', seed('necker').models.necker, before);
  });
  it('disables exporting and rejects a same-event report click while restoration is waiting for the parent', async () => {
    await mount(seed()); await begin(); await change('offset', 28); const downloads = installDownloads(), report = exportButton(), restore = query('[data-perception-inquiry-restore="selected"]'); deferUpdates = true;
    await act(async () => { restore.click(); report.click(); }); expect(downloads.downloads).toHaveLength(0); expect(exportButton().disabled).toBe(true); expect(pendingUpdates).toHaveLength(1);
    deferUpdates = false; await act(async () => flushUpdates()); expect(exportButton().disabled).toBe(false); await click(exportButton()); expect(downloads.downloads).toHaveLength(1);
  });
  it('disables exporting during a replacement capture and rejects a same-event click before its render', async () => {
    await mount(seed()); await begin(); await change('offset', 28); const downloads = installDownloads(), report = exportButton(); deferUpdates = true;
    await act(async () => { capture().click(); report.click(); }); expect(downloads.downloads).toHaveLength(0); expect(exportButton().disabled).toBe(true);
    deferUpdates = false; await act(async () => flushUpdates()); expect(exportButton().disabled).toBe(false); await click(exportButton());
    expectReportPair(downloaded(downloads), 'cafeWall', model(), model());
  });
  it('inherits locale and right-to-left direction while safely localizing its report headings', async () => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl';
    await mount(seed('moire'), { translate: (key, fallback) => /report|inquiry_starting_value|inquiry_current_value/.test(key) ? 'ترجمة <script>literal</script> ' + (fallback || key) : fallback || key });
    await begin(); const downloads = installDownloads(); await click(exportButton()); const report = downloaded(downloads); expectSafe(report);
    expect(report.document.documentElement.lang).toBe('ar'); expect(report.document.documentElement.dir).toBe('rtl'); expect(report.document.body.textContent).toContain('ترجمة <script>literal</script>'); expect(report.document.querySelector('script')).toBeNull();
  });
  it('uses a safe English language fallback when the host has no language declaration', async () => {
    document.documentElement.removeAttribute('lang'); document.documentElement.removeAttribute('dir'); await mount(seed()); await begin(); const downloads = installDownloads(); await click(exportButton());
    const report = downloaded(downloads); expect(report.document.documentElement.lang).toBe('en'); expect(report.document.documentElement.dir).not.toBe('rtl');
  });
  it('cleans the temporary anchor and revokes its URL after the native download starts', async () => {
    await mount(seed()); await begin(); const downloads = installDownloads(); await click(exportButton()); expect(downloads.downloads).toHaveLength(1); expect(document.querySelector('a[download]')).toBeNull();
    expect(downloads.revoke).not.toHaveBeenCalled(); expect(downloads.timers).toHaveLength(1); expect(downloads.timers[0].delay).toBe(1000); await act(async () => downloads.timers[0].callback()); expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-inquiry-report');
  });
  it.each(['HTML creation', 'Blob creation', 'URL creation', 'download start'])('recovers from %s failure and preserves every workspace setting and captured view', async phase => {
    await mount(seed()); await begin(); const before = structuredClone(latestAll), count = writes, baselineHTML = query('#perception-stage-reference').innerHTML, downloads = installDownloads();
    let failure;
    if (phase === 'HTML creation') failure = vi.spyOn(document.implementation, 'createHTMLDocument').mockImplementation(() => { throw new Error('HTML unavailable'); });
    if (phase === 'Blob creation') { failure = downloads.blob; failure.mockImplementation(function () { throw new Error('Blob unavailable'); }); }
    if (phase === 'URL creation') { failure = downloads.create; failure.mockImplementation(() => { throw new Error('Object URL unavailable'); }); }
    if (phase === 'download start') { failure = downloads.anchorClick; failure.mockImplementation(() => { throw new Error('Download blocked'); }); }
    announce.mockClear(); await click(exportButton()); expect(downloads.downloads).toHaveLength(0); expect(document.querySelector('a[download]')).toBeNull(); expect(exportButton().disabled).toBe(false);
    if (phase === 'download start') expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-inquiry-report'); else expect(downloads.revoke).not.toHaveBeenCalled();
    expect(announce.mock.calls.at(-1)[0]).toMatch(/report could not be created/i); expect(announce.mock.calls.some(([message]) => /exported/i.test(message))).toBe(false);
    expectPreserved(before, count); expect(query('#perception-stage-reference').innerHTML).toBe(baselineHTML);
  });
});
