/* Short pointer gestures rehearse a full routine; they do not measure washing time. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KitchenStudioWash=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function finite(point){return !!point&&typeof point.x==='number'&&typeof point.y==='number'&&Number.isFinite(point.x)&&Number.isFinite(point.y);}
  function copy(point){return point?{x:point.x,y:point.y}:null;}
  function clone(trace){return Object.assign({},trace,{start:copy(trace.start),current:copy(trace.current),rinseStart:copy(trace.rinseStart)});}
  function begin(point,options){
    if(options!=null&&(typeof options!=='object'||Array.isArray(options)))return null;
    var unit=options&&Object.prototype.hasOwnProperty.call(options,'unit')?options.unit:1;
    if(!finite(point)||typeof unit!=='number'||!Number.isFinite(unit)||unit<=0)return null;
    return {start:copy(point),current:copy(point),unit:Math.max(.5,Math.min(2,unit)),passes:0,rubDirection:0,rubEdge:0,passTravel:0,phase:'rub',invalid:false,rinseStart:null};
  }
  function move(trace,point,water){
    if(!trace)return null;
    var next=clone(trace);
    if(trace.invalid)return next;
    if(!finite(point)){next.invalid=true;next.phase='retry';return next;}
    next.current=copy(point);
    if(trace.passes===3){
      next.phase=water&&water.overWater===true&&Math.hypot(point.x-trace.rinseStart.x,point.y-trace.rinseStart.y)>=10*trace.unit?'ready':'rinse';
      return next;
    }
    var dx=(point.x-trace.start.x)/trace.unit,dy=(point.y-trace.start.y)/trace.unit;
    if(Math.abs(dx)>120||Math.abs(dy)>40){next.invalid=true;next.phase='retry';return next;}
    if(!trace.rubDirection){
      next.passTravel=Math.abs(dx);
      if(next.passTravel>=24){next.passes=1;next.rubDirection=Math.sign(dx);next.rubEdge=dx;next.passTravel=0;}
    }else{
      if((dx-trace.rubEdge)*trace.rubDirection>0)next.rubEdge=dx;
      next.passTravel=Math.max(0,(next.rubEdge-dx)*trace.rubDirection);
      if(next.passTravel>=24){next.passes=trace.passes+1;next.rubDirection=-trace.rubDirection;next.rubEdge=dx;next.passTravel=0;}
    }
    if(next.passes===3){next.rinseStart=copy(point);next.phase='rinse';}
    return next;
  }
  function progress(trace){
    if(!trace||trace.invalid)return 0;
    if(trace.phase==='ready')return 1;
    if(trace.passes===3)return .75;
    return Math.max(0,Math.min(.75,(trace.passes+Math.min(1,trace.passTravel/24))/4));
  }
  function finish(trace){
    if(trace&&!trace.invalid&&trace.passes===3&&trace.phase==='ready')return {complete:true,action:'wash',message:'Release to model a full soap-and-water wash.'};
    var message=trace&&trace.invalid?'Contact lost. Start again on the model hands.':trace&&trace.passes===3?'Move the model hands under the water, then release.':'Rub the model hands side to side, then move them under the water.';
    return {complete:false,action:null,message:message};
  }
  return {begin:begin,move:move,progress:progress,finish:finish};
});
