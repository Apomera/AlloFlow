const fs=require('fs');
function edit(file,fn){let s=fs.readFileSync(file,'utf8');const nl=s.includes('\r\n')?'\r\n':'\n';s=fn(s.replace(/\r\n/g,'\n')).replace(/\n/g,nl);const fd=fs.openSync(file,'r+');fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));fs.closeSync(fd);}
function replace(s,a,b){if(!s.includes(a)||s.indexOf(a)!==s.lastIndexOf(a))throw Error('Expected one marker '+a);return s.replace(a,b);}
const src='stem_lab/stem_tool_geometryworld_builder.js';
edit(src,s=>{
  s=replace(s,'      var editableRecoveryRef = React.useRef(null);','      var editableRecoveryRef = React.useRef(null), editableOpenRef = React.useRef(null), showcaseFileChooseRef = React.useRef(null);');
  s=replace(s,'      function confirmEditableRestore() {',`      function cancelEditableImport() {
        cancelEditablePreview();
        var target = showcaseFilesOpen ? showcaseFileChooseRef.current : editableOpenRef.current;
        if (target && target.focus) target.focus();
      }
      function confirmEditableRestore() {`);
  s=replace(s,"onClick: cancelEditablePreview }, 'Cancel'","onClick: cancelEditableImport }, 'Cancel'");
  s=replace(s,"h('button', { type: 'button', disabled: editableBusy, onClick:","h('button', { ref:editableOpenRef, type: 'button', disabled: editableBusy, onClick:");
  s=replace(s,"h('button',{type:'button',disabled:editableBusy || !!data.showcaseSaving,onClick:chooseShowcaseFile}","h('button',{ref:showcaseFileChooseRef,type:'button',disabled:editableBusy || !!data.showcaseSaving,onClick:chooseShowcaseFile}");
  return s;
});
edit('desktop/web-app/public/'+src,()=>fs.readFileSync(src,'utf8').replace(/\r\n/g,'\n'));
edit('tests/geometry_world_showcase_files_ui.test.js',s=>{
  s=replace(s,"await app.choose(editable);app.click(app.button('Cancel'));","await app.choose(editable);app.button('Cancel').focus();app.click(app.button('Cancel'));" );
  return replace(s,"expect(app.host.querySelector('#gwe-showcase-files')).toBeTruthy();expect(app.engine.loadLesson).not.toHaveBeenCalled();",`expect(app.host.querySelector('#gwe-showcase-files')).toBeTruthy();expect(app.engine.loadLesson).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(app.button('Choose editable JSON'));
    app.key(document.activeElement,'Escape');expect(app.engine.endShowcase).not.toHaveBeenCalled();expect(app.host.querySelector('#gwe-showcase-files')).toBeNull();expect(document.activeElement).toBe(app.button('Use & export'));`);
});
console.log('Import cancel focus refined; source mirrored.');
