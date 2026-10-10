/* Carrying previews cookware; one completed handle movement records its placement. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null),height=1.55,liftDistance=32,lowerDistance=32,liftHeight=.35,targetRadius=.30,handleRadius=.24;
  function point(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function state(s){return !!s&&!!s.pan&&Array.isArray(s.log)&&Number.isFinite(s.time)&&s.time>=0&&Number.isFinite(s.pan.temp)&&['standard','wide'].indexOf(s.pan.size)!==-1;}
  function handle(s){if(!state(s))return null;var at=R.panPosition(s),scale=s.pan.size==='wide'?1.08:1;return {x:at.x+.98*scale,y:1.39,z:at.z};}
  function available(s,locked){
    var detail=!state(s)||locked||s.plated||s.submitted||s.time>=3600||s.log.length>=1200?'Recorded or finished kitchen. Pan movement is locked.':null;
    return {name:'Sauce pan handle',item:'pan-handle',mode:'pan',ready:!detail,detail:detail||'Hold the handle, lift straight up, carry level onto the burner or trivet, lower and release. The pan keeps its stored heat; moving it changes no food or cooking time.'};
  }
  function pickup(s,hit,tool,locked){return hit&&hit.panHandle&&tool!=='camera'?available(s,locked):null;}
  function trace(t){
    return !!t&&state(t.source)&&['burner','trivet'].indexOf(t.sourceSite)!==-1&&t.destination===(t.sourceSite==='burner'?'trivet':'burner')&&['lift','carry','lower','done'].indexOf(t.phase)!==-1&&!!t.position&&!!t.offset&&!!t.anchor&&[t.position.x,t.position.z,t.offset.x,t.offset.z,t.anchor.u,t.anchor.v,t.lift,t.depth,t.last,t.sourceTime].every(Number.isFinite)&&t.lift>=0&&t.lift<=1&&t.depth>=0&&t.depth<=1&&t.last>=0&&typeof t.invalid==='boolean';
  }
  function start(s,p,locked){
    if(!point(p)||!available(s,locked).ready)return null;var grip=handle(s);if(Math.hypot(p.x-grip.x,p.z-grip.z)>handleRadius)return null;var at=R.panPosition(s);
    return {source:s,sourceLog:s.log,sourceLogLength:s.log.length,sourceTime:s.time,sourceSite:at.site,sourceSize:s.pan.size,destination:at.site==='burner'?'trivet':'burner',phase:'lift',position:{x:at.x,z:at.z},offset:{x:p.x-at.x,z:p.z-at.z},anchor:{u:p.u,v:p.v},lift:0,depth:0,last:0,settling:false,closest:Infinity,invalid:false};
  }
  function move(t,p){
    if(!trace(t))return null;var n=Object.assign({},t,{position:Object.assign({},t.position),anchor:Object.assign({},t.anchor)});if(t.invalid)return n;if(!point(p)){n.invalid=true;return n;}
    if(t.phase==='lift'){
      var up=t.anchor.v-p.v;if(Math.abs(p.u-t.anchor.u)>28||up<t.last-12)n.invalid=true;n.lift=clamp(up/liftDistance);n.last=Math.max(t.last,up);
      if(up>=liftDistance&&!n.invalid){n.phase='carry';n.lift=1;n.last=0;}return n;
    }
    var target=R.panPosition(t.source,t.destination),center={x:p.x-t.offset.x,z:p.z-t.offset.z},distance=Math.hypot(center.x-target.x,center.z-target.z);
    if(t.phase==='carry'){
      n.position=center;if(distance<targetRadius){n.phase='lower';n.position={x:target.x,z:target.z};n.anchor={u:p.u,v:p.v};n.last=0;n.depth=0;n.closest=distance;n.settling=true;}return n;
    }
    var travel=p.v-t.anchor.v,side=Math.abs(p.u-t.anchor.u);
    if(t.phase==='lower'&&t.settling){
      /* A downward lowering moves the projected plane point away from the target.
         Only departure before that straight lowering resumes the level carry. */
      if(distance>=targetRadius&&(travel<4||side>28)){n.phase='carry';n.position=center;n.depth=0;n.last=0;n.settling=false;return n;}
      if(distance<t.closest-.001||travel<0){n.anchor={u:p.u,v:p.v};n.closest=distance;n.depth=0;n.last=0;return n;}
      if(travel<4)return n;n.settling=false;
    }
    if(side>28||travel>80){n.invalid=true;return n;}n.depth=clamp(travel/lowerDistance);
    if(t.phase==='lower'){
      if(travel<t.last-12)n.invalid=true;n.last=Math.max(t.last,travel);if(travel>=lowerDistance&&!n.invalid){n.phase='done';n.depth=1;}
    }else{if(travel<28)n.invalid=true;else n.depth=1;}
    return n;
  }
  function fresh(s,t){return state(s)&&s===t.source&&s.log===t.sourceLog&&s.log.length===t.sourceLogLength&&s.time===t.sourceTime&&s.pan.size===t.sourceSize&&R.panPosition(s).site===t.sourceSite;}
  function drop(s,t,locked){return trace(t)&&available(s,locked).ready&&fresh(s,t)&&t.phase==='done'&&!t.invalid&&t.lift===1&&t.depth===1?t.destination:null;}
  function preview(t){
    if(!trace(t))return null;var at=t.invalid?R.panPosition(t.source):t.position,y=t.invalid?0:t.phase==='lift'?liftHeight*t.lift:t.phase==='carry'?liftHeight:t.phase==='lower'?liftHeight*(1-t.depth):0;
    return {x:at.x,y:y,z:at.z};
  }
  function guidance(s,g){
    var t=g&&g.trace?g.trace:g;if(!trace(t))return null;var invalid=t.invalid||!fresh(s,t)||!available(s,false).ready,phase=invalid?'retry':t.phase==='done'?'release':t.phase,label=t.destination==='trivet'?'trivet':'pan burner';
    var reading=state(s)?s:t.source;return {tool:'pan-carry',title:t.destination==='trivet'?'Move the pan off heat':'Return the pan to heat',phase:phase,instruction:invalid?'Release to return the pan. No placement recorded.':t.phase==='lift'?'Lift straight up by the handle to clear the support.':t.phase==='carry'?'Carry the level pan over the highlighted '+label+'.':t.phase==='lower'?'Pull straight down to lower the pan onto the '+label+'.':'Release to keep this completed placement.',detail:'Clock paused · '+Math.round(reading.pan.temp)+'°C modeled pan · stored heat remains'+(t.destination==='trivet'&&reading.pan.heat?' · the empty burner will still be on':''),progress:invalid?0:t.phase==='lift'?.25*t.lift:t.phase==='carry'?.25:t.phase==='lower'?.6+.4*t.depth:1,progressLabel:'Lift, carry and lower the pan',target:{site:t.destination},over:!invalid&&(t.phase==='lower'||t.phase==='done'),invalid:invalid};
  }
  var api={height:height,handle:handle,available:available,pickup:pickup,start:start,move:move,drop:drop,preview:preview,guidance:guidance};root.KitchenPanCarry=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
