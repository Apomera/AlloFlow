/* Decorative action feedback only: the host has already committed the cooking action. */
(function(root){
  'use strict';
  function mount(options){
    var doc=options&&options.document,win=doc&&doc.defaultView;
    if(!win||typeof win.matchMedia!=='function')throw new TypeError('One-shot motion needs a browser document.');
    var motion=win.matchMedia('(prefers-reduced-motion: reduce)'),effects=new Map(),visible=true,disposed=false;
    function allowed(){return !disposed&&visible&&!doc.hidden&&!motion.matches;}
    function cancel(key){
      var effect=effects.get(key);if(!effect)return false;
      effects.delete(key);if(effect.frame!==null)win.cancelAnimationFrame(effect.frame);effect.frame=null;return true;
    }
    function finish(key,effect){
      if(effects.get(key)!==effect)return;
      cancel(key);effect.settle();
    }
    function settle(){Array.from(effects).forEach(function(entry){finish(entry[0],entry[1]);});}
    function refresh(){if(!allowed())settle();}
    function play(key,options){
      if(disposed)return false;
      if(typeof key!=='string'||!key||!options||!Number.isFinite(options.duration)||options.duration<=0||typeof options.frame!=='function'||typeof options.settle!=='function')throw new TypeError('Motion needs a name, duration, frame and settle callbacks.');
      // A new render owns the visual state; an old effect must not settle over it.
      cancel(key);
      if(!allowed()){options.settle();return false;}
      var effect={frame:null,settle:options.settle,start:win.performance.now()};effects.set(key,effect);
      function frame(now){
        if(effects.get(key)!==effect)return;
        effect.frame=null;
        if(!allowed()){finish(key,effect);return;}
        var progress=Math.max(0,Math.min(1,(now-effect.start)/options.duration));
        if(progress===1){finish(key,effect);return;}
        options.frame(progress);
        if(effects.get(key)===effect)effect.frame=win.requestAnimationFrame(frame);
      }
      effect.frame=win.requestAnimationFrame(frame);return true;
    }
    function setVisible(value){if(disposed)return;visible=!!value;refresh();}
    function dispose(){
      if(disposed)return;disposed=true;
      doc.removeEventListener('visibilitychange',refresh);win.removeEventListener('pagehide',settle);
      if(motion.removeEventListener)motion.removeEventListener('change',refresh);else motion.removeListener(refresh);
      settle();
    }
    doc.addEventListener('visibilitychange',refresh);win.addEventListener('pagehide',settle);
    if(motion.addEventListener)motion.addEventListener('change',refresh);else motion.addListener(refresh);
    return {play:play,cancel:cancel,setVisible:setVisible,dispose:dispose};
  }
  var api={mount:mount};root.KitchenOneShotMotion=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
