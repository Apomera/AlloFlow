import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { baselineProfiles, canonical, connectionsSelector, functionSelector, genericSelector, mountExplanations, selectedKey, selectionSelector } from './helpers/brain_atlas_selection_explanation_scene.js';

let scene;
beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
});
afterEach(async () => {
  if (scene) await scene.dispose();
  scene = null;
  delete window.__alloBrainAtlas3DCanvas;
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Atlas selected anatomy explanations inside the viewer', () => {
  it('starts closed with an accessible reading body inside the actual fullscreen shell', async () => {
    scene = await mountExplanations();
    const { selected, generic, shell, guide } = scene;
    expect(selected.tagName).toBe('DETAILS');
    expect(selected.classList.contains('brainatlas-selection-explanation')).toBe(true);
    expect(selected.open).toBe(false);
    expect(generic.open).toBe(false);
    expect(selected.parentElement).toBe(shell);
    expect(generic.parentElement).toBe(shell);
    expect(selected.getAttribute('name')).toBe('brainatlas-3d-reading');
    expect(generic.getAttribute('name')).toBe('brainatlas-3d-reading');
    expect(selected.nextElementSibling).toBe(generic);
    expect(shell.contains(guide)).toBe(false);
    expect(selected.closest('.brainatlas-learning-footer')).toBeNull();
    const summary = selected.querySelector(':scope > summary');
    expect(summary.textContent).toContain('About this structure');
    expect(summary.textContent).toContain(guide.querySelector('.brainatlas-3d-guide-family').textContent);
    expect(summary.id).toBe('brainatlas-selection-explanation-summary');
    expect(scene.host.querySelectorAll('#' + summary.id)).toHaveLength(1);
    const body = selected.querySelector('.brainatlas-explanation-body');
    expect(body.getAttribute('role')).toBe('region');
    expect(body.tabIndex).toBe(0);
    expect(body.getAttribute('aria-labelledby')).toBe(summary.id);
    expect(selected.querySelector('[aria-live]')).toBeNull();
    shell.classList.add('brainatlas-fullscreen-fallback');
    expect(body.closest('.brainatlas-canvas-shell.brainatlas-fullscreen-fallback')).toBe(shell);
    summary.focus();
    await scene.open(selected);
    expect(selected.open).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(generic.querySelector(':scope > summary').textContent).toContain('Explain this model');
  });

  it.each([selectedKey, 'Allen_amygdaloid_complex_L'])('keeps complete existing profile facts for %s without changing the full guide', async key => {
    scene = await mountExplanations({ selected3DStructure: key, selectedRegion: null });
    const profile = baselineProfiles.profiles[canonical(key)];
    expect(profile).toBeDefined();
    const { selected, guide } = scene;
    expect(selected.querySelector(functionSelector).textContent).toBe(profile.functionText);
    expect(selected.querySelector(connectionsSelector).textContent).toBe(profile.connectionsText);
    expect(selected.textContent).toContain(guide.querySelector('.brainatlas-3d-guide-title').textContent);
    expect(selected.querySelector('[data-brainatlas-profile-field]')).toBeNull();
    expect(guide.querySelectorAll('[data-brainatlas-profile-field]')).toHaveLength(3);
    for (const field of ['functionText', 'connectionsText', 'clinicalText']) {
      expect(guide.querySelector('[data-brainatlas-profile-field="' + field + '"]').textContent).toBe(profile[field]);
    }
  });

  it('keeps the existing profile references complete, separately identified and safely linked', async () => {
    scene = await mountExplanations();
    const profile = baselineProfiles.profiles[canonical(selectedKey)];
    const sources = scene.selected.querySelector('[data-brainatlas-selection-explanation-sources]');
    expect(sources).not.toBeNull();
    expect(sources.hasAttribute('data-brainatlas-profile-sources')).toBe(false);
    const links = [...sources.querySelectorAll('a')];
    expect(links.length).toBeGreaterThan(0);
    expect(links.map(link => link.href)).toEqual(profile.sourceIds.map(id => baselineProfiles.references[id].url));
    expect(links.map(link => link.textContent)).toEqual(profile.sourceIds.map(id => baselineProfiles.references[id].title));
    for (const link of links) {
      expect(link.target).toBe('_blank');
      expect(link.rel.split(/\s+/)).toEqual(expect.arrayContaining(['noopener', 'noreferrer']));
    }
    expect(scene.guide.querySelectorAll('[data-brainatlas-profile-sources]')).toHaveLength(1);
  });

  it('preserves the selected native disclosure and focused summary across camera and cutaway rerenders', async () => {
    scene = await mountExplanations();
    const selected = scene.selected, generic = scene.generic;
    await scene.open(selected);
    const summary = selected.querySelector(':scope > summary');
    summary.focus();
    const setPreset = vi.fn();
    window.__alloBrainAtlas3DCanvas = { _brain3DState: { setPreset } };
    const front = scene.latest.nodes.find(node => node.props?.['data-brainatlas-camera-preset'] === 'front');
    expect(front).toBeDefined();
    await React.act(async () => front.props.onClick());
    expect(setPreset).toHaveBeenCalledWith('front', true);
    await scene.render();
    await scene.render({ brain3DSliceAxis: 'coronal', brain3DSlicePosition: 32, brain3DLayer: 'deep' });
    expect(scene.selected).toBe(selected);
    expect(scene.generic).toBe(generic);
    expect(selected.open).toBe(true);
    expect(generic.open).toBe(false);
    expect(document.activeElement).toBe(summary);
    expect(generic.dataset.brainatlasExplanationContext).toBe('3d-cutaway');
  });

  it('preserves the open selected disclosure while the real Save control updates the study set', async () => {
    scene = await mountExplanations();
    const selected = scene.selected, generic = scene.generic;
    await scene.open(selected);
    const save = scene.guide.querySelector('[data-brainatlas-save-structure]');
    save.focus();
    await React.act(async () => save.click());
    await scene.render();
    expect(scene.store.toolData.brainAtlas.brain3DSavedStructures).toContain(selectedKey);
    expect(scene.guide.querySelector('[data-brainatlas-save-structure]')).toBe(save);
    expect(save.getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(save);
    expect(scene.selected).toBe(selected);
    expect(scene.generic).toBe(generic);
    expect(selected.open).toBe(true);
    expect(generic.open).toBe(false);
  });

  it.each(['Allen_body_of_hippocampus_R', 'Allen_amygdaloid_complex_L'])('resets only the selected disclosure for new identity %s', async key => {
    scene = await mountExplanations();
    await scene.open(scene.selected);
    const selected = scene.selected, generic = scene.generic;
    const genericSummary = generic.querySelector(':scope > summary');
    genericSummary.focus();
    await scene.render({ selected3DStructure: key });
    expect(scene.selected.open).toBe(false);
    expect(scene.selected).not.toBe(selected);
    expect(scene.selected.querySelector(functionSelector).textContent).toBe(baselineProfiles.profiles[canonical(key)].functionText);
    expect(scene.generic).toBe(generic);
    expect(generic.open).toBe(false);
    expect(document.activeElement).toBe(genericSummary);
  });

  it('removes selection-specific reading when cleared and keeps generic native expansion', async () => {
    scene = await mountExplanations();
    await scene.open(scene.generic);
    const generic = scene.generic;
    const clear = scene.guide.querySelector('[data-brainatlas-clear-selection]');
    await React.act(async () => clear.click());
    await scene.render();
    expect(scene.store.toolData.brainAtlas.selected3DStructure).toBe('');
    expect(scene.selected).toBeNull();
    expect(scene.shell.querySelector(functionSelector)).toBeNull();
    expect(scene.generic).toBe(generic);
    expect(generic.open).toBe(true);
    await scene.render({ selected3DStructure: selectedKey, selectedRegion: 'hippocampus' });
    expect(scene.selected.open).toBe(false);
    expect(scene.generic).toBe(generic);
    expect(generic.open).toBe(true);
  });

  it.each([
    ['2D mode', { atlasDisplayMode: 'diagram' }],
    ['region without a selected mesh', { selected3DStructure: '' }],
    ['comparison', { brain3DCompareActive: true, brain3DCompareStructures: [selectedKey, 'Allen_amygdaloid_complex_L'] }],
    ['pathway', { brain3DPathway: 'papez' }],
    ['Find It challenge', { brain3DChallengeActive: true }],
    ['saved-structure quiz', { brain3DSavedQuizActive: true }],
    ['ordinary quiz flag in 3D', { quizMode: true }]
  ])('suppresses selection-specific text in %s while retaining generic guidance', async (name, state) => {
    scene = await mountExplanations(state);
    expect(scene.shell.querySelector(selectionSelector)).toBeNull();
    expect(scene.shell.querySelector(functionSelector)).toBeNull();
    expect(scene.shell.querySelector(connectionsSelector)).toBeNull();
    expect(scene.shell.querySelector(genericSelector)).not.toBeNull();
  });

  it.each([
    ['Find It', { brain3DChallengeActive: true }],
    ['saved quiz', { brain3DSavedQuizActive: true }],
    ['ordinary quiz', { quizMode: true }]
  ])('keeps the %s reading neutral even with a stale selected answer', async (name, assessment) => {
    scene = await mountExplanations(assessment);
    expect(scene.generic.dataset.brainatlasExplanationContext).toBe('practice');
    const original = scene.shell.textContent;
    await scene.render({ selected3DStructure: 'Allen_amygdaloid_complex_L', selectedRegion: 'amygdala' });
    expect(scene.selected).toBeNull();
    expect(scene.shell.textContent).toBe(original);
    expect(original).not.toMatch(/hippocamp|amygdal|body of/i);
  });

  it('retains generic identity, expansion and focus when entering and leaving 3D', async () => {
    scene = await mountExplanations({ atlasDisplayMode: 'diagram' });
    const generic = scene.generic;
    const summary = generic.querySelector(':scope > summary');
    expect(generic.hasAttribute('name')).toBe(false);
    summary.focus();
    await scene.open(generic);
    await scene.render({ atlasDisplayMode: '3d' });
    expect(scene.generic).toBe(generic);
    expect(generic.open).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(generic.getAttribute('name')).toBe('brainatlas-3d-reading');
    expect(scene.selected.open).toBe(false);
    await scene.render({ atlasDisplayMode: 'diagram' });
    expect(scene.generic).toBe(generic);
    expect(generic.open).toBe(true);
    expect(document.activeElement).toBe(summary);
    expect(generic.hasAttribute('name')).toBe(false);
    expect(scene.selected).toBeNull();
  });
});
