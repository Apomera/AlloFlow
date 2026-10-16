import { describe, it, expect } from 'vitest';
import { destinationJourney } from '../lesson_board_journey.js';
import { spatialState } from '../lesson_board_spatial.js';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
const { makeBoard } = createRequire(import.meta.url)('../dev-tools/fixtures/lesson_board.cjs');

function board(edges, options = {}) {
  const ids = [...new Set(edges.flat())];
  return { playStyle: 'tabletop', starts: ['home'], locations: ids.map(id => ({ id })), edges, projects: [], ...options };
}
const progress = (visited = ['home'], extra = {}) => ({ position: 'home', visited, built: [], ...extra });

describe('Destination journey advice', () => {
  it('finds a staged route through unexplored spaces with a legal first investigation', () => {
    const b = board([['home', 'a'], ['a', 'b'], ['b', 'target']]), p = progress();
    expect(destinationJourney(b, p, 'target')).toEqual({ routes: [{ id: 'direct', path: ['home', 'a', 'b', 'target'], segments: 3, investigations: ['a', 'b', 'target'], turns: 3, nextId: 'a', nextAction: 'investigate' }] });
    expect(spatialState(b, p).moves.map(move => move.id)).toContain('a');
  });

  it('compares a short unexplored route with a longer route through cleared spaces', () => {
    const b = board([['home', 'a'], ['a', 'target'], ['home', 'b'], ['b', 'c'], ['c', 'target']]), p = progress(['home', 'b', 'c']);
    const routes = destinationJourney(b, p, 'target').routes;
    expect(routes).toEqual([
      { id: 'direct', path: ['home', 'a', 'target'], segments: 2, investigations: ['a', 'target'], turns: 2, nextId: 'a', nextAction: 'investigate' },
      { id: 'discovery', path: ['home', 'b', 'c', 'target'], segments: 3, investigations: ['target'], turns: 1, nextId: 'target', nextAction: 'investigate' }
    ]);
    expect(routes.every(route => spatialState(b, p).moves.some(move => move.id === route.nextId))).toBe(true);
  });

  it('uses fewer investigations to break a shortest-path tie and suppresses redundant alternatives', () => {
    const b = board([['home', 'a'], ['a', 'target'], ['home', 'b'], ['b', 'target']]);
    const result = destinationJourney(b, progress(['home', 'b']), 'target');
    expect(result.routes).toHaveLength(1);
    expect(result.routes[0]).toMatchObject({ path: ['home', 'b', 'target'], investigations: ['target'], turns: 1 });
  });

  it('splits a cleared route at the three-segment travel limit', () => {
    const b = board([['home', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'target']], { travelLimit: 3 });
    const p = progress(['home', 'a', 'b', 'c', 'd']);
    expect(destinationJourney(b, p, 'target').routes[0]).toMatchObject({ segments: 5, investigations: ['target'], turns: 2, nextId: 'c', nextAction: 'travel' });
    expect(spatialState(b, p).moves.some(move => move.id === 'c')).toBe(true);
  });

  it('resets movement range after every investigation on the proposed route', () => {
    const b = board([['home', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'target']], { travelLimit: 3 });
    expect(destinationJourney(b, progress(['home', 'b', 'c', 'd', 'e']), 'target').routes[0]).toMatchObject({ investigations: ['a', 'target'], turns: 3, nextId: 'a', nextAction: 'investigate' });
  });

  it('uses built project shortcuts, without assuming an unbuilt shortcut exists', () => {
    const b = board([['home', 'a'], ['a', 'b'], ['b', 'target']], { projects: [{ id: 'bridge', effect: { kind: 'path', targetId: 'target' } }] });
    expect(destinationJourney(b, progress(), 'target').routes[0]).toMatchObject({ segments: 3, turns: 3 });
    expect(destinationJourney(b, progress(['home'], { built: ['bridge'] }), 'target').routes[0]).toMatchObject({ path: ['home', 'target'], segments: 1, turns: 1, nextId: 'target' });
  });

  it('breaks equal routes canonically regardless of edge direction, location order, or input order', () => {
    const edges = [['home', 'b'], ['b', 'target'], ['home', 'a'], ['a', 'target']], b = board(edges), p = progress();
    const result = destinationJourney(b, p, 'target');
    expect(result.routes[0].path).toEqual(['home', 'a', 'target']);
    expect(destinationJourney({ ...b, edges: edges.slice().reverse().map(edge => edge.slice().reverse()), locations: b.locations.slice().reverse() }, p, 'target')).toEqual(result);
  });

  it('counts the current unresolved destination as one investigation, without forcing a departure', () => {
    const b = board([['home', 'target']]), p = progress(['home'], { position: 'target' });
    expect(destinationJourney(b, p, 'target')).toEqual({ routes: [{ id: 'direct', path: ['target'], segments: 0, investigations: ['target'], turns: 1, nextId: 'target', nextAction: 'investigate' }] });
  });

  it('does not force investigation of an unresolved starting space when leaving it', () => {
    const b = board([['home', 'a'], ['a', 'target']]);
    expect(destinationJourney(b, progress(['home'], { position: 'a' }), 'target').routes[0]).toMatchObject({ investigations: ['target'], turns: 1, nextId: 'target' });
  });

  it('stops short of a cleared home at the travel cap when returning would end the expedition', () => {
    const b = board([['start', 'a'], ['a', 'b'], ['b', 'home'], ['home', 'c'], ['c', 'target']], { travelLimit: 3 });
    const p = progress(['start', 'a', 'b', 'home', 'c'], { position: 'start', objectiveReady: true });
    expect(destinationJourney(b, p, 'target').routes[0]).toMatchObject({ path: ['start', 'a', 'b', 'home', 'c', 'target'], turns: 2, nextId: 'b', nextAction: 'travel' });
    expect(spatialState(b, p).moves.some(move => move.id === 'b')).toBe(true);
    expect(destinationJourney(b, { ...p, objectiveReady: false }, 'target').routes[0].nextId).toBe('home');
  });

  it('avoids an unresolved intermediate home after the mission is ready, while allowing home as the destination', () => {
    const b = board([['start', 'home'], ['home', 'target'], ['start', 'a'], ['a', 'b'], ['b', 'target']]);
    const p = progress(['start'], { position: 'start', objectiveReady: true });
    expect(destinationJourney(b, p, 'target').routes[0].path).toEqual(['start', 'a', 'b', 'target']);
    expect(destinationJourney(b, p, 'home').routes[0]).toMatchObject({ path: ['start', 'home'], turns: 1, nextId: 'home', nextAction: 'investigate' });
    expect(destinationJourney(board([['start', 'home'], ['home', 'target']]), p, 'target')).toBeNull();
  });

  it('matches engine behavior: travel through home keeps playing, while a later stop at home completes the mission', () => {
    const b = { ...makeBoard(), playStyle: 'tabletop', travelLimit: 3 };
    const move = (before, id) => {
      let run = engine.stepOf(before).phase === 'review' ? engine.merge(before, engine.advance(b, before)) : before;
      run = engine.merge(run, engine.begin(b, run, id));
      if (engine.stepOf(run).phase === 'answer') {
        const node = b.locations.find(item => item.id === id);
        const action = { attemptId: 'journey', turn: run.turn, requestId: engine.requestId(run), kind: 'answer', targetId: id, value: engine.solution(node) };
        run = engine.merge(run, engine.processAction(b, run, action, 'solo', { attemptId: 'journey', active: true }));
        run = engine.merge(run, engine.resolve(b, run, { solo: {} }));
      }
      return run;
    };
    const ready = ['heater', 'cloud', 'heater', 'bridge', 'sequence', 'heater', 'research', 'sequence'].reduce(move, engine.emptyRun());
    const p = engine.derive(b, ready);
    expect(p).toMatchObject({ objectiveReady: true, complete: false, position: 'sequence' });
    // Rain is connected directly from sequence in the fixture; the river route
    // specifically crosses the built bridge to home before reaching its target.
    expect(destinationJourney(b, p, 'river').routes[0]).toMatchObject({ path: ['sequence', 'heater', 'river'], nextId: 'river', turns: 1 });
    const throughHome = move(ready, 'river');
    expect(engine.derive(b, throughHome)).toMatchObject({ position: 'river', complete: false });
    expect(engine.derive(b, move(throughHome, 'heater')).complete).toBe(true);
  });

  it('leaves input state unchanged and returns fresh path arrays', () => {
    const b = board([['home', 'a'], ['a', 'target']]), p = progress(), before = JSON.stringify({ b, p });
    const result = destinationJourney(b, p, 'target');
    result.routes[0].path.push('forged'); result.routes[0].investigations.length = 0;
    expect(JSON.stringify({ b, p })).toBe(before);
    expect(destinationJourney(b, p, 'target').routes[0]).toMatchObject({ path: ['home', 'a', 'target'], investigations: ['a', 'target'] });
  });

  it('returns no advice for completed, investigated, disconnected, classic, or malformed destinations', () => {
    const b = board([['home', 'a'], ['target', 'other']]), p = progress();
    for (const [candidate, state, target] of [
      [b, p, 'target'], [b, p, 'missing'], [b, progress(['home', 'a']), 'a'], [b, progress(['home'], { complete: true }), 'a'],
      [{ ...b, playStyle: undefined }, p, 'a'], [null, p, 'a'], [b, null, 'a'], [b, { ...p, position: 'missing' }, 'a'],
      [{ ...b, edges: [null] }, p, 'a'], [{ ...b, locations: [null] }, p, 'a'], [{ ...b, projects: [null] }, { ...p, built: ['x'] }, 'a']
    ]) expect(destinationJourney(candidate, state, target)).toBeNull();
  });
});
