const fs=require('node:fs'),THREE=require('../../vendor/three-r128/three.min.js');
const source=fs.readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const window={THREE};global.window=window;
const makeShape=new Function('window',source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+';return createShapeGeometry;')(window);
const test=fs.readFileSync('tests/geometry_world_placement_transaction.test.js','utf8');
const start=test.indexOf('function engineFunction('),end=test.indexOf("describe('placement rejects",start),vi={fn(fn=()=>{}){return(...args)=>fn(...args);}};
const helpers=new Function('THREE','source','makeShape','vi',test.slice(start,end)+';return {fixture,seed,hitFace};')(THREE,source,makeShape,vi);
function bounds(mesh){const box=new THREE.Box3().setFromObject(mesh);return {min:box.min.toArray(),max:box.max.toArray()};}
function error(target,overlay){target.updateWorldMatrix(true,false);overlay.updateWorldMatrix(true,false);const a=target.geometry.attributes.position,b=overlay.geometry.attributes.position;if(a.count!==b.count)return Infinity;let max=0;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i).applyMatrix4(target.matrixWorld),q=new THREE.Vector3().fromBufferAttribute(b,i).applyMatrix4(overlay.matrixWorld);max=Math.max(max,p.distanceTo(q));}return max;}
const results=[];
for(const shape of ['cube','halfB','halfA','quarter'])for(const rotation of [0,1,2,3]){
  const f=helpers.fixture(),target=helpers.seed(f,[4,3,6],shape,rotation);f.setHits([helpers.hitFace(target,[0,1,0])]);f.engine.updateGhostPreview();
  const fill=f.engine._hoverGlowMesh,edge=f.engine._highlightMesh,fillGeometry=fill.geometry,edgeGeometry=edge.geometry;
  const vertexError=error(target,fill);for(let i=0;i<60;i++)f.engine.updateGhostPreview();
  results.push({shape,rotation,targetBounds:bounds(target),hoverBounds:bounds(fill),maxWorldVertexError:vertexError,ghostScale:f.engine._ghostMesh.scale.toArray(),ownedGeometry:fill.geometry!==target.geometry,fillGeometryReused:fillGeometry===fill.geometry,edgeGeometryReused:edgeGeometry===edge.geometry});
  f.engine.scene.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
}
const report={success:results.every(r=>r.maxWorldVertexError<1e-10&&r.ghostScale.every(n=>n===1)&&r.ownedGeometry&&r.fillGeometryReused&&r.edgeGeometryReused),method:'Production core placement and updateGhostPreview with local THREE r128 and existing transaction fixture. Sixteen shapes/rotations; each repeats 60 unchanged preview calls. No browser or FPS measurement.',results};
fs.writeFileSync('reports/geometry-world-building-polish-2026-09-09/accurate-preview-diagnostic.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({success:report.success,cases:results.length,maxWorldVertexError:Math.max(...results.map(r=>r.maxWorldVertexError)),reusedAcrossIdle:results.every(r=>r.fillGeometryReused&&r.edgeGeometryReused),unitScale:results.every(r=>r.ghostScale.every(n=>n===1))}));
