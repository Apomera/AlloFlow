const fs=require('node:fs');
const path='tests/geometry_world_builder_navigation.test.js';
let source=fs.readFileSync(path,'utf8');
const before="    app.tick(40);expect(document.activeElement).toBe(outside);expect(app.announce).not.toHaveBeenCalled();outside.remove();";
const after="    const expectedFocus=change==='home'?app.host.querySelector('.gwe-home'):outside;\n    app.tick(40);expect(document.activeElement).toBe(expectedFocus);expect(app.announce).not.toHaveBeenCalled();outside.remove();";
if(source.split(before).length!==2)throw new Error('Expected one focus test anchor');
source=source.replace(before,after);
const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
