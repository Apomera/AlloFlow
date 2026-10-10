const fs=require('fs'),path=require('path');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const mode=process.argv[2];
if(mode==='resources'){
 const root='C:/Users/cabba/Documents/Codex',walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
 for(const name of fs.readdirSync(root).filter(n=>n.startsWith('.diss-'))){const p=path.join(root,name),files=walk(p);console.log(JSON.stringify({path:p,files:files.length,MiB:files.reduce((s,f)=>s+fs.statSync(f).size,0)/1048576}));}
 const d=fs.statfsSync(repo);console.log('FREE MIB '+d.bavail*d.bsize/1048576);
}else if(mode==='setup'){
 for(const d of ['C:/','C:/Users','C:/Users/cabba','C:/Users/cabba/OneDrive','C:/Users/cabba/OneDrive/Desktop',repo,path.join(repo,'stem_lab'),path.join(repo,'tests'),path.join(repo,'tests/e2e')]){const f=path.join(d,'AGENTS.md');if(fs.existsSync(f))console.log(f+'\n'+fs.readFileSync(f,'utf8'));}
 const h=fs.readFileSync(path.join(repo,'AGENT_HANDOFF.md'),'utf8').split(/\r?\n/);console.log('HANDOFF START\n'+h.slice(0,125).join('\n'));console.log('DISSECTION ROWS\n'+h.filter(s=>/dissection/i.test(s)).slice(-15).join('\n'));
 console.log('PACKAGE\n'+fs.readFileSync(path.join(repo,'package.json'),'utf8'));
 console.log('DISK\n'+JSON.stringify(fs.statfsSync(repo)));
}else{
 const rel=process.argv[3]||'stem_lab/stem_tool_dissection.js',s=fs.readFileSync(path.join(repo,rel),'utf8').split(/\r?\n/);
 if(mode==='lines'){const a=+process.argv[4],b=+process.argv[5];console.log(s.slice(a-1,b).map((l,i)=>(a+i)+': '+l).join('\n'));}
 if(mode==='find'){const re=new RegExp(process.argv[4],'i');console.log(s.map((l,i)=>({l,i})).filter(x=>re.test(x.l)).map(x=>(x.i+1)+': '+x.l).join('\n'));}
}
