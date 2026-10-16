// Optional setup choices. The engine supplies only newly earned milestones from
// its authoritative event history; selection and UI inspection are not events.
export const EXPEDITION_KIT_IDS = Object.freeze(['surveyor', 'builder', 'pathfinder']);
export const KIT_MAX_TOKENS = 4;

const definitions = Object.freeze({
  surveyor: Object.freeze({ id: 'surveyor', label: 'Surveyor', trigger: 'newConcept', maxAwards: 2, reward: Object.freeze([2, 0]), tradeoff: 'Early research supplies from exploring new concepts.' }),
  builder: Object.freeze({ id: 'builder', label: 'Builder', trigger: 'newProject', maxAwards: 2, reward: Object.freeze([0, 2]), tradeoff: 'Construction refunds after you pay the full building cost.' }),
  pathfinder: Object.freeze({ id: 'pathfinder', label: 'Pathfinder', trigger: 'crossedBridge', maxAwards: 1, reward: Object.freeze([2, 2]), tradeoff: 'A mixed supply bonus after building and crossing a shortcut.' }),
});

export const expeditionKitMeta = id => EXPEDITION_KIT_IDS.includes(id) ? definitions[id] : null;

// earnedCount counts rewarded milestones, not resources. Invalid counters fail
// closed; oversized valid counters are capped. Every return owns its reward array.
export function kitReward(id, events = {}, earnedCount = 0) {
  const kit = expeditionKitMeta(id), validCount = Number.isSafeInteger(earnedCount) && earnedCount >= 0;
  const count = kit && validCount ? Math.min(earnedCount, kit.maxAwards) : 0;
  const awarded = !!kit && validCount && count < kit.maxAwards && events?.[kit.trigger] === true;
  return { reward: awarded ? [...kit.reward] : [0, 0], earnedCount: count + Number(awarded), awarded };
}

// Presentation helpers accept already-derived progress, avoiding an engine/UI
// dependency cycle and never reinterpreting saved answers or movement history.
export function expeditionKitProgress(id, earnedCount = 0) {
  const kit = expeditionKitMeta(id);
  if (!kit) return null;
  const count = Number.isSafeInteger(earnedCount) && earnedCount >= 0 ? Math.min(earnedCount, kit.maxAwards) : 0;
  return { kit, earnedCount: count, remaining: kit.maxAwards - count, complete: count === kit.maxAwards,
    gains: kit.reward.map(value => value * count) };
}
