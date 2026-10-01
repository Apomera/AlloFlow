/* A spoon trail reveals a recorded sauce observation; its animation never cooks food. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  function point(p){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);}
  function start(p){return point(p)&&p.x>=-.58&&p.x<=-.3&&Math.abs(p.z)<=.28?{start:p.x,x:p.x,z:p.z,last:p.x,progress:0,invalid:false}:null;}
  function move(g,p){if(!g)return null;var n=Object.assign({},g);if(!point(p)){n.invalid=true;return n;}n.invalid=g.invalid||Math.abs(p.z-g.z)>.18||Math.abs(p.z)>.5||p.x<-.62||p.x>.62||p.x<g.last-.08;n.x=Math.max(g.start,Math.min(.42,p.x));n.last=Math.max(g.last,p.x);n.progress=Math.max(0,Math.min(1,(p.x-g.start)/(.42-g.start)));return n;}
  function complete(g){return !!g&&!g.invalid&&g.progress>=1;}
  function available(s,locked){return {ready:!locked&&!s.plated&&s.time<3600&&s.log.length<1200&&s.pan.combined&&!R.serving(s).started,detail:locked||s.plated?'Recorded or finished kitchen. Sauce checks are read-only.':R.serving(s).started?'Return every spoonful to the pan before checking the sauce.':!s.pan.combined?'Combine the pasta and sauce before checking the final coating.':'Start at the left side of the pan. Draw steadily right, then release to inspect.'};}
  function reading(s){var checks=R.inspections(s).filter(function(c){return c.kind==='sauce';}),last=checks[checks.length-1];return last?Object.assign({},last,{stale:!s.pan.tasted,previous:checks[checks.length-2]||null}):null;}
  function cues(r){if(!r)return null;var thin=r.type==='watery'||r.type==='unmixed';return {track:r.closureSeconds===0?'Stays open':r.closureSeconds<1?'Closes quickly':'Closes gradually',coating:r.type==='scorched'?'Dark patches cling':r.type==='dry'?'Thick patches cling':thin?'Thin liquid runs off':'An even layer stays',seconds:r.closureSeconds,thin:thin,patches:r.type==='dry'||r.type==='scorched'};}
  function mountPanel(h){
    var panel=document.createElement('section');panel.id='sceneSauceResult';panel.className='sauce-reading-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','sceneSauceTitle');
    panel.innerHTML='<p class="eyebrow">DRAW · WATCH · DECIDE</p><h3 id="sceneSauceTitle">Read the sauce trail</h3><div role="status" aria-live="polite" aria-atomic="true"><strong id="sceneSauceLabel"></strong><dl class="sauce-reading-cues"><div><dt>Track in the pan</dt><dd id="sceneSauceTrack"></dd></div><div><dt>Coating on the spoon</dt><dd id="sceneSauceCoating"></dd></div></dl><p id="sceneSauceObservation"></p><small id="sceneSaucePrevious"></small></div><p id="sceneSaucePrompt" class="sample-reading-note"></p><button type="button" id="sceneSauceDetails">Open coating close-up & keyboard check</button>';
    h.container.append(panel);var $=function(id){return panel.querySelector('#'+id);},button=$('sceneSauceDetails'),open=function(){h.open();};button.addEventListener('click',open);
    function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    return {render:function(s,active,locked){panel.hidden=!active;var r=reading(s),c=cues(r);text('sceneSauceLabel',r?(locked?'Recorded coating check · ':'Last coating check · ')+clock(r.time)+' · '+r.label:'No coating check recorded');text('sceneSauceTrack',c?c.track:'Draw a trail to observe');text('sceneSauceCoating',c?c.coating:'Lift the spoon to observe');text('sceneSauceObservation',r?r.observation+(r.stale?' The dish has changed since this check. Inspect again before deciding.':''):available(s,locked).detail);text('sceneSaucePrevious',r&&r.previous?'Previous check · '+clock(r.previous.time)+' · '+r.previous.label:'');text('sceneSaucePrompt',r?'What do the track and coating suggest? Try one adjustment, fold it through, then compare a fresh check.':'What might the track and spoon show if the sauce is dry, loose, or evenly coating?');},dispose:function(){button.removeEventListener('click',open);panel.remove();}};
  }
  function decorate(h){
    var T=h.THREE,group=new T.Group(),view=null,active=false,frame=null,disposed=false,r=null,trace=null;
    h.pan.add(group);group.userData.sceneDecoration=true;group.visible=false;
    function mesh(geometry,color,x,y,z,parent){var o=h.mesh(geometry,color,x,y,z,parent||group,{roughness:.55});o.userData.sceneDecoration=true;return o;}
    var spoon=new T.Group();group.add(spoon);spoon.rotation.y=Math.PI/2;
    mesh(new T.BoxGeometry(.05,.025,.4),'#9b6b3e',0,.015,.2,spoon);
    var bowl=mesh(new T.SphereGeometry(.105,20,12),'#b68b55',0,0,-.055,spoon);bowl.scale.set(.85,.22,1.25);
    var layer=mesh(new T.SphereGeometry(.095,20,12),'#a67b40',0,.018,-.055,spoon);layer.scale.set(.8,.11,1.23);
    var patches=[];for(var i=0;i<4;i++){var patch=mesh(new T.SphereGeometry(.027,12,8),'#9f713f',Math.cos(i*2.4)*.044,.026,-.055+Math.sin(i*2.4)*.054,spoon);patch.scale.y=.2;patches.push(patch);}
    var drip=mesh(new T.SphereGeometry(.021,12,8),'#bb9655',0,-.035,-.15,spoon);drip.scale.set(.65,1.5,.65);
    var trail=mesh(new T.PlaneGeometry(1,1),'#283b2c',0,1.542,0);trail.rotation.x=-Math.PI/2;trail.material.side=T.DoubleSide;trail.material.transparent=true;trail.material.opacity=.93;trail.material.depthWrite=false;trail.renderOrder=5;
    var guide=new T.Group();group.add(guide);for(var d=0;d<7;d++){var dash=mesh(new T.PlaneGeometry(.045,.012),'#fff1c7',-.28+d*.1,1.544,0,guide);dash.rotation.x=-Math.PI/2;dash.material.side=T.DoubleSide;}
    var begin=mesh(new T.RingGeometry(.07,.078,24),'#fff1c7',-.45,1.544,0,guide);begin.rotation.x=-Math.PI/2;begin.material.side=T.DoubleSide;
    var motion=root.matchMedia('(prefers-reduced-motion: reduce)');
    function stop(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
    function tint(o,hex){o.material.color.set(hex).convertSRGBToLinear();}
    function pose(width,observed){
      h.canvas.dataset.sauceTrail=group.visible?(observed?width>.001?'open':'closed':'preview'):'idle';h.canvas.dataset.sauceTrailWidth=String(group.visible?Math.round(width*1000):0);
      if(!trace)return;var end=trace.x,length=Math.max(.001,end-trace.start);trail.position.set((trace.start+end)/2,1.542,trace.z);trail.scale.set(length,width,1);trail.visible=width>.001;
      spoon.position.set(end,observed?1.67:1.55,trace.z);spoon.rotation.z=observed?-.12:0;var c=cues(observed),color=view&&view.id==='tomato'?'#b65431':'#986b36';
      layer.visible=!!c&&!c.patches;patches.forEach(function(o,i){o.visible=!!c&&c.patches;tint(o,observed&&observed.type==='scorched'&&i<3?'#39251c':color);});drip.visible=!!c&&c.thin;
      tint(layer,color);tint(drip,color);layer.material.transparent=true;layer.material.opacity=c&&c.thin?.4:.95;
    }
    function reset(){stop();r=view?reading(view):null;var fresh=r&&!r.stale;trace=fresh?{start:-.42,x:.42,z:0}:{start:-.45,x:-.45,z:0};group.visible=active&&view&&available(view,false).ready;guide.visible=!fresh;pose(fresh&&r.closureSeconds===0?.065:0,fresh?r:null);}
    function preview(g){stop();trace=g;guide.visible=false;group.visible=active&&!g.invalid;pose(.065,null);}
    function observe(g){stop();r=reading(view);if(!r||r.stale)return;trace=Object.assign({},g);guide.visible=false;group.visible=active;pose(.065,r);if(!r.closureSeconds)return;if(motion.matches){pose(0,r);h.draw();return;}var started=performance.now();function tick(now){if(disposed||!active||document.hidden){reset();return;}var t=Math.min(1,(now-started)/(r.closureSeconds*1000));pose(.065*(1-t),r);h.draw();if(t<1)frame=requestAnimationFrame(tick);else frame=null;}frame=requestAnimationFrame(tick);}
    function motionChange(){reset();h.draw();}function visibility(){if(document.hidden)reset();}
    motion.addEventListener('change',motionChange);document.addEventListener('visibilitychange',visibility);
    return {isActive:function(){return active;},update:function(s){if(view===s)return;view=s;reset();},setActive:function(value){active=value;reset();},preview:preview,observe:observe,reset:reset,dispose:function(){disposed=true;stop();motion.removeEventListener('change',motionChange);document.removeEventListener('visibilitychange',visibility);h.pan.remove(group);}};
  }
  var api={start:start,move:move,complete:complete,available:available,reading:reading,cues:cues,mountPanel:mountPanel,decorate:decorate};root.KitchenSauceCheck=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
