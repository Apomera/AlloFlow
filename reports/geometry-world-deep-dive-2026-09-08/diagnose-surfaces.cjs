const fs=require('fs'),THREE=require('../../vendor/three-r128/three.min.js');
global.window={THREE,StemLab:{_registry:{geometryWorld:{render(){return null;}}},registerTool(id,cfg){this._registry[id]=cfg;}}};
new Function(fs.readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
const source=fs.readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const shape=new Function(source.slice(source.indexOf('  function createShapeGeometry('),source.indexOf('  // Format fractional volume for display'))+'\nreturn createShapeGeometry;')();
const en={blocks:{}},blocks=[];
for(let x=0;x<4;x++)for(let z=0;z<4;z++){blocks.push({x,y:1,z,shape:'cube',rotation:0});blocks.push({x,y:2,z,shape:['cube','halfA','halfB','quarter'][(x+z)%4],rotation:x%4});}
for(const p of blocks){const mesh=new THREE.Mesh(shape(p.shape),new THREE.MeshBasicMaterial());mesh.position.set(p.x+.5,p.y+(p.shape==='cube'?.5:p.shape==='halfB'?.25:0),p.z+.5);mesh.rotation.y=p.rotation*Math.PI/2;mesh.userData={gridPos:p,shape:p.shape,rotation:p.rotation,blockType:'stone'};en.blocks[[p.x,p.y,p.z].join()]=mesh;}
const bundle=window.StemLab.geometryWorldBuilderPure.buildGeometryWorldStl(en,blocks),dv=new DataView(bundle.buffer),edges={};
for(let i=0;i<dv.getUint32(80,true);i++){const vertices=[];for(let j=0;j<3;j++){const raw=[0,1,2].map(k=>Math.round(dv.getFloat32(84+i*50+12+j*12+k*4,true)*1e5)/1e5);vertices.push([raw[0],raw[2]+1,-raw[1]]);}for(let j=0;j<3;j++){const key=[vertices[j].join(),vertices[(j+1)%3].join()].sort().join(' | ');(edges[key]=edges[key]||[]).push(vertices);}}
console.log(JSON.stringify(Object.fromEntries(Object.entries(edges).filter(([_,triangles])=>triangles.length>2)),null,2));
