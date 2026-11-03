/* Reversible food contact adds a local visual response to a stirring preview. */
(function(root){
  'use strict';
  var rim=.335,reach=.20;
  function point(value){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Number.isFinite(value.x)&&Number.isFinite(value.z);}
  function copy(value){return {x:value.x,z:value.z};}
  function ease(value){return value*value*(3-2*value);}
  function layout(points,blade,travel){
    if(!Array.isArray(points)||Array.from(points).some(function(value){return !point(value)||Math.hypot(value.x,value.z)>rim+1e-12;}))return [];
    var result=points.map(copy),radius=point(blade)?Math.hypot(blade.x,blade.z):0;
    if(!Number.isFinite(travel)||!point(blade)||radius<.07||radius>.46||travel===0)return result;
    var strength=ease(Math.min(1,Math.abs(travel)/.12)),direction=travel<0?-1:1;
    var tangentX=-blade.z/radius*direction,tangentZ=blade.x/radius*direction;
    return result.map(function(value){
      var dx=value.x-blade.x,dz=value.z-blade.z,distance=Math.hypot(dx,dz);
      if(distance>=reach)return value;
      var amount=ease(1-distance/reach)*strength;
      var normalScale=Math.max(distance,.04),normalX=dx/normalScale,normalZ=dz/normalScale;
      var x=value.x+amount*(tangentX*.065+normalX*.025),z=value.z+amount*(tangentZ*.065+normalZ*.025),nextRadius=Math.hypot(x,z);
      if(nextRadius>rim){x*=rim/nextRadius;z*=rim/nextRadius;}
      return {x:x,z:z};
    });
  }
  var api={layout:layout};root.KitchenStudioStirContact=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
