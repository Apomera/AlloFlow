import { spatialRoutes, spatialState, travelLimitOf } from './lesson_board_spatial.js';

// Route advice is deliberately separate from the saved game. It assumes each
// investigation succeeds, and includes only routes already on the table.
const comparePath = (a, b) => {
  const left = a.join('\u0000'), right = b.join('\u0000');
  return left < right ? -1 : left > right ? 1 : 0;
};

function findPath(neighbors, from, target, visited, preferDiscoveries) {
  const compare = (a, b) => (preferDiscoveries ? a.discoveries - b.discoveries || a.edges - b.edges : a.edges - b.edges || a.discoveries - b.discoveries) || comparePath(a.path, b.path);
  const first = { path: [from], edges: 0, discoveries: 0 }, queue = [first], best = new Map([[from, first]]);
  while (queue.length) {
    queue.sort(compare);
    const current = queue.shift(), id = current.path.at(-1);
    if (best.get(id) !== current) continue;
    if (id === target) return current.path;
    for (const next of neighbors.get(id)) {
      const candidate = { path: [...current.path, next], edges: current.edges + 1, discoveries: current.discoveries + (visited.has(next) ? 0 : 1) };
      if (!best.has(next) || compare(candidate, best.get(next)) < 0) {
        best.set(next, candidate);
        queue.push(candidate);
      }
    }
  }
  return null;
}

function describeRoute(id, path, visited, limit, terminalHome) {
  const investigations = path.filter((node, index) => (index > 0 || path.length === 1) && !visited.has(node));
  const actions = [];
  if (path.length === 1) actions.push({ id: path[0], kind: 'investigate' });
  for (let at = 0; at < path.length - 1;) {
    let stop = Math.min(path.length - 1, at + (limit || path.length));
    for (let index = at + 1; index <= stop; index++) if (!visited.has(path[index])) { stop = index; break; }
    // Passing through home is safe; ending a move there can finish the game.
    // A cleared home reached at the range limit can be crossed next turn by
    // stopping one segment earlier instead of ending the expedition early.
    if (stop < path.length - 1 && path[stop] === terminalHome) stop--;
    actions.push({ id: path[stop], kind: visited.has(path[stop]) ? 'travel' : 'investigate' });
    at = stop;
  }
  return { id, path, segments: path.length - 1, investigations, turns: actions.length, nextId: actions[0].id, nextAction: actions[0].kind };
}

export function destinationJourney(board, progress, targetId) {
  if (board?.playStyle !== 'tabletop' || progress?.complete || !Array.isArray(board.locations) || !Array.isArray(board.edges) || !Array.isArray(board.starts) || !Array.isArray(board.projects) || !Array.isArray(progress?.visited) || !Array.isArray(progress.built)) return null;
  const ids = board.locations.map(node => node?.id), known = new Set(ids), from = progress.position || board.starts[0], visited = new Set(progress.visited);
  if (ids.some(id => typeof id !== 'string' || !id) || known.size !== ids.length || !known.has(from) || !known.has(targetId) || visited.has(targetId)) return null;
  if (board.edges.some(edge => !Array.isArray(edge) || edge.length !== 2 || edge.some(id => !known.has(id)))) return null;
  let routes, legal;
  try {
    routes = spatialRoutes(board, progress);
    legal = spatialState(board, progress).moves;
  } catch (_) { return null; }
  const neighbors = new Map(ids.map(id => [id, new Set()])), terminalHome = progress.objectiveReady ? board.starts[0] : null;
  const blockedHome = terminalHome && terminalHome !== from && terminalHome !== targetId && !visited.has(terminalHome) ? terminalHome : null;
  for (const { from: a, to: b } of routes) {
    if (!known.has(a) || !known.has(b)) return null;
    // An unresolved intermediate home cannot be passed without investigating
    // it, which would complete an already-ready mission before this target.
    if (a === blockedHome || b === blockedHome) continue;
    neighbors.get(a).add(b); neighbors.get(b).add(a);
  }
  const directPath = findPath(neighbors, from, targetId, visited, false);
  if (!directPath) return null;
  const direct = describeRoute('direct', directPath, visited, travelLimitOf(board), terminalHome);
  if (!legal.some(move => move.id === direct.nextId)) return null;
  const result = [direct], discoveryPath = findPath(neighbors, from, targetId, visited, true);
  if (discoveryPath && comparePath(discoveryPath, directPath) !== 0) {
    const discovery = describeRoute('discovery', discoveryPath, visited, travelLimitOf(board), terminalHome);
    if (discovery.investigations.length < direct.investigations.length && legal.some(move => move.id === discovery.nextId)) result.push(discovery);
  }
  return { routes: result };
}
