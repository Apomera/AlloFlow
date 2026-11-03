/* Plating reuses the carry, tip and return gesture without changing cooking evidence. */
(function(root,factory){
  'use strict';
  var commonJS=typeof module==='object'&&module.exports;
  var api=factory(commonJS?require('./kitchen_studio_pour.js'):root.KitchenStudioPour);
  if(commonJS)module.exports=api;
  else root.KitchenStudioPlating=api;
})(typeof window!=='undefined'?window:globalThis,function(P){
  'use strict';
  function begin(point,options){return P.begin(point,options);}
  function move(trace,point,plate){return P.move(trace,point,plate&&{over:plate.overPlate,anchor:plate.anchor});}
  function progress(trace){return P.progress(trace);}
  function finish(trace){
    if(P.finish(trace).complete)return {complete:true,action:'plate',message:'Release to plate the mushrooms and switch off the burner.'};
    var message=!trace||trace.phase==='carry'?'Carry the pan over the serving plate.':trace.invalid?'Movement left the plating path. Start again at the pan handle.':trace.tipped?'Level the pan over the plate, then release.':'Tip the pan downward, then level it again.';
    return {complete:false,action:null,message:message};
  }
  return {begin:begin,move:move,progress:progress,finish:finish};
});
