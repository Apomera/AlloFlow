/* Lift, carry and lower cookware. Every held position is a preview until release. */
(function(root){
  'use strict';
  function mount(host){
    var R=root.KitchenRecipes,P=root.KitchenPanCarry,$=function(id){return document.getElementById(id);},view=null,locked=true,gesture=null,listeners=[],disposed=false;
    var panel=document.createElement('details');panel.id='panPlacementTools';panel.className='pan-placement-tools pan-carry-tools';
    panel.innerHTML='<summary>Lift the pan off heat <span id="panPlacementSummary"></span></summary><p id="panPlacementHelp">Start on the handle. Lift straight up, carry the level pan onto the other support, lower straight down, then release. A slide or an early release leaves the pan where it was.</p><svg id="panPlacementSvg" viewBox="0 0 360 230" role="group" aria-label="Pan handle, burner and resting trivet" aria-describedby="panPlacementHelp panPlacementKeyboard"><circle cx="82" cy="129" r="49" class="pan-carry-burner-ring" fill="#46614d"/><circle id="panPlacementBurner" cx="82" cy="129" r="40" fill="#65755b"/><g class="pan-carry-trivet" fill="none" stroke="#98784c" stroke-width="7"><rect x="211" y="85" width="99" height="88" rx="12"/><path d="M225 92V167M242 92V167M261 92V167M280 92V167M298 92V167"/></g><ellipse id="panPlacementLanding" cx="260" cy="129" rx="47" ry="34" fill="none" stroke="#345943" stroke-width="3" stroke-dasharray="5 5" visibility="hidden"/><text id="panPlacementBurnerLabel" x="82" y="195" text-anchor="middle" fill="#304b3d" font-size="12">Burner · off</text><text x="260" y="195" text-anchor="middle" fill="#304b3d" font-size="12">Trivet · no heat input</text><g id="panPlacementPan"><ellipse cx="82" cy="131" rx="40" ry="29" class="pan-carry-bowl" fill="#314b3c" stroke="#fff1c6" stroke-width="3"/><ellipse id="panPlacementFood" cx="82" cy="128" rx="31" ry="20" fill="#879676"/><text id="panPlacementTemperature" x="82" y="134" text-anchor="middle" fill="#fff8dc" font-size="12" font-weight="700"></text><g id="panPlacementHandle" role="button" tabindex="0" aria-label="Lift the sauce pan by its handle" aria-describedby="panPlacementHelp panPlacementKeyboard"><rect x="111" y="87" width="51" height="48" rx="9" class="pan-carry-handle-target" fill="transparent" pointer-events="all"/><path d="M110 132L150 112" class="pan-carry-grip" stroke="#293f31" stroke-width="14" stroke-linecap="round"/></g></g><g id="panPlacementLiftCue" fill="none" stroke="#304b3d" stroke-width="2"><path d="M174 116V49M164 59L174 48L184 59"/><text x="179" y="79" fill="#304b3d" stroke="none" font-size="12">Lift</text></g><text id="panPlacementHot" x="82" y="218" text-anchor="middle" fill="#8c3d21" font-size="12" font-weight="700"></text><text id="panPlacementPreviewLabel" x="180" y="23" text-anchor="middle" fill="#304b3d" font-size="12"></text></svg><div class="pan-carry-steps" role="group" aria-label="Lift, carry, lower and release the pan"><button id="panPlacementToggle" type="button">Lift handle</button><button id="panPlacementToBurner" type="button">Carry to burner</button><button id="panPlacementToTrivet" type="button">Carry to trivet</button><button id="panPlacementLower" type="button">Lower onto support</button><button id="panPlacementRelease" type="button">Release handle</button><button id="panPlacementCancel" type="button">Cancel carry</button></div><p id="panPlacementKeyboard" class="hands-note">Keyboard on the handle: Enter or Space lifts; Left chooses the burner and Right chooses the trivet. Enter lowers, then Enter releases. Escape cancels. The step buttons do the same work; a held pan has not moved yet.</p><p id="panPlacementReading"></p><p id="panPlacementFeedback" role="status" aria-live="polite" aria-atomic="true"></p>';
    $('handsDialHelp').after(panel);var svg=$('panPlacementSvg'),handle=$('panPlacementHandle');
    function on(el,event,fn){el.addEventListener(event,fn);listeners.push(function(){el.removeEventListener(event,fn);});}
    function say(message){if($('panPlacementFeedback').textContent!==message)$('panPlacementFeedback').textContent=message;}
    function ready(){return !disposed&&!!view&&!panel.hidden&&!locked&&P.available(host.getState(),false).ready;}
    function source(s){return R.panPosition(s).site;}
    function center(site){return site==='trivet'?{x:2.18,z:.6}:{x:1.02,z:-.45};}
    function grip(s){return P.handle?P.handle(s):{x:R.panPosition(s).x+.98*(s.pan.size==='wide'?1.08:1),z:R.panPosition(s).z};}
    function controls(){
      var t=gesture&&gesture.trace,phase=t?t.invalid?'retry':t.phase:'idle',can=ready();
      panel.dataset.panCarryPhase=phase;panel.dataset.panCarryHeld=String(!!t);panel.dataset.panCarryDestination=t&&t.destination||'';
      handle.setAttribute('aria-disabled',String(!can));handle.setAttribute('tabindex',can?'0':'-1');
      $('panPlacementToggle').disabled=!can||!!t;
      $('panPlacementToBurner').disabled=!can||!t||t.invalid||t.phase!=='carry'||t.sourceSite==='burner';
      $('panPlacementToTrivet').disabled=!can||!t||t.invalid||t.phase!=='carry'||t.sourceSite==='trivet';
      $('panPlacementLower').disabled=!can||!t||t.invalid||t.phase!=='lower';
      $('panPlacementRelease').disabled=!can||!t||!P.drop(host.getState(),t,locked);
      $('panPlacementCancel').disabled=!t;
      handle.setAttribute('aria-label',t?'Pan handle, '+phase+' preview. '+(t.phase==='carry'?'Choose the other support with Left or Right.':t.phase==='lower'?'Enter lowers onto the support.':t.phase==='done'?'Enter releases to record the move.':'Lift straight up.'):'Sauce pan on '+(source(view)==='trivet'?'trivet':'burner')+', '+Math.round(view.pan.temp)+' degrees Celsius. Enter lifts the handle.');
    }
    function paint(){
      if(!view)return;var t=gesture&&gesture.trace,held=t&&P.preview(t),at=held||R.panPosition(view),x=(at.x-1.02)*178/1.16,y=held?-128*held.y:0;
      $('panPlacementPan').setAttribute('transform','translate('+x.toFixed(2)+' '+y.toFixed(2)+')');
      var target=t&&!t.invalid&&(t.phase==='lower'||t.phase==='done'),opposite=source(view)==='trivet'?'burner':'trivet';
      $('panPlacementLanding').setAttribute('cx',opposite==='trivet'?'260':'82');$('panPlacementLanding').setAttribute('visibility',target?'visible':'hidden');
      $('panPlacementLiftCue').setAttribute('visibility',!t||t.phase==='lift'?'visible':'hidden');
      $('panPlacementPreviewLabel').textContent=t?'Held preview · no move recorded':'';
      controls();
    }
    function releaseCapture(){var g=gesture;gesture=null;if(g&&g.id!==undefined&&svg.hasPointerCapture(g.id))svg.releasePointerCapture(g.id);}
    function cancel(message){if(disposed)return;releaseCapture();paint();if(message)say(message);}
    function instruction(){var t=gesture&&gesture.trace;if(!t)return;var guide=P.guidance(host.getState(),{trace:t});say(guide.instruction+' '+(t.invalid?'No placement recorded.':guide.detail));}
    function begin(method,e){
      if(!ready())return false;cancel();if(typeof host.cancelNative==='function')host.cancelNative();host.pause();var s=host.getState(),h=grip(s),p=e?point(e):{u:100,v:100},startPoint={x:h.x,z:h.z,u:p.u,v:p.v},trace=P.start(s,startPoint,locked);if(!trace)return false;
      gesture={trace:trace,method:method,point:startPoint,state:s,screen:p,grip:h};if(e)gesture.id=e.pointerId;
      paint();instruction();return true;
    }
    function moveTo(p){if(!gesture)return;gesture.trace=P.move(gesture.trace,p);gesture.point=p;paint();instruction();}
    function lift(){if(!begin('pan-carry-keyboard'))return;var p=Object.assign({},gesture.point,{v:60});moveTo(p);}
    function carry(site){
      if(!gesture||gesture.method!=='pan-carry-keyboard'||gesture.trace.invalid||gesture.trace.phase!=='carry'||site===gesture.trace.sourceSite)return;
      var from=center(gesture.trace.sourceSite),to=center(site),g=gesture;moveTo({x:g.grip.x+to.x-from.x,z:g.grip.z+to.z-from.z,u:200,v:100});
    }
    function lower(){if(!gesture||gesture.method!=='pan-carry-keyboard'||gesture.trace.invalid||gesture.trace.phase!=='lower')return;moveTo(Object.assign({},gesture.point,{v:gesture.point.v+40}));}
    function commit(){
      if(!gesture||!ready())return;var g=gesture,placement=P.drop(host.getState(),g.trace,locked);
      if(!placement||g.state!==host.getState()){cancel('Carry cancelled. Lift, carry onto the other support, lower and release to record a move.');return;}
      cancel();host.pause();host.apply('panPlace',typeof placement==='string'?placement:placement.value,g.method);say(host.getState().feedback);
    }
    function point(e){var b=svg.getBoundingClientRect();return {u:(e.clientX-b.left)*360/b.width,v:(e.clientY-b.top)*230/b.height};}
    function nativePoint(e){var p=point(e),g=gesture,dx=p.u-g.screen.u;return {x:g.grip.x+dx*1.16/178,z:g.grip.z+dx*1.05/178,u:p.u,v:p.v};}
    on(handle,'pointerdown',function(e){if(gesture){e.preventDefault();cancel('Carry cancelled. Use one pointer at a time.');return;}if(!ready()||e.button!==0||!e.isPrimary)return;e.preventDefault();handle.focus({preventScroll:true});if(begin('pan-carry-svg',e))svg.setPointerCapture(e.pointerId);});
    on(svg,'pointermove',function(e){if(gesture&&gesture.id===e.pointerId)moveTo(nativePoint(e));});
    on(svg,'pointerup',function(e){if(!gesture||gesture.id!==e.pointerId)return;moveTo(nativePoint(e));if(P.drop(host.getState(),gesture.trace,locked))commit();else cancel('No move recorded. Lift the handle, carry onto the other support, lower and release.');});
    ['pointercancel','lostpointercapture'].forEach(function(type){on(svg,type,function(e){if(gesture&&gesture.id===e.pointerId)cancel('Carry cancelled. The pan stays on its original support.');});});
    on(handle,'keydown',function(e){
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight'&&e.key!=='Enter'&&e.key!==' ')return;e.preventDefault();if(e.repeat||!ready())return;
      if(e.key==='ArrowLeft'||e.key==='ArrowRight'){if(gesture&&gesture.method==='pan-carry-keyboard')carry(e.key==='ArrowLeft'?'burner':'trivet');else say('Lift the handle first, then choose the other support.');return;}
      if(!gesture)lift();else if(gesture.method==='pan-carry-keyboard'){if(gesture.trace.phase==='lower')lower();else if(gesture.trace.phase==='done')commit();else if(gesture.trace.phase==='carry')say('Choose the other support with Left or Right before lowering.');}
    });
    on($('panPlacementToggle'),'click',lift);on($('panPlacementToBurner'),'click',function(){carry('burner');});on($('panPlacementToTrivet'),'click',function(){carry('trivet');});on($('panPlacementLower'),'click',lower);on($('panPlacementRelease'),'click',commit);on($('panPlacementCancel'),'click',function(){cancel('Carry cancelled. The pan stays on its original support.');});
    on(panel,'toggle',function(){if(!panel.open)cancel();});on(window,'keydown',function(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel('Carry cancelled. The pan stays on its original support.');}});
    on(window,'blur',function(){cancel();});on(window,'resize',function(){cancel();});on(window,'pagehide',function(){cancel();});on(document,'visibilitychange',function(){if(document.hidden)cancel();});
    function render(s,zone,historical){
      if(disposed)return;var hidden=zone!=='pan'&&zone!=='finish';if(gesture&&(view!==s||hidden||historical||host.ended()))cancel();view=s;locked=!!historical||host.ended()||!P.available(s,false).ready;panel.hidden=hidden;
      var parked=source(s)==='trivet',heat=['off','low','medium','high'][s.pan.heat],hot=s.pan.temp>70;
      $('panPlacementSummary').textContent=parked?'On trivet':'On burner';$('panPlacementBurnerLabel').textContent='Burner · '+heat+(parked&&s.pan.heat?' · empty':'');
      $('panPlacementBurner').setAttribute('fill',['#65755b','#aa8b57','#c57e43','#ce5b37'][s.pan.heat]);$('panPlacementFood').setAttribute('fill',s.pan.damage>=1?'#49312a':s.pan.produce?(s.id==='tomato'?'#b65d3e':'#ba945a'):'#879676');
      $('panPlacementTemperature').textContent=Math.round(s.pan.temp)+'°C';$('panPlacementHot').textContent=hot?'Hot pan · handle only':'';
      $('panPlacementReading').textContent=Math.round(s.pan.temp)+'°C modeled pan surface. '+(parked?'No burner heat reaches the pan. '+(hot?'Stored heat can keep cooking the food while the pan cools. ':'It is cooling toward room temperature. ')+(s.pan.heat?'The empty burner is still '+heat+'; moving the pan did not switch it off.':'The burner is off.'):'The pan receives heat from its burner when the burner is on. '+(hot?'Stored heat stays in the pan when you lift it. ':''))+' Lifting, carrying and placing do not advance time or change the temperature. Advance the shared clock to observe heating or cooling.';
      paint();if(historical)say('Recorded pan position. Movement is locked during replay.');else if(locked)say(P.available(s,true).detail);else if(!gesture)say('Lift, carry, lower and release. The handle stays a preview until a completed release records the move.');
    }
    return {render:render,cancel:cancel,open:function(){if(disposed)return;panel.open=true;handle.focus();panel.scrollIntoView({block:'nearest'});},dispose:function(){if(disposed)return;cancel();disposed=true;listeners.forEach(function(remove){remove();});panel.remove();}};
  }
  root.KitchenHeatTools={mount:mount};
})(window);
