const fs=require('fs'),vm=require('vm');
function edit(file,fn){let s=fs.readFileSync(file,'utf8');const r=(a,b)=>{if(s.split(a).length!==2)throw Error('Anchor '+a.slice(0,100));s=s.replace(a,b);};fn(r);if(file.endsWith('.js')||file.endsWith('.cjs'))new vm.Script(s);const b=Buffer.from(s),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);}
edit('stem_lab/stem_tool_geometryworld_builder.js',r=>{
 r(".gwe-project-pick{display:flex;", ".gwe-project-pick{font:inherit;display:flex;");
 r("onToggle:function(e){setStarterOpen(e.currentTarget.open);}","onToggle:function(e){var panel=e.currentTarget;setStarterOpen(panel.open);if(panel.open)window.requestAnimationFrame(function(){if(panel.isConnected && panel.scrollIntoView)panel.scrollIntoView({block:'start'});});}");
 r("Open an editable Geometry World JSON file. Review its contents before replacing your workspace.","Return to a local project, or open an editable Geometry World JSON file.");
 r("setProjectName(chosen.world.title);setProjectChoice('');setRemoveProject('');setPointerMode('build');","setProjectName(chosen.world.title);setProjectChoice('');setRemoveProject('');setPointerMode('build');if(chosen.world.blocks.length)live._builderSelection={blocks:chosen.world.blocks.map(function(b){return {x:b.x,y:b.y,z:b.z};}),exact:true};");
 r("announce(ctx,'Opened '+chosen.world.title+'. Continue editing your saved blocks.','success');focusWorldSurface(50);","announce(ctx,'Opened '+chosen.world.title+'. Continue editing your saved blocks.','success');if(chosen.world.blocks.length)window.requestAnimationFrame(function(){if(window[ENGINE_KEY]===live && live._workshopProjectId===chosen.id)focusSelectedBuild(liveBuilderCtx.current);});else focusWorldSurface(50);");
 r("Move buttons preview one grid step. Apply preview commits the whole selection.","X moves left/right; Z moves in depth. Buttons preview one grid step. Apply preview commits the whole selection.");
});
edit('stem_lab/stem_tool_geometryworld.js',r=>{
 r("[fx,floor+3.92,north+.01],[fx+.75,floor+3.92,north+.01],[fx+.375,floor+3.15,north+.01]","[fx,floor+3.92,north+.01],[fx+.375,floor+3.15,north+.01],[fx+.75,floor+3.92,north+.01]");
});
edit('reports/geometry-world-workshop-2026-09-12/browser.cjs',r=>{
 r("const beforeBase=(await world()).count;", "const beforeBaseState=await world(),beforeBase=beforeBaseState.count;");
 r("afterBase.undo===1", "afterBase.undo===beforeBaseState.undo+1");
 r("check('My Worlds restores every editable block after refresh',(await world()).count===pavilion);", "check('My Worlds restores every editable block after refresh',(await world()).count===pavilion);await page.waitForFunction(()=>__geoWorldEngine._creationFocus?.frame&&!__geoWorldEngine._creationFocus.transition);check('Reopened project is framed instead of spawning inside the building',await page.evaluate(()=>!!__geoWorldEngine._creationFocus));await expand();");
});
console.log('Project framing, typography, starter discovery and scene pennants refined.');
