/* Oven inspection changes the camera, never cooking evidence. */
(function(root){
  'use strict';
  function mount(host){
    var doc=host.canvas.ownerDocument,win=doc.defaultView||root,T=host.THREE,camera=host.camera,controls=host.controls;
    var section=doc.getElementById('studioOvenView'),opener=doc.getElementById('studioOvenInspect'),panel=doc.getElementById('studioOvenPanel'),closer=doc.getElementById('studioOvenClose');
    var options={active:false,visible:true,revision:null},opened=false,opening=false,saved=null,disposed=false,listeners=[];
    var controlKeys=['enabled','enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'];
    function on(target,type,fn){target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function available(){return options.active&&options.visible;}
    function refresh(){
      section.hidden=!available();panel.hidden=!opened;opener.disabled=!available();opener.setAttribute('aria-expanded',String(opened));
      host.canvas.dataset.ovenInspection=String(opened);
    }
    function frame(){
      if(!opened)return;
      var bounds=host.getFrame(),target=bounds.target;
      controls.target.copy(target);camera.position.copy(target).add(new T.Vector3(.18,.22,2.2));
      camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
      var extentX=0,extentY=0;
      bounds.points.forEach(function(point){var p=point.clone().project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));});
      camera.zoom=Math.min(3.6,.84/extentX,.78/extentY);camera.updateProjectionMatrix();
      host.canvas.dataset.ovenViewZoom=String(camera.zoom);host.draw();
    }
    function open(){
      if(disposed||opened||opening||!available())return;
      opening=true;
      try{
        if(host.beforeOpen)host.beforeOpen();
        if(disposed||opened||!available())return;
        host.cancel();
        if(disposed||opened||!available())return;
        saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,target:controls.target.clone()};
        controlKeys.forEach(function(key){saved[key]=controls[key];});
        opened=true;controls.enableRotate=false;controls.enableZoom=false;controls.minDistance=0;controls.maxDistance=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
        host.onViewChange(true);refresh();frame();
      }finally{opening=false;}
    }
    function close(){
      if(!opened)return;
      host.cancel();opened=false;
      controlKeys.forEach(function(key){controls[key]=saved[key];});
      controls.target.copy(saved.target);camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.updateProjectionMatrix();controls.update();camera.quaternion.copy(saved.quaternion);camera.updateMatrixWorld();saved=null;
      host.onViewChange(false);refresh();host.draw();
    }
    function update(next){
      if(disposed)return;
      if(opened&&next&&'revision' in next&&next.revision!==options.revision)close();
      Object.assign(options,next||{});
      if(!available())close();else if(opened)frame();
      refresh();
    }
    on(opener,'click',function(){if(opened)close();else open();});
    on(closer,'click',function(){close();opener.focus({preventScroll:true});});
    on(doc,'keydown',function(event){if(event.key==='Escape'&&!event.defaultPrevented&&opened){event.preventDefault();close();opener.focus({preventScroll:true});}});
    on(doc,'visibilitychange',function(){if(doc.hidden)close();});on(win,'pagehide',close);
    refresh();
    return {open:open,close:close,update:update,resize:function(){if(!opened||disposed)return;host.cancel();frame();},isOpen:function(){return opened;},dispose:function(){if(disposed)return;close();disposed=true;listeners.forEach(function(remove){remove();});}};
  }
  root.KitchenStudioOvenView={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioOvenView;
})(typeof window!=='undefined'?window:globalThis);
