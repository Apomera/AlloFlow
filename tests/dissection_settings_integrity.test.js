import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');

function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const start = matches[0].index + matches[0][1].length;
  const ending = '\n' + matches[0][1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing production function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

const normalize = productionFunction('normalizeDissectionDisplayPreferences');
const workspaceSettings = productionFunction('dissectionWorkspaceSettings', { normalizeDissectionDisplayPreferences: normalize });
const noteText = productionFunction('dissectionEvidenceNote');
const advancedPreferences = Object.freeze({
  procedureMode: 'independent', livingFunctionEnabled: true, livingFunctionPaused: true,
  visualRealism: 'realistic', labLight: 'warm', inspectionLens: true, lensPinned: true,
  macroInset: true, sceneDetail: false, depthAtlas: true, tissueRelief: false,
  relationshipMotion: true, focusMode: false, parallaxDepth: true, splitComparison: true,
  lightDirection: 'raking', crossSectionMode: true, specimenCondition: 'cloudy',
  relationshipMode: true, renderQuality: 'balanced',
});

function elementMatching(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = elementMatching(child, predicate); if (found) return found; }
    return null;
  }
  if (predicate(node)) return node;
  return elementMatching(node.props?.children, predicate);
}

function view(config, store) {
  const tree = config.render(makeCtx({ toolData: store.toolData }, store));
  return { tree, html: ReactDOMServer.renderToStaticMarkup(tree) };
}

describe('dissection display settings and saved-note integrity', () => {
  beforeEach(() => { vi.useFakeTimers(); localStorage.clear(); resetStemLab(); });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); localStorage.clear(); });

  it('uses one effective workspace configuration without changing the saved preferences', () => {
    const essentials = workspaceSettings(advancedPreferences, 'essentials');
    expect(essentials).toMatchObject({
      procedureMode: 'guided', livingFunctionEnabled: false, livingFunctionPaused: false,
      visualRealism: 'guided', labLight: 'neutral', inspectionLens: false, lensPinned: false,
      macroInset: false, sceneDetail: true, depthAtlas: false, relationshipMotion: false,
      parallaxDepth: false, splitComparison: false, lightDirection: 'overhead',
      crossSectionMode: false, specimenCondition: 'standard', relationshipMode: false,
      renderQuality: 'auto', tissueRelief: false, focusMode: false,
    });
    expect(workspaceSettings(advancedPreferences, 'advanced')).toEqual(advancedPreferences);
    expect(normalize(advancedPreferences)).toEqual(advancedPreferences);
  });

  it('normalizes unsupported display choices while retaining intentional false preferences', () => {
    const preferences = normalize({ visualRealism: 'unknown', labLight: 'unknown',
      lightDirection: 'unknown', specimenCondition: 'unknown', renderQuality: 'unknown',
      macroInset: false, sceneDetail: false, depthAtlas: false, relationshipMotion: false, parallaxDepth: false });
    expect(preferences).toMatchObject({ visualRealism: 'guided', labLight: 'neutral',
      lightDirection: 'overhead', specimenCondition: 'standard', renderQuality: 'auto',
      macroInset: false, sceneDetail: false, depthAtlas: false, relationshipMotion: false, parallaxDepth: false });
  });

  it('disables Advanced presentation and inspection controls in Essentials and restores their actions in Advanced', () => {
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const store = newStore({ dissection: { ...advancedPreferences, specimen: 'frog', activeLayer: 'skin',
      workspaceMode: 'essentials', _dissLoadedSpec: 'frog', reducedMotion: true, toolbarViewOpen: true } });
    const labels = [
      'Visual presentation: cycle guided, realistic, and accessible',
      'Toggle movable inspection lens',
      'Pin inspection lens to selected structure or current pointer',
      'Cycle inspection magnification: 2, 4, or 6 times',
      'Cycle inspection focus depth: surface, structure, or deep',
      'Toggle docked macro inspection view',
    ];
    const essentials = view(config, store);
    const page = new DOMParser().parseFromString(essentials.html, 'text/html');
    for (const label of labels) {
      const control = elementMatching(essentials.tree, node => node.type === 'button' && node.props['aria-label'] === label);
      expect(control, label).not.toBeNull();
      expect(control.props.disabled, label).toBe(true);
      const describedBy = control.props['aria-describedby'].split(' ');
      const help = describedBy.map(id => page.getElementById(id)?.textContent || '').join(' ');
      expect(help, label).toContain('Advanced workspace');
    }
    expect(store.toolData.dissection).toMatchObject(advancedPreferences);

    elementMatching(essentials.tree, node => node.type === 'button' && node.props['aria-label'] === 'Advanced workspace').props.onClick();
    const advanced = view(config, store);
    for (const label of labels) {
      // The saved pin preference is restored in Advanced, so its action becomes Release.
      const activeLabel = label.startsWith('Pin inspection') ? 'Release pinned inspection target' : label;
      const control = elementMatching(advanced.tree, node => node.type === 'button' && node.props['aria-label'] === activeLabel);
      expect(control, activeLabel).not.toBeNull();
      expect(control.props.disabled, activeLabel).toBe(false);
    }
    elementMatching(advanced.tree, node => node.type === 'button' && node.props['aria-label'] === labels[0]).props.onClick();
    expect(store.toolData.dissection.visualRealism).toBe('accessible');
    elementMatching(advanced.tree, node => node.type === 'button' && node.props['aria-label'] === labels[1]).props.onClick();
    expect(store.toolData.dissection.inspectionLens).toBe(false);
  });

  it('retains Advanced settings through native Essentials switching, saving, reload, and return to Advanced', () => {
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const store = newStore({ dissection: { ...advancedPreferences, specimen: 'frog', activeLayer: 'skin',
      workspaceMode: 'advanced', _dissLoadedSpec: 'frog', reducedMotion: true,
      visualEvidence: [{ id: 11, image: 'data:image/jpeg;base64,eA==', layer: 'skin' }], referenceEvidenceId: 11,
      organNotes: { 'frog|nictitating': 'A transparent membrane covers the eye.' } } });
    const initial = view(config, store);
    const essentialsButton = elementMatching(initial.tree, node => node.type === 'button' && node.props['aria-label'] === 'Essentials workspace');
    expect(essentialsButton).not.toBeNull();
    essentialsButton.props.onClick();
    const essentialsView = view(config, store);
    expect(store.toolData.dissection.workspaceMode).toBe('essentials');
    expect(essentialsView.html).toContain('data-workspace-mode="essentials"');
    vi.advanceTimersByTime(121);
    const saved = JSON.parse(localStorage.getItem('dissection_progress_frog'));
    expect(saved).toMatchObject(advancedPreferences);

    const reloaded = newStore({ dissection: { specimen: 'frog', workspaceMode: 'essentials', reducedMotion: true } });
    view(config, reloaded);
    vi.advanceTimersByTime(0);
    expect(reloaded.toolData.dissection).toMatchObject(advancedPreferences);
    expect(reloaded.toolData.dissection.organNotes).toEqual(store.toolData.dissection.organNotes);
    const reloadedView = view(config, reloaded);
    const advancedButton = elementMatching(reloadedView.tree, node => node.type === 'button' && node.props['aria-label'] === 'Advanced workspace');
    advancedButton.props.onClick();
    view(config, reloaded);
    expect(reloaded.toolData.dissection.workspaceMode).toBe('advanced');
    expect(workspaceSettings(reloaded.toolData.dissection, 'advanced')).toEqual(advancedPreferences);
  });

  it.each([null, 4, false, [], {}, { toString: null }])('protects a saved record containing the invalid note value %j', (invalidNote) => {
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const raw = JSON.stringify({ schemaVersion: 21, organNotes: { 'frog|nictitating': invalidNote } });
    localStorage.setItem('dissection_progress_frog', raw);
    const store = newStore({ dissection: { specimen: 'frog', workspaceMode: 'essentials', reducedMotion: true } });
    view(config, store);
    vi.advanceTimersByTime(0);
    expect(store.toolData.dissection._dissLoadedSpec).toBe('frog');
    expect(store.toolData.dissection.organNotes).toEqual({});
    const restored = view(config, store);
    expect(restored.html).toContain('Protected saved progress');
    vi.advanceTimersByTime(200);
    expect(localStorage.getItem('dissection_progress_frog')).toBe(raw);
  });

  it('keeps an unexpected in-memory note harmless while rendering and reviewing evidence', () => {
    const invalidNote = { toString: null };
    expect(noteText({ target: invalidNote }, 'target')).toBe('');
    expect(noteText({ target: '  visible feature  ' }, 'target')).toBe('  visible feature  ');
    const config = loadTool('stem_lab/stem_tool_dissection.js', 'dissection');
    const store = newStore({ dissection: { specimen: 'frog', workspaceMode: 'essentials', _dissLoadedSpec: 'frog',
      activeLayer: 'skin', selectedOrgan: 'nictitating', revealedLayers: { skin: true },
      exploredOrgans: { 'frog|nictitating': true }, organNotes: { 'frog|nictitating': invalidNote } } });
    expect(() => view(config, store)).not.toThrow();
  });
});
