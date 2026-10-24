import { addBoardStyle } from './lesson_board_style.js';
import {encounterDecision} from './lesson_board_encounter_preview.js';
import {Amounts} from './lesson_board_play_extras.jsx';
import {ResourceStack,ResourceStyles} from './lesson_board_tokens.jsx';
import {BarterOffer} from './lesson_board_barter_ui.jsx';
import {CommissionOffer} from './lesson_board_commissions_ui.jsx';
import {DeliveryOffer} from './lesson_board_delivery_ui.jsx';
import {VentureOffer} from './lesson_board_ventures_ui.jsx';
import {RelayOffer} from './lesson_board_relays_ui.jsx';
import {DestinationOffer} from './lesson_board_destination_ui.jsx';
import { tr, arrow } from './lesson_board_strings.js';
const React=window.React;

function approaches(card,t){return [
  {id:'collect',title:tr(t,'decision_collect','Supplies now'),help:tr(t,'decision_collect_help','A smaller reward, ready to spend.'),reward:card.immediate},
  {id:'prepare',title:tr(t,'decision_prepare','Prepare a discovery'),help:tr(t,'decision_prepare_help','A larger reward at your next new investigation.'),reward:card.prepared},
  ...(card.ventures?.length?[{id:'venture',title:tr(t,'decision_venture','Search for a larger bonus'),help:tr(t,'decision_venture_help','50% chance of four tokens; otherwise no bonus.')}]:[]),
  {id:'crew',title:tr(t,'decision_crew','Equip a crew'),help:tr(t,'decision_crew_help','Flexible reward after any next build.'),reward:card.crew},
  ...(card.commissions?.length?[{id:'commission',title:tr(t,'decision_commission','Take a commission'),help:tr(t,'decision_commission_help','Four reserved tokens for one named build.')}]:[]),
  ...(card.trades?.length?[{id:'trade',title:tr(t,'decision_trade','Exchange supplies'),help:tr(t,'decision_trade_help','Give one token to receive two of the other.')}]:[]),
  ...(Array.isArray(card.deliveries)?[{id:'delivery',title:tr(t,'decision_delivery','Carry a delivery'),help:tr(t,'decision_delivery_help','A larger reward for a return journey.')}]:[]),
  ...(card.relays?.length?[{id:'relay',title:tr(t,'decision_relay','Run a two-stop relay'),help:tr(t,'decision_relay_help','Choose a route and earn supplies at two ordered handoffs.')}]:[]),
  {id:'lead',title:tr(t,'decision_lead','Follow a lead'),help:tr(t,'decision_lead_help','Reserve a reward at a specific discovery.')}
];}

function ApproachToken({kind}){
  const paths={collect:'M17 23h30v9H17z M21 17h22v6H21z M21 32h22v7H21z',prepare:'M20 36V17h24v19l-12-5z M26 22h12 M26 26h9',venture:'M20 19 32 13l12 6v19l-12 6-12-6z M28 23q8-6 8 0 0 4-4 5 M32 33v1',crew:'M19 35l20-20 6 6-20 20z M16 18l7-4 9 9-7 7z',commission:'M21 15h22v25H21z M26 21h12 M26 26h12 M26 31h7',trade:'M17 22h28l-6-6 M45 32H17l6 6',delivery:'M18 20l14-6 14 6v17l-14 7-14-7z M18 20l14 7 14-7 M32 27v17',relay:'M19 20h10v10H19z M36 29h10v10H36z M29 25h12v4 M23 30v8h13',lead:'M20 39l4-24 20 4-6 24z M28 32l4-9 5 10-9-1z'};
  return <svg className="lb-approach-token" viewBox="0 0 64 56" aria-hidden="true" focusable="false"><ellipse className="lb-approach-shadow" cx="32" cy="49" rx="27" ry="5"/><path className="lb-approach-edge" d="M5 25v8l27 18 27-18v-8L32 7Z"/><path className="lb-approach-face" d="M5 25 32 7l27 18-27 18Z"/><path className="lb-approach-mark" d={paths[kind]}/></svg>;
}

function rewardCondition(board,preview,t){
  const name=board.projects.find(node=>node.id===preview.projectId)?.name||board.locations.find(node=>node.id===preview.targetId)?.name||'';
  switch(preview.trigger){
    case 'investigation':return tr(t,'decision_when_discovery','Earn after your next successful new investigation. Travel, construction, and retries keep it ready.');
    case 'construction':return tr(t,'decision_when_build','Earn after your next build. Pay the full construction cost first; this reward cannot fund that payment.');
    case 'commission':return tr(t,'decision_when_commission','Earn after building {name}. Pay the full construction cost first; other builds keep this reward reserved.',{name});
    case 'delivery':return tr(t,'decision_when_delivery','Earn when a later travel move ends at {name}. Passing through does not deliver.',{name});
    case 'relay':return tr(t,'decision_when_relay','Earn in two stages: end a later travel move at {first}, then another at {second}. Passing through or arriving out of order does not deliver.',{first:board.locations.find(node=>node.id===preview.reserved?.stops?.[0]?.targetId)?.name||'',second:board.locations.find(node=>node.id===preview.reserved?.stops?.[1]?.targetId)?.name||''});
    case 'destination':return tr(t,'decision_when_lead','Earn after a successful investigation at {name}. Other discoveries keep this reward reserved.',{name});
    default:return tr(t,'decision_when_now','These supplies become available immediately after you confirm.');
  }
}

function unavailableReason(kind,card,progress,t){
  if(kind==='venture')return progress.fieldVenture?tr(t,'venture_busy','Finish your current search before accepting another.'):tr(t,'venture_unavailable','No new investigation remains for this search. Choose another available benefit.');
  if(kind==='trade')return card.trades?.some(trade=>trade.reason==='completion-reserve')?tr(t,'decision_trade_reserve','An exchange would use supplies needed for the remaining required construction.'):tr(t,'decision_trade_empty','You need a token to exchange. No legal exchange is available.');
  if(kind==='commission')return progress.fieldCommission?tr(t,'commission_already_active','One commission is already reserved. Complete it before accepting another.'):tr(t,'commission_unavailable','No commission can be accepted at this point in the expedition.');
  if(kind==='delivery'||kind==='relay')return progress.fieldRelay?tr(t,'relay_dispatch_busy','Finish your active relay before carrying another dispatch.'):progress.fieldDelivery?tr(t,'delivery_already_active','Finish your active delivery before accepting another.'):kind==='relay'?tr(t,'relay_unavailable','No two-stop relay is available at this point in the expedition.'):tr(t,'delivery_no_target','No eligible explored station is available for a new delivery. Choose another encounter benefit.');
  return tr(t,'decision_unavailable','Unavailable this encounter');
}

function DecisionPreview({board,preview,onInspect,t}){
  if(!preview)return null;
  return <section className="lb-decision-preview" data-field-decision-preview data-choice={preview.choice} aria-label={tr(t,'decision_preview','If you choose this')}>
    <div className="lb-decision-preview-title"><h5>{tr(t,'decision_preview','If you choose this')}</h5><span>{tr(t,'decision_no_move','No move used')}</span></div>
    <p>{tr(t,'decision_balance','Your supplies after accepting')}</p>
    <dl className="lb-decision-balances">{board.resources.map((resource,index)=><div key={index}><dt><ResourceStack value={preview.after[index]} index={index}/><span>{resource}</span></dt><dd><span data-decision-before={index}>{preview.before[index]}</span><span aria-hidden="true"> {arrow()} </span><span className="lb-decision-sr">{' '+tr(t,'decision_becomes','becomes')+' '}</span><strong data-decision-after={index}>{preview.after[index]}</strong></dd></div>)}</dl>
    {preview.spent.some(Boolean)&&<div className="lb-decision-flow" data-decision-spent><strong>{tr(t,'decision_spend','Spend now')}</strong><Amounts board={board} values={preview.spent} prefix="−"/></div>}
    {preview.gain.some(Boolean)&&<div className="lb-decision-flow" data-decision-gain><strong>{tr(t,'decision_gain','Receive now')}</strong><Amounts board={board} values={preview.gain} prefix="+"/></div>}
    {preview.reserved&&<div className="lb-decision-reserved" data-decision-reserved data-decision-uncertain={preview.reserved.uncertain||undefined}><strong>{preview.reserved.uncertain?tr(t,'decision_possible_bonus','Possible bonus · not guaranteed'):tr(t,'decision_reserved','Reserved · not in your balance')}</strong><Amounts board={board} values={preview.reserved.reward} prefix="+"/></div>}
    {preview.trigger!=='venture'&&<p data-decision-condition>{rewardCondition(board,preview,t)}</p>}
    {preview.newlyFunded.length>0&&<div className="lb-decision-funded" data-decision-funded><strong>{tr(t,'decision_funded','This choice would make these projects fundable')}</strong><p>{tr(t,'decision_funded_help','Check the site and payment before planning a build.')}</p>{preview.newlyFunded.map(id=><button key={id} type="button" data-decision-inspect={id} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(id)}>{tr(t,'decision_inspect','Inspect {name}',{name:board.projects.find(project=>project.id===id)?.name||id})}</button>)}</div>}
  </section>;
}

// Comparing approaches is a local draft. Only the selected offer's explicit
// confirmation reaches FieldEncounter's authoritative, role-checked callback.
export function EncounterDecision({board,run,progress,card,disabled,onChoose,onInspect,t}){
  const [draft,setDraft]=React.useState(null),panelId=React.useId();
  const model=React.useMemo(()=>encounterDecision(board,run),[board,run]);
  const validDraft=draft?.key===model?.key?draft:null;
  const selected=model?.choices.find(choice=>choice.id===validDraft?.selected)||model?.choices[0];
  const preview=React.useMemo(()=>selected?encounterDecision(board,run,selected.id)?.preview:null,[board,run,selected?.id]);
  if(!model||!selected)return null;
  const select=id=>{
    if(!model.choices.some(choice=>choice.id===id))return;
    const kind=model.choices.find(choice=>choice.id===id).kind;
    setDraft({key:model.key,selected:id,remembered:{...validDraft?.remembered,[kind]:id}});
  };
  const chooseApproach=kind=>{
    const group=model.groups.find(group=>group.id===kind);
    if(group)select(group.choices.find(choice=>choice.id===validDraft?.remembered?.[kind])?.id||group.choices[0].id);
  };
  const consequence=<DecisionPreview board={board} preview={preview} onInspect={onInspect} t={t}/>;
  const props={board,run,progress,card,disabled,onChoose,onInspect,t,choice:selected.id,onSelect:select,expanded:true,consequence};
  const base=['collect','prepare','crew'].includes(selected.kind);
  return <div className="lb-encounter-decision" data-encounter-decision><DecisionStyles/><ResourceStyles/>
    <p className="lb-decision-intro">{tr(t,'decision_intro','Compare an approach, inspect its consequences, then confirm one benefit. Comparing changes nothing; choosing uses no move.')}</p>
    <div className="lb-approaches" role="group" aria-label={tr(t,'decision_approaches','Compare encounter approaches')}>{approaches(card,t).map(approach=>{
      const group=model.groups.find(group=>group.id===approach.id),chosen=selected.kind===approach.id;
      return <button key={approach.id} type="button" className="lb-approach" data-field-approach={approach.id} aria-pressed={chosen} aria-controls={panelId} disabled={!group} onClick={()=>chooseApproach(approach.id)}><span className="lb-approach-heading"><ApproachToken kind={approach.id}/><strong>{approach.title}</strong><span className="lb-approach-selected" aria-hidden="true">{chosen?'✓':'○'}</span></span><small>{approach.help}</small>{approach.reward&&<Amounts board={board} values={approach.reward} prefix="+"/>}{!group?<small data-decision-unavailable={approach.id} data-commission-unavailable={approach.id==='commission'||undefined} data-delivery-unavailable={approach.id==='delivery'||undefined}>{unavailableReason(approach.id,card,progress,t)}</small>:group.choices.length>1?<small className="lb-approach-count">{tr(t,'decision_options','{count} options to compare',{count:group.choices.length})}</small>:null}</button>;
    })}</div>
    {!card.canCrew&&<p data-field-crew-unavailable>{progress.fieldCrew?tr(t,'field_crew_already_ready','Your existing construction crew is still ready. Build a project before reserving another crew.'):tr(t,'field_crew_unavailable','No further construction can be prepared at this point in the expedition.')}</p>}
    {!card.canPrepare&&<p data-field-prepare-unavailable>{tr(t,'field_prepare_unavailable_options','Investigation preparation is unavailable: no new spaces remain. Choose another available option.')}</p>}
    {!card.canLead&&<p data-field-lead-unavailable>{progress.fieldLead?tr(t,'field_lead_busy','Finish your active destination lead before accepting another.'):tr(t,'field_lead_none','No unexplored destinations remain for a new lead.')}</p>}
    <div id={panelId} className="lb-decision-focus" data-decision-approach={selected.kind}>
      {base&&consequence}
      {base?<div className="lb-field-choices"><button type="button" data-field-choice={selected.kind} disabled={disabled} onClick={()=>{if(!disabled)onChoose?.(selected.id);}}><strong>{selected.kind==='collect'?tr(t,'field_collect','Collect now'):selected.kind==='prepare'?tr(t,'field_prepare','Prepare for the next discovery'):tr(t,'field_crew_choice','Equip a construction crew')}</strong><Amounts board={board} values={selected.reward} prefix="+"/><small>{selected.kind==='collect'?tr(t,'field_collect_help','Add these supplies immediately.'):selected.kind==='prepare'?tr(t,'field_prepare_help','Collect after your next successful new investigation.'):tr(t,'field_crew_choice_help','Receive after your next build. You must pay its full cost first.')}</small></button></div>:selected.kind==='venture'?<VentureOffer {...props}/>:selected.kind==='commission'?<CommissionOffer {...props}/>:selected.kind==='trade'?<BarterOffer {...props}/>:selected.kind==='delivery'?<DeliveryOffer {...props}/>:selected.kind==='relay'?<RelayOffer {...props}/>:<DestinationOffer {...props}/>}
    </div>
  </div>;
}

function DecisionStyles(){return addBoardStyle(`
.lb .lb-decision-intro{line-height:1.5}.lb .lb-approaches{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(205px,100%),1fr));gap:10px;margin:14px 0 18px;align-items:stretch}.lb button.lb-approach{position:relative;display:flex;flex-direction:column;align-items:stretch;gap:8px;min-width:0;min-height:44px;padding:12px;text-align:start;white-space:normal;background:var(--panel);border:1px solid var(--line);border-bottom-width:4px;border-radius:12px;box-shadow:0 3px 7px #14293610;transition:transform .15s,box-shadow .15s,border-color .15s}.lb button.lb-approach[aria-pressed=true]{border-color:var(--route);background:var(--route-soft);box-shadow:0 4px 0 var(--line);transform:translateY(-2px)}.lb button.lb-approach:not(:disabled):hover{border-color:var(--route)}.lb button.lb-approach:focus-visible{outline:3px solid var(--accent);outline-offset:3px}.lb .lb-approach-heading{display:flex;align-items:center;gap:8px;min-width:0}.lb .lb-approach-heading>strong{flex:1;min-width:0;line-height:1.3}.lb .lb-approach-selected{flex:none;font-size:1.1em;font-weight:800}.lb .lb-approach>small{font-size:.82em;line-height:1.4}.lb .lb-approach .lb-tokens{margin-top:auto;display:flex;flex-wrap:wrap;gap:5px;font-size:.75em}.lb .lb-encounter-decision .lb-token{white-space:nowrap}.lb .lb-encounter-decision .lb-token>span:last-child{white-space:normal;min-width:0}.lb .lb-approach-count{margin-top:auto;color:var(--route);font-weight:650}
.lb .lb-approach-token{width:44px;height:39px;flex:0 0 44px;overflow:visible}.lb .lb-approach-shadow{fill:var(--accent);opacity:.1}.lb .lb-approach-edge{fill:var(--gold);opacity:.8}.lb .lb-approach-face{fill:var(--gold-soft);stroke:var(--gold);stroke-width:1}.lb .lb-approach-mark{fill:none;stroke:var(--gold);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.lb .lb-decision-focus{min-width:0;border-top:1px solid var(--line);padding-top:14px}.lb .lb-decision-preview{min-width:0;border:1px solid var(--route);border-radius:12px;background:var(--panel);padding:12px}.lb .lb-decision-preview-title{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center;justify-content:space-between}.lb .lb-decision-preview h5{font-size:1em;margin:0}.lb .lb-decision-preview-title>span{font-size:.78em;border:1px solid var(--line);border-radius:30px;padding:3px 8px}.lb .lb-decision-preview>p{font-size:.9em}.lb .lb-decision-balances{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(190px,100%),1fr));gap:8px;margin:10px 0}.lb .lb-decision-balances>div{padding:8px;border:1px solid var(--line);border-radius:9px;min-width:0}.lb .lb-decision-balances dt{display:flex;align-items:center;gap:7px;min-width:0;font-size:.85em}.lb .lb-decision-balances dt>span{min-width:0}.lb .lb-decision-balances dd{margin:5px 0 0;text-align:end;white-space:nowrap;font-variant-numeric:tabular-nums}.lb .lb-decision-balances dd>strong{font-size:1.25em}.lb .lb-decision-flow,.lb .lb-decision-reserved{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:9px 0;font-size:.85em}.lb .lb-decision-reserved{border-top:1px dashed var(--gold);border-bottom:1px dashed var(--gold);margin:10px 0}.lb .lb-decision-funded{border-top:1px solid var(--line);padding-top:10px;font-size:.9em}.lb .lb-decision-funded button{min-height:44px;white-space:normal;text-align:start;max-width:100%;margin:4px 6px 0 0}.lb .lb-decision-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.lb .lb-decision-focus>section.lb-barter-offer,.lb .lb-decision-focus>section.lb-commission-offer,.lb .lb-decision-focus>section.lb-delivery-offer{font-size:1em}.lb .lb-decision-focus>section>h5{font-size:1em;margin:0 0 10px}
.lb .lb-venture-offer .lb-decision-preview{padding:10px}.lb .lb-venture-offer .lb-decision-preview>p{margin:5px 0}.lb .lb-venture-offer .lb-decision-balances{margin:7px 0;gap:6px}.lb .lb-venture-offer .lb-decision-balances>div{padding:6px}.lb .lb-venture-offer .lb-decision-balances dd{margin:0}.lb .lb-venture-offer .lb-decision-reserved{margin:7px 0 0;padding:7px 0;border-bottom:0}
@media(max-width:480px){.lb .lb-approaches{gap:8px}.lb button.lb-approach{padding:10px}.lb .lb-decision-preview{padding:10px}}
@media(prefers-reduced-motion:reduce){.lb button.lb-approach{transition:none;transform:none!important}}
@media(forced-colors:active){.lb button.lb-approach,.lb .lb-decision-preview,.lb .lb-decision-balances>div,.lb .lb-decision-reserved{border-color:CanvasText;box-shadow:none}.lb button.lb-approach[aria-pressed=true]{border-color:Highlight;outline:2px solid Highlight;outline-offset:1px}.lb .lb-approach-face{fill:Canvas;stroke:CanvasText}.lb .lb-approach-edge{fill:CanvasText}.lb .lb-approach-mark{stroke:CanvasText}.lb .lb-approach-count{color:CanvasText}}
`);}
