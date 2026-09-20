import * as engine from './lesson_board_engine.js';

export const PLAN_LIMIT = 12;
// Keep only confirmed mechanics. Names, responses, proposals and grading never
// enter a projection, and a projection is never passed to the live move API.
export function planningBase(run) {
  const steps = {};
  for (let turn = 0; turn <= Math.min(run.turn, engine.MAX_TURNS - 1); turn++) {
    const step = run.steps?.['t' + turn];
    if (step) steps['t' + turn] = { phase: step.phase, targetId: step.targetId || '', ...(step.result ? {result:{success:step.result.success === true,marks:{}}} : {}) };
  }
  return {turn:run.turn,steps};
}
export function planningKey(board, run) { return JSON.stringify([board, planningBase(run)]); }
export function simulatePlan(board, base, requested = []) {
  let run = planningBase(base);
  const initial = engine.derive(board, run), steps = [];
  let status = initial.complete ? 'complete' : engine.stepOf(run).phase !== 'choose' ? 'finish-move' : 'ready';
  const ids = Array.isArray(requested) ? requested : [], invalidInput = !Array.isArray(requested);
  for (const id of ids.slice(0, PLAN_LIMIT)) {
    if (status !== 'ready') break;
    const node = engine.targets(board, run).find(item => item.id === id);
    if (!node) { status = 'invalid'; break; }
    const before = engine.derive(board, run), priorReady = new Set(engine.targets(board, run).map(item=>item.id));
    run = engine.merge(run, engine.begin(board, run, id));
    if (!node.cost) run = engine.merge(run, {['steps.t'+run.turn+'.phase']:'review',['steps.t'+run.turn+'.result']:{success:true,marks:{}}});
    const after = engine.derive(board, run);
    steps.push({id,name:node.name,kind:node.cost?'build':'explore',balance:[...after.balance],change:after.balance.map((n,i)=>n-before.balance[i]),newlyOpened:engine.targets(board,run).filter(item=>!item.cost&&!priorReady.has(item.id)).map(item=>item.id)});
    if (after.complete) status = 'complete';
    else if (run.turn >= engine.MAX_TURNS - 1) status = 'turn-limit';
    else run = engine.merge(run, engine.advance(board, run));
  }
  if (invalidInput || ids.length > PLAN_LIMIT || (steps.length < ids.length && status === 'ready')) status = 'invalid';
  if (status === 'ready' && steps.length === PLAN_LIMIT) status = 'plan-limit';
  const progress = engine.derive(board, run);
  return {initial,progress,steps,status,run,remaining:Math.max(0,engine.MAX_TURNS-base.turn-steps.length),available:status==='ready'?engine.targets(board,run):[],newConcepts:progress.concepts.filter(id=>!initial.concepts.includes(id)),newProjects:progress.built.filter(id=>!initial.built.includes(id)),newLocations:progress.visited.filter(id=>!initial.visited.includes(id))};
}
