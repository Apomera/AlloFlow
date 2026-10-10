const assert=require('node:assert/strict');
const changes=[
  {
    "label": "smoother longitudinal oral ribbon",
    "before": "reset();var sections=18,columns=5,length=0.66+oral*0.035",
    "after": "reset();var sections=30,columns=5,length=0.66+oral*0.035"
  },
  {
    "label": "rounded cross section",
    "before": "z=centerZ+0.022*(1-Math.abs(across))*Math.sin(t*Math.PI)+Math.abs(across)*0.009*Math.sin(t*25+oralPhase)",
    "after": "z=centerZ+0.022*(1-across*across)*Math.sin(t*Math.PI)+across*across*0.009*Math.sin(t*25+oralPhase)"
  },
  {
    "label": "retain oral rest state and conservative bounds",
    "before": "            var geometry=finish();geometry.userData.clJellyAttachment={kind:'oral',rootIndex:0,mouthCorner:mouthCorners[oral],anchor:anchors[oral].slice()};",
    "after": "            var geometry=finish();geometry.userData.clJellyAttachment={kind:'oral',rootIndex:0,mouthCorner:mouthCorners[oral],anchor:anchors[oral].slice()};\n            geometry.userData.clJellyOral={base:new Float32Array(geometry.attributes.position.array),length:length,phase:oralPhase,maximumDisplacement:0.16};\n            geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);geometry.attributes.normal.setUsage(THREE.DynamicDrawUsage);\n            geometry.boundingBox.expandByScalar(0.16);geometry.boundingBox.getBoundingSphere(geometry.boundingSphere);"
  },
  {
    "label": "continuous soft tissue deformation",
    "before": "        // Retain the bell deformation formula. Reuse native typed arrays and transforms;",
    "after": "        // A wave travels down the oral tissue. Subtract its spawn pose so motion starts continuously.\n        // The root stays exact; retained buffers and conservative bounds avoid frame allocations.\n        function deformCLHuntJellyOralArm(geometry,phase){\n          var oral=geometry.userData.clJellyOral,base=oral.base,p=geometry.attributes.position.array,n=geometry.attributes.normal.array,ix=geometry.index.array;\n          for(var vertex=0;vertex<p.length;vertex+=3){\n            var x=base[vertex],y=base[vertex+1],z=base[vertex+2],t=Math.min(1,Math.max(0,-y/oral.length)),bend=t*t;\n            var lag=oral.phase-t*3.8,twistLag=oral.phase-t*2.4;\n            var twist=0.12*bend*(Math.sin(phase*0.85+twistLag)-Math.sin(twistLag)),c=Math.cos(twist),s=Math.sin(twist);\n            p[vertex]=x*c-z*s+0.04*bend*(Math.sin(phase+lag)-Math.sin(lag));\n            p[vertex+1]=y;\n            p[vertex+2]=x*s+z*c+0.03*bend*(Math.cos(phase+lag*0.8)-Math.cos(lag*0.8));\n          }\n          n.fill(0);\n          for(var face=0;face<ix.length;face+=3){var a=ix[face]*3,b=ix[face+1]*3,c=ix[face+2]*3,ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2],nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;n[a]+=nx;n[a+1]+=ny;n[a+2]+=nz;n[b]+=nx;n[b+1]+=ny;n[b+2]+=nz;n[c]+=nx;n[c+1]+=ny;n[c+2]+=nz;}\n          for(var vertex=0;vertex<n.length;vertex+=3){var length=Math.hypot(n[vertex],n[vertex+1],n[vertex+2]);if(length>0){n[vertex]/=length;n[vertex+1]/=length;n[vertex+2]/=length;}}\n          geometry.attributes.position.needsUpdate=true;geometry.attributes.normal.needsUpdate=true;\n        }\n\n        // Retain the bell deformation formula. Reuse native typed arrays and transforms;"
  },
  {
    "label": "apply travel wave after root placement",
    "before": "if(part.kind==='oral'){entry.mesh.position.set(part.anchor[0]*scale,part.anchor[1]*scale,part.anchor[2]*scale);entry.mesh.rotation.x=wave;}",
    "after": "if(part.kind==='oral'){entry.mesh.position.set(part.anchor[0]*scale,part.anchor[1]*scale,part.anchor[2]*scale);entry.mesh.rotation.x=wave;deformCLHuntJellyOralArm(entry.mesh.geometry,(now*0.003+0.55-ud.oralPhaseOrigin)*0.72);}"
  },
  {
    "label": "remember the seeded oral motion origin",
    "before": "          g.userData.jellyVisual=visual;",
    "after": "          g.userData.jellyVisual=visual;\n          g.userData.oralPhaseOrigin=g.userData.pulsePhase;"
  }
];
function restorePass48Source(source){for(const change of [...changes].reverse()){assert.equal(source.split(change.after).length-1,1,'Pass48 inverse guard: '+change.label);source=source.replace(change.after,change.before);}return source;}
module.exports={restorePass48Source};
