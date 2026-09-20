
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

let contract, pipeline, serialize, transport;
const dom = html => new DOMParser().parseFromString(html, 'text/html');
const sourceText = '  FIRST WITCH:\r\nWhen shall we three meet again?\r\n[Thunder & lightning.] <strange> 😀\r\n';
const makeAdaptation = (text = sourceText) => ({
  id: 'adapted-1', type: 'simplified', title: 'Scene companion', data: 'When will the three of us meet?',
  sourceSnapshot: contract.createSourceSnapshot(text, { sourceArtifactId: 'deleted-analysis', language: 'English' }),
  instructionalText: { role: 'supplemental', form: 'adapted', sourceArtifactId: 'deleted-analysis' }
});
beforeAll(() => {
  loadAlloModule('instructional_context_module.js');
  loadAlloModule('firestore_sync_module.js');
  loadAlloModule('session_transport_module.js');
  loadAlloModule('doc_pipeline_module.js');
  loadAlloModule('export_handlers_module.js');
  loadAlloModule('export_module.js');
  contract = window.AlloModules.InstructionalContext;
  transport = window.AlloModules.SessionTransport;
  pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
    addToast: () => {}, t: () => undefined, isRtlLang: () => false, updateExportPreview: () => {},
    getDefaultTitle: () => 'Reading', state: { leveledTextLanguage: 'English', exportConfig: {}, currentUiLanguage: 'English' }
  });
  const source = readFileSync('live_aac_source.jsx', 'utf8');
  const start = source.indexOf('const _alloSerializeResourceForStudentPack =');
  const end = source.indexOf('const LiveAacBoardDialog =', start);
  serialize = new Function('window', source.slice(start, end) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
});
const cfg = { includeSimplified: true, includeOriginalReading: true, includeAnalysis: false, includeTeacherKey: false };

describe('matching originals in student delivery and documents', () => {
  it('adds the exact saved original without a deleted analysis and deduplicates repeated filtering', () => {
    const adaptation = makeAdaptation();
    const items = transport.studentSafeResources([adaptation], ['analysis', 'lesson-plan']);
    expect(items).toHaveLength(2);
    expect(items[0].data).toBe(sourceText);
    expect(contract.isSupportedOriginal(items[0])).toBe(true);
    expect(transport.studentSafeResources(items, ['analysis', 'lesson-plan'])).toHaveLength(2);
    expect(items.some(item => item.type === 'analysis')).toBe(false);
  });

  it('renders both texts with the source whitespace, markup characters, and CRLF intact', () => {
    const result = dom(pipeline.generateFullPackHTML([makeAdaptation()], 'Scene', false, {}, cfg));
    expect(result.querySelector('[data-original-text]').textContent).toBe(sourceText);
    expect(result.getElementById('adapted-1').textContent).toContain('When will the three');
    expect(result.querySelector('strange')).toBeNull();
    const manifest = JSON.parse(result.getElementById('alloflow-interactive-object-profile').textContent);
    expect(JSON.stringify(manifest)).toContain('same-text-supported');
  });

  it('keeps original selection independent when the adaptation is turned off', () => {
    const result = dom(pipeline.generateFullPackHTML([makeAdaptation()], 'Scene', false, {}, { ...cfg, includeSimplified: false }));
    expect(result.querySelector('[data-original-text]').textContent).toBe(sourceText);
    expect(result.getElementById('adapted-1')).toBeNull();
  });

  it('honors an explicit original exclusion without claiming preserved source in student output', () => {
    const result = dom(pipeline.generateFullPackHTML([makeAdaptation()], 'Scene', false, {}, { ...cfg, includeOriginalReading: false }));
    expect(result.querySelector('[data-original-text]')).toBeNull();
    expect(result.getElementById('adapted-1')).not.toBeNull();
    expect(result.documentElement.textContent).toContain('supplemental-text-without-primary');
  });

  it('renders validated word help separately and escapes malicious definitions', () => {
    const original = contract.createSupportedReading(sourceText);
    original.readingSupports = contract.validateReadingSupports(original, [
      { start: 2, end: 7, quote: 'FIRST', text: '<img src=x onerror=evil> & before', id: 'first' },
      { start: 8, end: 13, quote: 'WRONG', text: 'stale anchor', id: 'bad' }
    ]);
    const result = dom(pipeline.generateResourceHTML(original, false, {}, cfg));
    expect(result.querySelector('[data-original-text]').textContent).toBe(sourceText);
    expect(result.querySelector('.reading-support-notes').textContent).toContain('<img src=x onerror=evil> & before');
    expect(result.querySelector('img,[onerror]')).toBeNull();
    expect(result.body.textContent).not.toContain('stale anchor');
    expect(result.body.textContent).toContain('Some word help');
  });

  it('never blanks a preserved original when a cloze worksheet is requested', () => {
    const original = contract.createSupportedReading('Witches meet again.');
    const result = dom(pipeline.generateFullPackHTML([
      original, { id: 'g', type: 'glossary', data: [{ term: 'Witches', def: 'Characters in a play' }] }
    ], 'Scene', true, {}, { ...cfg, clozeWorksheet: true, includeTeacherKey: true, includeGlossary: false }));
    expect(result.querySelector('[data-original-text]').textContent).toBe('Witches meet again.');
    expect(result.querySelector('.alloflow-cloze-blank')).toBeNull();
    expect(result.getElementById(original.id + '-cloze-key')).toBeNull();
  });

  it('does not count an imported false original claim as primary text evidence', () => {
    const original = contract.createSupportedReading(sourceText);
    original.data = 'This body was changed.';
    const summary = window.AlloModules.ExportHandlers.getTextAccessSummary([original]);
    expect(summary.hasPrimary).toBe(false);
  });
});

describe('complete resource pack reading round trips', () => {
  it('does not restore a false original designation after boundary validation rejects it', () => {
    const original = contract.createSupportedReading(sourceText);
    original.data = 'Changed prose';
    const packed = serialize(original, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
    expect(contract.isSupportedOriginal(packed)).toBe(false);
    expect(packed.instructionalText.form).toBe('adapted');
    expect(packed.readingSourceAvailability.status).toBe('unavailable');
  });
  it('retains long originals past the live string budget while both privacy sanitizers run', () => {
    const text = ('FIRST WITCH:\r\nThunder, lightning, or rain?\r\n').repeat(3400) + 'FINAL LINE';
    const original = contract.createSupportedReading(text);
    original.audioRecording = 'private recording';
    const cloud = vi.fn(window.sanitizeHistoryForCloud);
    const live = vi.spyOn(window, 'sanitizeSessionValue');
    try {
      const packed = serialize(original, { sanitizeHistoryForCloud: cloud, stripUndefined: window.stripUndefined });
      expect(cloud).toHaveBeenCalledOnce();
      expect(live).toHaveBeenCalled();
      expect(packed.data).toBe(text);
      expect(packed.sourceSnapshot.text).toBe(text);
      expect(packed.audioRecording).toBeNull();
      expect(contract.isSupportedOriginal(packed)).toBe(true);
      expect(packed.syncTruncated).not.toBe(true);
      const reopened = window.hydrateHistory([JSON.parse(JSON.stringify(packed))])[0];
      expect(reopened.data).toBe(text);
      expect(contract.isSupportedOriginal(reopened)).toBe(true);
    } finally { live.mockRestore(); }
  });

  it.each(['42', 'null', '{"lesson":"text"}', '"quoted passage"'])('retains JSON-looking canonical text %s', text => {
    const original = contract.createSupportedReading(text);
    const packed = serialize(original, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
    expect(window.hydrateHistory([packed])[0].data).toBe(text);
  });

  it('keeps a matching source on an adapted student resource without teacher analysis data', () => {
    const packed = serialize(makeAdaptation(), { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
    expect(packed.sourceSnapshot.text).toBe(sourceText);
    expect(packed.type).toBe('simplified');
    expect(packed.data).toBe('When will the three of us meet?');
  });
});

describe('slides preserve the reading pair', () => {
  it('writes every original character across source slides before the adaptation', async () => {
    const decks = [];
    class Pptx {
      constructor() { this.slides = []; decks.push(this); }
      defineSlideMaster() {}
      addSlide() { const slide = { text: [], addText(text, options) { this.text.push({ text, options }); }, addNotes() {} }; this.slides.push(slide); return slide; }
      async writeFile() {}
    }
    window.PptxGenJS = Pptx;
    const text = sourceText.repeat(30);
    const api = window.AlloModules.createExport({
      liveRef: { current: { sourceTopic: 'Scene', gradeLevel: '6', addToast: vi.fn(), t: () => '', history: [makeAdaptation(text)] } },
      warnLog: () => {}, debugLog: () => {}, escapeXml: text => text, generateUUID: () => 'id'
    });
    await api.handleExportSlides();
    const sourceSlides = decks[0].slides.filter(slide => slide.text.some(entry => entry.options.placeholder === 'slideTitle' && String(entry.text).startsWith('Original with supports:')));
    expect(sourceSlides.length).toBeGreaterThan(1);
    expect(sourceSlides.flatMap(slide => slide.text.filter(entry => entry.options.y === 1).map(entry => entry.text)).join('')).toBe(text);
  });
});
