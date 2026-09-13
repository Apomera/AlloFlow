import { derive, goalOf } from './lesson_board_engine.js';
import { learningSummary } from './lesson_board_insights.js';
export function practicePlan(board, run, uid, roster = {}) {
  const learner = learningSummary(board, run, { [uid]: roster[uid] || {} }).learners[0];
  const reviewed = new Set(Object.values(run.steps || {}).filter(step => step.result || step.retryStats).map(step => step.targetId));
  const complete = derive(board, run).complete;
  return learner.locations.filter(item => complete || reviewed.has(item.id)).map(item => ({ id: item.id, name: item.name, conceptId: item.conceptId, reason: !item.answered ? 'unattempted' : !item.lastCorrect ? 'revisit' : item.improved ? 'strengthen' : 'secure' })).filter(item => item.reason !== 'secure').sort((a, b) => ['revisit', 'unattempted', 'strengthen'].indexOf(a.reason) - ['revisit', 'unattempted', 'strengthen'].indexOf(b.reason));
}
export function learningReport(board, run, roster, context = {}) {
  const summary = learningSummary(board, run, roster), progress = derive(board, run);
  return { format: 'alloflow-board-learning', version: 1, savedAt: Date.now(), boardTitle: board.title, goal: goalOf(board), complete: progress.complete, mode: context.preview ? 'preview' : context.mode === 'teacher' ? 'classroom' : 'solo', attempt: String(context.attemptId || ''),
    scope: context.mode === 'teacher' ? String(context.sessionCode || '') : '',
    coverage: context.coverage || null,
    progress: { explored: progress.visited.length, locations: board.locations.length, projects: progress.built.length, concepts: progress.concepts.length, totalConcepts: board.concepts.length },
    concepts: board.concepts.map(item => ({ id: item.id, name: item.name })),
    learners: summary.learners.map(item => ({ uid: item.uid, name: item.name, answered: item.answered, correct: item.correct, firstCorrectCount: item.firstCorrectCount, latestCorrectCount: item.latestCorrectCount, attemptedLocations: item.attemptedLocations, retries: item.retries,
      locations: item.locations.map(location => ({ id: location.id, name: location.name, conceptId: location.conceptId, answered: location.answered, correct: location.correct, firstCorrect: location.firstCorrect, lastCorrect: location.lastCorrect, improved: location.improved })),
      practice: practicePlan(board, run, item.uid, roster) })) };
}
const identity = (appId, owner) => ({ appId: String(appId || 'alloflow-local'), owner: String(owner || 'local') });
export const reportStorageKey = (appId, owner) => { const who = identity(appId, owner); return 'allo-board-reports-v1:' + encodeURIComponent(who.appId) + ':' + encodeURIComponent(who.owner); };
function validReport(report) {
  const count = value => Number.isSafeInteger(value) && value >= 0;
  const label = (value, limit = 256) => typeof value === 'string' && value.length <= limit;
  const truth = value => value === null || typeof value === 'boolean';
  return report && report.format === 'alloflow-board-learning' && report.version === 1 && Number.isFinite(report.savedAt) && report.savedAt > 0 && report.savedAt <= 8640000000000000 && label(report.boardTitle,120) && ['solo','classroom','preview'].includes(report.mode)
    && Array.isArray(report.concepts) && report.concepts.length <= 4 && report.concepts.every(item => item && label(item.id,40) && label(item.name,100))
    && Array.isArray(report.learners) && report.learners.length <= 500 && report.learners.every(item => item && label(item.uid,128) && label(item.name) && ['answered','correct','firstCorrectCount','latestCorrectCount','attemptedLocations','retries'].every(key => count(item[key]))
      && Array.isArray(item.locations) && item.locations.length <= 12 && item.locations.every(node => node && label(node.id,40) && label(node.name,80) && label(node.conceptId,40) && count(node.answered) && count(node.correct) && truth(node.firstCorrect) && truth(node.lastCorrect) && typeof node.improved === 'boolean')
      && Array.isArray(item.practice) && item.practice.length <= 12 && item.practice.every(node => node && label(node.id,40) && label(node.name,80) && ['revisit','unattempted','strengthen'].includes(node.reason)))
    && (!report.coverage || count(report.coverage.total) && count(report.coverage.linked) && report.coverage.linked <= report.coverage.total && Array.isArray(report.coverage.items) && report.coverage.items.length <= 48 && report.coverage.items.every(item => item && count(item.index) && label(item.label,180) && Array.isArray(item.locations) && item.locations.length <= 12 && item.locations.every(node => node && label(node.id,40) && label(node.name,80))));
}
function readEnvelope(storage, appId, owner) {
  const raw = storage.getItem(reportStorageKey(appId, owner));
  if (raw === null) return { raw, reports: [] };
  try {
    if (raw.length > 2000000) throw Error();
    const data = JSON.parse(raw), who = identity(appId, owner);
    if (data.version !== 1 || data.appId !== who.appId || data.owner !== who.owner || !Array.isArray(data.reports) || data.reports.length > 12 || data.reports.some(report => !validReport(report) || typeof report.id !== 'string')) throw Error();
    return { raw, reports: data.reports };
  } catch (_) { throw Error('Saved learning reports could not be read. Existing reports have been kept.'); }
}
export const readReports = (storage, appId, owner) => readEnvelope(storage, appId, owner).reports;
function writeReports(storage, appId, owner, old, reports) {
  const key = reportStorageKey(appId, owner), value = JSON.stringify({ version: 1, ...identity(appId, owner), reports });
  if (value.length > 2000000) throw Error('These learning reports are too large to save. Export a report or remove an older saved copy.');
  if (storage.getItem(key) !== old.raw) throw Error('Learning reports changed in another tab. Reopen the reports before saving.');
  storage.setItem(key, value);
  if (storage.getItem(key) !== value) throw Error('Learning reports changed while saving. Reopen the reports to check the saved copy.');
  return reports;
}
export function saveReport(storage, appId, owner, report) {
  if (!validReport(report)) throw Error('This learning report could not be saved.');
  const old = readEnvelope(storage, appId, owner);
  const same = old.reports.find(item => report.attempt && item.attempt === report.attempt && item.scope === report.scope && item.mode === report.mode);
  if (!same && old.reports.length >= 12) throw Error('Twelve reports are already saved. Export or remove a saved report before saving another.');
  const copy = { ...report, id: same?.id || 'report-' + (globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2)) };
  return writeReports(storage, appId, owner, old, [copy, ...old.reports.filter(item => item.id !== copy.id)]);
}
export function removeReport(storage, appId, owner, report) {
  const old = readEnvelope(storage, appId, owner), current = old.reports.find(item => item.id === report.id);
  if (!current || JSON.stringify(current) !== JSON.stringify(report)) throw Error('This report changed. Reopen saved reports before removing it.');
  return writeReports(storage, appId, owner, old, old.reports.filter(item => item.id !== report.id));
}
const cell = value => { let text = String(value ?? ''); if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text; return '"' + text.replaceAll('"', '""') + '"'; };
export function reportCSV(report) {
  const rows = [['Board', 'Mode', 'Saved at', 'Learner', 'Concept', 'Location', 'Recorded attempts', 'First response correct', 'Latest response correct', 'Improved after review', 'Suggested practice']];
  for (const learner of report.learners) for (const location of learner.locations) rows.push([report.boardTitle, report.mode, new Date(report.savedAt).toISOString(), learner.name, report.concepts.find(concept => concept.id === location.conceptId)?.name || '', location.name, location.answered, location.firstCorrect === null ? 'No recorded response' : location.firstCorrect, location.lastCorrect === null ? 'No recorded response' : location.lastCorrect, location.improved, learner.practice.find(item => item.id === location.id)?.reason || '']);
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export function downloadReport(report, type = 'json') {
  const csv = type === 'csv', blob = new Blob([csv ? '\uFEFF' + reportCSV(report) : JSON.stringify(report, null, 2)], { type: csv ? 'text/csv;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'board-learning-' + new Date(report.savedAt).toISOString().slice(0, 10) + (csv ? '.csv' : '.json');
  try { document.body.appendChild(link); link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
