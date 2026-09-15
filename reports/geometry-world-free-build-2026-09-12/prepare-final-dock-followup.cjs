const fs=require('node:fs');
function edit(path,before,after){let text=fs.readFileSync(path,'utf8');if(text.split(before).length!==2)throw new Error(path+': expected one anchor');text=text.replace(before,after);const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,text);fs.ftruncateSync(fd,Buffer.byteLength(text));}finally{fs.closeSync(fd);}}
edit('reports/geometry-world-free-build-2026-09-12/apply-dock-modal-guard.cjs',
  'source=source.replace(before,after);new Function(source);',
  `source=source.replace(before,after);
const rotationBefore="'aria-label':'Change shape. Current shape: '+shape.name,onClick:";
const rotationAfter="'aria-label':'Change shape. Current shape: '+shape.name+'. Rotation: '+((Number(data.blockRotation)||0)*90)+' degrees',onClick:";
if(source.split(rotationBefore).length!==2)throw new Error('Expected one shape rotation label anchor');
source=source.replace(rotationBefore,rotationAfter);new Function(source);`);
edit('tests/geometry_world_builder_navigation.test.js',
  `    app.click(app.host.querySelector('[aria-label^="Change '+choice+'."]'));app.tick(40);`,
  `    const action=app.host.querySelector('[aria-label^="Change '+choice+'."]');
    if(choice==='shape')expect(action.getAttribute('aria-label')).toContain('Rotation: 180 degrees');
    app.click(action);app.tick(40);`);
