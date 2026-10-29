/* Direct gestures share the studio's action gateway and never change evidence during preview. */
(function(root){
  'use strict';
  var hints={
    prep:'Use the faucet, soap, and board to choose preparation steps. Carry the vegetable basket onto the board when you are ready.',
    knife:'Slide the nonslip mat under the board, or tap the board to secure it. Curl the guide hand, choose a cut, then move the knife down and back up.',
    heat:'Use the spatula to spread mushrooms at the outer ring or gather them in the centre. Dry with the towel, adjust the dial, and tap the timer to advance the cook.',
    probe:'Place and tap the thermometer to read it. Carry the chicken plate to the oven for another cooking step, or to the serving board to serve.',
    measure:'Carry the stock carton over the jug to pour 150 mL. Drag the jug up or down for 50 mL adjustments. Tap the check card to check your quantity.',
    chill:'Carry leftovers to the shallow tray, fridge, or waste bin. Drag the food-and-date label onto the container to label it.'
  };
  function mount(host){
    var canvas=host.canvas,doc=canvas.ownerDocument,win=doc.defaultView,G=root.KitchenStudioGestures;
    var $=function(id){return doc.getElementById(id);},gesture=null,enabled=true,disposed=false,lastState=null,lastStation=null,listeners=[];
    function on(target,type,fn,options){target.addEventListener(type,fn,options);listeners.push(function(){target.removeEventListener(type,fn,options);});}
    function say(text){$('studioTouchStatus').textContent=text;}
    function locked(){return disposed||host.locked()||doc.hidden||!canvas.getClientRects().length;}
    function idleHint(){var s=host.getState();return !enabled?'Look around: drag anywhere to orbit. Switch to Hands on to use the tools.':host.locked()?'This view is read-only. Use the station controls to continue or start a fresh attempt.':hints[s.id]+' Drag empty space to look around.';}
    function clear(){
      var g=gesture;gesture=null;canvas.dataset.held='';canvas.dataset.phase='idle';
      $('studioTouchProgress').hidden=true;host.orbit.enabled=true;host.highlight(null);host.preview(null,g);
      if(g&&canvas.hasPointerCapture(g.id))canvas.releasePointerCapture(g.id);
      $('studioTouchHint').textContent=idleHint();canvas.style.cursor=enabled?'grab':'grab';host.draw();return g;
    }
    function cancel(message){if(!gesture)return;clear();if(message)say(message);}
    function inside(e){var b=canvas.getBoundingClientRect();return e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom;}
    function sample(e){return {x:e.clientX,y:e.clientY};}
    function down(e){
      if(gesture){cancel('Touch interrupted. No action recorded.');return;}
      if(e.button!==0||e.isPrimary===false||disposed)return;
      var hit=host.pick(e);
      if(!enabled||!hit)return;
      var s=host.getState(),interactive=hit.station===s.id&&hit.kind&&!locked();
      gesture={id:e.pointerId,hit:hit,source:s,start:sample(e),last:sample(e),point:host.point(e),current:host.point(e),moved:0,interactive:interactive,original:host.capture(hit)};
      if(interactive){
        if(['cut','pour','dial','dry','grip'].indexOf(hit.kind)!==-1){var level=['low','medium','high'].indexOf(s.values.heat)+1;gesture.trace=G.begin(hit.kind,sample(e),{unit:canvas.getBoundingClientRect().height/420,action:$('studioCutSize').value,level:level||1,claw:!!s.values.claw});}
        e.preventDefault();e.stopImmediatePropagation();host.orbit.enabled=false;canvas.setPointerCapture(e.pointerId);
        canvas.dataset.held=hit.id;canvas.dataset.phase='held';host.highlight(hit);$('studioTouchHint').textContent=hit.hint+' · Esc to cancel';
        $('studioTouchProgress').value=0;$('studioTouchProgress').hidden=hit.kind==='tap';host.preview(gesture);host.draw();
      }
    }
    function move(e){
      var g=gesture;
      if(!g){
        if(!enabled||locked())return;
        var hit=host.pick(e),active=hit&&hit.station===host.getState().id&&hit.kind;
        host.highlight(active?hit:null);canvas.style.cursor=active?(hit.kind==='tap'?'pointer':'grab'):'grab';
        $('studioTouchHint').textContent=active?hit.hint:idleHint();host.draw();return;
      }
      if(e.pointerId!==g.id)return;
      g.last=sample(e);g.moved=Math.max(g.moved,Math.hypot(e.clientX-g.start.x,e.clientY-g.start.y));
      if(!g.interactive)return;
      if(locked()||host.getState()!==g.source){cancel('Workspace changed. No action recorded.');return;}
      e.preventDefault();e.stopImmediatePropagation();g.current=host.point(e);
      if(g.trace){g.trace=G.move(g.trace,sample(e));canvas.dataset.phase=g.trace.phase;$('studioTouchProgress').value=G.progress(g.trace);var result=G.finish(g.trace);$('studioTouchHint').textContent=result.message+' · Esc to cancel';}
      else if(g.hit.kind!=='tap'){g.destination=host.destination(g);canvas.dataset.phase=g.destination.action?'ready':'carry';$('studioTouchProgress').value=g.destination.action?1:0;$('studioTouchHint').textContent=g.destination.message+' · Esc to cancel';}
      host.preview(g);host.draw();
    }
    function up(e){
      var g=gesture;if(!g||e.pointerId!==g.id)return;
      // Include the release position even when the browser coalesces the last move.
      move(e);if(gesture!==g)return;
      if(g.interactive){e.preventDefault();e.stopImmediatePropagation();}
      var valid=inside(e)&&!locked()&&host.getState()===g.source,result=null;
      if(valid&&g.interactive){
        if(g.trace)result=G.finish(g.trace);
        else if(g.hit.kind==='tap')result={complete:g.moved<8,action:g.hit.action,message:'Tap the object without dragging to use it.'};
        else if(g.hit.tapAction&&g.moved<8)result={complete:true,action:g.hit.tapAction};
        else {var destination=host.destination(g);result={complete:g.moved>=8&&!!destination.action,action:destination.action,message:destination.message};}
      }
      clear();
      if(!inside(e)){say('Released outside the kitchen. No action recorded.');return;}
      if(!g.interactive){if(g.moved<6&&g.hit.station!==host.getState().id)host.select(g.hit.station);return;}
      if(!valid){say('Workspace changed. No action recorded.');return;}
      if(result&&result.complete){host.act(result.action);say(host.getState().feedback);}
      else say((result&&result.message||'Movement stopped.')+' No action recorded.');
    }
    function update(){
      var s=host.getState();if(gesture&&(s!==gesture.source||locked()))cancel('Workspace changed. No action recorded.');
      if(host.locked()||host.hidden())host.highlight(null);
      if(s!==lastState){host.highlight(null);$('studioTouchHint').textContent=idleHint();if(!gesture)say(s.log.length?s.feedback:'Touch a tool to try an action. Each gesture records one decision.');lastState=s;}
      $('studioCutChoice').hidden=s.id!=='knife';$('studioCutSize').disabled=host.locked();
      if(s.id==='knife'){var cuts=root.KitchenStudio.mission('knife',s.scenario).actions.map(function(a){return a[0];});Array.from($('studioCutSize').options).forEach(function(o){o.disabled=cuts.indexOf(o.value)===-1;});if(cuts.indexOf($('studioCutSize').value)===-1)$('studioCutSize').value='dice';}
      if(lastStation!==s.id){lastStation=s.id;$('studioToolFinder').replaceChildren();host.tools(s.id).forEach(function(info){var b=doc.createElement('button');b.type='button';b.dataset.studioTool=info.id;b.textContent='Find '+info.name;b.addEventListener('click',function(){cancel();if(!host.reveal(info.id)){say('That object is no longer in this view.');return;}$('studioTouchHint').textContent=info.hint;say(info.name+' highlighted. '+info.hint);});$('studioToolFinder').append(b);});}
      $('studioToolFinder').querySelectorAll('button').forEach(function(b){b.disabled=host.hidden()||!host.available(b.dataset.studioTool);});
      $('studioTouch').hidden=host.hidden();$('studioInteractionMode').disabled=host.hidden();
      if(!gesture)$('studioTouchHint').textContent=idleHint();
    }
    on(canvas,'pointerdown',down,true);on(canvas,'pointermove',move,true);on(canvas,'pointerup',up,true);
    on(doc,'pointerup',function(e){if(gesture&&e.pointerId===gesture.id&&!gesture.interactive){if(!canvas.contains(e.target))cancel();}},true);
    on(canvas,'pointercancel',function(){cancel('Touch cancelled. No action recorded.');},true);
    on(canvas,'lostpointercapture',function(){cancel('Touch interrupted. No action recorded.');});
    on(canvas,'pointerleave',function(){if(!gesture){host.highlight(null);$('studioTouchHint').textContent=idleHint();host.draw();}});
    on(doc,'keydown',function(e){if(e.key==='Escape'&&gesture){e.preventDefault();cancel('Movement cancelled. No action recorded.');}});
    on(win,'blur',function(){cancel('Movement paused. No action recorded.');});
    on(doc,'visibilitychange',function(){if(doc.hidden)cancel('Movement paused. No action recorded.');});
    on(win,'pagehide',function(){cancel();});
    on($('studioInteractionMode'),'click',function(){cancel();enabled=!enabled;this.setAttribute('aria-pressed',String(enabled));this.textContent=enabled?'Hands on':'Look around';host.highlight(null);$('studioTouchHint').textContent=idleHint();say(enabled?'Hands on. Touch a tool, or use the action buttons.':'Camera only. Dragging objects now changes your view.');host.draw();});
    on($('studioCutSize'),'change',function(){cancel('Cut size changed. Start a new knife stroke.');});
    canvas.dataset.held='';canvas.dataset.phase='idle';update();
    return {update:update,cancel:cancel,dispose:function(){cancel();disposed=true;listeners.forEach(function(off){off();});}};
  }
  root.KitchenStudioTouch={mount:mount};
})(typeof window!=='undefined'?window:globalThis);
