const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',THREE={};
new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
const key=v=>v.toArray().map(x=>Math.round(x*1e8)).join(',');
const outputs=[];
for(const file of ['before.js','candidate.js']){
 const source=fs.readFileSync(path.join(__dirname,file),'utf8');let config;
 global.window={StemLab:{isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return {attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}}};new Function(source)();
 const scene=new THREE.Scene(),content=config.buildScene(THREE,{scene,phase:0,dark:true,contrast:false,wantShadow:false,trim:color=>new THREE.MeshPhongMaterial({color}),sceneProps:{age:'adult',tab:'recovery'}});content.frame(0,{},true);scene.updateMatrixWorld(true);
 const left=scene.getObjectByName('fr-manikin-ear-left-base'),right=scene.getObjectByName('fr-manikin-ear-right-base'),lookup=new Map();
 for(let i=0;i<left.geometry.attributes.position.count;i++)lookup.set(key(new THREE.Vector3().fromBufferAttribute(left.geometry.attributes.position,i)),new THREE.Vector3().fromBufferAttribute(left.geometry.attributes.normal,i));
 let min=1,unmatched=0,matched=0;const worst=[];
 for(let i=0;i<right.geometry.attributes.position.count;i++){
  const p=new THREE.Vector3().fromBufferAttribute(right.geometry.attributes.position,i),n=new THREE.Vector3().fromBufferAttribute(right.geometry.attributes.normal,i);p.x*=-1;n.x*=-1;const mirror=lookup.get(key(p));if(!mirror){unmatched++;continue;}matched++;const dot=n.dot(mirror);if(dot<min){min=dot;worst.push({i,position:p.toArray(),dot});}
 }
 const bounds=mesh=>{const points=Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrix));return new THREE.Box3().setFromPoints(points).getSize(new THREE.Vector3()).toArray();};
 outputs.push({file,sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),matched,unmatched,minimumMirroredNormalDot:min,maximumNormalAngleDegrees:Math.acos(Math.min(1,Math.max(-1,min)))*180/Math.PI,worst:worst.slice(-3),baseEarLocalDimensions:{left:bounds(left),right:bounds(right)}});
 const geos=new Set(),mats=new Set();scene.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)mats.add(m);});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
}
const result={checkerSHA256:crypto.createHash('sha256').update(fs.readFileSync(__filename)).digest('hex'),outputs};fs.writeFileSync(path.join(__dirname,'base-normal-comparison.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
