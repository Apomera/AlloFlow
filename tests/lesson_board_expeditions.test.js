import { describe, it, expect } from 'vitest';
import { makeWaterworksBoard, WATERWORKS_SOURCE } from '../lesson_board_demo.js';
import { makeWaterworksExpedition, normalizeExpeditionSeed, waterworksExpeditionOf, WATERWORKS_EXPEDITION_PLANS } from '../lesson_board_expeditions.js';
import * as engine from '../lesson_board_engine.js';
import { soloStorageKey } from '../lesson_board_storage.js';

const ids = WATERWORKS_EXPEDITION_PLANS.map(plan => plan.id);
const fresh = run => JSON.parse(JSON.stringify(run));
const noBonuses = board => { const result = fresh(board); delete result.chance; delete result.contracts; delete result.expeditionKit; return result; };
function move(board, before, id) {
  let run = engine.stepOf(before).phase === 'review' ? engine.merge(before, engine.advance(board, before)) : before;
  run = engine.merge(run, engine.begin(board, run, id));
  if (engine.stepOf(run).phase === 'answer') {
    const node = board.locations.find(item => item.id === id);
    run = engine.merge(run, engine.processAction(board, run, { attemptId: 'expedition', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'expedition', active: true, paused: false }));
    run = engine.merge(run, engine.resolve(board, run, { solo: {} }));
  }
  return run;
}
function travel(board, run, id) { return engine.derive(board, run).position === id ? run : move(board, run, id); }
function exploreAll(board) {
  let run = engine.emptyRun();
  while (engine.derive(board, run).visited.length < board.locations.length) {
    const progress = engine.derive(board, run);
    const next = engine.tabletopState(board, run).moves.find(item => !progress.visited.includes(item.id));
    expect(next, 'A connected frontier must remain reachable').toBeTruthy();
    run = move(board, run, next.id);
  }
  return run;
}

describe('Reproducible Waterworks expeditions', () => {
  it('retains the original authored board and its existing build sites', () => {
    const original = makeWaterworksBoard();
    expect(original.title).toBe('Waterworks Expedition');
    expect(original.starts).toEqual(['camp', 'sun']);
    expect(engine.buildSite(original, 'bridge')).toBe('sun');
    expect(engine.validateBoard(original, WATERWORKS_SOURCE)).toEqual([]);
    expect(waterworksExpeditionOf(original)).toBeNull();
    makeWaterworksExpedition({ plan: 'shortcut', seed: 23 });
    expect(makeWaterworksBoard()).toEqual(original);
  });

  it.each(ids)('validates all 999 %s deals with eight formats and literal lesson evidence', plan => {
    for (let seed = 1; seed <= 999; seed++) {
      const board = makeWaterworksExpedition({ plan, seed });
      expect(engine.validateBoard(board, WATERWORKS_SOURCE), `${plan} deal ${seed}`).toEqual([]);
      expect(new Set(board.locations.map(node => node.kind)).size).toBe(8);
      expect(board.locations.reduce((sum, node) => sum.map((amount, index) => amount + node.reward[index]), [0, 0])).toEqual([20, 20]);
      for (const node of board.locations) {
        expect(WATERWORKS_SOURCE).toContain(node.sourceQuote);
        expect(engine.validValue(node, engine.solution(node))).toBe(true);
      }
    }
  });

  it('normalizes deal numbers to a bounded reproducible integer', () => {
    for (const value of [undefined, NaN, Infinity, {}, '', '-5', '1.2', 2.5]) expect(normalizeExpeditionSeed(value)).toBe(1);
    expect(normalizeExpeditionSeed(0)).toBe(1);
    expect(normalizeExpeditionSeed(-5)).toBe(1);
    expect(normalizeExpeditionSeed(' 042 ')).toBe(42);
    expect(normalizeExpeditionSeed(1000)).toBe(999);
    expect(makeWaterworksExpedition({ plan: 'unknown', seed: 0 })).toEqual(makeWaterworksExpedition({ plan: 'balanced', seed: 1 }));
  });

  it.each(ids)('reproduces %s deals and survives ordinary board preparation', plan => {
    const board = makeWaterworksExpedition({ plan, seed: 42 });
    expect(makeWaterworksExpedition({ plan, seed: 42 })).toEqual(board);
    expect(engine.prepareBoard(board, WATERWORKS_SOURCE)).toEqual(board);
    expect(waterworksExpeditionOf(board)).toEqual({ plan, seed: 42 });
    board.locations[0].reward[0] = 999;
    expect(makeWaterworksExpedition({ plan, seed: 42 }).locations[0].reward[0]).toBeLessThan(4);
  });

  it('rejects title-only lookalikes and invalid deal markers', () => {
    const board = makeWaterworksExpedition();
    expect(waterworksExpeditionOf({ title: board.title, playStyle: 'tabletop', version: 1 })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, title: 'Waterworks Expedition · Balanced shores · Deal 0' })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, title: board.title + ' extra' })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, locations: board.locations.slice(1) })).toBeNull();
    const unrelated = fresh(board); unrelated.locations[0].id = 'unrelated';
    expect(waterworksExpeditionOf(unrelated)).toBeNull();
    const otherLesson = fresh(board); otherLesson.locations[0].sourceQuote = 'An unrelated lesson with reused location identifiers.';
    expect(waterworksExpeditionOf(otherLesson)).toBeNull();
    expect(waterworksExpeditionOf({ ...board, projects: [] })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, projects: [null, null, null] })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, locations: Array(10).fill(null) })).toBeNull();
    expect(waterworksExpeditionOf({ ...board, playStyle: undefined })).toBeNull();
  });

  it('changes substantive tasks across seeds, with 999 distinct authored combinations', () => {
    const combinations = new Set();
    let previous;
    for (let seed = 1; seed <= 999; seed++) {
      const board = makeWaterworksExpedition({ seed });
      combinations.add(JSON.stringify(board.locations.map(node => [node.instruction, node.sourceQuote, engine.solution(node)])));
      if (previous) expect(board.locations.filter((node, index) => node.instruction !== previous.locations[index].instruction).length, `Adjacent deals ${seed - 1} and ${seed} should vary across the board`).toBeGreaterThanOrEqual(7);
      previous = board;
    }
    expect(combinations.size).toBe(999);
    const first = makeWaterworksExpedition({ seed: 1 }), second = makeWaterworksExpedition({ seed: 2 });
    expect(first.locations[0].instruction).not.toBe(second.locations[0].instruction);
    expect(first.locations[0].categories).not.toEqual(second.locations[0].categories);
    expect(first.contracts).not.toEqual(second.contracts);
    expect(first.locations.map(node => node.reward)).not.toEqual(second.locations.map(node => node.reward));
    expect(soloStorageKey(first, 'app', 'solo')).not.toBe(soloStorageKey(second, 'app', 'solo'));
  });

  it('offers all five authored tasks at every location within the first 25 deals', () => {
    const boards = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    for (const original of makeWaterworksBoard().locations) {
      const variants = new Map(boards.map(board => {
        const node = board.locations.find(item => item.id === original.id);
        return [node.instruction, node];
      }));
      expect(variants.size, original.name).toBe(5);
      for (const node of variants.values()) {
        expect(node.kind).toBe(original.kind);
        expect(node.conceptId).toBe(original.conceptId);
        expect(WATERWORKS_SOURCE).toContain(node.sourceQuote);
      }
    }
  });

  it('keeps authored task arrays fresh when a dealt board is edited', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const board = makeWaterworksExpedition({ seed }), original = fresh(board);
      for (const node of board.locations) {
        for (const field of ['items', 'slots', 'placements', 'repairs', 'corrections', 'allocation', 'constraints']) if (Array.isArray(node[field])) node[field][0] = 'Edited task';
      }
      expect(makeWaterworksExpedition({ seed })).toEqual(original);
    }
  });

  it('grounds route design placements in both height differences and the permitted mechanism', () => {
    const boards = Array.from({ length: 27 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    const node = boards.map(board => board.locations.find(item => item.id === 'lake')).find(item => item.items.every(text => text.startsWith('Route from')));
    expect(node).toBeTruthy();
    for (let index = 0; index < node.items.length; index++) {
      const heights = node.items[index].match(/from (\d+) metres? to (\d+) metres?/);
      expect(heights, node.items[index]).toBeTruthy();
      const [, from, to] = heights;
      const delta = Number(to) - Number(from);
      expect(node.slots[node.placements[index]]).toBe(`${delta > 0 ? 'Pump: rise' : 'Gravity: drop'} of ${Math.abs(delta)} metres`);
    }
    expect(new Set(node.placements).size).toBe(node.items.length);
  });

  it('uses different repair positions and error counts instead of a repeatable faulty-line pattern', () => {
    const logs = new Map(Array.from({ length: 27 }, (_, index) => {
      const node = makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'lookout');
      return [node.instruction, node];
    }));
    expect([...logs.values()].map(node => node.repairs.reduce((sum, value) => sum + value, 0)).sort()).toEqual([1, 2, 2, 3, 3]);
    expect(new Set([...logs.values()].map(node => node.repairs.join(','))).size).toBe(5);
    for (const node of logs.values()) node.repairs.forEach((repair, index) => expect(Boolean(node.corrections[index])).toBe(Boolean(repair)));
  });

  it('gives every supply puzzle exactly one allocation satisfying its authored rules', () => {
    const plans = new Map(Array.from({ length: 27 }, (_, index) => {
      const node = makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'stream');
      return [node.instruction, node];
    }));
    expect([...plans.values()].map(node => node.budget).sort()).toEqual([3, 3, 6, 8, 9]);
    for (const node of plans.values()) {
      const budget = node.budget;
      const valid = [];
      for (let shore = 0; shore <= 6; shore++) for (let garden = 0; garden <= 6; garden++) for (let assembly = 0; assembly <= 6; assembly++) {
        if (shore + garden + assembly !== budget) continue;
        const matchesPlan = node.instruction.startsWith('Rebalance') ? 1 + shore === 2 && 2 + garden === 4 && 2 + assembly === 2
          : budget === 3 ? 1 + shore === 2 && 2 + garden === 3 && 3 + assembly === 4
          : budget === 6 ? shore === 1 && garden === shore * 2
            : budget === 9 ? shore === 2 && garden === shore + 1 : shore === assembly && garden === shore * 2;
        if (matchesPlan) valid.push([shore, garden, assembly]);
      }
      expect(valid).toEqual([node.allocation]);
    }
  });

  it('distinguishes incremental deliveries from final station totals in the reserve upgrade', () => {
    const node = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'stream')).find(item => item.instruction.startsWith('The six-token classroom plan'));
    expect(node.instruction).toContain('only the three extra tokens');
    expect(node.constraints.join(' ')).toContain('additions, not the final totals');
    expect(node.sourceQuote).toContain('six model flow tokens');
    expect(node.sourceQuote).toContain('nine model flow tokens');
    expect(node.allocation.map((extra, index) => extra + [1, 2, 3][index])).toEqual([2, 3, 4]);
    expect(engine.validValue(node, '2,3,4')).toBe(false);
  });

  it('requires accurate intermediate and final states in the new two-change tasks', () => {
    const boards = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    const sort = boards.map(board => board.locations.find(item => item.id === 'camp')).find(node => node.items.length === 5);
    const audit = boards.map(board => board.locations.find(item => item.id === 'lookout')).find(node => node.items.length === 5);
    const changes = { melts: ['Solid', 'Liquid'], evaporates: ['Liquid', 'Gas'], condenses: ['Gas', 'Liquid'], freezes: ['Liquid', 'Solid'] };
    function finalState(journey) {
      let state = journey.startsWith('Ice') ? 'Solid' : journey.startsWith('Vapor') ? 'Gas' : 'Liquid';
      const processes = journey.match(/melts|evaporates|condenses|freezes/g);
      expect(processes, journey).toHaveLength(2);
      for (const process of processes) {
        expect(changes[process][0], `The next change must accept the intermediate state: ${journey}`).toBe(state);
        state = changes[process][1];
      }
      return state;
    }
    expect(sort).toBeTruthy();
    expect(audit).toBeTruthy();
    sort.items.forEach((journey, index) => expect(sort.categories[sort.placements[index]]).toBe(finalState(journey)));
    audit.items.forEach((journey, index) => {
      const predicted = journey.match(/final state is (solid|liquid|gas)/)[1];
      expect(audit.repairs[index], journey).toBe(Number(finalState(journey).toLowerCase() !== predicted));
    });
  });

  it('connects missing cycle steps by both their predecessor and successor', () => {
    const node = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'cloud')).find(item => item.items.some(text => text.includes('?')));
    const cycle = ['evaporation', 'condensation', 'precipitation', 'collection'];
    expect(node).toBeTruthy();
    node.items.forEach((path, index) => {
      const [before, gap, after] = path.toLowerCase().split(' → ');
      const position = cycle.indexOf(before);
      expect(gap).toBe('?');
      expect(node.matches[node.connections[index]].toLowerCase()).toBe(cycle[(position + 1) % cycle.length]);
      expect(after).toBe(cycle[(position + 2) % cycle.length]);
    });
  });

  it('compares route direction as well as height differences', () => {
    const node = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'workshop')).find(item => item.items.every(text => text.startsWith('Compare')));
    expect(node).toBeTruthy();
    const conclusions = node.items.map((item, index) => {
      const [fromA, toA, fromB, toB] = item.match(/\d+/g).map(Number);
      return { riseA: toA - fromA, riseB: toB - fromB, conclusion: node.matches[node.connections[index]] };
    });
    expect(conclusions.find(item => item.riseA > 0 && item.riseB > 0)).toMatchObject({ riseA: 4, riseB: 3, conclusion: 'Both need a pump; the first rises one metre farther' });
    expect(conclusions.find(item => item.riseA < 0 && item.riseB < 0)).toMatchObject({ riseA: -4, riseB: -2, conclusion: 'Both can use gravity; the first drops two metres farther' });
    expect(conclusions.find(item => item.riseA === -item.riseB)).toMatchObject({ riseA: 4, riseB: -4, conclusion: 'Both change height by four metres; the first needs a pump and the second can use gravity' });
    expect(conclusions.find(item => item.riseA < 0 && item.riseB > 0)).toMatchObject({ riseA: -2, riseB: 3, conclusion: 'The first drops two metres with gravity; the second rises three metres with a pump' });
  });

  it('gives each plan distinct terrain, home, investment costs and survey goals', () => {
    const boards = ids.map(plan => makeWaterworksExpedition({ plan, seed: 1 }));
    for (const field of ['edges', 'starts', 'projects', 'contracts']) expect(new Set(boards.map(board => JSON.stringify(board[field]))).size).toBe(3);
    const research = boards[1], crossing = boards[2];
    expect(research.projects.find(project => project.id === 'field-lab').cost).toEqual([4, 2]);
    expect(crossing.starts[0]).toBe('workshop');
    expect(crossing.projects.find(project => project.id === 'bridge').effect.targetId).toBe('cloud');
    for (const board of boards) {
      const bridge = board.projects.find(project => project.id === 'bridge'), site = engine.buildSite(board, bridge);
      const route = engine.routeTo(board, { position: site, visited: board.locations.map(node => node.id), built: [] }, bridge.effect.targetId);
      expect(route.length).toBeGreaterThan(2);
      expect(board.mission).toContain(`return to ${board.locations.find(node => node.id === board.starts[0]).name}`);
    }
  });

  it('reconstructs earlier cycle events without reversing the physical model', () => {
    const boards = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    const connections = boards.map(board => board.locations.find(node => node.id === 'cloud')).find(node => node.instruction.startsWith('Investigate the cycle backward'));
    const history = boards.map(board => board.locations.find(node => node.id === 'rain')).find(node => node.instruction.includes('reverse reading of the log'));
    const forward = ['evaporation', 'condensation', 'precipitation', 'collection'];
    const observations = ['collection', 'precipitation', 'condensation', 'evaporation'];
    observations.forEach((current, index) => {
      expect(connections.matches[connections.connections[index]].toLowerCase()).toBe(forward[(forward.indexOf(current) + 3) % 4]);
    });
    expect(history.order.map(index => history.items[index].toLowerCase())).toEqual([...forward].reverse());
    expect(history.explanation).toContain('physical model still proceeds forward');
  });

  it('plans each route leg independently and swaps endpoints before selecting a return mechanism', () => {
    const boards = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    const assembly = boards.map(board => board.locations.find(node => node.id === 'lake')).find(node => node.items.every(text => text.startsWith('Journey')));
    const returns = boards.map(board => board.locations.find(node => node.id === 'workshop')).find(node => node.items.every(text => text.startsWith('Reverse the route')));
    const mechanism = (start, end) => end > start ? 'pump' : 'gravity';
    assembly.items.forEach((journey, index) => {
      const heights = journey.match(/\d+/g).map(Number);
      const needed = heights.slice(1).map((end, position) => mechanism(heights[position], end));
      const plan = assembly.slots[assembly.placements[index]].toLowerCase();
      expect(plan).toBe(needed.length === 1 ? needed[0] + ' only' : needed.join(', then '));
    });
    returns.items.forEach((journey, index) => {
      const [start, end] = journey.match(/\d+/g).map(Number);
      const plan = returns.matches[returns.connections[index]];
      expect(plan.match(/\d+/g).map(Number)).toEqual([end, start]);
      expect(plan.split(': ')[1]).toBe(mechanism(end, start));
    });
  });

  it('reuses a retrieved supply token and permits a zero addition without overfunding a station', () => {
    const node = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }).locations.find(item => item.id === 'stream')).find(item => item.instruction.startsWith('Rebalance'));
    const delivered = [1, 2, 3], remaining = delivered.map((amount, index) => amount - Number(index === 2));
    const finalShares = remaining.map((amount, index) => amount + node.allocation[index]);
    expect(node.budget).toBe(delivered.reduce((sum, amount) => sum + amount, 0) - remaining.reduce((sum, amount) => sum + amount, 0) + 2);
    expect(finalShares.reduce((sum, amount) => sum + amount, 0)).toBe(8);
    expect(finalShares[0]).toBe(finalShares[2]);
    expect(finalShares[1]).toBe(2 * finalShares[0]);
    expect(node.allocation[2]).toBe(0);
    expect(engine.validValue(node, node.allocation.join(','))).toBe(true);
    expect(engine.validValue(node, finalShares.join(','))).toBe(false);
  });

  it('distinguishes starting states when different processes produce the same liquid result', () => {
    const boards = Array.from({ length: 25 }, (_, index) => makeWaterworksExpedition({ seed: index + 1 }));
    const classification = boards.map(board => board.locations.find(node => node.id === 'camp')).find(node => node.instruction.startsWith('Work backward'));
    const lab = boards.map(board => board.locations.find(node => node.id === 'ice')).find(node => node.instruction.includes('lost the starting-state labels'));
    const audit = boards.map(board => board.locations.find(node => node.id === 'lookout')).find(node => node.instruction.includes('sample’s earlier state'));
    const startingStates = { melt: 'solid', evaporat: 'liquid', condens: 'gas', freez: 'liquid', froze: 'liquid' };
    const processStart = text => startingStates[Object.keys(startingStates).find(process => text.includes(process))];
    const stateName = text => /solid|ice/i.test(text) ? 'solid' : /vapor|gas/i.test(text) ? 'gas' : 'liquid';
    classification.items.forEach((item, index) => expect(classification.categories[classification.placements[index]].toLowerCase()).toBe(processStart(item)));
    lab.controls.forEach(control => expect(stateName(control.options[control.answer])).toBe(processStart(control.label)));
    audit.items.forEach((claim, index) => {
      const claimedStart = claim.split('started as ')[1];
      expect(audit.repairs[index]).toBe(Number(stateName(claimedStart) !== processStart(claim)));
      if (audit.repairs[index]) expect(stateName(audit.corrections[index].split('started as ')[1])).toBe(processStart(claim));
    });
  });

  it.each(ids)('finishes %s with any construction order and no kit, contracts, fortune or yield income', plan => {
    const orders = [['bridge', 'field-lab', 'tools'], ['bridge', 'tools', 'field-lab'], ['field-lab', 'bridge', 'tools'], ['field-lab', 'tools', 'bridge'], ['tools', 'bridge', 'field-lab'], ['tools', 'field-lab', 'bridge']];
    for (const seed of [1, 2, 3, 42, 999]) for (const order of orders) {
      const board = noBonuses(makeWaterworksExpedition({ plan, seed }));
      board.goal = 'architect'; // Exercise all costs before requiring the return.
      let run = exploreAll(board);
      for (const id of order) {
        run = travel(board, run, engine.buildSite(board, id));
        run = move(board, run, id);
      }
      const bridge = board.projects.find(project => project.id === 'bridge');
      run = travel(board, run, engine.buildSite(board, bridge));
      run = move(board, run, bridge.effect.targetId);
      run = travel(board, run, board.starts[0]);
      const progress = engine.derive(board, run);
      expect(progress).toMatchObject({ complete: true, returned: true, balance: board.projects.reduce((sum, project) => sum.map((value, index) => value - project.cost[index]), [20, 20]) });
      expect(progress.visited).toHaveLength(10);
      expect(progress.built).toHaveLength(3);
      expect(progress.usedProjects).toContain('bridge');
      expect(run.turn).toBeLessThan(engine.MAX_TURNS - 1);
    }
  });

  it.each(ids)('supports an early research investment and expedition victory on %s', plan => {
    const board = noBonuses(makeWaterworksExpedition({ plan, seed: 1 }));
    const project = board.projects.find(item => item.id === 'field-lab'), site = engine.buildSite(board, project);
    let run = engine.emptyRun();
    while (!engine.derive(board, run).visited.includes(site) || project.cost.some((cost, index) => engine.derive(board, run).balance[index] < cost)) {
      const progress = engine.derive(board, run);
      const next = engine.tabletopState(board, run).moves.find(item => !progress.visited.includes(item.id));
      run = move(board, run, next.id);
    }
    expect(engine.derive(board, run).visited.length).toBeLessThan(7);
    run = move(board, travel(board, run, site), project.id);
    while (engine.derive(board, run).visited.length < board.locations.length) {
      const progress = engine.derive(board, run);
      run = move(board, run, engine.tabletopState(board, run).moves.find(item => !progress.visited.includes(item.id)).id);
    }
    expect(engine.derive(board, run).usedProjects).toContain('field-lab');
    run = move(board, travel(board, run, engine.buildSite(board, 'tools')), 'tools');
    // If the second construction is at home, leave first: the mission requires
    // an actual return after meeting the objectives, not just ending a build.
    if (engine.derive(board, run).position === board.starts[0]) run = move(board, run, board.locations.find(node => node.id !== board.starts[0]).id);
    run = travel(board, run, board.starts[0]);
    expect(engine.derive(board, run)).toMatchObject({ complete: true, returned: true });
    expect(run.turn).toBeLessThan(engine.MAX_TURNS - 1);
  });
});
