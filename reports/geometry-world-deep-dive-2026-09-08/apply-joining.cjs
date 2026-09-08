const fs=require('fs');
const file='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(file,'utf8');
const start=s.indexOf('  // ── Union surface'),fn=s.indexOf('  // Pure: it marks nothing on its inputs',start),end=s.indexOf('  // World and editable source stay Y-up',fn);
if(start<0||fn<0||end<0)throw Error('Missing joining boundaries');
s=s.slice(0,start)+'  // Join the actual boundary polygons of adjacent blocks.\n'+s.slice(s.indexOf('  function axisPlane(',start),fn)+fs.readFileSync(__dirname+'/join-surfaces.txt','utf8')+'\n'+s.slice(end);
s=s.replace('      triangleCount: triangles.length,','      triangleCount: triangles.length,\n      contactGroups: triangles.contactGroups || [],\n      connectedComponents: (triangles.contactGroups || []).length,');
// A normalized array is not created until after the contact metadata is read.
function write(p,v){const fd=fs.openSync(p,'r+');try{fs.writeFileSync(fd,v);fs.ftruncateSync(fd,Buffer.byteLength(v));}finally{fs.closeSync(fd);}} new Function(s);write(file,s);write('desktop/web-app/public/'+file,s);console.log('Installed exact partial-face joining and edge stitching.');
