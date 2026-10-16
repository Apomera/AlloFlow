import * as engine from './lesson_board_engine.js';
import { isFieldChoice } from './lesson_board_encounters.js';

export const PLAN_LIMIT = 12;
// Keep only confirmed mechanics. Names, responses, proposals and grading never
// enter a projection, and a projection is never passed to the live move API.
export function planningBase(run) {
  const steps = {};
  for (let turn = 0; turn <= Math.min(run.turn, engine.MAX_TURNS - 1); turn++) {
    const step = run.steps?.['t' + turn];
    // Only the fact of a retry affects momentum and saved encounter dice. Keep
    // that mechanical marker, without attempt counts or learner responses.
    if (step) steps['t' + turn] = { phase: step.phase, targetId: step.targetId || '', ...(step.retryRound > 0 ? {retryRound:1} : {}), ...(step.funding ? {funding:step.funding} : {}), ...(step.route === undefined ? {} : {route:step.route}), ...(step.result ? {result:{success:step.result.success === true,marks:{},...(engine.validDice(step.result.dice)?{dice:step.result.dice.slice()}: {}),...(isFieldChoice(step.result.fieldChoice)?{fieldChoice:step.result.fieldChoice}:{})}} : {}) };
  }
  return {turn:run.turn,steps};
}
export function planningKey(board, run) { return JSON.stringify([board, planningBase(run)]); }

// Projected investigations have no future die. The engine consumes a venture
// there with an unknown outcome; copy that uncertainty without treating its
// possible reward as available money or carrying it to a later investigation.
export function ventureUncertainties(progress, turn) {
  return (progress.fieldDeliveries || []).filter(item => item.kind === 'venture' && item.outcome === 'unknown' && (turn === undefined || item.turn === turn))
    .map(item => ({ ...item, gain: item.gain.slice(), reward: item.reward.slice() }));
}

// String routes retain their original first-legal-payment behavior. Structured
// moves make a payment intentional: omitting funding means the printed cost.
function requestedMove(value) {
  if (typeof value === 'string' && value) return {id:value, legacy:true};
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.hasOwn(value,'id') || typeof value.id !== 'string' || !value.id || Object.keys(value).some(key=>!['id','funding','route'].includes(key))) return null;
  if (Object.hasOwn(value,'funding') && !['standard','research','build'].includes(value.funding)) return null;
  if (Object.hasOwn(value,'route') && value.route !== 'shortest' && (typeof value.route !== 'string' || !/^bridge:[a-z][a-z0-9_-]{0,39}$/.test(value.route))) return null;
  return {id:value.id, funding:Object.hasOwn(value,'funding')?value.funding:undefined, route:Object.hasOwn(value,'route')?value.route:undefined, legacy:false};
}

function projectMove(board, run, node, funding, route = 'shortest') {
  const before=engine.derive(board,run),tabletop=board.playStyle==='tabletop';
  const defaultMove=tabletop&&!node.cost?engine.tabletopState(board,run).moves.find(move=>move.id===node.id):null;
  const physical=defaultMove?{...defaultMove,path:engine.resolveTravelRoute(board,before,node.id,route)}:null;
  const kind=node.cost?'build':physical?.travel?'travel':'explore';
  let next=engine.merge(run,engine.begin(board,run,node.id,funding,route));
  // Travel and construction already have an authoritative mechanical result.
  // Only a new investigation needs an assumed result, never a learner response.
  if(kind==='explore')next=engine.merge(next,{['steps.t'+next.turn+'.phase']:'review',['steps.t'+next.turn+'.result']:{success:true,marks:{}}});
  const after=engine.derive(board,next),priorReady=new Set(engine.targets(board,run).map(item=>item.id)),uncertainVentures=ventureUncertainties(after,next.turn);
  const payment=node.cost?engine.constructionFunding(board,run,node.id).find(option=>option.id===funding):null;
  return {run:next,after,step:{id:node.id,name:node.name,kind,...(route!=='shortest'?{route}:{}),...(payment?{funding,payment:payment.cost.slice()}:{}),...(physical?{path:physical.path.slice(),position:after.position}:{}),...(uncertainVentures.length?{uncertainVentures}:{}),balance:after.balance.slice(),change:after.balance.map((n,i)=>n-before.balance[i]),
    newlyOpened:engine.targets(board,next).filter(item=>!item.cost&&!priorReady.has(item.id)).map(item=>item.id),
    newConcepts:after.concepts.filter(id=>!before.concepts.includes(id)),newProjects:after.built.filter(id=>!before.built.includes(id)),
    newContracts:(after.completedContracts||[]).filter(id=>!(before.completedContracts||[]).includes(id)),usedProjects:(after.usedProjects||[]).filter(id=>!(before.usedProjects||[]).includes(id)),
    kitGain:(after.kitGains||[0,0]).map((value,i)=>value-(before.kitGains?.[i]||0))}};
}

export function simulatePlan(board, base, requested = []) {
  let run = planningBase(base);
  const initial = engine.derive(board, run), steps = [];
  let status = initial.complete ? 'complete' : engine.stepOf(run).phase !== 'choose' ? 'finish-move' : 'ready';
  const ids = Array.isArray(requested) ? requested : [], invalidInput = !Array.isArray(requested);
  for (const entry of ids.slice(0, PLAN_LIMIT)) {
    if (status !== 'ready') break;
    const move=requestedMove(entry);
    if(!move){status='invalid';break;}
    const {id}=move,node = engine.targets(board, run).find(item => item.id === id);
    if (!node) { status = 'invalid'; break; }
    const funding=node.cost?(move.legacy?engine.constructionFunding(board,run,id).find(option=>option.legal)?.id:move.funding||'standard'):'standard';
    if(!node.cost&&move.funding!==undefined||node.cost&&move.route!==undefined||node.cost&&!engine.constructionFunding(board,run,id).some(option=>option.id===funding&&option.legal)||move.route!==undefined&&(!engine.isTabletop(board)||!engine.resolveTravelRoute(board,engine.derive(board,run),id,move.route))){status='invalid';break;}
    const projected=projectMove(board,run,node,funding,move.route||'shortest'),after=projected.after;
    run=projected.run;steps.push(projected.step);
    if (after.complete) status = 'complete';
    else if (run.turn >= engine.MAX_TURNS - 1) status = 'turn-limit';
    else run = engine.merge(run, engine.advance(board, run));
  }
  if (invalidInput || ids.length > PLAN_LIMIT || (steps.length < ids.length && status === 'ready')) status = 'invalid';
  if (status === 'ready' && steps.length === PLAN_LIMIT) status = 'plan-limit';
  const progress = engine.derive(board, run);
  const available=status==='ready'?engine.targets(board,run):[],opportunities=available.map(node=>{
    const fundingOptions=node.cost?engine.constructionFunding(board,run,node.id):[],funding=node.cost?fundingOptions.find(option=>option.legal).id:'standard';
    const projected=projectMove(board,run,node,funding).step;
    return {...projected,...(node.cost?{fundingOptions:fundingOptions.map(option=>({...option,cost:option.cost.slice()}))}:{})};
  });
  const uncertainVentures=ventureUncertainties(progress);
  return {initial,progress,steps,status,run,...(uncertainVentures.length?{uncertainVentures}:{}),remaining:Math.max(0,engine.MAX_TURNS-base.turn-steps.length),available:available.map(node=>{if(!node.cost)return node;const payment=opportunities.find(item=>item.id===node.id);return payment.funding!=='standard'?{...node,cost:payment.payment.slice(),funding:payment.funding}:node;}),opportunities,newConcepts:progress.concepts.filter(id=>!initial.concepts.includes(id)),newProjects:progress.built.filter(id=>!initial.built.includes(id)),newLocations:progress.visited.filter(id=>!initial.visited.includes(id)),newContracts:(progress.completedContracts||[]).filter(id=>!(initial.completedContracts||[]).includes(id))};
}
