/* Compare recorded spoon trails. This timeline is a replay of an observation, not kitchen time. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  var S=root.KitchenSauceCheck||(typeof require==='function'?require('./recipe_lab_sauce_check.js'):null);
  function mount(h){
    var doc=h.container.ownerDocument,win=doc.defaultView||root,section=doc.createElement('section');
    section.className='sauce-replay';section.hidden=true;section.setAttribute('aria-labelledby','sauceReplayTitle');
    section.innerHTML='<div class="sauce-replay-heading"><p class="sauce-replay-eyebrow">OBSERVE · REPLAY · COMPARE</p><h4 id="sauceReplayTitle">Watch your recorded sauce checks</h4><p>Move one timeline to compare how each trail closes and what stays on the spoon.</p></div><div class="sauce-replay-controls"><label for="sauceReplayTime">Time after drawing the trail <output id="sauceReplayElapsed" for="sauceReplayTime">0.00 s</output></label><input id="sauceReplayTime" type="range" min="0" max="3" step="0.05" value="0" aria-describedby="sauceReplayHelp"><div class="sauce-replay-time-labels" aria-hidden="true"><span>Just drawn</span><span>3 seconds later</span></div><div class="sauce-replay-buttons"><button id="sauceReplayPlay" type="button" aria-pressed="false">Replay both checks</button><button id="sauceReplayReset" type="button">Back to the start</button></div><p id="sauceReplayHelp" class="sauce-replay-help">Drag the timeline, or use arrow keys, Home and End. Replaying an observation leaves the kitchen clock unchanged.</p><p id="sauceReplayStatus" class="sauce-replay-status" role="status" aria-live="polite" aria-atomic="true"></p></div><div class="sauce-replay-cards"><article id="sauceReplayPrevious" class="sauce-replay-card"></article><article id="sauceReplayCurrent" class="sauce-replay-card"></article></div><p class="sauce-replay-learning">Compare both checks at the same moment. A trail that closes quickly and a layer that runs off suggest a looser sauce; an open track with clinging patches suggests a drier sauce.</p>';
    h.container.append(section);
    var $=function(id){return section.querySelector('#'+id);},range=$('sauceReplayTime'),play=$('sauceReplayPlay'),reset=$('sauceReplayReset'),output=$('sauceReplayElapsed'),status=$('sauceReplayStatus'),current=$('sauceReplayCurrent'),previous=$('sauceReplayPrevious');
    var media=win.matchMedia?win.matchMedia('(prefers-reduced-motion: reduce)'):{matches:false},view=null,stamp='',recordStamp='',active=false,disposed=false,elapsed=0,playing=false,frame=null,lastTick=null,hasRecords=false,listeners=[];
    function listen(node,event,fn){node.addEventListener(event,fn);listeners.push([node,event,fn]);}
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    function say(value){if(status.textContent!==value)status.textContent=value;}
    function clamp(t){return Math.max(0,Math.min(3,Number.isFinite(t)?t:0));}
    function controls(){
      range.value=elapsed.toFixed(2);output.textContent=elapsed.toFixed(2)+' s';range.setAttribute('aria-valuetext',elapsed.toFixed(2)+' seconds after the trail was drawn');
      section.dataset.elapsed=elapsed.toFixed(2);section.dataset.playing=String(playing);section.dataset.reducedMotion=String(!!media.matches);
      range.disabled=!hasRecords;reset.disabled=!hasRecords;play.disabled=!hasRecords||!!media.matches;play.textContent=playing?'Pause replay':'Replay both checks';play.setAttribute('aria-pressed',String(playing));
    }
    function stop(message){if(frame!==null)win.cancelAnimationFrame(frame);frame=null;lastTick=null;playing=false;controls();if(message)say(message);}
    function panArt(id,r,c,recipeId){
      var patches=c.patches,thin=c.thin,scorched=r.type==='scorched',tomato=recipeId==='tomato',light=tomato?'#e28b55':'#d79e61',dark=tomato?'#b45231':'#ad6739',coating=tomato?'#d77946':'#cf9958',patch=tomato?'#b95c36':'#b47a40';
      return '<svg class="sauce-replay-art" viewBox="0 0 340 245" role="img" aria-labelledby="'+id+'ArtTitle '+id+'ArtDesc"><title id="'+id+'ArtTitle"></title><desc id="'+id+'ArtDesc"></desc><defs><linearGradient id="'+id+'Metal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e5e9e3"/><stop offset=".3" stop-color="#98aaa0"/><stop offset=".55" stop-color="#e5e8df"/><stop offset="1" stop-color="#758c80"/></linearGradient><linearGradient id="'+id+'Sauce" x1="0" y1="0" x2="0" y2="1"><stop stop-color="'+light+'"/><stop offset="1" stop-color="'+dark+'"/></linearGradient><linearGradient id="'+id+'Wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#cfa674"/><stop offset=".45" stop-color="#aa7747"/><stop offset="1" stop-color="#8a5b32"/></linearGradient></defs><g aria-hidden="true"><ellipse cx="168" cy="137" rx="140" ry="13" fill="#7a6140" opacity=".12"/><path d="M31 83 Q30 137 158 141 Q286 138 289 82" fill="url(#'+id+'Metal)" stroke="#536e60" stroke-width="2"/><path d="M285 82 L322 74 Q332 72 333 83 Q333 89 324 90 L286 94" fill="#658073" stroke="#385d47" stroke-width="2"/><path d="M300 79 L323 77" stroke="#c8d4c6" stroke-width="2" stroke-linecap="round"/><ellipse cx="158" cy="82" rx="132" ry="49" fill="url(#'+id+'Metal)" stroke="#607568" stroke-width="2"/><ellipse cx="158" cy="82" rx="121" ry="38" fill="url(#'+id+'Sauce)" stroke="#755035" stroke-width="1.5"/><path d="M57 65 Q147 30 249 62" fill="none" stroke="#f2ca8e" stroke-width="3" opacity=".7"/><g fill="#f2c58b" opacity=".85"><ellipse cx="72" cy="69" rx="8" ry="3"/><ellipse cx="219" cy="96" rx="10" ry="3"/><ellipse cx="242" cy="73" rx="7" ry="2.5"/><ellipse cx="92" cy="109" rx="7" ry="2"/></g><g fill="#58664a"><path d="M91 62l7-2-3 5z"/><path d="M220 65l5 2-6 2z"/><path d="M204 109l5-1-2 4z"/></g><rect class="sauce-replay-trail" x="49" y="72" width="218" height="20" rx="10" fill="#354c3d" stroke="#223c2c" stroke-width="1"/><ellipse cx="163" cy="205" rx="126" ry="9" fill="#745735" opacity=".1"/><path d="M86 177 L291 159 Q301 160 300 168 Q300 172 289 174 L88 193Z" fill="url(#'+id+'Wood)" stroke="#895b36" stroke-width="1.5"/><path d="M106 182 L286 166 M136 183 L257 173" fill="none" stroke="#e0b580" stroke-width="1.2" opacity=".65"/><ellipse cx="73" cy="187" rx="31" ry="37" transform="rotate(-16 73 187)" fill="url(#'+id+'Wood)" stroke="#93683e" stroke-width="1.7"/><ellipse cx="72" cy="184" rx="24" ry="29" transform="rotate(-16 72 184)" fill="#8e5f37"/><path d="M48 169 Q46 193 62 209" fill="none" stroke="#e7bd83" stroke-width="2" opacity=".75"/>'+
        (patches?'<g class="sauce-replay-coating-patches" fill="'+(scorched?'#51392a':patch)+'"><path d="M56 170q12-8 20 1l-2 10-15 2z"/><path d="M61 190q14-9 23 0l-1 14-18 2z"/><path d="M79 178l9-3 7 12-10 5z"/></g>':'<ellipse class="sauce-replay-coating-layer" cx="72" cy="184" rx="22" ry="27" transform="rotate(-16 72 184)" fill="'+coating+'" opacity="'+(thin?'.42':'.96')+'"/><path d="M56 170 Q62 163 73 167" fill="none" stroke="#f4d394" stroke-width="2" opacity="'+(thin?'.25':'.8')+'"/>')+
        (thin?'<path class="sauce-replay-drip" d="M73 208q-5 9-2 14q4 6 8 0q2-4-6-14z" fill="'+coating+'"/>':'')+
        (scorched?'<g fill="#2f281f"><circle cx="63" cy="172" r="3"/><circle cx="75" cy="198" r="4"/><circle cx="86" cy="182" r="2"/><circle cx="83" cy="89" r="2"/><circle cx="227" cy="65" r="3"/></g>':'')+'</g></svg>';
    }
    function card(node,id,r,isLatest,stale,historical,recipeId){
      node.replaceChildren();
      var heading=doc.createElement('h5');heading.textContent=isLatest?'Latest recorded check':'Previous recorded check';node.append(heading);
      if(!r){delete node.dataset.closureSeconds;delete node.dataset.type;delete node.dataset.time;var empty=doc.createElement('p');empty.className='sauce-replay-empty';empty.textContent=isLatest?'Draw and release a sauce trail to record your first check.':'Record a second check to compare an adjustment.';node.append(empty);return;}
      node.dataset.closureSeconds=String(r.closureSeconds);node.dataset.type=r.type;node.dataset.time=String(r.time);
      var c=S.cues(r),when=doc.createElement('p');when.className='sauce-replay-when';when.textContent=clock(r.time)+' · '+r.label;node.append(when);
      var art=doc.createElement('div');art.innerHTML=panArt(id,r,c,recipeId);node.append(art.firstElementChild);
      node.querySelector('title').textContent=r.label+' at '+clock(r.time);node.querySelector('desc').textContent=c.track+'. '+c.coating+'. Shared scale with the other recorded check.';
      var details=doc.createElement('dl');details.className='sauce-replay-cues';[['Trail',c.track+(r.closureSeconds>0?' · '+r.closureSeconds.toFixed(2)+' s':'')],['Spoon',c.coating]].forEach(function(pair){var row=doc.createElement('div'),dt=doc.createElement('dt'),dd=doc.createElement('dd');dt.textContent=pair[0];dd.textContent=pair[1];row.append(dt,dd);details.append(row);});node.append(details);
      var description=doc.createElement('p');description.className='sauce-replay-observation';description.textContent=r.observation;node.append(description);
      if(stale&&isLatest){var note=doc.createElement('p');note.className='sauce-replay-stale';note.textContent='Earlier observation. The dish has changed since this check.';node.append(note);}
      if(historical){var recorded=doc.createElement('p');recorded.className='sauce-replay-recorded';recorded.textContent='Recorded kitchen · observation replay';node.append(recorded);}
    }
    function paint(){
      [previous,current].forEach(function(node){var art=node.querySelector('svg');if(!art)return;var closure=Number(node.dataset.closureSeconds),fraction=closure===0?1:Math.max(0,1-elapsed/closure),width=20*fraction,trail=art.querySelector('.sauce-replay-trail');trail.setAttribute('y',String(82-width/2));trail.setAttribute('height',String(width));trail.setAttribute('rx',String(Math.min(10,width/2)));trail.setAttribute('visibility',width>.001?'visible':'hidden');art.dataset.elapsed=elapsed.toFixed(2);art.dataset.trailFraction=String(fraction);art.dataset.trailWidth=String(width);});
      controls();
    }
    function tick(now){
      frame=null;
      if(disposed||!active||doc.hidden||media.matches){stop();return;}
      if(lastTick!==null){var delta=(now-lastTick)/1000;if(!Number.isFinite(delta)||delta<0||delta>.5){stop('Replay paused. Continue when you are ready.');return;}elapsed=clamp(elapsed+delta);}
      lastTick=now;paint();
      if(elapsed>=3){stop('Replay complete. Drag the timeline to inspect any moment.');return;}
      frame=win.requestAnimationFrame(tick);
    }
    function start(){
      if(disposed||!active||!hasRecords||doc.hidden||media.matches)return;
      if(playing){stop('Replay paused.');return;}
      if(elapsed>=3)elapsed=0;playing=true;lastTick=null;paint();say('Replaying the recorded checks together.');frame=win.requestAnimationFrame(tick);
    }
    function scrub(){if(disposed||!active||!hasRecords)return;var value=Number(range.value);stop();elapsed=clamp(value);paint();say('Timeline paused at '+elapsed.toFixed(2)+' seconds after the draw.');}
    listen(play,'click',start);listen(reset,'click',function(){if(disposed||!active||!hasRecords)return;stop();elapsed=0;paint();say('Both recorded checks returned to the start.');});listen(range,'input',scrub);listen(range,'pointerdown',function(){stop();});listen(range,'keydown',function(e){if(e.key==='Escape')stop('Replay paused.');else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'].indexOf(e.key)>=0)stop();});
    listen(section,'keydown',function(e){if(e.key==='Escape')stop('Replay paused.');});listen(win,'blur',function(){stop();});listen(win,'pagehide',function(){stop();});listen(doc,'visibilitychange',function(){if(doc.hidden)stop();});
    function motionChange(){stop();say(media.matches?'Reduced motion is on. Drag the timeline to inspect each recorded check.':'Drag the timeline or replay both recorded checks.');}
    if(media.addEventListener)media.addEventListener('change',motionChange);else if(media.addListener)media.addListener(motionChange);
    function render(s,historical,on){
      if(disposed)return;var checks=R.inspections(s).filter(function(r){return r.kind==='sauce';}),latest=checks[checks.length-1]||null,prior=checks[checks.length-2]||null,reading=S.reading(s),nextRecord=JSON.stringify([prior,latest]),nextStamp=JSON.stringify([s.time,s.log.length,s.submitted,s.plated,reading&&reading.stale,!!historical]);
      if(view!==s||stamp!==nextStamp||active!==!!on)stop();
      var changed=nextRecord!==recordStamp;if(changed)elapsed=0;
      view=s;stamp=nextStamp;recordStamp=nextRecord;active=!!on;hasRecords=!!latest;section.hidden=!active;
      card(previous,'sauceReplayPrevious',prior,false,false,!!historical,s.id);card(current,'sauceReplayCurrent',latest,true,!!(reading&&reading.stale),!!historical,s.id);paint();
      if(!latest)say('No sauce check recorded yet. Record a trail, then explore its replay.');else if(changed)say(media.matches?'New recorded check. Drag the timeline to compare both observations.':'New recorded check. Replay or drag the timeline to compare both observations.');
    }
    function cancel(){if(!disposed)stop();}
    function dispose(){if(disposed)return;stop();disposed=true;listeners.forEach(function(l){l[0].removeEventListener(l[1],l[2]);});listeners=[];if(media.removeEventListener)media.removeEventListener('change',motionChange);else if(media.removeListener)media.removeListener(motionChange);section.remove();}
    controls();return {render:render,cancel:cancel,dispose:dispose};
  }
  var api={mount:mount};root.KitchenSauceReplay=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
