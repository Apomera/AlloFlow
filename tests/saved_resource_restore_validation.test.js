import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

let restore;
beforeEach(() => {
  window.AlloModules = {};
  new Function('window', readFileSync(process.env.ALLO_MISC_CANDIDATE || 'misc_handlers_module.js', 'utf8'))(window);
  restore = window.AlloModules.MiscHandlers.handleRestoreView;
});
afterEach(() => { delete window.__alloLazyDirectionsResult; });
function deps() {
  const names = ['setActiveView', 'setGeneratedContent', 'setIsMapLocked', 'setWorkspacePane', 'setDirectionsProgress', 'setInputText', 'setSourceTopic', 'setActiveSidebarTab', 'setExpandedTools', 'setPendingReadingBookSlug', 'setPendingReadingSet', 'setIsReadingLibraryOpen', 'setLabToolData', 'setStemLabTool', 'setShowStemLab', '_alloRequestStemPlugin', '_alloFollowResourceLive'];
  const d = Object.fromEntries(names.map(name => [name, vi.fn()]));
  return { ...d, isTeacherMode: false, isWide: false, history: [], directionsProgress: {}, addToast: vi.fn(), t: key => key, mutationNames: names };
}
const invalid = [
  ['missing record', undefined], ['null record', null], ['array record', []], ['text record', 'lesson'],
  ['missing type', {}], ['null type', { type: null }], ['empty type', { type: '' }], ['blank type', { type: '   ' }], ['object type', { type: {} }],
  ['book without data', { type: 'readingBook' }], ['book without slug', { type: 'readingBook', data: {} }], ['book with blank slug', { type: 'readingBook', data: { slug: '  ' } }], ['book with nontext slug', { type: 'readingBook', data: { slug: {} } }],
  ['set without books', { type: 'readingSet', data: {} }], ['set with empty books', { type: 'readingSet', data: { books: [] } }], ['set with malformed books', { type: 'readingSet', data: { books: {} } }],
  ['manipulative without tool', { type: 'manipulative-resource' }], ['manipulative with blank tool', { type: 'manipulative-resource', toolId: '  ' }], ['manipulative with nontext tool', { type: 'manipulative-resource', toolId: {} }],
  ['empty transcript', { type: 'video-transcript', data: {} }], ['blank transcript', { type: 'video-transcript', text: '   ' }], ['object transcript', { type: 'video-transcript', data: { transcript: {} } }],
];
describe('incomplete saved resources', () => {
  it.each(invalid)('rejects %s before workspace, visited state or live follow changes', (_label, item) => {
    const d = deps(); expect(restore(item, {}, d)).toBe(false);
    expect(d.addToast).toHaveBeenCalledWith(expect.stringContaining('incomplete'), 'error');
    for (const name of d.mutationNames) expect(d[name], name + ' must remain untouched').not.toHaveBeenCalled();
  });
  it('contains a damaged type accessor before any state change', () => {
    const item = {}; Object.defineProperty(item, 'type', { get() { throw Error('Damaged record'); } });
    const d = deps(); expect(restore(item, {}, d)).toBe(false);
    for (const name of d.mutationNames) expect(d[name]).not.toHaveBeenCalled();
  });
  it('uses the translated incomplete-resource message', () => {
    const d = deps(); d.t = key => key === 'history.resource_incomplete' ? 'Translated recovery message' : key;
    expect(restore({}, {}, d)).toBe(false); expect(d.addToast).toHaveBeenCalledWith('Translated recovery message', 'error');
  });
});

describe('valid saved resource routes', () => {
  it('opens a book through its existing surface opener', () => {
    const d = deps(), item = { id: 'book-A', type: 'readingBook', data: { slug: 'river-birds' } };
    restore(item, {}, d); expect(d.setPendingReadingBookSlug).toHaveBeenCalledWith('river-birds');
    expect(d.setIsReadingLibraryOpen).toHaveBeenCalledWith(true); expect(d.setActiveView).not.toHaveBeenCalled();
    expect(d._alloFollowResourceLive).toHaveBeenCalledWith(item);
  });
  it('retains the complete valid reading-set payload', () => {
    const d = deps(), item = { id: 'set-A', type: 'readingSet', data: { books: [{ slug: 'river-birds' }, { slug: 'lake-life' }] } };
    restore(item, { suppressLiveFollow: true }, d); expect(d.setPendingReadingSet).toHaveBeenCalledWith(item.data);
    expect(d.setIsReadingLibraryOpen).toHaveBeenCalledWith(true); expect(d._alloFollowResourceLive).not.toHaveBeenCalled();
  });
  it('opens a valid manipulative without changing the current view', () => {
    const d = deps(), item = { id: 'tool-A', type: 'manipulative-resource', toolId: 'numberline', data: { preset: { min: 0, max: 10 } } };
    restore(item, {}, d); expect(d._alloRequestStemPlugin).toHaveBeenCalledWith('numberline');
    expect(d.setStemLabTool).toHaveBeenCalledWith('numberline'); expect(d.setShowStemLab).toHaveBeenCalledWith(true);
    expect(d.setActiveView).not.toHaveBeenCalled();
  });
  it('uses the first real transcript and title rather than blank or object metadata', () => {
    const d = deps(), item = { id: 'video-A', type: 'video-transcript', text: '  ', content: {}, title: 'Lake lesson transcript', data: { transcript: '  Evaporation moves water into the air.  ', title: {} } };
    restore(item, {}, d); expect(d.setInputText).toHaveBeenCalledWith('Evaporation moves water into the air.');
    expect(d.setSourceTopic).toHaveBeenCalledWith('Lake lesson'); expect(d.setActiveView).toHaveBeenCalledWith('input');
  });
  it('uses a clear title fallback when transcript titles are unavailable', () => {
    const d = deps(); restore({ id: 'video-A', type: 'video-transcript', text: 'Valid transcript', data: { title: {} }, title: [] }, {}, d);
    expect(d.setSourceTopic).toHaveBeenCalledWith('Video');
  });
  it('continues opening ordinary legacy resources without an id and records valid student visits', () => {
    const d = deps(); restore({ type: 'simplified', data: 'Legacy lesson body' }, {}, d);
    expect(d.setActiveView).toHaveBeenCalledWith('simplified'); expect(d.setGeneratedContent).toHaveBeenCalled();
    const visited = deps(); restore({ id: 'lesson-A', type: 'simplified', data: 'Saved body' }, {}, visited);
    expect(visited.setDirectionsProgress).toHaveBeenCalledOnce();
    expect(visited.setDirectionsProgress.mock.calls[0][0]({})).toEqual({ _visited: { 'lesson-A': true } });
  });
});
