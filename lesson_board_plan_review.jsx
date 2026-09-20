import {planReview, previewSupport} from './lesson_board_plan_review.js';
import {targets} from './lesson_board_engine.js';
import {simulatePlan} from './lesson_board_sandbox.js';
import {BoardMap} from './lesson_board_map.jsx';
import {Amounts} from './lesson_board_play_extras.jsx';
import {tr} from './lesson_board_strings.js';
const React=window.React;
const NoIcon=()=>null;

export function PlanMissionReview({board,result,t}) {
  const review=planReview(board,result);
  return <details data-plan-mission-review><summary>{tr(t,'plan_review_title','Concepts, goals, and construction effects')}</summary>
    <p>{result.newConcepts.length?tr(t,'plan_review_concepts','New concepts explored in this plan: {names}',{names:board.concepts.filter(concept=>result.newConcepts.includes(concept.id)).map(concept=>concept.name).join(', ')}):tr(t,'plan_review_no_new_concepts','This plan does not explore an additional concept.')}</p>
    {result.progress.complete?<p>{tr(t,'sandbox_mission_complete','This plan would complete the mission.')}</p>:<><h5>{tr(t,'plan_review_remaining','Still needed to finish the mission')}</h5><ul>
      {review.missingConcepts.length>0&&<li>{tr(t,'plan_review_missing_concepts','Explore these concepts: {names}',{names:review.missingConcepts.map(concept=>concept.name).join(', ')})}</li>}
      {review.remainingProjects>0&&<li>{tr(t,'plan_review_missing_projects','Build {count} more constructions.',{count:review.remainingProjects})}</li>}
      {review.remainingLocations.length>0&&<li>{tr(t,'plan_review_missing_locations','Explore {count} remaining locations: {names}',{count:review.remainingLocations.length,names:review.remainingLocations.map(node=>node.name).join(', ')})}</li>}
    </ul></>}
    {review.effects.length>0&&<><h5>{tr(t,'plan_review_effects','Effects within this plan')}</h5><ul>{review.effects.map(effect=><li key={effect.project.id} data-plan-effect={effect.project.id}><strong>{effect.project.name}: </strong>{effect.project.effect.kind==='yield'?tr(t,'plan_review_earned','{count} extra {resource} from later explorations in this plan.',{count:effect.earned,resource:board.resources[effect.project.effect.resource]}):effect.opened?tr(t,'plan_review_opened','Opens a new route to {name}.',{name:effect.destination.name}):effect.visitedBefore?tr(t,'plan_review_already_visited','{name} is already explored when this shortcut is built.',{name:effect.destination.name}):result.progress.complete&&result.steps[result.steps.length-1]?.id===effect.project.id?tr(t,'plan_review_final_project','This construction completes the mission, so there is no later exploration.'):tr(t,'plan_review_already_open','{name} is already reachable when this shortcut is built.',{name:effect.destination.name})}</li>)}</ul></>}
    <p className="lb-muted">{tr(t,'plan_review_learning_note','Projected exploration shows route coverage. It does not record anyone’s understanding or award learning credit.')}</p>
  </details>;
}

export function PlanTradeoffs({board,plans,t}) {
  if(!plans.every(plan=>plan.steps.length))return null;
  const [a,b]=plans,moveDifference=a.steps.length-b.steps.length;
  return <section className="lb-notice" data-plan-tradeoffs><h4>{tr(t,'plan_tradeoffs_title','Plan A compared with Plan B')}</h4><p>{moveDifference===0?tr(t,'plan_tradeoffs_same_moves','Both plans use the same number of moves.'):moveDifference>0?tr(t,'plan_tradeoffs_more_moves','Plan A uses {count} more moves.',{count:moveDifference}):tr(t,'plan_tradeoffs_fewer_moves','Plan A uses {count} fewer moves.',{count:-moveDifference})}</p><ul>{board.resources.map((resource,index)=>{const difference=a.progress.balance[index]-b.progress.balance[index];return <li key={index}>{difference===0?tr(t,'plan_tradeoffs_same_supplies','Both plans leave the same amount of {resource}.',{resource}):difference>0?tr(t,'plan_tradeoffs_more_supplies','Plan A leaves {count} more {resource}.',{count:difference,resource}):tr(t,'plan_tradeoffs_fewer_supplies','Plan A leaves {count} fewer {resource}.',{count:-difference,resource})}</li>;})}</ul><p className="lb-muted">{tr(t,'plan_tradeoffs_help','Compare the concepts and mission goals below as well as supplies. More remaining supplies alone does not mean a stronger plan.')}</p></section>;
}

function PreviewWorld({board,base,ids,title,support,showImages,Icon,t}) {
  const routeKey=JSON.stringify([base,ids,title]),[position,setPosition]=React.useState(null),[view,setView]=React.useState('board');
  React.useEffect(()=>setPosition(null),[routeKey]);
  const index=position?.key===routeKey?Math.min(position.index,ids.length):ids.length;
  const frame=React.useMemo(()=>simulatePlan(board,base,ids.slice(0,index)),[board,base,ids,index]);
  const move=frame.steps[frame.steps.length-1],selected=position?.key===routeKey?position.selected:move?.id||'';
  const inspected=[...board.locations,...board.projects].find(node=>node.id===selected);
  const pictures=React.useMemo(()=>previewSupport(support,frame.initial.visited),[support,frame.initial]);
  const go=next=>setPosition({key:routeKey,index:next,selected:next?ids[next-1]:''});
  const select=id=>setPosition({key:routeKey,index,selected:id});
  return <div className="lb-plan-preview-world">
    <p className="lb-notice">{tr(t,'plan_preview_help','This is a projected world. Each planned exploration assumes a successful response. Selecting a location here only inspects this preview.')}</p>
    <div className="lb-plan-preview-controls"><label>{tr(t,'plan_preview_position','Preview point')}<select data-plan-preview-position value={index} onChange={event=>go(Number(event.target.value))}><option value={0}>{tr(t,'plan_preview_start','Starting board')}</option>{ids.map((id,i)=><option key={i} value={i+1}>{tr(t,'plan_preview_option','After move {count}: {name}',{count:i+1,name:[...board.locations,...board.projects].find(node=>node.id===id)?.name||''})}</option>)}</select></label><div className="lb-row"><button type="button" data-plan-preview-prev disabled={index===0} onClick={()=>go(index-1)}>{tr(t,'plan_preview_previous','Previous preview step')}</button><button type="button" data-plan-preview-next disabled={index===ids.length} onClick={()=>go(index+1)}>{tr(t,'plan_preview_next','Next preview step')}</button></div></div>
    <p role="status" data-plan-preview-status>{index?tr(t,'plan_preview_at','{plan}: after {count} of {total} planned moves.',{plan:title,count:index,total:ids.length}):tr(t,'plan_preview_at_start','{plan}: starting board before any planned moves.',{plan:title})}</p>
    <p><strong>{tr(t,'sandbox_projected_supplies','Projected supplies')}</strong></p><Amounts board={board} values={frame.progress.balance} zeros/>
    {move?.newlyOpened.length>0&&<p data-plan-preview-opened>{tr(t,'plan_preview_new_routes','This step opens: {names}',{names:board.locations.filter(node=>move.newlyOpened.includes(node.id)).map(node=>node.name).join(', ')})}</p>}
    {frame.progress.complete&&<p>{tr(t,'sandbox_mission_complete','This plan would complete the mission.')}</p>}
    <div className="lb-row" role="group" aria-label={tr(t,'plan_preview_display','Preview display')}><button type="button" data-plan-preview-map aria-pressed={view==='board'} onClick={()=>setView('board')}>{tr(t,'plan_preview_map','Preview map')}</button><button type="button" data-plan-preview-list aria-pressed={view==='list'} onClick={()=>setView('list')}>{tr(t,'plan_preview_list','Preview location list')}</button></div>
    {inspected&&<p data-plan-preview-selection><strong>{tr(t,'plan_preview_inspecting','Inspecting in preview: {name}',{name:inspected.name})}</strong>{' '}{inspected.cost?inspected.description:board.concepts.find(concept=>concept.id===inspected.conceptId)?.name}</p>}
    <BoardMap projection board={board} run={frame.run} progress={frame.progress} ready={targets(board,frame.run).map(node=>node.id)} selected={selected} onSelect={select} support={pictures} showImages={showImages} Icon={Icon||NoIcon} view={view} t={t}/>
  </div>;
}

export function PlanMapPreview(props) {
  const [open,setOpen]=React.useState(false);
  return <details className="lb-plan-preview" data-plan-preview onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}><summary>{tr(props.t,'plan_preview_title','Preview this plan on the map')}</summary><style>{`.lb .lb-plan-preview{margin:16px 0;border:1px solid var(--line);border-radius:12px;padding:12px}.lb .lb-plan-preview-world{margin-top:12px}.lb .lb-plan-preview-controls{display:grid;gap:12px}.lb .lb-plan-preview-controls label{min-width:0}.lb .lb-plan-preview-controls select{width:100%;max-width:100%}.lb .lb-plan-preview .lb-tabletop{margin-top:14px}.lb .lb-plan-preview [data-plan-preview-selection]{overflow-wrap:anywhere}.lb [data-plan-tradeoffs] h4{margin-top:0}.lb [data-plan-mission-review]{margin-top:14px}.lb [data-plan-mission-review] li{margin:6px 0}`}</style>{open&&<PreviewWorld {...props}/>}</details>;
}
