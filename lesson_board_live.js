import { runOf, stepOf, validAction, validValue } from './lesson_board_engine.js';

// The action each learner has waiting for the current window: a private answer document wins over the
// shared slot when private answers are on (see lesson_board_private.js); votes always use the shared slot.
export function boardRequests(state, roster = {}, privateActions = {}) {
  if (state?.mode !== 'lesson-board' || !state.isActive) return [];
  const run = runOf(state), step = stepOf(run), kind = step.phase === 'choose' ? 'vote' : step.phase === 'answer' ? 'answer' : '';
  if (!kind) return [];
  const shared = state.teamProgress?.All?.boardActions || {}, own = state.privateAnswers === true && kind === 'answer' ? privateActions || {} : {};
  return [...new Set([...Object.keys(shared), ...Object.keys(own)])].map(uid => {
    const usable = action => action && action.kind === kind && validAction(action, state.attemptId, run.turn, step.retryRound || 0) && step.seen?.[uid]?.requestId !== action.requestId;
    return [uid, usable(own[uid]) ? own[uid] : usable(shared[uid]) ? shared[uid] : null];
  }).filter(([uid, action]) => action && Object.prototype.hasOwnProperty.call(roster, uid) && state.teams?.[uid] === 'All');
}
// Only current, usable responses from roster members can delay resolution.
export function receivedBoardResponses(state, roster = {}, privateActions = {}) {
  const run = runOf(state), step = stepOf(run), node = state?.board?.locations?.find(item => item.id === step.targetId);
  if (step.phase !== 'answer' || !node) return [];
  return boardRequests(state, roster, privateActions).filter(([uid, action]) => !step.answers?.[uid] && action.targetId === step.targetId && validValue(node, action.value)).map(([uid]) => uid);
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
