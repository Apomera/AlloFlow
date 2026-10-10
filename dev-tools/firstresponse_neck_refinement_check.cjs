const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),work=process.argv[4]?path.resolve(process.argv[4]):path.join(repo,'reports/firstresponse-neck-transition');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const checkerSHA256=sha(fs.readFileSync(__filename));
const rawCurrentSource=fs.readFileSync(path.join(repo,'stem_lab/stem_tool_firstresponse.js'),'utf8');
// Preserve this historical neck comparison; the raw collar audit verifies current torso geometry.
const candidate=require(path.join(repo,'tests/helpers/firstresponse_collar_refinement_delta.cjs')).revertCollarRefinement(rawCurrentSource);
const before=require(path.join(repo,'tests/helpers/firstresponse_neck_refinement_delta.cjs')).revertNeckRefinement(candidate);
assert.equal(sha(before),'24dbe22375df2c8c3e7739d00d4621f4cc2c1e4db68d2bb05dfd15cca56c8a8a');
if(process.argv[3])assert.equal(sha(candidate),process.argv[3]);
const mode=process.argv[2]||'full',THREE={};
new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
let assertions=0;
function check(condition,message){assertions++;assert.ok(condition,message);}
function equal(a,b,message){assertions++;assert.deepEqual(a,b,message);}
const point=(mesh,index)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index);
const fixtureFile='tests/firstresponse_ear_folds.test.js',fixture=fs.readFileSync(path.join(repo,fixtureFile),'utf8');
const weldedCode=fixture.slice(fixture.indexOf('function vertexKey(position)'),fixture.indexOf('function materialState(material)'));
assert.ok(weldedCode.startsWith('function vertexKey(position)')&&weldedCode.includes('function weldedShell(mesh)'));
const {model,resources,disposeOnce,shell,caps}=require(path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')).createNeckMeshChecks(THREE,check,equal);
const meshHelperSHA256=sha(fs.readFileSync(path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')));
global.window={};
function capture(code){let config;window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(code)();return config;}
const oldConfig=capture(before),newConfig=capture(candidate);
const cameraConfig=config=>JSON.parse(JSON.stringify(config,(key,value)=>key==='buildScene'?'[buildScene]':typeof value==='function'?String(value):value));
equal(cameraConfig(newConfig),cameraConfig(oldConfig),'all viewer cameras and parts remain exact');
const cases=['adult','child','infant'].flatMap(age=>[0,5,8].map(phase=>({age,phase,contrast:false}))).concat(['adult','child','infant'].map(age=>({age,phase:8,contrast:true})));
function parameters(material){const value={};for(const key of ['type','name','transparent','opacity','depthTest','depthWrite','side','shininess','wireframe','vertexColors','flatShading','alphaTest','blending','blendSrc','blendDst','blendEquation','premultipliedAlpha','dithering','toneMapped','fog','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','linewidth','dashSize','gapSize','scale'])if(material[key]!==undefined)value[key]=material[key];for(const key of ['color','specular','emissive'])if(material[key])value[key]=material[key].toArray();value.userData=material.userData;value.onBeforeCompile=String(material.onBeforeCompile);value.customProgramCacheKey=material.customProgramCacheKey();return value;}
function fingerprint(model){const hash=crypto.createHash('sha256'),geoIds=new Map(),matIds=new Map();const identity=(map,o)=>{if(!map.has(o))map.set(o,map.size);return map.get(o);};let nodes=0,meshes=0;
 function visit(o,location){if(o.name==='fr-manikin-neck')return;nodes++;if(o.isMesh)meshes++;hash.update(JSON.stringify([location,o.type,o.name,o.visible,o.matrix.toArray(),o.matrixWorld.toArray(),o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask]));if(o.geometry){const g=o.geometry;hash.update(JSON.stringify([identity(geoIds,g),g.type,g.drawRange,g.groups]));for(const key of Object.keys(g.attributes).sort()){const a=g.attributes[key],b=a.array;hash.update(JSON.stringify([key,a.itemSize,a.normalized,b.constructor.name]));hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}if(g.index){const b=g.index.array;hash.update(b.constructor.name);hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}}if(o.material)hash.update(JSON.stringify((Array.isArray(o.material)?o.material:[o.material]).map(m=>[identity(matIds,m),parameters(m)])));o.children.forEach((child,i)=>visit(child,location+'.'+i));}
 visit(model.scene,'scene');hash.update(JSON.stringify({meshKeys:Object.keys(model.content.meshes).sort(),picks:model.content.picks.map(o=>o.name),inspection:Object.fromEntries(Object.entries(model.content.meshes).filter(([,o])=>o.userData?.inspection).map(([key,o])=>[key,o.userData.inspection]))}));
 // Include all direct material allocations, including hidden or prepared finishes.
 hash.update(JSON.stringify(model.allocatedMaterials.map(m=>[identity(matIds,m),parameters(m)])));
 return {SHA256:hash.digest('hex'),nodes,meshes,geometries:geoIds.size,materials:matIds.size,allocatedGeometries:model.allocatedGeometries.length,allocatedMaterials:model.allocatedMaterials.length};}

const results=[];let failure=false;
for(const settings of cases){const started=Date.now(),count=assertions;let oldModel,newModel,metric,error;
 try{newModel=model(newConfig,settings);const capMetrics=caps(newModel,settings);metric={...settings,caps:capMetrics};for(const cap of capMetrics)check(cap.outside===0,`${settings.age} pose${settings.phase} ${cap.end}: ${cap.outside}/${cap.samples} actual cap/perimeter/centroid samples leave ${cap.target}`);
  if(mode!=='early'){metric.shell=shell(newModel);oldModel=model(oldConfig,settings);const oldValue=fingerprint(oldModel),newValue=fingerprint(newModel);equal(newValue,oldValue,'all buffers/transforms/materials/head-rest/cheek metadata outside neck remain exact');metric.outsideNeck=oldValue;equal(parameters(newModel.neck.material),parameters(oldModel.neck.material),'neck finish unchanged');equal(Array.from(newModel.neck.geometry.index.array),Array.from(oldModel.neck.geometry.index.array),'neck cap and side triangle connectivity unchanged');equal(Array.from(newModel.neck.geometry.attributes.uv.array),Array.from(oldModel.neck.geometry.attributes.uv.array),'neck UVs unchanged');equal(newModel.neck.geometry.groups,oldModel.neck.geometry.groups,'neck native cap groups unchanged');equal(newModel.neck.geometry.drawRange,oldModel.neck.geometry.drawRange,'neck draw range unchanged');
   const refs={geometry:newModel.neck.geometry,material:newModel.neck.material,attributes:Object.fromEntries(Object.entries(newModel.neck.geometry.attributes).map(([key,a])=>[key,[a,a.array]])),index:newModel.neck.geometry.index,indexArray:newModel.neck.geometry.index.array,geometries:newModel.allocatedGeometries.length,materials:newModel.allocatedMaterials.length};newModel.sample();newModel.sample();equal(fingerprint(newModel),newValue,'repeated frames preserve every outside-neck resource');check(newModel.neck.geometry===refs.geometry&&newModel.neck.material===refs.material,'stable neck geometry/material identity');for(const [key,[attribute,array]]of Object.entries(refs.attributes))check(newModel.neck.geometry.attributes[key]===attribute&&attribute.array===array,'stable neck '+key+' buffer');check(newModel.neck.geometry.index===refs.index&&newModel.neck.geometry.index.array===refs.indexArray,'stable neck index identities');equal([newModel.allocatedGeometries.length,newModel.allocatedMaterials.length],[refs.geometries,refs.materials],'no new allocations during frames');
  }
 }catch(problem){error=problem.stack;failure=true;}finally{if(newModel)metric={...(metric||settings),resources:disposeOnce(newModel)};if(oldModel){const oldResources=disposeOnce(oldModel);equal(metric.resources,oldResources,'unique resource counts unchanged');}}
 const result={...metric,status:error?'failed':'passed',checks:assertions-count,durationMs:Date.now()-started,...(error?{error}:{})};results.push(result);console.log(JSON.stringify({age:settings.age,phase:settings.phase,contrast:settings.contrast,status:result.status,caps:result.caps?.map(({end,outside,samples,minimumRayIntervalMargin})=>({end,outside,samples,minimumRayIntervalMargin})),error:error?.split('\n')[0]}));if(error&&mode==='early')break;
}
const output={mode,checkerSHA256,meshHelperSHA256,rawCurrentSHA256:sha(rawCurrentSource),beforeSHA256:sha(before),candidateSHA256:sha(candidate),reusedShellFixture:{file:fixtureFile,SHA256:sha(fixture),shellHelperSHA256:sha(weldedCode)},assertions,results,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length};
fs.writeFileSync(path.join(work,'verification-'+mode+'.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({mode,checkerSHA256,candidateSHA256:sha(candidate),assertions,passed:output.passed,failed:output.failed}));if(failure)process.exitCode=1;
