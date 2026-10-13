/* The practice cup is a draft. Only a measured transfer adds recipe oil. */
(function(root){
  'use strict';
  var cup={x:-2.05,y:1.165,z:-.48},bottle={x:-2.35,y:1.39,z:-1.35},capacity=60;
  function finite(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function amount(n){return Number.isFinite(n)?Math.max(0,Math.min(capacity,Math.round(n))):0;}
  function info(s,n,locked){
    var R=root.KitchenRecipes,goal=R.ingredients(s).oil,ready=!locked&&!s.plated&&!s.submitted&&s.time<3600&&s.log.length<1200&&!s.pan.oil&&!R.serving(s).started,n=amount(n);
    return {amount:n,goal:goal,ready:ready,exact:ready&&n===goal,detail:!ready?(s.pan.oil?'The recipe oil is already in the pan.':'This recorded or finished cook is read-only.'):n===goal?'Recipe measure ready. Carry the cup into the sauce pan.':n>goal?(n-goal)+' mL over the recipe measure. Return the cup to the bottle to remeasure.':(goal-n)+' mL still needed. Tilt the bottle gently; level it to stop.'};
  }
  function session(){var n=0,last=null,historical=false;return {get:function(){return n;},set:function(v){if(Number.isFinite(v))n=amount(v);return n;},sync:function(s,recorded){if(recorded||historical!==!!recorded||s.pan.oil||s.plated||last&&(s.id!==last.id||s.servings!==last.servings||s.log.length<last.log.length||!!s.rescue!==!!last.rescue))n=0;last=s;historical=!!recorded;return n;}};}
  function start(p){return finite(p)?{phase:'carry',tilt:0,anchor:null,closest:Infinity,settling:false,invalid:false}:null;}
  function move(g,p){if(!g)return null;var n=Object.assign({},g);if(!finite(p)){n.invalid=true;n.tilt=0;return n;}if(g.invalid)return n;var d=Math.hypot(p.x-cup.x,p.z-cup.z);
    if(g.phase==='carry'){if(d<.24){n.phase='pour';n.anchor={u:p.u,v:p.v};n.closest=d;n.settling=true;}return n;}
    var travel=p.v-g.anchor.v;if(g.settling){if(d<g.closest-.001||travel<0&&d<.24){n.anchor={u:p.u,v:p.v};n.closest=d;return n;}if(travel<3)return n;n.settling=false;}
    n.tilt=Math.abs(p.u-g.anchor.u)>40?0:Math.max(0,Math.min(70,travel*.75));return n;
  }
  function pourStep(remainder,tilt,elapsed,available){
    if(![remainder,tilt,elapsed,available].every(Number.isFinite)||tilt<18||available<1)return {amount:0,remainder:0};
    var v=Math.max(0,Math.min(1,remainder))+Math.max(0,Math.min(100,elapsed))/1000*(2+Math.min(52,tilt-18)/10),dose=Math.min(Math.floor(v),Math.floor(available));return {amount:dose,remainder:Math.min(1,v-dose)};
  }
  function transfer(s,n,p,locked){if(!p||![p.x,p.z].every(Number.isFinite)||!info(s,n,locked).ready||amount(n)===0)return null;var pan=root.KitchenRecipes.panPosition(s);if(Math.hypot(p.x-bottle.x,p.z-bottle.z)<.25)return 'return';return info(s,n,locked).exact&&Math.hypot(p.x-pan.x,p.z-pan.z)<.64?'add':null;}
  function mount(host){return root.KitchenOilStudio.mount(host);}
  function decorate(h){
    var T=h.THREE,group=new T.Group(),stream,neck,texture=null,capPosition=h.cap.position.clone(),capRotation=h.cap.rotation.clone();group.userData.kitchenOilCup=true;group.userData.station='pan';h.world.add(group);group.position.set(cup.x,cup.y+.12,cup.z);
    function mesh(g,c,x,y,z,p,extra,decor){var m=h.mesh(g,c,x,y,z,p,extra);if(decor)m.userData.sceneDecoration=true;return m;}
    mesh(new T.CylinderGeometry(.125,.11,.24,32,1,true),'#dce8d0',0,0,0,group,{transparent:true,opacity:.35,side:T.DoubleSide,depthWrite:false});mesh(new T.CylinderGeometry(.11,.11,.012,32),'#bfcbb8',0,-.116,0,group);
    var rim=mesh(new T.TorusGeometry(.125,.007,8,40),'#d9dfc6',0,.12,0,group);rim.rotation.x=Math.PI/2;var handle=mesh(new T.TorusGeometry(.065,.012,8,24),'#b8c5ae',0,.016,.165,group);handle.rotation.y=Math.PI/2;
    var liquid=mesh(new T.CylinderGeometry(.105,.102,1,32),'#c9ad49',0,-.1,0,group,{roughness:.28},true),line=mesh(new T.TorusGeometry(.129,.004,6,40),'#9d762a',0,0,0,group,null,true);line.rotation.x=Math.PI/2;
    if(typeof document!=='undefined'){var c=document.createElement('canvas');c.width=256;c.height=512;var ctx=c.getContext('2d');if(ctx){ctx.fillStyle='#f4f5e9';ctx.fillRect(0,0,256,512);ctx.fillStyle='#344c38';ctx.font='bold 48px sans-serif';ctx.textAlign='right';for(var ml=15;ml<=60;ml+=15){var y=480-ml/60*410;ctx.fillRect(12,y-3,65,6);ctx.fillText(String(ml),238,y+16);}texture=new T.CanvasTexture(c);texture.encoding=T.sRGBEncoding;mesh(new T.PlaneGeometry(.16,.215),'#ffffff',0,.0,.127,group,{map:texture,side:T.DoubleSide},true);}}
    neck=mesh(new T.CylinderGeometry(.032,.035,.13,12),'#547448',0,.235,0,h.bottle,null,true);neck.visible=false;stream=mesh(new T.CylinderGeometry(.008,.01,1,8),'#cfb251',0,0,0,h.world,{roughness:.3},true);stream.visible=false;
    function setAmount(s,n){var i=info(s,n,false),height=.225*i.amount/60;liquid.visible=i.amount>0;liquid.scale.y=Math.max(.001,height);liquid.position.y=-.11+height/2;line.position.y=-.11+.225*i.goal/60;}
    function reset(){h.cap.position.copy(capPosition);h.cap.rotation.copy(capRotation);group.position.set(cup.x,cup.y+.12,cup.z);group.rotation.set(0,0,0);stream.visible=false;neck.visible=false;}
    function previewBottle(g){neck.visible=g.trace.phase==='pour';stream.visible=false;if(g.trace.phase==='pour'){h.bottle.position.set(cup.x-.29,cup.y+.58,cup.z);h.bottle.rotation.z=-g.trace.tilt*Math.PI/180*1.35;h.cap.position.set(bottle.x-.16,1.188,bottle.z);h.cap.rotation.z=Math.PI/2;if(g.trace.tilt>=18&&g.amount<capacity){h.bottle.updateMatrixWorld(true);var from=h.bottle.localToWorld(new T.Vector3(0,.32,0)),to=new T.Vector3(cup.x,cup.y+.06,cup.z),direction=to.clone().sub(from);stream.position.copy(from.clone().add(to).multiplyScalar(.5));stream.scale.y=direction.length();stream.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());stream.visible=true;}}else{var delta=g.current.clone().sub(g.start);g.original.forEach(function(o){o.object.position.copy(o.position).add(delta);});}}
    function previewCup(p,returning){group.position.set(p.x,1.72,p.z);group.rotation.z=returning?-.55:0;neck.visible=!!returning;if(returning){h.cap.position.set(bottle.x-.16,1.188,bottle.z);h.cap.rotation.z=Math.PI/2;}else{h.cap.position.copy(capPosition);h.cap.rotation.copy(capRotation);}}
    return {cup:group,setAmount:setAmount,reset:reset,previewBottle:previewBottle,previewCup:previewCup,dispose:function(){h.world.remove(group,stream);h.bottle.remove(neck);if(texture)texture.dispose();}};
  }
  var api={cup:cup,bottle:bottle,capacity:capacity,info:info,session:session,start:start,move:move,pourStep:pourStep,transfer:transfer,mount:mount,decorate:decorate};root.KitchenOil=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
