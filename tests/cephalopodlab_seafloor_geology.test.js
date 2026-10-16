import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const { restorePass61Source } = require('./helpers/cephalopod_pass61_reference.cjs');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
const baseline=restorePass61Source(source);
function block(text,start){
  const open=text.indexOf('{',start);assert.ok(start>=0&&open>=0);let depth=0,quote='',line=false,comment=false;
  for(let i=open;i<text.length;i++){
    const c=text[i],next=text[i+1];if(line){if(c==='\n')line=false;continue;}if(comment){if(c==='*'&&next==='/'){comment=false;i++;}continue;}
    if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
    if(c==='/'&&next==='/'){line=true;i++;continue;}if(c==='/'&&next==='*'){comment=true;i++;continue;}
    if(c==='\''||c==='"'||c==='`'){quote=c;continue;}if(c==='{')depth++;if(c==='}'&&!--depth)return text.slice(start,i+1);
  }throw new Error('Unterminated actual block');
}
function helper(text,name){return block(text,text.indexOf('function '+name+'('));}
function section(text,from,to){const start=text.indexOf(from),end=text.indexOf(to,start);assert.ok(start>=0&&end>start,from);return text.slice(start,end);}
function only(text,expression,label){const matches=[...text.matchAll(expression)];assert.equal(matches.length,1,label);return matches[0];}
const visualMath=Object.create(Math);visualMath.random=()=>{throw new Error('Visual geology consumed world RNG');};
const shading=helper(source,'shadeCLHuntSandLight');
const terrain=new Function('Math',helper(source,'terrainHeight')+';return terrainHeight;')(visualMath);
const shade=new Function('Math',shading+';return shadeCLHuntSandLight;')(visualMath);
function plain(){return {uniforms:{sentinel:{value:7}},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};}
function assemble(shared={value:1}){const shader=plain();shade(shader,shared);return shader;}
function owned(shader,name){const marker='#include <'+name+'>\n',start=shader.fragmentShader.indexOf(marker);assert.ok(start>=0);const end=shader.fragmentShader.indexOf('#include <',start+marker.length);assert.ok(end>start);return shader.fragmentShader.slice(start+marker.length,end).trim();}
const actual=assemble(),common=owned(actual,'common'),color=owned(actual,'color_fragment'),relief=owned(actual,'normal_fragment_maps'),roughness=owned(actual,'roughnessmap_fragment');
const pure=[...common.matchAll(/float (clShelf\w+)\(([^)]*)\)\{([^}]+)\}/g)];assert.equal(pure.length,4);
const scalarize=code=>code.replace(/\b(?:float|vec2|vec3)\s+(?=[A-Za-z_]\w*)/g,'let ');
const pureJS=pure.map(([,name,args,body])=>'function '+name+'('+args.replace(/float /g,'')+'){'+scalarize(body)+'}').join('\n');
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const smoothstep=(low,high,value)=>{const t=clamp((value-low)/(high-low),0,1);return t*t*(3-2*t);};
const mix=(a,b,t)=>a+(b-a)*t;
const pureFunctions=new Function('clamp','smoothstep','sin','cos','sqrt',pureJS+';return {slope:clShelfSlope,exposure:clShelfExposure,silt:clShelfSilt,filter:clShelfDetailFilter};')(clamp,smoothstep,Math.sin,Math.cos,Math.sqrt);
function capability(code,enabled){const stack=[true],output=[];for(const raw of code.split('\n')){const line=raw.trim();if(line==='#if CL_SAND_DERIVATIVES'){stack.push(stack.at(-1)&&enabled);continue;}if(line==='#endif'){assert.ok(stack.length>1);stack.pop();continue;}assert.ok(!line.startsWith('#'),line);if(stack.at(-1))output.push(raw);}assert.equal(stack.length,1);return output.join('\n');}
const sandCap=only(relief,/clSandGradient\*=([^\n]+);/g,'actual sand cap')[0];
const stoneCap=only(relief,/clShelfGradient\*=([^\n]+);/g,'actual stone cap')[0];
const bedAmplitude=Number(only(relief,/clShelfGradient=([^\n]+)\*([0-9.]+)\*clShelfRock;/g,'actual bed height amplitude')[2]);
const rawRelief=relief.slice(0,relief.indexOf('vec3 clViewSlope=')).replace(sandCap,'').replace(stoneCap,'')+'\n#endif';
const applySandCap=new Function('clSandGradient','min','max','length',sandCap+'return clSandGradient;');
const applyStoneCap=new Function('clShelfGradient','min','max','length',stoneCap+'return clShelfGradient;');
function numerical(enabled){
  const materialCode=capability(color,enabled),reliefCode=capability(rawRelief,enabled),roughnessCode=capability(roughness,enabled);
  const program=pureJS+'\n'+scalarize(materialCode+'\n'+roughnessCode+'\n'+reliefCode);
  const evaluate=new Function('clSandWorld','fwidth','vec2','vec3','sin','cos','sqrt','smoothstep','clamp','mix','clSandDownwelling','diffuseColor','roughnessFactor',program+';return {rock:clShelfRock,deep:clShelfDeep,share:clSandShare,bed:clShelfBed,fineBed:clShelfFineBed,aa:clShelfAA,fineAA:clShelfFineAA,rippleAA:clRippleAA,harmonicAA:clRippleHarmonicAA,strata:clShelfStrata,weather:clShelfWeather,patch:clPatches,wave:clRippleWave,albedo:diffuseColor.rgb,roughness:roughnessFactor,rawSand:'+(enabled?'clSandGradient':'0')+',rawStone:'+(enabled?'clShelfGradient':'0')+'};');
  return {owned:materialCode+'\n'+reliefCode+'\n'+roughnessCode,at(x,y,z,footprints=[0,0,0],downwelling=1){
    const components=[0,1,2].map(axis=>{let calls=0;return evaluate({x,y,z},()=>footprints[calls++],(a,b)=>axis===0?a:b,(a,b=a,c=a)=>[a,b,c][axis],Math.sin,Math.cos,Math.sqrt,smoothstep,clamp,mix,downwelling,{rgb:1},.94);});
    const row=components[0],sand=[components[0].rawSand,components[2].rawSand],stone=components.map(p=>p.rawStone),sandLength=Math.hypot(...sand),stoneLength=Math.hypot(...stone);
    return {...row,albedo:components.map(p=>p.albedo),rawSand:sand,rawStone:stone,sand:sand.map(value=>applySandCap(value,Math.min,Math.max,()=>sandLength)),stone:stone.map(value=>applyStoneCap(value,Math.min,Math.max,()=>stoneLength))};
  }};
}
const nativeFloor=section(source,'        var floor = new THREE.Mesh(floorGeo,','        // Fine rough mineral variation');
function liveMaterial(webgl2,extension){
  const requests=[],renderer={capabilities:{isWebGL2:webgl2},extensions:{has(name){requests.push(name);return extension;}}},floorGeo=new THREE.PlaneGeometry(200,200,80,80),sandTex=new THREE.Texture(),scene=new THREE.Scene();
  const live=new Function('THREE','Math','renderer','floorGeo','sandTex','scene',nativeFloor+';return {floor,sandDownwelling,sandHabitat};')(THREE,visualMath,renderer,floorGeo,sandTex,scene);
  return {...live,requests,floorGeo,sandTex,scene,dispose(){floorGeo.dispose();sandTex.dispose();live.floor.material.dispose();}};
}
const xs=[-500,-18,0,23.9999,24,24.0001,24.5,25,26,30,35.5,40,45,46,46.9999,47,47.0001,60,500],zs=[-500,-18,-6,0,3.17,6,18,500];
function finite(row){return Object.values(row).flat().every(Number.isFinite);}
function close(a,b,tolerance,message){assert.ok(Math.abs(a-b)<=tolerance,(message||'')+' '+a+' versus '+b);}

describe('Cephalopod Hunter world-anchored seafloor geology',()=>{
  it('assembles native r128 standard material with shared light uniform, unchanged resources, and three real capability branches',()=>{
    assert.equal(THREE.REVISION,'128');assert.ok(!/Math\.random|texture2D\s*\(|\bnew\s+|\btime\b/.test(shading));
    for(const [webgl2,extension,defined]of[[true,false,1],[false,true,1],[false,false,0]]){
      const live=liveMaterial(webgl2,extension);try{
        assert.deepEqual(live.requests,webgl2?[]:['OES_standard_derivatives']);assert.equal(live.floor.geometry,live.floorGeo);assert.equal(live.floor.material.map,live.sandTex);assert.equal(live.scene.children.length,1);
        assert.equal(live.floor.material.defines.CL_SAND_DERIVATIVES,defined);assert.equal(live.floor.material.extensions.derivatives,!!defined);assert.equal(live.floor.material.transparent,false);assert.equal(live.floor.material.depthWrite,true);assert.equal(live.floor.receiveShadow,true);
        const first=plain(),second=plain();live.floor.material.onBeforeCompile(first);live.floor.material.onBeforeCompile(second);assert.equal(first.uniforms.clSandDownwelling,live.sandDownwelling);assert.equal(second.uniforms.clSandDownwelling,live.sandDownwelling);assert.deepEqual(Object.keys(first.uniforms),['sentinel','clSandDownwelling','clSandHabitat']);assert.equal(first.uniforms.clSandHabitat,live.sandHabitat);assert.equal(second.uniforms.clSandHabitat,live.sandHabitat);assert.equal(live.sandHabitat.value.length,5);live.sandDownwelling.value=.21;assert.equal(first.uniforms.clSandDownwelling.value,.21);
        for(const chunk of ['color_fragment','roughnessmap_fragment','normal_fragment_maps'])assert.ok(first.fragmentShader.includes('#include <'+chunk+'>'));assert.ok(first.vertexShader.includes('clSandWorld=(modelMatrix*vec4(position,1.0)).xyz;'));assert.ok(!first.fragmentShader.includes('\\n'));
        assert.equal((first.fragmentShader.match(/texture2D\s*\(/g)||[]).length,(THREE.ShaderLib.standard.fragmentShader.match(/texture2D\s*\(/g)||[]).length);assert.equal(live.floor.material.customProgramCacheKey(),'cl-shelf-geology-v61-habitat-v1');
      }finally{live.dispose();}
    }
  });

  it('matches analytic slope to independent terrain-height stencils and remains continuous at both shelf ends',()=>{
    const epsilon=1e-4;
    for(const x of xs)for(const z of zs){const dx=(terrain(x+epsilon,z)-terrain(x-epsilon,z))/(2*epsilon),dz=(terrain(x,z+epsilon)-terrain(x,z-epsilon))/(2*epsilon),slope=pureFunctions.slope(x,z);assert.ok(Number.isFinite(slope)&&slope>=0);close(slope,Math.hypot(dx,dz),(x===24||x===47)?4e-5:4e-7,'shelf derivative');}
    for(const edge of [24,47])for(const z of zs){close(pureFunctions.slope(edge-epsilon,z),pureFunctions.slope(edge+epsilon,z),.00013,'continuous shelf slope');close(pureFunctions.exposure(pureFunctions.slope(edge-epsilon,z)),pureFunctions.exposure(pureFunctions.slope(edge+epsilon,z)),1e-10,'continuous material');}
    assert.equal(pureFunctions.exposure(pureFunctions.slope(35.5,0)),1);assert.equal(pureFunctions.exposure(pureFunctions.slope(0,0)),0);assert.equal(pureFunctions.exposure(pureFunctions.slope(60,0)),0);
  });

  it('keeps finite bounded material mixtures through rock, shallow sand, deep silt, and distant world coordinates',()=>{
    const field=numerical(true);
    for(const x of xs)for(const z of zs)for(const footprints of [[0,0,0],[.65,1.39,.65],[2,4.26,2]])for(const day of [0,1]){
      const row=field.at(x,terrain(x,z),z,footprints,day);assert.ok(finite(row));for(const value of [row.rock,row.deep,row.share,row.aa,row.fineAA])assert.ok(value>=0&&value<=1);
      assert.ok(row.rock+row.deep<=1+1e-12);assert.ok(row.share<=1-row.rock+1e-12);assert.ok(row.roughness>=.9&&row.roughness<=.99);for(const value of row.albedo)assert.ok(value>.22&&value<1.35,'bounded albedo '+value);
      if(x<=24){assert.equal(row.rock,0);assert.equal(row.deep,0);assert.equal(row.share,1);}if(x>=47){assert.equal(row.rock,0);assert.equal(row.deep,1);close(row.share,.18,1e-12);assert.equal(row.roughness,.99);}
    }
    assert.equal(pureFunctions.silt(-34),0);assert.equal(pureFunctions.silt(-54),1);assert.equal(pureFunctions.silt(20),0);assert.equal(pureFunctions.silt(-500),1);
  });

  it('matches the actual bed relief gradient to an independent three-axis height stencil with its material weight held fixed',()=>{
    const field=numerical(true),epsilon=1e-4;
    for(const x of [25,26,30,35.5,40,45,46])for(const z of [-18,0,3.17,18])for(const footprints of [[0,0,0],[.6,1.278,.6]]){
      const y=terrain(x,z),row=field.at(x,y,z,footprints),point=[x,y,z];
      for(let axis=0;axis<3;axis++){const a=point.slice(),b=point.slice();a[axis]+=epsilon;b[axis]-=epsilon;const ha=field.at(...a,footprints).strata*bedAmplitude*row.rock,hb=field.at(...b,footprints).strata*bedAmplitude*row.rock;close((ha-hb)/(2*epsilon),row.rawStone[axis],2e-8,'bed gradient axis '+axis);}
      assert.ok(Math.hypot(...row.sand)<=.24+1e-12);assert.ok(Math.hypot(...row.stone)<=.12+1e-12);const combined=[row.sand[0]+row.stone[0],row.stone[1],row.sand[1]+row.stone[2]];assert.ok(Math.hypot(...combined)<=.36+1e-12);
      // Mirror the actual tangent projection independently with native vectors.
      const slope=new THREE.Vector3(...combined),normal=new THREE.Vector3(-pureFunctions.slope(x,z),1,0).normalize(),finish=normal.clone().sub(slope).addScaledVector(normal,normal.dot(slope)).normalize();assert.ok(finish.toArray().every(Number.isFinite));close(finish.length(),1,1e-12);assert.ok(finish.dot(normal)>.94,'No normal inversion');
    }
  });

  it('filters each bed harmonic independently and keeps the derivative-unavailable fallback steady and derivative free',()=>{
    const on=numerical(true),off=numerical(false);assert.ok(!/\bfwidth\s*\(|\bdFd[xy]\s*\(|clShelfGradient\s*=|clSandGradient\s*=|normal\s*=/.test(off.owned));assert.equal(capability(relief,false).trim(),'');
    let previous=Infinity;for(const footprint of [0,.2,.4,.6,.9,1.2,1.8,2,10]){const filter=pureFunctions.filter(footprint);assert.ok(filter>=0&&filter<=1&&filter<=previous);previous=filter;}
    for(const x of [0,25,35.5,46,60])for(const z of zs){const y=terrain(x,z),near=on.at(x,y,z),separate=on.at(x,y,z,[.9,1.917,.9]),far=on.at(x,y,z,[2,4.26,2]),fallback=off.at(x,y,z);assert.equal(near.aa,1);assert.equal(near.fineAA,1);assert.ok(separate.aa>0);assert.equal(separate.fineAA,0);assert.equal(far.aa,0);assert.equal(far.fineAA,0);assert.ok(far.strata===0);assert.ok(far.rawSand.every(value=>value===0));assert.ok(far.rawStone.every(value=>value===0));assert.ok(finite(fallback));assert.deepEqual(fallback.albedo,far.albedo);assert.equal(fallback.roughness,far.roughness);assert.deepEqual(off.at(x,y,z,[20,20,20]).albedo,fallback.albedo);}
  });

  it('retains shallow material output bit for bit from the prior shader across day and AA states',()=>{
    const beforeShade=new Function(helper(baseline,'shadeCLHuntSandLight')+';return shadeCLHuntSandLight;')(),prior=plain();beforeShade(prior,{value:1});
    const beforeColor=owned(prior,'color_fragment'),beforeRough=owned(prior,'roughnessmap_fragment');
    for(const enabled of [true,false]){
      const program=scalarize(capability(beforeColor+'\n'+beforeRough,enabled));const evaluate=new Function('clSandWorld','fwidth','vec3','sin','smoothstep','clamp','mix','clSandDownwelling','diffuseColor','roughnessFactor',program+';return [diffuseColor.rgb,roughnessFactor,clRippleWave];');const field=numerical(enabled);
      for(const x of [-500,-18,0,18,24])for(const z of zs)for(const footprint of [0,.9,2])for(const day of [0,.5,1]){const now=field.at(x,terrain(x,z),z,[footprint,footprint*2.13,footprint],day);for(let axis=0;axis<3;axis++){const old=evaluate({x,z},()=>footprint,(a,b=a,c=a)=>[a,b,c][axis],Math.sin,smoothstep,clamp,mix,day,{rgb:1},.94);assert.equal(now.albedo[axis],old[0]);assert.equal(now.roughness,old[1]);assert.equal(now.wave,old[2]);}}
    }
  });

  it('anchors strata and sand to the same world point across native tile transforms and remains continuous at snapped tile boundaries',()=>{
    const field=numerical(true),floor=new THREE.Object3D();floor.rotation.x=-Math.PI/2;
    for(const point of [[0,terrain(0,3.17),3.17],[30,terrain(30,-6),-6],[60,-55,18]]){
      const expected=field.at(...point),world=new THREE.Vector3(...point);
      for(const tile of [[0,0],[12,0],[24,-12],[48,24],[-84,96]]){floor.position.set(tile[0],0,tile[1]);floor.updateMatrixWorld(true);const local=floor.worldToLocal(world.clone()),restored=floor.localToWorld(local);restored.toArray().forEach((value,axis)=>close(value,point[axis],1e-12));const row=field.at(...restored.toArray());close(row.bed,expected.bed,1e-12);row.albedo.forEach((value,axis)=>close(value,expected.albedo[axis],1e-12));}
    }
    for(const edge of [-498,-18,-6,6,18,30,42,54,498]){const a=field.at(edge-1e-6,terrain(edge-1e-6,3.17),3.17),b=field.at(edge+1e-6,terrain(edge+1e-6,3.17),3.17);a.albedo.forEach((value,axis)=>close(value,b.albedo[axis],1e-5,'tile seam'));close(a.roughness,b.roughness,1e-5);}
  });

  it('limits the exact source change to the shader and cache binding, preserving terrain, resource creation, interaction, and cleanup code',()=>{
    const from='        function shadeCLHuntSandLight(',to='        // Fine rough mineral variation';
    const currentRegion=section(source,from,to),beforeRegion=section(baseline,from,to);const sourceAtPass61=(source.includes('function shadeCLHuntCausticFlow(')||source.includes('function findCLHuntCrevice('))?require('./helpers/cephalopod_pass62_reference.cjs').restorePass62Source(source):source;assert.equal(sourceAtPass61.replace(currentRegion,beforeRegion),baseline);assert.equal(helper(source,'terrainHeight'),helper(baseline,'terrainHeight'));
    const protectedSource=source.replace(currentRegion,'');assert.ok(protectedSource.includes("floor.name='cl-seafloor'"));assert.ok(protectedSource.includes('floorGeo.computeVertexNormals()'));assert.ok(protectedSource.includes('try { sandTex.dispose(); } catch (e) {}'));assert.ok(protectedSource.includes('cl-pearl-'));
  });
});
