const fs=require('fs'),assert=require('assert');
function edit(path,run){const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let s=original.replace(/\r\n/g,'\n');function replace(a,b){assert.equal(s.split(a).length,2,'Unique '+a.slice(0,80));s=s.replace(a,b);}run(replace);const out=crlf?s.replace(/\n/g,'\r\n'):s,fd=fs.openSync(path,'r+');try{fs.writeSync(fd,out);fs.ftruncateSync(fd,Buffer.byteLength(out));}finally{fs.closeSync(fd);}}
edit('stem_lab/stem_tool_geometryworld.js',replace=>{
 replace("            engine._drawStart=null;engine._drawEnd=null;engine._drawPinned=false;engine._drawPointerId=null;","            engine._drawStart=null;engine._drawEnd=null;engine._drawPinned=false;engine._drawPointerId=null;engine._drawCache=null;");
 replace("            engine._drawEnd={x:end.x,y:end.y,z:end.z};\n            var shape=engine.buildDrawingCells",`            engine._drawEnd={x:end.x,y:end.y,z:end.z};
            // A stationary aim should not allocate and validate 1,500 cells on
            // every animation frame. Revalidate when geometry, recipe or history changes.
            var ps=engine._placeState || {},top=engine._undoStack && engine._undoStack[engine._undoStack.length-1];
            var cacheKey=[engine._drawMode,engine._drawStart.x,engine._drawStart.y,engine._drawStart.z,end.x,end.y,end.z,engine._drawHeight,ps.selectedBlock,ps.selectedShape,ps.blockRotation,engine._historyRevision || 0,engine.blocksPlaced || 0].join('|');
            var cached=engine._drawCache;
            if(cached && cached.key===cacheKey && cached.top===top && (!cached.plan.additions || !cached.plan.additions.length || (engine._buildBatchPreview && engine._buildBatchPreview.owner==='drawing'))){publish(cached.plan);return cached.plan;}
            var shape=engine.buildDrawingCells`);
 replace("            engine.showBuildBatchPreview(plan,'drawing');publish(plan);return plan;","            engine.showBuildBatchPreview(plan,'drawing');engine._drawCache={key:cacheKey,top:top,plan:plan};publish(plan);return plan;");
 replace("            if(!result.ok){engine.previewDrawing(engine._drawEnd);announceToSR(result.reason);return false;}","            if(!result.ok){engine._drawCache=null;engine.previewDrawing(engine._drawEnd);announceToSR(result.reason);return false;}");
});
edit('tests/geometry_world_drawing_tools.test.js',replace=>{
 replace(" it('rejects huge rectangles before materializing their cells'",` it('reuses a stationary preview until recipe or world history changes',()=>{const e=makeFixture().engine;e.setDrawMode('floor');const validate=vi.spyOn(e,'previewBuildBatch');e.beginDrawing({x:0,y:1,z:0});e.previewDrawing({x:10,y:1,z:10});const calls=validate.mock.calls.length;for(let i=0;i<20;i++)e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls);e._placeState.selectedBlock=1;e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls+1);e._undoStack.push({action:'place'});e.previewDrawing({x:10,y:1,z:10});expect(validate).toHaveBeenCalledTimes(calls+2);});
 it('rejects huge rectangles before materializing their cells'`);
});
console.log('Cached stationary drawing previews and added invalidation coverage.');
