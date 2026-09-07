'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), DEPS = path.join(ROOT,'desktop/web-app/node_modules'), OUT = path.join(ROOT,'reports/reading-tools-additions-2026-09-07');
const postcss = require(path.join(DEPS,'postcss')), tailwind = require(path.join(DEPS,'tailwindcss')), config = require(path.join(ROOT,'desktop/web-app/tailwind.config.js'));
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const css=(await postcss([tailwind({...config,content:[{raw:fs.readFileSync(path.join(ROOT,'stem_lab/stem_lumen_study.js'),'utf8'),extension:'js'}]})]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
  const browser=await chromium.launch({headless:true}),results=[];
  try {for(const width of [390,1280])for(const fontSize of [16,24]){
    const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent('<!doctype html><html lang="en"><head><title>Reading workspace verification</title></head><body><div id="root"></div></body></html>');
    await page.addStyleTag({content:css+' html { font-size: '+fontSize+'px; }'});
    await page.addScriptTag({path:path.join(DEPS,'react/umd/react.development.js')});await page.addScriptTag({path:path.join(DEPS,'react-dom/umd/react-dom.development.js')});
    await page.addScriptTag({path:path.join(ROOT,'stem_lab/stem_lumen_evidence.js')});await page.addScriptTag({path:path.join(ROOT,'stem_lab/stem_lumen_study.js')});
    await page.evaluate(()=>{window.savedProjects=new Map();window.modelCalls=[];window.AlloSpeechPlayer={speak:(text,opts)=>{window.modelCalls.push({text,opts});return Promise.resolve();},stop:()=>{window.stopped=true;}};const ctx={React,isTeacherMode:false,studentNickname:'Reading learner',activeProfileId:'reader-browser',update(){},storageDB:{get:async k=>savedProjects.get(k),set:async(k,v)=>{savedProjects.set(k,v);return true;}},readingSource:{text:'The fox rests beneath the tree. The tree provides shade during the hot afternoon.',title:'Forest reading · page 1',language:'English',anchor:{kind:'library',slug:'forest',resourceId:'forest',page:0,section:0}},onReturnToReading:c=>{window.returned=c;}};ReactDOM.createRoot(document.getElementById('root')).render(LumenStudy.render(ctx));});
    await page.getByLabel('Gist — what is this passage mostly about?').fill('The tree helps keep the fox cool.');
    await page.getByLabel('Supporting evidence — copy an exact excerpt (optional)').fill('The tree provides shade');
    await page.getByRole('button',{name:'Save reflection',exact:true}).click();
    await page.getByRole('button',{name:'Read & reflect · Forest reading · page 1',exact:true}).first().click();
    await page.getByLabel('My annotation (saved automatically)').fill('Ask about other animals.');
    await page.locator('[aria-label="Opened study note"] summary').click();
    await page.getByRole('button',{name:'Return to passage',exact:true}).click();assert.equal(await page.evaluate(()=>returned.anchor.page),0);
    await page.getByRole('button',{name:'Close note',exact:true}).click();
    await page.getByRole('button',{name:'Listen–try–reread',exact:true}).click();await page.getByRole('button',{name:'Listen to model',exact:true}).click();await page.getByRole('button',{name:'2. try',exact:true}).click();assert.equal(await page.evaluate(()=>stopped),true);
    await page.getByLabel('My practice reflection').fill('I paused at the full stop.');await page.getByRole('button',{name:'Save practice',exact:true}).click();
    const overflow=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));if(overflow) { console.log(await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).map(el=>({tag:el.tagName,cls:el.className,label:el.getAttribute('aria-label'),right:el.getBoundingClientRect().right,width:el.getBoundingClientRect().width})).filter(x=>x.right>innerWidth+1))); await page.screenshot({path:path.join(OUT,'overflow.png'),fullPage:true}); } assert.equal(overflow,0,'horizontal overflow at '+width+'/'+fontSize);assert.deepEqual(errors,[]);
    await page.locator('[aria-label="Reading workspace"]').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(OUT,'reading-'+width+'-'+fontSize+'.png'),fullPage:true});results.push({width,fontSize,overflow,reflectionSaved:true,noteReopened:true,returnToPassage:true,practiceStopped:true,errors});await page.close();
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(OUT,'browser.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify(results,null,2));
})().catch(err=>{console.error(err);process.exitCode=1;});
