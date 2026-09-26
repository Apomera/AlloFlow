// WCAG 2.5.3 Label in Name: in the loaded teacher workspace, every visible control
// whose aria-label/aria-labelledby overrides visible text must contain that text.
// Also expands every collapsed sidebar tool so nested controls are included.
// Usage: node run-label-in-name.cjs [--no-build] [--out=name.json]
const fs=require('node:fs'),path=require('node:path');
const {buildPreview,start,enterTeacher}=require('./lib-preview.cjs');
const outName=(process.argv.find(a=>a.startsWith('--out='))||'--out=label-in-name.json').slice(6);
const collect=()=>{
 const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
 const visibleText=el=>{let t='';const walk=n=>{if(n.nodeType===3){t+=n.textContent;return;}if(n.nodeType!==1)return;const cs=getComputedStyle(n);if(n.getAttribute('aria-hidden')==='true'||cs.display==='none'||cs.visibility==='hidden')return;if(/sr-only/.test(n.className&&n.className.baseVal===undefined?n.className:''))return;for(const c of n.childNodes)walk(c);t+=' ';};walk(el);return t.replace(/\s+/g,' ').trim();};
 const out=[];
 for(const el of document.querySelectorAll('button,a[href],[role=button],[role=tab],[role=link],[role=menuitem],[role=checkbox],[role=switch],[role=radio],[role=option]')){
  if(!el.getClientRects().length)continue;
  const label=el.getAttribute('aria-label')||(el.getAttribute('aria-labelledby')||'').split(/\s+/).filter(Boolean).map(i=>document.getElementById(i)?.textContent||'').join(' ');
  if(!label)continue;
  const vis=visibleText(el);const v=norm(vis),l=norm(label);
  if(!v||v.length<3||!/\p{L}{2,}/u.test(v))continue; // icon-only or symbol text
  if(l.includes(v))continue;
  out.push({label:label.slice(0,120),visible:vis.slice(0,120),helpKey:el.getAttribute('data-help-key'),id:el.id,html:el.outerHTML.slice(0,200)});
 }
 return out;
};
(async()=>{
 if(!process.argv.includes('--no-build'))await buildPreview();
 const h=await start({viewport:{width:1280,height:900}});const {page,origin}=h;const res={states:{}};
 try{
  await enterTeacher(page,origin);await page.waitForTimeout(1500);
  res.states.workspace=await page.evaluate(collect);
  const expand=page.getByRole('button',{name:/^Expand All$/}).first();if(await expand.count()){await expand.click();await page.waitForTimeout(1500);}
  const show=page.getByRole('button',{name:/^Show all tools$/}).first();if(await show.count()){await show.click().catch(()=>{});await page.waitForTimeout(800);}
  res.states.expanded=await page.evaluate(collect);
  for(const launcher of ['Learning Tools','Educator Tools','Teach Live','Start & setup']){
   const b=page.getByRole('button',{name:launcher,exact:true}).first();if(!await b.count())continue;await b.click();await page.waitForTimeout(900);
   res.states[launcher]=await page.evaluate(collect);await page.keyboard.press('Escape');await page.waitForTimeout(400);
  }
 }catch(e){res.error=e.stack;console.error(e.stack);}
 finally{fs.writeFileSync(path.join(__dirname,outName),JSON.stringify(res,null,1));await h.stop();}
 const seen=new Set();for(const [k,list] of Object.entries(res.states))for(const m of list){const key=m.label+'|'+m.visible;if(seen.has(key))continue;seen.add(key);console.log(k.padEnd(14),'label="'+m.label+'"  visible="'+m.visible+'"  '+(m.helpKey||m.id||''));}
 console.log('mismatches',seen.size);
})();
