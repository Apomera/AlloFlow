/* Pan-local stirring previews; only finish returns an existing engine action. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KitchenStudioStir=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  var circle=Math.PI*2,required=circle-.35;
  function finite(point){return !!point&&typeof point.x==='number'&&typeof point.z==='number'&&Number.isFinite(point.x)&&Number.isFinite(point.z);}
  function nearStart(point,tolerance){return Math.hypot(point.x+.23,point.z)<=tolerance;}
  function copy(point){return {x:point.x,z:point.z};}
  function begin(point){
    if(!finite(point))return null;
    var entered=nearStart(point,.065);
    return {phase:entered?'stir':'carry',invalid:false,current:copy(point),lastAngle:entered?Math.atan2(point.z,point.x):null,travel:0,direction:0,opposed:0};
  }
  function move(trace,point){
    if(!trace)return null;
    var next=Object.assign({},trace);
    if(trace.invalid)return next;
    if(!finite(point)){next.invalid=true;next.phase='invalid';return next;}
    next.current=copy(point);
    if(trace.phase==='carry'){
      if(nearStart(point,.065)){next.phase='stir';next.lastAngle=Math.atan2(point.z,point.x);}
      return next;
    }
    var radius=Math.hypot(point.x,point.z),angle=Math.atan2(point.z,point.x),delta=angle-trace.lastAngle;
    while(delta>Math.PI)delta-=circle;
    while(delta<-Math.PI)delta+=circle;
    if(radius<.07||radius>.46||Math.abs(delta)>.95){next.invalid=true;next.phase='invalid';return next;}
    next.lastAngle=angle;next.travel=trace.travel+delta;
    if(!next.direction&&Math.abs(next.travel)>.02)next.direction=next.travel<0?-1:1;
    if(next.direction&&delta*next.direction<0)next.opposed+=Math.abs(delta);
    if(next.opposed>.25){next.invalid=true;next.phase='invalid';return next;}
    next.phase=Math.abs(next.travel)>=required&&nearStart(point,.075)?'ready':'stir';
    return next;
  }
  function progress(trace){return !trace||trace.invalid?0:Math.min(1,Math.abs(trace.travel)/required);}
  function finish(trace){
    if(trace&&!trace.invalid&&trace.phase==='ready')return {complete:true,action:'advance',message:'Release to stir and advance 30 simulated seconds.'};
    var message=!trace||trace.phase==='carry'?'Move the spatula to the start ring.':trace.invalid?'Movement left the stirring path. Start a fresh circle.':progress(trace)===1?'Return to the start ring, then release.':'Follow the circle back to the start ring, then release.';
    return {complete:false,action:null,message:message};
  }
  return {begin:begin,move:move,progress:progress,finish:finish};
});
