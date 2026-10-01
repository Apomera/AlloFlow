import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const start=source.indexOf('        engine._dimLines = [];\n        engine._dimBuildTimers');
const end=source.indexOf('        // ── Structure selection glow',start);
if(start<0||end<start)throw Error('Measurement annotation implementation not found');
let THREE,fixtures;
beforeAll(()=>{
  const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;
});
beforeEach(()=>{
  fixtures=[];window.THREE=THREE;vi.useFakeTimers();
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(){
    return {font:'',clearRect(){},beginPath(){},roundRect(){},rect(){},fill(){},stroke(){},fillText(){},measureText(text){return {width:String(text).length*19};}};
  });
});
afterEach(()=>{fixtures.forEach(f=>f.clearDimLines());vi.useRealTimers();vi.restoreAllMocks();});
function fixture(){
  const engine={scene:new THREE.Scene()};
  const api=new Function('engine','formatVolume',source.slice(start,end)+'return {makeDimLabel,showDimLines,clearDimLines,dimensionVolumeCaption};')(engine,value=>String(value));
  const f={engine,...api};fixtures.push(f);return f;
}
const solid={L:2,W:1,H:1,boundingVolume:2,occupiedVolume:2,count:2,isSolidPrism:true,isComplete:true};

describe('Geometry World accurate, owned measurement annotations',()=>{
  it.each([
    ['solid cuboid',solid,'2 × 1 × 1 = 2'],
    ['fractional composite',{L:4,W:5,H:6,boundingVolume:120,occupiedVolume:40.75,isSolidPrism:false,hasFractions:true},'Occupied V = 40.75 cu'],
    ['hollow full-cube build',{L:2,W:2,H:2,boundingVolume:8,totalVolume:6,count:6,isSolidPrism:false},'Occupied V = 6 cu'],
    ['truncated measurement',{...solid,isComplete:false},'At least 2 cu']
  ])('describes %s without equating occupied volume to empty space',(_name,m,expected)=>{
    expect(fixture().dimensionVolumeCaption(m)).toBe(expected);
  });
  it('sizes long captions by their text while preserving aspect and high-contrast sprite rendering',()=>{
    const f=fixture(),short=f.makeDimLabel('L=2','#ef4444'),long=f.makeDimLabel('Occupied V = 1234.75 cu','#fbbf24');
    expect(long.material.map.image.width).toBeGreaterThan(short.material.map.image.width);
    for(const sprite of [short,long]){
      const canvas=sprite.material.map.image;
      expect(sprite.scale.x/sprite.scale.y).toBeCloseTo(canvas.width/canvas.height,6);
      expect(sprite.material.depthWrite).toBe(false);expect(sprite.material.toneMapped).toBe(false);
      expect(sprite.material.map.encoding).toBe(THREE.sRGBEncoding);
      expect(sprite.userData.gwDimensionLabel).toBeTruthy();
      sprite.material.map.dispose();sprite.material.dispose();
    }
  });
  it('cancels older staged labels when another structure is measured',()=>{
    const f=fixture();f.showDimLines(solid,0,0,0);
    f.showDimLines({...solid,L:3,boundingVolume:3,occupiedVolume:3},10,0,0);
    vi.advanceTimersByTime(2500);
    const labels=f.engine._dimLines.filter(x=>x.isSprite);
    expect(labels.map(x=>x.userData.gwDimensionLabel)).toEqual(['L=3','W=1','H=1','3 × 1 × 1 = 3']);
    expect(f.engine._dimLines).toHaveLength(8);
    expect(f.engine._dimLines.every(x=>x.position.x>=9.5)).toBe(true);
  });
  it('disposes owned label textures and cancels pending work when annotations are cleared',()=>{
    const f=fixture();f.showDimLines(solid,0,0,0);
    const sprite=f.engine._dimLines.find(x=>x.isSprite),disposed=vi.fn();
    sprite.material.map.addEventListener('dispose',disposed);
    f.engine.clearDimensionAnnotations();vi.advanceTimersByTime(40000);
    expect(disposed).toHaveBeenCalledTimes(1);expect(f.engine.scene.children).toHaveLength(0);
    expect(f.engine._dimLines).toHaveLength(0);expect(f.engine._dimBuildTimers).toHaveLength(0);
  });
  it('keeps delayed labels out of Showcase and records their correct return visibility',()=>{
    const f=fixture();f.showDimLines(solid,0,0,0);
    f.engine._showcase={hidden:[]};vi.advanceTimersByTime(2500);
    expect(f.engine._showcase.hidden).toHaveLength(6);
    for(const [object,visible] of f.engine._showcase.hidden){expect(visible).toBe(true);expect(object.visible).toBe(false);}
  });
  it('never creates delayed labels after the engine has been destroyed',()=>{
    const f=fixture();f.showDimLines(solid,0,0,0);f.engine._destroyed=true;vi.advanceTimersByTime(2500);
    expect(f.engine._dimLines).toHaveLength(2);
  });
});
