#!/usr/bin/env node
/**
 * diff_transcript.cjs — compare the EXPECTED announcement sequence (from
 * expected_announcements.cjs) against what NVDA ACTUALLY spoke (the speech log).
 *
 * Also contains the speech-log parser: the NVDA "Speech Logger" add-on (NVDA add-on
 * store) writes one utterance per line, optionally timestamped. We normalize into an
 * ordered utterance list.
 *
 * Matching model: greedy IN-ORDER subsequence. Each expectation must be found in the
 * utterance stream AT OR AFTER the previous match — this is exactly what a say-all pass
 * produces, and out-of-order matches are reported as reading-order violations rather
 * than passes. Text matching is normalized containment (case/punctuation/whitespace
 * folded), because NVDA decorates content ("heading  level 2", "graphic", "link").
 *
 * Verdicts per expectation: 'spoken' | 'out-of-order' | 'missing'.
 * Plus: decorative images that WERE spoken (must-not-announce violations).
 * Pure + unit-tested.
 */
'use strict';

function parseSpeechLog(raw) {
  return String(raw || '')
    .split(/\r?\n/)
    .map((l) => l
      // Common Speech Logger timestamp prefixes: "12:34:56 -" / "[12:34:56.789]" / ISO
      .replace(/^\s*\[?\d{1,2}:\d{2}(:\d{2})?([.,]\d+)?\]?\s*[-–—]?\s*/, '')
      .replace(/^\s*\[?\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}([.,]\d+)?(Z|[+-]\d{2}:?\d{2})?\]?\s*[-–—]?\s*/, '')
      .trim())
    .filter(Boolean);
}

function _norm(s) {
  return String(s || '').toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// What we search the utterance stream for, per expectation kind. Kept LOOSE on NVDA's
// decoration (versions/verbosity settings vary) and STRICT on the content itself.
function _needles(exp) {
  if (exp.kind === 'heading') return [_norm(exp.text)];
  if (exp.kind === 'image') return [_norm(exp.text)];
  if (exp.kind === 'link') return [_norm(exp.text)];
  if (exp.kind === 'landmark') return [exp.text === 'main' ? 'main landmark' : 'navigation landmark', _norm(exp.text)];
  if (exp.kind === 'table') return exp.text ? [_norm(exp.text)] : ['table with'];
  if (exp.kind === 'list') return ['list with ' + exp.items + ' item'];
  return [_norm(exp.text)];
}

function diffTranscript(expected, utterances, mustNotAnnounce) {
  const normUtt = utterances.map(_norm);
  const results = [];
  let cursor = 0;
  for (const exp of expected) {
    const needles = _needles(exp).filter(Boolean);
    let foundAt = -1;
    // First: in-order search from the cursor.
    outer:
    for (let i = cursor; i < normUtt.length; i++) {
      for (const n of needles) { if (n && normUtt[i].indexOf(n) !== -1) { foundAt = i; break outer; } }
    }
    if (foundAt !== -1) {
      results.push({ ...exp, verdict: 'spoken', utteranceIndex: foundAt });
      cursor = foundAt; // NOT +1: several expectations can share one utterance ("heading level 2, Results")
      continue;
    }
    // Second: anywhere-search — spoken but out of order is a READING-ORDER finding.
    let anywhere = -1;
    outer2:
    for (let i = 0; i < normUtt.length; i++) {
      for (const n of needles) { if (n && normUtt[i].indexOf(n) !== -1) { anywhere = i; break outer2; } }
    }
    results.push(anywhere !== -1
      ? { ...exp, verdict: 'out-of-order', utteranceIndex: anywhere }
      : { ...exp, verdict: 'missing' });
  }
  // Must-NOT-announce: decorative images whose src leaked into speech.
  const violations = [];
  for (const d of (mustNotAnnounce || [])) {
    const base = _norm(String(d.src || '').split('/').pop().replace(/\.\w+$/, ''));
    if (base && base.length >= 4 && normUtt.some((u) => u.indexOf(base) !== -1)) {
      violations.push({ ...d, verdict: 'announced-decorative' });
    }
  }
  const spoken = results.filter((r) => r.verdict === 'spoken').length;
  return {
    results,
    violations,
    summary: {
      expected: expected.length,
      spoken,
      outOfOrder: results.filter((r) => r.verdict === 'out-of-order').length,
      missing: results.filter((r) => r.verdict === 'missing').length,
      decorativeAnnounced: violations.length,
      coveragePct: expected.length ? Math.round((spoken / expected.length) * 100) : 100,
    },
  };
}

function formatReport(diff, meta) {
  const s = diff.summary;
  const lines = [];
  lines.push('NVDA transcript verification — ' + (meta && meta.file ? meta.file : '(document)'));
  lines.push('Generated: ' + (meta && meta.when ? meta.when : '') + '  NVDA log: ' + (meta && meta.log ? meta.log : ''));
  lines.push('');
  lines.push(`RESULT: ${s.spoken}/${s.expected} expectations spoken in order (${s.coveragePct}%)` +
    (s.outOfOrder ? `, ${s.outOfOrder} OUT OF ORDER` : '') +
    (s.missing ? `, ${s.missing} MISSING` : '') +
    (s.decorativeAnnounced ? `, ${s.decorativeAnnounced} decorative image(s) wrongly announced` : ''));
  lines.push('');
  for (const r of diff.results) {
    const mark = r.verdict === 'spoken' ? 'OK ' : (r.verdict === 'out-of-order' ? 'ORD' : 'MISS');
    const label = r.kind === 'heading' ? `h${r.level} "${r.text}"`
      : r.kind === 'list' ? `list (${r.items} items)`
      : r.kind === 'table' ? `table${r.text ? ` "${r.text}"` : ''} (${r.rows} rows)`
      : `${r.kind} "${(r.text || '').slice(0, 70)}"`;
    lines.push(`  [${mark}] ${label}`);
  }
  for (const v of diff.violations) {
    lines.push(`  [VIOL] decorative image announced: ${v.src}`);
  }
  lines.push('');
  lines.push('Interpretation: OK = spoken in document order. ORD = spoken but out of order');
  lines.push('(reading-order problem). MISS = never spoken (structure/alt not exposed, or the');
  lines.push('say-all pass stopped early). VIOL = decorative content leaked into speech.');
  return lines.join('\n');
}

module.exports = { parseSpeechLog, diffTranscript, formatReport };
