import {afterEach,describe,it} from 'vitest';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js'),source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8'),owned=new Set();
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const math=Object.assign(Object.create(Math),{random(){throw Error('Water presentation consumed gameplay RNG');}});
function region(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start);assert.ok(start>=0&&end>start,a);return s.slice(start,end);}
function track(o){owned.add(o);return o;}
function water(s=source){const scene=new T.Scene();scene.fog=new T.Fog(0x0a4a6b,5,42);const backdrop=new Function('THREE','scene','Math',region(s,'        // ─── Water column backdrop','        // Surface sheet:')+';return backdrop;')(T,scene,math);track(backdrop.geometry);track(backdrop.material);return{scene,backdrop};}
function bytes(a){return Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength);}
afterEach(()=>{owned.forEach(o=>o.dispose());owned.clear();});
describe('Water column continuity',()=>{
 it('matches the initial fog before any active simulation tick',()=>{const {scene,backdrop}=water(),bottom=backdrop.material.uniforms.bottomColor.value;assert.deepEqual(bottom.toArray(),scene.fog.color.toArray());assert.notEqual(bottom,scene.fog.color);const old=bottom.toArray();scene.fog.color.setHex(0x123456);assert.deepEqual(bottom.toArray(),old);});
 it('follows the rendered camera while the simulation and its palette remain frozen',()=>{
  const {scene,backdrop}=water(),camera=new T.PerspectiveCamera(70,1,.1,200),g=backdrop.geometry,m=backdrop.material,uniforms=m.uniforms,matrix=backdrop.matrixWorld,position=backdrop.position,palette=JSON.stringify(uniforms),original=Object.fromEntries(Object.entries(g.attributes).map(([n,a])=>[n,{a,array:a.array,bytes:bytes(a)}]));
  for(const point of [[0,3,-4],[250,8,-190],[-410,-45,130],[0,18,0]]){camera.position.set(...point);camera.lookAt(point[0]+1,point[1]+.5,point[2]-1);camera.updateMatrixWorld(true);backdrop.onBeforeRender(null,scene,camera);assert.deepEqual(backdrop.position.toArray(),point);assert.deepEqual(new T.Vector3().setFromMatrixPosition(backdrop.matrixWorld).toArray(),point);assert.deepEqual(backdrop.quaternion.toArray(),[0,0,0,1]);assert.equal(backdrop.geometry,g);assert.equal(backdrop.material,m);assert.equal(backdrop.material.uniforms,uniforms);assert.equal(backdrop.matrixWorld,matrix);assert.equal(backdrop.position,position);assert.equal(JSON.stringify(uniforms),palette);for(const [n,a]of Object.entries(original)){assert.equal(g.attributes[n],a.a);assert.equal(a.a.array,a.array);assert.ok(bytes(a.a).equals(a.bytes));}}
 });
 it('retains the existing sphere geometry and one draw with no textures or added scene objects',()=>{
  const {scene,backdrop}=water(),old=track(new T.SphereGeometry(150,24,16));assert.equal(scene.children.length,1);assert.equal(scene.children[0],backdrop);assert.deepEqual(Object.keys(backdrop.geometry.attributes),Object.keys(old.attributes));for(const n of Object.keys(old.attributes))assert.ok(bytes(backdrop.geometry.attributes[n]).equals(bytes(old.attributes[n])));assert.ok(bytes(backdrop.geometry.index).equals(bytes(old.index)));assert.equal(backdrop.material.type,'ShaderMaterial');assert.equal(backdrop.material.side,T.BackSide);assert.equal(backdrop.material.depthWrite,false);assert.equal(backdrop.material.fog,false);assert.equal(backdrop.renderOrder,-10);assert.equal(backdrop.frustumCulled,false);assert.deepEqual(Object.keys(backdrop.material.uniforms),['topColor','bottomColor']);assert.ok(!Object.values(backdrop.material).some(v=>v?.isTexture));
 });
 it('fades only additive caustic radiance while retaining native map, color and output processing',()=>{
  const text=region(source,'        function fadeCLHuntCausticFog(','        var causticsMat='),shade=new Function(text+';return fadeCLHuntCausticFog;')(),shader={fragmentShader:T.ShaderLib.basic.fragmentShader,vertexShader:T.ShaderLib.basic.vertexShader,uniforms:{}},old=shader.vertexShader;shade(shader);assert.equal(shader.vertexShader,old);assert.deepEqual(shader.uniforms,{});for(const chunk of ['color_fragment','map_fragment','tonemapping_fragment','encodings_fragment','fog_pars_fragment'])assert.ok(shader.fragmentShader.includes('#include <'+chunk+'>'));assert.ok(!shader.fragmentShader.includes('#include <fog_fragment>'));assert.ok(shader.fragmentShader.includes('gl_FragColor.rgb*=clWaterVisibility;'));assert.ok(!shader.fragmentShader.includes('\\n'));assert.equal((shader.fragmentShader.match(/texture2D\(/g)||[]).length,(T.ShaderLib.basic.fragmentShader.match(/texture2D\(/g)||[]).length);
 });
 it('reverses exactly to pass44 and leaves gameplay, world generation and randomness unchanged',()=>{
  const {restorePass45Source}=require('./helpers/cephalopod_pass45_reference.cjs'),pass45=restorePass46Source(restorePass47Source(source)),prior=restorePass45Source(pass45);assert.equal(createHash('sha256').update(prior).digest('hex'),'d93976fa207ae4fade26d361453042c2a8d0216f18c1c3932dcfac15eda3aed7');assert.deepEqual(pass45.split('\n').filter(l=>l.includes('Math.random')),prior.split('\n').filter(l=>l.includes('Math.random')));
  // This historical camera region predates the accepted Pass54 Hunt camera
  // and Pass57 selection changes; compare it after the exact later-pass reversals.
  assert.equal(region(pass45,'        function updateDiveCamera(','        var lastTime = performance.now();'),region(prior,'        function updateDiveCamera(','        var lastTime = performance.now();'));
  // Pass74 later re-keys the rock mineral program inside the rock region; compare at pass45 likewise.
  for(const [a,b]of [['        var rocks = [];','        // ─── Curved branching coral colonies'],['            gameState.dayTime = ((','            // ─── Pressure strain']])assert.equal(region(pass45,a,b),region(prior,a,b));
 });
 it('owns and disposes independent static water resources once',()=>{const a=water().backdrop,b=water().backdrop,counts=[0,0];assert.notEqual(a.geometry,b.geometry);assert.notEqual(a.material,b.material);assert.notEqual(a.material.uniforms.bottomColor.value,b.material.uniforms.bottomColor.value);[a,b].forEach((o,i)=>{o.geometry.addEventListener('dispose',()=>counts[i]++);o.material.addEventListener('dispose',()=>counts[i]++);});a.geometry.dispose();a.material.dispose();owned.delete(a.geometry);owned.delete(a.material);assert.deepEqual(counts,[2,0]);assert.equal(b.geometry.attributes.position.count,425);});
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
