/* Pointer depth previews placement; temperature readings remain explicit actions. */
(function(root,factory){
  'use strict';
  var api=factory();
  root.KitchenStudioProbeDepth=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function finite(point){return !!point&&typeof point.x==='number'&&typeof point.y==='number'&&Number.isFinite(point.x)&&Number.isFinite(point.y);}
  function copy(point){return {x:point.x,y:point.y};}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function validDepth(depth){return typeof depth==='number'&&Number.isFinite(depth)&&depth>=0&&depth<=1;}
  function valid(trace){return !!trace&&finite(trace.start)&&finite(trace.current)&&typeof trace.unit==='number'&&Number.isFinite(trace.unit)&&trace.unit>=.5&&trace.unit<=2&&validDepth(trace.initialDepth)&&validDepth(trace.depth)&&typeof trace.travel==='number'&&Number.isFinite(trace.travel)&&trace.travel>=0&&typeof trace.invalid==='boolean'&&['adjust','surface','thick','retry'].indexOf(trace.phase)!==-1;}
  function placement(depth){return !validDepth(depth)?null:depth<=.08?'surface':depth>=.92?'thick':null;}
  function begin(point,options){
    if(options!=null&&(typeof options!=='object'||Array.isArray(options)))return null;
    var unit=options&&Object.prototype.hasOwnProperty.call(options,'unit')?options.unit:1;
    var depth=options&&Object.prototype.hasOwnProperty.call(options,'depth')?options.depth:0;
    if(!finite(point)||typeof unit!=='number'||!Number.isFinite(unit)||unit<=0||!validDepth(depth))return null;
    return {start:copy(point),current:copy(point),unit:clamp(unit,.5,2),initialDepth:depth,depth:depth,travel:0,phase:'adjust',invalid:false};
  }
  function move(trace,point){
    if(!valid(trace))return null;
    var next=Object.assign({},trace,{start:copy(trace.start),current:copy(trace.current)});
    if(trace.invalid)return next;
    if(!finite(point)){next.invalid=true;next.phase='retry';return next;}
    next.current=copy(point);
    var dx=(point.x-trace.start.x)/trace.unit,dy=(point.y-trace.start.y)/trace.unit;
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||Math.abs(dx)>45||Math.abs(dy)>120){next.invalid=true;next.phase='retry';return next;}
    next.depth=clamp(trace.initialDepth+dy/40,0,1);
    next.travel=Math.max(trace.travel,Math.hypot(dx,dy));
    next.phase=next.travel>=12?(placement(next.depth)||'adjust'):'adjust';
    return next;
  }
  function progress(trace){
    if(!valid(trace)||trace.invalid)return 0;
    if(trace.travel>=12&&placement(trace.depth)===trace.phase)return 1;
    return Math.min(.9,Math.abs(trace.depth-trace.initialDepth));
  }
  function finish(trace){
    var action=valid(trace)&&!trace.invalid&&trace.travel>=12?placement(trace.depth):null;
    if(action&&trace.phase===action)return {complete:true,action:action,message:action==='thick'?'Release to place the sensing tip at the centre, then take a fresh reading.':'Release to place the sensing tip against the surface, then take a fresh reading.'};
    var message=trace&&trace.invalid?'Contact lost. Start again on the thermometer.':'Move the sensing tip to the surface or centre marker, then release.';
    return {complete:false,action:null,message:message};
  }
  function point(x,y,z){return Object.freeze({x:x,y:y,z:z});}
  function pose(depth){
    if(!validDepth(depth))return null;
    var y=1.7355-.1755*depth;
    return Object.freeze({shaft:point(0,y+.22,0),display:point(0,y+.47,0),tip:point(0,y,0),rotationZ:0});
  }
  return {begin:begin,move:move,progress:progress,finish:finish,pose:pose,placement:placement};
});
