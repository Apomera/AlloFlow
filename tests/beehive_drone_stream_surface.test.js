import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let BH;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_beehive.js','beehive');BH=window.__RR_TEST_EXPORTS__.beehive;});
describe('Decorative stream surface',()=>{
  it.each(['water','bank'])('keeps the %s ribbon continuous, finite and facing upward',kind=>{
    const mesh=BH.bhDroneStreamSurface(kind),p=mesh.positions;
    expect(p.length%9).toBe(0);expect(mesh.uvs).toHaveLength(p.length/3*2);expect(mesh.tones).toHaveLength(p.length/3);
    const rows=new Set();for(let i=0;i<p.length;i+=3){const [x,y,z]=p.slice(i,i+3);rows.add(z);expect([x,y,z].every(Number.isFinite)).toBe(true);expect(y).toBe(kind==='water'?-.53:-.57);const offset=Math.abs(x-(-270+Math.sin(z*.004)*55));expect(offset).toBeLessThanOrEqual(kind==='water'?14.000001:22.100001);}
    expect(rows.size).toBe(73);expect(Math.min(...rows)).toBe(-2220);expect(Math.max(...rows)).toBe(300);
    for(let i=0;i<p.length;i+=9){const ux=p[i+3]-p[i],uz=p[i+5]-p[i+2],vx=p[i+6]-p[i],vz=p[i+8]-p[i+2];expect(uz*vx-ux*vz).toBeGreaterThan(0);}
    expect(mesh.uvs.every(Number.isFinite)).toBe(true);
  });
  it('retains the existing channel width and its alignment with reeds and shoreline stones',()=>{
    const p=BH.bhDroneStreamSurface('water').positions,edges=new Map();
    for(let i=0;i<p.length;i+=3){const z=p[i+2],xs=edges.get(z)||[];xs.push(p[i]);edges.set(z,xs);}
    for(const [z,xs] of edges){expect(Math.max(...xs)-Math.min(...xs)).toBeCloseTo(28,9);expect((Math.max(...xs)+Math.min(...xs))/2).toBeCloseTo(-270+Math.sin(z*.004)*55,9);}
    expect(new Set(BH.bhDroneStreamSurface('water').tones).size).toBeGreaterThan(3);
  });
  it.each(['water','bank'])('produces a reusable, varied %s texture with opaque finite pixels',kind=>{
    const a=BH.bhDroneStreamTexture(kind),b=BH.bhDroneStreamTexture(kind);expect(a.size).toBe(128);expect(a.pixels).toHaveLength(128*128*4);expect(a).toEqual(b);
    const tones=new Set();for(let i=0;i<a.pixels.length;i+=4){tones.add(a.pixels[i]);expect(a.pixels[i+3]).toBe(255);}expect(tones.size).toBeGreaterThan(20);
    a.pixels[0]=0;expect(b.pixels[0]).toBeGreaterThan(0);
  });
  it('uses only model time for motion and leaves paused flight data untouched',()=>{
    const s={paused:true,simulationClock:10,energy:74,score:20,randomState:912,telemetry:[{t:10,x:1}]},before=JSON.stringify(s);
    expect(BH.bhDroneStreamOffset(s,false)).toBeCloseTo(.18);expect(BH.bhDroneStreamOffset(s,false)).toBeCloseTo(.18);expect(BH.bhDroneStreamOffset(s,true)).toBe(0);expect(JSON.stringify(s)).toBe(before);
    expect(BH.bhDroneStreamOffset({...s,simulationClock:11},false)).toBeCloseTo(.198);
    for(const clock of [-1,NaN,Infinity,undefined])expect(BH.bhDroneStreamOffset({simulationClock:clock},false)).toBe(0);
    expect(BH.bhDroneStreamOffset({simulationClock:1000},false)).toBeGreaterThanOrEqual(0);expect(BH.bhDroneStreamOffset({simulationClock:1000},false)).toBeLessThan(1);
  });
  it('builds scenery independently of course randomness',()=>{
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('External random use');});
    try{expect(BH.bhDroneStreamSurface('water')).toEqual(BH.bhDroneStreamSurface('water'));expect(BH.bhDroneStreamTexture('water').size).toBe(128);}finally{random.mockRestore();}
    expect(BH.bhDroneStreamSurface('unknown')).toBeNull();expect(BH.bhDroneStreamTexture('unknown')).toBeNull();
  });
});
