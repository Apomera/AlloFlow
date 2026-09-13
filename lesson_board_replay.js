import {derive,turnLimit,stepOf,validValue,initialDraft,solution} from './lesson_board_engine.js';
import {learningSummary} from './lesson_board_insights.js';
import {practiceVariant} from './lesson_board_learning.js';
export const REPLAY_MAX_CHECKS=30;
export const replayAvailable=(board,run)=>derive(board,run).complete||turnLimit(board,run).reached&&stepOf(run).phase==='review';
export function replayPriorities(board,run,uid){
 const learner=learningSummary(board,run,{[uid||'practice']: {}}).learners[0];
 return learner.locations.map((item,index)=>({...item,index,reason:!item.answered?'unattempted':!item.lastCorrect?'revisit':item.improved?'strengthen':'extend'})).sort((a,b)=>['revisit','strengthen','unattempted','extend'].indexOf(a.reason)-['revisit','strengthen','unattempted','extend'].indexOf(b.reason)||a.index-b.index);
}
function records(board,targets,events){const result=Object.fromEntries(targets.map(id=>[id,{id,attempts:0,correct:0,lastCorrect:null}]));for(const event of events){const item=result[event.id];if(!item)continue;const node=practiceVariant(board.locations.find(node=>node.id===event.id),item.attempts+1);item.attempts++;item.lastCorrect=event.value===solution(node);item.correct+=Number(item.lastCorrect);}return result;}
export function replayState(board,replay){
 const items=records(board,replay.targetIds,replay.events),pending=replay.targetIds.filter(id=>items[id].lastCorrect!==true),last=replay.events.at(-1),lastConcept=board.locations.find(node=>node.id===last?.id)?.conceptId;
 const candidates=[...pending].sort((a,b)=>items[a].attempts-items[b].attempts||Number(board.locations.find(node=>node.id===a)?.conceptId===lastConcept)-Number(board.locations.find(node=>node.id===b)?.conceptId===lastConcept)||replay.targetIds.indexOf(a)-replay.targetIds.indexOf(b));
 const complete=!pending.length,exhausted=replay.events.length>=REPLAY_MAX_CHECKS&&!complete,currentId=replay.checked&&last?last.id:!exhausted?candidates[0]:undefined,item=items[currentId],original=board.locations.find(node=>node.id===currentId),round=item?(replay.checked?item.attempts:item.attempts+1):0,node=original?practiceVariant(original,round):null;
 return {items,pending,complete,exhausted,currentId,original,node,round,done:replay.targetIds.length-pending.length,total:replay.targetIds.length,correct:Object.values(items).reduce((sum,item)=>sum+item.correct,0),lastCorrect:last?items[last.id].lastCorrect:null};
}
export function prepareReplay(board,run,value){
 if(!replayAvailable(board,run)||value?.started!==true)return null;
 const targetIds=[...new Set(Array.isArray(value.targetIds)?value.targetIds.filter(id=>board.locations.some(node=>node.id===id)):[])].slice(0,5);if(!targetIds.length)return null;
 const events=[],counts={};for(const event of (Array.isArray(value.events)?value.events:[]).slice(0,REPLAY_MAX_CHECKS)){if(!targetIds.includes(event?.id))break;const node=practiceVariant(board.locations.find(node=>node.id===event.id),(counts[event.id]||0)+1);if(!validValue(node,event.value))break;events.push({id:event.id,value:event.value});counts[event.id]=(counts[event.id]||0)+1;}
 const coveredIds=[...new Set(Array.isArray(value.coveredIds)?value.coveredIds.filter(id=>board.locations.some(node=>node.id===id)):[])].slice(0,12);
 const result={started:true,length:value.length===5?5:3,coveredIds,targetIds,events,checked:value.checked===true&&events.length>0,draft:''},state=replayState(board,result);
 if(state.node&&!result.checked){const draft=value.draft,node=state.node,partial=node.kind==='settings'&&typeof draft==='string'&&draft.split(',').length===node.controls.length&&draft.split(',').every((part,i)=>part===''||/^[0-9]$/.test(part)&&Number(part)<node.controls[i].options.length);result.draft=typeof draft==='string'&&draft.length<=24&&(draft===initialDraft(node)||validValue(node,draft)||partial)?draft:initialDraft(node);}
 return result;
}
export function startReplay(board,run,uid,length=3,previous){
 if(!replayAvailable(board,run))return null;
 const prior=prepareReplay(board,run,previous),priorState=prior?replayState(board,prior):null;let coveredIds=[...new Set([...(prior?.coveredIds||[]),...Object.values(priorState?.items||{}).filter(item=>item.lastCorrect===true).map(item=>item.id)])];
 const priorities=replayPriorities(board,run,uid);if(coveredIds.length>=board.locations.length)coveredIds=[];const targetIds=priorities.filter(item=>!coveredIds.includes(item.id)).slice(0,length===5?5:3).map(item=>item.id);
 return prepareReplay(board,run,{started:true,length,coveredIds,targetIds,events:[]});
}
export function checkReplay(board,run,value){
 const replay=prepareReplay(board,run,value);if(!replay)return null;const state=replayState(board,replay);if(replay.checked||state.complete||state.exhausted||!state.node||!validValue(state.node,replay.draft))return replay;
 return {...replay,checked:true,draft:'',events:[...replay.events,{id:state.currentId,value:replay.draft}]};
}
