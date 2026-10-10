const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',THREE={};
new Function('exports','module',fs.readFileSync(repo+'/vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
function getBuild(file){let build;vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{console,window:{StemLab:{isRegistered:()=>false,registerTool(){},makeBayViewer(c){build=c.buildScene;return {attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}}}});return build;}
const builders=[getBuild('before.js'),getBuild('candidate.js')],rows=[];
function make(build,age,phase){const scene=new THREE.Scene();build(THREE,{scene,phase,dark:true,contrast:false,wantShadow:false,trim:(color,shininess)=>new THREE.MeshPhongMaterial({color,shininess}),sceneProps:{age,tab:phase?'recovery':'depth'}});scene.updateMatrixWorld(true);return scene;}
const vec=(mesh,i)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);
function firstRadius(center,direction,meshes,scale){const ray=new THREE.Raycaster(center.clone().addScaledVector(direction,.4*scale),direction.clone().negate()),hits=ray.intersectObjects(meshes,false);return hits.length?.4*scale-hits[0].distance:-Infinity;}
function inside(mesh,point,scale){const ray=new THREE.Raycaster(point,new THREE.Vector3(.237,.821,.519).normalize()),hits=ray.intersectObject(mesh,false),unique=[];for(const hit of hits)if(!unique.length||hit.distance-unique[unique.length-1]>.000001*scale)unique.push(hit.distance);return unique.length%2===1;}
function nearest(meshes,point,scale){let distance=Infinity;const triangle=new THREE.Triangle(),closest=new THREE.Vector3();for(const mesh of meshes){if(inside(mesh,point,scale))return 0;const g=mesh.geometry,start=g.drawRange.start,end=Math.min(g.index.count,start+g.drawRange.count);for(let i=start;i<end;i+=3){triangle.set(vec(mesh,g.index.getX(i)),vec(mesh,g.index.getX(i+1)),vec(mesh,g.index.getX(i+2)));triangle.closestPointToPoint(point,closest);distance=Math.min(distance,point.distanceTo(closest));}}return distance/scale;}
for(const age of ['adult','child','infant'])for(const phase of [0,2,3,5,8]){
  const scenes=builders.map(b=>make(b,age,phase));
  for(const side of ['left','right']){
    const objects=scenes.map(scene=>Object.fromEntries(['forearm','wrist','palm','hand'].map(s=>[s,scene.getObjectByName('fr-patient-'+side+'-'+s)])));
    const [before,after]=objects,len=after.forearm.geometry.parameters.height;
    const center=new THREE.Vector3(0,len/2,0).applyMatrix4(after.forearm.matrixWorld),scale=new THREE.Vector3().setFromMatrixScale(after.hand.matrixWorld).x;
    for(const obj of objects)obj.wrist.material.side=THREE.DoubleSide;
    const rim=Array.from({length:24},(_,i)=>vec(after.forearm,i)),samples=[];
    for(let j=0;j<24;j++){
      const p=rim[j],q=rim[(j+1)%24];samples.push(p,p.clone().lerp(q,.5),p.clone().add(q).add(center).multiplyScalar(1/3));
      for(const f of [.25,.5,.75])samples.push(center.clone().lerp(p,f));
    }
    const coverage=objects.map(obj=>{let uncovered=0,maxGap=0;for(const p of samples){const dir=p.clone().sub(center).normalize(),radius=firstRadius(center,dir,[obj.wrist,obj.palm],scale),gap=(p.distanceTo(center)-radius)/scale;if(gap>.00002)uncovered++;maxGap=Math.max(maxGap,gap);}return {uncovered,maxGap};});
    const params=after.wrist.geometry.parameters,n=params.radialSegments;
    let rootOutside=0,palmOutside=0,maxOutsideOriginalUnion=0,radialMaxPoint;
    for(let j=0;j<n;j++){
      if(!inside(after.forearm,vec(after.wrist,params.rootRing*n+j),scale))rootOutside++;
      if(!inside(after.palm,vec(after.wrist,params.palmRing*n+j),scale))palmOutside++;
    }
    for(let r=0;r<params.ringCount;r+=2)for(let j=0;j<n;j+=4){
      const p=vec(after.wrist,r*n+j),dir=p.clone().sub(center).normalize();
      const originalRadius=firstRadius(center,dir,[before.forearm,before.wrist,before.palm],scale);
      const gap=(p.distanceTo(center)-originalRadius)/scale;if(gap>maxOutsideOriginalUnion){maxOutsideOriginalUnion=gap;radialMaxPoint=p;}
    }
    const nearestAtRadialMax=radialMaxPoint?nearest([before.forearm,before.wrist,before.palm],radialMaxPoint,scale):0;
    // This directional estimate can overstate growth when a ray is coplanar
    // with an old end disk; the nearest-triangle check diagnoses those points.
    rows.push({age,phase,side,samples:samples.length,before:coverage[0],after:coverage[1],rootOutside,palmOutside,radialExcessEstimate:maxOutsideOriginalUnion,nearestAtRadialMax});
  }
  scenes.forEach(scene=>{const gs=new Set(),ms=new Set();scene.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());});
  console.log(age+' phase '+phase+' '+JSON.stringify(rows.slice(-2)));
}
fs.writeFileSync(path.join(__dirname,'geometry-probe-metrics.json'),JSON.stringify(rows,null,2));
console.log('Saved wrist-metrics.json');
