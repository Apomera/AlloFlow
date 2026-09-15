const fs=require('node:fs'),assert=require('node:assert/strict'),file='stem_lab/stem_tool_geometryworld_builder.js';
const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';let s=raw.replace(/\r\n/g,'\n');
function change(a,b){assert.equal(s.split(a).length,2,a.slice(0,100));s=s.replace(a,b);}
const fragment=fs.readFileSync(__dirname+'/print-guide.fragment.js','utf8').replace(/\r\n/g,'\n');
change('  window.StemLab.geometryWorldBuilderPure = {',fragment+'\n  window.StemLab.geometryWorldBuilderPure = {\n    geometryPrintGuideData:geometryPrintGuideData,createGeometryPrintGuide:createGeometryPrintGuide,disposeGeometryPrintGuide:disposeGeometryPrintGuide,syncGeometryPrintGuide:syncGeometryPrintGuide,');
change('          if(outline)outline.visible=!(eng && eng._showcase);','          if(outline)outline.visible=!(eng && eng._showcase);\n          syncGeometryPrintGuide(eng,liveBuilderCtx.current);');
change('if(eng!==previousEngine){if(previousEngine && previousEngine.disposeShowcaseLook)', 'if(eng!==previousEngine){disposeGeometryPrintGuide(previousEngine);if(previousEngine && previousEngine.disposeShowcaseLook)');
change('return function(){clearInterval(timer);if(previousEngine && previousEngine.disposeShowcaseLook)', 'return function(){clearInterval(timer);disposeGeometryPrintGuide(previousEngine);if(previousEngine && previousEngine.disposeShowcaseLook)');
change('check={components:bundle.connectedComponents,triangles:bundle.triangleCount,nonManifoldEdges:bundle.topology.nonManifoldEdges,openEdges:bundle.topology.openEdges};','check={components:bundle.connectedComponents,triangles:bundle.triangleCount,nonManifoldEdges:bundle.topology.nonManifoldEdges,openEdges:bundle.topology.openEdges,contactGroups:bundle.contactGroups,selectionSignature:next};');
change("            h('p', {className:'gwe-print-scale'}, currentPrintUnit + ' mm per block \\u00B7 Bed ' + printEnvelope.profileLabel),",`            h('p', {className:'gwe-print-scale'}, currentPrintUnit + ' mm per block \\u00B7 Bed ' + printEnvelope.profileLabel),
            h('details',{className:'gwe-details gwe-print-guide-options'},
              h('summary',null,'Inspect print fit'),
              h('p',null,'See the printer volume and separate pieces around your selected creation.'),
              h('div',{className:'gwe-builder-actions'},
                h('button',{type:'button','aria-pressed':!!data.builderPrintGuide,onClick:function(){patchGeometryState(ctx,{builderPrintGuide:!data.builderPrintGuide});}},data.builderPrintGuide?'Hide print guide':'Show print guide'),
                data.builderPrintGuide && h('button',{type:'button',onClick:function(){frameGeometryPrintGuide(ctx);}},'View printer bed'),
                engine && engine._viewPreset && engine._viewPreset!=='free' && h('button',{type:'button',onClick:function(){engine.setViewPreset('free');focusWorldSurface(30);}},'Return camera')),
              data.builderPrintGuide && data.builderPrintGuideSummary && h('div',{className:'gwe-print-guide-summary',role:'status'},
                h('p',null,data.builderPrintGuideSummary.fits?'The selected mesh fits in this orientation.':'Coral outlines mark '+data.builderPrintGuideSummary.outside+' blocks extending beyond the printer volume.'),
                data.builderPrintGuideSummary.parts.length>1 && h('p',null,data.builderPrintGuideSummary.parts.length+' separate pieces are outlined. '+(data.builderPrintGuideSummary.raisedParts?data.builderPrintGuideSummary.raisedParts+' pieces sit above the lowest surface; review supports or join them with a base.':'Each piece reaches the lowest surface.')),
                (data.builderPrintGuideSummary.openEdges>0 || data.builderPrintGuideSummary.nonManifoldEdges>0) && h('p',null,'Surface connections need review in Print Lab.'),
                h('p',{className:'gwe-print-ready-basis'},'Centered on the printer bed at the current scale. Check exported mesh surfaces and supports in Print Lab.'))),`);
new Function(s);const bytes=Buffer.from(s.replace(/\n/g,eol)),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,bytes);fs.ftruncateSync(fd,bytes.length);}finally{fs.closeSync(fd);}
console.log('Added selected-mesh print fit and separate-piece overlays.');
