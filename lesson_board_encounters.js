// Fictional expedition opportunities use the first persisted fortune die.
// Momentum improves fortune rewards, but does not bias which event is drawn.
const EVENTS = [
  { id: 'survey', immediate: [1, 0], prepared: [2, 0] },
  { id: 'supplies', immediate: [0, 1], prepared: [0, 2] },
  { id: 'passage', immediate: [1, 0], prepared: [0, 2] },
  { id: 'rendezvous', immediate: [0, 1], prepared: [2, 0] }
];

export function encounterFor(board, dice, count) {
  if (board?.playStyle !== 'tabletop' || board.chance !== true || ![2, 5, 8].includes(count) ||
      !Array.isArray(dice) || dice.length < 1 || dice.length > 2 ||
      !dice.every(value => Number.isInteger(value) && value >= 1 && value <= 20)) return null;
  const event = EVENTS[Math.floor((dice[0] - 1) / 5)];
  return { id: event.id, immediate: event.immediate.slice(), prepared: event.prepared.slice() };
}

// A lead is a saved choice, not another roll. Canonical IDs keep its offers
// stable when layout or location display order changes. The two destinations
// favor different resources, so choosing a route also chooses a reward mix.
export function leadOptionsFor(board, dice, visited) {
  if (!Array.isArray(visited) || !encounterFor(board, dice, visited.length)) return [];
  const remaining = board.locations.map(node => node.id).filter(id => !visited.includes(id)).sort();
  if (!remaining.length) return [];
  const offset = (dice[0] - 1) % remaining.length;
  const offers = [{ targetId: remaining[offset], reward: [2, 1] }];
  if (remaining.length > 1) offers.push({ targetId: remaining[(offset + Math.max(1, Math.floor(remaining.length / 2))) % remaining.length], reward: [1, 2] });
  return offers;
}

export const isLeadChoice = choice => typeof choice === 'string' && /^lead:[a-z][a-z0-9_-]{0,39}$/.test(choice);
export const isTradeChoice = choice => choice === 'trade:0' || choice === 'trade:1';
export const isVentureChoice = choice => choice === 'venture:0' || choice === 'venture:1';
export const isDeliveryChoice = choice => typeof choice === 'string' && /^delivery:[a-z][a-z0-9_-]{0,39}$/.test(choice) && !['delivery:constructor', 'delivery:prototype'].includes(choice);
export const isCommissionChoice = choice => typeof choice === 'string' && /^commission:[a-z][a-z0-9_-]{0,39}$/.test(choice) && !['commission:constructor', 'commission:prototype'].includes(choice);
export const isRelayChoice = choice => typeof choice === 'string' && /^relay:[a-z][a-z0-9_-]{0,39}:[a-z][a-z0-9_-]{0,39}$/.test(choice) && choice.split(':').slice(1).every(id => !['constructor', 'prototype'].includes(id)) && choice.split(':')[1] !== choice.split(':')[2];
export const isFieldChoice = choice => ['pending', 'collect', 'prepare', 'crew'].includes(choice) || isLeadChoice(choice) || isTradeChoice(choice) || isVentureChoice(choice) || isDeliveryChoice(choice) || isCommissionChoice(choice) || isRelayChoice(choice);
