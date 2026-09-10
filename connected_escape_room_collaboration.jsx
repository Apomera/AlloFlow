import * as engine from './connected_escape_room_engine.js';
const React = window.React;
const { useState, useEffect } = React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function useRoomWorkspace(room, storageKey) {
  const [workspace, setWorkspace] = useState(() => {
    try { const saved = storageKey && sessionStorage.getItem(storageKey); if (saved && saved.length < 10000) return engine.restoreWorkspace(room, JSON.parse(saved)); } catch (_) {}
    return engine.restoreWorkspace(room, null);
  });
  const [storageStatus, setStorageStatus] = useState('');
  useEffect(() => {
    if (!storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(workspace)); setStorageStatus('saved'); }
    catch (_) { setStorageStatus('unavailable'); }
  }, [storageKey, workspace]);
  return [workspace, setWorkspace, storageStatus];
}
export function TeamActivityBoard({ room, progress, actions, attemptId, uid, roster, onSelect, t }) {
  const rows = engine.teamActivity(room, progress, actions, attemptId, roster && Object.keys(roster));
  const waiting = rows.reduce((sum, row) => sum + row.waiting, 0);
  return <details className="cer-activity-board" data-team-activity>
    <summary>{tr(t, 'team_activity', 'Team activity')} · {rows.length === 1 ? tr(t, 'activity_one_object', 'Latest actions on 1 object') : tr(t, 'activity_objects', 'Latest actions on {count} objects', { count: rows.length })}{waiting > 0 && <strong className="cer-activity-waiting"> · {tr(t, 'activity_waiting', '{count} awaiting confirmation', { count: waiting })}</strong>}</summary>
    <p className="cer-muted">{tr(t, 'activity_explainer', 'This shows each participant’s latest submitted action, grouped by object. Use it to coordinate your next discovery. Everyone can investigate every object.')}</p>
    {!rows.length && <p>{tr(t, 'no_activity', 'No actions submitted yet. Explore different starting objects together.')}</p>}
    <ul className="cer-activity-list">{rows.map(row => <li key={row.nodeId} data-activity-node={row.nodeId}>
      {onSelect ? <button type="button" onClick={() => onSelect(row.nodeId)}>{row.name}</button> : <strong>{row.name}</strong>}
      <span>{row.solved ? tr(t, 'activity_complete', 'Discovery completed') : row.waiting > 0 ? tr(t, 'activity_waiting', '{count} awaiting confirmation', { count: row.waiting }) : row.retry > 0 ? row.retry === 1 ? tr(t, 'activity_one_retry', '1 attempt needs another try') : tr(t, 'activity_retry', '{count} attempts need another try', { count: row.retry }) : tr(t, 'activity_recorded', 'Action confirmed')}</span>
      <small>{row.uids.length === 1 ? tr(t, 'activity_one_participant', '1 participant') : tr(t, 'activity_participants', '{count} participants', { count: row.uids.length })}{row.uids.includes(uid) && <> · {tr(t, 'activity_yours', 'Includes your latest action')}</>}{row.hints > 0 && <> · {tr(t, 'activity_hints', '{count}/3 hints shared', { count: row.hints })}</>}</small>
      {roster && <small>{row.uids.map(id => roster[id]?.name || tr(t, 'participant', 'Participant')).join(' · ')}</small>}
    </li>)}</ul>
  </details>;
}
export function EvidenceContext({ node, found, t }) {
  const clues = found.filter(item => node.requires.includes(item.id));
  if (!clues.length) return null;
  return <section className="cer-evidence-context" aria-label={tr(t, 'relevant_clues', 'Clues for this object')}><h4>{tr(t, 'relevant_clues', 'Clues for this object')}</h4>{clues.map(item => <div key={item.id} data-relevant-clue={item.id}><strong>{item.name}</strong><p>{item.text}</p></div>)}</section>;
}
