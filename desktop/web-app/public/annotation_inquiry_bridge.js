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
  var hasOwn = Object.prototype.hasOwnProperty;
  var STANCES = Object.freeze(['supports', 'complicates', 'context', 'language', 'question']);
  var COLORS = Object.freeze({ supports: 'green', complicates: 'pink', context: 'blue', language: 'yellow', question: 'blue' });

  function clip(value, limit) {
    return String(value == null ? '' : value)
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, limit || 500);
  }
  function safeUrl(value, limit) {
    var cleaned = clip(value, limit || 500);
    if (!cleaned || /["'<>]/.test(cleaned)) return '';
    try {
      var parsed = new URL(cleaned);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      if (parsed.username || parsed.password) return '';
      if (/["'<>]/.test(parsed.href)) return '';
      return parsed.href.slice(0, limit || 500);
    } catch (_) {
      return '';
    }
  }
  function redact(value) {
    return clip(value, 1800)
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email omitted]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[identifier omitted]')
      .replace(/(?:\+?1[-.\s]?)?(?:\(\d{3}\)[-.\s]?|\b\d{3}[-.\s])\d{3}[-.\s]\d{4}\b/g, '[phone omitted]')
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
    input = (input && typeof input === 'object') ? input : {};
    var source = (input.source && typeof input.source === 'object') ? input.source : {};
    var excerpts = (Array.isArray(input.excerpts) ? input.excerpts : []).slice(0, 10).map(function (row, index) {
      var rawIdx = Number(row && row.sentenceIndex);
      var sentenceIndex = Number.isFinite(rawIdx) && rawIdx >= 1 ? Math.min(1000000, Math.floor(rawIdx)) : (index + 1);
      return { excerptId: 'excerpt-' + (index + 1), sentenceIndex: sentenceIndex, excerpt: redact(row && row.excerpt).slice(0, 360) };
    }).filter(function (row) { return !!row.excerpt; });
    if (!excerpts.length) return { ok: false, reason: 'At least one bounded concordance excerpt is required.' };
    var stableUrl = safeUrl(source.stableUrl, 500);
    var sourceRecordId = clip(input.sourceRecordId, 180) || 'text-' + stableId([source.title, source.creator, source.edition, stableUrl].join('|'));
    return { ok: true, handoff: {
      schemaVersion: 1, bridgeVersion: VERSION, handoffId: 'annotation-handoff-' + stableId(sourceRecordId + '|' + clip(input.queryTerm, 80) + '|' + excerpts.map(function (row) { return row.excerpt; }).join('|')),
      sourceRecordId: sourceRecordId, queryTerm: clip(input.queryTerm, 80),
      source: { title: redact(source.title).slice(0, 180), creator: redact(source.creator).slice(0, 180), edition: redact(source.edition).slice(0, 220), stableUrl: stableUrl, context: redact(source.context).slice(0, 1200) },
      excerpts: excerpts, createdAt: clip(input.createdAt, 80) || new Date().toISOString()
    } };
  }
  function createAnnotation(handoff, input) {
    input = (input && typeof input === 'object') ? input : {};
    if (!handoff || typeof handoff !== 'object' || !Array.isArray(handoff.excerpts) || typeof handoff.handoffId !== 'string' || !handoff.handoffId) {
      return { ok: false, reason: 'A valid inquiry handoff is required.' };
    }
    var excerptId = clip(input.excerptId, 80);
    var target = handoff.excerpts.find(function (row) { return row && row.excerptId === excerptId; });
    if (!target) return { ok: false, reason: 'Choose a current excerpt.' };
    var stance = (typeof input.stance === 'string' && STANCES.indexOf(input.stance) !== -1) ? input.stance : 'language';
    var note = redact(input.note).slice(0, 900);
    if (note.length < 12) return { ok: false, reason: 'Write an annotation of at least 12 characters.' };
    var createdAt = clip(input.createdAt, 80) || new Date().toISOString();
    return { ok: true, annotation: {
      id: clip(input.id, 120) || 'inquiry-note-' + stableId(handoff.handoffId + '|' + excerptId + '|' + stance + '|' + note + '|' + createdAt),
      kind: 'note', type: 'inquiry', x: 32, y: 64 + handoff.excerpts.indexOf(target) * 76,
      content: note, color: hasOwn.call(COLORS, stance) ? COLORS[stance] : 'yellow', author: 'student', authorName: redact(input.authorName).slice(0, 80), createdAt: createdAt,
      inquiryStance: stance,
      inquiryTarget: { handoffId: handoff.handoffId, sourceRecordId: handoff.sourceRecordId, queryTerm: handoff.queryTerm, excerptId: target.excerptId, sentenceIndex: target.sentenceIndex, excerpt: target.excerpt }
    } };
  }
  function validateAnnotation(handoff, annotation) {
    if (!handoff || typeof handoff !== 'object' || typeof handoff.handoffId !== 'string' || !handoff.handoffId || !Array.isArray(handoff.excerpts)) return false;
    if (!annotation || typeof annotation !== 'object' || annotation.kind !== 'note' || !annotation.inquiryTarget || typeof annotation.inquiryTarget !== 'object') return false;
    if (typeof annotation.inquiryStance !== 'string' || STANCES.indexOf(annotation.inquiryStance) === -1 || typeof annotation.content !== 'string' || clip(annotation.content, 900).length < 12) return false;
    return annotation.inquiryTarget.handoffId === handoff.handoffId && handoff.excerpts.some(function (row) { return row && row.excerptId === annotation.inquiryTarget.excerptId; });
  }
  function cloneTarget(t) {
    if (!t || typeof t !== 'object') return null;
    return {
      handoffId: clip(t.handoffId, 120),
      sourceRecordId: clip(t.sourceRecordId, 180),
      queryTerm: clip(t.queryTerm, 80),
      excerptId: clip(t.excerptId, 80),
      sentenceIndex: Number.isFinite(Number(t.sentenceIndex)) && Number(t.sentenceIndex) >= 1 ? Math.min(1000000, Math.floor(Number(t.sentenceIndex))) : 1,
      excerpt: redact(t.excerpt).slice(0, 360)
    };
  }
  function summarizeForCapture(handoff, annotations) {
    var valid = (Array.isArray(annotations) ? annotations.slice(0, 200) : []).filter(function (annotation) { return validateAnnotation(handoff, annotation); }).slice(0, 20);
    var counts = {};
    STANCES.forEach(function (stance) { counts[stance] = valid.filter(function (annotation) { return annotation.inquiryStance === stance; }).length; });
    return {
      schemaVersion: 1, bridgeVersion: VERSION, handoffId: handoff && handoff.handoffId, sourceRecordId: handoff && handoff.sourceRecordId, queryTerm: handoff && handoff.queryTerm,
      annotationCounts: counts,
      annotations: valid.map(function (annotation) { return { id: clip(annotation.id, 120), stance: annotation.inquiryStance, note: redact(annotation.content).slice(0, 900), target: cloneTarget(annotation.inquiryTarget) }; })
    };
  }
  function toAnnotationSuitePayload(handoff, annotations) {
    var baseTitle = redact(handoff && handoff.source && handoff.source.title).slice(0, 180) || 'Text Inquiry excerpts';
    var valid = (Array.isArray(annotations) ? annotations.slice(0, 200) : []).filter(function (annotation) { return validateAnnotation(handoff, annotation); }).slice(0, 20);
    return {
      docTitle: baseTitle + ' — close reading',
      annotations: valid.map(function (annotation, idx) {
        var stance = annotation.inquiryStance;
        var rawX = Number(annotation.x);
        var rawY = Number(annotation.y);
        return {
          id: clip(annotation.id, 120) || 'inquiry-note-' + stableId(String(idx) + '|' + clip(annotation.content, 120)),
          kind: 'note',
          type: 'inquiry',
          x: Number.isFinite(rawX) ? rawX : 32,
          y: Number.isFinite(rawY) ? rawY : (64 + idx * 76),
          content: redact(annotation.content).slice(0, 900),
          color: hasOwn.call(COLORS, stance) ? COLORS[stance] : 'yellow',
          author: 'student',
          authorName: redact(annotation.authorName).slice(0, 80),
          createdAt: clip(annotation.createdAt, 80),
          inquiryStance: stance,
          inquiryTarget: cloneTarget(annotation.inquiryTarget)
        };
      })
    };
  }
  return Object.freeze({ version: VERSION, stances: STANCES.slice(), createHandoff: createHandoff, createAnnotation: createAnnotation, validateAnnotation: validateAnnotation, summarizeForCapture: summarizeForCapture, toAnnotationSuitePayload: toAnnotationSuitePayload });
});
