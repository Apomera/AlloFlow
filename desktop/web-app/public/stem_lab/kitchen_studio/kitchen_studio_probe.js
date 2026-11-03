/* View-only probe geometry; cooking evidence stays in the engine. */
(function(root,factory){
  'use strict';
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.KitchenStudioProbe=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function point(x,y,z){return Object.freeze({x:x,y:y,z:z});}
  function pose(placement,served){
    if(served||(placement!=='thick'&&placement!=='surface'))return Object.freeze({shaft:point(.46,1.76,.24),display:point(.46,1.99,.24),tip:point(.46,1.54,.24),rotationZ:0});
    var rotationZ=placement==='surface'?-.6:0;
    var tip=point(placement==='surface'?.3105:0,1.56,0);
    var axisX=-Math.sin(rotationZ),axisY=Math.cos(rotationZ);
    return Object.freeze({shaft:point(tip.x+axisX*.22,tip.y+axisY*.22,tip.z),display:point(tip.x+axisX*.47,tip.y+axisY*.47,tip.z),tip:tip,rotationZ:rotationZ});
  }
  return Object.freeze({pose:pose});
});
