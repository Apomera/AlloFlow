import * as engine from './connected_escape_room_engine.js';
export function soloStorageKey(room, uid = 'local') {
  const value = JSON.stringify(room); let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return 'allo-connected-solo:' + encodeURIComponent(uid || 'local') + ':' + (hash >>> 0).toString(16);
}
export function restoreSolo(room, raw) {
  const fresh = { version: 1, room: JSON.stringify(room), attemptId: engine.identity('solo'), progress: engine.emptyProgress() };
  if (!raw || raw.version !== 1 || raw.room !== fresh.room || typeof raw.attemptId !== 'string' || !/^solo_[a-zA-Z0-9_-]{1,100}$/.test(raw.attemptId)) return fresh;
  fresh.attemptId = raw.attemptId;
  // Restore only known discoveries whose prerequisites can actually be reached.
  for (let pass = 0; pass < room.nodes.length; pass++) for (const node of room.nodes) {
    if (raw.progress?.solved?.[node.id] === true && engine.available(room, fresh.progress, node)) fresh.progress.solved[node.id] = true;
  }
  for (const node of room.nodes) if (engine.available(room, fresh.progress, node)) {
    for (let h = 1; h <= 3 && raw.progress?.hints?.[node.id]?.['h' + h] === true; h++) {
      (fresh.progress.hints[node.id] ||= {})['h' + h] = true;
    }
  }
  return fresh;
}
export function soloAction(room, state, nodeId, kind, value) {
  const request = { attemptId: state.attemptId, requestId: engine.identity('solo_action'), nodeId, kind, value };
  const patch = engine.planRequest(room, state.progress, request, 'solo', { attemptId: state.attemptId, active: true, paused: false });
  const progress = engine.mergeProgress(state.progress, patch), code = progress.receipts[request.requestId]?.code || 'invalid';
  progress.receipts = {};
  return { state: { ...state, progress }, code };
}
