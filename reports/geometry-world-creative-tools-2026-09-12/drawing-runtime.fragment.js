        // Bounded drawing previews use the same cells and transaction as final placement.
        function installGeometryDrawing() {
          var modes=['single','line','floor','wall'];
          engine._drawMode='single';engine._drawHeight=3;
          engine.buildDrawingCells=function(mode,start,end,height,recipe) {
            if(['line','floor','wall'].indexOf(mode)<0 || !start || !end)return {ok:false,code:'no_target',reason:'Choose a start and end point.'};
            if(![start.x,start.y,start.z,end.x,end.y,end.z].every(function(v){return typeof v==='number' && isFinite(v) && Math.floor(v)===v;}))return {ok:false,code:'out_of_bounds',reason:'Choose whole-number grid cells.'};
            var lo={x:start.x,y:start.y,z:start.z},hi={x:end.x,y:end.y,z:end.z};
            if(mode==='floor'){lo.y=hi.y=start.y;}
            if(mode==='line') {
              var axis=['x','y','z'].sort(function(a,b){return Math.abs(end[b]-start[b])-Math.abs(end[a]-start[a]);})[0];
              ['x','y','z'].forEach(function(a){if(a!==axis)hi[a]=lo[a];});
            }
            if(mode==='wall') {
              if(typeof height!=='number' || height<1 || height>32 || Math.floor(height)!==height)return {ok:false,code:'height',reason:'Choose a wall height from 1 to 32 blocks.'};
              var axis=Math.abs(end.x-start.x)>=Math.abs(end.z-start.z)?'x':'z';
              hi[axis==='x'?'z':'x']=lo[axis==='x'?'z':'x'];lo.y=start.y;hi.y=start.y+height-1;
            }
            var min={},max={};['x','y','z'].forEach(function(a){min[a]=Math.min(lo[a],hi[a]);max[a]=Math.max(lo[a],hi[a]);});
            var L=max.x-min.x+1,W=max.z-min.z+1,H=max.y-min.y+1,count=L*W*H;
            if(count>MAX_BLOCKS)return {ok:false,code:'block_limit',reason:'Preview is '+count+' blocks; shorten it to '+MAX_BLOCKS+' or fewer.',count:count,dimensions:{L:L,W:W,H:H}};
            var ps=recipe || engine._placeState || {},type=BLOCK_TYPES[ps.selectedBlock] || BLOCK_TYPES[0],shape=BLOCK_SHAPES[ps.selectedShape] || BLOCK_SHAPES[0],blocks=[];
            for(var x=min.x;x<=max.x;x++)for(var y=min.y;y<=max.y;y++)for(var z=min.z;z<=max.z;z++)blocks.push({x:x,y:y,z:z,type:type.id,shape:shape.id,rotation:ps.blockRotation || 0});
            return {ok:true,additions:blocks,count:count,dimensions:{L:L,W:W,H:H}};
          };
          engine.clearBuildBatchPreview=function(owner) {
            var state=engine._buildBatchPreview;if(!state || (owner && state.owner!==owner))return;
            engine.scene.remove(state.group);state.group.traverse(function(part){if(part.geometry)part.geometry.dispose();});state.material.dispose();engine._buildBatchPreview=null;
          };
          engine.showBuildBatchPreview=function(plan,owner) {
            var list=plan && plan.additions;if(!Array.isArray(list) || !list.length || list.length>MAX_BLOCKS){engine.clearBuildBatchPreview(owner);return false;}
            var signature=(plan.ok?'ready':'blocked')+'|'+list.map(function(b){return [b.x,b.y,b.z,b.shape,b.rotation].join(',');}).join(';'),existing=engine._buildBatchPreview;
            if(existing && existing.owner===owner && existing.signature===signature){existing.group.visible=true;return true;}
            engine.clearBuildBatchPreview();
            var group=new THREE.Group(),material=new THREE.LineBasicMaterial({color:plan.ok?0xb9edd0:0xffa48e,transparent:true,opacity:.82,depthWrite:false,depthTest:!!plan.ok});
            group.userData.gwDecorative=true;group.userData.gwBuildPreview=true;group.raycast=function(){};
            // One line draw call for the whole operation, including mixed stamp shapes.
            var cache={},positions=[];
            list.forEach(function(b){
              var shape=BLOCK_SHAPES.some(function(s){return s.id===b.shape;})?b.shape:'cube';
              if(!cache[shape]){var shapeGeo=createShapeGeometry(shape),edgeGeo=new THREE.EdgesGeometry(shapeGeo);cache[shape]=Array.from(edgeGeo.getAttribute('position').array);shapeGeo.dispose();edgeGeo.dispose();}
              var values=cache[shape],angle=shape==='cube'?0:(b.rotation || 0)*Math.PI/2,c=Math.cos(angle),s=Math.sin(angle),oy=shape==='halfB'?.25:shape==='halfA'||shape==='quarter'?0:.5;
              for(var i=0;i<values.length;i+=3)positions.push(values[i]*c+values[i+2]*s+b.x+.5,values[i+1]+b.y+oy,-values[i]*s+values[i+2]*c+b.z+.5);
            });
            var geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
            var mesh=new THREE.LineSegments(geometry,material);mesh.renderOrder=999;mesh.raycast=function(){};group.add(mesh);
            engine.scene.add(group);engine._buildBatchPreview={owner:owner,signature:signature,group:group,material:material};return true;
          };
          engine.isDrawingAllowed=function() {
            var ms=engine._modalState || {};
            return !!(engine._currentLesson && engine._currentLesson.sandbox && !engine._destroyed && engine._worldActive!==false && !engine._showcase && !Object.keys(ms).some(function(k){return k!=='hudPanel' && !!ms[k];}));
          };
          function publish(plan) {
            var dims=plan && plan.dimensions,info={mode:engine._drawMode,started:!!engine._drawStart,pinned:!!engine._drawPinned,ok:!!(plan && plan.ok),count:plan && plan.count || 0,dimensions:dims || null,reason:plan && plan.reason || 'Aim at a block face and set the start point.'};
            if(dims && plan.ok)info.reason=dims.L+' × '+dims.W+' × '+dims.H+' blocks · '+plan.count+' cells';
            var signature=JSON.stringify(info);if(signature!==engine._drawInfoSignature){engine._drawInfoSignature=signature;upd('drawPreview',info);}
            engine._drawPlan=plan;
          }
          engine.cancelDrawing=function(silent) {
            engine._drawStart=null;engine._drawEnd=null;engine._drawPinned=false;engine._drawPointerId=null;
            engine.clearBuildBatchPreview('drawing');publish(null);if(!silent)announceToSR('Drawing cancelled. No blocks changed.');
          };
          engine.setDrawMode=function(mode) {
            if(modes.indexOf(mode)<0 || !engine.isDrawingAllowed())return false;
            engine.cancelDrawing(true);engine._drawMode=mode;
            if(mode!=='single' && engine.releaseInput)engine.releaseInput();
            upd('drawMode',mode);publish(null);return true;
          };
          engine.setDrawHeight=function(height) {
            if(typeof height!=='number' || !isFinite(height) || height<1 || height>32 || Math.floor(height)!==height)return false;
            engine._drawHeight=height;upd('drawWallHeight',height);if(engine._drawStart && engine._drawEnd)engine.previewDrawing(engine._drawEnd);return true;
          };
          engine.previewDrawing=function(end) {
            if(!engine._drawStart || !end)return null;
            engine._drawEnd={x:end.x,y:end.y,z:end.z};
            var shape=engine.buildDrawingCells(engine._drawMode,engine._drawStart,end,engine._drawHeight),plan=shape;
            if(shape.ok){plan=Object.assign({},engine.previewBuildBatch(shape.additions,[],{label:'Draw '+engine._drawMode}),{additions:shape.additions,count:shape.count,dimensions:shape.dimensions});}
            engine.showBuildBatchPreview(plan,'drawing');publish(plan);return plan;
          };
          engine.beginDrawing=function(cell) {
            if(!engine.isDrawingAllowed() || engine._drawMode==='single' || !cell)return false;
            engine._drawStart={x:cell.x,y:cell.y,z:cell.z};engine._drawPinned=false;engine.previewDrawing(cell);return true;
          };
          engine.commitDrawing=function() {
            if(!engine.isDrawingAllowed() || !engine._drawStart || !engine._drawEnd)return false;
            var shape=engine.buildDrawingCells(engine._drawMode,engine._drawStart,engine._drawEnd,engine._drawHeight);
            if(!shape.ok){publish(shape);return false;}
            var result=engine.commitBuildBatch(shape.additions,[],{label:'Draw '+engine._drawMode});
            if(!result.ok){engine.previewDrawing(engine._drawEnd);announceToSR(result.reason);return false;}
            var message='Built '+result.count+' blocks. Undo reverses this whole '+engine._drawMode+'.';
            engine.cancelDrawing(true);upd('actionFeedback',message);announceToSR(message);return true;
          };
          engine.drawAtCrosshair=function() {
            if(!engine.isDrawingAllowed())return false;
            if(engine._drawPinned)return engine.commitDrawing();
            var hit=engine.blockUnderCrosshair && engine.blockUnderCrosshair(),cell=engine.placementCellForHit(hit);
            if(!cell){announceToSR('Aim at nearby ground or a block face to choose a drawing point.');return false;}
            if(!engine._drawStart)return engine.beginDrawing(cell);
            engine.previewDrawing(cell);return engine.commitDrawing();
          };
          engine.updateDrawingPreview=function() {
            if(!engine.isDrawingAllowed()){engine.cancelDrawing(true);return;}
            if(engine._drawStart && !engine._drawPinned && engine._drawPointerId==null && engine.isInputActive()){
              var hit=engine.blockUnderCrosshair && engine.blockUnderCrosshair(),cell=engine.placementCellForHit(hit);
              if(cell)engine.previewDrawing(cell);
            }
          };
        }
        installGeometryDrawing();
        // End bounded drawing previews.
