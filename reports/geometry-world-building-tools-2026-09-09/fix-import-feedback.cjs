const fs=require('node:fs'),crypto=require('node:crypto');
const file='stem_lab/stem_tool_geometryworld_builder.js';let source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function once(before,after){if(source.split(before).length!==2)throw new Error('Expected one anchor: '+before.slice(0,90));source=source.replace(before,after);}
once('      var editableReadTokenRef = React.useRef(0);', '      var editableReadTokenRef = React.useRef(0), editableApplyFailedRef = React.useRef(false), editableErrorRef = React.useRef(null);');
once("          if (showcaseFilesWasOpen.current) { editableReadTokenRef.current += 1; setEditablePreview(null); setEditableError(''); setEditableBusy(false); }", "          if (showcaseFilesWasOpen.current) { editableReadTokenRef.current += 1; setEditablePreview(null); if(!editableApplyFailedRef.current)setEditableError(''); setEditableBusy(false); }");
once("      }, [showcaseFilesOpen, editablePreview]);", `      }, [showcaseFilesOpen, editablePreview]);
      React.useEffect(function () {
        if (editableError && !data.showcaseActive && editableErrorRef.current) editableErrorRef.current.focus();
      }, [editableError, data.showcaseActive]);`);
once('      function cancelEditablePreview() {\n        editableReadTokenRef.current += 1;', '      function cancelEditablePreview() {\n        editableApplyFailedRef.current = false;\n        editableReadTokenRef.current += 1;');
once("        if (!result.ok) { setEditablePreview(null); setEditableError(result.error); announce(ctx, result.error, 'error'); return; }", `        if (!result.ok) {
          editableApplyFailedRef.current=true;setEditablePreview(null);setEditableError(result.error);
          if (!liveEngine || !liveEngine._showcase) patchGeometryState(ctx,{sandboxDockCollapsed:false,builderPanel:'build',hudPanel:'inventory'});
          announce(ctx,result.error,'error');return;
        }`);
once("editableError && h('div', { className: 'gwe-recovery', 'data-state': 'error', role: 'alert' },", "editableError && h('div', { className: 'gwe-recovery', 'data-state': 'error', role: 'alert', ref:editableErrorRef, tabIndex:-1 },");
source=source.replace(/\n/g,'\r\n');new Function(source);
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({builderSha256:crypto.createHash('sha256').update(source).digest('hex'),mirrorsIdentical:true}));
