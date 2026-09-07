import {responseText,validateResponses} from './response-records.mjs';
import {materialize,dispatch} from './core.mjs';
const normalize=text=>text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
// Suggestions never execute a command. The learner confirms one available action.
export function reviewResponse(adapter,run,value,{location}={}){
  const text=responseText(value),model=materialize(adapter,run),view=adapter.view(model);
  const actions=adapter.actions(model).filter(a=>!a.disabled&&(!location||!a.location||a.location==='all'||a.location===location));
  const input=' '+normalize(text)+' ';
  const scored=actions.map(action=>{
    const terms=action.responseTerms||[];
    const label=normalize(action.label).split(' ').filter(w=>w.length>3);
    const score=terms.reduce((n,term)=>n+(input.includes(' '+normalize(term)+' ')?4:0),0)+label.reduce((n,w)=>n+(input.includes(' '+w+' ')?1:0),0);
    return {...action,score,locationName:action.location==='all'?'Across the watershed':view.locations.find(l=>l.id===action.location)?.name||''};
  }).sort((a,b)=>b.score-a.score);
  const best=scored[0],suggested=best&&best.score>0&&(!scored[1]||best.score>scored[1].score)?best.id:null;
  return {text,revision:run.commands.length,runId:run.runId,actions:scored,suggested,
    message:suggested?'Check that this action matches what you mean. You can change it before continuing.':'Choose the available action that best fits your response. Your wording will stay in the journal.'};
}
export function dispatchResponse(adapter,run,proposal,actionId){
  if(proposal.runId!==run.runId||proposal.revision!==run.commands.length)throw Error('The scene changed. Review your response again.');
  if(!proposal.actions.some(a=>a.id===actionId&&!a.disabled))throw Error('Choose an available action for this response.');
  const next=dispatch(adapter,run,actionId,proposal.revision);
  next.version=2;
  next.responses=validateResponses([...(run.responses||[]),{revision:next.commands.length,actionId,text:responseText(proposal.text)}],next.commands);
  return next;
}
