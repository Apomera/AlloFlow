import {tr} from './lesson_board_strings.js';
const React=window.React;

export function productionTotalLabel(board,impact,scope,t){
  if(!impact?.built||!impact.earned)return '';
  const params={count:impact.earned.count,resource:board.resources[impact.earned.resource]};
  return scope==='projected'?tr(t,'production_projected_total','Projected total supplied: {count} {resource}',params):tr(t,'production_total','Supplied so far: {count} {resource}',params);
}

export function productionStampLabel(board,impact,scope,t){
  if(!impact?.potential||impact.potential.maximum<=0)return '';
  const params={resource:board.resources[impact.potential.resource],name:board.projects.find(project=>project.id===impact.id)?.name||''};
  const label=impact.potential.requiresBuild?tr(t,'production_stamp_blueprint','After building {name}: +1 {resource} on a successful investigation.',params):tr(t,'production_stamp_built','From {name}: +1 {resource} on a successful investigation.',params);
  return scope==='projected'?tr(t,'production_projected_stamp','Projection: {effect}',{effect:label}):label;
}

// Printed caches remain the authored base reward. These separate stamps show
// only the currently inspected construction's conditional contribution.
export function ProductionStamp({impact,scope,locationId}){
  if(!impact?.potential||impact.potential.maximum<=0)return null;
  return <span className="lb-production-stamp" data-production-stamp={locationId} data-production-project={impact.id} data-production-resource={impact.potential.resource} data-production-state={impact.potential.requiresBuild?'blueprint':'built'} data-production-scope={scope} aria-hidden="true"><i/><b>+1</b></span>;
}

export function ProductionCounter({board,impact,scope,t}){
  if(!impact?.built||!impact.earned)return null;
  return <span className="lb-production-counter" data-production-total={impact.id} data-production-count={impact.earned.count} data-production-resource={impact.earned.resource} data-production-scope={scope} aria-hidden="true" title={productionTotalLabel(board,impact,scope,t)}><span className="lb-production-stack">{Array.from({length:Math.max(1,Math.min(3,impact.earned.count))},(_,index)=><i key={index} style={{'--coin-level':index}}/>)}</span><b>{impact.earned.count}</b></span>;
}

export function ProductionCaption({board,impact,scope,t}){
  if(!impact?.potential||impact.potential.maximum<=0)return null;
  return <p className="lb-production-caption" data-production-caption={impact.id} data-production-scope={scope}><ProductionStamp impact={impact} scope={scope}/><span>{productionStampLabel(board,impact,scope,t)}{' '}{tr(t,'production_stamp_separate','These markers are extra supplies, separate from each space’s printed base reward.')}</span></p>;
}

export function ConstructionImpactDetail({board,impact,scope,t}){
  if(!impact)return null;
  const potential=impact.potential,connection=impact.connection;
  if(connection){
    if(!impact.built)return null;
    const status=!connection.added?tr(t,'production_bridge_existing','This connection was already on the board; the project adds no new route.'):connection.used?tr(t,'production_bridge_used','The party has crossed this bridge.'):tr(t,'production_bridge_unused','This bridge is built and has not been crossed yet.');
    return <p className="lb-construction-impact-note" data-construction-impact={impact.id} data-impact-scope={scope}>{scope==='projected'?tr(t,'production_projected_bridge','At this plan step: {status}',{status}):status}</p>;
  }
  if(!potential)return null;
  const params={count:potential.maximum,resource:board.resources[potential.resource]};
  return <div className="lb-construction-impact-copy" data-construction-impact={impact.id} data-impact-scope={scope}>
    {impact.built&&<p className="lb-construction-impact-note" data-production-earned={impact.id}><strong>{productionTotalLabel(board,impact,scope,t)}</strong></p>}
    <p data-production-potential={impact.id} data-production-maximum={potential.maximum}>{potential.maximum>0?potential.requiresBuild?tr(t,'production_blueprint_maximum','After construction: up to {count} extra {resource} from later successful investigations.',params):tr(t,'production_built_maximum','Up to {count} more {resource} from remaining successful investigations.',params):tr(t,'production_no_future','No further production fits within the remaining investigations and moves.')}</p>
    {potential.maximum>0&&<p className="lb-production-limit-note">{potential.requiresBuild?tr(t,'production_blueprint_limit','This is an upper limit, assuming you build at the next opportunity. Travel, building later, or finishing early can reduce it.'):tr(t,'production_built_limit','This is an upper limit. Travel or finishing the expedition early can reduce it.')}{scope==='projected'?' '+tr(t,'production_projection_note','These totals belong to this temporary plan.'):''}</p>}
  </div>;
}

export function ConstructionImpactStyles(){return <style>{`
.lb [data-production-resource="0"]{--production-color:var(--accent);--production-soft:var(--soft)}.lb [data-production-resource="1"]{--production-color:var(--gold);--production-soft:var(--gold-soft)}
.lb .lb-production-stamp{display:inline-flex;align-items:center;justify-content:center;gap:4px;width:36px;min-height:20px;flex:none;border:1.5px dashed var(--production-color);border-radius:6px;background:var(--panel);color:var(--production-color);font-size:10px;line-height:1;box-sizing:border-box}.lb .lb-production-stamp>i{display:block;width:8px;height:8px;border:1.5px solid currentColor;border-radius:50%;box-sizing:border-box}.lb .lb-production-stamp[data-production-resource="1"]>i{border-radius:2px}.lb .lb-production-stamp[data-production-state=built]{background:var(--production-soft);border-style:solid;box-shadow:0 2px 0 var(--board-face)}.lb .lb-production-stamp[data-production-state=built]>i{background:currentColor}.lb .lb-production-stamp[data-production-scope=projected]{outline:1px dotted var(--production-color);outline-offset:2px}
.lb .lb-space-supplies{display:inline-flex;align-items:center;justify-content:center;gap:4px;max-width:100%;margin-top:2px}.lb .lb-space-supplies>.lb-resource-cache{margin-top:0;flex:none}.lb .lb-space-supplies>.lb-production-stamp{margin:0}.lb .lb-production-caption{display:flex;align-items:center;gap:9px;margin:10px 0;font-size:.83em;line-height:1.4;overflow-wrap:anywhere}.lb .lb-production-caption>span:last-child{min-width:0}.lb .lb-production-caption .lb-production-stamp{width:40px;min-height:25px;font-size:12px}
.lb .lb-production-counter{display:flex;align-items:center;justify-content:center;gap:4px;position:absolute;top:-12px;right:-8px;min-width:34px;min-height:23px;padding:3px 5px;border:1px solid var(--production-color);border-radius:7px;background:var(--panel);color:var(--production-color);font-size:11px;line-height:1;box-shadow:0 2px 0 var(--board-face);pointer-events:none;box-sizing:border-box;z-index:2}.lb .lb-production-stack{position:relative;display:block;width:10px;height:11px;flex:none}.lb .lb-production-stack>i{position:absolute;left:0;bottom:calc(var(--coin-level) * 2px);width:10px;height:6px;border:1px solid var(--production-color);border-radius:50%;background:var(--production-soft);box-sizing:border-box}.lb .lb-production-counter[data-production-resource="1"] .lb-production-stack>i{border-radius:2px}.lb .lb-production-counter[data-production-count="0"] .lb-production-stack>i{background:var(--panel);border-style:dashed}.lb .lb-production-counter[data-production-scope=projected]{border-style:dashed}
.lb .lb-construction-impact-note{padding:8px 10px;border-inline-start:3px solid var(--route);border-radius:0 7px 7px 0;background:var(--route-soft);overflow-wrap:anywhere}.lb .lb-construction-impact-copy p{overflow-wrap:anywhere}.lb .lb-construction-impact-copy .lb-production-limit-note{color:var(--muted);font-size:.78em}.lb [data-impact-scope=projected] .lb-construction-impact-note,.lb .lb-construction-impact-note[data-impact-scope=projected]{border-inline-start-style:dashed}.lb .lb-production-list-effect{color:var(--route)}.lb .lb-spatial-route[data-construction-impact-route]{stroke:var(--accent);stroke-width:10;opacity:1}.lb .lb-spatial-list-projects [data-production-list-total]{font-weight:700}
@media(max-width:600px){.lb .lb-production-counter{top:-10px;right:-5px;min-width:29px;min-height:21px;font-size:10px;padding:3px 4px;gap:3px}.lb .lb-space-supplies>.lb-production-stamp{min-height:18px;width:32px;font-size:9px;gap:3px}.lb .lb-production-caption{font-size:.8em;align-items:flex-start}.lb .lb-production-caption .lb-production-stamp{margin-top:2px}.lb .lb-production-caption>span:last-child{flex:1}}
@media(forced-colors:active){.lb [data-production-resource]{--production-color:CanvasText;--production-soft:Canvas}.lb .lb-production-counter,.lb .lb-production-stamp,.lb .lb-production-stamp[data-production-state=built]{background:Canvas;color:CanvasText;box-shadow:none;border-color:CanvasText}.lb .lb-production-stamp[data-production-state=built]>i{background:CanvasText}.lb .lb-production-stack>i{border-color:CanvasText;background:Canvas}.lb .lb-construction-impact-note{background:Canvas;border-color:Highlight}.lb .lb-spatial-route[data-construction-impact-route]{stroke:Highlight}.lb .lb-production-list-effect{color:CanvasText}}
`}</style>;}
