// Tabletop rules use location IDs and graph edges, never presentation coordinates.
export const isTabletop = board => board?.playStyle === 'tabletop';
export const travelLimitOf = board => isTabletop(board) && board.travelLimit === 3 ? 3 : null;

const hash = value => [...String(value)].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 0);

function graphPath(edges, from, target, mayPass = () => true) {
  const queue = [[from]], seen = new Set([from]);
  for (let index = 0; index < queue.length; index++) {
    const path = queue[index], current = path.at(-1);
    if (current === target) return path;
    if (current !== from && !mayPass(current)) continue;
    const neighbors = edges.flatMap(([a, b]) => a === current ? [b] : b === current ? [a] : []).sort();
    for (const id of neighbors) if (!seen.has(id)) { seen.add(id); queue.push([...path, id]); }
  }
  return null;
}

export function buildSite(board, projectOrId) {
  const project = typeof projectOrId === 'string' ? board.projects.find(item => item.id === projectOrId) : projectOrId;
  if (!project) return null;
  const starts = [...board.starts].sort();
  if (project.effect.kind === 'path') {
    const ranked = starts.map(id => ({ id, distance: graphPath(board.edges, id, project.effect.targetId)?.length || 0 }));
    const longest = Math.max(...ranked.map(item => item.distance));
    const choices = ranked.filter(item => item.distance === longest).map(item => item.id);
    return choices[hash(project.id) % choices.length];
  }
  return starts[hash(project.id) % starts.length];
}

export function spatialRoutes(board, progress) {
  const routes = board.edges.map(([from, to]) => ({ from, to }));
  for (const project of board.projects) if (progress.built.includes(project.id) && project.effect.kind === 'path') {
    const from = buildSite(board, project), to = project.effect.targetId;
    if (!routes.some(route => route.from === from && route.to === to || route.from === to && route.to === from)) routes.push({ from, to, projectId: project.id });
  }
  return routes;
}

// A move may cross any cleared spaces, but cannot pass through an unresolved one.
// Keep the full connected route for previews, including destinations beyond a
// tactical move's reach. spatialState applies the optional three-edge limit.
export function routeTo(board, progress, targetId) {
  if (!board.locations.some(node => node.id === targetId)) return null;
  const from = progress.position || board.starts[0];
  return graphPath(spatialRoutes(board, progress).map(route => [route.from, route.to]), from, targetId, id => progress.visited.includes(id));
}

const crosses = (path, edge) => path.some((id, index) => index > 0 && (path[index - 1] === edge.from && id === edge.to || path[index - 1] === edge.to && id === edge.from));

// A visited-mask search keeps bridge alternatives simple and bounded. A path
// cannot loop across a bridge just to claim its use, or cross a fresh activity.
function pathViaBridge(board, progress, targetId, routes, bridge) {
  const ids = board.locations.map(node => node.id).sort(), from = progress.position || board.starts[0];
  if (ids.length > 12 || !ids.includes(from) || from === targetId) return null;
  const indices = new Map(ids.map((id, index) => [id, index]));
  const neighbors = new Map(ids.map(id => [id, routes.flatMap(edge => edge.from === id ? [edge.to] : edge.to === id ? [edge.from] : []).sort()]));
  const mask = 1 << indices.get(from), queue = [{ path: [from], mask, used: false }], seen = new Set([from + ':' + mask + ':0']);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const current = queue[cursor], id = current.path.at(-1);
    if (id === targetId) { if (current.used) return current.path; continue; }
    if (id !== from && !progress.visited.includes(id)) continue;
    for (const next of neighbors.get(id) || []) {
      const bit = 1 << indices.get(next);
      if (current.mask & bit) continue;
      const used = current.used || (id === bridge.from && next === bridge.to || id === bridge.to && next === bridge.from);
      const nextMask = current.mask | bit, key = next + ':' + nextMask + ':' + Number(used);
      if (!seen.has(key)) { seen.add(key); queue.push({ path: [...current.path, next], mask: nextMask, used }); }
    }
  }
  return null;
}

export function travelRouteOptions(board, progress, targetId) {
  if (!isTabletop(board) || progress?.complete || !Array.isArray(progress?.visited) || !Array.isArray(progress.built)) return [];
  const shortest = routeTo(board, progress, targetId);
  if (!shortest) return [];
  const limit = travelLimitOf(board), describe = (id, path, projectId) => ({ id, path: path.slice(), segments: path.length - 1, ...(projectId ? { projectId } : {}), legal: limit === null || path.length - 1 <= limit });
  const options = [describe('shortest', shortest)], seen = new Set([shortest.join('\u0000')]), routes = spatialRoutes(board, progress);
  for (const bridge of routes.filter(edge => edge.projectId).sort((a, b) => a.projectId < b.projectId ? -1 : a.projectId > b.projectId ? 1 : 0)) {
    // The default already gives this bridge's effect; an equivalent alternate
    // adds no choice and must not create a second persisted interpretation.
    if (crosses(shortest, bridge)) continue;
    const path = pathViaBridge(board, progress, targetId, routes, bridge);
    if (!path || seen.has(path.join('\u0000'))) continue;
    seen.add(path.join('\u0000')); options.push(describe('bridge:' + bridge.projectId, path, bridge.projectId));
  }
  return options;
}

export function resolveTravelRoute(board, progress, targetId, route = 'shortest') {
  if (!isTabletop(board) || progress?.complete) return null;
  if (route === 'shortest') {
    const path = routeTo(board, progress, targetId), limit = travelLimitOf(board);
    return path && (limit === null || path.length - 1 <= limit) ? path : null;
  }
  if (route !== 'shortest' && (typeof route !== 'string' || !/^bridge:[a-z][a-z0-9_-]{0,39}$/.test(route))) return null;
  return travelRouteOptions(board, progress, targetId).find(option => option.id === route && option.legal)?.path || null;
}

export function spatialState(board, progress) {
  const position = progress.position || board.starts[0], travelLimit = travelLimitOf(board);
  const connected = board.locations.flatMap(node => {
    const travel = progress.visited.includes(node.id);
    const delivery = node.id === board.starts[0] && !!progress.objectiveReady && !progress.complete;
    if (node.id === position && travel && !delivery) return [];
    const path = routeTo(board, progress, node.id);
    return path ? [{ id: node.id, path, travel }] : [];
  });
  const inRange = move => travelLimit === null || move.path.length - 1 <= travelLimit;
  return { position, homeId: board.starts[0], routes: spatialRoutes(board, progress), travelLimit,
    moves: progress.complete ? [] : connected.filter(inRange), outOfRange: progress.complete ? [] : connected.filter(move => !inRange(move)),
    projectSites: Object.fromEntries(board.projects.map(project => [project.id, buildSite(board, project)])),
    objectiveReady: !!progress.objectiveReady, requirementsMet: !!progress.requirementsMet, usedProjects: progress.usedProjects || [],
    constructionUseRequired: !(progress.usedProjects || []).length, returnRequired: !!progress.objectiveReady && !progress.complete };
}
