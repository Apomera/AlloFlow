// Dependency analysis for prepared v1 rooms. This never changes puzzles or progress.
const reasoning = new Set(['configure', 'sequence', 'route']);
export function roomStructure(value) {
  return value === 'discovery' || value === 'A tool unlocks two investigations that reunite at the final door' ? 'discovery' : 'parallel';
}
export function analyzeRoomFlow(room) {
  const byReward = new Map(room.nodes.map(node => [node.reward.id, node.id]));
  const byId = new Map(room.nodes.map(node => [node.id, node]));
  const parents = new Map(room.nodes.map(node => [node.id, node.requires.map(id => byReward.get(id))]));
  const ancestors = new Map(), depths = new Map(), visiting = new Set();
  function visit(id) {
    if (ancestors.has(id)) return ancestors.get(id);
    if (!byId.has(id) || visiting.has(id)) throw new Error('Room flow needs a valid, acyclic room.');
    visiting.add(id);
    const found = new Set(); let depth = 0;
    for (const parent of parents.get(id)) {
      for (const prior of visit(parent)) found.add(prior);
      found.add(parent); depth = Math.max(depth, depths.get(parent) + 1);
    }
    visiting.delete(id); ancestors.set(id, found); depths.set(id, depth); return found;
  }
  room.nodes.forEach(node => visit(node.id));
  // A final requirement already needed by another final requirement is not a new path.
  const direct = parents.get(room.exitNodeId);
  const ends = direct.filter(id => !direct.some(other => other !== id && ancestors.get(other).has(id)));
  const closures = ends.map(id => new Set([...ancestors.get(id), id]));
  const usage = new Map(room.nodes.map(node => [node.id, closures.filter(set => set.has(node.id)).length]));
  const ordered = room.nodes.slice().sort((a, b) => depths.get(a.id) - depths.get(b.id)).map(node => node.id);
  const branches = ends.map((endNodeId, index) => {
    const nodeIds = ordered.filter(id => closures[index].has(id) && usage.get(id) === 1);
    return { endNodeId, nodeIds, puzzleIds: nodeIds.filter(id => reasoning.has(byId.get(id).type)) };
  });
  const puzzleBranches = branches.filter(branch => branch.puzzleIds.length > 0);
  // The discovery variation must actually reveal something used by both reasoning paths.
  const toolGateIds = ordered.filter(id => byId.get(id).type === 'use-tool' && puzzleBranches.length >= 2 && puzzleBranches.every(branch => branch.puzzleIds.some(puzzleId => ancestors.get(puzzleId).has(id))));
  return {
    startingIds: ordered.filter(id => parents.get(id).length === 0),
    sharedIds: ordered.filter(id => usage.get(id) > 1),
    branches, independentPaths: puzzleBranches.length, toolGateIds,
    redundantExitIds: direct.filter(id => !ends.includes(id)), exitNodeId: room.exitNodeId
  };
}
export function generationFlowErrors(room, structure) {
  const flow = analyzeRoomFlow(room), errors = [];
  if (flow.independentPaths < 2) errors.push('The final door must combine at least two independent reasoning paths. Each path needs its own configure, sequence or route device, without requiring the other path result. A clue already needed by another final requirement does not count as a separate path.');
  if (roomStructure(structure) === 'discovery' && flow.independentPaths >= 2 && !flow.toolGateIds.length) errors.push('For Discovery opens two paths, one use-tool discovery must be a prerequisite (directly or through other discoveries) of a reasoning device on each independent path. Keep the two devices independent after that shared discovery.');
  return errors;
}
