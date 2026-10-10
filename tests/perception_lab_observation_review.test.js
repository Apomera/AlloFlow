import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const IDS = ['brightness', 'ebbinghaus', 'mullerLyer', 'cafeWall', 'necker', 'moire', 'ponzo'];
const MATCHING = ['brightness', 'ebbinghaus', 'mullerLyer'];
const DATE = '2026-10-06T15:47:12.000Z';
const FULL_NOTE = ('Learner note line one\n<script>window.observationAttack=1</script><img src="https://example.invalid/track" onerror="alert(1)"><svg onload="alert(2)">literal & < > " \'</svg>\n' + 'The complete observation stays intact. '.repeat(16)).slice(0, 500);
let engine, config, root, host, latest, latestAll, externalState, changeProfile, announce, writes, frames, frameId;
let originalLang, originalDir;
const query = selector => host.querySelector(selector);
const dialog = () => query('[data-perception-drawing-viewer]');
const observation = () => query('[data-perception-observation-viewer]');
const scene = () => query('[data-perception-observation-scene]');
const review = id => query('[data-perception-review-observation="' + id + '"]');
const reportButton = () => query('[data-perception-export-observation-report]');
const row = id => query('[data-perception-study="' + id + '"]');
const tableRows = table => [...table.querySelectorAll('tbody tr')].map(node => [...node.children].map(cell => cell.textContent));
function record(experiment = 'ponzo', changes = {}, id = 'saved') {
  const meta = engine.experiments.find(item => item.id === experiment);
  return { id, experiment, date: DATE, model: engine.normalizeModel(experiment, {
    ...Object.fromEntries(meta.controls.map(control => [control.key, control.max])),
    context: false, reveal: false, prediction: meta.choices[1], note: FULL_NOTE, ...changes,
  }) };
}
function seed(records = [record()]) {
  return engine.normalize({ experiment: 'moire', expanded: true, studies: records,
    models: { moire: { angle: 13.2, spacing: 18, context: true, prediction: 'Both', note: 'PRIVATE CURRENT DRAFT' }, ponzo: { convergence: 12, upperY: 210, prediction: 'Upper', note: 'PRIVATE PONZO DRAFT' } },
    comparison: { experiment: 'necker', model: { depth: 73, cue: 'front', note: 'PRIVATE PIN' } },
  });
}
async function mount(value = seed(), { strict = false, translate } = {}) {
  function Harness() {
    const [data, setData] = React.useState({ perceptionLab: value, otherTool: { preserved: 37 } });
    const [profile, setProfile] = React.useState('observation-review-learner');
    latest = engine.normalize(data.perceptionLab); latestAll = data; changeProfile = setProfile;
    externalState = update => setData(previous => ({ ...previous, perceptionLab: typeof update === 'function' ? update(previous.perceptionLab) : update }));
    return config.render(makeCtx({ toolData: data, activeProfileId: profile, announceToSR: announce,
      setToolData: update => { writes++; setData(update); }, ...(translate ? { t: translate } : {}) }));
  }
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  const content = React.createElement(Harness); await act(async () => root.render(strict ? React.createElement(React.StrictMode, null, content) : content));
}
function button(label, scope = host) {
  const found = [...scope.querySelectorAll('button')].find(node => (node.getAttribute('aria-label') || node.textContent).trim() === label);
  expect(found, label).toBeTruthy(); return found;
}
async function click(target) { expect(target).toBeTruthy(); await act(async () => (typeof target === 'string' ? button(target) : target).click()); }
async function open(id = 'saved') { await act(async () => review(id).focus()); await click(review(id)); expect(dialog().open).toBe(true); expect(observation()).toBeTruthy(); }
async function close() { await click(button('Close enlarged drawing', dialog())); }
async function input(node, value) {
  expect(node).toBeTruthy(); const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value)); node.dispatchEvent(new Event(node instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true })); });
}
async function tick(time) { const next = frames.entries().next().value; expect(next).toBeTruthy(); frames.delete(next[0]); await act(async () => next[1](time)); }
function flatten(nodes) { return (Array.isArray(nodes) ? nodes : [nodes]).flatMap(node => node && typeof node === 'object' ? [node, ...flatten(node.children || [])] : []); }
function expectGeometry(svg, id, model) {
  expect(svg).toBeTruthy(); expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg'); expect(svg.getAttribute('viewBox')).toBe('0 0 800 480');
  const expected = flatten(engine.scene(id, model)).filter(node => ['line', 'rect', 'circle', 'polygon', 'path'].includes(node.tag));
  const actual = [...svg.querySelectorAll('line,rect,circle,polygon,path')]; expect(actual).toHaveLength(expected.length);
  const attributes = { strokeWidth: 'stroke-width', strokeDasharray: 'stroke-dasharray', strokeLinecap: 'stroke-linecap', strokeLinejoin: 'stroke-linejoin', fillOpacity: 'fill-opacity', strokeOpacity: 'stroke-opacity' };
  expected.forEach((node, i) => { expect(actual[i].tagName.toLowerCase()).toBe(node.tag); for (const [key, value] of Object.entries(node.props || {})) {
    if (['key', 'clipPath', 'id', 'style'].includes(key)) continue;
    expect(actual[i].getAttribute(attributes[key] || key), id + '.' + key).toBe(String(value));
  } });
  for (const node of flatten(engine.scene(id, model))) if (node.props?.['data-perception-grid']) {
    const grid = svg.querySelector('[data-perception-grid="' + node.props['data-perception-grid'] + '"]'); expect(grid).toBeTruthy(); expect(grid.getAttribute('transform')).toBe(node.props.transform ? String(node.props.transform) : null);
  }
}
function expectPreserved(before, beforeWrites) { expect(latestAll).toEqual(before); expect(writes).toBe(beforeWrites); }
function installDownloads() {
  const create = vi.fn(() => 'blob:perception-observation-report'), revoke = vi.fn(), downloads = [], timers = [];
  vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
  const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { downloads.push({ filename: this.download, href: this.href }); });
  const NativeBlob = globalThis.Blob;
  const blob = vi.spyOn(globalThis, 'Blob').mockImplementation(function (parts, options) { return new NativeBlob(parts, options); });
  vi.spyOn(window, 'setTimeout').mockImplementation(function (callback, delay, ...args) { timers.push({ callback: () => callback(...args), delay }); return timers.length; });
  return { create, revoke, downloads, anchorClick, blob, timers };
}
function downloaded(downloads, index = 0) {
  const [parts, options] = downloads.blob.mock.calls[index]; expect(options.type).toBe('text/html;charset=utf-8');
  const markup = parts.join(''); expect(markup).toMatch(/^<!doctype html>/i);
  return { markup, document: new DOMParser().parseFromString(markup, 'text/html') };
}
function expectSafeReport(report) {
  const doc = report.document; expect(doc.title.trim()).not.toBe(''); expect(doc.documentElement.lang).not.toBe('');
  expect(doc.querySelector('meta[charset]').getAttribute('charset').toLowerCase()).toBe('utf-8');
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
  expect(css).toMatch(/@media\s+print/); expect(css).toMatch(/forced-colors/); expect(css).not.toMatch(/@import|url\s*\(/i);
  const ids = [...doc.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
  const svg = doc.querySelector('svg'); expect(svg.getAttribute('role')).toBe('img');
  const labels = (svg.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean); expect(labels).toHaveLength(2); labels.forEach(id => expect(doc.getElementById(id)).toBeTruthy());
  for (const privateText of ['PRIVATE CURRENT DRAFT', 'PRIVATE PONZO DRAFT', 'PRIVATE PIN', 'PRIVATE OTHER OBSERVATION']) expect(doc.body.textContent).not.toContain(privateText);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true; resetStemLab(); config = loadTool('stem_lab/stem_tool_perception.js', 'perceptionLab'); engine = window.StemLab.PerceptionEngine;
  announce = vi.fn(); writes = 0; frames = new Map(); frameId = 0;
  originalLang = document.documentElement.getAttribute('lang'); originalDir = document.documentElement.getAttribute('dir');
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

describe('Ordinary saved-observation review plan', () => {
  it.each(IDS)('returns an independent normalized %s record and a stable saved-record identity', id => {
    const raw = seed([record(id)]), before = structuredClone(raw), plan = engine.planObservationReview(raw, 'saved');
    expect(plan).toEqual({ status: 'ready', record: before.studies[0], identity: JSON.stringify(before.studies[0]) });
    expect(plan.record).not.toBe(raw.studies[0]); expect(plan.record.model).not.toBe(raw.studies[0].model);
    const second = engine.planObservationReview(raw, 'saved'); expect(second.record.model).not.toBe(plan.record.model);
    plan.record.model.note = 'Mutated result'; plan.record.date = 'changed'; expect(raw).toEqual(before); expect(second.record).toEqual(before.studies[0]);
  });
  it.each([null, undefined, '', ' saved', 'saved ', 'SAVED', 1, true, false, {}, [], new String('saved')].map(value => [value]))('rejects nonexact primitive ID %j', id => {
    expect(engine.planObservationReview(seed(), id)).toEqual({ status: 'missing' });
  });
  it.each([null, undefined, false, 1, '', [], {}, { studies: 'records' }, { studies: [{ id: 'saved', experiment: 'unknown' }] }].map(value => [value]))('returns no data for missing record in %j', raw => {
    expect(engine.planObservationReview(raw, 'saved')).toEqual({ status: 'missing' });
  });
  it.each(MATCHING)('routes valid repeated %s records to study review', id => {
    const item = record(id, { matching: true }); item.repeat = { id: 'repeat', trial: 1, startValue: engine.matching[id].min };
    expect(engine.planObservationReview(seed([item]), item.id)).toEqual({ status: 'repeat' });
  });
  it('ignores live models, pin, expanded layout, unrelated records and notebook ordering in the identity', () => {
    const raw = seed(), identity = engine.planObservationReview(raw, 'saved').identity;
    raw.models.ponzo.convergence = 1; raw.models.moire.note = 'changed draft'; raw.comparison = null; raw.expanded = false; raw.experiment = 'necker';
    raw.studies.unshift(record('brightness', { note: 'Different observation' }, 'other'));
    expect(engine.planObservationReview(raw, 'saved').identity).toBe(identity); raw.studies.reverse(); expect(engine.planObservationReview(raw, 'saved').identity).toBe(identity);
  });
  it.each([['note', 'Changed saved note'], ['prediction', 'Same'], ['convergence', 0], ['upperY', 200], ['context', true], ['reveal', true]])('detects saved %s edits in the identity', (key, value) => {
    const raw = seed(), identity = engine.planObservationReview(raw, 'saved').identity; raw.studies[0].model[key] = value;
    expect(engine.planObservationReview(raw, 'saved').identity).not.toBe(identity);
  });
  it('normalizes controls and dates without mutating the caller', () => {
    const raw = { studies: [{ id: 'saved', experiment: 'moire', date: 'x'.repeat(41), model: { angle: 13.76, spacing: 999, note: 'x'.repeat(501), extra: true } }] }, before = structuredClone(raw);
    const plan = engine.planObservationReview(raw, 'saved'); expect(plan.record).toEqual(engine.normalize(raw).studies[0]);
    expect(plan.record.model).toMatchObject({ angle: 13.8, spacing: 24, note: 'x'.repeat(500) }); expect(plan.record.date.length).toBe(40);
    expect(plan.record.model).not.toHaveProperty('extra'); expect(raw).toEqual(before);
  });
});

describe('Read-only saved-observation viewer', () => {
  it.each(IDS.flatMap(id => [false, true].map(reveal => [id, reveal])))('reviews exact saved %s drawing with reveal=%s and preserves all tool data', async (id, reveal) => {
    const value = seed([record(id, { reveal })]); await mount(value); const before = structuredClone(latestAll), beforeWrites = writes;
    await open(); expectGeometry(scene(), id, value.studies[0].model);
    expect(observation().textContent).toContain(FULL_NOTE); expect(observation().textContent).toContain(value.studies[0].model.prediction);
    expect(observation().querySelector('time').dateTime).toBe(DATE); expect(query('[data-perception-observation-settings]')).toBeTruthy();
    expect(query('[data-perception-preview-guides="viewer"]')).toBeNull(); expect(query('[data-perception-preview-trial="viewer"]')).toBeNull();
    expect(observation().querySelector('input,select,textarea')).toBeNull(); expect(dialog().querySelector('img,script')).toBeNull();
    const guides = scene().querySelectorAll('[data-perception-guide]'); if (!reveal) expect(guides.length).toBe(0);
    expectPreserved(before, beforeWrites); await close(); expect(dialog().open).toBe(false); expect(observation()).toBeNull();
    expect(document.activeElement).toBe(review('saved')); expectPreserved(before, beforeWrites);
  });
  it.each(MATCHING.flatMap(id => [false, true].map(reveal => [id, reveal])))('keeps saved %s matching values reveal=%s without borrowing current values', async (id, reveal) => {
    const value = seed([record(id, { reveal, matching: true, matchValue: engine.matching[id].max - 3, context: true, swap: true })]); await mount(value); await open();
    expectGeometry(scene(), id, value.studies[0].model);
    const matchCell = query('[data-perception-observation-setting="matchValue"] td'); expect(matchCell).toBeTruthy();
    if (reveal) expect(matchCell.textContent).toContain(String(value.studies[0].model.matchValue));
    else expect(matchCell.textContent).toMatch(/hidden|unrevealed|not revealed/i);
    if (id === 'brightness') {
      const referenceCell = query('[data-perception-observation-setting="target"] td');
      if (reveal) expect(referenceCell.textContent).toContain(String(value.studies[0].model.target)); else expect(referenceCell.textContent).toMatch(/hidden|unrevealed|not revealed/i);
    }
  });
  it('keeps repeated records on their existing study-review path', async () => {
    const ordinary = record(), repeated = record('brightness', { matching: true }, 'repeated'); repeated.repeat = { id: 'group', trial: 1, startValue: 16 };
    await mount(seed([ordinary, repeated])); expect(review('saved')).toBeTruthy(); expect(review('repeated')).toBeNull(); expect(button('Review study', row('repeated'))).toBeTruthy();
    await click(button('Review study', row('repeated'))); expect(query('[data-perception-study-review="group"]')).toBeTruthy(); expect(dialog().open).toBe(false);
  });
  it.each(['remove', 'note', 'settings', 'reveal', 'date', 'repeat', 'profile'])('closes stale observation content after %s change', async kind => {
    await mount(seed([record('brightness', { matching: true })])); await open();
    await act(async () => { if (kind === 'profile') changeProfile('other-learner'); else externalState(previous => {
      const next = structuredClone(previous); const item = next.studies[0];
      if (kind === 'remove') next.studies = [];
      if (kind === 'note') item.model.note = 'Edited saved note';
      if (kind === 'settings') item.model.contrast = 0;
      if (kind === 'reveal') item.model.reveal = true;
      if (kind === 'date') item.date = '2026-10-06T16:01:00.000Z';
      if (kind === 'repeat') item.repeat = { id: 'new-study', trial: 1, startValue: 16 };
      return next;
    }); });
    expect(dialog().open).toBe(false); expect(observation()).toBeNull(); expect(dialog().querySelector('svg')).toBeNull(); expect(reportButton()).toBeNull();
  });
  it('stays open for drafts, pins, finder filters and notebook reordering', async () => {
    await mount(seed([record(), record('brightness', { note: 'PRIVATE OTHER OBSERVATION' }, 'other')])); await open();
    await input(query('[data-perception-notebook-search]'), 'matches no saved row');
    await act(async () => externalState(previous => ({ ...previous, experiment: 'cafeWall', comparison: null, studies: [...previous.studies].reverse(), models: { ...previous.models, moire: { ...previous.models.moire, note: 'Different live draft' } } })));
    expect(dialog().open).toBe(true); expect(observation().textContent).toContain(FULL_NOTE); expectGeometry(scene(), 'ponzo', latest.studies.find(item => item.id === 'saved').model);
    await close(); expect(document.activeElement.id).toMatch(/-notebook$/);
  });
  it('handles Escape, native cancel and native close with row focus return', async () => {
    await mount(); const before = structuredClone(latestAll), beforeWrites = writes;
    for (const kind of ['keyboard', 'cancel', 'close']) {
      await open(); const event = kind === 'keyboard' ? new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }) : new Event(kind, { bubbles: false, cancelable: kind === 'cancel' });
      await act(async () => { if (kind === 'close') dialog().open = false; dialog().dispatchEvent(event); });
      expect(dialog().open).toBe(false); expect(observation()).toBeNull(); expect(document.activeElement).toBe(review('saved'));
      if (kind !== 'close') expect(event.defaultPrevented).toBe(true); expectPreserved(before, beforeWrites);
    }
  });
  it('uses stable accessible SVG and dialog labels without duplicate IDs', async () => {
    await mount(); await open(); expect(document.activeElement).toBe(dialog().querySelector('h2'));
    const ids = [...host.querySelectorAll('[id]')].map(node => node.id); expect(new Set(ids).size).toBe(ids.length);
    for (const attr of ['aria-labelledby', 'aria-describedby']) for (const node of dialog().querySelectorAll('[' + attr + ']')) for (const id of node.getAttribute(attr).split(/\s+/)) expect(document.getElementById(id)).toBeTruthy();
    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }); await act(async () => document.activeElement.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true); expect(document.activeElement).toBe(observation().querySelector('a[href]'));
    const forward = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }); await act(async () => document.activeElement.dispatchEvent(forward));
    expect(forward.defaultPrevented).toBe(true); expect(document.activeElement).toBe(button('Close enlarged drawing', dialog()));
  });
  it('preserves slow rotation while inspecting and closing a saved drawing', async () => {
    await mount(); await click('Play slow rotation'); await tick(0); await tick(1200);
    const before = structuredClone(latestAll), beforeWrites = writes; await open();
    expect(button('Pause rotation').getAttribute('aria-pressed')).toBe('true'); expect(frames.size).toBeGreaterThan(0); await tick(2400);
    expect(dialog().open).toBe(true); expectPreserved(before, beforeWrites); await close(); expect(button('Pause rotation')).toBeTruthy(); expectPreserved(before, beforeWrites);
  });
  it('announces unsupported dialog opening without writing data', async () => {
    await mount(); dialog().showModal = () => { throw new Error('Modal unavailable'); }; const before = structuredClone(latestAll), beforeWrites = writes;
    await click(review('saved')); expect(dialog().open).toBe(false); expect(observation()).toBeNull(); expect(announce.mock.calls.some(([message]) => /could not|unavailable|failed/i.test(message))).toBe(true); expectPreserved(before, beforeWrites);
  });
  it('is stable through StrictMode and drops viewer content on unmount', async () => {
    await mount(seed(), { strict: true }); await open(); const before = structuredClone(latestAll), beforeWrites = writes;
    await close(); await open(); expectPreserved(before, beforeWrites); await act(async () => root.unmount()); root = null; expect(host.querySelector('dialog')).toBeNull();
  });
});

describe('Saved-observation viewing layout', () => {
  it('expands and contracts the drawing without editing the record or changing the exported scene', async () => {
    await mount(); await open(); const before = structuredClone(latestAll), beforeWrites = writes, savedScene = scene().outerHTML;
    const toggle = query('[data-perception-observation-full-width]'), layout = query('[data-perception-observation-layout]');
    expect(toggle.getAttribute('aria-controls')).toBe(layout.id); expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('true'); expect(layout.getAttribute('data-full-width')).toBe('true');
    expect(scene().outerHTML).toBe(savedScene); expectPreserved(before, beforeWrites);
    const downloads = installDownloads(); await click(reportButton()); const report = downloaded(downloads);
    expectSafeReport(report); expectGeometry(report.document.querySelector('svg'), latest.studies[0].experiment, latest.studies[0].model);
    expectPreserved(before, beforeWrites); await click(toggle); expect(toggle.getAttribute('aria-pressed')).toBe('false'); expect(scene().outerHTML).toBe(savedScene);
  });
  it('starts a new review with its default layout after closing the expanded drawing', async () => {
    await mount(); await open(); await click(query('[data-perception-observation-full-width]'));
    expect(query('[data-perception-observation-layout]').getAttribute('data-full-width')).toBe('true');
    await close(); await open(); expect(query('[data-perception-observation-full-width]').getAttribute('aria-pressed')).toBe('false');
    expect(query('[data-perception-observation-layout]').getAttribute('data-full-width')).toBe('false');
  });
});

describe('Portable saved-observation HTML report', () => {
  it.each(IDS)('exports the exact saved %s scene, complete notes, impression and timestamp independently of drafts and pin', async id => {
    const value = seed([record(id, { reveal: true }), record('necker', { note: 'PRIVATE OTHER OBSERVATION' }, 'other')]); await mount(value); await open();
    const before = structuredClone(latestAll), beforeWrites = writes, downloads = installDownloads(); await click(reportButton());
    expect(downloads.create).toHaveBeenCalledOnce(); expect(downloads.downloads).toHaveLength(1); expect(downloads.downloads[0].filename).toMatch(/\.html$/);
    const report = downloaded(downloads); expectSafeReport(report); expectGeometry(report.document.querySelector('svg'), id, value.studies[0].model);
    expect(report.document.body.textContent).toContain(FULL_NOTE); expect(report.document.body.textContent).toContain(value.studies[0].model.prediction);
    expect([...report.document.querySelectorAll('time')].some(node => node.dateTime === DATE)).toBe(true);
    expect([...report.document.querySelectorAll('a[href]')].some(node => node.href === engine.experiments.find(meta => meta.id === id).source)).toBe(true);
    expectPreserved(before, beforeWrites); expect(dialog().open).toBe(true); expect(document.querySelectorAll('a[download$=".html"]')).toHaveLength(0);
    downloads.timers.forEach(timer => timer.callback()); expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-observation-report');
  });
  it.each(MATCHING)('does not reveal hidden %s matching data or guides through report export', async id => {
    const value = seed([record(id, { matching: true, reveal: false, matchValue: engine.matching[id].max - 3 })]); await mount(value); await open();
    const downloads = installDownloads(); await click(reportButton()); const report = downloaded(downloads);
    expectGeometry(report.document.querySelector('svg'), id, value.studies[0].model); expect(report.document.querySelector('[data-perception-guide]')).toBeNull();
    expect(report.document.querySelector('[data-perception-observation-report-setting="matchValue"] td').textContent).toMatch(/hidden|unrevealed|not revealed/i);
    if (id === 'brightness') expect(report.document.querySelector('[data-perception-observation-report-setting="target"] td').textContent).toMatch(/hidden|unrevealed|not revealed/i);
    expect(report.document.querySelector('[data-perception-observation-report-result]').textContent).toContain('hidden when this observation was saved');
  });
  it('renders translated text as literal text without allowing markup or document injection', async () => {
    const translation = '<script>alert(7)</script><img src="https://example.invalid/translated">Literal translated heading';
    await mount(seed(), { translate: (key, fallback) => key.includes('observation') ? translation : fallback }); await open(); const downloads = installDownloads(); await click(reportButton());
    const report = downloaded(downloads); expectSafeReport(report); expect(report.document.body.textContent).toContain(translation);
  });
  it('preserves local language and RTL direction in the standalone document', async () => {
    document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; await mount(); await open(); const downloads = installDownloads(); await click(reportButton());
    const doc = downloaded(downloads).document; expect(doc.documentElement.lang).toBe('ar'); expect(doc.documentElement.dir).toBe('rtl');
  });
  it.each(['', 'invalid date'])('reports absent or invalid timestamps without inventing a saved date (%j)', async date => {
    const item = record(); item.date = date; await mount(seed([item])); await open(); const downloads = installDownloads(); await click(reportButton());
    const doc = downloaded(downloads).document; expect(doc.body.textContent).toMatch(/not recorded|unknown|unavailable/i);
    expect([...doc.querySelectorAll('time')].every(node => !Number.isNaN(Date.parse(node.dateTime)))).toBe(true);
  });
  it.each(['url', 'download'])('announces %s failure, removes allocated resources and preserves the observation', async kind => {
    await mount(); await open(); const before = structuredClone(latestAll), beforeWrites = writes, downloads = installDownloads();
    if (kind === 'url') downloads.create.mockImplementation(() => { throw new Error('Object URL unavailable'); }); else downloads.anchorClick.mockImplementation(() => { throw new Error('Download blocked'); });
    await click(reportButton()); expect(document.querySelectorAll('a[download$=".html"]')).toHaveLength(0); downloads.timers.forEach(timer => timer.callback());
    if (kind === 'download') expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-observation-report');
    expect(announce.mock.calls.some(([message]) => /could not|unavailable|failed/i.test(message))).toBe(true);
    expect(announce.mock.calls.some(([message]) => /report exported|report downloaded/i.test(message))).toBe(false); expectPreserved(before, beforeWrites); expect(dialog().open).toBe(true);
  });
  it('refuses an event from a stale export button after its saved record has changed', async () => {
    await mount(); await open(); const stale = reportButton(), downloads = installDownloads();
    await act(async () => externalState(previous => ({ ...previous, studies: previous.studies.map(item => ({ ...item, model: { ...item.model, note: 'Changed saved note' } })) })));
    await click(stale); expect(downloads.create).not.toHaveBeenCalled(); expect(downloads.downloads).toHaveLength(0); expect(observation()).toBeNull();
  });
  it('rechecks the saved-record identity after URL allocation before starting a download', async () => {
    await mount(); await open(); const downloads = installDownloads();
    downloads.create.mockImplementation(() => {
      latestAll.perceptionLab.studies[0].model.note = 'Host changed record during URL allocation';
      return 'blob:perception-observation-report';
    });
    await click(reportButton()); expect(downloads.create).toHaveBeenCalledOnce(); expect(downloads.downloads).toHaveLength(0);
    downloads.timers.forEach(timer => timer.callback()); expect(downloads.revoke).toHaveBeenCalledWith('blob:perception-observation-report');
    expect(document.querySelectorAll('a[download$=".html"]')).toHaveLength(0);
    expect(announce.mock.calls.some(([message]) => /report exported/i.test(message))).toBe(false);
  });
});
