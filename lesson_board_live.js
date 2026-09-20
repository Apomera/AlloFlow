import { runOf, stepOf, validAction, validValue } from './lesson_board_engine.js';

// Only current, usable responses from roster members can delay resolution.
export function receivedBoardResponses(state, roster = {}) {
  if (state?.mode !== 'lesson-board' || !state.isActive) return [];
  const run = runOf(state), step = stepOf(run), node = state.board?.locations?.find(item => item.id === step.targetId);
  if (step.phase !== 'answer' || !node) return [];
  return Object.entries(state.teamProgress?.All?.boardActions || {}).filter(([uid, action]) =>
    Object.prototype.hasOwnProperty.call(roster, uid) && state.teams?.[uid] === 'All' && !step.answers?.[uid] &&
    validAction(action, state.attemptId, run.turn, step.retryRound || 0) && action.kind === 'answer' && action.targetId === step.targetId &&
    step.seen?.[uid]?.requestId !== action.requestId && validValue(node, action.value)
  ).map(([uid]) => uid);
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
