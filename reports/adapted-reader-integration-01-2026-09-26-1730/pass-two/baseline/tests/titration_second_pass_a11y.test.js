import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const sourcePath = 'stem_lab/stem_tool_titration.js';

function renderState(state = {}) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
  return host;
}

function classes(element) {
  return String(element && element.getAttribute('class') || '').split(/\s+/);
}

function hasMinimum44PixelHeight(element) {
  if (!element) return false;
  const names = classes(element);
  if (names.some((name) => /^(?:min-)?h-(?:11|12)$/.test(name))) return true;
  if (names.some((name) => {
    const match = name.match(/^(?:min-)?h-\[(\d+(?:\.\d+)?)(px|rem)\]$/);
    if (!match) return false;
    return Number(match[1]) * (match[2] === 'rem' ? 16 : 1) >= 44;
  })) return true;
  const inline = String(element.getAttribute('style') || '');
  const match = inline.match(/min-height:\s*(\d+(?:\.\d+)?)px/i);
  return !!match && Number(match[1]) >= 44;
}

function expectScrollableNamedTable(table, captionText) {
  expect(table, captionText).not.toBeNull();
  const caption = table.querySelector('caption');
  expect(caption, captionText + ' caption').not.toBeNull();
  expect(caption.textContent.trim()).toBe(captionText);

  const scrollHost = table.closest('.overflow-x-auto');
  expect(scrollHost, captionText + ' scroll host').not.toBeNull();
  expect(scrollHost.getAttribute('role')).toBe('region');
  expect(scrollHost.getAttribute('aria-label')).toBe(captionText);
  expect(scrollHost.getAttribute('tabindex')).toBe('0');
}

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'titrationLab');
});

describe('Titration Lab chemical-review disclosure', () => {
  it('keeps hazard content outside the action and uses a separate large review toggle', () => {
    const root = renderState({
      safetyChecked: false,
      safetyStation: 3,
      presetId: 'sa_sb',
      chemsReviewed: { HCl: true },
    });
    const cards = [...root.querySelectorAll('section[aria-labelledby^="titration-chemical-title-"]')];
    expect(cards).toHaveLength(2);

    for (const card of cards) {
      const titleId = card.getAttribute('aria-labelledby');
      expect(card.querySelector('#' + titleId)).not.toBeNull();
      expect(card.textContent).toMatch(/Simulated working solution:/i);
      expect(card.textContent).toMatch(/Reference profile:/i);
      expect(card.textContent).toMatch(/First response:/i);

      const review = card.querySelector('button[aria-pressed]');
      expect(review, card.textContent).not.toBeNull();
      expect(review.getAttribute('aria-pressed')).toMatch(/^(?:true|false)$/);
      expect(hasMinimum44PixelHeight(review), review.outerHTML).toBe(true);
      expect(review.textContent).toMatch(/review/i);
      expect(review.querySelector('p')).toBeNull();
      expect(review.textContent).not.toMatch(/working solution|reference profile|first response/i);

      const detailParagraphs = [...card.querySelectorAll('p')];
      expect(detailParagraphs.length).toBeGreaterThanOrEqual(4);
      expect(detailParagraphs.every((paragraph) => !review.contains(paragraph))).toBe(true);
    }
  });
});

describe('Titration Lab AI tutor status and controls', () => {
  it.each([
    ['idle', {}, 'false', 'Explain'],
    ['loading', { aiLoading: true }, 'true', 'Thinking'],
    ['answered', { aiExplain: 'Acid and base react in the flask.' }, 'false', 'Re-explain'],
  ])('keeps one named status region while %s', (_phase, state, busy, visibleAction) => {
    const root = renderState(state);
    const tutor = root.querySelector('[role="region"][aria-label="AI titration tutor"]');
    expect(tutor).not.toBeNull();
    expect(tutor.getAttribute('aria-busy')).toBe(busy);

    const statuses = tutor.querySelectorAll('[role="status"][aria-live="polite"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0].getAttribute('aria-atomic')).toBe('true');

    const action = [...tutor.querySelectorAll('button')]
      .find((button) => button.textContent.includes(visibleAction));
    expect(action, visibleAction + ' action').not.toBeUndefined();
    expect(hasMinimum44PixelHeight(action), action.outerHTML).toBe(true);

    if (visibleAction !== 'Thinking') {
      const visibleLabel = visibleAction.toLowerCase();
      const accessibleName = (action.getAttribute('aria-label') || '').toLowerCase();
      expect(accessibleName.startsWith(visibleLabel), action.outerHTML).toBe(true);
    }
  });

  it('makes every reading-level choice a large pressed-state control', () => {
    const root = renderState({ aiLevel: 'hs' });
    const group = root.querySelector('[role="group"][aria-label="Reading level"]');
    expect(group).not.toBeNull();
    const levels = [...group.querySelectorAll('button')];
    expect(levels).toHaveLength(3);
    expect(levels.filter((button) => button.getAttribute('aria-pressed') === 'true')).toHaveLength(1);
    for (const level of levels) {
      expect(level.getAttribute('aria-pressed')).toMatch(/^(?:true|false)$/);
      expect(hasMinimum44PixelHeight(level), level.outerHTML).toBe(true);
    }
  });
});

describe('Titration Lab narrow-table access', () => {
  it('names and keyboard-enables the recorded-trials table scroll region', () => {
    const root = renderState({
      labTab: 'challenge',
      chMode: 'graded',
      gRun: 1,
      gTrials: [{
        initialRecorded: 1.15,
        finalRecorded: 22.35,
        recorded: 21.20,
        initialEyeCm: 0,
        finalEyeCm: 0,
        included: true,
      }],
    });
    expectScrollableNamedTable(root.querySelector('#titration-trials table'), 'Recorded trial readings');
  });

  it('names and keyboard-enables completed-run and glassware table scroll regions', () => {
    const runs = renderState({
      labTab: 'challenge',
      chMode: 'graded',
      gRun: 2,
      gLog: [{ run: 1, name: 'Vinegar sample', volErrMl: 0.02, concErrPct: 0.08, seconds: 94 }],
    });
    const completed = [...runs.querySelectorAll('table')]
      .find((table) => table.querySelector('caption')?.textContent.trim() === 'Completed unknown runs');
    expectScrollableNamedTable(completed, 'Completed unknown runs');

    const equipment = renderState({ labTab: 'equipment', benchSel: 'burette' });
    const glassware = [...equipment.querySelectorAll('table')]
      .find((table) => table.querySelector('caption')?.textContent.trim() === 'Glassware comparison');
    expectScrollableNamedTable(glassware, 'Glassware comparison');
  });
});

describe('Titration Lab graded-run mobile resilience', () => {
  it('stacks dense measurement grids from one column and never truncates essential values', () => {
    const root = renderState({ labTab: 'challenge', chMode: 'graded', gRun: 1 });
    const graded = root.querySelector('#titration-graded-run');
    expect(graded).not.toBeNull();
    expect(classes(graded)).toContain('p-3');
    expect(classes(graded)).toContain('sm:p-5');

    const responsiveGrids = [...graded.querySelectorAll('.grid')]
      .filter((grid) => classes(grid).some((name) => /^(?:sm|md|lg):grid-cols-/.test(name)));
    expect(responsiveGrids.length).toBeGreaterThanOrEqual(3);
    for (const grid of responsiveGrids) {
      expect(classes(grid), grid.outerHTML).toContain('grid-cols-1');
    }

    expect(graded.querySelectorAll('.truncate')).toHaveLength(0);
    expect(graded.textContent).toMatch(/Aliquot in flask/i);
    expect(graded.textContent).toMatch(/Titrant \(known\)/i);
    expect(graded.textContent).toMatch(/Initial burette reading/i);
  });

  it('gives every graded action and the eye-height slider a 44px minimum height', () => {
    const root = renderState({ labTab: 'challenge', chMode: 'graded', gRun: 1 });
    const graded = root.querySelector('#titration-graded-run');
    const controls = [...graded.querySelectorAll('button, input[type="range"]')];
    expect(controls.length).toBeGreaterThan(8);
    for (const control of controls) {
      expect(hasMinimum44PixelHeight(control), control.outerHTML).toBe(true);
    }
  });
});
