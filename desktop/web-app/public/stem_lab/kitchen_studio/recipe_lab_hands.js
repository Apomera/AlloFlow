/* Direct-manipulation geometry. No timers or kitchen state live in this module. */
(function(root){
  'use strict';
  function knifeStart(x,y,widths){
    if(!Number.isFinite(x)||!Number.isFinite(y)||y<8||y>40)return null;
    var offset=30;
    for(var i=0;i<widths.length;i++){
      var end=offset+widths[i]*10,position=Math.round((x-offset)/10);
      if(x>=offset&&x<end&&position>0&&position<widths[i])return {x:x,y:y,index:i,position:position,valid:true,complete:false};
      offset=end;
    }
    return null;
  }
  function knifeMove(stroke,x,y){
    if(!stroke)return null;
    return Object.assign({},stroke,{valid:stroke.valid&&Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-stroke.x)<=12&&y>=stroke.y-8,complete:y>=108,y:Math.max(stroke.y,y)});
  }
  function knifeValue(stroke){return stroke&&stroke.valid&&stroke.complete?stroke.index+':'+stroke.position:null;}
  // Discard sub-dose remainder when the jug is returned upright. Cap wall time
  // so a suspended tab cannot empty a jug when its animation frame resumes.
  function pourStep(remainder,tilt,elapsed,available){
    if(![remainder,tilt,elapsed,available].every(Number.isFinite))return {remainder:0,amount:0};
    if(tilt<20||available<10)return {remainder:0,amount:0};
    var volume=Math.max(0,remainder)+Math.min(100,Math.max(0,elapsed))/1000*(10+Math.min(60,tilt-20));
    var amount=Math.min(10,Math.floor(volume/10)*10,Math.floor(available/10)*10);
    return {remainder:Math.min(10,volume-amount),amount:amount};
  }
  function transferAction(item,target){
    var pairs={water:{pot:'fill'},oil:{pan:'oil'},produce:{pan:'produce'},garlic:{pan:'garlic'},pasta:{pot:'pasta'},cooked:{pan:'combine'},pan:{plate:'plate'},pot:{colander:'drain'},cup:{pot:'reserve'},spoon:{pot:'sample',pan:'taste'}};
    return pairs[item]&&pairs[item][target]||null;
  }
  var api={knifeStart:knifeStart,knifeMove:knifeMove,knifeValue:knifeValue,pourStep:pourStep,transferAction:transferAction};
  root.KitchenHands=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
