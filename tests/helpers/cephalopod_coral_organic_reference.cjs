// Exact approved pass38 inverses preserve every historical fixture hash.
const assert=require('node:assert/strict');
const patches=[
  {
    "name": "pass38 coral branch index range for static shared normals",
    "before": "            var first=positions.length/3,last=steps+3,endRadius=radius*(1-taper);",
    "after": "            var first=positions.length/3,firstIndex=indices.length,last=steps+3,endRadius=radius*(1-taper);",
    "expectedMatches": 1
  },
  {
    "name": "pass38 bounded organic coral shoulders",
    "before": "              var radiusNow=row<=steps?radius*(1-taper*t*t*(3-2*t)):endRadius*Math.cos(cap);\n              var slope=row<=steps?-radius*taper*6*t*u/Math.max(0.00001,speed):0;",
    "after": "              var radiusNow=row<=steps?radius*(1-taper*t*t*(3-2*t)):endRadius*Math.cos(cap);\n              // Keep broad root collars and rounded tips; only interior rings lose material.\n              var shoulderEnvelope=row>0&&row<steps?16*t*t*u*u:0;\n              var shoulderPhase=surfaceBranch*1.91+phase*0.37,shoulderVariation=Math.sin(shoulderPhase);\n              var waist=Math.min(0.18,0.035+taper*0.255)*(0.80+0.20*shoulderVariation*shoulderVariation);\n              var slope=row<=steps?-radius*taper*6*t*u/Math.max(0.00001,speed):0;",
    "expectedMatches": 1
  },
  {
    "name": "pass38 asymmetric inward coral fluting",
    "before": "                positions.push(center.x+radial.x*radiusNow,center.y+radial.y*radiusNow,center.z+radial.z*radiusNow);",
    "after": "                // Unequal shoulders and shallow flutes stay on the accepted radial rays.\n                var flute=0.04*(0.5+0.3*Math.cos(angle+shoulderPhase)+0.2*Math.cos(angle*3-shoulderPhase+t*0.8));\n                var radiusSide=radiusNow*(1-shoulderEnvelope*(waist+flute));\n                positions.push(center.x+radial.x*radiusSide,center.y+radial.y*radiusSide,center.z+radial.z*radiusSide);",
    "expectedMatches": 1
  },
  {
    "name": "pass38 area weighted coral seam and tip normals",
    "before": "              }\n            }\n          }\n          var baseY=-height/2,rootPoint=new THREE.Vector3(0,baseY,0);",
    "after": "              }\n            }\n            // Shade the actual static shape, sharing normals at the closing seam and tip.\n            // The intersecting branch roots retain their accepted independent topology.\n            var areaNormals=[],normalCount=(last+1)*(sides+1)*3;\n            for(var normalSlot=0;normalSlot<normalCount;normalSlot++)areaNormals[normalSlot]=0;\n            function sharedNormalOffset(vertex){\n              var local=vertex-first,ring=Math.floor(local/(sides+1)),side=local%(sides+1);\n              return (ring*(sides+1)+(ring===last||side===sides?0:side))*3;\n            }\n            for(var triangle=firstIndex;triangle<indices.length;triangle+=3){\n              var a3=indices[triangle]*3,b3=indices[triangle+1]*3,c3=indices[triangle+2]*3;\n              // Use the coordinates that the Float32 position attribute will contain.\n              var ax=Math.fround(positions[a3]),ay=Math.fround(positions[a3+1]),az=Math.fround(positions[a3+2]);\n              var abx=Math.fround(positions[b3])-ax,aby=Math.fround(positions[b3+1])-ay,abz=Math.fround(positions[b3+2])-az;\n              var acx=Math.fround(positions[c3])-ax,acy=Math.fround(positions[c3+1])-ay,acz=Math.fround(positions[c3+2])-az;\n              var nx=aby*acz-abz*acy,ny=abz*acx-abx*acz,nz=abx*acy-aby*acx;\n              for(var corner=0;corner<3;corner++){\n                var at=sharedNormalOffset(indices[triangle+corner]);\n                areaNormals[at]+=nx;areaNormals[at+1]+=ny;areaNormals[at+2]+=nz;\n              }\n            }\n            for(var vertex=first;vertex<first+(last+1)*(sides+1);vertex++){\n              var at=sharedNormalOffset(vertex),nx=areaNormals[at],ny=areaNormals[at+1],nz=areaNormals[at+2],length=Math.sqrt(nx*nx+ny*ny+nz*nz),normalAt=vertex*3;\n              if(length>0.00000000000000000001){normals[normalAt]=nx/length;normals[normalAt+1]=ny/length;normals[normalAt+2]=nz/length;}\n              else{var fallback=first*3+at;normals[normalAt]=normals[fallback];normals[normalAt+1]=normals[fallback+1];normals[normalAt+2]=normals[fallback+2];}\n            }\n          }\n          var baseY=-height/2,rootPoint=new THREE.Vector3(0,baseY,0);",
    "expectedMatches": 1
  }
];
function restorePass38CoralSource(source){source=require('./cephalopod_pass64_reference.cjs').restorePass64CoralSource(source);for(const p of patches.slice().reverse()){assert.equal(source.split(p.after).length-1,1,'Approved pass38 source changed: '+p.name);source=source.replace(p.after,p.before);}return source;}
module.exports={restorePass38CoralSource};
