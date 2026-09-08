import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let webEdges;
beforeAll(() => { resetStemLab(); loadTool('stem_lab/stem_tool_universe.js', 'universe'); webEdges = window.__universePure.universeWebEdges; });
describe('Universe spatial web connections', () => {
  it('links nearby galaxies even when they are far apart in the input list', () => {
    const sites = [{x:0,y:0},{x:0.8,y:0.8},{x:0.02,y:0.01},{x:0.78,y:0.78}];
    expect(webEdges(sites,4,1)).toEqual([{a:0,b:2},{a:1,b:3}]);
  });
  it('returns each pair once, without self-links or inactive galaxies', () => {
    const sites = Array.from({length:16},(_,i)=>({x:(i%4)*0.1,y:Math.floor(i/4)*0.1}));
    const edges = webEdges(sites,7,1.8);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.length).toBeLessThanOrEqual(14);
    expect(new Set(edges.map(e=>e.a+':'+e.b)).size).toBe(edges.length);
    expect(edges.every(e=>e.a<e.b&&e.a>=0&&e.b<7)).toBe(true);
    expect(webEdges(sites,7,1.8)).toEqual(edges);
  });
  it('uses the viewport proportions when limiting long connections', () => {
    const sites = [{x:0,y:0},{x:0.3,y:0.4}];
    expect(webEdges(sites,2,1)).toEqual([]);
    expect(webEdges(sites,2,2)).toEqual([{a:0,b:1}]);
  });
  it('handles empty and single-galaxy epochs and bounds the active count', () => {
    const sites = [{x:0,y:0},{x:0.1,y:0.1}];
    expect(webEdges([],0,1)).toEqual([]);
    expect(webEdges(sites,1,1)).toEqual([]);
    expect(webEdges(sites,-1,1)).toEqual([]);
    expect(webEdges(sites,99,1)).toEqual([{a:0,b:1}]);
  });
});
