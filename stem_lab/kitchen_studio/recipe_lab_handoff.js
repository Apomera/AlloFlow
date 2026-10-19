/* A carried ingredient remains on its source until a deliberate tip and release. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var items=Object.assign(Object.create(null),{produce:{name:'prep board',action:'produce'},garlic:{name:'garlic bowl',action:'garlic'},cooked:{name:'pasta colander',action:'combine'}});
  function source(hit){return hit&&(items[hit.handoff]?hit.handoff:items[hit.item]?hit.item:hit.board?'produce':null);}
  function available(s,id,locked){
    var d=items[id];if(!d)return null;var reason=null;
    if(locked||s.plated||s.time>=3600||s.log.length>=1200)reason='Recorded or finished kitchen. Ingredient transfers are locked.';
    else if(R.serving(s).started)reason='Return the served food to the pan before adding ingredients.';
    else if(id==='cooked'&&s.time+R.mixingDuration(s,d.action)>3600)reason='Adding and tossing the pasta takes '+R.mixingDuration(s,d.action)+' simulated seconds. There is not enough time in this cook to finish the toss.';
    else if(id==='produce')reason=s.pan.produce?'The prepared produce is already in the pan.':!s.prep.hands?'Wash hands before preparing the produce.':!s.prep.cut?'Cut the produce before lifting the prep board.':!s.pan.oil?'Measure the olive oil into the pan before adding produce.':null;
    else if(id==='garlic')reason=s.pan.garlic?'The garlic is already in the pan.':!s.prep.garlic?'Mince every garlic clove before carrying the bowl.':!s.pan.oil?'Measure the olive oil into the pan before adding garlic.':null;
    else reason=s.pan.combined?'The drained pasta is already in the sauce.':!s.pot.drained?'Drain the pasta completely before lifting the colander.':!s.pan.produce||!s.pan.garlic?'Prepare the produce and garlic in the pan before adding the pasta.':null;
    return {item:id,name:d.name,action:d.action,ready:!reason,detail:reason||'Lift and carry level over the sauce pan. Pull down to tip, then release. Levelling or cancelling returns the food.'};
  }
  function pickup(s,hit,mode,locked){var id=source(hit);if(mode==='camera'||!id||mode!=='move'&&!hit.handoff&&hit.item!=='garlic'&&hit.item!=='cooked')return null;var a=available(s,id,locked);return Object.assign({mode:'move'},a);}
  function quantity(s,id){var q=R.ingredients(s);return id==='produce'?q.produce+' g '+(s.id==='tomato'?'tomatoes':'mushrooms'):id==='garlic'?q.garlic+' minced cloves':s.prep.pasta+' g drained pasta';}
  function target(s){var at=R.panPosition(s);return {x:at.x,z:at.z,radius:.55*(s.pan.size==='wide'?1.08:1)};}
  function finite(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function start(p){return finite(p)?{phase:'carry',position:{x:p.x,z:p.z},anchor:null,closest:Infinity,settling:false,tilt:0,offAxis:false,invalid:false}:null;}
  function move(t,p,pan){
    if(!t)return null;var n=Object.assign({},t);if(!finite(p)||!pan||![pan.x,pan.z,pan.radius].every(Number.isFinite)||pan.radius<=0){n.invalid=true;n.tilt=0;return n;}if(t.invalid)return n;
    var distance=Math.hypot(p.x-pan.x,p.z-pan.z);
    if(t.phase==='carry'){n.position={x:p.x,z:p.z};n.tilt=0;if(distance<pan.radius){n.phase='level';n.position={x:pan.x,z:pan.z};n.anchor={u:p.u,v:p.v};n.closest=distance;n.settling=true;}return n;}
    var travel=p.v-t.anchor.v,side=Math.abs(p.u-t.anchor.u);
    if(side>75||travel<-50){n.phase='carry';n.position={x:p.x,z:p.z};n.anchor=null;n.tilt=0;n.offAxis=false;n.settling=false;return n;}
    if(t.settling){if(distance<t.closest-.003){n.anchor={u:p.u,v:p.v};n.closest=distance;return n;}if(travel<4)return n;n.settling=false;}
    n.offAxis=side>35;n.tilt=n.offAxis?0:Math.max(0,Math.min(55,travel*.85));n.phase=n.tilt>=35?'release':n.tilt>0?'tip':'level';return n;
  }
  function complete(t){return !!t&&!t.invalid&&!t.offAxis&&t.phase==='release'&&t.tilt>=35;}
  function transfer(s,g,locked){var a=g&&available(s,g.item,locked);return a&&a.ready&&complete(g.trace)?a.action:null;}
  function guidance(s,g){
    var t=g.trace,a=available(s,g.item,false),q=quantity(s,g.item),phase=t.invalid?'retry':t.phase;
    return {tool:'handoff',title:'Carry the '+a.name,phase:phase,instruction:t.invalid?'Release to return the ingredients and try again.':t.offAxis?'Level the container, then tip straight down.':phase==='carry'?'Carry level over the highlighted sauce pan.':phase==='level'?'Pull straight down to tip. A level carry transfers nothing.':phase==='tip'?'Continue the tip, or lift back to keep the food.':'Release to transfer the ingredients. Lift back to cancel the tip.',detail:q+' · preview only'+(g.item==='produce'?' · '+R.drying(s).remaining+' of 16 moisture units remain on the produce':''),progress:t.invalid?0:phase==='carry'?0:Math.min(1,.45+t.tilt/35*.55),progressLabel:'Carry, tip and release',target:{pan:true},over:!t.invalid&&phase!=='carry',invalid:t.invalid};
  }
  function decorate(h){
    var T=h.THREE,holder=new T.Group(),state=null,active=null,food=[],garlicFood=h.garlic.children.slice(1),knifeVisible=[];h.world.add(holder);holder.visible=false;
    var grip=h.mesh(new T.TorusGeometry(.105,.014,8,28),'#42624b',.745,.018,0,h.board);grip.rotation.x=Math.PI/2;grip.userData.kitchenHandoff='produce';
    var rim=h.mesh(new T.TorusGeometry(.187,.012,8,32),'#668774',0,.052,0,h.garlic);rim.rotation.x=Math.PI/2;
    function reset(s){if(s)state=s;active=null;holder.visible=false;h.canvas.dataset.handoffHeld='';h.canvas.dataset.handoffPhase='idle';if(!state)return;
      h.board.visible=true;h.knife.forEach(function(o){o.visible=!state.pan.produce;});
      var widths=R.cutProfile(state).widths,dry=R.drying(state);h.produce.forEach(function(o,i){o.visible=i<widths.length&&!state.pan.produce&&(widths.length>1||state.prep.cut);});h.wet.forEach(function(o,i){o.visible=dry.enabled&&state.prep.rinsed&&!state.pan.produce&&dry.areas[i]>0;});
      h.garlic.visible=!!state.prep.garlic;garlicFood.forEach(function(o){o.visible=state.prep.garlic&&!state.pan.garlic;});h.colander.visible=true;h.pasta.forEach(function(o){o.visible=state.pot.drained&&!state.pan.combined;});
    }
    function copy(o,origin,isFood){var c=o.clone(true);c.position.sub(origin);c.traverse(function(m){m.userData.sceneDecoration=true;});holder.add(c);if(isFood&&c.visible)food.push({object:c,position:c.position.clone()});return c;}
    function build(g){while(holder.children.length)holder.remove(holder.children[0]);food=[];
      if(g.item==='produce'){var origin=h.board.position;copy(h.board,origin,false);h.produce.forEach(function(o){copy(o,origin,true);});h.wet.forEach(function(o){copy(o,origin,false);});}
      else{var o=g.item==='garlic'?h.garlic:h.colander,c=copy(o,o.position,false),parts=g.item==='garlic'?garlicFood:h.pasta;parts.forEach(function(p){var index=o.children.indexOf(p),clone=c.children[index];if(clone&&clone.visible)food.push({object:clone,position:clone.position.clone()});});}
      active=g;
    }
    function preview(g){if(active!==g)build(g);var t=g.trace,at=t.position,docked=t.phase!=='carry',board=g.item==='produce',slide=t.tilt/55,offset=board?.68:g.item==='cooked'?.32:.2;
      holder.position.set(at.x-(docked?offset:0),board?1.99:g.item==='cooked'?1.94:1.86,at.z);holder.rotation.set(0,0,-t.tilt*Math.PI/180);holder.visible=true;
      food.forEach(function(f){f.object.position.copy(f.position);var edge=board?.58:g.item==='cooked'?.23:.11;f.object.position.x=Math.min(edge,f.position.x+slide*(board?.3:.1));});
      if(board){h.board.visible=false;h.produce.forEach(function(o){o.visible=false;});h.wet.forEach(function(o){o.visible=false;});h.knife.forEach(function(o){o.visible=false;});}else if(g.item==='garlic')h.garlic.visible=false;else h.colander.visible=false;
      h.canvas.dataset.handoffHeld=g.item;h.canvas.dataset.handoffPhase=t.phase;
    }
    return {update:reset,reset:reset,preview:preview,dispose:function(){h.world.remove(holder);}};
  }
  var api={source:source,pickup:pickup,available:available,quantity:quantity,target:target,start:start,move:move,complete:complete,transfer:transfer,guidance:guidance,decorate:decorate};root.KitchenIngredientHandoff=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
