import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resetStemLab, loadTool, renderTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_brainatlas.js';
const VIEWS = [
  'lateral',
  'medial',
  'superior',
  'inferior',
  'cranialNervesWillis',
  'homunculus',
  'visualPathway',
  'languageNetwork',
  'neurotransmitters',
  'neuron',
  'synapses',
  'basalGangliaLoop',
  'limbicPapezLoop',
  'stimulate',
  'sleepStages',
  'eegWaves',
  'crossLateral',
];

const render = (state, overrides) => renderTool('brainAtlas', { brainAtlas: state || {} }, overrides || {});

describe('brainAtlas refinement contracts', () => {
  beforeEach(() => resetStemLab());

  it('keeps the Brain Atlas shell wired to AlloFlow theme tokens', () => {
    const src = readFileSync(FILE, 'utf8');

    [
      '--allo-stem-canvas',
      '--allo-stem-panel',
      '--allo-stem-deeper',
      '--allo-stem-text',
      '--allo-stem-text-soft',
      '--allo-stem-border',
      '--allo-stem-button-bg',
      '--allo-stem-button-text',
      '--allo-stem-button-border',
    ].forEach((token) => expect(src).toContain(token));

    expect(src).toContain('.theme-dark .brainatlas-tool-shell');
    expect(src).toContain('.theme-contrast .brainatlas-tool-shell');
    expect(src).toContain('.brainatlas-tool-shell .bg-white');
    expect(src).toContain('.brainatlas-detail-panel{border-radius:8px!important;background:var(--ba-surface)!important');
  });

  it('gives every Brain Atlas canvas a visible text equivalent and teacher prompt', () => {
    loadTool(FILE, 'brainAtlas');

    VIEWS.forEach((view) => {
      const html = render({ view });
      expect(html).toContain('role="img"');
      expect(html).toContain('aria-describedby="brainatlas-canvas-summary"');
      expect(html).toContain('id="brainatlas-canvas-summary"');
      expect(html).toContain('data-brainatlas-canvas-summary="true"');
      expect(html).toContain('data-brainatlas-teacher-prompt="true"');
      expect(html).toMatch(/Canvas summary/);
      expect(html).toMatch(/Teacher move/);
    });
  });

  it('keeps the dense neuron and synapse canvases roomy enough for labels', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const neuron = render({ view: 'neuron' });
    expect(neuron).toContain('width="820"');
    expect(neuron).toContain('height="760"');

    const synapses = render({ view: 'synapses' });
    expect(synapses).toContain('width="780"');
    expect(synapses).toContain('height="620"');

    expect(src).toContain('function pulsePoint(pt, color, label)');
    expect(src).toContain('legendChip(x0 + 8, 66');
  });

  it('keeps EEG activity modes accessible outside the canvas drawing', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'eegWaves', eegActivity: 'studying' });

    expect(html).toContain('data-brainatlas-eeg-modes="true"');
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="EEG activity mode"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toMatch(/Studying/);
    expect(html).toMatch(/Active state: Studying/);
    expect(src).toContain('var EEG_ACTIVITY_MODES = [');
    expect(src).toContain("upd('eegActivity', mode.id)");

    const fallback = render({ view: 'eegWaves', eegActivity: 'studying' }, { t: () => undefined });
    expect(fallback).toContain('aria-label="EEG activity mode"');
    expect(fallback).toMatch(/Active state: Studying/);
  });

  it('adds a labeled motor and sensory homunculus diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'homunculus' });

    expect(html).toContain('Motor/Sensory Homunculus');
    expect(html).toContain('width="720"');
    expect(html).toContain('height="560"');
    expect(html).toMatch(/primary motor cortex/i);
    expect(html).toMatch(/primary somatosensory cortex/i);
    expect(html).toMatch(/central sulcus/i);
    expect(html).toMatch(/6 targets/);
    expect(src).toContain('currentView.isHomunculus');
    expect(src).toContain('Motor and sensory homunculus');
    expect(src).toContain('Primary somatosensory cortex');

    const detail = render({ view: 'homunculus', selectedRegion: 'hand_hom' });
    expect(detail).toMatch(/Hand Area/);
    expect(detail).toMatch(/fine finger control/);
  });

  it('adds a visual pathway field-cut diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'visualPathway' });

    expect(html).toContain('Visual Pathway');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/optic chiasm/i);
    expect(html).toMatch(/LGN/);
    expect(html).toMatch(/bitemporal hemianopia/i);
    expect(html).toMatch(/quadrantanopia/i);
    expect(html).toMatch(/9 targets/);
    expect(src).toContain('currentView.isVisualPathway');
    expect(src).toContain('Visual pathway and field cuts');
    expect(src).toContain('FIELD-CUT DECODER');
    expect(src).toContain('Before chiasm');
    expect(src).toContain('homonymous');
    expect(src).toContain('fieldCard(W * 0.195');

    const detail = render({ view: 'visualPathway', selectedRegion: 'optic_chiasm_visual_path' });
    expect(detail).toMatch(/Optic Chiasm/);
    expect(detail).toMatch(/bitemporal hemianopia/i);

    const decoder = render({ view: 'visualPathway', selectedRegion: 'field_cut_decoder_visual' });
    expect(decoder).toMatch(/Field-Cut Decoder/);
    expect(decoder).toMatch(/Before the chiasm/i);
    expect(decoder).toMatch(/macular sparing/i);
  });

  it('adds a language network aphasia diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'languageNetwork' });

    expect(html).toContain('Language Network');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/Broca/i);
    expect(html).toMatch(/Wernicke/i);
    expect(html).toMatch(/Arcuate/i);
    expect(html).toMatch(/aphasia/i);
    expect(html).toMatch(/10 targets/);
    expect(src).toContain('currentView.isLanguageNetwork');
    expect(src).toContain('BROCA: nonfluent output');
    expect(src).toContain('WERNICKE: fluent but poor comprehension');
    expect(src).toContain('CONDUCTION: repetition breaks');

    const detail = render({ view: 'languageNetwork', selectedRegion: 'arcuate_language' });
    expect(detail).toMatch(/Arcuate Fasciculus/);
    expect(detail).toMatch(/conduction aphasia/i);
  });

  it('adds a cranial nerves and Circle of Willis underside map', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'cranialNervesWillis' });

    expect(html).toContain('Cranial Nerves &amp; Willis');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/Circle of Willis/i);
    expect(html).toMatch(/CN III/i);
    expect(html).toMatch(/PComm/i);
    expect(html).toMatch(/Basilar/i);
    expect(html).toMatch(/12 targets/);
    expect(src).toContain('currentView.isCranialWillis');
    expect(src).toContain('Cranial nerves and Circle of Willis');
    expect(src).toContain('pupil-involving CN III palsy suggests PComm aneurysm');

    const detail = render({ view: 'cranialNervesWillis', selectedRegion: 'oculomotor_cn_iii_cw' });
    expect(detail).toMatch(/Oculomotor/);
    expect(detail).toMatch(/down-and-out eye/i);
  });

  it('adds a basal ganglia direct and indirect pathway diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'basalGangliaLoop' });

    expect(html).toContain('Basal Ganglia Loop');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/direct/i);
    expect(html).toMatch(/indirect/i);
    expect(html).toMatch(/dopamine/i);
    expect(html).toMatch(/10 targets/);
    expect(src).toContain('currentView.isBasalGanglia');
    expect(src).toContain('DIRECT PATHWAY: GO');
    expect(src).toContain('INDIRECT PATHWAY: NO-GO');

    const detail = render({ view: 'basalGangliaLoop', selectedRegion: 'snc_dopamine_bg' });
    expect(detail).toMatch(/Substantia Nigra/);
    expect(detail).toMatch(/Parkinson/i);
  });

  it('adds a limbic and Papez memory-emotion circuit diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'limbicPapezLoop' });

    expect(html).toContain('Limbic / Papez Loop');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/Papez/i);
    expect(html).toMatch(/Hippocampus/i);
    expect(html).toMatch(/Amygdala/i);
    expect(html).toMatch(/Hypothalamus/i);
    expect(html).toMatch(/13 targets/);
    expect(src).toContain('currentView.isLimbicPapez');
    expect(src).toContain('PAPEZ MEMORY LOOP');
    expect(src).toContain('AMYGDALA OUTPUT');

    const detail = render({ view: 'limbicPapezLoop', selectedRegion: 'mammillary_limbic' });
    expect(detail).toMatch(/Mammillary Bodies/);
    expect(detail).toMatch(/Wernicke-Korsakoff/i);
  });

  it('enhances cross-lateralization with corpus callosum research visuals', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'crossLateral' });

    expect(html).toContain('Cross-Lateralization');
    expect(html).toContain('width="780"');
    expect(html).toContain('height="620"');
    expect(html).toMatch(/Corpus Callosum/i);
    expect(html).toMatch(/Split-Brain Phenomenon/i);
    expect(html).toMatch(/8 targets/);
    expect(html).toMatch(/fixation task/i);
    expect(html).toMatch(/left visual field -&gt; right hemisphere/i);
    expect(src).toContain('SPLIT-BRAIN EVIDENCE');
    expect(src).toContain('CALLOSAL TRANSFER');
    expect(src).toContain('FIXATION TASK');
    expect(src).toContain('INTACT');
    expect(src).toContain('speech can name KEY');
    expect(src).toContain('CALLOSOTOMY');
    expect(src).toContain('Speech report');
    expect(src).toContain('picks KEY');
    expect(src).toContain('callosotomy blocks');

    const detail = render({ view: 'crossLateral', selectedRegion: 'split_brain' });
    expect(detail).toMatch(/Sperry and Gazzaniga/i);
    expect(detail).toMatch(/fixation tasks/i);
    expect(detail).toMatch(/left hand/i);

    const taskDetail = render({ view: 'crossLateral', selectedRegion: 'fixation_task_cross' });
    expect(taskDetail).toMatch(/Split-Brain Fixation Task/);
    expect(taskDetail).toMatch(/speech can name KEY/);
    expect(taskDetail).toMatch(/left hand can still choose/i);
  });

  it('keeps simulation views discoverable as one grouped visual-support path', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'stimulate', viewGroup: 'simulations' });

    expect(html).toContain('data-brainatlas-active-group="simulations"');
    expect(html).toContain('data-brainatlas-visible-group="simulations"');
    expect(html).toMatch(/Stimulation Lab/);
    expect(html).toMatch(/Sleep Stages/);
    expect(html).toMatch(/EEG Waves/);
    expect(html).toMatch(/Cross-Lateralization/);
    expect(html).not.toMatch(/Medial Sagittal/);
  });

  it('keeps the homunculus discoverable in the atlas view group', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'lateral', viewGroup: 'atlas' });

    expect(html).toContain('data-brainatlas-visible-group="atlas"');
    expect(html).toMatch(/Cranial Nerves &amp; Willis/);
    expect(html).toMatch(/Motor\/Sensory Homunculus/);
    expect(html).toMatch(/Visual Pathway/);
    expect(html).toMatch(/Language Network/);
  });

  it('keeps the basal ganglia movement loop discoverable in the systems view group', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'neurotransmitters', viewGroup: 'systems' });

    expect(html).toContain('data-brainatlas-visible-group="systems"');
    expect(html).toMatch(/Basal Ganglia Loop/);
    expect(html).toMatch(/Limbic \/ Papez Loop/);
  });

  it('keeps neurotransmitter details plain by default and advanced on request', () => {
    loadTool(FILE, 'brainAtlas');

    const plain = render({ view: 'neurotransmitters', selectedRegion: 'dopamine' });
    expect(plain).toContain('data-brainatlas-detail-mode="plain"');
    expect(plain).toMatch(/Student takeaway/);
    expect(plain).not.toMatch(/Synthesis Pathway/);
    expect(plain).not.toMatch(/Receptor Subtypes/);
    expect(plain).not.toMatch(/Neural Pathways/);
    expect(plain).not.toMatch(/Pharmacology/);

    const advanced = render({ view: 'neurotransmitters', selectedRegion: 'dopamine', detailMode: 'advanced' });
    expect(advanced).toContain('data-brainatlas-detail-mode="advanced"');
    expect(advanced).toMatch(/Synthesis Pathway/);
    expect(advanced).toMatch(/Receptor Subtypes/);
    expect(advanced).toMatch(/Neural Pathways/);
    expect(advanced).toMatch(/Pharmacology/);
  });

  it('falls back safely when the selected-region label translation is missing', () => {
    loadTool(FILE, 'brainAtlas');

    const html = render({ view: 'lateral' }, { t: () => undefined });

    expect(html).toContain('None selected');
    expect(html).toContain('data-brainatlas-tool="true"');
  });

  it('normalizes older neurotransmitter inquiry state with no log array', () => {
    loadTool(FILE, 'brainAtlas');

    const html = render({
      view: 'neurotransmitters',
      showNtInquiry: true,
      ntInquiry: {
        dopamine: 70,
        log: null,
      },
    });

    expect(html).toContain('data-brainatlas-nt-inquiry="true"');
    expect(html).toMatch(/Dopamine/);
  });
});
