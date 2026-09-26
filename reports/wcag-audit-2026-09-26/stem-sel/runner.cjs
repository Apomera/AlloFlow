const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const SP=__dirname, m=JSON.parse(fs.readFileSync(SP+'/modules.json','utf8'));
let list=[...m.stem.filter(f=>/stem_tool_/.test(f)), ...m.sel.filter(f=>/sel_tool_/.test(f))];
if(process.env.LIST) list=JSON.parse(require('fs').readFileSync(process.env.LIST,'utf8'));
const P=+process.env.PAR||4, TO=+process.env.TO||300000;
let i=0, done=0; const status={};
function next(){ if(i>=list.length) return; const f=list[i++]; const OUTD=process.env.OUTD||(SP+'/out'); require('fs').mkdirSync(OUTD,{recursive:true}); const out=OUTD+'/'+path.basename(f,'.js')+'.json';
  if(fs.existsSync(out)&&!process.env.FORCE){done++; next(); return;}
  const t0=Date.now(); const extra=process.env.BEFORE?['--src',SP+'/backup/'+f]:[]; const ch=spawn('node',[SP+'/probe.cjs',f,'--out',out].concat(extra).concat(process.env.MODES?['--modes',process.env.MODES]:[]),{cwd:'/home/user/AlloFlow',stdio:['ignore','ignore','pipe']});
  let err=''; ch.stderr.on('data',d=>err+=d);
  const k=setTimeout(()=>{status[f]='TIMEOUT'; ch.kill('SIGKILL');},TO);
  ch.on('exit',(c)=>{clearTimeout(k); if(!status[f]) status[f]= c===0?'ok':'exit '+c; if(status[f]!=='ok') status[f]+=' '+err.slice(-300);
    done++; fs.appendFileSync((process.env.LOG||SP+'/runner.log'),`${done}/${list.length} ${f} ${status[f]} ${Date.now()-t0}ms\n`);
    fs.writeFileSync((process.env.STATUS||SP+'/runner_status.json'),JSON.stringify(status,null,1)); next();});
}
for(let p=0;p<P;p++) next();
