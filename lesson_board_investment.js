import * as engine from './lesson_board_engine.js';
import {simulatePlan} from './lesson_board_sandbox.js';
import {kitReward} from './lesson_board_tactics.js';

// All estimates use existing public game rules. They do not evaluate responses,
// roll fortune, choose a move for the party, or create a second game state format.
function readyInvestment(board, run, projectId, funding) {
  if (board?.playStyle !== 'tabletop' || !Number.isInteger(run?.turn) || run.turn < 0 || run.turn >= engine.MAX_TURNS || engine.stepOf(run).phase !== 'choose') return null;
  const before = engine.derive(board, run);
  if (before.complete) return null;
  const project = engine.targets(board, run).find(node => node.id === projectId && node.cost);
  if (!project) return null;
  const payment = engine.constructionFunding(board, run, projectId).find(option => option.id === funding && option.legal);
  return payment ? {before, project, payment} : null;
}

function bridgeRouteSavings(board, before, after, project, futureSlots) {
  if (!futureSlots || after.complete) return [];
  const limit = engine.travelLimitOf(board), moves = segments => limit ? Math.ceil(segments / limit) : 1;
  const savings = board.locations.flatMap(node => {
    if (node.id === before.position) return [];
    // routeTo may end at a fresh investigation, but never crosses one. Dividing
    // the cleared route into legal waypoints does not assume extra discoveries.
    const previous = engine.routeTo(board, before, node.id), next = engine.routeTo(board, after, node.id);
    if (!previous || !next || next.length >= previous.length) return [];
    const beforeSegments = previous.length - 1, afterSegments = next.length - 1;
    const beforeMoves = moves(beforeSegments), afterMoves = moves(afterSegments);
    if (afterMoves > futureSlots) return [];
    return [{id: node.id, beforeSegments, afterSegments, beforeMoves, afterMoves, visited: before.visited.includes(node.id)}];
  });
  // The move preview already describes the bridge endpoint. Prefer its wider
  // effect, retaining that endpoint when it is the only shortened route.
  const onward = savings.filter(route => route.id !== project.effect.targetId);
  return (onward.length ? onward : savings).sort((a, b) =>
    Number(b.id === board.starts[0]) - Number(a.id === board.starts[0]) ||
    (b.beforeMoves - b.afterMoves) - (a.beforeMoves - a.afterMoves) ||
    (b.beforeSegments - b.afterSegments) - (a.beforeSegments - a.afterSegments) || a.id.localeCompare(b.id)).slice(0, 3);
}

export function investmentPreview(board, run, projectId, funding = 'standard') {
  const ready = readyInvestment(board, run, projectId, funding);
  if (!ready) return null;
  const {before, project, payment} = ready;
  const built = simulatePlan(board, run, [{id: projectId, funding}]);
  const futureSlots = Math.max(0, engine.MAX_TURNS - 1 - run.turn);
  const remainingInvestigations = Math.min(board.locations.length - before.visited.length, futureSlots);
  const preview = {projectId, siteId: engine.buildSite(board, project), funding, payment: payment.cost.slice(), remainingInvestigations, yield: null, bridge: null};
  if (project.effect.kind === 'yield') {
    const resource = project.effect.resource, costToRecover = payment.cost[resource];
    // Recovering one component never repays the other resource. This upper bound
    // also does not promise that a shorter mission will visit every fresh space.
    preview.yield = {resource, costToRecover, investigationsToRecover: costToRecover, maximum: remainingInvestigations,
      canRecover: remainingInvestigations >= costToRecover, otherResourceCost: payment.cost[1 - resource]};
  } else {
    const previous = new Set(engine.tabletopState(board, run).moves.filter(move => !move.travel).map(move => move.id));
    const moves = futureSlots > 0 && !built.progress.complete ? engine.tabletopState(board, built.run).moves : [];
    const newlyReachableIds = moves.filter(move => !move.travel && !previous.has(move.id)).map(move => move.id);
    const site = preview.siteId, destination = project.effect.targetId;
    const canCross = moves.some(move => move.path.some((id, index) => index > 0 &&
      (move.path[index - 1] === site && id === destination || move.path[index - 1] === destination && id === site)));
    preview.bridge = {newlyReachableIds, routeSavings: bridgeRouteSavings(board, before, built.progress, project, futureSlots),
      pathfinderPotential: canCross ? kitReward(board.expeditionKit, {crossedBridge: true}, built.progress.kitCount || 0).reward : [0, 0]};
  }
  return preview;
}

function fullPlan(board, run, entries) {
  const result = simulatePlan(board, run, entries);
  return result.steps.length === entries.length && !['invalid', 'finish-move'].includes(result.status) ? {entries, result} : null;
}

// A bounded local comparison, not an optimizer: consider only currently
// reachable fresh investigations, and preserve both complete three-move routes.
export function investmentComparisons(board, run, projectId, funding = 'standard') {
  const ready = readyInvestment(board, run, projectId, funding);
  if (!ready || engine.MAX_TURNS - run.turn < 3) return [];
  const site = engine.buildSite(board, ready.project), candidates = [];
  for (const node of engine.targets(board, run).filter(node => !node.cost && !ready.before.visited.includes(node.id))) {
    const first = fullPlan(board, run, [{id: projectId, funding}, node.id, site]);
    if (!first) continue;
    const preparation = fullPlan(board, run, [node.id, site]);
    if (!preparation || preparation.result.progress.complete || engine.stepOf(preparation.result.run).phase !== 'choose') continue;
    const payments = engine.constructionFunding(board, preparation.result.run, projectId);
    const payment = payments.find(option => option.id === 'standard' && option.legal) || payments.find(option => option.legal);
    if (!payment) continue;
    const second = fullPlan(board, run, [node.id, site, {id: projectId, funding: payment.id}]);
    if (!second) continue;
    candidates.push({locationId: node.id, plans: [first, second]});
    if (candidates.length === 3) break;
  }
  return candidates;
}
