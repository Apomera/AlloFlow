const fs=require('fs');const files=['stem_lab/stem_tool_printlab.js','tests/geometry_world_printlab_bridge.test.js','tests/geometry_world_print_workflow.test.js'];const code=files.map(f=>fs.readFileSync(f,'utf8').replace(/\r\n/g,'\n'));
function rep(i,a,b){if(!code[i].includes(a))throw Error('Missing '+a.slice(0,90));code[i]=code[i].replace(a,b);}
rep(0,'  function ensurePrintRuntime() {',`  function ensurePrintZip() {
    return loadSidecar([selfAsset('../jszip/3.10.1/jszip.min.js'),selfAsset('../vendor/jszip-3.10.1.min.js')],
      'print-lab-zip',function(){return typeof window.JSZip === 'function';},'The local package writer could not load. Individual STL and review downloads remain available.');
  }
  function editableGeometrySource(source) {
    if(!source || !source.blocks || !source.blocks.length)return null;
    var min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
    source.blocks.forEach(function(b){[b.x,b.y,b.z].forEach(function(v,k){min[k]=Math.min(min[k],v);max[k]=Math.max(max[k],v);});});
    var value={schema:'alloflow-geometry-world/2',title:safeText(source.title,80)||'Geometry World build',coordinateSystem:'x-right,y-up,z-depth',blocks:source.blocks.map(function(b){return {x:b.x-Math.floor((min[0]+max[0])/2),y:b.y-min[1]+1,z:b.z-Math.floor((min[2]+max[2])/2),type:b.type,shape:b.shape,rotation:b.rotation};})};
    var pure=window.StemLab.geometryWorldBuilderPure;
    return pure && pure.normalizeEditableWorld && pure.normalizeEditableWorld(value).ok ? value : null;
  }
  function ensurePrintRuntime() {`);
rep(0,'    readPendingLocalHandoff: readPendingLocalHandoff,','    editableGeometrySource:editableGeometrySource,\n    readPendingLocalHandoff: readPendingLocalHandoff,');
rep(0,"        downloadBlob(new Blob([JSON.stringify(source, null, 2)], { type: 'application/json' }), 'geometry-world-editable-build.json');", "        var editable=editableGeometrySource(source);\n        if(!editable){announce('This build exceeds editable sandbox file limits. Keep its STL and the source recipe in a print package.');return;}\n        downloadBlob(new Blob([JSON.stringify(editable, null, 2)], { type: 'application/json' }), 'geometry-world-editable-build.json');");
rep(0,'      function exportStl() {',`      function downloadPrintPackage() {
        if(!Printable || !sourceContext || sourceContext.sourceTool!=='geometryWorld' || !report || report.status==='FAIL') {chooseTab('Preflight');return;}
        var token=beginOperation('export'), startedRevision=contextRevisionRef.current;
        Promise.all([ensureThree(),ensurePrintZip()]).then(function(ready){
          if(!operationIsCurrent('export',token,startedRevision))return null;
          var THREE=ready[0], object=makeModelObject(THREE,format,recipe,fileBytes,glbRoot,unitMm);
          if(!object)throw new Error('No model is ready to package.');
          var buffer;try{centerAndGround(THREE,object);buffer=Printable.exportBinaryStl(THREE,object);}finally{disposeObject(object,false);}
          if(!buffer)throw new Error('The model could not be exported.');
          var inspection=Printable.inspectStl(buffer,1,profile);
          if(inspection.status==='FAIL')throw new Error('The exported model needs another preflight review.');
          return Printable.sha256Hex(buffer).then(function(hash){
            if(!operationIsCurrent('export',token,startedRevision))return null;
            var zip=new window.JSZip(), editable=editableGeometrySource(sourceContext.sourceModel);
            var manifest={schema:'alloflow-print-package/1',title:safeText(title,100),description:safeText(description,500),
              model:{file:'model.stl',sha256:hash,units:'mm',coordinateSystem:'z-up',dimensionsMm:inspection.dimensionsMm},
              source:{tool:'geometryWorld',millimetersPerBlock:unitMm,editableFile:editable?'editable-world.json':null,recipeFile:'block-source.json'},
              material:materialId,printerProfile:profile,preflight:inspection,aiUse:aiUse,aiDisclosure:safeText(aiDisclosure,500),
              reviewStatus:'AWAITING_SLICER_AND_STAFF_REVIEW'};
            zip.file('model.stl',new Uint8Array(buffer));zip.file('manifest.json',JSON.stringify(manifest,null,2));
            zip.file('block-source.json',JSON.stringify(sourceContext.sourceModel,null,2));
            if(editable)zip.file('editable-world.json',JSON.stringify(editable,null,2));
            zip.file('READ-ME.txt','Geometry World print package\\n\\nOpen model.stl in the school slicer. Units are millimeters: import at 100% scale. The chosen '+unitMm+' mm per block is already applied.\\nDimensions (width x depth x height): '+inspection.dimensionsMm.width+' x '+inspection.dimensionsMm.depth+' x '+inspection.dimensionsMm.height+' mm.\\n'+(editable?'To edit the selected creation, open editable-world.json with Geometry World > Open editable world.':'The selection exceeds editable sandbox file limits; block-source.json preserves its source recipe for recovery.')+'\\nmanifest.json records the STL hash, dimensions, material, printer profile and advisory checks. Review orientation, supports and the sliced layers before staff approval. This package does not start a printer.\\n');
            return zip.generateAsync({type:'blob',compression:'DEFLATE'});
          });
        }).then(function(blob){if(blob && operationIsCurrent('export',token,startedRevision)){downloadBlob(blob,Printable.safeFilename(title||'geometry-world')+'-print-package.zip');announce('Downloaded one print package with a millimeter STL, source, and review manifest.');}})
          .catch(function(error){if(operationIsCurrent('export',token,startedRevision))announce(error.message||'The print package could not be created.');});
      }
      function exportStl() {`);
rep(0,"            h('button', { type: 'button', disabled: !title.trim() || !report || report.status === 'FAIL', onClick: downloadHandoff,", "            sourceContext && sourceContext.sourceTool==='geometryWorld' && h('button',{type:'button',disabled:!report || report.status==='FAIL',onClick:downloadPrintPackage,className:'min-h-[48px] w-full rounded-xl bg-emerald-700 px-4 text-sm font-black text-white disabled:opacity-50'},'Download print package'),\n            sourceContext && sourceContext.sourceTool==='geometryWorld' && h('p',{className:'text-xs leading-5 text-slate-200'},'One ZIP contains the STL at its final millimeter size, block source, and review manifest. Use the editable world file to reopen supported builds.'),\n            h('button', { type: 'button', disabled: !title.trim() || !report || report.status === 'FAIL', onClick: downloadHandoff,");
rep(0,"['Model bytes embedded', 'No']","['Review JSON embeds model', 'No']");
// The fixtures describe the same physical triangles, rotated into STL coordinates.
rep(1,'const values = [0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 3, 1];','const values = [0, -1, 0, 0, 0, 0, 1, -2, 0, 0, -1, 3];');
rep(1,'setFloat32(84 + 10 * 4, 6, true)','setFloat32(84 + 11 * 4, 6, true)');
rep(1,'view.setFloat32(84 + 8 * 4, 8, true);','view.setFloat32(84 + 7 * 4, -8, true);');
rep(1,'view.setFloat32(84 + 10 * 4, 1, true);','view.setFloat32(84 + 11 * 4, 1, true);');
rep(1,"it('drops a shared face only when both neighbours present the same polygon on it'", "it('subtracts shared polygon area for both full and partial face contacts'");
rep(1,'    // A partial overlap is real geometry on both sides: nothing is dropped. The\n    // same triangle objects are reused from the call above on purpose: the rule\n    // must not leave marks on its inputs.\n    expect(pure.unionSurface([a2, c], selected)).toHaveLength(6);',`    // Partial contact removes the overlapping half, leaving only the exposed half
    // of the cube face. Reused inputs must remain immutable.
    const exposed = pure.unionSurface([a2,c],selected).filter(t=>t.n[0]===1);
    const area=exposed.reduce((sum,t)=>{const [a,b,c]=t.v,u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);return sum+Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])/2;},0);
    expect(area).toBeCloseTo(0.5,6);`);
rep(2,"  it('closes mixed multi-block intersections',()=>{", "  it('preserves a genuine pinched edge warning in a dense mixed sculpture',()=>{");
rep(2,"const {report}=inspect(blocks,1);expect(report.status, JSON.stringify(report)).toBe('PASS');expect(report.enclosedVolumeMm3).toBeCloseTo(blocks.reduce((v,b)=>v+volumes[b.shape],0),3);", "const {report,bundle}=inspect(blocks,1);expect(report.openEdges).toBe(0);expect(report.nonManifoldEdges).toBeGreaterThan(0);expect(bundle.topology.nonManifoldEdges).toBe(report.nonManifoldEdges);expect(report.enclosedVolumeMm3).toBeNull();expect(report.signedVolumeMm3).toBeCloseTo(blocks.reduce((v,b)=>v+volumes[b.shape],0),3);");
rep(2,"  it('preserves a genuine pinched edge warning",`  it('joins a mixed row to a continuous base without open edges',()=>{
    const blocks=[];for(let x=0;x<4;x++){blocks.push({x,y:1,z:0,shape:'cube'});blocks.push({x,y:2,z:0,shape:Object.keys(volumes)[x],rotation:0});}
    const {report}=inspect(blocks,1);expect(report.status).toBe('PASS');expect(report.enclosedVolumeMm3).toBeCloseTo(6.25,3);
  });
  it('creates a source file that the editable-world importer accepts',()=>{
    const {bundle}=inspect([{x:12,y:6,z:-7,shape:'quarter',rotation:3},{x:13,y:6,z:-7,shape:'cube',rotation:0}]);
    const editable=print.editableGeometrySource(bundle.sourceModel);expect(builder.normalizeEditableWorld(editable).ok).toBe(true);
    expect(editable.blocks.map(b=>b.shape)).toEqual(['quarter','cube']);expect(Math.min(...editable.blocks.map(b=>b.y))).toBe(1);
  });
  it('preserves a genuine pinched edge warning`);
function write(p,s){const fd=fs.openSync(p,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}}
new Function(code[0]);files.forEach((file,i)=>write(file,code[i]));write('desktop/web-app/public/'+files[0],code[0]);console.log('Added print package and reopened editable source; updated geometric fixtures.');
