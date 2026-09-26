// Interaction walk of the loaded teacher workspace in the development preview.
// For each header/launcher control: activate it from the keyboard, audit the
// resulting state with axe (WCAG 2.2 A/AA), and check dialog semantics, initial
// focus, Escape dismissal and focus return. Then opens every catalog tool.
// Usage: node run-app-walk.cjs [--no-build] [--width=1280] [--theme=dark|contrast] [--out=name.json]
const fs=require('node:fs'),path=require('node:path');
const {buildPreview,start,axe,enterTeacher}=require('./lib-preview.cjs');
const arg=(n,d)=>{const a=process.argv.find(x=>x.startsWith('--'+n+'='));return a?a.split('=')[1]:d;};
const width=+arg('width',1280),theme=arg('theme',''),outName=arg('out','app-walk.json');
(async()=>{
 if(!process.argv.includes('--no-build'))await buildPreview();
 const h=await start({viewport:{width,height:900}});const {page,origin}=h;
 const res={startedAt:new Date().toISOString(),width,theme,states:[],dialogs:[],tools:[]};
 const snap=async(name)=>{const a=await axe(page);res.states.push({name,...a});const v=a.violations.map(x=>x.id+':'+x.nodes.length).join(',');console.log((v?'VIOL ':'ok   ')+name+' '+v+(a.width>a.viewport?' OVERFLOW '+a.width:''));return a;};
 const openLayers=()=>page.evaluate(()=>[...document.querySelectorAll('[role=dialog],[role=alertdialog],dialog[open],[role=menu],[role=listbox]')].filter(e=>e.getClientRects().length).map(e=>({role:e.getAttribute('role')||e.tagName.toLowerCase(),id:e.id,modal:e.getAttribute('aria-modal'),name:e.getAttribute('aria-label')||(e.getAttribute('aria-labelledby')||'').split(/\s+/).map(i=>document.getElementById(i)?.textContent.trim()).join(' ').trim(),focusInside:e.contains(document.activeElement)})));
 try{
  if(theme)await h.context.addInitScript(t=>{try{localStorage.setItem('allo_theme',t);}catch(e){}},theme);
  await enterTeacher(page,origin);await page.waitForTimeout(1500);
  res.appliedTheme=await page.evaluate(()=>[...document.querySelectorAll('.theme-dark,.theme-contrast')].slice(0,1).map(e=>e.className.match(/theme-(dark|contrast)/)[0])[0]||'light');console.log('theme',res.appliedTheme);
  await snap('teacher-loaded');
  // Launchers: visible header/toolbar buttons outside the source panel.
  const launchers=await page.evaluate(()=>{const seen=new Set();return [...document.querySelectorAll('header button, [role=banner] button, #tour-header button, nav button, button[aria-haspopup], button[aria-expanded]')].filter(b=>b.getClientRects().length&&!b.disabled).map(b=>{const n=(b.getAttribute('aria-label')||b.innerText||'').trim().replace(/\s+/g,' ').slice(0,50);return n;}).filter(n=>n&&!seen.has(n)&&seen.add(n));});
  res.launchers=launchers;console.log('launchers',launchers.length);
  for(const name of launchers){
   if(/^(Dismiss|Collapse|Expand All|Show all tools|Maximize View|Search)$/i.test(name))continue;
   const loc=page.locator('button').filter({has:page.locator(':scope')}).and(page.getByRole('button',{name,exact:true})).first();
   if(!await loc.count())continue;
   const before=await openLayers();
   try{await loc.focus();await page.keyboard.press('Enter');}catch(e){continue;}
   await page.waitForTimeout(900);
   const after=await openLayers();const opened=after.filter(a=>!before.some(b=>b.id===a.id&&b.role===a.role));
   if(!opened.length){const exp=await loc.getAttribute('aria-expanded').catch(()=>null);if(exp==='true'){await snap('expanded: '+name);await loc.focus().catch(()=>{});await page.keyboard.press('Enter');await page.waitForTimeout(300);}continue;}
   const a=await snap('opened: '+name);
   const d={launcher:name,opened,violations:a.violations.map(v=>v.id)};
   await page.keyboard.press('Escape');await page.waitForTimeout(500);
   const still=(await openLayers()).filter(x=>opened.some(o=>o.id===x.id&&o.role===x.role));
   d.escapeCloses=still.length===0;
   d.focusReturned=await loc.evaluate(e=>e===document.activeElement||e.contains(document.activeElement)).catch(()=>false);
   d.activeAfterEscape=await page.evaluate(()=>{const e=document.activeElement;return e?(e.tagName+' '+(e.getAttribute('aria-label')||e.innerText||'').slice(0,40)):null;});
   res.dialogs.push(d);console.log('   dialog',JSON.stringify(d));
   if(!d.escapeCloses){await page.keyboard.press('Escape');await page.waitForTimeout(300);const close=page.getByRole('button',{name:/^(close|done|cancel)/i}).first();if(await close.count())await close.click().catch(()=>{});await page.waitForTimeout(400);}
  }
  await snap('after-launchers');
 }catch(e){res.error=e.stack;console.error(e.stack);}
 finally{res.errors=h.errors.slice(0,50);res.blocked=[...h.blocked];fs.writeFileSync(path.join(__dirname,outName),JSON.stringify(res,null,1));await h.stop();}
})();
