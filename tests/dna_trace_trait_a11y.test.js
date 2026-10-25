// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const h = React.createElement, act = React.act;
const sibling = Object.freeze({ observation: 'Keep the ecology field note.', revision: 8 });
const mainLab = Object.freeze({ tab: 'build', dnaFocusMode: false, dnaGradeOverride: '3-5', dnaSequence: 'ATGAAATAA',
  visitedTabs: Object.freeze({ build: true }), dnaReportNote: 'Keep the uncertainty reflection.', dnaEvidenceScore: 2 });
const extraReference = Object.freeze({ draft: 'An unfinished reference note.' });
const traceExtra = Object.freeze({ reflection: 'Evidence and diagnosis are separate.' });
const examples = [
  { id: 'p1', title: 'Family A — three generations, blue eyes', pattern: 'autosomal_recessive', grade: 'K-2',
    ids: ['skip_generations', 'unaffected_carriers', 'no_sex_bias', 'present_in_homozygote'],
    texts: ['Trait skips generations (unaffected parents → affected child).',
      'Parents must be heterozygous carriers passing one recessive allele each.',
      'Affected individuals appear in both sexes at roughly equal frequency.',
      'Affected = aa homozygous; carriers (Aa) are phenotypically unaffected.'] },
  { id: 'p2', title: 'Family B — color blindness across three generations', pattern: 'x_linked_recessive', grade: '6-8',
    ids: ['male_bias', 'mother_carrier', 'skip_via_daughters', 'no_male_to_male'],
    texts: ['Trait shows strong male bias (hemizygous males express; females need two copies).',
      'Unaffected daughter of affected grandfather is an obligate carrier.',
      'Trait skips generation through carrier daughters, then reappears in grandsons.',
      'No father-to-son transmission (sons inherit Y from father, not X).'] },
  { id: 'p3', title: 'Family C — Huntington-like late-onset trait', pattern: 'autosomal_dominant', grade: '9-12',
    ids: ['every_gen', 'affected_parent_required', 'fifty_pct', 'no_sex_bias_dom'],
    texts: ['Trait appears in every generation (no skipping).',
      'Every affected individual has at least one affected parent.',
      'Roughly 50% of children of an affected heterozygote are affected.',
      'Equal frequency in males + females — autosomal, not sex-linked.'] }
];
const patternIds = ['autosomal_dominant', 'autosomal_recessive', 'x_linked_dominant', 'x_linked_recessive', 'y_linked', 'mitochondrial'];
let config, host, root, outside, latest, updateStore, changes, xp, announce, ai, actDescriptor;
const query = selector => host.querySelector(selector);
const panel = () => query('[data-dna-trace-trait]');
const puzzle = id => query(`[data-dna-trait-puzzle="${id}"]`);
const list = id => query(`#dna-trait-${id}-ranking`);
const rows = id => [...list(id).querySelectorAll('[data-dna-trait-explanation]')];
const row = (id, explanation) => puzzle(id).querySelector(`[data-dna-trait-explanation="${explanation}"]`);
const move = (id, explanation, direction) => row(id, explanation).querySelector(`[data-dna-trait-move="${direction}"]`);
const choice = (id, pattern) => puzzle(id).querySelector(`[data-dna-trait-pattern="${pattern}"]`);
const reveal = id => query(`[data-dna-trait-reveal="${id}"]`);
const saved = id => latest.dna.traceTrait.puzzles[id];
function nameOf(element) {
  if (element.hasAttribute('aria-label')) return element.getAttribute('aria-label');
  if (element.hasAttribute('aria-labelledby')) return element.getAttribute('aria-labelledby').split(/\s+/)
    .map(id => document.getElementById(id)?.textContent || '').join(' ').replace(/\s+/g, ' ').trim();
  return element.textContent.replace(/\s+/g, ' ').trim();
}
function Host({ seed }) {
  const [store, update] = React.useState(seed); latest = store; updateStore = update;
  const setToolData = React.useCallback(arg => { changes(arg); update(prev => typeof arg === 'function' ? arg(prev) : arg); }, []);
  return config.render(makeCtx({ toolData: store, setToolData, awardXP: xp, announceToSR: announce,
    callGemini: ai[0], callTTS: ai[1], callImagen: ai[2] }));
}
async function mount(tracePatch = {}, mainPatch = {}) {
  outside.focus();
  const dnaLab = Object.keys(mainPatch).length ? { ...mainLab, ...mainPatch } : mainLab;
  await act(async () => { root.render(h(Host, { seed: { dnaLab, ecology: sibling,
    dna: { expSection: 'traceTrait', extraReference, traceTrait: { puzzles: {}, score: 0, extra: traceExtra, ...tracePatch } } } })); });
  // The optional reference library is a native disclosure. Opening it does not
  // initialize a learning answer or write application state.
  const library = query('details.dna-reference-library'); expect(library).not.toBeNull(); library.open = true;
}
async function activate(element) {
  expect(element).not.toBeNull(); expect(element).toBeDefined(); element.focus(); await act(async () => { element.click(); });
}
// jsdom has no default keyboard button activation. Supply its native click only
// when a key handler did not consume the key; browser tests cover actual keys.
async function activateByKey(element, key) {
  expect(element.tagName).toBe('BUTTON'); element.focus();
  await act(async () => {
    const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); element.dispatchEvent(down);
    if (key === 'Enter' && !down.defaultPrevented) element.click();
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true, cancelable: true }));
    if (key === ' ' && !down.defaultPrevented) element.click();
  });
}
async function advance(ms = 0) { await act(async () => { vi.advanceTimersByTime(ms); }); }
function live(id, kind) {
  const node = query(`#dna-trait-${id}-${kind}`); expect(node).not.toBeNull(); expect(node.getAttribute('role')).toBe('status');
  expect(node.getAttribute('aria-live')).toBe('polite'); expect(node.getAttribute('aria-atomic')).toBe('true'); return node;
}
function preserved(expectedMain = mainLab) {
  expect(latest.dnaLab).toBe(expectedMain); expect(latest.ecology).toBe(sibling);
  expect(latest.dna.extraReference).toBe(extraReference); expect(latest.dna.traceTrait.extra).toBe(traceExtra);
  expect(xp).not.toHaveBeenCalled(); for (const callback of ai) expect(callback).not.toHaveBeenCalled();
}
function order(id) { return rows(id).map(node => node.getAttribute('data-dna-trait-explanation')); }
function expectGuarded(button, locked, tabIndex = locked ? -1 : 0) {
  expect(button.tagName).toBe('BUTTON'); expect(button.type).toBe('button'); expect(button.disabled).toBe(false);
  expect(button.getAttribute('aria-disabled')).toBe(String(locked)); expect(button.tabIndex).toBe(tabIndex);
}

beforeEach(() => {
  actDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'IS_REACT_ACT_ENVIRONMENT'); globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers(); resetStemLab(); config = loadTool('stem_lab/stem_tool_dna.js', 'dnaLab');
  changes = vi.fn(); xp = vi.fn(); announce = vi.fn(); ai = [vi.fn(), vi.fn(), vi.fn()];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  host = document.createElement('div'); outside = document.createElement('button'); outside.textContent = 'Host navigation';
  document.body.append(outside, host); root = ReactDOMClient.createRoot(host);
});
afterEach(async () => {
  try { if (root) await act(async () => { root.unmount(); }); }
  finally {
    host?.remove(); outside?.remove(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
    root = null; host = null; updateStore = null; config = null;
    if (actDescriptor) Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', actDescriptor); else delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  }
});

describe('Trace the Trait structure and saved learning', () => {
  it('names the activity, family sections, pattern groups and ordered reasoning lists', async () => {
    await mount(); expect(panel().id).toBe('dna-trace-trait-panel'); expect(panel().getAttribute('role')).toBe('region');
    expect(nameOf(panel())).toMatch(/Trace the trait/i); expect(document.activeElement).toBe(outside);
    for (const example of examples) {
      const section = puzzle(example.id), title = query(`#dna-trait-${example.id}-title`);
      expect(section.tagName).toBe('SECTION'); expect(title.tagName).toBe('H5'); expect(title.textContent).toBe(example.title);
      expect(section.getAttribute('aria-labelledby')).toBe(title.id); expect(nameOf(section)).toBe(example.title);
      const group = query(`[data-dna-trait-patterns="${example.id}"]`); expect(group.getAttribute('role')).toBe('group');
      expect(nameOf(group)).toContain(example.title); expect(nameOf(group)).toMatch(/inheritance pattern/i);
      expect(group.querySelectorAll('button')).toHaveLength(6);
      for (const pattern of patternIds) {
        expect(choice(example.id, pattern).getAttribute('aria-pressed')).toBe('false'); expect(choice(example.id, pattern).getAttribute('role')).not.toBe('radio');
      }
      expect(list(example.id).tagName).toBe('OL'); expect(nameOf(list(example.id))).toContain(example.title); expect(nameOf(list(example.id))).toMatch(/rank/i);
      expect(order(example.id)).toEqual(example.ids); for (const text of example.texts) expect(section.textContent).toContain(text);
      expect(live(example.id, 'move-status').textContent).toBe(''); expect(live(example.id, 'verdict').textContent).toBe('');
    }
    preserved();
  });

  it('renders authored defaults without writing or scheduling initialization that later overwrites progress', async () => {
    await mount(); expect(changes).not.toHaveBeenCalled(); expect(latest.dna.traceTrait.puzzles).toEqual({});
    await advance(60000); expect(changes).not.toHaveBeenCalled(); expect(latest.dna.traceTrait.puzzles).toEqual({});
    for (const example of examples) expect(order(example.id)).toEqual(example.ids); preserved();
  });

  it('supports a saved pick without a ranking and materializes its default only after an explicit move', async () => {
    const siblingPuzzle = Object.freeze({ pick: 'x_linked_recessive', ranking: [...examples[1].ids], revealed: true, note: 'Already reviewed.' });
    await mount({ puzzles: { p1: { pick: 'autosomal_recessive', note: 'Keep this reasoning note.' }, p2: siblingPuzzle }, score: 1 });
    expect(order('p1')).toEqual(examples[0].ids); expect(changes).not.toHaveBeenCalled(); expect(saved('p1').ranking).toBeUndefined();
    await activateByKey(move('p1', 'skip_generations', 'down'), 'Enter');
    expect(saved('p1').ranking).toEqual(['unaffected_carriers', 'skip_generations', 'no_sex_bias', 'present_in_homozygote']);
    expect(saved('p1').pick).toBe('autosomal_recessive'); expect(saved('p1').note).toBe('Keep this reasoning note.');
    expect(saved('p2')).toBe(siblingPuzzle); expect(latest.dna.traceTrait.score).toBe(1); preserved();
  });

  it('retains saved ranking order and completed verdicts without initializing other families', async () => {
    const ranking = [...examples[1].ids].reverse(), savedPuzzle = Object.freeze({ pick: 'x_linked_recessive', ranking, revealed: true, note: 'Keep my earlier order.' });
    await mount({ puzzles: { p2: savedPuzzle }, score: 1 }); expect(order('p2')).toEqual(ranking);
    expect(live('p2', 'verdict').textContent).toMatch(/Ranking match:\s*0\s*\/\s*4/i);
    for (const id of patternIds) expectGuarded(choice('p2', id), true);
    for (const explanation of ranking) for (const direction of ['up', 'down']) expectGuarded(move('p2', explanation, direction), true);
    await advance(60000); expect(changes).not.toHaveBeenCalled(); expect(saved('p2')).toBe(savedPuzzle); expect(Object.keys(latest.dna.traceTrait.puzzles)).toEqual(['p2']); preserved();
  });
});

describe('Trace the Trait hands-on ranking controls', () => {
  it('gives every permanent move control explanation, family and position context with truthful boundaries', async () => {
    await mount();
    for (const example of examples) for (let i = 0; i < example.ids.length; i++) {
      const id = example.ids[i], position = query(`#dna-trait-${example.id}-position-${id}`);
      expect(position).not.toBeNull(); expect(position.textContent).toContain(String(i + 1));
      for (const direction of ['up', 'down']) {
        const button = move(example.id, id, direction); expect(nameOf(button)).toContain(example.texts[i]); expect(nameOf(button)).toContain(example.title);
        expect(nameOf(button).toLowerCase()).toContain('move ' + direction);
        expect(button.getAttribute('aria-describedby').split(/\s+/)).toContain(position.id);
        expectGuarded(button, direction === 'up' ? i === 0 : i === 3);
      }
    }
    preserved();
  });

  it.each([
    { explanation: 'unaffected_carriers', direction: 'up', expected: ['unaffected_carriers', 'skip_generations', 'no_sex_bias', 'present_in_homozygote'], position: 1 },
    { explanation: 'no_sex_bias', direction: 'down', expected: ['skip_generations', 'unaffected_carriers', 'present_in_homozygote', 'no_sex_bias'], position: 4 }
  ])('retains keyboard focus on the same $direction control when its explanation reaches a boundary', async test => {
    await mount(); const button = move('p1', test.explanation, test.direction), status = live('p1', 'move-status');
    await activateByKey(button, ' '); expect(order('p1')).toEqual(test.expected); expect(move('p1', test.explanation, test.direction)).toBe(button);
    expect(document.activeElement).toBe(button); expectGuarded(button, true);
    expect(query(`#dna-trait-p1-position-${test.explanation}`).textContent).toContain(String(test.position));
    expect(query('#dna-trait-p1-move-status')).toBe(status); expect(status.textContent).toContain(String(test.position));
    const before = latest, beforeTrace = latest.dna.traceTrait, beforePuzzle = saved('p1'), announcement = status.textContent;
    await activateByKey(button, 'Enter');
    expect(latest).toBe(before); expect(latest.dna.traceTrait).toBe(beforeTrace); expect(saved('p1')).toBe(beforePuzzle);
    expect(latest.dna.traceTrait.score).toBe(0); expect(status.textContent).toBe(announcement); expect(order('p1')).toEqual(test.expected); preserved();
  });

  it('announces the moved explanation and position through one persistent concise status', async () => {
    await mount(); const status = live('p1', 'move-status'), otherStatus = live('p2', 'move-status');
    expect(status.className).toContain('sr-only'); await activate(move('p1', 'skip_generations', 'down'));
    expect(status.textContent).toContain(examples[0].texts[0]); expect(status.textContent).toContain('2');
    expect(status.textContent.length).toBeLessThan(400); expect(otherStatus.textContent).toBe(''); const first = status.textContent;
    await activate(move('p1', 'skip_generations', 'up')); expect(query('#dna-trait-p1-move-status')).toBe(status); expect(status.textContent).not.toBe(first);
    expect(status.textContent).toContain('1'); expect(order('p1')).toEqual(examples[0].ids); expect(latest.dna.traceTrait.score).toBe(0); preserved();
  });

  it('keeps an immediate keyboard pick and reorder after waiting, without creating or overwriting sibling answers', async () => {
    await mount(); await activateByKey(choice('p1', 'autosomal_recessive'), ' '); await activateByKey(move('p1', 'skip_generations', 'down'), 'Enter');
    const answered = saved('p1'); await advance(60000); expect(saved('p1')).toBe(answered); expect(Object.keys(latest.dna.traceTrait.puzzles)).toEqual(['p1']);
    expect(saved('p1').pick).toBe('autosomal_recessive'); expect(saved('p1').ranking[1]).toBe('skip_generations');
    expect(choice('p1', 'autosomal_recessive').getAttribute('aria-pressed')).toBe('true');
    for (const pattern of patternIds.filter(id => id !== 'autosomal_recessive')) expect(choice('p1', pattern).getAttribute('aria-pressed')).toBe('false'); preserved();
  });
});

describe('Trace the Trait verdicts, scoring and state isolation', () => {
  it('guards Reveal until a pattern is picked and keeps native focus after revealing exactly once', async () => {
    await mount(); const button = reveal('p1'), status = live('p1', 'verdict');
    expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    const initialStore = latest, initialTrace = latest.dna.traceTrait, initialPuzzle = saved('p1'); await activateByKey(button, 'Enter');
    expect(latest).toBe(initialStore); expect(latest.dna.traceTrait).toBe(initialTrace); expect(saved('p1')).toBe(initialPuzzle);
    expect(latest.dna.traceTrait.score).toBe(0); expect(status.textContent).toBe(''); await activate(choice('p1', 'autosomal_recessive'));
    expect(button.getAttribute('aria-disabled')).toBe('false'); await activateByKey(button, ' '); expect(document.activeElement).toBe(button);
    expect(reveal('p1')).toBe(button); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(query('#dna-trait-p1-verdict')).toBe(status); expect(status.textContent).toMatch(/Pattern correct/i); expect(status.textContent).toMatch(/Ranking match:\s*4\s*\/\s*4/i);
    const before = latest, beforeTrace = latest.dna.traceTrait, beforePuzzle = saved('p1'), verdict = status.textContent;
    await activateByKey(button, 'Enter'); await activate(choice('p1', 'autosomal_dominant')); await activate(move('p1', 'skip_generations', 'down'));
    expect(latest).toBe(before); expect(latest.dna.traceTrait).toBe(beforeTrace); expect(saved('p1')).toBe(beforePuzzle);
    expect(status.textContent).toBe(verdict); expect(order('p1')).toEqual(examples[0].ids);
    expect(latest.dna.traceTrait.score).toBe(1); expect(saved('p1').pick).toBe('autosomal_recessive'); preserved();
  });

  it.each(examples)('preserves $id inheritance reasoning, authored order and independent verdict at its reading level', async example => {
    await mount({}, { dnaGradeOverride: example.grade }); const expectedMain = latest.dnaLab;
    expect(order(example.id)).toEqual(example.ids); for (const text of example.texts) expect(puzzle(example.id).textContent).toContain(text);
    await activateByKey(choice(example.id, example.pattern), 'Enter'); await activateByKey(reveal(example.id), ' ');
    expect(saved(example.id).pick).toBe(example.pattern); expect(saved(example.id).revealed).toBe(true); expect(saved(example.id).ranking).toEqual(example.ids);
    expect(latest.dna.traceTrait.score).toBe(1); expect(live(example.id, 'verdict').textContent).toMatch(/Pattern correct/i);
    expect(live(example.id, 'verdict').textContent).toMatch(/Ranking match:\s*4\s*\/\s*4/i);
    expect(puzzle(example.id).textContent.match(/✓ exact/g)).toHaveLength(4); preserved(expectedMain);
  });

  it('scores the diagnosis separately from explanation order and leaves an incorrect diagnosis uncredited', async () => {
    await mount({ puzzles: { p1: { ranking: [...examples[0].ids].reverse(), pick: 'autosomal_recessive', revealed: false } } });
    await activate(reveal('p1')); expect(latest.dna.traceTrait.score).toBe(1);
    expect(live('p1', 'verdict').textContent).toMatch(/Pattern correct/i); expect(live('p1', 'verdict').textContent).toMatch(/Ranking match:\s*0\s*\/\s*4/i);
    await activate(choice('p2', 'autosomal_recessive')); await activate(reveal('p2'));
    expect(latest.dna.traceTrait.score).toBe(1); expect(live('p2', 'verdict').textContent).toMatch(/Pattern off/i);
    expect(live('p2', 'verdict').textContent).toMatch(/Ranking match:\s*4\s*\/\s*4/i); preserved();
  });

  it('merges rapid moves, picks and reveals from fresh puzzle state and ignores a same-turn duplicate verdict', async () => {
    await mount(); const down = move('p1', 'skip_generations', 'down'), p1Choice = choice('p1', 'autosomal_recessive'),
      p2Choice = choice('p2', 'x_linked_recessive'), p3Choice = choice('p3', 'autosomal_dominant'), p1Reveal = reveal('p1'), p2Reveal = reveal('p2');
    down.focus(); await act(async () => {
      down.click(); down.click(); p2Choice.click(); p3Choice.click(); p1Choice.click(); p1Reveal.click(); p2Reveal.click(); p1Reveal.click();
    });
    expect(saved('p1').ranking).toEqual(['unaffected_carriers', 'no_sex_bias', 'skip_generations', 'present_in_homozygote']);
    expect(saved('p1').pick).toBe('autosomal_recessive'); expect(saved('p1').revealed).toBe(true); expect(live('p1', 'verdict').textContent).toMatch(/Ranking match:\s*1\s*\/\s*4/i);
    expect(saved('p2').pick).toBe('x_linked_recessive'); expect(saved('p2').revealed).toBe(true); expect(saved('p2').ranking).toEqual(examples[1].ids);
    expect(saved('p3').pick).toBe('autosomal_dominant'); expect(saved('p3').revealed).not.toBe(true); expect(latest.dna.traceTrait.score).toBe(2);
    await advance(60000); expect(latest.dna.traceTrait.score).toBe(2); expect(Object.keys(latest.dna.traceTrait.puzzles).sort()).toEqual(['p1', 'p2', 'p3']); preserved();
  });

  it('retains completed and unfinished family work when the reference topic is hidden and reopened', async () => {
    await mount(); await activate(choice('p1', 'autosomal_recessive')); await activate(reveal('p1')); await activate(move('p3', 'fifty_pct', 'up'));
    const savedTrace = latest.dna.traceTrait;
    await act(async () => { updateStore(prev => ({ ...prev, dna: { ...prev.dna, expSection: 'glossary' } })); }); expect(panel()).toBeNull();
    await act(async () => { updateStore(prev => ({ ...prev, dna: { ...prev.dna, expSection: 'traceTrait' } })); });
    expect(latest.dna.traceTrait).toBe(savedTrace); expect(saved('p1').revealed).toBe(true); expect(order('p3')).toEqual(['every_gen', 'fifty_pct', 'affected_parent_required', 'no_sex_bias_dom']);
    expect(live('p1', 'verdict').textContent).toMatch(/Pattern correct/i); expect(live('p3', 'verdict').textContent).toBe(''); await advance(60000);
    expect(latest.dna.traceTrait).toBe(savedTrace); preserved();
  });
});
