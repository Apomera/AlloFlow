/* A closer working view changes the camera, never the cooking evidence. */
(function(root){
  'use strict';
  function mount(host){
    var doc=host.canvas.ownerDocument,win=doc.defaultView||root,T=host.THREE,camera=host.camera,controls=host.controls;
    var section=doc.getElementById('studioPanView'),opener=doc.getElementById('studioPanOpen'),panel=doc.getElementById('studioPanPanel');
    var angleInput=doc.getElementById('studioPanAngle'),angleLabel=doc.getElementById('studioPanAngleLabel'),readout=doc.getElementById('studioPanReadout'),closer=doc.getElementById('studioPanClose');
    var dialOpener=doc.getElementById('studioDialOpen'),perspective=doc.getElementById('studioPanPerspective'),dialHelp=doc.getElementById('studioDialHelp'),dialReturn=doc.getElementById('studioDialReturn');
    var dialInstruction=dialHelp?dialHelp.textContent:'';
    var options={active:false,visible:true,values:{},historical:false,locked:false,revision:null,plating:false},opened=false,mode='pan',saved=null,angle=65,disposed=false,listeners=[];
    var framingPoints=[];
    [[.1,-.85,.44,1.7],[-.29,-.42,.28,1.55],[.1,-.02,.4,1.4],[.1,-.02,.4,1.54]].forEach(function(footprint){
      for(var i=0;i<16;i++){var a=i*Math.PI/8;framingPoints.push(new T.Vector3(footprint[0]+Math.cos(a)*footprint[2],footprint[3],footprint[1]+Math.sin(a)*footprint[2]));}
    });
    [.58,.9].forEach(function(x){[-.47,.17].forEach(function(z){framingPoints.push(new T.Vector3(x,1.45,z));});});
    framingPoints.push(new T.Vector3(.98,1.58,-.85),new T.Vector3(-.54,1.68,-1.385),new T.Vector3(-.22,1.68,-1.385));
    var platingPoints=[];[-.36,1.04].forEach(function(x){[1.48,2.31].forEach(function(y){[-.70,.30].forEach(function(z){platingPoints.push(new T.Vector3(x,y,z));});});});
    function on(target,type,fn){if(!target)return;target.addEventListener(type,fn);listeners.push(function(){target.removeEventListener(type,fn);});}
    function text(node,value){if(node.textContent!==value)node.textContent=value;}
    function refresh(){
      section.hidden=!options.active||!options.visible;panel.hidden=!opened;
      opener.disabled=!options.active||!options.visible;opener.setAttribute('aria-expanded',String(opened&&mode==='pan'));
      if(dialOpener){dialOpener.disabled=!options.active||!options.visible||typeof host.getDialFrame!=='function';dialOpener.setAttribute('aria-expanded',String(opened&&mode==='dial'));}
      if(perspective)perspective.hidden=mode==='dial';if(dialHelp){dialHelp.hidden=mode!=='dial';text(dialHelp,options.historical||options.locked||options.plated?'Recorded burner settings. Explore the dial, or return to a live attempt to change its setting.':dialInstruction);}if(dialReturn)dialReturn.hidden=mode!=='dial';
      angleInput.value=String(angle);
      var label=angle===0?'Counter view':angle===100?'Above the pan':'Raised view · '+angle+' of 100';
      text(angleLabel,label);angleInput.setAttribute('aria-valuetext',label);
      var v=options.values||{},brown=v.brown||0;
      var colour=brown>4?'Burned':brown>=3?'Golden':brown>0?'Beginning to brown':'Pale';
      var subject=options.plated?'plated mushrooms':'pan';
      if(mode==='dial'){var recorded=options.historical||options.locked||options.plated;text(readout,(recorded?'Recorded burner: ':'Current burner: ')+(v.heat||'off')+' · '+(v.seconds||0)+' simulated seconds. '+(recorded?'Return to a live attempt to change its setting.':'Turn the rim to preview; release to apply a setting.'));}
      else text(readout,(options.historical?'Recorded '+subject:subject.charAt(0).toUpperCase()+subject.slice(1))+': '+colour+'. '+(v.dry?'Dry surface':'Wet surface')+', '+(v.spread?'space between mushrooms':'crowded mushrooms')+'. Burner '+(v.heat||'off')+' · '+(v.seconds||0)+' simulated seconds.');
      host.canvas.dataset.panInspection=String(opened);host.canvas.dataset.panViewAngle=String(angle);host.canvas.dataset.panViewMode=opened?mode:'';
    }
    function dialFrame(){
      var data=typeof host.getDialFrame==='function'?host.getDialFrame():null;
      function valid(point){return point&&typeof point.clone==='function'&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z);}
      return data&&valid(data.target)&&Array.isArray(data.points)&&data.points.length&&data.points.every(valid)?data:null;
    }
    function frame(data){
      if(!opened)return;
      if(mode==='dial'){
        data=data||dialFrame();if(!data){close();return;}var target=data.target;
        controls.target.copy(target);camera.position.set(target.x+.18,target.y+2.4,target.z+1.30);
        camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
        var dialX=0,dialY=0;data.points.forEach(function(point){var p=point.clone().project(camera);dialX=Math.max(dialX,Math.abs(p.x));dialY=Math.max(dialY,Math.abs(p.y));});
        camera.zoom=Math.min(5.5,.86/Math.max(dialX,.0001),.86/Math.max(dialY,.0001));camera.updateProjectionMatrix();
        host.canvas.dataset.panViewZoom=String(camera.zoom);host.draw();return;
      }
      var polar=1.05-.67*angle/100,radius=4.2,azimuth=.35;
      var plating=options.plating===true,targetY=plating?1.70:1.55;
      controls.target.set(.19,targetY,-.53);
      camera.position.set(.19+radius*Math.sin(polar)*Math.sin(azimuth),targetY+radius*Math.cos(polar),-.53+radius*Math.sin(polar)*Math.cos(azimuth));
      camera.zoom=1;camera.updateProjectionMatrix();controls.update();camera.updateMatrixWorld();
      var extentX=0,extentY=0;
      (plating?framingPoints.concat(platingPoints):framingPoints).forEach(function(point){var p=point.clone().project(camera);extentX=Math.max(extentX,Math.abs(p.x));extentY=Math.max(extentY,Math.abs(p.y));});
      camera.zoom=Math.min(3.3,(plating?.86:.88)/extentX,(plating?.80:.84)/extentY);camera.updateProjectionMatrix();
      host.canvas.dataset.panViewZoom=String(camera.zoom);host.draw();
    }
    function open(next){
      next=next==='dial'?'dial':'pan';
      if(disposed||!options.active||!options.visible||opened&&mode===next)return;
      var data=next==='dial'?dialFrame():null;if(next==='dial'&&!data)return;
      host.cancel();
      if(opened){mode=next;if(typeof host.onModeChange==='function')host.onModeChange(mode);refresh();frame(data);return;}
      saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),zoom:camera.zoom,target:controls.target.clone()};
      ['enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'].forEach(function(key){saved[key]=controls[key];});
      opened=true;mode=next;angle=65;controls.enableRotate=false;controls.enableZoom=false;controls.minDistance=0;controls.maxDistance=Infinity;controls.minPolarAngle=0;controls.maxPolarAngle=Math.PI/2;
      host.onViewChange(true);refresh();frame(data);
    }
    function close(){
      if(!opened)return;
      host.cancel();opened=false;
      ['enableRotate','enableZoom','minDistance','maxDistance','minPolarAngle','maxPolarAngle'].forEach(function(key){controls[key]=saved[key];});
      controls.target.copy(saved.target);camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.updateProjectionMatrix();controls.update();camera.quaternion.copy(saved.quaternion);saved=null;
      host.onViewChange(false);refresh();host.draw();
    }
    function update(next){
      if(disposed)return;
      var platingChanged=!!next&&'plating' in next&&(next.plating===true)!==(options.plating===true);
      if(opened&&next&&(platingChanged||'revision' in next&&next.revision!==options.revision))host.cancel();
      Object.assign(options,next||{});
      if(!options.active||!options.visible)close();
      refresh();if(opened&&platingChanged&&mode==='pan')frame();
    }
    function focusOpener(){var button=mode==='dial'&&dialOpener?dialOpener:opener;button.focus({preventScroll:true});}
    on(opener,'click',function(){if(opened&&mode==='pan')close();else open('pan');});
    on(dialOpener,'click',function(){if(opened&&mode==='dial')close();else open('dial');});
    on(dialReturn,'click',function(){open('pan');if(opened&&mode==='pan')opener.focus({preventScroll:true});});
    on(closer,'click',function(){close();focusOpener();});
    on(angleInput,'input',function(){
      if(!opened||mode!=='pan')return;host.cancel();var value=Number(angleInput.value);angle=Number.isFinite(value)?Math.max(0,Math.min(100,value)):65;refresh();frame();
    });
    on(doc,'keydown',function(event){if(event.key==='Escape'&&!event.defaultPrevented&&opened){event.preventDefault();close();focusOpener();}});
    on(doc,'visibilitychange',function(){if(doc.hidden)close();});on(win,'pagehide',close);
    refresh();
    return {open:open,close:close,update:update,resize:function(){if(!opened||disposed)return;host.cancel();frame();},isOpen:function(){return opened;},isDialFocused:function(){return opened&&mode==='dial';},dispose:function(){if(disposed)return;close();disposed=true;listeners.forEach(function(remove){remove();});}};
  }
  root.KitchenStudioPanView={mount:mount};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.KitchenStudioPanView;
})(typeof window!=='undefined'?window:globalThis);
