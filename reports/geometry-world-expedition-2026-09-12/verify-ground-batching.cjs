const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = process.argv[2] || path.join(__dirname, 'ground-core-candidate.js');
const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const exportsThree = {};
new Function('exports', 'module', fs.readFileSync('vendor/three-r128/three.min.js','utf8'))(exportsThree,{exports:exportsThree});
const THREE = exportsThree;
const install = new Function(fs.readFileSync(path.join(__dirname,'ground-batching.js'),'utf8')+'\nreturn installGeometryGround;')();
let passed = 0;
function check(label, fn) { fn(); passed++; console.log('PASS '+label); }
function implementation(name) {
  const start = source.indexOf('        engine.'+name+' = function(');
  assert.ok(start>=0,'find '+name);
  const end = source.indexOf('\n        };',start);
  return source.slice(start,end+'\n        };'.length);
}
function fixture() {
  const engine = {blocks:{},scene:new THREE.Scene(),_blocksDirty:true,npcs:[],_undoStack:[],_redoStack:[],_placingLessonBlocks:true,_measurementLayer:'ground',_currentLesson:{ground:{y:0}},refreshAONeighbourhood(){},configureBlockFinish(){}};
  const material = () => new THREE.MeshStandardMaterial({color:0x88aa66});
  install(engine,THREE,material,()=>1);
  const deps = {engine,THREE,MAX_BLOCKS:1500,getBlockMaterial:material,createShapeGeometry:()=>new THREE.BoxGeometry(1,1,1),geometryWorldGroundTint:()=>1,addBlockEdges(){},pushUndo(){},BLOCK_SHAPES:[{id:'cube',volume:1}],spawnBreakParticles(){},window:{}};
  new Function(...Object.keys(deps),['getBlocksArr','getPlacementEligibility','placementCellForHit','placeBlock','fillBlocks','_disposeBlockMesh','removeBlock','clearWorld'].map(implementation).join('\n'))(...Object.values(deps));
  return engine;
}
function aim(engine, origin, direction, far=8) {
  engine.scene.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(new THREE.Vector3(...origin),new THREE.Vector3(...direction).normalize(),0,far);
  return ray.intersectObjects(engine.getRaycastTargets());
}
const engine = fixture();
const gardenStart = source.indexOf('    geometryGarden: {');
const gardenEnd = source.indexOf('    compositeVolume:',gardenStart);
const garden = new Function('return ({'+source.slice(gardenStart,gardenEnd)+'}).geometryGarden;')();
const g = garden.ground;
engine.fillBlocks(g.xMin,g.y,g.zMin,g.xMax,g.y,g.zMax,g.type);
check('Garden preserves all 1,767 ground cells with zero construction cost',()=>{
  assert.equal(engine.getGroundBlockCount(),1767);assert.equal(engine.getConstructionBlockCount(),0);assert.equal(engine._fillTruncated,undefined);
  assert.ok(engine._groundChunks.length<30);assert.equal(engine.scene.children.length,engine._groundChunks.length);
});
engine._measurementLayer='lesson';
garden.structures.forEach(s=>engine.fillBlocks(s.x1,s.y1,s.z1,s.x2,s.y2,s.z2,s.block));
check('Every authored Garden structure cell including hidden final tower exists',()=>{
  garden.structures.forEach(s=>{for(let x=s.x1;x<=s.x2;x++)for(let y=s.y1;y<=s.y2;y++)for(let z=s.z1;z<=s.z2;z++)assert.ok(engine.blocks[x+','+y+','+z]);});
  assert.equal(engine.blocks['50,5,5'].userData.blockType,'diamond');assert.ok(engine.getConstructionBlockCount()<1500);assert.equal(engine._fillTruncated,undefined);
});
check('Vertical ray returns canonical ground proxy and correct adjacent placement cell',()=>{
  const hit=aim(engine,[-5.5,5,-9.5],[0,-1,0])[0];assert.equal(hit.object,engine.blocks['-6,0,-10']);
  assert.deepEqual(engine.placementCellForHit(hit),{x:-6,y:1,z:-10});assert.equal(hit.distance,4);
});
check('Ground rays respect distance and chunk visibility',()=>{
  assert.equal(aim(engine,[-5.5,15,-9.5],[0,-1,0],8).length,0);
  const p=engine.blocks['-6,0,-10'];p.userData._groundRecord.mesh.visible=false;
  assert.equal(aim(engine,[-5.5,5,-9.5],[0,-1,0]).length,0);p.userData._groundRecord.mesh.visible=true;
});
check('Ground protection leaves geometry, budgets and history intact',()=>{
  const before=engine.blocks['-6,0,-10'];engine.removeBlock(-6,0,-10);
  assert.equal(engine.blocks['-6,0,-10'],before);assert.equal(engine.getGroundBlockCount(),1767);assert.equal(engine._undoStack.length,0);
});
check('Forced terrain removal opens a real raycast hole',()=>{
  engine.removeBlock(-6,0,-10,true);assert.equal(engine.blocks['-6,0,-10'],undefined);assert.equal(engine.getGroundBlockCount(),1766);
  assert.equal(aim(engine,[-5.5,5,-9.5],[0,-1,0]).length,0);
});
check('Ground palette replacement changes exactly one cell and keeps budget independent',()=>{
  engine._measurementLayer='ground';const before=engine.getGroundBlockCount();engine.fillBlocks(-5,0,-9,-5,0,-9,'stone');
  assert.equal(engine.blocks['-5,0,-9'].userData.blockType,'stone');assert.equal(engine.blocks['-5,0,-9'].userData._measurementLayer,'ground');
  assert.equal(engine.getGroundBlockCount(),before);assert.equal(engine.blocks['-4,0,-9'].userData.blockType,'grass');
  assert.equal(aim(engine,[-4.5,5,-8.5],[0,-1,0])[0].object,engine.blocks['-5,0,-9']);
});
check('Horizontal ray traverses palette holes to the correct solid cell',()=>{
  const f=fixture();f.placeBlock(0,0,0,'grass');f.placeBlock(1,0,0,'stone');f.placeBlock(2,0,0,'grass');f.removeBlock(0,0,0,true);
  const hit=aim(f,[-2,.5,.5],[1,0,0])[0];assert.equal(hit.object,f.blocks['1,0,0']);assert.equal(hit.distance,3);
  assert.deepEqual(f.placementCellForHit(hit),{x:0,y:0,z:0});f.clearWorld();
});
check('Construction blocks occlude ground and cache invalidates on changes',()=>{
  const f=fixture();f.placeBlock(0,0,0,'grass');f.getRaycastTargets();f._measurementLayer='lesson';f.placeBlock(0,1,0,'stone');
  assert.equal(aim(f,[.5,5,.5],[0,-1,0])[0].object,f.blocks['0,1,0']);assert.equal(f.getConstructionBlockCount(),1);f.clearWorld();
});
check('A 97 by 97 landscape leaves the full 1,500 construction allowance',()=>{
  const f=fixture();f.fillBlocks(-48,0,-48,48,0,48,'grass');assert.equal(f.getGroundBlockCount(),9409);
  f._measurementLayer='lesson';f.fillBlocks(0,1,0,49,1,29,'stone');assert.equal(f.getConstructionBlockCount(),1500);
  assert.equal(f.placeBlock(50,1,30,'stone'),null);assert.equal(f.getGroundBlockCount(),9409);
  f._measurementLayer='ground';assert.ok(f.placeBlock(60,0,60,'grass'));assert.equal(f.getGroundBlockCount(),9410);f.clearWorld();
});
check('Terrain has its own bounded safety cap',()=>{
  const f=fixture();f.fillBlocks(0,0,0,128,0,128,'grass');assert.equal(f.getGroundBlockCount(),16384);assert.equal(f._fillTruncated,true);
  assert.equal(f.getConstructionBlockCount(),0);f.clearWorld();
});
check('Clear disposes each shared terrain resource once and removes cached ray targets',()=>{
  const resources=new Set();engine._groundChunks.forEach(c=>{resources.add(c.material);resources.add(c.geometry);});
  let disposed=0;resources.forEach(r=>r.addEventListener('dispose',()=>disposed++));
  engine.clearWorld();assert.equal(disposed,resources.size);assert.equal(engine.getGroundBlockCount(),0);assert.equal(engine.getConstructionBlockCount(),0);
  assert.deepEqual(engine.getRaycastTargets(),[]);assert.equal(engine.scene.children.length,0);
  engine._measurementLayer='ground';assert.ok(engine.placeBlock(0,0,0,'grass'));assert.equal(aim(engine,[.5,4,.5],[0,-1,0])[0].object,engine.blocks['0,0,0']);engine.clearWorld();
});
console.log(JSON.stringify({passed,source:file,threeRevision:THREE.REVISION}));
