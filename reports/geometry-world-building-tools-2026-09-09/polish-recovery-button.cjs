const fs=require('node:fs'),crypto=require('node:crypto');
const file='stem_lab/stem_tool_geometryworld_builder.js';let source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
function once(before,after){if(source.split(before).length!==2)throw new Error('Expected one anchor: '+before.slice(0,90));source=source.replace(before,after);}
once("            h('button',{type:'button',onClick:downloadEditableRecovery},backup.editableWorld ? 'Download previous build' : 'Download recovery details')", `            h('div',{className:'gwe-recovery-actions'},
              h('button',{type:'button',className:'gwe-recovery-download',onClick:downloadEditableRecovery},backup.editableWorld ? 'Download previous build' : 'Download recovery details')
            )`);
once('.gwe-recovery-actions .gwe-replace{background:#f1d094', '.gwe-recovery[data-state=\\"backup\\"] .gwe-recovery-actions{grid-template-columns:1fr}.gwe-recovery-actions .gwe-recovery-download{width:100%;box-sizing:border-box;min-height:44px;white-space:normal;background:#d4e8ca;border-color:#d4e8ca;color:#173b35;font-size:13px;line-height:1.35}.gwe-recovery-actions .gwe-replace{background:#f1d094');
source=source.replace(/\n/g,'\r\n');new Function(source);
for(const target of [file,'desktop/web-app/public/'+file]){const fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,source);fs.ftruncateSync(fd,Buffer.byteLength(source));}finally{fs.closeSync(fd);}}
console.log(JSON.stringify({builderSha256:crypto.createHash('sha256').update(source).digest('hex'),mirrorsIdentical:true}));
