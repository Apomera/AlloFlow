'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
function edit(name,change){const target=path.join(root,'tests',name),old=fs.readFileSync(target,'utf8'),eol=old.includes('\r\n')?'\r\n':'\n';let next=change(old.replace(/\r\n/g,'\n'));assert.notEqual(next,old.replace(/\r\n/g,'\n'),name+' must change');next=next.replace(/\n/g,eol);const fd=fs.openSync(target,'r+');fs.writeFileSync(fd,next);fs.ftruncateSync(fd,Buffer.byteLength(next));fs.closeSync(fd);console.log(name);}
function replace(s,from,to){assert(s.includes(from),'Missing fixture marker: '+from.slice(0,100));return s.replace(from,to);}
edit('geometry_world_print_presentation.test.js',s=>replace(s,"host.querySelector('.gwe-assistive-copy').textContent).toContain('width and height exceed the printer bed')","host.querySelector('.gwe-print-dimensions[role=\"status\"] .gwe-assistive-copy').textContent).toContain('width and height exceed the printer bed')"));
edit('geometry_world_retained_selection.test.js',s=>{
  for(const count of [1,2,3])s=replace(s,"app.host.querySelector('[aria-label=\"Build summary\"]').textContent).toContain('"+count+"Selected')","app.host.querySelector('[aria-label=\"Selected build summary\"]').textContent).toContain('"+count+"Blocks selected')");
  return s;
});
edit('geometry_world_surface_rendering.test.js',s=>replace(s,"const aoEnd = source.indexOf('        // Block operations', aoStart);","// End at the AO refresh function, not a later unrelated installer.\n      const aoEnd = source.indexOf('\\n        };', source.indexOf('        engine.refreshAllAO = function()', aoStart)) + '\\n        };'.length;"));
edit('geometry_world_studio_presentation.test.js',s=>replace(s,"cloneElement(node,props,children){return {type:node.type,props:{...node.props,...props,children}};}","cloneElement(node,props,...children){return {type:node.type,props:{...node.props,...props,...(children.length?{children:children.length===1?children[0]:children}:{})}};}"));
edit('geometry_world_visual_state_lifecycle.test.js',s=>{
  s=replace(s,"const doc={pointerLockElement:null,createElement(){return canvas();},getElementById(){return null;}};","const doc={pointerLockElement:null,createElement(){return canvas();},getElementById(id){return id==='allo-geometryworld-builder-css'?{}:null;}};\n  // Evaluate the actual complete helper set so Showcase dependencies stay current.\n  win.StemLab={_registry:{geometryWorld:{aliases:[],render(){return null;}}}};\n  const helpers=new Function('window','document',builder+';return window.StemLab.geometryWorldBuilderPure;')(win,doc);");
  s=replace(s,"'studioGroundFootprints','studioContactMap',showcase+';return showcaseBuild;'","'studioGroundFootprints','studioContactMap','creationGeometryBounds','installStudioBackdropColorSync','configureStudioFloorShadow','showcaseCompositionRect','fitShowcaseCamera',showcase+';return showcaseBuild;'");
  s=replace(s,"()=>[],()=>({canvas:canvas(),width:2,depth:2}));","()=>[],()=>({canvas:canvas(),width:2,depth:2}),helpers.creationGeometryBounds,helpers.installStudioBackdropColorSync,helpers.configureStudioFloorShadow,helpers.showcaseCompositionRect,helpers.fitShowcaseCamera);");
  return s;
});
