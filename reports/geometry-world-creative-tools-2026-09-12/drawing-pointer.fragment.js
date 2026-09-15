        function drawingPointerCell(ev,extend) {
          var rect=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();
          ray.far=extend?160:8;
          ray.setFromCamera(new THREE.Vector2((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1),engine.camera);
          if(extend && engine._drawStart) {
            var point=new THREE.Vector3(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),-(engine._drawStart.y+.01));
            if(ray.ray.intersectPlane(plane,point) && point.distanceTo(engine.camera.position)<=160)return {x:Math.floor(point.x),y:engine._drawStart.y,z:Math.floor(point.z)};
            return null;
          }
          var hits=ray.intersectObjects(engine.getRaycastTargets ? engine.getRaycastTargets():engine.getBlocksArr());
          return hits.length?engine.placementCellForHit(hits[0]):null;
        }
        canvas.addEventListener('pointerdown',_cvH.pointerdown=function(ev){
          // Touch retains the familiar look joystick; its Place action provides
          // the same accessible two-point workflow. Mouse/pen can drag on canvas.
          if(ev.pointerType==='touch' || ev.button!==0 || engine.isLocked || engine._drawMode==='single' || !engine.isDrawingAllowed())return;
          var cell=drawingPointerCell(ev,false);if(!cell)return;
          ev.preventDefault();engine.beginDrawing(cell);engine._drawPointerId=ev.pointerId;
          if(canvas.setPointerCapture)canvas.setPointerCapture(ev.pointerId);
        });
        canvas.addEventListener('pointermove',_cvH.pointermove=function(ev){
          if(engine._drawPointerId!==ev.pointerId || engine._drawMode==='single')return;
          if(!engine.isDrawingAllowed()){engine.cancelDrawing(true);return;}
          ev.preventDefault();var cell=drawingPointerCell(ev,true);if(cell)engine.previewDrawing(cell);
        });
        canvas.addEventListener('pointerup',_cvH.pointerup=function(ev){
          if(engine._drawPointerId!==ev.pointerId)return;
          ev.preventDefault();engine._drawPointerId=null;engine._drawPinned=true;
          if(canvas.hasPointerCapture && canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);
          if(engine._drawEnd)engine.previewDrawing(engine._drawEnd);
          if(canvas.parentElement && canvas.parentElement.focus)canvas.parentElement.focus({preventScroll:true});
          announceToSR('Preview ready. Press B or choose Place to build, or Escape to cancel.');
        });
        canvas.addEventListener('pointercancel',_cvH.pointercancel=function(ev){if(engine._drawPointerId===ev.pointerId)engine.cancelDrawing(true);});
