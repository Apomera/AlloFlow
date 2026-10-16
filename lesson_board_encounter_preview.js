import * as engine from './lesson_board_engine.js';
import { planningBase } from './lesson_board_sandbox.js';

const amounts = value => value.slice();
const groupsInOrder = ['collect', 'prepare', 'venture', 'crew', 'commission', 'trade', 'delivery', 'relay', 'lead'];

// These are descriptions of the existing saved choices, not another source of
// encounter rules. Every candidate must still pass the engine's choice gate.
function offeredChoices(card) {
  return [
    { id: 'collect', kind: 'collect', trigger: 'immediate', reward: amounts(card.immediate), spent: [0, 0] },
    ...(card.canPrepare ? [{ id: 'prepare', kind: 'prepare', trigger: 'investigation', reward: amounts(card.prepared), spent: [0, 0] }] : []),
    ...(card.canVenture ? (card.ventures || []).map(item => ({ id: item.id, kind: 'venture', trigger: 'venture', resource: item.resource, threshold: item.threshold, reward: amounts(item.reward), spent: [0, 0] })) : []),
    ...(card.canCrew ? [{ id: 'crew', kind: 'crew', trigger: 'construction', reward: amounts(card.crew), spent: [0, 0] }] : []),
    ...(card.canCommission ? (card.commissions || []).map(item => ({ id: 'commission:' + item.projectId, kind: 'commission', trigger: 'commission', projectId: item.projectId, reward: amounts(item.reward), spent: [0, 0] })) : []),
    ...(card.trades || []).filter(item => item.legal).map(item => ({ id: item.id, kind: 'trade', trigger: 'immediate', give: item.give, take: item.take, reward: amounts(item.gain), spent: amounts(item.cost) })),
    ...(card.canDelivery ? (card.deliveries || []).map(item => ({ id: 'delivery:' + item.targetId, kind: 'delivery', trigger: 'delivery', targetId: item.targetId, reward: amounts(item.reward), spent: [0, 0] })) : []),
    ...(card.canRelay ? (card.relays || []).map(item => ({ id: item.id, kind: 'relay', trigger: 'relay', targetId: item.stops[0].targetId, stops: item.stops.map(stop => ({ targetId: stop.targetId, reward: amounts(stop.reward) })), reward: amounts(item.reward), spent: [0, 0] })) : []),
    ...(card.canLead ? (card.leads || []).map(item => ({ id: 'lead:' + item.targetId, kind: 'lead', trigger: 'destination', targetId: item.targetId, reward: amounts(item.reward), spent: [0, 0] })) : [])
  ];
}

function reservedFor(progress, choice) {
  const value = choice.kind === 'prepare' ? progress.fieldPreparation : choice.kind === 'venture' ? progress.fieldVenture : choice.kind === 'crew' ? progress.fieldCrew : choice.kind === 'commission' ? progress.fieldCommission : choice.kind === 'delivery' ? progress.fieldDelivery : choice.kind === 'relay' ? progress.fieldRelay : choice.kind === 'lead' ? progress.fieldLead : null;
  return value ? { reward: amounts(value.reward), trigger: choice.trigger, ...(choice.kind === 'venture' ? { uncertain: true, threshold: value.threshold, resource: value.resource } : {}), ...(value.targetId ? { targetId: value.targetId } : {}), ...(value.projectId ? { projectId: value.projectId } : {}), ...(value.stops ? { stops: value.stops.map(stop => ({ targetId: stop.targetId, reward: amounts(stop.reward) })) } : {}) } : null;
}

// A draft is private and has no fortune roll, turn advance, movement or saved
// patch. The key follows mechanical history, excluding learner responses.
export function encounterDecision(board, run, selectedId) {
  let card;
  try { card = engine.fieldOpportunity(board, run); } catch (_) { return null; }
  if (!card?.pending) return null;
  const patches = new Map(), choices = offeredChoices(card).filter(choice => {
    try {
      patches.set(choice.id, engine.chooseFieldOpportunity(board, run, choice.id));
      return true;
    } catch (_) { return false; }
  });
  const key = JSON.stringify([board, planningBase(run)]);
  const groups = groupsInOrder.map(id => ({ id, choices: choices.filter(choice => choice.kind === id) })).filter(group => group.choices.length);
  const selected = choices.find(choice => choice.id === selectedId);
  if (!selected) return { key, card, choices, groups, preview: null };

  const before = engine.derive(board, run), projectedRun = engine.merge(run, patches.get(selected.id)), after = engine.derive(board, projectedRun);
  const spent = after.balance.map((_, index) => (after.fieldSpent?.[index] || 0) - (before.fieldSpent?.[index] || 0));
  const gain = after.balance.map((_, index) => (after.fieldGains?.[index] || 0) - (before.fieldGains?.[index] || 0));
  const fundedAfter = board.projects.filter(project => !after.built.includes(project.id) && engine.constructionFunding(board, projectedRun, project.id).some(option => option.legal));
  const newlyFunded = fundedAfter.filter(project => !engine.constructionFunding(board, run, project.id).some(option => option.legal)).map(project => project.id);
  const inspectIds = selected.stops ? selected.stops.map(stop => stop.targetId) : selected.projectId ? [selected.projectId] : selected.targetId ? [selected.targetId] : selected.kind === 'crew' ? fundedAfter.map(project => project.id) : ['prepare','venture'].includes(selected.kind) ? engine.targets(board, projectedRun).filter(node => !node.cost && !after.visited.includes(node.id)).map(node => node.id) : newlyFunded.slice();
  return { key, card, choices, groups, preview: {
    choice: selected.id, kind: selected.kind, trigger: selected.trigger,
    before: amounts(before.balance), after: amounts(after.balance), spent, gain,
    reserved: reservedFor(after, selected),
    ...(selected.targetId ? { targetId: selected.targetId } : {}),
    ...(selected.projectId ? { projectId: selected.projectId } : {}),
    newlyFunded, inspectIds
  } };
}
