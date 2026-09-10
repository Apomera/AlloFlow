import { derive, targets, stepOf, validValue, MAX_TURNS } from './lesson_board_engine.js';

export function moveDetails(board, run, id) {
  const progress = derive(board, run), available = new Set([...board.starts, ...progress.opened]);
  for (const [a, b] of board.edges) { if (progress.visited.includes(a)) available.add(b); if (progress.visited.includes(b)) available.add(a); }
  const location = board.locations.find(item => item.id === id);
  if (location) {
    const neighbors = new Set(board.edges.flatMap(([a, b]) => a === id ? [b] : b === id ? [a] : []));
    return {
      complete: progress.complete,
      concept: board.concepts.find(item => item.id === location.conceptId),
      newConcept: !progress.concepts.includes(location.conceptId),
      reward: progress.visited.includes(id) ? [0, 0] : location.reward.map((amount, index) => amount + progress.bonus[index]),
      connections: board.locations.filter(item => neighbors.has(item.id)),
      opens: board.locations.filter(item => neighbors.has(item.id) && !available.has(item.id) && !progress.visited.includes(item.id)),
      explored: progress.visited.includes(id),
    };
  }
  const project = board.projects.find(item => item.id === id);
  if (!project) return null;
  const built = progress.built.includes(id), shortfall = project.cost.map((amount, index) => Math.max(0, amount - progress.balance[index]));
  const pathAlreadyOpen = project.effect.kind === 'path' && (progress.visited.includes(project.effect.targetId) || available.has(project.effect.targetId));
  return { complete: progress.complete, built, shortfall, affordable: !built && shortfall.every(amount => amount === 0), after: progress.balance.map((amount, index) => amount - project.cost[index]), pathAlreadyOpen };
}

export function proposalSummary(board, run, roster) {
  const counts = new Map();
  for (const [uid, id] of Object.entries(stepOf(run).votes || {})) {
    if (Object.prototype.hasOwnProperty.call(roster, uid)) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return targets(board, run).filter(item => counts.has(item.id)).map(item => ({ id: item.id, name: item.name, count: counts.get(item.id) }));
}

export function learningSummary(board, run, roster) {
  const learners = Object.entries(roster).map(([uid, value]) => ({ uid, name: value?.name || uid, answered: 0, correct: 0, concepts: board.concepts.map(concept => ({ ...concept, answered: 0, correct: 0 })) }));
  const byUid = new Map(learners.map(learner => [learner.uid, learner]));
  for (let index = 0; index <= Math.min(run.turn, MAX_TURNS - 1); index++) {
    const step = run.steps?.['t' + index], location = board.locations.find(item => item.id === step?.targetId);
    if (!location || step.phase !== 'review') continue;
    for (const [uid, correct] of Object.entries(step.result?.marks || {})) {
      const learner = byUid.get(uid); if (!learner || typeof correct !== 'boolean') continue;
      const concept = learner.concepts.find(item => item.id === location.conceptId);
      learner.answered++; concept.answered++;
      if (correct) { learner.correct++; concept.correct++; }
    }
  }
  return { learners, concepts: board.concepts.map((concept, index) => ({ ...concept, responded: learners.filter(item => item.concepts[index].answered > 0).length, demonstrated: learners.filter(item => item.concepts[index].correct > 0).length })) };
}

export function responseText(node, value) {
  if (!validValue(node, value)) return '';
  const indices = value.split(',').map(Number);
  if (node.kind === 'choice') return node.options[indices[0]];
  if (node.kind === 'order') return indices.map((item, index) => (index + 1) + '. ' + node.items[item]).join('; ');
  return indices.map((item, index) => node.controls[index].label + ': ' + node.controls[index].options[item]).join('; ');
}
