import { stepOf } from './lesson_board_engine.js';
// Private answers on native Firestore. Each learner writes an answer to their own document and the
// teacher keeps accepted values in a teacher-only document; the shared session document carries only
// "received" receipts. The teacher's host turns this on (escapeRoomState.privateAnswers) after checking
// the rules allow it, so older apps and unpublished rules keep using the shared action slot.
// Mailbox and LAN sessions are filtered by their servers and keep the shared slot.
const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
export const privateTransport = ref => !!ref && !ref.__alloMbRef && !ref.__alloLanRef;
const base = (appId, code) => ['artifacts', appId, 'public', 'data', 'sessions', code];
export const answerPath = (appId, code, uid) => [...base(appId, code), 'boardAnswers', uid];
export const answersCollectionPath = (appId, code) => [...base(appId, code), 'boardAnswers'];
export const hostPath = (appId, code, attemptId) => [...base(appId, code), 'boardHost', attemptId];
const roundKey = (turn, round) => 't' + turn + 'r' + (round || 0);
const ANSWER_PATH = /^steps\.t(\d+)\.(?:responseRounds\.r(\d+)\.)?answers\.([A-Za-z0-9_-]{1,128})$/;
// Splits an engine patch: answer contents go to the teacher-only document, receipts stay shared.
export function splitAnswers(patch) {
  const shared = {}, values = {};
  for (const [path, value] of Object.entries(patch || {})) {
    const match = ANSWER_PATH.exec(path);
    if (match && object(value) && typeof value.value === 'string') { const key = roundKey(match[1], match[2]); (values[key] = values[key] || {})[match[3]] = { value: value.value, correct: value.correct === true }; shared[path] = { received: true }; }
    else shared[path] = value;
  }
  return { shared, values };
}
// The teacher's copy of a run with the stored values filled into the current step's receipts.
export function withPrivateAnswers(run, hostDoc) {
  const step = stepOf(run), round = step.retryRound || 0, stored = hostDoc?.answers?.[roundKey(run.turn, round)];
  if (!object(stored) || !object(step.answers) || !Object.values(step.answers).some(entry => entry?.received)) return run;
  const next = JSON.parse(JSON.stringify(run)), raw = next.steps['t' + run.turn], target = round > 0 ? raw?.responseRounds?.['r' + round] : raw;
  if (!object(target?.answers)) return run;
  for (const [uid, entry] of Object.entries(target.answers)) if (entry?.received && object(stored[uid])) target.answers[uid] = { value: stored[uid].value, correct: stored[uid].correct === true };
  return next;
}
// A learner's own copy: their receipt shows the value they sent (from their own private document).
export function withOwnAnswer(run, uid, own) {
  const step = stepOf(run), entry = step.answers?.[uid];
  if (!entry?.received || !object(own) || own.requestId !== step.seen?.[uid]?.requestId || typeof own.value !== 'string') return run;
  const next = JSON.parse(JSON.stringify(run)), raw = next.steps['t' + run.turn], round = step.retryRound || 0, target = round > 0 ? raw?.responseRounds?.['r' + round] : raw;
  if (object(target?.answers?.[uid])) target.answers[uid] = { value: own.value, correct: null };
  return next;
}
// After End or Restart: remove the finished attempt's private answers and teacher-only values (best effort).
export async function clearPrivateAnswers(fb, appId, code, attemptId) {
  if (typeof fb?.deleteDoc !== 'function' || typeof fb.getDocs !== 'function' || typeof fb.collection !== 'function') return;
  const db = fb.db || window.__alloShared?.db, refs = [];
  try { (await fb.getDocs(fb.collection(db, ...answersCollectionPath(appId, code)))).forEach(item => { if (item.data()?.attemptId === attemptId) refs.push(fb.doc(db, ...answerPath(appId, code, item.id))); }); } catch (_) {}
  await Promise.all([...refs, fb.doc(db, ...hostPath(appId, code, attemptId))].map(ref => Promise.resolve().then(() => fb.deleteDoc(ref)).catch(() => {})));
}
export const isPermissionError = error => /permission|denied|insufficient/i.test(String(error?.code || '') + ' ' + String(error?.message || ''));
