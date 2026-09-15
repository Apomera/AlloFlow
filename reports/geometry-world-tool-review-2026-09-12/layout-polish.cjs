const fs=require('fs'),vm=require('vm');function edit(file,edits,check=true){const raw=fs.readFileSync(file,'utf8');let s=raw.replace(/\r\n/g,'\n');for(const [a,b]of edits){if(s.split(a).length!==2)throw Error('Expected one: '+a.slice(0,80));s=s.replace(a,b);}if(check)new vm.Script(s);if(raw.includes('\r\n'))s=s.replace(/\n/g,'\r\n');const fd=fs.openSync(file,'r+');fs.writeSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',[
 ["engine.setViewPreset('front',{x:(facts.min.x+facts.max.x)/2", "engine.setViewPreset(facts.width>=facts.depth?'side':'front',{x:(facts.min.x+facts.max.x)/2"],
 ["'aria-label': 'Free Build Studio'", "'aria-label': 'Free Build Studio', 'data-finder':toolFinderOpen?'true':'false'"],
 [".gwe-tool-finder{display:flex;flex-direction:column;", ".gwe-tool-finder{display:flex;flex:1;flex-direction:column;"],
 ["min-height:36px;border-color:transparent;text-decoration:underline", "min-height:44px;border-color:transparent;text-decoration:underline"],
 ["toolFinderOpen?'×':'⌕'", "toolFinderOpen?'×':'→'"],
 [".gwe-tool-finder-bar{flex:none;", ".gwe-tool-finder-bar{flex:none;"],
 [".gwe-preview-review{top:118px;left:12px;max-width:calc(100% - 24px);padding:12px}}", ".gwe-preview-review{top:118px;left:12px;max-width:calc(100% - 24px);padding:12px}}@media(max-height:520px){.gwe-builder-dock[data-collapsed=false]{position:fixed;top:8px;bottom:8px;right:12px;height:auto;max-height:calc(100dvh - 16px)}.gwe-builder-dock[data-collapsed=false] .gwe-builder-head{padding:8px 12px;min-height:0}.gwe-builder-dock[data-collapsed=false] .gwe-workflow,.gwe-builder-dock[data-collapsed=false] .gwe-builder-quick-actions{display:none}.gwe-builder-dock[data-finder=true] .gwe-builder-head,.gwe-builder-dock[data-finder=true] .gwe-builder-footer{display:none}.gwe-preview-review{top:70px;left:12px;max-height:calc(100dvh - 82px);overflow:auto}}"]
]);
edit('tests/geometry_world_tool_review.test.js',[["toHaveBeenCalledWith('front',expect.objectContaining({radius:expect.any(Number)}))", "toHaveBeenCalledWith('side',expect.objectContaining({radius:expect.any(Number)}))"]],false);
console.log('Framed the broad face of flat previews and bounded short-screen controls.');
