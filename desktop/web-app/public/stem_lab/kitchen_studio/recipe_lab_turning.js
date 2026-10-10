/* Spatula movements preview a turn. Only setting the slice down records it. */
(function(root){
  'use strict';
  var lengths={slide:32,lift:40,turn:52,lower:40};
  function finite(p){return !!p&&Number.isFinite(p.u)&&Number.isFinite(p.v);}
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function start(p){return finite(p)?{phase:'slide',anchor:{u:p.u,v:p.v},progress:0,lift:0,angle:0,invalid:false}:null;}
  function move(g,p){
    if(!g)return null;var n=Object.assign({},g);
    if(!finite(p)){n.invalid=true;return n;}
    if(g.invalid||g.phase==='release')return n;
    var dx=p.u-g.anchor.u,dy=p.v-g.anchor.v;
    if((g.phase==='slide'||g.phase==='turn')&&Math.abs(dy)>20||(g.phase==='lift'||g.phase==='lower')&&Math.abs(dx)>22){n.invalid=true;return n;}
    var travel=g.phase==='slide'?dx:g.phase==='lift'?-dy:g.phase==='turn'?-dx:dy;
    n.progress=clamp(travel/lengths[g.phase]);
    if(g.phase==='lift')n.lift=n.progress;
    if(g.phase==='turn')n.angle=n.progress*Math.PI;
    if(g.phase==='lower')n.lift=1-n.progress;
    if(n.progress===1){n.phase={slide:'lift',lift:'turn',turn:'lower',lower:'release'}[g.phase];n.anchor={u:p.u,v:p.v};n.progress=0;}
    return n;
  }
  function complete(g){return !!g&&!g.invalid&&g.phase==='release';}
  function release(g,p){
    if(!g)return null;
    var n=Object.assign({},g,{anchor:g.anchor?Object.assign({},g.anchor):g.anchor});
    if(!complete(g)||!finite(p)||!finite(g.anchor)||Math.hypot(p.u-g.anchor.u,p.v-g.anchor.v)>24)n.invalid=true;
    return n;
  }
  function available(s,index,locked){
    if(!s||!s.pan||!s.pot||!s.prep||!Array.isArray(s.log))return {ready:false,detail:'Add prepared produce in a fresh cook before turning a slice.'};
    var R=root.KitchenRecipes,p=Number.isInteger(index)&&R.panSurface(s).pieces[index],ready=!locked&&!s.plated&&!s.submitted&&s.time<3600&&s.log.length<1200&&s.panModel===2&&s.pan.produce&&!R.serving(s).started&&!!p;
    return {ready:ready,detail:locked||s.plated||s.submitted?'Recorded kitchen. Explore the surfaces without turning them.':R.serving(s).started?'Return the spoonfuls to the pan before turning a piece.':!p||s.panModel!==2||!s.pan.produce?'Add prepared produce in a fresh cook before turning a slice.':'Slide right, lift up, sweep left to turn, then lower and release.'};
  }
  function reading(s,index){var p=root.KitchenRecipes.panSurface(s).pieces[index];return p?{index:p.index,top:p.topColor,bottom:p.bottomColor,width:p.width,damage:p.damage}:null;}
  function forecast(s,index,locked){
    if(!available(s,index,locked).ready)return null;
    var p=reading(s,index);
    return {index:p.index,width:p.width,topBefore:p.top,bottomBefore:p.bottom,topAfter:p.bottom,bottomAfter:p.top,damage:p.damage,summary:'If completed: Piece '+(p.index+1)+' exposes its '+p.bottom+' underside; the '+p.top+' face contacts the pan. Turning swaps the faces without adding browning or removing scorching.'};
  }
  function decorate(h){
    var T=h.THREE,group=new T.Group();group.userData.sceneDecoration=true;h.world.add(group);
    function mesh(g,c,x,y,z,extra){var m=h.mesh(g,c,x,y,z,group,extra);m.userData.sceneDecoration=true;return m;}
    function sheet(shape,depth){var g=new T.ExtrudeGeometry(shape,{depth:depth,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:1,steps:1,curveSegments:6});g.rotateX(Math.PI/2);g.translate(0,depth/2,0);return g;}
    var blade=new T.Shape();blade.moveTo(-.105,-.155);blade.lineTo(.105,-.155);blade.quadraticCurveTo(.133,-.155,.133,-.127);blade.lineTo(.12,.105);blade.quadraticCurveTo(.12,.143,.087,.143);blade.lineTo(-.087,.143);blade.quadraticCurveTo(-.12,.143,-.12,.105);blade.lineTo(-.133,-.127);blade.quadraticCurveTo(-.133,-.155,-.105,-.155);
    for(var i=0;i<4;i++){var x=-.078+i*.052,slot=new T.Path();slot.moveTo(x-.01,-.103);slot.lineTo(x-.01,.077);slot.quadraticCurveTo(x-.01,.087,x,.087);slot.quadraticCurveTo(x+.01,.087,x+.01,.077);slot.lineTo(x+.01,-.103);slot.quadraticCurveTo(x+.01,-.113,x,-.113);slot.quadraticCurveTo(x-.01,-.113,x-.01,-.103);blade.holes.push(slot);}
    mesh(sheet(blade,.014),'#c5d0cf',0,0,0,{roughness:.34,metalness:.65});
    mesh(new T.BoxGeometry(.062,.02,.18),'#b9c5c2',0,0,.215,{roughness:.38,metalness:.6});
    var grip=new T.Shape();grip.moveTo(-.028,-.18);grip.quadraticCurveTo(-.043,-.06,-.037,.12);grip.quadraticCurveTo(-.036,.18,0,.18);grip.quadraticCurveTo(.036,.18,.037,.12);grip.quadraticCurveTo(.043,-.06,.028,-.18);grip.closePath();
    mesh(sheet(grip,.035),'#7e5538',0,.006,.475,{roughness:.76});
    for(var j=0;j<3;j++)mesh(new T.BoxGeometry(.0018,.001,.25),'#996c49',-.017+j*.015,.025,.47,{roughness:.9});
    mesh(new T.BoxGeometry(.079,.038,.035),'#b69d69',0,.006,.315,{roughness:.43,metalness:.55});
    [.37,.565].forEach(function(z){mesh(new T.CylinderGeometry(.009,.009,.003,12),'#c8b480',0,.027,z,{roughness:.3,metalness:.65});});
    var loop=mesh(new T.TorusGeometry(.025,.005,6,16),'#b9c5c2',0,.006,.65,{roughness:.35,metalness:.6});loop.rotation.x=Math.PI/2;
    function reset(){group.position.set(2.05,1.215,.85);group.rotation.set(0,.35,0);group.scale.setScalar(1);}
    function preview(p,g){
      var slide=g.phase==='slide'?g.progress:1;
      group.position.set(p.x-.28*(1-slide),p.y-.04+.33*g.lift,p.z);
      group.rotation.set(0,0,g.angle);group.scale.setScalar(Math.max(.8,Math.min(1.3,p.scale||1)));
    }
    reset();return {group:group,reset:reset,preview:preview,dispose:function(){h.world.remove(group);}};
  }
  var api={lengths:lengths,start:start,move:move,complete:complete,release:release,available:available,reading:reading,forecast:forecast,decorate:decorate};root.KitchenTurning=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
