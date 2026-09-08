const fs=require('fs');const files=['stem_lab/stem_tool_geometryworld_builder.js','stem_lab/stem_tool_printlab.js','stem_lab/stem_tool_geometryworld.js'];const code=files.map(f=>fs.readFileSync(f,'utf8'));
function rep(i,a,b){if(!code[i].includes(a))throw Error('Missing '+a.slice(0,90));code[i]=code[i].replace(a,b);}
rep(0,'  function writeBinaryStl(triangles) {',`  function surfaceTopology(triangles) {
    var edges={};triangles.forEach(function(t){for(var i=0;i<3;i++){var a=t.v[i].map(function(v){return Math.round(v*1e5);}).join(','),b=t.v[(i+1)%3].map(function(v){return Math.round(v*1e5);}).join(',');var key=a<b?a+'|'+b:b+'|'+a;edges[key]=(edges[key]||0)+1;}});
    var open=0,nonManifold=0;Object.keys(edges).forEach(function(key){if(edges[key]===1)open++;else if(edges[key]>2)nonManifold++;});
    return {openEdges:open,nonManifoldEdges:nonManifold};
  }
  function writeBinaryStl(triangles) {`);
rep(0,'      contactGroups: triangles.contactGroups || [],','      topology:surfaceTopology(triangles),\n      contactGroups: triangles.contactGroups || [],');
rep(0,"      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);",fs.readFileSync(__dirname+'/selection-ui.txt','utf8')+"      React.useEffect(function () { return function () { editableReadTokenRef.current += 1; }; }, []);");
rep(0,'if (attempts < 30) timer = setTimeout(restore, 100);','if (attempts < 1200) timer = setTimeout(restore, 100);');
rep(0,"builderPrintContext:null, builderPanel:'build',", "builderPrintContext:null, builderPrintCheck:null, builderPanel:'build',\n      sandboxDockCollapsed:typeof window.matchMedia === 'function' && window.matchMedia('(max-width:800px)').matches,");
rep(0,"          h('div', { className: 'gwe-builder-actions' },",`          data.builderPrintCheck && h('div', {className:'gwe-connection-check', role:'status', 'data-connected':data.builderPrintCheck.components===1 && !data.builderPrintCheck.nonManifoldEdges ? 'true':'false'},
            h('strong',null,data.builderPrintCheck.error ? 'Check this selection' : data.builderPrintCheck.components>1 ? data.builderPrintCheck.components+' separate pieces' : data.builderPrintCheck.nonManifoldEdges ? 'Touching edges need review' : 'One joined piece'),
            h('p',null,data.builderPrintCheck.error || (data.builderPrintCheck.components>1 ? 'Some shapes do not touch, even when their grid cells are next to each other. Join them with a base, move the shapes, or plan separate parts in Print Lab.' : data.builderPrintCheck.nonManifoldEdges ? 'Some surfaces meet only along an edge. Add a connecting block or review the highlighted creation in Print Lab.' : 'The selected shapes share surfaces. Print Lab will check the exported mesh and physical scale.'))
          ),
          h('div', { className: 'gwe-builder-actions' },`);
rep(0,"    ].join('');\n    document.head.appendChild(style);",`      ,'.gwe-builder-head{position:sticky;top:0;z-index:2;background:#102335}.gwe-builder-dock{overflow:hidden}.gwe-builder-body{max-height:calc(100dvh - 214px);overflow:auto}.gwe-builder-intro{font-size:13px;line-height:1.55}.gwe-selection-label,.gwe-metric span,.gwe-print-ready-label{font-size:10px;letter-spacing:.03em}.gwe-selection-value,.gwe-builder-actions button{font-size:12px}.gwe-builder-actions .gwe-primary{font-size:13px}.gwe-builder-note,.gwe-print-ready p,.gwe-print-ready[data-fit] .gwe-print-ready-basis{font-size:12px;line-height:1.5}.gwe-connection-check{padding:10px;border:1px solid #22d3ee;border-radius:10px;background:#083344}.gwe-connection-check[data-connected="false"]{border-color:#fbbf24;background:#422b10}.gwe-connection-check strong{font-size:13px}.gwe-connection-check p{margin:5px 0 0;font-size:12px;line-height:1.5}.gwe-builder-dock button:focus-visible{outline:3px solid #fbbf24;outline-offset:2px}.gwe-collapse{min-width:44px;min-height:44px}'
      ,'#geoworld-fs-workspace[data-geometry-mode="sandbox"] .gw-inventory-panel{display:none!important}#geoworld-fs-workspace[data-geometry-mode="sandbox"][data-builder-panel="build"] .gw-measure-card{display:none!important}#geoworld-fs-workspace[data-geometry-mode="sandbox"][data-builder-panel="measure"] .gwe-builder-dock{top:auto;bottom:145px;max-height:64px;z-index:152}#geoworld-fs-workspace[data-geometry-mode="sandbox"][data-builder-panel="measure"] .gwe-builder-icon{display:none}'
      ,'@media(max-width:800px){.gwe-builder-dock{top:auto;bottom:142px;max-height:48%;right:7px}.gwe-builder-body{max-height:calc(48dvh - 72px)}.gwe-builder-dock[data-collapsed="true"]{bottom:142px;left:auto;max-height:72px}.gwe-builder-dock[data-collapsed="true"] .gwe-builder-icon{display:none}.gwe-builder-actions{grid-template-columns:1fr 1fr}.gwe-builder-actions .gwe-primary{grid-column:1/-1}#geoworld-fs-workspace[data-geometry-mode="sandbox"] .gw-measure-card{max-height:calc(100% - 250px)!important;overflow:auto!important;top:8px!important}}'
    ].join('');
    document.head.appendChild(style);`);
rep(2,'        engine.loadLesson = function(lesson) {','        engine.loadLesson = function(lesson) {\n          engine._builderSelection = null;');
rep(2,"          if (!m) return null;\n          if (engine.clearLayerFocus)","          if (!m) return null;\n          if (engine._currentLesson && engine._currentLesson.sandbox && inputMode !== 'builder_studio') { upd('builderPanel','measure'); upd('sandboxDockCollapsed',true); upd('hudPanel',''); }\n          if (engine.clearLayerFocus)");
// Fit the complete bounding sphere in both dimensions, including portrait resizing.
rep(1,'          camera.position.set(center.x + radius * 1.35, center.y + radius * 0.9, center.z + radius * 1.6);',`          var viewDirection=new THREE.Vector3(1.35,0.9,1.6).normalize();
          function fitCamera(){
            var vertical=camera.fov*Math.PI/360, horizontal=Math.atan(Math.tan(vertical)*camera.aspect);
            var distance=radius/Math.sin(Math.min(vertical,horizontal))*1.08;
            camera.position.copy(center).addScaledVector(viewDirection,distance);camera.lookAt(center);
            if(controls){controls.target.copy(center);controls.update();}
          }
          fitCamera();`);
rep(1,'renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();','renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();fitCamera();');
rep(1,'              camera.position.set(center.x + radius * 1.35, center.y + radius * 0.9, center.z + radius * 1.6);','              fitCamera();');
function write(p,s){const fd=fs.openSync(p,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}}
code.forEach(s=>new Function(s));files.forEach((file,i)=>{write(file,code[i]);write('desktop/web-app/public/'+file,code[i]);});console.log('Updated selection feedback, coordinated panels, typography, and preview framing.');
