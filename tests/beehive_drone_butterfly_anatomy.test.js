import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
describe('Butterfly anatomy learning overlay',()=>{
  it('maps features to separate wing pairs and antenna tips, with fresh local anchors',()=>{
    const fore=BH.bhDroneButterflyAnatomy('fore'),hind=BH.bhDroneButterflyAnatomy('hind'),antennae=BH.bhDroneButterflyAnatomy('antennae');
    expect(fore.mesh).toBe('butterfly-forewing');expect(hind.mesh).toBe('butterfly-hindwing');expect(antennae.mesh).toBe('butterfly-antenna-tip');
    expect(fore.point[2]).toBeLessThan(0);expect(hind.point[2]).toBeGreaterThan(0);expect(antennae.point).toEqual([0,0,0]);
    fore.point[0]=99;expect(BH.bhDroneButterflyAnatomy('fore').point[0]).not.toBe(99);
    for(const key of ['none','__proto__','constructor',null])expect(BH.bhDroneButterflyAnatomy(key)).toBeNull();
  });
  it.each([[300,580],[440,440],[900,620]])('keeps paired callouts within a %i by %i view and clear of the toolbar', (width,height)=>{
    const points=[{x:width*.58,y:height*.56},{x:width*.4,y:height*.5}],before=JSON.stringify(points),labels=BH.bhDroneButterflyCallouts(points,width,height);
    expect(labels).toHaveLength(2);expect(labels.map(l=>l.anchor)).toEqual([...points].sort((a,b)=>a.x-b.x));expect(JSON.stringify(points)).toBe(before);
    for(const l of labels){expect(l.box.x).toBeGreaterThanOrEqual(14);expect(l.box.x+l.box.width).toBeLessThanOrEqual(width-14);expect(l.box.y).toBeGreaterThan(120);expect(l.box.y+l.box.height).toBeLessThan(height-150);}
    expect(labels[0].box.x+labels[0].box.width).toBeLessThan(labels[1].box.x);
  });
  it('suppresses incomplete or off-screen pairs rather than pointing at missing features',()=>{
    for(const points of [[],[{x:100,y:250}],[{x:100,y:250},{x:NaN,y:250}],[{x:100,y:250},{x:-1,y:250}],[{x:100,y:250},{x:180,y:500}]])expect(BH.bhDroneButterflyCallouts(points,300,580)).toEqual([]);
    for(const size of [[100,580],[300,100],[NaN,580],[300,Infinity]])expect(BH.bhDroneButterflyCallouts([{x:100,y:250},{x:200,y:250}],...size)).toEqual([]);
  });
});
