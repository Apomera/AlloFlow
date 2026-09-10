const fs=require('node:fs');
const THREE=require('../../vendor/three-r128/three.min.js');
const source=fs.readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const window={THREE};
const makeShape=new Function('window',source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+';return createShapeGeometry;')(window);
const test=fs.readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
const start=test.indexOf('function engineFunction('),end=test.indexOf("describe('placement rejects",start);
const vi={fn(fn=()=>{}){return (...args)=>fn(...args);}};
global.window=window;
const helpers=new Function('THREE','source','makeShape','vi',test.slice(start,end)+';return {fixture,seed,hitFace};')(THREE,source,makeShape,vi);
function bounds(mesh){const b=new THREE.Box3().setFromObject(mesh);return {min:b.min.toArray(),max:b.max.toArray()};}
const results=[];
for(const shape of ['cube','halfB','halfA','quarter']){
  const f=helpers.fixture(),target=helpers.seed(f,[4,3,6],shape,1);
  f.setHits([helpers.hitFace(target,[0,1,0])]);f.engine.updateGhostPreview();
  results.push({shape,rotation:1,targetBounds:bounds(target),hoverBounds:bounds(f.engine._hoverGlowMesh),targetTriangles:(target.geometry.index?target.geometry.index.count:target.geometry.attributes.position.count)/3,hoverTriangles:(f.engine._hoverGlowMesh.geometry.index?f.engine._hoverGlowMesh.geometry.index.count:f.engine._hoverGlowMesh.geometry.attributes.position.count)/3,targetRotationY:target.rotation.y,hoverRotationY:f.engine._hoverGlowMesh.rotation.y,ghostScale:f.engine._ghostMesh.scale.toArray()});
  f.engine.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
}
fs.writeFileSync('reports/geometry-world-selection-polish-2026-09-09/hover-shape-audit.json',JSON.stringify({method:'Actual core placement and updateGhostPreview executed with local THREE r128; ray hit and unrelated effects use the existing transaction fixture.',results},null,2));
console.log(JSON.stringify(results));
