const fs=require('node:fs'),vm=require('node:vm');
const file='stem_lab/stem_tool_geometryworld_builder.js';let source=fs.readFileSync(file,'utf8');
function replaceOnce(before,after){if(!source.includes(before)||source.indexOf(before)!==source.lastIndexOf(before))throw new Error('Patch anchor missing/ambiguous: '+before.slice(0,90));source=source.replace(before,after);}
replaceOnce('    engine._showcase = saved; engine.isLocked=false;', '    if(engine._builderSelectionFrame)engine._builderSelectionFrame.visible=false;\n    engine._showcase = saved; engine.isLocked=false;');
replaceOnce('        if(selectedIds[object.id] || object===camera)return;', '        if(selectedIds[object.id] || object===camera)return;\n        // The current selection frame has its own lifecycle; never restore a stale one.\n        if(object===engine._builderSelectionFrame){object.visible=false;return;}');
replaceOnce('      patchGeometryState(ctx,{showcaseActive:false,sandboxDockCollapsed:previous.collapsed});focusWorldSurface(30);', '      if(engine._builderSelectionFrame && engine._builderSelectionFrame.parent && !engine._destroyed)engine._builderSelectionFrame.visible=true;\n      patchGeometryState(ctx,{showcaseActive:false,sandboxDockCollapsed:previous.collapsed});focusWorldSurface(30);');
replaceOnce('outline=null, selectionPollCache={current:null}, selectionPollResult=null;', 'outline=null, outlineOwner=null, selectionPollCache={current:null}, selectionPollResult=null;');
replaceOnce('        function clearOutline(){if(outline){if(outline.parent)outline.parent.remove(outline);outline.geometry.dispose();outline.material.dispose();outline=null;}}', `        function clearOutline(){
          if(!outline)return;
          if(outlineOwner){
            if(outlineOwner._builderSelectionFrame===outline)delete outlineOwner._builderSelectionFrame;
            var showcase=outlineOwner._showcase;
            if(showcase){
              showcase.hidden=(showcase.hidden || []).filter(function(entry){return entry[0]!==outline;});
              if(showcase.studio)showcase.studio.hidden=(showcase.studio.hidden || []).filter(function(entry){return entry[0]!==outline;});
            }
          }
          if(outline.parent)outline.parent.remove(outline);
          outline.geometry.dispose();outline.material.dispose();outline=null;outlineOwner=null;
        }`);
replaceOnce('            if(outline){outline.visible=!eng._showcase;eng.scene.add(outline);}', '            if(outline){outlineOwner=eng;eng._builderSelectionFrame=outline;outline.visible=!eng._showcase;eng.scene.add(outline);}');
new vm.Script(source,{filename:file});
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({syntax:'passed',mirror:fs.readFileSync(file).equals(fs.readFileSync('desktop/web-app/public/'+file)),ownership:'engine._builderSelectionFrame',showcase:'Synchronous hide/restore of the current frame; Studio skips static restoration.'}));
