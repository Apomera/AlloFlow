import { analyzeRoomFlow } from './connected_escape_room_flow.js';
const React = window.React;
const tr = (t, key, fallback, params = {}) => {
  const full = 'connected_escape.' + key, value = typeof t === 'function' ? t(full, params) : '';
  return Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{' + k + '}', String(v)), typeof value === 'string' && value && value !== full ? value : fallback);
};
export function RoomFlowReview({ room, onReview, disabled, t }) {
  const flow = React.useMemo(() => analyzeRoomFlow(room), [room]);
  const byId = new Map(room.nodes.map(node => [node.id, node]));
  const byReward = new Map(room.nodes.map(node => [node.reward.id, node.reward.name]));
  const names = ids => ids.map(id => byId.get(id).name).join(' · ');
  const objects = ids => <ul className="cer-guide-objects">{ids.map(id => { const node = byId.get(id); return <li key={id}><button type="button" disabled={disabled} data-flow-object={id} onClick={() => onReview(id)}><span>{node.name}</span><small>{node.requires.length ? tr(t, 'requires', 'Needed: {items}', { items: node.requires.map(reward => byReward.get(reward)).join(' · ') }) : tr(t, 'starting_object', 'Starting object')}</small><small>{tr(t, 'flow_produces', 'Reveals: {name}', { name: node.reward.name })}</small></button></li>; })}</ul>;
  return <details data-room-flow>
    <summary>{tr(t, 'flow_title', 'How this room connects')} · {flow.independentPaths === 1 ? tr(t, 'flow_one_path', '1 independent puzzle path') : tr(t, 'flow_path_count', '{count} independent puzzle paths', { count: flow.independentPaths })}</summary>
    <p>{tr(t, 'flow_intro', 'Follow the discoveries from starting objects to the exit. Select an object to review its clues. This checks puzzle connections; use the playability review to check the reasoning.')}</p>
    <p className="cer-muted">{tr(t, 'flow_solo_team', 'One player can explore every path. Teammates can explore different paths and share the discoveries; simultaneous actions are never required.')}</p>
    {flow.independentPaths < 2 && <p className="cer-alert" data-flow-concern>{tr(t, 'flow_sequential', 'This room remains playable, but fewer than two paths have their own reasoning puzzle. Generate another room for more independent investigations.')}</p>}
    <p><strong>{tr(t, 'flow_start', 'Start anywhere here:')}</strong> {names(flow.startingIds)}</p>
    {flow.toolGateIds.length > 0 && <p>{tr(t, 'flow_tool_gate', 'A tool discovery opens the puzzle paths: {items}', { items: names(flow.toolGateIds) })}</p>}
    {flow.sharedIds.length > 0 && <section aria-label={tr(t, 'flow_shared', 'Shared discoveries')}><h3>{tr(t, 'flow_shared', 'Shared discoveries')}</h3><p className="cer-muted">{tr(t, 'flow_shared_help', 'These objects contribute to more than one path. Their discoveries stay available for everyone.')}</p>{objects(flow.sharedIds)}</section>}
    <div className="cer-guide-areas" style={{ marginTop: 16 }}>{flow.branches.map((branch, index) => <section className="cer-panel" key={branch.endNodeId} aria-label={tr(t, 'flow_path_name', 'Path {number}: {name}', { number: index + 1, name: byId.get(branch.endNodeId).reward.name })}><h3>{tr(t, 'flow_path_name', 'Path {number}: {name}', { number: index + 1, name: byId.get(branch.endNodeId).reward.name })}</h3><p className="cer-muted">{tr(t, 'flow_puzzle_count', 'Reasoning devices on this path: {count}', { count: branch.puzzleIds.length })}</p>{objects(branch.nodeIds)}</section>)}</div>
    <section style={{ marginTop: 16 }} aria-label={tr(t, 'flow_exit', 'Reunite at the exit')}><h3>{tr(t, 'flow_exit', 'Reunite at the exit')}</h3>{objects([flow.exitNodeId])}</section>
  </details>;
}
