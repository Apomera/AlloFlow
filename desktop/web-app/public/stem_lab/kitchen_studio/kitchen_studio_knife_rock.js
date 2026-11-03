/* Visual blade rocking follows depth without changing a cutting decision. */
(function(root){
  'use strict';
  function angle(depth){
    if(typeof depth!=='number'||!Number.isFinite(depth))return 0;
    if(depth<=0)return .24;
    if(depth>=1)return 0;
    return Math.max(0,.24*(1-depth*depth*(3-2*depth)));
  }
  var api={angle:angle};root.KitchenStudioKnifeRock=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
