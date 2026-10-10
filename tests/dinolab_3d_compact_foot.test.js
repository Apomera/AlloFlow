import {it} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source=readFileSync(process.env.DINO_COMPACT_FOOT_SOURCE||resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
function functionSource(name) {
 const start=source.indexOf('  function '+name+'('),end=source.indexOf('\n  function ',start+10);
 assert.ok(start>=0 && end>start,'Missing native helper '+name);
 return source.slice(start,end);
}
const plantar=new Function(functionSource('dinoPlantarGeometry')+'\nreturn dinoPlantarGeometry;')();
const blunt=new Function(functionSource('dinoBluntTerminalGeometry')+'\nreturn dinoBluntTerminalGeometry;')();
const compactFoot=new Function('dinoPlantarGeometry',functionSource('dinoCompactFootGeometry')+'\nreturn dinoCompactFootGeometry;')(plantar);
const compactDigit=new Function('dinoBluntTerminalGeometry',functionSource('dinoCompactDigitGeometry')+'\nreturn dinoCompactDigitGeometry;')(blunt);
const profileFor=new Function(functionSource('dinoFootSurfaceProfileFor')+'\nreturn dinoFootSurfaceProfileFor;')();
const thumbEnabled=new Function(functionSource('dinoIguanodontThumbEnabled')+'\nreturn dinoIguanodontThumbEnabled;')();
const near=(actual,expected,tolerance=1e-6)=>assert.ok(Math.abs(actual-expected)<=tolerance,actual+' differs from '+expected);

function finiteGeometry(g) {
 const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;
 assert.ok(g.boundingBox && g.boundingSphere);
 for(let i=0;i<p.count;i++) {
  const v=new THREE.Vector3().fromBufferAttribute(p,i),normal=new THREE.Vector3().fromBufferAttribute(n,i);
  assert.ok([...v.toArray(),...normal.toArray(),uv.getX(i),uv.getY(i)].every(Number.isFinite));
  assert.ok(g.boundingBox.containsPoint(v));
  assert.ok(v.distanceTo(g.boundingSphere.center)<=g.boundingSphere.radius*(1+1e-6));
  // Native plantar geometry includes collapsed pole rings. Their normals can be
  // zero, but every regular vertex must retain a unit normal.
  const length=normal.length();assert.ok(length<1e-7 || Math.abs(length-1)<1e-5);
 }
}
function exactGeometry(next,prior) {
 assert.deepEqual(Object.keys(next.attributes),Object.keys(prior.attributes));
 for(const key of Object.keys(prior.attributes))assert.deepEqual(Array.from(next.attributes[key].array),Array.from(prior.attributes[key].array));
 assert.deepEqual(Array.from(next.index.array),Array.from(prior.index.array));
 assert.deepEqual(next.boundingBox,prior.boundingBox);assert.deepEqual(next.boundingSphere,prior.boundingSphere);
 assert.deepEqual(next.userData,prior.userData);
}
for(const scale of [.03,1,12])for(const mode of ['bundled-manus','broad-pes'])it('compact '+mode+' keeps its footprint and planar sole at scale '+scale,()=>{
 const rx=.12*scale,rz=.10*scale,height=.07*scale,sole=-.023*scale;
 const prior=plantar(THREE,rx,rz,height,sole,mode),next=compactFoot(THREE,rx,rz,height,sole,mode,mode==='bundled-manus'?5:4);
 finiteGeometry(next);assert.equal(next.attributes.position.count,prior.attributes.position.count);
 assert.deepEqual(Array.from(next.index.array),Array.from(prior.index.array));
 assert.deepEqual(Array.from(next.attributes.uv.array),Array.from(prior.attributes.uv.array));
 const p=next.attributes.position,old=prior.attributes.position;let changed=0,raised=0,lowered=0;
 for(let i=0;i<p.count;i++) {
  assert.equal(p.getX(i),old.getX(i));assert.equal(p.getZ(i),old.getZ(i));
  assert.ok(p.getY(i)>=sole-1e-6*scale && p.getY(i)<=sole+height*1.35+1e-6*scale);
  if(Math.abs(old.getY(i)-sole)<height*1e-6)assert.equal(p.getY(i),old.getY(i));
  const change=p.getY(i)-old.getY(i);if(Math.abs(change)>height*1e-5)changed++;if(change>height*.02)raised++;if(change<-height*.02)lowered++;
 }
 assert.ok(changed>p.count*.15,'No substantial dorsal sculpt');assert.ok(raised>0,'No raised dorsal mound');assert.ok(lowered>0,'No lower forefoot');
 for(const edge of ['min','max'])for(const axis of ['x','z'])assert.equal(next.boundingBox[edge][axis],prior.boundingBox[edge][axis]);
 assert.equal(next.boundingBox.min.y,prior.boundingBox.min.y);
 // Ignore the native collapsed poles when checking that sculpting preserved
 // the orientation of every existing regular face.
 for(let i=0;i<next.index.count;i+=3) {
  const ids=[next.index.getX(i),next.index.getX(i+1),next.index.getX(i+2)];
  const normal=attribute=>{const [a,b,c]=ids.map(id=>new THREE.Vector3().fromBufferAttribute(attribute,id));return b.sub(a).cross(c.sub(a));};
  const before=normal(old),after=normal(p);
  if(before.length()>rx*rz*1e-8)assert.ok(before.dot(after)>0,'Dorsal deformation inverted a native face');
 }
 assert.deepEqual(next.userData.dinoPlantar,prior.userData.dinoPlantar);prior.dispose();next.dispose();
});
for(const mode of ['columnar-manus','padded-pes'])it('columnar '+mode+' remains exactly the native plantar surface',()=>{
 const prior=plantar(THREE,.15,.12,.08,-.03,mode),next=compactFoot(THREE,.15,.12,.08,-.03,mode,5);
 exactGeometry(next,prior);prior.dispose();next.dispose();
});

for(const scale of [.03,1,12])it('compact digit is finite closed outward and bounded at scale '+scale,()=>{
 const rx=.08*scale,ry=.02*scale,rz=.045*scale,prior=blunt(THREE,rx,ry,rz),g=compactDigit(THREE,rx,ry,rz);
 finiteGeometry(g);const p=g.attributes.position,n=g.attributes.normal,idx=g.index.array,vertices=[],edges=new Map();let volume=0,soleFaces=0,changed=0;
 assert.equal(p.count,194);assert.equal(idx.length/3,384);assert.deepEqual(Array.from(idx),Array.from(prior.index.array));assert.deepEqual(Array.from(g.attributes.uv.array),Array.from(prior.attributes.uv.array));
 for(let i=0;i<p.count;i++) {
  const v=new THREE.Vector3().fromBufferAttribute(p,i);vertices.push(v);near(new THREE.Vector3().fromBufferAttribute(n,i).length(),1,1e-5);
  assert.ok(Math.abs(v.x)<=rx*1.000001 && Math.abs(v.y)<=ry*1.000001 && Math.abs(v.z)<=rz*1.000001);
  if(Math.abs(prior.attributes.position.getY(i)+ry)<ry*1e-5)assert.deepEqual(v.toArray(),new THREE.Vector3().fromBufferAttribute(prior.attributes.position,i).toArray());
  if(v.distanceTo(new THREE.Vector3().fromBufferAttribute(prior.attributes.position,i))>ry*1e-5)changed++;
 }
 assert.ok(changed>p.count*.15,'Digit sculpt did not alter its crown');
 for(let i=0;i<idx.length;i+=3) {
  const [a,b,c]=[idx[i],idx[i+1],idx[i+2]],va=vertices[a],vb=vertices[b],vc=vertices[c];
  const normal=vb.clone().sub(va).cross(vc.clone().sub(va)),center=va.clone().add(vb).add(vc).multiplyScalar(1/3);
  assert.ok(normal.length()>rx*ry*rz*1e-10);assert.ok(normal.dot(center)>0,'Compact digit face is not outward');
  if([va,vb,vc].every(v=>Math.abs(v.y+ry)<ry*1e-5)){soleFaces++;assert.ok(normal.y<0);}
  volume+=va.dot(vb.clone().cross(vc))/6;
  for(const [from,to] of [[a,b],[b,c],[c,a]]) {const low=Math.min(from,to),key=low+':'+Math.max(from,to),value=edges.get(key)||{count:0,balance:0};value.count++;value.balance+=from===low?1:-1;edges.set(key,value);}
 }
 for(const edge of edges.values()){assert.equal(edge.count,2);assert.equal(edge.balance,0);}
 assert.equal(p.count-edges.size+idx.length/3,2);assert.ok(volume>0);assert.equal(soleFaces,24);
 for(const key of ['min','max'])for(const axis of ['x','y','z'])assert.equal(g.boundingBox[key][axis],prior.boundingBox[key][axis]);g.dispose();prior.dispose();
});
for(const bad of [[0,.02,.03],[-.01,.02,.03],[.01,NaN,.03],[.01,.02,Infinity]])it('compact digit rejects invalid radii '+String(bad),()=>assert.equal(compactDigit(THREE,...bad),null));

function nativeFan({dn,front,side=1,scale=1,showBody=true,skeletal={},sculpt=true}) {
 const a=source.indexOf('            function addSoftTissueDigitFan('),b=source.indexOf('            function surfaceAnchor(',a);
 assert.ok(a>=0 && b>a);
 const model=new THREE.Group(),headMat=new THREE.MeshStandardMaterial(),keratinMat=new THREE.MeshStandardMaterial(),anchors=[],calls={foot:[],digit:[]};
 const profile={weightBearingForelimbs:true,hoofedDigits:true,manualDigits:5,pedalDigits:4,manualUnguals:0,pedalUnguals:0,...skeletal};
 const vec=(x,y,z)=>new THREE.Vector3(x,y,z);
 const ellipseGeometry=(rx,ry,rz)=>{const geometry=new THREE.SphereGeometry(1,36,24);geometry.scale(rx,ry,rz);geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;};
 const addEllipsoid=(center,size,material)=>{const mesh=new THREE.Mesh(ellipseGeometry(size.x,size.y,size.z),material);mesh.position.copy(center);mesh.castShadow=true;model.add(mesh);return mesh;};
 const addKeratinCone=(start,end,radius)=>addEllipsoid(start.clone().lerp(end,.5),vec(radius,Math.max(radius,start.distanceTo(end)*.5),radius),keratinMat);
 const addSoftTissueCylinder=(start,end,rx,rz,material)=>addEllipsoid(start.clone().lerp(end,.5),vec(start.distanceTo(end)*.5,rx,rz),material);
 const tag=(mesh,f,s,ids,feature)=>{mesh.userData={...mesh.userData,dinoFeature:feature,dinoPartIds:ids,dinoBodyPart:ids[0],dinoSide:s,dinoParentBodyPart:f?'hand':'foot'};return mesh;};
 const foot=(...args)=>{calls.foot.push(args.slice(1));return sculpt?compactFoot(...args):plantar(...args);};
 const digit=(...args)=>{calls.digit.push(args.slice(1));return sculpt?compactDigit(...args):ellipseGeometry(...args.slice(1));};
 const names=['THREE','props','skeletalProfile','dinoFootSurfaceProfileFor','dn','detailScale','len','ht','isSauropod','bodyDepth','vec','dinoPlantarGeometry','headMat','keratinMat','model','tagDistalSurface','addBodyPartAnchor','dinoIguanodontThumbEnabled','addEllipsoid','addKeratinCone','dinoBluntTerminalGeometry','dinoCompactFootGeometry','dinoCompactDigitGeometry','cladeName','addSoftTissueCylinder'];
 const factory=new Function(...names,source.slice(a,b)+'\nreturn addSoftTissueDigitFan;');
 const fan=factory(THREE,{showBody},profile,profileFor,dn,scale,8*scale,3*scale,dn.group==='sauropod',.8*scale,vec,plantar,headMat,keratinMat,model,tag,(id,anchor)=>anchors.push({id,anchor:anchor.toArray()}),thumbEnabled,addEllipsoid,addKeratinCone,blunt,foot,digit,dn.clade||'',addSoftTissueCylinder);
 fan(vec(0,.03*scale,.2*scale),front,side,1);model.updateMatrixWorld(true);
 return {model,headMat,keratinMat,anchors,calls,cleanup(){model.traverse(part=>part.geometry?.dispose());headMat.dispose();keratinMat.dispose();}};
}
for(const front of [true,false])for(const side of [-1,1])it('native compact '+(front?'manus':'pes')+' side '+side+' preserves placements materials labels and clearances',()=>{
 const options={dn:{group:'ornithischian',clade:'Ceratopsidae'},front,side},old=nativeFan({...options,sculpt:false}),next=nativeFan(options);
 const count=front?5:4;assert.equal(next.calls.foot.length,1);assert.equal(next.calls.digit.length,count);
 assert.equal(next.model.children.length,1+count*2);assert.equal(next.model.children.length,old.model.children.length);assert.deepEqual(next.anchors,old.anchors);
 for(let i=0;i<next.model.children.length;i++) {
  const mesh=next.model.children[i],prior=old.model.children[i];assert.deepEqual(mesh.position.toArray(),prior.position.toArray());assert.deepEqual(mesh.userData,prior.userData);
  assert.equal(mesh.material,mesh.userData.dinoFeature==='hoof-like-terminal'?next.keratinMat:next.headMat);assert.equal(mesh.castShadow,true);assert.equal(mesh.parent,next.model);
  const box=new THREE.Box3().setFromObject(mesh),priorBox=new THREE.Box3().setFromObject(prior);
  if(mesh.userData.dinoFeature==='plantar-pad') {near(box.min.y,.004);for(const key of ['min','max'])for(const axis of ['x','z'])near(box[key][axis],priorBox[key][axis]);}
  else for(const key of ['min','max'])for(const axis of ['x','y','z'])near(box[key][axis],priorBox[key][axis]);
  // Compact toe skin deliberately keeps the established min-Y. The keratin
  // caps and plantar contact have their own positive clearance contracts.
  if(mesh.userData.dinoFeature==='hoof-like-terminal')assert.ok(box.min.y>0);
  if(mesh.userData.dinoFeature==='compact-digit')assert.equal(mesh.geometry.index.count/3,384);
 }
 old.cleanup();next.cleanup();
});
for(const front of [true,false])it('sauropod '+(front?'manus':'pes')+' keeps native geometry and digit branch',()=>{
 const options={dn:{group:'sauropod',clade:'Diplodocidae'},front,skeletal:{columnarLimbs:true,hoofedDigits:false}},old=nativeFan({...options,sculpt:false}),next=nativeFan(options);
 assert.equal(next.calls.foot.length,1);assert.equal(next.calls.digit.length,0);assert.deepEqual(next.anchors,old.anchors);assert.equal(next.model.children.length,old.model.children.length);
 for(let i=0;i<next.model.children.length;i++) {assert.deepEqual(next.model.children[i].position.toArray(),old.model.children[i].position.toArray());assert.deepEqual(next.model.children[i].userData,old.model.children[i].userData);exactGeometry(next.model.children[i].geometry,old.model.children[i].geometry);}
 old.cleanup();next.cleanup();
});
it('separate theropod digits bypass compact foot and toe geometry',()=>{
 const r=nativeFan({dn:{group:'theropod',clade:'Tyrannosauridae'},front:false,skeletal:{weightBearingForelimbs:false,hoofedDigits:false,pedalDigits:3,pedalUnguals:3}});
 assert.equal(r.calls.foot.length,0);assert.equal(r.calls.digit.length,0);assert.equal(r.model.children.filter(x=>x.userData.dinoFeature==='digit-envelope').length,3);r.cleanup();
});
it('iguanodont manus retains its excluded thumb digit',()=>{
 const r=nativeFan({dn:{group:'ornithischian',clade:'Iguanodontia'},front:true});
 assert.equal(r.calls.foot.length,1);assert.equal(r.calls.digit.length,4);assert.equal(r.model.children.filter(x=>x.userData.dinoFeature==='compact-digit').length,4);r.cleanup();
});
it('hidden body bypasses all compact surfaces and anchors',()=>{
 const r=nativeFan({dn:{group:'ornithischian',clade:'Ceratopsidae'},front:true,showBody:false});assert.equal(r.model.children.length,0);assert.equal(r.anchors.length,0);assert.equal(r.calls.foot.length,0);assert.equal(r.calls.digit.length,0);r.cleanup();
});

for(const mode of ['bundled-manus','broad-pes'])it('below-clamp '+mode+' uses the effective native plantar dimensions',()=>{
 const rx=.0001,rz=.0003,height=.0005,sole=-.003;
 const next=compactFoot(THREE,rx,rz,height,sole,mode,4),effective=compactFoot(THREE,.002,.002,.002,sole,mode,4),prior=plantar(THREE,rx,rz,height,sole,mode);
 finiteGeometry(next);exactGeometry(next,effective);
 for(const key of ['min','max'])for(const axis of ['x','z'])assert.equal(next.boundingBox[key][axis],prior.boundingBox[key][axis]);
 assert.equal(next.boundingBox.min.y,prior.boundingBox.min.y);assert.ok(next.boundingBox.max.y<=sole+.002*1.35+1e-8);
 next.dispose();effective.dispose();prior.dispose();
});
