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
    var R=root.KitchenRecipes,$=function(id){return document.getElementById(id);},view=null,kind='pasta',locked=true,gesture=null,frame=null,observed=null,sampleStudio=null,sauceReplay=null,disposed=false,listeners=[],trailKey=null,trailFraction=1,motion=root.matchMedia('(prefers-reduced-motion: reduce)');
    function on(el,type,fn){el.addEventListener(type,fn);listeners.push(function(){el.removeEventListener(type,fn);});}
    var panel=document.createElement('section');panel.id='foodCheckPanel';panel.className='food-check-panel';panel.setAttribute('aria-labelledby','foodCheckTitle');
    panel.innerHTML='<div class="food-check-heading"><div><p class="eyebrow">FEEL · OBSERVE · DECIDE</p><h4 id="foodCheckTitle">Check a pasta sample</h4></div><span id="foodCheckTag">Inspection station</span></div><p id="foodCheckHelp"></p><svg id="foodCheckSvg" viewBox="0 0 360 240" role="group" tabindex="0" aria-labelledby="foodCheckVisualTitle" aria-describedby="foodCheckHelp foodCheckGesture"><title id="foodCheckVisualTitle">Fork and pasta sample</title><rect x="2" y="2" width="356" height="236" rx="18" fill="#fbfaf2" stroke="#a5b69a"/><g id="foodCheckPasta"><ellipse cx="180" cy="154" rx="128" ry="53" fill="#eef1e7" stroke="#b6c3aa"/><g id="foodCheckNoodle"><ellipse cx="180" cy="155" rx="67" ry="31" fill="#e6c473" stroke="#886932" stroke-width="2"/><ellipse id="foodCheckCore" cx="180" cy="155" rx="42" ry="21" fill="#fff7dc" visibility="hidden"/><path d="M128 138L138 167M146 127L156 177M206 127L216 175M225 138L234 164" stroke="#bc9246" stroke-width="3"/></g><g id="foodCheckFork" fill="none" stroke="#506b59" stroke-width="7" stroke-linecap="round"><path d="M180 24V58Q180 71 158 71M152 53V83M170 55V88M188 55V88M206 53V83M158 71H201"/></g><path d="M265 72V139M255 129L265 140L275 129" fill="none" stroke="#526b48" stroke-width="3"/><text x="180" y="218" text-anchor="middle" fill="#344d3c" font-size="12">Pull the fork down through the sample</text></g><g id="foodCheckSauce" style="display:none"><defs><linearGradient id="checkWood" x2="0" y2="1"><stop stop-color="#ecd8b5"/><stop offset="1" stop-color="#d0ac7d"/></linearGradient><linearGradient id="checkMetal" x2="0" y2="1"><stop stop-color="#dfe7db"/><stop offset=".3" stop-color="#92a79b"/><stop offset=".7" stop-color="#70887b"/><stop offset="1" stop-color="#cfdbcc"/></linearGradient><linearGradient id="checkSpoonWood" x2="1" y2="1"><stop stop-color="#e0b274"/><stop offset=".5" stop-color="#bd874e"/><stop offset="1" stop-color="#8b5c35"/></linearGradient><radialGradient id="checkBowl"><stop stop-color="#986236"/><stop offset=".78" stop-color="#ba854c"/><stop offset="1" stop-color="#e0b477"/></radialGradient></defs><rect x="2" y="2" width="356" height="236" rx="18" fill="url(#checkWood)"/><path d="M10 25Q170 14 350 25M10 57Q120 49 350 57M10 194Q210 186 350 194M10 218Q160 211 350 218" fill="none" stroke="#aa8357" opacity=".3"/><ellipse cx="180" cy="133" rx="155" ry="90" fill="#624b32" opacity=".22"/><path d="M309 103H344Q352 103 352 112V137Q352 146 344 146H309" fill="#385246" stroke="#203b2e" stroke-width="3"/><rect x="331" y="111" width="13" height="26" rx="5" fill="#dac09a"/><ellipse cx="180" cy="125" rx="151" ry="90" fill="url(#checkMetal)" stroke="#3a5547" stroke-width="2"/><ellipse cx="180" cy="125" rx="141" ry="80" fill="#2e4939"/><ellipse cx="180" cy="125" rx="137" ry="76" fill="#b99358" id="foodCheckSauceFill"/><path d="M79 62Q169 19 262 64" fill="none" stroke="#f5f2db" stroke-width="3" opacity=".6"/><path id="foodCheckTrail" d="M63 125H63" fill="none" stroke="#2e4939" stroke-width="21" stroke-linecap="round"/><g id="foodCheckSpoon"><path d="M60 96V34" stroke="#624127" stroke-width="16" stroke-linecap="round"/><path d="M60 96V34" stroke="url(#checkSpoonWood)" stroke-width="13" stroke-linecap="round"/><path d="M57 42Q55 65 58 88M62 42Q64 61 62 82" fill="none" stroke="#e3b97e" stroke-width="1.2" opacity=".7"/><circle cx="60" cy="37" r="2.5" fill="#735033"/><ellipse cx="60" cy="127" rx="24" ry="31" fill="#533b27" opacity=".22"/><ellipse cx="60" cy="125" rx="22" ry="29" fill="url(#checkBowl)" stroke="#705233" stroke-width="2"/><path d="M47 109Q43 122 48 139" fill="none" stroke="#efcb94" stroke-width="1.7" opacity=".65"/></g><g id="foodCheckSauceGuide"><path d="M103 125H291M281 115L292 125L281 135" fill="none" stroke="#fff7dc" stroke-width="2" stroke-dasharray="5 5"/><ellipse cx="60" cy="125" rx="28" ry="34" fill="none" stroke="#fff7dc" stroke-width="1.5" stroke-dasharray="3 4"/></g><text x="180" y="229" text-anchor="middle" fill="#344d3c" font-size="12" font-weight="700">DRAW RIGHT · RELEASE · OBSERVE</text></g></svg><p id="foodCheckGesture" class="food-check-gesture" role="status" aria-live="polite" aria-atomic="true"></p><button id="foodCheckEquivalent" type="button">Check texture directly</button><p class="hands-note">Both methods record the same food check. The kitchen pauses while you inspect. This models observations, not physical cooking skill.</p><div id="foodCheckResult" class="food-check-result" role="status" aria-live="polite" aria-atomic="true"></div><p id="foodCheckPrevious" class="hands-note"></p>';
    var checkButton=document.createElement('button');checkButton.id='showFoodCheck';checkButton.type='button';checkButton.textContent='Check doneness';checkButton.setAttribute('aria-pressed','false');on(checkButton,'click',function(){host.selectTool('check');});$('sauceTools').append(checkButton);
    $('sauceTools').after(panel);
    var svg=$('foodCheckSvg'),sampleHost=document.createElement('div');sampleHost.id='foodCheckSampleHost';svg.before(sampleHost);sampleStudio=root.KitchenSampleStudio.mount({container:sampleHost,getState:host.getState,pause:host.pause,apply:host.apply,cancelNative:host.cancelNative});
    var waitPanel=document.createElement('div');waitPanel.id='foodCheckWait';waitPanel.hidden=true;waitPanel.innerHTML='<button id="foodCheckWait30" type="button" aria-describedby="foodCheckWaitHelp">Advance 30 seconds</button><p id="foodCheckWaitHelp" class="hands-note">Time advances for both vessels and stops at any earlier check timer. Then draw a fresh spoon trail to compare. Advancing time does not record a check.</p>';$('foodCheckPrevious').before(waitPanel);
    var replayHost=document.createElement('div');replayHost.id='foodCheckReplayHost';$('foodCheckPrevious').before(replayHost);sauceReplay=root.KitchenSauceReplay.mount({container:replayHost,reviewAllowed:function(){return host.getState().submitted===true;}});
    // The sampled spoon retains a visible coating after the track closes.
    var coating=document.createElementNS('http://www.w3.org/2000/svg','g');coating.id='foodCheckCoating';coating.innerHTML='<ellipse id="foodCheckCoatLayer" cx="60" cy="125" rx="17" ry="23"/><path id="foodCheckCoatPatches" d="M47 116Q52 103 59 111L63 122L52 128ZM60 136L72 124L76 134L66 145Z"/><path id="foodCheckDrip" d="M58 156Q51 168 59 173Q67 168 58 156Z"/><g id="foodCheckScorch" fill="#39271f"><circle cx="53" cy="115" r="4"/><circle cx="66" cy="125" r="5"/><circle cx="56" cy="139" r="3"/></g>';$('foodCheckSpoon').append(coating);
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    var oilDrops=document.createElementNS('http://www.w3.org/2000/svg','g');oilDrops.id='foodCheckOilDroplets';oilDrops.setAttribute('fill','#f1cb65');oilDrops.setAttribute('stroke','#946b24');oilDrops.innerHTML='<ellipse cx="113" cy="99" rx="12" ry="7"/><ellipse cx="243" cy="145" rx="17" ry="8"/><ellipse cx="207" cy="84" rx="8" ry="5"/><ellipse cx="125" cy="159" rx="10" ry="5"/>';$('foodCheckSauceFill').after(oilDrops);
    var oilCoat=document.createElementNS('http://www.w3.org/2000/svg','g');oilCoat.id='foodCheckOilCoat';oilCoat.setAttribute('fill','#f1cb65');oilCoat.setAttribute('stroke','#946b24');oilCoat.innerHTML='<ellipse cx="53" cy="116" rx="5" ry="4"/><ellipse cx="67" cy="133" rx="7" ry="5"/>';coating.append(oilCoat);
    // These layers describe the recorded observation independently: flow, oil and residue.
    function artLayer(id,markup,parent){var group=document.createElementNS('http://www.w3.org/2000/svg','g');group.id=id;group.innerHTML=markup;group.style.display='none';parent.append(group);return group;}
    var residuePan=artLayer('foodCheckResiduePan','<g fill="#39271f" stroke="#251e18" stroke-width="1"><path d="M91 111l7-4 9 4-2 6-10 2-5-4zM230 126l9-2 6 6-5 5-11-2zM158 166l7-3 5 5-4 4-8-1z"/><circle cx="197" cy="91" r="3"/><circle cx="139" cy="118" r="2"/><circle cx="212" cy="154" r="2.5"/></g>',$('foodCheckSauce'));$('foodCheckTrail').after(residuePan);
    var pendingPool=artLayer('foodCheckPendingPool','<path d="M199 151Q217 133 253 148Q279 158 250 175Q219 181 199 164Z" fill="#edcc9d" stroke="#fff2cf" stroke-width="1.5"/><path d="M216 153Q238 144 254 154" fill="none" stroke="#fff5d8" stroke-width="2"/>',$('foodCheckSauce'));$('foodCheckSauceFill').after(pendingPool);
    var filmShine=artLayer('foodCheckFilmShine','<path d="M48 116Q49 107 59 107M50 121L49 126M63 143Q70 141 72 134" fill="none" stroke="#ffe1b0" stroke-width="2.3" stroke-linecap="round" opacity=".72"/>',coating);
    var rivulets=artLayer('foodCheckRivulets','<g fill="none" stroke="#d28c4c" stroke-width="3" stroke-linecap="round"><path d="M48 119Q54 128 50 146M60 110Q67 127 62 151M71 121Q67 138 72 147"/></g><path d="M49 146Q46 153 49 158Q53 155 49 146Z" fill="#d28c4c"/>',coating);
    var ridges=artLayer('foodCheckBodyRidges','<path d="M49 116Q54 111 58 116M52 122Q56 118 62 124M64 135Q68 128 72 134M62 141Q67 135 72 139" fill="none" stroke="#f1bd7d" stroke-width="2.6" stroke-linecap="round"/>',coating);
    var oilHighlights=artLayer('foodCheckOilHighlights','<g fill="#fff2b5" stroke="none"><ellipse cx="50" cy="114" rx="2" ry="1.2"/><ellipse cx="64" cy="130" rx="3" ry="1.6"/></g>',oilCoat);
    var panOilHighlights=artLayer('foodCheckPanOilHighlights','<g fill="#fff2b5" stroke="none"><ellipse cx="109" cy="97" rx="5" ry="1.8"/><ellipse cx="237" cy="142" rx="7" ry="2"/><ellipse cx="204" cy="82" rx="3" ry="1.2"/><ellipse cx="121" cy="157" rx="4" ry="1.3"/></g>',oilDrops);
    var residueSpoon=artLayer('foodCheckResidueSpoon','<g fill="#39271f" stroke="#251e18" stroke-width=".7"><path d="M51 110l4-1 3 4-2 4-5-2zM66 123l5 1 2 5-4 3-5-3zM52 138l4-2 3 3-1 4-5-1z"/><circle cx="62" cy="118" r="1.5"/></g>',coating);
    var visualDescription=document.createElementNS('http://www.w3.org/2000/svg','desc');visualDescription.id='foodCheckVisualDescription';svg.append(visualDescription);svg.setAttribute('aria-describedby','foodCheckHelp foodCheckGesture foodCheckVisualDescription');
    var cueList=document.createElement('dl');cueList.id='foodCheckCues';cueList.className='food-check-cues';cueList.hidden=true;var cueValues={};[['track','Trail'],['coating','Spoon'],['separation','Oil and water'],['residue','Residue']].forEach(function(pair){var row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=pair[1];row.append(label,value);cueList.append(row);cueValues[pair[0]]=value;});$('foodCheckResult').before(cueList);
    var poolCue=document.createElement('p');poolCue.id='foodCheckPoolCue';poolCue.className='hands-note';poolCue.hidden=true;cueList.after(poolCue);
    function stopAnimation(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
    // Observation progress belongs to this recorded check, not to a UI redraw.
    // Actions retain existing log entries; separately recorded or restored checks
    // have their own identity even when their time and observation are identical.
    function sauceKey(s){for(var i=s.log.length-1;i>=0;i--){var entry=s.log[i];if(entry.accepted&&entry.inspection&&entry.inspection.kind==='sauce')return entry;}return null;}
    function syncTrail(s){var key=sauceKey(s);if(key!==trailKey){stopAnimation();trailKey=key;trailFraction=observed&&observed.closureSeconds?0:1;}if(motion.matches&&observed&&observed.closureSeconds)trailFraction=0;}
    function showTrailFraction(value){trailFraction=value;$('foodCheckTrail').setAttribute('stroke-width',String(21*trailFraction));}
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
      $('foodCheckTrail').setAttribute('d','M63 125H'+(63+progress*220));$('foodCheckTrail').setAttribute('stroke-width',String(21*(reading&&kind==='sauce'?trailFraction:1)));
      coating.style.display=reading&&kind==='sauce'?'':'none';
      oilDrops.style.display=oilCoat.style.display=reading&&kind==='sauce'&&root.KitchenSauceCheck.cues(reading).oilDroplets?'':'none';
      var layered=!!(reading&&kind==='sauce'&&reading.observationModel===2),newCues=layered?root.KitchenSauceCheck.cues(reading):null;
      var staged=layered&&reading.mixingModel===2;pendingPool.style.display=staged&&newCues.pooling===true&&Number.isFinite(newCues.poolFraction)?'':'none';if(staged&&Number.isFinite(newCues.poolFraction)){var poolScale=.35+.65*Math.sqrt(newCues.poolFraction);pendingPool.setAttribute('transform','translate(237 158) scale('+poolScale+') translate(-237 -158)');}poolCue.hidden=!staged;poolCue.textContent=staged?newCues.poolText:'';
      [residuePan,residueSpoon].forEach(function(group){group.style.display=layered&&newCues.scorched?'':'none';});
      filmShine.style.display=layered&&!newCues.patches&&!newCues.thin?'':'none';rivulets.style.display=layered&&newCues.thin?'':'none';ridges.style.display=layered&&newCues.patches?'':'none';oilHighlights.style.display=panOilHighlights.style.display=layered&&newCues.oilDroplets?'':'none';
      cueList.hidden=!layered;Object.keys(cueValues).forEach(function(key){cueValues[key].textContent=layered?newCues[key]:'';});visualDescription.textContent=layered?[newCues.track,newCues.coating,newCues.separation,newCues.residue,newCues.poolText].filter(Boolean).join(' '):'';
      if(layered){svg.dataset.bodyType=newCues.bodyType;svg.dataset.scorched=String(newCues.scorched);svg.dataset.observationModel='2';}else{delete svg.dataset.bodyType;delete svg.dataset.scorched;delete svg.dataset.observationModel;}
      if(reading&&kind==='sauce'){
        var color=view&&view.id==='tomato'?'#ae5030':'#896126',cues=root.KitchenSauceCheck.cues(reading),thin=cues.thin,patchy=cues.patches&&(layered||reading.type!=='scorched');
        if(layered){var liquidColor=view&&view.id==='tomato'?'#d77946':'#cf9958';rivulets.querySelector('g').setAttribute('stroke',liquidColor);rivulets.querySelector('path[fill]').setAttribute('fill',liquidColor);}
        coating.setAttribute('fill',color);$('foodCheckCoatLayer').style.display=patchy?'none':'';$('foodCheckCoatLayer').setAttribute('opacity',thin?'.35':'.95');$('foodCheckCoatPatches').style.display=patchy?'':'none';$('foodCheckDrip').style.display=thin?'':'none';$('foodCheckScorch').style.display=!layered&&reading.type==='scorched'?'':'none';
      }
    }
    function cancel(message){if(disposed)return;if(sampleStudio)sampleStudio.cancel();if(sauceReplay)sauceReplay.cancel();release();stopAnimation();paint(observed?1:0,observed);guide();if(message)say(message);}
    function animate(reading){
      stopAnimation();if(kind==='sauce'){trailKey=sauceKey(host.getState());trailFraction=1;}paint(1,reading);if(kind!=='sauce'||!reading.closureSeconds)return;
      if(motion.matches){showTrailFraction(0);return;}
      var started=performance.now();function tick(now){if(document.hidden||panel.hidden){stopAnimation();return;}var t=Math.min(1,(now-started)/(reading.closureSeconds*1000));showTrailFraction(1-t);if(t<1)frame=requestAnimationFrame(tick);else frame=null;}frame=requestAnimationFrame(tick);
    }
    function record(method){if(!ready())return;if(sampleStudio)sampleStudio.cancel();if(host.cancelNative)host.cancelNative();release();stopAnimation();host.pause();host.apply(kind==='pasta'?'sample':'taste',undefined,method);var checks=R.inspections(host.getState()),last=checks[checks.length-1];if(last&&last.kind===kind)animate(last);}
    function stamp(s){return JSON.stringify([s.time,s.log.length,s.plated,s.submitted,s.pan,s.pot,s.servings]);}
    function ready(){return !!view&&!disposed&&!locked&&!panel.hidden&&host.getState()===view&&(kind==='pasta'?root.KitchenSampling.available(view,false).ready:root.KitchenSauceCheck.available(view,false).ready);}
    function fresh(g){return !!g&&ready()&&g.state===host.getState()&&g.stamp===stamp(g.state);}
    function point(e){
      try{var matrix=svg.getScreenCTM();if(matrix&&svg.createSVGPoint){var p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;var q=p.matrixTransform(matrix.inverse());return {x:q.x,y:q.y};}}catch(ignore){}
      var b=svg.getBoundingClientRect();if(!(b.width>0&&b.height>0))return null;var scale=Math.min(b.width/360,b.height/240);return {x:(e.clientX-b.left-(b.width-360*scale)/2)/scale,y:(e.clientY-b.top-(b.height-240*scale)/2)/scale};
    }
    function guide(){var g=gesture;svg.dataset.checkPhase=g?(g.trace.invalid?'retry':complete(g.trace)?'release':'draw'):'idle';svg.dataset.checkProgress=String(g?g.trace.progress:0);$('foodCheckGesture').textContent=g?(g.trace.invalid?'Move cancelled. Escape or release to start again.':Math.round(g.trace.progress*100)+'% · '+(complete(g.trace)?g.id===null?'Press Enter to record this check.':'Release to record this check.':g.id===null?'Press Right to draw the spoon.':'Keep drawing steadily to the right.')):kind==='sauce'&&observed&&trailFraction>0&&trailFraction<1&&frame===null?'Observation paused partway through the recorded trail. Use the replay below to inspect its closure.':'';}
    on(motion,'change',function(){if(!motion.matches||kind!=='sauce'||!observed)return;stopAnimation();trailFraction=observed.closureSeconds?0:1;if(!gesture)paint(1,observed);guide();});
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
    on($('foodCheckWait30'),'click',function(){if(!ready()||kind!=='sauce'||(view.sauceModel!==2&&view.sauceModel!==3)||!observed)return;cancel();if(host.cancelNative)host.cancelNative();host.pause();host.apply('advance',30);});
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
      if(kind==='sauce')syncTrail(s);
      waitPanel.hidden=kind!=='sauce'||(s.sauceModel!==2&&s.sauceModel!==3)||!observed;$('foodCheckWait30').disabled=locked;
      $('foodCheckTitle').textContent=kind==='pasta'?'Check a pasta sample':'Read the sauce trail';
      $('foodCheckTag').textContent=historical?'Recorded inspection':'Inspection station';
      $('foodCheckPasta').style.display=kind==='pasta'?'':'none';$('foodCheckSauce').style.display=kind==='sauce'?'':'none';
      $('foodCheckSauceFill').setAttribute('fill',observed&&observed.type==='scorched'&&observed.observationModel!==2?'#76503a':s.id==='tomato'?'#bb6542':'#b99358');
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
