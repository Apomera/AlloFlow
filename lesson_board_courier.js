import { encounterFor } from './lesson_board_encounters.js';
import { routeTo, spatialRoutes, spatialState, travelLimitOf } from './lesson_board_spatial.js';

export const isDeliveryEncounter = id => id === 'survey' || id === 'passage';

// Offers use only explored stations reachable by one legal travel move. The
// saved first die orders the destinations; reviewing a card never redraws it.
// Busy state belongs to the caller so a receipt retains its original offers.
export function deliveryOptionsFor(board, progress, dice) {
  const encounter = encounterFor(board, dice, progress?.visited?.length);
  if (!encounter || !isDeliveryEncounter(encounter.id) || progress?.complete) return [];
  const moves = spatialState(board, progress).moves.filter(move => move.travel && move.id !== (progress.position || board.starts[0]) && !(progress.requirementsMet && move.id === board.starts[0]));
  moves.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  if (!moves.length) return [];
  const offset = (dice[0] - 1) % moves.length, survey = encounter.id === 'survey';
  const indices = [offset];
  if (moves.length > 1) indices.push((offset + Math.max(1, Math.floor(moves.length / 2))) % moves.length);
  return indices.map((index, offer) => ({ targetId: moves[index].id, reward: survey ? offer ? [2, 1] : [3, 0] : offer ? [1, 2] : [0, 3], path: moves[index].path.slice() }));
}

// An accepted parcel may outlive its original one-move route. Show the exact
// next legal cleared-space stop; this advice cannot open routes or move pieces.
export function deliveryRoute(board, progress, targetId) {
  if (board?.playStyle !== 'tabletop' || progress?.complete || !Array.isArray(progress?.visited) || !Array.isArray(progress.built) || !progress.visited.includes(targetId) || targetId === (progress.position || board.starts[0])) return null;
  const path = routeTo(board, progress, targetId);
  if (!path || path.length < 2) return null;
  const segments = path.length - 1, limit = travelLimitOf(board), withinRange = limit === null || segments <= limit;
  let stop = withinRange ? segments : limit;
  // Ending at home can finish the mission, including first use of a bridge on
  // that move. Passing through home is safe; stop before it when necessary.
  if (stop < segments && progress.requirementsMet && path[stop] === board.starts[0]) stop--;
  if (stop < 1) return null;
  const nextId = path[stop], nextPath = routeTo(board, progress, nextId);
  if (!nextPath || nextPath.length < 2 || limit !== null && nextPath.length - 1 > limit) return null;
  const crossesBridge = spatialRoutes(board, progress).some(route => route.projectId && nextPath.some((id, index) => index > 0 && (nextPath[index - 1] === route.from && id === route.to || nextPath[index - 1] === route.to && id === route.from)));
  const finishes = nextId === board.starts[0] && !!progress.requirementsMet && ((progress.usedProjects || []).length > 0 || crossesBridge);
  return { path: path.slice(), segments, nextId, nextPath: nextPath.slice(), withinRange, finishes };
}
