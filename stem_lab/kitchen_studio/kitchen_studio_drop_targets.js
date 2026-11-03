/* Destination markers describe physical choices; the existing release judges them. */
(function(root){
  'use strict';
  var actions={prepare:{prepare:'prepBoardTarget'},mat:{secure:'boardMat'},spatula:{spread:'panEdge',crowd:'panCenter'},spread:{spread:'panEdge'},plate:{plate:'servingPlate'},stock:{add150:'jugFill'},probe:{thick:'probeCenter',surface:'probeSurface'},chicken:{cook:'ovenDrop',serve:'serveDrop'},store:{shallow:'shallowTray',chill:'fridge',discard:'wasteBin'},label:{label:'containerTarget'}};
  function owns(object,key){return Object.prototype.hasOwnProperty.call(object,key);}
  function supports(kind){return typeof kind==='string'&&owns(actions,kind);}
  function activeTarget(kind,destination){return supports(kind)&&destination&&typeof destination.action==='string'&&owns(actions[kind],destination.action)?actions[kind][destination.action]:null;}
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function point(value){return !!value&&finite(value.x)&&finite(value.y);}
  function box(value){return !!value&&finite(value.x)&&finite(value.y)&&finite(value.width)&&finite(value.height)&&value.width>0&&value.height>0&&finite(value.x+value.width)&&finite(value.y+value.height);}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function end(anchor,card){
    var x=clamp(anchor.x,card.x,card.x+card.width),y=clamp(anchor.y,card.y,card.y+card.height);
    if(anchor.x>=card.x&&anchor.x<=card.x+card.width&&anchor.y>=card.y&&anchor.y<=card.y+card.height){
      var distances=[anchor.x-card.x,card.x+card.width-anchor.x,anchor.y-card.y,card.y+card.height-anchor.y],side=distances.indexOf(Math.min.apply(Math,distances));
      if(side===0)x=card.x;else if(side===1)x=card.x+card.width;else if(side===2)y=card.y;else y=card.y+card.height;
    }
    return {x:x,y:y};
  }
  function overlap(a,b,padding){
    var width=Math.min(a.x+a.width,b.x+b.width+padding)-Math.max(a.x,b.x-padding),height=Math.min(a.y+a.height,b.y+b.height+padding)-Math.max(a.y,b.y-padding);
    return width>0&&height>0?10000000+1000000*(width/Math.max(1,a.width))*(height/Math.max(1,a.height)):0;
  }
  function layout(options){
    if(!options||!finite(options.width)||!finite(options.height)||options.width<=16||options.height<=16||!Array.isArray(options.targets))return [];
    var width=options.width,height=options.height,seen=Object.create(null),targets=[];
    options.targets.forEach(function(target){
      if(!target||typeof target.id!=='string'||!target.id.trim()||owns(seen,target.id)||!point(target.point)||target.point.x<0||target.point.x>width||target.point.y<0||target.point.y>height||!finite(target.width)||!finite(target.height)||target.width<=0||target.height<=0)return;
      seen[target.id]=true;targets.push({id:target.id,point:{x:target.point.x,y:target.point.y},width:Math.min(target.width,width-16),height:Math.min(target.height,height-16)});
    });
    var avoid=Array.isArray(options.avoid)?options.avoid.filter(box):[],beam=[{score:0,cards:[]}];
    targets.forEach(function(target){
      var right=width-8-target.width,bottom=height-8-target.height,candidates=[],unique=Object.create(null),anchor=target.point;
      function put(x,y,fallback){
        if(!finite(x)||!finite(y))return;
        x=clamp(x,8,right);y=clamp(y,8,bottom);var key=x+','+y;if(owns(unique,key))return;unique[key]=true;
        var card={x:x,y:y,width:target.width,height:target.height},edge=end(anchor,card),scale=Math.max(width,height),cost=100*Math.hypot((edge.x-anchor.x)/scale,(edge.y-anchor.y)/scale)+(fallback?10:0)+candidates.length*.0001;
        avoid.forEach(function(value){cost+=overlap(card,value,4);});
        targets.forEach(function(other){if(other.point.x>card.x-3&&other.point.x<card.x+card.width+3&&other.point.y>card.y-3&&other.point.y<card.y+card.height+3)cost+=20000;});
        candidates.push({card:card,cost:cost});
      }
      put(anchor.x-target.width/2,anchor.y-12-target.height);put(anchor.x-target.width/2,anchor.y+12);put(anchor.x+12,anchor.y-target.height/2);put(anchor.x-12-target.width,anchor.y-target.height/2);
      [0,.25,.5,.75,1].forEach(function(x){[0,.25,.5,.75,1].forEach(function(y){put(8+(right-8)*x,8+(bottom-8)*y,true);});});
      avoid.forEach(function(value){
        var left=value.x-target.width-8,after=value.x+value.width+8,above=value.y-target.height-8,below=value.y+value.height+8;
        put(left,anchor.y-target.height/2,true);put(after,anchor.y-target.height/2,true);put(anchor.x-target.width/2,above,true);put(anchor.x-target.width/2,below,true);
        put(left,above,true);put(left,below,true);put(after,above,true);put(after,below,true);
      });
      var next=[];
      beam.forEach(function(state){candidates.forEach(function(candidate){var score=state.score+candidate.cost;state.cards.forEach(function(prior){score+=overlap(candidate.card,prior.card,4);});next.push({score:score,cards:state.cards.concat([{id:target.id,card:candidate.card,leader:{start:{x:anchor.x,y:anchor.y},end:end(anchor,candidate.card)}}])});});});
      next.sort(function(a,b){return a.score-b.score;});beam=next.slice(0,24);
    });
    return beam[0]?beam[0].cards:[];
  }
  function mount(host){
    var canvas=host.canvas,doc=canvas.ownerDocument,win=doc.defaultView||root,overlay=doc.getElementById('studioDropTargets'),svg=doc.getElementById('studioDropLeaders'),entries=new Map(),disposed=false;
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function remove(id){var entry=entries.get(id);if(!entry)return;entry.card.remove();entry.group.remove();entries.delete(id);}
    function clear(){Array.from(entries.keys()).forEach(remove);overlay.hidden=true;delete overlay.dataset.active;svg.removeAttribute('viewBox');return [];}
    function create(id){
      var card=doc.createElement('div'),title=doc.createElement('strong'),detail=doc.createElement('small');card.className='studio-drop-label';card.dataset.dropTarget=id;card.setAttribute('aria-hidden','true');card.style.pointerEvents='none';card.append(title,detail);overlay.appendChild(card);
      var group=doc.createElementNS('http://www.w3.org/2000/svg','g'),line=doc.createElementNS('http://www.w3.org/2000/svg','line'),dot=doc.createElementNS('http://www.w3.org/2000/svg','circle');group.dataset.dropAnchor=id;group.style.pointerEvents='none';dot.setAttribute('r','3.5');group.append(line,dot);svg.appendChild(group);
      var entry={card:card,title:title,detail:detail,group:group,line:line,dot:dot};entries.set(id,entry);return entry;
    }
    function obstacles(bounds){
      return (Array.isArray(host.avoidElements)?host.avoidElements:[]).reduce(function(result,node){
        if(!node||!node.getBoundingClientRect||!node.getClientRects||!node.getClientRects().length)return result;
        for(var parent=node;parent;parent=parent.parentElement)if(parent.hidden)return result;
        var style=win.getComputedStyle(node);if(style.display==='none'||style.visibility==='hidden')return result;
        var measured=node.getBoundingClientRect(),value={x:measured.left-bounds.left,y:measured.top-bounds.top,width:measured.width,height:measured.height};
        if(box(value)&&value.x<bounds.width&&value.y<bounds.height&&value.x+value.width>0&&value.y+value.height>0)result.push(value);return result;
      },[]);
    }
    function render(data){
      if(disposed)return [];
      var bounds=canvas.getBoundingClientRect();if(!data||!Array.isArray(data.targets)||!finite(bounds.width)||!finite(bounds.height)||bounds.width<=16||bounds.height<=16)return clear();
      var valid=[],ids=Object.create(null),width=bounds.width,height=bounds.height;
      data.targets.forEach(function(target){if(!target||typeof target.id!=='string'||!target.id.trim()||owns(ids,target.id)||typeof target.label!=='string'||!target.label.trim()||!point(target.point)||target.point.x<0||target.point.x>width||target.point.y<0||target.point.y>height)return;ids[target.id]=true;valid.push(target);});
      Array.from(entries.keys()).forEach(function(id){if(!owns(ids,id))remove(id);});if(!valid.length)return clear();
      var active=typeof data.active==='string'&&owns(ids,data.active)?data.active:'';overlay.hidden=false;
      var sizes=valid.map(function(target){
        var entry=entries.get(target.id)||create(target.id);text(entry.title,target.label);text(entry.detail,target.id===active?'Release here':'Destination');entry.card.dataset.active=String(target.id===active);entry.group.dataset.active=String(target.id===active);
        entry.card.style.width='';entry.card.style.height='';entry.card.style.minWidth=Math.min(100,width-16)+'px';entry.card.style.maxWidth=Math.min(150,width-16)+'px';entry.card.style.maxHeight=(height-16)+'px';
        var measured=entry.card.getBoundingClientRect();return {id:target.id,point:target.point,width:Math.min(150,measured.width),height:measured.height};
      });
      var avoid=obstacles(bounds).concat(Array.isArray(data.avoid)?data.avoid:[]),result=layout({width:width,height:height,targets:sizes,avoid:avoid}),drawn=Object.create(null);
      result.forEach(function(value){
        drawn[value.id]=true;var entry=entries.get(value.id),card=value.card,line=entry.line,dot=entry.dot;entry.card.style.left=card.x+'px';entry.card.style.top=card.y+'px';entry.card.style.width=card.width+'px';entry.card.style.height=card.height+'px';
        line.setAttribute('x1',String(value.leader.start.x));line.setAttribute('y1',String(value.leader.start.y));line.setAttribute('x2',String(value.leader.end.x));line.setAttribute('y2',String(value.leader.end.y));dot.setAttribute('cx',String(value.leader.start.x));dot.setAttribute('cy',String(value.leader.start.y));
      });
      Array.from(entries.keys()).forEach(function(id){if(!owns(drawn,id))remove(id);});if(!result.length)return clear();
      overlay.dataset.active=active&&owns(drawn,active)?active:'';svg.setAttribute('viewBox','0 0 '+width+' '+height);return result;
    }
    overlay.setAttribute('aria-hidden','true');overlay.style.pointerEvents='none';svg.style.pointerEvents='none';clear();
    return {render:render,clear:clear,dispose:function(){if(disposed)return;clear();disposed=true;}};
  }
  var api={supports:supports,activeTarget:activeTarget,layout:layout,mount:mount};root.KitchenStudioDropTargets=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
