import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The full Galaxy source and Star Life render share this suite's SSR checks.
vi.setConfig({ testTimeout: 30000 });

const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const block = source.split('// BEGIN GALAXY EVIDENCE WORKBENCH MODEL')[1].split('// END GALAXY EVIDENCE WORKBENCH MODEL')[0];
const model = new Function(block + ';return {state:galaxyEvidenceState,entry:galaxyEvidenceEntry,update:galaxyEvidenceUpdate,visit:galaxyEvidenceVisit,missions:galaxyEvidenceMissions,context:galaxyEvidenceNormalizeContext};')();
const emptyEntry = () => ({ prediction: '', visited: [false, false], notes: ['', ''], explanation: '', checked: false, context: null });
const readyBook = (id = 'dust', prediction = 'dust') => ({ mission: id, entries: { [id]: { ...emptyEntry(), prediction, visited: [true, true] } } });

describe('Galaxy guided comparison notebook', () => {
  it.each([null, undefined, [], 'dust', 42])('restores a safe empty notebook from %j', raw => {
    expect(model.state(raw)).toEqual({ mission: 'dust', entries: { dust: emptyEntry(), fuel: emptyEntry(), mass: emptyEntry() } });
  });

  it('keeps each mission separate and rejects unsupported stored choices', () => {
    const book = model.state({ mission: 'fuel', entries: {
      dust: { prediction: 'differentGas', notes: ['I notice dust.', 'A bright knot.'], visited: [true, false], checked: true },
      fuel: { prediction: 'differentGas', notes: ['Extended gas.', 'Compact sources.'], visited: [true, true], explanation: 'Different material.', checked: true },
      mass: { prediction: 'inferredMass', visited: [true, true] },
      invented: { prediction: 'yes' }
    } });
    expect(book.mission).toBe('fuel');
    expect(book.entries.dust).toEqual({ ...emptyEntry(), notes: ['I notice dust.', 'A bright knot.'], visited: [true, false] });
    expect(book.entries.fuel).toMatchObject({ prediction: 'differentGas', explanation: 'Different material.', checked: true });
    expect(book.entries.mass.prediction).toBe('inferredMass');
    expect(Object.keys(book.entries)).toEqual(['dust', 'fuel', 'mass']);
  });

  it('accepts only actual booleans for visited and checked, and bounds learner writing', () => {
    const book = model.state({ mission: 'unknown', entries: { dust: {
      prediction: 'dust', visited: ['true', 1, true], checked: 'true', notes: ['x'.repeat(700), {}], explanation: 'y'.repeat(700)
    } } });
    expect(book.mission).toBe('dust');
    expect(book.entries.dust.visited).toEqual([false, false]);
    expect(book.entries.dust.notes[0]).toHaveLength(600);
    expect(book.entries.dust.notes[1]).toBe('');
    expect(book.entries.dust.explanation).toHaveLength(600);
    expect(book.entries.dust.checked).toBe(false);
    expect(model.state({ entries: { dust: [] } }).entries.dust).toEqual(emptyEntry());
  });

  it('does not count unrequested views or manufacture observations when recording a visit', () => {
    const book = model.state();
    const visited = model.visit(book, 'dust', 0);
    expect(visited.entries.dust).toEqual({ ...emptyEntry(), visited: [true, false] });
    expect(book.entries.dust).toEqual(emptyEntry());
    expect(visited.entries.fuel).toEqual(emptyEntry());
    expect(model.visit(visited, 'dust', 0)).toEqual(visited);
    expect(model.visit(visited, 'dust', 1).entries.dust.visited).toEqual([true, true]);
  });

  it.each([-1, 2, '0', null, NaN, Infinity])('ignores invalid view index %j', index => {
    const book = readyBook();
    expect(model.visit(book, 'fuel', index)).toEqual(model.state(book));
  });

  it('requires a valid prediction and two viewed model states before showing feedback', () => {
    expect(model.update(null, 'dust', { checked: true }).entries.dust.checked).toBe(false);
    expect(model.update({ entries: { dust: { prediction: 'dust', visited: [true, false] } } }, 'dust', { checked: true }).entries.dust.checked).toBe(false);
    expect(model.update({ entries: { dust: { visited: [true, true] } } }, 'dust', { checked: true }).entries.dust.checked).toBe(false);
    const checked = model.update(readyBook(), 'dust', { checked: true });
    expect(checked.entries.dust.checked).toBe(true);
    expect(checked.entries.dust.notes).toEqual(['', '']);
    expect(checked.entries.dust.explanation).toBe('');
  });

  it('clears old feedback when a prediction changes while preserving the learner’s notes', () => {
    const checked = model.update(readyBook(), 'dust', { checked: true, notes: ['A lane.', 'A knot.'], explanation: 'Light passes through.' });
    const changed = model.update(checked, 'dust', { prediction: 'empty', checked: true });
    expect(changed.entries.dust).toEqual({ prediction: 'empty', visited: [true, true], notes: ['A lane.', 'A knot.'], explanation: 'Light passes through.', checked: false, context: null });
    expect(checked.entries.dust.checked).toBe(true);
    expect(model.update(checked, 'dust', { notes: ['One word', ''] }).entries.dust.checked).toBe(true);
  });

  it('preserves mission work when switching and normalizes unknown requested IDs without mutation', () => {
    const book = model.update(readyBook(), 'dust', { notes: ['Dust silhouettes.', 'More light.'] });
    const fuel = model.update({ ...book, mission: 'fuel' }, 'fuel', { prediction: 'differentGas' });
    expect(fuel.entries.dust).toEqual(book.entries.dust);
    expect(model.entry(fuel, 'dust').notes).toEqual(['Dust silhouettes.', 'More light.']);
    expect(model.entry(fuel, 'unknown')).toEqual(fuel.entries.fuel);
    expect(model.update(fuel, '__proto__', { prediction: 'anything' })).toEqual(fuel);
    expect(model.visit(fuel, 'unknown', 0)).toEqual(fuel);
  });

  it('has two explicit view types, misconception feedback, and primary science links for every comparison', () => {
    const missions = model.missions();
    expect(missions.map(mission => mission.id)).toEqual(['dust', 'fuel', 'mass']);
    expect(missions.map(mission => mission.bands.map(band => band.key))).toEqual([['visible', 'infrared'], ['radio', 'xray'], ['visible', 'gravity']]);
    for (const mission of missions) {
      expect(mission.choices.filter(choice => choice.correct)).toHaveLength(1);
      expect(mission.choices.every(choice => choice.feedback.length > 25)).toBe(true);
      expect(new URL(mission.source.url).hostname).toMatch(/(^|\.)nasa\.gov$/);
      for (const choice of mission.choices) expect(model.update(null, mission.id, { prediction: choice.id }).entries[mission.id].prediction).toBe(choice.id);
    }
    expect(missions[0].takeaway).toContain('Near-infrared');
    expect(missions[1].takeaway).toContain('cold or warm atomic gas');
    expect(missions[2].bands[1].kind).toBe('inference');
    expect(missions[2].bands[1].signal).toContain('not a light band');
  });

  it('keeps a complete immutable comparison context and rejects partial or malformed snapshots', () => {
    const context = { galaxyType: 'barredSpiral', cosmicAge: 10, layers: { arms: true, bulge: true, blackHole: true, nebulae: true, bgStars: true, grid: false, labels: false, dust: true, gas: true } };
    const book = model.update(readyBook(), 'dust', { context });
    expect(book.entries.dust.context).toEqual(context);
    expect(book.entries.dust.context.layers).not.toBe(context.layers);
    expect(model.visit(book, 'dust', 1).entries.dust.context).toEqual(context);
    for (const invalid of [null, {}, { ...context, galaxyType: 'other' }, { ...context, cosmicAge: '10' }, { ...context, cosmicAge: NaN }, { ...context, cosmicAge: 14 }, { ...context, layers: { arms: true } }, { ...context, layers: { ...context.layers, grid: 'false' } }]) {
      expect(model.context(invalid)).toBeNull();
      const normalized = model.update(book, 'dust', { context: invalid });
      expect(normalized.entries.dust.context).toBeNull();
      expect(normalized.entries.dust.visited).toEqual([true, true]);
      expect(normalized.entries.dust.prediction).toBe('dust');
    }
    expect(model.context({ ...context, cosmicAge: 0.1 }).cosmicAge).toBe(0.1);
    expect(model.context({ ...context, cosmicAge: 13.8 }).cosmicAge).toBe(13.8);
  });
});

describe('Galaxy guided comparison rendering', () => {
  beforeEach(() => { resetStemLab(); window._galaxyHasLoadedOnce = true; loadTool('stem_lab/stem_tool_galaxy.js', 'galaxy'); });
  function render(data = {}) {
    const root = document.createElement('div');
    root.innerHTML = renderTool('galaxy', { galaxy: { simMode: 'galaxy', ...data } });
    return root;
  }

  it('offers accessible comparisons and optional writing before any model state is viewed', () => {
    const root = render();
    const workbench = root.querySelector('[data-galaxy-evidence-workbench]');
    expect(workbench).not.toBeNull();
    expect(workbench.querySelectorAll('[data-galaxy-evidence-mission]')).toHaveLength(3);
    expect(workbench.querySelector('[data-galaxy-evidence-mission="dust"]').getAttribute('aria-pressed')).toBe('true');
    expect(workbench.querySelectorAll('[data-galaxy-evidence-prediction] input[type="radio"]')).toHaveLength(3);
    expect(workbench.querySelector('[data-galaxy-evidence-check]').disabled).toBe(true);
    expect(workbench.querySelector('[data-galaxy-evidence-feedback]')).toBeNull();
    expect(workbench.querySelector('[data-galaxy-evidence-progress]').textContent).toContain('0/2');
    for (const field of workbench.querySelectorAll('textarea')) {
      expect(field.maxLength).toBe(600);
      expect(field.required).toBe(false);
      expect(workbench.querySelector('label[for="' + field.id + '"]')).not.toBeNull();
    }
  });

  it('allows feedback without mandatory writing and presents misconception-specific explanation', () => {
    const book = model.update(readyBook('fuel', 'sameGas'), 'fuel', { checked: true });
    const root = render({ galaxyEvidenceWorkbench: book });
    const workbench = root.querySelector('[data-galaxy-evidence-workbench]');
    expect(workbench.querySelector('[data-galaxy-evidence-mission="fuel"]').getAttribute('aria-pressed')).toBe('true');
    expect(workbench.querySelector('[data-galaxy-evidence-check]').disabled).toBe(false);
    expect(workbench.querySelector('[data-galaxy-evidence-feedback]').textContent).toContain('Different signals');
    expect(workbench.querySelectorAll('[data-galaxy-evidence-visited][data-visited="true"]')).toHaveLength(2);
    expect(workbench.textContent).not.toMatch(/mastered|100%|perfect score/i);
  });

  it('identifies gravity as an inference and provides the linked primary source', () => {
    const root = render({ galaxyEvidenceWorkbench: readyBook('mass', 'inferredMass'), observeMode: 'gravity' });
    const workbench = root.querySelector('[data-galaxy-evidence-workbench]');
    expect(workbench.querySelector('[data-galaxy-evidence-band="gravity"]').textContent).toContain('not a light band');
    expect(workbench.querySelector('[data-galaxy-evidence-source]').href).toBe(model.missions()[2].source.url);
    expect(workbench.querySelector('[data-galaxy-evidence-open-model]')).not.toBeNull();
    expect(workbench.textContent).not.toMatch(/NaN|undefined|\[object Object\]/);
  });

  it.each([{ simMode: 'star' }, { simMode: 'realSky' }, { simMode: 'blackHole' }, { quizMode: true }])('stays within the main galaxy workflow for %j', data => {
    expect(render(data).querySelector('[data-galaxy-evidence-workbench]')).toBeNull();
  });
});
