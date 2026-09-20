// Shared procedural meadow primitives. No DOM, GPU resources, live state, or randomness is shared.
// Extracted unchanged from Bee Lab; each consumer owns returned arrays and scene resources.
(function(root){
  'use strict';
  if(root.StemMeadow)return;
  function vegetation(kind) {
    if (['shrub','grass','reed','seed'].indexOf(kind)<0) return null;
    var positions=[],colors=[],smoothVertices=0;
    function tri(a,b,c) {
      var ux=b[0]-a[0],uy=b[1]-a[1],uz=b[2]-a[2],vx=c[0]-a[0],vy=c[1]-a[1],vz=c[2]-a[2];
      if (Math.hypot(uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx)<1e-9) return;
      [a,b,c].forEach(function(p){positions.push(p[0],p[1],p[2]);var shade=p[3]==null?1:p[3];colors.push(shade,shade,shade);});
    }
    function ellipsoid(cx,cy,cz,rx,ry,rz,shade,segments,rings) {
      function point(lat,lon){var a=lat*Math.PI/rings,b=lon*Math.PI*2/segments;return [cx+rx*Math.sin(a)*Math.cos(b),cy+ry*Math.cos(a),cz+rz*Math.sin(a)*Math.sin(b),shade];}
      for(var lat=0;lat<rings;lat++)for(var lon=0;lon<segments;lon++){
        var a=point(lat,lon),b=point(lat+1,lon),c=point(lat,lon+1),d=point(lat+1,lon+1);tri(a,c,b);tri(b,c,d);
      }
    }
    if(kind==='shrub') {
      ellipsoid(0,0,0,.8,.8,.8,.86,10,6);smoothVertices=positions.length/3;
      for(var leaf=0;leaf<34;leaf++){
        var ny=1-2*(leaf+.5)/34,a=leaf*2.399963,ring=Math.sqrt(1-ny*ny),n=[Math.cos(a)*ring,ny,Math.sin(a)*ring];
        var u=[-Math.sin(a),0,Math.cos(a)],v=[ny*Math.cos(a),-ring,ny*Math.sin(a)],shade=.75+(leaf%5)*.06;
        function leafPoint(along,across,lift,tone){return [n[0]*(.82+lift)+u[0]*along+v[0]*across,n[1]*(.82+lift)+u[1]*along+v[1]*across,n[2]*(.82+lift)+u[2]*along+v[2]*across,tone];}
        var tip=leafPoint(.36,0,0,shade),base=leafPoint(-.28,0,0,shade*.8),left=leafPoint(0,.15,0,shade*.84),right=leafPoint(0,-.15,0,shade*.9),ridge=leafPoint(0,0,.09,shade);
        tri(base,left,ridge);tri(left,tip,ridge);tri(tip,right,ridge);tri(right,base,ridge);
      }
    } else if(kind==='seed') {
      ellipsoid(0,0,0,.055,1,.055,.78,5,3);
      for(var seed=0;seed<9;seed++){
        var side=seed%2?-1:1,sy=-.7+seed*.17,reach=.26*(1-seed*.055);
        ellipsoid(side*reach,sy,Math.sin(seed*2.1)*.11,.19,.19,.12,.78+(seed%3)*.1,5,3);
      }
    } else {
      // A central stalk supports the seed head. Folded ribbons reveal a curved,
      // tapered blade instead of a large triangular sail at ground level.
      if(kind==='grass') {
        tri([-.022,0,0,.7],[.022,0,0,.7],[.014,1,0,.9]);tri([-.022,0,0,.7],[.014,1,0,.9],[-.014,1,0,.9]);
        tri([0,0,-.022,.7],[0,1,.014,.9],[0,0,.022,.7]);tri([0,0,-.022,.7],[0,1,-.014,.9],[0,1,.014,.9]);
      }
      for(var blade=0;blade<4;blade++){
        var angle=blade*2.399963,dx=Math.cos(angle),dz=Math.sin(angle),height=.76+(blade%2)*.2,reach=.48+(blade%3)*.085;
        function bladePoint(t,edge){var bend=reach*t*t,y=height*(t-.32*t*t*t),width=.12*Math.sin(Math.PI*t),ridge=edge===0?.025*Math.sin(Math.PI*t):0;return [dx*bend-dz*width*edge,y+ridge,dz*bend+dx*width*edge,edge===0?.98:.69+(blade%3)*.07];}
        for(var section=0;section<5;section++){
          var t=section/5,next=(section+1)/5;
          [-1,1].forEach(function(side){var a=bladePoint(t,side),b=bladePoint(next,side),c=bladePoint(t,0),d=bladePoint(next,0);tri(a,b,c);tri(b,d,c);});
        }
      }
    }
    return {positions:positions,colors:colors,smoothVertices:smoothVertices};
  }

  function ambientPose(index, state, reducedMotion) {
    if (!Number.isInteger(index) || index < 0 || index >= 8) return null;
    var clock=state && Number.isFinite(state.simulationClock)?Math.max(0,state.simulationClock):0;
    var time=reducedMotion?0:clock, wander=time*.42+index*.83;
    return {point:{x:Math.sin(index*1.9)*150+Math.cos(wander)*34,
      y:16+(index%4)*9+Math.sin(wander*1.7)*5,z:-90-index*165+Math.sin(wander)*34},
      yaw:wander+Math.PI,wingAngle:reducedMotion?.38:.2+.85*(.5+.5*Math.sin(time*11+index))};
  }

  function butterflyWing(kind) {
    if(kind!=='fore' && kind!=='hind')return null;
    var fore=kind==='fore',outline=fore?[[.35,-1.5],[2,-5.8],[7.8,-8.1],[10,-6],[9.2,-2.6],[6.5,.7],[2,1.4],[.3,.5]]
      :[[.3,.6],[3.9,.4],[7.2,1.7],[8,4.1],[6.1,6.6],[3.5,6.8],[1.1,4.5],[.3,1.8]];
    for(var pass=0;pass<2;pass++){
      var smooth=[];for(var n=0;n<outline.length;n++){var a=outline[n],b=outline[(n+1)%outline.length];smooth.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}outline=smooth;
    }
    var positions=[],tones=[],center=fore?[3.3,-2.3]:[3.3,3.3],dark=0x332b2e;
    function tri(a,b,c,tone){[a,b,c].forEach(function(p){positions.push(p[0],p[1],p[2]);tones.push(tone);});}
    function point(p,r){return [center[0]+(p[0]-center[0])*r,.14*Math.sin(r*Math.PI),center[1]+(p[1]-center[1])*r];}
    var rings=[0,.26,.79,.84,1],palette=fore?[0xf5c676,0xe99a49,0xc57038,dark]:[0xf5c676,0xe4a34e,0xbf703d,dark];
    for(var i=0;i<outline.length;i++)for(var band=0;band<rings.length-1;band++){
      var a=point(outline[i],rings[band]),b=point(outline[(i+1)%outline.length],rings[band]),c=point(outline[i],rings[band+1]),d=point(outline[(i+1)%outline.length],rings[band+1]);
      if(band>0)tri(a,b,c,palette[band]);tri(b,d,c,palette[band]);
    }
    function line(a,b,width){
      var dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length*width,nz=dx/length*width;
      [.19,-.03].forEach(function(y){tri([a[0]-nx,y,a[1]-nz],[b[0]-nx,y,b[1]-nz],[b[0]+nx,y,b[1]+nz],dark);tri([a[0]-nx,y,a[1]-nz],[b[0]+nx,y,b[1]+nz],[a[0]+nx,y,a[1]+nz],dark);});
    }
    for(var vein=3;vein<outline.length-3;vein+=5){
      var end=point(outline[vein],.83),joint=[center[0]+(end[0]-center[0])*.55,center[1]+(end[2]-center[1])*.55];
      line([.65,fore?-.6:1.1],joint,.045);line(joint,[end[0],end[2]],.035);
      var fork=point(outline[Math.min(vein+2,outline.length-1)],.81);line(joint,[fork[0],fork[2]],.025);
    }
    for(var spot=5;spot<outline.length-4;spot+=3){
      var p=point(outline[spot],.91),radius=fore?.19:.16;
      [.2,-.04].forEach(function(y){for(var edge=0;edge<8;edge++){var a=edge*Math.PI/4,b=(edge+1)*Math.PI/4;tri([p[0],y,p[2]],[p[0]+Math.cos(a)*radius,y,p[2]+Math.sin(a)*radius],[p[0]+Math.cos(b)*radius,y,p[2]+Math.sin(b)*radius],0xffe9bc);}});
    }
    return {positions:positions,tones:tones};
  }
  root.StemMeadow=Object.freeze({vegetation:vegetation,butterflyWing:butterflyWing,ambientPose:ambientPose});
})(window);
