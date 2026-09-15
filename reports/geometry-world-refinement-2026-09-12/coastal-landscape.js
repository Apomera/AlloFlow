// Lives inside initLandscape and reuses its merged, vertex-coloured mesh helper.
// Every surface is decorative: no engine.blocks entries, collision or ray hits.
function buildCoastalLandscape(x0, x1, z0, z1, baseY, saver) {
  var group = new THREE.Group(); group.name = 'gw-coastal-landscape';
  group.userData.gwLandscape = true; group.userData.gwDecorative = true;
  var cx = (x0 + x1 + 1) / 2, cz = (z0 + z1 + 1) / 2, seaY = baseY + 0.15;
  var coast = buffer(), sea = buffer(), foam = buffer(), islands = buffer(), beacons = buffer(), sails = buffer();
  var blue = color(0x367984), shallow = color(0x579799), foamColor = color(0xa7cfca);
  var rock = color(0x758477), rockLight = color(0x99a18e), sand = color(0xbab391);
  function quad(out, a, b, c, d, tint) { triangle(out, a, b, c, tint); triangle(out, a, c, d, tint); }
  // The sea lies under the lesson slab but above the old green horizon. Its
  // vertices never enter the block map and the same landscape disposal owns it.
  quad(sea, [cx-300,seaY,cz-300], [cx-300,seaY,cz+300], [cx+300,seaY,cz+300], [cx+300,seaY,cz-300], blue);
  var outline = [], perSide = saver ? 10 : 18;
  for (var side=0;side<4;side++) for(var n=0;n<perSide;n++) {
    var u=n/perSide, p;
    if(side===0)p={x:x1+1,z:z0+(z1+1-z0)*u,nx:1,nz:0};
    if(side===1)p={x:x1+1-(x1+1-x0)*u,z:z1+1,nx:0,nz:1};
    if(side===2)p={x:x0,z:z1+1-(z1+1-z0)*u,nx:-1,nz:0};
    if(side===3)p={x:x0+(x1+1-x0)*u,z:z0,nx:0,nz:-1};
    outline.push(p);
  }
  var rings = [0,1.05,2.8,5.5];
  var ringPoints = rings.map(function(distance,r) { return outline.map(function(p,i) {
    var variation = r ? Math.sin(i*1.73+r)*0.15+Math.sin(i*.73)*0.1 : 0;
    var offset = distance * (1+variation);
    var y = r===0 ? baseY+1.02 : r===1 ? baseY+.61+Math.sin(i*1.2)*.12 : r===2 ? seaY+.025 : seaY+.004;
    return [p.x+p.nx*offset,y,p.z+p.nz*offset];
  }); });
  for(var r=0;r<rings.length-1;r++)for(var i=0;i<outline.length;i++){
    var j=(i+1)%outline.length;
    var tint=r===0 ? (i%3 ? rock : rockLight) : r===1 ? sand : shallow;
    quad(r===2?sea:coast,ringPoints[r][i],ringPoints[r][j],ringPoints[r+1][j],ringPoints[r+1][i],tint);
  }
  // Broken pale shore lines and broad quiet glints keep the water readable. They
  // remain still at every motion preference; no per-frame work or shader clock.
  for(var i=0;i<outline.length;i++)if(i%3!==1){
    var a=ringPoints[2][i],b=ringPoints[2][(i+1)%outline.length],p=outline[i];
    quad(foam,[a[0],seaY+.055,a[2]],[b[0],seaY+.055,b[2]],
      [b[0]+p.nx*.14,seaY+.055,b[2]+p.nz*.14],[a[0]+p.nx*.14,seaY+.055,a[2]+p.nz*.14],foamColor);
  }
  var glints=saver?14:28;
  for(var g=0;g<glints;g++){
    var east=g%2===0, gx=east?x1+11+(g*17%47):x0-11-(g*13%43),gz=cz-44+(g*19%88);
    var width=1.2+(g%4)*.65,depth=.055+(g%3)*.03;
    quad(foam,[gx-width,seaY+.02,gz-depth],[gx-width,seaY+.02,gz+depth],[gx+width,seaY+.02,gz+depth],[gx+width,seaY+.02,gz-depth],foamColor);
  }
  function island(x,z,rx,rz,height,seed) {
    var count=saver?12:20, rows=[];
    for(var ring=0;ring<4;ring++){
      var radius=[1,.79,.46,.025][ring],heightFactor=[0,.23,.72,1][ring],row=[];
      for(var k=0;k<count;k++){
        var angle=k/count*Math.PI*2,crinkle=1+Math.sin(k*2.31+seed)*.13;
        row.push([x+Math.cos(angle)*rx*radius*crinkle,seaY+height*heightFactor+(ring?Math.sin(k*1.7+seed)*height*.05:0),z+Math.sin(angle)*rz*radius*crinkle]);
      }rows.push(row);
    }
    for(var r=0;r<3;r++)for(var k=0;k<count;k++){
      var next=(k+1)%count;
      quad(islands,rows[r][k],rows[r+1][k],rows[r+1][next],rows[r][next],r===0?color(0x7f958b):r===1?color(0x658878):color(0x8a9c84));
    }
    return seaY+height;
  }
  island(x0-28,z0-24,15,8,5.6,2);
  island(cx+2,z0-64,22,9,7.2,4);
  var beaconX=x1+27,beaconZ=z0+7,beaconY=island(beaconX,beaconZ,8,6,2.6,7);
  function cylinder(out,x,y,z,radius,height,tint,segments) {
    var top=[x,y+height,z];
    for(var k=0;k<segments;k++){
      var a=k/segments*Math.PI*2,b=(k+1)/segments*Math.PI*2;
      var p=[x+Math.cos(a)*radius,y,z+Math.sin(a)*radius],q=[x+Math.cos(b)*radius,y,z+Math.sin(b)*radius];
      var pt=[p[0],y+height,p[2]],qt=[q[0],y+height,q[2]];
      quad(out,p,pt,qt,q,tint);triangle(out,pt,top,qt,tint);
    }
  }
  // A small offshore beacon is a skyline reference, distinct from the student's
  // lighthouse activity. Its island is outside every teaching/building cell.
  var cream=color(0xeee6ce),coral=color(0xa85849),dark=color(0x465c60);
  for(var band=0;band<5;band++)cylinder(beacons,beaconX,beaconY+band*1.18,beaconZ,.68-band*.025,1.18,band%2?coral:cream,10);
  cylinder(beacons,beaconX,beaconY+5.9,beaconZ,.92,.22,dark,10);
  cylinder(beacons,beaconX,beaconY+6.12,beaconZ,.43,.7,color(0xd0bc74),8);
  crown(beacons,beaconX,beaconY+6.82,beaconZ,.86,.72,coral,0,0);
  function sailboat(x,z,scale,heading) {
    var dx=Math.cos(heading),dz=Math.sin(heading),px=-dz,pz=dx;
    var bow=[x+dx*scale*1.65,seaY+.16,z+dz*scale*1.65],stern=[x-dx*scale,seaY+.16,z-dz*scale];
    var left=[x+px*scale*.47,seaY+.08,z+pz*scale*.47],right=[x-px*scale*.47,seaY+.08,z-pz*scale*.47];
    triangle(sails,bow,left,stern,dark);triangle(sails,bow,stern,right,dark);
    cylinder(sails,x,seaY+.16,z,.035*scale,3.1*scale,dark,5);
    triangle(sails,[x,seaY+.45,z],[x,seaY+3.15*scale,z],[x+dx*scale*1.8,seaY+.6,z+dz*scale*1.8],cream);
    triangle(sails,[x,seaY+.5,z],[x-dx*scale*.95,seaY+.75,z-dz*scale*.95],[x,seaY+2.8*scale,z],color(0xd2a070));
  }
  sailboat(cx-5,z0-17,.83,.25); if(!saver)sailboat(x1+18,cz+14,.63,1.7);
  var seaMesh=meshFrom(sea,'gw-coastal-water',false,false);seaMesh.material.roughness=.46;seaMesh.material.metalness=.03;
  group.add(seaMesh);
  group.add(meshFrom(coast,'gw-rocky-shore',false,true));
  var foamMesh=meshFrom(foam,'gw-quiet-water-glints',false,true);foamMesh.material.transparent=true;foamMesh.material.opacity=.34;foamMesh.material.depthWrite=false;
  group.add(foamMesh);
  group.add(meshFrom(islands,'gw-distant-coastal-islands',false,true));
  group.add(meshFrom(beacons,'gw-offshore-beacon',false,true));
  group.add(meshFrom(sails,'gw-distant-sailboats',false,true));
  group.children.forEach(function(mesh){mesh.userData.gwDecorative=true;});
  group.userData.gwLandscapeDetail={theme:'coastal',tier:saver?'saver':'detail',islands:3,beacons:1,sailboats:saver?1:2,shoreSegments:outline.length,glints:glints};
  return group;
}
