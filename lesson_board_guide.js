import {derive,stepOf,targets,turnLimit} from './lesson_board_engine.js';
import {projectPlan} from './lesson_board_strategy.js';
export function firstBuildGuide(board,run,includePlan=true){const progress=derive(board,run),step=stepOf(run),results=Object.values(run.steps||{}).filter(step=>step.result&&board.locations.some(node=>node.id===step.targetId));const milestones=[results.length>0||step.phase==='answer',results.length>0,progress.visited.length>0,progress.built.length>0];
 if(!includePlan)return {progress};
 if(progress.built.length||progress.complete)return {stage:'complete',milestones,progress};
 if(step.phase==='answer')return {stage:'answer',milestones,progress,targetId:step.targetId};
 if(step.phase==='review')return {stage:step.result?.success?'reward':'retry',milestones,progress,targetId:step.targetId,limit:turnLimit(board,run).reached};
 const plans=board.projects.map(project=>projectPlan(board,run,project.id)).filter(plan=>['ready','funded'].includes(plan.status)).sort((a,b)=>a.moves-b.moves||a.project.id.localeCompare(b.project.id)),plan=plans[0];
 const targetId=plan?.status==='ready'?plan.project.id:plan?.locationIds[0]||targets(board,run).find(node=>!node.cost)?.id;
 return {stage:plan?.status==='ready'?'build':progress.visited.length&&plan?'gather':'explore',milestones,progress,targetId,project:plan?.project,explorations:plan?.steps.length||0};
}
