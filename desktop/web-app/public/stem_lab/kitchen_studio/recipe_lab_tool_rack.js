/* Picking up a utensil changes presentation only. Cooking remains in the existing gestures. */
(function(root){
  'use strict';
  var tools=[
    {id:'spoon',name:'Wooden spoon',short:'SPOON',x:.42,sites:{pan:'stir',pot:'pot-stir'},why:'The broad bowl gathers sauce and folds pasta. In the pot, sweep it through clumps to separate strands.'},
    {id:'spatula',name:'Slotted spatula',short:'SPATULA',x:.98,sites:{pan:'turn'},why:'Slide the thin head underneath a slice, then lift, turn and lower. Both faces keep their cooking history.'},
    {id:'fork',name:'Sampling fork',short:'FORK',x:1.54,sites:{pot:'sample'},why:'Carry a small sample to the saucer, then press and lift to examine its core before deciding when to drain.'},
    {id:'masher',name:'Tomato masher',short:'MASHER',x:2.1,sites:{pan:'crush'},why:'Press and lift to feel resistance. Softened tomatoes yield; each piece holds a finite amount of juice.'}
  ];
  function definition(id){return tools.find(function(t){return t.id===id;})||null;}
  function canPick(s,locked){return !!s&&!locked&&!s.plated&&s.time<3600&&s.log.length<1200&&!root.KitchenRecipes.serving(s).started;}
  function site(s,p){if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.z))return null;var at=root.KitchenRecipes.panPosition(s),scale=s.pan.size==='wide'?1.08:1;if(Math.hypot(p.x-at.x,p.z-at.z)<.67*scale)return 'pan';if(Math.hypot(p.x+1.1,p.z+.45)<.62)return 'pot';return null;}
  function status(s,id,destination,locked){
    var t=definition(id),mode=t&&t.sites[destination],detail=t?t.why:'Choose a utensil from the rack.',ready=canPick(s,locked)&&!!mode;
    if(!canPick(s,locked))detail=root.KitchenRecipes.serving(s).started?'Return every spoonful to the pan before using cooking utensils.':'Recorded or finished kitchen. You can explore the rack, but its tools are locked.';
    else if(t&&!mode)detail='Carry the '+t.name.toLowerCase()+' to '+(Object.keys(t.sites).length===2?'the pan or pot.':t.sites.pan?'the sauce pan.':'the pasta pot.');
    else if(mode==='stir'&&!s.pan.produce){ready=false;detail='Add prepared produce to the pan before gathering and folding it.';}
    else if(mode==='pot-stir'&&(s.pastaModel!==1||!s.pot.pasta||s.pot.drained||!s.pot.water)){ready=false;detail='Add pasta to boiling water in a fresh cook before separating its strands.';}
    else if(mode==='sample'&&(!s.pot.pasta||s.pot.drained)){ready=false;detail=s.pot.drained?'The pasta is drained. Check a sample before draining in your next cook.':'Add pasta to boiling water before carrying a fork sample.';}
    else if(mode==='turn'&&(s.panModel!==2||!s.pan.produce||!root.KitchenRecipes.panSurface(s).pieces.length)){ready=false;detail='Add prepared produce in a fresh cook before turning individual slices.';}
    else if(mode==='crush'&&(s.id!=='tomato'||s.tomatoModel!==1||!s.pan.produce)){ready=false;detail='Use a fresh tomato recipe and add prepared tomatoes to the pan.';}
    else if(mode==='crush'&&!root.KitchenRecipes.tomatoHandling(s).pieces.some(function(p){return p.stage<2;})){ready=false;detail='Every tomato piece has released its juice. Use the spoon to fold it through the sauce.';}
    return {ready:ready,mode:mode||null,name:t?t.name:'Utensil',site:destination,detail:detail};
  }
  function drop(s,id,p,moved,locked){var result=status(s,id,site(s,p),locked);return moved&&result.ready?result:null;}
  function selected(mode){for(var i=0;i<tools.length;i++){var sites=Object.keys(tools[i].sites);for(var j=0;j<sites.length;j++)if(tools[i].sites[sites[j]]===mode)return {id:tools[i].id,site:sites[j]};}return null;}
  function guidance(s,g,locked){var t=definition(g.utensil),at=site(s,g.current),a=status(s,g.utensil,at,locked),target=at?at==='pan'?{pan:true}:{pot:true}:t&&t.sites.pan?{pan:true}:{pot:true};return {tool:'rack',title:t?t.name:'Pick up a utensil',phase:a.ready?'release':at?'prerequisite':'carry',instruction:a.ready?'Release to ready the '+a.name.toLowerCase()+'.':a.detail,detail:a.ready?(at==='pan'?'Pan':'Pot')+' tool ready. '+t.why:t?t.why:'',target:target,over:a.ready,invalid:false,progress:null};}
  function mountPanel(h){
    var panel=document.createElement('section');panel.className='utensil-rack-panel';panel.setAttribute('aria-labelledby','sceneRackTitle');
    panel.innerHTML='<div class="rack-launch"><div><h3 id="sceneRackTitle">Pick up a utensil</h3><p>Carry a tool from its hook to the pot or pan.</p></div><button type="button" id="sceneShowRack">Utensil rack</button></div><p id="sceneRackStatus" role="status" aria-live="polite" aria-atomic="true">Tools on their hooks</p><details><summary>Choose without dragging</summary><div class="rack-tool-list">'+tools.map(function(t){return '<div class="rack-tool-card" data-rack-card="'+t.id+'"><strong>'+t.name+'</strong><p>'+t.why+'</p><div>'+Object.keys(t.sites).map(function(s){return '<button type="button" data-rack-id="'+t.id+'" data-rack-site="'+s+'" aria-label="Ready '+t.name.toLowerCase()+' at '+s+'">Ready at '+s+'</button>';}).join('')+'</div><small></small></div>';}).join('')+'</div></details>';
    h.container.querySelector('.kitchen-tool-options').before(panel);var listeners=[];
    function on(e,fn){e.addEventListener('click',fn);listeners.push(function(){e.removeEventListener('click',fn);});}
    on(panel.querySelector('#sceneShowRack'),function(){h.show();});panel.querySelectorAll('[data-rack-id]').forEach(function(b){on(b,function(){h.choose(b.dataset.rackId,b.dataset.rackSite);});});
    return {render:function(s,mode,locked){var active=selected(mode),a=active&&status(s,active.id,active.site,locked),message=a&&a.ready?a.name+' ready at the '+a.site+'. Start on food to use it, or carry it to another station.':canPick(s,locked)?'Tools on their hooks · choosing a tool keeps the clock paused.':'View only · cooking utensils are locked.';var reading=panel.querySelector('#sceneRackStatus');if(reading.textContent!==message)reading.textContent=message;panel.querySelectorAll('[data-rack-card]').forEach(function(card){var id=card.dataset.rackCard,notes=[];card.querySelectorAll('button').forEach(function(b){var a=status(s,id,b.dataset.rackSite,locked);b.disabled=!a.ready;b.setAttribute('aria-pressed',String(a.ready&&mode===a.mode));if(!a.ready&&notes.indexOf(a.detail)===-1)notes.push(a.detail);});var text=notes.join(' ');if(card.querySelector('small').textContent!==text)card.querySelector('small').textContent=text;});},dispose:function(){listeners.forEach(function(fn){fn();});panel.remove();}};
  }
  function decorate(h){
    var T=h.THREE,rack=new T.Group(),groups={},proxies={},labels=[],mode=null,state=null,locked=false,working=false,held=null,textures=[];h.world.add(rack);
    function mesh(g,c,x,y,z,parent,extra){var m=h.mesh(g,c,x,y,z,parent||rack,extra);m.userData.sceneDecoration=true;return m;}
    function box(w,ht,d,c,x,y,z,parent,extra){return mesh(new T.BoxGeometry(w,ht,d),c,x,y,z,parent,extra);}
    function tube(r,ht,c,x,y,z,parent,extra){return mesh(new T.CylinderGeometry(r,r,ht,16),c,x,y,z,parent,extra);}
    var wood=document.createElement('canvas');wood.width=128;wood.height=256;var ctx=wood.getContext('2d');ctx.fillStyle='#b38956';ctx.fillRect(0,0,128,256);for(var i=0;i<28;i++){ctx.strokeStyle=i%3?'#66441b33':'#f6dca266';ctx.beginPath();for(var y=0;y<=256;y+=8){var x=i*5+Math.sin(y/37+i)*2;if(y)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.stroke();}var woodMap=new T.CanvasTexture(wood);woodMap.encoding=T.sRGBEncoding;textures.push(woodMap);
    function grain(m){m.material.map=woodMap;m.material.color.setHex(0xffffff);m.material.needsUpdate=true;}
    function tag(text,x,y,w,ht){var c=document.createElement('canvas');c.width=512;c.height=96;var cx=c.getContext('2d');cx.fillStyle='#fff9e7';cx.fillRect(0,0,512,96);cx.fillStyle='#294e3d';cx.font='bold 48px sans-serif';var fontSize=48;while(cx.measureText(text).width>480&&fontSize>18){fontSize-=2;cx.font='bold '+fontSize+'px sans-serif';}cx.textAlign='center';cx.fillText(text,256,67);var map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;textures.push(map);var material=new T.SpriteMaterial({map:map,toneMapped:false}),sprite=new T.Sprite(material);sprite.position.set(x,y,-1.73);sprite.scale.set(w,ht,1);rack.add(sprite);labels.push(sprite);return sprite;}
    grain(box(2.3,.17,.095,'#b38956',1.26,2.73,-1.865));tag('CHOOSE · CARRY · COOK',1.26,2.96,1.85,.16);
    tools.forEach(function(t){
      var g=new T.Group();rack.add(g);groups[t.id]=g;g.userData.kitchenRackTool=t.id;
      var peg=tube(.023,.16,'#a9925a',t.x,2.70,-1.76);peg.rotation.x=Math.PI/2;
      var socket=mesh(new T.TorusGeometry(.044,.012,8,24),'#50634f',0,.65,0,g,{metalness:.5,roughness:.3});
      if(t.id==='spoon'){grain(tube(.028,.43,'#b38956',0,.35,0,g));var bowl=mesh(new T.SphereGeometry(.125,24,16),'#b38956',0,.035,0,g);bowl.scale.set(.8,1.3,.22);grain(bowl);var hollow=mesh(new T.SphereGeometry(.09,24,12),'#805b32',0,.035,.023,g);hollow.scale.set(.8,1.27,.12);}
      else{
        tube(.018,.38,'#bac9bf',0,.28,0,g,{metalness:.7,roughness:.25});var grip=tube(t.id==='masher'?.045:.036,.24,t.id==='masher'?'#b38956':'#365948',0,.54,0,g);if(t.id==='masher')grain(grip);else tube(.038,.023,'#c3a56c',0,.43,0,g);
        if(t.id==='spatula'){box(.22,.20,.025,'#b9c8bf',0,.018,0,g,{metalness:.65,roughness:.28});for(var slit=0;slit<4;slit++)box(.018,.14,.002,'#40584a',(slit-1.5)*.045,.018,.014,g);}
        if(t.id==='fork'){box(.18,.035,.022,'#bbc9c0',0,.10,0,g,{metalness:.7,roughness:.25});for(var tine=0;tine<4;tine++)tube(.009,.19,'#cbd5cd',(tine-1.5)*.045,-.01,0,g,{metalness:.7,roughness:.22});}
        if(t.id==='masher'){box(.23,.025,.16,'#bfcac1',0,-.06,0,g,{metalness:.65,roughness:.28});for(var bar=0;bar<5;bar++)box(.014,.025,.17,'#607865',(bar-2)*.04,-.044,.012,g);tube(.015,.13,'#bfcac1',-.10,.01,0,g,{metalness:.65});tube(.015,.13,'#bfcac1',.10,.01,0,g,{metalness:.65});}
      }
      var hit=mesh(new T.BoxGeometry(.43,.83,.20),'#ffffff',0,.27,0,g,{transparent:true,opacity:0,depthWrite:false});hit.userData.sceneDecoration=false;hit.castShadow=hit.receiveShadow=false;proxies[t.id]=hit;tag(t.short,t.x,1.81,.48,.10);
    });
    function pose(){var active=selected(mode),a=active&&state&&status(state,active.id,active.site,locked);tools.forEach(function(t){var g=groups[t.id],chosen=a&&a.ready&&active.id===t.id;g.visible=!chosen||!working;g.position.set(t.x,2.0,-1.78);g.rotation.set(0,0,0);/* A readied utensil rests beside the cookware and can be carried again. */proxies[t.id].visible=true;if(chosen){var at=active.site==='pan'?root.KitchenRecipes.panPosition(state):{x:-1.1,z:-.45};g.position.set(at.x-.96,1.30,at.z+.37);g.rotation.x=-Math.PI/2;}});h.canvas.dataset.rackSelected=a&&a.ready?active.id:'';h.canvas.dataset.rackPhase='idle';h.canvas.dataset.rackHeld='';h.canvas.dataset.rackDestination='';}
    function reset(){held=null;working=false;pose();}
    pose();return {labels:function(visible){labels.forEach(function(l){l.visible=visible;});},select:function(next,s,l){mode=next;state=s;locked=l;reset();},reset:reset,working:function(active){working=active;if(!held)pose();},preview:function(g,s){held=g.utensil;pose();var model=groups[held];model.visible=true;proxies[held].visible=false;var carried=g.carried||g.current;model.position.set(carried.x,2.10,carried.z);/* The carried handle faces the learner, clear of the tiled wall. */model.rotation.set(Math.PI/2,0,-.18);var destination=site(s,g.current),ready=status(s,held,destination,false).ready;h.canvas.dataset.rackPhase=ready?'release':'carry';h.canvas.dataset.rackHeld=held;h.canvas.dataset.rackDestination=destination||'';},dispose:function(){h.world.remove(rack);labels.forEach(function(l){l.material.dispose();});textures.forEach(function(t){t.dispose();});}};
  }
  var api={tools:tools,definition:definition,canPick:canPick,site:site,status:status,drop:drop,selected:selected,guidance:guidance,mountPanel:mountPanel,decorate:decorate};root.KitchenToolRack=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
