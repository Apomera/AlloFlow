// A construction can substitute one missing token by spending two of the other
// resource. The exchange belongs to this build: it never mints loose tokens.
export function fundingCost(board, project, id = 'standard') {
  if (!Array.isArray(project?.cost) || project.cost.length !== 2 || !project.cost.every(value => Number.isInteger(value) && value >= 0)) return null;
  if (id === 'standard') return project.cost.slice();
  if (board?.playStyle !== 'tabletop') return null;
  const give = id === 'research' ? 0 : id === 'build' ? 1 : -1;
  if (give < 0 || project.cost[1 - give] < 1) return null;
  const cost = project.cost.slice(); cost[give] += 2; cost[1 - give] -= 1;
  return cost;
}

// True when some mix of each project's legal funding fits within the supplies.
export function fundableTogether(board, projects, supplies) {
  const fits = (index, left) => index >= projects.length || ['standard', 'research', 'build'].some(id => {
    const cost = fundingCost(board, projects[index], id);
    return !!cost && cost.every((value, i) => left[i] >= value) && fits(index + 1, left.map((value, i) => value - cost[i]));
  });
  return fits(0, supplies.slice());
}

export function fundingOptions(board, project, balance = [0, 0]) {
  return ['standard', 'research', 'build'].flatMap(id => {
    const cost = fundingCost(board, project, id);
    if (!cost) return [];
    return [{ id, cost, affordable: cost.every((value, i) => Number.isFinite(balance?.[i]) && balance[i] >= value), ...(id === 'standard' ? {} : { trade: { give: id === 'research' ? 0 : 1, take: id === 'research' ? 1 : 0 } }) }];
  });
}
