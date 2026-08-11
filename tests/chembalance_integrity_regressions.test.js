import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_chembalance.js';
const source = readFileSync(SOURCE_PATH, 'utf8');

function arraySourceAfter(marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Missing source marker: ${marker}`);
  const start = source.indexOf('[', markerIndex);
  if (start < 0) throw new Error(`Missing array after: ${marker}`);

  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`Unterminated array after: ${marker}`);
}

function extractSubtools() {
  const block = arraySourceAfter('var SUBTOOLS =');
  return Array.from(
    block.matchAll(/\{\s*id:\s*'([^']+)'[^\n]*?label:\s*'([^']+)'/g),
    (match) => ({ id: match[1], label: match[2] })
  );
}

function extractCategorySectionIds() {
  const block = arraySourceAfter('var CHEM_CATEGORIES =');
  return Array.from(block.matchAll(/sections:\s*\[([^\]]*)\]/g)).flatMap(
    (match) => Array.from(match[1].matchAll(/'([^']+)'/g), (idMatch) => idMatch[1])
  );
}

function extractPresetNamesByTier(tier) {
  const block = arraySourceAfter('var ALL_PRESETS =');
  return Array.from(
    block.matchAll(/\{\s*name:\s*'([^']+)'[^\n]*?tier:\s*'([^']+)'/g),
    (match) => ({ name: match[1], tier: match[2] })
  )
    .filter((preset) => preset.tier === tier)
    .map((preset) => preset.name);
}

function renderSubtool(subtool, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...data },
  });
  return container;
}

function readRenderedPH(state) {
  const text = renderSubtool('pHHunt', { pHHunt: state }).textContent;
  const match = text.match(/pH\s*=\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!match) throw new Error(`Rendered pH value not found in: ${text.slice(0, 300)}`);
  return Number(match[1]);
}

function progressApi() {
  const api = window.__alloChemPure || {};
  expect(typeof api.normalizeChemProgress).toBe('function');
  expect(typeof api.recordSolvedPreset).toBe('function');
  expect(typeof api.recordSafetyScenario).toBe('function');
  return api;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE_PATH, 'chemBalance');
});

describe('Chemistry Lab catalog integrity', () => {
  it('assigns every subtool to exactly one category', () => {
    const subtoolIds = extractSubtools().map((subtool) => subtool.id);
    const categoryIds = extractCategorySectionIds();
    const occurrences = new Map();
    for (const id of categoryIds) occurrences.set(id, (occurrences.get(id) || 0) + 1);

    expect(new Set(categoryIds)).toEqual(new Set(subtoolIds));
    expect(
      subtoolIds.filter((id) => occurrences.get(id) !== 1),
      'Every subtool must occur in exactly one category'
    ).toEqual([]);
  });

  it('derives the search and finale totals from the current subtool catalog', () => {
    const expectedCount = extractSubtools().length;
    const hub = document.createElement('div');
    hub.innerHTML = renderTool('chemBalance', { chemBalance: {} });
    const search = hub.querySelector('input[aria-label="Search chemistry sub-tools"]');

    expect(search).toBeTruthy();
    expect(search.getAttribute('placeholder')).toContain(String(expectedCount));
    expect(renderSubtool('finale').textContent).toContain(`${expectedCount} sub-tools`);
  });

  it('offers paginated access to all 118 elements', () => {
    const firstPage = Array.from(
      renderSubtool('elementdb', { _elementPage: 0 }).querySelectorAll('[aria-label="Element choices"] button')
    );
    const lastPage = Array.from(
      renderSubtool('elementdb', { _elementPage: 4 }).querySelectorAll('[aria-label="Element choices"] button')
    );
    const atomicNumbers = firstPage.concat(lastPage).map((button) =>
      Number((button.textContent.trim().match(/^\d+/) || [])[0])
    );

    expect(firstPage).toHaveLength(24);
    expect(lastPage).toHaveLength(22);
    expect(atomicNumbers.slice(0, 3)).toEqual([1, 2, 3]);
    expect(atomicNumbers.at(-1)).toBe(118);
  });

  it('gives representative non-core subtools their own hero metadata', () => {
    const labels = new Map(extractSubtools().map((subtool) => [subtool.id, subtool.label]));
    for (const id of ['elementdb', 'periodic', 'glossary', 'pHHunt', 'finale']) {
      const headings = Array.from(renderSubtool(id).querySelectorAll('h3'))
        .map((heading) => heading.textContent.trim())
        .filter((heading) => heading !== '⚗️ Chemistry Lab');
      const hero = headings[0] || '';

      expect(hero, `${id} should have a workspace hero`).toContain(labels.get(id));
      expect(hero, `${id} must not reuse the balance hero`).not.toContain(
        'Balance — atoms in = atoms out'
      );
    }
  });
});

describe('Chemistry Lab interaction semantics', () => {
  it('gives each challenge difficulty a distinct accessible name', () => {
    const challenge = renderSubtool('challenge');
    const expectedNames = ['Beginner', 'Intermediate', 'Advanced'];
    const controls = expectedNames.map((name) =>
      Array.from(challenge.querySelectorAll('button')).find((button) =>
        button.textContent.includes(name)
      )
    );
    const accessibleNames = controls.map((button) =>
      (button.getAttribute('aria-label') || button.textContent).trim()
    );

    expect(controls.every(Boolean)).toBe(true);
    expect(new Set(accessibleNames).size).toBe(expectedNames.length);
    expectedNames.forEach((name, index) => {
      expect(accessibleNames[index]).toContain(name);
    });
  });

  it('exposes a semantic, non-canvas periodic block guide', () => {
    const periodic = renderSubtool('periodic');
    const section = periodic.querySelector('section[aria-labelledby="chem-periodic-blocks-title"]');
    const guide = section && section.querySelector('ul[aria-label]');

    expect(section).toBeTruthy();
    expect(section.querySelector('#chem-periodic-blocks-title')).toBeTruthy();
    expect(section.querySelector('figure figcaption')).toBeTruthy();
    expect(section.querySelectorAll('dl dt')).toHaveLength(3);
    expect(section.querySelectorAll('dl dd')).toHaveLength(3);
    expect(guide).toBeTruthy();
    expect(guide.querySelectorAll(':scope > li')).toHaveLength(4);
    expect(section.querySelector('canvas')).toBeNull();
  });

  it('renders an accurate, keyboard-manageable 118-element atlas', () => {
    const periodic = renderSubtool('periodic');
    const cells = Array.from(periodic.querySelectorAll('[data-chem-periodic-z]'));
    const atomicNumbers = cells.map((cell) => Number(cell.getAttribute('data-chem-periodic-z'))).sort((a, b) => a - b);
    const naturalTabStops = cells.filter((cell) => cell.getAttribute('tabindex') === '0');
    const hydrogen = periodic.querySelector('[data-chem-periodic-z="1"]');
    const helium = periodic.querySelector('[data-chem-periodic-z="2"]');
    const oganesson = periodic.querySelector('[data-chem-periodic-z="118"]');

    expect(cells).toHaveLength(118);
    expect(atomicNumbers).toEqual(Array.from({ length: 118 }, (_, index) => index + 1));
    expect(naturalTabStops).toHaveLength(1);
    expect(hydrogen.getAttribute('aria-label')).toContain('group 1');
    expect(hydrogen.getAttribute('aria-label')).toContain('s-block');
    expect(helium.getAttribute('aria-label')).toContain('group 18');
    expect(helium.getAttribute('aria-label')).toContain('s-block');
    expect(oganesson.getAttribute('aria-label')).toContain('p-block');
    expect(periodic.querySelectorAll('#chem-periodic-element-picker option')).toHaveLength(118);
    expect(periodic.querySelector('[aria-label="Scrollable 18-column periodic table"]')).toBeTruthy();
  });
});

describe('Chemistry Lab unique progress accounting', () => {
  it('normalizes all ID-backed progress collections', () => {
    const { normalizeChemProgress } = progressApi();
    const progress = normalizeChemProgress({});

    expect(progress.solvedPresetIds).toEqual([]);
    expect(progress.completedSafetyScenarioIds).toEqual([]);
    expect(progress.tiersCompleted).toEqual([]);
    expect(progress.correctChallengeIds).toEqual([]);
  });

  it('does not count the same balanced preset twice', () => {
    const { normalizeChemProgress, recordSolvedPreset } = progressApi();
    const initial = normalizeChemProgress({});
    const first = recordSolvedPreset(initial, 'Water Formation', 12);
    const duplicate = recordSolvedPreset(first.progress, 'Water Formation', 4);

    expect(first.isNew).toBe(true);
    expect(duplicate.isNew).toBe(false);
    expect(duplicate.progress.solvedPresetIds).toEqual(['Water Formation']);
    expect(duplicate.progress.equationsBalanced).toBe(1);
  });

  it('completes a tier only after every unique preset in that tier is solved', () => {
    const { normalizeChemProgress, recordSolvedPreset } = progressApi();
    const beginnerNames = extractPresetNamesByTier('beginner');
    let progress = normalizeChemProgress({});

    beginnerNames.slice(0, -1).forEach((name) => {
      progress = recordSolvedPreset(progress, name, null).progress;
    });
    expect(progress.tiersCompleted).not.toContain('beginner');

    progress = recordSolvedPreset(progress, beginnerNames.at(-1), null).progress;
    expect(progress.tiersCompleted).toContain('beginner');
    expect(progress.solvedPresetIds).toHaveLength(beginnerNames.length);
  });

  it('counts only unique safety scenarios', () => {
    const { normalizeChemProgress, recordSafetyScenario } = progressApi();
    const initial = normalizeChemProgress({});
    const first = recordSafetyScenario(initial, 'acid-splash');
    const duplicate = recordSafetyScenario(first.progress, 'acid-splash');
    let progress = duplicate.progress;
    for (const id of ['eyes', 'small-fire', 'bench-spill', 'fumes']) {
      progress = recordSafetyScenario(progress, id).progress;
    }

    expect(first.isNew).toBe(true);
    expect(duplicate.isNew).toBe(false);
    expect(progress.completedSafetyScenarioIds).toHaveLength(5);
    expect(progress.safetyScore).toBe(5);
  });
});

describe('Chemistry Lab pH model invariants', () => {
  const base = {
    hExpo: -7,
    hypothesis: '',
    stuckRevealed: false,
    understood: false,
    explanation: '',
    log: [],
  };

  it('is neutral for hydronium activity 10^-7 at 25 C', () => {
    expect(readRenderedPH(base)).toBeCloseTo(7, 2);
  });

  it('maps the activity-slider endpoints to pH 14 and pH 0', () => {
    expect(readRenderedPH({ ...base, hExpo: -14 })).toBeCloseTo(14, 2);
    expect(readRenderedPH({ ...base, hExpo: 0 })).toBeCloseTo(0, 2);
  });

  it('changes pH by one unit for each one-unit activity-exponent change', () => {
    const pHAtMinusThree = readRenderedPH({ ...base, hExpo: -3 });
    const pHAtMinusFour = readRenderedPH({ ...base, hExpo: -4 });
    const withLegacyFields = readRenderedPH({ ...base, hExpo: -3, buffer: 100, tempC: 100 });

    expect(pHAtMinusFour - pHAtMinusThree).toBeCloseTo(1, 2);
    expect(withLegacyFields).toBeCloseTo(pHAtMinusThree, 2);
  });
});
