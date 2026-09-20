const fs=require('fs'),files=new Map();
const read=p=>{if(!files.has(p))files.set(p,fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n'));return files.get(p);};
function rep(p,a,b){const s=read(p);if(!s.includes(a))throw Error('Missing '+p+': '+a.slice(0,120));files.set(p,s.replace(a,b));}
const p='memory_aid_source.jsx';
const helpers=fs.readFileSync('reports/memory-aid-ux-review-2026-09-12/refinement-helpers.jsx.txt','utf8').replace(/\r\n/g,'\n').replace('.slice(0, 20)', '.slice(-20)');
rep(p,'function memoryAidDate(value) {',helpers+'\nfunction memoryAidDate(value) {');
rep(p,'    applicationQuestion: _maString(raw.applicationQuestion, 1600).trim(),',"    recallQuestion: _maString(raw.recallQuestion, 1600),\n    applicationQuestion: _maString(raw.applicationQuestion, 1600).trim(),");
rep(p,'    studentReasoning: _maString(raw.studentReasoning, 6000),', '    studentReasoning: _maString(raw.studentReasoning, 6000),\n    studentConnections: normalizeMemoryAidStudentConnections(raw.studentConnections),');
rep(p,"if (changesFactMeaning) { next.factReviewedAt = '';", "if (changesFactMeaning) { if (!Object.prototype.hasOwnProperty.call(safePatch, 'recallQuestion')) next.recallQuestion = ''; next.factReviewedAt = '';");
rep(p,"'studentDraft', 'studentReasoning', 'visualImage', 'visualAlt',", "'studentDraft', 'studentReasoning', 'studentConnections', 'visualImage', 'visualAlt',");
rep(p,"    'Student aid:\\n'", "    'Learner-identified cue connections (not verified):\\n' + _maPromptData(JSON.stringify(memoryAidActiveConnections(normalized).filter(row => row.learnerIdentified)), 9000),\n    'Student aid:\\n'");
const a=read(p).indexOf('function memoryAidReviewPlan('),b=read(p).indexOf('function MemoryAidFollowUp',a);
if(a<0||b<0)throw Error('review plan boundary');
files.set(p,read(p).slice(0,a)+`function memoryAidReviewPlan(card, attempts, today = memoryAidLocalDate()) {
  const all = normalizeMemoryAidPracticeAttempts(attempts, card).filter(attempt => memoryAidPracticeSummary(attempt, card).complete);
  const factsKey = JSON.stringify(_maPracticeFactKeys(_maList(card?.essentialFacts, 10, 600)).sort());
  const matching = all.filter(attempt => JSON.stringify(attempt.factKeys.slice().sort()) === factsKey);
  const latest = memoryAidPracticeReady(card).ok ? matching.slice(-1)[0] : null;
  if (!latest) return { latest: null, date: '', due: false, needsPractice: false, earlierCue: false, contentChanged: !!all.length && !matching.length };
  const earlierCue = latest.basisKey !== memoryAidPracticeBasis(card);
  let date = latest.nextReviewDate;
  if (!date && latest.reviewSchedule !== 'off') {
    const next = new Date(latest.createdAt);
    if (Number.isFinite(next.getTime())) { next.setDate(next.getDate() + 1); date = memoryAidLocalDate(next); }
  }
  return { latest, date: date || '', due: !!date && date <= today, needsPractice: earlierCue || memoryAidPracticeSummary(latest, card).needsPractice > 0, earlierCue, contentChanged: false };
}
`+read(p).slice(b));
rep(p,"!['upsert-attempt', 'delete-attempt', 'clear-card'].includes(action)","!['upsert-attempt', 'patch-followup', 'delete-attempt', 'clear-card'].includes(action)");
rep(p,"  if (action === 'upsert-attempt') {",`  if (action === 'patch-followup') {
    const id = _maString(mutation.attemptId, 120), old = existing.find(item => item.id === id);
    if (removed.has(_maPracticeTombstoneIdentity(cardId, id))) return { applied: false, reason: 'attempt-tombstoned', state };
    if (!old) return { applied: false, reason: 'attempt-missing', state };
    const patch = mutation.patch && typeof mutation.patch === 'object' ? mutation.patch : {};
    const allowed = ['nextReviewDate','reviewSchedule','applicationQuestion','applicationResponse','applicationRevealed','applicationCheck'];
    const next = normalizeMemoryAidPracticeAttempt({ ...old, ...Object.fromEntries(allowed.filter(key => Object.prototype.hasOwnProperty.call(patch, key)).map(key => [key, patch[key]])) }, card, 0);
    nextCards[cardId] = existing.map(item => item.id === id ? next : item);
    return { applied: true, reason: 'followup-updated', state: { ...state, cards: nextCards } };
  }
  if (action === 'upsert-attempt') {`);
rep(p,"if (applied.reason === 'attempt-tombstoned') {","if (['attempt-tombstoned', 'attempt-missing'].includes(applied.reason)) {");
// Reuse exactly the same effective cue and connections in study and print.
rep(p,"const customized = !!card.studentDraft.trim() && card.studentDraft.trim() !== (card.aiExample || card.scaffoldStarter || '').trim();", "const customized = memoryAidCustomCue(card);");
rep(p,'const connections = customized ? [] : card.connections;', 'const connections = memoryAidActiveConnections(card);');
rep(p,"if (hidden) return open +", "if (hidden) return open +");
rep(p,"esc(T('export_no_hints_prompt','Recall the target you studied in this position. Explain its facts in your own words without consulting your cue.'))", "esc(memoryAidRecallQuestion(card) || T('recall_legacy_print', 'No recall question was saved for this older target. Identify its topic with your teacher before starting; keep the study card out of view.'))");
rep(p,"    const links = !card.studentDraft && card.connections.length ? '<dl>'+card.connections.map", "    const connections = memoryAidActiveConnections(card);\n    const links = connections.length ? '<dl>'+connections.map");
rep(p,"card.mapping && !card.studentDraft ?", "card.mapping && !memoryAidCustomCue(card) ?");

for(const [name,contents] of files)fs.writeFileSync(name,contents);
console.log('Memory Aid data, recall question, connections and private patch helpers written.');
