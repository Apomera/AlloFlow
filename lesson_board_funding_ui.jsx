import * as engine from './lesson_board_engine.js';
import {tr} from './lesson_board_strings.js';
const React=window.React;

export function fundingLabel(board,id,t){
  if(id==='standard')return tr(t,'funding_standard','Pay the printed cost');
  const give=id==='research'?0:1,take=1-give;
  return tr(t,'funding_exchange','Trade 2 {give} for 1 {take}',{give:board.resources[give],take:board.resources[take]});
}
export function ConstructionFundingPicker({board,run,project,value,onChange,disabled,role,t}){
  const group=React.useId();
  if(board.playStyle!=='tabletop'||!project?.cost||engine.derive(board,run).built.includes(project.id))return null;
  const options=engine.constructionFunding(board,run,project.id),student=role==='student';
  return <fieldset data-construction-funding disabled={disabled} style={{margin:'12px 0',minWidth:0}}>
    <legend>{tr(t,'funding_title','Fund this construction')}</legend>
    <p className="lb-muted">{student?tr(t,'funding_teacher_choice','Propose the project. Your teacher chooses its payment before building.'):tr(t,'funding_help','Build sooner by trading surplus supplies, or preserve them for a later project. Each exchange costs one extra token overall.')}</p>
    <div style={{display:'grid',gap:8}}>{options.map(option=><label key={option.id} data-funding-option={option.id} style={{display:'flex',gap:9,alignItems:'flex-start',border:'1px solid var(--line)',borderRadius:10,padding:10,minHeight:44,background:option.id===value?'var(--soft)':'var(--panel)',overflowWrap:'anywhere'}}>
      {!student&&<input type="radio" name={group} value={option.id} checked={value===option.id} disabled={!option.legal} style={{width:'auto',flexShrink:0,marginTop:4}} onChange={()=>onChange(option.id)}/>}
      <span><strong>{fundingLabel(board,option.id,t)}</strong><br/><span>{option.cost.map((amount,index)=>amount+' '+board.resources[index]).join(' · ')}</span>
        {!option.legal&&<small style={{display:'block'}}>{option.reason==='completion-reserve'?tr(t,'funding_reserve','Keep these supplies: this exchange would leave too little to finish the mission.'):tr(t,'funding_shortfall','More supplies needed for this payment.')}</small>}
      </span>
    </label>)}</div>
    {!student&&<p className="lb-muted">{tr(t,'funding_not_spent','Supplies are spent only when you build. Construction refunds apply afterward.')}</p>}
  </fieldset>;
}
export function FundingReceipt({board,run,t}){
  const step=engine.stepOf(run);
  return step.funding&&step.result?.success?<p data-funding-receipt>{fundingLabel(board,step.funding,t)}</p>:null;
}
