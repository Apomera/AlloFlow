import {it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_TERMINAL_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
// The former compact-terminal caller is a frozen reference for placement,
// digit classification, and resource comparisons with the same native fan.
const newCaller='                    var hoof = new THREE.Mesh(dinoBluntTerminalGeometry(THREE, padX * 0.19, Math.max(0.010 * detailScale, padHeight * 0.16), padZ / Math.max(4.0, digitCount * 1.10)), keratinMat);\n' +
 '                    hoof.position.copy(hoofCenter); hoof.castShadow = true; model.add(hoof);\n';
const oldCaller='                    var hoof = addEllipsoid(hoofCenter, vec(padX * 0.19, Math.max(0.010 * detailScale, padHeight * 0.16), padZ / Math.max(4.0, digitCount * 1.10)), keratinMat);\n';
if(source.split(newCaller).length!==2)throw Error('Native blunt-terminal caller not found.');
const before=source.replace(newCaller,oldCaller);
const helperStart = source.indexOf('  function dinoBluntTerminalGeometry(');
const helperEnd = source.indexOf('  // Seven swept fibers',helperStart);
const terminal = new Function(source.slice(helperStart,helperEnd)+'\nreturn dinoBluntTerminalGeometry;')();
const reports = [];
function check(name, fn) { it(name,fn); }
const near = (a,b,tolerance=1e-6) => assert.ok(Math.abs(a-b)<tolerance,`${a} differs from ${b}`);
function geometryContract(rx,ry,rz) {
 const g = terminal(THREE,rx,ry,rz), p=g.attributes.position,n=g.attributes.normal,idx=g.index.array;
 assert.equal(p.count,194); assert.equal(idx.length/3,384); assert.equal(g.attributes.uv.count,p.count);
 const vertices=[],edges=new Map();let volume=0,minArea=Infinity,minOut=Infinity,soleFaces=0;
 for(let i=0;i<p.count;i++) {
  const v=new THREE.Vector3().fromBufferAttribute(p,i), normal=new THREE.Vector3().fromBufferAttribute(n,i);vertices.push(v);
  assert.ok([...v.toArray(),...normal.toArray(),g.attributes.uv.getX(i),g.attributes.uv.getY(i)].every(Number.isFinite));near(normal.length(),1,1e-5);
  assert.ok(Math.abs(v.x)<=rx*1.000001 && Math.abs(v.y)<=ry*1.000001 && Math.abs(v.z)<=rz*1.000001);
  assert.ok(g.boundingBox.containsPoint(v));assert.ok(v.distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius*(1+1e-6));
 }
 for(let i=0;i<idx.length;i+=3) {
  const [a,b,c]=[idx[i],idx[i+1],idx[i+2]],va=vertices[a],vb=vertices[b],vc=vertices[c];
  const normal=vb.clone().sub(va).cross(vc.clone().sub(va)),center=va.clone().add(vb).add(vc).multiplyScalar(1/3);
  minArea=Math.min(minArea,normal.length());minOut=Math.min(minOut,normal.dot(center));assert.ok(normal.length()>rx*ry*rz*1e-10);assert.ok(normal.dot(center)>0);
  if([va,vb,vc].every(v=>Math.abs(v.y+ry)<ry*1e-5)){soleFaces++;assert.ok(normal.y<0);}
  volume+=va.dot(vb.clone().cross(vc))/6;
  for(const [from,to] of [[a,b],[b,c],[c,a]]) {const low=Math.min(from,to),key=low+':'+Math.max(from,to),value=edges.get(key)||{count:0,balance:0};value.count++;value.balance+=from===low?1:-1;edges.set(key,value);}
 }
 for(const edge of edges.values()){assert.equal(edge.count,2);assert.equal(edge.balance,0);}assert.equal(p.count-edges.size+idx.length/3,2);assert.ok(volume>0);assert.equal(soleFaces,24);
 near(g.boundingBox.min.x,-rx);near(g.boundingBox.max.x,rx);near(g.boundingBox.min.y,-ry);near(g.boundingBox.max.y,ry);near(g.boundingBox.min.z,-rz);near(g.boundingBox.max.z,rz);
 g.dispose();return {radiusX:rx,radiusY:ry,radiusZ:rz,vertices:p.count,triangles:idx.length/3,volume,minArea,minOut,soleFaces};
}
const geometry=[];
for(const scale of [.03,1,12])check('closed finite bounded terminal at scale '+scale,()=>geometry.push(geometryContract(.08*scale,.02*scale,.045*scale)));
for(const bad of [[0,.02,.03],[-.01,.02,.03],[.01,NaN,.03],[.01,.02,Infinity]])check('reject invalid radii '+String(bad),()=>assert.equal(terminal(THREE,...bad),null));
function nativeFan(text,dn,front,showBody=true) {
 const a=text.indexOf('            function addSoftTissueDigitFan('),b=text.indexOf('            function surfaceAnchor(',a);
 const start=text.indexOf('  function dinoFootSurfaceProfileFor('),end=text.indexOf('  // Rounded dorsal contour',start);
 const profileFor=new Function(text.slice(start,end)+'\nreturn dinoFootSurfaceProfileFor;')();
 const model=new THREE.Group(),mat=new THREE.MeshStandardMaterial(),anchors=[],skeletal={weightBearingForelimbs:true,hoofedDigits:true,manualDigits:5,pedalDigits:4,manualUnguals:0,pedalUnguals:0};
 const factory=new Function('THREE','props','skeletalProfile','dinoFootSurfaceProfileFor','dn','detailScale','len','ht','isSauropod','bodyDepth','vec','dinoPlantarGeometry','headMat','keratinMat','model','tagDistalSurface','addBodyPartAnchor','dinoIguanodontThumbEnabled','addEllipsoid','addKeratinCone','dinoBluntTerminalGeometry','dinoCompactFootGeometry','dinoCompactDigitGeometry',text.slice(a,b)+'\nreturn addSoftTissueDigitFan;');
 const plantarStart=text.indexOf('  function dinoPlantarGeometry('),plantarEnd=text.indexOf('\n  function ',plantarStart+10);
 const plantar=new Function(text.slice(plantarStart,plantarEnd)+'\nreturn dinoPlantarGeometry;')();
 const compactFootStart=text.indexOf('  function dinoCompactFootGeometry('),compactFootEnd=text.indexOf('\n  function ',compactFootStart+10);
 const compactDigitStart=text.indexOf('  function dinoCompactDigitGeometry('),compactDigitEnd=text.indexOf('\n  function ',compactDigitStart+10);
 const compactFoot=new Function('dinoPlantarGeometry',text.slice(compactFootStart,compactFootEnd)+'\nreturn dinoCompactFootGeometry;')(plantar);
 const compactDigit=new Function('dinoBluntTerminalGeometry',text.slice(compactDigitStart,compactDigitEnd)+'\nreturn dinoCompactDigitGeometry;')(terminal);
 const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
 const addEllipsoid=(center,scale,material)=>{const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,36,24),material);mesh.position.copy(center);mesh.scale.copy(scale);mesh.castShadow=true;model.add(mesh);return mesh;};
 const fan=factory(THREE,{showBody},skeletal,profileFor,dn,1,8,3,false,.8,vec,plantar,mat,mat,model,(mesh,f,s,ids,feature)=>{mesh.userData={dinoFeature:feature,dinoPartIds:ids,dinoSide:s,dinoParentBodyPart:f?'hand':'foot'};return mesh;},(id,anchor)=>anchors.push({id,anchor:anchor.toArray()}),()=>false,addEllipsoid,()=>{throw Error('Unexpected pointed claw')},terminal,compactFoot,compactDigit);
 fan(vec(0,.03,.2),front,1,1);model.updateMatrixWorld(true);
 return {model,mat,anchors,cleanup(){model.traverse(part=>part.geometry?.dispose());mat.dispose();}};
}
const native=[];
for(const front of [true,false])check('native compact '+(front?'manus':'pes')+' retains counts centers bounds and resource classes',()=>{
 const old=nativeFan(before,{group:'ornithischian',clade:'Ceratopsidae'},front),next=nativeFan(source,{group:'ornithischian',clade:'Ceratopsidae'},front);
 const oldNails=old.model.children.filter(x=>x.userData.dinoFeature==='hoof-like-terminal'),nails=next.model.children.filter(x=>x.userData.dinoFeature==='hoof-like-terminal');
 assert.equal(oldNails.length,front?5:4);assert.equal(nails.length,oldNails.length);assert.equal(next.model.children.length,old.model.children.length);assert.deepEqual(next.anchors,old.anchors);
 for(let i=0;i<nails.length;i++) {
  const nail=nails[i],prior=oldNails[i];assert.deepEqual(nail.position.toArray(),prior.position.toArray());assert.deepEqual(nail.userData,prior.userData);assert.equal(nail.material,next.mat);assert.equal(nail.castShadow,true);assert.equal(nail.parent,next.model);
  const box=new THREE.Box3().setFromObject(nail),priorBox=new THREE.Box3().setFromObject(prior);
  for(const key of ['min','max'])for(const axis of ['x','y','z'])near(box[key][axis],priorBox[key][axis]);
  assert.ok(box.min.y>0,'terminal crossed established floor');assert.ok(nail.geometry.index.count<prior.geometry.index.count);
 }
 native.push({front,digits:nails.length,meshCount:next.model.children.length,priorTriangles:oldNails[0].geometry.index.count/3,newTriangles:nails[0].geometry.index.count/3});old.cleanup();next.cleanup();
});
check('hidden body keeps the native gate',()=>{const r=nativeFan(source,{group:'ornithischian',clade:'Ceratopsidae'},true,false);assert.equal(r.model.children.length,0);assert.equal(r.anchors.length,0);r.cleanup();});
