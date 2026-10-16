// Optional fictional finds use the first future saved die. The momentum die
// improves ordinary fortune only; it must not change these advertised odds.
export const isVentureEncounter = id => id === 'survey';

export function ventureOptionsFor(board, progress, encounterId) {
  if (board?.playStyle !== 'tabletop' || board.chance !== true || !isVentureEncounter(encounterId) || progress?.complete || !Array.isArray(progress?.visited) || progress.visited.length >= board.locations.length) return [];
  return [0, 1].map(resource => ({ id: 'venture:' + resource, resource, reward: resource === 0 ? [4, 0] : [0, 4], threshold: 11 }));
}

export function ventureOutcome(venture, dice, expectedDice) {
  const valid = [1, 2].includes(expectedDice) && Array.isArray(dice) && dice.length === expectedDice && dice.every(value => Number.isInteger(value) && value >= 1 && value <= 20);
  const outcome = !valid ? 'unknown' : dice[0] >= 11 ? 'found' : 'empty';
  return { resource: venture.resource, reward: venture.reward.slice(), threshold: 11, outcome,
    ...(valid ? { firstDie: dice[0] } : {}), gain: outcome === 'found' ? venture.reward.slice() : [0, 0] };
}
