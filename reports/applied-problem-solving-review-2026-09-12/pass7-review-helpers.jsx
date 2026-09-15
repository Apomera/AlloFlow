// These checks detect recorded writing and incomplete fields. They do not grade
// reasoning, judge source accuracy, or require learners to claim a test occurred.
function appliedChallengeEvidenceHasNotes(value, t) {
  const referenceLabels = ['Outside source — not checked', _apsT(t, 'applied_challenge.search.reference', 'Outside source — not checked')];
  const dateLabels = ['Found on', _apsT(t, 'applied_challenge.search.found', 'Found on')];
  return _apsString(value, 8000).split(/\r?\n/).some(raw => {
    const line = raw.trim();
    if (!line || /^https?:\/\/\S+$/i.test(line)) return false;
    if (referenceLabels.some(label => line.startsWith(label + ':'))) return false;
    if (dateLabels.some(label => line.startsWith(label + ':') && /^\d{4}-\d{2}-\d{2}$/.test(line.slice(label.length + 1).trim()))) return false;
    return true;
  });
}

function appliedChallengeReviewTarget(value, part, itemId) {
  const data = normalizeAppliedChallengeData(value), w = data.workspace;
  const usable = data.validationCycles.filter(cycle => cycle.source !== 'ai' || ['use', 'adapt'].includes(cycle.disposition));
  const phase = id => ({ phase: id, elementId: 'applied-workspace-' + id });
  const row = itemId ? data.evidenceLedger.find(row => row.id === itemId) : data.evidenceLedger.find(row => row.claim.trim() || row.evidence.trim() || row.tradeoff.trim());
  if (part === 'question') return phase('workingQuestion');
  if (part === 'response') return w.response.trim() || (!w.artifactUrl && !w.artifactDescription.trim()) ? phase('response') : { phase: 'response', elementId: w.artifactUrl ? 'applied-artifact-description' : 'applied-artifact-url' };
  if (part === 'evidence') return row && data.plan.visualMode !== 'none' && (itemId || !w.evidence.trim()) ? { phase: 'possibilities', rowId: row.id, elementId: (row.claim.trim() ? 'aps-ledger-evidence-' : 'aps-ledger-claim-') + row.id } : phase('evidence');
  if (part === 'check' || part === 'decision') {
    const cycle = itemId ? data.validationCycles.find(cycle => cycle.id === itemId) : usable[0];
    if (!cycle || (!itemId && (part === 'check' ? w.testReflection.trim() : w.revision.trim()))) return phase(part === 'check' ? 'testReflection' : 'revision');
    const suffix = cycle.source === 'ai' && !['use', 'adapt'].includes(cycle.disposition) ? 'choice' : part === 'check' ? 'observed' : cycle.decision.action === 'pending' ? 'decision' : 'reasoning';
    return { phase: 'testReflection', cycleId: cycle.id, elementId: 'aps-cycle-' + suffix + '-' + cycle.id };
  }
  if (part === 'criterion') return { phase: 'testReflection', elementId: 'aps-criterion-' + itemId };
  return phase('transferReflection');
}

function appliedChallengeReviewFollowups(value, t) {
  const data = normalizeAppliedChallengeData(value), w = data.workspace;
  const items = appliedChallengeReviewItems(data, t), result = [];
  const tx = (key, fallback) => _apsT(t, 'applied_challenge.review_next.' + key, fallback);
  const add = (id, message, target) => result.push({ id, message, target });
  const missing = id => !items.find(item => item.id === id).recorded;
  const general = {
    question: tx('question', 'Write or accept the question you want to answer.'),
    response: w.artifactUrl ? tx('linked_explanation', 'Explain the reasoning in your linked work so a reader can follow it.') : w.artifactDescription.trim() ? tx('missing_link', 'Add the link to the work you described, or put your response in the written response field.') : tx('response', 'Add your response: write it here, or link your work and explain its reasoning.'),
    evidence: tx('evidence', 'Explain how a lesson idea supports or challenges your response.'),
    check: tx('check', 'Describe what you checked, or say what remains untested. A plan alone is not a result.'),
    decision: tx('decision', 'Explain what you will keep or revise after checking, and why.'),
    transfer: tx('transfer', 'Name another situation where this lesson idea could help.'),
  };
  ['question', 'response'].forEach(id => { if (missing(id)) add(id, general[id], appliedChallengeReviewTarget(data, id)); });
  let rowIssues = 0;
  if (data.plan.visualMode !== 'none') data.evidenceLedger.forEach((row, index) => {
    if (!row.claim.trim() && !row.evidence.trim() && !row.tradeoff.trim()) return;
    let message = '';
    if (!row.claim.trim()) message = _apsFill(tx('row_claim', 'Connect evidence row {n} to a claim, option, or position.'), { n: index + 1 });
    else if (!appliedChallengeEvidenceHasNotes(row.evidence, t)) message = _apsFill(tx('row_notes', 'Explain how evidence row {n} supports or challenges your claim. A reference alone does not explain the connection.'), { n: index + 1 });
    if (message) { rowIssues++; add('row-' + row.id, message, appliedChallengeReviewTarget(data, 'evidence', row.id)); }
  });
  if (missing('evidence') && !rowIssues) add('evidence', general.evidence, appliedChallengeReviewTarget(data, 'evidence'));
  let cycleIssues = 0;
  data.validationCycles.forEach((cycle, index) => {
    if (cycle.source === 'ai' && !['use', 'adapt'].includes(cycle.disposition)) return;
    const active = cycle.plan.testQuestion.trim() || cycle.plan.expectedFinding.trim() || cycle.plan.changeThreshold.trim() || cycle.observation.evidence.trim() || cycle.decision.reasoning.trim() || cycle.decision.action !== 'pending';
    if (!active) return;
    let message = '', part = 'check';
    if (!cycle.observation.evidence.trim()) message = _apsFill(tx('cycle_observe', 'Check {n} has no observation note. Record what you actually found, or explain that this check has not happened yet.'), { n: index + 1 });
    else if (cycle.decision.action === 'pending' || !cycle.decision.reasoning.trim()) { part = 'decision'; message = _apsFill(tx('cycle_decide', 'Connect the evidence in check {n} to a keep-or-revise decision and a reason.'), { n: index + 1 }); }
    if (message) { cycleIssues++; add('cycle-' + cycle.id, message, appliedChallengeReviewTarget(data, part, cycle.id)); }
  });
  ['check', 'decision'].forEach(id => { if (missing(id) && !cycleIssues) add(id, general[id], appliedChallengeReviewTarget(data, id)); });
  if (missing('transfer')) add('transfer', general.transfer, appliedChallengeReviewTarget(data, 'transfer'));
  appliedChallengeSelfCheckItems(data.brief).forEach(item => {
    const entry = data.criteriaCheck[item.key];
    if (entry?.needsReview) add('criterion-' + item.key, _apsFill(tx('changed_criterion', 'Revisit a requirement that changed: {text}'), { text: _apsString(item.text, 180) }), appliedChallengeReviewTarget(data, 'criterion', item.key));
    else if (entry?.rating === 'met' && !entry.note.trim()) add('criterion-' + item.key, _apsFill(tx('criterion_note', 'You marked this requirement as met. Point to where your work shows it: {text}'), { text: _apsString(item.text, 180) }), { phase: 'testReflection', elementId: 'aps-criterion-note-' + item.key });
  });
  return result;
}
