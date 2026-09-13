import { derive, targets, stepOf, validValue, MAX_TURNS, attemptRecords, missionProgress } from './lesson_board_engine.js';

function availableLocations(board, progress) {
  const available = new Set([...board.starts, ...progress.opened]);
  for (const [a, b] of board.edges) { if (progress.visited.includes(a)) available.add(b); if (progress.visited.includes(b)) available.add(a); }
  return available;
}
// Multi-source BFS counts successful activities still needed, starting from every open site.
export function unlockPath(board, run, id) {
  const progress = derive(board, run), available = availableLocations(board, progress);
  if (progress.visited.includes(id)) return [];
  const queue = board.locations.filter(node => available.has(node.id) && !progress.visited.includes(node.id)).map(node => [node.id]), seen = new Set(queue.map(path => path[0]));
  while (queue.length) {
    const path = queue.shift(), last = path[path.length - 1];
    if (last === id) return path.map(key => board.locations.find(node => node.id === key));
    for (const [a, b] of board.edges) { const next = a === last ? b : b === last ? a : null; if (next && !seen.has(next) && !progress.visited.includes(next)) { seen.add(next); queue.push([...path, next]); } }
  }
  return [];
}
export function moveDetails(board, run, id) {
  const progress = derive(board, run), available = availableLocations(board, progress);
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
      unlockPath: unlockPath(board, run, id),
    };
  }
  const project = board.projects.find(item => item.id === id);
  if (!project) return null;
  const built = progress.built.includes(id), shortfall = project.cost.map((amount, index) => Math.max(0, amount - progress.balance[index]));
  const pathAlreadyOpen = project.effect.kind === 'path' && (progress.visited.includes(project.effect.targetId) || available.has(project.effect.targetId));
  const mission = missionProgress(board,run), completesOnBuild = !built && mission.remainingProjects <= 1 && mission.remainingConcepts === 0 && (mission.goal !== 'expedition' || mission.remainingLocations === 0);
  const yieldRemaining = built || progress.complete || completesOnBuild ? 0 : Math.min(board.locations.length - progress.visited.length, Math.max(0,MAX_TURNS - run.turn - 1));
  return { complete: progress.complete, built, shortfall, affordable: !built && shortfall.every(amount => amount === 0), after: progress.balance.map((amount, index) => amount - project.cost[index]), pathAlreadyOpen,
    yieldRemaining, yieldPotential: [0, 1].map(index => project.effect.kind === 'yield' && index === project.effect.resource ? yieldRemaining : 0), yieldBreakEven: project.effect.kind === 'yield' ? project.cost[project.effect.resource] : null,
    unlockPath: project.effect.kind === 'path' ? unlockPath(board, run, project.effect.targetId) : [],
  };
}
export function planningSummary(board, run, projectId) {
  const progress = derive(board, run), mission = missionProgress(board, run), remaining = board.projects.filter(project => !progress.built.includes(project.id));
  const shortfallFor = project => project.cost.map((cost, index) => Math.max(0, cost - progress.balance[index]));
  const project = remaining.find(item => item.id === projectId) || remaining.slice().sort((a, b) => shortfallFor(a).reduce((x, y) => x + y, 0) - shortfallFor(b).reduce((x, y) => x + y, 0))[0] || null;
  const shortfall = project ? shortfallFor(project) : [0, 0];
  const reachable = targets(board, run).filter(item => !item.cost).map(node => {
    const detail = moveDetails(board, run, node.id), contribution = detail.reward.map((amount, index) => Math.min(amount, shortfall[index]));
    return { id: node.id, name: node.name, conceptId: node.conceptId, reward: detail.reward, contribution, newConcept: detail.newConcept, opens: detail.opens, score: contribution.reduce((x, y) => x + y, 0) * 3 + Number(detail.newConcept) * 2 + detail.opens.length };
  }).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const routes = board.locations.filter(node => !progress.visited.includes(node.id) && (mission.goal === 'expedition' || !progress.concepts.includes(node.conceptId))).map(node => { const path = unlockPath(board, run, node.id); return { id: node.id, name: node.name, conceptId: node.conceptId, path, moves: path.length }; }).filter(route => route.moves > 0).sort((a, b) => a.moves - b.moves || a.name.localeCompare(b.name));
  return { project, shortfall, reachable, routes, remainingRewards: board.locations.filter(node => !progress.visited.includes(node.id)).reduce((sum, node) => sum.map((value, index) => value + node.reward[index] + progress.bonus[index]), [0, 0]) };
}

export function proposalSummary(board, run, roster) {
  const counts = new Map();
  for (const [uid, id] of Object.entries(stepOf(run).votes || {})) {
    if (Object.prototype.hasOwnProperty.call(roster, uid)) counts.set(id, (counts.get(id) || 0) + 1);
  }
  return targets(board, run).filter(item => counts.has(item.id)).map(item => ({ id: item.id, name: item.name, count: counts.get(item.id) }));
}

const emptyEvidence = () => ({ answered: 0, correct: 0, firstCorrect: null, lastCorrect: null, retries: 0, improved: false });
const aggregate = locations => ({ answered: locations.reduce((sum, item) => sum + item.answered, 0), correct: locations.reduce((sum, item) => sum + item.correct, 0), attemptedLocations: locations.filter(item => item.answered).length, firstCorrectCount: locations.filter(item => item.firstCorrect === true).length, latestCorrectCount: locations.filter(item => item.lastCorrect === true).length, retries: locations.reduce((sum, item) => sum + item.retries, 0) });
export function learningSummary(board, run, roster) {
  const learners = Object.entries(roster || {}).map(([uid, value]) => ({ uid, name: value?.name || uid, locations: board.locations.map(location => ({ id: location.id, name: location.name, conceptId: location.conceptId, ...emptyEvidence() })) }));
  const byUid = new Map(learners.map(learner => [learner.uid, learner]));
  for (let index = 0; index <= Math.min(run.turn, MAX_TURNS - 1); index++) {
    const step = run.steps?.['t' + index], location = board.locations.find(item => item.id === step?.targetId);
    if (!location || !step.result && !step.retryStats) continue;
    for (const [uid, stats] of Object.entries(attemptRecords(step))) {
      const learner = byUid.get(uid); if (!learner) continue;
      const item = learner.locations.find(item => item.id === location.id);
      if (!item.answered) item.firstCorrect = stats.firstCorrect;
      item.answered += stats.answered; item.correct += stats.correct; item.lastCorrect = stats.lastCorrect;
      item.retries = Math.max(0, item.answered - 1); item.improved = item.firstCorrect === false && item.lastCorrect === true;
    }
  }
  for (const learner of learners) { Object.assign(learner, aggregate(learner.locations)); learner.concepts = board.concepts.map(concept => ({ ...concept, ...aggregate(learner.locations.filter(item => item.conceptId === concept.id)) })); }
  return { learners,
    locations: board.locations.map(location => { const records = learners.map(learner => learner.locations.find(item => item.id === location.id)); return { id: location.id, name: location.name, conceptId: location.conceptId, responded: records.filter(item => item.answered).length, firstCorrectCount: records.filter(item => item.firstCorrect === true).length, latestCorrectCount: records.filter(item => item.lastCorrect === true).length, improved: records.filter(item => item.improved).length, ...aggregate(records) }; }),
    concepts: board.concepts.map((concept, index) => ({ ...concept, responded: learners.filter(item => item.concepts[index].answered > 0).length, demonstrated: learners.filter(item => item.concepts[index].correct > 0).length, firstCorrectCount: learners.reduce((sum, item) => sum + item.concepts[index].firstCorrectCount, 0), latestCorrectCount: learners.reduce((sum, item) => sum + item.concepts[index].latestCorrectCount, 0), attemptedLocations: learners.reduce((sum, item) => sum + item.concepts[index].attemptedLocations, 0), retries: learners.reduce((sum, item) => sum + item.concepts[index].retries, 0) })) };
}

export function responseText(node, value) {
  if (!validValue(node, value)) return '';
  const indices = value.split(',').map(Number);
  if (node.kind === 'choice') return node.options[indices[0]];
  if (node.kind === 'order') return indices.map((item, index) => (index + 1) + '. ' + node.items[item]).join('; ');
  return indices.map((item, index) => node.controls[index].label + ': ' + node.controls[index].options[item]).join('; ');
}
