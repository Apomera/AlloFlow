// Assemble human calibration packets from completed connector runs.
//
// For each spec: copy the run artifacts, bind them by SHA-256, write an observation record in
// the shape tests/fixtures/pdf_calibration/README.md describes (evidenceKind "unreviewed"), a
// pending review form with the artifact hash filled in, the pipeline's own log lines, and a
// reviewer sheet in plain language. Nothing here invents a measurement: every number in the
// observation comes from the run's report JSON or from the pipeline's own log lines, and the
// observation says which.
//   node build_packets.cjs <packets.json> <scratch-log-dir>
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const [specFile, logDir] = process.argv.slice(2);
const specs = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function runLogLines(file, runId) {
  if (!file || !fs.existsSync(file)) return [];
  const tag = '[' + runId.slice(0, 13) + ']';
  return fs.readFileSync(file, 'utf8').split('\n')
    .filter((l) => l.includes(tag))
    .map((l) => l.replace(/^\[alloflow-remediation-mcp\] \[arun-[0-9a-f]+\] /, ''))
    .filter((l) => /\[PDF Fix\]|\[Auto-fix\]|\[Tesseract\]|\[PDF Det\]|\[aiFixChunked|\[Output Audit\]|\[Integrity\]|\[AltQuality\]|\[AltSpotCheck\]|Vision OCR|OCR reconciled|Tagged PDF|verdict|client answered|Final|Document Safety|active content|coverage/i.test(l));
}

function logFacts(lines) {
  const facts = { aiScore: null, aiIssues: null, axeScore: null, eaScore: null, eaReview: null, passes: null, source: [] };
  for (const l of lines) {
    let m = /Final AI semantic audit: AI layer score (\d+), (\d+) remaining issues?, (\d+) passes/.exec(l);
    if (m) { facts.aiScore = Number(m[1]); facts.aiIssues = Number(m[2]); facts.passes = Number(m[3]); facts.source.push(l.trim()); }
    m = /Final headline \(weakest-layer\): min\(AI ([\d.]+|null), deterministic (\d+) \[axe (\d+), EqualAccess (\d+)/.exec(l);
    if (m) { facts.axeScore = Number(m[3]); facts.eaScore = Number(m[4]); facts.source.push(l.trim()); }
    m = /Equal Access (\d+) failures? \+ (\d+) review findings/.exec(l);
    if (m) { facts.eaReview = Number(m[2]); if (!facts.source.includes(l.trim())) facts.source.push(l.trim()); }
  }
  return facts;
}

const summaryLines = [];
for (const spec of specs) {
  const runDir = path.resolve(ROOT, spec.runDir);
  const files = fs.readdirSync(runDir);
  const html = files.find((f) => /-accessible\.html$/.test(f));
  const reportFile = files.find((f) => /-remediation-report\.json$/.test(f));
  const completionFile = files.find((f) => /-remediation-completion\.json$/.test(f));
  const taggedPdf = files.find((f) => /-tagged(-review-required)?\.pdf$/.test(f));
  if (!html || !reportFile) { console.log('skip', spec.slug, '(no artifacts yet in ' + runDir + ')'); continue; }
  const report = JSON.parse(fs.readFileSync(path.join(runDir, reportFile), 'utf8'));
  const completion = completionFile ? JSON.parse(fs.readFileSync(path.join(runDir, completionFile), 'utf8')) : null;
  const htmlBytes = fs.readFileSync(path.join(runDir, html));
  const htmlSha = sha256(htmlBytes);
  const outDir = path.join(__dirname, 'packets', spec.slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.copyFileSync(path.join(runDir, html), path.join(outDir, html));
  fs.copyFileSync(path.join(runDir, reportFile), path.join(outDir, reportFile));
  if (completionFile) fs.copyFileSync(path.join(runDir, completionFile), path.join(outDir, completionFile));
  if (taggedPdf) fs.copyFileSync(path.join(runDir, taggedPdf), path.join(outDir, taggedPdf));
  const lines = runLogLines(spec.logFile ? path.join(logDir, spec.logFile) : null, spec.runId);
  fs.writeFileSync(path.join(outDir, 'pipeline-log.txt'), '# Pipeline log lines for ' + spec.runId + ' (connector stderr, filtered to the decision-bearing lines)\n' + lines.join('\n') + '\n');
  const facts = logFacts(lines);
  const cc = report.contentCoverage || {};
  const verdict = report.verdict || {};

  // Observation record. Layers whose raw audit object the connector does not export are
  // reconstructed from the report's counts and the pipeline's own log lines, and say so.
  const verification = {
    ai: facts.aiScore === null ? null : { score: facts.aiScore, issueCount: facts.aiIssues, passCount: facts.passes, chunksRequested: null, chunksAudited: null, _source: 'pipeline log: final AI semantic audit' },
    axe: facts.axeScore === null ? null : { score: facts.axeScore, totalViolations: num(report.remainingAxeViolations), totalIncomplete: null, _source: 'report.remainingAxeViolations + pipeline log: final headline' },
    equalAccess: facts.eaScore === null ? null : { score: facts.eaScore, failViolations: num(report.remainingEqualAccessFailures), reviewFindingCount: facts.eaReview, _source: 'report.remainingEqualAccessFailures + pipeline log: final headline / pass summary' },
    aiIncomplete: report.aiVerificationIncomplete === true,
  };
  const observation = {
    id: spec.slug + '-' + spec.runId.slice(5, 13),
    documentKind: spec.documentKind,
    evidenceKind: 'unreviewed',
    artifact: { sha256: htmlSha, file: html, bytes: htmlBytes.length, mimeType: 'text/html' },
    source: { corpusPath: spec.source, url: spec.sourceUrl, sha256: completion && completion.source ? completion.source.sha256 : null, pages: spec.pages },
    run: { runId: spec.runId, modelTransport: report.modelTransport || 'agent-bridge', modelCallsAnswered: spec.modelCalls || report.modelCallsAnswered || null, connectorBuild: spec.build, completedAt: completion ? completion.completedAt : null },
    observed: {
      targetScore: 95,
      verification,
      result: {
        beforeScore: num(report.beforeScore), afterScore: num(report.afterScore), scoreSource: report.scoreSource || null,
        verificationState: report.verificationState || null, integrityCoverage: num(report.integrityCoverage), integrityWarning: report.integrityWarning || null,
        fidelityNotes: Array.isArray(report.fidelityNotes) ? report.fidelityNotes : [],
        needsExpertReview: report.reviewRequired === true, deliveryStatus: report.deliveryStatus || null, deliveryReviewReasons: report.deliveryReviewReasons || [],
        contentCoverage: { status: cc.status || null, tokenRecall: num(cc.tokenRecall), missingTokens: num(cc.missingTokens), sourceTokens: num(cc.sourceTokens) },
        activeContentScanVerified: report.activeContentScanVerified, activeContentDetected: report.activeContentDetected,
        candidateRejections: report.candidateRejections || [],
        verdict,
      },
      pdf: { produced: !!taggedPdf, taggedPdfError: report.taggedPdfError || null, validation: report.pdfUa || null },
    },
    provenance: 'Scores and counts copied from ' + reportFile + ' and from the connector log lines in pipeline-log.txt; nothing measured by a person yet. Layers marked _source are reconstructed summaries, not the raw audit objects (the connector does not export those).',
  };
  fs.writeFileSync(path.join(outDir, 'observation.json'), JSON.stringify(observation, null, 2) + '\n');
  const review = JSON.parse(fs.readFileSync(path.join(ROOT, 'tests/fixtures/pdf_calibration/review_template.json'), 'utf8'));
  review.artifactSha256 = htmlSha;
  review.evidenceRef = 'packets/' + spec.slug + '/review-notes.md';
  fs.writeFileSync(path.join(outDir, 'review.json'), JSON.stringify(review, null, 2) + '\n');

  const pipelineClaims = [
    'Score before: ' + report.beforeScore + '. Score after: ' + report.afterScore + ' (the weakest of the three verification layers' + (facts.aiScore !== null ? ': AI audit ' + facts.aiScore + ', axe ' + facts.axeScore + ', Equal Access ' + facts.eaScore : '') + ').',
    'Verdict: ' + (verdict.level || 'unknown') + (verdict.reviewCount != null ? ' (' + verdict.reviewCount + ' review reason(s), ' + verdict.cautionCount + ' caution(s))' : '') + '.',
    'Remaining automated findings: axe ' + report.remainingAxeViolations + ' violation(s), Equal Access ' + report.remainingEqualAccessFailures + ' failure(s)' + (facts.eaReview != null ? ' plus ' + facts.eaReview + ' review finding(s) a person must confirm' : '') + (facts.aiIssues != null ? ', AI audit ' + facts.aiIssues + ' remaining issue(s)' : '') + '.',
    'Content coverage: ' + (cc.status || 'not run') + (cc.tokenRecall != null ? ', ' + Math.round(cc.tokenRecall * 1000) / 10 + '% of source tokens found in the output, ' + cc.missingTokens + ' missing' : '') + '.',
    'Tagged PDF: ' + (taggedPdf ? 'produced (' + taggedPdf + ')' : 'withheld' + (report.taggedPdfError ? ' because ' + report.taggedPdfError.replace(/_/g, ' ') : '')) + '.',
    'Fidelity notes: ' + ((report.fidelityNotes || []).length ? (report.fidelityNotes || []).map((n) => (typeof n === 'string' ? n : (n.note || n.message || JSON.stringify(n)))).join(' | ') : 'none') + '.',
    'Document Safety scan: ' + (report.activeContentScanVerified ? 'verified, ' + (report.activeContentDetected ? 'active content detected' : 'no active content') : 'not verified') + '.',
  ];
  const sheet = `# Review packet: ${spec.title}

**Source document:** \`${spec.source}\` (${spec.pages} page(s); public copy at ${spec.sourceUrl}). Not included in this folder; open it from the corpus or the URL.
**Output under review:** \`${html}\` (SHA-256 \`${htmlSha}\`). Open it in a browser and, if you can, with a screen reader.
**Produced by:** AlloFlow remediation connector ${spec.build}, keyless agent-bridge lane (the answering model was Claude in a Claude Code session; no Gemini key). Run \`${spec.runId}\`, ${spec.modelCalls || report.modelCallsAnswered || '?'} model calls.
${spec.notes ? '\n' + spec.notes + '\n' : ''}
## What the pipeline claims

${pipelineClaims.map((c) => '- ' + c).join('\n')}

## What we need from you

Judge the output on its own terms as a document a person would use. Budget 20 to 30 minutes.

1. Open the source and the output side by side. Is everything in the source present in the output, in the right order, with nothing invented? Note any passage that is missing, garbled or reworded in a way that changes meaning.
2. Navigate the output by headings, landmarks and links (screen reader or keyboard). Do the headings describe the sections? Are tables usable cell by cell? Are lists real lists? Do images have alternatives that say what the image is for?
3. Decide an overall readiness for the output: \`ready\` (could be distributed as is), \`caution\` (usable, with reservations you would tell the recipient), \`review-required\` (someone must fix something first), or \`unavailable\` (you could not assess it).
4. For each layer you assessed, give an outcome (\`passed\`, \`failed\`, \`review-required\`, \`partial\`, \`unavailable\`, \`not-applicable\`): \`ai\` (the semantic audit's claims about structure and wording), \`axe\` and \`equalAccess\` (automated checks; you may leave these unassessed), \`fidelity\` (does the output say what the source says), \`export\` (the tagged PDF, if one was produced).
5. Record each problem you found as a finding: an id, the layer, one sentence, and whether the pipeline's own report already mentions it (\`detectedByAutomation\`).

Write your notes in \`review-notes.md\` (free text is fine) and fill in \`review.json\`: set \`status\` to \`completed\`, \`independent\` to \`true\` if you had no part in producing this output, your name or initials as \`reviewer\`, the ISO date and time as \`reviewedAt\`, then \`readiness\`, \`layers\` and \`findings\`. The artifact hash is already filled in; do not change it.

## Files in this folder

- \`${html}\`: the output under review.
- \`${reportFile}\`${completionFile ? ', `' + completionFile + '`' : ''}: the pipeline's own report and completion manifest (machine-readable claims).
- \`pipeline-log.txt\`: the decision-bearing lines the pipeline logged while producing this output.
- \`observation.json\`: the pipeline's claims in the calibration corpus format, ready to import once your review is done.
- \`review.json\`: your review form (pending until you complete it).
`;
  fs.writeFileSync(path.join(outDir, 'README.md'), sheet);
  fs.writeFileSync(path.join(outDir, 'review-notes.md'), '# Review notes: ' + spec.title + '\n\nReviewer:\nDate:\n\n## Fidelity (source vs output)\n\n\n## Structure and navigation\n\n\n## Images, tables, lists, links\n\n\n## Overall readiness and why\n\n');
  summaryLines.push(`| ${spec.title} | ${spec.documentKind} | ${spec.pages} | ${report.beforeScore} → ${report.afterScore} | ${verdict.level || '?'} | ${cc.tokenRecall != null ? Math.round(cc.tokenRecall * 1000) / 10 + '%' : 'n/a'} | ${taggedPdf ? 'produced' : 'withheld'} | \`packets/${spec.slug}/\` |`);
  console.log('packet', spec.slug, 'html', htmlSha.slice(0, 12), 'ai/axe/ea', facts.aiScore, facts.axeScore, facts.eaScore, 'eaReview', facts.eaReview, 'log lines', lines.length);
}
fs.writeFileSync(path.join(__dirname, 'packets', 'SUMMARY.md'), '| Packet | Kind | Pages | Score | Verdict | Coverage recall | Tagged PDF | Folder |\n| --- | --- | ---: | ---: | --- | ---: | --- | --- |\n' + summaryLines.join('\n') + '\n');
console.log('wrote', specs.length, 'packets');
