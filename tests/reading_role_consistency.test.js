import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';
let Context;
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  Context = window.AlloModules.InstructionalContext;
});
const profile = (role, form = 'original') => ({
  role, form, designationSource: 'educator',
  replacementAuthorization: { authorized: form === 'adapted' && role === 'primary', source: form === 'adapted' && role === 'primary' ? 'educator' : 'none' }
});
function family(unitId = 'lesson-a', role = 'primary', id = 'source-a') {
  const snapshot = Context.createSourceSnapshot('The saved original.', { sourceArtifactId: id, language: 'English', selection: 'saved-analysis' });
  const analysis = { id, unitId, sourceFamilyId: id, type: 'analysis', data: { originalText: snapshot.text }, sourceSnapshot: snapshot, instructionalText: profile(role) };
  const original = Context.createSupportedReading(snapshot, { id: id + '-reader', sourceFamilyId: id, unitId, sourceInstructionalText: profile(role) });
  const adapted = { id: id + '-adapted', unitId, sourceFamilyId: id, type: 'simplified', data: 'An easier version.', sourceSnapshot: snapshot, sourceInstructionalText: profile(role), instructionalText: profile('supplemental', 'adapted') };
  return { snapshot, analysis, original, adapted };
}
describe('reading role persistence and source representation', () => {
  it('persists inferred/default analysis role through cloud and legacy hydration', () => {
    const item = { id: 'source', type: 'analysis', data: { originalText: 'Source text' } };
    expect(Context.getInstructionalText(item).role).toBe('primary');
    const [cloud] = window.sanitizeHistoryForCloud([item]);
    expect(cloud.instructionalText).toMatchObject({ role: 'primary', form: 'original', designationSource: 'workflow-default' });
    const [loaded] = window.hydrateHistory([item]);
    expect(Context.getInstructionalText(loaded).role).toBe('primary');
    expect(Context.getInstructionalText(window.hydrateHistory([cloud])[0]).role).toBe('primary');
  });
  it.each(['primary', 'supplemental', 'unspecified'])('inherits an explicit %s source role without changing original text', role => {
    const { snapshot } = family();
    const reading = Context.createSupportedReading(snapshot, { instructionalText: profile(role), unitId: 'lesson', sourceFamilyId: 'source' });
    expect(reading.data).toBe(snapshot.text);
    expect(reading.instructionalText).toMatchObject({ role, form: 'same-text-supported', designationSource: 'educator', replacementAuthorization: { authorized: false, source: 'none' } });
    expect(reading.sourceInstructionalText).toMatchObject({ role, form: 'original' });
    const [loaded] = window.hydrateHistory(window.sanitizeHistoryForCloud([reading]));
    expect(loaded.instructionalText.role).toBe(role);
    expect(loaded.sourceInstructionalText.role).toBe(role);
    expect(loaded.sourceFamilyId).toBe('source');
    expect(loaded.unitId).toBe('lesson');
  });
  it('keeps default analysis normalization consistent when context module is not yet loaded', () => {
    const api = window.AlloModules.InstructionalContext;
    delete window.AlloModules.InstructionalContext;
    try {
      const [loaded] = window.hydrateHistory([{ id: 'source', type: 'analysis', data: { originalText: 'Source text' } }]);
      expect(loaded.instructionalText).toMatchObject({ role: 'primary', designationSource: 'workflow-default' });
      expect(loaded.sourceInstructionalText.role).toBe('primary');
    } finally { window.AlloModules.InstructionalContext = api; }
  });
  it('keeps form and instructional-use labels separate', () => {
    const { original, adapted } = family('lesson', 'supplemental');
    expect(Context.getReadingArtifactLabel(original)).toBe('Original with supports');
    expect(Context.getReadingRoleLabel(original)).toBe('Supporting reading');
    expect(Context.getReadingArtifactLabel(adapted)).toBe('Adapted text');
    expect(Context.getReadingRoleLabel(profile('primary'))).toBe('Main reading');
    expect(Context.getReadingRoleLabel(profile('unspecified'))).toBe('Not designated');
  });
});
describe('scoped source selection', () => {
  it('returns only the current lesson source and does not choose newer unrelated history', () => {
    const a = family('lesson-a', 'primary', 'a'), b = family('lesson-b', 'primary', 'b');
    const result = Context.resolveReadingSource({ items: [a.analysis, b.analysis], unitId: 'lesson-a' });
    expect(result.status).toBe('resolved');
    expect(result.artifact).toBe(a.analysis);
    expect(result.inputArtifactId).toBe('a');
    expect(result.sourceFamilyId).toBe('a');
    expect(result.candidates.map(item => item.id)).toEqual(['a']);
    expect(Context.resolveReadingSource({ items: [b.analysis], unitId: 'lesson-a' }).status).toBe('missing');
  });
  it('returns ambiguity when multiple main passages are eligible and honors explicit selection', () => {
    const a = family('lesson-a', 'primary', 'a'), b = family('lesson-a', 'primary', 'b');
    const auto = Context.resolveReadingSource({ items: [a.analysis, b.analysis], unitId: 'lesson-a' });
    expect(auto.status).toBe('ambiguous');
    const chosen = Context.resolveReadingSource({ items: [a.analysis, b.analysis], sourceArtifactId: 'b', unitId: 'lesson-a' });
    expect(chosen.artifact).toBe(b.analysis);
    expect(chosen.instructionalText.role).toBe('primary');
    expect(Context.resolveReadingSource({ items: [a.analysis], sourceArtifactId: 'gone', inputText: 'Ambient', unitId: 'lesson-a' }).status).toBe('missing');
  });
  it('treats source and its supported copy as one input without coalescing separate lessons', () => {
    const a = family(), b = family('lesson-b', 'supplemental', 'b');
    expect(Context.resolveReadingSource({ items: [a.analysis, a.original], unitId: 'lesson-a' }).status).toBe('resolved');
    expect(Context.sameReadingFamily(a.original, b.original)).toBe(false);
    expect(Context.sameReadingFamily(a.original, a.adapted)).toBe(true);
  });
  it('uses the selected adapted main as activity input while retaining its original separately', () => {
    const a = family('lesson-a', 'supplemental');
    a.adapted.instructionalText = profile('primary', 'adapted');
    const result = Context.resolveReadingSource({ items: [a.analysis, a.original, a.adapted], unitId: 'lesson-a' });
    expect(result.status).toBe('resolved');
    expect(result.text).toBe(a.adapted.data);
    expect(result.sourceSnapshot.text).toBe(a.snapshot.text);
    expect(result.inputArtifactId).toBe(a.adapted.id);
    expect(result.sourceArtifactId).toBe(a.analysis.id);
    expect(result.instructionalText.form).toBe('adapted');
    expect(result.sourceInstructionalText.role).toBe('supplemental');
  });
  it('does not manufacture original provenance when analyzing a selected adaptation', () => {
    const a = family('lesson-a', 'supplemental');
    const analysis = { ...a.analysis, data: { originalText: a.adapted.data }, instructionalText: profile('primary', 'adapted'), sourceInstructionalText: profile('supplemental') };
    const result = Context.resolveReadingSource({ selected: analysis });
    expect(result.text).toBe(a.adapted.data);
    expect(result.sourceSnapshot.text).toBe(a.snapshot.text);
    const missingOrigin = Context.resolveReadingSource({ textOverride: 'Adapted input', inputInstructionalText: profile('primary', 'adapted'), sourceSnapshot: null });
    expect(missingOrigin.sourceSnapshot).toBeNull();
  });
  it('recaptures current saved analysis text after edits, preserving existing companion source', () => {
    const a = family();
    a.analysis.data.originalText = 'Revised saved source';
    const result = Context.resolveReadingSource({ selected: a.analysis });
    expect(result.text).toBe('Revised saved source');
    expect(result.sourceSnapshot.text).toBe('Revised saved source');
    expect(result.sourceSnapshot.provenance.selection).toBe('saved-analysis');
    expect(a.adapted.sourceSnapshot.text).toBe('The saved original.');
  });
  it('uses explicit paste and override choices without ambient source identity', () => {
    const a = family();
    const pasted = Context.resolveReadingSource({ items: [a.analysis], sourceArtifactId: '__input__', inputText: '42\r\nnull', unitId: 'lesson-a' });
    expect(pasted.text).toBe('42\r\nnull');
    expect(pasted.artifact).toBeNull();
    expect(pasted.sourceArtifactId).toBeNull();
    const override = Context.resolveReadingSource({ items: [a.analysis], sourceArtifactId: a.analysis.id, textOverride: 'Override text', unitId: 'lesson-a' });
    expect(override.inputArtifactId).toBeNull();
    expect(override.sourceSnapshot.text).toBe('Override text');
    expect(override.sourceArtifactId).toBeNull();
  });
  it('does not use unsupported original claims or unauthorized adapted primary as automatic main evidence', () => {
    const a = family();
    const badOriginal = { ...a.original, data: 'Changed without preserving source' };
    const badAdapted = { ...a.adapted, instructionalText: { ...profile('primary', 'adapted'), replacementAuthorization: { authorized: false, source: 'none' } } };
    expect(Context.resolveReadingSource({ items: [badOriginal], unitId: 'lesson-a' }).status).toBe('missing');
    expect(Context.resolveReadingSource({ selected: badOriginal }).reason).toBe('unverified-original');
    expect(Context.resolveReadingSource({ items: [badAdapted], unitId: 'lesson-a' }).status).toBe('missing');
  });
});
describe('role changes and delivered source families', () => {
  it('propagates source role to same-family representations while keeping adaptation roles independent', () => {
    const a = family(), b = family('lesson-b', 'primary', 'b');
    a.adapted.instructionalText = profile('primary', 'adapted');
    const items = [a.analysis, a.original, a.adapted, b.analysis, b.original];
    const result = Context.updateReadingFamilyRole(items, a.original, 'supplemental');
    expect(result.items.slice(0, 2).map(item => item.instructionalText.role)).toEqual(['supplemental', 'supplemental']);
    expect(result.items[2].instructionalText.role).toBe('primary');
    expect(result.items[2].sourceInstructionalText.role).toBe('supplemental');
    expect(result.items[3]).toBe(b.analysis);
    expect(result.items[4]).toBe(b.original);
    expect(result.items[1].data).toBe(a.snapshot.text);
    expect(a.analysis.instructionalText.role).toBe('primary');
  });
  it('requires explicit authorization only for adapted primary and never grants it to originals', () => {
    const a = family();
    expect(Context.updateReadingFamilyRole([a.adapted], a.adapted, 'primary').changedIds).toEqual([]);
    const authorized = Context.updateReadingFamilyRole([a.analysis, a.original, a.adapted], a.adapted, 'primary', { authorizeReplacement: true });
    expect(authorized.items[0]).toBe(a.analysis);
    expect(authorized.items[1]).toBe(a.original);
    expect(authorized.item.instructionalText.replacementAuthorization.authorized).toBe(true);
    const reverted = Context.updateReadingFamilyRole(authorized.items, authorized.item, 'supplemental');
    expect(reverted.item.instructionalText.replacementAuthorization.authorized).toBe(false);
    expect(Context.updateInstructionalRole(a.original, 'primary', { authorizeReplacement: true }).instructionalText.replacementAuthorization.authorized).toBe(false);
  });
  it('preserves selected source supporting role when only its adaptation is delivered', () => {
    const a = family('lesson-a', 'supplemental');
    const pair = Context.ensureReadingSourcePairs([a.adapted]);
    expect(pair).toHaveLength(2);
    expect(pair[0].instructionalText.role).toBe('supplemental');
    expect(pair[0].unitId).toBe('lesson-a');
    expect(pair[0].sourceFamilyId).toBe(a.original.sourceFamilyId);
    expect(Context.isSupportedOriginal(pair[0])).toBe(true);
  });
  it('prefers the current saved original role over stale captured role metadata', () => {
    const a = family();
    a.original.instructionalText = profile('supplemental', 'same-text-supported');
    a.original.sourceInstructionalText = profile('supplemental');
    const pair = Context.ensureReadingSourcePairs([a.adapted], { history: [a.original] });
    expect(pair[0]).toBe(a.original);
    expect(pair[0].instructionalText.role).toBe('supplemental');
  });
  it('defaults legacy adapted-main originals to supporting, without changing an explicit saved source role', () => {
    const a = family();
    a.adapted.instructionalText = profile('primary', 'adapted');
    delete a.adapted.sourceInstructionalText;
    expect(Context.ensureReadingSourcePairs([a.adapted])[0].instructionalText.role).toBe('supplemental');
    a.adapted.sourceInstructionalText = profile('primary');
    expect(Context.ensureReadingSourcePairs([a.adapted])[0].instructionalText.role).toBe('primary');
  });
  it('never treats an unrelated lesson main as satisfying a companion relationship', () => {
    const a = family('lesson-a', 'supplemental'), b = family('lesson-b', 'primary', 'b');
    const withoutPair = Context.summarizeReadingAccess([a.adapted, b.original]);
    expect(withoutPair.hasPrimary).toBe(true);
    expect(withoutPair.missingSourceCompanions).toEqual([a.adapted]);
    expect(withoutPair.missingPrimaryCompanions).toEqual([a.adapted]);
    expect(withoutPair.hasSupplementalWithoutPrimary).toBe(true);
    const withPair = Context.summarizeReadingAccess([a.adapted, b.original], { includeSourcePairs: true });
    expect(withPair.missingSourceCompanions).toHaveLength(0);
    expect(withPair.missingPrimaryCompanions).toEqual([a.adapted]);
    expect(withPair.items).toHaveLength(3);
  });
  it('keeps separate same-text originals for different source families/lessons', () => {
    const a = family('lesson-a', 'primary', 'a'), b = family('lesson-b', 'supplemental', 'b');
    const pair = Context.ensureReadingSourcePairs([a.adapted, b.adapted]);
    expect(pair.filter(Context.isSupportedOriginal)).toHaveLength(2);
    expect(pair.filter(Context.isSupportedOriginal).map(item => item.unitId)).toEqual(['lesson-a', 'lesson-b']);
    expect(pair.filter(Context.isSupportedOriginal).map(item => item.instructionalText.role)).toEqual(['primary', 'supplemental']);
  });
});

describe('automatic source selection boundaries', () => {
  it('uses scoped main instead of residual paste and keeps multiple mains ambiguous', () => {
    const a = family('lesson-a', 'primary', 'a'), b = family('lesson-a', 'primary', 'b');
    expect(Context.resolveReadingSource({ items: [a.analysis], inputText: 'Old pasted text', unitId: 'lesson-a' }).artifact).toBe(a.analysis);
    expect(Context.resolveReadingSource({ items: [a.analysis, b.analysis], inputText: 'Old pasted text', unitId: 'lesson-a' }).status).toBe('ambiguous');
    expect(Context.resolveReadingSource({ items: [], inputText: 'New pasted text', unitId: 'lesson-a' }).text).toBe('New pasted text');
  });
  it('does not make one lesson primary govern a different lesson in the all-lessons view', () => {
    const a = family('lesson-a', 'primary', 'a'), b = family('lesson-b', 'supplemental', 'b');
    const result = Context.resolveReadingSource({ items: [a.analysis, b.analysis], unitId: 'all', inputText: 'Leftover input' });
    expect(result.status).toBe('ambiguous');
    expect(result.reason).toBe('choose-lesson-source');
    expect(Context.resolveReadingSource({ items: [a.analysis, b.analysis], unitId: 'all', sourceArtifactId: 'b' }).artifact).toBe(b.analysis);
  });
  it('binds a snapshot without an artifact ID to the selected saved analysis', () => {
    const snapshot = Context.createSourceSnapshot('Saved passage');
    const analysis = { id: 'analysis-owned', type: 'analysis', unitId: 'lesson', data: { originalText: snapshot.text }, sourceSnapshot: snapshot };
    const result = Context.resolveReadingSource({ selected: analysis });
    expect(result.sourceArtifactId).toBe(analysis.id);
    expect(result.sourceSnapshot.sourceArtifactId).toBe(analysis.id);
    expect(snapshot.sourceArtifactId).toBeNull();
  });
  it('does not let a stale source-role mirror override the actual original role', () => {
    const a = family();
    a.original.instructionalText = profile('supplemental', 'same-text-supported');
    expect(Context.getSourceInstructionalText(a.original).role).toBe('supplemental');
    const api = window.AlloModules.InstructionalContext;
    delete window.AlloModules.InstructionalContext;
    try {
      expect(window.hydrateHistory([a.original])[0].sourceInstructionalText.role).toBe('supplemental');
    } finally { window.AlloModules.InstructionalContext = api; }
  });
  it('retains source role and lesson metadata when a live reading cannot fit', () => {
    const snapshot = Context.createSourceSnapshot('X'.repeat(120001), { sourceArtifactId: 'long-source' });
    const original = Context.createSupportedReading(snapshot, { unitId: 'lesson', sourceFamilyId: 'long-source', instructionalText: profile('supplemental') });
    const [shared] = window.prepareSessionResourcesForWrite([original]).resources;
    expect(shared.syncTruncated).toBe(true);
    expect(shared.sourceInstructionalText.role).toBe('supplemental');
    expect(shared.unitId).toBe('lesson');
    expect(shared.sourceFamilyId).toBe('long-source');
    expect(Context.summarizeReadingAccess([shared]).hasPrimary).toBe(false);
  });
});

describe('adapted analysis source continuity', () => {
  it('pairs an analysis of adapted input with its captured source and keeps its own reading role', () => {
    const a = family('lesson-a', 'supplemental');
    const analysis = { ...a.adapted, id: 'adapted-analysis', type: 'analysis', data: { originalText: a.adapted.data }, instructionalText: profile('primary', 'adapted') };
    const withoutSource = Context.summarizeReadingAccess([analysis]);
    expect(withoutSource.missingSourceCompanions).toEqual([analysis]);
    expect(withoutSource.missingPrimaryCompanions).toEqual([]);
    const paired = Context.summarizeReadingAccess([analysis], { includeSourcePairs: true });
    expect(paired.items).toHaveLength(2);
    expect(paired.items[1]).toBe(analysis);
    expect(paired.items[0].data).toBe(a.snapshot.text);
    expect(paired.items[0].instructionalText.role).toBe('supplemental');
    expect(paired.items[0].unitId).toBe('lesson-a');
    expect(Context.isSupportedOriginal(paired.items[0])).toBe(true);
    expect(paired.missingSourceCompanions).toEqual([]);
    const resolved = Context.resolveReadingSource({ items: paired.items, unitId: 'lesson-a' });
    expect(resolved.artifact).toBe(analysis);
    expect(resolved.text).toBe(a.adapted.data);
    expect(resolved.sourceSnapshot.text).toBe(a.snapshot.text);
  });
  it.each([true, false])('retains ordinary analysis family identity through hydration with context loaded = %s', loaded => {
    const a = family();
    const analysis = { ...a.analysis, id: 'new-analysis' };
    delete analysis.sourceFamilyId;
    expect(Context.getReadingSourceFamilyId(analysis)).toBe('new-analysis');
    const api = window.AlloModules.InstructionalContext;
    if (!loaded) delete window.AlloModules.InstructionalContext;
    let hydrated;
    try { [hydrated] = window.hydrateHistory(window.sanitizeHistoryForCloud([analysis])); }
    finally { window.AlloModules.InstructionalContext = api; }
    expect(hydrated.sourceFamilyId).toBe('new-analysis');
    expect(Context.getReadingSourceFamilyId(hydrated)).toBe(Context.getReadingSourceFamilyId(analysis));
    expect(hydrated.sourceSnapshot.sourceArtifactId).toBe(a.snapshot.sourceArtifactId);
  });
});
