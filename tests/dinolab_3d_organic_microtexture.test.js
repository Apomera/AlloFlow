import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const {dinoSkinTextureData,dinoSkinMapping,integumentProfileFor,byId}=internals();
const palette=[122,101,78],channels=['color','bump','roughness'];
const digest=data=>createHash('sha256').update(data).digest('hex');

// Bright relief crowns are measured from the resulting height map. These are
// display-level variation checks, not a reconstruction of the private cell grid
// or a claim about the size of fossil scales.
function crownStats(texture,width,height){
  const data=texture.bump,seen=new Uint8Array(width*height),areas=[],peaks=[];
  for(let p=0;p<seen.length;p++){
    if(seen[p]||data[p*4]<145)continue;
    const stack=[p];let area=0,peak=0;seen[p]=1;
    while(stack.length){
      const q=stack.pop(),x=q%width,y=Math.floor(q/width);area++;peak=Math.max(peak,data[q*4]);
      for(const next of [x?q-1:-1,x<width-1?q+1:-1,y?q-width:-1,y<height-1?q+width:-1]){
        if(next>=0&&!seen[next]&&data[next*4]>=145){seen[next]=1;stack.push(next);}
      }
    }
    if(area>=4){areas.push(area);peaks.push(peak);}
  }
  areas.sort((a,b)=>a-b);peaks.sort((a,b)=>a-b);
  const quantile=(values,fraction)=>values[Math.floor(values.length*fraction)];
  return {count:areas.length,areaP10:quantile(areas,.1),areaP90:quantile(areas,.9),peakP10:quantile(peaks,.1),peakP90:quantile(peaks,.9)};
}

describe('Dino Lab organic scale texture contracts',()=>{
  for(const [width,height,seed] of [[127,73,0],[255,127,719],[65,33,4294967295]]){
    it('keeps every RGBA tile edge identical at '+width+'×'+height+' seed '+seed,()=>{
      const texture=dinoSkinTextureData(width,height,seed,palette,true);
      expect(texture.style).toBe('fine-scales');
      for(const channel of channels){
        const data=texture[channel];expect(data).toBeInstanceOf(Uint8ClampedArray);expect(data.length).toBe(width*height*4);
        for(let y=0;y<height;y++)for(let c=0;c<4;c++)expect(data[(y*width)*4+c]).toBe(data[(y*width+width-1)*4+c]);
        for(let x=0;x<width;x++)for(let c=0;c<4;c++)expect(data[x*4+c]).toBe(data[((height-1)*width+x)*4+c]);
      }
    });
  }
  const grainCases=[
    [127,73,0,['19e71b5ce8d968a7022b4baacd2ba304aed6fb4d4eaad996e9b1ab27e47245b5','7b5da32a5d450913a45ce75e0023f200994f30ab7e6147b73861ce97fc4a70a7','17e114f550b70aada8f4a2fd17a80052e94d84b07febff3636f66edabf000227']],
    [255,127,719,['1becdd970e553242ea23d3b950c889d585e29e71ad938c0128a8964d2dfa24f5','6d9a4f088330472376cd76ed5bd615fe4e6d38c4c4609d86655e365511594b6d','646520d7cf947cf22d21a6c06e63fc0308f0b783a3f513f86a97384f3667bad3']],
    [64,32,4294967295,['cf02bad7b0bac4dfe758732ee432a21616a91b8626dbdfce8ceddcbd9fa91fe3','3b4569e401ea8204d46bed5db0d73ac8a0320d87d667488ce0d91a18b9e21dca','e7fe075824e5e44301a43207c4bae80081961c45fcfce5896374ab40d974ff86']],
    [33,17,-1,['c2077b7499bc58fa4f73258547ca1a40c54e3ec56104d379a562e0c5f2b1a07d','79b751da12e488ad4d8df05baeefcd484e4079ced1a24f726292c47032d64e90','56ace5d682dc1bad2816c3050acae4a9427be04c69be05a079eee34e7824a968']]
  ];
  for(const [width,height,seed,hashes] of grainCases){
    it('retains the pre-existing grain atlas at '+width+'×'+height+' seed '+seed,()=>{
      const texture=dinoSkinTextureData(width,height,seed,palette,false);expect(texture.style).toBe('fine-grain');
      channels.forEach((channel,i)=>expect(digest(texture[channel])).toBe(hashes[i]));
    });
  }
  it('aligns height RGB and roughness RGB with opaque alpha while keeping pigment independent',()=>{
    for(const scaled of [false,true]){
      const dark=dinoSkinTextureData(127,73,3040893921,[12,16,24],scaled),light=dinoSkinTextureData(127,73,3040893921,[216,210,192],scaled);
      expect(dark.bump).toEqual(light.bump);expect(dark.roughness).toEqual(light.roughness);expect(dark.color).not.toEqual(light.color);
      let bumpMin=255,bumpMax=0,roughMin=255,roughMax=0;
      for(let i=0;i<dark.bump.length;i+=4){
        for(const channel of channels)expect(dark[channel][i+3]).toBe(255);
        for(const channel of ['bump','roughness']){expect(dark[channel][i+1]).toBe(dark[channel][i]);expect(dark[channel][i+2]).toBe(dark[channel][i]);}
        bumpMin=Math.min(bumpMin,dark.bump[i]);bumpMax=Math.max(bumpMax,dark.bump[i]);roughMin=Math.min(roughMin,dark.roughness[i]);roughMax=Math.max(roughMax,dark.roughness[i]);
      }
      expect(bumpMin).toBeGreaterThanOrEqual(104);expect(bumpMax).toBeLessThanOrEqual(161);expect(roughMin).toBeGreaterThanOrEqual(209);expect(roughMax).toBeLessThanOrEqual(231);
    }
  });
  for(const seed of [719,3040893921]){
    it('varies crown height and visible crown area for seed '+seed,()=>{
      const stats=crownStats(dinoSkinTextureData(512,256,seed,palette,true),512,256);
      expect(stats.count).toBeGreaterThan(1000);expect(stats.peakP90-stats.peakP10).toBeGreaterThanOrEqual(6);
      expect(stats.areaP90/stats.areaP10).toBeGreaterThanOrEqual(4);
    });
  }
  it('is reproducible without mutating the palette or sharing atlas buffers',()=>{
    const input=Object.freeze([...palette]),a=dinoSkinTextureData(65,33,-1,input,true),b=dinoSkinTextureData(65,33,4294967295,input,true),other=dinoSkinTextureData(65,33,84,input,true);
    expect(input).toEqual(palette);
    for(const channel of channels){expect(a[channel]).toEqual(b[channel]);expect(a[channel]).not.toBe(b[channel]);expect(a[channel]).not.toEqual(other[channel]);}
    expect(new Set(channels.map(channel=>a[channel].buffer)).size).toBe(3);
    const before=b.bump[0];a.bump[0]=a.bump[0]^255;expect(b.bump[0]).toBe(before);
  });
  it('keeps shared shader programs independent of per-material scales and colors',()=>{
    const colors={skin:'#78614a',dark:'#3d3329',accent:'#a1845f'};
    const profiles=[integumentProfileFor(byId('sinosauropteryx'),colors,'evidence'),integumentProfileFor(byId('tyrannosaurus'),colors,'neutral')];
    const materials=profiles.map(()=>new THREE.MeshStandardMaterial()),shaders=[];
    materials.forEach((material,i)=>{
      dinoSkinMapping(THREE,material,i?2:.5,.2,profiles[i]);
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);shaders.push(shader);
      expect(material.customProgramCacheKey()).toBe('dinolab-specimen-skin-v2');
    });
    expect(shaders[0].vertexShader).toBe(shaders[1].vertexShader);expect(shaders[0].fragmentShader).toBe(shaders[1].fragmentShader);
    expect(shaders[0].uniforms.dinoSkinScale.value).toBe(2);expect(shaders[1].uniforms.dinoSkinScale.value).toBe(.5);
    expect(shaders[0].uniforms.dinoTailBandTint.value.w).toBe(.9);expect(shaders[1].uniforms.dinoTailBandTint.value.w).toBe(0);
    expect(shaders[0].uniforms.dinoTailBandTint.value).not.toBe(shaders[1].uniforms.dinoTailBandTint.value);
    materials.forEach(material=>material.dispose());
  });
  it('preserves the Phong fallback when no texture maps are available',()=>{
    const material=new THREE.MeshPhongMaterial({color:'#78614a'}),color=material.color.clone();
    dinoSkinMapping(THREE,material,1,.2,integumentProfileFor(byId('tyrannosaurus'),{skin:'#78614a',dark:'#3d3329',accent:'#a1845f'},'neutral'));
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.phong.vertexShader,fragmentShader:THREE.ShaderLib.phong.fragmentShader};material.onBeforeCompile(shader);
    expect(material.map).toBe(null);expect(material.bumpMap).toBe(null);expect(material.color.equals(color)).toBe(true);
    expect(shader.vertexShader).toContain('vDinoSkinPosition = dinoSkinPosition;');expect(shader.fragmentShader).toContain('#ifdef USE_MAP');
    expect(shader.fragmentShader).toContain('mapTexelToLinear');expect(material.customProgramCacheKey()).toBe('dinolab-specimen-skin-v2');material.dispose();
  });
});
