const fs=require('fs'),vm=require('vm');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8');if(!fs.existsSync(__dirname+'/'+file.split('/').pop()+'.before'))fs.writeFileSync(__dirname+'/'+file.split('/').pop()+'.before',raw);let s=raw.replace(/\r\n/g,'\n');fn((a,b)=>{if(s.split(a).length!==2)throw Error('Expected one match: '+a.slice(0,120));s=s.replace(a,b);},s);new vm.Script(s,{filename:file});const data=Buffer.from(raw.includes('\r\n')?s.replace(/\n/g,'\r\n'):s),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}console.log('Updated '+file);}
edit('stem_lab/stem_tool_geometryworld_builder.js',(replace,s)=>{
 replace('  function firstBlockGuidance(touchActive) {',`  function capturePreviewCamera(engine) {
    var camera=engine && engine.camera;if(!camera || !camera.position || !camera.quaternion)return null;
    return {engine:engine,lesson:engine._currentLesson,camera:camera,position:camera.position.clone(),quaternion:camera.quaternion.clone(),up:camera.up.clone(),fov:camera.fov,far:camera.far,preset:engine._viewPreset || 'free',presetReturn:engine._viewPresetReturn,lighting:engine._viewPresetLighting,fog:engine.scene && engine.scene.fog,fogNear:engine.scene && engine.scene.fog && engine.scene.fog.near,fogFar:engine.scene && engine.scene.fog && engine.scene.fog.far};
  }
  // Review owns camera gestures, not blocks. Fit to the space left by its card,
  // and release every listener/capture before giving input back to the world.
  function installPreviewCamera(engine,plan,owner,origin,onViewChange) {
    var THREE=window.THREE,canvas=engine && engine.renderer && engine.renderer.domElement,camera=engine && engine.camera,facts=previewChangeFacts(plan);
    if(!THREE || !canvas || !camera || !camera.isPerspectiveCamera || !facts || !origin || origin.engine!==engine || origin.lesson!==engine._currentLesson || !engine._buildBatchPreview || engine._buildBatchPreview.owner!==owner)return null;
    if(engine._previewReviewCamera)engine._previewReviewCamera.dispose(false);
    var box=new THREE.Box3(new THREE.Vector3(facts.min.x,facts.min.y,facts.min.z),new THREE.Vector3(facts.max.x,facts.max.y,facts.max.z)),center=box.getCenter(new THREE.Vector3());
    var oldTouch=canvas.style.touchAction,oldCursor=canvas.style.cursor,pointers=new Map(),disposed=false,frame=0,observer=null,view={azimuth:facts.width>=facts.depth?0:Math.PI/2,elevation:.24,zoom:1.05},name=facts.width>=facts.depth?'side':'front';
    function active(){return !disposed && !engine._destroyed && !engine._showcase && engine._currentLesson===origin.lesson && engine._previewReviewCamera===controller && engine._buildBatchPreview && engine._buildBatchPreview.owner===owner;}
    function stop(event){event.preventDefault();event.stopImmediatePropagation();}
    function publish(next){name=next;if(onViewChange)onViewChange(next);}
    function fit(){
      frame=0;if(!active()){controller.dispose(false);return false;}
      var area=canvas.getBoundingClientRect();if(!area.width || !area.height)return false;
      camera.aspect=area.width/area.height;camera.updateProjectionMatrix();
      var ground=engine._currentLesson.ground,groundY=ground && Number.isFinite(ground.y)?ground.y:0;
      var result=fitCreationCamera(box,camera,creationFocusRect(engine),groundY+.2,{azimuth:view.azimuth,elevation:view.elevation});if(!result)return false;
      var offset=result.position.clone().sub(result.target).multiplyScalar(view.zoom);camera.position.copy(result.target).add(offset);camera.up.set(0,1,0);camera.lookAt(result.target);
      camera.far=Math.max(origin.far,result.far*view.zoom);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
      if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=Math.max(origin.fogNear,result.depthFar*view.zoom+2);origin.fog.far=Math.max(origin.fogFar,origin.fog.near+80);}
      return true;
    }
    function schedule(){if(!disposed && !frame)frame=window.requestAnimationFrame(fit);}
    function clearPointers(){pointers.forEach(function(_,id){if(canvas.hasPointerCapture && canvas.hasPointerCapture(id))try{canvas.releasePointerCapture(id);}catch(_){}});pointers.clear();canvas.style.cursor='grab';}
    function down(event){if(!active() || (event.button!==0 && event.button!==2))return;stop(event);if(pointers.size>=2)return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(canvas.setPointerCapture)try{canvas.setPointerCapture(event.pointerId);}catch(_){}canvas.style.cursor='grabbing';}
    function move(event){if(!active() || !pointers.has(event.pointerId))return;stop(event);var previous=pointers.get(event.pointerId),dx=event.clientX-previous.x,dy=event.clientY-previous.y;
      if(pointers.size===2){var other; pointers.forEach(function(p,id){if(id!==event.pointerId)other=p;});var before=Math.hypot(previous.x-other.x,previous.y-other.y),after=Math.hypot(event.clientX-other.x,event.clientY-other.y);if(before>8 && after>8)view.zoom=Math.max(.65,Math.min(3,view.zoom*before/after));}
      else{view.azimuth-=dx*.008;view.elevation=Math.max(.10,Math.min(Math.PI/2-.04,view.elevation+dy*.006));publish('orbit');}
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});schedule();
    }
    function up(event){if(!pointers.has(event.pointerId))return;stop(event);pointers.delete(event.pointerId);if(canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId))try{canvas.releasePointerCapture(event.pointerId);}catch(_){}if(!pointers.size)canvas.style.cursor='grab';}
    function wheel(event){if(!active())return;stop(event);controller.zoom(Math.exp(Math.max(-100,Math.min(100,event.deltaY))*.002));}
    function block(event){if(active())stop(event);}
    var handlers={pointerdown:down,pointermove:move,pointerup:up,pointercancel:up,lostpointercapture:up,mousedown:block,click:block,dblclick:block,contextmenu:block,wheel:wheel,touchstart:block,touchmove:block,touchend:block,touchcancel:block};
    var controller={focus:center,view:function(next){
      if(!active())return false;var presets={front:[Math.PI/2,.15],side:[0,.15],top:[0,Math.PI/2-.04],perspective:[Math.PI/4,.42]};if(!presets[next])return false;clearPointers();view.azimuth=presets[next][0];view.elevation=presets[next][1];view.zoom=1.05;publish(next);schedule();return true;
    },zoom:function(factor){if(!active() || !Number.isFinite(factor) || factor<=0)return false;view.zoom=Math.max(.65,Math.min(3,view.zoom*factor));schedule();return true;},fit:function(){if(!active())return false;view.zoom=1.05;schedule();return true;},scheduleFit:schedule,dispose:function(restore){
      if(disposed)return;disposed=true;if(frame)window.cancelAnimationFrame(frame);frame=0;if(observer)observer.disconnect();window.removeEventListener('resize',schedule);window.removeEventListener('blur',clearPointers);document.removeEventListener('visibilitychange',clearPointers);
      Object.keys(handlers).forEach(function(key){canvas.removeEventListener(key,handlers[key],true);});clearPointers();canvas.style.touchAction=oldTouch;canvas.style.cursor=oldCursor;
      if(engine._previewReviewCamera!==controller)return;delete engine._previewReviewCamera;
      if(restore!==false && !engine._destroyed && !engine._showcase && !engine._guidedTour && engine._currentLesson===origin.lesson && engine.camera===origin.camera){
        camera.position.copy(origin.position);camera.quaternion.copy(origin.quaternion);camera.up.copy(origin.up);camera.fov=origin.fov;camera.far=origin.far;camera.updateProjectionMatrix();camera.updateMatrixWorld(true);if(engine.euler)engine.euler.setFromQuaternion(camera.quaternion);
        engine._viewPreset=origin.preset;engine._viewPresetReturn=origin.presetReturn;engine._viewPresetLighting=origin.lighting;if(engine._setViewPreset)engine._setViewPreset(origin.preset);
        if(engine.scene.fog===origin.fog && origin.fog){origin.fog.near=origin.fogNear;origin.fog.far=origin.fogFar;}
      }
      if(engine.releaseInput)engine.releaseInput();
    }};
    engine._previewReviewCamera=controller;engine._viewPresetAnim=null;engine._entryAnim=null;if(engine.releaseInput)engine.releaseInput();if(engine.velocity)engine.velocity.set(0,0,0);
    canvas.style.touchAction='none';canvas.style.cursor='grab';Object.keys(handlers).forEach(function(key){canvas.addEventListener(key,handlers[key],{capture:true,passive:false});});
    window.addEventListener('resize',schedule);window.addEventListener('blur',clearPointers);document.addEventListener('visibilitychange',clearPointers);
    if(typeof ResizeObserver==='function'){observer=new ResizeObserver(schedule);observer.observe(canvas);var root=canvas.closest('#geoworld-fs-workspace'),card=root && root.querySelector('.gwe-preview-review');if(card)observer.observe(card);}
    publish(name);schedule();return controller;
  }
  function firstBlockGuidance(touchActive) {`);
 replace(".gw-touch-look-panel,.gwe-builder-dock,.gwe-focus-return').forEach", ".gw-touch-look-panel,.gwe-builder-dock,.gwe-focus-return,.gwe-preview-review').forEach");
 const exportLine=s.split('\n').find(l=>l.includes('frameBuildPreview:'));
 if(!exportLine)throw Error('Missing preview export');replace(exportLine,exportLine+"\n    capturePreviewCamera:capturePreviewCamera, installPreviewCamera:installPreviewCamera,");
 replace("var _previewSurroundings=React.useState(false),previewSurroundings=_previewSurroundings[0],setPreviewSurroundings=_previewSurroundings[1];", "var _previewSurroundings=React.useState(false),previewSurroundings=_previewSurroundings[0],setPreviewSurroundings=_previewSurroundings[1];\n      var previewCameraOrigin=React.useRef(null),_previewCameraView=React.useState('perspective'),previewCameraView=_previewCameraView[0],setPreviewCameraView=_previewCameraView[1];");
 replace('function beginPreviewReview(){var result=frameBuildPreview(ctx,selectionEditPreview,selectionPreviewOwner.current);', 'function beginPreviewReview(){previewCameraOrigin.current=capturePreviewCamera(window[ENGINE_KEY]);var result=frameBuildPreview(ctx,selectionEditPreview,selectionPreviewOwner.current);');
 replace('      function renderPreviewFacts(){',`      function renderPreviewCameraControls(){
        function action(name,value){var live=window[ENGINE_KEY],camera=live && live._previewReviewCamera;if(camera && camera[name])camera[name](value);}
        return h('details',{className:'gwe-preview-camera-tools',onToggle:function(){action('scheduleFit');}},h('summary',null,'Rotate & zoom preview'),
          h('span',{className:'gwe-preview-gesture-hint'},'Drag to orbit. Pinch or scroll to zoom. Fit shows the whole model.'),
          h('div',{className:'gwe-preview-view-buttons',role:'group','aria-label':'Preview camera views'},[['perspective','Angle'],['front','Front'],['side','Side'],['top','Top']].map(function(option){return h('button',{key:option[0],type:'button','aria-label':'View preview from '+option[0],'aria-pressed':previewCameraView===option[0],onClick:function(){action('view',option[0]);}},option[1]);})),
          h('div',{className:'gwe-preview-zoom-buttons',role:'group','aria-label':'Preview camera zoom'},h('button',{type:'button',onClick:function(){action('zoom',1/1.18);}},'Closer'),h('button',{type:'button',onClick:function(){action('fit');}},'Fit model'),h('button',{type:'button',onClick:function(){action('zoom',1.18);}},'Farther')));
      }
      function renderPreviewFacts(){`);
 replace('      },[previewReview,selectionEditPreview]);',`      },[previewReview,selectionEditPreview]);
      React.useEffect(function(){
        if(!previewReview || !selectionEditPreview)return;var live=selectionEditPreview.engine;
        var camera=installPreviewCamera(live,selectionEditPreview,selectionPreviewOwner.current,previewCameraOrigin.current,setPreviewCameraView);
        return function(){if(camera)camera.dispose(true);};
      },[previewReview,selectionEditPreview]);
      React.useEffect(function(){if(data.showGameSettings || data.showLessonIntro)setPreviewReview(false);},[data.showGameSettings,data.showLessonIntro]);
      React.useEffect(function(){setPreviewReview(false);setSelectionEditPreview(null);},[data.activeLesson]);`);
 replace("renderPreviewButtons(true),h('label',{className:'gwe-preview-surroundings'}", "renderPreviewButtons(true),renderPreviewCameraControls(),h('label',{className:'gwe-preview-surroundings'}");
 replace('.gwe-preview-surroundings{display:flex;', '.gwe-preview-camera-tools{margin-top:8px;border-top:1px solid #c6d6b733}.gwe-preview-camera-tools summary{min-height:44px;align-content:center;cursor:pointer;font-size:12px;font-weight:600}.gwe-preview-gesture-hint{display:block;font-size:11px;line-height:1.5;color:#d5e3cb;margin-bottom:8px}.gwe-preview-view-buttons,.gwe-preview-zoom-buttons{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px;margin-bottom:7px}.gwe-preview-zoom-buttons{grid-template-columns:repeat(3,minmax(0,1fr))}.gwe-preview-camera-tools button{min-width:0;min-height:44px;border:1px solid #8baa8b;border-radius:9px;background:#ffffff08;color:inherit;font:600 11px system-ui;cursor:pointer}.gwe-preview-camera-tools button[aria-pressed=true]{background:#d5e7be;color:#284c37}.gwe-preview-camera-tools :focus-visible{outline:3px solid #e3ba66;outline-offset:2px}.gwe-preview-surroundings{display:flex;');
});
edit('stem_lab/stem_tool_geometryworld.js',(replace,s)=>{
 replace("if(engine._showcase || (engine._modalState && (engine._modalState.showGeometryHome || engine._modalState.showActivityGuide)))return false;", "if(engine._showcase || engine._previewReviewCamera || (engine._modalState && (engine._modalState.showGeometryHome || engine._modalState.showActivityGuide)))return false;");
 replace("          if(engine._showcase){if(ev.code==='Escape' && engine.endShowcase){ev.preventDefault();engine.endShowcase();}return;}", "          if(engine._showcase){if(ev.code==='Escape' && engine.endShowcase){ev.preventDefault();engine.endShowcase();}return;}\n          if(engine._previewReviewCamera && ev.code!=='Escape')return;");
 replace("          if(engine._drawMode && engine._drawMode!=='single')return;", "          if(engine._previewReviewCamera || (engine._drawMode && engine._drawMode!=='single'))return;");
 replace('        engine.loadLesson = function(lesson) {', '        engine.loadLesson = function(lesson) {\n          if(engine._previewReviewCamera)engine._previewReviewCamera.dispose(false);');
 const destroyLine=s.split('\n').find(l=>l.includes('engine._destroyed = true;'));
 if(!destroyLine)throw Error('Missing engine destruction');replace(destroyLine,'          if(engine._previewReviewCamera)engine._previewReviewCamera.dispose(false);\n'+destroyLine);
 replace('         engine._setPointerLocked = setPointerLocked;','         engine._setPointerLocked = setPointerLocked;\n         engine._setViewPreset = setViewPreset;');
 replace('    if(creation && !creation.manual', '    if(engine._previewReviewCamera && engine._previewReviewCamera.focus)focus=engine._previewReviewCamera.focus;\n    else if(creation && !creation.manual');
 replace("    if(!creation && preset && preset.lesson===engine._currentLesson", "    if(!focus && !creation && preset && preset.lesson===engine._currentLesson");
});
