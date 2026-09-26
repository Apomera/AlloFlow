// Opens each entry inside the Learning Tools and Educator Tools dialogs, and each
// generator in the "All tools" catalog, then audits the resulting view with axe.
// Usage: node run-app-tools.cjs [--no-build] [--group=learning|educator|catalog] [--out=name.json] [--from=N] [--limit=N]
const fs=require('node:fs'),path=require('node:path');
const {buildPreview,start,axe,enterTeacher}=require('./lib-preview.cjs');
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?a.split('=').slice(1).join('='):d;};
const only=arg('only','')?arg('only','').split(',').map(Number):null;
const group=arg('group','learning'),outName=arg('out','app-tools-'+group+'.json'),from=+arg('from',0),limit=+arg('limit',999);
const launcher={learning:'Learning Tools',educator:'Educator Tools'}[group];
(async()=>{
 if(!process.argv.includes('--no-build'))await buildPreview();
 const res={startedAt:new Date().toISOString(),group,items:[]};
 let h=await start({viewport:{width:1280,height:900}});
 const fresh=async()=>{await enterTeacher(h.page,h.origin);await h.page.waitForTimeout(1200);};
 const openGroup=async()=>{if(group==='catalog'){const all=h.page.getByRole('button',{name:'All tools',exact:true}).first();if(await all.count())await all.click();const show=h.page.getByRole('button',{name:/^Show all tools$/}).first();if(await show.count())await show.click().catch(()=>{});await h.page.waitForTimeout(500);return h.page.locator('#tour-tool-finder');}
  await h.page.getByRole('button',{name:launcher,exact:true}).first().click();const dlg=h.page.locator('[role=dialog][aria-modal=true]').last();await dlg.waitFor();await h.page.waitForTimeout(400);return dlg;};
 try{
  await fresh();let scope=await openGroup();
  const entries=await scope.evaluate(root=>{const seen=new Set();return [...root.querySelectorAll('button')].map((b,idx)=>({idx,vis:!!b.getClientRects().length&&!b.disabled,name:(b.getAttribute('aria-label')||b.innerText||'').trim().replace(/\s+/g,' ')})).filter(x=>x.vis).filter(x=>{const n=x.name;return n&&!/^(add to favorites|remove from favorites|close learning hub|close educator|manage favorites)/i.test(n)&&!/^(close|×|✕|collapse|expand all|show all tools|show fewer|recommended|make accessible|engage|assess & deliver|all tools)$/i.test(n)&&!seen.has(n)&&seen.add(n);});});
  const names=entries.map(x=>x.name);const idxOf=Object.fromEntries(entries.map(x=>[x.name,x.idx]));
  res.names=names;console.log(group,'entries',names.length);
  for(const [i,name] of names.entries()){
   if(i<from||i>=from+limit)continue;
   if(only&&!only.includes(i))continue;
   const item={name};res.items.push(item);
   try{
    {await h.stop().catch(()=>{});h=await start({viewport:{width:1280,height:900}});await fresh();}
    scope=await openGroup();
    const btn=scope.locator('button').nth(idxOf[name]);
    if(!await btn.count()){item.skipped='not found';continue;}
    await btn.click({timeout:8000});await h.page.waitForTimeout(2500);
    const a=await axe(h.page);item.violations=a.violations;item.incomplete=a.incomplete.map(x=>x.id);item.overflow=a.width>a.viewport;
    item.focus=await h.page.evaluate(()=>{const e=document.activeElement;return e&&e!==document.body?e.tagName+' '+(e.getAttribute('aria-label')||e.innerText||'').slice(0,40):'BODY';});
    item.dialogs=await h.page.evaluate(()=>[...document.querySelectorAll('[role=dialog],dialog[open]')].filter(e=>e.getClientRects().length).map(e=>({name:e.getAttribute('aria-label')||(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(i=>document.getElementById(i)?.textContent.trim()).join(' ').trim(),modal:e.getAttribute('aria-modal')})));
    console.log((a.violations.length?'VIOL ':'ok   ')+i+' '+name.slice(0,50)+' '+a.violations.map(x=>x.id+':'+x.nodes.length).join(','));
    await h.page.keyboard.press('Escape');await h.page.waitForTimeout(300);await h.page.keyboard.press('Escape');await h.page.waitForTimeout(300);
    if(await h.page.locator('#tour-input-panel').isHidden().catch(()=>true)){await h.stop();h=await start({viewport:{width:1280,height:900}});await fresh();}
   }catch(e){item.error=String(e.message).slice(0,300);console.log('ERR  '+i+' '+name+' '+item.error.slice(0,120));try{await h.stop();}catch{}h=await start({viewport:{width:1280,height:900}});await fresh();}
  }
 }catch(e){res.error=e.stack;console.error(e.stack);}
 finally{res.errors=h.errors.slice(0,50);fs.writeFileSync(path.join(__dirname,outName),JSON.stringify(res,null,1));await h.stop().catch(()=>{});}
})();
