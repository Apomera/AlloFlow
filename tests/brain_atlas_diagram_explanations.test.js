import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { loadTool, makeCtx, newStore, React, ReactDOMClient, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const views = [
  'lateral', 'medial', 'superior', 'inferior', 'cranialNervesWillis', 'homunculus', 'visualPathway', 'languageNetwork',
  'strokeTerritories', 'cerebellumClinic', 'brainstemCrossSection', 'csfHydrocephalus', 'prenatalDevelopment',
  'neurotransmitters', 'neuron', 'synapses', 'basalGangliaLoop', 'limbicPapezLoop', 'stimulate', 'sleepStages',
  'eegWaves', 'crossLateral', 'neuromyths'
];
const explanation = 'data-brainatlas-explanation';
const overview = 'data-brainatlas-explanation-overview';
const reading = 'data-brainatlas-explanation-reading';
function flatten(node) {
  return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...flatten(node.props?.children)];
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (node && typeof node === 'object') return textOf(node.props?.children);
  return typeof node === 'string' || typeof node === 'number' ? String(node) : '';
}
let root, host;
beforeEach(() => { resetStemLab(); vi.useFakeTimers(); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); });
afterEach(async () => {
  if (root) await React.act(async () => root.unmount());
  root = null; host?.remove(); host = null;
  vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});

function setup(initial = {}, context = {}) {
  const tool = loadTool('stem_lab/stem_tool_brainatlas.js', 'brainAtlas');
  const store = newStore({ brainAtlas: { view: 'lateral', atlasDisplayMode: 'diagram', ...initial } });
  const render = (updates = {}) => {
    Object.assign(store.toolData.brainAtlas, updates);
    const nodes = flatten(tool.render(makeCtx(context, store)));
    const shell = nodes.find(node => node.props?.['data-brainatlas-canvas-shell'] === 'true');
    const details = flatten(shell).find(node => node.props?.[explanation] !== undefined);
    expect(details?.type).toBe('details');
    const blocks = flatten(details);
    return { nodes, shell, details, context: details.props['data-brainatlas-explanation-context'], summary: textOf(blocks.find(node => node.type === 'summary')),
      overview: textOf(blocks.find(node => node.props?.[overview] !== undefined)),
      reading: textOf(blocks.find(node => node.props?.[reading] !== undefined)) };
  };
  return { store, render };
}

describe('Brain Atlas optional diagram explanations', () => {
  it.each([
    ['echoes an unknown key', key => key],
    ['returns no translation', () => undefined]
  ])('keeps anatomy titles and selectable region names readable when the translator %s', (name, translate) => {
    const s = setup({}, { t: translate });
    const anatomy = [
      ['lateral', 'Lateral', ['Frontal Lobe', 'Prefrontal Cortex', 'Primary Motor Cortex', 'Parietal Lobe', 'Temporal Lobe', 'Occipital Lobe', 'Cerebellum']],
      ['medial', 'Medial (Sagittal)', ['Corpus Callosum', 'Thalamus', 'Hypothalamus', 'Cingulate Gyrus', 'Hippocampus', 'Amygdala', 'Basal Ganglia']],
      ['superior', 'Superior (Top)', ['Longitudinal Fissure', 'Central Sulcus (Rolandic)', 'Frontal Lobes (Superior View)', 'Parietal Lobes (Superior View)']],
      ['inferior', 'Inferior (Bottom)', ['Olfactory Bulbs/Tracts (CN I)', 'Optic Chiasm (CN II)', 'Temporal Lobes (Inferior)', 'Cerebellum (Inferior)', 'Medulla Oblongata (Inferior)']]
    ];
    for (const [view, title, regionNames] of anatomy) {
      const result = s.render({ view });
      const titleNode = result.nodes.find(node => node.props?.className === 'brainatlas-canvas-title');
      expect(textOf(titleNode), view).toBe(title);
      const directory = result.nodes.find(node => node.props?.['data-brainatlas-region-list'] === 'true');
      const names = flatten(directory).filter(node => node.props?.className?.includes('brainatlas-region-item-name')).map(textOf);
      expect(names, view).toEqual(expect.arrayContaining(regionNames));
      const buttons = flatten(directory).filter(node => node.props?.['data-brainatlas-region-button'] === 'true');
      expect(buttons.length, view).toBe(names.length);
      buttons.forEach((button, index) => expect(button.props['aria-label']).toContain(names[index]));
      expect(textOf(result.nodes), view).not.toContain('stem.synth_ui.');
      expect(result.overview, view).not.toContain('stem.brainatlas.');
      expect(result.overview.length, view).toBeGreaterThan(30);
      expect(result.reading, view).not.toContain('stem.brainatlas.');
      expect(result.reading.length, view).toBeGreaterThan(30);
      expect(result.summary, view).toContain('Explain this diagram');
    }
  });

  it('preserves translated anatomy and explanations and interpolates translated model titles', () => {
    const translations = {
      'stem.synth_ui.lateral': 'Vista lateral',
      'stem.synth_ui.frontal_lobe': 'Lóbulo frontal',
      'stem.brainatlas.explain_diagram': 'Explicar este diagrama',
      'stem.brainatlas.explanation_lateral_overview': 'La vista lateral muestra el lado del cerebro.',
      'stem.brainatlas.p_view_3d_anatomy': 'Anatomía en 3D · {name}'
    };
    const s = setup({}, { t: key => translations[key] ?? key });
    const diagram = s.render();
    expect(textOf(diagram.nodes.find(node => node.props?.className === 'brainatlas-canvas-title'))).toBe('Vista lateral');
    const directory = diagram.nodes.find(node => node.props?.['data-brainatlas-region-list'] === 'true');
    expect(textOf(directory)).toContain('Lóbulo frontal');
    expect(textOf(directory)).toContain('Parietal Lobe');
    expect(diagram.summary).toContain('Explicar este diagrama');
    expect(diagram.overview).toBe(translations['stem.brainatlas.explanation_lateral_overview']);
    expect(diagram.reading.length).toBeGreaterThan(30);
    expect(diagram.reading).not.toContain('stem.brainatlas.');
    const model = s.render({ atlasDisplayMode: '3d' });
    expect(textOf(model.nodes.find(node => node.props?.className === 'brainatlas-canvas-title'))).toBe('Anatomía en 3D · Vista lateral');
    expect(model.overview).toMatch(/Rotate/);
    expect(model.reading).not.toContain('stem.brainatlas.');
  });

  it('gives every 2D view its own overview and reading guidance alongside the existing canvas description', () => {
    const s = setup();
    const pairs = new Set();
    for (const view of views) {
      const result = s.render({ view });
      expect(result.context).toBe(view);
      expect(result.summary.trim().length).toBeGreaterThan(0);
      expect(result.overview.trim().length, view).toBeGreaterThan(20);
      expect(result.reading.trim().length, view).toBeGreaterThan(20);
      pairs.add(result.overview + result.reading);
      const nodes = flatten(result.shell);
      expect(nodes.find(node => node.props?.id === 'brainatlas-canvas-summary')).toBeDefined();
      expect(nodes.some(node => node.type === 'canvas' && node.props?.['aria-describedby'] === 'brainatlas-canvas-summary')).toBe(true);
      expect(flatten(result.details).some(node => node.props?.['aria-live'])).toBe(false);
    }
    expect(pairs.size).toBe(views.length);
  }, 20000);

  it('keeps the native summary focused and open as the learner selects anatomy or changes view', async () => {
    const s = setup();
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    const mount = async changes => {
      const { shell, details } = s.render(changes);
      // Preserve the actual shell's React child positions, leaving out unrelated canvases.
      // A disclosure nested in a footer hidden by fullscreen is not accessible on that surface.
      const children = shell.props.children.map(child => child === details ? details : null);
      expect(children).toContain(details);
      await React.act(async () => root.render(React.cloneElement(shell, {}, children)));
    };
    await mount();
    const details = host.querySelector('details');
    const summary = details.querySelector(':scope > summary');
    expect(summary).toBeTruthy(); expect(details.open).toBe(false);
    summary.focus(); await React.act(async () => summary.click());
    expect(details.open).toBe(true); expect(document.activeElement).toBe(summary);
    const initial = host.querySelector(`[${overview}]`).textContent;
    await mount({ selectedRegion: 'frontal' });
    expect(details.open).toBe(true);
    await mount({ view: 'medial', selectedRegion: null });
    expect(host.querySelector('details')).toBe(details);
    expect(details.open).toBe(true); expect(document.activeElement).toBe(summary);
    expect(host.querySelector(`[${overview}]`).textContent).not.toBe(initial);
    await mount({ atlasDisplayMode: '3d' });
    expect(host.querySelector('details')).toBe(details);
    expect(details.dataset.brainatlasExplanationContext).toBe('3d');
    expect(details.open).toBe(true); expect(document.activeElement).toBe(summary);
    await React.act(async () => summary.click()); expect(details.open).toBe(false);
  });

  it('explains the active 3D convention for the plain model, comparison, cutaway, and pathway', () => {
    const s = setup({ atlasDisplayMode: '3d' });
    const content = (context, changes) => { const result = s.render(changes); expect(result.context).toBe(context); return result.overview + ' ' + result.reading; };
    const normal = content('3d', {});
    const compare = content('3d-compare', { brain3DCompareActive: true, brain3DCompareStructures: ['Allen_body_of_hippocampus_L', 'Allen_amygdaloid_complex_L'] });
    const cutaway = content('3d-cutaway', { brain3DCompareActive: false, brain3DCompareStructures: [], brain3DSliceAxis: 'coronal' });
    const pathway = content('3d-pathway', { brain3DSliceAxis: 'off', brain3DPathway: 'visual' });
    expect(new Set([normal, compare, cutaway, pathway]).size).toBe(4);
    expect(normal).toMatch(/rotat|viewpoint|compass|angle/i);
    expect(compare).toMatch(/\bA\b/); expect(compare).toMatch(/\bB\b/);
    expect(cutaway).toMatch(/plane|retained/i);
    expect(pathway).toMatch(/step|sequence/i);
  });

  it.each([
    ['2D quiz', 'diagram', { quizMode: true }],
    ['Find It', '3d', { brain3DChallengeActive: true }],
    ['saved quiz', '3d', { brain3DSavedQuizActive: true }]
  ])('uses neutral practice guidance in the %s instead of revealing target-specific content', (name, mode, assessment) => {
    const s = setup({ atlasDisplayMode: mode });
    const normal = s.render();
    const first = s.render({ ...assessment, selectedRegion: 'frontal', selected3DStructure: 'Allen_body_of_hippocampus_L' });
    const next = s.render({ view: 'medial', selectedRegion: 'amygdala', selected3DStructure: 'Allen_amygdaloid_complex_L', brain3DChallengeRound: 1 });
    const firstCopy = first.overview + first.reading, nextCopy = next.overview + next.reading;
    expect(first.context).toBe('practice'); expect(next.context).toBe('practice');
    expect(firstCopy).not.toBe(normal.overview + normal.reading);
    expect(firstCopy).toBe(nextCopy);
    expect(firstCopy).not.toMatch(/hippocamp|amygdal|frontal lobe/i);
    expect(firstCopy.trim().length).toBeGreaterThan(30);
  });
});
