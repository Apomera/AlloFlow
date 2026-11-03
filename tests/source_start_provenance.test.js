// Private, synthetic serialization + full compiled-view verification. No helper
// implementation is copied into the tests; both real delivery boundaries run.
import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import {
  labels, resource, boundaries, loadRealSerializationAndViews,
  mountBack, assertPrivatePlanningRemoved,
} from './helpers/source_provenance_fixture.js';

let views;
const rendered = [];
beforeAll(() => { views = loadRealSerializationAndViews(); }, 30000);
afterEach(() => { rendered.splice(0).reverse().forEach(view => view.destroy()); vi.restoreAllMocks(); });

function render(lane, item, translate) {
  const view = mountBack(views[lane], item, translate);
  rendered.push(view);
  return view.back;
}
function showsOnlyProvenance(back, expected) {
  expect(back.textContent).toContain(expected);
  for (const value of Object.values(labels)) if (value !== expected) expect(back.textContent).not.toContain(value);
}

describe.each(['canonical', 'packaged'])('actual compiled glossary provenance (%s)', lane => {
  it.each([
    { kind: 'word-list', label: labels.words },
    { kind: 'blank', label: labels.blank },
  ])('shows the $kind origin before delivery, without asserting later authorship', ({ kind, label }) => {
    const item = resource(kind);
    const before = JSON.stringify(item);
    showsOnlyProvenance(render(lane, item), label);
    expect(JSON.stringify(item)).toBe(before);
  });

  it.each([
    { name: 'root marker', input: { sourceSelection: 'seed' } },
    { name: 'config marker', input: { config: { sourceSelection: 'seed' } } },
    { name: 'unknown kind plus root marker', input: { lessonPath: { seed: { kind: 'future-kind' } }, sourceSelection: 'seed' } },
  ])('uses the neutral label for $name when a specific kind is unavailable', ({ input }) => {
    const item = resource('word-list', 'none'); delete item.lessonPath;
    Object.assign(item, input);
    const before = JSON.stringify(item);
    showsOnlyProvenance(render(lane, item), labels.independent);
    expect(JSON.stringify(item)).toBe(before);
  });

  it.each([
    { name: 'ordinary source', input: { sourceSelection: 'input-text' } },
    { name: 'unmarked legacy', input: {} },
    { name: 'unknown legacy kind', input: { lessonPath: { seed: { kind: 'unknown-legacy-kind' } } } },
    { name: 'non-seed source selection', input: { sourceSelection: 'none', config: { sourceSelection: 'automatic' } } },
  ])('retains the exact legacy fallback for $name', ({ input }) => {
    const item = resource('blank', 'none'); delete item.lessonPath;
    Object.assign(item, input);
    showsOnlyProvenance(render(lane, item), labels.legacy);
  });

  it('retains the exact existing passage translation key rather than replacing its wording', () => {
    const item = resource('blank', 'none'); delete item.lessonPath;
    const translate = vi.fn(key => key === 'glossary.flashcard_provenance' ? 'EXISTING_PASSAGE_PROVENANCE_TRANSLATION' : key);
    const back = render(lane, item, translate);
    expect(back.textContent).toContain('EXISTING_PASSAGE_PROVENANCE_TRANSLATION');
    expect(back.textContent).not.toContain(labels.independent);
    expect(translate.mock.calls.some(([key]) => key === 'glossary.flashcard_provenance')).toBe(true);
  });

  for (const boundary of boundaries) {
    describe(boundary.name, () => {
      it.each([
        { kind: 'word-list', marker: 'root' },
        { kind: 'word-list', marker: 'config' },
        { kind: 'word-list', marker: 'both' },
        { kind: 'blank', marker: 'root' },
        { kind: 'blank', marker: 'config' },
        { kind: 'blank', marker: 'both' },
      ])('removes private $kind planning, keeps the $marker marker, and renders neutral provenance', ({ kind, marker }) => {
        const item = resource(kind, marker);
        const before = JSON.stringify(item);
        const delivered = boundary.send(item);
        assertPrivatePlanningRemoved(delivered);
        expect(delivered.data).toEqual(item.data);
        if (marker === 'root' || marker === 'both') expect(delivered.sourceSelection).toBe('seed');
        if (marker === 'config' || marker === 'both') expect(delivered.config.sourceSelection).toBe('seed');
        showsOnlyProvenance(render(lane, delivered), labels.independent);
        expect(JSON.stringify(item)).toBe(before);
        showsOnlyProvenance(render(lane, item), kind === 'word-list' ? labels.words : labels.blank);
      });

      it('withholds an empty blank glossary and sends it only after the existing editor shape is filled', () => {
        const item = resource('blank'); item.data = [];
        const emptyBefore = JSON.stringify(item);
        expect(boundary.send(item)).toBeNull();
        expect(JSON.stringify(item)).toBe(emptyBefore);
        item.data = [{ entryId: 'manual-leaf', term: 'Leaf', def: 'A plant part.', tier: 'Academic' }];
        const filledBefore = JSON.stringify(item);
        const delivered = boundary.send(item);
        assertPrivatePlanningRemoved(delivered);
        expect(delivered.data).toEqual(item.data);
        showsOnlyProvenance(render(lane, delivered), labels.independent);
        expect(JSON.stringify(item)).toBe(filledBefore);
      });

      it('does not invent a no-passage origin for unknown legacy content after delivery', () => {
        const item = resource('unknown-legacy-kind', 'none');
        const before = JSON.stringify(item);
        const delivered = boundary.send(item);
        assertPrivatePlanningRemoved(delivered);
        expect(delivered.sourceSelection).not.toBe('seed');
        expect(delivered.config?.sourceSelection).not.toBe('seed');
        showsOnlyProvenance(render(lane, delivered), labels.legacy);
        expect(JSON.stringify(item)).toBe(before);
      });
    });
  }
});
