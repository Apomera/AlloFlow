import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let contract, pipeline, serialize;
const text = 'Fair is foul.\r\nAnd foul is fair.';
const cfg = { includeOriginalReading: true, includeSimplified: true, includeAnalysis: false, includeTeacherKey: false };
function original(family = 'family-a', unit = 'unit-a') {
  const item = contract.createSupportedReading(text, { id: 'original-' + family + '-' + unit, sourceFamilyId: family, unitId: unit });
  item.readingSupports = contract.validateReadingSupports(item, {
    schemaVersion: 1, sourceFingerprint: item.sourceSnapshot.fingerprint,
    sourceFamilyId: family, unitId: unit,
    annotations: [
      { id: 'kept', start: 0, end: 4, quote: 'Fair', text: 'Teacher-selected meaning <safe>', origin: 'educator', pinned: true, priority: 'essential' },
      { id: 'removed', start: 8, end: 12, quote: 'foul', text: 'REMOVED GLOSS MUST NOT RETURN', origin: 'generated', pinned: false, priority: 'helpful' }
    ],
    suppressedAnnotations: [{ start: 8, end: 12, quote: 'foul' }]
  });
  return item;
}
beforeAll(() => {
  for (const name of ['instructional_context_module.js', 'firestore_sync_module.js', 'doc_pipeline_module.js']) loadAlloModule(name);
  contract = window.AlloModules.InstructionalContext;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    t: () => undefined, isRtlLang: () => false, addToast: () => {}, updateExportPreview: () => {}, getDefaultTitle: () => 'Reading',
    state: { leveledTextLanguage: 'English', currentUiLanguage: 'English', exportConfig: {} }
  });
  const source = readFileSync('live_aac_source.jsx', 'utf8');
  serialize = new Function('window', source.slice(source.indexOf('const _alloSerializeResourceForStudentPack ='), source.indexOf('const LiveAacBoardDialog =')) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
});
const pack = item => serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });

describe('curated reading-support delivery', () => {
  it('keeps educator origin, pinned/essential state, removal anchors, and exact source in reopened student packs', () => {
    const item = original();
    const reopened = window.hydrateHistory([pack(item)])[0];
    expect(reopened.data).toBe(text);
    expect(reopened.readingSupports.annotations).toHaveLength(1);
    expect(reopened.readingSupports.annotations[0]).toMatchObject({ id: 'kept', origin: 'educator', pinned: true, priority: 'essential' });
    expect(reopened.readingSupports.suppressedAnnotations).toEqual([{ start: 8, end: 12, quote: 'foul' }]);
    expect(reopened.readingSupports).toMatchObject({ sourceFamilyId: 'family-a', unitId: 'unit-a' });
    expect(JSON.stringify(reopened)).not.toContain('REMOVED GLOSS MUST NOT RETURN');
  });

  it('renders only active curated notes and escapes definitions in document output', () => {
    const html = pipeline.generateResourceHTML(original(), false, {}, cfg);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    expect(doc.querySelector('[data-original-text]').textContent).toBe(text);
    expect(doc.querySelector('.reading-support-notes').textContent).toContain('Teacher-selected meaning <safe>');
    expect(doc.querySelector('safe')).toBeNull();
    expect(html).not.toContain('REMOVED GLOSS MUST NOT RETURN');
  });

  it.each([{ family: 'family-b', unit: 'unit-a' }, { family: 'family-a', unit: 'unit-b' }])(
    'rejects identical-text annotations belonging to another scope: %j',
    ({ family, unit }) => {
      const item = original();
      item.readingSupports = original(family, unit).readingSupports;
      const packed = pack(item);
      expect(packed.readingSupports.annotations).toEqual([]);
      const html = pipeline.generateResourceHTML(item, false, {}, cfg);
      expect(html).not.toContain('Teacher-selected meaning');
      expect(html).not.toContain('REMOVED GLOSS MUST NOT RETURN');
    }
  );
});
