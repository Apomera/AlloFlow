import * as engine from './connected_escape_room_engine.js';

export function restorePending(room, attemptId, raw) {
  if (typeof raw !== 'string' || raw.length > 1500) return null;
  try {
    const request = JSON.parse(raw);
    return engine.validRequest(request, attemptId) && room?.nodes?.some(node => node.id === request.nodeId) ? request : null;
  } catch (_) { return null; }
}
export function matchingReceipt(progress, request, uid) {
  const receipt = request && progress?.receipts?.[request.requestId];
  return receipt?.uid === uid && receipt?.nodeId === request?.nodeId && typeof receipt?.code === 'string' ? receipt : null;
}
// The host queue and teacher count use the same current-party membership check.
export function pendingHostActions(state, roster, progress) {
  return Object.entries(state?.teamProgress?.All?.connectedActions || {}).filter(([uid, request]) =>
    state.teams?.[uid] === 'All' && roster?.[uid] && engine.validRequest(request, state.attemptId) && !progress?.receipts?.[request.requestId]);
}

export function samePendingRequest(left, right) {
  return !!(right && engine.validRequest(left, right.attemptId) && engine.validRequest(right, right.attemptId) && ['attemptId', 'requestId', 'nodeId', 'kind', 'value'].every(key => left[key] === right[key]));
}
