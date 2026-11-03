/* Pointer-only pour previews; finish offers one existing measure action. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KitchenStudioPour=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function finite(point){return !!point&&typeof point.x==='number'&&typeof point.y==='number'&&Number.isFinite(point.x)&&Number.isFinite(point.y);}
  function copy(point){return point?{x:point.x,y:point.y}:null;}
  function clone(trace){return Object.assign({},trace,{start:copy(trace.start),current:copy(trace.current),anchor:copy(trace.anchor)});}
  function begin(point,options){
    var unit=options&&Object.prototype.hasOwnProperty.call(options,'unit')?options.unit:1;
    if(!finite(point)||typeof unit!=='number'||!Number.isFinite(unit)||unit<=0)return null;
    return {phase:'carry',start:copy(point),current:copy(point),unit:unit,anchor:null,tilt:0,tipped:false,invalid:false};
  }
  function move(trace,point,mouth){
    if(!trace)return null;
    var next=clone(trace);
    if(trace.invalid)return next;
    if(!finite(point)){next.invalid=true;next.phase='invalid';return next;}
    next.current=copy(point);
    if(!next.anchor){
      if(!mouth||mouth.over!==true||!finite(mouth.anchor)||Math.hypot(point.x-mouth.anchor.x,point.y-mouth.anchor.y)>18*trace.unit||Math.hypot(point.x-trace.start.x,point.y-trace.start.y)<10*trace.unit)return next;
      next.anchor=copy(mouth.anchor);
    }
    var dx=(point.x-next.anchor.x)/trace.unit,dy=(point.y-next.anchor.y)/trace.unit;
    if(Math.abs(dx)>56||dy<-28){next.invalid=true;next.phase='invalid';return next;}
    next.tilt=Math.max(0,Math.min(1,dy/40));
    next.tipped=trace.tipped||dy>=40;
    next.phase=next.tipped&&dy>=-12&&dy<=10&&Math.abs(dx)<=28&&mouth&&mouth.over===true?'ready':next.tipped?'return':'tilt';
    return next;
  }
  function progress(trace){
    if(!trace||trace.invalid||trace.phase==='carry')return 0;
    if(trace.phase==='ready')return 1;
    return trace.tipped?.5+.45*(1-trace.tilt):.5*trace.tilt;
  }
  function finish(trace){
    if(trace&&!trace.invalid&&trace.phase==='ready')return {complete:true,action:'add50',message:'Release to add one 50 mL measure.'};
    var message=!trace||trace.phase==='carry'?'Carry the carton to the jug mouth.':trace.invalid?'Movement left the pouring path. Start a fresh pour.':trace.tipped?'Return upright over the jug mouth, then release.':'Tip the carton downward, then return it upright.';
    return {complete:false,action:null,message:message};
  }
  return {begin:begin,move:move,finish:finish,progress:progress};
});
