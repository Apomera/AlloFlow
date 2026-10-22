import {beforeAll,describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const original={foxes:'34aa7c804c5c74e5d5095bb1e0436c699c25104eae083812eab6235684340cf8',rabbits:'56f8beb876621153c0fbdf66dd4bdc0fcbe60a074ac36a89dd87d964bc924f14'};
const geometry=value=>({positions:value.positions,normals:value.normals,uv:value.uv,indices:value.indices,height:value.height,rings:value.rings,sides:value.sides,bevelBands:value.bevelBands,faceLayer:value.faceLayer,rim:value.rim,rimLayers:value.rimLayers});

describe('species-specific pinna pigmentation preserves the original sculpted ears',()=>{
  it('keeps every ear position normal UV index and anatomical dimension exact for both species',()=>{
    for(const id of ['foxes','rabbits'])expect(hash(geometry(api.mammalSurface(id,'ear')))).toBe(original[id]);
    for(const id of ['voles','owls','bad'])expect(api.mammalSurface(id,'ear')).toBeNull();
  });
  it('separates the inner face from the backing and crosses every existing bevel with the same continuous bounded weight',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear'),count=skin.positions.length/3;
      expect(skin.backingTints).toHaveLength(count);expect(skin.backingTints.every(value=>Number.isFinite(value)&&value>=0&&value<=1)).toBe(true);
      expect(skin.backingTints.slice(0,skin.faceLayer).every(value=>value===0)).toBe(true);
      expect(skin.backingTints.slice(skin.faceLayer,skin.faceLayer*2).every(value=>value===1)).toBe(true);
      for(let edge=0;edge<skin.rim.length;edge++){
        const values=skin.rimLayers.map(loop=>skin.backingTints[loop[edge]]);
        expect(values[0]).toBe(0);expect(values.at(-1)).toBe(1);
        for(let band=0;band<=skin.bevelBands;band++)expect(values[band]).toBeCloseTo((1-Math.cos(band/skin.bevelBands*Math.PI))/2,14);
        for(let band=1;band<values.length;band++)expect(values[band]-values[band-1]).toBeGreaterThan(0);
        expect(values[1]-values[0]).toBeLessThan(values[2]-values[1]);
        expect(values.at(-1)-values.at(-2)).toBeLessThan(values.at(-2)-values.at(-3));
      }
    }
  });
  it('preserves the recessed inner-cup and fur-rim masks while keeping backing colour away from the warm front cup',()=>{
    for(const id of ['foxes','rabbits']){
      const skin=api.mammalSurface(id,'ear'),center=12*21+10,edge=12*21,back=center+skin.faceLayer;
      expect(skin.tints[center]).toBe(1);expect(skin.furRimTints[center]).toBe(0);expect(skin.backingTints[center]).toBe(0);
      expect(skin.tints[back]).toBe(0);expect(skin.backingTints[back]).toBe(1);
      expect(skin.furRimTints[edge]).toBeCloseTo(.60,12);expect(skin.backingTints[edge]).toBe(0);
      expect(skin.positions[edge*3]-skin.positions[center*3]).toBeGreaterThan(.3);
      expect(skin.positions[center*3]-skin.positions[back*3]).toBeCloseTo(.105,12);
    }
  });
  it('returns detached deterministic pigmentation and leaves another species or later retrieval unchanged',()=>{
    const before=api.mammalSurface('foxes','ear'),rabbit=api.mammalSurface('rabbits','ear');
    expect(api.mammalSurface('foxes','ear')).toEqual(before);
    before.backingTints[before.faceLayer]=0;before.backingTints.push(9);
    const after=api.mammalSurface('foxes','ear');expect(after.backingTints[after.faceLayer]).toBe(1);expect(after.backingTints).toHaveLength(after.positions.length/3);
    expect(api.mammalSurface('rabbits','ear')).toEqual(rabbit);
  });
});
