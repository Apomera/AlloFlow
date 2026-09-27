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
    var R=root.KitchenRecipes,$=function(id){return document.getElementById(id);},view=null,kind='pasta',locked=true,gesture=null,frame=null,observed=null;
    var panel=document.createElement('section');panel.id='foodCheckPanel';panel.className='food-check-panel';panel.setAttribute('aria-labelledby','foodCheckTitle');
    panel.innerHTML='<div class="food-check-heading"><div><p class="eyebrow">FEEL · OBSERVE · DECIDE</p><h4 id="foodCheckTitle">Check a pasta sample</h4></div><span id="foodCheckTag">Inspection station</span></div><p id="foodCheckHelp"></p><svg id="foodCheckSvg" viewBox="0 0 360 240" role="img" aria-labelledby="foodCheckVisualTitle" aria-describedby="foodCheckHelp"><title id="foodCheckVisualTitle">Fork and pasta sample</title><rect x="2" y="2" width="356" height="236" rx="18" fill="#fbfaf2" stroke="#a5b69a"/><g id="foodCheckPasta"><ellipse cx="180" cy="154" rx="128" ry="53" fill="#eef1e7" stroke="#b6c3aa"/><g id="foodCheckNoodle"><ellipse cx="180" cy="155" rx="67" ry="31" fill="#e6c473" stroke="#886932" stroke-width="2"/><ellipse id="foodCheckCore" cx="180" cy="155" rx="42" ry="21" fill="#fff7dc" visibility="hidden"/><path d="M128 138L138 167M146 127L156 177M206 127L216 175M225 138L234 164" stroke="#bc9246" stroke-width="3"/></g><g id="foodCheckFork" fill="none" stroke="#506b59" stroke-width="7" stroke-linecap="round"><path d="M180 24V58Q180 71 158 71M152 53V83M170 55V88M188 55V88M206 53V83M158 71H201"/></g><path d="M265 72V139M255 129L265 140L275 129" fill="none" stroke="#526b48" stroke-width="3"/><text x="180" y="218" text-anchor="middle" fill="#344d3c" font-size="12">Pull the fork down through the sample</text></g><g id="foodCheckSauce" style="display:none"><ellipse cx="180" cy="125" rx="151" ry="90" fill="#405847"/><ellipse cx="180" cy="125" rx="139" ry="79" fill="#b99358" id="foodCheckSauceFill"/><path id="foodCheckTrail" d="M63 125H63" fill="none" stroke="#405847" stroke-width="21" stroke-linecap="round"/><g id="foodCheckSpoon"><path d="M60 111V36" stroke="#805c38" stroke-width="13" stroke-linecap="round"/><ellipse cx="60" cy="125" rx="22" ry="29" fill="#c4945d" stroke="#705233" stroke-width="2"/></g><path d="M113 125H293M283 115L294 125L283 135" fill="none" stroke="#fff7dc" stroke-width="2" stroke-dasharray="5 5"/><text x="180" y="229" text-anchor="middle" fill="#344d3c" font-size="12">Draw the spoon across the pan</text></g></svg><p id="foodCheckGesture" class="food-check-gesture" aria-hidden="true"></p><button id="foodCheckEquivalent" type="button">Check texture without dragging</button><p class="hands-note">Both methods record the same food check. The kitchen pauses while you inspect. This models observations, not physical cooking skill.</p><div id="foodCheckResult" class="food-check-result" role="status" aria-live="polite" aria-atomic="true"></div><p id="foodCheckPrevious" class="hands-note"></p>';
    var checkButton=document.createElement('button');checkButton.id='showFoodCheck';checkButton.type='button';checkButton.textContent='Check doneness';checkButton.setAttribute('aria-pressed','false');checkButton.addEventListener('click',function(){host.selectTool('check');});$('sauceTools').append(checkButton);
    $('sauceTools').after(panel);
    var svg=$('foodCheckSvg');
    // The sampled spoon retains a visible coating after the track closes.
    var coating=document.createElementNS('http://www.w3.org/2000/svg','g');coating.id='foodCheckCoating';coating.innerHTML='<ellipse id="foodCheckCoatLayer" cx="60" cy="125" rx="17" ry="23"/><path id="foodCheckCoatPatches" d="M47 116Q52 103 59 111L63 122L52 128ZM60 136L72 124L76 134L66 145Z"/><path id="foodCheckDrip" d="M58 156Q51 168 59 173Q67 168 58 156Z"/><g id="foodCheckScorch" fill="#39271f"><circle cx="53" cy="115" r="4"/><circle cx="66" cy="125" r="5"/><circle cx="56" cy="139" r="3"/></g>';$('foodCheckSpoon').append(coating);
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    function stopAnimation(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
    function release(){var g=gesture;gesture=null;if(g&&svg.hasPointerCapture(g.id))svg.releasePointerCapture(g.id);}
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
    function cancel(message){release();stopAnimation();paint(observed?1:0,observed);$('foodCheckGesture').textContent='';if(message)say(message);}
    function animate(reading){
      stopAnimation();paint(1,reading);if(kind!=='sauce'||!reading.closureSeconds)return;
      if(root.matchMedia('(prefers-reduced-motion: reduce)').matches){$('foodCheckTrail').setAttribute('stroke-width','0');return;}
      var started=performance.now();function tick(now){var t=Math.min(1,(now-started)/(reading.closureSeconds*1000));$('foodCheckTrail').setAttribute('stroke-width',String(21*(1-t)));if(t<1)frame=requestAnimationFrame(tick);else frame=null;}frame=requestAnimationFrame(tick);
    }
    function record(method){if(locked)return;release();stopAnimation();host.pause();host.apply(kind==='pasta'?'sample':'taste',undefined,method);var checks=R.inspections(host.getState()),last=checks[checks.length-1];if(last&&last.kind===kind)animate(last);}
    function point(e){var b=svg.getBoundingClientRect();return {x:(e.clientX-b.left)*360/b.width,y:(e.clientY-b.top)*240/b.height};}
    svg.addEventListener('pointerdown',function(e){
      if(gesture){cancel('Check cancelled. Use one pointer at a time.');return;}
      if(locked||e.button!==0||!e.isPrimary)return;var trace=start(kind,point(e));if(!trace)return;e.preventDefault();stopAnimation();host.pause();gesture={id:e.pointerId,trace:trace,state:host.getState()};svg.setPointerCapture(e.pointerId);paint(0,null);$('foodCheckGesture').textContent=kind==='pasta'?'Press steadily downward, then release.':'Draw across the pan, then release.';
    });
    svg.addEventListener('pointermove',function(e){if(!gesture||gesture.id!==e.pointerId)return;gesture.trace=move(gesture.trace,point(e));paint(gesture.trace.progress,null);$('foodCheckGesture').textContent=gesture.trace.invalid?'Move cancelled. Release and start again.':Math.round(gesture.trace.progress*100)+'% · '+(complete(gesture.trace)?'Release to inspect.':'Keep moving steadily.');});
    svg.addEventListener('pointerup',function(e){if(!gesture||gesture.id!==e.pointerId)return;var g=move(gesture.trace,point(e)),same=gesture.state===host.getState();release();if(same&&complete(g))record(kind==='pasta'?'sample-press':'sauce-trail');else cancel('No check recorded. Start on the tool and complete the full movement.');});
    ['pointercancel','lostpointercapture'].forEach(function(type){svg.addEventListener(type,function(e){if(gesture&&gesture.id===e.pointerId)cancel('Check cancelled. No observation recorded.');});});
    $('foodCheckEquivalent').addEventListener('click',function(){record('keyboard');});
    window.addEventListener('keydown',function(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel('Check cancelled. No observation recorded.');}});
    window.addEventListener('blur',function(){cancel();});window.addEventListener('pagehide',function(){cancel();});document.addEventListener('visibilitychange',function(){if(document.hidden)cancel();});
    function render(s,zone,historical,active){
      var nextKind=zone==='pot'?'pasta':'sauce',hidden=zone!=='pot'&&(!(zone==='pan'||zone==='finish')||!active);
      if(hidden){if(gesture||frame!==null)cancel();view=s;kind=nextKind;panel.hidden=true;locked=true;checkButton.setAttribute('aria-pressed',String(active));return;}
      if(view!==s||kind!==nextKind||hidden||historical)cancel();view=s;kind=nextKind;panel.hidden=hidden;checkButton.setAttribute('aria-pressed',String(active));
      locked=historical||host.ended()||(kind==='pasta'?(!s.pot.pasta||s.pot.drained):!s.pan.combined);
      var checks=R.inspections(s).filter(function(c){return c.kind===kind;});observed=checks[checks.length-1]||null;var previous=checks[checks.length-2];
      $('foodCheckTitle').textContent=kind==='pasta'?'Check a pasta sample':'Read the sauce trail';
      $('foodCheckTag').textContent=historical?'Recorded inspection':'Inspection station';
      $('foodCheckPasta').style.display=kind==='pasta'?'':'none';$('foodCheckSauce').style.display=kind==='sauce'?'':'none';
      $('foodCheckSauceFill').setAttribute('fill',observed&&observed.type==='scorched'?'#76503a':s.id==='tomato'?'#bb6542':'#b99358');
      $('foodCheckHelp').textContent=kind==='pasta'?'Start on the fork above the sample. Pull it down through the pasta, then release to reveal its center and resistance.':'Start on the spoon at the left. Draw it steadily across the pan, then release. Watch how the track closes and how the sauce coats the spoon.';
      $('foodCheckEquivalent').textContent=kind==='pasta'?'Check texture without dragging':'Check coating without dragging';$('foodCheckEquivalent').disabled=locked;svg.setAttribute('aria-disabled',String(locked));
      var stale=observed&&(kind==='pasta'?!!s.pot.sample&&(Math.abs(s.pot.progress-s.pot.sample.progress)>.000001||(s.pastaModel===1&&observed.clumped!==R.pastaSurface(s).clumped)):!s.pan.tasted);
      var result=observed?clock(observed.time)+' · '+observed.label+'. '+observed.observation+(stale?' The food has changed since this check. Inspect again before deciding.':''):kind==='pasta'?'No sample checked yet. Texture will be revealed after the check.':'No sauce trail checked yet. Observe the coating before deciding on another adjustment.';
      if(historical)result+=' Recorded view; checking is locked.';else if(host.ended())result+=' Cook finished; start a fresh cook to inspect again.';else if(locked)result+=' '+(kind==='pasta'?'Add pasta to boiling water first; sample before draining.':'Combine the pasta and sauce before this final check.');
      say(result);$('foodCheckPrevious').textContent=previous?'Previous check at '+clock(previous.time)+': '+previous.label+'.':'';
      $('foodCheckVisualTitle').textContent=(kind==='pasta'?'Fork pressing a pasta sample. ':'Spoon drawn through sauce. ')+(observed?observed.observation:'Complete the gesture or use the equivalent check button to record an observation.');
      paint(observed?1:0,observed);$('foodCheckGesture').textContent='';
    }
    return {render:render,cancel:cancel};
  }
  var api={start:start,move:move,complete:complete,mount:mount};root.KitchenRecipeInspection=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
