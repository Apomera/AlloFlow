// Convert the pinned CC0 MakeHuman base body into a self-contained, uncompressed GLB.
// Node only. Reproduce: node dev-tools/build-anatomy-body-surface.cjs
const fs=require('node:fs'),crypto=require('node:crypto');
const dir='stem_lab/assets/anatomy/body-surface';
const source=fs.readFileSync(dir+'/makehuman-base.obj');
const vertices=[],faces=[];let group='';
for(const line of source.toString('utf8').split(/\r?\n/)){
 const parts=line.trim().split(/\s+/);
 if(parts[0]==='v')vertices.push(parts.slice(1,4).map(Number));
 if(parts[0]==='g')group=parts[1];
 if(parts[0]==='f'&&group==='body'){
  const ids=parts.slice(1).map(p=>Number(p.split('/')[0])-1);
  for(let i=1;i<ids.length-1;i++)faces.push([ids[0],ids[i],ids[i+1]]);
 }
}
if(!faces.length)throw Error('No body faces');
const used=[...new Set(faces.flat())].sort((a,b)=>a-b),mapping=new Map(used.map((v,i)=>[v,i]));
const positions=new Float32Array(used.flatMap(i=>vertices[i]));
if(!positions.every(Number.isFinite))throw Error('Invalid coordinates');
const indices=new Uint16Array(faces.flatMap(f=>f.map(i=>mapping.get(i))));
if(used.length>65535)throw Error('Index range overflow');
const normals=new Float32Array(positions.length);
for(let i=0;i<indices.length;i+=3){
 const a=indices[i]*3,b=indices[i+1]*3,c=indices[i+2]*3;
 const ux=positions[b]-positions[a],uy=positions[b+1]-positions[a+1],uz=positions[b+2]-positions[a+2];
 const vx=positions[c]-positions[a],vy=positions[c+1]-positions[a+1],vz=positions[c+2]-positions[a+2];
 const n=[uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx];
 for(const j of [a,b,c])for(let k=0;k<3;k++)normals[j+k]+=n[k];
}
for(let i=0;i<normals.length;i+=3){const length=Math.hypot(...normals.slice(i,i+3))||1;for(let k=0;k<3;k++)normals[i+k]/=length;}
const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
for(let i=0;i<positions.length;i++) {min[i%3]=Math.min(min[i%3],positions[i]);max[i%3]=Math.max(max[i%3],positions[i]);}
const chunks=[Buffer.from(positions.buffer),Buffer.from(normals.buffer),Buffer.from(indices.buffer)],views=[];let offset=0;
for(let i=0;i<chunks.length;i++){views.push({buffer:0,byteOffset:offset,byteLength:chunks[i].length,target:i===2?34963:34962});offset+=chunks[i].length;const pad=(4-offset%4)%4;if(pad){chunks[i]=Buffer.concat([chunks[i],Buffer.alloc(pad)]);offset+=pad;}}
const gltf={asset:{version:'2.0',generator:'AlloFlow CC0 MakeHuman body conversion',copyright:'MakeHuman contributors — CC0 1.0'},scene:0,scenes:[{nodes:[0]}],nodes:[{name:'MakeHumanBodySurface',mesh:0}],meshes:[{primitives:[{attributes:{POSITION:0,NORMAL:1},indices:2,material:0}]}],materials:[{name:'BodySurface',pbrMetallicRoughness:{baseColorFactor:[0.62,0.43,0.30,1],metallicFactor:0,roughnessFactor:0.78},doubleSided:false}],buffers:[{byteLength:offset}],bufferViews:views,accessors:[{bufferView:0,componentType:5126,count:used.length,type:'VEC3',min,max},{bufferView:1,componentType:5126,count:used.length,type:'VEC3'},{bufferView:2,componentType:5123,count:indices.length,type:'SCALAR'}]};
const json=Buffer.from(JSON.stringify(gltf));const jsonPadded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]);const bin=Buffer.concat(chunks);const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jsonPadded.length+bin.length,8);header.writeUInt32LE(jsonPadded.length,12);header.writeUInt32LE(0x4e4f534a,16);const binHeader=Buffer.alloc(8);binHeader.writeUInt32LE(bin.length);binHeader.writeUInt32LE(0x004e4942,4);const output=Buffer.concat([header,jsonPadded,binHeader,bin]);fs.writeFileSync(dir+'/makehuman-body-surface.glb',output);
const manifest={schemaVersion:1,id:'makehuman-body-surface-v1',publisher:'MakeHuman Community',sourceRevision:'a8bc2d54ff0ac92e78ff71431b1023eda42bf482',source:'https://github.com/makehumancommunity/makehuman/blob/a8bc2d54ff0ac92e78ff71431b1023eda42bf482/makehuman/data/3dobjs/base.obj',license:{spdx:'CC0-1.0',url:'https://creativecommons.org/publicdomain/zero/1.0/'},modifications:'Body group only; removed helper and joint geometry; triangulated quads; computed smooth area-weighted vertex normals; generated solid PBR material; omitted UVs and textures.',vertices:used.length,triangles:indices.length/3,bytes:output.length,bounds:{min,max},sha256:{source:crypto.createHash('sha256').update(source).digest('hex'),model:crypto.createHash('sha256').update(output).digest('hex')}};
fs.writeFileSync(dir+'/asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest,null,2));
