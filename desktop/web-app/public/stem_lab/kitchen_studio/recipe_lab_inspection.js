/* Food checks: deliberate gestures, equivalent keyboard actions, recorded observations. */
(function(root){
  'use strict';
  function start(kind,p){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return null;
    var inside=kind==='pasta'?p.x>=130&&p.x<=230&&p.y>=25&&p.y<=85:kind==='sauce'&&p.x>=30&&p.x<=95&&p.y>=85&&p.y<=155;
    return inside?{kind:kind,x:p.x,y:p.y,last:kind==='pasta'?p.y:p.x,progress:0,invalid:false}:null;
  }
  function move(g,p){
    if(!g)return null;
    var next=Object.assign({},g);if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)){next.invalid=true;return next;}
    var axis=g.kind==='pasta'?p.y:p.x,travel=axis-(g.kind==='pasta'?g.y:g.x),lateral=Math.abs(g.kind==='pasta'?p.x-g.x:p.y-g.y);
    next.invalid=g.invalid||lateral>45||axis<g.last-14||p.x<15||p.x>345||p.y<15||p.y>225;
    next.last=Math.max(g.last,axis);next.progress=Math.max(0,Math.min(1,travel/(g.kind==='pasta'?90:220)));
    return next;
  }
  function complete(g){return !!g&&!g.invalid&&g.progress>=1;}
  function mount(host){
    var R=root.KitchenRecipes,$=function(id){return document.getElementById(id);},view=null,kind='pasta',locked=true,gesture=null,frame=null,observed=null,sampleStudio=null,sauceReplay=null,disposed=false,listeners=[];
    function on(el,type,fn){el.addEventListener(type,fn);listeners.push(function(){el.removeEventListener(type,fn);});}
    var panel=document.createElement('section');panel.id='foodCheckPanel';panel.className='food-check-panel';panel.setAttribute('aria-labelledby','foodCheckTitle');
    panel.innerHTML='<div class="food-check-heading"><div><p class="eyebrow">FEEL · OBSERVE · DECIDE</p><h4 id="foodCheckTitle">Check a pasta sample</h4></div><span id="foodCheckTag">Inspection station</span></div><p id="foodCheckHelp"></p><svg id="foodCheckSvg" viewBox="0 0 360 240" role="group" tabindex="0" aria-labelledby="foodCheckVisualTitle" aria-describedby="foodCheckHelp foodCheckGesture"><title id="foodCheckVisualTitle">Fork and pasta sample</title><rect x="2" y="2" width="356" height="236" rx="18" fill="#fbfaf2" stroke="#a5b69a"/><g id="foodCheckPasta"><ellipse cx="180" cy="154" rx="128" ry="53" fill="#eef1e7" stroke="#b6c3aa"/><g id="foodCheckNoodle"><ellipse cx="180" cy="155" rx="67" ry="31" fill="#e6c473" stroke="#886932" stroke-width="2"/><ellipse id="foodCheckCore" cx="180" cy="155" rx="42" ry="21" fill="#fff7dc" visibility="hidden"/><path d="M128 138L138 167M146 127L156 177M206 127L216 175M225 138L234 164" stroke="#bc9246" stroke-width="3"/></g><g id="foodCheckFork" fill="none" stroke="#506b59" stroke-width="7" stroke-linecap="round"><path d="M180 24V58Q180 71 158 71M152 53V83M170 55V88M188 55V88M206 53V83M158 71H201"/></g><path d="M265 72V139M255 129L265 140L275 129" fill="none" stroke="#526b48" stroke-width="3"/><text x="180" y="218" text-anchor="middle" fill="#344d3c" font-size="12">Pull the fork down through the sample</text></g><g id="foodCheckSauce" style="display:none"><defs><linearGradient id="checkWood" x2="0" y2="1"><stop stop-color="#ecd8b5"/><stop offset="1" stop-color="#d0ac7d"/></linearGradient><linearGradient id="checkMetal" x2="0" y2="1"><stop stop-color="#dfe7db"/><stop offset=".3" stop-color="#92a79b"/><stop offset=".7" stop-color="#70887b"/><stop offset="1" stop-color="#cfdbcc"/></linearGradient><linearGradient id="checkSpoonWood" x2="1" y2="1"><stop stop-color="#e0b274"/><stop offset=".5" stop-color="#bd874e"/><stop offset="1" stop-color="#8b5c35"/></linearGradient><radialGradient id="checkBowl"><stop stop-color="#986236"/><stop offset=".78" stop-color="#ba854c"/><stop offset="1" stop-color="#e0b477"/></radialGradient></defs><rect x="2" y="2" width="356" height="236" rx="18" fill="url(#checkWood)"/><path d="M10 25Q170 14 350 25M10 57Q120 49 350 57M10 194Q210 186 350 194M10 218Q160 211 350 218" fill="none" stroke="#aa8357" opacity=".3"/><ellipse cx="180" cy="133" rx="155" ry="90" fill="#624b32" opacity=".22"/><path d="M309 103H344Q352 103 352 112V137Q352 146 344 146H309" fill="#385246" stroke="#203b2e" stroke-width="3"/><rect x="331" y="111" width="13" height="26" rx="5" fill="#dac09a"/><ellipse cx="180" cy="125" rx="151" ry="90" fill="url(#checkMetal)" stroke="#3a5547" stroke-width="2"/><ellipse cx="180" cy="125" rx="141" ry="80" fill="#2e4939"/><ellipse cx="180" cy="125" rx="137" ry="76" fill="#b99358" id="foodCheckSauceFill"/><path d="M79 62Q169 19 262 64" fill="none" stroke="#f5f2db" stroke-width="3" opacity=".6"/><path id="foodCheckTrail" d="M63 125H63" fill="none" stroke="#2e4939" stroke-width="21" stroke-linecap="round"/><g id="foodCheckSpoon"><path d="M60 96V34" stroke="#624127" stroke-width="16" stroke-linecap="round"/><path d="M60 96V34" stroke="url(#checkSpoonWood)" stroke-width="13" stroke-linecap="round"/><path d="M57 42Q55 65 58 88M62 42Q64 61 62 82" fill="none" stroke="#e3b97e" stroke-width="1.2" opacity=".7"/><circle cx="60" cy="37" r="2.5" fill="#735033"/><ellipse cx="60" cy="127" rx="24" ry="31" fill="#533b27" opacity=".22"/><ellipse cx="60" cy="125" rx="22" ry="29" fill="url(#checkBowl)" stroke="#705233" stroke-width="2"/><path d="M47 109Q43 122 48 139" fill="none" stroke="#efcb94" stroke-width="1.7" opacity=".65"/></g><g id="foodCheckSauceGuide"><path d="M103 125H291M281 115L292 125L281 135" fill="none" stroke="#fff7dc" stroke-width="2" stroke-dasharray="5 5"/><ellipse cx="60" cy="125" rx="28" ry="34" fill="none" stroke="#fff7dc" stroke-width="1.5" stroke-dasharray="3 4"/></g><text x="180" y="229" text-anchor="middle" fill="#344d3c" font-size="12" font-weight="700">DRAW RIGHT · RELEASE · OBSERVE</text></g></svg><p id="foodCheckGesture" class="food-check-gesture" role="status" aria-live="polite" aria-atomic="true"></p><button id="foodCheckEquivalent" type="button">Check texture directly</button><p class="hands-note">Both methods record the same food check. The kitchen pauses while you inspect. This models observations, not physical cooking skill.</p><div id="foodCheckResult" class="food-check-result" role="status" aria-live="polite" aria-atomic="true"></div><p id="foodCheckPrevious" class="hands-note"></p>';
    var checkButton=document.createElement('button');checkButton.id='showFoodCheck';checkButton.type='button';checkButton.textContent='Check doneness';checkButton.setAttribute('aria-pressed','false');on(checkButton,'click',function(){host.selectTool('check');});$('sauceTools').append(checkButton);
    $('sauceTools').after(panel);
    var svg=$('foodCheckSvg'),sampleHost=document.createElement('div');sampleHost.id='foodCheckSampleHost';svg.before(sampleHost);sampleStudio=root.KitchenSampleStudio.mount({container:sampleHost,getState:host.getState,pause:host.pause,apply:host.apply,cancelNative:host.cancelNative});
    var replayHost=document.createElement('div');replayHost.id='foodCheckReplayHost';$('foodCheckPrevious').before(replayHost);sauceReplay=root.KitchenSauceReplay.mount({container:replayHost});
    // The sampled spoon retains a visible coating after the track closes.
    var coating=document.createElementNS('http://www.w3.org/2000/svg','g');coating.id='foodCheckCoating';coating.innerHTML='<ellipse id="foodCheckCoatLayer" cx="60" cy="125" rx="17" ry="23"/><path id="foodCheckCoatPatches" d="M47 116Q52 103 59 111L63 122L52 128ZM60 136L72 124L76 134L66 145Z"/><path id="foodCheckDrip" d="M58 156Q51 168 59 173Q67 168 58 156Z"/><g id="foodCheckScorch" fill="#39271f"><circle cx="53" cy="115" r="4"/><circle cx="66" cy="125" r="5"/><circle cx="56" cy="139" r="3"/></g>';$('foodCheckSpoon').append(coating);
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    function stopAnimation(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
    function release(){var g=gesture;gesture=null;if(g&&g.id!==null&&svg.hasPointerCapture(g.id))svg.releasePointerCapture(g.id);}
    function say(text){if($('foodCheckResult').textContent!==text)$('foodCheckResult').textContent=text;}
    function paint(progress,reading){
      $('foodCheckFork').setAttribute('transform','translate(0 '+(reading?0:progress*75)+')');
      var compression=reading&&kind==='pasta'?reading.compression:progress*.16;
      $('foodCheckNoodle').setAttribute('transform','translate(0 '+(155*compression)+') scale(1 '+(1-compression)+')');
      $('foodCheckCore').setAttribute('visibility',reading&&kind==='pasta'?'visible':'hidden');
      $('foodCheckCore').setAttribute('rx',reading&&kind==='pasta'?Math.max(0,reading.coreFraction*65):42);
      $('foodCheckCore').setAttribute('ry',reading&&kind==='pasta'?Math.max(0,reading.coreFraction*30):21);
      $('foodCheckSpoon').setAttribute('transform','translate('+(reading?0:progress*220)+' 0)');
      $('foodCheckTrail').setAttribute('d','M63 125H'+(63+progress*220));$('foodCheckTrail').setAttribute('stroke-width','21');
      coating.style.display=reading&&kind==='sauce'?'':'none';
      if(reading&&kind==='sauce'){
        var color=view&&view.id==='tomato'?'#ae5030':'#896126',thin=reading.type==='watery'||reading.type==='unmixed';
        coating.setAttribute('fill',color);$('foodCheckCoatLayer').style.display=reading.type==='dry'?'none':'';$('foodCheckCoatLayer').setAttribute('opacity',thin?'.35':'.95');$('foodCheckCoatPatches').style.display=reading.type==='dry'?'':'none';$('foodCheckDrip').style.display=thin?'':'none';$('foodCheckScorch').style.display=reading.type==='scorched'?'':'none';
      }
    }
    function cancel(message){if(disposed)return;if(sampleStudio)sampleStudio.cancel();if(sauceReplay)sauceReplay.cancel();release();stopAnimation();paint(observed?1:0,observed);guide();if(message)say(message);}
    function animate(reading){
      stopAnimation();paint(1,reading);if(kind!=='sauce'||!reading.closureSeconds)return;
      if(root.matchMedia('(prefers-reduced-motion: reduce)').matches){$('foodCheckTrail').setAttribute('stroke-width','0');return;}
      var started=performance.now();function tick(now){if(document.hidden||panel.hidden){stopAnimation();return;}var t=Math.min(1,(now-started)/(reading.closureSeconds*1000));$('foodCheckTrail').setAttribute('stroke-width',String(21*(1-t)));if(t<1)frame=requestAnimationFrame(tick);else frame=null;}frame=requestAnimationFrame(tick);
    }
    function record(method){if(!ready())return;if(sampleStudio)sampleStudio.cancel();if(host.cancelNative)host.cancelNative();release();stopAnimation();host.pause();host.apply(kind==='pasta'?'sample':'taste',undefined,method);var checks=R.inspections(host.getState()),last=checks[checks.length-1];if(last&&last.kind===kind)animate(last);}
    function stamp(s){return JSON.stringify([s.time,s.log.length,s.plated,s.submitted,s.pan,s.pot,s.servings]);}
    function ready(){return !!view&&!disposed&&!locked&&!panel.hidden&&host.getState()===view&&(kind==='pasta'?root.KitchenSampling.available(view,false).ready:root.KitchenSauceCheck.available(view,false).ready);}
    function fresh(g){return !!g&&ready()&&g.state===host.getState()&&g.stamp===stamp(g.state);}
    function point(e){
      try{var matrix=svg.getScreenCTM();if(matrix&&svg.createSVGPoint){var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;var q=p.matrixTransform(matrix.inverse());return {x:q.x,y:q.y};}}catch(ignore){}
      var b=svg.getBoundingClientRect();if(!(b.width>0&&b.height>0))return null;var scale=Math.min(b.width/360,b.height/240);return {x:(e.clientX-b.left-(b.width-360*scale)/2)/scale,y:(e.clientY-b.top-(b.height-240*scale)/2)/scale};
    }
    function guide(){var g=gesture;svg.dataset.checkPhase=g?(g.trace.invalid?'retry':complete(g.trace)?'release':'draw'):'idle';svg.dataset.checkProgress=String(g?g.trace.progress:0);$('foodCheckGesture').textContent=g?(g.trace.invalid?'Move cancelled. Escape or release to start again.':Math.round(g.trace.progress*100)+'% · '+(complete(g.trace)?g.id===null?'Press Enter to record this check.':'Release to record this check.':g.id===null?'Press Right to draw the spoon.':'Keep drawing steadily to the right.')):'';}
    function begin(trace,id){stopAnimation();sauceReplay.cancel();if(host.cancelNative)host.cancelNative();host.pause();gesture={id:id,trace:trace,state:host.getState(),stamp:stamp(host.getState())};paint(0,null);guide();}
    function finish(trace,method){var valid=fresh(gesture)&&complete(trace);release();guide();if(valid)record(method);else cancel('No check recorded. Start on the tool and complete the full movement.');}
    on(svg,'pointerdown',function(e){
      if(gesture){cancel('Check cancelled. Use one pointer at a time.');return;}
      if(!ready()||e.button!==0||!e.isPrimary)return;var trace=start(kind,point(e));if(!trace)return;e.preventDefault();begin(trace,e.pointerId);svg.focus({preventScroll:true});svg.setPointerCapture(e.pointerId);
    });
    on(svg,'pointermove',function(e){if(!gesture||gesture.id!==e.pointerId)return;if(!fresh(gesture)){cancel('Check cancelled because the kitchen changed.');return;}gesture.trace=move(gesture.trace,point(e));paint(gesture.trace.progress,null);guide();});
    on(svg,'pointerup',function(e){if(!gesture||gesture.id!==e.pointerId)return;finish(move(gesture.trace,point(e)),kind==='pasta'?'sample-press':'sauce-trail');});
    ['pointercancel','lostpointercapture'].forEach(function(type){on(svg,type,function(e){if(gesture&&gesture.id===e.pointerId)cancel('Check cancelled. No observation recorded.');});});
    on(svg,'keydown',function(e){
      if(kind!=='sauce'||['Enter',' ','ArrowRight','ArrowLeft','Escape'].indexOf(e.key)===-1)return;e.preventDefault();if(e.repeat)return;
      if(e.key==='Escape'){cancel('Check cancelled. No observation recorded.');return;}
      if(e.key==='Enter'||e.key===' '){if(!gesture){if(ready())begin(start('sauce',{x:60,y:125}),null);}else if(gesture.id===null)finish(gesture.trace,'keyboard');return;}
      if(!gesture||gesture.id!==null)return;if(!fresh(gesture)){cancel('Check cancelled because the kitchen changed.');return;}
      var x=gesture.trace.x+gesture.trace.progress*220+(e.key==='ArrowRight'?55:-55);gesture.trace=move(gesture.trace,{x:Math.max(30,Math.min(335,x)),y:125});paint(gesture.trace.progress,null);guide();
    });
    on($('foodCheckEquivalent'),'click',function(){record('keyboard');});
    on(window,'resize',function(){if(gesture)cancel('Check cancelled because the view changed.');});
    on(window,'keydown',function(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel('Check cancelled. No observation recorded.');}});
    on(window,'blur',function(){cancel();});on(window,'pagehide',function(){cancel();});on(document,'visibilitychange',function(){if(document.hidden)cancel();});
    function render(s,zone,historical,active){
      if(disposed)return;
      var nextKind=zone==='pot'?'pasta':'sauce',hidden=zone!=='pot'&&(!(zone==='pan'||zone==='finish')||!active);
      if(hidden){if(gesture||frame!==null)cancel();sampleStudio.render(s,historical,false);sauceReplay.render(s,historical,false);view=s;kind=nextKind;panel.hidden=true;locked=true;checkButton.setAttribute('aria-pressed',String(active));return;}
      if(view!==s||kind!==nextKind||hidden||historical||gesture&&!fresh(gesture))cancel();view=s;kind=nextKind;panel.hidden=hidden;checkButton.setAttribute('aria-pressed',String(active));
      locked=historical||host.ended()||(kind==='pasta'?!root.KitchenSampling.available(s,false).ready:!root.KitchenSauceCheck.available(s,false).ready);sampleStudio.render(s,historical||host.ended(),kind==='pasta');svg.style.display=kind==='pasta'?'none':'';sauceReplay.render(s,historical||host.ended(),kind==='sauce');
      var checks=R.inspections(s).filter(function(c){return c.kind===kind;});observed=checks[checks.length-1]||null;var previous=checks[checks.length-2];
      $('foodCheckTitle').textContent=kind==='pasta'?'Check a pasta sample':'Read the sauce trail';
      $('foodCheckTag').textContent=historical?'Recorded inspection':'Inspection station';
      $('foodCheckPasta').style.display=kind==='pasta'?'':'none';$('foodCheckSauce').style.display=kind==='sauce'?'':'none';
      $('foodCheckSauceFill').setAttribute('fill',observed&&observed.type==='scorched'?'#76503a':s.id==='tomato'?'#bb6542':'#b99358');
      $('foodCheckHelp').textContent=kind==='pasta'?'Carry a fork sample from the pot to the saucer, press down, lift back, then release to examine its center and resistance.':'Start on the wooden spoon at the left. Draw right across the pan, then release to record. Keyboard: Enter, four Right presses, then Enter. Replay the recorded trail below to compare its closure and coating.';
      $('foodCheckEquivalent').textContent=kind==='pasta'?'Check texture directly':'Check coating without dragging';$('foodCheckEquivalent').disabled=locked;svg.setAttribute('aria-disabled',String(locked));
      var stale=observed&&(kind==='pasta'?!!s.pot.sample&&(Math.abs(s.pot.progress-s.pot.sample.progress)>.000001||(s.pastaModel===1&&observed.clumped!==R.pastaSurface(s).clumped)):!s.pan.tasted);
      var result=observed?clock(observed.time)+' · '+observed.label+'. '+observed.observation+(stale?' The food has changed since this check. Inspect again before deciding.':''):kind==='pasta'?'No sample checked yet. Texture will be revealed after the check.':'No sauce trail checked yet. Observe the coating before deciding on another adjustment.';
      if(historical)result+=' Recorded view; checking is locked.';else if(host.ended())result+=' Cook finished; start a fresh cook to inspect again.';else if(locked)result+=' '+(kind==='pasta'?(s.pot.lid==='covered'?'Lift the lid onto its rest before checking texture.':'Add pasta to boiling water first; sample before draining.'):root.KitchenSauceCheck.available(s,historical||host.ended()).detail);
      say(result);$('foodCheckPrevious').hidden=true;$('foodCheckPrevious').textContent=previous?'Previous check at '+clock(previous.time)+': '+previous.label+'.':'';
      $('foodCheckVisualTitle').textContent=(kind==='pasta'?'Fork pressing a pasta sample. ':'Spoon drawn through sauce. ')+(observed?observed.observation:'Complete the gesture or use the equivalent check button to record an observation.');
      if(gesture){paint(gesture.trace.progress,null);guide();}else{paint(observed?1:0,observed);guide();}
    }
    return {render:render,cancel:cancel,focusSample:function(){sampleStudio.focus();},focusSauce:function(){if(!disposed&&!panel.hidden&&kind==='sauce')svg.focus({preventScroll:true});},dispose:function(){if(disposed)return;cancel();disposed=true;sampleStudio.dispose();sauceReplay.dispose();listeners.forEach(function(remove){remove();});checkButton.remove();panel.remove();}};
  }
  var api={start:start,move:move,complete:complete,mount:mount};root.KitchenRecipeInspection=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
