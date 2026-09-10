import { complete, hintLevel, available } from './connected_escape_room_engine.js';

// Learning review is available only after the exit opens and includes collected evidence only.
export function roomDebrief(room, progress) {
  if (!complete(room, progress)) return null;
  const solved = room.nodes.filter(node => progress?.solved?.[node.id] === true);
  const collected = new Map(solved.map(node => [node.reward.id, node]));
  return {
    discoveries: solved.length,
    hints: solved.reduce((count, node) => count + hintLevel(progress, node.id), 0),
    supported: solved.filter(node => progress?.assisted?.[node.id] === true).length,
    objects: solved.map(node => ({
      id: node.id, name: node.name, objective: node.learningObjective || '',
      explanation: node.explanation || '', sourceQuote: node.sourceQuote || '',
      evidence: node.requires.filter(id => collected.has(id)).map(id => {
        const origin = collected.get(id);
        return { id: origin.id, name: origin.reward.name, text: origin.reward.text };
      }),
      discovery: { name: node.reward.name, text: node.reward.text },
      supported: progress?.assisted?.[node.id] === true
    }))
  };
}

// Write exactly the hint that was previewed. A concurrent hint must never silently
// advance the teacher's action to a stronger hint. Existing monotonic leaves only.
export function supportPatch(room, progress, choice) {
  const node = room.nodes.find(n => n.id === choice?.nodeId);
  if (!node || complete(room, progress) || progress?.solved?.[node.id] === true || !available(room, progress, node)) return {};
  if (choice.kind === 'hint' && Number.isInteger(choice.level) && choice.level >= 1 && choice.level <= 3 && choice.level === hintLevel(progress, node.id) + 1) {
    return { ['hints.' + node.id + '.h' + choice.level]: true };
  }
  if (choice.kind === 'rescue' && ['guidance', 'technical', 'time'].includes(choice.reason)) {
    return { ['solved.' + node.id]: true, ['assisted.' + node.id]: true, ['rescueReasons.' + node.id]: choice.reason };
  }
  return {};
}
