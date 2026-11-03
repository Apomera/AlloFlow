/* Container inspection changes the camera, never storage evidence. */
(function(root){
  'use strict';
  function mount(host){
    var doc=host.canvas.ownerDocument,win=doc.defaultView||root,T=host.THREE,camera=host.camera,controls=host.controls;
    var section=doc.getElementById('studioContainerView'),opener=doc.getElementById('studioContainerInspect'),panel=doc.getElementById('studioContainerPanel'),closer=doc.getElementById('studioContainerClose');
    var options={active:false,visible:true,available:false,revision:null},opened=false,saved=null,disposed=false,listeners=[];
    var controlKeys=['enabled','enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'];
    function on(target,type,fn){target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function refresh(){
      section.hidden=!options.active||!options.visible;panel.hidden=!opened;
      opener.disabled=!options.active||!options.visible||!options.available;opener.setAttribute('aria-expanded',String(opened));
      host.canvas.dataset.containerInspection=String(opened);
    }
    function frame(){
      if(!opened)return;
      var bounds=host.getFrame(),target=bounds.target;
      controls.target.copy(target);camera.position.copy(target).add(new T.Vector3(.18,1.05,1.8));
      camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
      var extentX=0,extentY=0;
      bounds.points.forEach(function(point){var p=point.clone().project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));});
      camera.zoom=Math.min(3.6,.86/extentX,.80/extentY);camera.updateProjectionMatrix();
      host.canvas.dataset.containerViewZoom=String(camera.zoom);host.draw();
    }
    function open(){
      if(disposed||opened||!options.active||!options.visible||!options.available)return;
      host.cancel();
      saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,target:controls.target.clone()};
      controlKeys.forEach(function(key){saved[key]=controls[key];});
      opened=true;controls.enableRotate=false;controls.enableZoom=false;controls.minDistance=0;controls.maxDistance=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
      host.onViewChange(true);refresh();frame();
    }
    function close(){
      if(!opened)return;
      host.cancel();opened=false;
      controlKeys.forEach(function(key){controls[key]=saved[key];});
      controls.target.copy(saved.target);camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.updateProjectionMatrix();controls.update();camera.quaternion.copy(saved.quaternion);saved=null;
      host.onViewChange(false);refresh();host.draw();
    }
    function update(next){
      if(disposed)return;
      if(opened&&next&&'revision' in next&&next.revision!==options.revision)host.cancel();
      Object.assign(options,next||{});
      if(!options.active||!options.visible||!options.available)close();
      else if(opened)frame();
      refresh();
    }
    on(opener,'click',function(){if(opened)close();else open();});
    on(closer,'click',function(){close();opener.focus({preventScroll:true});});
    on(doc,'keydown',function(event){if(event.key==='Escape'&&!event.defaultPrevented&&opened){event.preventDefault();close();opener.focus({preventScroll:true});}});
    on(doc,'visibilitychange',function(){if(doc.hidden)close();});on(win,'pagehide',close);
    refresh();
    return {open:open,close:close,update:update,resize:function(){if(!opened||disposed)return;host.cancel();frame();},isOpen:function(){return opened;},dispose:function(){if(disposed)return;close();disposed=true;listeners.forEach(function(remove){remove();});}};
  }
  root.KitchenStudioContainerView={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioContainerView;
})(typeof window!=='undefined'?window:globalThis);
