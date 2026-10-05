import { afterEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url), THREE = require('../vendor/three-r128/three.min.js');
const { restorePass40CrabSource } = require('./helpers/cephalopod_crab_cuticle_reference.cjs');
const source = readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE || 'stem_lab/stem_tool_cephalopodlab.js', 'utf8').replace(/\r\n/g, '\n');
const restored = restorePass40CrabSource(source);
const allocated = [];
function fixture(text = source) {
  const start = text.indexOf('var CRAB_TYPES = {'), end = text.indexOf('// Seed with mix:', start);
  assert.ok(start >= 0 && end > start);
  const construct = new Function('THREE', 'Math', 'var scene=new THREE.Scene(),octopus={position:new THREE.Vector3(10,.55,-8)};' + text.slice(start, end) + ';return {scene,crabs,types:CRAB_TYPES,spawn:spawnCrab};');
  const draws = [], sequence = [.125,.25,.375,.5], math = Object.assign(Object.create(Math), { random() { const value = sequence[draws.length % sequence.length]; draws.push(value); return value; } });
  const result = construct(THREE, math); allocated.push(result); return { ...result, draws };
}
function records(crab) {
  return { root: [crab.position.toArray(), crab.rotation.toArray(), crab.scale.toArray()], gameplay: crab.userData,
    children: crab.children.map(mesh => ({ name: mesh.name, position: mesh.position.toArray(), rotation: mesh.rotation.toArray(), scale: mesh.scale.toArray(),
      attributes: Object.entries(mesh.geometry.attributes).map(([name, attr]) => [name, Array.from(attr.array)]), index: Array.from(mesh.geometry.index.array),
      geometryData: mesh.geometry.userData, box: [mesh.geometry.boundingBox.min.toArray(), mesh.geometry.boundingBox.max.toArray()], sphere: [mesh.geometry.boundingSphere.center.toArray(), mesh.geometry.boundingSphere.radius],
      material: [mesh.material.type, mesh.material.color.toArray(), mesh.material.roughness, mesh.material.metalness, mesh.material.vertexColors, mesh.material.opacity, mesh.material.transparent, mesh.material.side] })) };
}
function compile(material, renderer) {
  const shader = { vertexShader: '#include <common>\n#include <begin_vertex>', fragmentShader: '#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>', uniforms: {} };
  material.onBeforeCompile(shader, renderer); return shader;
}
function preprocess(text, filtered) {
  const lines = text.split('\n'), output = []; let include = true, nesting = 0;
  for (const line of lines) {
    if (line.trim() === '#ifdef CL_CRAB_FILTERED') { assert.equal(nesting, 0); nesting++; include = filtered; continue; }
    if (line.trim() === '#endif' && nesting) { nesting--; include = true; continue; }
    if (include && !line.startsWith('#define CL_CRAB_FILTERED')) output.push(line);
  }
  assert.equal(nesting, 0); return output.join('\n');
}
// Evaluate scalar declarations from the emitted fallback GLSL itself. The test
// doesn't reimplement the masking constants or use an unrelated toy surface.
const mix = (a,b,t) => a+(b-a)*t;
function smoothstep(a,b,x) { assert.ok(a < b); const t = Math.max(0,Math.min(1,(x-a)/(b-a))); return t*t*(3-2*t); }
const vector = (x,y) => ({ x,y }), length = v => Math.hypot(v.x,v.y);
const functions = { mix, smoothstep, sin: Math.sin, abs: Math.abs, max: Math.max, length, vec2: vector };
function scalarExpression(text,name) {
  const found = text.match(new RegExp('(?:float|vec2) '+name+'=([^;]+);'));
  assert.ok(found, 'actual GLSL declaration for '+name);
  return context => {
    const values = { ...functions,...context }, keys = Object.keys(values);
    return new Function(...keys, 'return ('+found[1]+');')(...keys.map(key => values[key]));
  };
}
function fallbackFields(fragment,p,hermit) {
  const context = { p, clCrabHermit: hermit };
  const strokeBody = fragment.match(/float clCrabStroke\(float distanceValue,float width\)\{([\s\S]*?)\n\}/);
  assert.ok(strokeBody);
  const stroke = new Function('distanceValue','width','smoothstep','abs',strokeBody[1].replace(/\bfloat (\w+)/g,'let $1'));
  context.clCrabStroke = (distanceValue,width) => stroke(distanceValue,width,smoothstep,Math.abs);
  for (const field of ['uv','dorsal','radius','core','grooveResolve','front','back','shoulder','shoulderExtent','divisions','rim','mottle','edge','pores']) context[field] = scalarExpression(fragment,field)(context);
  const mask = fragment.match(/divisions\*=([^;]+);/); assert.ok(mask);
  context.divisions *= new Function(...Object.keys(context),'return '+mask[1])(...Object.values(context));
  const tone = fragment.match(/vec3 tone=vec3\(([^;]+)\);/); assert.ok(tone);
  const rgb = fragment.match(/tone\*=vec3\(([^;]+)\);/); assert.ok(rgb);
  const values = { ...functions,...context }, keys = Object.keys(values), evaluate = expr => new Function(...keys,'return ('+expr+');')(...keys.map(key => values[key]));
  const base = evaluate(tone[1]);
  const channels = rgb[1].split(',').map(expr => base*evaluate(expr));
  const roughness = fragment.match(/return vec4\(tone,([^;]+)\);/); assert.ok(roughness);
  return { ...context, channels, roughness: .7+evaluate(roughness[1]) };
}
afterEach(() => { for (const item of allocated.splice(0)) item.scene.traverse(mesh => { if (mesh.geometry) mesh.geometry.dispose(); if (mesh.material) mesh.material.dispose(); }); });

describe('Cephalopod Hunter body cuticle finish', () => {
  it('preserves exact actual geometry, all existing attributes, contacts, material settings and four-draw gameplay across every crab type', () => {
    const live = fixture(), baseline = fixture(restored);
    for (const type of ['rock','red','hermit','unknown']) {
      const current = live.spawn(type), before = baseline.spawn(type);
      assert.deepEqual(records(current), records(before));
      assert.deepEqual(live.draws, baseline.draws);
      assert.equal(live.draws.length, (['rock','red','hermit','unknown'].indexOf(type)+1)*4);
      assert.deepEqual(Object.keys(current.children[0].geometry.attributes), ['position','color','normal']);
      assert.equal(current.children.length, type === 'hermit' ? 15 : 11);
    }
  });

  it('owns the finish only on each existing opaque body material and keeps independent materials/uniforms for neighboring animals', () => {
    const item = fixture(), animals = ['rock','red','hermit'].map(type => item.spawn(type)), bodies = animals.map(crab => crab.children[0]);
    assert.equal(new Set(animals.flatMap(crab => crab.children.map(mesh => mesh.material))).size, animals.reduce((sum,crab) => sum+crab.children.length,0));
    const compiled = bodies.map(mesh => compile(mesh.material,{capabilities:{isWebGL2:true}}));
    for (let i=0;i<animals.length;i++) {
      const crab = animals[i], material = bodies[i].material, shader = compiled[i];
      assert.equal(material.isMeshStandardMaterial,true); assert.equal(material.roughness,.7); assert.equal(material.transparent,false); assert.equal(material.opacity,1);
      assert.equal(material.customProgramCacheKey(),'cl-crab-cuticle-v1'); assert.deepEqual(material.extensions,{derivatives:true});
      assert.equal(shader.uniforms.clCrabScale.value, crab.userData.cfg.sizeMul); assert.equal(shader.uniforms.clCrabHermit.value, crab.userData.type === 'hermit' ? 1 : 0);
      assert.ok(!Object.values(material).some(value => value?.isTexture));
      assert.ok(!shader.fragmentShader.includes('emissiveRadiance=')); assert.ok(!shader.fragmentShader.includes('texture2D('));
      for (const mesh of crab.children.slice(1)) {
        const plain = compile(mesh.material,{capabilities:{isWebGL2:true}});
        assert.ok(!plain.vertexShader.includes('clCrabPosition')); const frame=mesh.geometry.userData.clCrabGeometry; assert.deepEqual(plain.uniforms,frame.kind==='shell'&&frame.piece!==1?{clHermitShellPiece:{value:frame.piece}}:{});
        assert.notEqual(mesh.material.customProgramCacheKey(),'cl-crab-cuticle-v1');
      }
      const sentinel = { vertexShader:'vertex sentinel', fragmentShader:'fragment sentinel', uniforms:{} };
      material.onBeforeCompile(sentinel); assert.deepEqual(sentinel,{vertexShader:'vertex sentinel',fragmentShader:'fragment sentinel',uniforms:{}});
    }
    assert.notEqual(compiled[0].uniforms.clCrabScale,compiled[1].uniforms.clCrabScale);
    assert.notEqual(compiled[0].uniforms.clCrabHermit,compiled[2].uniforms.clCrabHermit);
  });

  it('filters actual fine detail on supported contexts and emits a derivative-free fallback with zero pores', () => {
    const body = fixture().spawn('rock').children[0], queries = [];
    const renderers = [undefined,{capabilities:{isWebGL2:false},extensions:{has(name){queries.push(name);return false;}}},{capabilities:{isWebGL2:false},extensions:{has(name){queries.push(name);return true;}}},{capabilities:{isWebGL2:true}}];
    for (let i=0;i<renderers.length;i++) {
      const shader = compile(body.material,renderers[i]), filtered = i>1, fragment = preprocess(shader.fragmentShader,filtered);
      assert.equal(shader.fragmentShader.includes('#define CL_CRAB_FILTERED 1'),filtered);
      assert.equal(/fwidth|dFdx|dFdy/.test(fragment),filtered);
      assert.ok(shader.vertexShader.includes('clCrabPosition=position/clCrabScale;'));
      assert.ok(!shader.vertexShader.includes('attribute float')); assert.ok(!shader.vertexShader.includes('attribute vec'));
      assert.ok(shader.fragmentShader.includes('roughnessFactor=clamp(roughnessFactor+clCrabSurface.a,0.56,0.82);'));
      if(filtered) { assert.ok(fragment.includes('smoothstep(0.20,0.70,footprint)')); assert.ok(fragment.includes('smoothstep(0.035,0.14,surfaceFootprint)')); }
      else { assert.ok(fragment.includes('float pores=0.0;')); assert.ok(!fragment.includes('vec2 lattice=')); }
    }
    assert.deepEqual(queries,['OES_standard_derivatives','OES_standard_derivatives']);
  });

  it('evaluates dorsal masks from the emitted fallback on actual current triangles without painting divisions on the underside', () => {
    for (const type of ['rock','red','hermit']) {
      const crab = fixture().spawn(type), body = crab.children[0], p = body.geometry.attributes.position, indices = body.geometry.index;
      const fragment = preprocess(compile(body.material).fragmentShader,false), sm = crab.userData.cfg.sizeMul, hermit = type === 'hermit' ? 1 : 0;
      let lower = 0, upper = 0, divisionMax = 0, dorsalMax = 0;
      for(let at=0;at<indices.count;at+=3) for(const weights of [[1/3,1/3,1/3],[.1,.1,.8],[.1,.8,.1],[.8,.1,.1]]) {
        const point = { x:0,y:0,z:0 };
        for(let j=0;j<3;j++) { const index=indices.getX(at+j),weight=weights[j]/sm;point.x+=p.getX(index)*weight;point.y+=p.getY(index)*weight;point.z+=p.getZ(index)*weight; }
        const fields = fallbackFields(fragment,point,hermit);
        for(const key of ['dorsal','core','shoulderExtent','divisions','rim','edge','pores']) assert.ok(Number.isFinite(fields[key])&&fields[key]>=0&&fields[key]<=1,key);
        assert.equal(fields.pores,0); assert.ok(fields.channels.every(channel => Number.isFinite(channel)&&channel>.80&&channel<1.06));
        assert.ok(Number.isFinite(fields.roughness)&&fields.roughness>.65&&fields.roughness<.79);
        if(point.y<=.004) { lower++;assert.equal(fields.dorsal,0);assert.equal(fields.divisions,0);assert.equal(fields.rim,0);assert.equal(fields.edge,0); }
        else { upper++;divisionMax=Math.max(divisionMax,fields.divisions);dorsalMax=Math.max(dorsalMax,fields.dorsal); }
      }
      assert.ok(lower>100&&upper>100);assert.ok(dorsalMax>.99);assert.ok(divisionMax>.35,'At least one real dorsal triangle resolves a shallow division');
    }
  });

  it('retains existing buffers, material ownership and authored body pose while compiling both paths and moving existing animated slots', () => {
    const crab = fixture().spawn('hermit'), owned = crab.children.map(mesh => ({mesh,geometry:mesh.geometry,material:mesh.material,index:mesh.geometry.index,attributes:Object.values(mesh.geometry.attributes).map(attr=>({attr,array:attr.array,version:attr.version,values:Array.from(attr.array)}))}));
    const body = crab.children[0], before = records(crab).children[0];
    for(let frame=0;frame<6;frame++) {
      crab.children.slice(3,9).forEach((leg,index) => {leg.position.y=-.05+Math.sin(frame*.5+index)*.03;});
      compile(body.material, frame%2 ? undefined : {capabilities:{isWebGL2:true}});
      for(const row of owned) { assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);assert.equal(row.geometry.index,row.index);for(const prior of row.attributes) {assert.equal(prior.attr.array,prior.array);assert.equal(prior.attr.version,prior.version);assert.deepEqual(Array.from(prior.array),prior.values);} }
    }
    assert.deepEqual(records(crab).children[0],before);
  });
});
