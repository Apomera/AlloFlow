/* Recognizable bench objects enter the same native gestures as the tool chooser. */
(function(root){
  'use strict';
  var items=[
    {id:'jug',mode:'pour',name:'Saved-water jug',label:'JUG' /* gesture instructions appear in the guide */,why:'Carry it over the pan, then tilt. Lift back to level to stop the flow. A level jug pours nothing.'},
    {id:'ladle',mode:'ladle',name:'Water ladle',label:'LADLE' /* saved-water gesture */,why:'Dip into the pot, lift, carry level to the jug, then tip and release. Save water before draining it away.'},
    {id:'cloth',mode:'dry',name:'Drying cloth',label:'CLOTH' /* finite absorbency */,why:'Hold the cloth against wet produce. A full cloth stops absorbing; hold it over the bowl to wring it.'}
  ];
  function definition(id){return items.find(function(i){return i.id===id;})||null;}
  function status(s,id,locked){
    var d=definition(id),R=root.KitchenRecipes;if(!d)return null;
    var a;if(locked||s.plated||s.time>=3600||s.log.length>=1200)a={ready:false,detail:'Recorded or finished kitchen. Explore the objects without changing the cook.'};
    else if(R.serving(s).started)a={ready:false,detail:'Return every spoonful to the pan before using water or preparation tools.'};
    else if(id==='jug')a=root.KitchenJugPour.available(s,false);
    else if(id==='ladle')a=root.KitchenLadleCarry.available(s,false);
    else{var dry=R.drying(s),ready=dry.enabled&&s.prep.hands&&s.prep.rinsed&&!s.pan.produce;a={ready:ready,detail:!dry.enabled?'Start a fresh cook to explore blotting and wringing.':s.pan.produce?'The produce is already in the pan. Dry it on the board before cooking in your next batch.':!s.prep.hands?'Wash hands before preparing food.':!s.prep.rinsed?'Rinse the produce before drying it.':d.why};}
    return {item:id,mode:d.mode,name:d.name,ready:!!a.ready,detail:a.ready?d.why:a.detail};
  }
  function resolve(s,hit,mode,locked){return mode==='camera'||!hit?null:status(s,hit.item,locked);}
  function reading(s,id){var R=root.KitchenRecipes;if(id==='jug')return s.pot.reserve+' mL saved · '+Math.round(R.mixing(s).liquidSinceMix*10)/10+' mL waiting for a fold';if(id==='ladle'){var w=R.waterHandling(s);return w.remaining+' mL left to save · up to '+w.scoop+' mL in the next carry';}if(id==='cloth'){var d=R.drying(s);return d.areas.filter(function(v){return v>0;}).length+' wet areas · cloth '+d.cloth+'/8';}return '';}
  function mountPanel(h){
    var panel=document.createElement('section');panel.className='object-pickup-panel';panel.setAttribute('aria-labelledby','sceneObjectsTitle');panel.innerHTML='<div class="object-pickup-launch"><div><h3 id="sceneObjectsTitle">Work with what you see</h3><p>Grab the jug, ladle, or cloth directly in the kitchen.</p></div><button type="button" id="sceneShowObjects">Find objects</button></div><details><summary>Object guide & keyboard controls</summary><div class="object-guide-cards">'+items.map(function(d){return '<div data-object-card="'+d.id+'"><strong>'+d.name+'</strong><p>'+d.why+'</p><p class="object-ledger"></p><small></small><button type="button" data-object-keyboard="'+d.id+'">Open '+(d.id==='jug'?'measured pours':d.id==='ladle'?'keyboard ladle':'keyboard drying')+'</button></div>';}).join('')+'</div></details>';
    h.container.querySelector('.kitchen-tool-options').before(panel);var listeners=[];
    function on(e,fn){e.addEventListener('click',fn);listeners.push(function(){e.removeEventListener('click',fn);});}
    on(panel.querySelector('#sceneShowObjects'),h.show);panel.querySelectorAll('[data-object-keyboard]').forEach(function(b){on(b,function(){h.keyboard(b.dataset.objectKeyboard);});});
    return {render:function(s,mode,locked){panel.querySelectorAll('[data-object-card]').forEach(function(card){var id=card.dataset.objectCard,a=status(s,id,locked),ledger=card.querySelector('.object-ledger'),note=card.querySelector('small'),text=reading(s,id);if(ledger.textContent!==text)ledger.textContent=text;text=a.ready?'Ready to pick up':a.detail;if(note.textContent!==text)note.textContent=text;card.dataset.ready=String(a.ready);card.dataset.selected=String(mode===a.mode);card.querySelector('button').disabled=!a.ready;});},dispose:function(){listeners.forEach(function(fn){fn();});panel.remove();}};
  }
  function decorate(h){
    var T=h.THREE,group=new T.Group(),labels={},textures=[],clothFolds=[],held=null,state=null,view=null;h.world.add(group);
    function mesh(g,c,x,y,z,extra){var m=h.mesh(g,c,x,y,z,group,extra);m.userData.sceneDecoration=true;return m;}
    function box(w,ht,d,c,x,y,z){return mesh(new T.BoxGeometry(w,ht,d),c,x,y,z);}
    function tag(text,id,x,y,z,w){var c=document.createElement('canvas');c.width=256;c.height=80;var ctx=c.getContext('2d');ctx.fillStyle='#fffaf0';ctx.fillRect(0,0,256,80);ctx.fillStyle='#274f3b';ctx.font='bold 64px sans-serif';ctx.textAlign='center';ctx.fillText(text,128,63);var map=new T.CanvasTexture(c);map.encoding=T.sRGBEncoding;textures.push(map);var mat=new T.SpriteMaterial({map:map,toneMapped:false}),label=new T.Sprite(mat);label.position.set(x,y,z);label.scale.set(w,w*80/256,1);group.add(label);labels[id]=label;}
    var jugMat=box(.61,.018,.52,'#d4dbc5',-1.18,1.163,1.06);for(var stitch=0;stitch<7;stitch++)box(.035,.002,.008,'#587e66',-1.4+stitch*.073,1.174,1.285);
    /* A narrow counter stand supports the existing ladle bowl instead of leaving it floating. */
    var stand=mesh(new T.CylinderGeometry(.105,.12,.028,32),'#375e49',-.15,1.171,.3,{roughness:.8});mesh(new T.CylinderGeometry(.017,.023,.73,16),'#a4b8a8',-.15,1.55,.3,{metalness:.65,roughness:.3});var cradle=mesh(new T.TorusGeometry(.095,.013,8,32),'#afc1b3',-.15,1.932,.3,{metalness:.7,roughness:.3});cradle.rotation.x=Math.PI/2;
    /* These are folds of the same finite cloth; they lift away with it. */
    for(var fold=0;fold<3;fold++){clothFolds.push(box(.33,.052,.27,'#f1edda',2.68,1.205+fold*.056,-.7));for(var stripe=-1;stripe<=1;stripe++)clothFolds.push(box(.011,.003,.25,'#849d91',2.68+stripe*.084,1.233+fold*.056,-.7));}
    tag(items[0].label,'jug',-1.2,1.34,1.45,.79);tag(items[1].label,'ladle',-.15,2.22,.33,.85);tag(items[2].label,'cloth',2.67,1.60,-.69,.86);
    function show(){items.forEach(function(d){var visible=view==='objects'&&held!==d.id;if(d.id==='cloth')visible=visible&&!!state&&root.KitchenRecipes.drying(state).enabled&&!state.pan.produce;labels[d.id].visible=visible;});clothFolds.forEach(function(m,i){m.visible=held!=='cloth'&&!!state&&root.KitchenRecipes.drying(state).enabled&&!state.pan.produce;if(i%4===0&&state){m.material.color.set(['#f1edda','#d8e1d8','#adc5c5','#83a6b2','#638798'][Math.ceil(root.KitchenRecipes.drying(state).cloth/2)]).convertSRGBToLinear();}});h.canvas.dataset.objectRest=held||'';}
    return {update:function(s){state=s;show();},setView:function(id){view=id;show();},preview:function(kind){held=kind==='pour'?'jug':kind==='ladle'?'ladle':kind==='dry'?'cloth':null;show();},reset:function(){held=null;show();},dispose:function(){h.world.remove(group);Object.keys(labels).forEach(function(id){labels[id].material.dispose();});textures.forEach(function(t){t.dispose();});}};
  }
  var api={items:items,definition:definition,status:status,resolve:resolve,reading:reading,mountPanel:mountPanel,decorate:decorate};root.KitchenObjectTools=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

/* Short names stay readable in the objects view; the coach supplies the gesture. */
