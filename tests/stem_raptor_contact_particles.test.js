import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const start=source.indexOf('  function writeRaptorCatchParticleStyle(');
const end=source.indexOf('\n  function raptorCarryOpacity(',start);
const write=Function(source.slice(start,end)+';return writeRaptorCatchParticleStyle;')();
const sample=(age,index=0,kind=1)=>{const values=new Float32Array(4);write(values,0,age,index,kind);return Array.from(values);};

describe('pooled catch particle presentation',()=>{
  it('keeps every particle invisible at birth and fully faded before the pool expires',()=>{
    for(const kind of [0,1,2])for(let i=0;i<28;i++){
      expect(sample(0,i,kind)[0]).toBe(0);
      expect(sample(1.2,i,kind)[0]).toBe(0);
      expect(sample(2,i,kind)[0]).toBe(0);
      expect(sample(.05,i,kind)[0]).toBeGreaterThan(.9);
    }
  });
  it('stays finite and bounded throughout every catch style',()=>{
    const samples=[];
    for(const kind of [0,1,2])for(let i=0;i<28;i++)for(let t=0;t<=120;t++){
      samples.push(sample(t/100,i,kind));
    }
    expect(samples.every(values=>values.every(Number.isFinite))).toBe(true);
    expect(samples.every(([opacity])=>opacity>=0&&opacity<=1)).toBe(true);
    expect(samples.every(([,size])=>size>0&&size<1.1)).toBe(true);
    expect(samples.every(([,,,width])=>width>.25&&width<=1)).toBe(true);
  });
  it('eases into visibility then fades monotonically with no jump at expiry',()=>{
    for(const kind of [0,1,2])for(const index of [0,4,10]){
      const rise=[0,.01,.02,.03,.04,.045].map(t=>sample(t,index,kind)[0]);
      for(let i=1;i<rise.length;i++)expect(rise[i]).toBeGreaterThanOrEqual(rise[i-1]);
      const fall=Array.from({length:121},(_,i)=>sample(.05+i*.01,index,kind)[0]);
      for(let i=1;i<fall.length;i++){
        expect(fall[i]).toBeLessThanOrEqual(fall[i-1]);
        expect(fall[i-1]-fall[i]).toBeLessThan(.04);
      }
      expect(sample(.0001,index,kind)[0]).toBeLessThan(.0001);
      expect(fall.at(-1)).toBe(0);
    }
  });
  it('gives feathers a longer, slender tumble and water a smaller droplet',()=>{
    const feather=sample(.2,0,1),water=sample(.2,0,2),dust=sample(.2,0,0);
    expect(feather[3]).toBeLessThan(water[3]);expect(water[3]).toBeLessThan(dust[3]);
    expect(water[1]).toBeLessThan(feather[1]);
    expect(sample(.7,0,1)[0]).toBeGreaterThan(0);expect(sample(.7,0,2)[0]).toBe(0);
    expect(sample(.3,0,1)[2]).toBeGreaterThan(feather[2]);
    expect(sample(.3,1,1)[2]).toBeLessThan(sample(.2,1,1)[2]);
  });
  it('varies expiry within a burst and writes only the assigned buffer slot',()=>{
    const opacities=Array.from({length:28},(_,i)=>sample(.8,i,1)[0]);
    expect(new Set(opacities).size).toBeGreaterThan(5);
    const buffer=new Float32Array(12).fill(99);
    expect(write(buffer,4,.2,3,1)).toBeUndefined();
    expect(Array.from(buffer.slice(0,4))).toEqual([99,99,99,99]);
    expect(Array.from(buffer.slice(8))).toEqual([99,99,99,99]);
    expect(Array.from(buffer.slice(4,8))).toEqual(sample(.2,3,1));
  });
});
