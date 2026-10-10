const fs=require('fs'),path=require('path'),crypto=require('crypto');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',work=__dirname;
const source=fs.readFileSync(path.join(work,'candidate.js'),'utf8');
const evidence=JSON.parse(fs.readFileSync(path.join(work,'native-pose5/adult-pose5-evidence.json'),'utf8'));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
if(sha(source)!==evidence.finalSHA)throw new Error('candidate changed');
const THREE={};new Function('exports','module',fs.readFileSync(path.join(repo,'vendor/three-r128/three.min.js'),'utf8'))(THREE,{exports:THREE});
global.window={};let config;
window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(c){config=c;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};
new Function(source)();
const checks=require(path.join(repo,'tests/helpers/firstresponse_neck_mesh_checks.cjs')).createNeckMeshChecks(THREE);
const model=checks.model(config,{age:'adult',phase:5,contrast:false});
const probe=evidence.attempts.find(v=>v.variant==='candidate').probe;
const box=new THREE.Box3().setFromObject(model.neck);
const result={sourceSHA:sha(source),rawNeckBounds:[box.min.toArray(),box.max.toArray()],expectedNeckBounds:probe.neckBounds,configKeys:Object.keys(config),config};
const camera=new THREE.PerspectiveCamera();camera.position.fromArray(probe.camera.position);camera.quaternion.fromArray(probe.camera.quaternion);camera.projectionMatrix.fromArray(probe.camera.projection);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.updateMatrixWorld(true);
const ray=new THREE.Raycaster();
const visible=[];model.scene.traverse(o=>{if(!o.isMesh)return;for(let p=o;p;p=p.parent)if(!p.visible)return;visible.push(o);});
result.visibleMeshes=visible.map(o=>({name:o.name,position:o.getWorldPosition(new THREE.Vector3()).toArray()}));
result.pixels=[];
for(const pixel of [[475,300],[500,300],[510,312],[480,285],[450,300],[420,255]]) {
 ray.setFromCamera(new THREE.Vector2((pixel[0]-1)/559*2-1,1-(pixel[1]-1)/358*2),camera);
 const hits=ray.intersectObjects(visible,false);
 result.pixels.push({pixel,hits:hits.slice(0,5).map(h=>({name:h.object.name,distance:h.distance,face:h.faceIndex,point:h.point.toArray(),localPoint:h.object.worldToLocal(h.point.clone()).toArray()}))});
}
fs.writeFileSync(path.join(work,'collar-patch-raycast.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,config:undefined,visibleMeshes:undefined},null,2));
console.log('CONFIG '+JSON.stringify(config,(k,v)=>typeof v==='function'?'[function]':v).slice(0,25000));
checks.disposeOnce(model);
