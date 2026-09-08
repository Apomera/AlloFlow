const fs=require('node:fs');
const p='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(p,'utf8');
function replace(a,b){if(!s.includes(a))throw Error('Missing '+a.slice(0,80));s=s.replace(a,b);}
replace("    [engine._dimLines,engine._selectionGlows,engine._layerGhosts].forEach", "    selected.measurement.blocks.forEach(function(p){var mesh=engine.blocks[keyFor(p)];saved.hidden.push([mesh,mesh.visible]);mesh.visible=true;});\n    [engine._dimLines,engine._selectionGlows,engine._layerGhosts].forEach");
replace("          if(outline)outline.visible=!(eng && eng._showcase);", "          if(eng && !eng._showcase && (liveBuilderCtx.current.toolData.geometryWorld || {}).showcaseActive)patchGeometryState(liveBuilderCtx.current,{showcaseActive:false});\n          if(outline)outline.visible=!(eng && eng._showcase);");
replace("outline.renderOrder=998;eng.scene.add(outline);", "outline.renderOrder=998;outline.visible=!eng._showcase;eng.scene.add(outline);");
replace(".gw-measure-card{visibility:hidden!important}", ".gw-measure-card,#geoworld-fs-workspace[data-showcase-active=\"true\"] .gw-viewport-control{visibility:hidden!important}");
for(const f of [p,'desktop/web-app/public/'+p]){const fd=fs.openSync(f,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
console.log('Showcase visibility and restoration safeguards installed.');
