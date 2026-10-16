import { encounterFor } from './lesson_board_encounters.js';

export const isCommissionEncounter = id => id === 'supplies' || id === 'rendezvous';

// A commission reserves a reward for one named construction. Canonical project
// IDs and the first saved die keep the offer stable across layout and reopens.
// The caller owns active-commission state so receipts keep their original offers.
export function commissionOptionsFor(board, progress, dice) {
  const encounter = encounterFor(board, dice, progress?.visited?.length);
  if (!encounter || !isCommissionEncounter(encounter.id) || progress?.complete || !Array.isArray(progress?.built)) return [];
  const remaining = board.projects.map(project => project.id).filter(id => !progress.built.includes(id)).sort();
  if (!remaining.length) return [];
  const offset = (dice[0] - 1) % remaining.length;
  const offers = [{ projectId: remaining[offset], reward: [3, 1] }];
  if (remaining.length > 1) offers.push({ projectId: remaining[(offset + Math.max(1, Math.floor(remaining.length / 2))) % remaining.length], reward: [1, 3] });
  return offers;
}
