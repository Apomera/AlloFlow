import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
const flight=(patch={})=>({x:0,y:30,z:0,yaw:0,energy:100,timer:119.2,difficulty:'easy',...patch});
describe('Drone flight director',()=>{
  it('uses horizontal range and separately explains the altitude difference',()=>{
    const r=BH.bhDroneFlightDirector(flight());
    expect(r).toMatchObject({target:'DCA',range:600,direction:'Target ahead',degrees:0,energy:80,seconds:120});
    expect(r.vertical).toContain('Target above');expect(r.text).toContain('model m');
    expect(BH.bhDroneFlightDirector(flight({y:200})).range).toBe(600);
    expect(BH.bhDroneFlightDirector(flight({y:200})).vertical).toContain('Target below');
  });
  it.each([[Math.PI/2,-90,'Turn left'],[-Math.PI/2,90,'Turn right'],[Math.PI*.99,-178,'Turn left'],[-Math.PI*.99,178,'Turn right']])('gives the shortest correction at heading %s',(yaw,angle,text)=>{
    const r=BH.bhDroneFlightDirector(flight({yaw}));expect(r.degrees).toBe(angle);expect(r.direction).toContain(text);
  });
  it('does not give a turn instruction when already at the horizontal target',()=>{
    const r=BH.bhDroneFlightDirector(flight({x:0,z:-600,y:0,yaw:2}));
    expect(r.direction).toBe('At target horizontally');expect(r.vertical).toContain('above');
  });
  it('changes to an available queen cue only after reaching the DCA',()=>{
    const s=flight({nearQueens:[{x:80,y:120,z:-600,caught:false}]});const before=JSON.stringify(s);
    expect(BH.bhDroneFlightDirector(s).target).toBe('DCA');
    expect(BH.bhDroneFlightDirector({...s,reachedDca:true,z:-600})).toMatchObject({target:'Queen cue',degrees:90,range:80});
    expect(JSON.stringify(s)).toBe(before);
  });
  it('bounds the display reserve and handles unavailable numeric values',()=>{
    expect(BH.bhDroneFlightDirector(flight({energy:41,difficulty:'hard'})).energy).toBe(50);
    expect(BH.bhDroneFlightDirector(flight({energy:500})).energy).toBe(100);
    expect(BH.bhDroneFlightDirector(flight({energy:-10,timer:NaN,yaw:NaN}))).toMatchObject({energy:0,seconds:0,degrees:0});
  });
});
