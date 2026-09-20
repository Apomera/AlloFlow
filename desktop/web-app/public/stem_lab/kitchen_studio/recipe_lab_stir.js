/* A completed circular gesture is an input choice, not an assessment of dexterity. */
(function(root){'use strict';
function start(angle){return {angle:Number.isFinite(angle)?angle:null,travel:0,complete:false};}
function move(s,angle,inRing){if(s.complete)return s;if(!inRing||!Number.isFinite(angle))return start(null);if(s.angle===null)return start(angle);var delta=Math.atan2(Math.sin(angle-s.angle),Math.cos(angle-s.angle));if(Math.abs(delta)>Math.PI/2)return start(angle);var travel=s.travel+delta;return {angle:angle,travel:travel,complete:Math.abs(travel)>=2*Math.PI-.035};}
var api={start:start,move:move};root.KitchenStirGesture=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
