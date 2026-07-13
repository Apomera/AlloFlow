#!/usr/bin/env node
// Dead-disclosure gate (deep dive 2026-07-09, goldens item 3).
//
// The bug class: the pipeline WRITES a disclosure field onto its result (a fidelity note kind, an
// honesty flag, a warning string) and no UI or report ever READS it — the teacher never sees the
// disclosure the code was written to make. Deep-dive findings H6 (integrityWarning had zero render
// sites: 3-second toast only), D2 (altQuality payload had no reader), and D3 (_scoreSource written,
// restored, never read) were all this one pattern; the 2026-06 PDF-slice audit hit it too ("flag
// wired in data but not render = dead disclosure").
//
// This gate holds an explicit contract per disclosure-bearing field: a PRODUCER pattern that must
// exist in doc_pipeline_source.jsx (else the field was removed — update the contract) and at least
// one READER pattern across view_pdf_audit_source.jsx / the pipeline's own report generators. A
// field produced with no reader FAILS. Known-dead fields sit in ALLOWED_DEAD with the reason —
// adding a new disclosure means adding a contract entry (cheap) and the gate then guards it forever.
//
// Run: node dev-tools/check_disclosure_reads.cjs   (exit 1 on violations)
// Also executed by tests/disclosure_reads_gate.test.js so it rides the vitest suite/CI.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const dp = fs.readFileSync(path.join(ROOT, 'doc_pipeline_source.jsx'), 'utf8');
const view = fs.readFileSync(path.join(ROOT, 'view_pdf_audit_source.jsx'), 'utf8');

// A reader can live in the view OR in the pipeline's own downloadable-report/export generators.
const SOURCES = { dp, view, any: dp + '\n' + view };

// ── The contract ──────────────────────────────────────────────────────────────────────────────
// producer: regex that must match dp (the write site). readers: regexes; at least one must match
// its named source. Keep patterns SEMANTIC (field names / render idioms), not line-exact — this
// gate should survive refactors that keep the disclosure alive.
const CONTRACT = [
  {
    field: 'fidelityNotes (the persistent panel list)',
    producer: /fidelityNotes: _structuralFidelityNotes/,
    readers: [{ src: 'view', re: /pdfFixResult\.fidelityNotes\.map/ }, { src: 'dp', re: /opts\.fidelityNotes\.forEach/ }],
    all: true, // both the live panel AND the downloadable report must render the notes
  },
  {
    field: 'integrityWarning (coverage/placement/numeric warning)',
    producer: /integrityWarning: integrityWarning \|\| null/,
    readers: [
      { src: 'dp', re: /opts && opts\.integrityWarning/ },                       // downloadable report
      { src: 'dp', re: /kind: 'placement', msg: _placementWarn/ },               // H6: persistent note
    ],
    all: true,
  },
  {
    field: 'altQuality (image-description quality findings)',
    producer: /altQuality: altQualityReport/,
    readers: [
      { src: 'dp', re: /kind: 'altQuality'/ },      // HIGH-severity findings ride the fidelity notes
      { src: 'view', re: /\.altQuality/ },          // M20 (deferred): direct view reader — either satisfies
    ],
  },
  {
    field: 'ocrAccuracy (estimated OCR quality)',
    producer: /\n\s*ocrAccuracy,/,
    readers: [{ src: 'view', re: /pdfFixResult\.ocrAccuracy && typeof pdfFixResult\.ocrAccuracy\.score === 'number'/ }],
  },
  {
    field: '_aiVerificationIncomplete (degraded-AI honesty flag)',
    producer: /_aiVerificationIncomplete/,
    readers: [{ src: 'view', re: /pdfFixResult\._aiVerificationIncomplete/ }],
  },
  {
    field: '_estimatedMinimumScore + basis',
    producer: /_estimatedMinimumScore/,
    readers: [{ src: 'view', re: /_estimatedMinimumScore/ }, { src: 'view', re: /_estimatedScoreBasis/ }],
    all: true,
  },
  {
    field: 'autoRestore (dual-OCR restoration banner payload)',
    producer: /autoRestore: _autoRestore/,
    readers: [{ src: 'view', re: /pdfFixResult\.autoRestore/ }],
  },
  {
    field: 'activeContent (JS/OpenAction/embedded-file safety scan)',
    producer: /activeContent: /,
    readers: [
      { src: 'dp', re: /kind: 'activeContent'/ },   // persistent fidelity note
      { src: 'view', re: /activeContent/ },
    ],
  },
  {
    field: 'issueResolution (resolved/persisted issue diff)',
    producer: /issueResolution/,
    readers: [{ src: 'view', re: /pdfFixResult\.issueResolution/ }],
  },
  {
    field: 'ocrTextLayer (searchable-layer coverage of the tagged export)',
    producer: /ocrTextLayer: \{ coveragePct: _ocrCoveragePct/,
    readers: [{ src: 'view', re: /ocrTextLayer/ }],
  },
  {
    field: 'roundTrip (post-save structural self-check)',
    producer: /roundTrip: _roundTrip/,
    readers: [{ src: 'view', re: /roundTrip/ }],
  },
  {
    field: 'dupeCollapses → ocrDupeCollapse note (reconcile-time echo collapses)',
    producer: /dupeCollapses: _dupeCollapses/,
    readers: [{ src: 'dp', re: /kind: 'ocrDupeCollapse'/ }],
  },
  {
    field: 'strippedEdgeLines → pageEdge note (running-head lines removed from ground truth)',
    producer: /strippedEdgeLines: _edge\.strippedLines/,
    readers: [{ src: 'dp', re: /kind: 'pageEdge'/ }],
  },
  {
    field: 'veraPdfAutoSkipped (M25: silent auto-validation skip)',
    producerSrc: 'view',
    producer: /setVeraPdfAutoSkipped\('transport-blocked'\)/,
    readers: [{ src: 'view', re: /!_ltv && veraPdfAutoSkipped/ }],
  },
];

// Fields the pipeline writes that DELIBERATELY have no reader today. Each entry needs a reason;
// promoting one to the contract (by adding a reader) removes it from here.
const ALLOWED_DEAD = [
  { field: '_scoreSource', reason: 'D3: same distinctions reach the UI via _aiVerificationIncomplete + _scoreIsBlended; kept in data for the audit trail. Render or delete — tracked in the deep-dive ledger.' },
  { field: 'pipelineStats', reason: 'D5: telemetry denominator (retries/API time); consumed by warnLog + the run-history line, not a teacher-facing disclosure.' },
];

const problems = [];
for (const c of CONTRACT) {
  const producerSrc = SOURCES[c.producerSrc || 'dp'];
  if (!c.producer.test(producerSrc)) {
    problems.push(`[contract-stale] producer for "${c.field}" not found — the field was removed or renamed; update the contract`);
    continue;
  }
  const hits = c.readers.map((r) => r.re.test(SOURCES[r.src] || ''));
  const ok = c.all ? hits.every(Boolean) : hits.some(Boolean);
  if (!ok) {
    const missing = c.readers.filter((_, i) => !hits[i]).map((r) => `${r.src}:${r.re}`);
    problems.push(`[dead-disclosure] "${c.field}" is produced but ${c.all ? 'required reader(s) missing' : 'has NO reader'}: ${missing.join(' ; ')}`);
  }
}

if (problems.length) {
  console.error('check_disclosure_reads: ' + problems.length + ' problem(s)');
  for (const p of problems) console.error('  ✗ ' + p);
  process.exit(1);
}
console.log('check_disclosure_reads: all ' + CONTRACT.length + ' disclosure contracts satisfied (' + ALLOWED_DEAD.length + ' allowed-dead, documented).');
module.exports = { CONTRACT, ALLOWED_DEAD };
