const fs=require('node:fs');
const path='tests/geometry_world_builder_navigation.test.js';
let source=fs.readFileSync(path,'utf8');
const before="  it('cancels pending focus when the tool unmounts',()=>{";
const after=`  it('respects a modal opened before the delayed focus handoff',()=>{
    const app=mount();app.click(app.host.querySelector('[aria-label^="Change shape."]'));
    const modal=document.createElement('section');modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.tabIndex=-1;
    app.host.querySelector('#geoworld-fs-workspace').appendChild(modal);modal.focus();app.tick(40);
    expect(document.activeElement).toBe(modal);expect(app.announce).not.toHaveBeenCalled();modal.remove();
  });
`+before;
if(source.split(before).length!==2)throw new Error('Expected one modal test insertion anchor');
source=source.replace(before,after);
const fd=fs.openSync(path,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}
