import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const source = readFileSync(resolve(process.cwd(), 'stem_lab/stem_tool_evolab.js'), 'utf8');
const start = source.indexOf('  function ArchipelagoFieldCard(props) {');
const end = source.indexOf('  var archipelagoCSS = `', start);
if (start < 0 || end <= start) throw new Error('ArchipelagoFieldCard source boundaries were not found');
const buildFieldCard = new Function('ArchipelagoModel', 'ax', 'archSpecies', 'archTrait', 'archIslandName',
  'return (' + source.slice(start, end).trim() + ');');

let model, FieldCard, previousActEnvironment;
const mounted = [];
const noop = () => {};

beforeEach(() => {
  previousActEnvironment = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  resetStemLab();
  localStorage.clear();
  loadTool('stem_lab/stem_tool_evolab.js', 'evoLab');
  model = window.StemLab.evoArchipelagoModel;
  FieldCard = buildFieldCard(model, (key, fallback) => fallback,
    sp => sp === 'birds' ? 'Seedwing birds' : 'Shellseed plants',
    sp => sp === 'birds' ? 'Beak strength' : 'Seed-shell hardness',
    island => model.islands[island].name);
});

afterEach(() => {
  mounted.splice(0).forEach(({ root, host }) => {
    act(() => root.unmount());
    host.remove();
  });
  globalThis.IS_REACT_ACT_ENVIRONMENT = previousActEnvironment;
});

function resident(id, value, born = 0, species = 'birds') {
  return Object.freeze({ id, born, species, genes: Object.freeze([value, value]), marker: Object.freeze([1, 0]),
    parents: Object.freeze([]), inheritance: Object.freeze([]) });
}

function frame(generation, populations) {
  return Object.freeze({ generation, round: null, demes: Object.freeze(Array.from({ length: 3 }, (_, island) => {
    const cohort = populations[island] || {};
    return Object.freeze({ birds: Object.freeze((cohort.birds || []).slice()), plants: Object.freeze((cohort.plants || []).slice()) });
  })) });
}

// Immutable census fixtures test evidence independently of breeding randomness.
// Six exact endpoints and 24 later residents expose boundary and denominator errors.
function expedition(values = [0, .2, .4, .6, .8, 1]) {
  const birds = values.map((value, i) => resident(i + 1, value));
  const plants = [resident(40, .24, 0, 'plants'), resident(41, .27, 0, 'plants')];
  const otherBirds = [resident(50, .123456789), resident(51, .876543211)];
  const laterBirds = Array.from({ length: 24 }, (_, i) => resident(101 + i, [.1, .35, .65, .95][Math.floor(i / 6)], 1));
  const history = Object.freeze([frame(0, { 0: { birds, plants }, 1: { birds: otherBirds } }),
    frame(1, { 0: { birds: laterBirds }, 1: { birds: [resident(150, .7, 1)] } })]);
  const world = Object.freeze({ version: 1, seed: 2026, smallFounders: true, rng: 123456789, nextId: 151, generation: 1, history,
    settings: Object.freeze({ migration: .12, reciprocal: true, selection: true, mutation: .01, rainfall: Object.freeze([.15, .5, .85]) }) });
  return { world, birds, plants, otherBirds, laterBirds };
}

function mountFieldCard(world, selected = null, initialProps = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let props = { React, world, frame: world.history[0], island: 0, species: 'birds', selected,
    resident: model.find(world, selected), onPick: vi.fn(), onSpecies: noop, onRecord: noop, onBirth: noop,
    onInspectReference: noop, onObservationFinding: vi.fn(), onCohortFinding: vi.fn(), onJournal: vi.fn(), onVisitCohort: vi.fn(), ...initialProps };
  function rerender(patch = {}) {
    props = { ...props, ...patch };
    act(() => root.render(React.createElement(FieldCard, props)));
  }
  rerender();
  host.querySelector('.ea-field-variation').open = true;
  function unmount() {
    act(() => root.unmount());
    host.remove();
    mounted.splice(mounted.findIndex(entry => entry.host === host), 1);
  }
  return { host, rerender, unmount };
}

function findButton(host, text) {
  return [...host.querySelectorAll('button')].find(node => node.textContent === text) || null;
}

function click(host, text) {
  const button = findButton(host, text);
  expect(button, 'Missing field-card button: ' + text).toBeTruthy();
  expect(button.tagName).toBe('BUTTON');
  act(() => button.click());
  return button;
}

function accessibleName(node) {
  if (node.getAttribute('aria-label')) return node.getAttribute('aria-label');
  const labelledBy = node.getAttribute('aria-labelledby');
  if (labelledBy) return labelledBy.split(/\s+/).map(id => node.ownerDocument.getElementById(id)?.textContent || '').join(' ');
  return [...(node.labels || [])].map(label => label.textContent).join(' ');
}

function captured(host, context) {
  const region = host.querySelector('[data-field-cohort-observation="ready"]');
  expect(region).toBeTruthy();
  expect(accessibleName(region)).toBe('Captured cohort comparison');
  expect(region.getAttribute('data-field-cohort-observation-context')).toBe(context);
  expect(region.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull();
  return region;
}

function evidence(region) {
  const details = [...region.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Show captured cohort evidence');
  expect(details).toBeTruthy();
  expect(details.open).toBe(false);
  const exact = [...details.querySelectorAll('details')].find(node => node.querySelector('summary')?.textContent === 'Show exact captured census record');
  expect(exact).toBeTruthy();
  expect(exact.open).toBe(false);
  expect(exact.querySelector('pre')).toBeTruthy();
  return exact.querySelector('pre').textContent;
}

function note(region) {
  const textarea = region.querySelector('textarea');
  expect(textarea).toBeTruthy();
  expect(accessibleName(textarea)).toBe('What differs between these cohorts? Cite a count or proportion, and describe what this comparison cannot establish.');
  expect(textarea.maxLength).toBe(2000);
  return textarea;
}

function writeNote(region, value) {
  const textarea = note(region);
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, value);
    textarea.dispatchEvent(new window.Event('input', { bubbles: true }));
  });
}

function sideStatistics(region, side, members) {
  const card = region.querySelector('[data-field-cohort-observation-side="' + side + '"]');
  expect(card).toBeTruthy();
  const total = card.hasAttribute('data-field-cohort-observation-total') ? card : card.querySelector('[data-field-cohort-observation-total]');
  expect(total).toBeTruthy();
  expect(Number(total.getAttribute('data-field-cohort-observation-total'))).toBe(members.length);
  const mean = card.hasAttribute('data-field-cohort-observation-mean') ? card : card.querySelector('[data-field-cohort-observation-mean]');
  if (!members.length) expect(mean).toBeNull();
  else {
    expect(mean).toBeTruthy();
    expect(Number(mean.getAttribute('data-field-cohort-observation-mean'))).toBeCloseTo(model.stats(members).mean, 13);
  }
}

function readyCohorts(fixture, props = {}) {
  const view = mountFieldCard(fixture.world, null, props);
  click(view.host, 'Pin displayed cohort as reference');
  view.rerender({ frame: fixture.world.history[1] });
  expect(view.host.querySelector('[data-field-cohort-comparison="ready"]')).toBeTruthy();
  return view;
}

function expectCensusEvidence(text, fixture, a, b, context, aCounts, bCounts) {
  const cohorts = [a, b].map(([generation, island]) => {
    const members = fixture.world.history[generation].demes[island].birds;
    const residents = members.map(item => ({ id: item.id, trait: (item.genes[0] + item.genes[1]) / 2 }));
    return { generation, island, residents, total: members.length,
      mean: members.length ? residents.reduce((sum, item) => sum + item.trait, 0) / members.length : null };
  });
  const raw = number => number === null ? 'undefined (empty cohort)' : String(number);
  expect(text).toContain('Seed=2026; comparison context=' + context + '; species=birds.');
  cohorts.forEach((cohort, side) => {
    const label = side === 0 ? 'A' : 'B';
    expect(text).toContain(label + ': island=' + model.islands[cohort.island].name + '; recorded generation=G' + cohort.generation +
      '; census N=' + cohort.total + '; mean trait (0–1)=' + raw(cohort.mean) +
      '; mean trait index (0–100)=' + raw(cohort.mean === null ? null : cohort.mean * 100) + '.');
    expect(text).toContain(label + ' census residents (id, trait 0–1)=' + JSON.stringify(cohort.residents) + '.');
  });
  const [first, second] = cohorts;
  const meanDifference = first.mean === null || second.mean === null ? null : (second.mean - first.mean) * 100;
  expect(text).toContain('B minus A mean=' + raw(meanDifference) + ' trait index points (0–100 scale).');
  expect(text.match(/^Band /gm)).toHaveLength(5);
  aCounts.forEach((aCount, band) => {
    const aShare = first.total ? aCount / first.total : null;
    const bShare = second.total ? bCounts[band] / second.total : null;
    const difference = aShare === null || bShare === null ? null : (bShare - aShare) * 100;
    expect(text).toContain('Band [' + band * 20 + ', ' + (band + 1) * 20 + (band === 4 ? ']' : ')') +
      ': A count=' + aCount + '/' + first.total + '; A share=' + raw(aShare) +
      '; B count=' + bCounts[band] + '/' + second.total + '; B share=' + raw(bShare) +
      '; B minus A share=' + raw(difference) + ' percentage points.');
  });
}

function expectCapturedTable(region, aCounts, bCounts) {
  const aTotal = aCounts.reduce((sum, count) => sum + count, 0);
  const bTotal = bCounts.reduce((sum, count) => sum + count, 0);
  const rows = [...region.querySelectorAll('tr[data-field-cohort-observation-band]')];
  expect(rows).toHaveLength(5);
  expect(rows[0].closest('table')).toBeTruthy();
  rows.forEach((row, band) => {
    expect(row.getAttribute('data-field-cohort-observation-band')).toBe(String(band));
    for (const [side, counts, total] of [['A', aCounts, aTotal], ['B', bCounts, bTotal]]) {
      const cell = row.querySelector('td[data-field-cohort-observation-table-side="' + side + '"]');
      expect(cell).toBeTruthy();
      expect(Number(cell.getAttribute('data-field-cohort-observation-count'))).toBe(counts[band]);
      if (total) {
        expect(cell.hasAttribute('data-field-cohort-observation-share')).toBe(true);
        expect(Number(cell.getAttribute('data-field-cohort-observation-share'))).toBeCloseTo(counts[band] / total, 13);
      } else {
        expect(cell.hasAttribute('data-field-cohort-observation-share')).toBe(false);
        expect(cell.textContent).toContain('Undefined');
      }
    }
    const delta = row.querySelector('[data-field-cohort-observation-share-difference]');
    if (aTotal && bTotal) {
      expect(delta).toBeTruthy();
      expect(Number(delta.getAttribute('data-field-cohort-observation-share-difference')))
        .toBeCloseTo(100 * (bCounts[band] / bTotal - aCounts[band] / aTotal), 13);
    } else {
      expect(delta).toBeNull();
      expect(row.querySelector('td:last-child').textContent).toContain('Undefined');
    }
  });
}

describe('captured archipelago cohort observations', () => {
  it('freezes a complete unequal-cohort census independently of browsing, pin replacement, and an organism observation', () => {
    const fixture = expedition(), finding = vi.fn(), organismFinding = vi.fn(), journal = vi.fn();
    const original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, 1,
      { onCohortFinding: finding, onObservationFinding: organismFinding, onJournal: journal });
    click(host, 'Pin this organism for comparison');
    rerender({ selected: 2, resident: model.find(fixture.world, 2) });
    click(host, 'Capture this comparison');
    const organismEvidence = host.querySelector('[data-field-observation] pre').textContent;
    click(host, 'Pin displayed cohort as reference');
    rerender({ frame: fixture.world.history[1], selected: 101, resident: model.find(fixture.world, 101) });
    click(host, 'Capture cohort comparison');
    const region = captured(host, 'time');
    expect(document.activeElement).toBe(region.querySelector('h3'));
    sideStatistics(region, 'A', fixture.birds);
    sideStatistics(region, 'B', fixture.laterBirds);
    const frozen = evidence(region);
    expectCensusEvidence(frozen, fixture, [0, 0], [1, 0], 'time', [1, 1, 1, 1, 2], [6, 6, 0, 6, 6]);
    expectCapturedTable(region, [1, 1, 1, 1, 2], [6, 6, 0, 6, 6]);
    expect(frozen).not.toMatch(/NaN|Infinity/);
    const reflection = 'Compare 6/24 with 1/6: a count change alone does not show a proportion change or identify its cause.';
    writeNote(region, reflection);
    expect(findButton(host, 'Capture cohort comparison').disabled).toBe(true);
    act(() => findButton(host, 'Capture cohort comparison').click());
    expect(evidence(captured(host, 'time'))).toBe(frozen);

    const queued = { ...fixture.world, settings: { ...fixture.world.settings, migration: .3 } };
    const queuedOriginal = JSON.stringify(queued);
    rerender({ world: queued, frame: fixture.world.history[0], island: 0, species: 'plants', selected: 40,
      resident: model.find(queued, 40) });
    click(host, 'Pin displayed cohort as reference');
    click(host, 'Clear cohort reference');
    rerender({ island: 1, species: 'birds', selected: null, resident: null });
    expect(evidence(captured(host, 'time'))).toBe(frozen);
    expectCapturedTable(captured(host, 'time'), [1, 1, 1, 1, 2], [6, 6, 0, 6, 6]);
    expect(note(captured(host, 'time')).value).toBe(reflection);
    expect(host.querySelector('[data-field-observation] pre').textContent).toBe(organismEvidence);
    click(host, 'Save cohort comparison to field journal');
    expect(finding).toHaveBeenCalledTimes(1);
    expect(finding.mock.calls[0][0]).toContain(frozen);
    expect(finding.mock.calls[0][0]).toContain(reflection);
    expect(finding.mock.calls[0][0]).toContain('Complete censuses of the two selected recorded cohorts, frozen at capture.');
    expect(finding.mock.calls[0][0]).toContain('This descriptive comparison does not isolate selection, dispersal, drift or mutation as a cause');
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    expect(host.querySelector('[data-field-observation] pre').textContent).toBe(organismEvidence);
    const feedback = host.querySelector('[data-field-cohort-observation-saved]');
    expect(feedback).toBeTruthy();
    expect(feedback.tagName).toBe('P');
    expect(feedback.hasAttribute('aria-live')).toBe(false);
    expect(feedback.hasAttribute('role')).toBe(false);
    expect(document.activeElement).toBe(feedback);
    expect(organismFinding).not.toHaveBeenCalled();
    expect(journal).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.world)).toBe(original);
    expect(JSON.stringify(queued)).toBe(queuedOriginal);
  });

  it('captures geography, time, and combined contexts without manufacturing means or shares for empty cohorts', () => {
    const fixture = expedition(), original = JSON.stringify(fixture.world);
    const cases = [
      { a: [0, 0], b: [0, 1], context: 'geography', counts: [[1, 1, 1, 1, 2], [1, 0, 0, 0, 1]] },
      { a: [0, 2], b: [1, 0], context: 'both', counts: [[0, 0, 0, 0, 0], [6, 6, 0, 6, 6]] },
      { a: [1, 0], b: [1, 2], context: 'geography', counts: [[6, 6, 0, 6, 6], [0, 0, 0, 0, 0]] },
      { a: [0, 2], b: [1, 2], context: 'time', counts: [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0]] }
    ];
    cases.forEach(({ a, b, context, counts }) => {
      const finding = vi.fn();
      const { host, rerender, unmount } = mountFieldCard(fixture.world, null,
        { frame: fixture.world.history[a[0]], island: a[1], onCohortFinding: finding });
      click(host, 'Pin displayed cohort as reference');
      rerender({ frame: fixture.world.history[b[0]], island: b[1] });
      click(host, 'Capture cohort comparison');
      const region = captured(host, context);
      const aMembers = fixture.world.history[a[0]].demes[a[1]].birds;
      const bMembers = fixture.world.history[b[0]].demes[b[1]].birds;
      sideStatistics(region, 'A', aMembers);
      sideStatistics(region, 'B', bMembers);
      const raw = evidence(region);
      expectCensusEvidence(raw, fixture, a, b, context, ...counts);
      expectCapturedTable(region, ...counts);
      expect(raw).not.toMatch(/NaN|Infinity/);
      if (!aMembers.length || !bMembers.length) expect(region.querySelector('[data-field-cohort-observation-difference]')).toBeNull();
      expect(note(region).value).toBe('');
      click(host, 'Save cohort comparison to field journal');
      expect(finding).toHaveBeenCalledTimes(1);
      expect(finding.mock.calls[0][0]).toContain(raw);
      expect(finding.mock.calls[0][0]).toContain('My explanation:\n(no explanation added)\nContext:');
      unmount();
    });
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('requires different cohorts of one species and cancels only its own draft with a usable focus return', () => {
    const fixture = expedition(), finding = vi.fn(), pick = vi.fn(), original = JSON.stringify(fixture.world);
    const { host, rerender } = mountFieldCard(fixture.world, 1, { onCohortFinding: finding, onPick: pick });
    expect(findButton(host, 'Capture cohort comparison')).toBeNull();
    click(host, 'Pin displayed cohort as reference');
    expect(findButton(host, 'Capture cohort comparison')).toBeNull();
    rerender({ species: 'plants', selected: 40, resident: model.find(fixture.world, 40) });
    expect(host.querySelector('[data-field-cohort-comparison="species"]')).toBeTruthy();
    expect(findButton(host, 'Capture cohort comparison')).toBeNull();
    rerender({ island: 1, species: 'birds', selected: 50, resident: model.find(fixture.world, 50) });
    click(host, 'Capture cohort comparison');
    writeNote(captured(host, 'geography'), 'This explanation will be discarded.');
    click(host, 'Cancel cohort observation');
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    expect(host.querySelector('[data-field-cohort-observation-saved]')).toBeNull();
    expect(host.querySelector('[data-field-cohort-comparison="ready"]')).toBeTruthy();
    expect(document.activeElement).toBe(findButton(host, 'Capture cohort comparison'));
    expect(findButton(host, 'Capture cohort comparison').disabled).toBe(false);
    click(host, 'Capture cohort comparison');
    expect(note(captured(host, 'geography')).value).toBe('');
    click(host, 'Clear cohort reference');
    expect(findButton(host, 'Capture cohort comparison')).toBeNull();
    click(host, 'Cancel cohort observation');
    expect(document.activeElement).toBe(host.querySelector('.ea-field-variation > summary'));
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    expect(finding).not.toHaveBeenCalled();
    expect(pick).not.toHaveBeenCalled();
    expect(JSON.stringify(fixture.world)).toBe(original);
  });

  it('invalidates drafts and feedback for a same-seed founding-world replacement and saves only through its own callback', () => {
    const fixture = expedition(), finding = vi.fn(), individual = vi.fn(), journal = vi.fn();
    const callbacks = { onPick: vi.fn(), onSpecies: vi.fn(), onRecord: vi.fn(), onBirth: vi.fn(), onInspectReference: vi.fn(), onVisitCohort: vi.fn() };
    const original = JSON.stringify(fixture.world), initialRng = fixture.world.rng;
    const { host, rerender } = readyCohorts(fixture,
      { ...callbacks, onCohortFinding: finding, onObservationFinding: individual, onJournal: journal });
    click(host, 'Capture cohort comparison');
    writeNote(captured(host, 'time'), 'Only the original expedition owns this draft.');
    const staleSave = findButton(host, 'Save cohort comparison to field journal');
    const replacement = expedition([.11, .22, .33, .44, .55, .66]);
    expect(replacement.world.seed).toBe(fixture.world.seed);
    expect(replacement.world.history[0]).not.toBe(fixture.world.history[0]);
    // Keep the displayed frame unchanged: the founding root alone must invalidate it.
    rerender({ world: replacement.world });
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    expect(host.querySelector('[data-field-cohort-observation-saved]')).toBeNull();
    expect(findButton(host, 'Save cohort comparison to field journal')).toBeNull();
    act(() => staleSave.click());
    expect(finding).not.toHaveBeenCalled();

    rerender({ frame: replacement.world.history[0] });
    click(host, 'Pin displayed cohort as reference');
    rerender({ frame: replacement.world.history[1], onCohortFinding: undefined });
    click(host, 'Capture cohort comparison');
    const region = captured(host, 'time');
    expect(note(region).value).toBe('');
    expect(findButton(host, 'Save cohort comparison to field journal').disabled).toBe(true);
    act(() => findButton(host, 'Save cohort comparison to field journal').click());
    expect(finding).not.toHaveBeenCalled();
    rerender({ onCohortFinding: finding });
    const save = findButton(host, 'Save cohort comparison to field journal');
    expect(save.disabled).toBe(false);
    act(() => { save.click(); save.click(); });
    expect(finding).toHaveBeenCalledTimes(1);
    expect(finding.mock.calls[0][0]).not.toContain('Only the original expedition owns this draft.');
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    const feedback = host.querySelector('[data-field-cohort-observation-saved]');
    expect(feedback).toBeTruthy();
    expect(document.activeElement).toBe(feedback);
    expect(individual).not.toHaveBeenCalled();
    expect(journal).not.toHaveBeenCalled();
    Object.values(callbacks).forEach(callback => expect(callback).not.toHaveBeenCalled());
    expect(fixture.world.rng).toBe(initialRng);
    expect(JSON.stringify(fixture.world)).toBe(original);
    const third = expedition([.12, .23, .34, .45, .56, .67]);
    rerender({ world: third.world, frame: third.world.history[1] });
    expect(host.querySelector('[data-field-cohort-observation-saved]')).toBeNull();
    expect(host.querySelector('[data-field-cohort-observation]')).toBeNull();
    expect(finding).toHaveBeenCalledTimes(1);
  });
});
