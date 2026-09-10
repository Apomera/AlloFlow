import { investigationGuide, discoveryUpdate } from './connected_escape_room_engine.js';
const React = window.React;
const { useState, useEffect, useRef } = React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function InvestigationGuide({ room, progress, selectedId, onSelect, t }) {
  const areas = investigationGuide(room, progress), ready = areas.flatMap(a => a.objects).filter(n => n.status === 'ready').length;
  return <details data-investigation-guide>
    <summary>{tr(t, 'investigation_guide', 'Investigation guide')} · {ready === 1 ? tr(t, 'one_open_lead', '1 object ready') : tr(t, 'open_leads', '{count} objects ready', { count: ready })}</summary>
    <p className="cer-muted">{tr(t, 'guide_help', 'Explore any ready object in any area. More discoveries open new investigations. Selecting an object keeps your unfinished settings.')}</p>
    <div className="cer-guide-areas">{areas.map(area => <section key={area.id} aria-label={area.name}><h3>{area.name}</h3><p className="cer-muted">{tr(t, 'area_progress', '{count}/{total} discoveries collected', { count: area.objects.filter(n => n.status === 'complete').length, total: area.objects.length })}</p><ul className="cer-guide-objects">{area.objects.map(object => <li key={object.id}><button type="button" data-guide-object={object.id} aria-pressed={selectedId === object.id} onClick={() => onSelect(object.id)}><span>{object.name}</span><small>{object.status === 'complete' ? tr(t, 'complete', 'Complete') : object.status === 'ready' ? tr(t, 'available', 'Ready to investigate') : tr(t, 'needs_discoveries', 'Needs discoveries')}</small></button></li>)}</ul></section>)}</div>
  </details>;
}
export function DiscoveryUpdate({ room, progress, solo, onSelect, t }) {
  const roomKey = JSON.stringify(room);
  const previous = useRef({ roomKey, progress }), [update, setUpdate] = useState({ discoveries: [], opened: [] });
  const fingerprint = room.nodes.map(n => progress?.solved?.[n.id] === true ? '1' : '0').join('');
  useEffect(() => {
    if (previous.current.roomKey !== roomKey) setUpdate({ discoveries: [], opened: [] });
    else { const next = discoveryUpdate(room, previous.current.progress, progress); if (next.discoveries.length) setUpdate(next); }
    previous.current = { roomKey, progress: { solved: { ...progress?.solved } } };
  }, [roomKey, fingerprint]);
  const opened = update.opened.filter(n => progress?.solved?.[n.id] !== true);
  return <div data-discovery-update>
    <p className={update.discoveries.length ? 'cer-alert' : 'sr-only'} role="status" aria-live="polite" aria-atomic="true">{update.discoveries.length > 0 && <>{solo ? tr(t, 'your_latest_discoveries', 'Collected: {items}', { items: update.discoveries.map(n => n.name).join(' · ') }) : tr(t, 'team_latest_discoveries', 'New shared discoveries: {items}', { items: update.discoveries.map(n => n.name).join(' · ') })}{opened.length > 0 && <> {tr(t, 'new_investigations', 'Now ready: {items}', { items: opened.map(n => n.name).join(' · ') })}</>}</>}</p>
    {opened.length > 0 && <div className="cer-row">{opened.map(node => <button type="button" key={node.id} data-new-lead={node.id} onClick={() => onSelect(node.id)}>{tr(t, 'investigate_next', 'Investigate {name}', { name: node.name })}</button>)}</div>}
  </div>;
}
