import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const match = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (match.length !== 1) throw Error('Expected one production function: ' + name);
  const start = match[0].index + match[0][1].length, ending = '\n' + match[0][1] + '}';
  const end = source.indexOf(ending, start);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}
const token = productionFunction('dissectionEvidenceIdentityToken');
const normalize = productionFunction('normalizeDissectionEvidenceIdentities', { dissectionEvidenceIdentityToken: token });
function all(node, predicate, results = []) {
  if (!node || typeof node !== 'object') return results;
  if (Array.isArray(node)) { node.forEach(child => all(child, predicate, results)); return results; }
  if (predicate(node)) results.push(node);
  return all(node.props?.children, predicate, results);
}
function frame(id, index) {
  return { ...(id === undefined ? {} : { id }), image: 'data:image/jpeg;base64,' + ['YQ==', 'Yg==', 'Yw==', 'ZA==', 'ZQ==', 'Zg=='][index], layer: 'skin', layerName: 'Frame source ' + index, captureContents: 'specimen' };
}
const legacyFrames = [frame(42, 0), frame(42, 1), frame(undefined, 2), frame('a/b', 3), frame('a?b', 4), frame(0, 5)];
const notes = { 'frog|dorsal_skin': 'My evidence\nSecond observation line.' };

describe('dissection evidence identity preservation', () => {
  let config;
  beforeEach(() => {
    vi.useFakeTimers(); localStorage.clear(); resetStemLab();
    config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
  });
  afterEach(() => { vi.restoreAllMocks(); vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });
  function fixture(patch = {}) {
    const store = newStore({ dissection: { specimen: 'frog', activeLayer: 'skin', workspaceMode: 'advanced', reducedMotion: true, evidenceNotebookOpen: true, ...patch } });
    return { store, render: () => config.render(makeCtx({ toolData: store.toolData }, store)) };
  }
  function cards(tree) { return all(tree, node => node.type === 'article' && node.props['data-evidence-id'] != null); }
  function control(tree, prop, value) {
    const found = all(tree, node => node.type === 'button' && node.props[prop] === value)[0];
    expect(found, prop + '=' + value).toBeDefined();
    return found;
  }

  it('repairs only identities, reserves existing tokens, and produces stable unique focus targets', () => {
    const input = [frame(42, 0), frame(42, 1), frame('recovered-frame-2', 2), frame(undefined, 3), frame('a/b', 4), frame('a?b', 5)];
    const before = JSON.stringify(input);
    const normalized = normalize(input);
    expect(normalized).toHaveLength(input.length);
    expect(normalized[0]).toBe(input[0]);
    expect(normalized[2]).toBe(input[2]);
    expect(normalized[4]).toBe(input[4]);
    expect(normalized[1].id).not.toBe(input[2].id);
    expect(new Set(normalized.map(entry => token(entry.id))).size).toBe(input.length);
    expect(normalized.map(({ id, ...entry }) => entry)).toEqual(input.map(({ id, ...entry }) => entry));
    expect(normalize(normalized)).toEqual(normalized);
    expect(JSON.stringify(input)).toBe(before);
    expect(normalize([frame({ valueOf: null, toString: null }, 0), frame(null, 1)]).map(entry => typeof entry.id)).toEqual(['string', 'string']);
  });

  it('hydrates legacy frames, compares the chosen frame, removes just that frame, and retains repaired IDs after reload', () => {
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ schemaVersion: 21, visualEvidence: legacyFrames, organNotes: notes }));
    const lab = fixture(); lab.render(); vi.advanceTimersByTime(0);
    const hydrated = lab.store.toolData.dissection.visualEvidence;
    expect(hydrated.map(entry => entry.image)).toEqual(legacyFrames.map(entry => entry.image));
    expect(new Set(hydrated.map(entry => token(entry.id))).size).toBe(6);
    const secondId = hydrated[1].id;
    let tree = lab.render();
    expect(cards(tree)).toHaveLength(6);
    const dom = new DOMParser().parseFromString(ReactDOMServer.renderToStaticMarkup(tree), 'text/html');
    const notebookIds = [...dom.querySelectorAll('#diss-evidence-notebook [id]')].map(node => node.id);
    expect(new Set(notebookIds).size).toBe(notebookIds.length);
    control(tree, 'id', 'diss-evidence-compare-' + token(secondId)).props.onClick();
    tree = lab.render();
    expect(lab.store.toolData.dissection.referenceEvidenceId).toBe(secondId);
    expect(cards(tree).filter(card => card.props['data-reference'] === 'true').map(card => card.props['data-evidence-id'])).toEqual([String(secondId)]);
    const reference = all(tree, node => node.props?.className === 'diss-split-reference')[0];
    expect(all(reference, node => node.type === 'img')[0].props.src).toBe(legacyFrames[1].image);
    control(tree, 'data-evidence-remove-id', String(secondId)).props.onClick();
    tree = lab.render();
    expect(all(tree, node => node.props?.['data-evidence-confirm-remove-id'] != null)).toHaveLength(1);
    control(tree, 'data-evidence-confirm-remove-id', String(secondId)).props.onClick();
    const retained = lab.store.toolData.dissection.visualEvidence;
    expect(retained).toHaveLength(5);
    expect(retained.map(entry => entry.image)).toEqual(legacyFrames.filter((_, index) => index !== 1).map(entry => entry.image));
    expect(lab.store.toolData.dissection.organNotes).toEqual(notes);
    lab.render(); vi.advanceTimersByTime(150);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.visualEvidence).toEqual(retained);
    const reloaded = fixture(); reloaded.render(); vi.advanceTimersByTime(0);
    expect(reloaded.store.toolData.dissection.visualEvidence).toEqual(retained);
    expect(reloaded.store.toolData.dissection.organNotes).toEqual(notes);
  });

  it('repairs host-restored frame identities before native comparison and deletion callbacks use them', () => {
    const lab = fixture({ _dissLoadedSpec: 'frog', visualEvidence: legacyFrames, organNotes: notes });
    let tree = lab.render();
    const displayed = cards(tree);
    expect(displayed).toHaveLength(6);
    expect(all(tree, node => node.props?.['data-evidence-confirm-remove-id'] != null)).toHaveLength(0);
    const secondId = displayed[1].props['data-evidence-id'];
    control(tree, 'id', 'diss-evidence-compare-' + token(secondId)).props.onClick();
    tree = lab.render();
    expect(cards(tree).filter(card => card.props['data-reference'] === 'true')).toHaveLength(1);
    control(tree, 'data-evidence-remove-id', secondId).props.onClick();
    tree = lab.render();
    control(tree, 'data-evidence-confirm-remove-id', secondId).props.onClick();
    expect(lab.store.toolData.dissection.visualEvidence).toHaveLength(5);
    expect(lab.store.toolData.dissection.visualEvidence[0].image).toBe(legacyFrames[0].image);
    expect(lab.store.toolData.dissection.organNotes).toEqual(notes);
  });

  it('preserves a valid zero reference identity across saving and hydration', () => {
    const lab = fixture({ _dissLoadedSpec: 'frog', visualEvidence: [frame(0, 0), frame(1, 1)], referenceEvidenceId: 0, splitComparison: true });
    lab.render(); vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).referenceEvidenceId).toBe(0);
    const reloaded = fixture(); reloaded.render(); vi.advanceTimersByTime(0);
    expect(reloaded.store.toolData.dissection.referenceEvidenceId).toBe(0);
    expect(cards(reloaded.render()).filter(card => card.props['data-reference'] === 'true').map(card => card.props['data-evidence-id'])).toEqual(['0']);
  });

  it.each([
    [42, '42'], ['a/b', 'a?b'],
  ])('retains the selected frame when its raw ID %j collides with %j only in DOM targets', (firstId, selectedId) => {
    const frames = [frame(firstId, 0), frame(selectedId, 1), frame('latest', 2)];
    const selectedImage = frames[1].image;
    const lab = fixture({ _dissLoadedSpec: 'frog', visualEvidence: frames, referenceEvidenceId: selectedId, splitComparison: true });
    let tree = lab.render();
    let reference = all(tree, node => node.props?.className === 'diss-split-reference')[0];
    expect(all(reference, node => node.type === 'img')[0].props.src).toBe(selectedImage);
    vi.advanceTimersByTime(150);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.referenceEvidenceId).toBe(saved.visualEvidence[1].id);
    const reloaded = fixture(); reloaded.render(); vi.advanceTimersByTime(0);
    tree = reloaded.render();
    reference = all(tree, node => node.props?.className === 'diss-split-reference')[0];
    expect(all(reference, node => node.type === 'img')[0].props.src).toBe(selectedImage);
    expect(reloaded.store.toolData.dissection.referenceEvidenceId).toBe(saved.visualEvidence[1].id);
  });

  it.each([7, 8])('preserves all %i saved frames and the oldest reference through hydration, blocked capture, autosave, and deletion', count => {
    const frames = Array.from({ length: count }, (_, index) => ({ ...frame(100 + index, index % 6), layerName: 'Original frame ' + index }));
    localStorage.setItem('dissection_progress_frog', JSON.stringify({ schemaVersion: 21, visualEvidence: frames, referenceEvidenceId: 100, splitComparison: true, organNotes: notes }));
    const lab = fixture({ toolbarToolsOpen: true }); lab.render(); vi.advanceTimersByTime(0);
    expect(lab.store.toolData.dissection.visualEvidence).toEqual(frames);
    let tree = lab.render();
    expect(cards(tree)).toHaveLength(count);
    expect(cards(tree).filter(card => card.props['data-reference'] === 'true').map(card => card.props['data-evidence-id'])).toEqual(['100']);
    const html = ReactDOMServer.renderToStaticMarkup(tree);
    expect(html).toContain(count + ' existing frames');
    expect(html).toContain('remove at least ' + (count - 5) + ' frames');
    control(tree, 'data-evidence-capture', true).props.onClick();
    expect(lab.store.toolData.dissection.visualEvidence).toEqual(frames);
    expect(lab.store.toolData.dissection.procedureFeedback.message).toContain('no saved frame was replaced');
    expect(lab.store.toolData.dissection.procedureFeedback.message).toContain('remove at least ' + (count - 5) + ' frames');
    tree = lab.render(); vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).visualEvidence).toEqual(frames);
    const reload = fixture(); reload.render(); vi.advanceTimersByTime(0);
    expect(reload.store.toolData.dissection.visualEvidence).toEqual(frames);
    expect(reload.store.toolData.dissection.referenceEvidenceId).toBe(100);
    control(tree, 'data-evidence-remove-id', '100').props.onClick();
    tree = lab.render(); control(tree, 'data-evidence-confirm-remove-id', '100').props.onClick();
    expect(lab.store.toolData.dissection.visualEvidence).toEqual(frames.slice(1));
    expect(lab.store.toolData.dissection.organNotes).toEqual(notes);
    lab.render(); vi.advanceTimersByTime(150);
    expect(JSON.parse(localStorage.getItem('dissection_progress_frog')).visualEvidence).toEqual(frames.slice(1));
  });

  it('retains an over-capacity host notebook and remaps an early colliding reference without trimming', () => {
    const frames = Array.from({ length: 8 }, (_, index) => frame(100 + index, index % 6));
    frames[0].id = 'same/path'; frames[1].id = 'same?path';
    const lab = fixture({ _dissLoadedSpec: 'frog', visualEvidence: frames, referenceEvidenceId: 'same?path', splitComparison: true, organNotes: notes, toolbarToolsOpen: true });
    const tree = lab.render();
    expect(cards(tree)).toHaveLength(8);
    expect(cards(tree).filter(card => card.props['data-reference'] === 'true')).toHaveLength(1);
    const reference = all(tree, node => node.props?.className === 'diss-split-reference')[0];
    expect(all(reference, node => node.type === 'img')[0].props.src).toBe(frames[1].image);
    control(tree, 'data-evidence-capture', true).props.onClick();
    expect(lab.store.toolData.dissection.visualEvidence).toEqual(frames);
    lab.render(); vi.advanceTimersByTime(150);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.visualEvidence.map(entry => entry.image)).toEqual(frames.map(entry => entry.image));
    expect(saved.referenceEvidenceId).toBe(saved.visualEvidence[1].id);
  });

  it('keeps the explicit quota fallback warning and in-memory frames when an over-capacity notebook cannot fully save', () => {
    const frames = Array.from({ length: 8 }, (_, index) => frame(100 + index, index % 6));
    const nativeSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'dissection_progress_frog' && (JSON.parse(value).visualEvidence || []).length > 1) throw new DOMException('Storage full', 'QuotaExceededError');
      return nativeSet.call(this, key, value);
    });
    const lab = fixture({ _dissLoadedSpec: 'frog', visualEvidence: frames, referenceEvidenceId: 100, organNotes: notes });
    lab.render(); vi.advanceTimersByTime(150);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved.visualEvidence).toEqual([frames[7]]);
    expect(saved.organNotes).toEqual(notes);
    expect(lab.store.toolData.dissection.visualEvidence).toEqual(frames);
    expect(ReactDOMServer.renderToStaticMarkup(lab.render())).toContain('only the newest evidence frame was kept');
  });

  it.each([
    { schemaVersion: 999, visualEvidence: legacyFrames },
    { schemaVersion: 21, visualEvidence: [frame(42, 0), { id: 42, image: 'javascript:alert(1)' }] },
  ])('keeps unsafe or future-version records protected instead of migrating them: %j', record => {
    const raw = JSON.stringify({ ...record, organNotes: notes });
    localStorage.setItem('dissection_progress_frog', raw);
    const lab = fixture(); lab.render(); vi.advanceTimersByTime(0);
    expect(lab.store.toolData.dissection.visualEvidence).toEqual([]);
    expect(ReactDOMServer.renderToStaticMarkup(lab.render())).toContain('Protected saved progress');
    vi.advanceTimersByTime(150); window.dispatchEvent(new Event('pagehide'));
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
  });
});
