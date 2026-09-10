import { available, complete, hintLevel, inventory } from './connected_escape_room_engine.js';
import { supportPatch } from './connected_escape_room_learning.js';
import { EvidenceContext } from './connected_escape_room_collaboration.jsx';
const React = window.React;
const { useState, useRef, useEffect } = React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function TeacherSupport({ room, progress, busy, onWrite, t }) {
  const hintId = React.useId();
  const [selection, setSelection] = useState({ nodeId: '', level: 1 }), [reason, setReason] = useState('guidance');
  const [confirmation, setConfirmation] = useState(null), [notice, setNotice] = useState('');
  const pickerRef = useRef(null), cancelRef = useRef(null), rescueRef = useRef(null), mounted = useRef(true), sending = useRef(false), restoreRescue = useRef(false), focusPicker = useRef(false), lastFocus = useRef(null), shareRef = useRef(null), focusHint = useRef(false);
  const finished = complete(room, progress), ready = finished ? [] : room.nodes.filter(n => progress?.solved?.[n.id] !== true && available(room, progress, n));
  const target = ready.find(n => n.id === selection.nodeId), level = target ? hintLevel(progress, target.id) : 0;
  const shared = !!target && selection.level <= level;
  const latest = useRef({ room, progress }); latest.current = { room, progress };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (confirmation) cancelRef.current?.focus(); }, [confirmation]);
  useEffect(() => {
    if (restoreRescue.current && !busy && !confirmation) { restoreRescue.current = false; rescueRef.current?.focus(); }
    if (focusPicker.current && !busy && !confirmation) { focusPicker.current = false; pickerRef.current?.focus(); }
    if (focusHint.current && !busy) { focusHint.current = false; shareRef.current?.focus(); }
  }, [confirmation, busy, selection]);
  useEffect(() => {
    if (selection.nodeId && !target) {
      const name = room.nodes.find(n => n.id === selection.nodeId)?.name || '';
      setNotice(tr(t, 'support_object_completed', '{name} is already complete. Choose another object if the team needs support.', { name }));
      if (lastFocus.current && !lastFocus.current.isConnected && document.activeElement === document.body) focusPicker.current = true;
      setConfirmation(null); if (focusPicker.current && !confirmation) { focusPicker.current = false; pickerRef.current?.focus(); } setSelection({ nodeId: '', level: 1 });
    }
  }, [target?.id, selection.nodeId, confirmation, room, t]);
  const select = nodeId => { setSelection({ nodeId, level: Math.min(3, hintLevel(progress, nodeId) + 1) }); setConfirmation(null); setNotice(''); };
  const cancel = () => { restoreRescue.current = true; setConfirmation(null); };
  const send = async choice => {
    if (busy || sending.current || !mounted.current) return;
    const current = latest.current, patch = supportPatch(current.room, current.progress, choice);
    if (!Object.keys(patch).length) return;
    sending.current = true;
    try {
      if (await onWrite(patch) && mounted.current) {
        if (choice.kind === 'rescue') { focusPicker.current = true; setConfirmation(null); }
        setNotice(choice.kind === 'hint' ? tr(t, 'hint_shared_confirmed', 'Hint {number} shared for {name}.', { number: choice.level, name: current.room.nodes.find(n => n.id === choice.nodeId).name }) : tr(t, 'rescue_shared_confirmed', 'Teacher support recorded. The discovery is now shared with the team.'));
      }
    } finally { sending.current = false; }
  };
  return <section className="cer-panel" onFocusCapture={event => { lastFocus.current = event.target; }} data-teacher-support aria-label={tr(t, 'targeted_support', 'Targeted support')}>
    <h3>{tr(t, 'targeted_support', 'Targeted support')}</h3>
    <p className={notice ? 'cer-alert' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true">{notice}</p>
    <label>{tr(t, 'choose_object', 'Choose an available object')}<select ref={pickerRef} data-support-picker value={target?.id || ''} disabled={busy || !!confirmation} onChange={event => select(event.target.value)}><option value="">{tr(t, 'select_object', 'Select an object')}</option>{ready.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></label>
    {!target && <p className="cer-muted">{finished ? tr(t, 'support_finished', 'The exit is open. Use the debrief to discuss the discoveries.') : tr(t, 'support_choose_help', 'Choose an object to preview a hint or provide a rescue unlock.')}</p>}
    {target && <>
      <p>{target.instruction}</p>
      {target.requires.length > 0 && <details><summary>{tr(t, 'team_evidence_preview', 'Evidence available to the team')}</summary><EvidenceContext node={target} found={inventory(room, progress)} t={t}/></details>}
      <div id={hintId} data-hint-preview className="cer-evidence-context"><h4>{tr(t, 'hint_preview_number', 'Hint {number} of 3', { number: selection.level })}</h4><p>{target.hints[selection.level - 1]}</p><p className="cer-muted">{shared ? tr(t, 'preview_hint_shared', 'This hint has already been shared with the team.') : tr(t, 'preview_hint_private', 'Teacher preview. The team will receive this exact hint when you share it.')}</p></div>
      <button ref={shareRef} type="button" disabled={busy || !!confirmation} aria-disabled={busy || !!confirmation || shared || level >= 3} data-share-hint aria-describedby={hintId} onClick={() => { if (!shared && level < 3) send({ kind: 'hint', nodeId: target.id, level: selection.level }); }}>{tr(t, 'share_hint', 'Share the next hint')}</button>
      {shared && level < 3 && <button type="button" disabled={busy || !!confirmation} data-preview-next-hint onClick={() => { focusHint.current = true; setSelection({ nodeId: target.id, level: level + 1 }); }}>{tr(t, 'preview_next_hint', 'Preview the next hint')}</button>}
      {level >= 3 && <p className="cer-muted">{tr(t, 'all_hints_shared', 'All three hints have been shared.')}</p>}
      <label>{tr(t, 'rescue_reason', 'Reason for a rescue unlock')}<select value={reason} disabled={busy || !!confirmation} onChange={e => setReason(e.target.value)}><option value="guidance">{tr(t, 'reason_guidance', 'Additional learning support')}</option><option value="technical">{tr(t, 'reason_technical', 'Technical difficulty')}</option><option value="time">{tr(t, 'reason_time', 'Class time')}</option></select></label>
      <button ref={rescueRef} type="button" disabled={busy || !!confirmation} onClick={() => setConfirmation({ kind: 'rescue', nodeId: target.id, reason })}>{tr(t, 'rescue', 'Unlock this object for the team')}</button>
      {confirmation && <div data-rescue-confirm className="cer-alert" role="group" aria-describedby={hintId + '-rescue'} aria-label={tr(t, 'rescue_review', 'Review rescue unlock')} onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); event.stopPropagation(); cancel(); } }}>
        <p id={hintId + '-rescue'}>{tr(t, 'rescue_confirm_detail', 'Complete {name} and share {discovery} with everyone? This will be recorded as teacher support.', { name: target.name, discovery: target.reward.name })}</p>
        {target.id === room.exitNodeId && <p>{tr(t, 'rescue_exit_warning', 'This opens the final exit and completes the room for everyone.')}</p>}
        <div className="cer-row"><button type="button" disabled={busy} data-confirm-rescue onClick={() => send(confirmation)}>{tr(t, 'confirm_rescue', 'Confirm rescue unlock')}</button><button ref={cancelRef} type="button" disabled={busy} onClick={cancel}>{tr(t, 'cancel', 'Cancel')}</button></div>
      </div>}
      <p className="cer-muted">{tr(t, 'rescue_note', 'Rescue unlocks are recorded as teacher support. They do not remove discoveries made by students.')}</p>
    </>}
  </section>;
}
