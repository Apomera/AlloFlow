import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let contract, helpers;
const text = 'Fair is foul.\r\nAnd foul is fair.';
function reading(family = 'source-a', unit = 'lesson-a', sourceText = text) {
  return contract.createSupportedReading(sourceText, {
    id: 'original-' + family + '-' + unit, sourceArtifactId: family,
    sourceFamilyId: family, unitId: unit
  });
}
function adapted(original, id = 'adapted') {
  return {
    id, type: 'simplified', data: 'Fair and foul trade places.',
    sourceSnapshot: original.sourceSnapshot, sourceFamilyId: original.sourceFamilyId, unitId: original.unitId,
    instructionalText: { form: 'adapted', role: 'supplemental', sourceArtifactId: original.sourceSnapshot.sourceArtifactId }
  };
}
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  contract = window.AlloModules.InstructionalContext;
  const source = readFileSync('view_simplified_source.jsx', 'utf8');
  const first = source.indexOf('  function getInstructionalContextApi()');
  const end = source.indexOf('  function getSimplifiedComplexityDisplay(');
  helpers = new Function('window', source.slice(first, end) + '\nreturn { supports: findSimplifiedReadingSupportOwner, comparison: findSimplifiedComparisonSupportOwner, companion: findSimplifiedReadingCompanion, resolve: resolveSimplifiedCompareSource };')(window);
});

describe('reader source-family isolation', () => {
  it('takes supports from the matching source family rather than later identical prose', () => {
    const original = reading();
    const otherFamily = reading('source-b');
    const current = adapted(original);
    expect(helpers.supports([original, otherFamily], current, current.sourceSnapshot)).toBe(original);
    expect(helpers.supports([otherFamily], current, current.sourceSnapshot)).toBeNull();
  });

  it('keeps identical source families in separate lessons isolated', () => {
    const original = reading();
    const otherLesson = reading('source-a', 'lesson-b');
    const current = adapted(original);
    expect(helpers.supports([otherLesson], current, current.sourceSnapshot)).toBeNull();
    expect(helpers.companion([adapted(otherLesson)], original, original.sourceSnapshot)).toBeNull();
  });

  it('requires exact captured text as well as family identity', () => {
    const original = reading();
    const revision = reading('source-a', 'lesson-a', text.replace('\r\n', '\n'));
    const current = adapted(original);
    expect(helpers.supports([revision], current, current.sourceSnapshot)).toBeNull();
    expect(helpers.companion([adapted(revision)], original, original.sourceSnapshot)).toBeNull();
  });

  it('cannot use a forged original body to acquire supports or a companion', () => {
    const original = reading();
    const forged = { ...original, data: 'Replaced body.' };
    expect(helpers.supports([original], forged, forged.sourceSnapshot)).toBeNull();
    expect(helpers.companion([adapted(original)], forged, forged.sourceSnapshot)).toBeNull();
  });

  it('opens the matching companion even when an identical passage exists in another family', () => {
    const original = reading();
    const matching = adapted(original, 'matching');
    const other = adapted(reading('source-b'), 'other');
    expect(helpers.companion([matching, other], original, original.sourceSnapshot)).toBe(matching);
    expect(helpers.companion([other], original, original.sourceSnapshot)).toBeNull();
  });

  it('uses the current original for its own newly curated supports', () => {
    const original = reading();
    const prior = { ...original, readingSupports: { annotations: [] } };
    expect(helpers.supports([prior], original, original.sourceSnapshot)).toBe(original);
  });
});

describe('explicit comparison source ownership', () => {
  it('binds linked captured-source supports to the adaptation family', () => {
    const original = reading();
    const current = adapted(original);
    const other = reading('source-b');
    const comparison = helpers.resolve([other], current, '');
    expect(helpers.comparison([original, other], current, comparison, text)).toBe(original);
    expect(helpers.comparison([other], current, comparison, text)).toBeNull();
  });

  it('honors a teacher-selected source from a different family rather than the open adaptation', () => {
    const original = reading();
    const chosen = reading('source-b', 'lesson-b');
    const current = adapted(original);
    const comparison = { text, artifact: chosen, selection: 'educator-selected' };
    expect(helpers.comparison([chosen, original], current, comparison, text)).toBe(chosen);
  });

  it('finds supports for an explicitly selected analysis with no stored snapshot', () => {
    const original = reading('source-b', 'lesson-b');
    const analysis = { id: 'source-b', type: 'analysis', sourceFamilyId: 'source-b', unitId: 'lesson-b', data: { originalText: text } };
    const comparison = { text, artifact: analysis, selection: 'educator-selected' };
    expect(helpers.comparison([original], adapted(reading()), comparison, text)).toBe(original);
  });

  it('does not attach original offsets to a selected adapted body or transformed pane', () => {
    const original = reading();
    const selected = adapted(original);
    const comparison = { text: selected.data, artifact: selected, selection: 'educator-selected' };
    expect(helpers.comparison([original], selected, comparison, selected.data)).toBeNull();
    const linked = helpers.resolve([original], selected, '');
    expect(helpers.comparison([original], selected, linked, text.replace('\r\n', '\n'))).toBeNull();
  });
});

describe('legacy comparison links without a captured snapshot', () => {
  function legacy(unitId = 'lesson-a', sourceFamilyId = 'family-a') {
    return {
      id: 'legacy-adapted', type: 'simplified', data: 'Adapted legacy body.', unitId, sourceFamilyId,
      instructionalText: { form: 'adapted', role: 'supplemental', sourceArtifactId: 'legacy-source' }
    };
  }
  function analysis(unitId = 'lesson-a', sourceFamilyId = 'family-a') {
    return { id: 'legacy-source', type: 'analysis', unitId, sourceFamilyId, data: { originalText: text } };
  }

  it('retains a valid same-lesson legacy link even when a later reused ID belongs elsewhere', () => {
    const matching = analysis();
    const other = analysis('lesson-b');
    expect(helpers.resolve([matching, other], legacy(), 'Unrelated input.')).toMatchObject({
      selection: 'linked-artifact', artifact: matching, text
    });
  });

  it.each([
    { unitId: 'lesson-b', sourceFamilyId: 'family-a' },
    { unitId: 'lesson-a', sourceFamilyId: 'family-b' }
  ])('rejects a linked ID belonging to another source scope: %j', ({ unitId, sourceFamilyId }) => {
    expect(helpers.resolve([analysis(unitId, sourceFamilyId)], legacy(), 'Unrelated input.')).toEqual({
      text: '', artifact: null, selection: 'original-not-captured'
    });
  });

  it('continues to use a modern captured snapshot without relying on a legacy history link', () => {
    const source = reading();
    const item = adapted(source);
    const result = helpers.resolve([analysis('another-lesson', 'another-family')], item, 'Unrelated input.');
    expect(result.selection).toBe('captured-source');
    expect(result.text).toBe(text);
  });
});
