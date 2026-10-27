/* Keep guidance readable without resizing or moving the canvas during a gesture. */
(function(root){
  'use strict';
  function mount(options){
    var scene=options&&options.scene,coach=options&&options.coach,below=options&&options.below,doc=scene&&scene.ownerDocument,win=doc&&doc.defaultView;
    if(!win||!coach||!below||coach.ownerDocument!==doc||below.ownerDocument!==doc||coach.parentNode!==scene||scene.contains(below))throw new TypeError('Movement layout needs a scene, its coach and a separate reading area.');
    var next=coach.nextSibling,disposed=false,observer=null;
    function refresh(){
      if(disposed||!scene.isConnected||!coach.isConnected||!below.isConnected)return;
      var width=scene.clientWidth,height=scene.clientHeight;if(!width||!height)return;
      var font=parseFloat(win.getComputedStyle(doc.documentElement).fontSize)||16,docked=width<40*font||height<20*font,target=docked?below:scene,mode=docked?'below':'overlay';
      if(coach.parentNode!==target){if(docked)below.prepend(coach);else if(next&&next.parentNode===scene)scene.insertBefore(coach,next);else scene.append(coach);}
      if(coach.dataset.layout!==mode)coach.dataset.layout=mode;
    }
    win.addEventListener('resize',refresh);
    if(win.ResizeObserver){observer=new win.ResizeObserver(refresh);observer.observe(scene);observer.observe(coach);observer.observe(doc.documentElement);}
    refresh();
    function dispose(){if(disposed)return;disposed=true;win.removeEventListener('resize',refresh);if(observer)observer.disconnect();if(scene.isConnected&&coach.isConnected){if(next&&next.parentNode===scene)scene.insertBefore(coach,next);else scene.append(coach);}delete coach.dataset.layout;}
    return {refresh:refresh,dispose:dispose};
  }
  var api={mount:mount};root.KitchenMovementLayout=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
