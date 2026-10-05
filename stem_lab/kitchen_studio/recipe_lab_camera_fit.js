/* Frame working surfaces without including the decorative floor or tiled wall. */
(function(root){
  'use strict';
  var workingBounds={min:{x:-3.5,y:1.05,z:-1.9},max:{x:4.9,y:2.35,z:1.75}},center={x:.7,y:1.7,z:-.075};
  function finite(n){return typeof n==='number'&&Number.isFinite(n);}
  function copy(v){return {x:v.x,y:v.y,z:v.z};}
  function dot(a,b){return a.x*b.x+a.y*b.y+a.z*b.z;}
  function cross(a,b){return {x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x};}
  function unit(v){var length=Math.hypot(v.x,v.y,v.z);return {x:v.x/length,y:v.y/length,z:v.z/length};}
  function vector(v,fallback){return v&&finite(v.x)&&finite(v.y)&&finite(v.z)?copy(v):copy(fallback);}
  function corners(bounds){
    bounds=bounds||workingBounds;var out=[];
    [bounds.min.x,bounds.max.x].forEach(function(x){[bounds.min.y,bounds.max.y].forEach(function(y){[bounds.min.z,bounds.max.z].forEach(function(z){out.push({x:x,y:y,z:z});});});});
    return out;
  }
  function validBounds(bounds){return bounds&&bounds.min&&bounds.max&&['x','y','z'].every(function(k){return finite(bounds.min[k])&&finite(bounds.max[k])&&bounds.min[k]<=bounds.max[k];});}
  function fit(options){
    options=options||{};var aspect=finite(options.aspect)&&options.aspect>0?options.aspect:1,fov=finite(options.fov)&&options.fov>1&&options.fov<179?options.fov:38;
    var fill=finite(options.fill)&&options.fill>0&&options.fill<1?options.fill:.9,bounds=validBounds(options.bounds)?options.bounds:workingBounds,target=vector(options.target,center);
    var back=vector(options.direction,options.view==='top'?{x:.01,y:6.75,z:.55}:{x:6,y:4.6,z:7});
    if(Math.hypot(back.x,back.y,back.z)<.000001)back={x:6,y:4.6,z:7};back=unit(back);
    var right=cross({x:0,y:1,z:0},back);if(Math.hypot(right.x,right.y,right.z)<.000001)right=cross({x:0,y:0,z:1},back);right=unit(right);
    var up=unit(cross(back,right)),tan=Math.tan(fov*Math.PI/360),distance=2.8;
    corners(bounds).forEach(function(point){var relative={x:point.x-target.x,y:point.y-target.y,z:point.z-target.z},depth=dot(relative,back);
      distance=Math.max(distance,depth+.2,depth+Math.abs(dot(relative,right))/(tan*aspect*fill),depth+Math.abs(dot(relative,up))/(tan*fill));
    });
    return {target:target,position:{x:target.x+back.x*distance,y:target.y+back.y*distance,z:target.z+back.z*distance},distance:distance,
      maxDistance:Math.max(13,distance+Math.max(3,distance*.15)),aspect:aspect,fov:fov,fill:fill,right:right,up:up,back:back};
  }
  function project(framing,point){
    var relative={x:point.x-framing.target.x,y:point.y-framing.target.y,z:point.z-framing.target.z},depth=framing.distance-dot(relative,framing.back),tan=Math.tan(framing.fov*Math.PI/360);
    return {x:dot(relative,framing.right)/(depth*tan*framing.aspect),y:dot(relative,framing.up)/(depth*tan),depth:depth};
  }
  var api={fit:fit,project:project,corners:corners};root.KitchenCameraFit=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
