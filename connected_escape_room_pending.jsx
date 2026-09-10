const React = window.React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function PendingActionNotice({ room, action, onSelect, onControlFocus, t }) {
  if (!action) return null;
  const { request, sending, slow, error, needsRecovery, retryBlocked, onRetry } = action;
  const node = room.nodes.find(n => n.id === request.nodeId);
  if (!node) return null;
  return <div className="cer-alert" data-pending-action onFocusCapture={event => onControlFocus(event.target)}>
    <p><strong>{request.kind === 'hint' ? tr(t, 'pending_hint_for', 'Hint requested for {name}', { name: node.name }) : tr(t, 'pending_action_for', 'Action submitted for {name}', { name: node.name })}</strong></p>
    <p role="status" aria-live="polite" aria-atomic="true">{sending ? slow ? tr(t, 'sending_slow', 'Your action is still being sent. Keep this tab open while the connection finishes.') : tr(t, 'sending', 'Sending your action…') : error ? tr(t, 'retry_action_ready', 'Your action is ready to retry.') : needsRecovery ? tr(t, 'restored_action_ready', 'Your saved action has not been confirmed. You can retry the same action now.') : tr(t, 'awaiting_teacher', 'Waiting for the teacher to confirm your action. Team progress changes after confirmation.')}</p>
    <p className="cer-muted">{tr(t, 'prepare_while_waiting', 'You can read clues and prepare settings on other ready objects. Submit another action after this one is confirmed.')}</p>
    {(slow || error || needsRecovery) && <p>{error || needsRecovery ? tr(t, 'retry_kept_action', 'Retry sends this same action. Settings you prepare on other objects stay in your draft.') : sending ? tr(t, 'pending_send_help', 'A send is already in progress. You can continue exploring while it finishes.') : tr(t, 'slow_confirmation', 'Confirmation is taking longer. Your action is kept. Check the connection and make sure the teacher’s live session is open.')}</p>}
    <div className="cer-row"><button type="button" data-return-pending onClick={() => onSelect(node.id)}>{tr(t, 'return_pending', 'Return to {name}', { name: node.name })}</button>{(slow || error || needsRecovery) && <button type="button" data-retry-pending aria-disabled={retryBlocked} onClick={() => { if (!retryBlocked) onRetry(); }}>{tr(t, 'retry_same', 'Retry this action')}</button>}</div>
  </div>;
}
