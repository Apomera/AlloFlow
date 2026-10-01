import {describe,it,expect} from 'vitest';
import {internals} from './helpers/dino_lab_harness.js';
const {dinoSkinTextureData}=internals();
const palette=[122,101,78];
function channel(data){const values=[];for(let i=0;i<data.length;i+=4)values.push(data[i]);return values;}
function stats(values){const mean=values.reduce((s,x)=>s+x,0)/values.length;return {mean,variance:values.reduce((s,x)=>s+(x-mean)**2,0)/values.length};}
describe('Dino Lab coherent microtexture',()=>{
 for(const scaled of [false,true]){
  it('tiles all channels seamlessly for '+(scaled?'scales':'grain'),()=>{
   const width=256,height=128,t=dinoSkinTextureData(width,height,719,palette,scaled);
   for(const name of ['color','bump','roughness']){
    const data=t[name];expect(data.length).toBe(width*height*4);
    for(let y=0;y<height;y++)for(let c=0;c<4;c++)expect(data[(y*width)*4+c]).toBe(data[(y*width+width-1)*4+c]);
    for(let x=0;x<width;x++)for(let c=0;c<4;c++)expect(data[x*4+c]).toBe(data[((height-1)*width+x)*4+c]);
    for(let i=3;i<data.length;i+=4)expect(data[i]).toBe(255);
   }
  });
  it('keeps relief and roughness aligned and bounded for '+(scaled?'scales':'grain'),()=>{
   const t=dinoSkinTextureData(256,128,84,palette,scaled),b=channel(t.bump),r=channel(t.roughness),bs=stats(b),rs=stats(r);
   expect(Math.min(...b)).toBeGreaterThanOrEqual(104);expect(Math.max(...b)).toBeLessThanOrEqual(161);
   expect(Math.min(...r)).toBeGreaterThanOrEqual(209);expect(Math.max(...r)).toBeLessThanOrEqual(231);
   const covariance=b.reduce((s,x,i)=>s+(x-bs.mean)*(r[i]-rs.mean),0)/b.length;
   expect(covariance/Math.sqrt(bs.variance*rs.variance)).toBeLessThan(scaled?-.97:-.75);
  });
 }
 it('regenerates the same specimen exactly and varies a different seed',()=>{
  const a=dinoSkinTextureData(64,32,42,palette,true),b=dinoSkinTextureData(64,32,42,palette,true),c=dinoSkinTextureData(64,32,43,palette,true);
  for(const name of ['color','bump','roughness']){expect(a[name]).toEqual(b[name]);expect(a[name]).not.toEqual(c[name]);}
 });
 it('keeps feathered surface relief much gentler than scale relief',()=>{
  const scales=dinoSkinTextureData(256,128,111,palette,true),grain=dinoSkinTextureData(256,128,111,palette,false);
  expect(stats(channel(scales.bump)).variance).toBeGreaterThan(stats(channel(grain.bump)).variance*20);
 });
 it('retains the base pigment hue with only restrained luminance changes',()=>{
  const t=dinoSkinTextureData(256,128,91,palette,true),means=[0,0,0];
  for(let i=0;i<t.color.length;i+=4)for(let c=0;c<3;c++){
   expect(Math.abs(t.color[i+c]/palette[c]-1)).toBeLessThan(.045);means[c]+=t.color[i+c]/(t.color.length/4);
  }
  for(let c=0;c<3;c++)expect(Math.abs(means[c]-palette[c])).toBeLessThan(1);
  expect(means[0]/means[2]).toBeCloseTo(palette[0]/palette[2],2);
 });
 it('keeps height and roughness independent of pigment choice',()=>{
  const a=dinoSkinTextureData(64,32,51,[12,16,24],false),b=dinoSkinTextureData(64,32,51,[216,210,192],false);
  expect(a.bump).toEqual(b.bump);expect(a.roughness).toEqual(b.roughness);expect(a.color).not.toEqual(b.color);
 });
});
