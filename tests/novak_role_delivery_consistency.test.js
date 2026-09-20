
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let contract, handlers, pipeline, serialize, historyLabels, previewReview;
const text = 'FIRST WITCH:\r\nWhen shall we three meet again?\r\n';
const parse = html => new DOMParser().parseFromString(html, 'text/html');
const cfg = { includeOriginalReading: true, includeSimplified: true, includeAnalysis: false, includeTeacherKey: false };
const sourceRole = role => contract.normalizeSourceInstructionalText({ role, designationSource: 'educator' });
function companion({ unit = 'unit-a', role = 'supplemental', source = 'primary', captured = true } = {}) {
  const sourceId = 'source-' + unit;
  return {
    id: 'adapted-' + unit, type: 'simplified', title: 'Reading ' + unit, data: 'When will the witches meet?',
    unitId: unit, sourceFamilyId: sourceId,
    ...(captured ? { sourceSnapshot: contract.createSourceSnapshot(text, { sourceArtifactId: sourceId }) } : {}),
    sourceInstructionalText: sourceRole(source),
    instructionalText: contract.normalizeInstructionalText({
      role, form: 'adapted', designationSource: 'educator', sourceArtifactId: sourceId,
      replacementAuthorization: { authorized: role === 'primary', source: role === 'primary' ? 'educator' : 'none' }
    })
  };
}
const contextFor = items => handlers.getLessonContext(items, { history: items, targetStandards: [], inputText: '' });

beforeAll(() => {
  for (const name of ['instructional_context_module.js', 'firestore_sync_module.js', 'export_handlers_module.js', 'doc_pipeline_module.js']) loadAlloModule(name);
  contract = window.AlloModules.InstructionalContext;
  handlers = window.AlloModules.ExportHandlers;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    t: () => undefined, isRtlLang: () => false, addToast: () => {}, updateExportPreview: () => {}, getDefaultTitle: type => type,
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} }
  });
  const packSource = readFileSync('live_aac_source.jsx', 'utf8');
  serialize = new Function('window', packSource.slice(packSource.indexOf('const _alloSerializeResourceForStudentPack ='), packSource.indexOf('const LiveAacBoardDialog =')) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
  const historySource = readFileSync('view_history_panel_source.jsx', 'utf8');
  historyLabels = new Function('window', historySource.slice(historySource.indexOf('  const getInstructionalTextProfile ='), historySource.indexOf('  const shareResourcePackToCommunity =')) + '\nreturn { profile: getInstructionalTextProfile, badge: getInstructionalTextBadge };')(window);
  const previewSource = readFileSync('view_export_preview_source.jsx', 'utf8');
  previewReview = new Function('window', previewSource.slice(previewSource.indexOf('function _builderReadingHistory('), previewSource.indexOf('// One catalog drives')) + '\nreturn _builderReadingAccessReview;')(window);
});

describe('lesson context shares the validated role/source contract', () => {
  it('uses a captured source as main even after its analysis was deleted', () => {
    const context = contextFor([companion()]);
    expect(context).toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
    expect(context).toContain('When shall we three meet again?');
    expect(context).not.toContain('PRIMARY TEXT NOT AVAILABLE');
    expect(context).toContain('ADAPTED TEXT (SUPPLEMENTAL ACCESS VERSION)');
  });

  it('does not accept a forged supported-original label as primary evidence', () => {
    const original = contract.createSupportedReading(text, { sourceFamilyId: 'family-a', unitId: 'unit-a' });
    original.data = 'Replaced text.';
    expect(contextFor([original])).not.toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
    expect(handlers.getTextAccessSummary([original]).hasPrimary).toBe(false);
  });

  it('does not borrow an unrelated main reading or current input for an unresolved companion', () => {
    const unrelated = contract.createSupportedReading('Unrelated private source.', { sourceFamilyId: 'other', unitId: 'unit-other' });
    const target = companion({ captured: false });
    const context = handlers.getLessonContext([unrelated, target], { history: [unrelated, target], targetStandards: [], inputText: 'Stale ambient input.' });
    expect(context).toContain('PRIMARY TEXT NOT AVAILABLE');
    expect(context).not.toContain('Unrelated private source.');
    expect(context).not.toContain('Stale ambient input.');
  });

  it('honors an adapted main reading and retains the source as supporting reference', () => {
    const target = companion({ role: 'primary', source: 'supplemental' });
    const context = contextFor([target]);
    expect(context).toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
    expect(context).toContain('When will the witches meet?');
    expect(context).toContain('SOURCE TEXT (SUPPORTING REFERENCE)');
    expect(context).toContain('Assigned role: supplemental');
    expect(context).toContain('When shall we three meet again?');
  });

  it('does not promote an explicitly supporting source when neither version is main', () => {
    const target = companion({ source: 'supplemental' });
    const context = handlers.getLessonContext([target], { history: [target], selectedReadingSourceId: target.id, unitId: target.unitId });
    expect(context).toContain('PRIMARY TEXT NOT AVAILABLE');
    expect(context).toContain('SOURCE TEXT (SUPPORTING REFERENCE)');
    expect(context).not.toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
  });
  it('uses an explicitly selected supporting passage without replacing its role', () => {
    const selected = contract.createSupportedReading('Exact supporting passage.\r\n', { id: 'support', sourceFamilyId: 'support-family', unitId: 'unit-a', sourceInstructionalText: sourceRole('supplemental') });
    const other = contract.createSupportedReading('Other main reading.', { id: 'other', sourceFamilyId: 'other-family', unitId: 'unit-a' });
    const context = handlers.getLessonContext([other, selected], { history: [other, selected], unitId: 'unit-a', selectedReadingSourceId: selected.id });
    expect(context).toContain('SELECTED ACTIVITY TEXT');
    expect(context).toContain('Assigned role: supplemental');
    expect(context).toContain('Exact supporting passage.\r\n');
    expect(context).not.toContain('Other main reading.');
    expect(context).not.toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
  });

  it('requires a fresh selection when the chosen artifact is missing', () => {
    const other = contract.createSupportedReading('Other main reading.', { id: 'other', unitId: 'unit-a' });
    const context = handlers.getLessonContext([other], { history: [other], unitId: 'unit-a', selectedReadingSourceId: 'deleted', inputText: 'Ambient input.' });
    expect(context).toContain('SELECTED ACTIVITY TEXT UNAVAILABLE');
    expect(context).not.toContain('Other main reading.');
    expect(context).not.toContain('Ambient input.');
  });

  it('honors explicit current input ahead of a saved main reading', () => {
    const saved = contract.createSupportedReading('Saved main.', { id: 'saved', unitId: 'unit-a' });
    const context = handlers.getLessonContext([saved], { history: [saved], unitId: 'unit-a', selectedReadingSourceId: '__input__', inputText: 'Exact current input.\r\n' });
    expect(context).toContain('SELECTED ACTIVITY TEXT');
    expect(context).toContain('Exact current input.\r\n');
    expect(context).not.toContain('Saved main.');
  });

  it('scopes uncategorized selection to readings without a unit', () => {
    const scoped = contract.createSupportedReading('Saved in a unit.', { id: 'scoped', unitId: 'unit-a' });
    const unscoped = contract.createSupportedReading('Uncategorized passage.', { id: 'unscoped' });
    const context = handlers.getLessonContext([unscoped, scoped], { history: [unscoped, scoped], activeUnitId: 'uncategorized' });
    expect(context).toContain('Uncategorized passage.');
    expect(context).not.toContain('Saved in a unit.');
  });

});

describe('role-aware actual student selection', () => {
  it('exports one authorized adapted main and its supporting original, with both labels visible', () => {
    const target = companion({ role: 'primary', source: 'supplemental' });
    const doc = parse(pipeline.generateFullPackHTML([target], 'Scene', false, {}, cfg));
    expect(doc.querySelector('[data-original-text]').textContent).toBe(text);
    expect(doc.querySelector('[data-original-text]').parentElement.querySelector('.reading-role').textContent).toContain('Supporting reading');
    expect(doc.getElementById(target.id).querySelector('.reading-role').textContent).toBe('Main reading');
    const manifest = JSON.parse(doc.getElementById('alloflow-interactive-object-profile').textContent);
    expect(manifest.textAccess.primaryTextIds).toEqual([target.id]);
    expect(manifest.textAccess.warningCodes).toEqual([]);
    const metadata = manifest.resources.find(item => item.id === target.id);
    expect(metadata.sourceInstructionalText.role).toBe('supplemental');
    expect(metadata.sourceFamilyId).toBe('source-unit-a');
    expect(metadata.unitId).toBe('unit-a');
  });

  it('cannot satisfy companion B with an unrelated main in lesson A', () => {
    const unrelated = contract.createSupportedReading(text, { sourceFamilyId: 'other-family', unitId: 'unit-other' });
    const target = companion({ captured: false });
    const items = [unrelated, target];
    const review = previewReview(items, cfg);
    expect(review.primaryCount).toBe(1);
    expect(review.missingPrimaryIds).toEqual([target.id]);
    expect(review.missingSourceIds).toEqual([target.id]);
    const doc = parse(pipeline.generateFullPackHTML(items, 'Lessons', false, {}, cfg));
    const manifest = JSON.parse(doc.getElementById('alloflow-interactive-object-profile').textContent);
    expect(manifest.textAccess.missingPrimaryCompanionIds).toEqual([target.id]);
    expect(manifest.textAccess.warningCodes).toContain('supplemental-text-without-primary');
  });

  it('does not count a captured original that the educator deselected from the actual export', () => {
    const target = companion();
    const review = previewReview([target], { ...cfg, includeOriginalReading: false });
    expect(review.missingSourceIds).toEqual([target.id]);
    expect(review.missingPrimaryIds).toEqual([target.id]);
    expect(review.primaryCount).toBe(0);
  });

  it('retains independent source role and family scope through student packs', () => {
    const target = companion({ role: 'primary', source: 'supplemental' });
    target.sourceInstructionalText.privateMarker = 'must not escape';
    const packed = serialize(target, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
    const reopened = window.hydrateHistory([packed])[0];
    expect(reopened.instructionalText.role).toBe('primary');
    expect(reopened.sourceInstructionalText.role).toBe('supplemental');
    expect(reopened.sourceInstructionalText.form).toBe('original');
    expect(reopened.sourceInstructionalText.replacementAuthorization.authorized).toBe(false);
    expect(reopened.sourceInstructionalText.privateMarker).toBeUndefined();
    expect(reopened.sourceFamilyId).toBe(target.sourceFamilyId);
    expect(reopened.unitId).toBe(target.unitId);
    const pair = contract.ensureReadingSourcePairs([reopened]);
    expect(pair.filter(item => contract.getInstructionalText(item).role === 'primary')).toHaveLength(1);
    expect(pair.find(item => contract.isSupportedOriginal(item)).instructionalText.role).toBe('supplemental');
  });
});

describe('history displays form and role consistently', () => {
  it('uses the shared legacy analysis inference in history, context, and manifests', () => {
    const analysis = { id: 'source-old', type: 'analysis', data: { originalText: 'Legacy source.' } };
    expect(historyLabels.profile(analysis).role).toBe(contract.getInstructionalText(analysis).role);
    expect(historyLabels.badge(analysis).label).toContain('Main reading');
    expect(contextFor([analysis])).toContain('PRIMARY TEXT (EDUCATOR/WORKFLOW DESIGNATED)');
    expect(pipeline.interactiveObjectManifestItem(analysis).instructionalText.role).toBe('primary');
  });

  it('shows a preserved original supporting designation instead of masking it with the form', () => {
    const original = contract.createSupportedReading(text, { sourceInstructionalText: sourceRole('supplemental') });
    const badge = historyLabels.badge(original);
    expect(badge.label).toBe('Original with supports · Supporting reading');
    expect(badge.tone).toBe('violet');
  });
});
