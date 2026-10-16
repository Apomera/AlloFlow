import {WATERWORKS_EXPEDITION_PLANS,waterworksExpeditionOf} from './lesson_board_expeditions.js';
import {tr} from './lesson_board_strings.js';
const React=window.React;

const names=t=>({balanced:tr(t,'deal_balanced','Balanced shores'),research:tr(t,'deal_research','Research branches'),shortcut:tr(t,'deal_shortcut','Canal crossing')});
const descriptions=t=>({balanced:tr(t,'deal_balanced_help','Follow connected loops and choose which survey rewards to collect first.'),research:tr(t,'deal_research_help','A cheaper research shelter can fund later projects. Choose which long branch to investigate first.'),shortcut:tr(t,'deal_shortcut_help','Start at Equipment workshop. Build a bridge to the far bank early, or collect supplies along the outer trail.')});
export function WaterworksExpeditionPicker({board,onDeal,disabled,t}){
  const current=waterworksExpeditionOf(board),key=current?current.plan+':'+current.seed:'classic';
  const [plan,setPlan]=React.useState(current?.plan||'balanced'),[seed,setSeed]=React.useState(String(current?.seed||1));
  React.useEffect(()=>{setPlan(current?.plan||'balanced');setSeed(String(current?.seed||1));},[key]);
  const valid=/^[1-9][0-9]{0,2}$/.test(seed),labels=names(t),help=descriptions(t);
  const deal=(next)=>{if(disabled||!valid)return;setSeed(String(next));onDeal({plan,seed:next});};
  return <section className="lb-panel" data-expedition-dealer>
    <h3>{tr(t,'deal_title','Deal a different expedition')}</h3>
    <p>{tr(t,'deal_help','Change the route, supply caches, contracts, and lesson challenges. Use the same plan and deal number to replay the same board.')}</p>
    <fieldset disabled={disabled}><legend>{tr(t,'deal_plan','Expedition plan')}</legend><div className="lb-row" style={{alignItems:'stretch'}}>{WATERWORKS_EXPEDITION_PLANS.map(item=><button key={item.id} type="button" data-expedition-plan={item.id} aria-pressed={plan===item.id} onClick={()=>{if(!disabled)setPlan(item.id);}} style={{flex:'1 1 180px',textAlign:'start',whiteSpace:'normal'}}><strong>{labels[item.id]||item.name}</strong><br/><small>{help[item.id]||item.description}</small></button>)}</div>
      <label style={{display:'block',marginTop:12}}>{tr(t,'deal_number','Deal number (1–999)')}<input data-expedition-seed type="number" min="1" max="999" step="1" value={seed} aria-invalid={!valid} onChange={event=>{if(!disabled)setSeed(event.target.value);}} style={{maxWidth:160,display:'block'}}/></label>
      {!valid&&<p role="status">{tr(t,'deal_number_help','Enter a whole number from 1 to 999.')}</p>}
      <div className="lb-row" style={{marginTop:12}}><button type="button" data-expedition-deal disabled={!valid} onClick={()=>deal(Number(seed))}>{tr(t,'deal_apply','Deal this expedition')}</button><button type="button" data-expedition-next disabled={!valid} onClick={()=>deal(Number(seed)%999+1)}>{tr(t,'deal_next','Try the next deal')}</button></div>
    </fieldset>
    <p className="lb-muted">{tr(t,'deal_saved_help','Each dealt board has its own saved progress. Undo restores the previous board and its saved adventure.')}</p>
  </section>;
}
export function ExpeditionBrief({board,t}){
  const deal=waterworksExpeditionOf(board);
  if(!deal)return null;
  return <details data-expedition-brief style={{margin:'8px 0',fontSize:'.88em'}}><summary>{tr(t,'deal_brief','{plan} · Deal {seed}',{plan:names(t)[deal.plan],seed:deal.seed})}</summary><p>{descriptions(t)[deal.plan]}</p><p>{tr(t,'deal_play_tip','Compare supply caches before choosing a route. A construction exchange can help you build earlier, but leaves fewer supplies for your next project.')}</p></details>;
}
