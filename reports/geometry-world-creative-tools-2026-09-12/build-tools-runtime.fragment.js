        // Atomic student construction: drawing and selection edits share one transaction.
        function installGeometryBuildBatch() {
          function key(b) { return b.x + ',' + b.y + ',' + b.z; }
          function copySelection(value) { return value && Array.isArray(value.blocks) ? {blocks:value.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};})} : null; }
          function failure(code, reason) { return {ok:false,code:code,reason:reason}; }
          function isCell(b) { return b && [b.x,b.y,b.z].every(function(v){return typeof v==='number' && isFinite(v) && Math.floor(v)===v;}); }
          function describe(mesh) { var d=mesh.userData,p=d.gridPos;return {x:p.x,y:p.y,z:p.z,type:d.blockType,shape:d.shape || 'cube',rotation:d.rotation || 0}; }
          engine.previewBuildBatch = function(additions, removals, options) {
            if(engine._destroyed || engine._placingLessonBlocks)return failure('unavailable','Building is unavailable right now.');
            if(!Array.isArray(additions) || !Array.isArray(removals) || additions.length>MAX_BLOCKS || removals.length>MAX_BLOCKS)return failure('block_limit','Keep each operation within '+MAX_BLOCKS+' blocks.');
            if(!additions.length && !removals.length)return failure('empty','Choose at least one block.');
            var removeMap={},addMap={},removed=[],added=[],lesson=engine._currentLesson || {},ground=lesson.ground || {};
            var floor=typeof ground.y==='number' && isFinite(ground.y) ? ground.y : 0;
            for(var i=0;i<removals.length;i++) {
              var r=removals[i];if(!isCell(r))return failure('out_of_bounds','Choose whole-number grid cells.');
              var rk=key(r),mesh=engine.blocks[rk],d=mesh && mesh.userData;
              if(removeMap[rk])return failure('duplicate','The operation includes a cell twice.');
              if(!d || d._lessonBlock || d.gwGroundProxy || (d._measurementLayer && d._measurementLayer!=='student'))return failure('protected','Only your own blocks can be edited.');
              removeMap[rk]=true;removed.push(describe(mesh));
            }
            for(var j=0;j<additions.length;j++) {
              var b=additions[j];if(!isCell(b))return failure('out_of_bounds','Choose whole-number grid cells.');
              if(b.y<floor)return failure('below_floor','Cannot build below the floor.');
              if(lesson.sandbox && (Math.abs(b.x)>64 || Math.abs(b.z)>64 || b.y>128))return failure('out_of_bounds','World edge: X and Z must be between -64 and 64, Y at most 128.');
              var shape=b.shape===undefined ? 'cube':b.shape,rotation=b.rotation===undefined ? 0:b.rotation;
              if(!BLOCK_TYPES.some(function(t){return t.id===b.type;}))return failure('material','Choose a material from the palette.');
              if(!BLOCK_SHAPES.some(function(s){return s.id===shape;}))return failure('shape','Choose a shape from the palette.');
              if(typeof rotation!=='number' || Math.floor(rotation)!==rotation || rotation<0 || rotation>3)return failure('rotation','Rotation must be a quarter turn from 0 to 3.');
              var bk=key(b);if(addMap[bk])return failure('duplicate','The operation includes a cell twice.');
              if(engine.blocks[bk] && !removeMap[bk])return failure('occupied','A block is in the way. Adjust the preview before building.');
              addMap[bk]=true;added.push({x:b.x,y:b.y,z:b.z,type:b.type,shape:shape,rotation:rotation});
            }
            var current=engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks).filter(function(k){return !(engine.blocks[k].userData || {}).gwGroundProxy;}).length;
            if(current-removed.length+added.length>MAX_BLOCKS)return failure('block_limit','This would exceed the '+MAX_BLOCKS+' construction block limit.');
            return {ok:true,code:'ready',reason:'Ready to build',additions:added,removals:removed,count:added.length,label:String(options && options.label || 'Build operation').slice(0,80)};
          };
          function detach(mesh) {
            engine.scene.remove(mesh);var d=mesh.userData || {};
            if(d._torchLight)engine.scene.remove(d._torchLight);
            if(d._torchGlow)engine.scene.remove(d._torchGlow);
          }
          function attach(mesh) {
            engine.scene.add(mesh);var d=mesh.userData || {};
            if(d._torchLight)engine.scene.add(d._torchLight);
            if(d._torchGlow)engine.scene.add(d._torchGlow);
          }
          function dispose(mesh) {
            var d=mesh.userData || {};
            if(d._torchLight && d._torchLight.dispose)d._torchLight.dispose();
            if(d._torchGlow && d._torchGlow.material)d._torchGlow.material.dispose();
            engine._disposeBlockMesh(mesh);
          }
          function apply(additions,removals,options,replay) {
            options=options || {};var plan=engine.previewBuildBatch(additions,removals,options);if(!plan.ok)return plan;
            var oldMeshes={},created=[],wasReplay=engine._replayingHistory,wasBatch=engine._batchSuppressEvents;
            var beforeSelection=copySelection(Object.prototype.hasOwnProperty.call(options,'beforeSelection') ? options.beforeSelection:engine._builderSelection);
            var sceneBefore=engine.scene.children.slice();
            engine._replayingHistory=true;engine._batchSuppressEvents=true;
            try {
              plan.removals.forEach(function(b){var k=key(b),mesh=engine.blocks[k];oldMeshes[k]=mesh;detach(mesh);delete engine.blocks[k];});
              engine._blocksDirty=true;
              plan.additions.forEach(function(b){
                var mesh=engine.placeBlock(b.x,b.y,b.z,b.type,b.shape,b.rotation);
                if(!mesh || engine.blocks[key(b)]!==mesh)throw Error('A cell could not be created.');
                created.push(mesh);
              });
            } catch(error) {
              // Original meshes remain alive until every destination succeeds.
              plan.additions.forEach(function(b){var k=key(b),mesh=engine.blocks[k];if(mesh && mesh!==oldMeshes[k]){detach(mesh);dispose(mesh);delete engine.blocks[k];}});
              engine.scene.children.slice().forEach(function(mesh){if(sceneBefore.indexOf(mesh)<0){engine.scene.remove(mesh);if(created.indexOf(mesh)<0 && mesh.material && mesh.material.dispose)mesh.material.dispose();}});
              Object.keys(oldMeshes).forEach(function(k){engine.blocks[k]=oldMeshes[k];attach(oldMeshes[k]);});
              engine._blocksDirty=true;
              plan.additions.concat(plan.removals).forEach(function(b){engine.refreshAONeighbourhood(b.x,b.y,b.z);});
              return failure('creation_failed','Nothing changed. The operation could not be completed; try a smaller preview.');
            } finally {engine._replayingHistory=wasReplay;engine._batchSuppressEvents=wasBatch;}
            Object.keys(oldMeshes).forEach(function(k){dispose(oldMeshes[k]);});
            engine._blocksDirty=true;
            plan.removals.forEach(function(b){engine.refreshAONeighbourhood(b.x,b.y,b.z);});
            engine.blocksPlaced=Object.keys(engine.blocks).filter(function(k){var d=engine.blocks[k].userData || {};return !d._lessonBlock && !d.gwGroundProxy && (!d._measurementLayer || d._measurementLayer==='student');}).length;
            if(Object.prototype.hasOwnProperty.call(options,'afterSelection'))engine._builderSelection=copySelection(options.afterSelection);
            if(!replay) {
              pushUndo({action:'batch',label:plan.label,additions:plan.additions,removals:plan.removals,beforeSelection:beforeSelection,afterSelection:copySelection(engine._builderSelection)});
              if(engine.logEvent){plan.removals.forEach(function(b){engine.logEvent('block_remove',{x:b.x,y:b.y,z:b.z,batch:plan.label});});plan.additions.forEach(function(b){engine.logEvent('block_place',Object.assign({batch:plan.label},b));});engine.logEvent('build_batch',{label:plan.label,added:plan.additions.length,removed:plan.removals.length});}
            }
            upd('blocksPlaced',engine.blocksPlaced);upd('measureResult',null);publishHistoryChange();
            return plan;
          }
          engine.commitBuildBatch=function(additions,removals,options){return apply(additions,removals,options,false);};
          engine._replayBuildBatch=function(action,undo){
            return apply(undo?action.removals:action.additions,undo?action.additions:action.removals,{label:action.label,afterSelection:undo?action.beforeSelection:action.afterSelection},true);
          };
        }
        installGeometryBuildBatch();
        // End atomic student construction.
