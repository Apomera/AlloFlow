// Switching between the diagram and the 3D model dropped the learner's place.
// Picking in the model already set the atlas region, but going the other way
// left the model with nothing selected, and neither move said anything about
// what had happened. The learning card now offers the move directly and says
// plainly when there is nothing on the other side to go to, which matters
// because an empty structure index means "the model has not been opened yet",
// not "this region has no counterpart".
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTool, makeCtx, newStore, ReactDOMServer, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
// Keys the tool's own mapper recognises: hippocampus and thalamus on the
// midline view, precentral gyrus on the side view.
const INDEX = [
  { key: 'body_of_hippocampus', label: 'Body of Hippocampus' },
  { key: 'thalamus_L', label: 'Left Thalamus' },
  { key: 'precentral_gyrus_L', label: 'Left Precentral Gyrus' },
];

function flatten(node) {
  if (!node || typeof node !== 'object') return [];
  if (Array.isArray(node)) return node.flatMap(flatten);
  return [node, ...flatten(node.props?.children)];
}

function session(extra = {}) {
  const tool = loadTool(FILE, 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', ...extra } });
  const announceToSR = vi.fn();
  const nodes = () => flatten(tool.render(makeCtx({ announceToSR }, store)));
  const get = (key, value = 'true') => nodes().find((el) => el.props?.[key] === value);
  const state = () => store.toolData.brainAtlas;
  const spoken = () => announceToSR.mock.calls.map((c) => String(c[0])).join(' | ');
  return { store, nodes, get, state, spoken, announceToSR };
}

describe('brainAtlas keeps one selection across 2D and 3D', () => {
  beforeEach(() => { resetStemLab(); vi.useFakeTimers(); });

  it('offers the move from the learning card in both directions', () => {
    const to3d = session({ selectedRegion: 'hippocampus', brain3DStructureIndex: INDEX });
    const button = to3d.get('data-brainatlas-show-representation', '3d');
    expect(button).toBeTruthy();
    expect(String(button.props.children)).toMatch(/3D model/);
    resetStemLab();
    const to2d = session({ selectedRegion: 'hippocampus', atlasDisplayMode: '3d', brain3DStructureIndex: INDEX });
    const back = to2d.get('data-brainatlas-show-representation', 'diagram');
    expect(back).toBeTruthy();
    expect(String(back.props.children)).toMatch(/2D diagram/);
  });

  it('carries a diagram selection into the model', () => {
    const s = session({ selectedRegion: 'hippocampus', brain3DStructureIndex: INDEX });
    s.get('data-brainatlas-show-representation', '3d').props.onClick();
    expect(s.state().atlasDisplayMode).toBe('3d');
    expect(s.state().selected3DStructure).toBe('body_of_hippocampus');
    expect(s.spoken()).toMatch(/came with you/);
  });

  it('carries a model selection back to the diagram', () => {
    // in the model the learner is looking at the structure, so that is what
    // comes back with them even if the region list still holds an older pick
    const s = session({ atlasDisplayMode: '3d', selectedRegion: 'hippocampus', selected3DStructure: 'thalamus_L', brain3DStructureIndex: INDEX });
    s.get('data-brainatlas-show-representation', 'diagram').props.onClick();
    expect(s.state().atlasDisplayMode).toBe('diagram');
    expect(s.state().selectedRegion).toBe('thalamus');
    expect(s.spoken()).toMatch(/came with you/);
  });

  it('says so when the selection has no counterpart, rather than moving silently', () => {
    // the septum pellucidum is on the midline view and the mapper has no
    // model structure for it
    const s = session({ selectedRegion: 'septum_pell', brain3DStructureIndex: INDEX });
    const note = s.get('data-brainatlas-representation-note', 'none');
    expect(note).toBeTruthy();
    expect(String(note.props.children)).toMatch(/No single structure in the 3D model matches/);
    s.get('data-brainatlas-show-representation', '3d').props.onClick();
    expect(s.state().atlasDisplayMode).toBe('3d');
    expect(s.state().selected3DStructure).toBeFalsy();
    expect(s.spoken()).toMatch(/no matching structure/);
  });

  it('distinguishes an unloaded model from a region with no counterpart', () => {
    const s = session({ selectedRegion: 'hippocampus' });
    const note = s.get('data-brainatlas-representation-note', 'unloaded');
    expect(note).toBeTruthy();
    expect(String(note.props.children)).toMatch(/has not been opened yet/);
    // and the honest note is never the "no counterpart" one in this state
    expect(s.get('data-brainatlas-representation-note', 'none')).toBeUndefined();
  });

  it('shows no note at all when a counterpart exists', () => {
    const s = session({ selectedRegion: 'hippocampus', brain3DStructureIndex: INDEX });
    expect(s.get('data-brainatlas-representation-note', 'none')).toBeUndefined();
    expect(s.get('data-brainatlas-representation-note', 'unloaded')).toBeUndefined();
  });

  it('keeps a model selection that already matches the selected region', () => {
    const s = session({
      selectedRegion: 'hippocampus',
      selected3DStructure: 'body_of_hippocampus',
      brain3DStructureIndex: INDEX.concat([{ key: 'head_of_hippocampus', label: 'Head of Hippocampus' }]),
    });
    s.get('data-brainatlas-show-representation', '3d').props.onClick();
    // not swapped for another structure that maps to the same region
    expect(s.state().selected3DStructure).toBe('body_of_hippocampus');
  });

  it('does not offer the move on a view the model does not cover', () => {
    const s = session({ view: 'eegWaves', selectedRegion: 'alpha_wave', brain3DStructureIndex: INDEX });
    expect(s.get('data-brainatlas-show-representation', '3d')).toBeUndefined();
    expect(s.get('data-brainatlas-show-representation', 'diagram')).toBeUndefined();
  });

  it('the button is a real button at a usable size', () => {
    const s = session({ selectedRegion: 'hippocampus', brain3DStructureIndex: INDEX });
    const button = s.get('data-brainatlas-show-representation', '3d');
    expect(button.type).toBe('button');
    expect(button.props.type).toBe('button');
    const row = s.get('data-brainatlas-representation', 'diagram');
    expect(ReactDOMServer.renderToStaticMarkup(row)).toContain('brainatlas-detail-representation');
  });
});
