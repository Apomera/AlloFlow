/* A steady pan scan observes food; it never changes cooking or captures an image.
   Pan gaps may advance the path, but only actual food movement earns samples.
   Leaving the pan resets the run; food must start a new anchor on re-entry.
   The original canvas height / 420 fixes the pixel scale for the whole attempt. */
(function(root){
  'use strict';
  var distance=32,maxStep=48,minStep=.75,minSamples=2;
  function index(value){return Number.isSafeInteger(value)&&value>=0;}
  function point(p){return !!p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.unit)&&p.unit>0&&typeof p.inside==='boolean';}
  function coords(p){return {x:p.x,y:p.y};}
  function trace(t){return !!t&&Number.isFinite(t.unit)&&t.unit>0&&!!t.last&&!!t.anchor&&[t.last.x,t.last.y,t.anchor.x,t.anchor.y,t.reach,t.travel,t.samples].every(Number.isFinite)&&t.reach>=0&&t.travel>=0&&Number.isSafeInteger(t.samples)&&t.samples>=0&&typeof t.onFood==='boolean'&&typeof t.inside==='boolean'&&typeof t.active==='boolean'&&typeof t.invalid==='boolean'&&(index(t.index)||t.index===null);}
  function copy(t){return Object.assign({},t,{last:coords(t.last),anchor:coords(t.anchor)});}
  function start(p,foodIndex){
    if(!point(p)||!p.inside||!index(foodIndex))return null;
    return {unit:p.unit,index:foodIndex,last:coords(p),anchor:coords(p),reach:0,travel:0,samples:0,inside:true,onFood:true,active:true,invalid:false};
  }
  function move(t,p,foodIndex){
    if(!trace(t))return null;var n=copy(t);if(t.invalid)return n;
    if(!point(p)||foodIndex!==null&&!index(foodIndex)){n.invalid=true;n.onFood=false;return n;}
    // Outside movement earns nothing. A new food hit, not a pan gap, starts a run.
    if(!p.inside||!t.active){n.index=p.inside?foodIndex:null;n.inside=p.inside;n.onFood=p.inside&&foodIndex!==null;n.active=n.onFood;n.last=coords(p);n.anchor=coords(p);n.reach=0;n.travel=0;n.samples=0;return n;}
    var step=Math.hypot(p.x-t.last.x,p.y-t.last.y)/t.unit,reach=Math.hypot(p.x-t.anchor.x,p.y-t.anchor.y)/t.unit;
    if(!Number.isFinite(step)||!Number.isFinite(reach)||step>maxStep){n.invalid=true;n.onFood=false;return n;}
    n.index=foodIndex;n.inside=true;n.onFood=foodIndex!==null;n.last=coords(p);n.travel+=step;n.reach=Math.max(t.reach,reach);if(n.onFood&&step>=minStep)n.samples++;
    return n;
  }
  function progress(t){return !trace(t)||t.invalid||!t.inside||!t.active?0:Math.max(0,Math.min(1,t.reach/distance,t.travel/distance,t.samples/minSamples));}
  function complete(t,finalIndex){return !!trace(t)&&!t.invalid&&t.active&&t.inside&&t.onFood&&index(finalIndex)&&finalIndex===t.index&&t.reach>=distance&&t.travel>=distance&&t.samples>=minSamples;}
  var api={start:start,move:move,complete:complete,progress:progress};root.KitchenLensScan=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
