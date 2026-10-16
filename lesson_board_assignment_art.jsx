import {planningKey} from './lesson_board_sandbox.js';
import {tr} from './lesson_board_strings.js';
const React=window.React;
const edgeKey=(a,b)=>[a,b].sort().join(':');

// This is a drawing of a private plan. No projected state is applied to the
// live board, and the plan disappears as soon as its authoritative base changes.
export function assignmentMapModel(board,run,preview){
  if(!preview||!run||preview.key!==planningKey(board,run)||!Array.isArray(preview.plan?.order)||!Array.isArray(preview.plan?.result?.steps)||!Array.isArray(preview.assignments))return null;
  const known=new Set(board.locations.map(node=>node.id)),projects=new Set(board.projects.map(node=>node.id));
  const priorities=preview.plan.order.flatMap((id,index)=>{
    const assignment=preview.assignments.find(item=>item.id===id),target=assignment?.projectId||assignment?.targetId;
    if(!assignment||!(assignment.projectId?projects:known).has(target))return [];
    return [{...assignment,target,priority:index+1}];
  });
  if(!priorities.length)return null;
  const edges=new Map();
  for(const step of preview.plan.result.steps){
    const path=step.path;if(!Array.isArray(path)||path.some(id=>!known.has(id)))continue;
    path.slice(1).forEach((to,index)=>{const from=path[index];if(from!==to&&!edges.has(edgeKey(from,to)))edges.set(edgeKey(from,to),{from,to,key:edgeKey(from,to)});});
  }
  return {priorities,edges:[...edges.values()],partial:preview.plan.status==='blocked'};
}

export function assignmentPriorityLabel(priority,t){
  if(!priority)return '';
  const kind=priority.kind==='relay'?tr(t,'assignment_map_relay','Relay next handoff'):priority.kind==='commission'?tr(t,'assignment_map_commission','Construction commission'):priority.kind==='delivery'?tr(t,'assignment_map_delivery','Delivery'):tr(t,'assignment_map_expedition','Expedition destination');
  return tr(t,'assignment_map_priority_label','Private plan priority {number}: {kind}',{number:priority.priority,kind});
}

export function AssignmentPriorityToken({priority}){
  if(!priority)return null;
  return <span className="lb-assignment-map-token" data-assignment-map-priority={priority.id} data-assignment-priority={priority.priority} data-assignment-target={priority.target} aria-hidden="true"><span>P</span>{priority.priority}</span>;
}

export function AssignmentMapCaption({board,model,routes=[],onInspect,onClear,t}){
  if(!model)return null;
  const name=id=>board.locations.find(node=>node.id===id)?.name||board.projects.find(node=>node.id===id)?.name||'';
  const currentEdges=new Set(routes.map(route=>edgeKey(route.from,route.to))),futureConnection=model.edges.some(edge=>!currentEdges.has(edge.key));
  return <div className="lb-assignment-map-caption" data-assignment-map-preview tabIndex={-1} data-assignment-map-partial={model.partial}>
    <div className="lb-assignment-map-heading"><strong>{tr(t,'assignment_map_title','Private assignment plan')}</strong><button type="button" data-clear-assignment-preview disabled={typeof onClear!=='function'} onClick={()=>onClear?.()}>{tr(t,'assignment_map_clear','Clear preview')}</button></div>
    {model.partial&&<p className="lb-assignment-map-partial" data-assignment-map-partial-note>{tr(t,'assignment_map_partial','Partial plan — assignments remain unfinished.')}</p>}
    <p>{tr(t,'assignment_map_help','Dashed lines suggest future travel. Numbered tokens show your requested priorities; rewards may arrive in a different order. Previewing and inspecting do not move the party.')}</p>
    {futureConnection&&<p data-assignment-future-note>{tr(t,'assignment_map_future_connection','Dash-dot segments depend on planned construction.')}</p>}
    <div className="lb-assignment-map-priorities" role="group" aria-label={tr(t,'assignment_map_priorities','Assignment priorities')}>{model.priorities.map(priority=><button type="button" key={priority.id} data-assignment-map-inspect={priority.id} data-assignment-inspect-target={priority.target} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(priority.target)} aria-label={assignmentPriorityLabel(priority,t)+'. '+tr(t,'assignment_map_inspect','Inspect {name}',{name:name(priority.target)})}><span className="lb-assignment-map-key" aria-hidden="true">P{priority.priority}</span><span>{name(priority.target)}</span></button>)}</div>
  </div>;
}

export function AssignmentMapRoutes({model,positions,excluded=new Set(),routes=[]}){
  if(!model)return null;
  const open=new Set(routes.map(route=>edgeKey(route.from,route.to)));
  return <g data-assignment-map-overlay>{model.edges.map(({from,to,key})=>{
    const a=positions[from],b=positions[to];if(!a||!b||excluded.has(key))return null;
    const d=`M ${a.x*1000} ${a.y*700} L ${b.x*1000} ${b.y*700}`;
    return <React.Fragment key={key}><path className="lb-assignment-route-underlay" d={d} vectorEffect="non-scaling-stroke"/><path className="lb-assignment-route" data-assignment-map-route={from+':'+to} data-assignment-future-connection={!open.has(key)} d={d} vectorEffect="non-scaling-stroke"/></React.Fragment>;
  })}</g>;
}

export function AssignmentMapStyles(){return <style>{`
.lb .lb-assignment-map-caption{margin:10px 0;padding:9px 11px;border:1px dashed var(--accent);border-radius:10px;background:var(--soft);min-width:0}.lb .lb-assignment-map-heading{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 10px;font-size:.87em}.lb .lb-assignment-map-heading button{font-size:.9em;min-height:44px;padding:6px 9px}.lb .lb-assignment-map-caption p{font-size:.78em;line-height:1.45;margin:5px 0 8px;overflow-wrap:anywhere}.lb .lb-assignment-map-caption .lb-assignment-map-partial{font-weight:700}.lb .lb-assignment-map-priorities{display:flex;flex-wrap:wrap;gap:6px}.lb .lb-assignment-map-priorities button{display:flex;align-items:center;gap:7px;flex:1 1 160px;min-width:0;min-height:44px;padding:7px 9px;font-size:.8em;text-align:start;white-space:normal}.lb .lb-assignment-map-priorities button>span:last-child{min-width:0;overflow-wrap:anywhere}.lb .lb-assignment-map-key,.lb .lb-assignment-map-token{display:inline-flex;justify-content:center;align-items:center;box-sizing:border-box;width:27px;height:24px;flex:none;border:2px dashed var(--accent);border-radius:6px;background:var(--panel);color:var(--ink);font-size:11px;font-weight:750;line-height:1}.lb .lb-assignment-map-token{position:absolute;top:-12px;left:-9px;z-index:4;pointer-events:none;box-shadow:0 2px 0 var(--board-face),0 3px 3px var(--board-shadow);transform:translateZ(4px)}.lb [data-contract-destination=true]>.lb-assignment-map-token{top:-21px}.lb .lb-home-standard+button>.lb-assignment-map-token{top:auto;bottom:-20px}.lb .lb-spatial-project>.lb-assignment-map-token{top:auto;bottom:0}.lb .lb-assignment-map-token>span{font-size:8px;margin-inline-end:1px}.lb .lb-assignment-route-underlay{fill:none;stroke:var(--board-top);stroke-width:7;stroke-linecap:round}.lb .lb-assignment-route{fill:none;stroke:var(--accent);stroke-width:3;stroke-dasharray:7 6;stroke-linecap:round;opacity:.86}.lb .lb-assignment-route[data-assignment-future-connection=true]{stroke-dasharray:7 4 1 4}.lb .lb-assignment-list-priority{font-weight:650;color:var(--accent)}
@media(max-width:600px){.lb .lb-assignment-map-caption{padding:8px}.lb .lb-assignment-map-priorities button{flex-basis:100%}}
@media(forced-colors:active){.lb .lb-assignment-map-caption,.lb .lb-assignment-map-token,.lb .lb-assignment-map-key{border-color:LinkText;background:Canvas;color:CanvasText}.lb .lb-assignment-map-token{box-shadow:none}.lb .lb-assignment-route-underlay{stroke:Canvas}.lb .lb-assignment-route{stroke:LinkText;opacity:1}.lb .lb-assignment-list-priority{color:LinkText}}
`}</style>;}
