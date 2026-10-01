import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 17 (2026-09-02): the mission band follows the learner instead of repeating a fixed
// intro, and the Display summary names the active layers instead of counting them.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state, overrides) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', ...state },
  }, overrides));
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy mission band', () => {
  it.each(ANATOMY_PATHS)('drops the brain-wave promise from the default intro in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).not.toContain('Explore brain waves and sleep architecture.');
    expect(source).toContain('Analyze detailed clinical anatomy across 10 systems. Study origin and insertion');
  });

  it.each(ANATOMY_PATHS)('welcomes an untouched system, then reports progress and the next move in %s', (filePath) => {
    const fresh = render(filePath, {}, OLDER);
    expect(fresh.querySelector('[data-anatomy-mission-text]').textContent).toMatch(/^Analyze detailed clinical anatomy/);

    const started = render(filePath, {
      _structuresViewed: { skull: true, femur: true },
      _structureConfidence: { skull: 'practice' },
      _confidenceAt: { skull: Date.now() },
    }, OLDER);
    const text = started.querySelector('[data-anatomy-mission-text]').textContent;
    expect(text).toMatch(/^2 of \d+ structures explored in this view\./);
    expect(text).toMatch(/ Next: .+ — .+/);
    expect(text).toMatch(/1 marked for review\./);

    // Once enough is explored the recommendation becomes Review, and that wording carries the
    // count itself, so the line must not state it twice.
    const reviewing = render(filePath, {
      _structuresViewed: { skull: true, femur: true, ribs: true },
      _structureConfidence: { skull: 'practice', femur: 'learning' },
      _confidenceAt: { skull: Date.now(), femur: Date.now() },
    }, OLDER);
    const reviewText = reviewing.querySelector('[data-anatomy-mission-text]').textContent;
    expect(reviewText).toMatch(/Next: Review /);
    expect(reviewText.match(/marked for review/g)).toHaveLength(1);

    // A selected structure still takes priority over the progress line.
    const selected = render(filePath, { selectedStructure: 'femur', _structuresViewed: { femur: true } }, OLDER);
    expect(selected.querySelector('[data-anatomy-mission-text]').textContent).toMatch(/^Now studying Femur\./);
  }, 60_000);
});

describe('Anatomy mission band in Comfort mode', () => {
  it.each(ANATOMY_PATHS)('stacks the band so the study dashboard does not leave half of it empty in %s', (filePath) => {
    // Comfort mode auto-opens the study dashboard. Measured 2026-09-02 at 1280px: the open
    // dashboard made the right cell 342px tall against 69px of text on the left, so roughly
    // 280px of the band was empty. One column removes the void and widens the metric grid.
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain('.anatomy-tool-shell[data-reading-mode=true] .anatomy-mission-inner{grid-template-columns:minmax(0,1fr);}');

    const comfort = render(filePath, { selectedStructure: 'femur', _readingMode: true }, OLDER);
    const shell = comfort.querySelector('.anatomy-tool-shell');
    expect(shell.getAttribute('data-reading-mode')).toBe('true');
    // The dashboard is open in Comfort mode, which is what makes the stacking necessary.
    expect(comfort.querySelector('[data-anatomy-study-dashboard]').hasAttribute('open')).toBe(true);
  }, 60_000);
});

describe('Anatomy display summary', () => {
  it.each(ANATOMY_PATHS)('names the layers that are drawn in %s', (filePath) => {
    const root = render(filePath, {}, OLDER);
    const summary = root.querySelector('.anatomy-display-summary');
    expect(summary.querySelector('span').textContent).toBe('Display');
    const named = summary.querySelector('strong').textContent;
    expect(named).not.toMatch(/layers? active/);
    expect(named).toMatch(/Skeletal/);

    // Four or more collapse to three names plus a count, so the summary stays one line.
    const many = render(filePath, {
      visibleLayers: { skin: true, skeletal: true, muscular: true, organs: true, circulatory: true },
    }, OLDER);
    const manyText = many.querySelector('.anatomy-display-summary strong').textContent;
    expect(manyText).toMatch(/^([^,]+, ){2}[^,]+ \+\d$/);
  }, 60_000);
});
