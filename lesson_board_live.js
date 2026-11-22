import { runOf, stepOf, validAction, validValue } from './lesson_board_engine.js';

const has = (o, k) => !!o && typeof k === 'string' && k !== '__proto__' && k !== 'constructor' && k !== 'prototype' && Object.prototype.hasOwnProperty.call(o, k);

// The action each learner has waiting for the current window: a private answer document wins over the
// shared slot when private answers are on (see lesson_board_private.js); votes always use the shared slot.
export function boardRequests(state, roster = {}, privateActions = {}) {
  if (state?.mode !== 'lesson-board' || !state.isActive) return [];
  const run = runOf(state), step = stepOf(run), kind = step.phase === 'choose' ? 'vote' : step.phase === 'answer' ? 'answer' : '';
  if (!kind) return [];
  const shared = state.teamProgress?.All?.boardActions || {}, own = state.privateAnswers === true && kind === 'answer' ? privateActions || {} : {};
  return [...new Set([...Object.keys(shared), ...Object.keys(own)])].filter(uid => uid !== '__proto__' && uid !== 'constructor' && uid !== 'prototype').map(uid => {
    const seen = has(step.seen, uid) ? step.seen[uid] : null;
    const usable = action => action && action.kind === kind && validAction(action, state.attemptId, run.turn, step.retryRound || 0) && seen?.requestId !== action.requestId;
    const ownAction = has(own, uid) ? own[uid] : null;
    const sharedAction = has(shared, uid) ? shared[uid] : null;
    return [uid, usable(ownAction) ? ownAction : usable(sharedAction) ? sharedAction : null];
  }).filter(([uid, action]) => action && has(roster, uid) && has(state.teams, uid) && state.teams[uid] === 'All');
}
// Only current, usable responses from roster members can delay resolution.
export function receivedBoardResponses(state, roster = {}, privateActions = {}) {
  const run = runOf(state), step = stepOf(run), node = state?.board?.locations?.find(item => item.id === step.targetId);
  if (step.phase !== 'answer' || !node) return [];
  return boardRequests(state, roster, privateActions).filter(([uid, action]) => !(has(step.answers, uid) && step.answers[uid]) && action.targetId === step.targetId && validValue(node, action.value)).map(([uid]) => uid);
}

// Board control writes use a fresh document and an atomic update when provided by the transport.
export async function writeBoardDocument(fb, ref, plan) {
  const checked = latest => {
    const patch = plan(latest);
    if (!patch || !Object.keys(patch).length) return null;
    return patch;
  };
  if (ref.__alloMbRef) {
    if (typeof window.__alloLessonBoardConditionalUpdate !== 'function') throw Error('Reload the app before changing the live board.');
    return window.__alloLessonBoardConditionalUpdate(ref, checked);
  }
  if (!ref.__alloLanRef && typeof fb.runTransaction === 'function') {
    return fb.runTransaction(fb.db || window.__alloShared?.db, async transaction => {
      const snapshot = await transaction.get(ref), patch = checked(snapshot.data());
      if (patch) transaction.update(ref, patch);
    });
  }
  const snapshot = await fb.getDoc(ref), patch = checked(snapshot.data());
  if (patch) await fb.updateDoc(ref, patch);
}
