const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const checkerSHA256=sha(fs.readFileSync(__filename));
const before=fs.readFileSync(path.join(work,'before.js'),'utf8'),candidate=fs.readFileSync(path.join(work,'candidate.js'),'utf8');
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
const weldedShell=new Function('THREE','point',weldedCode+'\nreturn weldedShell;')(THREE,point);
global.window={};
function capture(code){let config;window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(code)();return config;}
const oldConfig=capture(before),newConfig=capture(candidate);
const cameraConfig=config=>JSON.parse(JSON.stringify(config,(key,value)=>key==='buildScene'?'[buildScene]':typeof value==='function'?String(value):value));
equal(cameraConfig(newConfig),cameraConfig(oldConfig),'all viewer cameras and parts remain exact');
const cases=['adult','child','infant'].flatMap(age=>[0,5,8].map(phase=>({age,phase,contrast:false}))).concat(['adult','child','infant'].map(age=>({age,phase:8,contrast:true})));
function model(config,settings){
 const allocatedGeometries=[],allocatedMaterials=[],tracked={...THREE};
 for(const key of Object.keys(THREE)){if(typeof THREE[key]!=='function')continue;const values=/Geometry$/.test(key)?allocatedGeometries:/Material$/.test(key)?allocatedMaterials:null;if(values)tracked[key]=new Proxy(THREE[key],{construct(target,args){const result=Reflect.construct(target,args);values.push(result);return result;}});}
 const {age,phase,contrast}=settings,scene=new THREE.Scene();
 const content=config.buildScene(tracked,{scene,phase,dark:true,contrast,wantShadow:false,trim:(color,shininess)=>new tracked.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688}),sceneProps:{age,tab:'recovery',recoveryGuides:true}});
 const sample=()=>{content.frame(0,{},true);scene.updateMatrixWorld(true);};sample();
 const neck=scene.getObjectByName('fr-manikin-neck');assert.ok(neck);
 return {scene,content,neck,sample,allocatedGeometries,allocatedMaterials};
}
function resources(model){const geometries=new Set(model.allocatedGeometries),materials=new Set(model.allocatedMaterials);model.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)materials.add(m);});return{geometries,materials};}
function disposeOnce(model){const {geometries,materials}=resources(model),events=new Map();for(const resource of [...geometries,...materials]){events.set(resource,0);resource.addEventListener('dispose',()=>events.set(resource,events.get(resource)+1));}for(const resource of events.keys())resource.dispose();equal([...events.values()],[...events.keys()].map(()=>1),'each unique geometry and material disposes exactly once');return{geometries:geometries.size,materials:materials.size,allocatedGeometries:model.allocatedGeometries.length,allocatedMaterials:model.allocatedMaterials.length};}
function parameters(material){const value={};for(const key of ['type','name','transparent','opacity','depthTest','depthWrite','side','shininess','wireframe','vertexColors','flatShading','alphaTest','blending','blendSrc','blendDst','blendEquation','premultipliedAlpha','dithering','toneMapped','fog','polygonOffset','polygonOffsetFactor','polygonOffsetUnits','linewidth','dashSize','gapSize','scale'])if(material[key]!==undefined)value[key]=material[key];for(const key of ['color','specular','emissive'])if(material[key])value[key]=material[key].toArray();value.userData=material.userData;value.onBeforeCompile=String(material.onBeforeCompile);value.customProgramCacheKey=material.customProgramCacheKey();return value;}
function fingerprint(model){const hash=crypto.createHash('sha256'),geoIds=new Map(),matIds=new Map();const identity=(map,o)=>{if(!map.has(o))map.set(o,map.size);return map.get(o);};let nodes=0,meshes=0;
 function visit(o,location){if(o.name==='fr-manikin-neck')return;nodes++;if(o.isMesh)meshes++;hash.update(JSON.stringify([location,o.type,o.name,o.visible,o.matrix.toArray(),o.matrixWorld.toArray(),o.castShadow,o.receiveShadow,o.renderOrder,o.layers.mask]));if(o.geometry){const g=o.geometry;hash.update(JSON.stringify([identity(geoIds,g),g.type,g.drawRange,g.groups]));for(const key of Object.keys(g.attributes).sort()){const a=g.attributes[key],b=a.array;hash.update(JSON.stringify([key,a.itemSize,a.normalized,b.constructor.name]));hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}if(g.index){const b=g.index.array;hash.update(b.constructor.name);hash.update(Buffer.from(b.buffer,b.byteOffset,b.byteLength));}}if(o.material)hash.update(JSON.stringify((Array.isArray(o.material)?o.material:[o.material]).map(m=>[identity(matIds,m),parameters(m)])));o.children.forEach((child,i)=>visit(child,location+'.'+i));}
 visit(model.scene,'scene');hash.update(JSON.stringify({meshKeys:Object.keys(model.content.meshes).sort(),picks:model.content.picks.map(o=>o.name),inspection:Object.fromEntries(Object.entries(model.content.meshes).filter(([,o])=>o.userData?.inspection).map(([key,o])=>[key,o.userData.inspection]))}));
 // Include all direct material allocations, including hidden or prepared finishes.
 hash.update(JSON.stringify(model.allocatedMaterials.map(m=>[identity(matIds,m),parameters(m)])));
 return {SHA256:hash.digest('hex'),nodes,meshes,geometries:geoIds.size,materials:matIds.size,allocatedGeometries:model.allocatedGeometries.length,allocatedMaterials:model.allocatedMaterials.length};}
function shell(model){const neck=model.neck,p=neck.geometry.attributes.position,n=neck.geometry.attributes.normal,s=weldedShell(neck);check(s.finite,'finite neck positions and normals');check(s.connected,'connected closed neck shell');equal(s.euler,2,'neck shell retains genus zero');check([...s.edges.values()].every(e=>e.count===2&&e.balance===0),'closed neck triangle winding');check(s.volume>0,'outward signed neck volume');check(s.minimumFaceNormalDot>0,'all neck vertex normals agree with outward faces');check(s.minimumNormalLength>.9999&&s.maximumNormalLength<1.0001,'unit finite neck normals');
 const {radialSegments,heightSegments}=neck.geometry.parameters;equal(radialSegments,24,'radial segment count');equal(heightSegments,16,'height segment count');let seamMinimumNormalDot=1,seamMaximumPositionGap=0;
 for(let row=0;row<=heightSegments;row++){const a=row*(radialSegments+1),b=a+radialSegments;const gap=point(neck,a).distanceTo(point(neck,b)),dot=new THREE.Vector3().fromBufferAttribute(n,a).dot(new THREE.Vector3().fromBufferAttribute(n,b));seamMaximumPositionGap=Math.max(seamMaximumPositionGap,gap);seamMinimumNormalDot=Math.min(seamMinimumNormalDot,dot);check(gap<1e-8,'neck side seam vertices coincide');check(dot>.9999,'neck side seam normals meet smoothly');}
 return {vertices:p.count,triangles:neck.geometry.index.count/3,euler:s.euler,volume:s.volume,minimumFaceNormalDot:s.minimumFaceNormalDot,minimumNormalLength:s.minimumNormalLength,maximumNormalLength:s.maximumNormalLength,seamMinimumNormalDot,seamMaximumPositionGap};}
function actualInside(world,target,scale){
 const box=new THREE.Box3().setFromObject(target),distance=box.getSize(new THREE.Vector3()).length()+scale;
 const directions=[new THREE.Vector3(.271,.713,.647).normalize(),new THREE.Vector3(.841,.193,.505).normalize(),new THREE.Vector3(.397,.884,.247).normalize()];
 const material=target.material,savedSide=material.side;material.side=THREE.DoubleSide;
 try{for(let attempt=0;attempt<directions.length;attempt++){
  const direction=directions[attempt],origin=world.clone().addScaledVector(direction,-distance);check(!box.containsPoint(origin),'containment ray origin lies outside actual target bounds');
  const hits=new THREE.Raycaster(origin,direction).intersectObject(target,false),unique=[];
  for(const hit of hits)if(!unique.length||Math.abs(hit.distance-unique.at(-1).distance)>1e-8*scale)unique.push(hit);
  if(unique.length%2)continue;
  for(let i=0;i<unique.length;i+=2){const entry=unique[i],exit=unique[i+1];if(entry.distance<distance&&exit.distance>distance){return{inside:true,entryMargin:(distance-entry.distance)/scale,exitMargin:(exit.distance-distance)/scale,entryFace:entry.faceIndex,exitFace:exit.faceIndex,attempt};}}
  if(attempt===directions.length-1)return{inside:false,intersections:unique.map(hit=>({distance:hit.distance/scale,face:hit.faceIndex})),pointDistance:distance/scale};
 }return{inside:false,oddIntersections:true};}finally{material.side=savedSide;}
}
function capSamples(neck,end){const geometry=neck.geometry,radial=geometry.parameters.radialSegments,height=geometry.parameters.heightSegments,group=geometry.groups[end==='head'?1:2];equal(group.materialIndex,end==='head'?1:2,'native cylinder cap group');const indices=geometry.index.array,ids=new Set(Array.from(indices.slice(group.start,group.start+group.count)));const ring=(end==='head'?0:height)*(radial+1),samples=[];
 for(const id of ids)samples.push({kind:'capVertex',index:id,local:point(neck,id)});
 for(let i=0;i<=radial;i++)samples.push({kind:'perimeterVertex',index:ring+i,local:point(neck,ring+i)});
 for(let i=group.start;i<group.start+group.count;i+=3)samples.push({kind:'capTriangleCentroid',triangle:i/3,local:point(neck,indices[i]).add(point(neck,indices[i+1])).add(point(neck,indices[i+2])).divideScalar(3)});
 return samples;
}
function caps(model,settings){const results=[];const neck=model.neck,scale=neck.parent.getWorldScale(new THREE.Vector3()).x;
 for(const end of ['head','torso']){const target=model.scene.getObjectByName(end==='head'?'fr-manikin-head':'fr-manikin-torso'),samples=capSamples(neck,end),margins=[],outside=[];check(!!target,'actual '+end+' target exists');
  for(const sample of samples){const world=sample.local.clone().applyMatrix4(neck.matrixWorld),inside=actualInside(world,target,scale);if(!inside.inside||Math.min(inside.entryMargin,inside.exitMargin)<=1e-7)outside.push({kind:sample.kind,index:sample.index,triangle:sample.triangle,world:world.toArray(),...inside});else margins.push(Math.min(inside.entryMargin,inside.exitMargin));}
  const metric={...settings,end,target:target.name,samples:samples.length,capVertices:samples.filter(s=>s.kind==='capVertex').length,perimeterVertices:samples.filter(s=>s.kind==='perimeterVertex').length,triangleCentroids:samples.filter(s=>s.kind==='capTriangleCentroid').length,inside:samples.length-outside.length,outside:outside.length,minimumRayIntervalMargin:margins.length?Math.min(...margins):null,failures:outside};results.push(metric);
 }
 return results;
}
const results=[];let failure=false;
for(const settings of cases){const started=Date.now(),count=assertions;let oldModel,newModel,metric,error;
 try{newModel=model(newConfig,settings);const capMetrics=caps(newModel,settings);metric={...settings,caps:capMetrics};for(const cap of capMetrics)check(cap.outside===0,`${settings.age} pose${settings.phase} ${cap.end}: ${cap.outside}/${cap.samples} actual cap/perimeter/centroid samples leave ${cap.target}`);
  if(mode!=='early'){metric.shell=shell(newModel);oldModel=model(oldConfig,settings);const oldValue=fingerprint(oldModel),newValue=fingerprint(newModel);equal(newValue,oldValue,'all buffers/transforms/materials/head-rest/cheek metadata outside neck remain exact');metric.outsideNeck=oldValue;equal(parameters(newModel.neck.material),parameters(oldModel.neck.material),'neck finish unchanged');equal(Array.from(newModel.neck.geometry.index.array),Array.from(oldModel.neck.geometry.index.array),'neck cap and side triangle connectivity unchanged');equal(Array.from(newModel.neck.geometry.attributes.uv.array),Array.from(oldModel.neck.geometry.attributes.uv.array),'neck UVs unchanged');equal(newModel.neck.geometry.groups,oldModel.neck.geometry.groups,'neck native cap groups unchanged');equal(newModel.neck.geometry.drawRange,oldModel.neck.geometry.drawRange,'neck draw range unchanged');
   const refs={geometry:newModel.neck.geometry,material:newModel.neck.material,attributes:Object.fromEntries(Object.entries(newModel.neck.geometry.attributes).map(([key,a])=>[key,[a,a.array]])),index:newModel.neck.geometry.index,indexArray:newModel.neck.geometry.index.array,geometries:newModel.allocatedGeometries.length,materials:newModel.allocatedMaterials.length};newModel.sample();newModel.sample();equal(fingerprint(newModel),newValue,'repeated frames preserve every outside-neck resource');check(newModel.neck.geometry===refs.geometry&&newModel.neck.material===refs.material,'stable neck geometry/material identity');for(const [key,[attribute,array]]of Object.entries(refs.attributes))check(newModel.neck.geometry.attributes[key]===attribute&&attribute.array===array,'stable neck '+key+' buffer');check(newModel.neck.geometry.index===refs.index&&newModel.neck.geometry.index.array===refs.indexArray,'stable neck index identities');equal([newModel.allocatedGeometries.length,newModel.allocatedMaterials.length],[refs.geometries,refs.materials],'no new allocations during frames');
  }
 }catch(problem){error=problem.stack;failure=true;}finally{if(newModel)metric={...(metric||settings),resources:disposeOnce(newModel)};if(oldModel){const oldResources=disposeOnce(oldModel);equal(metric.resources,oldResources,'unique resource counts unchanged');}}
 const result={...metric,status:error?'failed':'passed',checks:assertions-count,durationMs:Date.now()-started,...(error?{error}:{})};results.push(result);console.log(JSON.stringify({age:settings.age,phase:settings.phase,contrast:settings.contrast,status:result.status,caps:result.caps?.map(({end,outside,samples,minimumRayIntervalMargin})=>({end,outside,samples,minimumRayIntervalMargin})),error:error?.split('\n')[0]}));if(error&&mode==='early')break;
}
const output={mode,checkerSHA256,beforeSHA256:sha(before),candidateSHA256:sha(candidate),reusedShellFixture:{file:fixtureFile,SHA256:sha(fixture),shellHelperSHA256:sha(weldedCode)},assertions,results,passed:results.filter(r=>r.status==='passed').length,failed:results.filter(r=>r.status==='failed').length};
fs.writeFileSync(path.join(work,'verification-'+mode+'.json'),JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({mode,checkerSHA256,candidateSHA256:sha(candidate),assertions,passed:output.passed,failed:output.failed}));if(failure)process.exitCode=1;
