import { encounterFor } from './lesson_board_encounters.js';
import { resolveTravelRoute, spatialState } from './lesson_board_spatial.js';

export const isRelayEncounter = id => id === 'passage';

// A relay uses two distinct, already-cleared stations. Both orders must be
// possible in two legal travel moves when offered, including the tactical cap.
// Home is never a stop: returning there can finish the expedition early.
// Canonical pairs and the first saved die keep offers stable across reopens,
// board layout changes, and the momentum die. Busy state belongs to the caller
// so the original offer remains available to describe a saved receipt.
export function relayOptionsFor(board, progress, dice) {
  const encounter = encounterFor(board, dice, progress?.visited?.length);
  if (!encounter || !isRelayEncounter(encounter.id) || progress?.complete || !Array.isArray(progress?.built)) return [];
  const position = progress.position || board.starts[0], home = board.starts[0];
  const candidates = spatialState(board, progress).moves
    .filter(move => move.travel && move.id !== position && move.id !== home)
    .map(move => move.id).sort();
  const pairs = [];
  for (let first = 0; first < candidates.length; first++) {
    for (let second = first + 1; second < candidates.length; second++) {
      const a = candidates[first], b = candidates[second];
      if (resolveTravelRoute(board, { ...progress, position: a }, b) &&
          resolveTravelRoute(board, { ...progress, position: b }, a)) pairs.push([a, b]);
    }
  }
  if (!pairs.length) return [];
  const [a, b] = pairs[(dice[0] - 1) % pairs.length];
  return [
    { id: 'relay:' + a + ':' + b, stops: [{ targetId: a, reward: [1, 0] }, { targetId: b, reward: [0, 3] }], reward: [1, 3] },
    { id: 'relay:' + b + ':' + a, stops: [{ targetId: b, reward: [0, 1] }, { targetId: a, reward: [3, 0] }], reward: [3, 1] },
  ];
}
