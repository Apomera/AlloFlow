/* Wall timers remind the learner to observe; winding never changes the recipe log. */
(function(root){
  'use strict';
  var C=root.KitchenRecipeClock||(typeof require==='function'?require('./recipe_lab_clock.js'):null),R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var stations=['pot','pan'],seconds=[0,15,30,60,120,300],step=Math.PI/3,innerRadius=.16,outerRadius=.62,faceZ=-1.74;
  var positions={pot:{x:-.60,y:3.53,z:-1.81},pan:{x:.60,y:3.53,z:-1.81}};
  function stationOK(station){return stations.indexOf(station)!==-1;}
  function name(station){return station==='pot'?'Pot check timer':station==='pan'?'Pan check timer':'Kitchen check timer';}
  function time(n){n=Math.max(0,Math.ceil(n));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0');}
  function duration(n){return n===0?'No reminder':n<60?n+' seconds':n/60+(n===60?' minute':' minutes');}
  function timerStamp(timers){return JSON.stringify(stations.map(function(station){var t=timers&&timers[station];return t?[t.setAt,t.dueAt,t.status]:null;}));}
  function kitchenLock(s,locked){return !s||locked||s.plated||s.submitted||!Number.isFinite(s.time)||s.time>=3600||!Array.isArray(s.log)||s.log.length>=1200?'Recorded or finished kitchen. New check reminders are locked.':R.serving(s).started?'Return every spoonful to the pan before setting another cooking reminder.':null;}
  function available(s,station,locked){
    var detail=kitchenLock(s,locked)||(station!==null&&station!==undefined&&!stationOK(station)?'Choose the pot or pan check timer.':!C.create(s.time,15)?'Less than 15 simulated seconds remain. Inspect the food before finishing this cook.':null);
    return {mode:'timer',cameraView:'timers',item:'check-timer',station:stationOK(station)?station:null,label:name(station),name:name(station),ready:!detail,detail:detail||'Wind clockwise around the timer rim, then release to set a check reminder. This uses simulated time; it does not tell you the food is ready.'};
  }
  function pickup(s,timers,hit,tool,locked){var station=hit&&(hit.checkTimer||hit.kitchenCheckTimer);return tool!=='camera'&&stationOK(station)?available(s,station,locked):null;}
  function localPoint(p){return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:p.x,y:p.y}:null;}
  function traceOf(g){return g&&g.trace?g.trace:g;}
  function start(s,timers,station,p,locked){
    var at=localPoint(p);if(!at||!stationOK(station)||Math.hypot(at.x,at.y)>outerRadius||!available(s,station,locked).ready)return null;
    var radius=Math.hypot(at.x,at.y);
    return {source:s,sourceState:s,sourceTime:s.time,sourceLogLength:s.log.length,timerSource:timers,timerStamp:timerStamp(timers),station:station,current:at,angle:radius>=innerRadius?Math.atan2(at.x,at.y):null,position:0,turn:0,preview:0,phase:'wind',invalid:false};
  }
  function move(g,p){
    var t=traceOf(g);if(!t)return null;var n=Object.assign({},t),at=localPoint(p);
    if(!at||Math.hypot(at.x,at.y)>outerRadius||t.invalid){n.invalid=true;n.phase='retry';n.current=at;return n;}
    n.current=at;if(Math.hypot(at.x,at.y)<innerRadius){n.phase='wind';return n;}
    var angle=Math.atan2(at.x,at.y);if(t.angle===null){n.angle=angle;n.phase='wind';return n;}
    var delta=angle-t.angle;while(delta>Math.PI)delta-=2*Math.PI;while(delta< -Math.PI)delta+=2*Math.PI;
    if(Math.abs(delta)>Math.PI*.65){n.invalid=true;n.phase='retry';return n;}
    n.angle=angle;n.position=Math.max(0,Math.min(5,t.position+delta/step));n.turn=n.position*step;n.preview=Math.max(0,Math.min(5,Math.floor(n.position+.5+1e-9)));
    n.phase=n.turn+1e-9>=step/2&&n.preview>0?'release':'wind';return n;
  }
  function valid(s,timers,g,locked){var t=traceOf(g);return !!(s&&t&&stationOK(t.station)&&!t.invalid&&t.source===s&&available(s,t.station,locked).ready&&t.sourceTime===s.time&&t.sourceLogLength===s.log.length&&t.timerStamp===timerStamp(timers));}
  function value(s,timers,g,locked){
    var t=traceOf(g),at=t&&localPoint(t.current),chosen=t&&seconds[t.preview];
    return at&&valid(s,timers,t,locked)&&Math.hypot(at.x,at.y)>=innerRadius&&Math.hypot(at.x,at.y)<=outerRadius&&Number.isFinite(t.turn)&&t.turn+1e-9>=step/2&&Number.isInteger(t.preview)&&t.preview>0&&C.create(s.time,chosen)?{station:t.station,seconds:chosen}:null;
  }
  function guidance(s,g,timers,locked){
    var t=traceOf(g);if(!t||!stationOK(t.station))return null;if(timers===undefined)timers=t.timerSource;
    var stale=!valid(s,timers,t,locked),invalid=!!t.invalid||stale,result=!invalid&&value(s,timers,t,locked),chosen=seconds[t.preview]||0,tooLong=!invalid&&chosen>0&&!C.create(s.time,chosen);
    return {tool:'timer-wind',title:name(t.station),phase:invalid?'retry':result?'release':'wind',instruction:invalid?'Release to put the timer back. No reminder changed.':result?'Release to set a check reminder for '+duration(result.seconds)+'.':tooLong?'Unwind to a shorter interval. This preview extends beyond the remaining cooking time.':'Wind clockwise around the rim. Stop at the interval you want.',detail:'Preview only · simulated time · a reminder means look again, never food ready',progress:invalid?0:Math.max(0,Math.min(1,t.position/5)),progressLabel:'Timer interval preview',target:{checkTimer:t.station},over:!!result,invalid:invalid,seconds:chosen};
  }
  function timerReading(s,timers,station,historical){
    if(historical)return {phase:'view-only',remaining:null,fraction:0,title:'VIEW ONLY',text:'Recorded kitchen · current reminders are hidden.'};
    var t=timers&&timers[station],valid=t&&C.create(t.setAt,t.dueAt-t.setAt);if(!valid||t.setAt>s.time)return {phase:'not-set',remaining:null,fraction:0,title:'--:--',text:'No check reminder set.'};
    var left=Math.max(0,t.dueAt-s.time),elapsed=t.status==='elapsed'||left===0;
    return {phase:elapsed?'elapsed':'waiting',remaining:left,fraction:elapsed?0:left/(t.dueAt-t.setAt),title:elapsed?'LOOK AGAIN':time(left),text:elapsed?'Check time reached at '+time(t.dueAt)+'. Inspect the food.':time(left)+' remaining · check at '+time(t.dueAt)+' simulated time.',dueAt:t.dueAt,interval:t.dueAt-t.setAt};
  }
  function decorate(h){
    var T=h.THREE,group=new T.Group(),dials={},textures=new Set(),geometries=new Set(),materials=new Set(),view=null,timers=null,historical=false,previewTrace=null,disposed=false;h.world.add(group);
    function mesh(geometry,color,x,y,z,parent,extra,station){var o=h.mesh(geometry,color,x,y,z,parent||group,extra);geometries.add(geometry);if(Array.isArray(o.material))o.material.forEach(function(m){materials.add(m);});else materials.add(o.material);if(station)o.userData.kitchenCheckTimer=station;else o.userData.sceneDecoration=true;return o;}
    mesh(new T.BoxGeometry(2.28,1.19,.095),'#b99a6b',0,3.53,-1.93);
    mesh(new T.BoxGeometry(2.18,.028,.025),'#775d3c',0,4.045,-1.87);
    mesh(new T.BoxGeometry(2.18,.028,.025),'#775d3c',0,3.015,-1.87);
    stations.forEach(function(station){
      var at=positions[station],dial=new T.Group();dial.position.set(at.x,at.y,at.z);group.add(dial);
      var housing=mesh(new T.CylinderGeometry(.45,.45,.12,64),'#3d594b',0,0,0,dial,{roughness:.48,metalness:.15});housing.rotation.x=Math.PI/2;
      var rim=mesh(new T.TorusGeometry(.383,.027,10,64),'#cdb584',0,0,.061,dial,{roughness:.32,metalness:.5},station);rim.name='check-timer-rim-'+station;
      var faceCanvas=document.createElement('canvas');faceCanvas.width=faceCanvas.height=512;var texture=new T.CanvasTexture(faceCanvas);texture.encoding=T.sRGBEncoding;textures.add(texture);
      var face=mesh(new T.CircleGeometry(.38,64),'#ffffff',0,0,.07,dial,{map:texture,roughness:1},station);face.name='check-timer-face-'+station;face.castShadow=false;
      var pointer=new T.Group();pointer.position.z=.079;dial.add(pointer);
      mesh(new T.BoxGeometry(.016,.13,.012),'#294b3c',0,.235,0,pointer);
      mesh(new T.SphereGeometry(.019,12,8),'#b69a66',0,0,.008,dial,{roughness:.5});
      dials[station]={group:dial,face:face,rim:rim,pointer:pointer,canvas:faceCanvas,texture:texture,signature:null};
    });
    function paint(station){
      var d=dials[station],reading=view?timerReading(view,timers,station,historical):{phase:'not-set',remaining:null,fraction:0,title:'--:--'},t=previewTrace&&previewTrace.station===station?previewTrace:null,chosen=t?seconds[t.preview]||0:0,phase=t?(t.invalid?'retry':t.phase):reading.phase;
      var signature=JSON.stringify([phase,reading.remaining,reading.fraction,chosen,t?t.position:0]);if(signature===d.signature)return;d.signature=signature;
      var c=d.canvas.getContext('2d');c.clearRect(0,0,512,512);c.fillStyle=reading.phase==='elapsed'&&!t?'#fff0cc':'#fbf7e9';c.beginPath();c.arc(256,256,253,0,Math.PI*2);c.fill();
      c.strokeStyle='#d7d6bf';c.lineWidth=14;c.beginPath();c.arc(256,256,178,0,Math.PI*2);c.stroke();
      var fraction=t?Math.max(0,Math.min(1,t.position/5)):reading.fraction;c.strokeStyle=phase==='retry'?'#966349':reading.phase==='elapsed'&&!t?'#b17926':'#598468';
      if(fraction>0){c.beginPath();c.arc(256,256,178,-Math.PI/2,-Math.PI/2+Math.PI*2*fraction);c.stroke();}
      c.textAlign='center';c.textBaseline='middle';c.font='bold 23px sans-serif';c.fillStyle='#3f5945';
      ['0','15s','30s','1m','2m','5m'].forEach(function(label,i){var a=i*step;c.fillText(label,256+Math.sin(a)*222,256-Math.cos(a)*222);});
      c.font='bold 24px sans-serif';c.fillText(station==='pot'?'POT CHECK':'PAN CHECK',256,187);
      c.font='bold '+(reading.phase==='elapsed'||historical?'34':'61')+'px monospace';c.fillStyle=phase==='retry'?'#85553c':'#294e3a';c.fillText(t?(t.invalid?'PUT BACK':time(chosen)):reading.title,256,260);
      c.font='bold 19px sans-serif';c.fillText(t?'PREVIEW ONLY':historical?'RECORDED VIEW':reading.phase==='elapsed'?'INSPECT THE FOOD':reading.phase==='waiting'?'SIMULATED TIME':'WIND TO SET',256,315);
      d.pointer.rotation.z=-(t?t.position*step:0);d.pointer.visible=!!t&&!t.invalid;d.texture.needsUpdate=true;
    }
    function datasets(){var t=previewTrace;h.canvas.dataset.checkTimerPhase=t?(t.invalid?'retry':t.phase):'idle';h.canvas.dataset.checkTimerHeld=t?'true':'';h.canvas.dataset.checkTimerStation=t?t.station:'';h.canvas.dataset.checkTimerSeconds=t?String(seconds[t.preview]||0):'0';}
    function update(s,nextTimers,recorded){if(disposed)return;view=s;timers=nextTimers;historical=!!recorded;previewTrace=null;stations.forEach(paint);datasets();}
    function preview(g){if(disposed)return;var t=traceOf(g);previewTrace=t&&stationOK(t.station)?t:null;stations.forEach(paint);datasets();}
    update(null,null,false);
    return {sources:positions,positions:positions,faceZ:faceZ,update:update,reset:function(s,nextTimers,recorded){update(s||view,nextTimers===undefined?timers:nextTimers,recorded===undefined?historical:recorded);},preview:preview,dispose:function(){if(disposed)return;disposed=true;h.world.remove(group);geometries.forEach(function(g){g.dispose();});materials.forEach(function(m){m.dispose();});textures.forEach(function(t){t.dispose();});previewTrace=null;}};
  }
  function mount(host){
    var panel=document.createElement('details'),listeners=[],view=null,viewTimers=null,viewStamp='',historical=false,selection='pot',draft=null,disposed=false;panel.id='timerWindingLesson';panel.className='timer-winding-lesson';
    panel.innerHTML='<summary><span><strong>Two check timers</strong><small>Wind · release · look again</small></span><span id="timerWindingSummary">No reminders set</span></summary><div class="timer-winding-body"><p>Choose when to look again at each vessel. Wind its timer, release to set a reminder, then advance the shared kitchen clock.</p><div class="timer-wind-cards">'+stations.map(function(station){return '<section class="timer-wind-card" id="timerWind'+(station==='pot'?'Pot':'Pan')+'" data-station="'+station+'" data-phase="not-set"><h3>'+name(station)+'</h3><strong class="timer-wind-reading">No reminder set</strong><p class="timer-wind-detail"></p><div class="timer-wind-actions"><button type="button" data-timer-wind-station="'+station+'">Wind '+station+' timer</button><button type="button" data-timer-inspect="'+station+'">Inspect '+station+'</button><button type="button" data-timer-clear="'+station+'">Clear reminder</button></div></section>';}).join('')+'</div><div class="timer-wind-actions"><button type="button" id="timerWindTry">Wind on the bench</button><button type="button" id="timerWindKeyboard">Use keyboard winding</button></div><section id="timerWindKeyboardPanel" hidden aria-labelledby="timerWindKeyboardTitle"><h3 id="timerWindKeyboardTitle">Choose your next check</h3><label for="timerWindStation">Check timer<select id="timerWindStation"><option value="pot">Pasta pot</option><option value="pan">Sauce pan</option></select></label><p id="timerWindKeys">Begin winding. Right or Up winds one interval; Left or Down unwinds. Enter releases to set it. Escape puts it back. Intervals: 15 seconds, 30 seconds, 1 minute, 2 minutes, 5 minutes of simulated time.</p><svg id="timerWindControl" viewBox="0 0 360 260" role="group" tabindex="0" aria-label="Winding check timer" aria-describedby="timerWindKeys"><rect x="20" y="12" width="320" height="231" rx="18" fill="#d5c29c"/><circle cx="180" cy="127" r="99" fill="#365744"/><circle cx="180" cy="127" r="85" fill="#faf5e4"/><g id="timerWindTicks"></g><g id="timerWindPointer"><path d="M180 61V75" stroke="#315740" stroke-width="5" stroke-linecap="round"/></g><text x="180" y="121" text-anchor="middle" id="timerWindPreview">0:00</text><text x="180" y="149" text-anchor="middle" id="timerWindPreviewLabel">BEGIN WINDING</text><text x="180" y="228" text-anchor="middle">SIMULATED TIME · LOOK AGAIN</text></svg><div class="timer-wind-actions"><button type="button" id="timerWindBegin">Begin winding</button><button type="button" id="timerWindWind">Wind one interval</button><button type="button" id="timerWindUnwind">Unwind one interval</button><button type="button" id="timerWindRelease">Release to set reminder</button><button type="button" id="timerWindCancel">Put back</button></div></section><p id="timerWindStatus" class="timer-wind-status" role="status" aria-live="polite" aria-atomic="true">Winding is a preview until you release. The shared clock stays paused.</p><p id="timerWindReceipt" class="timer-wind-receipt">No reminders set.</p><p class="timer-wind-note">Timers use simulated cooking time. Reaching a reminder pauses the kitchen so you can inspect the food and choose your next action. Reminders are not graded or recorded cooking actions, and they do not decide readiness.</p></div>';
    host.after.after(panel);var $=function(id){return panel.querySelector('#'+id);},ns='http://www.w3.org/2000/svg';
    ['0','15s','30s','1m','2m','5m'].forEach(function(label,i){var text=document.createElementNS(ns,'text'),a=i*step;text.setAttribute('x',180+Math.sin(a)*73);text.setAttribute('y',130-Math.cos(a)*73);text.setAttribute('text-anchor','middle');text.setAttribute('class','timer-wind-tick');text.textContent=label;$('timerWindTicks').append(text);});
    function on(el,event,fn){el.addEventListener(event,fn);listeners.push(function(){el.removeEventListener(event,fn);});}
    function current(){return host.getState?host.getState():view;}
    function currentTimers(){return host.getTimers?host.getTimers():viewTimers;}
    function currentView(){return !disposed&&view&&current()===view&&timerStamp(currentTimers())===viewStamp;}
    function canWind(){return currentView()&&available(view,selection,historical).ready;}
    function say(message){$('timerWindStatus').textContent=message;}
    function paint(){
      var can=canWind(),result=draft?value(current(),currentTimers(),draft,historical):null,index=draft?draft.preview:0;
      $('timerWindControl').dataset.phase=draft?(draft.invalid?'retry':result?'release':'wind'):'stored';$('timerWindControl').setAttribute('aria-disabled',String(!can));$('timerWindControl').setAttribute('tabindex',can?'0':'-1');$('timerWindControl').setAttribute('aria-label',name(selection)+' · '+(draft?duration(seconds[index])+' preview':'begin winding'));
      $('timerWindPreview').textContent=time(seconds[index]);$('timerWindPreviewLabel').textContent=draft?(index>0&&!C.create(view.time,seconds[index])?'SHORTEN INTERVAL':'PREVIEW ONLY'):'BEGIN WINDING';$('timerWindPointer').setAttribute('transform','rotate('+(index*60)+' 180 127)');
      $('timerWindStation').value=selection;$('timerWindStation').disabled=!currentView()||!!kitchenLock(view,historical);$('timerWindBegin').disabled=!can||!!draft;$('timerWindWind').disabled=!can||!draft||draft.invalid||index>=5;$('timerWindUnwind').disabled=!can||!draft||draft.invalid||index<=0;$('timerWindRelease').disabled=!result;$('timerWindCancel').disabled=!draft;
      $('timerWindTry').hidden=!host.has3D();$('timerWindTry').disabled=$('timerWindKeyboard').disabled=!can;
    }
    function cancel(message){draft=null;if(!disposed){paint();if(message)say(message);}}
    function open(station){if(disposed)return;host.pause();if(host.cancelNative)host.cancelNative();if(stationOK(station))selection=station;panel.open=true;$('timerWindKeyboardPanel').hidden=false;cancel();var a=available(view,selection,historical);say(canWind()?'Begin winding, choose an interval, then release. Nothing changes while you preview.':a.detail);(canWind()?$('timerWindControl'):panel.querySelector('summary')).focus({preventScroll:true});}
    function begin(){if(!canWind()){cancel('Winding stopped. The kitchen or another reminder changed; no reminder set.');return;}host.pause();if(host.cancelNative)host.cancelNative();draft=start(current(),currentTimers(),selection,{x:0,y:.4},historical);paint();say('Timer at zero. Wind clockwise to choose your next check interval.');}
    function adjust(direction){if(!draft)return;if(!canWind()||!valid(current(),currentTimers(),draft,historical)){cancel('Winding stopped. The kitchen or another reminder changed; no reminder set.');return;}var angle=draft.angle+direction*step;draft=move(draft,{x:Math.sin(angle)*.4,y:Math.cos(angle)*.4});paint();say(duration(seconds[draft.preview])+' preview. '+(draft.preview&&!C.create(view.time,seconds[draft.preview])?'Unwind to an interval within the remaining cooking time.':draft.preview?'Release to set this check reminder.':'Wind clockwise before releasing.'));}
    function release(){var s=current(),timers=currentTimers(),result=currentView()&&value(s,timers,draft,historical);if(!result){if(currentView()&&valid(s,timers,draft,historical)){paint();say('Wind to an available interval before releasing. This preview has not changed any reminder.');return;}cancel('No reminder set. Begin winding and choose an available interval before releasing.');return;}draft=null;host.pause();var accepted=host.setTimer(result.station,result.seconds);var expected=C.create(s.time,result.seconds),actual=currentTimers()&&currentTimers()[result.station];render(current(),currentTimers(),historical,false);say(accepted!==false&&actual&&actual.setAt===expected.setAt&&actual.dueAt===expected.dueAt?name(result.station)+' reminder set for '+time(expected.dueAt)+' simulated time. Advance the shared clock, then inspect the food.':'No reminder changed. Choose an interval available in the current kitchen.');}
    function render(s,timers,recorded,fresh){
      if(disposed||!s)return;var stamp=timerStamp(timers),wasHistorical=historical,cancelledDraft=!!draft&&(view!==s||stamp!==viewStamp||recorded||fresh);if(view!==s||stamp!==viewStamp||recorded||fresh)draft=null;view=s;viewTimers=timers;viewStamp=stamp;historical=!!recorded;if(fresh){selection='pot';$('timerWindKeyboardPanel').hidden=true;}
      var active=0,elapsed=0,receipts=[];stations.forEach(function(station){var card=$('timerWind'+(station==='pot'?'Pot':'Pan')),reading=timerReading(s,timers,station,historical);card.dataset.phase=reading.phase;card.querySelector('.timer-wind-reading').textContent=reading.title;card.querySelector('.timer-wind-detail').textContent=reading.text;card.querySelector('[data-timer-wind-station]').disabled=!available(s,station,historical).ready;card.querySelector('[data-timer-inspect]').disabled=!!kitchenLock(s,historical);card.querySelector('[data-timer-clear]').disabled=!!kitchenLock(s,historical)||reading.phase==='not-set'||historical;
        if(reading.phase==='waiting')active++;if(reading.phase==='elapsed')elapsed++;if(reading.dueAt!==undefined)receipts.push((station==='pot'?'Pot':'Pan')+' reminder set for '+time(reading.dueAt)+' simulated time.');});
      $('timerWindingSummary').textContent=historical?'View only':elapsed?'Look again':active?active+' reminder'+(active===1?'':'s'):'No reminders set';$('timerWindReceipt').textContent=historical?'Recorded kitchen. Current check reminders are hidden; these reminders are not part of the cooking evidence.':receipts.length?receipts.join(' '):'No reminders set.';if(historical){$('timerWindKeyboardPanel').hidden=true;say('Recorded kitchen. Winding is locked and current reminders are hidden.');}else if(fresh||wasHistorical)say(available(s,selection,false).ready?'Winding is a preview until you release. The shared clock stays paused.':available(s,selection,false).detail);else if(cancelledDraft)say('Winding stopped because the kitchen or a reminder changed. No reminder was set by this preview.');paint();
    }
    on($('timerWindTry'),'click',function(){if(!canWind())return;cancel();host.pause();if(host.cancelNative)host.cancelNative();host.openNative(selection);});on($('timerWindKeyboard'),'click',function(){open(selection);});on($('timerWindStation'),'change',function(){selection=this.value;cancel('Timer changed. Begin winding to preview a new reminder.');});
    on($('timerWindBegin'),'click',begin);on($('timerWindWind'),'click',function(){adjust(1);});on($('timerWindUnwind'),'click',function(){adjust(-1);});on($('timerWindRelease'),'click',release);on($('timerWindCancel'),'click',function(){cancel('Timer put back. No reminder changed.');});
    on($('timerWindControl'),'keydown',function(e){if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Enter','Escape'].indexOf(e.key)===-1)return;e.preventDefault();if(e.repeat)return;if(e.key==='Escape')cancel('Timer put back. No reminder changed.');else if(e.key==='Enter')release();else adjust(e.key==='ArrowRight'||e.key==='ArrowUp'?1:-1);});
    stations.forEach(function(station){on(panel.querySelector('[data-timer-wind-station="'+station+'"]'),'click',function(){if(!currentView()||!available(view,station,historical).ready)return;open(station);});on(panel.querySelector('[data-timer-inspect="'+station+'"]'),'click',function(){if(!currentView()||kitchenLock(view,historical))return;cancel();host.pause();host.inspect(station);});on(panel.querySelector('[data-timer-clear="'+station+'"]'),'click',function(){if(!currentView()||kitchenLock(view,historical))return;cancel();host.pause();host.clearTimer(station);render(current(),currentTimers(),historical,false);say(name(station)+' reminder cleared. Food observations and cooking time stay unchanged.');});});
    on(panel,'toggle',function(){if(panel.open)host.pause();else cancel();});function stop(){if(draft)cancel('Winding stopped. No reminder changed.');}on(window,'blur',stop);on(window,'resize',stop);on(window,'pagehide',stop);on(document,'visibilitychange',function(){if(document.hidden)stop();});on(window,'keydown',function(e){if(draft&&e.key==='Escape'&&!e.repeat){e.preventDefault();stop();}});
    return {render:render,set3D:function(){if(!disposed)paint();},open:open,cancel:function(){cancel('Timer put back. No reminder changed.');},dispose:function(){if(disposed)return;disposed=true;draft=null;listeners.forEach(function(remove){remove();});listeners=[];panel.remove();}};
  }
  var api={stations:stations,seconds:seconds,durations:seconds,step:step,innerRadius:innerRadius,outerRadius:outerRadius,positions:positions,sources:positions,faceZ:faceZ,name:name,stamp:timerStamp,valid:valid,available:available,pickup:pickup,start:start,move:move,value:value,guidance:guidance,decorate:decorate,mount:mount};root.KitchenTimerWinding=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
