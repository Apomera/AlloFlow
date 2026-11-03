/* Keyboard hands use the same previews and release gateway as pointer hands. */
(function(root){
  'use strict';
  function mount(host){
    var canvas=host.canvas,adapter=host.adapter,doc=canvas.ownerDocument,win=doc.defaultView||root;
    var section=doc.getElementById('studioKeyboard'),select=doc.getElementById('studioKeyboardTool'),grab=doc.getElementById('studioKeyboardGrab'),cancel=doc.getElementById('studioKeyboardCancel');
    var status=doc.getElementById('studioKeyboardStatus'),pad=doc.getElementById('studioKeyboardPad'),cursor=doc.getElementById('studioKeyboardCursor'),label=doc.getElementById('studioKeyboardLabel');
    var fine=doc.getElementById('studioKeyboardFine'),fineOn=false;
    var finder=doc.getElementById('studioToolFinder'),selected='',signature='',disposed=false,listeners=[],heldRect=null,pendingEscape=null;
    function on(target,type,fn,options){if(!target)return;target.addEventListener(type,fn,options);listeners.push(function(){target.removeEventListener(type,fn,options);});}
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function attribute(node,name,value){if(node.getAttribute(name)!==value)node.setAttribute(name,value);}
    function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
    function state(){return adapter.keyboardState();}
    function rectangle(){var r=canvas.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height};}
    function moved(a,b){return !a||['left','top','width','height'].some(function(key){return Math.abs(a[key]-b[key])>.01;});}
    function focusGrab(){if(disposed||section.hidden)return;var target=!grab.disabled?grab:!select.disabled?select:section.querySelector('summary');if(target)target.focus({preventScroll:true});}
    function update(){
      if(disposed)return;
      var tools=adapter.keyboardTools(),held=state(),ids=tools.map(function(tool){return tool.id;});
      if(held)selected=held.id;
      if(ids.indexOf(selected)===-1){var first=tools.find(function(tool){return tool.enabled;})||tools[0];selected=first?first.id:'';}
      var next=JSON.stringify(tools.map(function(tool){return [tool.id,tool.name,!!tool.enabled];}));
      if(next!==signature){
        select.replaceChildren();tools.forEach(function(tool){var option=doc.createElement('option');option.value=tool.id;option.textContent=tool.name;option.disabled=!tool.enabled;select.appendChild(option);});signature=next;
      }
      select.value=selected;
      var choice=tools.find(function(tool){return tool.id===selected;});
      section.hidden=tools.length===0;select.disabled=!!held||tools.length===0;
      grab.disabled=!!held||!choice||!choice.enabled;cancel.disabled=!held;
      if(fine){fine.checked=fineOn;fine.disabled=!!held||tools.length===0;}
      pad.hidden=!held;pad.tabIndex=held?0:-1;
      if(held){
        var rect=rectangle();if(!heldRect)heldRect=rect;
        var x=clamp(held.point.x-rect.left,0,rect.width),y=clamp(held.point.y-rect.top,0,rect.height),width=Math.max(0,Math.min(150,rect.width-16));
        cursor.style.left=x+'px';cursor.style.top=y+'px';cursor.dataset.phase=held.phase||'';
        label.style.maxWidth=width+'px';label.style.left=clamp(x+15+width<=rect.width-8?x+15:x-15-width,8,Math.max(8,rect.width-8-width))+'px';label.style.top=clamp(y-31,8,Math.max(8,rect.height-38))+'px';
        text(label,held.name+(fineOn?' · fine':''));attribute(pad,'aria-label','Move '+held.name+' with the keyboard');
        text(status,held.name+(held.hint?'. '+held.hint:'')+(fineOn?' Fine movement on.':''));
      }else{
        heldRect=null;cursor.dataset.phase='';attribute(pad,'aria-label','Move a kitchen tool with the keyboard');
        text(status,choice?(choice.enabled?choice.name+(choice.hint?'. '+choice.hint:''):choice.name+' is unavailable for keyboard use in this view.'):'Choose a tool to use in the 3D view.');
      }
    }
    function setFine(value){
      var changed=fineOn!==value;fineOn=value;update();
      if(changed&&typeof host.onPrecisionChange==='function')try{host.onPrecisionChange(fineOn);}catch(error){}
    }
    function cancelKeyboard(message){if(!state())return false;adapter.cancel(message);update();return true;}
    function release(){if(!state())return false;adapter.keyboardRelease();update();focusGrab();return true;}
    on(fine,'change',function(){if(!state())setFine(!!fine.checked);else update();});
    on(select,'change',function(){if(state())return;selected=select.value;update();});
    on(grab,'keydown',function(event){if(event.repeat&&(event.key==='Enter'||event.key===' '||event.key==='Spacebar'))event.preventDefault();});
    on(grab,'click',function(){
      if(disposed||state()||grab.disabled)return;
      canvas.scrollIntoView({block:'center',behavior:'auto'});
      if(adapter.keyboardBegin(selected)){update();pad.focus({preventScroll:true});}else update();
    });
    on(cancel,'click',function(){if(cancelKeyboard('Keyboard movement cancelled. No action recorded.'))focusGrab();});
    on(pad,'keydown',function(event){
      if(disposed||doc.activeElement!==pad||event.altKey||event.ctrlKey||event.metaKey)return;
      var held=state();
      if(event.key==='Escape'){
        // Touch cancels at document level. Match this event there, after Touch,
        // because browsers can flush microtasks before the next listener runs.
        if(held)pendingEscape=event;
        return;
      }
      if(!held||event.defaultPrevented)return;
      if(event.key==='f'||event.key==='F'){event.preventDefault();if(!event.repeat)setFine(!fineOn);return;}
      var directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]},direction=directions[event.key];
      if(direction){
        event.preventDefault();var raw=canvas.getBoundingClientRect().height/420,unit=Number.isFinite(raw)&&raw>0?clamp(raw,.5,2):1,step=(event.shiftKey?24:fineOn?2:8)*unit;
        adapter.keyboardMove(direction[0]*step,direction[1]*step);update();return;
      }
      if(event.key==='t'||event.key==='T'){event.preventDefault();if(!event.repeat){adapter.keyboardAimNext();update();}return;}
      if(event.key==='Enter'||event.key===' '||event.key==='Spacebar'){event.preventDefault();if(!event.repeat)release();}
    });
    on(doc,'keydown',function(event){
      if(event!==pendingEscape)return;pendingEscape=null;
      if(disposed)return;update();if(!state())focusGrab();
    });
    on(pad,'focusout',function(event){if(state()&&!pad.contains(event.relatedTarget))cancelKeyboard('Keyboard movement paused when focus left the workspace. No action recorded.');});
    on(win,'scroll',function(){if(state()&&moved(heldRect,rectangle()))cancelKeyboard('Keyboard movement paused when the view moved. No action recorded.');},true);
    on(win,'blur',function(){cancelKeyboard('Keyboard movement paused. No action recorded.');});
    on(finder,'click',function(event){var button=event.target&&event.target.closest&&event.target.closest('button[data-studio-tool]');if(!button||button.disabled||!finder.contains(button))return;selected=button.dataset.studioTool;update();});
    var unsubscribe=adapter.subscribeKeyboard(update);update();
    return {update:update,dispose:function(){
      if(disposed)return;disposed=true;if(typeof unsubscribe==='function')unsubscribe();listeners.forEach(function(remove){remove();});
      if(state())adapter.cancel('Keyboard controls closed. No action recorded.');heldRect=pendingEscape=null;pad.hidden=true;pad.tabIndex=-1;section.hidden=true;select.disabled=grab.disabled=cancel.disabled=true;fineOn=false;if(fine){fine.checked=false;fine.disabled=true;}
    }};
  }
  root.KitchenStudioKeyboard={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioKeyboard;
})(typeof window!=='undefined'?window:globalThis);
