import * as engine from './connected_escape_room_engine.js';
import { RoomFlowReview } from './connected_escape_room_flow.jsx';
import { restorePending, matchingReceipt, pendingHostActions, samePendingRequest } from './connected_escape_room_pending.js';
import { PendingActionNotice } from './connected_escape_room_pending.jsx';
import { RoomDebrief } from './connected_escape_room_debrief.jsx';
import { TeacherSupport } from './connected_escape_room_support.jsx';
import { RoomTransfer } from './connected_escape_room_transfer.jsx';
import { InvestigationGuide, DiscoveryUpdate } from './connected_escape_room_navigation.jsx';
import { ROOM_LIBRARY_LIMIT, readLibrary, saveLibraryRoom, selectLibraryRoom, removeLibraryRoom, sameRoom } from './connected_escape_room_library.js';
import { reviewNodes, reviewRoom } from './connected_escape_room_review.js';
import { soloStorageKey, restoreSolo, soloAction } from './connected_escape_room_solo.js';
import { useRoomDialog } from './connected_escape_room_accessibility.jsx';
import { useRoomWorkspace, TeamActivityBoard, EvidenceContext } from './connected_escape_room_collaboration.jsx';
const React = window.React;
const { useState, useEffect, useRef, useMemo } = React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
const connection = (appId, code) => {
  const fb = window.__alloFirebase || {};
  if (!fb.doc || !fb.updateDoc || !(fb.db || window.__alloShared?.db) || !appId || !code) throw Error('The live session connection is unavailable.');
  return { fb, ref: fb.doc(fb.db || window.__alloShared.db, 'artifacts', appId, 'public', 'data', 'sessions', code) };
};
const progressOf = state => state?.teamProgress?.All?.connected?.[state.attemptId] || engine.emptyProgress();
const scopedPatch = (state, patch) => Object.fromEntries(Object.entries(patch).map(([key, value]) => ['escapeRoomState.teamProgress.All.connected.' + state.attemptId + '.' + key, value]));
const runtime = { locks: new Set(), errors: new Map(), listeners: new Set(), emit() { this.listeners.forEach(fn => fn()); } };
function useRuntimeError(scope) {
  const [, update] = useState(0);
  useEffect(() => { const listener = () => update(n => n + 1); runtime.listeners.add(listener); return () => runtime.listeners.delete(listener); }, []);
  return runtime.errors.get(scope) || '';
}
const css = `.cer{--control:#778198;--cb:#f6f7fc;--cp:#fff;--ci:#20243d;--cs:#535d75;--cl:#ccd2e3;--ca:#5036ab;--cf:#eeebfc;color:var(--ci);background:var(--cb);font:400 1rem/1.55 system-ui,sans-serif;overflow-wrap:anywhere}.dark .cer{--control:#8c99b5;--cb:#171b29;--cp:#232a3c;--ci:#f4f5fb;--cs:#c3cbe0;--cl:#4f5b77;--ca:#c6b9ff;--cf:#393250}.cer *{box-sizing:border-box}.cer h2{font-size:1.5em;font-weight:750;margin:0 0 8px}.cer h3{font-size:1.1em;font-weight:700;margin:0 0 10px}.cer p{margin:8px 0 14px}.cer button,.cer input,.cer select,.cer textarea{font:inherit}.cer button{min-width:44px;min-height:44px;padding:9px 13px;border:1px solid var(--cl);border-radius:10px;background:var(--cp);color:var(--ci);cursor:pointer}.cer button:hover:enabled,.cer button[aria-pressed=true]{background:var(--cf);border-color:var(--ca)}.cer button:disabled,.cer button[aria-disabled=true]{opacity:.6;cursor:default}.cer :focus-visible{outline:3px solid var(--ca);outline-offset:3px}.cer .cer-primary{background:var(--ca);color:var(--cp);font-weight:650}.dark .cer .cer-primary{color:#171b29}.cer .cer-primary:hover:enabled{background:var(--ci);color:var(--cp)}.cer input,.cer select,.cer textarea{width:100%;min-width:0;min-height:44px;border:1px solid var(--cl);border-radius:8px;border-color:var(--control);background:var(--cp);color:var(--ci);padding:8px}.cer textarea{min-height:90px}.cer label{display:block;margin:9px 0}.cer small,.cer .cer-muted{color:var(--cs);font-size:.87em}.cer .cer-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.cer .cer-between{justify-content:space-between}.cer .cer-panel{background:var(--cp);border:1px solid var(--cl);padding:18px;border-radius:14px;min-width:0}.cer .cer-layout{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:18px;margin-top:18px}.cer .cer-objects{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:14px 0}.cer .cer-objects button{text-align:left;min-height:75px}.cer .cer-objects small{display:block;margin-top:4px}.cer .cer-journal p{border-left:3px solid var(--cl);padding-left:12px;white-space:pre-wrap}.cer .cer-journal h3{margin-top:15px}.cer .cer-controls{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px}.cer .cer-sequence{list-style:none;padding:0}.cer .cer-sequence li{display:flex;align-items:center;gap:7px;margin:7px 0;padding:7px 0;border-bottom:1px solid var(--cl)}.cer .cer-sequence li span{flex:1;min-width:0}.cer .cer-alert{padding:12px;border:1px solid var(--cl);border-radius:10px;background:var(--cf);margin:12px 0}.cer .cer-error{color:#9e1d36;background:#fff1f3;border-color:#e4a1ad}.dark .cer .cer-error{color:#ffdbe1;background:#4c2031}.cer details{margin:12px 0;border-top:1px solid var(--cl);padding-top:10px}.cer summary{cursor:pointer;font-weight:650;min-height:44px;padding:10px 0}.cer .cer-progress{height:8px;border-radius:5px;background:var(--cl);overflow:hidden;margin:14px 0}.cer .cer-progress>div{height:100%;background:var(--ca)}.cer-overlay{position:fixed;inset:0;z-index:9999;overflow:auto}.cer-shell{max-width:1150px;margin:0 auto;padding:22px}.cer-modal-backdrop{position:fixed;inset:0;z-index:10000;background:#101528bb;overflow:auto;display:flex;align-items:flex-start;justify-content:center;padding:24px 12px}.cer-modal{width:min(1050px,100%);padding:24px;border-radius:18px;box-shadow:0 15px 60px #0005}.cer-teacher{border:1px solid var(--cl);border-radius:16px;padding:20px}.cer .cer-map{display:block;width:100%;max-width:420px;margin:auto}.cer .cer-map text{font:16px system-ui;fill:var(--ci)}.cer .cer-map line{stroke:var(--control);stroke-width:1}.cer .cer-map circle{fill:var(--ca)}.cer .cer-directions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;max-width:310px;margin:10px auto}.cer .cer-directions button:first-child{grid-column:2}.cer .cer-directions button:nth-child(2){grid-column:1}.cer .cer-evidence-context{background:var(--cf);border:1px solid var(--cl);border-radius:10px;padding:14px;margin:14px 0}.cer .cer-evidence-context h4{margin:0 0 10px;font-size:1em}.cer .cer-evidence-context p{white-space:pre-wrap;margin:4px 0 12px}.cer .cer-evidence-context div:last-child p{margin-bottom:0}.cer .cer-activity-list{list-style:none;padding:0;display:grid;gap:10px}.cer .cer-activity-list li{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.cer .cer-activity-list small{flex-basis:100%}.cer .cer-activity-waiting{color:var(--ca)}.cer .cer-guide-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px}.cer .cer-guide-objects{list-style:none;margin:0;padding:0;display:grid;gap:8px}.cer .cer-guide-objects button{width:100%;text-align:left}.cer .cer-guide-objects small{display:block}.cer .cer-reading-nav{margin:14px 0}.cer .cer-debrief{margin:16px 0}.cer .cer-debrief h4{margin:12px 0 6px}.cer blockquote{margin:12px 0;border-left:3px solid var(--cl);padding-left:12px;white-space:pre-wrap}.cer .cer-library{background:var(--cp);border:1px solid var(--cl);border-radius:12px;padding:12px}.cer .cer-facts{padding-left:20px}.cer .cer-facts li{margin:8px 0}.cer [tabindex],.cer button,.cer summary{scroll-margin:16px}.cer .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(forced-colors:active){.cer button,.cer input,.cer select,.cer textarea,.cer-panel{border:1px solid ButtonText}.cer :focus-visible{outline:3px solid Highlight}.cer .cer-progress>div{background:Highlight}.cer .cer-map circle{fill:CanvasText}.cer .cer-map line{stroke:CanvasText}.cer .cer-map text{fill:CanvasText}}@media(max-width:640px){.cer .cer-layout{grid-template-columns:1fr}.cer-shell,.cer-modal{padding:15px}.cer .cer-panel{padding:14px}.cer .cer-objects{grid-template-columns:repeat(2,minmax(0,1fr))}.cer .cer-controls{grid-template-columns:1fr}.cer-modal-backdrop{padding:12px 6px}.cer input,.cer select,.cer textarea{font-size:max(1rem,16px)}}`;
function Styles() { return <style>{css}</style>; }
function roomStatus(t, code, solo = false) {
  const values = {
    discovered: 'Discovery confirmed. Your team’s journal and inventory are updated.', escaped: 'The exit is open. Your team completed the room.', hint: 'The next hint is now shared with your team.', already: 'A teammate already completed this object. Your progress is shared.',
    'try-again': 'That did not activate the device. Compare its settings with the evidence in your journal and try again.', locked: 'Find the required discoveries first, then try this interaction again.', paused: 'The teacher paused the room. Your draft is kept; submit again after play resumes.', ended: 'This room has ended.', finished: 'Your team has already opened the exit.', invalid: 'This action is no longer available. Reopen the object and try again.'
  };
  const personal = { discovered: 'Discovery collected. Your journal and inventory are updated.', escaped: 'The exit is open. You completed the room.', hint: 'Your next hint is ready.', already: 'You already completed this object.', finished: 'You have already opened the exit.' };
  return solo && personal[code] ? tr(t, 'solo_status_' + code, personal[code]) : tr(t, 'status_' + code, values[code] || values.invalid);
}
function RouteMap({ node, position, onChange, disabled, t }) {
  const size = node.grid.size, step = 230 / (size - 1);
  return <><svg className="cer-map" viewBox="0 0 300 295" role="img" aria-label={tr(t, 'position', 'Position: column {x}, row {y}.', { x: position[0], y: position[1] })}><text x="150" y="20" textAnchor="middle">{tr(t, 'north_rows', 'North ↑ · Rows')}</text>{Array.from({ length: size }, (_, i) => <g key={i}><line x1={40 + i * step} y1="35" x2={40 + i * step} y2="265"/><line x1="40" y1={35 + i * step} x2="270" y2={35 + i * step}/><text x={40 + i * step} y="288" textAnchor="middle">{i + 1}</text><text x="21" y={271 - i * step} textAnchor="middle">{i + 1}</text></g>)}<circle cx={40 + (position[0] - 1) * step} cy={265 - (position[1] - 1) * step} r="8"/></svg><p role="status" aria-live="polite" aria-atomic="true">{tr(t, 'position', 'Position: column {x}, row {y}.', { x: position[0], y: position[1] })} {tr(t, 'axis_rule', 'East increases columns; north increases rows.')}</p><div className="cer-directions">{[['north', 'North', 0, 1], ['west', 'West', -1, 0], ['south', 'South', 0, -1], ['east', 'East', 1, 0]].map(([id, label, dx, dy]) => <button type="button" key={id} data-direction={id} disabled={disabled} aria-disabled={disabled || position[0] + dx < 1 || position[0] + dx > size || position[1] + dy < 1 || position[1] + dy > size} onClick={() => { const next = [position[0] + dx, position[1] + dy]; if (next.every(value => value >= 1 && value <= size)) onChange(next); }}>{tr(t, id, label)}</button>)}</div></>;
}
export function RoomView({ room, progress, onAction, disabled = false, notice = '', workspaceKey, activityData, pendingAction, solo = false, t }) {
  const [workspace, setWorkspace, storageStatus] = useRoomWorkspace(room, workspaceKey), detailRef = useRef(null), journalRef = useRef(null), focusSelection = useRef(false), submittedFocus = useRef(null), debriefRef = useRef(null), noticeRef = useRef(null), pendingControlRef = useRef(null);
  const [movementNotice, setMovementNotice] = useState('');
  const { selectedId, drafts } = workspace;
  const areaId = room.nodes.find(n => n.id === selectedId)?.areaId || room.areas[0].id;
  const selectObject = (id, focus = false) => { if (!room.nodes.some(n => n.id === id)) return; focusSelection.current = focus; setWorkspace(previous => ({ ...previous, selectedId: id })); };
  useEffect(() => { if (focusSelection.current) { focusSelection.current = false; detailRef.current?.focus(); } }, [workspace.selectedId, workspace]);
  const node = room.nodes.find(n => n.id === selectedId) || room.nodes[0], found = engine.inventory(room, progress);
  const solved = progress.solved?.[node.id] === true, accessible = engine.available(room, progress, node), finished = engine.complete(room, progress), blocked = disabled || solved || !accessible || finished || pendingAction?.request.nodeId === node.id, actionBlocked = blocked || !!pendingAction;
  useEffect(() => {
    const submitted = submittedFocus.current;
    if (solved && submitted?.id === node.id && (document.activeElement === submitted.element || document.activeElement === document.body)) (finished ? debriefRef : detailRef).current?.focus();
    if (solved || submitted?.id !== node.id) submittedFocus.current = null;
  }, [solved, node.id, finished]);
  useEffect(() => {
    if (!pendingAction && pendingControlRef.current) {
      const control = pendingControlRef.current; pendingControlRef.current = null;
      if (!control.isConnected && document.activeElement === document.body && notice) noticeRef.current?.focus();
    }
  }, [pendingAction?.request.requestId, notice]);
  const missing = node.requires.filter(id => !found.some(item => item.id === id)).map(id => room.nodes.find(n => n.reward.id === id)?.reward.name || id);
  const draft = drafts[node.id] ?? engine.initialDraft(node), change = value => setWorkspace(previous => ({ ...previous, drafts: { ...previous.drafts, [node.id]: value } }));
  const value = Array.isArray(draft) ? draft.join(',') : String(draft), incomplete = node.type === 'configure' ? draft.some(v => v === '') : node.type === 'use-tool' ? draft === '' : false, hintCount = engine.hintLevel(progress, node.id);
  return <div className="cer-room"><header><h2>{room.title}</h2><p>{room.mission}</p><div className="cer-row cer-between"><span>{solo ? tr(t, 'solo_room', 'Solo room · Explore at your own pace') : tr(t, 'shared_room', 'One room · Shared discoveries')}</span><span aria-live="polite">{tr(t, 'progress', '{count} of {total} discoveries', { count: found.length, total: room.nodes.length })}</span></div><div className="cer-progress" role="progressbar" aria-label={solo ? tr(t, 'solo_progress', 'Your progress') : tr(t, 'team_progress', 'Team progress')} aria-valuemin={0} aria-valuemax={room.nodes.length} aria-valuenow={found.length}><div style={{ width: (100 * found.length / room.nodes.length) + '%' }}/></div></header>
    {storageStatus === 'unavailable' && <p className="cer-alert" role="status">{tr(t, 'draft_unavailable', 'Draft recovery is unavailable in this tab. Keep the room open to preserve your unfinished settings.')}</p>}
    {!finished && workspaceKey && storageStatus === 'saved' && Object.keys(drafts).length > 0 && <p className="cer-muted">{tr(t, 'draft_saved', 'Your unfinished settings are saved in this tab.')}</p>}
    <p ref={noticeRef} tabIndex={-1} data-action-feedback className={notice ? 'cer-alert' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true">{notice}</p>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{movementNotice}</p>
    <PendingActionNotice room={room} action={pendingAction} onSelect={id => selectObject(id, true)} onControlFocus={element => { pendingControlRef.current = element; }} t={t}/>
    <RoomDebrief room={room} progress={progress} solo={solo} headingRef={debriefRef} onSelect={id => selectObject(id, true)} t={t}/>
    <DiscoveryUpdate room={room} progress={progress} solo={solo} onSelect={id => selectObject(id, true)} t={t}/>
    <InvestigationGuide room={room} progress={progress} selectedId={node.id} onSelect={id => selectObject(id, true)} t={t}/>
    {activityData && <TeamActivityBoard room={room} progress={progress} {...activityData} onSelect={id => selectObject(id, true)} t={t}/>}
    <nav className="cer-row" aria-label={tr(t, 'areas', 'Room areas')}>{room.areas.map(area => <button type="button" key={area.id} aria-pressed={areaId === area.id} onClick={() => selectObject(room.nodes.find(n => n.areaId === area.id)?.id || selectedId)}>{area.name}</button>)}</nav><p className="cer-muted">{room.areas.find(a => a.id === areaId)?.description}</p>
    <div className="cer-objects" aria-label={tr(t, 'objects', 'Objects to inspect')}>{room.nodes.filter(n => n.areaId === areaId).map(n => <button type="button" key={n.id} data-object={n.id} aria-pressed={node.id === n.id} onClick={() => selectObject(n.id)}>{n.name}<small>{progress.solved?.[n.id] ? tr(t, 'complete', 'Complete') : engine.available(room, progress, n) ? tr(t, 'available', 'Ready to investigate') : tr(t, 'needs_discoveries', 'Needs discoveries')}</small></button>)}</div>
    <div className="cer-row cer-reading-nav">{finished && <button type="button" onClick={() => debriefRef.current?.focus()}>{tr(t, 'jump_debrief', 'Jump to room debrief')}</button>}<button type="button" onClick={() => detailRef.current?.focus()}>{tr(t, 'jump_object', 'Jump to selected object')}</button><button type="button" onClick={() => journalRef.current?.focus()}>{tr(t, 'jump_journal', 'Jump to journal')}</button></div>
    <div className="cer-layout"><section className="cer-panel" aria-label={node.name}><h3 ref={detailRef} tabIndex={-1}>{node.name}</h3><p>{node.description}</p>{!accessible && <div className="cer-alert"><p>{tr(t, 'requires', 'Needed: {items}', { items: missing.join(' · ') })}</p><div className="cer-row">{node.requires.filter(id => !found.some(item => item.id === id)).map(id => { const origin = room.nodes.find(n => n.reward.id === id); return <button type="button" key={id} data-find-clue={id} onClick={() => selectObject(origin.id, true)}>{tr(t, 'find_clue', 'Investigate {object}', { object: origin.name })}</button>; })}</div></div>}
      {!solved && <EvidenceContext node={node} found={found} t={t}/>}
      {solved ? <><p>{node.reward.text}</p>{progress.assisted?.[node.id] && <small>{tr(t, 'teacher_assisted', 'Completed with teacher support')}</small>}</> : <><p>{node.instruction}</p><fieldset disabled={blocked} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend className="sr-only">{node.name}</legend>
        {node.type === 'configure' && <div className="cer-controls">{node.controls.map((control, i) => <label key={i}>{control.label}<select data-control={i} value={draft[i]} onChange={event => change(draft.map((v, j) => j === i ? event.target.value : v))}><option value="">{tr(t, 'choose_setting', 'Choose a setting')}</option>{control.options.map((option, j) => <option key={j} value={j}>{option}</option>)}</select></label>)}</div>}
        {node.type === 'use-tool' && <label>{tr(t, 'inventory_tool', 'Tool from your inventory')}<select data-tool value={draft} onChange={event => change(event.target.value)}><option value="">{tr(t, 'choose_tool', 'Choose a tool')}</option>{found.filter(item => item.kind === 'tool').map(item => <option key={item.id} value={room.nodes.findIndex(n => n.reward.id === item.id)}>{item.name}</option>)}</select></label>}
        {node.type === 'sequence' && <ol className="cer-sequence">{draft.map((itemIndex, i) => <li key={itemIndex}><span>{i + 1}. {node.items[itemIndex]}</span><button type="button" data-move-up={itemIndex} aria-label={tr(t, 'move_up', 'Move {item} earlier', { item: node.items[itemIndex] })} disabled={blocked} aria-disabled={blocked || i === 0} onClick={() => { if (i === 0) return; const next = draft.slice(); [next[i - 1], next[i]] = [next[i], next[i - 1]]; change(next); setMovementNotice(next.map((item, index) => (index + 1) + ". " + node.items[item]).join("; ")); }}>↑</button><button type="button" data-move-down={itemIndex} aria-label={tr(t, 'move_down', 'Move {item} later', { item: node.items[itemIndex] })} disabled={blocked} aria-disabled={blocked || i === draft.length - 1} onClick={() => { if (i === draft.length - 1) return; const next = draft.slice(); [next[i + 1], next[i]] = [next[i], next[i + 1]]; change(next); setMovementNotice(next.map((item, index) => (index + 1) + ". " + node.items[item]).join("; ")); }}>↓</button></li>)}</ol>}
        {node.type === 'route' && <RouteMap node={node} position={draft} onChange={change} disabled={blocked} t={t}/>}
        <div className="cer-row"><button type="button" className="cer-primary" data-submit-object={node.id} disabled={actionBlocked || incomplete} onClick={event => { submittedFocus.current = { id: node.id, element: event.currentTarget }; onAction(node.id, 'interact', ['inspect', 'unlock'].includes(node.type) ? '' : value); }}>{node.type === 'inspect' ? tr(t, 'record', 'Collect discovery') : node.type === 'use-tool' ? tr(t, 'use_tool', 'Use selected tool') : node.type === 'route' ? tr(t, 'search_here', 'Search this location') : node.type === 'unlock' ? tr(t, 'open_exit', 'Use discoveries to open the exit') : tr(t, 'activate', 'Activate device')}</button><button type="button" data-hint-object={node.id} disabled={actionBlocked || hintCount >= 3} onClick={() => onAction(node.id, 'hint', '')}>{tr(t, 'next_hint', 'Next hint')} ({hintCount}/3)</button></div></fieldset></>}
      <div className={hintCount > 0 ? "cer-alert" : undefined} aria-live="polite" aria-atomic="true">{hintCount > 0 && <><h3>{solo ? tr(t, 'solo_hint', 'Hint {level}', { level: hintCount }) : tr(t, 'shared_hint', 'Shared hint {level}', { level: hintCount })}</h3><p>{node.hints[hintCount - 1]}</p></>}</div>
    </section><aside className="cer-journal" ref={journalRef} tabIndex={-1} aria-label={solo ? tr(t, 'solo_journal_label', 'Your journal and inventory') : tr(t, 'journal', 'Team journal and inventory')}><h3>{solo ? tr(t, 'solo_journal', 'Your journal') : tr(t, 'journal_title', 'Team journal')}</h3>{found.filter(item => item.kind !== 'tool').length === 0 && <p className="cer-muted">{solo ? tr(t, 'solo_no_evidence', 'The evidence you collect will appear here.') : tr(t, 'no_evidence', 'Evidence collected by anyone in your team will appear here.')}</p>}{found.filter(item => item.kind !== 'tool').map(item => <div key={item.id}><strong>{item.name}</strong><p>{item.text}</p></div>)}<h3>{solo ? tr(t, 'solo_inventory', 'Your inventory') : tr(t, 'inventory', 'Shared inventory')}</h3>{found.filter(item => item.kind === 'tool').length === 0 && <p className="cer-muted">{tr(t, 'empty_inventory', 'No tools collected yet.')}</p>}{found.filter(item => item.kind === 'tool').map(item => <details key={item.id}><summary>{item.name}</summary><p>{item.text}</p></details>)}</aside></div></div>;
}
export function ConnectedSolo({ room, user, onExit, t }) {
  const storageKey = soloStorageKey(room, user?.uid);
  const [state, setState] = useState(() => { try { const raw = sessionStorage.getItem(storageKey); return restoreSolo(room, raw && raw.length < 40000 ? JSON.parse(raw) : null); } catch (_) { return restoreSolo(room, null); } });
  const [notice, setNotice] = useState(''), [storageError, setStorageError] = useState(false), [confirm, setConfirm] = useState(false);
  const current = useRef(state), exitRef = useRef(null), restartRef = useRef(null), cancelRef = useRef(null);
  const workspaceKey = storageKey + ':workspace:' + state.attemptId;
  current.current = state;
  useEffect(() => { exitRef.current?.focus(); }, []);
  useEffect(() => { if (confirm) cancelRef.current?.focus(); }, [confirm]);
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); setStorageError(false); } catch (_) { setStorageError(true); } }, [storageKey, state]);
  const action = (nodeId, kind, value) => { const result = soloAction(room, current.current, nodeId, kind, value); current.current = result.state; setState(result.state); setNotice(roomStatus(t, result.code, true)); };
  const restart = () => { try { sessionStorage.removeItem(workspaceKey); } catch (_) {} const next = restoreSolo(room, null); current.current = next; setState(next); setNotice(tr(t, 'solo_restarted', 'Your room has restarted. Discoveries and hints are reset.')); setConfirm(false); restartRef.current?.focus(); };
  return <section data-solo-room aria-label={tr(t, 'solo_player', 'Solo escape room')}>
    <div className="cer-row"><button type="button" ref={exitRef} onClick={onExit}>{tr(t, 'back_setup', 'Back to room setup')}</button><button type="button" ref={restartRef} onClick={() => setConfirm(true)}>{tr(t, 'solo_restart', 'Restart solo room')}</button></div>
    <p className="cer-muted">{tr(t, 'solo_saved', 'Play independently with the same clues and puzzles. Progress and unfinished settings resume in this browser tab; no live session is needed.')}</p>
    {storageError && <p role="alert" className="cer-alert">{tr(t, 'solo_storage_error', 'Progress could not be saved in this tab. You can keep playing, but leave this room open to preserve your progress.')}</p>}
    {confirm && <div className="cer-alert" role="group" aria-label={tr(t, 'solo_restart', 'Restart solo room')}><p>{tr(t, 'solo_restart_confirm', 'Restart your solo attempt? Your discoveries, hints, and unfinished settings will reset.')}</p><div className="cer-row"><button type="button" onClick={restart}>{tr(t, 'solo_restart_yes', 'Reset my progress')}</button><button type="button" ref={cancelRef} onClick={() => { setConfirm(false); restartRef.current?.focus(); }}>{tr(t, 'cancel', 'Cancel')}</button></div></div>}
    <RoomView key={workspaceKey} room={room} progress={state.progress} workspaceKey={workspaceKey} onAction={action} notice={notice} solo t={t}/>
  </section>;
}
export function ConnectedSetup({ callGemini, inputText, generatedContent, language = 'English', activeSessionCode, appId, sessionData, onClose, onLaunched, user, allowLive = !!activeSessionCode, t }) {
  const source = useMemo(() => engine.sourceText(inputText, generatedContent), [inputText, generatedContent]);
  const [room, setRoom] = useState(null), [stage, setStage] = useState(''), [error, setError] = useState('');
  const [library, setLibrary] = useState({ entries: [] }), [libraryChoice, setLibraryChoice] = useState(null), libraryCancelRef = useRef(null), libraryPickerRef = useRef(null), librarySummaryRef = useRef(null), previousLibraryChoice = useRef(null);
  useEffect(() => { if (libraryChoice) libraryCancelRef.current?.focus(); else if (previousLibraryChoice.current) (libraryPickerRef.current || librarySummaryRef.current)?.focus(); previousLibraryChoice.current = libraryChoice; }, [libraryChoice]);
  const savedEntry = library.entries.find(entry => sameRoom(entry.room, room));
  const libraryError = error => error?.message === 'library-full' ? tr(t, 'library_full', 'This lesson already has eight saved rooms in this language. Open and remove a room you no longer need before saving another. Your current room stays open.') : error?.message === 'library-invalid' ? tr(t, 'library_invalid', 'The saved-room library could not be read. Existing saved data has been kept. You can generate and play a room, but saving is unavailable until the stored library is repaired.') : tr(t, 'save_failed', 'This room could not be saved in this browser. Keep this page open to retain it, and try saving again.');
  const [theme, setTheme] = useState(''), [level, setLevel] = useState(''), [structure, setStructure] = useState('parallel');
  const [previewVersion, setPreviewVersion] = useState(0), [soloOpen, setSoloOpen] = useState(false), [review, setReview] = useState(null), [reviewStep, setReviewStep] = useState(null);
  const [view, setView] = useState('review'), [preview, setPreview] = useState(engine.emptyProgress), [previewNotice, setPreviewNotice] = useState(''), [saved, setSaved] = useState(false);
  const requestRef = useRef(0), dialogRef = useRef(null), closeRef = useRef(onClose), scopeRef = useRef('');
  const scope = appId + ':' + activeSessionCode + ':' + language + ':' + source;
  scopeRef.current = scope; closeRef.current = stage === 'launching' ? null : onClose;
  useRoomDialog(dialogRef, closeRef);
  useEffect(() => () => { requestRef.current++; }, []);
  useEffect(() => { if (!soloOpen) dialogRef.current?.querySelector('[data-play-solo]')?.focus(); }, [soloOpen]);
  useEffect(() => {
    requestRef.current++; setStage(''); setError(''); setRoom(null); setSoloOpen(false); setReview(null); setReviewStep(null); setSaved(false); setView('review'); setPreview(engine.emptyProgress()); setPreviewVersion(n => n + 1); setLibrary({ entries: [] }); setLibraryChoice(null);
    try { const next = readLibrary(localStorage, source, language); setLibrary(next); const candidate = next.entries.find(entry => entry.id === next.selectedId); if (candidate) { setRoom(candidate.room); setSaved(true); } } catch (error) { setError(libraryError(error)); }
  }, [scope, language]);
  const generate = async () => {
    if (stage || libraryChoice) return;
    const id = ++requestRef.current, startedScope = scope;
    setError('');
    try {
      const result = await engine.generateRoom(callGemini, source, { language, theme, level, seed: engine.identity('variation'), structure }, next => { if (requestRef.current === id) setStage(next); });
      if (requestRef.current !== id || scopeRef.current !== startedScope) return;
      setRoom(result); setSaved(library.entries.some(entry => sameRoom(entry.room, result))); setReview(null); setPreview(engine.emptyProgress()); setPreviewVersion(n => n + 1); setPreviewNotice(''); setView('review');
    } catch (e) { if (requestRef.current === id) setError(e.message); }
    finally { if (requestRef.current === id) setStage(''); }
  };
  const save = () => { try { engine.prepareRoom(room, source); } catch (error) { setError(tr(t, 'review_invalid_edits', 'Check the room text before saving: ') + error.message); return false; } try { const next = saveLibraryRoom(localStorage, source, language, room); setLibrary(next); setSaved(true); setError(''); return true; } catch (error) { setError(libraryError(error)); return false; } };
  const openSaved = id => {
    try {
      const next = readLibrary(localStorage, source, language), entry = next.entries.find(e => e.id === id);
      if (!entry) throw Error('library-missing');
      requestRef.current++; setRoom(entry.room); setLibrary(next); setSaved(true); setReview(null); setPreview(engine.emptyProgress()); setPreviewNotice(''); setPreviewVersion(n => n + 1); setView('review'); setLibraryChoice(null); setError('');
      try { setLibrary(selectLibraryRoom(localStorage, source, language, id)); } catch (_) { setError(tr(t, 'library_selection_failed', 'The room is open, but your last-opened selection could not be saved.')); }
      libraryPickerRef.current?.focus();
    } catch (error) { setLibraryChoice(null); setError(error?.message === 'library-missing' ? tr(t, 'library_missing', 'This saved room is no longer available. Reopen setup to refresh the library.') : libraryError(error)); }
  };
  const removeSaved = id => {
    try { const next = removeLibraryRoom(localStorage, source, language, id); setLibrary(next); setSaved(next.entries.some(entry => sameRoom(entry.room, room))); setLibraryChoice(null); setError(''); libraryPickerRef.current?.focus(); }
    catch (error) { setLibraryChoice(null); setError(libraryError(error)); }
  };
  const launch = async () => {
    if (stage || !room || !allowLive || !activeSessionCode || sessionData?.escapeRoomState?.isActive) return;
    const id = ++requestRef.current, startedScope = scope;
    setStage('launching'); setError('');
    try {
      const specification = engine.prepareRoom(room, source);
      const { fb, ref } = connection(appId, activeSessionCode);
      const current = fb.getDoc ? (await fb.getDoc(ref)).data() : sessionData;
      if (requestRef.current !== id || scopeRef.current !== startedScope) return;
      if (current?.escapeRoomState?.isActive) throw Error(tr(t, 'end_current', 'End the current escape room before launching another.'));
      if (current?.quizState?.isActive) throw Error(tr(t, 'end_quiz', 'End the current live quiz before launching the shared room.'));
      const state = engine.createSession(specification, current?.hostId || sessionData?.hostId || fb.auth?.currentUser?.uid || '', current?.roster || {});
      try { setLibrary(saveLibraryRoom(localStorage, source, language, specification)); setSaved(true); } catch (_) {}
      if (JSON.stringify({ ...current, escapeRoomState: state }).length + Object.keys(current?.roster || {}).length * 400 > 78000) throw Error(tr(t, 'session_full', 'This live session is too large for another room. Start a fresh live session, then launch your saved room.'));
      await fb.updateDoc(ref, { escapeRoomState: state });
      if (requestRef.current === id && scopeRef.current === startedScope) { onLaunched?.(); onClose?.(); }
    } catch (e) { if (requestRef.current === id) setError(tr(t, 'launch_failed', 'The room could not launch. ') + e.message); }
    finally { if (requestRef.current === id) setStage(''); }
  };
  const edit = (nodeId, field, value) => {
    setSaved(false); setReview(null); setPreview(engine.emptyProgress()); setPreviewNotice(''); setPreviewVersion(n => n + 1);
    setRoom(previous => nodeId === null ? { ...previous, [field]: value } : { ...previous, nodes: previous.nodes.map(node => {
      if (node.id !== nodeId) return node;
      if (field === 'rewardText') return { ...node, reward: { ...node.reward, text: value } };
      if (/^hint[0-2]$/.test(field)) return { ...node, hints: node.hints.map((hint, index) => index === Number(field.slice(-1)) ? value : hint) };
      return { ...node, [field]: value };
    }) });
  };
  const openImported = imported => {
    if (stage || libraryChoice) return false;
    try { const next = engine.prepareRoom(imported, source); requestRef.current++; setRoom(next); setSaved(library.entries.some(entry => sameRoom(entry.room, next))); setReview(null); setView('review'); setPreview(engine.emptyProgress()); setPreviewNotice(''); setPreviewVersion(n => n + 1); setError(''); return true; }
    catch (error) { setError(tr(t, 'review_invalid_edits', 'Check the room text before saving: ') + error.message); return false; }
  };
  const editReviewedObject = nodeId => {
    setView('review');
    setTimeout(() => { const details = dialogRef.current?.querySelector('[data-edit-object="' + nodeId + '"]'); if (details) { details.open = true; details.querySelector('textarea')?.focus(); } }, 0);
  };
  const checkPlayability = async () => {
    if (stage || !room) return;
    const id = ++requestRef.current; setStage('reviewing'); setReview(null); setReviewStep(null); setError('');
    try { const result = await reviewRoom(callGemini, room, { language, shouldContinue: () => requestRef.current === id }, step => { if (requestRef.current === id) setReviewStep(step); }); if (requestRef.current === id) setReview(result); }
    catch (error) { if (requestRef.current === id) setError(error.message); }
    finally { if (requestRef.current === id) { setStage(''); setReviewStep(null); } }
  };
  const startSolo = () => { if (stage) return; try { engine.prepareRoom(room, source); save(); setSoloOpen(true); } catch (error) { setError(error.message); } };
  const previewAction = (nodeId, kind, value) => {
    const request = { attemptId: 'preview', requestId: engine.identity('preview'), nodeId, kind, value };
    const patch = engine.planRequest(room, preview, request, 'teacher', { attemptId: 'preview', active: true, paused: false });
    setPreview(engine.mergeProgress(preview, patch)); setPreviewNotice(roomStatus(t, patch['receipts.' + request.requestId]?.code));
  };
  return <div className="cer-modal-backdrop"><Styles/><section className="cer cer-modal" role="dialog" aria-modal="true" tabIndex={-1} aria-label={tr(t, 'setup_title', 'Create a connected escape room')} ref={dialogRef}>
    <header className="cer-row cer-between"><h2>{tr(t, 'setup_title', 'Create a connected escape room')}</h2><button type="button" disabled={stage === 'launching'} onClick={onClose}>{tr(t, 'close', 'Close')}</button></header>
    {error && <p className="cer-alert cer-error" role="alert">{error}</p>}
    {soloOpen && room ? <ConnectedSolo key={soloStorageKey(room, user?.uid)} room={room} user={user} onExit={() => setSoloOpen(false)} t={t}/> : <>
    <p>{tr(t, 'setup_intro', 'AI creates connected clues from your lesson. Review the room, then play solo or launch it collaboratively from a live session.')}</p>
    <p className="cer-muted">{tr(t, 'room_language', 'Room language: {language}', { language })}</p>
    <details><summary>{tr(t, 'source_preview', 'Lesson excerpt used for generation')}</summary><p style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto' }} tabIndex={0}>{source}</p></details>
    <RoomTransfer key={scope} room={room} source={source} language={language} disabled={!!stage || !!libraryChoice} unsaved={!!room && !saved} onOpen={openImported} onReading={reading => setStage(reading ? 'importing' : '')} t={t}/>
    <details className="cer-library" data-room-library>
      <summary ref={librarySummaryRef}>{tr(t, 'saved_rooms', 'Saved rooms for this lesson')} · {library.entries.length}/{ROOM_LIBRARY_LIMIT}</summary>
      <p className="cer-muted">{tr(t, 'library_help', 'Keep up to eight rooms per lesson and language in this browser. Opening a saved room lets you resume its solo progress in this tab or launch it with a class.')}</p>
      {library.entries.length === 0 ? <p>{tr(t, 'library_empty', 'No saved rooms yet. Generate a room, then save it or start playing.')}</p> : <>
        <label>{tr(t, 'choose_saved_room', 'Open a saved room')}<select data-saved-room-picker ref={libraryPickerRef} value={savedEntry?.id || ''} disabled={!!stage || !!libraryChoice} onChange={event => { const id = event.target.value; if (!id) return; if (room && !saved) setLibraryChoice({ kind: 'load', id }); else openSaved(id); }}><option value="">{tr(t, 'current_unsaved_room', 'Choose a saved room')}</option>{library.entries.map((entry, index) => <option key={entry.id} value={entry.id}>{index + 1}. {entry.room.title} · {tr(t, 'room_size', '{count} objects', { count: entry.room.nodes.length })}</option>)}</select></label>
        {savedEntry && <p className="cer-muted" data-saved-room-title>{savedEntry.room.title}</p>}
        {savedEntry && <button type="button" data-remove-saved disabled={!!stage || !!libraryChoice} onClick={() => setLibraryChoice({ kind: 'remove', id: savedEntry.id })}>{tr(t, 'remove_saved', 'Remove this saved room')}</button>}
      </>}
      {libraryChoice && <div className="cer-alert" role="group" aria-label={tr(t, 'saved_room_change', 'Change saved room')}><p>{libraryChoice.kind === 'remove' ? tr(t, 'remove_saved_confirm', 'Remove this room from the browser library? The currently open room and solo progress in this tab will stay available.') : tr(t, 'open_saved_confirm', 'Open the saved room and discard unsaved changes to this preview?')}</p><div className="cer-row"><button type="button" onClick={() => libraryChoice.kind === 'remove' ? removeSaved(libraryChoice.id) : openSaved(libraryChoice.id)}>{libraryChoice.kind === 'remove' ? tr(t, 'confirm_remove_saved', 'Remove from library') : tr(t, 'confirm_open_saved', 'Discard changes and open')}</button><button type="button" ref={libraryCancelRef} onClick={() => { setLibraryChoice(null); libraryPickerRef.current?.focus(); }}>{tr(t, 'cancel', 'Cancel')}</button></div></div>}
    </details>
    <div className="cer-controls"><label>{tr(t, 'theme', 'Setting or theme (optional)')}<input value={theme} maxLength={180} onChange={e => setTheme(e.target.value)} disabled={!!stage || !!libraryChoice}/></label><label>{tr(t, 'learner_level', 'Learner level (optional)')}<input value={level} maxLength={80} onChange={e => setLevel(e.target.value)} disabled={!!stage || !!libraryChoice}/></label><label>{tr(t, 'structure', 'Room structure')}<select value={structure} onChange={e => setStructure(e.target.value)} disabled={!!stage || !!libraryChoice}><option value="parallel">{tr(t, 'parallel', 'Parallel investigations')}</option><option value="discovery">{tr(t, 'discovery', 'Discovery opens two paths')}</option></select></label></div>
    <div className="cer-row"><button type="button" className="cer-primary" disabled={!!stage || !!libraryChoice || source.trim().length < 40} onClick={generate}>{room ? tr(t, 'generate_another', 'Generate another room') : tr(t, 'generate', 'Generate connected room')}</button><span role="status">{stage === 'generating' ? tr(t, 'generating', 'Creating clues and connected objects…') : stage === 'repairing' ? tr(t, 'repairing', 'Repairing the room’s puzzle connections…') : stage === 'importing' ? tr(t, 'import_reading', 'Reading and checking the room file…') : stage === 'reviewing' ? tr(t, 'review_step', 'Checking {current}/{total}: {name}', reviewStep || { current: 0, total: reviewNodes(room).length, name: '' }) : stage === 'launching' ? tr(t, 'launching', 'Launching the shared room…') : saved ? tr(t, 'saved', 'Room saved in this browser') : ''}</span></div>
    {source.trim().length < 40 && <p className="cer-alert">{tr(t, 'source_needed', 'Add lesson text or generate a quiz before creating a connected room.')}</p>}
    {room && <>
      <RoomFlowReview room={room} onReview={editReviewedObject} disabled={!!stage || !!libraryChoice} t={t}/>
      <section className="cer-panel" style={{ marginTop: 18 }} aria-label={tr(t, 'playability', 'AI playability review')} data-playability-review>
        <h3>{tr(t, 'playability', 'AI playability review')}</h3>
        <p>{tr(t, 'review_intro', 'An independent AI pass tries each device using its available clues, without the answer key or hints. This can flag ambiguity; it does not guarantee a good room.')}</p>
        <p className="cer-muted">{tr(t, 'review_calls', 'Uses up to {count} additional requests to your configured AI provider. Review is optional; check the clues yourself before playing or launching.', { count: reviewNodes(room).length })}</p>
        <button type="button" disabled={!!stage || !!libraryChoice} onClick={checkPlayability}>{tr(t, 'run_review', 'Check playability with AI')}</button>
        {stage === 'reviewing' && <button type="button" onClick={() => { requestRef.current++; setStage(''); setReviewStep(null); setError(tr(t, 'review_cancelled', 'Review stopped. The current provider request may finish, but no further checks will run.')); }}>{tr(t, 'stop_review', 'Stop review')}</button>}
        <div role="status" aria-live="polite" aria-atomic="true">{review && <p>{!review.complete ? tr(t, 'review_incomplete', 'Review incomplete. Some devices could not be checked. Try again when the AI provider is available.') : review.checks.every(c => c.status === 'matched') ? tr(t, 'review_matched', 'The reviewer independently matched every device solution. Check its reasoning and try the room before launch.') : tr(t, 'review_concerns', 'Some devices need a closer look. Review the findings and clarify their player instructions, or generate another room.')}</p>}</div>
        {review && <ul className="cer-facts">{review.checks.map(check => <li key={check.nodeId}><strong>{room.nodes.find(n => n.id === check.nodeId)?.name}</strong> · {check.status === 'matched' ? tr(t, 'review_match', 'Solution matched') : check.status === 'unavailable' ? tr(t, 'review_unavailable', 'Not checked') : tr(t, 'review_attention', 'Needs review')}{check.reason && <p>{check.reason}</p>}{check.status === 'needs-review' && !check.matches && <p>{tr(t, 'review_mismatch', 'The reviewer did not reproduce the stored solution from these clues.')}</p>}{check.suggestion && <p>{check.suggestion}</p>}<button type="button" data-edit-reviewed={check.nodeId} disabled={!!stage || !!libraryChoice} onClick={() => editReviewedObject(check.nodeId)}>{tr(t, 'edit_reviewed_clues', 'Edit this object’s clues')}</button></li>)}</ul>}
      </section>
      <nav className="cer-row" aria-label={tr(t, 'preview_views', 'Room preview views')} style={{ marginTop: 18 }}><button type="button" aria-pressed={view === 'review'} onClick={() => setView('review')}>{tr(t, 'review', 'Review clues and solutions')}</button><button type="button" aria-pressed={view === 'play'} onClick={() => setView('play')}>{tr(t, 'try_room', 'Try the room')}</button>{view === 'play' && <button type="button" onClick={() => { setPreview(engine.emptyProgress()); setPreviewNotice(''); setPreviewVersion(n => n + 1); }}>{tr(t, 'reset_preview', 'Reset preview')}</button>}</nav>
      {view === 'play' ? <RoomView key={previewVersion} room={room} progress={preview} onAction={previewAction} disabled={!!stage || !!libraryChoice} notice={previewNotice} t={t}/> : <section style={{ marginTop: 16 }} data-room-editor><h3>{room.title}</h3><button type="button" data-return-room-flow onClick={() => { const flow = dialogRef.current?.querySelector('[data-room-flow]'); if (flow) { flow.open = true; flow.querySelector('summary')?.focus(); } }}>{tr(t, 'flow_return', 'Back to room connections')}</button>
        <details><summary>{tr(t, 'edit_room_story', 'Edit room title, mission, and debrief')}</summary><label>{tr(t, 'edit_room_title', 'Room title')}<input data-edit-room-title maxLength={120} value={room.title} disabled={!!stage || !!libraryChoice} onChange={event => edit(null, 'title', event.target.value)}/></label><label>{tr(t, 'edit_room_mission', 'Room mission')}<textarea maxLength={1500} value={room.mission} disabled={!!stage || !!libraryChoice} onChange={event => edit(null, 'mission', event.target.value)}/></label><label>{tr(t, 'edit_room_debrief', 'Room debrief text')}<textarea maxLength={1500} value={room.debrief} disabled={!!stage || !!libraryChoice} onChange={event => edit(null, 'debrief', event.target.value)}/></label></details><p>{room.mission}</p><p className="cer-muted">{tr(t, 'review_guidance', 'Check that the clues are clear and the solutions match your lesson. You can edit the story, object descriptions, evidence, and hints. Editing clears the AI review; check playability again after making changes.')}</p>{room.nodes.map(n => <details key={n.id} data-edit-object={n.id}><summary>{n.name} · {n.requires.length ? tr(t, 'requires', 'Needed: {items}', { items: n.requires.map(id => room.nodes.find(x => x.reward.id === id)?.reward.name).join(', ') }) : tr(t, 'starting_object', 'Starting object')}</summary><label>{tr(t, 'player_instruction', 'Player instruction')}<textarea value={n.instruction} maxLength={1000} disabled={!!stage || !!libraryChoice} onChange={e => edit(n.id, 'instruction', e.target.value)}/></label><label>{tr(t, 'edit_object_description', 'What players observe')}<textarea maxLength={1000} value={n.description} disabled={!!stage || !!libraryChoice} onChange={event => edit(n.id, 'description', event.target.value)}/></label><p><strong>{tr(t, 'discovery_label', 'Discovery: ')}</strong>{n.reward.name}</p><label>{tr(t, 'edit_evidence', 'Collected evidence or tool description')}<textarea data-edit-evidence={n.id} maxLength={1200} value={n.reward.text} disabled={!!stage || !!libraryChoice} onChange={event => edit(n.id, 'rewardText', event.target.value)}/></label>{n.explanation && <><p><strong>{tr(t, 'solution_label', 'Solution: ')}</strong>{n.explanation}</p><blockquote>{n.sourceQuote}</blockquote></>}<details><summary>{tr(t, 'edit_hints', 'Edit the three graduated hints')}</summary>{n.hints.map((hint, index) => <label key={index}>{tr(t, 'edit_hint_number', 'Hint {number}', { number: index + 1 })}<textarea data-edit-hint={n.id + '-' + index} maxLength={450} value={hint} disabled={!!stage || !!libraryChoice} onChange={event => edit(n.id, 'hint' + index, event.target.value)}/></label>)}</details></details>)}</section>}
      <footer className="cer-row" style={{ marginTop: 20 }}><button type="button" disabled={!!stage || !!libraryChoice} onClick={save}>{tr(t, 'save', 'Save room in this browser')}</button><button type="button" data-play-solo disabled={!!stage || !!libraryChoice} onClick={startSolo}>{tr(t, 'play_solo', 'Play solo')}</button>{allowLive && activeSessionCode && <button type="button" className="cer-primary" data-launch-connected disabled={!!stage || !!libraryChoice || !!sessionData?.escapeRoomState?.isActive || !!sessionData?.quizState?.isActive} onClick={launch}>{tr(t, 'launch', 'Launch for everyone')}</button>}</footer>
      {(sessionData?.escapeRoomState?.isActive || sessionData?.quizState?.isActive) && <p>{tr(t, 'end_activity', 'End the current live activity before launching this room. Your preview is kept.')}</p>}
    </>}
    </>}
  </section></div>;
}
runtime.cooldowns = new Map();
export function ConnectedHost({ sessionData, activeSessionCode, appId }) {
  const state = sessionData?.escapeRoomState, scope = appId + ':' + activeSessionCode + ':' + state?.attemptId;
  const [retry, setRetry] = useState(0), timerRef = useRef(null), mounted = useRef(true);
  useEffect(() => { mounted.current = true; const listener = () => setRetry(n => n + 1); runtime.listeners.add(listener); return () => { mounted.current = false; clearTimeout(timerRef.current); runtime.listeners.delete(listener); }; }, []);
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (state?.mode !== 'connected-room' || !state.isActive || !state.connectedRoom || runtime.locks.has(scope) || engine.validateRoom(state.connectedRoom).length) return;
    const wait = (runtime.cooldowns.get(scope) || 0) - Date.now();
    if (wait > 0) { timerRef.current = setTimeout(() => setRetry(n => n + 1), wait); return; }
    let progress = progressOf(state);
    const pending = pendingHostActions(state, sessionData?.roster, progress);
    if (!pending.length) return;
    if (Object.keys(progress.receipts || {}).length >= 2048) { if (!runtime.errors.has(scope)) { runtime.errors.set(scope, 'This room has reached its action limit. Restart it to continue.'); runtime.emit(); } return; }
    let patch = {};
    for (const [uid, request] of pending.slice(0, 64)) {
      const next = engine.planRequest(state.connectedRoom, progress, request, uid, { attemptId: state.attemptId, active: state.isActive, paused: state.isPaused });
      progress = engine.mergeProgress(progress, next); patch = { ...patch, ...next };
    }
    if (!Object.keys(patch).length) return;
    runtime.locks.add(scope); runtime.emit();
    (async () => {
      try {
        const { fb, ref } = connection(appId, activeSessionCode);
        const update = scopedPatch(state, patch);
        // A student sends a new request only after consuming its prior receipt.
        // Keep every currently queued request, including those from offline peers.
        // Deleting older acknowledgements bounds Mailbox size without replacing
        // shared progress or deleting a teammate's outstanding confirmation.
        if (typeof fb.deleteField === 'function') for (const id of engine.receiptKeysToPrune(progressOf(state), state.teamProgress?.All?.connectedActions, state.attemptId)) {
          update['escapeRoomState.teamProgress.All.connected.' + state.attemptId + '.receipts.' + id] = fb.deleteField();
        }
        await fb.updateDoc(ref, update); runtime.errors.delete(scope); runtime.cooldowns.set(scope, Date.now() + 200);
      }
      catch (_) { runtime.errors.set(scope, 'Student actions are waiting for confirmation. Reconnecting…'); runtime.cooldowns.set(scope, Date.now() + 5000); }
      finally { runtime.locks.delete(scope); runtime.emit(); }
    })();
  }, [scope, state, sessionData?.roster, retry]);
  return null;
}
export function ConnectedStudent({ sessionData, user, activeSessionCode, targetAppId, t }) {
  const state = sessionData?.escapeRoomState, room = state?.connectedRoom, progress = progressOf(state);
  const scope = targetAppId + ':' + activeSessionCode + ':' + state?.attemptId + ':' + user?.uid;
  const [pending, setPending] = useState(null), [sending, setSending] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState(''), [joining, setJoining] = useState(false), [slow, setSlow] = useState(false), [recovered, setRecovered] = useState(false);
  const scopeRef = useRef(scope), pendingRef = useRef(null), mounted = useRef(true), joinRef = useRef(false), sendRef = useRef(null); scopeRef.current = scope;
  const storageKey = 'allo-connected-pending:' + scope, currentReceipt = matchingReceipt(progress, pending, user?.uid);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    pendingRef.current = null; sendRef.current = null; joinRef.current = false; setPending(null); setSending(false); setError(''); setNotice(''); setSlow(false); setJoining(false); setRecovered(false);
    try {
      const raw = sessionStorage.getItem(storageKey), saved = restorePending(room, state?.attemptId, raw);
      if (saved) { pendingRef.current = saved; setPending(saved); setRecovered(true); }
      else if (raw) { sessionStorage.removeItem(storageKey); setNotice(tr(t, 'stale_pending_cleared', 'An outdated pending action was cleared. Review the object before submitting again.')); }
    } catch (_) {}
  }, [scope]);
  const join = async () => {
    if (!user?.uid || joinRef.current) return;
    const started = scope; joinRef.current = true; setJoining(true); setError('');
    try { const { fb, ref } = connection(targetAppId, activeSessionCode); await fb.updateDoc(ref, { ['escapeRoomState.teams.' + user.uid]: 'All' }); }
    catch (_) { if (mounted.current && scopeRef.current === started) setError(tr(t, 'join_failed', 'Could not join the shared room. Check your connection and try again.')); }
    finally { if (mounted.current && scopeRef.current === started) { joinRef.current = false; setJoining(false); } }
  };
  useEffect(() => { if (state?.isActive && state?.mode === 'connected-room' && state.teams?.[user?.uid] !== 'All') join(); }, [scope, state?.isActive]);
  useEffect(() => {
    if (!pending || !currentReceipt || currentReceipt.uid !== user?.uid) return;
    setNotice(tr(t, 'object_action_result', '{name}: {message}', { name: room.nodes.find(n => n.id === pending.nodeId)?.name || '', message: roomStatus(t, currentReceipt.code) })); setError(''); setPending(null); pendingRef.current = null; setSending(false); setSlow(false);
    try { sessionStorage.removeItem(storageKey); } catch (_) {}
  }, [pending?.requestId, currentReceipt, scope]);
  useEffect(() => { if (!pending) return; setSlow(false); const timer = setTimeout(() => setSlow(true), 12000); return () => clearTimeout(timer); }, [pending?.requestId]);
  const transmit = async request => {
    if (!mounted.current || scopeRef.current !== scope || pendingRef.current?.requestId !== request.requestId || sendRef.current?.scope === scope && sendRef.current?.requestId === request.requestId) return;
    const started = scope, transmission = { scope, requestId: request.requestId }; sendRef.current = transmission; setRecovered(false); setSending(true); setError('');
    try { const { fb, ref } = connection(targetAppId, activeSessionCode); await fb.updateDoc(ref, { ['escapeRoomState.teamProgress.All.connectedActions.' + user.uid]: request }); }
    catch (_) { if (mounted.current && scopeRef.current === started && pendingRef.current?.requestId === request.requestId) { setError(tr(t, 'send_failed', 'Your action could not be sent. Your attempt is kept; retry when connected.')); setSlow(true); } }
    finally { if (sendRef.current === transmission) { sendRef.current = null; if (mounted.current && scopeRef.current === started && pendingRef.current?.requestId === request.requestId) setSending(false); } }
  };
  const action = (nodeId, kind, value) => {
    if (Object.keys(progress.receipts || {}).length >= 2048 || pendingRef.current || !state?.isActive || state.isPaused || state.teams?.[user?.uid] !== 'All') return;
    const request = { attemptId: state.attemptId, requestId: engine.identity('action'), nodeId, kind, value };
    pendingRef.current = request; setPending(request); setNotice(''); try { sessionStorage.setItem(storageKey, JSON.stringify(request)); } catch (_) {} transmit(request);
  };
  useEffect(() => { if (state?.isActive === false) try { sessionStorage.removeItem('allo-connected-workspace:' + scope); sessionStorage.removeItem(storageKey); } catch (_) {} }, [scope, state?.isActive]);
  if (!room || state?.mode !== 'connected-room' || !state.isActive) return null;
  const invalid = engine.validateRoom(room);
  if (invalid.length) return <div className="cer cer-overlay"><Styles/><div className="cer-shell"><p role="alert">{tr(t, 'invalid_room', 'This room could not be opened. Ask the teacher to regenerate it.')}</p></div></div>;
  const joined = state.teams?.[user?.uid] === 'All', atLimit = Object.keys(progress.receipts || {}).length >= 2048;
  return <div className="cer cer-overlay" role="region" aria-label={tr(t, 'live_room', 'Collaborative escape room')}><Styles/><div className="cer-shell">
    {atLimit && <p className="cer-alert" role="status">{tr(t, 'action_limit', 'This room has reached its action limit. Ask the teacher to restart it. Your team can still review its discoveries.')}</p>}
    {!joined && <p className="cer-alert">{tr(t, 'joining', 'Joining your team…')} <button type="button" disabled={joining} onClick={join}>{tr(t, 'retry_join', 'Retry joining')}</button></p>}
    {state.isPaused && <p className="cer-alert" role="status">{tr(t, 'paused', 'Room paused. You can still inspect objects and read the journal. Your draft is kept.')}</p>}
    {error && <p className="cer-alert cer-error" role="alert">{error}</p>}

    <RoomView key={scope} workspaceKey={'allo-connected-workspace:' + scope} activityData={{ actions: state.teamProgress?.All?.connectedActions, attemptId: state.attemptId, uid: user?.uid }} room={room} progress={progress} onAction={action} pendingAction={pending ? { request: pending, sending, slow, error, needsRecovery: recovered && !samePendingRequest(state.teamProgress?.All?.connectedActions?.[user?.uid], pending), retryBlocked: sending || state.isPaused || atLimit, onRetry: () => transmit(pending) } : null} disabled={!joined || state.isPaused || atLimit} notice={notice} t={t}/>
  </div></div>;
}
export function ConnectedTeacher(props) {
  const { sessionData, activeSessionCode, appId, t } = props;
  const state = sessionData?.escapeRoomState, room = state?.connectedRoom, progress = progressOf(state);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [confirm, setConfirm] = useState('');
  const busyRef = useRef(false), scopeRef = useRef(''), confirmCancelRef = useRef(null), confirmTriggerRef = useRef(null);
  useEffect(() => { if (confirm) confirmCancelRef.current?.focus(); else if (confirmTriggerRef.current) { confirmTriggerRef.current.focus(); confirmTriggerRef.current = null; } }, [confirm]);
  const scope = appId + ':' + activeSessionCode + ':' + state?.attemptId; scopeRef.current = scope;
  const hostError = useRuntimeError(scope);
  useEffect(() => { setError(''); setConfirm(''); setBusy(false); busyRef.current = false; }, [scope]);
  const write = async patch => {
    if (scopeRef.current !== scope || busyRef.current || runtime.locks.has(scope)) return false;
    busyRef.current = true; runtime.locks.add(scope); runtime.emit(); setBusy(true); setError(''); const started = scope;
    try { const { fb, ref } = connection(appId, activeSessionCode); await fb.updateDoc(ref, patch); return true; }
    catch (_) { if (scopeRef.current === started) setError(tr(t, 'control_failed', 'The control could not be saved. Please try again.')); return false; }
    finally { runtime.locks.delete(started); runtime.emit(); if (scopeRef.current === started) { busyRef.current = false; setBusy(false); } }
  };
  if (!room || state?.mode !== 'connected-room' || !state.isActive) return null;
  const invalid = engine.validateRoom(room);
  if (invalid.length) return <div className="cer cer-teacher"><Styles/><p role="alert">{tr(t, 'invalid_room', 'This room could not be opened. Ask the teacher to regenerate it.')}</p><button type="button" disabled={busy} onClick={() => write({ 'escapeRoomState.isActive': false })}>{tr(t, 'end', 'End room')}</button></div>;
  const found = engine.inventory(room, progress);
  const waiting = pendingHostActions(state, sessionData?.roster, progress).length;
  const changeLifecycle = async action => {
    if (action === 'restart') { const next = engine.createSession(room, state.hostId, sessionData.roster); if (await write({ escapeRoomState: next })) setConfirm(''); }
    if (action === 'end' && await write({ 'escapeRoomState.isActive': false, 'escapeRoomState.isPaused': false })) setConfirm('');
  };
  return <section className="cer cer-teacher" aria-label={tr(t, 'teacher_controls', 'Connected room teacher controls')}><Styles/><ConnectedHost {...props}/>
    <header className="cer-row cer-between"><div><h2>{room.title}</h2><p>{tr(t, 'teacher_intro', 'Everyone investigates the same room. Discoveries and hints are shared.')}</p></div><strong>{state.isPaused ? tr(t, 'paused_short', 'Paused') : engine.complete(room, progress) ? tr(t, 'complete', 'Complete') : tr(t, 'live', 'Live')}</strong></header>
    <p role="status">{tr(t, 'teacher_progress', '{count}/{total} discoveries · {waiting} actions awaiting confirmation', { count: found.length, total: room.nodes.length, waiting })}</p>
    {(error || hostError) && <p role="alert" className="cer-alert cer-error">{error || hostError}</p>}
    <div className="cer-row"><button type="button" disabled={busy || runtime.locks.has(scope)} onClick={() => write({ 'escapeRoomState.isPaused': !state.isPaused })}>{state.isPaused ? tr(t, 'resume', 'Resume room') : tr(t, 'pause', 'Pause room')}</button><button type="button" disabled={busy} onClick={event => { confirmTriggerRef.current = event.currentTarget; setConfirm('restart'); }}>{tr(t, 'restart', 'Restart this room')}</button><button type="button" disabled={busy} onClick={event => { confirmTriggerRef.current = event.currentTarget; setConfirm('end'); }}>{tr(t, 'end', 'End room')}</button></div>
    {confirm && <div className="cer-alert" onKeyDown={event => { if (event.key === 'Escape' && !busy) { event.preventDefault(); event.stopPropagation(); setConfirm(''); } }}><p>{confirm === 'restart' ? tr(t, 'restart_confirm', 'Restart this room for everyone? Shared progress and hints will reset. The generated room stays the same.') : tr(t, 'end_confirm', 'End this room for everyone and return to the lesson?')}</p><div className="cer-row"><button type="button" disabled={busy || runtime.locks.has(scope)} onClick={() => changeLifecycle(confirm)}>{confirm === 'restart' ? tr(t, 'confirm_restart', 'Restart for everyone') : tr(t, 'confirm_end', 'End for everyone')}</button><button ref={confirmCancelRef} type="button" disabled={busy} onClick={() => setConfirm('')}>{tr(t, 'cancel', 'Cancel')}</button></div></div>}
    <TeamActivityBoard room={room} progress={progress} actions={state.teamProgress?.All?.connectedActions} attemptId={state.attemptId} roster={sessionData.roster} t={t}/>
    <div className="cer-layout"><section><h3>{tr(t, 'team_path', 'Team discovery path')}</h3>{room.areas.map(a => <div key={a.id}><h3>{a.name}</h3><ul className="cer-facts">{room.nodes.filter(n => n.areaId === a.id).map(n => <li key={n.id}><strong>{n.name}</strong> · {progress.solved?.[n.id] ? tr(t, 'complete', 'Complete') : engine.available(room, progress, n) ? tr(t, 'available', 'Ready to investigate') : tr(t, 'needs_discoveries', 'Needs discoveries')} {engine.hintLevel(progress, n.id) > 0 && <small> · {tr(t, 'hint_count', '{count}/3 hints shared', { count: engine.hintLevel(progress, n.id) })}</small>}{progress.assisted?.[n.id] && <small> · {tr(t, 'teacher_assisted', 'Completed with teacher support')}</small>}</li>)}</ul></div>)}</section>
    <TeacherSupport key={scope} room={room} progress={progress} busy={busy || !!confirm || runtime.locks.has(scope)} onWrite={patch => write(scopedPatch(state, patch))} t={t}/></div>
    <details><summary>{tr(t, 'solutions', 'Teacher clues and solutions')}</summary>{room.nodes.map(n => <section key={n.id}><h3>{n.name}</h3><p>{n.instruction}</p><p>{n.explanation || n.reward.text}</p><ol>{n.hints.map((h, i) => <li key={i}>{h}</li>)}</ol></section>)}</details>
    <RoomDebrief room={room} progress={progress} teacher t={t}/>
  </section>;
}
window.AlloModules = window.AlloModules || {};
window.AlloModules.ConnectedEscapeRoomEngine = engine;
window.AlloModules.ConnectedEscapeRoomSetup = ConnectedSetup;
window.AlloModules.ConnectedEscapeRoomSolo = ConnectedSolo;
window.AlloModules.ConnectedEscapeRoomStudent = ConnectedStudent;
window.AlloModules.ConnectedEscapeRoomTeacher = ConnectedTeacher;
window.AlloModules.ConnectedEscapeRoomHost = ConnectedHost;
window.AlloModules.ConnectedEscapeRoomModule = true;
