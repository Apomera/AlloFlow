const assert=require('node:assert/strict');
const changes=[
  {
    "before": "        function createCLHuntDenShadowGeometry(T){",
    "after": "        function createCLHuntDenWeatheredGeometry(T,radius,widthSegments,heightSegments,variant){\n          // Chamfer the accepted stones inward without changing their support\n          // heights, overall boxes, doorway or seeded dive randomness.\n          var original=createCLHuntDenRockGeometry(T,radius,widthSegments,heightSegments,variant);\n          var source=original.attributes.position,roof=radius===1,bands=roof?3:4,rings=[],positions=[],uvs=[],indices=[];\n          function point(index){return [source.getX(index),source.getY(index),source.getZ(index)];}\n          for(var row=0;row<=bands;row++){\n            var accepted=[],ring=[];\n            for(var corner=0;corner<8;corner++)accepted.push(point(row===bands?((bands-1)*8+corner)*4+1:(row*8+corner)*4));\n            for(var corner=0;corner<8;corner++){\n              var center=accepted[corner],before=accepted[(corner+7)%8],after=accepted[(corner+1)%8];\n              var cut=0.20+0.04*Math.sin(variant*1.37+corner*1.79);\n              ring.push([center[0]+(before[0]-center[0])*cut,center[1]+(before[1]-center[1])*cut,center[2]+(before[2]-center[2])*cut]);\n              ring.push([center[0]+(after[0]-center[0])*cut,center[1]+(after[1]-center[1])*cut,center[2]+(after[2]-center[2])*cut]);\n            }\n            rings.push(ring);\n          }\n          function vertex(value,u,v){var id=positions.length/3;positions.push(value[0],value[1],value[2]);uvs.push(u,v);return id;}\n          for(var band=0;band<bands;band++)for(var side=0;side<16;side++){\n            var next=(side+1)%16,start=positions.length/3;\n            vertex(rings[band][side],0,0);vertex(rings[band+1][side],0,1);vertex(rings[band+1][next],1,1);vertex(rings[band][next],1,0);\n            indices.push(start,start+1,start+2,start,start+2,start+3);\n          }\n          var sideCount=positions.length/3;\n          for(var cap=0;cap<2;cap++){\n            var capRing=rings[cap?bands:0],center=point(bands*32+cap*24);\n            for(var face=0;face<16;face++){\n              var first=cap?capRing[(face+1)%16]:capRing[face],second=cap?capRing[face]:capRing[(face+1)%16],start=positions.length/3;\n              vertex(center,0.5,0.5);vertex(first,first[0]/(2*radius)+0.5,first[2]/(2*radius)+0.5);vertex(second,second[0]/(2*radius)+0.5,second[2]/(2*radius)+0.5);indices.push(start,start+1,start+2);\n            }\n          }\n          // Reuse the original geometry so Three creates exactly the same UUID\n          // and consumes the same global random draws as the accepted factory.\n          var geometry=original;geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.deleteAttribute('normal');geometry.computeVertexNormals();\n          // Only shallow side creases soften. Cap boundaries and pronounced\n          // fractures retain their own normals, including each flat sole.\n          var p=geometry.attributes.position,n=geometry.attributes.normal,acceptedNormals=n.array.slice(),coincident=Object.create(null),creaseCos=Math.cos(Math.PI/5);\n          for(var vertexIndex=0;vertexIndex<sideCount;vertexIndex++){\n            var key=p.getX(vertexIndex)+','+p.getY(vertexIndex)+','+p.getZ(vertexIndex);\n            if(!coincident[key])coincident[key]=[];coincident[key].push(vertexIndex);\n          }\n          Object.keys(coincident).forEach(function(key){\n            var peers=coincident[key];\n            for(var member=0;member<peers.length;member++){\n              var index=peers[member],nx=acceptedNormals[index*3],ny=acceptedNormals[index*3+1],nz=acceptedNormals[index*3+2],sx=0,sy=0,sz=0;\n              for(var other=0;other<peers.length;other++){\n                var at=peers[other]*3,ox=acceptedNormals[at],oy=acceptedNormals[at+1],oz=acceptedNormals[at+2];\n                if(nx*ox+ny*oy+nz*oz>=creaseCos){sx+=ox;sy+=oy;sz+=oz;}\n              }\n              var length=Math.hypot(sx,sy,sz);if(length>0)n.setXYZ(index,sx/length,sy/length,sz/length);\n            }\n          });\n          geometry.computeBoundingBox();geometry.computeBoundingSphere();return geometry;\n        }\n        function createCLHuntDenShadowGeometry(T){"
  },
  {
    "before": "var p1 = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var p1 = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  },
  {
    "before": "var p2 = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var p2 = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  },
  {
    "before": "var lintel = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var lintel = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  },
  {
    "before": "var np1 = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var np1 = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  },
  {
    "before": "var np2 = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var np2 = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  },
  {
    "before": "var nlintel = new THREE.Mesh(createCLHuntDenRockGeometry(",
    "after": "var nlintel = new THREE.Mesh(createCLHuntDenWeatheredGeometry("
  }
];
function restorePass56Source(source){for(const c of [...changes].reverse()){assert.equal(source.split(c.after).length-1,1,'Pass56 inverse guard');source=source.replace(c.after,c.before);}return source;}
module.exports={restorePass56Source};
