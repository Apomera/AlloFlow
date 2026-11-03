/* Insertion previews change the view; placement remains an explicit engine action. */
(function(root){
  'use strict';
  function mount(host){
    var doc=host.canvas.ownerDocument,win=doc.defaultView||root,T=host.THREE,camera=host.camera,controls=host.controls;
    var section=doc.getElementById('studioProbeView'),opener=doc.getElementById('studioProbeOpen'),panel=doc.getElementById('studioProbePanel'),closer=doc.getElementById('studioProbeClose');
    var input=doc.getElementById('studioProbeDepth'),label=doc.getElementById('studioProbeDepthLabel'),place=doc.getElementById('studioProbePlace'),reset=doc.getElementById('studioProbeReset'),readout=doc.getElementById('studioProbeDepthReadout');
    var options={active:false,visible:true,available:false,locked:false,historical:false,values:{},revision:null},opened=false,saved=null,override=null,disposed=false,listeners=[];
    var controlKeys=['enabled','enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'],points=[];
    [1.12,2.30].forEach(function(x){[1.35,2.33].forEach(function(y){[-1.33,-.30].forEach(function(z){points.push(new T.Vector3(x,y,z));});});});
    function on(target,type,fn){target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function available(){return options.active&&options.visible&&options.available;}
    function baseline(){return options.values&&options.values.probe==='thick'?1:0;}
    function depth(){return override===null?baseline():override;}
    function action(value){return value<=.08?'surface':value>=.92?'thick':null;}
    function notify(){host.onDepthPreview(depth(),opened&&override!==null);}
    function refresh(){
      var current=depth(),choice=action(current),isPreview=opened&&override!==null,enabled=opened&&available()&&!options.locked;
      section.hidden=!options.active||!options.visible;panel.hidden=!opened;
      opener.disabled=!available();opener.setAttribute('aria-expanded',String(opened));
      input.disabled=!enabled;input.value=String(Math.round(current*100));
      var position=choice==='surface'?'Surface marker':choice==='thick'?'Centre marker':'Between markers';
      text(label,position+' · '+Math.round(current*100)+' of 100');input.setAttribute('aria-valuetext',position+', '+Math.round(current*100)+' of 100');
      text(place,'Place sensing tip here');place.disabled=!enabled||!isPreview||!choice;reset.disabled=!opened||override===null;
      var v=options.values||{},placed=v.probe==='thick'?'Placed at the centre marker.':v.probe==='surface'?'Placed at the surface marker.':'Not placed.';
      var description=(options.historical?'Recorded probe: ':'Probe: ')+placed;
      if(isPreview)description='Placement preview: '+(choice==='thick'?'Near the centre marker.':choice==='surface'?'Near the surface marker.':'Between the surface and centre markers.')+' '+(choice?'Place the tip, then take a fresh reading.':'Move to a marker before placing the tip.');
      else if(!options.historical&&!options.locked)description+=' Drag the display or adjust the depth to preview placement.';
      text(readout,description);
      host.canvas.dataset.probeInspection=String(opened);host.canvas.dataset.probeDepth=String(current);host.canvas.dataset.probeDepthPreview=String(isPreview);
    }
    function frame(){
      if(!opened)return;
      controls.target.set(1.65,1.79,-.85);camera.position.copy(controls.target).add(new T.Vector3(-.25,.60,2.2));
      camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
      var extentX=0,extentY=0;points.forEach(function(point){var p=point.clone().project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));});
      camera.zoom=Math.min(3.6,.84/extentX,.80/extentY);camera.updateProjectionMatrix();host.draw();
    }
    function preview(value){
      if(disposed)return false;
      if(value!==null&&(!opened||!available()||options.locked||typeof value!=='number'||!Number.isFinite(value)||value<0||value>1))return false;
      override=value;refresh();notify();return true;
    }
    function open(){
      if(disposed||opened||!available())return;host.cancel();
      saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,target:controls.target.clone()};
      controlKeys.forEach(function(key){saved[key]=controls[key];});
      opened=true;override=null;controls.enableRotate=false;controls.enableZoom=false;controls.minDistance=0;controls.maxDistance=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
      host.onViewChange(true);refresh();notify();frame();
    }
    function close(){
      if(!opened)return;host.cancel();opened=false;override=null;
      controlKeys.forEach(function(key){controls[key]=saved[key];});controls.target.copy(saved.target);camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.updateProjectionMatrix();controls.update();camera.quaternion.copy(saved.quaternion);saved=null;
      host.onViewChange(false);refresh();notify();host.draw();
    }
    function update(next){
      if(disposed)return;
      var changed=!!next&&'revision' in next&&next.revision!==options.revision;
      if(opened&&(changed||next&&next.locked&&!options.locked))host.cancel();
      Object.assign(options,next||{});if(changed||options.locked)override=null;
      if(!available())close();refresh();if(opened)notify();
    }
    on(opener,'click',function(){if(opened)close();else open();});
    on(closer,'click',function(){close();opener.focus({preventScroll:true});});
    on(input,'input',function(){if(!opened||!available()||options.locked)return;host.cancel();preview(Number(input.value)/100);});
    on(reset,'click',function(){if(!opened||override===null)return;host.cancel();preview(null);});
    on(place,'click',function(){
      var choice=action(depth());if(!opened||!available()||options.locked||override===null||!choice)return;
      host.cancel();override=null;refresh();notify();host.place(choice);
    });
    on(doc,'keydown',function(event){
      if(event.key!=='Escape'||event.defaultPrevented||!opened)return;event.preventDefault();
      if(override!==null){host.cancel();preview(null);}else{close();opener.focus({preventScroll:true});}
    });
    on(doc,'visibilitychange',function(){if(doc.hidden)close();});on(win,'pagehide',close);
    refresh();
    return {open:open,close:close,update:update,resize:function(){if(!opened||disposed)return;host.cancel();override=null;refresh();notify();frame();},isOpen:function(){return opened;},preview:preview,isPreviewing:function(){return opened&&override!==null;},getDepth:depth,dispose:function(){if(disposed)return;close();disposed=true;listeners.forEach(function(remove){remove();});}};
  }
  root.KitchenStudioProbeView={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioProbeView;
})(typeof window!=='undefined'?window:globalThis);
