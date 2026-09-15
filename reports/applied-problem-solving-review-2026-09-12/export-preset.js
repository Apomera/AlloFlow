function renderAppliedChallengePreset(value, preset, t) {
  const data = normalizeAppliedChallengeData(value);
  const mode = ['task', 'response', 'teacher', 'paper'].includes(preset) ? preset : 'response';
  const m = appliedChallengeExportModel(data, { preset: mode, t });
  const tr = (key, fallback) => _apsT(t, 'applied_challenge.' + key, fallback);
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const list = values => '<ul>' + values.filter(Boolean).map(item => '<li>' + esc(item) + '</li>').join('') + '</ul>';
  const text = value => '<p class="aps-copy-text">' + esc(value) + '</p>';
  const section = (label, body) => '<section><h2>' + esc(label) + '</h2>' + body + '</section>';
  const blank = '<div class="aps-copy-lines" aria-label="' + esc(tr('export.writing_space', 'Writing space')) + '"></div>';
  const teaching = mode === 'task' || mode === 'paper';
  const labels = { task: tr('export.preset.task', 'Student task'), response: tr('export.preset.response', 'My response'), teacher: tr('export.preset.teacher', 'Teacher review'), paper: tr('export.preset.paper', 'Paper organizer') };
  let body = '<h1>' + esc(data.title) + '</h1><p>' + esc(labels[mode]) + '</p>';
  if (data.plan.learningTarget) body += text(data.plan.learningTarget);
  if (teaching || mode === 'teacher') {
    body += section(tr('brief.heading', 'Challenge brief'), text(data.brief.context) + text(data.brief.drivingQuestion || data.brief.seedDirection) + text(data.brief.deliverable));
    body += section(m.brief.factHeading, list(data.brief.lockedLessonFacts));
    body += section(tr('reference.criteria', 'What your response needs'), list(data.brief.criteria));
    body += section(tr('reference.limits', 'Limits and unknowns'), list([...data.brief.constraints, ...data.brief.openQuestions]) + text(data.plan.materials));
    if (data.visual.image && data.visual.reviewed && data.visual.alt.trim()) body += '<figure><img src="' + esc(data.visual.image) + '" alt="' + esc(data.visual.alt) + '"><figcaption>' + esc(data.visual.purpose) + '</figcaption></figure>';
    if (data.plan.supportLevel === 'example' && data.supports.parallelExample.move) body += section(tr('help.example', 'See a parallel example'), text(data.supports.parallelExample.context) + text(data.supports.parallelExample.move) + text(data.supports.parallelExample.whyItHelps));
  }
  for (const stage of APPLIED_CHALLENGE_STAGES) {
    const fields = m.phases.filter(phase => stage.phases.includes(phase.id) && (teaching || mode === 'teacher' || phase.text.trim()));
    if (!fields.length) continue;
    body += section(_apsT(t, 'applied_challenge.stage.' + stage.id, stage.label), fields.map(phase => '<article><h3>' + esc(phase.label.replace(/^\d+\.\s*/, '')) + '</h3>' + (teaching ? text(phase.prompt) + blank : text(phase.text || tr('export.not_recorded', 'Not recorded yet'))) + '</article>').join(''));
  }
  if (teaching && data.plan.visualMode !== 'none') {
    body += section(tr('export.organizer', 'Compare possibilities and evidence'), '<table><thead><tr><th>' + esc(tr('ledger.claim', 'Claim, option, or position')) + '</th><th>' + esc(tr('ledger.evidence', 'Evidence or lesson connection')) + '</th><th>' + esc(tr('ledger.tradeoff', 'Tradeoff, constraint, or uncertainty')) + '</th></tr></thead><tbody>' + [1, 2].map(() => '<tr><td>' + blank + '</td><td>' + blank + '</td><td>' + blank + '</td></tr>').join('') + '</tbody></table>');
  }
  if (!teaching) {
    if (m.evidenceLedger.length) body += section(tr('export.evidence', 'Evidence connections'), m.evidenceLedger.map(row => '<article><h3>' + esc(row.claim) + '</h3>' + text(row.evidence) + (row.sourceText ? text(tr('export.source_fact', 'Linked lesson fact:') + ' ' + row.sourceText) : '') + text(row.statusLabel) + text(row.tradeoff) + '</article>').join(''));
    if (m.artifactUrl || m.artifactDescription) body += section(tr('artifact.heading', 'Linked work and explanation'), (m.artifactUrl ? '<p><a href="' + esc(m.artifactUrl) + '" rel="noopener noreferrer">' + esc(m.artifactUrl) + '</a></p>' : '') + text(m.artifactDescription));
    if (m.validationCycles.length) body += section(tr('validation.heading', 'Test, observe, decide'), m.validationCycles.map(cycle => '<article><h3>' + esc(cycle.sourceLabel) + '</h3>' + text(cycle.source === 'ai' ? cycle.dispositionLabel + ': ' + cycle.dispositionReason : '') + text(tr('export.planned', 'Planned check:') + ' ' + cycle.plan.testQuestion) + text(tr('export.threshold', 'What could change my mind:') + ' ' + cycle.plan.changeThreshold) + text(tr('export.observed', 'Reported observation:') + ' ' + cycle.observation.evidence) + text(cycle.decision.actionLabel + ': ' + cycle.decision.reasoning) + text(cycle.decision.revisionSummary) + '</article>').join(''));
    if (mode === 'teacher') {
      body += section(tr('self_check.heading', 'Self-check against the brief'), m.selfCheck.map(row => '<article><h3>' + esc(row.text) + '</h3>' + text(row.ratingLabel) + text(row.note) + '</article>').join(''));
      if (m.feedback) body += section(tr('feedback.heading', 'Feedback for revision'), text(m.feedbackOutdated ? tr('feedback.earlier', 'Feedback for an earlier draft or brief. Review before relying on it.') : m.feedback.statusLabel) + text(m.feedback.strength) + text(m.feedback.lessonConnectionCheck) + text(m.feedback.evidenceOrConstraintCheck) + text(m.feedback.nextStep) + text(m.feedback.question));
      if (m.teacherComment) body += section(tr('teacher_comment.heading', 'Teacher comment'), text(m.teacherComment.text));
    }
  }
  return '<section class="applied-challenge-export aps-preset" data-applied-preset="' + mode + '"><style>.aps-preset{max-width:900px;margin:auto;font-family:system-ui;overflow-wrap:anywhere;line-height:1.5}.aps-preset h1{font-size:1.7em}.aps-preset h2{font-size:1.25em;margin-top:1.4em;break-after:avoid}.aps-preset h3{font-size:1em;break-after:avoid}.aps-preset .aps-copy-text{white-space:pre-wrap}.aps-preset img{max-width:100%;max-height:360px;object-fit:contain}.aps-preset table{width:100%;border-collapse:collapse;table-layout:fixed}.aps-preset th,.aps-preset td{border:1px solid #aaa;padding:8px;vertical-align:top}.aps-preset .aps-copy-lines{min-height:100px;background:repeating-linear-gradient(transparent,transparent 27px,#bbb 28px,transparent 29px);margin:12px 0}.aps-preset th{font-size:.85em}@media print{.aps-preset{max-width:none}.aps-preset .aps-copy-lines{print-color-adjust:exact}.aps-preset tr{break-inside:avoid}}</style>' + body + '</section>';
}
