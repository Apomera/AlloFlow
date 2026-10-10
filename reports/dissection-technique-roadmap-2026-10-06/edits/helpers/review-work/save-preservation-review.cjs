const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const scratch = path.join(__dirname, '..');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const baseline = fs.readFileSync(path.join(scratch, 'renderer-baseline.js'), 'utf8');
const candidatePath = path.join(repo, 'stem_lab/stem_tool_dissection.js');
const publicPath = path.join(repo, 'desktop/web-app/public/stem_lab/stem_tool_dissection.js');
const candidate = fs.readFileSync(candidatePath, 'utf8');
const publicCandidate = fs.readFileSync(publicPath, 'utf8');
const manifestPath = path.join(repo, 'reports/dissection-technique-roadmap-2026-10-06/edits/renderer-edits.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const sha = source => crypto.createHash('sha256').update(source).digest('hex');
const candidateHash = sha(candidate);
if (candidateHash !== '5646ce64f266c0a82f74e7f3827d25c8fcab3e3b7c5c04a8a34eff801ce59ce4') throw Error('Candidate changed; review needs refresh');
if (publicCandidate !== candidate) throw Error('Source/public mirror differs');
if (manifest.edits.length !== 7) throw Error('Expected seven cumulative renderer edits');
let restored = candidate;
for (const edit of manifest.edits.slice().reverse()) {
  if (restored.split(edit.after).length !== 2) throw Error('Inverse edit is not unique: ' + edit.name);
  restored = restored.replace(edit.after, () => edit.before);
}
if (restored !== baseline) throw Error('Bytes outside intended edits differ from baseline');
const roadmap = manifest.edits.find(edit => edit.name === 'Derived native protocol overview').after;
const report = {
  reviewType: 'Independent read-only final static preservation review',
  reviewedAtUtc: new Date().toISOString(),
  baselineSha256: sha(baseline),
  candidateSha256: candidateHash,
  publicSha256: sha(publicCandidate),
  sourcePublicByteParity: fs.readFileSync(candidatePath).equals(fs.readFileSync(publicPath)),
  reviewedSourcePath: candidatePath,
  cumulativeManifestPath: manifestPath,
  manifestMatchesCandidate: candidateHash === manifest.afterSha256 && sha(baseline) === manifest.beforeSha256,
  verdict: 'pass',
  openFindings: [],
  resolvedFindings: [{
    id: 'current-phase-stale-record',
    priority: 'P2',
    originalCandidateSha256: 'af1c985d4465f1bb46c12cbdef6cebec8dd77294e7d3c47d756a2361f4a18b01',
    issue: 'A completed current action with missing prediction and reflection flags was labeled Plan needed although the native gate prioritizes the pending explanation.',
    resolution: 'Final row state derives from currentLearningGate.required and currentLearningGate.phase; pending reflection is labeled Explanation needed. A noncurrent completed but unverified row is labeled Recorded action; evidence incomplete.',
    evidence: 'Applied renderTechniqueRoadmap current row derives state from currentLearningGate; procedureLearningGateFor remains unchanged.'
  }],
  scope: {
    editCount: manifest.edits.length,
    editNames: manifest.edits.map(edit => edit.name),
    independentlyVerifiedExactReversal: restored === baseline,
    allBytesOutsideSevenEditsPreserved: true,
    repoWritesPerformedByReviewer: false,
    suitesRunByReviewer: false
  },
  checks: [
    { name: 'Native learning gates and scoring', status: 'pass', evidence: 'Gate, learning entry, summary, action completion, scoring, and handlers are unchanged by exact reversal. Display count calls procedureLearningSummary(currentProcedure); row verification uses its same action-complete plus predictionCorrect plus reflectionCorrect predicate.' },
    { name: 'Current pending explanation and stale flags', status: 'pass', evidence: 'Required gate action takes precedence over procedureNext.action; row state follows native gate phase. Correct flags alone cannot verify an undone or incomplete physical action. Noncurrent completed actions with incomplete evidence are labeled recorded.' },
    { name: 'Legacy learning records', status: 'pass', evidence: 'Existing procedureLearningEntry compatibility treats completed actions with no learningChecks record as legacy verified. Both count and rows retain that native interpretation, with no new learning credit logic.' },
    { name: 'Native protocol labels and order', status: 'pass', evidence: 'Roadmap iterates procedureProtocol.order and takes procedureProtocol.actions[index], with native procedureActionLabel fallback. Original profiles remain byte-identical, including pin before cutting for earthworm and sheep eye.' },
    { name: 'Undo and visibility', status: 'pass', evidence: 'Unchanged undoProcedureAction clears physical completion and reflection correctness; display recomputes from the restored state. New render call stays inside the unchanged procedureLearningCheckpointVisible guard. No exposure, view, or learning visibility logic changed.' },
    { name: 'Information-only disclosure', status: 'pass', evidence: 'Native details and summary disclose an ordered list. New markup has no action handler or state update call; opening it grants no credit and performs no technique action.' },
    { name: 'No new application state, timers, or saved fields', status: 'pass', evidence: 'Inserted function is derived rendering only and uses local values. No new hooks, upd or update calls, timers, event listeners, or saved fields are present.', staticMutationTokenScanEmpty: !/\b(?:onClick|onToggle|onChange|useState|setTimeout|setInterval|updMany|updateProcedure|recordProcedureLearningChoice)\b/.test(roadmap) },
    { name: 'Single planning prompt', status: 'pass', evidence: 'New content uses protocol action labels and a short verification explanation; it does not repeat predictionPrompt or reflectionPrompt. Existing next-action suppression and phase-only stage headline stay byte-identical.' },
    { name: 'Honest final review wording', status: 'pass', evidence: 'Only the final title changes from Specimen investigation complete to Review your specimen investigation. The final description, label, start-assessment action, branches, and assessment handlers remain byte-identical.' },
    { name: 'Explicit native progress presentation', status: 'pass', evidence: 'The native progress element, value, max, and accessible label remain unchanged. New scoped CSS provides track and fill styles for WebKit and Firefox, matches the real data-high-contrast="true" root attribute, and uses Canvas and Highlight system colors under forced colors. App high contrast uses a white fill on a black track.' },
    { name: 'Native phase group semantics', status: 'pass', evidence: 'Technique learning cycle and Guided evidence cycle divs each gain only role="group". Their existing translated aria-labels, phase children, functions, and handlers remain unchanged.' }
  ],
  limits: 'Static review of staged source and exact changes. Browser layout and user interaction verification are handled by the separate browser auditor.'
};
fs.mkdirSync(__dirname, { recursive: true });
const reportPath = path.join(__dirname, 'roadmap-preservation-review.json');
if (fs.existsSync(reportPath)) {
  const previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  if (previous.candidateSha256 !== candidateHash) {
    const archivePath = path.join(__dirname, 'roadmap-preservation-review-' + previous.candidateSha256.slice(0, 12) + '.json');
    if (!fs.existsSync(archivePath)) fs.copyFileSync(reportPath, archivePath);
  }
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ reportPath, candidateSha256: report.candidateSha256, publicSha256: report.publicSha256, sourcePublicByteParity: report.sourcePublicByteParity, verdict: report.verdict, openFindings: report.openFindings.length, cumulativeEdits: report.scope.editCount, independentlyVerifiedExactReversal: report.scope.independentlyVerifiedExactReversal }));
