const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const THREE={};new Function('exports','module',fs.readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
const install=new Function(fs.readFileSync(path.join(__dirname,'ground-batching.js'),'utf8')+'\nreturn installGeometryGround;')();
const engine={blocks:{},scene:new THREE.Scene(),getBlocksArr(){if(this._blocksDirty){this._arr=Object.values(this.blocks);this._blocksDirty=false;}return this._arr||[];}};
install(engine,THREE,()=>new THREE.MeshStandardMaterial(),()=>1);
for(let x=-20;x<=20;x++)for(let z=-20;z<=20;z++)if((x*37+z*19)%11)engine.placeGroundBlock(x,0,z,((x+z)%3===0)?'stone':'grass');
engine.scene.updateMatrixWorld(true);let seed=1123;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
let count=0;
for(let i=0;i<500;i++){
 const origin=new THREE.Vector3(random()*55-27.5,random()*8-1,random()*55-27.5);
 const direction=new THREE.Vector3(random()*2-1,random()*2-1,random()*2-1).normalize();
 const ray=new THREE.Raycaster(origin,direction,0,45);
 const reference=ray.intersectObjects(engine.getBlocksArr())[0],actual=ray.intersectObjects(engine.getRaycastTargets())[0];
 assert.equal(!!actual,!!reference,'hit presence '+i+' '+origin.toArray()+' '+direction.toArray());
 if(actual){assert.ok(Math.abs(actual.distance-reference.distance)<1e-7,'hit distance '+i);assert.equal(actual.object,reference.object,'proxy identity '+i);}count++;
}
console.log(JSON.stringify({passed:count,check:'accelerated versus individual canonical ground Mesh raycasts',cells:engine.getBlocksArr().length,chunks:engine._groundChunks.length}));
engine.disposeGround();
