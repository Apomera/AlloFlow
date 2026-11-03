/* Direct gestures share the studio's action gateway and never change evidence during preview. */
(function(root){
  'use strict';
  var hints={
    prep:'Rub the model hands side to side, then carry them under the tap to rehearse a full handwash. Use the faucet, soap, and board to choose preparation steps. Carry the vegetable basket onto the board when you are ready.',
    knife:'Slide the nonslip mat under the board, or tap the board to secure it. Curl the guide hand, choose a cut, then move the knife down and back up.',
    heat:'Use the spatula to spread mushrooms at the outer ring or gather them in the centre. Dry with the towel, adjust the dial, and tap the timer to advance the cook.',
    probe:'Place and tap the thermometer to read it. Carry the chicken plate to the oven for another cooking step, or to the serving board to serve.',
    measure:'Carry the stock carton over the jug to pour 150 mL. Drag the jug up or down for 50 mL adjustments, or tap it for an eye-level inspection. Tap the check card to check your quantity.',
    chill:'Tap the refrigerator handle, or pull down to open and push up to close. Carry leftovers to the shallow tray, refrigerator, or waste bin. Drag the food-and-date label onto the container.'
  };
  function mount(host){
    var canvas=host.canvas,doc=canvas.ownerDocument,win=doc.defaultView,G=root.KitchenStudioGestures;
    var $=function(id){return doc.getElementById(id);},gesture=null,enabled=true,tapPlace=false,disposed=false,lastState=null,lastStation=null,listeners=[],keyboardListeners=[];
    var carryMode=$('studioCarryMode'),carryCancel=$('studioCarryCancel'),carryHelp=$('studioCarryHelp'),carryNotice=$('studioCarryNotice');
    function carryEligible(hit){return !!hit&&!hit.viewOnly&&['prepare','mat','spatula','plate','stock','probe','chicken','store','label'].indexOf(hit.kind)!==-1;}
    function toolHint(hit){if(hit.kind==='lid')return 'Tap to lift the lids, or drag up to lift and down to close. Explore the containers without a storage decision.';return tapPlace&&carryEligible(hit)?'Tap to pick up '+(hit.name||'this tool')+', then tap a destination to place it. You can also drag.':hit.hint;}
    function refreshCarry(){
      var held=gesture&&gesture.latched;canvas.dataset.carryLatched=String(!!held);
      if(carryMode){carryMode.setAttribute('aria-pressed',String(tapPlace));carryMode.textContent='Tap to place: '+(tapPlace?'on':'off');carryMode.disabled=host.hidden();}
      if(carryCancel){carryCancel.hidden=!tapPlace;carryCancel.disabled=!held||host.hidden();}
      if(carryHelp)carryHelp.hidden=!tapPlace||host.hidden();
      if(carryNotice){carryNotice.hidden=!held||host.hidden();if(held){carryNotice.dataset.tool=gesture.hit.id;$('studioCarryName').textContent='Carrying '+(gesture.hit.name||'tool');$('studioCarryInstruction').textContent=gesture.id===null?'Tap a destination · Esc cancels':'Release to place · Esc cancels';}else{delete carryNotice.dataset.tool;$('studioCarryName').textContent='';$('studioCarryInstruction').textContent='';}}
    }
    function stableCarry(){
      var g=gesture;if(!g||!g.latched)return false;var b=keyboardRect();
      if(['left','top','width','height'].some(function(key){return !Number.isFinite(b[key])||Math.abs(g.carryRect[key]-b[key])>.1;})){cancel('The view moved. Carrying cancelled. No action recorded.');return false;}return true;
    }
    function setTapPlace(next){cancel('Carrying mode changed. No action recorded.');tapPlace=!!next;refreshCarry();$('studioTouchHint').textContent=idleHint();say(tapPlace?'Tap a carry tool, then tap its destination. Escape cancels carrying.':'Carry tools by dragging.');}
    function on(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push(function(){target.removeEventListener(type,fn,options);});}
    function say(text){$('studioTouchStatus').textContent=text;}
    function locked(hit){return disposed||doc.hidden||!canvas.getClientRects().length||(hit&&hit.viewOnly?host.hidden():host.locked());}
    function keyboardState(){
      var g=gesture;if(!g||!g.keyboard)return null;
      return {id:g.hit.id,name:g.hit.name||g.hit.id,point:{x:g.last.x,y:g.last.y},phase:canvas.dataset.phase||'held',hint:$('studioTouchHint').textContent};
    }
    function publishKeyboard(){keyboardListeners.slice().forEach(function(listener){listener(keyboardState());});}
    function visibleTool(info){return !!info&&Array.isArray(info.objects)&&info.objects.some(function(object){for(var p=object;p;p=p.parent)if(p.visible===false)return false;return true;});}
    function resolveTool(info){return host.inputTool?host.inputTool(info):info;}
    function discovery(raw){
      var info=raw&&resolveTool(raw),description=null;
      if(info&&info.kind&&info.station===host.getState().id&&!host.hidden()&&!doc.hidden&&host.available(info.id)&&visibleTool(info)){
        var readOnly=locked(info),hint=readOnly?'This view is read-only. Return to a live attempt to use this tool.':!enabled?'Switch to Hands on to use this tool.':toolHint(info);
        description={info:info,hint:hint,readOnly:readOnly};
      }
      if(typeof host.discover==='function')try{host.discover(description&&description.info,description&&description.hint,description&&description.readOnly);}catch(error){}
      return description;
    }
    function keyboardTools(){
      if(disposed||host.hidden())return [];var s=host.getState();
      return host.tools(s.id).map(function(raw){var info=resolveTool(raw);return {id:raw.id,name:raw.name||raw.id,hint:info&&info.hint||raw.hint||'',enabled:!!(info&&info.kind&&info.station===s.id&&host.available(raw.id)&&visibleTool(info)&&!locked(info))};});
    }
    function keyboardRect(){var b=canvas.getBoundingClientRect();return {left:b.left,top:b.top,width:b.width,height:b.height};}
    function stableKeyboard(){
      if(!gesture||!gesture.keyboard)return false;var a=gesture.keyboardRect,b=keyboardRect();
      if(['left','top','width','height'].some(function(key){return !Number.isFinite(b[key])||Math.abs(a[key]-b[key])>.1;})){cancel('The view moved. Keyboard movement cancelled. No action recorded.');return false;}return true;
    }
    function keyboardEvent(at){return {keyboard:true,pointerId:-1,button:0,isPrimary:true,clientX:at.x,clientY:at.y,preventDefault:function(){},stopImmediatePropagation:function(){}};}
    function keyboardBegin(id){
      if(disposed||typeof id!=='string'||host.hidden())return false;
      var s=host.getState(),raw=host.tools(s.id).find(function(info){return info.id===id;}),info=raw&&resolveTool(raw);
      if(!info||!info.kind||info.station!==s.id||!host.available(id)||locked(info))return false;
      if(gesture)cancel('Previous movement cancelled. No action recorded.');if(!enabled)setMode(true);
      if(!host.reveal(id))return false;
      var current=host.getState();raw=host.tools(current.id).find(function(tool){return tool.id===id;});info=raw&&resolveTool(raw);
      if(!info||!info.kind||info.station!==current.id||!host.available(id)||!visibleTool(info)||locked(info))return false;
      var at=host.keyboardPoint&&host.keyboardPoint(id);
      if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.y)||!inside({clientX:at.x,clientY:at.y}))return false;
      down(keyboardEvent(at),info);return !!(gesture&&gesture.keyboard);
    }
    function keyboardMove(dx,dy){
      if(typeof dx!=='number'||typeof dy!=='number'||!Number.isFinite(dx)||!Number.isFinite(dy)||!stableKeyboard())return false;
      var b=canvas.getBoundingClientRect(),at={x:Math.max(b.left+2,Math.min(b.right-2,gesture.last.x+dx)),y:Math.max(b.top+2,Math.min(b.bottom-2,gesture.last.y+dy))};
      move(keyboardEvent(at));return !!(gesture&&gesture.keyboard);
    }
    function keyboardAimNext(){
      if(!stableKeyboard())return false;var g=gesture,targets=host.keyboardTargets?host.keyboardTargets(g.hit,g):[];
      if(!Array.isArray(targets)||!targets.length)return false;
      g.keyboardTargetIndex=(g.keyboardTargetIndex+1)%targets.length;var target=targets[g.keyboardTargetIndex],at=host.keyboardPoint&&host.keyboardPoint(target.id);
      if(!at||!Number.isFinite(at.x)||!Number.isFinite(at.y)||!inside({clientX:at.x,clientY:at.y}))return false;
      move(keyboardEvent(at));return !!(gesture&&gesture.keyboard);
    }
    function keyboardRelease(){if(!stableKeyboard())return false;var at={x:gesture.last.x,y:gesture.last.y};up(keyboardEvent(at));return true;}
    function subscribeKeyboard(listener){if(typeof listener!=='function')return function(){};keyboardListeners.push(listener);listener(keyboardState());return function(){keyboardListeners=keyboardListeners.filter(function(fn){return fn!==listener;});};}
    function idleHint(){
      var s=host.getState();
      if(!enabled)return 'Look around: drag anywhere to orbit. Switch to Hands on to use the tools.';
      if(host.dialCloseup&&host.dialCloseup())return host.locked()?'Recorded burner dial. Inspect the marked settings, or return to the pan.':'Burner dial view. Turn around the rim, then release to set heat. Drag the centre up for more heat or down toward Off. Escape cancels a turn.';
      if(host.ovenCloseup&&host.ovenCloseup())return 'Oven inspection. Pull the handle down to open, or push up to close. Return to the kitchen to move the chicken.';
      if(host.probeCloseup())return host.locked()?'Recorded probe placement. Inspect the sensing tip and markers, or return to the previous view.':'Drag the display down to insert or up to withdraw. Release at the surface or centre marker, then use Take a fresh reading.';
      if(host.containerCloseup())return 'Inspecting containers. Tap to lift the lids, or drag up to lift and down to close. Return to moving containers to make a storage decision.';
      if(host.locked())return s.id==='chill'?'Recorded storage. Explore the refrigerator door and shelves, or start a fresh attempt.':'This view is read-only. Use the station controls to continue or start a fresh attempt.';
      if(s.id==='heat'&&host.platingMode()==='controlled'&&host.panMode()==='stir')return 'Spatula: follow a circle for a 30-second simulated stir. Pan handle: aim over the plate, tip down, return level and release to plate.';
      if(s.id==='heat'&&host.platingMode()==='controlled')return 'Carry the pan over the plate, follow the guide down to tip, return level and release. The burner changes only when you release.';
      if(s.id==='heat'&&host.panMode()==='stir')return 'Pick up the spatula, move to the start ring, and follow one circle. Release to stir and advance 30 simulated seconds.';
      if(s.id==='measure'&&host.measureInspecting())return 'Inspecting the jug. Adjust your viewpoint to read the scale. Return to kitchen view to use the carton.';
      if(s.id==='measure'&&host.pourMode()==='controlled')return 'Move the carton to the jug opening. Follow the guide down to tip and back upright, then release to add up to 50 mL.';
      if(tapPlace&&s.id==='probe')return 'Tap the thermometer or chicken plate to pick it up, then tap a destination. Use Take a fresh reading after placing the thermometer. You can also drag.';
      return (tapPlace?'Tap to place is on for carry tools. ':'')+hints[s.id]+(host.panCloseup()?' Adjust Viewing angle to look at the pan.':host.boardCloseup()?' Adjust Viewing angle to inspect the board and hand.':' Drag empty space to look around.');
    }
    function feedback(type,g){
      if(!g||!g.interactive||typeof host.feedback!=='function')return;
      try{host.feedback({type:type,id:g.hit.id,kind:g.hit.kind,keyboard:!!g.keyboard});}catch(e){}
    }
    function dialFeedbackLevel(g){
      var trace=g&&g.trace;if(!trace||trace.kind!=='dial'||trace.invalid)return null;
      var level=trace.phase==='ready'?trace.level:trace.turn?trace.turn.initial:trace.initialLevel;
      return Number.isInteger(level)&&level>=0&&level<=3?level:null;
    }
    function clear(){
      discovery(null);var g=gesture;gesture=null;canvas.dataset.held='';canvas.dataset.phase='idle';
      $('studioTouchProgress').hidden=true;host.orbit.enabled=true;host.highlight(null);host.preview(null,g);
      if(g&&!g.keyboard&&g.id!==null&&canvas.hasPointerCapture(g.id))canvas.releasePointerCapture(g.id);
      $('studioTouchHint').textContent=idleHint();canvas.style.cursor=enabled?'grab':'grab';host.draw();refreshCarry();publishKeyboard();return g;
    }
    function cancel(message){if(!gesture){discovery(null);return;}var g=clear();feedback('cancel',g);if(message)say(message);}
    function inside(e){var b=canvas.getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;}
    function sample(e){return {x:e.clientX,y:e.clientY};}
    function down(e,forcedHit){
      discovery(null);
      if(gesture){
        if(gesture.latched&&gesture.id===null){
          if(e.button!==0||e.isPrimary===false||disposed){cancel('Carry interrupted. No action recorded.');return;}
          if(!stableCarry())return;var held=gesture;
          if(locked(held.hit)||host.getState()!==held.source){cancel('Workspace changed. No action recorded.');return;}
          held.id=e.pointerId;held.pointerType=e.pointerType||'mouse';e.preventDefault();e.stopImmediatePropagation();host.orbit.enabled=false;canvas.setPointerCapture(e.pointerId);move(e);refreshCarry();return;
        }
        cancel('Touch interrupted. No action recorded.');return;
      }
      if(e.button!==0||e.isPrimary===false||disposed)return;
      var hit=forcedHit||host.pick(e);
      if(!enabled||!hit)return;
      var s=host.getState(),interactive=hit.station===s.id&&hit.kind&&!locked(hit);
      gesture={id:e.pointerId,hit:hit,source:s,keyboard:!!e.keyboard,keyboardRect:e.keyboard?keyboardRect():null,keyboardTargetIndex:-1,feedbackReady:false,tapCandidate:tapPlace&&!e.keyboard&&carryEligible(hit),latched:false,carryRect:null,pointerType:e.pointerType||'mouse',start:sample(e),last:sample(e),point:host.point(e),current:host.point(e),moved:0,interactive:interactive,original:host.capture(hit)};
      if(interactive){
        if(hit.kind==='ovenDoor'){
          gesture.ovenDoor=root.KitchenStudioOvenDoor.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420,open:host.ovenOpen()});
          if(!gesture.ovenDoor){gesture=null;return;}
        }
        if(hit.kind==='insertProbe'){
          gesture.insertion=root.KitchenStudioProbeDepth.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420,depth:host.probeDepth()});
          if(!gesture.insertion){gesture=null;return;}
        }
        if(hit.kind==='lid'){
          gesture.lid=root.KitchenStudioLid.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420,open:host.lidsOpen()});
          if(!gesture.lid){gesture=null;return;}
        }
        if(hit.kind==='stir'){
          gesture.stir=root.KitchenStudioStir.begin(host.stirPoint(e));
          if(!gesture.stir){gesture=null;return;}
        }
        if(hit.kind==='handwash'){
          gesture.wash=root.KitchenStudioWash.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420});
          if(!gesture.wash){gesture=null;return;}
        }
        if(hit.kind==='tipPlate'){
          gesture.plating=root.KitchenStudioPlating.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420});
          if(!gesture.plating){gesture=null;return;}
        }
        if(hit.kind==='tipPour'){
          gesture.pour=root.KitchenStudioPour.begin(sample(e),{unit:canvas.getBoundingClientRect().height/420});
          if(!gesture.pour){gesture=null;return;}
        }
        if(['cut','pour','dial','dry','grip','door'].indexOf(hit.kind)!==-1){
          gesture.trace=G.begin(hit.kind,sample(e),{
            unit:canvas.getBoundingClientRect().height/420,action:$('studioCutSize').value,
            level:['low','medium','high'].indexOf(s.values.heat)+1,claw:!!s.values.claw,
            dialPoint:hit.kind==='dial'?host.dialPoint(e):null,
            open:hit.kind==='door'?host.fridgeOpen():false
          });
        }
        if(hit.kind==='dial')gesture.feedbackLevel=dialFeedbackLevel(gesture);
        e.preventDefault();e.stopImmediatePropagation();host.orbit.enabled=false;if(!gesture.keyboard)canvas.setPointerCapture(e.pointerId);
        canvas.dataset.held=hit.id;canvas.dataset.phase='held';host.highlight(hit);$('studioTouchHint').textContent=(e.keyboard&&hit.kind!=='lid'?hit.hint:toolHint(hit))+' · Esc to cancel';
        $('studioTouchProgress').value=0;$('studioTouchProgress').hidden=hit.kind==='tap';host.preview(gesture);host.draw();publishKeyboard();feedback('pickup',gesture);
      }
    }
    function move(e){
      var g=gesture;
      if(!g){
        if(!enabled)return;
        var hit=host.pick(e),active=hit&&hit.station===host.getState().id&&hit.kind&&!locked(hit);
        host.highlight(active?hit:null);canvas.style.cursor=active?(hit.kind==='tap'?'pointer':'grab'):'grab';
        if(active){var described=discovery(hit);$('studioTouchHint').textContent=described?described.hint:toolHint(hit);}else $('studioTouchHint').textContent=idleHint();host.draw();return;
      }
      if(g.latched){
        if(!stableCarry())return;
        if(g.id===null){if(e.pointerType==='touch'||e.isPrimary===false)return;}
        else if(e.pointerId!==g.id)return;
      }else if(e.pointerId!==g.id)return;
      g.last=sample(e);g.moved=Math.max(g.moved,Math.hypot(e.clientX-g.start.x,e.clientY-g.start.y));
      if(!g.interactive)return;
      if(locked(g.hit)||host.getState()!==g.source){cancel('Workspace changed. No action recorded.');return;}
      e.preventDefault();e.stopImmediatePropagation();g.current=host.point(e);
      if(g.insertion){g.insertion=root.KitchenStudioProbeDepth.move(g.insertion,sample(e));canvas.dataset.phase=g.insertion.phase;$('studioTouchProgress').value=root.KitchenStudioProbeDepth.progress(g.insertion);$('studioTouchHint').textContent=root.KitchenStudioProbeDepth.finish(g.insertion).message+' · Esc to cancel';}
      else if(g.ovenDoor){g.ovenDoor=root.KitchenStudioOvenDoor.move(g.ovenDoor,sample(e));canvas.dataset.phase=g.ovenDoor.phase;$('studioTouchProgress').value=root.KitchenStudioOvenDoor.progress(g.ovenDoor);var doorResult=root.KitchenStudioOvenDoor.finish(g.ovenDoor);$('studioTouchHint').textContent=(doorResult.complete?'Release to '+(doorResult.open?'open':'close')+' the oven.':doorResult.message)+' · Esc to cancel';}
      else if(g.plating){g.plating=root.KitchenStudioPlating.move(g.plating,sample(e),host.platingTarget(e));canvas.dataset.phase=g.plating.phase;$('studioTouchProgress').value=root.KitchenStudioPlating.progress(g.plating);$('studioTouchHint').textContent=root.KitchenStudioPlating.finish(g.plating).message+' · Esc to cancel';}
      else if(g.lid){g.lid=root.KitchenStudioLid.move(g.lid,sample(e));canvas.dataset.phase=g.lid.phase;$('studioTouchProgress').value=root.KitchenStudioLid.progress(g.lid);$('studioTouchHint').textContent=root.KitchenStudioLid.finish(g.lid).message+' · Esc to cancel';}
      else if(g.wash){
        g.wash=root.KitchenStudioWash.move(g.wash,sample(e),host.washWater(e));canvas.dataset.phase=g.wash.phase;
        $('studioTouchProgress').value=root.KitchenStudioWash.progress(g.wash);$('studioTouchHint').textContent=root.KitchenStudioWash.finish(g.wash).message+' · Esc to cancel';
      }
      else if(g.stir){
        g.stir=root.KitchenStudioStir.move(g.stir,host.stirPoint(e));
        canvas.dataset.phase=g.stir.phase;$('studioTouchProgress').value=root.KitchenStudioStir.progress(g.stir);
        $('studioTouchHint').textContent=root.KitchenStudioStir.finish(g.stir).message+' · Esc to cancel';
      }
      else if(g.pour){g.pour=root.KitchenStudioPour.move(g.pour,sample(e),host.pourMouth(e));canvas.dataset.phase=g.pour.phase;$('studioTouchProgress').value=root.KitchenStudioPour.progress(g.pour);$('studioTouchHint').textContent=host.pourInstruction(g.pour,g.source.values.ml||0)+' · Esc to cancel';}
      else if(g.trace){g.trace=G.move(g.trace,sample(e),g.trace.turn?host.dialPoint(e):null);canvas.dataset.phase=g.trace.phase;$('studioTouchProgress').value=G.progress(g.trace);var result=G.finish(g.trace);var instruction=result.view?'Release to '+(result.open?'open':'close')+' the refrigerator.':result.message;$('studioTouchHint').textContent=instruction+' · Esc to cancel';}
      else if(g.hit.kind!=='tap'){g.destination=host.destination(g);canvas.dataset.phase=g.destination.action?'ready':'carry';$('studioTouchProgress').value=g.destination.action?1:0;$('studioTouchHint').textContent=g.destination.message+' · Esc to cancel';}
      host.preview(g);host.draw();refreshCarry();publishKeyboard();
      if(gesture===g&&g.hit.kind==='dial'){
        var level=dialFeedbackLevel(g);if(level!==null&&level!==g.feedbackLevel){g.feedbackLevel=level;feedback('detent',g);}
      }else if(gesture===g&&!g.feedbackReady&&canvas.dataset.phase==='ready'){g.feedbackReady=true;feedback('ready',g);}
    }
    function up(e){
      var g=gesture;if(!g||g.id===null||e.pointerId!==g.id)return;
      if(g.latched&&!stableCarry())return;
      // Include the release position even when the browser coalesces the last move.
      move(e);if(gesture!==g)return;
      if(g.interactive){e.preventDefault();e.stopImmediatePropagation();}
      var valid=inside(e)&&!locked(g.hit)&&host.getState()===g.source,result=null;
      if(valid&&g.interactive&&g.tapCandidate&&!g.latched&&g.moved<8){
        var releasedId=g.id;g.id=null;g.latched=true;g.carryRect=keyboardRect();
        if(canvas.hasPointerCapture(releasedId))canvas.releasePointerCapture(releasedId);
        host.preview(g);host.draw();refreshCarry();publishKeyboard();
        $('studioTouchHint').textContent='Carrying '+(g.hit.name||'tool')+'. Tap a destination to place it. Escape cancels.';
        say('Carrying '+(g.hit.name||'tool')+'. Tap a destination, or use Cancel carried tool.');return;
      }
      if(valid&&g.interactive){
        if(g.ovenDoor)result=g.moved<8?root.KitchenStudioOvenDoor.tap(g.ovenDoor.initialOpen):root.KitchenStudioOvenDoor.finish(g.ovenDoor);
        else if(g.insertion)result=root.KitchenStudioProbeDepth.finish(g.insertion);
        else if(g.plating)result=root.KitchenStudioPlating.finish(g.plating);
        else if(g.lid&&g.hit.viewTap&&g.moved<8)result={complete:true,view:'lids',open:!g.lid.initialOpen,message:g.lid.initialOpen?'Lids closed.':'Lids lifted. Inspect the illustrated food depth.'};
        else if(g.lid)result=root.KitchenStudioLid.finish(g.lid);
        else if(g.wash)result=root.KitchenStudioWash.finish(g.wash);
        else if(g.stir)result=root.KitchenStudioStir.finish(g.stir);
        else if(g.pour)result=root.KitchenStudioPour.finish(g.pour);
        else if(g.hit.viewTap&&g.moved<8)result={complete:true,view:'fridge',open:!g.trace.initialOpen,message:g.trace.initialOpen?'Refrigerator closed.':'Refrigerator opened.'};
        else if(g.hit.inspect&&g.moved<8)result={complete:true,inspect:true};
        else if(g.trace)result=G.finish(g.trace);
        else if(g.hit.kind==='tap')result={complete:g.moved<8,action:g.hit.action,message:'Tap the object without dragging to use it.'};
        else if(g.hit.tapAction&&!g.latched&&g.moved<8)result={complete:true,action:g.hit.tapAction};
        else {var destination=host.destination(g);result={complete:g.moved>=8&&!!destination.action,action:destination.action,message:destination.message};}
      }
      clear();
      if(g.interactive&&(!inside(e)||!valid||!result||!result.complete))feedback('cancel',g);
      if(!inside(e)){say('Released outside the kitchen. No action recorded.');return;}
      if(!g.interactive){if(g.moved<6&&g.hit.station!==host.getState().id)host.select(g.hit.station);return;}
      if(!valid){say('Workspace changed. No action recorded.');return;}
      if(result&&result.complete){
        if(result.view){host.view(result);say(result.message);}
        else if(result.inspect){host.inspect();say('Jug inspection opened. Lower the viewpoint to compare the liquid with the scale.');}
        else{host.act(result.action);say(host.getState().feedback);}
        feedback('release',g);
      }
      else say((result&&result.message||'Movement stopped.')+' No action recorded.');
    }
    function update(){
      discovery(null);var s=host.getState();if(gesture&&(s!==gesture.source||locked(gesture.hit)))cancel('Workspace changed. No action recorded.');
      if(host.locked()||host.hidden())host.highlight(null);
      if(s!==lastState){host.highlight(null);$('studioTouchHint').textContent=idleHint();if(!gesture)say(s.log.length?s.feedback:'Touch a tool to try an action. Each gesture records one decision.');lastState=s;}
      $('studioCutChoice').hidden=s.id!=='knife';$('studioCutSize').disabled=host.locked();
      $('studioFridgeControls').hidden=s.id!=='chill'||host.hidden();
      $('studioPlatingControls').hidden=s.id!=='heat'||host.hidden();['studioQuickPlate','studioControlledPlate','studioPlatingStep'].forEach(function(id){$(id).disabled=host.locked();});
      $('studioStirControls').hidden=s.id!=='heat'||host.hidden();
      $('studioWashControls').hidden=s.id!=='prep'||host.hidden();$('studioWashStep').disabled=host.locked();
      $('studioPourControls').hidden=s.id!=='measure'||host.hidden();
      ['studioPortionPour','studioControlledPour','studioPourStep'].forEach(function(id){$(id).disabled=host.locked();});
      ['studioArrangeMode','studioStirMode','studioStirStep'].forEach(function(id){$(id).disabled=host.locked();});
      if(s.id==='knife'){var cuts=root.KitchenStudio.mission('knife',s.scenario).actions.map(function(a){return a[0];});Array.from($('studioCutSize').options).forEach(function(o){o.disabled=cuts.indexOf(o.value)===-1;});if(cuts.indexOf($('studioCutSize').value)===-1)$('studioCutSize').value='dice';}
      if(lastStation!==s.id){lastStation=s.id;$('studioToolFinder').replaceChildren();host.tools(s.id).forEach(function(info){var b=doc.createElement('button');b.type='button';b.dataset.studioTool=info.id;b.textContent='Find '+info.name;b.addEventListener('click',function(){cancel();if(!host.reveal(info.id)){say('That object is no longer in this view.');return;}var described=discovery(info);if(!described){say('That object is not available in this view.');return;}$('studioTouchHint').textContent=described.hint;say(info.name+' highlighted. '+described.hint);host.draw();});$('studioToolFinder').append(b);});}
      $('studioToolFinder').querySelectorAll('button').forEach(function(b){b.disabled=host.hidden()||!host.available(b.dataset.studioTool);});
      $('studioTouch').hidden=host.hidden();$('studioInteractionMode').disabled=host.hidden();
      if(!gesture)$('studioTouchHint').textContent=idleHint();refreshCarry();publishKeyboard();
    }
    if(carryMode)on(carryMode,'click',function(){setTapPlace(!tapPlace);});
    if(carryCancel)on(carryCancel,'click',function(){cancel('Carrying cancelled. No action recorded.');});
    on(doc,'pointerdown',function(e){if(gesture&&gesture.latched&&!canvas.contains(e.target))cancel('Carrying cancelled outside the kitchen. No action recorded.');},true);
    on(win,'scroll',function(){if(gesture&&gesture.latched)stableCarry();},true);
    on(win,'resize',function(){if(gesture&&gesture.latched)cancel('View resized. Carrying cancelled. No action recorded.');});
    on(canvas,'pointerdown',down,true);on(canvas,'pointermove',move,true);on(canvas,'pointerup',up,true);
    on(doc,'pointerup',function(e){if(gesture&&e.pointerId===gesture.id&&!gesture.interactive){if(!canvas.contains(e.target))cancel();}},true);
    on(canvas,'pointercancel',function(){cancel('Touch cancelled. No action recorded.');},true);
    on(canvas,'lostpointercapture',function(e){if(gesture&&!gesture.keyboard&&gesture.id!==null&&e.pointerId===gesture.id&&!canvas.hasPointerCapture(gesture.id))cancel('Touch interrupted. No action recorded.');});
    on(canvas,'pointerleave',function(e){discovery(null);if(gesture&&gesture.latched&&gesture.id===null&&e.pointerType!=='touch'){cancel('Pointer left the kitchen. Carrying cancelled. No action recorded.');return;}if(!gesture){host.highlight(null);$('studioTouchHint').textContent=idleHint();host.draw();}});
    on(doc,'keydown',function(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel('Movement cancelled. No action recorded.');}else if(e.key==='Escape')discovery(null);else if(e.key==='Tab'&&gesture&&gesture.latched)cancel('Focus moved. Carrying cancelled. No action recorded.');});
    on(win,'blur',function(){cancel('Movement paused. No action recorded.');});
    on(doc,'visibilitychange',function(){if(doc.hidden)cancel('Movement paused. No action recorded.');});
    on(win,'pagehide',function(){cancel();});
    function setMode(next){
      cancel();enabled=next;host.interactionMode(enabled);var button=$('studioInteractionMode');
      button.setAttribute('aria-pressed',String(enabled));button.textContent=enabled?'Hands on':'Look around';host.highlight(null);$('studioTouchHint').textContent=idleHint();
      say(enabled?'Hands on. Touch a tool, or use the action buttons.':'Camera only. Dragging objects now changes your view.');host.draw();
    }
    on($('studioInteractionMode'),'click',function(){setMode(!enabled);});
    on($('studioCutSize'),'change',function(){cancel('Cut size changed. Start a new knife stroke.');});
    canvas.dataset.held='';canvas.dataset.phase='idle';update();
    return {update:update,cancel:cancel,keyboardTools:keyboardTools,keyboardState:keyboardState,keyboardBegin:keyboardBegin,keyboardMove:keyboardMove,keyboardAimNext:keyboardAimNext,keyboardRelease:keyboardRelease,subscribeKeyboard:subscribeKeyboard,handsOn:function(){if(!enabled)setMode(true);},dispose:function(){cancel();disposed=true;listeners.forEach(function(off){off();});keyboardListeners=[];}};
  }
  root.KitchenStudioTouch={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
