const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const file=path.join(root,'applied_challenge_source.jsx');
let s=fs.readFileSync(file,'utf8');
const replace=(a,b)=>{if(!s.includes(a))throw Error('Missing anchor: '+a.slice(0,100));s=s.replace(a,b)};
const helpers=`
const APPLIED_CHALLENGE_STAGES = Object.freeze([
  { id: 'understand', label: 'Understand', phases: ['workingQuestion', 'stakeholders'] },
  { id: 'explore', label: 'Explore', phases: ['possibilities', 'evidence', 'assumptions', 'tradeoffs'] },
  { id: 'build', label: 'Build', phases: ['response'] },
  { id: 'check', label: 'Check', phases: ['testReflection', 'revision'] },
  { id: 'reflect', label: 'Reflect', phases: ['transferReflection'] },
]);

function appliedChallengeReferenceItems(values, previous, prefix) {
  const list = _apsList(values, 12, 800);
  const old = Array.isArray(previous) ? previous : [];
  const used = new Set();
  return list.map((text, index) => {
    const exact = old.find(item => item && item.text === text && !used.has(item.id));
    const atIndex = old[index];
    const prior = exact || (atIndex && !used.has(atIndex.id) && !list.includes(atIndex.text) ? atIndex : null);
    let id = _apsString(prior && prior.id, 80).replace(/[^a-zA-Z0-9_-]/g, '') || prefix + '-' + appliedChallengeHashText(text);
    while (used.has(id)) id += '-' + index;
    used.add(id);
    return { id, text, revision: appliedChallengeHashText(text.trim().replace(/\\s+/g, ' ')),
      sourceQuote: _apsString(prior && prior.sourceQuote, 1600), sourceLocation: _apsString(prior && prior.sourceLocation, 300) };
  });
}

function normalizeAppliedChallengePlan(value) {
  const raw = value && typeof value === 'object' ? value : {};
  return { learningTarget: _apsString(raw.learningTarget, 1200), availableTime: _apsString(raw.availableTime, 100),
    materials: _apsString(raw.materials, 1200), sourceSelection: _apsString(raw.sourceSelection, 5000),
    supportLevel: ['prompt', 'example', 'independent'].includes(raw.supportLevel) ? raw.supportLevel : 'prompt',
    visualMode: raw.visualMode === 'none' ? 'none' : 'organizer' };
}

function appliedChallengeSafeUrl(value) {
  const text = _apsString(value, 2000).trim();
  try { const url = new URL(text); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch (_) { return ''; }
}

function appliedChallengeGenerationIssues(value, agencyMode) {
  const raw = value && typeof value === 'object' ? value : {}, brief = raw.brief || {}, supports = raw.supports || {};
  const issues = [];
  if (!_apsString(brief.context).trim()) issues.push('Provide a bounded situation.');
  if (!_apsString(brief.deliverable).trim()) issues.push('Specify the learner-created product.');
  if (!_apsList(brief.criteria || brief.successCriteria).length) issues.push('Give clear success criteria.');
  if (!_apsList(brief.constraints).length) issues.push('Give a feasible constraint.');
  if (_apsList(brief.lockedLessonFacts).length < 2) issues.push('Provide at least two concise lesson-grounded facts.');
  if (!_apsString(brief.seedDirection || brief.drivingQuestion).trim()) issues.push('Connect the question or framing direction to the lesson.');
  if (agencyMode === 'progressive' && (!_apsString(supports.parallelExample?.move).trim() || !_apsString(supports.parallelExample?.context).trim() || !_apsString(supports.frameStarter).trim())) issues.push('Provide a parallel reasoning example and a partial starter.');
  return issues;
}

function appliedChallengeFeedbackOutdated(value) {
  const data = normalizeAppliedChallengeData(value);
  return !!data.feedback && (!data.feedback.contextFingerprint || data.feedback.contextFingerprint !== appliedChallengeHashText(appliedChallengeRequestFingerprint(data, 'feedback', { resourceId: data.feedback.resourceId, gradeLevel: data.feedback.gradeLevel || data.lessonRef.gradeLevel, sourceExcerpt: data.sourceExcerpt })));
}
`;
replace('const APPLIED_CHALLENGE_SCOPES =',helpers+'\nconst APPLIED_CHALLENGE_SCOPES =');
replace("{ id: 'testReflection', label: '8. Test or challenge the draft', compact: false }","{ id: 'testReflection', label: '8. Test or challenge the draft', compact: true }");
replace("{ id: 'revision', label: '9. Revise after testing', compact: false }","{ id: 'revision', label: '9. Keep or revise after checking', compact: true }");
replace("  const normalizedAgency = normalizeAppliedChallengeAgencyMode(agencyMode);","  const normalizedAgency = normalizeAppliedChallengeAgencyMode(agencyMode);\n  const facts = _apsList(raw.lockedLessonFacts || raw.lessonFacts, 12, 800);\n  const criteria = _apsList(raw.criteria || raw.successCriteria, 12, 700);\n  const constraints = _apsList(raw.constraints, 12, 700);");
replace("lockedLessonFacts: _apsList(raw.lockedLessonFacts || raw.lessonFacts, 12, 800),","lockedLessonFacts: facts,\n    factSources: appliedChallengeReferenceItems(facts, raw.factSources, 'fact'),\n    criteriaItems: appliedChallengeReferenceItems(criteria, raw.criteriaItems, 'criterion'),\n    constraintItems: appliedChallengeReferenceItems(constraints, raw.constraintItems, 'constraint'),");
replace("criteria: _apsList(raw.criteria || raw.successCriteria, 12, 700),","criteria,");
replace("constraints: _apsList(raw.constraints, 12, 700),","constraints,");
replace("  return APPLIED_CHALLENGE_WORKSPACE_PHASES.reduce((result, phase) => {","  return APPLIED_CHALLENGE_WORKSPACE_PHASES.reduce((result, phase) => {");
replace("    result[phase.id] = _apsString(raw[phase.id], max);\n    return result;\n  }, {});","    result[phase.id] = _apsString(raw[phase.id], max);\n    return result;\n  }, { questionAccepted: raw.questionAccepted === true, artifactUrl: appliedChallengeSafeUrl(raw.artifactUrl), artifactDescription: _apsString(raw.artifactDescription, 4000) });");
replace("      tradeoff: _apsString(raw.tradeoff || raw.constraint || raw.uncertainty, 1800),","      tradeoff: _apsString(raw.tradeoff || raw.constraint || raw.uncertainty, 1800),\n      factId: _apsString(raw.factId, 80), factRevision: _apsString(raw.factRevision, 80),");
replace("    contextFingerprint: _apsString(raw.contextFingerprint, 80),\n    createdAt: _apsString(raw.createdAt, 80),\n  };\n}\n\nconst APPLIED_CHALLENGE_SELF_CHECK_RATINGS", "    contextFingerprint: _apsString(raw.contextFingerprint, 80),\n    resourceId: _apsString(raw.resourceId, 160), gradeLevel: _apsString(raw.gradeLevel, 100),\n    createdAt: _apsString(raw.createdAt, 80),\n  };\n}\n\nconst APPLIED_CHALLENGE_SELF_CHECK_RATINGS");
const start=s.indexOf('// Student self-check of the deliverable');
const end=s.indexOf('function normalizeAppliedChallengeTeacherComment',start);
s=s.slice(0,start)+`// Stable identities survive reorder; revisions make changed expectations explicit.
function appliedChallengeSelfCheckItems(brief) {
  const b = brief && typeof brief === 'object' ? brief : {};
  return [
    ...appliedChallengeReferenceItems(b.criteria, b.criteriaItems, 'criterion').map((item, index) => ({ ...item, key: item.id, kind: 'criterion', index })),
    ...appliedChallengeReferenceItems(b.constraints, b.constraintItems, 'constraint').map((item, index) => ({ ...item, key: item.id, kind: 'constraint', index })),
  ];
}

function normalizeAppliedChallengeCriteriaCheck(value, brief) {
  const raw = value && typeof value === 'object' ? value : {};
  return appliedChallengeSelfCheckItems(brief).reduce((result, item) => {
    const entry = raw[item.key] || raw[item.kind + '-' + item.index];
    if (!entry || typeof entry !== 'object') return result;
    const needsReview = entry.revision !== item.revision;
    const rating = Object.prototype.hasOwnProperty.call(APPLIED_CHALLENGE_SELF_CHECK_RATINGS, entry.rating) ? entry.rating : 'pending';
    const note = _apsString(entry.note, 1200);
    if (rating !== 'pending' || note.trim() || entry.needsReview) result[item.key] = {
      rating: needsReview ? 'pending' : rating, note, revision: entry.revision || '',
      needsReview, previousRating: needsReview ? entry.previousRating || rating : '',
    };
    return result;
  }, {});
}

`+s.slice(end);
replace("  const evidenceLedger = normalizeAppliedChallengeEvidenceLedger(raw.evidenceLedger).map((row) => (\n    !brief.factVerified && row.status === 'verified' ? Object.assign({}, row, { status: 'needs-check' }) : row\n  ));\n  if (!workspace.workingQuestion && agencyMode !== 'student-framed') workspace.workingQuestion = brief.drivingQuestion;",`  const evidenceLedger = normalizeAppliedChallengeEvidenceLedger(raw.evidenceLedger).map((row) => {
    const fact = brief.factSources.find(item => item.id === row.factId);
    return row.status === 'verified' && (!brief.factVerified || !fact || fact.revision !== row.factRevision)
      ? { ...row, status: 'needs-check' } : row;
  });`);
replace('    schemaVersion: 6,','    schemaVersion: 7,\n    plan: normalizeAppliedChallengePlan(raw.plan),');
s=s.replaceAll("const question = data.workspace.workingQuestion || data.brief.drivingQuestion;","const question = data.workspace.workingQuestion;");
replace("const started = phases.filter((phase) => data.workspace[phase.id].trim()).length;","const started = phases.filter((phase) => data.workspace[phase.id].trim() && (phase.id !== 'workingQuestion' || data.workspace.questionAccepted || data.workspace.workingQuestion !== data.brief.drivingQuestion)).length;");
// Keep feedback visible while edits make its recorded context outdated.
s=s.replaceAll("    if (data.feedback) commitField('feedback', null);",'');
s=s.replaceAll("    if (changesMeaning && data.feedback) commitField('feedback', null);",'');
replace("      [key]: _apsString(value, key === 'response' || key === 'revision' ? 12000 : 8000),","      [key]: key === 'artifactUrl' ? appliedChallengeSafeUrl(value) : _apsString(value, key === 'response' || key === 'revision' ? 12000 : 8000),\n      ...(key === 'workingQuestion' ? { questionAccepted: true } : {}),");
replace("      next[key] = Object.assign({ rating: 'pending', note: '' }, next[key] || {}, patch);","      const item = appliedChallengeSelfCheckItems(data.brief).find(item => item.key === key);\n      next[key] = Object.assign({ rating: 'pending', note: '' }, next[key] || {}, patch, patch.rating && item ? { revision: item.revision, needsReview: false } : {});");
replace("        contextFingerprint: appliedChallengeHashText(requestFingerprint),\n        createdAt: new Date().toISOString(),\n      });\n      commitField('feedback'","        contextFingerprint: appliedChallengeHashText(requestFingerprint),\n        resourceId, gradeLevel: feedbackGradeLevel,\n        createdAt: new Date().toISOString(),\n      });\n      commitField('feedback'");
replace("  const phases = appliedChallengeVisiblePhases(data.scope).map((phase) => ({","  const preset = ['task', 'response', 'teacher', 'paper'].includes(opts.preset || value?.appliedChallengeExportPreset) ? opts.preset || value.appliedChallengeExportPreset : 'full';\n  const phases = appliedChallengeVisiblePhases(data.scope).map((phase, index) => ({");
replace("label: appliedChallengePhaseLabel(phase, data.family, t),\n    prompt:","label: String(index + 1) + '. ' + appliedChallengePhaseLabel(phase, data.family, t).replace(/^\\d+\\.\\s*/, ''),\n    prompt:");
replace("    text: data.workspace[phase.id],","    text: preset === 'task' || preset === 'paper' ? '' : data.workspace[phase.id],");
replace("    title: data.title,\n    instructions:","    preset, plan: { ...data.plan, sourceSelection: '' },\n    feedbackOutdated: appliedChallengeFeedbackOutdated(data),\n    artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n    title: data.title,\n    instructions:");
replace("      statusLabel: appliedChallengeLookupLabel(APPLIED_CHALLENGE_EVIDENCE_STATUSES, 'evidence_status', row.status, t),","      statusLabel: appliedChallengeLookupLabel(APPLIED_CHALLENGE_EVIDENCE_STATUSES, 'evidence_status', row.status, t),\n      sourceText: data.brief.factSources.find(item => item.id === row.factId)?.text || '',");
// Include the learner's artifact explanation in the request identity.
replace("    criteriaCheck: data.criteriaCheck,\n  }));","    criteriaCheck: data.criteriaCheck,\n    artifactUrl: data.workspace.artifactUrl, artifactDescription: data.workspace.artifactDescription,\n  }));");
fs.writeFileSync(file,s);
let build=fs.readFileSync(path.join(root,'_build_applied_challenge_module.js'),'utf8');
build=build.replace("'  APPLIED_CHALLENGE_FAMILIES: APPLIED_CHALLENGE_FAMILIES,',","'  APPLIED_CHALLENGE_FAMILIES: APPLIED_CHALLENGE_FAMILIES,',\n  '  stages: APPLIED_CHALLENGE_STAGES,',\n  '  normalize: normalizeAppliedChallengeData,',\n  '  normalizePlan: normalizeAppliedChallengePlan,',\n  '  generationIssues: appliedChallengeGenerationIssues,',");
build=build.replace("'    normalizeAppliedChallengeFamily: normalizeAppliedChallengeFamily,',","'    normalizeAppliedChallengeFamily: normalizeAppliedChallengeFamily,',\n  '    appliedChallengeReferenceItems: appliedChallengeReferenceItems,',\n  '    appliedChallengeFeedbackOutdated: appliedChallengeFeedbackOutdated,',\n  '    appliedChallengeGenerationIssues: appliedChallengeGenerationIssues,',");
fs.writeFileSync(path.join(root,'_build_applied_challenge_module.js'),build);
let shared=fs.readFileSync(path.join(root,'studio_response_module.js'),'utf8');
shared=shared.replace('question status lessonConnectionCheck','question questionAccepted artifactUrl artifactDescription factId factRevision revision needsReview previousRating resourceId gradeLevel status lessonConnectionCheck');
shared=shared.replace('/^(criterion|constraint)-\\d+$/','/^(criterion|constraint)-[a-zA-Z0-9_-]{1,80}$/');
fs.writeFileSync(path.join(root,'studio_response_module.js'),shared);fs.writeFileSync(path.join(root,'desktop/web-app/public/studio_response_module.js'),shared);
console.log('Applied schema, ownership, evidence, and feedback foundations updated.');
