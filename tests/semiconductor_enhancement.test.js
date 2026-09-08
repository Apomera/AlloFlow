import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let core;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_semiconductor.js','semiconductor');core=window.__SemiconductorCore;});
const si={bandGap:1.12,tempCoeff:-.000270,ni:1.5e10};
describe('Semiconductor enhancement model contracts',()=>{
  it('recovers the reference concentration and responds strongly to heat',()=>{
    expect(core.bandGap(si,300,'silicon')).toBe(1.12);
    expect(core.intrinsic(si,300,1.12)/si.ni).toBeCloseTo(1,10);
    const hotGap=core.bandGap(si,500,'silicon');
    expect(hotGap).toBeCloseTo(1.0613,3);
    expect(core.intrinsic(si,500,hotGap)).toBeGreaterThan(si.ni*10000);
    expect(core.intrinsic(si,100,core.bandGap(si,100,'silicon'))).toBeLessThan(1);
  });
  it('keeps extreme-temperature estimates finite and does not apply ni to metals',()=>{
    [50,800,NaN,Infinity,-20].forEach(T=>{
      const gap=core.bandGap(si,T,'silicon');
      expect(Number.isFinite(gap)).toBe(true);
      expect(Number.isFinite(core.intrinsic(si,T,gap))).toBe(true);
    });
    expect(core.intrinsic({bandGap:0,ni:8.5e22},300,0)).toBeNull();
  });
  it('treats every nonzero bias by its sign with continuous current around zero',()=>{
    expect(core.junction(.1).regime).toBe('Forward bias');
    expect(core.junction(-.1).regime).toBe('Reverse bias');
    expect(core.junction(0).currentA).toBe(0);
    expect(core.junction(.001).currentA).toBeGreaterThan(0);
    expect(core.junction(-.001).currentA).toBeLessThan(0);
    expect(core.junction(-3).currentA).toBeCloseTo(-1e-12,15);
  });
  it('uses the depletion square root and withholds values outside the approximation',()=>{
    const zero=core.junction(0),reverse=core.junction(-1),forward=core.junction(.5);
    expect(zero.widthUm).toBeCloseTo(.4255,3);
    expect(reverse.widthUm/zero.widthUm).toBeCloseTo(Math.sqrt(1.7/.7),8);
    expect(forward.widthUm).toBeLessThan(zero.widthUm);
    expect(core.junction(.7).valid).toBe(false);
    expect(core.junction(3).currentA).toBeNull();
  });
  it('builds four equal tetrahedral bonds around the highlighted silicon atom',()=>{
    const c=core.diamondCell(),a=c.atoms[c.focus];
    const neighbors=c.bonds.filter(b=>b.includes(c.focus)).map(b=>c.atoms[b[0]===c.focus?b[1]:b[0]]);
    expect(neighbors).toHaveLength(4);
    const vectors=neighbors.map(n=>n.map((x,i)=>x-a[i]));
    vectors.forEach(v=>expect(v.reduce((s,x)=>s+x*x,0)).toBeCloseTo(3/16,10));
    for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){
      const cosine=vectors[i].reduce((s,x,k)=>s+x*vectors[j][k],0)/(3/16);
      expect(Math.acos(cosine)*180/Math.PI).toBeCloseTo(109.4712,3);
    }
    expect(new Set(c.atoms.map(a=>a.join(','))).size).toBe(c.atoms.length);
  });
});
describe('Accessible learning evidence',()=>{
  it('makes 3D geometry and donor ionization available without animation',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'doping',crystalView:'3d',dopant:'phosphorus',motionPaused:true}});
    expect(html).toContain('four tetrahedral nearest neighbors');
    expect(html).toContain('Isolate four neighbors');
    expect(html).toContain('fixed positive donor ion');
    expect(html).toContain('not a concentration');
    expect(html).not.toContain('id="semi-doping-canvas"');
  });
  it('normalizes unknown persisted dopants to intrinsic material',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'doping',dopant:'unknown',crystalView:'3d'}});
    expect(html).not.toContain('undefined');
    expect(html).toContain('Each silicon atom shares four covalent bonds');
  });
  it('distinguishes below-gap and above-gap photons',()=>{
    const render=photonNm=>renderTool('semiconductor',{semiconductor:{subtool:'bandgap',material:'silicon',showPhoton:true,photonNm}});
    expect(render(2000)).toContain('Below the band gap');
    expect(render(550)).toContain('Enough energy for band-to-band excitation');
  });
  it('correctly labels diamond as a wide-gap semiconductor',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'bandgap',material:'diamond'}});
    expect(html).toContain('Semiconductor:');
    expect(html).not.toContain('Insulator:');
  });
  it('compares current physical values with a reproducible guided baseline',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'pnjunction',pnBias:-1,guidedSetupSubtool:'pnjunction'}});
    expect(html).toContain('Baseline');
    expect(html).toContain('0.426 µm');
    expect(html).toContain('0.663 µm');
    expect(html).toContain('Before changing a setting');
  });
});

describe('Doping Discovery equilibrium statistics',()=>{
  it('satisfies charge neutrality and the mass-action law over useful densities',()=>{
    for(const ni of [1.8e6,1.5e10,2.4e13,1e15])for(const donors of [0,1e10,1e15,1e17]){
      const {n,p}=core.carriers(ni,donors);
      expect(n*p/(ni*ni)).toBeCloseTo(1,12);
      expect((n-p-donors)/Math.max(n,donors,1)).toBeCloseTo(0,12);
      if(donors===0)expect(n).toBe(p);
    }
  });
  it('changes minority carriers with material and flags degeneracy',()=>{
    const render=patch=>renderTool('semiconductor',{semiconductor:{subtool:'dopeHunt',dopeHunt:{donorLog:15,tempK:300,...patch}}});
    expect(render({material:'Si'})).toContain('Holes p = 2.25e+5');
    expect(render({material:'GaAs'})).toContain('Holes p = 3.24e-3');
    expect(render({material:'GaAs',donorLog:17})).toContain('Degenerate regime: outside model');
    expect(render({intrinsic:true})).toContain('Donors ND = 0.00e+0');
  });
  it('supports guided input evidence in non-foundation workspaces too',()=>{
    const html=renderTool('semiconductor',{semiconductor:{subtool:'amplifier',guidedSetupSubtool:'amplifier',ampVin:.1}});
    expect(html).toContain('0.01 V');
    expect(html).toContain('0.1 V');
    expect(html).toContain('Before changing a setting');
  });
});
