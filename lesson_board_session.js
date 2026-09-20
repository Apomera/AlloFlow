import { runOf, stepOf, derive } from './lesson_board_engine.js';
import { roleAssignments } from './lesson_board_roles.js';

// This is a local orientation marker, not a transport timestamp or a saved game.
// Keep answers, names, and lesson content out of this small per-learner marker.
export function boardCheckpoint(state) {
  const run = runOf(state), step = stepOf(run);
  return JSON.stringify([run.turn, step.phase, step.targetId || '', step.retryRound || 0, !!state.isPaused]);
}

export function readBoardCheckpoint(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (!raw || raw.length > 300) return null;
    const value = JSON.parse(raw);
    return Array.isArray(value) && value.length === 5 && Number.isInteger(value[0]) && value[0] >= 0 &&
      ['choose', 'answer', 'review'].includes(value[1]) && typeof value[2] === 'string' &&
      Number.isInteger(value[3]) && value[3] >= 0 && typeof value[4] === 'boolean' ? raw : null;
  } catch (_) { return null; }
}

export function boardOrientation(state, roster, uid, pending) {
  const board = state.board, run = runOf(state), step = stepOf(run), progress = derive(board, run);
  const joined = state.teams?.[uid] === 'All', answered = !!step.answers?.[uid], proposed = !!step.votes?.[uid];
  const phase = progress.complete ? 'complete' : step.phase;
  const next = !joined ? 'join' : state.isPaused ? 'paused' : pending ? 'delivery' : progress.complete ? 'complete' :
    phase === 'answer' ? answered ? 'answered' : step.retryRound ? 'retry' : 'answer' :
    phase === 'review' ? 'review' : proposed ? 'proposed' : 'choose';
  const recent = Object.entries(run.steps || {}).filter(([key, value]) => /^t\d+$/.test(key) && Number(key.slice(1)) <= run.turn && value.result)
    .sort(([a], [b]) => Number(b.slice(1)) - Number(a.slice(1)))[0]?.[1];
  const recentNode = recent && [...board.locations, ...board.projects].find(node => node.id === recent.targetId);
  return {
    turn: run.turn + 1, phase, next, progress,
    target: [...board.locations, ...board.projects].find(node => node.id === step.targetId)?.name || '',
    roles: roleAssignments(state.boardRoles, roster, run.turn).filter(role => role.uid === uid),
    recent: recentNode ? { name: recentNode.name, outcome: recentNode.cost ? 'built' : recent.result.success ? 'explored' : 'review' } : null,
  };
}
