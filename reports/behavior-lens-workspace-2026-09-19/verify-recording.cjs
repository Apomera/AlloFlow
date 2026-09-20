const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
 const req = createRequire(path.join(process.cwd(), 'desktop/web-app/package.json'));
 const config = req('./tailwind.config.js');
 config.content = [path.join(process.cwd(), 'behavior_lens_module.js')];
 const css = await req('postcss')([req('tailwindcss')(config)]).process('@tailwind base;\n@tailwind components;\n@tailwind utilities;', { from: undefined });
 fs.writeFileSync(path.join(__dirname, 'preview.css'), css.css);
 const browser = await chromium.launch({headless:true});
 const results = [];
 try {
  for (const width of [1280,390,320]) {
   const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(pathToFileURL(path.join(__dirname,'flow-preview.html')).href);
   await page.getByRole('button',{name:'Add observation',exact:true}).waitFor();
   await page.addStyleTag({content:'*,*::before,*::after{animation:none!important;transition:none!important}'});
   await page.addScriptTag({path:require.resolve('axe-core')});
   async function capture(state) {
    await page.screenshot({path:path.join(__dirname,`recording-${state}-${width}.png`)});
    const metrics=await page.evaluate(async()=>({
     overflow:document.documentElement.scrollWidth>innerWidth,
     modalOverflow:[...document.querySelectorAll('[role="dialog"]')].some(el=>el.scrollWidth>el.clientWidth+1),
     overflowingDialogs:[...document.querySelectorAll('[role="dialog"]')].filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>({label:el.getAttribute('aria-label'),width:el.clientWidth,scroll:el.scrollWidth,children:[...el.querySelectorAll('*')].filter(n=>n.getBoundingClientRect().right>el.getBoundingClientRect().right+1).slice(0,12).map(n=>({tag:n.tagName,cls:n.className,text:n.textContent.slice(0,80)}))})),
     axe:(await axe.run(document.querySelector('#root'))).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))
    }));
    results.push({width,state,errors:[...errors],...metrics});
    assert.equal(metrics.overflow,false);assert.equal(metrics.modalOverflow,false);assert.deepEqual(metrics.axe,[]);assert.deepEqual(errors,[]);
   }
   await page.getByRole('button',{name:'Add observation',exact:true}).click();
   await page.getByRole('dialog',{name:'New ABC entry',exact:true}).waitFor();
   await capture('new');
   await page.getByLabel('Antecedent narrative',{exact:true}).fill('Independent writing task');
   await page.getByLabel('Behavior narrative',{exact:true}).fill('Showed a help card');
   await page.getByLabel('Consequence narrative',{exact:true}).fill('Teacher offered an example');
   await page.getByRole('button',{name:'Keep draft and close',exact:true}).click();
   await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
   await page.getByRole('button',{name:'Resume observation',exact:true}).waitFor();
   await capture('resume-home');
   await page.getByRole('combobox',{name:'Choose a student',exact:true}).selectOption('Falcon');
   await page.getByRole('button',{name:'Add observation',exact:true}).waitFor();
   await page.getByRole('combobox',{name:'Choose a student',exact:true}).selectOption('Eagle');
   await page.getByRole('button',{name:'Resume observation',exact:true}).click();
   assert.equal(await page.getByLabel('Behavior narrative',{exact:true}).inputValue(),'Showed a help card');
   await page.getByRole('button',{name:'Save Entry',exact:true}).click();
   await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
   await page.getByRole('button',{name:'Define a target',exact:true}).click();
   await page.getByLabel('Short target name',{exact:true}).fill('Requests help');
   await page.getByLabel('Observable definition',{exact:true}).fill('Says help or presents a help card during a task.');
   await page.getByRole('button',{name:'Save target and add note',exact:true}).click();
   const targetId=await page.getByLabel('Target being observed',{exact:true}).inputValue();
   assert.ok(targetId);
   await page.getByLabel('Behavior narrative',{exact:true}).fill('Presented the blue help card twice');
   assert.equal(await page.getByLabel('Target being observed',{exact:true}).inputValue(),targetId);
   await page.getByRole('dialog',{name:'New ABC entry',exact:true}).evaluate(el=>el.scrollTop=450);
   await capture('target');
   await page.getByRole('button',{name:'Discard draft',exact:true}).click();
   await capture('discard');
   await page.getByRole('button',{name:'Keep writing',exact:true}).click();
   await page.keyboard.press('Escape');
   await page.getByRole('button',{name:'Resume observation',exact:true}).click();
   assert.equal(await page.getByLabel('Behavior narrative',{exact:true}).inputValue(),'Presented the blue help card twice');
   await page.getByRole('button',{name:'Discard draft',exact:true}).click();
   await page.getByRole('button',{name:'Discard observation',exact:true}).click();
   await page.getByRole('button',{name:'Back to BehaviorLens tools',exact:true}).click();
   await page.getByRole('button',{name:'Add observation',exact:true}).waitFor();
   await page.close();
  }
 } finally {
  fs.writeFileSync(path.join(__dirname,'recording-browser-results.json'),JSON.stringify(results,null,2));
  await browser.close();
 }
 console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
