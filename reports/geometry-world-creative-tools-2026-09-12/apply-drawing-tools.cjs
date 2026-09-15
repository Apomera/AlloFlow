const fs=require('fs'),assert=require('assert');
function edit(path,run){const original=fs.readFileSync(path,'utf8'),crlf=original.includes('\r\n');let source=original.replace(/\r\n/g,'\n');function replace(old,next){assert.equal(source.split(old).length,2,'Unique anchor: '+old.slice(0,110));source=source.replace(old,next);}run(replace);const output=crlf?source.replace(/\n/g,'\r\n'):source,fd=fs.openSync(path,'r+');try{fs.writeSync(fd,output);fs.ftruncateSync(fd,Buffer.byteLength(output));}finally{fs.closeSync(fd);}}
const folder='reports/geometry-world-creative-tools-2026-09-12/';
edit('stem_lab/stem_tool_geometryworld.js',replace=>{
  replace('        // End atomic student construction.', '        // End atomic student construction.\n\n'+fs.readFileSync(folder+'drawing-runtime.fragment.js','utf8').replace(/\r\n/g,'\n'));
  replace('          if(engine.endShowcase)engine.endShowcase();\n          engine._builderSelection = null;',"          if(engine.endShowcase)engine.endShowcase();\n          if(engine.cancelDrawing)engine.cancelDrawing(true);\n          if(engine.clearBuildBatchPreview)engine.clearBuildBatchPreview();\n          engine._drawMode='single';upd('drawMode','single');\n          engine._builderSelection = null;");
  replace("        canvas.addEventListener('click', _cvH.click = function(ev) {","        canvas.addEventListener('click', _cvH.click = function(ev) {\n          if(engine._drawMode && engine._drawMode!=='single')return;");
  replace("            case 'Escape':\n              // Shift+Esc:","            case 'Escape':\n              if(engine._drawStart && engine.isDrawingAllowed && engine.isDrawingAllowed()){ev.preventDefault();engine.cancelDrawing();break;}\n              // Shift+Esc:");
  replace("        engine.interactAtCrosshair = function(action) {\n          var THREE = window.THREE;","        engine.interactAtCrosshair = function(action) {\n          if(action==='place' && engine._drawMode && engine._drawMode!=='single')return engine.drawAtCrosshair();\n          var THREE = window.THREE;");
  replace("        canvas.addEventListener('mousedown', _cvH.mousedown = function(ev) {",fs.readFileSync(folder+'drawing-pointer.fragment.js','utf8').replace(/\r\n/g,'\n')+"\n\n        canvas.addEventListener('mousedown', _cvH.mousedown = function(ev) {");
  replace('        function updateGhostPreview() {\n          var THREE = window.THREE;',"        function updateGhostPreview() {\n          var THREE = window.THREE;\n          if(engine._drawMode && engine._drawMode!=='single') {\n            if(engine._ghostMesh)engine._ghostMesh.visible=false;\n            if(engine._highlightMesh)engine._highlightMesh.visible=false;\n            if(engine._hoverGlowMesh)engine._hoverGlowMesh.visible=false;\n            engine.updateDrawingPreview();return;\n          }");
  replace('          engine._destroyed = true;',"          engine._destroyed = true;\n          if(engine.cancelDrawing)engine.cancelDrawing(true);\n          if(engine.clearBuildBatchPreview)engine.clearBuildBatchPreview();");
  replace("worldActive && !d.showcaseActive && openModals.length === 0 && d.placementHint && el('div', {","worldActive && !d.showcaseActive && openModals.length === 0 && (!d.drawMode || d.drawMode==='single') && d.placementHint && el('div', {");
});
edit('stem_lab/stem_tool_geometryworld_builder.js',replace=>{
  replace("      var additions = [];",`      function renderDrawingTools() {
        var mode=data.drawMode || 'single',preview=data.drawPreview || {};
        return h('section',{className:'gwe-drawing-tools','aria-label':'Fast building'},
          h('h3',{className:'gwe-section-title'},'Build faster'),
          h('div',{className:'gwe-draw-modes',role:'group','aria-label':'Drawing tool'},
            [['single','Block'],['line','Line'],['floor','Floor'],['wall','Wall']].map(function(item){return h('button',{key:item[0],type:'button','aria-pressed':mode===item[0],onClick:function(){if(engine && engine.setDrawMode)engine.setDrawMode(item[0]);}},item[1]);})),
          mode==='wall' && h('label',{className:'gwe-draw-height'},'Wall height',h('input',{type:'number',min:1,max:32,step:1,value:data.drawWallHeight || 3,'aria-label':'Wall height in blocks',onChange:function(event){if(engine && engine.setDrawHeight)engine.setDrawHeight(Number(event.target.value));}}),h('span',null,'blocks')),
          mode!=='single' && h('p',{className:'gwe-builder-note'},'Drag on the world to preview, then Place. Or aim and press B / tap Place to choose each endpoint. Escape cancels.'),
          mode!=='single' && h('button',{type:'button',className:'gwe-draw-resume',onClick:function(){resumeBuilding();}},'Open drawing view')
        );
      }
      var additions = [];`);
  replace("          !hasRetainedSelection && renderCurrentTools(),","          !hasRetainedSelection && renderCurrentTools(),\n          renderDrawingTools(),");
  replace("      if(guideOpen)additions.push(renderActivityGuide());",`      if(isSandbox && data.worldActive && !homeOpen && !guideOpen && engine && !engine._showcase && data.drawMode && data.drawMode!=='single' && engine.isDrawingAllowed && engine.isDrawingAllowed()) {
        var drawInfo=data.drawPreview || {},drawStarted=!!drawInfo.started;
        additions.push(h('section',{key:'gwe-draw-hud',className:'gwe-draw-hud','data-ok':drawInfo.ok?'true':'false','aria-label':'Drawing preview'},
          h('div',{className:'gwe-draw-caption'},h('strong',null,data.drawMode.charAt(0).toUpperCase()+data.drawMode.slice(1)+' tool'),h('span',{role:'status','aria-live':'polite','aria-atomic':'true'},drawInfo.reason || 'Aim at a block face and set the start point.')),
          h('div',{className:'gwe-draw-hud-actions'},
            h('button',{type:'button',disabled:drawStarted && !drawInfo.ok,onClick:function(){if(engine.drawAtCrosshair)engine.drawAtCrosshair();focusWorldSurface(0);}},drawStarted?'Place '+(drawInfo.count || 0)+' blocks':'Set start'),
            h('button',{type:'button',onClick:function(){if(drawStarted)engine.cancelDrawing();else engine.setDrawMode('single');focusWorldSurface(0);}},drawStarted?'Cancel':'Block tool'))));
      }
      if(guideOpen)additions.push(renderActivityGuide());`);
  // Append styles to the existing mounted style element, without changing selectors owned by other refinements.
  replace("      var additions = [];",`      var drawingCss='.gwe-drawing-tools{padding:12px 0;border-top:1px solid rgba(56,85,70,.14)}.gwe-draw-modes{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.gwe-draw-modes button{min-height:44px;padding:6px 3px!important}.gwe-draw-modes button[aria-pressed="true"]{background:#315f4c!important;color:#fff!important;border-color:#315f4c!important}.gwe-draw-height{display:flex;align-items:center;gap:8px;font-size:12px;margin-top:9px}.gwe-draw-height input{min-width:0;width:62px;min-height:44px;border:1px solid #8fa799;border-radius:9px;background:#fffdf5;color:#29473a;padding:5px}.gwe-draw-resume{width:100%;min-height:44px}.gwe-draw-hud{position:absolute;z-index:34;top:108px;left:50%;transform:translateX(-50%);width:350px;max-width:calc(100% - 28px);padding:10px 12px;border:1px solid #acbeaf;border-radius:14px;background:rgba(249,246,233,.97);color:#29473a;box-shadow:0 8px 28px rgba(24,48,39,.14);font-size:12px;pointer-events:auto}.gwe-draw-caption{display:flex;flex-direction:column;gap:3px}.gwe-draw-caption strong{font-size:13px}.gwe-draw-hud-actions{display:flex;gap:6px;margin-top:8px}.gwe-draw-hud-actions button{flex:1;min-width:0;min-height:44px;border:1px solid #94ad9d;border-radius:9px;background:#eef3e8;color:#29473a;font-weight:700;cursor:pointer}.gwe-draw-hud-actions button:first-child{background:#315f4c;color:#fff}.gwe-draw-hud-actions button:disabled{opacity:.55;cursor:default}.gwe-draw-hud button:focus-visible,.gwe-drawing-tools button:focus-visible,.gwe-draw-height input:focus-visible{outline:3px solid #2f765b;outline-offset:3px}@media(max-width:800px){.gwe-draw-hud{top:110px;width:300px;padding:8px 10px}}';
      var additions = [h('style',{key:'gwe-drawing-css'},drawingCss)];`);
});
console.log('Applied Line / Floor / Wall drawing tools and accessible controls.');
