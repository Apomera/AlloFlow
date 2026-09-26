// For each rebuilt module, compares HEAD and working copies after normalizing away the
// accessibility edits made in this pass (added role="group|img|log", removed generic
// t('common.*') aria-labels, source-hash header). Any residual difference means the
// committed module was NOT reproducible from its source, so a rebuild would silently
// change unrelated behavior; those modules must be patched instead.
const {execFileSync}=require('node:child_process');const fs=require('node:fs');
const norm=s=>s.split('\n').filter(l=>!/^\s*"aria-label": t\(["']common\.[a-z_]+["']\),?\s*$/.test(l)&&!/Source SHA-256/.test(l))
 .map(l=>l.replace(/role: "(group|img|log)",\s*/g,'').replace(/,\s*role: "(group|img|log)"/g,''));
const allowed=process.argv.includes('--show');
for(const m of process.argv.slice(2).filter(a=>!a.startsWith('--'))){
 let head;try{head=execFileSync('git',['show','HEAD:'+m],{encoding:'utf8',maxBuffer:1<<28});}catch{console.log('NEW '+m);continue;}
 const a=norm(head),b=norm(fs.readFileSync(m,'utf8'));
 const setA=new Map();a.forEach(l=>setA.set(l,(setA.get(l)||0)+1));const extraB=[];b.forEach(l=>{const c=setA.get(l);if(c)setA.set(l,c-1);else extraB.push(l);});
 const extraA=[...setA].filter(([,c])=>c>0).flatMap(([l,c])=>Array(c).fill(l));
 // role insertion may reflow a createElement call over several lines; ignore pure whitespace/brace reflow
 const sig=x=>x.map(l=>l.trim()).filter(l=>l&&!/^[{}(),\[\]]*$/.test(l));
 const ra=sig(extraA),rb=sig(extraB);
 if(ra.length||rb.length){console.log('DRIFT '+m+' removed='+ra.length+' added='+rb.length);if(allowed){ra.slice(0,6).forEach(l=>console.log('  - '+l.slice(0,160)));rb.slice(0,6).forEach(l=>console.log('  + '+l.slice(0,160)));}}
 else console.log('ok    '+m);
}
