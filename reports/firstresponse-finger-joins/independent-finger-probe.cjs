'use strict';
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const work = __dirname, repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const before = fs.readFileSync(work+'/before.js','utf8'), candidate = fs.readFileSync(work+'/candidate.js','utf8');
const THREE = {}; new Function('exports','module',fs.readFileSync(repo+'/vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
global.window = {};
function build(source) {
  let config; window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(x){config=x;return {};}}; new Function(source)();
  const scene=new THREE.Scene(), props={age:'adult',tab:'recovery',childHands:'two',recPose:8,guides:false};
  const content=config.buildScene(THREE,{scene,phase:8,dark:true,contrast:false,wantShadow:false,sceneProps:props,trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess:shininess??30,specular:0x6b7688})});
  content.frame(0,{...props,depthLab:{age:'adult'}},true);scene.updateMatrixWorld(true);return {scene,content};
}
const a=build(before), b=build(candidate);
function buffer(x){return Buffer.from(x.array.buffer,x.array.byteOffset,x.array.byteLength);}
const changes=[];
function compare(x,y){
  assert.equal(x.name,y.name);assert.equal(x.children.length,y.children.length);assert.deepEqual(x.position.toArray(),y.position.toArray());assert.deepEqual(x.quaternion.toArray(),y.quaternion.toArray());assert.deepEqual(x.scale.toArray(),y.scale.toArray());
  if(x.geometry){assert.deepEqual(Object.keys(x.geometry.attributes),Object.keys(y.geometry.attributes));for(const key of Object.keys(x.geometry.attributes))if(!buffer(x.geometry.attributes[key]).equals(buffer(y.geometry.attributes[key]))){assert.match(x.name,/^fr-patient-(left|right)-finger-[0-3]-surface$/);assert.equal(key,'normal');changes.push(x.name);}
    if(x.geometry.index)assert.ok(buffer(x.geometry.index).equals(buffer(y.geometry.index)));}
  x.children.forEach((item,i)=>compare(item,y.children[i]));
}
compare(a.scene,b.scene);assert.equal(changes.length,8);
function tris(mesh){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,id=mesh.geometry.index.array,out=[];mesh.updateMatrix();const nm=new THREE.Matrix3().getNormalMatrix(mesh.matrix);for(let i=0;i<id.length;i+=3){const row=[];for(let j=0;j<3;j++)row.push({p:new THREE.Vector3().fromBufferAttribute(p,id[i+j]).applyMatrix4(mesh.matrix),n:new THREE.Vector3().fromBufferAttribute(n,id[i+j]).applyMatrix3(nm).normalize()});out.push(row);}return out;}
function project(point,triangles){const sign=point.y>=0?1:-1;let found=null;for(const row of triangles){const [a,b,c]=row.map(x=>x.p);const det=(b.z-c.z)*(a.x-c.x)+(c.x-b.x)*(a.z-c.z);if(Math.abs(det)<1e-14)continue;const u=((b.z-c.z)*(point.x-c.x)+(c.x-b.x)*(point.z-c.z))/det;const v=((c.z-a.z)*(point.x-c.x)+(a.x-c.x)*(point.z-c.z))/det,w=1-u-v;if(Math.min(u,v,w)<-1e-9)continue;const y=u*a.y+v*b.y+w*c.y;if(y*sign<0)continue;const gap=Math.abs(point.y-y);if(!found||gap<found.gap){found={gap,n:row[0].n.clone().multiplyScalar(u).addScaledVector(row[1].n,v).addScaledVector(row[2].n,w).normalize()};}}
return found;}
function faceHealth(mesh){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal,ind=mesh.geometry.index.array,bad=new Set();let min=1;for(let i=0;i<ind.length;i+=3){const [ia,ib,ic]=[ind[i],ind[i+1],ind[i+2]],a=new THREE.Vector3().fromBufferAttribute(p,ia),b=new THREE.Vector3().fromBufferAttribute(p,ib),c=new THREE.Vector3().fromBufferAttribute(p,ic),f=b.sub(a).cross(c.sub(a));if(f.lengthSq()<1e-20)continue;const average=new THREE.Vector3().fromBufferAttribute(n,ia).add(new THREE.Vector3().fromBufferAttribute(n,ib)).add(new THREE.Vector3().fromBufferAttribute(n,ic));const dot=f.normalize().dot(average.normalize());min=Math.min(min,dot);if(dot<=0)bad.add(i/3);}
return {bad,min};}
const report={beforeSHA256:sha(before),candidateSHA256:sha(candidate),changes,fingers:[]};
for(const name of changes){const prior=a.scene.getObjectByName(name),current=b.scene.getObjectByName(name),side=name.includes('-left-')?'left':'right',palm=b.scene.getObjectByName('fr-patient-'+side+'-palm'),triangles=tris(palm),p=prior.geometry.attributes.position,old=prior.geometry.attributes.normal,now=current.geometry.attributes.normal;
let count=0,beforeSum=0,afterSum=0,beforeMax=0,afterMax=0,worse=0,maxRow=-1,maxOutside=0;
for(let i=0;i<p.count;i++){const normal=new THREE.Vector3().fromBufferAttribute(now,i);assert.ok(Math.abs(normal.length()-1)<1e-6);const oldNormal=new THREE.Vector3().fromBufferAttribute(old,i);if(oldNormal.distanceTo(normal)<1e-10)continue;const t=Math.floor(i/16)/((p.count-2)/16);maxRow=Math.max(maxRow,t);assert.ok(t<.36);const fit=project(new THREE.Vector3().fromBufferAttribute(p,i),triangles);assert.ok(fit&&fit.gap<.009+1e-8);maxOutside=Math.max(maxOutside,fit.gap);const oldAngle=oldNormal.angleTo(fit.n)*180/Math.PI,newAngle=normal.angleTo(fit.n)*180/Math.PI;beforeSum+=oldAngle;afterSum+=newAngle;beforeMax=Math.max(beforeMax,oldAngle);afterMax=Math.max(afterMax,newAngle);if(newAngle>oldAngle+1e-5)worse++;count++;}
assert.ok(count>0);assert.equal(worse,0);assert.ok(afterSum<beforeSum*.8);const h0=faceHealth(prior),h1=faceHealth(current);for(const id of h1.bad)assert.ok(h0.bad.has(id),'no newly backward face '+name+' '+id);
report.fingers.push({name,changedVertices:count,maximumChangedT:maxRow,maximumPalmGap:maxOutside,beforeMeanAngle:beforeSum/count,afterMeanAngle:afterSum/count,beforeMaximumAngle:beforeMax,afterMaximumAngle:afterMax,worsenedVertices:worse,backwardFacesBefore:h0.bad.size,backwardFacesAfter:h1.bad.size,minFaceAgreementBefore:h0.min,minFaceAgreementAfter:h1.min});}
assert.equal(sha(fs.readFileSync(work+'/candidate.js')),report.candidateSHA256);
report.passed=true;fs.writeFileSync(work+'/independent-finger-probe-result.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
