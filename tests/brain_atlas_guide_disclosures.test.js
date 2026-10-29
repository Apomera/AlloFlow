import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_brainatlas.js', 'utf8');
const profileBlock = source.split('// BEGIN BRAIN ATLAS STRUCTURE PROFILES')[1].split('// END BRAIN ATLAS STRUCTURE PROFILES')[0];
const { profiles, references } = Function(profileBlock + ';return {profiles:BRAIN_ATLAS_STRUCTURE_PROFILES,references:BRAIN_ATLAS_PROFILE_SOURCES};')();
const selectedKey = 'Allen_body_of_hippocampus_L';
const canonical = key => key.replace(/_[LR]$/i, '');
const fields = ['functionText', 'connectionsText', 'clinicalText'];
const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
let root;
let host;

beforeEach(() => {
  resetStemLab();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});

afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null;
  host?.remove();
  host = null;
  vi.unstubAllGlobals();
});

async function mountGuide(state = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'medial', atlasDisplayMode: '3d', selected3DStructure: selectedKey, ...state } });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  const render = async () => {
    // Mount the real selected-guide subtree without starting an unrelated WebGL scene.
    const guide = flatten(tool.render(makeCtx({}, store))).find(node => node.props?.['data-brainatlas-3d-guide']);
    await React.act(async () => root.render(guide));
  };
  await render();
  const disclosures = () => [...host.querySelectorAll('[data-brainatlas-guide-section]')];
  const openAll = async () => {
    await React.act(async () => disclosures().forEach(detail => { if (!detail.open) detail.querySelector('summary').click(); }));
    expect(disclosures().every(detail => detail.open)).toBe(true);
  };
  return { store, render, disclosures, openAll };
}

describe('Brain Atlas selected guide disclosures', () => {
  it('keeps Function visible and each complete explanation/reference available exactly once', async () => {
    const s = await mountGuide();
    const profile = profiles[canonical(selectedKey)];
    const functionText = host.querySelector('[data-brainatlas-profile-field="functionText"]');
    expect(functionText.closest('details')).toBeNull();
    expect(functionText.closest('.brainatlas-3d-guide-body')).not.toBeNull();
    expect(s.disclosures().map(detail => detail.dataset.brainatlasGuideSection)).toEqual(['connections', 'clinical', 'references']);
    expect(s.disclosures().map(detail => detail.querySelector('summary').textContent)).toEqual(['Connected systems', 'Clinical lens', 'Anatomy & clinical references']);
    expect(s.disclosures().every(detail => !detail.open)).toBe(true);
    expect(host.querySelectorAll('[data-brainatlas-profile-field]')).toHaveLength(3);
    fields.forEach(field => expect(host.querySelector('[data-brainatlas-profile-field="' + field + '"]').textContent).toBe(profile[field]));
    expect(host.querySelector('[data-brainatlas-profile-field="connectionsText"]').closest('details').dataset.brainatlasGuideSection).toBe('connections');
    expect(host.querySelector('[data-brainatlas-profile-field="clinicalText"]').closest('details').dataset.brainatlasGuideSection).toBe('clinical');
    const sourceLists = host.querySelectorAll('[data-brainatlas-profile-sources]');
    expect(sourceLists).toHaveLength(1);
    expect(sourceLists[0].closest('details').dataset.brainatlasGuideSection).toBe('references');
    const links = [...sourceLists[0].querySelectorAll('a')];
    expect(links.map(link => link.href)).toEqual(profile.sourceIds.map(id => references[id].url));
    expect(links.map(link => link.textContent)).toEqual(profile.sourceIds.map(id => references[id].title));
    expect(host.querySelectorAll('[data-brainatlas-region-profile]')).toHaveLength(0);
  });

  it('retains native expansion and focused Save across same-selection rerenders', async () => {
    const s = await mountGuide();
    await s.openAll();
    const originalDetails = s.disclosures();
    const save = host.querySelector('[data-brainatlas-save-structure]');
    save.focus();
    await React.act(async () => save.click());
    await s.render();
    expect(s.store.toolData.brainAtlas.brain3DSavedStructures).toContain(selectedKey);
    expect(save.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(save);
    s.disclosures().forEach((detail, index) => {
      expect(detail).toBe(originalDetails[index]);
      expect(detail.open).toBe(true);
    });
    s.store.toolData.brainAtlas.brain3DSlicePosition = 25;
    await s.render();
    expect(s.disclosures().every(detail => detail.open)).toBe(true);
    await React.act(async () => s.disclosures()[0].querySelector('summary').click());
    expect(s.disclosures().map(detail => detail.open)).toEqual([false, true, true]);
  });

  it.each(['Allen_body_of_hippocampus_R', 'Allen_amygdaloid_complex_L'])('resets expansion when selection changes to %s', async nextKey => {
    const s = await mountGuide();
    await s.openAll();
    const originalDetails = s.disclosures();
    s.store.toolData.brainAtlas.selected3DStructure = nextKey;
    await s.render();
    s.disclosures().forEach((detail, index) => {
      expect(detail).not.toBe(originalDetails[index]);
      expect(detail.open).toBe(false);
    });
    expect(host.querySelectorAll('[data-brainatlas-profile-field]')).toHaveLength(3);
    fields.forEach(field => expect(host.querySelector('[data-brainatlas-profile-field="' + field + '"]').textContent).toBe(profiles[canonical(nextKey)][field]));
  });

  it('uses region identity for disclosure resets when no individual mesh is selected', async () => {
    const s = await mountGuide({ selected3DStructure: '', selectedRegion: 'hippocampus' });
    await s.openAll();
    await s.render();
    expect(s.disclosures().every(detail => detail.open)).toBe(true);
    s.store.toolData.brainAtlas.selectedRegion = 'amygdala';
    await s.render();
    expect(s.disclosures().every(detail => !detail.open)).toBe(true);
    expect(host.querySelector('[data-brainatlas-3d-guide]').dataset.brainatlasProfile).toBe('region:amygdala');
    expect(host.querySelectorAll('[data-brainatlas-profile-field]')).toHaveLength(3);
    expect(host.querySelectorAll('[data-brainatlas-profile-sources]')).toHaveLength(1);
  });
});
