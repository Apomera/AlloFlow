// Re-pins loader URLs that are pinned by content (`name_module.js?v=<sha256[0:8]>`)
// for modules changed in the working tree. A URL pinned to the committed content hash
// is moved to the new content hash; commit-hash pins (build CDN refs) are left alone.
const fs=require('node:fs');const {execFileSync}=require('node:child_process');const {createHash}=require('node:crypto');
const h8=b=>createHash('sha256').update(b).digest('hex').slice(0,8);
const changed=execFileSync('git',['diff','--name-only','--','*_module.js'],{encoding:'utf8'}).split('\n').filter(f=>f&&!f.startsWith('desktop/'));
const loaders=['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx'];
let total=0;
for(const L of loaders){let s=fs.readFileSync(L,'utf8');
 for(const m of changed){const oldH=h8(execFileSync('git',['show','HEAD:'+m],{maxBuffer:1<<28})),newH=h8(fs.readFileSync(m));
  // content pins are exactly 8 hex chars; 9-char commit pins are not touched. Only pins that were content pins at HEAD are eligible.
  const re=new RegExp(m.replace(/[.]/g,'\\.')+'\\?v=([0-9a-f]{8})(?![0-9a-z])','g');
  const headLoader=execFileSync('git',['show','HEAD:'+L],{maxBuffer:1<<28,encoding:'utf8'});if(!headLoader.includes(m+'?v='+oldH))continue;
  let n=0;s=s.replace(re,(all,cur)=>{if(cur===newH)return all;if(cur!==oldH&&headLoader.includes(m+'?v='+cur))return all;n++;return m+'?v='+newH;});if(n){total+=n;console.log(L,m,'->',newH,'x'+n);}}
 fs.writeFileSync(L,s);}
console.log('repinned',total);
