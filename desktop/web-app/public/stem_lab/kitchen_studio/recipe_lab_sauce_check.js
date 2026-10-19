/* A spoon trail reveals a recorded sauce observation; its animation never cooks food. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  function point(p){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);}
  function start(p){return point(p)&&p.x>=-.58&&p.x<=-.3&&Math.abs(p.z)<=.28?{start:p.x,x:p.x,z:p.z,last:p.x,progress:0,invalid:false}:null;}
  function move(g,p){if(!g)return null;var n=Object.assign({},g);if(!point(p)){n.invalid=true;return n;}n.invalid=g.invalid||Math.abs(p.z-g.z)>.18||Math.abs(p.z)>.5||p.x<-.62||p.x>.62||p.x<g.last-.08;n.x=Math.max(g.start,Math.min(.42,p.x));n.last=Math.max(g.last,p.x);n.progress=Math.max(0,Math.min(1,(p.x-g.start)/(.42-g.start)));return n;}
  function complete(g){return !!g&&!g.invalid&&g.progress>=1;}
  function available(s,locked){return {ready:!locked&&!s.plated&&!s.submitted&&s.time<3600&&s.log.length<1200&&s.pan.combined&&!R.serving(s).started,detail:locked||s.plated||s.submitted?'Recorded or finished kitchen. Sauce checks are read-only.':R.serving(s).started?'Return every spoonful to the pan before checking the sauce.':!s.pan.combined?'Combine the pasta and sauce before checking the final coating.':'Start at the left side of the pan. Draw steadily right, then release to inspect.'};}
  function reading(s){var checks=R.inspections(s).filter(function(c){return c.kind==='sauce';}),last=checks[checks.length-1];return last?Object.assign({},last,{stale:!s.pan.tasted,previous:checks[checks.length-2]||null}):null;}
  function cues(r){
    if(!r)return null;
    var recorded=r.chemistry||r,layered=r.observationModel===2||recorded.observationModel===2;
    var body=layered?(r.bodyType||recorded.bodyType||r.type):r.type==='unmixed'?'unmixed':recorded.bodyType||r.bodyType||r.type;
    var unresolved=body==='unmixed',thin=body==='watery'||unresolved||body==='separated',chemistry=unresolved?{}:recorded;
    var scorched=r.type==='scorched'||r.scorched===true||recorded.scorched===true;
    var result={track:chemistry.flowText||(r.closureSeconds===0?'Stays open':r.closureSeconds<1?'Closes quickly':'Closes gradually'),
      coating:chemistry.coatingText||(body==='scorched'?'Dark patches cling':body==='dry'||body==='thick'?'Thick patches cling':body==='separated'?'Oil beads interrupt the coating':thin?'Thin liquid runs off':'An even layer stays'),
      separation:!layered&&r.type==='scorched'?'':recorded.separationText||(r.type==='separated'?'Separate oil droplets collect on the surface.':''),
      seconds:r.closureSeconds,thin:thin,patches:body==='dry'||body==='thick'||body==='scorched',oilDroplets:(layered||r.type!=='scorched')&&(typeof recorded.oilDroplets==='boolean'?recorded.oilDroplets:r.type==='separated')};
    if(layered){
      if(unresolved){result.track='Pooled liquid closes the trail before it is folded through.';result.coating='Separate liquid and thicker coating are not yet combined.';}
      result.bodyType=body;result.scorched=scorched;result.residue=scorched?'Scorched residue remains; changing flow does not remove it.':'No scorched residue recorded.';
    }
    if(r.mixingModel===2){
      result.mixingModel=2;result.pooling=typeof r.needsMixing==='boolean'?r.needsMixing:null;result.poolFraction=Number.isFinite(r.pendingFraction)?Math.max(0,Math.min(1,r.pendingFraction)):null;
      result.poolText=result.pooling===null?'Added-liquid distribution was not recorded.':result.pooling?'Separate added liquid remains between thicker patches.':'No distinct added-liquid pool is visible; this alone does not establish sauce quality.';
      if(unresolved&&result.pooling){result.thin=true;result.patches=true;result.track='Separate liquid moves quickly through parts of the trail.';result.coating='Thicker patches and separate liquid remain on the spoon.';}
    }
    return result;
  }
  function mountPanel(h){
    var panel=document.createElement('section');panel.id='sceneSauceResult';panel.className='sauce-reading-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','sceneSauceTitle');
    panel.innerHTML='<p class="eyebrow">DRAW · WATCH · DECIDE</p><h3 id="sceneSauceTitle">Read the sauce trail</h3><div role="status" aria-live="polite" aria-atomic="true"><strong id="sceneSauceLabel"></strong><dl class="sauce-reading-cues"><div><dt>Track in the pan</dt><dd id="sceneSauceTrack"></dd></div><div><dt>Coating on the spoon</dt><dd id="sceneSauceCoating"></dd></div><div id="sceneSauceSeparationRow" hidden><dt>Oil and water</dt><dd id="sceneSauceSeparation"></dd></div></dl><p id="sceneSauceObservation"></p><small id="sceneSaucePrevious"></small></div><p id="sceneSaucePrompt" class="sample-reading-note"></p><button type="button" id="sceneSauceDetails">Open trail replay & keyboard check</button>';
    h.container.append(panel);var $=function(id){return panel.querySelector('#'+id);},button=$('sceneSauceDetails'),open=function(){h.open();};button.addEventListener('click',open);
    function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
    function clock(t){return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');}
    return {render:function(s,active,locked){panel.hidden=!active;var r=reading(s),c=cues(r);text('sceneSauceLabel',r?(locked?'Recorded coating check · ':'Last coating check · ')+clock(r.time)+' · '+r.label:'No coating check recorded');text('sceneSauceTrack',c?c.track:'Draw a trail to observe');text('sceneSauceCoating',c?c.coating:'Lift the spoon to observe');$('sceneSauceSeparationRow').hidden=!c||!c.separation;text('sceneSauceSeparation',c?c.separation:'');text('sceneSauceObservation',r?r.observation+(r.stale?' The dish has changed since this check. Inspect again before deciding.':''):available(s,locked).detail);text('sceneSaucePrevious',r&&r.previous?'Previous check · '+clock(r.previous.time)+' · '+r.previous.label:'');text('sceneSaucePrompt',r?'What do the track and coating suggest? Try one adjustment, fold it through, then compare a fresh check.':'What might the track and spoon show if the sauce is dry, loose, or evenly coating?');},dispose:function(){button.removeEventListener('click',open);panel.remove();}};
  }
  function decorate(h){
    var T=h.THREE,group=new T.Group(),view=null,active=false,frame=null,disposed=false,r=null,trace=null;
    h.pan.add(group);group.userData.sceneDecoration=true;group.visible=false;
    function mesh(geometry,color,x,y,z,parent){var o=h.mesh(geometry,color,x,y,z,parent||group,{roughness:.55});o.userData.sceneDecoration=true;return o;}
    var spoon=new T.Group();group.add(spoon);spoon.rotation.y=Math.PI/2;
    var grip=new T.Shape();grip.moveTo(-.025,0);grip.lineTo(-.032,.34);grip.quadraticCurveTo(-.03,.4,0,.4);grip.quadraticCurveTo(.03,.4,.032,.34);grip.lineTo(.025,0);grip.closePath();
    var gripMesh=mesh(new T.ExtrudeGeometry(grip,{depth:.014,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.004}),'#9b6b3e',0,.025,0,spoon);gripMesh.rotation.x=Math.PI/2;
    for(var grain=0;grain<3;grain++){var line=mesh(new T.BoxGeometry(.002,.001,.24),'#c29863',-.012+grain*.012,.029,.19+grain*.01,spoon);line.rotation.y=(grain-1)*.018;}
    var hole=mesh(new T.SphereGeometry(.006,10,8),'#664629',0,.03,.362,spoon);hole.scale.y=.2;
    var bowl=mesh(new T.SphereGeometry(.105,20,12),'#b68b55',0,0,-.055,spoon);bowl.scale.set(.85,.22,1.25);var rim=mesh(new T.TorusGeometry(.084,.004,6,28),'#d7aa70',0,.012,-.055,spoon);rim.rotation.x=-Math.PI/2;rim.scale.set(.95,1.4,1);
    var layer=mesh(new T.SphereGeometry(.095,20,12),'#a67b40',0,.018,-.055,spoon);layer.scale.set(.8,.11,1.23);
    var patches=[];for(var i=0;i<4;i++){var patch=mesh(new T.SphereGeometry(.027,12,8),'#9f713f',Math.cos(i*2.4)*.044,.026,-.055+Math.sin(i*2.4)*.054,spoon);patch.scale.y=.2;patches.push(patch);}
    var drip=mesh(new T.SphereGeometry(.021,12,8),'#bb9655',0,-.035,-.15,spoon);drip.scale.set(.65,1.5,.65);
    var separateLiquid=mesh(new T.SphereGeometry(.027,12,8),'#e9d5a6',-.026,.038,-.098,spoon);separateLiquid.name='recorded-unmixed-liquid';separateLiquid.scale.set(.85,.1,1.4);separateLiquid.visible=false;
    var oilDrops=[];for(var oil=0;oil<5;oil++){var onSpoon=oil<2,drop=mesh(new T.SphereGeometry(onSpoon?.017:.04,12,8),'#efc85e',onSpoon?(oil?-.035:.03):Math.cos(oil*2.4)*.3,onSpoon?.034:1.547,onSpoon?-.055+oil*.04:Math.sin(oil*2.4)*.3,onSpoon?spoon:group);drop.scale.y=.22;oilDrops.push(drop);}
    var oilHighlights=oilDrops.map(function(drop,i){var radius=i<2?.017:.04,light=mesh(new T.SphereGeometry(.007,8,6),'#fff4c3',-radius*.22,radius*.96+.001,-radius*.18,drop);light.scale.set(1,.5,.6);return light;});
    var residue=[];for(var speck=0;speck<14;speck++){var onBowl=speck<6,a=speck*2.399,rad=onBowl?.025+(speck%3)*.013:.12+(speck%4)*.1;
      var mark=mesh(new T.SphereGeometry(onBowl?.009+(speck%2)*.003:.017+(speck%3)*.004,7,5),speck%3?'#39251c':'#67402a',Math.cos(a)*rad,onBowl?.041:1.551,(onBowl?-.055:0)+Math.sin(a)*rad,onBowl?spoon:group);mark.scale.set(1.4,.16,.7);mark.rotation.y=a;residue.push(mark);}
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
      var layered=!!c&&Object.prototype.hasOwnProperty.call(c,'scorched');
      layer.visible=!!c&&!c.patches;patches.forEach(function(o,i){o.visible=!!c&&c.patches;tint(o,!layered&&observed&&observed.type==='scorched'&&i<3?'#39251c':color);});drip.visible=!!c&&c.thin;
      separateLiquid.visible=!!c&&c.mixingModel===2&&c.pooling===true&&Number.isFinite(c.poolFraction);if(separateLiquid.visible){var poolScale=.35+.65*Math.sqrt(c.poolFraction);separateLiquid.scale.set(.85*poolScale,.1,1.4*poolScale);tint(separateLiquid,view.id==='tomato'?'#e5ac7a':'#e9d5a6');}
      oilDrops.forEach(function(o){o.visible=!!c&&c.oilDroplets;o.material.roughness=layered?.15:.55;});oilHighlights.forEach(function(o){o.visible=layered;});
      residue.forEach(function(o){o.visible=layered&&c.scorched;});layer.material.roughness=layered?.24:.55;
      if(layered&&group.visible){h.canvas.dataset.sauceCheckBody=c.bodyType;h.canvas.dataset.sauceCheckResidue=c.scorched?'scorched':'none';h.canvas.dataset.sauceCheckOil=c.oilDroplets?'separated':'dispersed';}
      else {delete h.canvas.dataset.sauceCheckBody;delete h.canvas.dataset.sauceCheckResidue;delete h.canvas.dataset.sauceCheckOil;}
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
