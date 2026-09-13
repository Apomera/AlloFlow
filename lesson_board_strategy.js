import { derive, goalOf, stepOf, MAX_TURNS } from './lesson_board_engine.js';

// Search only successful explorations before the selected construction. Existing
// bonuses are fixed, so a visited-location mask determines the available balance.
// A valid board has at most 12 locations: at most 4096 masks are examined.
export function projectPlan(board, run, projectId) {
  const project = board.projects.find(item => item.id === projectId);
  if (!project) return null;
  const progress = derive(board, run), slots = Math.max(0, MAX_TURNS - run.turn);
  const base = { project, slots, locationIds: [], steps: [], moves: 0, examined: 0 };
  if (progress.built.includes(projectId)) return { ...base, status: 'built' };
  if (progress.complete) return { ...base, status: 'complete' };
  if (stepOf(run).phase !== 'choose') return { ...base, status: 'finish-move' };
  const nodes = board.locations, index = new Map(nodes.map((node, i) => [node.id, i]));
  const maskOf = ids => ids.reduce((mask, id) => index.has(id) ? mask | (1 << index.get(id)) : mask, 0);
  const initial = maskOf(progress.visited), starts = maskOf([...board.starts, ...progress.opened]), all = (1 << nodes.length) - 1;
  const adjacent = nodes.map(() => 0);
  for (const [a,b] of board.edges) { adjacent[index.get(a)] |= 1 << index.get(b); adjacent[index.get(b)] |= 1 << index.get(a); }
  const available = mask => { let open = starts; for (let i=0;i<nodes.length;i++) if (mask & (1 << i)) open |= adjacent[i]; return open & ~mask; };
  const concepts = board.concepts.map(concept => maskOf(nodes.filter(node => node.conceptId === concept.id).map(node => node.id)));
  const required = goalOf(board) === 'architect' ? 3 : 2;
  const complete = (mask, built) => built >= required && concepts.every(concept => !!(mask & concept)) && (goalOf(board) !== 'expedition' || mask === all);
  const reward = nodes.map(node => node.reward.map((value, i) => value + progress.bonus[i]));
  const queue = [{ mask: initial, balance: [...progress.balance], path: [] }], seen = new Set([initial]);
  for (let cursor=0;cursor<queue.length;cursor++) {
    const current = queue[cursor];
    if (project.cost.every((cost,i) => current.balance[i] >= cost)) {
      let balance = [...progress.balance];
      const steps = current.path.map(i => { balance = balance.map((value,r) => value + reward[i][r]); return { id:nodes[i].id, name:nodes[i].name, reward:[...reward[i]], balance:[...balance] }; });
      const moves = steps.length + 1, completesMission = complete(current.mask,progress.built.length + 1);
      const remaining = nodes.filter((_,i) => !(current.mask & (1 << i))).length;
      const destination = project.effect.kind === 'path' ? 1 << index.get(project.effect.targetId) : 0;
      return { ...base, status: moves > slots ? 'turn-limit' : steps.length ? 'funded' : 'ready', locationIds:steps.map(step=>step.id), steps, moves, examined:cursor+1,
        after:current.balance.map((value,i)=>value-project.cost[i]), completesMission,
        bonusPotential:project.effect.kind === 'yield' && !completesMission ? Math.min(remaining,Math.max(0,slots-moves)) : 0,
        shortcutUseful:!!destination && !(current.mask & destination) && !(available(current.mask) & destination)
      };
    }
    const open = available(current.mask), shortfall = project.cost.map((cost,i)=>Math.max(0,cost-current.balance[i]));
    const choices = nodes.map((node,i)=>({i,score:reward[i].reduce((sum,value,r)=>sum+Math.min(value,shortfall[r]),0)*3 + Number(!nodes.some((other,j)=>other.conceptId===node.conceptId && (current.mask & (1 << j))))})).filter(({i})=>open & (1 << i)).sort((a,b)=>b.score-a.score || a.i-b.i);
    for (const {i} of choices) {
      const mask = current.mask | (1 << i);
      if (seen.has(mask) || complete(mask,progress.built.length)) continue;
      seen.add(mask); queue.push({ mask, balance:current.balance.map((value,r)=>value+reward[i][r]), path:[...current.path,i] });
    }
  }
  return { ...base, status:'unavailable', examined:queue.length };
}
