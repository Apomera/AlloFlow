/* Pure geometry and canvas composition for local screenshot review. */
(function (root) {
  'use strict';
  var FULL = { x: 0, y: 0, w: 1, h: 1 };
  function rect(value) {
    if (!value) return null;
    var x=Number(value.x), y=Number(value.y), w=Number(value.w), h=Number(value.h);
    if (![x,y,w,h].every(Number.isFinite) || w<=0 || h<=0) return null;
    var right=Math.min(1,x+w), bottom=Math.min(1,y+h);
    x=Math.max(0,x); y=Math.max(0,y); w=right-x; h=bottom-y;
    return w>=0.001 && h>=0.001 ? { x:x, y:y, w:w, h:h } : null;
  }
  function intersects(a,b) { return a.x < b.x+b.w && a.x+a.w > b.x && a.y < b.y+b.h && a.y+a.h > b.y; }
  function mapTarget(target, crop, masks) {
    target=rect(target); crop=rect(crop)||FULL;
    if(!target)return null;
    var mapped=rect({x:crop.x+target.x*crop.w,y:crop.y+target.y*crop.h,w:target.w*crop.w,h:target.h*crop.h});
    if(!mapped || (masks||[]).some(function(mask){return intersects(mapped,mask);}))return null;
    return mapped;
  }
  function compose(source, crop, masks) {
    crop=rect(crop)||FULL;
    // Align crop edges to the pixel grid, then expose that exact geometry to
    // target mapping. Redactions are opaque, and expanded outward to pixels.
    var sx=Math.floor(crop.x*source.width),sy=Math.floor(crop.y*source.height);
    var right=Math.min(source.width,Math.ceil((crop.x+crop.w)*source.width));
    var bottom=Math.min(source.height,Math.ceil((crop.y+crop.h)*source.height));
    var c=source.ownerDocument.createElement('canvas');c.width=Math.max(1,right-sx);c.height=Math.max(1,bottom-sy);
    var g=c.getContext('2d');g.drawImage(source,sx,sy,c.width,c.height,0,0,c.width,c.height);
    g.fillStyle='#000';
    (masks||[]).forEach(function(mask){
      var m=rect(mask);if(!m)return;
      var x=Math.floor(m.x*source.width)-sx,y=Math.floor(m.y*source.height)-sy;
      var r=Math.ceil((m.x+m.w)*source.width)-sx,b=Math.ceil((m.y+m.h)*source.height)-sy;
      g.fillRect(x,y,r-x,b-y);
    });
    return { canvas:c,crop:{x:sx/source.width,y:sy/source.height,w:c.width/source.width,h:c.height/source.height} };
  }
  var api={rect:rect,mapTarget:mapTarget,compose:compose,FULL:FULL};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.AlloCoachImageReview=api;
})(typeof window!=='undefined'?window:null);
