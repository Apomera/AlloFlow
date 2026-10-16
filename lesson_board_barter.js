import { buildSite } from './lesson_board_spatial.js';

// A field exchange spends one owned token and receives two of the other kind.
// It is offered only by traders encountered in supplies/rendezvous stories.
export const isTradeEncounter = id => id === 'supplies' || id === 'rendezvous';

// Keep at least one printed-cost route to the mission's remaining construction
// and a usable project. Future fortune, contracts and reserved bonuses are not
// needed to make this promise; already earned rewards are in balance.
function preservesConstruction(board, progress, after) {
  const remainingLocations = board.locations.filter(node => !progress.visited.includes(node.id));
  const remainingProjects = board.projects.filter(project => !progress.built.includes(project.id));
  const required = Math.max(0, (board.goal === 'architect' ? 3 : 2) - progress.built.length);
  const potential = after.map((value, resource) => value + remainingLocations.reduce((sum, node) => sum + node.reward[resource] + progress.bonus[resource], 0));
  const owned = board.projects.filter(project => progress.built.includes(project.id));
  for (let mask = 0; mask < (1 << remainingProjects.length); mask++) {
    const selected = remainingProjects.filter((_, index) => mask & (1 << index));
    if (selected.length < required) continue;
    const eventual = owned.concat(selected);
    // A future workshop cannot justify spending the bridge reserve merely
    // because the last investigation will eventually fund it. It must be
    // buildable now at an explored site, leaving an investigation for its use.
    const yieldReady = owned.some(project => project.effect.kind === 'yield') || selected.some(project => project.effect.kind === 'yield' && progress.visited.includes(buildSite(board, project)) && project.cost.every((value, resource) => after[resource] >= value));
    const canUse = progress.usedProjects?.length > 0 || eventual.some(project => project.effect.kind === 'path') || remainingLocations.length > 0 && yieldReady;
    if (canUse && potential.every((value, resource) => value >= selected.reduce((sum, project) => sum + project.cost[resource], 0))) return true;
  }
  return false;
}

export function tradeOptionsFor(board, progress, encounterId) {
  if (board?.playStyle !== 'tabletop' || board.chance !== true || !isTradeEncounter(encounterId)) return [];
  return [0, 1].map(give => {
    const take = 1 - give, cost = [0, 0], gain = [0, 0];
    cost[give] = 1; gain[take] = 2;
    const after = progress.balance.map((value, resource) => value - cost[resource] + gain[resource]);
    const affordable = progress.balance[give] >= 1, safe = preservesConstruction(board, progress, after);
    return { id: 'trade:' + give, give, take, cost, gain, after, affordable, safe, legal: affordable && safe, reason: !affordable ? 'insufficient' : !safe ? 'completion-reserve' : null };
  });
}
