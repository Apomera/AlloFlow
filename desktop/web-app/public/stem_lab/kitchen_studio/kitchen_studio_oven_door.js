/* Oven handling changes a local view; it never offers a cooking action. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KitchenStudioOvenDoor=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function point(value){return !!value&&typeof value.x==='number'&&typeof value.y==='number'&&Number.isFinite(value.x)&&Number.isFinite(value.y);}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function copy(value){return {x:value.x,y:value.y};}
  function valid(trace){return !!trace&&point(trace.start)&&point(trace.current)&&Number.isFinite(trace.unit)&&trace.unit>=.5&&trace.unit<=2&&typeof trace.initialOpen==='boolean'&&Number.isFinite(trace.opening)&&trace.opening>=0&&trace.opening<=1;}
  function clone(trace){return Object.assign({},trace,{start:copy(trace.start),current:copy(trace.current)});}
  function begin(at,options){
    options=options||{};
    var unit=Object.prototype.hasOwnProperty.call(options,'unit')?options.unit:1;
    if(!point(at)||typeof unit!=='number'||!Number.isFinite(unit)||unit<=0)return null;
    return {start:copy(at),current:copy(at),unit:clamp(unit,.5,2),initialOpen:options.open===true,opening:options.open===true?1:0,phase:'adjust',invalid:false};
  }
  function move(trace,at){
    if(!valid(trace))return null;
    var next=clone(trace);if(trace.invalid)return next;
    if(!point(at)){next.invalid=true;next.phase='retry';return next;}
    next.current=copy(at);
    var dx=(at.x-trace.start.x)/trace.unit,dy=(at.y-trace.start.y)/trace.unit;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>55){next.invalid=true;next.phase='retry';return next;}
    next.opening=clamp((trace.initialOpen?1:0)+dy/75,0,1);
    next.phase=(trace.initialOpen?dy<=-24:dy>=24)?'ready':'adjust';
    return next;
  }
  function tap(open){return {complete:true,action:null,view:'oven',open:open!==true,message:open===true?'Oven closed.':'Oven opened.'};}
  function finish(trace){
    if(valid(trace)&&!trace.invalid&&trace.phase==='ready')return tap(trace.initialOpen);
    return {complete:false,action:null,message:trace&&trace.invalid?'Contact lost. Start again on the oven handle.':trace&&trace.initialOpen?'Push the handle up, then release to close the oven.':'Pull the handle down, then release to open the oven.'};
  }
  function progress(trace){
    if(!valid(trace)||trace.invalid)return 0;
    var dy=(trace.current.y-trace.start.y)/trace.unit;
    return Number.isFinite(dy)?clamp((trace.initialOpen?-dy:dy)/24,0,1):0;
  }
  return {begin:begin,move:move,finish:finish,progress:progress,tap:tap};
});
