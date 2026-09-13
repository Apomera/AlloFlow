import {derive} from './lesson_board_engine.js';
export const FINALE_TEXT_LIMIT=1800;
export function prepareFinale(board,run,value){
 const progress=derive(board,run);if(!progress.complete||value?.started!==true)return null;
 return {started:true,projectId:progress.built.includes(value.projectId)?value.projectId:'',effectChoice:['path','yield','instant'].includes(value.effectChoice)?value.effectChoice:'',evidenceIds:[0,1].map(index=>{const id=value.evidenceIds?.[index];return progress.visited.includes(id)&&(index===0||id!==value.evidenceIds?.[0])?id:'';}),mode:value.mode==='oral'?'oral':'text',explanation:typeof value.explanation==='string'?value.explanation.slice(0,FINALE_TEXT_LIMIT):'',oralConfirmed:value.oralConfirmed===true,checks:{connection:value.checks?.connection===true,evidence:value.checks?.evidence===true,purpose:value.checks?.purpose===true},reviewed:value.reviewed===true};
}
export function finaleReview(board,run,value){
 const draft=prepareFinale(board,run,value),project=board.projects.find(p=>p.id===draft?.projectId),evidence=(draft?.evidenceIds||[]).filter(Boolean).map(id=>board.locations.find(node=>node.id===id));
 const rules=!!project&&draft.effectChoice===project.effect.kind,connections=evidence.length===2&&new Set(evidence.map(node=>node.conceptId)).size===2,response=!!draft&&(draft.mode==='oral'?draft.oralConfirmed:!!draft.explanation.trim()),selfReview=!!draft&&Object.values(draft.checks).every(Boolean);
 return {draft,project,evidence,rules,connections,response,selfReview,complete:!!draft?.reviewed&&rules&&connections&&response&&selfReview};
}
// A learner-chosen download is separate from classroom transport and scoring.
export function finaleArtifact(board,run,value){
 const review=finaleReview(board,run,value);if(!review.draft)return null;
 return {version:1,type:'lesson-board-finale',boardTitle:board.title,status:review.complete?'reviewed':'draft',project:review.project?{name:review.project.name,effect:{...review.project.effect},resource:review.project.effect.kind==='yield'?board.resources[review.project.effect.resource]:undefined,location:review.project.effect.kind==='path'?board.locations.find(node=>node.id===review.project.effect.targetId)?.name:undefined}:null,evidence:review.evidence.map(node=>({location:node.name,concept:board.concepts.find(concept=>concept.id===node.conceptId)?.name,sourceQuote:node.sourceQuote,explanation:node.explanation})),response:{mode:review.draft.mode,text:review.draft.mode==='text'?review.draft.explanation:'',explainedAloud:review.draft.mode==='oral'&&review.draft.oralConfirmed},checks:{boardRule:review.rules,distinctConcepts:review.connections,responseProvided:review.response,selfReview:review.draft.checks},explanationAssessment:'Self or teacher review; explanation meaning is not automatically graded.'};
}
