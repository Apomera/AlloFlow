/*
 * Annotation Suite Inquiry Bridge v1.0.0
 * Portable, framework-neutral close-reading annotations for companion tools.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AlloFlowAnnotationInquiryBridge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var VERSION = '1.0.0';
  var STANCES = ['supports', 'complicates', 'context', 'language', 'question'];
  var COLORS = { supports: 'green', complicates: 'pink', context: 'blue', language: 'yellow', question: 'blue' };

  function clip(value, limit) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, limit || 500); }
  function redact(value) {
    return clip(value, 1800)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email omitted]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[identifier omitted]')
      .replace(/\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g, '[phone omitted]')
      .replace(/\b[ACGTUN]{40,}\b/gi, '[nucleic-acid sequence omitted]')
      .replace(/\b[ACDEFGHIKLMNPQRSTVWY]{40,}\b/gi, '[protein sequence omitted]');
  }
  function stableId(value) {
    var input = clip(value, 500).toLowerCase();
    var hash = 2166136261;
    for (var i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }
  function createHandoff(input) {
    input = input || {};
    var source = input.source || {};
    var excerpts = (Array.isArray(input.excerpts) ? input.excerpts : []).slice(0, 10).map(function (row, index) {
      return { excerptId: 'excerpt-' + (index + 1), sentenceIndex: Math.max(1, Number(row && row.sentenceIndex) || index + 1), excerpt: redact(row && row.excerpt).slice(0, 360) };
    }).filter(function (row) { return !!row.excerpt; });
    if (!excerpts.length) return { ok: false, reason: 'At least one bounded concordance excerpt is required.' };
    var sourceRecordId = clip(input.sourceRecordId, 180) || 'text-' + stableId([source.title, source.creator, source.edition, source.stableUrl].join('|'));
    return { ok: true, handoff: {
      schemaVersion: 1, bridgeVersion: VERSION, handoffId: 'annotation-handoff-' + stableId(sourceRecordId + '|' + input.queryTerm + '|' + excerpts.map(function (row) { return row.excerpt; }).join('|')),
      sourceRecordId: sourceRecordId, queryTerm: clip(input.queryTerm, 80),
      source: { title: redact(source.title).slice(0, 180), creator: redact(source.creator).slice(0, 180), edition: redact(source.edition).slice(0, 220), stableUrl: clip(source.stableUrl, 500), context: redact(source.context).slice(0, 1200) },
      excerpts: excerpts, createdAt: clip(input.createdAt, 80) || new Date().toISOString()
    } };
  }
  function createAnnotation(handoff, input) {
    input = input || {};
    if (!handoff || !Array.isArray(handoff.excerpts)) return { ok: false, reason: 'A valid inquiry handoff is required.' };
    var excerptId = clip(input.excerptId, 80);
    var target = handoff.excerpts.find(function (row) { return row.excerptId === excerptId; });
    if (!target) return { ok: false, reason: 'Choose a current excerpt.' };
    var stance = STANCES.indexOf(input.stance) === -1 ? 'language' : input.stance;
    var note = redact(input.note).slice(0, 900);
    if (note.length < 12) return { ok: false, reason: 'Write an annotation of at least 12 characters.' };
    var createdAt = clip(input.createdAt, 80) || new Date().toISOString();
    return { ok: true, annotation: {
      id: clip(input.id, 120) || 'inquiry-note-' + stableId(handoff.handoffId + '|' + excerptId + '|' + stance + '|' + note + '|' + createdAt),
      kind: 'note', type: 'inquiry', x: 32, y: 64 + handoff.excerpts.indexOf(target) * 76,
      content: note, color: COLORS[stance], author: 'student', authorName: redact(input.authorName).slice(0, 80), createdAt: createdAt,
      inquiryStance: stance,
      inquiryTarget: { handoffId: handoff.handoffId, sourceRecordId: handoff.sourceRecordId, queryTerm: handoff.queryTerm, excerptId: target.excerptId, sentenceIndex: target.sentenceIndex, excerpt: target.excerpt }
    } };
  }
  function validateAnnotation(handoff, annotation) {
    if (!annotation || annotation.kind !== 'note' || !annotation.inquiryTarget) return false;
    if (STANCES.indexOf(annotation.inquiryStance) === -1 || clip(annotation.content, 900).length < 12) return false;
    return !!(handoff && annotation.inquiryTarget.handoffId === handoff.handoffId && handoff.excerpts.some(function (row) { return row.excerptId === annotation.inquiryTarget.excerptId; }));
  }
  function summarizeForCapture(handoff, annotations) {
    var valid = (Array.isArray(annotations) ? annotations : []).filter(function (annotation) { return validateAnnotation(handoff, annotation); }).slice(0, 20);
    var counts = {};
    STANCES.forEach(function (stance) { counts[stance] = valid.filter(function (annotation) { return annotation.inquiryStance === stance; }).length; });
    return {
      schemaVersion: 1, bridgeVersion: VERSION, handoffId: handoff && handoff.handoffId, sourceRecordId: handoff && handoff.sourceRecordId, queryTerm: handoff && handoff.queryTerm,
      annotationCounts: counts,
      annotations: valid.map(function (annotation) { return { id: annotation.id, stance: annotation.inquiryStance, note: redact(annotation.content).slice(0, 900), target: annotation.inquiryTarget }; })
    };
  }
  function toAnnotationSuitePayload(handoff, annotations) {
    return { docTitle: (handoff && handoff.source && handoff.source.title || 'Text Inquiry excerpts') + ' — close reading', annotations: (Array.isArray(annotations) ? annotations : []).filter(function (annotation) { return validateAnnotation(handoff, annotation); }) };
  }
  return { version: VERSION, stances: STANCES.slice(), createHandoff: createHandoff, createAnnotation: createAnnotation, validateAnnotation: validateAnnotation, summarizeForCapture: summarizeForCapture, toAnnotationSuitePayload: toAnnotationSuitePayload };
});
