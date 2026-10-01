/* Direct scene tools. Pointer gestures and keyboard controls call the same engine. */
(function(root){
  'use strict';
  var R=root.KitchenRecipes,H=root.KitchenHands;
  function node(tag,text,cls){var e=document.createElement(tag);if(text)e.textContent=text;if(cls)e.className=cls;return e;}
  function mountSurface(host){
    var selected=0,view=null,locked=true,panel=node('section',null,'pan-surface-panel');
    panel.setAttribute('aria-labelledby','panSurfaceTitle');
    panel.innerHTML='<h4 id="panSurfaceTitle">Each piece tells a story</h4><p id="panSurfaceSummary"></p><p class="hands-note">The center of this modeled pan runs hotter. Crowded pieces have less contact. Turning exposes the other surface; it keeps the color and damage already developed.</p><label for="panPieceChoice">Inspect a representative piece</label><select id="panPieceChoice"></select><p id="panPieceReading"></p><div class="pan-piece-actions"><button type="button" id="turnPanPiece">Turn this piece over</button><button type="button" id="spreadPanPieces">Spread all pieces</button></div><fieldset><legend>Move the selected piece</legend><div class="pan-piece-moves"><button type="button" data-piece-dx="-12" data-piece-dz="0">Left</button><button type="button" data-piece-dx="12" data-piece-dz="0">Right</button><button type="button" data-piece-dx="0" data-piece-dz="-12">Back</button><button type="button" data-piece-dx="0" data-piece-dz="12">Front</button></div></fieldset><p id="panPieceFeedback" role="status" aria-live="polite" aria-atomic="true"></p>';
    document.getElementById('mixPanel').after(panel);
    var $=function(id){return document.getElementById(id);};
    function act(action,value){if(locked)return;host.apply(action,value,'keyboard');$('panPieceFeedback').textContent=host.getState().feedback;}
    $('panPieceChoice').addEventListener('change',function(){selected=Number(this.value);render(view,null,locked);});
    $('turnPanPiece').addEventListener('click',function(){act('flipPiece',selected);});$('spreadPanPieces').addEventListener('click',function(){act('spreadPan');});
    panel.querySelectorAll('[data-piece-dx]').forEach(function(b){b.addEventListener('click',function(){if(locked)return;var p=R.panSurface(host.getState()).pieces[selected];if(!p)return;var x=Math.round(p.x*100)+Number(b.dataset.pieceDx),z=Math.round(p.z*100)+Number(b.dataset.pieceDz),r=Math.hypot(x,z);if(r>58){x=Math.round(x*58/r);z=Math.round(z*58/r);}act('movePiece',selected+':'+x+':'+z);});});
    function render(s,zone,historical){
      view=s;if(zone!==null)panel.hidden=zone!=='pan'&&zone!=='finish';var surface=R.panSurface(s);locked=historical||host.ended()||!s.pan.produce||!surface.enabled;
      $('panSurfaceSummary').textContent=surface.enabled?surface.summary:'This saved cook uses the original whole-pan model. Start a fresh cook to explore individual cooking surfaces.';
      selected=Math.max(0,Math.min(selected,surface.pieces.length-1));var choice=$('panPieceChoice');
      if(choice.options.length!==surface.pieces.length){choice.replaceChildren();surface.pieces.forEach(function(p){choice.append(new Option('Piece '+(p.index+1),String(p.index)));});}choice.value=String(selected);choice.disabled=!surface.pieces.length;
      var p=surface.pieces[selected];$('panPieceReading').textContent=p?'Piece '+(selected+1)+': exposed side '+p.topColor+'; pan-contact side '+p.bottomColor+'. '+(p.crowded?'Close to other pieces.':'Room around this piece.')+' '+(p.heat>1.1?'Near the hotter center.':'Away from the hottest center.'): 'Add prepared produce to the pan first.';
      panel.querySelectorAll('button').forEach(function(b){b.disabled=locked;});
      if(historical)$('panPieceFeedback').textContent='Recorded surfaces. Changes are locked during replay.';
    }
    return {render:render};
  }
  function mount3D(host){
    var T=host.THREE,canvas=host.canvas,ray=new T.Raycaster(),pointer=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-1.5);
    var tool='move',gesture=null,raf=null,lastTime=0,remainder=0,lastView=null,disposed=false,listeners=[];
    var controls=node('div',null,'scene-direct-tools');controls.innerHTML='<label for="sceneKitchenTool">Work in the 3D kitchen<select id="sceneKitchenTool"><option value="move">Move ingredients</option><option value="cut">Cut on the board</option><option value="stir">Stir the pan</option><option value="pour">Pour saved water</option><option value="arrange">Move & turn pieces</option><option value="camera">Move the camera</option></select></label><button id="sceneKeyboardTools" type="button">Use keyboard controls</button><p id="sceneToolHelp"></p><p id="sceneActionStatus" role="status" aria-live="polite" aria-atomic="true"></p>';
    document.getElementById('recipeScene').before(controls);
    var $=function(id){return document.getElementById(id);};
    var descriptions={move:'Drag the oil bottle, pasta packet, garlic bowl, or prepared pieces into cookware. Drag empty space to orbit the camera.',cut:'Start on the sample at the width you want. Pull the knife toward the front of the board, then release after a complete stroke.',stir:'Drag a full circle around the pan with the spoon. A complete sweep moves and turns pieces.',pour:'Drag the saved-water jug over the sauce pan and hold to pour. Move away or release to stop.',arrange:'Drag a piece to another position inside the pan. Tap a piece to turn it over and inspect the other surface.',camera:'Drag to orbit. Scroll or pinch to zoom. Choose a cooking tool to work with objects.'};
    function say(message){$('sceneActionStatus').textContent=message;}
    function help(){ $('sceneToolHelp').textContent=descriptions[tool];canvas.style.cursor=tool==='camera'?'grab':'crosshair';}
    function on(el,type,fn,options){el.addEventListener(type,fn,options);listeners.push(function(){el.removeEventListener(type,fn,options);});}
    on($('sceneKitchenTool'),'change',function(){cancel();tool=this.value;help();});
    on($('sceneKeyboardTools'),'click',function(){cancel();host.openTools(tool);});
    function setRay(e){var b=canvas.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);host.world.updateMatrixWorld(true);ray.setFromCamera(pointer,host.camera);}
    function point(e,height){setRay(e);plane.constant=-height;return ray.ray.intersectPlane(plane,new T.Vector3());}
    function visible(o){for(var p=o;p;p=p.parent)if(!p.visible)return false;return true;}
    function pick(e){setRay(e);var hits=ray.intersectObjects(host.world.children,true);for(var i=0;i<hits.length;i++){var o=hits[i].object;if(!visible(o)||o.isSprite||o.userData.sceneDecoration)continue;for(var parent=o;parent;parent=parent.parent){if(parent.userData.kitchenItem)return {item:parent.userData.kitchenItem};if(Number.isInteger(parent.userData.kitchenPiece))return {piece:parent.userData.kitchenPiece};if(parent.userData.kitchenBoard)return {board:true};if(parent.userData.kitchenPan)return {pan:true};}return null;}return null;}
    function target(p){if(!p)return null;if(Math.hypot(p.x-1.02,p.z+.45)<.76)return 'pan';if(Math.hypot(p.x+1.1,p.z+.45)<.64)return 'pot';return null;}
    function snapshot(objects){return objects.map(function(o){return {object:o,position:o.position.clone(),rotation:o.rotation.clone()};});}
    function restore(g){if(g&&g.original)g.original.forEach(function(o){o.object.position.copy(o.position);o.object.rotation.copy(o.rotation);});}
    function cancel(message){
      var g=gesture;gesture=null;if(raf!==null)cancelAnimationFrame(raf);raf=null;lastTime=0;remainder=0;
      restore(g);host.orbit.enabled=true;host.clearPreview();if(g&&canvas.hasPointerCapture(g.id))canvas.releasePointerCapture(g.id);if(message)say(message);if(!disposed)host.draw();
    }
    function commit(action,value,method){cancel();host.apply(action,value,method);say(host.getState().feedback);}
    function paint(){
      var g=gesture;if(!g)return;
      if(g.kind==='move'&&g.current){var delta=g.current.clone().sub(g.start);g.original.forEach(function(o){o.object.position.copy(o.position).add(delta);});}
      if(g.kind==='pour'&&g.current)host.previewJug(g.current,g.tilt||0);
      if(g.kind==='piece'&&g.current)host.previewPiece(g.index,g.current);
      host.draw();
    }
    function tick(now){
      var g=gesture;if(!g||g.kind!=='pour')return;
      if(disposed||host.locked()||document.hidden||!canvas.getClientRects().length){cancel();return;}
      var s=host.getState(),dose=H.pourStep(remainder,g.tilt||0,lastTime?now-lastTime:0,s.pot.reserve);lastTime=now;remainder=dose.remainder;
      if(dose.amount){host.apply('pour',dose.amount,'scene-pour');g.poured+=dose.amount;say(g.poured+' mL poured · '+host.getState().pot.reserve+' mL left. Move away or release to stop.');}
      paint();if(host.getState().pot.reserve<10){cancel('Jug empty. Mix the added water through the sauce before checking the dish.');return;}raf=requestAnimationFrame(tick);
    }
    function down(e){
      if(gesture){e.preventDefault();e.stopImmediatePropagation();cancel('Gesture cancelled. Use one pointer at a time.');return;}
      if(disposed||e.button!==0||!e.isPrimary||tool==='camera'||host.locked())return;
      var hit=pick(e),s=host.getState(),p=point(e,tool==='cut'?1.285:1.5),g=null;if(!hit||!p)return;
      if(tool==='move'&&hit.item&&host.sources[hit.item]&&hit.item!=='jug'){g={kind:'move',item:hit.item,original:snapshot(host.sources[hit.item]),start:p,current:p};}
      if(tool==='cut'&&(hit.board||hit.item==='produce')&&!s.prep.cut&&!s.pan.produce){var stroke=H.knifeStart(30+(p.x-.82)/1.05*400,20,s.prep.cuts);if(stroke)g={kind:'cut',stroke:stroke,start:p};}
      if(tool==='stir'&&(hit.pan||hit.piece!==undefined)&&s.pan.produce){var x=p.x-1.02,z=p.z+.45;g={kind:'stir',trace:root.KitchenStirGesture.start(Math.atan2(z,x))};}
      if(tool==='pour'&&hit.item==='jug'){if(!s.pan.produce||s.pot.reserve<10){e.preventDefault();e.stopImmediatePropagation();say('Add produce and save cooking water before pouring.');return;}g={kind:'pour',original:snapshot(host.sources.jug),start:p,current:p,tilt:0,poured:0};}
      if(tool==='arrange'&&hit.piece!==undefined&&s.panModel===2)g={kind:'piece',index:hit.piece,start:p,current:p};
      if(!g)return;e.preventDefault();e.stopImmediatePropagation();host.pause();host.orbit.enabled=false;gesture=Object.assign(g,{id:e.pointerId,clientX:e.clientX,clientY:e.clientY,moved:false});canvas.setPointerCapture(e.pointerId);
      if(g.kind==='pour')raf=requestAnimationFrame(tick);say(g.kind==='cut'?'Pull toward the front of the board. A full stroke cuts when released.':descriptions[tool]);
    }
    function move(e){
      var g=gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
      var p=point(e,g.kind==='cut'?1.285:1.5);if(!p)return;g.moved=g.moved||Math.hypot(e.clientX-g.clientX,e.clientY-g.clientY)>7;g.current=p;
      if(g.kind==='cut'){g.stroke=H.knifeMove(g.stroke,30+(p.x-.82)/1.05*400,20+(p.z-g.start.z)/.32*100);host.previewKnife(g.stroke.index,g.stroke.position,Math.max(0,Math.min(1,(p.z-g.start.z)/.32)));say(!g.stroke.valid?'The stroke moved sideways. Release and try a straight stroke.':g.stroke.complete?'Complete stroke. Release to cut.':'Continue toward the front of the board.');}
      if(g.kind==='stir'){var x=p.x-1.02,z=p.z+.45,r=Math.hypot(x,z);g.trace=root.KitchenStirGesture.move(g.trace,Math.atan2(z,x),r>=.12&&r<=.75);host.previewStir(g.trace.travel);if(g.trace.complete){commit('stirSweep','gesture','scene-stir');return;}}
      if(g.kind==='pour'){var distance=Math.hypot(p.x-1.02,p.z+.45);g.tilt=distance<.75?30+40*(1-distance/.75):0;}
      paint();
    }
    function up(e){
      var g=gesture;if(!g||g.id!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();
      if(g.kind==='move'&&g.moved){var action=H.transferAction(g.item,target(g.current));if(action){commit(action,undefined,'scene-drag');return;}cancel('Item returned to the bench. Drop it over the matching cookware.');return;}
      if(g.kind==='cut'){var value=H.knifeValue(g.stroke);if(value){commit('slice',value,'scene-cut');return;}cancel('No cut made. Draw a straight, complete stroke through the sample.');return;}
      if(g.kind==='piece'){if(!g.moved){commit('flipPiece',g.index,'scene-piece');return;}var scale=host.getState().pan.size==='wide'?1.08:1,x=Math.round((g.current.x-1.02)/scale*100),z=Math.round((g.current.z+.45)/scale*100);if(Math.hypot(x,z)<=60){commit('movePiece',g.index+':'+x+':'+z,'scene-piece');return;}cancel('Piece returned to its previous position. Keep it inside the pan.');return;}
      if(g.kind==='pour'){cancel(g.poured?g.poured+' mL added. Mix through and inspect the sauce.':'No water poured. Hold the jug over the sauce pan to start the flow.');return;}
      cancel(g.kind==='stir'?'Incomplete sweep. The food positions are unchanged.':undefined);
    }
    on(canvas,'pointerdown',down,true);on(canvas,'pointermove',move,true);on(canvas,'pointerup',up,true);
    ['pointercancel','lostpointercapture'].forEach(function(type){on(canvas,type,function(e){if(gesture&&gesture.id===e.pointerId)cancel('Gesture stopped. Completed pours remain in the sauce.');},true);});
    on(window,'blur',function(){cancel();});on(document,'visibilitychange',function(){if(document.hidden)cancel();});on(window,'keydown',function(e){if(gesture&&e.key==='Escape'){e.preventDefault();cancel('Gesture cancelled. Completed pours remain in the sauce.');}});
    function update(s){
      var reset=lastView&&(s.log.length<lastView.log.length||s.id!==lastView.id||s.servings!==lastView.servings||!!s.rescue!==!!lastView.rescue);lastView=s;
      if(reset||host.locked())cancel();$('sceneKitchenTool').disabled=host.locked();if(host.locked())say('Recorded or finished kitchen. Cooking tools are locked; you can still move the camera.');paint();
    }
    function dispose(){cancel();disposed=true;listeners.forEach(function(remove){remove();});controls.remove();}
    help();return {update:update,cancel:cancel,dispose:dispose,setVisible:function(visible){controls.hidden=!visible;if(!visible)cancel();}};
  }
  root.KitchenSceneTools={mountSurface:mountSurface,mount3D:mount3D};
})(window);
