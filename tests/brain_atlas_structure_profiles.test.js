import { beforeEach, describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, makeCtx, newStore, ReactDOMServer } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const block = source.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1].split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
const { profiles, sources } = Function(block + ';return {profiles:BRAIN_ATLAS_STRUCTURE_PROFILES,sources:BRAIN_ATLAS_PROFILE_SOURCES};')();
const glb = readFileSync('stem_lab/assets/brainatlas/alloflow-brain-atlas-meshopt.glb');
const model = JSON.parse(glb.subarray(20, 20 + glb.readUInt32LE(12)).toString());
const canonical = key => key.replace(/\.\d+$/, '').replace(/_[LR]$/i, '');
const keys = [...new Set(model.nodes.filter(n => n.mesh !== undefined).map(n => canonical(n.name)))];
const fields = ['functionText', 'connectionsText', 'clinicalText'];
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];

beforeEach(resetStemLab);

describe('structure-specific brain atlas explanations', () => {
  it('covers every named mesh with distinct, substantive explanations and resolvable references', () => {
    expect(Object.keys(profiles).sort()).toEqual([...keys].sort());
    const explanations = new Set();
    for (const key of keys) {
      const profile = profiles[key];
      for (const field of fields) {
        expect(profile[field], key + ' ' + field).toBeTypeOf('string');
        expect(profile[field].length, key + ' ' + field).toBeGreaterThan(200);
        expect(profile[field]).not.toMatch(/Use neighboring structures|This is a named anatomical part|Its learning value comes from|\.{3}$|…$/);
      }
      explanations.add(fields.map(f => profile[f]).join('|'));
      expect(profile.sourceIds.length, key).toBeGreaterThan(0);
      for (const id of profile.sourceIds) {
        expect(sources[id], key + ' reference ' + id).toBeTruthy();
        expect(new URL(sources[id].url).protocol).toBe('https:');
        expect(sources[id].title.length).toBeGreaterThan(10);
      }
    }
    expect(explanations.size).toBe(keys.length);
  });

  it('renders every complete profile even when the matching diagram card is a broad lobe', () => {
    const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
    for (const key of keys) {
      const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: '3d', selectedRegion: 'frontal', selected3DStructure: key } });
      const nodes = flatten(tool.render(makeCtx({}, store)));
      const guide = nodes.find(n => n.props?.['data-brainatlas-3d-guide']);
      expect(guide?.props['data-brainatlas-profile'], key).toBe(key);
      const children = flatten(guide);
      for (const field of fields) expect(children.find(n => n.props?.['data-brainatlas-profile-field'] === field)?.props.children, key + ' ' + field).toBe(profiles[key][field]);
      const links = children.filter(n => n.type === 'a');
      expect(links.map(n => n.props.href)).toEqual(profiles[key].sourceIds.map(id => sources[id].url));
      expect(guide.props['aria-live']).toBeUndefined();
    }
  }, 60000);

  it.each(['Allen_ventral_posterior_lateral_nucleus_L', 'Allen_ventral_posterior_medial_nucleus_R', 'Allen_subthalamic_nucleus_L.001', 'Allen_head_of_hippocampus_R', 'VH_M_optic_chiasm'])('resolves exact anatomy and hemisphere suffixes for %s', key => {
    const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
    const nodes = flatten(tool.render(makeCtx({}, newStore({ brainAtlas: { view: 'medial', atlasDisplayMode: '3d', selected3DStructure: key } }))));
    const guide = nodes.find(n => n.props?.['data-brainatlas-3d-guide']);
    expect(guide.props['data-brainatlas-profile']).toBe(canonical(key));
    expect(ReactDOMServer.renderToStaticMarkup(guide)).toContain('Anatomy &amp; clinical references');
  });

  it('compares different thalamic nuclei without truncating them into the whole-thalamus description', () => {
    const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
    const structures = ['Allen_ventral_posterior_lateral_nucleus_L', 'Allen_ventral_posterior_medial_nucleus_L'];
    const nodes = flatten(tool.render(makeCtx({}, newStore({ brainAtlas: { view: 'medial', atlasDisplayMode: '3d', brain3DCompareActive: true, brain3DCompareStructures: structures } }))));
    const cards = nodes.filter(n => n.props?.className === 'brainatlas-3d-compare-card');
    expect(cards).toHaveLength(2);
    cards.forEach((card, i) => {
      const text = ReactDOMServer.renderToStaticMarkup(card);
      for (const field of fields) expect(text).toContain(profiles[canonical(structures[i])][field].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#x27;'));
    });
  });

  it('uses the actual geniculate mesh for the visual relay step', () => {
    expect(source).toContain('prefer: /^Allen_dorsal_lateral_geniculate_nucleus_L$/i');
    expect(source).not.toContain('this model has no separate lateral geniculate mesh');
  });
});
