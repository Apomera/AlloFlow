/* Keep interrupted camera input and browser zoom outside the cooking model. */
(function(root){
  'use strict';
  function mount(options){
    var canvas=options&&options.canvas,doc=canvas&&canvas.ownerDocument,win=doc&&doc.defaultView;
    if(!win||typeof canvas.addEventListener!=='function'||typeof options.onCancel!=='function')throw new TypeError('Camera input needs a canvas and a cancellation callback.');
    var pending=new Map(),listeners=[],disposed=false;
    function on(target,type,handler){target.addEventListener(type,handler,true);listeners.push([target,type,handler]);}
    function cancel(){if(disposed||!pending.size)return;pending.clear();options.onCancel();}
    function down(event){pending.set(event.pointerId,event.pointerType);}
    function up(event){pending.delete(event.pointerId);}
    function interrupted(event){if(pending.has(event.pointerId))cancel();}
    function move(event){if(event.pointerType==='mouse'&&event.buttons===0&&pending.has(event.pointerId))cancel();}
    // Compare dispatch targets, not the WindowProxy exposed by defaultView.
    // Captured element blur has a different target and must not cancel a drag.
    function blur(event){if(event.target===event.currentTarget)cancel();}
    function visibility(){if(doc.hidden)cancel();}
    function wheel(event){
      // Stop the canvas camera listener, while keeping native browser zoom enabled.
      if(event.ctrlKey||event.metaKey)event.stopImmediatePropagation();
    }
    // Mount before direct scene capture listeners, which may stop pointer propagation.
    on(canvas,'pointerdown',down);
    on(doc,'pointerup',up);
    on(doc,'pointermove',move);
    on(doc,'pointercancel',interrupted);
    on(canvas,'lostpointercapture',interrupted);
    on(win,'blur',blur);
    on(win,'pagehide',cancel);
    on(doc,'visibilitychange',visibility);
    on(canvas,'wheel',wheel);
    function dispose(){
      if(disposed)return;disposed=true;pending.clear();
      listeners.forEach(function(entry){entry[0].removeEventListener(entry[1],entry[2],true);});listeners=[];
    }
    return {dispose:dispose};
  }
  var api={mount:mount};root.KitchenCameraInput=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
