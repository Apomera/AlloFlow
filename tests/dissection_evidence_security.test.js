import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const fixtures = [];
const settle = () => new Promise(resolve => setTimeout(resolve, 30));
const safeImage = 'data:image/jpeg;base64,eA==';
const forbiddenImages = [
  'javascript:window.__dissectionEvidenceExecuted=true',
  'JaVaScRiPt:alert(1)',
  ' javascript:alert(1)',
  'java\nscript:alert(1)',
  'https://example.invalid/track.gif?student=private',
  '//example.invalid/track.gif',
  '/unexpected-evidence-fetch',
  'file:///C:/private.png',
  'blob:https://example.invalid/not-an-owned-frame',
  'data:text/html;base64,PHNjcmlwdD4=',
  'data:image/svg+xml;base64,PHN2Zz4=',
  'data:image/png;charset=utf-8;base64,eA==',
  'data:image/png;base64,eA==;javascript:alert(1)',
  'data:image/png;base64,eA==\n',
  'data:image/png;base64,',
  'data:image/png,%89PNG',
];

function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = '\n' + match[1] + '}', end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing production function end: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const imageFormat = productionFunction('dissectionEvidenceImageFormat');
const plainRecord = productionFunction('isPlainDissectionRecord');
const inspectStored = productionFunction('inspectDissectionStoredValue', {
  isPlainDissectionRecord: plainRecord,
  DISSECTION_SAVE_SCHEMA_VERSION: 21,
  dissectionEvidenceImageFormat: imageFormat,
  isValidDissectionAnnotation: productionFunction('isValidDissectionAnnotation', { isPlainDissectionRecord: plainRecord }),
});
const fileToken = productionFunction('evidenceFileToken');

async function mountLab(patch = {}) {
  const config = window.StemLab._registry.dissection || loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), awardXP = vi.fn(), pluginInstanceToken = {};
  let state;
  const initial = {
    specimen: 'frog', _dissLoadedSpec: 'frog', activeLayer: 'skin', anatomicalView: 'dorsal',
    workspaceMode: 'advanced', reducedMotion: true, soundEnabled: false,
    exploredOrgans: { 'frog|nictitating': true }, verifiedIdentifications: {},
    organNotes: { 'frog|nictitating': 'Current observation must survive.' },
    organConfidence: { 'frog|nictitating': 2 }, procedureByLayer: {},
    visualEvidence: [], evidenceNotebookOpen: true, splitComparison: true,
    ...patch,
  };
  function Component() {
    const [toolData, setToolData] = React.useState({ dissection: initial });
    state = toolData.dissection;
    return config.render(makeCtx({ toolData, setToolData, awardXP, pluginInstanceToken }));
  }
  const fixture = {
    host, awardXP, get state() { return state; },
    async click(node) {
      expect(node).not.toBeNull();
      await act(async () => { node.click(); });
      await act(async () => { await settle(); });
    },
    async close() {
      await act(async () => { root.unmount(); }); host.remove();
      await act(async () => { await settle(); });
    },
  };
  fixtures.push(fixture);
  await act(async () => { root.render(React.createElement(Component)); });
  await act(async () => { await settle(); });
  return fixture;
}

function observationWork(state) {
  return structuredClone(Object.fromEntries(['exploredOrgans', 'verifiedIdentifications', 'organNotes', 'organConfidence', 'procedureByLayer'].map(key => [key, state[key]])));
}

beforeEach(() => {
  localStorage.clear(); resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(async () => {
  for (const fixture of fixtures.splice(0).reverse()) await fixture.close();
  await new Promise(resolve => setTimeout(resolve, 150));
  localStorage.clear(); document.getElementById('allo-live-dissection')?.remove();
  window._dissectionKeyHandler = null; vi.restoreAllMocks();
});

describe('dissection raster evidence boundary', () => {
  it.each([
    ['data:image/png;base64,eA==', 'png'],
    ['data:image/jpeg;base64,QUFB', 'jpeg'],
    ['data:image/webp;base64,QUFB', 'webp'],
    ['DATA:IMAGE/JPEG;BASE64,eA==', 'jpeg'],
    ['data:image/jpeg;base64,AAA', 'jpeg'],
    ['data:image/jpeg;base64,1', 'jpeg'],
  ])('accepts the inline raster URL %s without requiring decoded pixel signatures', (image, format) => {
    expect(imageFormat(image)).toBe(format);
  });

  it('rejects navigation schemes, remote fetches, active document formats, extra parameters and empty payloads', () => {
    for (const image of forbiddenImages) expect(imageFormat(image), image).toBeNull();
  });

  it('does not coerce host-supplied objects or non-string values into URLs', () => {
    const toString = vi.fn(() => safeImage);
    for (const value of [null, undefined, false, 1, [], {}, { toString }]) expect(imageFormat(value)).toBeNull();
    expect(toString).not.toHaveBeenCalled();
  });

  it('protects a stored record containing an unsafe image rather than modifying its original bytes', () => {
    for (const image of [...forbiddenImages, 1, {}]) {
      const raw = JSON.stringify({ schemaVersion: 21, organNotes: { 'frog|nictitating': 'Saved note must survive.' }, visualEvidence: [{ id: 1, image, layer: 'skin' }] });
      localStorage.setItem('dissection_progress_frog', raw);
      const inspection = inspectStored('dissection_progress_frog');
      expect(inspection.ok, String(image)).toBe(false);
      expect(inspection.kind).toBe('unsafe-shape'); expect(inspection.field).toMatch(/visualEvidence/);
      expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
    }
  });

  it('keeps compatible legacy empty frames and valid raster records readable', () => {
    for (const frame of [{ id: 1 }, { id: 1, image: null }, { id: 1, image: '' }, { id: 1, image: false }, { id: 1, image: safeImage }]) {
      localStorage.setItem('dissection_progress_frog', JSON.stringify({ schemaVersion: 21, visualEvidence: [frame] }));
      expect(inspectStored('dissection_progress_frog').ok).toBe(true);
    }
  });
});

describe('dissection evidence download sink', () => {
  it('never creates a link or clicks a navigation for unsafe evidence images', () => {
    const feedback = vi.fn(), addToast = vi.fn();
    const create = vi.spyOn(document, 'createElement');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const download = productionFunction('downloadEvidence', {
      dissectionEvidenceImageFormat: imageFormat, evidenceFileToken: fileToken, specimen: 'frog', setProcedureFeedback: feedback, addToast,
    });
    for (const image of [...forbiddenImages, { toString: () => safeImage }]) {
      create.mockClear(); click.mockClear(); feedback.mockClear(); addToast.mockClear();
      expect(download({ id: 1, image, layer: 'skin' })).toBe(false);
      expect(create).not.toHaveBeenCalled(); expect(click).not.toHaveBeenCalled();
      expect(feedback).toHaveBeenCalledWith(expect.any(String), 'caution');
      expect(addToast.mock.calls.some(call => call[1] === 'success')).toBe(false);
    }
  });

  it.each([['png', 'png'], ['jpeg', 'jpg'], ['webp', 'webp']])('downloads a valid %s frame with the matching file extension', (mime, extension) => {
    const links = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { links.push({ href: this.getAttribute('href'), download: this.download }); });
    const download = productionFunction('downloadEvidence', {
      dissectionEvidenceImageFormat: imageFormat, evidenceFileToken: fileToken, specimen: 'frog', setProcedureFeedback: vi.fn(), addToast: vi.fn(),
    });
    const image = 'data:image/' + mime + ';base64,eA==';
    download({ id: 1, image, layer: 'skin' });
    expect(links).toEqual([{ href: image, download: 'frog_skin_1.' + extension }]);
  });
});

describe('dissection evidence DOM and protected save integration', () => {
  it('omits unsafe host-state frames from thumbnails, split comparison and available downloads', async () => {
    const frames = forbiddenImages.map((image, index) => ({ id: index + 1, image, layer: 'skin', view: 'dorsal' }));
    const f = await mountLab({ visualEvidence: frames, referenceEvidenceId: frames[0].id });
    const before = observationWork(f.state);
    expect(f.host.querySelector('.diss-evidence__item img')).toBeNull();
    expect(f.host.querySelector('.diss-split-reference img')).toBeNull();
    expect(f.host.querySelector('button[aria-label^="Download frame"]')).toBeNull();
    expect(observationWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('retains valid inline evidence and downloads it without changing observations or scores', async () => {
    const links = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { links.push(this.getAttribute('href')); });
    const f = await mountLab({ visualEvidence: [{ id: 101, image: safeImage, layer: 'skin', view: 'dorsal' }], referenceEvidenceId: 101 });
    const before = observationWork(f.state);
    const thumbnail = f.host.querySelector('.diss-evidence__item img'), comparison = f.host.querySelector('.diss-split-reference img');
    expect(thumbnail?.getAttribute('src')).toBe(safeImage); expect(comparison?.getAttribute('src')).toBe(safeImage);
    await f.click(f.host.querySelector('button[aria-label^="Download frame"]'));
    expect(links).toEqual([safeImage]); expect(observationWork(f.state)).toEqual(before); expect(f.awardXP).not.toHaveBeenCalled();
  });

  it('keeps unsafe persisted bytes and current-session observations unchanged when autosave flushes', async () => {
    const raw = JSON.stringify({ schemaVersion: 21, activeLayer: 'skin', organNotes: { 'frog|nictitating': 'Saved note must survive.' }, visualEvidence: [{ id: 1, image: 'javascript:window.__dissectionEvidenceExecuted=true', layer: 'skin' }] });
    localStorage.setItem('dissection_progress_frog', raw);
    const f = await mountLab(), before = observationWork(f.state);
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 180)); window.dispatchEvent(new Event('pagehide')); });
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
    expect(observationWork(f.state)).toEqual(before); expect(f.state.organNotes['frog|nictitating']).toBe('Current observation must survive.');
    expect(f.host.querySelector('[data-dissection-protected-save]')).not.toBeNull();
    expect(f.host.querySelector('.diss-evidence__item img')).toBeNull(); expect(f.awardXP).not.toHaveBeenCalled();
  });
});
