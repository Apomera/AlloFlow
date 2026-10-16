import {MAX_TURNS,stepOf} from './lesson_board_engine.js';
import {worldProgress} from './lesson_board_world.js';
import {buildSite,spatialRoutes} from './lesson_board_spatial.js';

// A presentation ledger, derived from successful history rather than balance
// differences. Fortune, contracts and refunds never become producer income.
export function constructionImpact(board,run,{projection=false}={}) {
  const result={scope:projection?'projected':'actual',projects:{}};
  if(board?.playStyle!=='tabletop'||!Number.isInteger(run?.turn)||run.turn<0||run.turn>=MAX_TURNS)return result;
  const world=worldProgress(board,run),progress=world.progress,step=stepOf(run);
  const fresh=board.locations.filter(node=>!progress.visited.includes(node.id)).map(node=>node.id);
  // A failed current investigation can still succeed on retry, even on the
  // final turn. Building a new producer always needs a separate move.
  const currentInvestigation=fresh.includes(step.targetId)&&
    (step.phase==='answer'||step.phase==='review'&&step.result?.success===false);
  const currentSlot=step.phase==='choose'||currentInvestigation?1:0;
  const routes=spatialRoutes(board,progress);
  for(const project of board.projects) {
    const built=progress.built.includes(project.id),used=progress.usedProjects.includes(project.id);
    const base={id:project.id,kind:project.effect.kind,siteId:buildSite(board,project),built,used,
      builtTurn:world.impact[project.id]?.turn??null,earned:null,potential:null,connection:null};
    if(project.effect.kind==='yield') {
      const resource=project.effect.resource;
      if(built)base.earned={resource,count:world.impact[project.id]?.earned||0};
      const slots=built?MAX_TURNS-1-run.turn+currentSlot:
        MAX_TURNS-1-run.turn-(step.phase==='choose'?0:1);
      // These are candidate spaces, not a promised route. The total is bounded
      // by remaining moves; reaching sites, building and travel may reduce it.
      const maximum=progress.complete?0:Math.min(fresh.length,Math.max(0,slots));
      base.potential={resource,perInvestigation:1,locationIds:maximum?fresh.slice():[],maximum,requiresBuild:!built};
    } else if(project.effect.kind==='path') {
      base.connection={from:base.siteId,to:project.effect.targetId,
        added:routes.some(route=>route.projectId===project.id),used};
    }
    result.projects[project.id]=base;
  }
  return result;
}
