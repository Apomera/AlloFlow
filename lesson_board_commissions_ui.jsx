import * as engine from './lesson_board_engine.js';
import {buildSite} from './lesson_board_spatial.js';
import {Amounts} from './lesson_board_play_extras.jsx';
import {CommissionMiniature,CommissionStyles} from './lesson_board_commission_art.jsx';
import {tr} from './lesson_board_strings.js';
const React=window.React;

export function commissionTitle(theme,t){
  switch(theme){
    case 'garden':return tr(t,'commission_garden','Community garden request');
    case 'workshop':return tr(t,'commission_workshop','Workshop fabrication order');
    case 'archive':return tr(t,'commission_archive','Archive conservation commission');
    case 'space':return tr(t,'commission_space','Station engineering order');
    default:return tr(t,'commission_river','Riverside restoration commission');
  }
}

function commissionStory(theme,t){
  switch(theme){
    case 'garden':return tr(t,'commission_story_garden','The garden team has set aside a reward for one improvement. Choose which request fits the places you want to explore next.');
    case 'workshop':return tr(t,'commission_story_workshop','A sealed work order arrives at the drafting bench. Choose a project to fabricate and collect its reserved supplies after construction.');
    case 'archive':return tr(t,'commission_story_archive','The conservation desk offers supplies for a named improvement. Choose a commission that fits your expedition’s construction plans.');
    case 'space':return tr(t,'commission_story_space','Station engineering is reserving cargo for a construction priority. Accept a work order and collect its supplies after the named project is built.');
    default:return tr(t,'commission_story_river','The riverside team has left a sealed request at the landing. Choose an improvement to build and collect its reserved supplies afterward.');
  }
}

const projectFor=(board,commission)=>board.projects.find(project=>project.id===commission?.projectId);
const siteName=(board,project)=>board.locations.find(node=>node.id===buildSite(board,project))?.name||'';

function CommissionTerms({board,commission,progress,t}){
  const project=projectFor(board,commission);
  if(!project)return null;
  return <div className="lb-commission-terms">
    <p data-commission-site>{tr(t,'commission_site','Build at {site}',{site:siteName(board,project)})}</p>
    <div className="lb-commission-amounts"><div><strong>{tr(t,'commission_payment','Printed construction cost')}</strong><Amounts board={board} values={project.cost} prefix="−"/></div><div><strong>{tr(t,'commission_reward','Reserved commission reward')}</strong><Amounts board={board} values={commission.reward} prefix="+"/></div></div>
    <p>{tr(t,'commission_payment_help','Pay the full cost of your chosen construction payment first. The commission reward cannot fund that payment; it arrives only after this project is built.')}</p>
    {progress?.fieldCrew&&<p data-commission-crew>{tr(t,'commission_crew_stack','Your existing crew is separate. It pays after your next build; if that build is this project, both rewards arrive afterward.')}</p>}
  </div>;
}

export function CommissionOffer({board,run,progress,card,disabled,onChoose,onInspect,t,choice,onSelect,expanded=false,consequence}){
  const [draft,setDraft]=React.useState(null),group=React.useId();
  const offers=card.commissions||[],key=[board.id||board.title,card.turn,card.id,...offers.map(offer=>offer.projectId)].join('|');
  const selected=offers.find(offer=>choice!==undefined?choice==='commission:'+offer.projectId:draft?.key===key&&offer.projectId===draft.projectId)||offers[0],project=projectFor(board,selected);
  if(!offers.length||!project)return null;
  // A named refund may protect the remaining construction reserve. Preview
  // that accepted commitment without treating its reward as upfront supplies.
  let previewRun=run;
  if(card.pending&&card.canCommission){try{previewRun=engine.merge(run,engine.chooseFieldOpportunity(board,run,'commission:'+project.id));}catch(_){}}
  const payments=engine.constructionFunding(board,previewRun,project.id),funded=payments.some(payment=>payment.legal),site=buildSite(board,project);
  const Container=expanded?'section':'details',Title=expanded?'h5':'summary';
  return <Container className="lb-commission-offer" data-field-commission-offer><CommissionStyles/><CommissionUIStyles/>
    <Title>{tr(t,'commission_option','Accept a construction commission · larger reward, named project')}</Title>
    <div className="lb-commission-heading"><CommissionMiniature theme={board.theme}/><div><h5>{commissionTitle(board.theme,t)}</h5><p>{commissionStory(board.theme,t)}</p></div></div>
    <p>{tr(t,'commission_tradeoff','A crew supports any next build for +1 of each resource. A commission reserves four tokens for one named project. Choose one encounter benefit; accepting uses no move and gives no supplies now.')}</p>
    <fieldset><legend>{tr(t,'commission_pick','Choose a project to commission')}</legend><div className="lb-commission-options">{offers.map(offer=>{
      const target=projectFor(board,offer);if(!target)return null;
      return <label key={offer.projectId} data-commission-selected={selected.projectId===offer.projectId}><input type="radio" name={group} data-field-commission-option={offer.projectId} checked={selected.projectId===offer.projectId} disabled={(!onSelect&&disabled)||!card.canCommission} onChange={()=>onSelect?onSelect('commission:'+offer.projectId):setDraft({key,projectId:offer.projectId})}/><span><strong>{target.name}</strong><small>{tr(t,'commission_site','Build at {site}',{site:siteName(board,target)})}</small><Amounts board={board} values={offer.reward} prefix="+"/></span></label>;
    })}</div></fieldset>
    <div className="lb-commission-preview" data-field-commission-preview={project.id}><h5>{project.name}</h5><CommissionTerms board={board} commission={selected} progress={progress} t={t}/>
      <p data-commission-funding={funded?'funded':'shortfall'}>{funded?tr(t,'commission_funded','Your current supplies can cover an available payment. Inspect the project to compare payment options.'):tr(t,'commission_unfunded','Gather more supplies before building this project. Accepting the commission does not reduce its upfront cost.')}</p>
      <p data-commission-position={progress.position===site?'at-site':'travel'}>{progress.position===site?tr(t,'commission_at_site','Your party is already at this construction site.'):tr(t,'commission_travel','Your party must return to this construction site before building.')}</p>
      <button type="button" data-commission-inspect={project.id} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(project.id)}>{tr(t,'commission_inspect','Inspect {name}',{name:project.name})}</button>
    </div>
    {!card.canCommission&&<p data-commission-unavailable>{progress.fieldCommission?tr(t,'commission_already_active','One commission is already reserved. Complete it before accepting another.'):tr(t,'commission_unavailable','No commission can be accepted at this point in the expedition.')}</p>}
    {consequence}
    <button type="button" className="lb-commission-commit" data-field-choice="commission" data-field-commission-commit disabled={disabled||!card.canCommission} onClick={()=>{if(!disabled&&card.canCommission)onChoose?.('commission:'+project.id);}}>{tr(t,'commission_accept','Accept commission: {name}',{name:project.name})}</button>
    <p className="lb-commission-note">{tr(t,'commission_optional','A commission is optional. Other builds and investigations keep it reserved; an unfinished commission never blocks completing the expedition.')}</p>
  </Container>;
}

export function CommissionReminder({board,progress,commission,onInspect,t,receipt=false}){
  const project=projectFor(board,commission);if(!project)return null;
  return <aside className="lb-commission-reminder" data-field-commission-reminder={!receipt||undefined} data-field-commission-receipt={receipt||undefined}><CommissionStyles/><CommissionUIStyles/>
    <div className="lb-commission-heading"><CommissionMiniature theme={board.theme}/><div><strong>{commissionTitle(board.theme,t)}</strong><p data-commission-project>{project.name}</p></div></div>
    <CommissionTerms board={board} commission={commission} progress={progress} t={t}/>
    <p>{tr(t,'commission_reserved_help','This reward stays reserved through travel, investigations, and other construction. It pays once when you build the named project; no supplies were added when you accepted.')}</p>
    <button type="button" data-commission-inspect={project.id} disabled={typeof onInspect!=='function'} onClick={()=>onInspect?.(project.id)}>{tr(t,'commission_inspect','Inspect {name}',{name:project.name})}</button>
    <small>{tr(t,'commission_optional_short','Optional: you can finish the expedition without completing this commission.')}</small>
  </aside>;
}

export function CommissionUIStyles(){return <style>{`
.lb .lb-commission-offer{margin:14px 0;padding:12px;border:1px solid var(--gold);border-radius:12px;background:var(--panel);min-width:0}.lb .lb-commission-offer>summary{min-height:44px;align-content:center;font-weight:700;font-size:1.05em}.lb .lb-commission-heading{display:flex;align-items:center;gap:12px;min-width:0}.lb .lb-commission-heading>div{min-width:0}.lb .lb-commission-heading h5,.lb .lb-commission-preview h5{font-size:1em;margin:8px 0}.lb .lb-commission-offer fieldset{border:0;min-width:0;padding:0;margin:12px 0}.lb .lb-commission-options{display:grid;gap:8px}.lb .lb-commission-options label{display:flex;align-items:flex-start;gap:8px;padding:11px;border:1px solid var(--line);border-radius:9px;background:var(--panel);cursor:pointer}.lb .lb-commission-options label[data-commission-selected=true]{padding:10px;border:2px solid var(--route);background:var(--route-soft)}.lb .lb-commission-options input{width:22px;height:22px;min-width:22px;min-height:22px;accent-color:var(--route);margin:0}.lb .lb-commission-options label>span{min-width:0}.lb .lb-commission-options small{display:block;margin-top:5px}.lb .lb-commission-options .lb-tokens{margin-top:6px}.lb .lb-commission-preview{padding:10px;border:1px dashed var(--route);border-radius:9px;margin-bottom:10px}.lb .lb-commission-amounts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(180px,100%),1fr));gap:10px;margin:8px 0}.lb .lb-commission-amounts>div{padding:8px;border:1px solid var(--line);border-radius:8px;min-width:0}.lb .lb-commission-amounts strong{font-size:.9em}.lb .lb-commission-amounts .lb-tokens{margin-top:6px}.lb .lb-commission-terms p{font-size:.9em}.lb .lb-commission-preview button,.lb .lb-commission-commit,.lb .lb-commission-reminder button{width:100%;text-align:start;white-space:normal;margin-top:5px;min-height:44px}.lb .lb-commission-commit{font-weight:700;border:2px solid var(--route)}.lb .lb-commission-note{font-size:.85em;line-height:1.5}.lb .lb-commission-reminder{min-width:0;padding:12px;margin:12px 0;border:1px solid var(--gold);border-inline-start:4px solid var(--gold);border-radius:10px;background:var(--panel);overflow-wrap:anywhere}.lb .lb-commission-reminder>small{display:block;margin-top:8px}
.lb .lb-commission-options .lb-token{white-space:nowrap}.lb .lb-commission-options .lb-token>span:last-child{white-space:normal;min-width:0}
@media(max-width:480px){.lb .lb-commission-heading{align-items:flex-start;flex-direction:column;gap:4px}}
@media(forced-colors:active){.lb .lb-commission-offer,.lb .lb-commission-reminder,.lb .lb-commission-amounts>div{border-color:CanvasText}.lb .lb-commission-options label[data-commission-selected=true],.lb .lb-commission-preview,.lb .lb-commission-commit{border-color:Highlight}}
`}</style>;}
