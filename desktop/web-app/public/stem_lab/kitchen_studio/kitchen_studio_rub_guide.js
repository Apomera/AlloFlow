/* A progress display for symbolic rub passes; it never changes a gesture. */
(function(root){
  'use strict';
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function point(value){return !!value&&finite(value.x)&&finite(value.y);}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
  function describe(kind,trace){
    if((kind!=='handwash'&&kind!=='dry')||!trace||trace.invalid!==false||!point(trace.start)||!point(trace.current)||!finite(trace.unit)||trace.unit<=0||!Number.isInteger(trace.passes)||trace.passes<0||trace.passes>3||!finite(trace.passTravel)||trace.passTravel<0||!finite(trace.rubEdge)||!finite(trace.rubDirection))return null;
    if(trace.passes===0?trace.rubDirection!==0:Math.abs(trace.rubDirection)!==1)return null;
    if(trace.passes<3?trace.phase!=='rub':kind==='handwash'?trace.phase!=='rinse'&&trace.phase!=='ready':trace.phase!=='ready')return null;
    if(kind==='dry'&&trace.kind!==undefined&&trace.kind!=='dry')return null;
    if(kind==='handwash'&&trace.kind!==undefined&&trace.kind!=='handwash')return null;
    var completed=trace.passes,stage=completed===3?(kind==='handwash'&&trace.phase==='rinse'?'rinse':'ready'):'rub';
    var direction='none',progress=1,puck=trace.rubDirection>0?1:0,nextX=null;
    if(stage==='rub'){
      if(completed===0){
        var dx=(trace.current.x-trace.start.x)/trace.unit;if(!finite(dx))return null;
        direction='either';progress=clamp(Math.abs(dx)/24,0,1);puck=.5+clamp(dx/24,-1,1)/2;
      }else{
        direction=trace.rubDirection>0?'left':'right';progress=clamp(trace.passTravel/24,0,1);puck=direction==='left'?1-progress:progress;
        nextX=trace.start.x+(trace.rubEdge-24*trace.rubDirection)*trace.unit;if(!finite(nextX))return null;
      }
    }
    var title=kind==='handwash'?'Handwash preview':'Drying preview';
    var instruction=stage==='rinse'?'Three model passes complete. Move the model hands under running water.':stage==='ready'?(kind==='handwash'?'Three model passes complete. Release under the water to model the wash.':'Three model passes complete. Release to finish drying.'):title+': '+completed+' of 3 model passes. '+(direction==='either'?'Sweep either way.':'Sweep '+direction+'.');
    return {stage:stage,completed:completed,total:3,direction:direction,progress:progress,puck:puck,nextX:nextX,instruction:instruction,title:title};
  }
  function mount(host){
    var doc=host.canvas.ownerDocument,guide=doc.getElementById('studioRubGuide'),title=doc.getElementById('studioRubTitle'),count=doc.getElementById('studioRubCount'),direction=doc.getElementById('studioRubDirection');
    var track=doc.getElementById('studioRubTrack'),dot=doc.getElementById('studioRubDot'),arrow=doc.getElementById('studioRubArrow'),passes=doc.getElementById('studioRubPasses'),disposed=false;
    var keys=['stage','completed','direction','progress','puck','nextX'];
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function clear(){
      guide.hidden=true;keys.forEach(function(key){delete guide.dataset[key];});text(title,'');text(count,'');text(direction,'');text(arrow,'');track.hidden=true;dot.style.left='';
      Array.from(passes.children).forEach(function(pass){pass.classList.remove('completed');});
      return null;
    }
    function update(kind,trace){
      if(disposed)return null;var model=describe(kind,trace);if(!model)return clear();
      guide.hidden=false;guide.dataset.stage=model.stage;guide.dataset.completed=String(model.completed);guide.dataset.direction=model.direction;guide.dataset.progress=String(model.progress);guide.dataset.puck=String(model.puck);
      if(model.nextX===null)delete guide.dataset.nextX;else guide.dataset.nextX=String(model.nextX);
      text(title,model.title);text(count,model.completed+' / 3 model passes');
      var label=model.stage==='rinse'?'Move under water':model.stage==='ready'?(kind==='handwash'?'Release under water':'Release to finish'):model.direction==='either'?'Either direction ↔':model.direction==='left'?'Sweep left ←':'Sweep right →';
      text(direction,label);text(arrow,model.direction==='either'?'↔':model.direction==='left'?'←':model.direction==='right'?'→':'');
      track.hidden=model.stage!=='rub';dot.style.left=(model.puck*100)+'%';Array.from(passes.children).forEach(function(pass,index){pass.classList.toggle('completed',index<model.completed);});
      return model;
    }
    guide.setAttribute('aria-hidden','true');clear();
    return {update:update,dispose:function(){if(disposed)return;clear();disposed=true;}};
  }
  var api={describe:describe,mount:mount};root.KitchenStudioRubGuide=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
