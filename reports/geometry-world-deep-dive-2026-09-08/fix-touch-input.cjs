const fs=require('node:fs');
function write(p,s){const fd=fs.openSync(p,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
let p='stem_lab/stem_tool_geometryworld.js',s=fs.readFileSync(p,'utf8');
s=s.replace("if (lastTouch && lastTouch.key === actionKey && Date.now() - lastTouch.at < 700) return;", "// A touch can reveal Undo and move another button under the finger before\n        // the browser synthesizes click. Suppress that click across action keys.\n        if (lastTouch && (!ev || ev.detail !== 0) && Date.now() - lastTouch.at < 700) return;");
s=s.replace(/onClick: function\(\) \{ runMobileButtonAction\('([^']+)', (\w+)\); \},/g,"onClick: function(ev) { runMobileButtonAction('$1', $2, ev); },");
const marker="            // Undo button\r\n            engine._undoStack && engine._undoStack.length > 0 && el('button', {";
const markerLf=marker.replaceAll('\r\n','\n');
if(s.includes(marker))s=s.replace(marker,"            // Keep the action column stable while Undo becomes available.\r\n            el('button', { disabled:!engine._undoStack || engine._undoStack.length === 0,");
else if(s.includes(markerLf))s=s.replace(markerLf,"            // Keep the action column stable while Undo becomes available.\n            el('button', { disabled:!engine._undoStack || engine._undoStack.length === 0,");
else throw new Error('Touch Undo anchor missing');
write(p,s);write('desktop/web-app/public/'+p,s);
p='stem_lab/stem_tool_geometryworld_builder.js';s=fs.readFileSync(p,'utf8');
s=s.replace('    var elements = mesh.matrixWorld.elements;', "    var elements = mesh.matrixWorld.elements;\n    // Placement pop is a display effect, never a change in printable dimensions.\n    if (mesh.userData && mesh.userData._popT != null && mesh.scale) {\n      elements = Array.prototype.slice.call(elements);\n      ['x','y','z'].forEach(function(axis,column){var scale=mesh.scale[axis];if(scale && isFinite(scale)){for(var row=0;row<4;row++)elements[column*4+row]/=scale;}});\n    }");
write(p,s);write('desktop/web-app/public/'+p,s);
p='tests/geometry_world_keyboard_access.test.js';s=fs.readFileSync(p,'utf8').replace("onClick: function() { runMobileButtonAction('${pair[1]}', ${pair[2]}); },", "onClick: function(ev) { runMobileButtonAction('${pair[1]}', ${pair[2]}, ev); },");write(p,s);
p='reports/geometry-world-deep-dive-2026-09-08/verify-touch.cjs';s=fs.readFileSync(p,'utf8').replace('results.placed.undo!==1','results.placed.undo!==2');write(p,s);
p='tests/geometry_world_print_workflow.test.js';s=fs.readFileSync(p,'utf8');s+=`
describe('Geometry World transient interaction fidelity',()=>{
  it('ignores placement pop scale when preparing a printable mesh',()=>{
    const blocks=[{x:0,y:1,z:0,shape:'cube'},{x:1,y:1,z:0,shape:'halfB'}],en=engineFor(blocks);
    en.blocks['1,1,0'].scale.setScalar(0.7);en.blocks['1,1,0'].userData._popT=0.1;
    const bundle=builder.buildGeometryWorldStl(en,blocks),report=printable.inspectStl(bundle.buffer,5);
    expect(report.status).toBe('PASS');expect(report.dimensionsMm).toEqual({width:10,depth:5,height:5});expect(report.enclosedVolumeMm3).toBeCloseTo(187.5,3);
    expect(en.blocks['1,1,0'].scale.x).toBe(0.7);
  });
  it('blocks the synthesized click even if a touch moves a different action under the finger',()=>{
    const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),start=source.indexOf('      function runMobileButtonAction('),end=source.indexOf('      function beginMobileJump()',start);
    const en={},run=new Function('engine',source.slice(start,end)+'return runMobileButtonAction;')(en);let placed=0,broken=0;
    run('place',()=>placed++,{type:'touchstart',stopPropagation(){}});
    run('break',()=>broken++,{type:'click',detail:1});expect(placed).toBe(1);expect(broken).toBe(0);
    run('break',()=>broken++,{type:'click',detail:0});expect(broken).toBe(1);
    run('place',()=>placed++,{type:'touchstart',stopPropagation(){}});expect(placed).toBe(2);
    en._lastTouchAction.at-=701;run('break',()=>broken++,{type:'click',detail:1});expect(broken).toBe(2);
  });
});
`;write(p,s);console.log('Touch ghost-click guard, stable Undo, and animation-independent print geometry applied.');
