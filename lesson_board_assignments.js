import * as engine from './lesson_board_engine.js';
import { planningKey, simulatePlan, PLAN_LIMIT } from './lesson_board_sandbox.js';
import { destinationJourney } from './lesson_board_journey.js';
import { deliveryRoute } from './lesson_board_courier.js';

const enabled = board => board?.playStyle === 'tabletop' && board.chance === true;
const payoutKind = kind => kind === 'lead' ? 'destination' : kind;

function assignmentsOf(board, progress) {
  if (progress.complete) return [];
  return [
    ['lead', progress.fieldLead], ['delivery', progress.fieldDelivery], ['relay', progress.fieldRelay], ['commission', progress.fieldCommission]
  ].flatMap(([kind, item]) => {
    if (!item || kind === 'commission' && progress.built.includes(item.projectId)) return [];
    const target = kind === 'commission' ? item.projectId : item.targetId;
    return [{ id: kind + ':' + item.turn + ':' + (kind === 'relay' ? item.stops.map(stop => stop.targetId).join(':') : target), kind, originTurn: item.turn, ...(typeof item.id === 'string' ? { eventId: item.id } : {}),
      ...(kind === 'relay' ? { stage: item.stage, stops: item.stops.map(stop => ({ targetId: stop.targetId, reward: stop.reward.slice() })) } : {}),
      ...(kind === 'commission' ? { projectId: target } : { targetId: target }), reward: item.reward.slice() }];
  });
}

export function activeAssignments(board, run) {
  if (!enabled(board)) return [];
  return assignmentsOf(board, engine.derive(board, run));
}

function paidAssignments(assignments, result, startTurn) {
  const completed = [], reward = [0, 0];
  for (const assignment of assignments) {
    if (assignment.kind === 'relay') {
      const handoffs = (result.progress.fieldDeliveries || []).filter(item => item.turn >= startTurn && item.originTurn === assignment.originTurn && ['relay-stop', 'relay'].includes(item.kind) && item.targetId === assignment.stops[item.stage - 1]?.targetId);
      if (handoffs.some(item => item.kind === 'relay')) completed.push(assignment.id);
      handoffs.forEach(item => item.gain.forEach((value, index) => { reward[index] += value; }));
      continue;
    }
    const paid = (result.progress.fieldDeliveries || []).find(item => item.turn >= startTurn && item.originTurn === assignment.originTurn && item.kind === payoutKind(assignment.kind) && (assignment.projectId ? item.projectId === assignment.projectId : item.targetId === assignment.targetId));
    if (!paid) continue;
    completed.push(assignment.id);
    paid.gain.forEach((value, index) => { reward[index] += value; });
  }
  return { completed, reward };
}

// Follow only the selected assignment's actual destination or construction site.
// No unrelated gathering detour, future bridge, or fortune roll is invented.
function nextEntry(board, result, assignment) {
  const { progress, run } = result;
  const project = assignment.kind === 'commission' ? board.projects.find(item => item.id === assignment.projectId) : null;
  const targetId = project ? engine.buildSite(board, project) : assignment.kind === 'relay' ? progress.fieldRelay?.targetId : assignment.targetId;
  if (!targetId || !board.locations.some(node => node.id === targetId)) return { reason: 'unreachable' };
  if (project && progress.position === targetId && progress.visited.includes(targetId)) {
    const payments = engine.constructionFunding(board, run, project.id);
    const payment = payments.find(item => item.id === 'standard' && item.legal) || payments.find(item => item.legal);
    return payment ? { entry: { id: project.id, funding: payment.id } } : { reason: 'unaffordable' };
  }
  if (!progress.visited.includes(targetId)) {
    const route = destinationJourney(board, progress, targetId)?.routes[0];
    return route ? { entry: route.nextId } : { reason: 'unreachable' };
  }
  if (progress.position === targetId) return { reason: 'no-progress' };
  const route = deliveryRoute(board, progress, targetId);
  return route ? { entry: route.nextId } : { reason: 'unreachable' };
}

function itinerary(board, run, assignments, order) {
  const entries = [], seen = new Set();
  let result = simulatePlan(board, run), reason = null;
  while (true) {
    const paid = paidAssignments(assignments, result, run.turn);
    const pending = order.find(id => !paid.completed.includes(id));
    if (!pending) break;
    if (result.progress.complete) { reason = 'mission-complete'; break; }
    if (result.status === 'turn-limit') { reason = 'turn-limit'; break; }
    if (entries.length >= PLAN_LIMIT || result.status === 'plan-limit') { reason = 'plan-limit'; break; }
    const p = result.progress;
    const state = JSON.stringify([pending, p.position, p.visited, p.built, p.balance, p.fieldRelay?.stage, paid.completed]);
    if (seen.has(state)) { reason = 'no-progress'; break; }
    seen.add(state);
    const next = nextEntry(board, result, assignments.find(item => item.id === pending));
    if (next.reason) { reason = next.reason; break; }
    const candidate = [...entries, next.entry], projected = simulatePlan(board, run, candidate);
    if (projected.steps.length !== candidate.length || ['invalid', 'finish-move'].includes(projected.status)) { reason = 'invalid-move'; break; }
    entries.push(next.entry); result = projected;
  }
  const { completed, reward } = paidAssignments(assignments, result, run.turn);
  return { order: order.slice(), entries, result, status: reason ? 'blocked' : result.progress.complete ? 'complete' : 'ready', reason,
    completed, reward, segments: result.steps.reduce((sum, step) => sum + Math.max(0, (step.path?.length || 1) - 1), 0),
    firstMove: entries.length ? typeof entries[0] === 'string' ? entries[0] : { ...entries[0] } : null };
}

// A bounded comparison of two saved assignments, not a route optimizer. Every
// appended action is replayed through the same pure simulator as manual plans.
export function assignmentItineraries(board, run, ids) {
  if (!enabled(board)) return null;
  const progress = engine.derive(board, run), assignments = assignmentsOf(board, progress), key = planningKey(board, run);
  const response = status => ({ key, assignments, status, plans: [] });
  if (progress.complete) return response('complete');
  if (engine.stepOf(run).phase !== 'choose') return response('finish-move');
  if (!assignments.length) return response('none');
  const selected = ids === undefined ? assignments.slice(0, 2).map(item => item.id) : ids;
  if (!Array.isArray(selected) || selected.length > 2 || new Set(selected).size !== selected.length || selected.some(id => !assignments.some(item => item.id === id))) return response('invalid-selection');
  if (!selected.length) return response('none');
  const orders = selected.length === 2 ? [selected.slice(), selected.slice().reverse()] : [selected.slice()];
  return { key, assignments, status: 'ready', plans: orders.map(order => itinerary(board, run, assignments, order)) };
}
