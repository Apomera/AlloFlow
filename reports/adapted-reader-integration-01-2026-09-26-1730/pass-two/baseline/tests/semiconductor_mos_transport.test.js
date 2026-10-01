import {beforeAll,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let c;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');c=window.__SemiconductorCore;});
const read=(type,g,d)=>c.mosTransport(c.mosfet(type,g,d));
describe('MOSFET cutaway teaching readout',()=>{
  for(const [type,p] of [['mosfet-n',1],['mosfet-p',-1]]){
    it(type+' distinguishes below threshold from exact threshold',()=>{
      const below=read(type,p,5*p),at=read(type,1.5*p,5*p);
      expect(below.gateMargin).toBe(-.5);expect(below.channelText).toContain('Below threshold');
      expect(at.gateMargin).toBe(0);expect(at.channelText).toContain('At threshold');
      for(const r of [below,at]){expect(r.flowing).toBe(false);expect(r.boundary).toBeNull();expect(r.currentDirection).toBeNull();expect(r.carrierDirection).toBeNull();}
    });
    it(type+' does not confuse inversion at zero drain bias with transport',()=>{
      const r=read(type,3*p,0);expect(r.gateMargin).toBe(1.5);expect(r.boundary).toBe(1.5);
      expect(r.flowing).toBe(false);expect(r.channelText).toContain('zero drain bias gives zero net drain current');
      expect(r.directionNote).toContain('thermal motion');expect(r.carrierDirection).toBeNull();
    });
    it(type+' gives charge-correct directions in both conducting regions',()=>{
      for(const d of [.5,1.5,5]){
        const r=read(type,3*p,d*p);
        expect(r.flowing).toBe(true);expect(r.carrierDirection).toBe('Source to drain');
        expect(r.currentDirection).toBe(p===1?'Drain to source':'Source to drain');
        expect(r.carrier).toBe(p===1?'Electrons':'Holes');
        expect(r.directionNote).toContain(p===1?'opposite':'same direction');
      }
    });
    it(type+' reserves pinch-off explanations for saturation',()=>{
      const linear=read(type,3*p,.5*p),sat=read(type,3*p,1.5*p);
      expect(linear.channelText).toContain('increases current');
      expect(linear.channelText).not.toContain('pinch-off');
      expect(sat.channelText).toContain('pinch-off');expect(sat.channelText).toContain('current continues');
      expect(sat.drive).toBe(sat.boundary);
    });
    it(type+' does not present invalid reverse bias as a zero-current result',()=>{
      const r=read(type,3*p,-5*p);expect(r.flowing).toBe(false);expect(r.boundary).toBeNull();
      expect(r.channelText).toContain('outside this model');expect(r.channelText).not.toContain('zero drain bias');
      expect(r.carrierDirection).toBeNull();expect(r.currentDirection).toBeNull();
    });
    it(type+' guides a complete electrical sequence with signed voltages',()=>{
      let g=0,d=5*p;const regions=[];
      for(let i=0;i<5;i++){
        const m=c.mosfet(type,g,d),r=c.mosTransport(m);regions.push(m.region);
        g=r.next.gateVoltage;d=r.next.drainVoltage;
      }
      expect(regions).toEqual(['Cutoff','Zero drain bias','Linear (triode)','Saturation','Cutoff']);
    });
    it(type+' preserves the gate during drain experiments and the drain when turning off',()=>{
      for(const g of [1.6,2,4.9]){
        const zero=read(type,g*p,0),linear=c.mosfet(type,zero.next.gateVoltage,zero.next.drainVoltage);
        expect(linear.gate).toBe(g*p);expect(linear.region).toBe('Linear (triode)');
        const toSat=c.mosTransport(linear).next,sat=c.mosfet(type,toSat.gateVoltage,toSat.drainVoltage);
        expect(sat.gate).toBe(g*p);expect(sat.region).toBe('Saturation');
        const off=c.mosTransport(sat).next;expect(off.drainVoltage).toBe(sat.drain);expect(off.gateVoltage).toBe(0);
      }
    });
  }
  it('does not treat gate voltage of the wrong sign as inversion',()=>{
    expect(read('mosfet-p',3,-5).gateMargin).toBe(-4.5);
    expect(read('mosfet-n',-3,5).flowing).toBe(false);
  });
  it('does not mutate its electrical model',()=>{
    const m=Object.freeze(c.mosfet('mosfet-p',-3,-.5)),before=JSON.stringify(m);
    c.mosTransport(m);expect(JSON.stringify(m)).toBe(before);
  });
});
describe('MOSFET teaching surface',()=>{
  it('shows signed PMOS readings, directions, inspection controls and an optional equation explanation',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'transistor',deviceView:'3d',transistorType:'mosfet-p',gateVoltage:-3,drainVoltage:-.5}});
    for(const text of ['From gate control to current','Holes','Conventional current','-0.313 mA','Reveal channel (hide gate and oxide)','Why this operating region?','Reach the saturation boundary','VSG','VSD','Source · 0 V','Drain · -0.50 V'])expect(html).toContain(text);
  });
  it('withholds direction arrows at zero drain bias',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'transistor',deviceView:'3d',gateVoltage:3,drainVoltage:0}});
    expect(html).toContain('No net flow');expect(html).toContain('Channel formed');expect(html).toContain('Apply a small drain bias');
    const root=document.createElement('div');root.innerHTML=html;expect(root.querySelectorAll('.semi-mos-lane b')).toHaveLength(0);
  });
});
