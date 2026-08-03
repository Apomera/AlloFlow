import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_FILE = 'stem_lab/stem_tool_semiconductor.js';
const MIRROR_FILE = 'desktop/web-app/public/stem_lab/stem_tool_semiconductor.js';
const sourcePath = path.join(process.cwd(), SOURCE_FILE);
const mirrorPath = path.join(process.cwd(), MIRROR_FILE);

function readSource() {
  return fs.readFileSync(sourcePath, 'utf8');
}

describe('Semiconductor Lab runtime UI regressions', () => {
  beforeEach(() => {
    resetStemLab();
    loadTool(SOURCE_FILE, 'semiconductor');
  });

  it('keeps the source and desktop runtime copies identical', () => {
    expect(readSource()).toBe(fs.readFileSync(mirrorPath, 'utf8'));
  });

  it('renders safely from an empty host state', () => {
    expect(() => renderTool('semiconductor', {})).not.toThrow();
  });
  it('keeps its four learning modes local to the tool', () => {
    const source = readSource();
    expect(source).not.toContain('setStemLabTab');
    expect(source).not.toContain("document.addEventListener('keydown', handleKey)");

    const html = renderTool('semiconductor', {
      semiconductor: { mode: 'challenge' }
    });
    expect(html).toContain('id="semiconductor-tab-challenge"');
    expect(html).toContain('id="semiconductor-panel-challenge"');
    expect(html).toContain('aria-labelledby="semiconductor-tab-challenge"');
    expect(html).toContain('Start Challenge');
  });

  it('orients Challenge and Battle learners before they start', () => {
    const challenge = renderTool('semiconductor', {
      semiconductor: { mode: 'challenge' }
    });
    expect(challenge).toContain('semiconductor-challenge-howto');
    expect(challenge).toContain('How Challenge works');
    expect(challenge).toContain('1. Read the topic');
    expect(challenge).toContain('2. Choose an answer');
    expect(challenge).toContain('Start Challenge');

    const battle = renderTool('semiconductor', {
      semiconductor: { mode: 'battle' }
    });
    expect(battle).toContain('semiconductor-battle-howto');
    expect(battle).toContain('How Chip Defense works');
    expect(battle).toContain('Answer a round to damage the enemy');
    expect(battle).toContain('Start Battle');
  });

  it('opens the first Learn concept and exposes live game feedback', () => {
    const learn = renderTool('semiconductor', { semiconductor: { mode: 'learn' } });
    expect(learn).toContain('semiconductor-learn-topic-0');
    expect(learn).toContain('aria-controls="semiconductor-learn-topic-0"');
    expect(learn).not.toContain('aria-expanded="false"');
    const challenge = renderTool('semiconductor', { semiconductor: { mode: 'challenge', challengeActive: true, challengeFeedback: 'correct', challengeAnswer: 'answer' } });
    expect(challenge).toContain('aria-live="polite"');
    expect(challenge).toContain('Keep the streak going with the next question.');
    const battle = renderTool('semiconductor', { semiconductor: { mode: 'battle', battleActive: true, battleFeedback: 'correct' } });
    expect(battle).toContain('Hit confirmed. Advance when you are ready.');
  });
  it('gives Learn mode a clear bridge into the first simulator', () => {
    const html = renderTool('semiconductor', {
      semiconductor: { mode: 'learn' }
    });
    expect(html).toContain('semiconductor-learn-start');
    expect(html).toContain('Start here: Band Gap Energy');
    expect(html).toContain('Open one card to build the idea');
    expect(html).toContain('Try Band Gap simulator');
  });

  it('renders a clear first action before the primary visualization', () => {
    const html = renderTool('semiconductor', {
      semiconductor: { mode: 'explore', subtool: 'bandgap' }
    });
    const selectorIndex = html.indexOf('semiconductor-simulation-select');
    const guidedIndex = html.indexOf('Guided experiment');
    const materialIndex = html.indexOf('semiconductor-material-select');
    const canvasIndex = html.indexOf('<canvas');
    const labMapIndex = html.indexOf('Explore more chip-lab activities');

    expect(selectorIndex).toBeGreaterThan(-1);
    expect(guidedIndex).toBeGreaterThan(selectorIndex);
    expect(materialIndex).toBeGreaterThan(guidedIndex);
    expect(canvasIndex).toBeGreaterThan(materialIndex);
    expect(labMapIndex).toBeGreaterThan(canvasIndex);
    expect(html).toContain('1. Set up');
    expect(html).toContain('2. Change');
    expect(html).toContain('3. Explain');
    expect(html).toContain('Load guided setup');
  });

  it('provides a guided baseline for every simulation workspace', () => {
    const source = readSource();
    const start = source.indexOf('var GUIDED_SETUPS = {');
    const end = source.indexOf('var quick = QUICK_STARTS', start);
    const setupBlock = source.slice(start, end);
    const ids = ['bandgap', 'doping', 'pnjunction', 'transistor', 'gates', 'ivcurve', 'sandbox', 'waferfab', 'ledspec', 'solarcell', 'moorelaw', 'qwell', 'memory', 'amplifier', 'dopeHunt'];
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    ids.forEach((id) => expect(setupBlock).toContain(id + ': {'));
    expect(source).toContain('function applyGuidedSetup()');
    expect(source).toContain('guidedSetupSubtool: subtool');
  });

  it('reveals reflection only after the intended experiment variable changes', () => {
    const unchanged = renderTool('semiconductor', {
      semiconductor: {
        mode: 'explore', subtool: 'bandgap', guidedSetupSubtool: 'bandgap',
        material: 'silicon', temperature: 300, showPhoton: false, guidedNotes: { bandgap: '' }
      }
    });
    expect(unchanged).toContain('Baseline ready');
    expect(unchanged).not.toContain('What I observed and why');

    const changed = renderTool('semiconductor', {
      semiconductor: {
        mode: 'explore', subtool: 'bandgap', guidedSetupSubtool: 'bandgap',
        material: 'insulator', temperature: 300, showPhoton: false, guidedNotes: { bandgap: '' }
      }
    });
    expect(changed).toContain('Change observed');
    expect(changed).toContain('What I observed and why');
    expect(changed).toContain('Save observation');
    expect(changed).toContain('Write at least 12 characters.');
  });

  it('renders a completed guided experiment when a valid observation is saved', () => {
    const html = renderTool('semiconductor', {
      semiconductor: {
        mode: 'explore', subtool: 'bandgap', guidedSetupSubtool: 'bandgap',
        material: 'insulator', temperature: 300, showPhoton: false,
        guidedNotes: { bandgap: 'Glass keeps the electron below the conduction band because its gap is wider.' },
        guidedObservationSaved: 'bandgap'
      }
    });
    expect(html).toContain('Complete');
    expect(html).toContain('Explanation saved');
    expect(html).toContain('Observation saved — experiment complete.');
    expect(html).toContain('Observation saved');
    expect(readSource()).toContain("style: { display: 'block', width: '100%', minWidth: 0, boxSizing: 'border-box' }");
    expect(readSource()).toContain('setToolSnapshots(function(prev)');
    expect(readSource()).toContain('guidedObservation: guidedNote.trim()');
    expect(readSource()).toContain('disabled: guidedNote.trim().length < 12 || guidedSaved');
  });

  it('shows progress, notebook count, and a next-workspace handoff', () => {
    const fresh = renderTool('semiconductor', { semiconductor: { mode: 'explore', subtool: 'bandgap' } });
    expect(fresh).toContain('semiconductor-progress-summary');
    expect(fresh).toContain('Start with a guided setup.');
    expect(fresh).toContain('Notebook: 0');
    const complete = renderTool('semiconductor', {
      semiconductor: { mode: 'explore', subtool: 'bandgap', guidedSetupSubtool: 'bandgap', material: 'insulator', guidedNotes: { bandgap: 'Glass keeps the electron below the conduction band because the gap is wider.' }, guidedObservationSaved: 'bandgap' }
    }, { toolSnapshots: [{ id: 'semi-guided-1', tool: 'semiconductor' }, { id: 'semi-2', tool: 'semiconductor' }] });
    expect(complete).toContain('Complete');
    expect(complete).toContain('Next workspace');
    expect(complete).toContain('Notebook: 2');
    expect(complete).toContain('Snapshot (2)');
    expect(complete).toContain('semiconductor-notebook-preview');
    expect(complete).toContain('Recent notebook entries');
    expect(complete).toContain('Saved Semiconductor Lab state');
    expect(readSource()).toContain('var snapshots = Array.isArray(prev) ? prev : [];');
  });
  it('keeps mode and simulation switching hook-safe', () => {
    const source = readSource();
    expect(source).toContain('var stableRenderCache = {');
    ['challenge', 'battle', 'learn', 'bandgap', 'doping', 'pnjunction', 'transistor', 'gates', 'ivcurve', 'sandbox', 'waferfab', 'ledspec', 'solarcell', 'moorelaw', 'qwell', 'memory', 'amplifier'].forEach((key) => {
      expect(source).toContain(key + ': render');
    });
    expect(source).toContain('unmounted canvas effects exit immediately');
  });
  it('uses device-pixel-ratio aware, resize-safe canvases for all simulations', () => {
    const source = readSource();
    expect(source).toContain('window.devicePixelRatio');
    expect(source).toContain('cx.setTransform(pixelWidth / logicalWidth');
    expect(source).toContain('new ResizeObserver(function()');
    expect(source).toContain("canvasEl.style.maxWidth = '1024px'");
    expect(source).toContain("canvasEl.style.minWidth = '0'");
    expect(source).toContain('Math.min(3, window.devicePixelRatio || 1)');
    expect(source.match(/\}, \[tab, subtool,/g)).toHaveLength(13);
    expect(source.match(/prepareCanvas\(canvasEl, 440,/g)).toHaveLength(13);
    expect(source.match(/max-w-5xl mx-auto rounded-lg bg-slate-950/g)).toHaveLength(13);
    expect(source).not.toContain('var W = canvasEl.width, H = canvasEl.height');
  });

  it('pins the corrected notation and higher-contrast muted text', () => {
    const source = readSource();
    expect(source).not.toContain('text-slate-600');
    expect(source).not.toContain('text-slate-500');
    expect(source).not.toMatch(/cx\.font = '(?:bold )?[6-9]px/);
    expect(source).not.toContain('Math.max(7, radius * 0.65)');
    expect(source).toContain('Math.max(10, radius * 0.65)');
    expect(source).not.toContain('E\\u2097');
    expect(source).toContain('E_g');
    expect(source).toContain('function canvasInkFor(background)');
  });
});
