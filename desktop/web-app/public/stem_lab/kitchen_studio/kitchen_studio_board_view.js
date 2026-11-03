/* A closer board view changes the camera, never preparation evidence. */
(function(root){
  'use strict';
  function mount(host){
    var doc=host.canvas.ownerDocument,win=doc.defaultView||root,T=host.THREE,camera=host.camera,controls=host.controls;
    var section=doc.getElementById('studioBoardView'),opener=doc.getElementById('studioBoardOpen'),panel=doc.getElementById('studioBoardPanel');
    var angleInput=doc.getElementById('studioBoardAngle'),angleLabel=doc.getElementById('studioBoardAngleLabel'),readout=doc.getElementById('studioBoardReadout'),closer=doc.getElementById('studioBoardClose');
    var options={active:false,visible:true,values:{},historical:false,revision:null},opened=false,saved=null,angle=65,disposed=false,listeners=[];
    var controlKeys=['enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'],framingPoints=[];
    [-2.08,-.85].forEach(function(x){[1.33,1.82].forEach(function(y){[-1.28,-.15].forEach(function(z){framingPoints.push(new T.Vector3(x,y,z));});});});
    function on(target,type,fn){target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function refresh(){
      section.hidden=!options.active||!options.visible;panel.hidden=!opened;
      opener.disabled=!options.active||!options.visible;opener.setAttribute('aria-expanded',String(opened));
      angleInput.value=String(angle);
      var label=angle===0?'Counter view':angle===100?'Above the board':'Raised view · '+angle+' of 100';
      text(angleLabel,label);angleInput.setAttribute('aria-valuetext',label);
      var v=options.values||{},cut=v.cut==='large'?'Uniform large dice':v.cut==='even'?'Uniform small dice':v.cut==='uneven'?'Mixed-size pieces':'Whole carrot';
      text(readout,(options.historical?'Recorded board':'Board')+': '+(v.secure?'Nonslip mat under the board':'Mat beside the board')+'. '+(v.claw?'Fingertips tucked in a claw grip':'Fingers extended')+'. '+cut+'.');
      host.canvas.dataset.boardInspection=String(opened);host.canvas.dataset.boardViewAngle=String(angle);
    }
    function frame(){
      if(!opened)return;
      var polar=1.05-.73*angle/100,radius=3.2,azimuth=.08;
      controls.target.set(-1.465,1.575,-.715);
      camera.position.set(-1.465+radius*Math.sin(polar)*Math.sin(azimuth),1.575+radius*Math.cos(polar),-.715+radius*Math.sin(polar)*Math.cos(azimuth));
      camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
      var extentX=0,extentY=0;
      framingPoints.forEach(function(point){var p=point.clone().project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));});
      camera.zoom=Math.min(3.6,.86/extentX,.82/extentY);camera.updateProjectionMatrix();
      host.canvas.dataset.boardViewZoom=String(camera.zoom);host.draw();
    }
    function open(){
      if(disposed||opened||!options.active||!options.visible)return;
      host.cancel();
      saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,target:controls.target.clone()};
      controlKeys.forEach(function(key){saved[key]=controls[key];});
      opened=true;angle=65;controls.enableRotate=false;controls.enableZoom=false;controls.minDistance=0;controls.maxDistance=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
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
      if(!options.active||!options.visible)close();
      refresh();
    }
    on(opener,'click',function(){if(opened)close();else open();});
    on(closer,'click',function(){close();opener.focus({preventScroll:true});});
    on(angleInput,'input',function(){
      if(!opened)return;host.cancel();var value=Number(angleInput.value);angle=Number.isFinite(value)?Math.max(0,Math.min(100,value)):65;refresh();frame();
    });
    on(doc,'keydown',function(event){if(event.key==='Escape'&&!event.defaultPrevented&&opened){event.preventDefault();close();opener.focus({preventScroll:true});}});
    on(doc,'visibilitychange',function(){if(doc.hidden)close();});on(win,'pagehide',close);
    refresh();
    return {open:open,close:close,update:update,resize:function(){if(!opened||disposed)return;host.cancel();frame();},isOpen:function(){return opened;},dispose:function(){if(disposed)return;close();disposed=true;listeners.forEach(function(remove){remove();});}};
  }
  root.KitchenStudioBoardView={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioBoardView;
})(typeof window!=='undefined'?window:globalThis);
