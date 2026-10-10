import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAlloModule } from './setup.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const helperModule = fs.readFileSync(path.join(root, 'text_pipeline_helpers_module.js'), 'utf8');
const liveSource = fs.readFileSync(path.join(root, 'live_aac_source.jsx'), 'utf8');
const packStart = liveSource.indexOf('const _alloSerializeResourceForStudentPack = (item, deps = {}) => {');
const packEnd = liveSource.indexOf('const LiveAacBoardDialog =', packStart);

let sources;
let pack;
function removeEvidenceHelper() {
  delete window.AlloModules.StudentSources;
  delete window.AlloModules.TextPipelineHelpers.studentSources;
}
const body = 'A researched reading [1](https://example.org/article) and [2](#allo-doc-private).';
const appendix = '\n\n### Source Text References\n\n1. [Public article](https://example.org/article)\n\n### Your Document References\n\nPRIVATE FILE NAME\n\n> PRIVATE DOCUMENT EXCERPT\n\n### Research Review\n\nPRIVATE SEARCH ACTIVITY';

function resource(approved = false) {
  return {
    id: 'reading-1', type: 'simplified', data: body + appendix,
    studentSources: { version: 1, writingMode: 'synthesis', bodyKey: sources.bodyKey(body),
      secret: 'PRIVATE RECORD FIELD', sources: [
        { title: 'Public article', citationHref: 'https://example.org/article', shareExcerpt: true, passages: [{ text: 'A public supporting excerpt.', evidenceType: 'Page excerpt', locatorLabel: 'Paragraph 2', secret: 'PRIVATE PASSAGE FIELD' }] },
        { title: 'PRIVATE FILE NAME', citationHref: '#allo-doc-private', shareExcerpt: approved, passages: [{ text: 'PRIVATE DOCUMENT EXCERPT', evidenceType: 'Document passage', locatorLabel: 'PRIVATE LOCATOR' }] }
      ] },
    researchEvidence: { version: 1, supplied: [{ passage: 'PRIVATE EVIDENCE' }], citedIds: ['private'], activity: ['PRIVATE SEARCH ACTIVITY'] },
    sourceProvenance: { title: 'Research topic', researchEvidence: { secret: 'PRIVATE PROVENANCE' } },
    config: { generationInputText: body + appendix, researchPacket: { secret: 'PRIVATE PACKET' }, grade: '5th Grade' },
    relevel: { fromText: body + appendix, fromGrade: '6th Grade' },
    sourceSnapshot: { schemaVersion: 1, text: body + appendix, fingerprint: 'old-fingerprint' }
  };
}

beforeEach(() => {
  window.AlloModules = {};
  new Function(helperModule)();
  sources = window.AlloModules.StudentSources;
  loadAlloModule('firestore_sync_module.js');
  const serialize = new Function('window', liveSource.slice(packStart, packEnd) + '\nreturn _alloSerializeResourceForStudentPack;')(window);
  pack = item => serialize(item, { sanitizeHistoryForCloud: window.sanitizeHistoryForCloud, stripUndefined: window.stripUndefined });
});

describe('student research delivery boundary', () => {
  it('keeps the teacher cloud record but sends only the whitelisted source record live', () => {
    const input = resource();
    const cloud = window.sanitizeHistoryForCloud([input])[0];
    expect(cloud.researchEvidence).toEqual(input.researchEvidence);
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    expect(out.studentSources.sources[0].passages[0].text).toBe('A public supporting excerpt.');
    expect(out.studentSources.sources[1]).toMatchObject({ title: 'Teacher-provided source', shareExcerpt: false, passages: [] });
    expect(out.data).toContain('Source excerpt not shared.');
    expect(out.data).not.toContain('Research Review');
    expect(out.sourceSnapshot).toBeUndefined();
    expect(out.config.generationInputText).toBeUndefined();
    expect(out.relevel.fromText).toBeUndefined();
    expect(input.data).toContain('PRIVATE');
  });

  it('allows explicitly approved document excerpts without copying research reports', () => {
    const out = window.prepareSessionResourcesForWrite([resource(true)]).resources[0];
    expect(out.studentSources.sources[1]).toMatchObject({ title: 'PRIVATE FILE NAME', shareExcerpt: true });
    expect(out.data).toContain('PRIVATE DOCUMENT EXCERPT');
    expect(out.researchEvidence).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('PRIVATE SEARCH ACTIVITY');
    expect(out.sourceProvenance).toBeUndefined();
  });

  it('drops stale excerpts after the reading changes', () => {
    const input = resource();
    input.data = 'Changed. ' + input.data;
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(out.studentSources.sources.every(source => source.passages.length === 0)).toBe(true);
    expect(out.studentSources.writingMode).toBe('unknown');
  });

  it('fails closed without the helper while preserving the body and public references', () => {
    const input = resource();
    removeEvidenceHelper();
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(out.studentSources).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    expect(out.data).toContain(body);
    expect(out.data).toContain('[Public article](https://example.org/article)');
  });

  it('fails closed when helper validation throws', () => {
    const input = resource();
    window.AlloModules.StudentSources = { forText() { throw Error('unavailable'); }, sanitize() { throw Error('unavailable'); }, publicText() { throw Error('unavailable'); } };
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(out.studentSources).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
  });

  it('recognizes nested research reports without stripping unrelated activity fields', () => {
    const input = { id: 'lesson', type: 'lesson', activity: 'Class discussion', data: {
      resources: [resource()], activity: ['Read together'],
      report: { version: 1, supplied: [{ passage: 'PRIVATE REPORT' }], citedIds: [], activity: ['PRIVATE QUERY'] },
      packet: { version: 1, items: [], sourceDecisions: {}, activity: ['PRIVATE PACKET'] },
      lab: { supplied: ['apparatus'], activity: 'Experiment' }
    } };
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    expect(out.activity).toBe('Class discussion');
    expect(out.data.activity).toEqual(['Read together']);
    expect(out.data.lab).toEqual(input.data.lab);
    expect(out.data.report).toBeUndefined();
    expect(out.data.packet).toBeUndefined();
  });

  it('does not retain source metadata after live size compaction removes the reading', () => {
    const input = resource();
    input.data = 'Long reading '.repeat(3000) + body;
    input.studentSources.bodyKey = sources.bodyKey(input.data);
    delete input.sourceSnapshot;
    const out = window.prepareSessionResourcesForWrite([input], { maxBytes: 2000 });
    expect(out.resources[0].syncTruncated).toBe(true);
    expect(out.resources[0].data).toBeUndefined();
    expect(out.resources[0].studentSources).toBeUndefined();
    expect(out.byteLength).toBeLessThanOrEqual(2000);
  });

  it('removes stale excerpts when the live string budget truncates an unchanged teacher reading', () => {
    const input = resource();
    input.data = body + '\n\n' + 'Long reading '.repeat(10000);
    input.studentSources.bodyKey = sources.bodyKey(input.data);
    delete input.sourceSnapshot;
    const out = window.prepareSessionResourcesForWrite([input]).resources[0];
    expect(out.data).toContain('Trimmed for live session sync');
    expect(out.studentSources.sources.every(source => source.passages.length === 0)).toBe(true);
  });

  it('applies the same private-source protection to QR and homework packs', () => {
    const input = resource();
    const out = pack(input);
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    expect(out.studentSources.sources[0].passages[0].text).toBe('A public supporting excerpt.');
    expect(out.sourceSnapshot).toBeUndefined();
    expect(input.researchEvidence).toBeDefined();
  });

  it('keeps packs fail closed independently of the Firestore and evidence helpers', () => {
    const input = resource();
    removeEvidenceHelper();
    delete window.sanitizeStudentResearchResource;
    const out = pack(input);
    expect(out.studentSources).toBeUndefined();
    expect(JSON.stringify(out)).not.toContain('PRIVATE');
    expect(out.data).toContain(body);
  });

  it('decodes marked legacy reading text once before appendix sanitization', () => {
    const input = resource();
    input.data = JSON.stringify(input.data);
    input.dataEncoding = 'json-text/v1';
    removeEvidenceHelper();
    for (const out of [window.prepareSessionResourcesForWrite([input]).resources[0], pack(input)]) {
      expect(JSON.stringify(out)).not.toContain('PRIVATE');
      expect(out.data).toContain(body);
      expect(out.dataEncoding).toBe('text/v1');
    }
  });

  it('withholds malformed encoded readings that still contain escaped private appendices', () => {
    const input = resource();
    input.data = JSON.stringify(input.data).slice(0, -1);
    input.dataEncoding = 'json-text/v1';
    removeEvidenceHelper();
    for (const out of [window.prepareSessionResourcesForWrite([input]).resources[0], pack(input)]) {
      expect(JSON.stringify(out)).not.toContain('PRIVATE');
      expect(out.data).toBeUndefined();
      expect(out.studentSources).toBeUndefined();
    }
  });

  it('removes raw provenance signatures and report-bearing provenance from both student routes', () => {
    const input = resource();
    input.sourceProvenance = { title: 'PRIVATE filename.pdf', signature: '1800|PRIVATE INTRO|PRIVATE APPENDIX TAIL' };
    input.data = body;
    input.sourceSnapshot = { schemaVersion: 1, text: body, fingerprint: 'old-fingerprint', signature: 'PRIVATE SNAPSHOT SIGNATURE', preview: 'PRIVATE SNAPSHOT PREVIEW' };
    input.nested = { sourceProvenance: { title: 'PRIVATE nested source', researchPacket: {} } };
    for (const out of [window.prepareSessionResourcesForWrite([input]).resources[0], pack(input)]) {
      expect(JSON.stringify(out)).not.toContain('PRIVATE');
      expect(out.sourceProvenance).toBeUndefined();
      expect(out.nested.sourceProvenance).toBeUndefined();
      expect(out.sourceSnapshot?.signature).toBeUndefined();
      expect(out.sourceSnapshot?.preview).toBeUndefined();
    }
    expect(input.sourceProvenance.signature).toContain('PRIVATE');
  });

  it('preserves simple public provenance without a raw signature or research report', () => {
    const input = { id: 'public', type: 'quiz', data: { question: 'What did you learn?' }, sourceProvenance: { title: 'Public source', url: 'https://example.org/article', type: 'web' } };
    for (const out of [window.prepareSessionResourcesForWrite([input]).resources[0], pack(input)]) {
      expect(out.sourceProvenance).toEqual(input.sourceProvenance);
    }
  });

  it('preserves non-research generation and relevel source text', () => {
    const input = { id: 'ordinary', type: 'quiz', data: { question: 'Keep this?' }, config: { generationInputText: 'Ordinary source' }, relevel: { fromText: 'Ordinary draft' } };
    const out = pack(input);
    expect(out.config.generationInputText).toBe('Ordinary source');
    expect(out.relevel.fromText).toBe('Ordinary draft');
    expect(out.studentSources).toBeUndefined();
  });
});
