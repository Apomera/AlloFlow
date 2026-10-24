import { addBoardStyle } from './lesson_board_style.js';
import {investmentPreview,investmentComparisons} from './lesson_board_investment.js';
import {fundingLabel} from './lesson_board_funding_ui.jsx';
import {Amounts} from './lesson_board_play_extras.jsx';
import {VentureForecastNote} from './lesson_board_tactical_preview.jsx';
import {tr} from './lesson_board_strings.js';
const React=window.React;

export function ConstructionInvestment({board,run,project,funding='standard',onCompare,disabled,t}) {
  const preview=React.useMemo(()=>investmentPreview(board,run,project.id,funding),[board,run,project.id,funding]);
  const [open,setOpen]=React.useState(false),[selected,setSelected]=React.useState('');
  const comparisons=React.useMemo(()=>open&&preview?investmentComparisons(board,run,project.id,funding):[],[open,preview,board,run,project.id,funding]);
  if(!preview)return null;
  const choice=comparisons.find(item=>item.locationId===selected)||comparisons[0];
  const name=id=>board.locations.find(node=>node.id===id)?.name||id;
  return <details data-construction-investment className="lb-investment" onToggle={event=>{if(event.target===event.currentTarget)setOpen(event.currentTarget.open);}}>
    <summary>{tr(t,'investment_title','Compare this investment')}</summary>
    {addBoardStyle(`.lb .lb-investment{border:1px solid var(--line);border-radius:12px;padding:0 12px;margin:12px 0;background:var(--panel)}.lb .lb-investment>summary{min-height:48px}.lb .lb-investment p{font-size:.88em}.lb .lb-investment select{max-width:100%}.lb .lb-investment-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.lb .lb-investment-option{min-width:0;border:1px solid var(--line);border-top:3px solid var(--accent);border-radius:9px;padding:10px}.lb .lb-investment-option h4{margin:0 0 5px;font-size:.95em}.lb .lb-investment-option small{display:block;margin:5px 0}.lb .lb-investment-option .lb-token{font-size:.78em}.lb [data-investment-route-savings]{border-top:1px dashed var(--line);padding-top:10px}.lb [data-investment-route-savings] h4{margin:0;font-size:.95em}.lb [data-investment-route-savings] ul{list-style:none;padding:0;display:grid;gap:8px}.lb [data-investment-route-savings] li{border-inline-start:3px solid var(--route);padding:4px 10px;overflow-wrap:anywhere}.lb [data-investment-route-savings] small{display:block;font-size:.82em;margin-top:3px}.lb .lb-investment>button{margin-bottom:10px}@media(max-width:600px){.lb .lb-investment-options{grid-template-columns:1fr}}`)}
    {preview.yield&&<p data-investment-payback>{tr(t,'investment_yield','Each later successful investigation earns +1 {resource}. Up to {count} investigations remain within the move limit.',{resource:board.resources[preview.yield.resource],count:preview.yield.maximum})}{' '}{preview.yield.canRecover?tr(t,'investment_recover','After {count} investigations, that income matches the {cost} {resource} portion of this payment.',{count:preview.yield.investigationsToRecover,cost:preview.yield.costToRecover,resource:board.resources[preview.yield.resource]}):tr(t,'investment_not_recovered','The remaining investigations cannot recover the {cost} {resource} portion of this payment.',{cost:preview.yield.costToRecover,resource:board.resources[preview.yield.resource]})}{' '}{tr(t,'investment_other_cost','The {cost} {resource} portion is a separate cost.',{cost:preview.yield.otherResourceCost,resource:board.resources[1-preview.yield.resource]})}</p>}
    {preview.bridge&&<><p data-investment-frontier>{preview.bridge.newlyReachableIds.length?tr(t,'investment_bridge_frontier','Building now opens these new investigation choices: {names}.',{names:preview.bridge.newlyReachableIds.map(name).join(', ')}):tr(t,'investment_bridge_no_new_choice','Building now does not add a new investigation choice this turn.')}</p>
      {preview.bridge.routeSavings.length>0&&<section data-investment-route-savings>
        <h4>{tr(t,'investment_shorter_routes','Shorter routes from {name}',{name:name(preview.siteId)})}</h4>
        <p>{tr(t,'investment_route_direction','Without this bridge → with this bridge')}</p>
        <ul>{preview.bridge.routeSavings.map(route=><li key={route.id} data-investment-route={route.id}>
          <strong>{name(route.id)}{route.id===board.starts[0]?' · '+tr(t,'investment_route_home','Home camp'):''}</strong>
          <small>{tr(t,'investment_route_segments','Segments: {before} → {after}',{before:route.beforeSegments,after:route.afterSegments})}</small>
          <small>{tr(t,'investment_route_moves','Moves to reach: {before} → {after}',{before:route.beforeMoves,after:route.afterMoves})}{route.beforeMoves===route.afterMoves?' · '+tr(t,'investment_route_same_moves','Shorter route, same move count.'):''}</small>
        </li>)}</ul>
        <p className="lb-muted" data-investment-route-tradeoff>{tr(t,'investment_route_tradeoff','Building uses one move before these journeys. Each route starts at this construction site and crosses only cleared spaces. An unexplored destination still needs its investigation.')}</p>
      </section>}
      {preview.bridge.pathfinderPotential.some(Boolean)&&<p>{tr(t,'investment_bridge_kit','Your Pathfinder bonus is still available. It is earned on the first actual bridge crossing, after construction.')}</p>}</>}
    {choice?<>
      <label>{tr(t,'investment_compare_stop','Compare timing around this investigation')}<select data-investment-stop value={choice.locationId} disabled={disabled} onChange={event=>setSelected(event.target.value)}>{comparisons.map(item=><option key={item.locationId} value={item.locationId}>{name(item.locationId)}</option>)}</select></label>
      <p>{tr(t,'investment_timing_help','Build first, or investigate and return to the site before building. Preparing first uses the printed payment when it becomes affordable.')}</p>
      <div className="lb-investment-options">{choice.plans.map((plan,index)=>{const build=plan.result.steps.find(step=>step.kind==='build'&&step.id===project.id);return <section className="lb-investment-option" data-investment-plan={index} key={index}><h4>{index===0?tr(t,'investment_build_first','A · Build first'):tr(t,'investment_prepare_first','B · Prepare first')}</h4><small>{tr(t,'investment_moves','Moves: {count}',{count:plan.result.steps.length})}</small><small>{fundingLabel(board,build.funding,t)}</small><strong>{tr(t,'investment_supplies_left','Supplies afterward')}</strong><Amounts board={board} values={plan.result.progress.balance} zeros/><VentureForecastNote board={board} uncertainVentures={plan.result.uncertainVentures} pendingVenture={plan.result.progress.fieldVenture} compact t={t}/>{plan.result.progress.complete&&<small>{tr(t,'sandbox_mission_complete','This plan would complete the mission.')}</small>}</section>;})}</div>
      <button type="button" data-investment-compare disabled={disabled} onClick={()=>onCompare(choice.plans.map(plan=>plan.entries))}>{tr(t,'investment_open_plans','Open these as Plans A and B')}</button>
      <p className="lb-muted">{tr(t,'investment_projection_note','These are legal alternatives, not a promise of the best route. They assume a successful investigation, include earned kit and contract bonuses, and exclude future fortune. Opening them replaces the temporary plans; your real game stays unchanged.')}</p>
    </>:<p className="lb-muted">{tr(t,'investment_no_pair','There is no complete build-first / prepare-first comparison from this position within the remaining moves. You can still inspect this construction or plan your own route.')}</p>}
  </details>;
}
