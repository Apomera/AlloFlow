import fs from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const bridge = require('../annotation_inquiry_bridge.js');

describe('Annotation Suite inquiry bridge', () => {
  it('ships the bridge in a classic-script-compatible Annotation Suite module', () => {
    const compiled = fs.readFileSync('annotation_suite_module.js', 'utf8');
    expect(compiled).toContain('AlloFlowAnnotationInquiryBridge');
    expect(compiled).toContain('InquiryBridge: window.AlloFlowAnnotationInquiryBridge || null');
    expect(compiled).not.toMatch(/^export default/m);
  });
  it('creates a bounded, source-aware handoff', () => {
    const excerpts = Array.from({ length: 14 }, (_, index) => ({
      sentenceIndex: index + 1,
      excerpt: `Bounded passage ${index + 1} with enough language for close reading.`,
    }));
    const result = bridge.createHandoff({
      source: { title: 'A public text', creator: 'A writer', edition: '1892 edition' },
      sourceRecordId: 'text-record-1',
      queryTerm: 'authority',
      excerpts,
      createdAt: '2026-07-22T12:00:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.handoff.excerpts).toHaveLength(10);
    expect(result.handoff.sourceRecordId).toBe('text-record-1');
    expect(result.handoff.bridgeVersion).toBe('1.0.0');
  });

  it('returns Annotation Suite-compatible notes and capture summaries', () => {
    const handoff = bridge.createHandoff({
      source: { title: 'A public text' },
      queryTerm: 'voice',
      excerpts: [{ sentenceIndex: 3, excerpt: 'The speaker shifts from certainty to a guarded question.' }],
      createdAt: '2026-07-22T12:00:00.000Z',
    }).handoff;
    const result = bridge.createAnnotation(handoff, {
      excerptId: 'excerpt-1',
      stance: 'complicates',
      note: 'The guarded question complicates the earlier certainty.',
      createdAt: '2026-07-22T12:01:00.000Z',
    });
    expect(result.ok).toBe(true);
    expect(result.annotation).toMatchObject({ kind: 'note', type: 'inquiry', color: 'pink', inquiryStance: 'complicates' });
    expect(bridge.validateAnnotation(handoff, result.annotation)).toBe(true);

    const capture = bridge.summarizeForCapture(handoff, [result.annotation]);
    expect(capture.annotationCounts.complicates).toBe(1);
    expect(capture.annotations[0].target.excerpt).toContain('guarded question');
    const suitePayload = bridge.toAnnotationSuitePayload(handoff, [result.annotation]);
    expect(suitePayload.annotations[0].kind).toBe('note');
  });

  it('rejects stale targets and short notes, and redacts direct identifiers', () => {
    const handoff = bridge.createHandoff({
      source: { title: 'Interview excerpt' },
      excerpts: [{ sentenceIndex: 1, excerpt: 'Contact learner@example.org before discussing this bounded passage.' }],
    }).handoff;
    expect(handoff.excerpts[0].excerpt).toContain('[email omitted]');
    expect(bridge.createAnnotation(handoff, { excerptId: 'missing', note: 'A sufficiently long annotation.' }).ok).toBe(false);
    expect(bridge.createAnnotation(handoff, { excerptId: 'excerpt-1', note: 'Too short' }).ok).toBe(false);
  });
});
