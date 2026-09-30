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
  function available(s,index,locked){
    var R=root.KitchenRecipes,p=Number.isInteger(index)&&R.panSurface(s).pieces[index],ready=!locked&&!s.plated&&s.time<3600&&s.log.length<1200&&s.panModel===2&&s.pan.produce&&!R.serving(s).started&&!!p;
    return {ready:ready,detail:locked||s.plated?'Recorded kitchen. Explore the surfaces without turning them.':R.serving(s).started?'Return the spoonfuls to the pan before turning a piece.':!p||s.panModel!==2||!s.pan.produce?'Add prepared produce in a fresh cook before turning a slice.':'Slide right, lift up, sweep left to turn, then lower and release.'};
  }
  function reading(s,index){var p=root.KitchenRecipes.panSurface(s).pieces[index];return p?{index:p.index,top:p.topColor,bottom:p.bottomColor,width:p.width,damage:p.damage}:null;}
  function decorate(h){
    var T=h.THREE,group=new T.Group();group.userData.sceneDecoration=true;h.world.add(group);
    function mesh(g,c,x,y,z,extra){var m=h.mesh(g,c,x,y,z,group,extra);m.userData.sceneDecoration=true;return m;}
    mesh(new T.BoxGeometry(.25,.014,.29),'#b9c5bd',0,0,0,{roughness:.3,metalness:.5});
    for(var i=0;i<4;i++)mesh(new T.BoxGeometry(.018,.001,.20),'#43584a',-.075+i*.05,.008,0);
    mesh(new T.BoxGeometry(.065,.026,.18),'#aeb9a8',0,0,.21,{roughness:.35,metalness:.4});
    mesh(new T.BoxGeometry(.075,.035,.37),'#3d5143',0,.006,.47,{roughness:.8});
    mesh(new T.BoxGeometry(.08,.038,.035),'#b9954e',0,.006,.315,{roughness:.5});
    var loop=mesh(new T.TorusGeometry(.025,.005,6,16),'#afbbac',0,.006,.65);loop.rotation.x=Math.PI/2;
    function reset(){group.position.set(2.05,1.215,.85);group.rotation.set(0,.35,0);group.scale.setScalar(1);}
    function preview(p,g){
      var slide=g.phase==='slide'?g.progress:1;
      group.position.set(p.x-.28*(1-slide),p.y-.04+.33*g.lift,p.z);
      group.rotation.set(0,0,g.angle);group.scale.setScalar(Math.max(.8,Math.min(1.3,p.scale||1)));
    }
    reset();return {group:group,reset:reset,preview:preview,dispose:function(){h.world.remove(group);}};
  }
  var api={lengths:lengths,start:start,move:move,complete:complete,available:available,reading:reading,decorate:decorate};root.KitchenTurning=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
