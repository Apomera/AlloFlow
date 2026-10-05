/* The recorded scale portion leaves its tray only after a deliberate pot handoff. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var H=root.KitchenIngredientHandoff||(typeof require==='function'?require('./recipe_lab_handoff.js'):null);
  function available(s,amount,locked){
    var detail=null;
    if(locked||s.plated||s.time>=3600||s.log.length>=1200)detail='Recorded or finished kitchen. The pasta portion is locked.';
    else if(R.serving(s).started)detail='Serving has begun. This pasta batch is already prepared.';
    else if(s.pot.pasta||s.pot.drained)detail='The recorded pasta has already left the tray for this batch.';
    else if(!Number.isFinite(amount)||amount<40||!s.prep.pasta||amount!==s.prep.pasta)detail='Record the amount on the scale before lifting the tray. Restore your recorded portion if you changed the preview.';
    else if(s.pot.lid==='covered')detail='Lift the lid onto its rest before carrying pasta into the pot.';
    else if(s.pot.water<500)detail='Fill the pasta pot before carrying the recorded portion.';
    else if(s.pot.temp<96)detail='Bring the filled pot to a boil in this model before adding the pasta. Current water: '+Math.round(s.pot.temp)+'°C.';
    return {name:'Recorded pasta tray',item:'dry',mode:'move',ready:!detail,detail:detail||'Lift the recorded portion, carry level over the pasta pot, pull down to tip, then release. A level carry transfers nothing.'};
  }
  function pickup(s,hit,mode,info,locked){
    if(!hit||mode==='camera')return null;info=info||{};
    if(hit.item==='pasta'&&mode==='weigh')return null; /* tray strokes keep their existing return-handful behavior */
    if(hit.item==='pasta')return {name:'Dry pasta packet',item:'pasta',mode:'weigh',ready:!locked&&!info.locked&&!s.plated&&!s.pot.pasta&&!s.pot.drained&&s.time<3600&&s.log.length<1200&&!R.serving(s).started&&info.amount<800,detail:info.locked||s.pot.pasta||s.pot.drained?'This batch has already entered the cook.':info.amount>=800?'The packet is empty. Return a handful from the scale to adjust the portion.':'Carry this packet over the scale, tilt to pour, then record the portion. The packet cannot add an unweighed batch directly to the pot.'};
    return hit.dryTray||mode==='move'&&hit.scale?available(s,info.amount,locked):null;
  }
  function target(){return {x:-1.1,z:-.45,radius:.46};}
  function transfer(s,amount,trace,locked){return available(s,amount,locked).ready&&H.complete(trace)?'pasta':null;}
  function guidance(s,g){
    var t=g.trace,phase=t.invalid?'retry':t.phase;
    return {tool:'dry-pasta',title:'Carry the recorded pasta',phase:phase,instruction:t.invalid?'Release to return the tray and try again.':t.offAxis?'Level the tray, then tip straight down.':phase==='carry'?'Carry level over the highlighted pasta pot.':phase==='level'?'Pull straight down to tip. A level tray keeps its pasta.':phase==='tip'?'Continue the tip, or lift back to keep the portion.':'Release to add the recorded portion. Lift back to cancel the tip.',detail:s.prep.pasta+' g recorded dry pasta · preview only · water '+Math.round(s.pot.temp)+'°C',progress:t.invalid?0:phase==='carry'?0:Math.min(1,.45+t.tilt/35*.55),progressLabel:'Carry, tip and release',target:{pot:true},over:!t.invalid&&phase!=='carry',invalid:t.invalid};
  }
  function reading(s){
    var index=s.log.findIndex(function(e){return e.accepted&&e.action==='pasta';});if(index<0)return null;
    var before=R.restore(Object.assign({},s,{submitted:false,log:s.log.slice(0,index)})),entry=s.log[index],after=before&&R.act(before,entry.action,entry.value,entry.interaction);if(!before||!after||!after.pot.pasta)return null;
    return {grams:after.prep.pasta,before:before.pot.temp,after:after.pot.temp,drop:before.pot.temp-after.pot.temp,water:after.pot.water};
  }
  function decorate(h){
    var T=h.THREE,holder=new T.Group(),active=null,food=[];h.world.add(holder);holder.visible=false;
    var lip=h.mesh(new T.TorusGeometry(.28,.015,8,40),'#9eae92',0,.022,0,h.tray);lip.rotation.x=Math.PI/2;
    var grip=h.mesh(new T.TorusGeometry(.105,.018,8,28),'#42624b',0,.036,.37,h.tray);grip.rotation.x=Math.PI/2;grip.userData.kitchenDryPasta=true;
    var gripHit=h.mesh(new T.CylinderGeometry(.16,.16,.026,20),'#42624b',0,.038,.37,h.tray,{transparent:true,opacity:0,depthWrite:false});gripHit.userData.kitchenDryPasta=true;gripHit.castShadow=gripHit.receiveShadow=false; /* the center of the ring accepts touch too */
    function reset(s){holder.visible=false;active=null;h.tray.visible=true;h.canvas.dataset.dryPastaHeld='';h.canvas.dataset.dryPastaPhase='idle';if(s)h.pasta.forEach(function(o,i){o.visible=!s.pot.pasta&&i<Math.round(h.amount()/10);});}
    function build(g){while(holder.children.length)holder.remove(holder.children[0]);food=[];h.world.updateMatrixWorld(true);var origin=h.tray.getWorldPosition(new T.Vector3());
      [h.tray].concat(h.pasta).forEach(function(o,i){var c=o.clone(true);c.position.copy(o.getWorldPosition(new T.Vector3()).sub(origin));c.traverse(function(m){m.userData.sceneDecoration=true;});holder.add(c);if(i&&c.visible)food.push({object:c,position:c.position.clone()});});active=g;
    }
    function preview(g){if(active!==g)build(g);var t=g.trace,docked=t.phase!=='carry';holder.position.set(t.position.x-(docked?.3:0),2.05,t.position.z);holder.rotation.set(0,0,-t.tilt*Math.PI/180);holder.visible=true;food.forEach(function(f){f.object.position.copy(f.position);f.object.position.x=Math.min(.265,f.position.x+t.tilt/55*.14);});h.tray.visible=false;h.pasta.forEach(function(o){o.visible=false;});h.canvas.dataset.dryPastaHeld='true';h.canvas.dataset.dryPastaPhase=t.phase;}
    return {update:reset,reset:reset,preview:preview,dispose:function(){h.world.remove(holder);}};
  }
  function mountPanel(host){
    var panel=document.createElement('section');panel.className='dry-pasta-reading-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','scenePastaEntryTitle');panel.innerHTML='<h3 id="scenePastaEntryTitle">Watch the water respond</h3><p id="scenePastaEntryAmount"></p><dl><div><dt>Before adding pasta</dt><dd id="scenePastaEntryBefore"></dd></div><div><dt>Just after adding it</dt><dd id="scenePastaEntryAfter"></dd></div></dl><p id="scenePastaEntryNotice" role="status" aria-live="polite" aria-atomic="true"></p><p class="hands-note">These are modeled readings at the moment of addition. Compare the current pot reading after a short time step. What do you predict will happen with the burner at the same setting?</p><div><button type="button" id="scenePastaEntryPot">Look at the pot</button><button type="button" id="scenePastaEntryStir">Separate the strands</button></div>';host.container.append(panel);
    var $=function(id){return panel.querySelector('#'+id);};function pot(){host.choose('pot');}function stir(){host.choose('pot-stir');}$('scenePastaEntryPot').addEventListener('click',pot);$('scenePastaEntryStir').addEventListener('click',stir);
    return {render:function(s,tool,locked){var r=reading(s);panel.hidden=!r||['move','weigh','pot-stir'].indexOf(tool)===-1;if(!r)return;$('scenePastaEntryAmount').textContent=r.grams+' g from the recorded portion entered '+Math.round(r.water)+' mL of water.';$('scenePastaEntryBefore').textContent=Math.round(r.before)+'°C';$('scenePastaEntryAfter').textContent=Math.round(r.after)+'°C';$('scenePastaEntryNotice').textContent='The cooler pasta lowered the modeled water temperature by '+Math.round(r.drop)+'°C. Adding food and advancing the clock are separate actions.';$('scenePastaEntryStir').disabled=locked||s.pot.drained||s.pastaModel!==1;},dispose:function(){$('scenePastaEntryPot').removeEventListener('click',pot);$('scenePastaEntryStir').removeEventListener('click',stir);panel.remove();}};
  }
  var api={available:available,pickup:pickup,target:target,transfer:transfer,guidance:guidance,reading:reading,decorate:decorate,mountPanel:mountPanel};root.KitchenDryPasta=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
