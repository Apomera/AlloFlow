/* Lifting a lid changes the inspection view, never the storage decision. */
(function(root,factory){
  'use strict';
  var api=factory();
  root.KitchenStudioLid=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function finite(point){return !!point&&typeof point.x==='number'&&typeof point.y==='number'&&Number.isFinite(point.x)&&Number.isFinite(point.y);}
  function copy(point){return {x:point.x,y:point.y};}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function valid(trace){return !!trace&&finite(trace.start)&&finite(trace.current)&&typeof trace.unit==='number'&&Number.isFinite(trace.unit)&&trace.unit>=.5&&trace.unit<=2&&typeof trace.initialOpen==='boolean'&&typeof trace.opening==='number'&&Number.isFinite(trace.opening)&&trace.opening>=0&&trace.opening<=1&&typeof trace.invalid==='boolean'&&['adjust','ready','retry'].indexOf(trace.phase)!==-1;}
  function begin(point,options){
    if(options!=null&&(typeof options!=='object'||Array.isArray(options)))return null;
    var unit=options&&Object.prototype.hasOwnProperty.call(options,'unit')?options.unit:1;
    var open=options&&Object.prototype.hasOwnProperty.call(options,'open')?options.open:false;
    if(!finite(point)||typeof unit!=='number'||!Number.isFinite(unit)||unit<=0||typeof open!=='boolean')return null;
    return {start:copy(point),current:copy(point),unit:clamp(unit,.5,2),initialOpen:open,opening:open?1:0,phase:'adjust',invalid:false};
  }
  function move(trace,point){
    if(!valid(trace))return null;
    var next=Object.assign({},trace,{start:copy(trace.start),current:copy(trace.current)});
    if(trace.invalid)return next;
    if(!finite(point)){next.invalid=true;next.phase='retry';return next;}
    next.current=copy(point);
    var dx=(point.x-trace.start.x)/trace.unit,dy=(point.y-trace.start.y)/trace.unit;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>55){next.invalid=true;next.phase='retry';return next;}
    next.opening=clamp((trace.initialOpen?1:0)-dy/65,0,1);
    next.phase=(trace.initialOpen?dy>=24:dy<=-24)?'ready':'adjust';
    return next;
  }
  function progress(trace){
    if(!valid(trace)||trace.invalid)return 0;
    var dy=(trace.current.y-trace.start.y)/trace.unit;
    return Number.isFinite(dy)?clamp((trace.initialOpen?dy:-dy)/24,0,1):0;
  }
  function finish(trace){
    if(valid(trace)&&!trace.invalid&&trace.phase==='ready')return {complete:true,action:null,view:'lids',open:!trace.initialOpen,message:trace.initialOpen?'Release to close the lid.':'Release to leave the lid open.'};
    var message=trace&&trace.invalid?'Contact lost. Start again on the lid.':trace&&trace.initialOpen?'Lower the lid, then release to cover the food.':'Lift the lid, then release to look inside.';
    return {complete:false,action:null,message:message};
  }
  return {begin:begin,move:move,progress:progress,finish:finish};
});
