import * as engine from './lesson_board_engine.js';
import {ExpeditionKitHud,ExpeditionKitReward} from './lesson_board_tactics_ui.jsx';
import {ResourceForecast} from './lesson_board_tokens.jsx';
import {ventureUncertainties} from './lesson_board_sandbox.js';
import {tr} from './lesson_board_strings.js';
const React=window.React;

// One legal hypothetical move, using the same rule engine as play. No answer key,
// random roll, mutation, or live action leaves this preview.
export function forecastTabletopMove(board,run,id,funding='standard',route='shortest'){
  if(board.playStyle!=='tabletop'||engine.derive(board,run).complete)return null;
  let base=run;
  if(engine.stepOf(base).phase==='review'){
    if(!engine.turnLimit(board,base).canAdvance)return null;
    base=engine.merge(base,engine.advance(board,base));
  }
  if(engine.stepOf(base).phase!=='choose')return null;
  const target=engine.targets(board,base).find(item=>item.id===id);
  if(!target)return null;
  const payment=target.cost?engine.constructionFunding(board,base,id).find(option=>option.id===funding&&option.legal):null;
  if(target.cost&&!payment)return null;
  const before=engine.derive(board,base);let projected;
  try{projected=engine.merge(base,engine.begin(board,base,id,funding,route));}catch(_){return null;}
  const investigation=engine.stepOf(projected).phase==='answer';
  if(investigation)projected=engine.merge(projected,{['steps.t'+projected.turn+'.phase']:'review',['steps.t'+projected.turn+'.result']:{success:true,marks:{}}});
  const after=engine.derive(board,projected),spent=payment?.cost||[0,0],uncertainVentures=ventureUncertainties(after,projected.turn);
  return {balance:after.balance,gain:after.balance.map((value,i)=>value-before.balance[i]+spent[i]),spent,...(uncertainVentures.length?{uncertainVentures}:{}),...(after.fieldVenture?{pendingVenture:{...after.fieldVenture,reward:after.fieldVenture.reward.slice()}}:{}),
    complete:after.complete,usedProjects:(after.usedProjects||[]).filter(id=>!(before.usedProjects||[]).includes(id)),
    kitGain:after.kitGains?.map((value,i)=>value-(before.kitGains?.[i]||0))||[0,0],
    fieldGain:after.fieldGains?.map((value,i)=>value-(before.fieldGains?.[i]||0))||[0,0],
    preparationGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&!item.kind).reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    crewGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&item.kind==='construction').reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    commissionGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&item.kind==='commission').reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    leadGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&item.kind==='destination').reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    deliveryGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&item.kind==='delivery').reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    relayGain:(after.fieldDeliveries||[]).filter(item=>item.turn===projected.turn&&['relay-stop','relay'].includes(item.kind)).reduce((sum,item)=>sum.map((value,i)=>value+item.gain[i]),[0,0]),
    contracts:(after.completedContracts||[]).filter(contract=>!before.completedContracts?.includes(contract)),
    investigation,travel:!target.cost&&!investigation,remaining:Math.min(board.locations.length-after.visited.length,Math.max(0,engine.MAX_TURNS-1-projected.turn))};
}

const amount=(board,values)=>values.map((value,index)=>value?value+' '+board.resources[index]:null).filter(Boolean).join(' · ');
export function VentureForecastNote({board,uncertainVentures=[],pendingVenture,compact=false,t}){
  if(!uncertainVentures.length&&!pendingVenture)return null;
  const Wrapper=compact?'small':'div',Line=compact?'span':'p';
  return <Wrapper className="lb-muted" data-venture-forecast-note>
    {uncertainVentures.map(item=><Line key={item.originTurn+':'+item.turn} data-venture-forecast={item.targetId}>{compact?tr(t,'venture_forecast_compact','Survey venture resolves here: 50% chance of +{reward}, otherwise +0. Possible bonus excluded.',{reward:amount(board,item.reward)}):tr(t,'venture_forecast_unknown','At {name}, the survey venture has a 50% chance of +{reward}; otherwise +0. This possible bonus is excluded from these supplies and construction payments.',{name:board.locations.find(node=>node.id===item.targetId)?.name||item.targetId,reward:amount(board,item.reward)})}</Line>)}
    {!uncertainVentures.length&&pendingVenture&&<Line data-venture-forecast-pending>{tr(t,'venture_forecast_pending','The survey venture stays ready for the next successful new investigation. This plan has not resolved it, and no possible venture bonus is included in these supplies.')}</Line>}
  </Wrapper>;
}
export function TacticalMoveDetails({board,run,target,funding,route,t}){
  const forecast=forecastTabletopMove(board,run,target.id,funding,route);
  if(!forecast)return null;
  return <div data-tabletop-forecast style={{borderTop:'1px dashed var(--line)',paddingTop:8,fontSize:'.88em'}}>
    <p><strong>{tr(t,'tactic_after_move','Supplies after this move')}</strong></p><ResourceForecast board={board} forecast={forecast} t={t}/>
    <VentureForecastNote board={board} uncertainVentures={forecast.uncertainVentures} pendingVenture={forecast.pendingVenture} t={t}/>
    {forecast.investigation&&<p className="lb-muted">{board.chance?tr(t,'tactic_success_assumption','Assumes a successful investigation. Fortune bonuses are extra.'):tr(t,'tactic_success_only','Assumes a successful investigation.')}</p>}
    {forecast.kitGain.some(Boolean)&&<p data-forecast-kit>{tr(t,'tactic_kit_included','Includes kit bonus: {reward}',{reward:amount(board,forecast.kitGain)})}</p>}
    {forecast.preparationGain.some(Boolean)&&<p data-forecast-field>{tr(t,'tactic_field_included','Includes your prepared supplies: {reward}',{reward:amount(board,forecast.preparationGain)})}</p>}
    {forecast.crewGain.some(Boolean)&&<p data-forecast-crew>{tr(t,'tactic_crew_included','Includes the crew return after paying the full cost: {reward}',{reward:amount(board,forecast.crewGain)})}</p>}
    {forecast.commissionGain.some(Boolean)&&<p data-forecast-commission>{tr(t,'tactic_commission_included','Includes the commission reward after paying for this named project: {reward}',{reward:amount(board,forecast.commissionGain)})}</p>}
    {forecast.leadGain.some(Boolean)&&<p data-forecast-lead>{tr(t,'tactic_lead_included','Includes your destination lead reward on success: {reward}',{reward:amount(board,forecast.leadGain)})}</p>}
    {forecast.deliveryGain.some(Boolean)&&<p data-forecast-delivery>{tr(t,'tactic_delivery_included','Includes the one-time delivery reward when this travel ends: {reward}',{reward:amount(board,forecast.deliveryGain)})}</p>}
    {forecast.relayGain.some(Boolean)&&<p data-forecast-relay>{tr(t,'tactic_relay_included','Includes this relay handoff when travel ends here: {reward}',{reward:amount(board,forecast.relayGain)})}</p>}
    {forecast.contracts.length>0&&<p data-forecast-contracts>{tr(t,'tactic_contract_included','Completes contracts: {names}. Their bonus supplies are included.',{names:forecast.contracts.map(id=>board.contracts.find(contract=>contract.id===id).title).join(', ')})}</p>}
    {target.effect?.kind==='yield'&&<p>{forecast.remaining>0?tr(t,'tactic_yield_remaining','Build now to earn up to {count} extra {resource} from the remaining investigations.',{count:forecast.remaining,resource:board.resources[target.effect.resource]}):tr(t,'tactic_yield_exhausted','No further investigation bonuses are available after this build.')}</p>}
  </div>;
}

export function TacticsHud({board,run,t}){
  const progress=engine.derive(board,run);
  return <ExpeditionKitHud board={board} earnedCount={progress.kitCount||0} gains={progress.kitGains||[0,0]} t={t}/>;
}
export function TacticsReward({board,run,t}){
  const before=engine.derive(board,{...run,turn:run.turn-1}),after=engine.derive(board,run);
  if(engine.stepOf(run).phase==='choose')return null;
  return <ExpeditionKitReward board={board} beforeCount={before.kitCount||0} earnedCount={after.kitCount||0} gain={after.kitGains?.map((value,i)=>value-(before.kitGains?.[i]||0))||[0,0]} t={t}/>;
}
