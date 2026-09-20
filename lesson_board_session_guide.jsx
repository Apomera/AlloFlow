import { boardCheckpoint, readBoardCheckpoint, boardOrientation } from './lesson_board_session.js';
import { useBoardOnline, BOARD_DELIVERY_TIMEOUT_MS } from './lesson_board_delivery.js';
import { tr } from './lesson_board_strings.js';
const React = window.React;
const { useState, useRef, useEffect } = React;

export function BoardSessionGuide({ state, roster, uid, scope, online, pending, delivery, sending, joining, onContinue, t }) {
  const checkpoint = boardCheckpoint(state), storageKey = 'allo-board-place:' + scope;
  const current = boardOrientation(state, roster, uid, pending);
  const [saved] = useState(() => { try { return readBoardCheckpoint(sessionStorage, storageKey); } catch (_) { return null; } });
  const [open, setOpen] = useState(!!saved || current.turn > 1 || current.phase !== 'choose');
  const [returnReason, setReturnReason] = useState(saved ? saved === checkpoint ? 'resume' : 'changed' : '');
  const lastShown = useRef(saved || checkpoint), latest = useRef({ checkpoint, online }), wasOnline = useRef(online);
  latest.current = { checkpoint, online };
  const remember = () => {
    if (!latest.current.online || document.visibilityState === 'hidden') return;
    lastShown.current = latest.current.checkpoint;
    try { sessionStorage.setItem(storageKey, latest.current.checkpoint); } catch (_) { /* Optional orientation only. */ }
  };
  useEffect(() => { remember(); }, [checkpoint, online]);
  useEffect(() => {
    if (online && !wasOnline.current) { setReturnReason('reconnected'); setOpen(true); }
    wasOnline.current = online;
  }, [online]);
  useEffect(() => {
    const returned = () => {
      if (document.visibilityState === 'hidden') return;
      if (lastShown.current !== latest.current.checkpoint) { setReturnReason('changed'); setOpen(true); }
      remember();
    };
    document.addEventListener('visibilitychange', returned);
    return () => document.removeEventListener('visibilitychange', returned);
  }, [storageKey]);

  const phases = {
    choose: tr(t, 'session_phase_choose', 'Choosing a route'),
    answer: tr(t, 'session_phase_answer', 'Activity open'),
    review: tr(t, 'session_phase_review', 'Shared review'),
    complete: tr(t, 'session_phase_complete', 'Mission complete'),
  };
  const nextSteps = {
    join: tr(t, 'session_next_join', 'Join the shared board to take part in this move.'),
    paused: tr(t, 'session_next_paused', 'The teacher paused the board. Review the current move; responding resumes when the teacher continues.'),
    delivery: tr(t, 'session_next_delivery', 'Check your pending action below before sending anything else.'),
    complete: tr(t, 'session_next_complete', 'Review the shared journey, then complete your own reflection and practice.'),
    answer: tr(t, 'session_next_answer', 'Read the lesson evidence and submit your response to the current activity.'),
    retry: tr(t, 'session_next_retry', 'A new try is open. Use the shared feedback and submit a new response.'),
    answered: tr(t, 'session_next_answered', 'Your response is confirmed. Wait for the teacher to open the shared review.'),
    review: tr(t, 'session_next_review', 'Review the explanation with the class. The teacher will choose whether to retry or move on.'),
    proposed: tr(t, 'session_next_proposed', 'Your route proposal is confirmed. Discuss the options while the teacher chooses the next move.'),
    choose: tr(t, 'session_next_choose', 'Explore the available locations and propose a route. The teacher chooses the shared move.'),
  };
  const connection = !online ? tr(t, 'device_offline', 'Your device reports it is offline. The board may be out of date. Keep this page open. You can still retry if your session connection is available.') :
    joining ? tr(t, 'session_joining', 'Joining the shared board…') :
    sending ? tr(t, 'session_sending', 'Sending your action…') :
    pending ? state.isPaused ? tr(t, 'session_kept_paused', 'Board paused. Your pending action is kept on this page.') :
      delivery === 'sent' ? tr(t, 'session_waiting_confirmation', 'Action sent; waiting for teacher confirmation.') : tr(t, 'session_check_delivery', 'Action delivery needs checking. Review its status below.') :
    state.isPaused ? tr(t, 'session_paused', 'The teacher paused this board.') :
    tr(t, 'session_received_view', 'Showing the board state received on this device.');
  const returned = returnReason === 'changed' ? tr(t, 'session_changed', 'The board changed since you last viewed it. Review the current move before continuing.') :
    returnReason === 'reconnected' ? tr(t, 'session_reconnected', 'Your device reports it is back online. Check the current move; the session may still be catching up.') :
    returnReason === 'resume' ? tr(t, 'session_resumed', 'Welcome back. Here is your place in the shared board.') : '';
  const continueToBoard = () => { onContinue?.(); setReturnReason(''); setOpen(false); };
  return <section className="lb-panel lb-session-guide" data-board-session-guide aria-label={tr(t, 'session_guide', 'Your live-session guide')}>
    <p role={pending ? undefined : "status"} data-board-connection-status data-board-offline={!online ? '' : undefined}>{connection}</p>
    <p role="status" data-board-return-notice hidden={!returned}>{returned}</p>
    <details open={open} onToggle={event => setOpen(event.currentTarget.open)}>
      <summary>{tr(t, 'session_current_step', 'Move {move} · {phase} · Your next step', { move: current.turn, phase: phases[current.phase] })}</summary>
      {current.target && <p><strong>{tr(t, 'session_current_location', 'Current location: {location}', { location: current.target })}</strong></p>}
      <p data-board-next-step>{nextSteps[current.next]}</p>
      <button type="button" data-board-guide-continue onClick={continueToBoard}>{tr(t, 'session_go_current', 'Go to current move')}</button>
      <p className="lb-muted">{tr(t, 'session_progress', 'Shared progress: {concepts} of {total} concepts explored · Projects built: {projects}.', { concepts: current.progress.concepts.length, total: state.board.concepts.length, projects: current.progress.built.length })}</p>
      {current.recent && <p data-board-last-move>{tr(t, 'session_last_move', 'Most recent result: {location} · {outcome}', { location: current.recent.name, outcome: current.recent.outcome === 'built' ? tr(t, 'built', 'Built') : current.recent.outcome === 'explored' ? tr(t, 'explored', 'Explored') : tr(t, 'session_needs_review', 'Needs another look') })}</p>}
      {state.boardRoles?.enabled && <div data-board-your-roles>{current.roles.length ? current.roles.map(role => <p key={role.id}><strong>{tr(t, role.key, role.label)}: </strong>{tr(t, role.helpKey, role.help)}</p>) : <p>{tr(t, 'session_role_contributor', 'You are a contributor for this move. Offer ideas and respond to the activity; roles rotate as the class moves on.')}</p>}</div>}
      <p className="lb-muted">{tr(t, 'session_connection_help', 'Live play needs the teacher’s board open and connected. If this view seems out of date, ask the teacher to check their session.')}</p>
    </details>
  </section>;
}

export function BoardTeacherConnection({ busy, t }) {
  const online = useBoardOnline(), [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const timer = setTimeout(() => setSlow(true), BOARD_DELIVERY_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [busy]);
  if (!online) return <p role="status" className="lb-notice" data-board-teacher-offline>{tr(t, 'session_teacher_offline', 'Your device reports it is offline. Learner confirmations and board controls may be delayed. Keep the shared board open while the connection recovers.')}</p>;
  if (busy && slow) return <p role="status" className="lb-notice" data-board-teacher-slow>{tr(t, 'session_teacher_slow', 'This board update is still waiting for confirmation. Keep this page open and check your connection. Controls will become available when this request finishes.')}</p>;
  return null;
}
