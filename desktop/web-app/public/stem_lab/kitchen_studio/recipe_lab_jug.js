/* Carry first, then deliberately tilt. The shared engine records each completed dose. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes||(typeof require==='function'?require('./recipe_lab_engine.js'):null);
  function finite(p){return !!p&&[p.x,p.z,p.u,p.v].every(Number.isFinite);}
  function start(p){return finite(p)?{phase:'carry',position:{x:p.x,z:p.z},anchor:null,closest:Infinity,settling:false,tilt:0,invalid:false}:null;}
  function move(g,p,pan){
    if(!g)return null;var n=Object.assign({},g);if(!finite(p)||!pan||![pan.x,pan.z].every(Number.isFinite)){n.invalid=true;n.tilt=0;return n;}if(g.invalid)return n;
    var distance=Math.hypot(p.x-pan.x,p.z-pan.z);
    if(g.phase==='carry'){n.position={x:p.x,z:p.z};n.tilt=0;n.offAxis=false;if(distance<.6){n.phase='level';n.position={x:pan.x,z:pan.z};n.anchor={u:p.u,v:p.v};n.closest=distance;n.settling=true;}return n;}
    var travel=p.v-g.anchor.v,sideways=Math.abs(p.u-g.anchor.u);
    if(sideways>75||travel<-50){n.phase='carry';n.position={x:p.x,z:p.z};n.anchor=null;n.closest=Infinity;n.settling=false;n.tilt=0;n.offAxis=false;return n;}
    if(g.settling){if(distance<g.closest-.003||travel<0&&distance<.6){n.anchor={u:p.u,v:p.v};n.closest=distance;return n;}if(travel<4)return n;n.settling=false;}
    n.offAxis=sideways>40;n.tilt=n.offAxis?0:Math.max(0,Math.min(70,travel*.75));n.phase=n.tilt>=20?'pour':'level';return n;
  }
  function available(s,locked){return {ready:!locked&&!s.plated&&s.time<3600&&s.log.length<1200&&s.pan.produce&&s.pot.reserve>=10&&!R.serving(s).started,detail:locked||s.plated?'Recorded or finished kitchen. Pouring is read-only.':R.serving(s).started?'Return every spoonful to the pan before adjusting the sauce.':!s.pan.produce?'Add prepared produce before pouring into the pan.':s.pot.reserve<10?'Save cooking water before draining, or use what is already in the pan.':'Carry the jug over the pan. Pull down to tilt; lift back to level and stop.'};}
  function mountPanel(h){
    var panel=document.createElement('section');panel.id='sceneJugResult';panel.className='jug-reading-panel';panel.hidden=true;panel.setAttribute('aria-labelledby','sceneJugTitle');panel.innerHTML='<p class="eyebrow">CARRY · TILT · LEVEL</p><h3 id="sceneJugTitle">A splash you control</h3><dl class="jug-reading-cues"><div><dt id="sceneJugCarryLabel">Last carry</dt><dd id="sceneJugCarried">0 mL</dd></div><div><dt>Left in the jug</dt><dd id="sceneJugRemaining"></dd></div><div><dt>Waiting for a fold</dt><dd id="sceneJugUnmixed"></dd></div></dl><p id="sceneJugInstruction"></p><p class="hands-note">Tilting controls the flow. Level the jug, move it away, or release to stop. Water already added stays in the pan.</p><div class="jug-next-actions"><button id="sceneJugFold" type="button">Fold the splash through</button><button id="sceneJugCheck" type="button">Check the coating</button><button id="sceneJugKeyboard" type="button">Open measured keyboard pours</button></div>';
    h.container.append(panel);var $=function(id){return panel.querySelector('#'+id);},listeners=[];
    function on(id,tool){var fn=function(){h.choose(tool);};$(id).addEventListener('click',fn);listeners.push(function(){$(id).removeEventListener('click',fn);});}on('sceneJugFold','stir');on('sceneJugCheck','sauce-check');on('sceneJugKeyboard','keyboard');
    function text(id,value){if($(id).textContent!==value)$(id).textContent=value;}
    return {render:function(s,active,locked,g,receipt){panel.hidden=!active;var mix=R.mixing(s);text('sceneJugCarryLabel',g?'This carry':'Last carry');text('sceneJugCarried',(g?g.poured:receipt||0)+' mL');text('sceneJugRemaining',s.pot.reserve+' mL');text('sceneJugUnmixed',Math.round(mix.liquidSinceMix*10)/10+' mL');text('sceneJugInstruction',g?g.trace.invalid?'Release to put the jug down. This movement is interrupted.':g.trace.offAxis?'Flow stopped · move back to the tilt path, then level.':g.trace.phase==='carry'?'Carry the level jug over the sauce pan.':g.trace.phase==='pour'?'Flowing · lift back toward the level position to stop.':'Jug positioned · pull straight down to begin a controlled pour.':available(s,locked).ready?mix.liquidSinceMix?'Fold the separate liquid through, then check a fresh coating before deciding on another splash.':'Choose a small splash. Watch the amount, level the jug, then observe the sauce.':available(s,locked).detail);$('sceneJugFold').disabled=locked||!s.pan.produce||R.serving(s).started;$('sceneJugCheck').disabled=locked||!s.pan.combined||R.serving(s).started;},dispose:function(){listeners.forEach(function(fn){fn();});panel.remove();}};
  }
  function decorate(h){
    var T=h.THREE,canvas=document.createElement('canvas');canvas.width=128;canvas.height=512;var c=canvas.getContext('2d'),texture=new T.CanvasTexture(canvas);texture.encoding=T.sRGBEncoding;
    var label=h.mesh(new T.PlaneGeometry(.12,.37),'#ffffff',.065,0,.224,h.jug,{map:texture,transparent:true,depthWrite:false,roughness:1});label.userData.sceneDecoration=true;
    var rim=h.mesh(new T.TorusGeometry(.218,.007,8,48),'#dce7df',0,.215,0,h.jug,{transparent:true,opacity:.65,roughness:.2});rim.rotation.x=Math.PI/2;rim.castShadow=false;rim.userData.sceneDecoration=true;
    var lip=new T.Shape();lip.moveTo(0,-.035);lip.lineTo(.09,0);lip.lineTo(0,.035);lip.closePath();var spout=h.mesh(new T.ExtrudeGeometry(lip,{depth:.009,bevelEnabled:true,bevelThickness:.002,bevelSize:.004,bevelSegments:1}),'#c5d6ce',.18,.22,0,h.jug,{transparent:true,opacity:.7,roughness:.2});spout.rotation.x=Math.PI/2;spout.castShadow=false;spout.userData.sceneDecoration=true;
    var last=null;return {update:function(s){var capacity=200*s.servings/2;if(last===capacity)return;last=capacity;c.clearRect(0,0,128,512);c.fillStyle='#284d43';c.textAlign='center';c.font='bold 43px sans-serif';c.fillText('mL',67,43);for(var i=1;i<=4;i++)c.fillText(String(capacity*i/4),67,439-(i-1)*117);texture.needsUpdate=true;}};
  }
  var api={start:start,move:move,available:available,mountPanel:mountPanel,decorate:decorate};root.KitchenJugPour=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
