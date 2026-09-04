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
  'strokeTerritories',
  'cerebellumClinic',
  'brainstemCrossSection',
  'csfHydrocephalus',
  'neurotransmitters',
  'neuron',
  'prenatalDevelopment',
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

  it('keeps Brain Atlas source free of malformed Unicode artifacts', () => {
    const src = readFileSync(FILE, 'utf8');

    expect(src).not.toMatch(/[\u00C3\u00C2\u00F0\uFFFD]/u);
    expect(src).not.toContain('\u00e2');
    expect(src).not.toMatch(/(?:Weeks \d+-\d+|forebrain|gestational weeks) \? /);
    expect(src).toContain('\u{1F9E0}');
    expect(src).toContain('Approximate gestational weeks \u2022 Processes overlap');
  });

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
    expect(src).toContain('.brainatlas-detail-panel{border-radius:14px!important;background:var(--ba-surface)!important');
    expect(src).toContain('.brainatlas-detail-takeaways{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}');
    expect(src).toContain('.brainatlas-view-panel{border:1px solid var(--ba-border);border-radius:14px;');
    expect(src).toContain('.brainatlas-view-button{display:inline-flex;');
    expect(src).toContain('.brainatlas-detail-focus-header{display:grid;');
  });

  it('gives every Brain Atlas canvas a visible text equivalent and teacher prompt', () => {
    loadTool(FILE, 'brainAtlas');

    VIEWS.forEach((view) => {
      const html = render({ view });
      expect(html).toContain('role="img"');
      expect(html).toMatch(/<canvas[^>]*style="[^"]*width:100%[^"]*height:auto/);
      expect(html).toContain('aria-describedby="brainatlas-canvas-summary"');
      expect(html).toContain('id="brainatlas-canvas-summary"');
      expect(html).toContain('data-brainatlas-canvas-summary="true"');
      expect(html).toContain('data-brainatlas-teacher-prompt="true"');
      expect(html).toMatch(/Canvas summary/);
      expect(html).toMatch(/Teacher move/);
      const canvasSize = html.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
      expect(canvasSize).toBeTruthy();
      expect(Number(canvasSize[1])).toBeGreaterThanOrEqual(840);
      expect(Number(canvasSize[2])).toBeGreaterThanOrEqual(640);
      expect(html).not.toContain('max-w-6xl');
    });
  });

  it('keeps the dense neuron and synapse canvases roomy enough for labels', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const neuron = render({ view: 'neuron' });
    expect(neuron).toContain('width="1040"');
    expect(neuron).toContain('height="880"');
    expect(neuron).toMatch(/7 targets/);
    expect(neuron).toMatch(/spike-cycle decoder/i);

    const synapses = render({ view: 'synapses' });
    expect(synapses).toContain('width="1040"');
    expect(synapses).toContain('height="780"');
    expect(synapses).toMatch(/Synapse &amp; development - lifespan map/);
    expect(synapses).toMatch(/uncluttered development map/);

    expect(src).toContain('function pulsePoint(pt, color, label)');
    expect(src).toContain('brainAtlasDrawLegendGrid(x0 + 8, lifespanLegendY, pW - 16, lifespanLegendItems');
    expect(src).toContain('spike_cycle_decoder_neuron');
    expect(src).toContain('SPIKE CYCLE DECODER');
    expect(src).toContain('Threshold -55');
    expect(src).toContain('Refractory');

    const spike = render({ view: 'neuron', selectedRegion: 'spike_cycle_decoder_neuron' });
    expect(spike).toMatch(/Spike Cycle Decoder/);
    expect(spike).toMatch(/all-or-nothing/i);
    expect(spike).toMatch(/refractory/i);
  });

  it('adds an accessible prenatal brain-development timeline with roomy labels', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({
      view: 'prenatalDevelopment',
      viewGroup: 'development',
      prenatalWeek: 24,
      selectedRegion: 'prenatal_connections',
    });

    expect(html).toContain('data-brainatlas-active-group="development"');
    expect(html).toContain('data-brainatlas-visible-group="development"');
    expect(html).toContain('data-brainatlas-prenatal-controls="true"');
    expect(html).toContain('id="brainatlas-prenatal-week"');
    expect(html).toContain('data-brainatlas-prenatal-week="true">Week 24');
    expect(html).toMatch(/aria-valuetext="Gestational week 24, nearest milestone Long-range wiring"/);
    expect((html.match(/data-brainatlas-prenatal-stage=/g) || [])).toHaveLength(6);
    expect(html).toContain('data-brainatlas-prenatal-stage="prenatal_connections" aria-pressed="true"');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
    expect(html).toMatch(/Milestone/);
    expect(html).toMatch(/Also happening/);
    expect(html).toMatch(/Continues next/);
    expect(html).toMatch(/Development continues/);
    expect(html).toMatch(/processes overlap/i);

    expect(src).toContain('currentView.isPrenatal');
    expect(src).toContain("brainAtlasDrawCompactCanvasHeading('Brain development before birth'");
    expect(src).toContain('Approximate gestational weeks \u2022 Processes overlap');
    expect(src).toContain('.brainatlas-prenatal-stage-list{display:flex;');
  });

  it('provides a large responsive canvas with native and fallback fullscreen paths', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'lateral' });

    expect(html).toContain('id="brainatlas-canvas-fullscreen"');
    expect(html).toContain('data-brainatlas-fullscreen="true"');
    expect(html).toMatch(/Toggle full screen for the brain atlas diagram/);
    expect(html).toMatch(/Full screen/);

    expect(src).toContain('.brainatlas-canvas-shell:fullscreen');
    expect(src).toContain('.brainatlas-canvas-shell.brainatlas-fullscreen-fallback');
    expect(src).toContain('max-width:1440px!important');
    expect(src).toContain('el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen');
    expect(src).toContain('function setBrainAtlasFallbackFullscreen(el, enabled)');
    expect(src).toContain('var fontScale = Math.min(1.3 * diagramLabelScale');
    expect(src).toContain('* neuroTextScale * diagramLabelScale');
    expect(html).toContain('width="840"');
    expect(html).toContain('data-brainatlas-canvas-status="true"');
    expect(html).toContain('data-brainatlas-learning-footer="true"');
    expect(html).toContain('data-brainatlas-has-selection="false"');
    expect(src).toContain('.brainatlas-region-item-copy{font-size:11px;line-height:1.4');
    expect(src).not.toContain('line-clamp-1');

    const selected = render({ view: 'lateral', selectedRegion: 'frontal' });
    expect(selected).toContain('data-brainatlas-has-selection="true"');
    expect(selected).toContain('data-brainatlas-detail-focus="true"');
    expect(selected).toMatch(/Selected region/);
    expect(selected).toMatch(/stem\.synth_ui\.lateral.*Atlas/);
    expect(selected).toMatch(/Focus:/);
    expect(selected).toMatch(/Executive function/);
  });

  it('keeps diagram canvas text at a legible nine-pixel minimum', () => {
    const src = readFileSync(FILE, 'utf8');

    expect(src).not.toMatch(/ctx\.font\s*=\s*['"](?:bold )?8px/u);
    expect(src).not.toContain('fontSize: 8');
    expect(src).not.toMatch(/var (?:subtitlePx|bodyPx|textPx|titlePx|fontPx) = Math\.max\((?:7|8),/u);
    expect(src).toContain("Math.max(9, Math.round(6.2 * fontScale)) + 'px Inter");
    // clueChipY now derives from the banner-relative cwChipY (legibility
    // refactor) instead of a fixed H-proportion.
    expect(src).toContain('var clueChipY = cwChipY;');
    expect(src).toContain('var disorderChipY = H * 0.165;');
    expect(src).toContain('var limbicChipY = H * 0.165;');
    expect(src).toContain('var safePulseLabelMargin = Math.max(70, W * 0.085);');
  });

  it('presents search, quiz, and region browsing as clear responsive controls', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const filtered = render({ view: 'lateral', search: 'front' });
    expect(filtered).toContain('data-brainatlas-controls="true"');
    expect(filtered).toContain('for="brainatlas-region-search"');
    expect(filtered).toContain('data-brainatlas-clear-search="true"');
    expect(filtered).toContain('data-brainatlas-region-count="true"');
    expect(filtered).toContain('data-brainatlas-region-list="true"');
    expect(filtered).toContain('aria-labelledby="brainatlas-region-directory-title"');
    expect(filtered).toContain('data-brainatlas-region-button="true"');
    expect(filtered).toContain('data-brainatlas-region-index="true"');
    expect(filtered).toMatch(/Explore the diagram/);

    const empty = render({ view: 'lateral', search: 'no-such-region' });
    expect(empty).toContain('data-brainatlas-empty-results="true"');
    expect(empty).toContain('data-brainatlas-empty-clear="true"');
    expect(empty).toMatch(/No regions match your search/);
    expect(empty).toMatch(/Clear search/);

    const quiz = render({ view: 'lateral', quizMode: true });
    expect(quiz).toMatch(/aria-pressed="true" data-brainatlas-quiz-toggle="true"/);
    expect(src).toContain('.brainatlas-controls{display:grid;grid-template-columns:minmax(260px,1fr) auto;');
    expect(src).toContain('.brainatlas-region-item{position:relative;display:grid;');
  });

  it('keeps every guided route discoverable in a compact horizontal explorer', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'lateral' });

    expect(html).toContain('data-brainatlas-route-library="true"');
    expect(html).toContain('aria-labelledby="brainatlas-route-library-title"');
    expect(html).toContain('data-brainatlas-route-grid="true"');
    expect(html).toContain('data-brainatlas-route-card="true"');
    expect((html.match(/data-brainatlas-route-card="true"/g) || [])).toHaveLength(16);
    expect(html).toContain('data-brainatlas-route-active="true"');
    expect(html).toMatch(/Guided exploration/);
    expect(html).toMatch(/16 paths/);
    expect(html).toMatch(/Open diagram/);
    expect(html).toMatch(/Map the lobes/);
    expect(html).toMatch(/Trace left vs right/);
    expect(src).toContain('.brainatlas-route-grid{display:flex;');
    expect(src).toContain('scroll-snap-type:x proximity');
    expect(src).toContain('.brainatlas-mission{position:relative;overflow:hidden;border:1px solid var(--ba-border);border-radius:16px;');
  });

  it('provides a polished header with direct navigation to the large diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'lateral' });

    expect(html).toContain('data-brainatlas-topbar="true"');
    expect(html).toMatch(/STEM learning lab/);
    expect(html).toContain('data-brainatlas-jump-to-diagram="true"');
    expect(html).toMatch(/View the large Brain Atlas diagram/);
    expect(html).toMatch(/View diagram/);
    expect(html).toContain('data-brainatlas-canvas-heading="true"');
    expect(html).toMatch(/Interactive diagram/);
    expect(html).toContain('data-brainatlas-view-position="true"');
    expect(html).toMatch(/View 1 \/ \d+/);
    expect(src).toContain('function scrollToBrainAtlasDiagram()');
    expect(src).toContain("el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });");
    expect(src).toContain('scroll-margin-top:16px');
    expect(src).toContain('.brainatlas-topbar{display:grid;grid-template-columns:auto minmax(0,1fr) auto;');
    expect(src).toContain('.brainatlas-canvas-eyebrow{');
  });

  it('lets learners compact the mission overview while keeping the atlas available', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const expanded = render({ view: 'lateral', overviewCollapsed: false });
    const collapsed = render({ view: 'lateral', overviewCollapsed: true });

    expect(expanded).toContain('data-brainatlas-overview-collapsed="false"');
    expect(expanded).toContain('data-brainatlas-overview-toggle="true"');
    expect(expanded).toContain('aria-expanded="true"');
    expect(expanded).toMatch(/Collapse overview/);
    expect(collapsed).toContain('data-brainatlas-overview-collapsed="true"');
    expect(collapsed).toContain('aria-expanded="false"');
    expect(collapsed).toMatch(/Browse topics/);
    expect(collapsed).toContain('data-brainatlas-route-library="true"');
    expect(src).toContain('.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mission-copy');
    expect(src).toContain('.brainatlas-mission[data-brainatlas-overview-collapsed="true"] .brainatlas-mission-inner{grid-template-columns:minmax(0,1fr);');
    expect(src).toContain('.brainatlas-overview-toggle{display:inline-flex;');
  });

  it('provides bounded diagram zoom without changing logical canvas dimensions', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const defaultHtml = render({ view: 'lateral' });
    const enlarged = render({ view: 'lateral', canvasZoom: 1.5 });
    const clamped = render({ view: 'lateral', canvasZoom: 9 });

    expect(defaultHtml).toContain('data-brainatlas-zoom-controls="true"');
    expect(defaultHtml).toContain('data-brainatlas-zoom-out="true"');
    expect(defaultHtml).toContain('data-brainatlas-zoom-level="true"');
    expect(defaultHtml).toContain('data-brainatlas-zoom-in="true"');
    expect(defaultHtml).toContain('data-brainatlas-canvas-zoom-frame="true"');
    expect(defaultHtml).toContain('data-brainatlas-zoom="1.00"');
    expect(defaultHtml).toMatch(/>100%<\/button>/);
    expect(defaultHtml).toContain('width="840"');
    expect(defaultHtml).toContain('height="640"');

    expect(enlarged).toContain('data-brainatlas-zoom="1.50"');
    expect(enlarged).toMatch(/>150%<\/button>/);
    expect(enlarged).toContain('width:150%');
    expect(enlarged).toContain('max-width:1740px');
    expect(clamped).toContain('data-brainatlas-zoom="1.50"');

    expect(src).toContain('function setBrainAtlasZoom(nextZoom)');
    expect(src).toContain('.brainatlas-canvas-stage{display:flex;flex:1 1 auto;min-height:0;align-items:center;justify-content:flex-start;overflow:auto;');
    expect(src).toContain('.brainatlas-canvas-zoom-frame .brainatlas-canvas{max-width:none!important;}');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-zoom-controls');
  });

  it('uses compact immersive chrome to maximize the fullscreen diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const normal = render({ view: 'languageNetwork', canvasZoom: 1.25 });

    expect(normal).toContain('data-brainatlas-scrollable="true"');
    expect(normal).toMatch(/Diagram enlarged.*scroll to explore/i);
    expect(normal).toContain('brainatlas-fullscreen-enter-label');
    expect(normal).toContain('brainatlas-fullscreen-exit-label');
    expect(normal).toContain('brainatlas-fullscreen-shortcut');
    expect(normal).toMatch(/Exit full screen/);
    expect(normal).toMatch(/>Esc<\/span>/);
    expect(src).toContain('scrollbar-gutter:stable both-edges');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-header');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-canvas-status');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-learning-footer');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-exit-label');
  });

  it('keeps previous and next diagram navigation compact and wraparound-safe', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const first = render({ view: 'lateral' });
    const last = render({ view: 'crossLateral' });

    expect(first).toContain('data-brainatlas-fullscreen-navigator="true"');
    expect(first).toContain('data-brainatlas-previous-view="true"');
    expect(first).toContain('data-brainatlas-next-view="true"');
    expect(first).toContain('data-brainatlas-fullscreen-position="true"');
    expect(first).toMatch(/data-brainatlas-fullscreen-position="true" aria-live="polite">1 \/ 22/);
    expect(last).toContain('data-brainatlas-fullscreen-position="true"');
    expect(last).toMatch(/data-brainatlas-fullscreen-position="true" aria-live="polite">22 \/ 22/);
    expect(src).toContain('function stepBrainAtlasView(direction)');
    expect(src).toContain('VIEW_KEYS[(currentViewIndex - 1 + VIEW_KEYS.length) % VIEW_KEYS.length]');
    expect(src).toContain('VIEW_KEYS[(currentViewIndex + 1) % VIEW_KEYS.length]');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-fullscreen-navigator');
    expect(src).toContain('.brainatlas-fullscreen-navigator{display:none;');
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
    expect(html).toContain('data-brainatlas-eeg-readout="true"');
    expect(html).toMatch(/Studying readout/);
    expect(html).toMatch(/Beta\/gamma increase with focus/);
    expect(html).toMatch(/Interpretation caution/);
    expect(html).toMatch(/stress, caffeine, and artifact/i);
    expect(src).toContain('var EEG_ACTIVITY_MODES = [');
    expect(src).toContain('var EEG_STATE_READOUTS = {');
    expect(src).toContain('activeEegReadout');
    expect(src).toContain("upd('eegActivity', mode.id)");

    const fallback = render({ view: 'eegWaves', eegActivity: 'studying' }, { t: () => undefined });
    expect(fallback).toContain('aria-label="EEG activity mode"');
    expect(fallback).toContain('data-brainatlas-eeg-readout="true"');
    expect(fallback).toMatch(/Active state: Studying/);
    expect(fallback).toMatch(/Studying readout/);
  });

  it('adds a labeled motor and sensory homunculus diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'homunculus' });

    expect(html).toContain('Motor/Sensory Homunculus');
    expect(html).toContain('width="960"');
    expect(html).toContain('height="720"');
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
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
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
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
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

  it('adds clinical localization maps for stroke, cerebellum, and brainstem cases', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const stroke = render({ view: 'strokeTerritories', viewGroup: 'clinical' });
    expect(stroke).toContain('Stroke Territories');
    expect(stroke).toContain('width="1040"');
    expect(stroke).toContain('height="780"');
    expect(stroke).toMatch(/8 targets/);
    expect(stroke).toMatch(/Clinical/);
    expect(stroke).toMatch(/Stroke territories - clinical map/);
    expect(stroke).toMatch(/ACA Territory/);
    expect(stroke).toMatch(/Stroke Case Decoder/);
    expect(src).toContain('currentView.isStrokeTerritory');
    expect(src).toContain('Stroke territory localization');
    expect(src).toContain('CASE MODE: deficit pattern -> likely territory');
    expect(src).toContain('MCA superior');

    const cerebellum = render({ view: 'cerebellumClinic', viewGroup: 'clinical' });
    expect(cerebellum).toContain('Cerebellum Clinic');
    expect(cerebellum).toContain('width="1040"');
    expect(cerebellum).toContain('height="780"');
    expect(cerebellum).toMatch(/8 targets/);
    expect(cerebellum).toMatch(/Cerebellum clinic - ataxia map/);
    expect(cerebellum).toMatch(/PICA Territory/);
    expect(cerebellum).toMatch(/Cerebellar Case Decoder/);
    expect(src).toContain('currentView.isCerebellumClinic');
    expect(src).toContain('Cerebellum clinic map');
    expect(src).toContain('CASE MODE: sign -> cerebellar zone');
    expect(src).toContain('same-side coordination signs');

    const brainstem = render({ view: 'brainstemCrossSection', viewGroup: 'clinical' });
    expect(brainstem).toContain('Brainstem Cross-Section');
    expect(brainstem).toContain('width="1040"');
    expect(brainstem).toContain('height="780"');
    expect(brainstem).toMatch(/8 targets/);
    expect(brainstem).toMatch(/Brainstem - crossed findings/);
    expect(brainstem).toMatch(/Crossed Findings Decoder/);
    expect(src).toContain('currentView.isBrainstemCross');
    expect(src).toContain('Brainstem crossed-findings map');
    expect(src).toContain('CASE MODE: crossed finding -> level');
    expect(src).toContain('ipsilateral cranial nerve signs');

    const strokeDetail = render({ view: 'strokeTerritories', selectedRegion: 'stroke_case_decoder' });
    expect(strokeDetail).toMatch(/Stroke Case Decoder/);
    expect(strokeDetail).toMatch(/leg greater than arm/i);

    const brainstemDetail = render({ view: 'brainstemCrossSection', selectedRegion: 'crossed_findings_decoder' });
    expect(brainstemDetail).toMatch(/Crossed Findings Decoder/);
    expect(brainstemDetail).toMatch(/ipsilateral cranial nerve/i);
  });

  it('adds a CSF flow and hydrocephalus decoder diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'csfHydrocephalus', viewGroup: 'clinical' });

    expect(html).toContain('CSF Flow &amp; Hydrocephalus');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
    expect(html).toMatch(/8 targets/);
    expect(html).toMatch(/CSF flow - hydrocephalus map/);
    expect(html).toMatch(/Choroid Plexus/);
    expect(html).toMatch(/Cerebral Aqueduct/);
    expect(html).toMatch(/Hydrocephalus Decoder/);
    expect(src).toContain('currentView.isCsfHydro');
    expect(src).toContain('CSF flow and hydrocephalus map');
    expect(src).toContain('CSF FLOW ROUTE');
    expect(src).toContain('HYDROCEPHALUS DECODER');
    expect(src).toContain('aqueduct bottleneck');
    expect(src).toContain('NPH triad');

    const detail = render({ view: 'csfHydrocephalus', selectedRegion: 'hydrocephalus_decoder_csf' });
    expect(detail).toMatch(/Hydrocephalus Decoder/);
    expect(detail).toMatch(/Obstructive hydrocephalus/i);
    expect(detail).toMatch(/Normal pressure hydrocephalus/i);
  });

  it('adds a cranial nerves and Circle of Willis underside map', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'cranialNervesWillis' });

    expect(html).toContain('Cranial Nerves &amp; Willis');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
    expect(html).toMatch(/Circle of Willis/i);
    expect(html).toMatch(/CN III/i);
    expect(html).toMatch(/PComm/i);
    expect(html).toMatch(/Basilar/i);
    expect(html).toMatch(/13 targets/);
    expect(src).toContain('currentView.isCranialWillis');
    expect(src).toContain('Cranial nerves and Circle of Willis');
    expect(src).toContain('BEDSIDE CLUE DECODER');
    expect(src).toContain('Pupil + CN III');
    expect(src).toContain('Bitemporal fields');
    expect(src).toContain('Thunderclap');

    const detail = render({ view: 'cranialNervesWillis', selectedRegion: 'oculomotor_cn_iii_cw' });
    expect(detail).toMatch(/Oculomotor/);
    expect(detail).toMatch(/down-and-out eye/i);

    const decoder = render({ view: 'cranialNervesWillis', selectedRegion: 'bedside_clue_decoder_cw' });
    expect(decoder).toMatch(/Bedside Clue Decoder/);
    expect(decoder).toMatch(/pupil-involving CN III/i);
    expect(decoder).toMatch(/bitemporal/i);
    expect(decoder).toMatch(/thunderclap/i);
  });

  it('adds a basal ganglia direct and indirect pathway diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'basalGangliaLoop' });

    expect(html).toContain('Basal Ganglia Loop');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
    expect(html).toMatch(/direct/i);
    expect(html).toMatch(/indirect/i);
    expect(html).toMatch(/dopamine/i);
    expect(html).toMatch(/11 targets/);
    expect(src).toContain('currentView.isBasalGanglia');
    expect(src).toContain('DIRECT PATHWAY: GO');
    expect(src).toContain('INDIRECT PATHWAY: NO-GO');
    expect(src).toContain('movement_disorder_decoder_bg');
    expect(src).toContain('MOVEMENT DISORDER DECODER');
    expect(src).toContain('STN lesion');

    const detail = render({ view: 'basalGangliaLoop', selectedRegion: 'snc_dopamine_bg' });
    expect(detail).toMatch(/Substantia Nigra/);
    expect(detail).toMatch(/Parkinson/i);

    const decoder = render({ view: 'basalGangliaLoop', selectedRegion: 'movement_disorder_decoder_bg' });
    expect(decoder).toMatch(/Movement Disorder Decoder/);
    expect(decoder).toMatch(/too little dopamine/i);
    expect(decoder).toMatch(/hemiballismus/i);
  });

  it('adds a limbic and Papez memory-emotion circuit diagram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'limbicPapezLoop' });

    expect(html).toContain('Limbic / Papez Loop');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
    expect(html).toMatch(/Papez/i);
    expect(html).toMatch(/Hippocampus/i);
    expect(html).toMatch(/Amygdala/i);
    expect(html).toMatch(/Hypothalamus/i);
    expect(html).toMatch(/14 targets/);
    expect(src).toContain('currentView.isLimbicPapez');
    expect(src).toContain('PAPEZ MEMORY LOOP');
    expect(src).toContain('AMYGDALA OUTPUT');
    expect(src).toContain('memory_emotion_decoder_limbic');
    expect(src).toContain('MEMORY-EMOTION DECODER');
    expect(src).toContain('Confabulation');
    expect(src).toContain('mPFC brake weak');

    const detail = render({ view: 'limbicPapezLoop', selectedRegion: 'mammillary_limbic' });
    expect(detail).toMatch(/Mammillary Bodies/);
    expect(detail).toMatch(/Wernicke-Korsakoff/i);

    const decoder = render({ view: 'limbicPapezLoop', selectedRegion: 'memory_emotion_decoder_limbic' });
    expect(decoder).toMatch(/Memory-Emotion Decoder/);
    expect(decoder).toMatch(/anterograde amnesia/i);
    expect(decoder).toMatch(/PTSD/i);
    expect(decoder).toMatch(/confabulation/i);
  });

  it('enhances cross-lateralization with corpus callosum research visuals', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'crossLateral' });

    expect(html).toContain('Cross-Lateralization');
    expect(html).toContain('width="1040"');
    expect(html).toContain('height="780"');
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

  it('adds a sleep architecture decoder to the animated hypnogram', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'sleepStages' });

    expect(html).toContain('Sleep Stages');
    expect(html).toContain('width="900"');
    expect(html).toContain('height="680"');
    expect(html).toMatch(/6 targets/);
    expect(html).toMatch(/sleep-architecture decoder/i);
    expect(src).toContain('sleep_architecture_decoder_sleep');
    expect(src).toContain('SLEEP ARCHITECTURE DECODER');
    expect(src).toContain('N3 early');
    expect(src).toContain('REM late');
    expect(src).toContain('Fragmented');

    const decoder = render({ view: 'sleepStages', selectedRegion: 'sleep_architecture_decoder_sleep' });
    expect(decoder).toMatch(/Sleep Architecture Decoder/);
    expect(decoder).toMatch(/90 minutes/i);
    expect(decoder).toMatch(/Fragmented sleep/i);
    expect(decoder).toMatch(/glymphatic/i);
  });

  it('adds a Penfield stimulation response map to the Stimulation Lab', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'stimulate', stimIdx: 0 });

    expect(html).toContain('Stimulation Lab');
    expect(html).toContain('width="900"');
    expect(html).toContain('height="680"');
    expect(html).toMatch(/7 targets/);
    expect(html).toMatch(/Motor Response Zone/);
    expect(html).toMatch(/Language Disruption Zone/);
    expect(html).toMatch(/Electrode on:/);
    expect(html).toMatch(/Stimulation Lab - Penfield response map/);
    expect(html).not.toMatch(/Lateral view/);
    expect(src).toContain('Penfield stimulation response map');
    expect(src).toContain('CURRENT ELECTRODE TARGET');
    expect(src).toContain('stimScenarioRegionId');
    expect(src).toContain('Motor / sensory');

    const detail = render({ view: 'stimulate', selectedRegion: 'stim_language_map' });
    expect(detail).toMatch(/Language Disruption Zone/);
    expect(detail).toMatch(/Broca-area stimulation/i);
    expect(detail).toMatch(/Wernicke-area stimulation/i);
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
    expect(html).toContain('data-brainatlas-view-panel="true"');
    expect(html).toContain('aria-labelledby="brainatlas-view-library-title"');
    expect(html).toContain('data-brainatlas-view-button="true"');
    expect(html).toContain('data-brainatlas-active="true"');
    expect(html).toMatch(/Diagram library/);
    expect(html).toMatch(/8 views/);
    expect(html).toMatch(/Cranial Nerves &amp; Willis/);
    expect(html).toMatch(/Motor\/Sensory Homunculus/);
    expect(html).toMatch(/Visual Pathway/);
    expect(html).toMatch(/Language Network/);
  });

  it('keeps the clinical localization views discoverable in their own view group', () => {
    loadTool(FILE, 'brainAtlas');
    const html = render({ view: 'strokeTerritories', viewGroup: 'clinical' });

    expect(html).toContain('data-brainatlas-active-group="clinical"');
    expect(html).toContain('data-brainatlas-visible-group="clinical"');
    expect(html).toMatch(/Stroke Territories/);
    expect(html).toMatch(/Cerebellum Clinic/);
    expect(html).toMatch(/Brainstem Cross-Section/);
    expect(html).toMatch(/CSF Flow &amp; Hydrocephalus/);
    expect(html).not.toMatch(/EEG Waves/);
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
    expect(plain).toContain('data-brainatlas-detail-takeaways="true"');
    expect(plain).toContain('data-brainatlas-detail-focus="true"');
    expect(plain).toMatch(/Selected region/);
    expect(plain).toMatch(/Neurotransmitters.*Systems/);
    expect(plain).toMatch(/Watch for/);
    expect(plain).toMatch(/If damaged/);
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

  it('provides a safety-bounded psychopharmacology guide connected to atlas systems', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'lateral', psychGuideOpen: true });

    expect(html).toContain('data-brainatlas-psych-guide="true"');
    expect(html).toContain('data-brainatlas-psych-compare-builder="true"');
    expect(html).toContain('data-brainatlas-psych-builder-count="0"');
    expect((html.match(/data-brainatlas-psych-builder-slot="empty"/g) || [])).toHaveLength(2);
    expect(html).toMatch(/Select Compare on any two classes/);
    expect(html).toContain('data-brainatlas-psych-depth="quick"');
    expect(html).toContain('data-brainatlas-psych-depth-option="quick"');
    expect(html).toContain('aria-pressed="true"');
    expect((html.match(/class="brainatlas-psych-fact"/g) || [])).toHaveLength(10);
    expect(html).toMatch(/safety context visible with less text/i);
    expect(html).toMatch(/Psychopharmacology guide/);
    expect(html).toMatch(/not a prescribing, dosing, combination, or taper guide/i);
    expect(html).toMatch(/Antidepressants/);
    expect(html).toMatch(/Antipsychotics/);
    expect(html).toMatch(/Mood stabilizers/);
    expect(html).toMatch(/ADHD medications/);
    expect(html).toMatch(/Anti-anxiety medications/);
    expect((html.match(/data-brainatlas-psych-card=/g) || [])).toHaveLength(5);
    expect(html).toMatch(/nimh\.nih\.gov\/health\/topics\/mental-health-medications/);
    expect(html).toMatch(/fda\.gov\/drugs\/drug-safety/);
    expect(src).toContain('openPsychopharmAtlas');
    expect(src).toContain("upd('selectedRegion', item.atlasRegion)");

    const fullReference = render({
      view: 'lateral',
      psychGuideOpen: true,
      psychGuideDepth: 'full',
    });
    expect(fullReference).toContain('data-brainatlas-psych-depth="full"');
    expect((fullReference.match(/class="brainatlas-psych-fact"/g) || [])).toHaveLength(20);
    expect(fullReference).toMatch(/How it acts/);
    expect(fullReference).toMatch(/Examples/);
    expect(fullReference).toMatch(/adds mechanisms and medication examples/i);
    expect(fullReference).toMatch(/Key safety context/);

    const filtered = render({
      view: 'lateral',
      psychGuideOpen: true,
      psychGuideQuery: 'physical dependence',
    });
    expect((filtered.match(/data-brainatlas-psych-card=/g) || [])).toHaveLength(1);
    expect(filtered).toMatch(/Anti-anxiety medications/);
  });
  it('provides a safety-bounded brain stimulation and somatic treatments guide', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const quick = render({ view: 'lateral', stimGuideOpen: true });

    expect(quick).toContain('data-brainatlas-stim-guide="true"');
    expect(quick).toContain('data-brainatlas-stim-depth="quick"');
    expect((quick.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(7);
    expect((quick.match(/data-brainatlas-stim-fact=/g) || [])).toHaveLength(14);
    expect(quick).toMatch(/Brain stimulation/);
    expect(quick).toMatch(/not treatment selection, device setup, or protocol guidance/i);
    expect(quick).toMatch(/TMS family/);
    expect(quick).toMatch(/Electroconvulsive therapy/);
    expect(quick).toMatch(/Vagus nerve stimulation/);
    expect(quick).toMatch(/Deep brain stimulation/);
    expect(quick).toMatch(/Magnetic seizure therapy/);
    expect(quick).toMatch(/Transcranial electrical stimulation/);
    expect(quick).toMatch(/Emerging noninvasive targeting/);
    expect(quick).toMatch(/TCMS/);
    expect(quick).toMatch(/TMS, rTMS, deep TMS, or TBS/);
    expect(quick).toMatch(/nimh\.nih\.gov\/health\/topics\/brain-stimulation-therapies/);
    expect(quick).toMatch(/fda\.gov\/medical-devices\/guidance-documents/);
    expect(src).toContain('openStimTreatmentAtlas');
    expect(src).toContain("atlasRegion: 'lower_cranial_ix_x_xi_cw'");
    expect(src).toContain("upd('viewGroup', brainAtlasViewGroupFor(item.atlasView))");

    const full = render({ view: 'lateral', stimGuideOpen: true, stimGuideDepth: 'full' });
    expect(full).toContain('data-brainatlas-stim-depth="full"');
    expect((full.match(/data-brainatlas-stim-fact=/g) || [])).toHaveLength(28);
    expect(full).toMatch(/Energy delivery/);
    expect(full).toMatch(/Circuit effect/);
    expect(full).toMatch(/Targets/);
    expect(full).toMatch(/Clinical status/);
    expect(full).toMatch(/Key safety context/);

    const filtered = render({ view: 'lateral', stimGuideOpen: true, stimGuideQuery: 'high-powered focused magnetic pulses' });
    expect((filtered.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(1);
    expect(filtered).toMatch(/Magnetic seizure therapy/);
  });
  it('gives the treatment guide a non-color WCAG-oriented visual hierarchy', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');
    const html = render({ view: 'lateral', stimGuideOpen: true });

    expect(html).toContain('role="list"');
    expect(html).toContain('aria-label="Brain stimulation and somatic treatment modalities"');
    expect((html.match(/role="listitem"/g) || [])).toHaveLength(7);
    expect((html.match(/aria-labelledby="brainatlas-stim-card-title-/g) || [])).toHaveLength(7);
    expect((html.match(/data-brainatlas-stim-glance=/g) || [])).toHaveLength(7);
    expect((html.match(/class="brainatlas-stim-glance-item"/g) || [])).toHaveLength(21);
    expect((html.match(/data-stage-tone="established"/g) || [])).toHaveLength(2);
    expect((html.match(/data-stage-tone="mixed"/g) || [])).toHaveLength(2);
    expect((html.match(/data-stage-tone="research"/g) || [])).toHaveLength(3);
    expect(html).toMatch(/Evidence stage/);
    expect(html).toMatch(/Cleared uses/);
    expect(html).toMatch(/Mixed status/);
    expect(html).toMatch(/Experimental/);
    expect(src).toContain('.brainatlas-stim-guide-toggle{min-height:44px;}');
    expect(src).toContain('min-width:44px;min-height:44px');
    expect(src).toContain('.brainatlas-stim-guide :is(button,a,input):focus-visible{outline:3px');
    expect(src).toContain('@media (forced-colors:active)');
    expect(src).toContain('@media (prefers-contrast:more)');
    expect(src).toContain('.brainatlas-stim-guide .brainatlas-psych-card-title{font-size:16px');
    expect(src).toContain('.brainatlas-stim-guide .brainatlas-psych-fact dd{font-size:12px;line-height:1.6;}');
  });
  it('filters treatment cards by an accessible visual approach rail', () => {
    loadTool(FILE, 'brainAtlas');

    const all = render({ view: 'lateral', stimGuideOpen: true });
    expect(all).toContain('data-brainatlas-stim-filter="true"');
    expect(all).toContain('data-brainatlas-stim-family="all"');
    expect((all.match(/data-brainatlas-stim-family-option=/g) || [])).toHaveLength(5);
    expect(all).toContain('data-brainatlas-stim-family-option="all" aria-pressed="true"');
    expect(all).toContain('aria-controls="brainatlas-stim-grid"');
    expect(all).toMatch(/Explore by approach/);
    expect(all).toMatch(/All approaches/);
    expect(all).toMatch(/Nerve-based/);

    const magnetic = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'magnetic' });
    expect(magnetic).toContain('data-brainatlas-stim-family="magnetic"');
    expect((magnetic.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(2);
    expect(magnetic).toMatch(/TMS family/);
    expect(magnetic).toMatch(/Magnetic seizure therapy/);
    expect(magnetic).not.toMatch(/data-brainatlas-stim-card="ect"/);

    const electrical = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'electrical' });
    expect((electrical.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(3);

    const nerve = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'nerve' });
    expect((nerve.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(1);
    expect(nerve).toContain('data-brainatlas-stim-card="vns"');
    expect(nerve).toContain('data-brainatlas-wide="true"');

    const combined = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'magnetic', stimGuideQuery: 'high-powered focused magnetic pulses' });
    expect((combined.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(1);
    expect(combined).toContain('data-brainatlas-stim-card="mst"');

    const empty = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'nerve', stimGuideQuery: 'ultrasound' });
    expect(empty).toContain('data-brainatlas-stim-empty="true"');
    expect(empty).toContain('role="listitem"');
    expect(empty).toContain('data-brainatlas-stim-reset="true"');
    expect(empty).toMatch(/Clear treatment filters/);

    const invalid = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'not-a-family' });
    expect(invalid).toContain('data-brainatlas-stim-family="all"');
    expect((invalid.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(7);
  });
  it('builds a bounded two-treatment visual comparison that survives filtering', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const emptyBuilder = render({ view: 'lateral', stimGuideOpen: true });
    expect(emptyBuilder).toContain('data-brainatlas-stim-compare-builder="true"');
    expect(emptyBuilder).toContain('data-brainatlas-stim-builder-count="0"');
    expect((emptyBuilder.match(/data-brainatlas-stim-builder-slot="empty"/g) || [])).toHaveLength(2);
    expect(emptyBuilder).toMatch(/Choose Compare on any two modalities/);
    expect(emptyBuilder).toContain('data-brainatlas-stim-builder-view="true" disabled=""');
    expect((emptyBuilder.match(/data-brainatlas-stim-compare-toggle=/g) || [])).toHaveLength(7);
    expect(emptyBuilder).toContain('data-brainatlas-stim-compare-presets="true"');
    expect((emptyBuilder.match(/data-brainatlas-stim-compare-preset=/g) || [])).toHaveLength(4);

    const one = render({ view: 'lateral', stimGuideOpen: true, stimCompareIds: ['tms'] });
    expect(one).toContain('data-brainatlas-stim-builder-count="1"');
    expect(one).toContain('data-brainatlas-stim-compare="true"');
    expect(one).toContain('data-brainatlas-stim-compare-count="1"');
    expect((one.match(/data-brainatlas-stim-compare-row=/g) || [])).toHaveLength(6);
    expect((one.match(/data-brainatlas-stim-compare-column=/g) || [])).toHaveLength(1);
    expect((one.match(/data-brainatlas-stim-compare-matrix-empty=/g) || [])).toHaveLength(6);
    expect(one).toContain('data-brainatlas-stim-pathways="true"');
    expect((one.match(/data-brainatlas-stim-pathway-lane=/g) || [])).toHaveLength(1);
    expect((one.match(/data-brainatlas-stim-pathway-step=/g) || [])).toHaveLength(3);
    expect(one).toContain('data-brainatlas-stim-pathway-empty="true"');
    expect(one).toMatch(/One more modality needed/);

    const compared = render({ view: 'lateral', stimGuideOpen: true, stimCompareIds: ['tms', 'ect'] });
    expect(compared).toContain('data-brainatlas-stim-builder-count="2"');
    expect(compared).toContain('data-brainatlas-stim-compare-count="2"');
    expect(compared).toContain('data-brainatlas-stim-compare-matrix="true"');
    expect(compared).toContain('aria-label="Treatment modality comparison matrix"');
    expect((compared.match(/data-brainatlas-stim-compare-column=/g) || [])).toHaveLength(2);
    expect((compared.match(/data-brainatlas-stim-compare-symbol=/g) || [])).toHaveLength(2);
    expect((compared.match(/data-brainatlas-stim-compare-meta=/g) || [])).toHaveLength(2);
    expect((compared.match(/data-brainatlas-stim-compare-fact=/g) || [])).toHaveLength(12);
    expect((compared.match(/data-brainatlas-stim-pathway-lane=/g) || [])).toHaveLength(2);
    expect((compared.match(/data-brainatlas-stim-pathway-step=/g) || [])).toHaveLength(6);
    expect(compared).toMatch(/Coil positioned near scalp/);
    expect(compared).toMatch(/Distributed seizure-linked networks/);
    expect((compared.match(/data-brainatlas-stim-compare-toggle="[^\"]+" aria-pressed="false" aria-disabled="true"/g) || [])).toHaveLength(5);
    expect(compared).toContain('data-brainatlas-stim-compare-preset="clinical" aria-pressed="true"');
    expect(compared).toMatch(/How it reaches the brain/);
    expect(compared).toMatch(/Key safety context/);
    expect(compared).toMatch(/Two modalities selected and ready/);
    expect(compared).toMatch(/Compare educational summaries only/);

    const filtered = render({ view: 'lateral', stimGuideOpen: true, stimGuideFamily: 'nerve', stimCompareIds: ['tms', 'ect'] });
    expect((filtered.match(/data-brainatlas-stim-card=/g) || [])).toHaveLength(1);
    expect(filtered).toContain('data-brainatlas-stim-builder-count="2"');
    expect(filtered).toContain('data-brainatlas-stim-compare-count="2"');
    expect((filtered.match(/data-brainatlas-stim-compare-column=/g) || [])).toHaveLength(2);

    const sanitized = render({ view: 'lateral', stimGuideOpen: true, stimCompareIds: ['tms', 'tms', 'not-a-treatment'] });
    expect(sanitized).toContain('data-brainatlas-stim-builder-count="1"');
    expect(sanitized).toContain('data-brainatlas-stim-compare-count="1"');
    expect(src).toContain('toggleStimTreatmentCompare');
    expect(src).toContain('viewStimTreatmentComparison');
    expect(src).toContain('selectStimComparePreset');
    expect((src.match(/pathway: \[/g) || [])).toHaveLength(7);
  });
  it('renders a bounded two-class psychopharmacology comparison', () => {
    loadTool(FILE, 'brainAtlas');

    const compared = render({
      view: 'lateral',
      psychGuideOpen: true,
      psychCompareIds: ['antidepressants', 'antipsychotics'],
    });
    expect(compared).toContain('data-brainatlas-psych-compare="true"');
    expect(compared).toContain('data-brainatlas-psych-compare-count="2"');
    expect(compared).toContain('data-brainatlas-psych-compare-matrix="true"');
    expect(compared).toContain('aria-label="Medication class comparison matrix"');
    expect((compared.match(/data-brainatlas-psych-compare-row=/g) || [])).toHaveLength(4);
    expect((compared.match(/scope="col"/g) || [])).toHaveLength(3);
    expect((compared.match(/scope="row"/g) || [])).toHaveLength(4);
    expect(compared).toContain('data-brainatlas-psych-builder-count="2"');
    expect((compared.match(/data-brainatlas-psych-builder-slot=/g) || [])).toHaveLength(2);
    expect(compared).toMatch(/Two classes selected and ready/);
    expect(compared).toMatch(/View comparison/);
    expect((compared.match(/data-brainatlas-psych-compare-column=/g) || [])).toHaveLength(2);
    expect((compared.match(/class="brainatlas-psych-compare-fact"/g) || [])).toHaveLength(8);
    expect(compared).toMatch(/Compare educational summaries only/);
    expect(compared).toMatch(/Clear comparison/);
    expect((compared.match(/data-brainatlas-psych-compare-toggle="[^"]+" aria-pressed="false" aria-disabled="true"/g) || [])).toHaveLength(3);

    const sanitized = render({
      view: 'lateral',
      psychGuideOpen: true,
      psychCompareIds: ['antidepressants', 'antidepressants', 'not-a-class'],
    });
    expect(sanitized).toContain('data-brainatlas-psych-compare-count="1"');
    expect(sanitized).toContain('data-brainatlas-psych-builder-count="1"');
    expect((sanitized.match(/data-brainatlas-psych-builder-slot=/g) || [])).toHaveLength(2);
    expect(sanitized).toMatch(/One more class needed/);
    expect((sanitized.match(/data-brainatlas-psych-compare-column=/g) || [])).toHaveLength(1);
    expect((sanitized.match(/class="brainatlas-psych-compare-fact"/g) || [])).toHaveLength(4);
    expect((sanitized.match(/data-brainatlas-psych-compare-matrix-empty=/g) || [])).toHaveLength(4);
    expect(sanitized).toContain('data-brainatlas-psych-compare-empty="true"');
  });
  it('falls back safely when the selected-region label translation is missing', () => {
    loadTool(FILE, 'brainAtlas');

    const html = render({ view: 'lateral' }, { t: () => undefined });

    expect(html).toContain('None selected');
    expect(html).toContain('data-brainatlas-tool="true"');
  });

  it('offers persistent, accessible diagram label density and text-size controls', () => {
    loadTool(FILE, 'brainAtlas');
    const src = readFileSync(FILE, 'utf8');

    const defaults = render({ view: 'lateral' });
    expect(defaults).toContain('data-brainatlas-label-toolbar="true"');
    expect(defaults).toContain('data-brainatlas-label-density="standard"');
    expect(defaults).toContain('data-brainatlas-label-size="medium"');
    expect(defaults).toContain('data-brainatlas-density-supported="true"');
    expect(defaults).toContain('role="region" aria-label="Diagram label controls"');
    expect((defaults.match(/data-brainatlas-label-density-option=/g) || [])).toHaveLength(3);
    expect((defaults.match(/data-brainatlas-label-size-option=/g) || [])).toHaveLength(3);
    expect(defaults).toContain('data-brainatlas-label-density-option="standard" aria-pressed="true"');
    expect(defaults).toContain('data-brainatlas-label-size-option="medium" aria-label="Medium diagram label text" aria-pressed="true"');
    expect(defaults).toContain('role="group" aria-labelledby="brainatlas-label-density-title"');
    expect(defaults).toContain('role="group" aria-labelledby="brainatlas-label-size-title"');

    const customized = render({
      view: 'lateral',
      diagramLabelDensity: 'essential',
      diagramLabelSize: 'large',
    });
    expect(customized).toContain('data-brainatlas-label-density="essential"');
    expect(customized).toContain('data-brainatlas-label-size="large"');
    expect(customized).toContain('data-brainatlas-label-density-option="essential" aria-pressed="true"');
    expect(customized).toContain('data-brainatlas-label-size-option="large" aria-label="Large diagram label text" aria-pressed="true"');

    const specialty = render({
      view: 'neuron',
      diagramLabelDensity: 'all',
      diagramLabelSize: 'large',
    });
    expect(specialty).toContain('data-brainatlas-density-supported="false"');
    expect(specialty).toContain('data-brainatlas-label-managed="true" role="status" aria-label="Automatic label layout is active"');
    expect(specialty).toMatch(/Auto layout/);
    expect(specialty).toMatch(/Protected spacing/);
    expect((specialty.match(/data-brainatlas-label-density-option=/g) || [])).toHaveLength(0);
    expect((specialty.match(/data-brainatlas-label-size-option=/g) || [])).toHaveLength(3);
    expect(specialty).toContain('data-brainatlas-label-size-option="large" aria-label="Large diagram label text" aria-pressed="true"');

    const sanitized = render({
      view: 'lateral',
      diagramLabelDensity: 'crowded',
      diagramLabelSize: 'huge',
    });
    expect(sanitized).toContain('data-brainatlas-label-density="standard"');
    expect(sanitized).toContain('data-brainatlas-label-size="medium"');

    expect(src).toContain('brainAtlasFindRegionLabelPlacement');
    expect(src).toContain('canvas._brainLabelMetrics');
    expect(src).toContain('standardLabelStride');
    expect(src).toContain('.brainatlas-label-segment button{display:inline-flex;min-width:44px;min-height:44px');
    expect(src).toContain('.brainatlas-label-managed{display:grid;');
    expect(src).toContain('min-height:44px;box-sizing:border-box');
    expect(src).toContain('.theme-dark .brainatlas-tool-shell .brainatlas-label-managed-copy strong{color:#5eead4;}');
    expect(src).toContain('.brainatlas-canvas-shell:fullscreen .brainatlas-label-toolbar');
    expect(src).toContain('@media (forced-colors:active){.brainatlas-label-toolbar');
  });

  it('keeps view-group summaries readable throughout dark and contrast theme changes', () => {
    const src = readFileSync(FILE, 'utf8');

    expect(src).toContain('transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;');
    expect(src).not.toContain('transition:transform .14s ease,border-color .14s ease,background .14s ease;');
    expect(src).toContain('.theme-dark .brainatlas-tool-shell .brainatlas-group-button{background:#334155!important;color:#f8fafc!important;border-color:#64748b!important;}');
    expect(src).toContain('.theme-dark .brainatlas-tool-shell .brainatlas-group-button[aria-pressed="true"]{background:#1f2937!important;}');
    expect(src).toContain('.theme-dark .brainatlas-tool-shell .brainatlas-group-button span{color:#cbd5e1!important;}');
    expect(src).toContain('.theme-contrast .brainatlas-tool-shell .brainatlas-group-button:not([aria-pressed="true"]) span{color:#fff!important;}');
    expect(src).toContain('.theme-contrast .brainatlas-tool-shell .brainatlas-group-button[aria-pressed="true"] span{color:#000!important;}');
  });
  it('reflows overview, metrics, and 3D controls at 320 CSS pixels', () => {
    const src = readFileSync(FILE, 'utf8');

    expect(src).toContain('@media (max-width:360px){.brainatlas-mission-title-row{flex-wrap:wrap;}');
    expect(src).toContain('.brainatlas-mission-title{min-width:0;overflow-wrap:anywhere;}');
    expect(src).toContain('.brainatlas-overview-toggle{max-width:100%;margin-left:auto;}');
    expect(src).toContain('.brainatlas-metric-value{overflow-wrap:anywhere;word-break:break-word;}');
    expect(src).toContain('.brainatlas-3d-control-group{width:100%;}');
    expect(src).toContain('.brainatlas-3d-segment{display:flex;width:100%;flex-wrap:wrap;}');
    expect(src).toContain('.brainatlas-3d-segment button{flex:1 1 calc(50% - 2px);min-width:0;white-space:normal;}');
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
