const {spawnSync}=require('node:child_process');
const r=spawnSync('tasklist',['/FO','CSV','/NH'],{encoding:'utf8',windowsHide:true});
if(r.status!==0)throw Error(r.stderr||r.error||'tasklist failed');
console.log(r.stdout.split(/\r?\n/).filter(line=>/^"(node|chrome|msedge|Codex|python)\.exe"/i.test(line)).join('\n'));
