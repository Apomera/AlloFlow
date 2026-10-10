/* A handle lift and level carry precede drainage. Only canonical doses remove water. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null),height=1.9,source={x:-1.1,z:-.45},target={x:-2.51,z:.94},liftDistance=32,handleRadius=.24,targetRadius=.4;
  function point(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function clamp(n){return Math.max(0,Math.min(1,n));}
  function state(s){return !!s&&!!s.prep&&!!s.pan&&!!s.pot&&Array.isArray(s.log)&&Number.isFinite(s.time)&&s.time>=0&&[s.pot.water,s.pot.temp,s.pot.reserve].every(Number.isFinite)&&s.pot.water>=0&&s.pot.reserve>=0&&Number.isInteger(s.pot.heat)&&s.pot.heat>=0&&s.pot.heat<=3;}
  function handles(s){return state(s)?[-1,1].map(function(side){return {side:side,x:source.x+side*.68,y:1.70,z:source.z};}):[];}
  function lock(s,locked){return !state(s)||locked||s.plated||s.submitted||s.time>=3600||s.log.length>=1200;}
  function available(s,locked){
    var detail=lock(s,locked)?'Recorded or finished kitchen. New pot drainage is locked.':R.serving(s).started?'Return every spoonful to the pan before draining.':s.pot.lid==='covered'?'Lift the lid onto its rest before lifting the pot.':!s.pot.pasta?'Cook pasta in the filled pot before draining.':s.pot.drained||!s.pot.water?'The pot is already drained. Its water cannot be recovered.':!s.pot.sample?'Check a pasta sample before deciding to drain.':null;
    return {name:'Pasta pot handles',item:'pot-handle',mode:'drain',ready:!detail,detail:detail||'Hold a side handle, lift straight up, carry level over the colander, then tilt. Lift back to level or release to stop. Water already drained stays removed.'};
  }
  function pickup(s,hit,tool,locked){return hit&&hit.potHandle&&tool!=='camera'?available(s,locked):null;}
  function adopt(t,s){return Object.assign({},t,{sourceState:s,sourceLog:s.log,sourceLogLength:s.log.length,sourceTime:s.time,sourceWater:s.pot.water,sourcePot:s.pot,sourceSample:s.pot.sample,sourceHeat:s.pot.heat,sourceLid:s.pot.lid,sourceTemp:s.pot.temp,sourceReserve:s.pot.reserve});}
  function trace(t){return !!t&&state(t.sourceState)&&(t.side===-1||t.side===1)&&['lift','carry','pour'].indexOf(t.phase)!==-1&&!!t.position&&!!t.offset&&!!t.anchor&&[t.position.x,t.position.z,t.offset.x,t.offset.z,t.anchor.u,t.anchor.v,t.lift,t.last,t.tilt,t.sourceTime,t.sourceWater].every(Number.isFinite)&&t.lift>=0&&t.lift<=1&&t.last>=0&&t.tilt>=0&&t.tilt<=70&&typeof t.offAxis==='boolean'&&typeof t.invalid==='boolean';}
  function fresh(s,t){return state(s)&&s===t.sourceState&&s.log===t.sourceLog&&s.log.length===t.sourceLogLength&&s.time===t.sourceTime&&s.pot===t.sourcePot&&s.pot.water===t.sourceWater&&s.pot.sample===t.sourceSample&&s.pot.heat===t.sourceHeat&&s.pot.lid===t.sourceLid&&s.pot.temp===t.sourceTemp&&s.pot.reserve===t.sourceReserve;}
  function start(s,p,side,locked){
    if(!point(p)||(side!==-1&&side!==1)||!available(s,locked).ready)return null;var grip=handles(s).find(function(h){return h.side===side;});if(Math.hypot(p.x-grip.x,p.z-grip.z)>handleRadius)return null;
    return adopt({side:side,phase:'lift',position:{x:source.x,z:source.z},offset:{x:p.x-source.x,z:p.z-source.z},anchor:{u:p.u,v:p.v},lift:0,last:0,settling:false,closest:Infinity,tilt:0,offAxis:false,invalid:false},s);
  }
  function move(t,p){
    if(!trace(t))return null;var n=Object.assign({},t,{position:Object.assign({},t.position),anchor:Object.assign({},t.anchor)});if(t.invalid)return n;if(!point(p)){n.invalid=true;n.tilt=0;return n;}
    if(t.phase==='lift'){
      var up=t.anchor.v-p.v;if(Math.abs(p.u-t.anchor.u)>28||up<t.last-12)n.invalid=true;n.lift=clamp(up/liftDistance);n.last=Math.max(t.last,up);
      if(up>=liftDistance&&!n.invalid){n.phase='carry';n.lift=1;n.last=0;}return n;
    }
    var center={x:p.x-t.offset.x,z:p.z-t.offset.z},distance=Math.hypot(center.x-target.x,center.z-target.z);
    if(t.phase==='carry'){
      n.position=center;n.tilt=0;n.offAxis=false;if(distance<targetRadius){n.phase='pour';n.position={x:target.x,z:target.z};n.anchor={u:p.u,v:p.v};n.closest=distance;n.settling=true;}return n;
    }
    var travel=p.v-t.anchor.v,side=Math.abs(p.u-t.anchor.u);
    if(t.settling){
      /* Approaching the colander is still a level carry. A downward tilt changes
         the projected plane point, so do not use that point to cancel a pour. */
      if(distance>=targetRadius&&(travel<4||side>60)){n.phase='carry';n.position=center;n.tilt=0;n.offAxis=false;n.settling=false;n.closest=Infinity;return n;}
      if(distance<t.closest-.001||travel<0&&distance<targetRadius){n.anchor={u:p.u,v:p.v};n.closest=distance;n.tilt=0;n.offAxis=false;return n;}
      if(travel<4)return n;n.settling=false;
    }
    n.offAxis=side>60;n.tilt=n.offAxis?0:Math.max(0,Math.min(70,travel*.75));return n;
  }
  function flow(s,t,locked){return trace(t)&&!t.invalid&&fresh(s,t)&&available(s,locked).ready&&t.phase==='pour'&&!t.settling&&!t.offAxis&&t.tilt>=20?t.tilt:0;}
  function rebase(t,before,after){
    if(!trace(t)||!flow(before,t,false)||!state(after)||after===before||after.time!==before.time||after.log.length!==before.log.length+1||after.pot.water>=before.pot.water)return null;
    var entry=after.log[after.log.length-1];if(!entry||!entry.accepted||entry.action!=='drainPour'||!entry.transfer||entry.transfer.to!=='drain'||entry.transfer.amount!==before.pot.water-after.pot.water)return null;
    var expected=R.act(before,'drainPour',entry.value,entry.interaction);if(expected===before||JSON.stringify(expected)!==JSON.stringify(after))return null;return adopt(t,after);
  }
  function preview(t){
    if(!trace(t))return null;return {x:t.invalid?source.x:t.position.x,z:t.invalid?source.z:t.position.z,lift:t.invalid?0:t.lift,angle:t.invalid||t.offAxis?0:t.tilt,over:!t.invalid&&t.phase==='pour'};
  }
  function guidance(s,g,locked){
    var t=g&&g.trace?g.trace:g;if(!trace(t))return null;var invalid=t.invalid||!fresh(s,t)||lock(s,locked)||R.serving(s).started||s.pot.lid==='covered',empty=!invalid&&(!s.pot.water||s.pot.drained),phase=invalid?'retry':empty?'empty':t.phase,reading=state(s)?s:t.sourceState;
    var instruction=invalid?'Release to return the pot upright. Completed drainage stays removed.':empty?'The pot is empty. Lift back to level, then release to return it upright.':t.phase==='lift'?'Lift straight up by a side handle before carrying the pot.':t.phase==='carry'?'Carry the level pot over the highlighted colander.':t.offAxis?'Flow stopped. Move back to the straight tilt path, then lift to level.':t.tilt>=20?'Water is flowing. Lift back to the level position to stop.':'Pot positioned. Pull straight down to tilt, or release to return it upright.';
    return {tool:'drain',title:'Drain with control',phase:phase,instruction:instruction,detail:Math.round(reading.pot.water)+' mL in the pot · '+Math.round(reading.pot.reserve)+' mL saved in the jug · '+Math.round(reading.pot.temp)+'°C modeled water · stored heat remains'+(reading.pot.heat?' · the pot burner is still on':' · pot burner off')+'. Clock paused; drained water cannot be recovered.',progress:invalid?0:empty?1:t.phase==='lift'?.25*t.lift:t.phase==='carry'?.25:.6,progressLabel:'Lift, carry level and control the tilt',target:t.phase==='lift'?{potHandle:t.side}:{drain:true},over:!invalid&&t.phase==='pour',invalid:invalid};
  }
  var api={height:height,source:source,target:target,handles:handles,available:available,pickup:pickup,start:start,move:move,flow:flow,rebase:rebase,preview:preview,guidance:guidance};root.KitchenPotDrain=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
