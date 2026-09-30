/* A sample is recorded only after carrying, pressing and lifting the fork. */
(function(root){
  'use strict';
  var site={x:-.73,y:1.28,z:.8},pot={x:-1.1,z:-.45};
  function valid(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function available(s,locked){
    if(locked||s.plated||s.time>=3600||s.log.length>=1200)return {ready:false,detail:'This recorded or finished cook can be explored, but new checks are locked.'};
    if(!s.pot.pasta||s.pot.drained)return {ready:false,detail:s.pot.drained?'The pasta is drained. Take a fresh sample from the pot before draining in your next cook.':'Add weighed pasta to boiling water before taking a fork sample.'};
    if(root.KitchenRecipes.serving(s).started)return {ready:false,detail:'Serving is in progress. Return the food to the pan before using cooking tools.'};
    return {ready:true,detail:'Start in the pot. Carry to the small saucer, press down, lift back, then release.'};
  }
  function start(p){
    if(!valid(p)||Math.hypot(p.x-pot.x,p.z-pot.z)>.55)return null;
    return {phase:'carry',depth:0,invalid:false,anchor:null,last:0};
  }
  function move(g,p){
    if(!g)return null;var n=Object.assign({},g);
    if(!valid(p)){n.invalid=true;return n;}
    if(g.invalid)return n;
    if(g.phase==='carry'){
      if(Math.hypot(p.x-site.x,p.z-site.z)<.24){n.phase='down';n.anchor={u:p.u,v:p.v};n.last=0;n.settling=true;n.closest=Math.hypot(p.x-site.x,p.z-site.z);}
      return n;
    }
    var travel=p.v-g.anchor.v;
    /* Arrival continues until the fork stops getting closer to the saucer. */
    if(g.phase==='down'&&g.settling){var distance=Math.hypot(p.x-site.x,p.z-site.z);if(distance<g.closest-.001||travel<0&&distance<.24){n.anchor={u:p.u,v:p.v};n.closest=distance;n.depth=0;n.last=0;return n;}if(travel<3)return n;n.settling=false;}
    if(Math.abs(p.u-g.anchor.u)>26)n.invalid=true;
    n.depth=Math.max(0,Math.min(1,travel/65));
    if(g.phase==='down'){if(travel<g.last-12)n.invalid=true;n.last=Math.max(g.last,travel);if(travel>=65){n.phase='up';n.last=travel;}}
    else if(g.phase==='up'){if(travel>g.last+12)n.invalid=true;n.last=Math.min(g.last,travel);if(travel<=10)n.phase='done';}
    return n;
  }
  function complete(g){return !!g&&!g.invalid&&g.phase==='done';}
  function reading(s){
    var R=root.KitchenRecipes,all=R.inspections(s).filter(function(r){return r.kind==='pasta';}),last=all[all.length-1];
    if(!last)return null;var previous=all[all.length-2];
    return Object.assign({},last,{stale:!!s.pot.sample&&(Math.abs(s.pot.progress-s.pot.sample.progress)>.000001||s.pastaModel===1&&last.clumped!==R.pastaSurface(s).clumped),previous:previous?{time:previous.time,label:previous.label}:null});
  }
  function decorate(h){
    var T=h.THREE,R=root.KitchenRecipes,saucer=new T.Group(),fork=new T.Group(),sample=new T.Group(),carried=new T.Group(),cuts=[],lastView=null;
    h.world.add(saucer,fork,carried);saucer.position.set(site.x,site.y-.03,site.z);saucer.add(sample);sample.position.y=.055;
    function mark(o){o.userData.sceneDecoration=true;return o;}
    function cyl(r,b,height,color,x,y,z,parent,extra){return mark(h.cyl(r,b,height,color,x,y,z,parent,extra));}
    function box(w,ht,d,color,x,y,z,parent,extra){return mark(h.box(w,ht,d,color,x,y,z,parent,extra));}
    function mesh(geometry,color,x,y,z,parent,extra){return mark(h.mesh(geometry,color,x,y,z,parent,extra));}
    cyl(.225,.205,.025,'#eee6cd',0,0,0,saucer);cyl(.19,.19,.008,'#f8f3df',0,.018,0,saucer);
    var rim=mesh(new T.TorusGeometry(.211,.007,8,40),'#b79757',0,.018,0,saucer);rim.rotation.x=Math.PI/2;
    function cut(parent,x,z,showCore){
      var g=new T.Group();parent.add(g);g.position.set(x,0,z);
      mesh(new T.CylinderGeometry(.071,.071,.095,32,1,true),'#d4ab57',0,0,0,g,{side:T.DoubleSide});
      mesh(new T.CylinderGeometry(.031,.031,.095,32,1,true),'#b58b41',0,0,0,g,{side:T.DoubleSide});
      var end=mesh(new T.RingGeometry(.031,.071,32),'#e9c977',0,.049,0,g);end.rotation.x=-Math.PI/2;
      var core=mesh(new T.RingGeometry(.999,1,32),'#fff5d6',0,.05,0,g);core.rotation.x=-Math.PI/2;core.visible=false;
      for(var i=0;i<12;i++){var a=i*Math.PI/6,ridge=box(.006,.09,.006,'#e2bf68',Math.cos(a)*.072,0,Math.sin(a)*.072,g);ridge.rotation.y=-a;}
      if(showCore)cuts.push({group:g,core:core,base:core.geometry.getAttribute('position').array.slice()});return g;
    }
    cut(sample,-.084,0,true);cut(sample,.083,.018,true);cut(carried,0,0,false);carried.visible=false;
    box(.037,.016,.42,'#a7b7af',0,0,.25,fork,{metalness:.7,roughness:.3});box(.11,.016,.055,'#bec9c1',0,0,.024,fork,{metalness:.7,roughness:.3});
    for(var tine=0;tine<4;tine++)box(.012,.014,.13,'#cad4ca',(tine-1.5)*.031,0,-.068,fork,{metalness:.7,roughness:.25});
    fork.visible=false;sample.visible=false;
    function reset(){fork.visible=false;carried.visible=false;if(lastView)update(lastView);}
    function update(s){
      lastView=s;fork.visible=false;carried.visible=false;var r=reading(s);sample.visible=!!r;
      cuts.forEach(function(c){c.group.scale.set(1+(r?r.compression*.2:0),1-(r?r.compression*.75:0),1+(r?r.compression*.2:0));c.core.visible=!!r&&r.coreFraction>0;if(r){var width=.04*r.coreFraction*.75,inner=.051-width/2,outer=.051+width/2;var a=c.core.geometry.getAttribute('position');for(var i=0;i<a.count;i++){var oldRadius=Math.hypot(c.base[i*3],c.base[i*3+1]),radius=oldRadius>.9995?outer:inner;a.setXY(i,c.base[i*3]/oldRadius*radius,c.base[i*3+1]/oldRadius*radius);}a.needsUpdate=true;c.core.geometry.computeBoundingSphere();}});
      h.color(rim,r&&r.stale?'#b78136':'#b79757');
    }
    function preview(g,p){
      if(!g)return;fork.visible=true;carried.visible=g.phase==='carry';
      if(g.phase==='carry'&&p){fork.position.set(p.x,1.99,p.z);carried.position.set(p.x,1.92,p.z);}
      else{fork.position.set(site.x,1.60-.24*g.depth,site.z);sample.visible=true;cuts.forEach(function(c){c.core.visible=false;c.group.scale.set(1,1-g.depth*.12,1);});}
    }
    return {update:update,preview:preview,reset:reset,site:site,dispose:function(){h.world.remove(saucer,fork,carried);}};
  }
  var api={site:site,pot:pot,start:start,move:move,complete:complete,available:available,reading:reading,decorate:decorate};
  root.KitchenSampling=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
