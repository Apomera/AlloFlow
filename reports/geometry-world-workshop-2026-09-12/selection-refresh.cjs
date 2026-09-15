const fs=require('fs'),file='stem_lab/stem_tool_geometryworld_builder.js';let s=fs.readFileSync(file,'utf8');
function r(a,b){if(s.split(a).length!==2)throw Error(a);s=s.replace(a,b);}
r('signature=next;eng._builderSelection={blocks:m.blocks.slice()};','signature=next;eng._builderSelection=Object.assign({blocks:m.blocks.slice()},eng._builderSelection && eng._builderSelection.exact?{exact:true}:{});');
r('eng._builderSelection = { blocks:measurement.blocks.slice() };','eng._builderSelection = Object.assign({blocks:measurement.blocks.slice()},eng._builderSelection && eng._builderSelection.exact?{exact:true}:{});');
s=s.replaceAll('afterSelection:{blocks:additions.map(function(b){return {x:b.x,y:b.y,z:b.z};})}','afterSelection:{blocks:additions.map(function(b){return {x:b.x,y:b.y,z:b.z};}),exact:true}');
new (require('vm').Script)(s);let b=Buffer.from(s),fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);
const tests='tests/geometry_world_selection_editor_ui.test.js';let t=fs.readFileSync(tests,'utf8');t+=`\nit('preserves exact selection mode when the live outline refreshes',()=>{const app=fixture.mount();app.engine._builderSelection={blocks:[{x:0,y:1,z:0}],exact:true};React.act(()=>vi.advanceTimersByTime(900));expect(app.engine._builderSelection?.exact).toBe(true);});\n`;fs.writeFileSync(tests,t);
console.log('Live outline and Print Lab now preserve exact selections.');
