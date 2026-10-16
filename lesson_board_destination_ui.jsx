import {routeTo,travelLimitOf} from './lesson_board_spatial.js';
import {Amounts} from './lesson_board_play_extras.jsx';
import {tr} from './lesson_board_strings.js';
import {JourneyPlanner} from './lesson_board_journey_ui.jsx';
const React=window.React;

export function destinationName(board,id){return board.locations.find(node=>node.id===id)?.name||'';}
export function leadTitle(board,t){
  switch(board.theme){
    case 'garden':return tr(t,'field_lead_garden','Follow the gardener’s lead');
    case 'workshop':return tr(t,'field_lead_workshop_direction','Follow a workshop lead');
    case 'archive':return tr(t,'field_lead_archive','Trace an archive lead');
    case 'space':return tr(t,'field_lead_space','Investigate a station signal');
    default:return tr(t,'field_lead_river','Follow a river lead');
  }
}
function routeLabel(board,progress,id,t){
  const path=routeTo(board,progress,id),limit=travelLimitOf(board);
  if(!path)return tr(t,'field_lead_route_closed','Explore intervening spaces to open a route.');
  const distance=path.length-1;
  if(limit!==null&&distance>limit)return tr(t,'field_lead_route_far','Current open route: {count} segments · beyond this turn’s range.',{count:distance});
  return distance===1?tr(t,'field_lead_route_one','Current open route: 1 segment · within this turn’s range.'):tr(t,'field_lead_route_distance','Current open route: {count} segments · within this turn’s range.',{count:distance});
}
export function DestinationOffer({board,progress,card,disabled,onChoose,onInspect,t,choice,onSelect,consequence}){
  const [draft,setDraft]=React.useState(null),group=React.useId();
  const leads=card.leads||[],selected=leads.find(lead=>choice!==undefined?choice==='lead:'+lead.targetId:draft?.turn===card.turn&&draft.targetId===lead.targetId)||leads[0];
  if(!card.canLead)return <p data-field-lead-unavailable>{progress.fieldLead?tr(t,'field_lead_busy','Finish your active destination lead before accepting another.'):tr(t,'field_lead_none','No unexplored destinations remain for a new lead.')}</p>;
  return <div className="lb-field-lead-offer" data-field-lead-offer>
    <fieldset><legend>{leadTitle(board,t)}</legend><p>{tr(t,'field_lead_offer_help','Choose a destination for a larger, specific reward. Other investigations will not collect it. Compare the route and supplies before committing; this replaces the other encounter benefits.')}</p>
      <div className="lb-field-lead-options">{leads.map(lead=><div key={lead.targetId} className="lb-field-lead-option" data-selected={selected?.targetId===lead.targetId}>
        <label><input type="radio" name={group} data-field-lead-option={lead.targetId} checked={selected?.targetId===lead.targetId} disabled={!onSelect&&disabled} onChange={()=>onSelect?onSelect('lead:'+lead.targetId):setDraft({turn:card.turn,targetId:lead.targetId})}/><strong>{destinationName(board,lead.targetId)}</strong></label>
        <Amounts board={board} values={lead.reward} prefix="+"/><small>{routeLabel(board,progress,lead.targetId,t)}</small>
        <button type="button" data-field-lead-inspect={lead.targetId} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(lead.targetId)}>{tr(t,'field_lead_inspect','Inspect {name}',{name:destinationName(board,lead.targetId)})}</button>
        <JourneyPlanner board={board} progress={progress} targetId={lead.targetId} onInspect={onInspect} compact t={t}/>
      </div>)}</div>
    </fieldset>
    {consequence}
    <button type="button" data-field-choice="lead" data-field-lead-commit disabled={disabled||!selected} onClick={()=>{if(!disabled&&selected)onChoose('lead:'+selected.targetId);}}>{tr(t,'field_lead_commit','Follow the lead to {name}',{name:destinationName(board,selected?.targetId)})}</button>
    <small>{tr(t,'field_lead_commit_help','Selection and inspection do not commit. The reward arrives only after a successful investigation at your chosen destination; accepting the lead uses no move.')}</small>
  </div>;
}
export function DestinationReminder({board,progress,lead,onInspect,t}){
  return <aside className="lb-field-note" data-field-lead aria-label={tr(t,'field_lead_active','Active destination lead')}><strong>{leadTitle(board,t)} · {destinationName(board,lead.targetId)}</strong><p>{tr(t,'field_lead_ready_help','Solve this destination’s investigation to collect the reserved supplies. Other investigations, travel, construction, and retries keep your lead ready.')}</p><Amounts board={board} values={lead.reward} prefix="+"/><button type="button" data-field-active-lead-inspect disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(lead.targetId)}>{tr(t,'field_lead_inspect','Inspect {name}',{name:destinationName(board,lead.targetId)})}</button><JourneyPlanner board={board} progress={progress} targetId={lead.targetId} onInspect={onInspect} compact t={t}/></aside>;
}
export function DestinationReceipt({board,lead,t}){
  return <div data-field-lead-receipt><Amounts board={board} values={lead.reward} prefix="+"/><p>{tr(t,'field_lead_receipt','Your lead to {name} is saved. These supplies arrive only after you successfully investigate that destination. Other actions keep the lead ready.',{name:destinationName(board,lead.targetId)})}</p></div>;
}
export function DestinationStyles(){return <style>{`
.lb .lb-field-lead-offer{margin-top:14px;padding-top:12px;border-top:1px solid var(--gold)}.lb .lb-field-lead-offer fieldset{border:0;padding:0;margin:0 0 12px}.lb .lb-field-lead-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(210px,100%),1fr));gap:10px}.lb .lb-field-lead-option{min-width:0;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.lb .lb-field-lead-option[data-selected=true]{border:2px solid var(--route);padding:11px;background:var(--route-soft)}.lb .lb-field-lead-option label{display:flex;align-items:center;gap:8px;margin:0 0 8px;cursor:pointer}.lb .lb-field-lead-option input{width:22px;min-width:22px;height:22px;min-height:22px;accent-color:var(--route);margin:0}.lb .lb-field-lead-option strong{min-width:0}.lb .lb-field-lead-option small{display:block;margin:9px 0}.lb .lb-field-lead-option button,.lb [data-field-lead-commit]{width:100%;white-space:normal;text-align:start}.lb [data-field-lead-commit]{border:2px solid var(--route);background:var(--panel);font-weight:650}.lb .lb-field-lead-offer>small{display:block;margin-top:8px}.lb [data-field-lead]>button{margin-top:10px;max-width:100%;white-space:normal}
@media(forced-colors:active){.lb .lb-field-lead-option[data-selected=true],.lb [data-field-lead-commit]{border-color:Highlight}.lb .lb-field-lead-offer{border-color:CanvasText}}
`}</style>;}
