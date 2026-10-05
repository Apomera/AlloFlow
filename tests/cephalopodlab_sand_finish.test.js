import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf("        var sandCv = document.createElement('canvas');"),end=source.indexOf('        var floor = new THREE.Mesh(',start);
assert.ok(start>=0&&end>start,'Expected the actual sand canvas/texture construction region');
const region=source.slice(start,end),channels=[['at',183],['at+1',176],['at+2',155]];
// Freeze only the original RGB centers. A candidate can use arbitrary numeric
// centers; its real pixels must still meet the luminance/readability oracle.
let originalRecipe=region;
for(const [at,value] of channels){
  const escaped=at.replace('+','\\+'),pattern=new RegExp('(sandPixels\\.data\\['+escaped+'\\]\\s*=\\s*)([0-9]+(?:\\.[0-9]+)?)(\\s*\\+\\s*tone)');
  assert.equal((originalRecipe.match(new RegExp(pattern.source,'g'))||[]).length,1,'Expected one narrow RGB-center assignment for '+at);
  originalRecipe=originalRecipe.replace(pattern,(_,prefix,base,suffix)=>prefix+value+suffix);
}
const teardown=source.match(/try \{ sandTex\.dispose\(\); \} catch \(e\) \{\}/g);
assert.equal(teardown?.length,1,'Expected the actual independently owned sand-texture cleanup statement');
const disposeTexture=new Function('sandTex',teardown[0]),allocated=new Set();
function release(fixture){if(allocated.delete(fixture))disposeTexture(fixture.texture);}
afterEach(()=>{for(const fixture of [...allocated])release(fixture);});
function generator(seed){let current=seed>>>0;return {draw(){current=(Math.imul(current,1664525)+1013904223)>>>0;return current/4294967296;},get seed(){return current;}};}
function construct(recipe=region){
  const world=generator(2741),worldDraws=[],calls={created:0,context:0,imageData:0,uploads:0,anisotropy:0};
  const math=Object.create(Math);math.random=()=>{const value=world.draw();worldDraws.push(value);return value;};
  let canvas,image;
  const context={
    createImageData(width,height){calls.imageData++;assert.equal(width,256);assert.equal(height,256);return {width,height,data:new Uint8ClampedArray(width*height*4)};},
    putImageData(value,x,y){calls.uploads++;assert.equal(x,0);assert.equal(y,0);image=value;}
  };
  const document={createElement(kind){calls.created++;assert.equal(kind,'canvas');canvas={width:0,height:0,attributes:{},setAttribute(name,value){this.attributes[name]=value;},getContext(kind){calls.context++;assert.equal(kind,'2d');return context;}};return canvas;}};
  const renderer={capabilities:{getMaxAnisotropy(){calls.anisotropy++;return 8;}}};
  const built=new Function('THREE','Math','document','renderer',recipe+';return {texture:sandTex,privateSeed:textureSeed};')(THREE,math,document,renderer);
  assert.ok(image&&built.texture.image===canvas,'The real CanvasTexture must use the uploaded canvas');
  const recorded=worldDraws.slice(),nextWorldDraw=math.random();
  const fixture={...built,canvas,pixels:image.data,image,calls,worldDraws:recorded,nextWorldDraw};allocated.add(fixture);return fixture;
}
const view=array=>Buffer.from(array.buffer,array.byteOffset,array.byteLength);
const linear=channel=>{const c=channel/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;};
function stats(pixels){
  const sum=[0,0,0];let luminance=0;
  for(let at=0;at<pixels.length;at+=4){for(let channel=0;channel<3;channel++)sum[channel]+=pixels[at+channel];luminance+=.2126*linear(pixels[at])+.7152*linear(pixels[at+1])+.0722*linear(pixels[at+2]);}
  const count=pixels.length/4;return {rgb:sum.map(value=>value/count),luminance:luminance/count};
}

describe('Cephalopod Hunter static mineral sand finish',()=>{
  it('retains the actual opaque grain field and world RNG stream while making a bounded warmer, darker mineral albedo',()=>{
    const current=construct(),original=construct(originalRecipe),repeat=construct(),expectedWorld=generator(2741);
    assert.equal(current.worldDraws.length,8400);assert.equal(original.worldDraws.length,8400);assert.equal(repeat.worldDraws.length,8400);
    for(let draw=0;draw<8400;draw++){const expected=expectedWorld.draw();assert.equal(current.worldDraws[draw],expected);assert.equal(original.worldDraws[draw],expected);assert.equal(repeat.worldDraws[draw],expected);}
    const next=expectedWorld.draw();assert.equal(current.nextWorldDraw,next);assert.equal(original.nextWorldDraw,next);assert.equal(repeat.nextWorldDraw,next);
    assert.equal(current.pixels.length,256*256*4);assert.ok(view(current.pixels).equals(view(repeat.pixels)),'Repeated actual construction must produce identical grain pixels');
    const grain=generator(928371),quantized=new Uint8ClampedArray(3),difference=[0,1,2].map(channel=>current.pixels[channel]-original.pixels[channel]);
    for(let at=0;at<current.pixels.length;at+=4){
      const tone=(grain.draw()-.5)*17;quantized[0]=183+tone;quantized[1]=176+tone;quantized[2]=155+tone;
      assert.equal(current.pixels[at+3],255);assert.equal(original.pixels[at+3],255);
      for(let channel=0;channel<3;channel++){
        assert.equal(original.pixels[at+channel],quantized[channel],'The original private grain recipe must remain exact');
        assert.ok(current.pixels[at+channel]>0&&current.pixels[at+channel]<255,'Mineral channels must remain unclipped');
        // One level permits only Uint8ClampedArray quantization if a future
        // candidate uses fractional centers; it cannot change the grain field.
        assert.ok(Math.abs(current.pixels[at+channel]-original.pixels[at+channel]-difference[channel])<=1,'Only the RGB centers may change, not per-pixel grain variation');
      }
    }
    assert.equal(current.privateSeed,grain.seed);assert.equal(original.privateSeed,grain.seed);assert.equal(repeat.privateSeed,grain.seed);
    const a=stats(current.pixels),b=stats(original.pixels),fraction=a.luminance/b.luminance;
    assert.ok(a.rgb[0]>a.rgb[1]&&a.rgb[1]>a.rgb[2],'The real texture retains a warm mineral RGB ordering');
    assert.ok(a.rgb[0]-a.rgb[1]>b.rgb[0]-b.rgb[1]+.5,'The texture must become perceptibly warmer');
    assert.ok(a.rgb[0]-a.rgb[2]>b.rgb[0]-b.rgb[2]+.5,'The warm mineral range must increase');
    assert.ok(a.rgb.every((value,channel)=>value<b.rgb[channel]),'All real RGB channel centers must darken');
    assert.ok(fraction>=.78&&fraction<=.90,'Linear-light albedo must retain 78–90% of the original for readable sand; actual fraction '+fraction);
  },30000);

  it('keeps the actual texture settings, independent canvas/pixel ownership and untouched neighboring resource through real cleanup',()=>{
    const a=construct(),b=construct(),savedA=Buffer.from(view(a.pixels)),savedB=Buffer.from(view(b.pixels));let disposedA=0,disposedB=0;
    a.texture.addEventListener('dispose',()=>disposedA++);b.texture.addEventListener('dispose',()=>disposedB++);
    assert.notEqual(a.texture,b.texture);assert.notEqual(a.canvas,b.canvas);assert.notEqual(a.pixels,b.pixels);assert.notEqual(a.pixels.buffer,b.pixels.buffer);
    for(const fixture of [a,b]){
      const t=fixture.texture;assert.equal(t.isTexture,true);assert.equal(t.image,fixture.canvas);assert.equal(t.image.width,256);assert.equal(t.image.height,256);
      assert.equal(fixture.canvas.attributes['aria-hidden'],'true');assert.deepEqual(fixture.calls,{created:1,context:1,imageData:1,uploads:1,anisotropy:1});
      assert.equal(t.wrapS,THREE.RepeatWrapping);assert.equal(t.wrapT,THREE.RepeatWrapping);assert.deepEqual(t.repeat.toArray(),[28,28]);assert.deepEqual(t.offset.toArray(),[0,0]);
      assert.equal(t.encoding,THREE.sRGBEncoding);assert.equal(t.anisotropy,4);assert.equal(t.magFilter,THREE.LinearFilter);assert.equal(t.minFilter,THREE.LinearMipmapLinearFilter);assert.equal(t.generateMipmaps,true);assert.equal(t.flipY,true);assert.equal(t.format,THREE.RGBAFormat);assert.equal(t.type,THREE.UnsignedByteType);assert.equal(t.version,1);
    }
    const imageB=b.texture.image,versionB=b.texture.version;release(a);assert.equal(disposedA,1);assert.equal(disposedB,0);
    assert.equal(b.texture.image,imageB);assert.equal(b.texture.version,versionB);assert.ok(view(b.pixels).equals(savedB),'Disposing one texture must not mutate a neighboring canvas');assert.ok(view(a.pixels).equals(savedA));
    release(b);assert.equal(disposedA,1);assert.equal(disposedB,1);
  });
});
