/* Stream width follows tilt without changing a measure or a pouring gesture. */
(function(root){
  'use strict';
  function width(tilt){
    if(typeof tilt!=='number'||!Number.isFinite(tilt)||tilt<=.4)return 0;
    if(tilt>=1)return 1;
    var fraction=(tilt-.4)/.6;
    return Math.min(1,Math.sqrt(fraction*fraction*(3-2*fraction)));
  }
  var api={width:width};root.KitchenStudioPourFlow=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
