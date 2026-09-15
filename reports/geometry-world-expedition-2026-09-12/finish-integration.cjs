const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function edit(file,fn){const raw=fs.readFileSync(file,'utf8'),eol=raw.includes('\r\n')?'\r\n':'\n';const next=fn(raw.replace(/\r\n/g,'\n')).replace(/\n/g,eol);const data=Buffer.from(next),fd=fs.openSync(file,'r+');try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}}
function once(s,a,b){assert.equal(s.split(a).length,2,'Expected one anchor '+a.slice(0,90));return s.replace(a,b);}
if(process.argv.includes('--details')){
  edit('stem_lab/stem_tool_geometryworld.js',s=>{
    const start=s.indexOf('  SAMPLE_LESSONS.geometryHarbor = '),end=s.indexOf('  // The authored lessons put the correct choice first',start);
    assert(start>0&&end>start);
    const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'geometry-harbor.json'),'utf8'));
    return s.slice(0,start)+'  SAMPLE_LESSONS.geometryHarbor = '+JSON.stringify(fixture,null,2).split('\n').map((line,i)=>i?'  '+line:line).join('\n')+';\n\n'+s.slice(end);
  });
  edit('stem_lab/stem_tool_geometryworld_builder.js',s=>{
    s=once(s,"h('section',{className:'gwe-activity-guide',ref:guideRef","h('section',{id:'gw-objective-panel',className:'gwe-activity-guide',ref:guideRef");
    s=once(s,'var MAX_EDITABLE_BLOCKS = 875;','var MAX_EDITABLE_BLOCKS = 1500;');
    s=once(s,'MAX_BLOCKS-Object.keys(engine.blocks || {}).length','MAX_BLOCKS-(engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks || {}).length)');
    s=once(s,'MAX_BLOCKS - Object.keys(engine.blocks || {}).length','MAX_BLOCKS - (engine.getConstructionBlockCount ? engine.getConstructionBlockCount() : Object.keys(engine.blocks || {}).length)');
    return s;
  });
  edit('tests/geometry_world_keyboard_access.test.js',s=>once(s,"objectivesOpen && el('section', { id: 'gw-objective-panel'","objectivesOpen && !hasLessonActivities && el('section', { id: 'gw-objective-panel'"));
}
if(process.argv.includes('--mirrors')){
  for(const name of ['stem_tool_geometryworld.js','stem_tool_geometryworld_builder.js']){
    const data=fs.readFileSync(path.join('stem_lab',name));const target=path.join('desktop/web-app/public/stem_lab',name),fd=fs.openSync(target,'r+');
    try{fs.writeSync(fd,data);fs.ftruncateSync(fd,data.length);}finally{fs.closeSync(fd);}
    assert(data.equals(fs.readFileSync(target)));new Function(data.toString());
  }
}
console.log('Requested integration details completed.');
