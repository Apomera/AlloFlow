import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const structures = ['Allen_precentral_gyrus_L', 'Allen_postcentral_gyrus_L'];
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let shell;
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });
afterEach(() => { shell?.remove(); vi.useRealTimers(); });

function setup(keys = structures) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: {
    view: 'lateral', atlasDisplayMode: '3d', brain3DCompareActive: true,
    brain3DCompareStructures: keys, selected3DStructure: keys.at(-1), brain3DSearch: 'motor',
    brain3DStructureIndex: structures.map(key => ({ key, label: key, hemisphere: 'left', family: 'Cortex', keywords: 'motor' }))
  } });
  const nodes = () => flatten(tool.render(makeCtx({}, store)));
  const find = name => nodes().find(node => node.props?.className === name);
  shell = document.createElement('div');
  shell.className = 'brainatlas-canvas-shell';
  shell.innerHTML = ReactDOMServer.renderToStaticMarkup(find('brainatlas-3d-searchbar')) + ReactDOMServer.renderToStaticMarkup(find('brainatlas-3d-compare-tray'));
  document.body.appendChild(shell);
  const search = shell.querySelector('#brainatlas-3d-search');
  expect(search.disabled).toBe(false);
  return { store, search,
    close() {
      shell.querySelector('.brainatlas-3d-compare-close').focus();
      find('brainatlas-3d-compare-close').props.onClick();
      shell.querySelector('.brainatlas-3d-compare-tray').remove();
    },
    remove(index) {
      shell.querySelectorAll('.brainatlas-3d-compare-remove')[index].focus();
      nodes().filter(node => node.props?.className === 'brainatlas-3d-compare-remove')[index].props.onClick();
      shell.querySelector('.brainatlas-3d-compare-tray').outerHTML = ReactDOMServer.renderToStaticMarkup(find('brainatlas-3d-compare-tray'));
    }
  };
}

describe('Brain Atlas comparison keyboard continuity', () => {
  it('returns from the removed Close button to the Compare trigger', () => {
    const s = setup(); s.close(); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(shell.querySelector('[data-brainatlas-3d-compare-toggle]'));
    expect(s.store.toolData.brainAtlas.brain3DCompareActive).toBe(false);
    expect(s.store.toolData.brainAtlas.brain3DCompareStructures).toEqual([]);
  });
  it.each([0, 1])('returns to replacement search after removing slot %s', index => {
    const s = setup(); s.remove(index); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(s.search);
    expect(s.search.selectionStart).toBe(0);
    expect(s.search.selectionEnd).toBe('motor'.length);
    expect(s.store.toolData.brainAtlas.brain3DCompareStructures).toEqual(structures.filter((_, i) => i !== index));
  });
  it('keeps empty comparison ready for a fresh search', () => {
    const s = setup([structures[0]]); s.remove(0); vi.runOnlyPendingTimers();
    expect(document.activeElement).toBe(s.search);
    expect(s.store.toolData.brainAtlas).toMatchObject({ brain3DCompareActive: true, brain3DCompareStructures: [], selected3DStructure: '' });
  });
  it('respects a subsequent focus choice instead of taking focus back', () => {
    const s = setup(); s.remove(0);
    const trigger = shell.querySelector('[data-brainatlas-3d-compare-toggle]'); trigger.focus();
    vi.runOnlyPendingTimers(); expect(document.activeElement).toBe(trigger);
  });
  it('does not focus detached controls after leaving the atlas', () => {
    const s = setup(); s.remove(0); shell.remove();
    vi.runOnlyPendingTimers(); expect(document.activeElement).toBe(document.body);
  });
});
