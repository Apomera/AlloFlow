/* Discovery labels follow the projected tool; they never handle an action. */
(function(root){
  'use strict';
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function point(value){return !!value&&finite(value.x)&&finite(value.y);}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function edge(anchor,card){
    var x=clamp(anchor.x,card.x,card.x+card.width),y=clamp(anchor.y,card.y,card.y+card.height);
    if(anchor.x>=card.x&&anchor.x<=card.x+card.width&&anchor.y>=card.y&&anchor.y<=card.y+card.height){
      var distances=[anchor.x-card.x,card.x+card.width-anchor.x,anchor.y-card.y,card.y+card.height-anchor.y],side=distances.indexOf(Math.min.apply(Math,distances));
      if(side===0)x=card.x;else if(side===1)x=card.x+card.width;else if(side===2)y=card.y;else y=card.y+card.height;
    }
    return {x:x,y:y};
  }
  function layout(options){
    if(!options||!finite(options.width)||!finite(options.height)||options.width<=16||options.height<=16||!point(options.anchor)||options.anchor.x<0||options.anchor.x>options.width||options.anchor.y<0||options.anchor.y>options.height||!finite(options.cardWidth)||!finite(options.cardHeight)||options.cardWidth<=0||options.cardHeight<=0)return null;
    var margin=8,gap=18;
    var width=Math.min(options.cardWidth,options.width-margin*2),height=Math.min(options.cardHeight,options.height-margin*2),anchor=options.anchor;
    var right=options.width-margin-width,bottom=options.height-margin-height;if(!finite(right)||!finite(bottom)||right<margin||bottom<margin)return null;
    function card(x,y){return {x:x,y:y,width:width,height:height};}
    var candidates=[card(anchor.x+gap,clamp(anchor.y-height/2,margin,bottom)),card(anchor.x-gap-width,clamp(anchor.y-height/2,margin,bottom)),card(clamp(anchor.x-width/2,margin,right),anchor.y-gap-height),card(clamp(anchor.x-width/2,margin,right),anchor.y+gap)];
    var chosen=candidates.find(function(value){return value.x>=margin&&value.y>=margin&&value.x<=right&&value.y<=bottom;});
    if(!chosen){
      var corners=[card(margin,margin),card(right,margin),card(margin,bottom),card(right,bottom)];
      function contains(value){return anchor.x>value.x&&anchor.x<value.x+value.width&&anchor.y>value.y&&anchor.y<value.y+value.height;}
      var outside=corners.filter(function(value){return !contains(value);}),choices=outside.length?outside:corners;
      choices.sort(function(a,b){var ae=edge(anchor,a),be=edge(anchor,b);return Math.hypot(ae.x-anchor.x,ae.y-anchor.y)-Math.hypot(be.x-anchor.x,be.y-anchor.y);});chosen=choices[0];
    }
    return {card:chosen,leader:{start:{x:anchor.x,y:anchor.y},end:edge(anchor,chosen)}};
  }
  function mount(host){
    var canvas=host.canvas,doc=canvas.ownerDocument,overlay=doc.getElementById('studioDiscovery'),card=doc.getElementById('studioDiscoveryCard'),title=doc.getElementById('studioDiscoveryTitle'),hint=doc.getElementById('studioDiscoveryHint'),badge=doc.getElementById('studioDiscoveryBadge');
    var leader=doc.getElementById('studioDiscoveryLeader'),line=doc.getElementById('studioDiscoveryLine'),dot=doc.getElementById('studioDiscoveryDot'),disposed=false;
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function clear(){
      overlay.hidden=true;['tool','readOnly','anchorX','anchorY'].forEach(function(key){delete overlay.dataset[key];});text(title,'');text(hint,'');text(badge,'');
      ['left','top','width','height','maxWidth','maxHeight'].forEach(function(key){card.style[key]='';});leader.removeAttribute('viewBox');['x1','y1','x2','y2'].forEach(function(key){line.removeAttribute(key);});['cx','cy'].forEach(function(key){dot.removeAttribute(key);});return null;
    }
    function render(data){
      if(disposed)return null;
      if(!data||typeof data.id!=='string'||!data.id.trim()||typeof data.name!=='string'||!data.name.trim()||typeof data.hint!=='string'||!point(data.point)||(data.readOnly!==undefined&&typeof data.readOnly!=='boolean'))return clear();
      var bounds=canvas.getBoundingClientRect(),width=bounds.width,height=bounds.height;
      if(!finite(width)||!finite(height)||width<=16||height<=16||data.point.x<0||data.point.x>width||data.point.y<0||data.point.y>height)return clear();
      text(title,data.name);text(hint,data.hint);text(badge,data.readOnly?'Read-only view':'3D tool');
      card.style.width='';card.style.height='';card.style.maxWidth=Math.min(250,width-16)+'px';card.style.maxHeight=(height-16)+'px';overlay.hidden=false;
      var measured=card.getBoundingClientRect(),result=layout({width:width,height:height,anchor:data.point,cardWidth:Math.min(measured.width,250),cardHeight:measured.height});if(!result)return clear();
      card.style.left=result.card.x+'px';card.style.top=result.card.y+'px';card.style.width=result.card.width+'px';if(measured.height>result.card.height)card.style.height=result.card.height+'px';
      overlay.dataset.tool=data.id;overlay.dataset.readOnly=String(!!data.readOnly);overlay.dataset.anchorX=String(data.point.x);overlay.dataset.anchorY=String(data.point.y);
      leader.setAttribute('viewBox','0 0 '+width+' '+height);line.setAttribute('x1',String(result.leader.start.x));line.setAttribute('y1',String(result.leader.start.y));line.setAttribute('x2',String(result.leader.end.x));line.setAttribute('y2',String(result.leader.end.y));dot.setAttribute('cx',String(data.point.x));dot.setAttribute('cy',String(data.point.y));return result;
    }
    overlay.setAttribute('aria-hidden','true');overlay.style.pointerEvents='none';clear();
    return {render:render,clear:clear,dispose:function(){if(disposed)return;clear();disposed=true;}};
  }
  var api={layout:layout,mount:mount};root.KitchenStudioDiscovery=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
