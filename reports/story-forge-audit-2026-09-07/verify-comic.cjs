const fs=require('fs');const path=require('path');const assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://storyforge.audit/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en"><head><title>Comic verification</title></head><body><div id="root"></div></body></html>'}));
 await page.goto('http://storyforge.audit/');
 for(const file of ['desktop/web-app/node_modules/react/umd/react.development.js','desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','story_forge_module.js'])await page.addScriptTag({path:path.resolve(file)});
 await page.addStyleTag({path:path.resolve('dev-tools/.cache/sweep-tailwind.css')});
 const strings=JSON.parse(fs.readFileSync('ui_strings.js','utf8'));
 await page.evaluate(strings=>{window.prompts=[];window.ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(window.AlloModules.StoryForge,{isOpen:true,codename:'Comic Audit',t:k=>k.split('.').reduce((v,n)=>v?.[n],strings)||k,addToast:()=>{},onCallGemini:async prompt=>{window.prompts.push(prompt);return JSON.stringify({scores:[{criteria:'Story',score:'4/5',comment:'Clear'}],totalScore:'4/5',feedback:{glow:'Clear dialogue',grow:'Develop the setting'}})}}));},strings);
 await page.locator('#sf-title').fill('A Bubble Story');
 await page.locator('[data-sf-artifact-picker] button').filter({hasText:'Comic'}).first().click();
 await page.locator('#sf-new-vocab-term').fill('cooperate');await page.getByRole('button',{name:'Add',exact:true}).click();
 await page.locator('[data-sf-phase-step="write"]').click();
 const speech=page.getByRole('textbox',{name:/Panel 1 speech/i});
 await speech.fill('We can cooperate to build a bridge.');
 await page.getByRole('textbox',{name:/Panel 1 thought/i}).fill('Together we can succeed.');
 await page.locator('[data-sf-phase-step="review"]').click();
 await page.getByRole('button',{name:'Skip self-assessment',exact:true}).click();
 await page.getByRole('button',{name:'Get Feedback',exact:true}).click();
 await page.getByRole('button',{name:'Revise Draft',exact:true}).waitFor();
 const prompt=await page.evaluate(()=>window.prompts.at(-1));
 assert.ok(prompt.includes('We can cooperate to build a bridge.'));
 assert.ok(prompt.includes('Together we can succeed.'));

 assert.ok(prompt.includes('"term":"cooperate","used":true'));
 assert.equal(await page.locator('[data-sf-phase-step="illustrate"]').isEnabled(),true);
 await page.locator('[data-sf-analytics] summary').click();
 assert.ok(await page.locator('[data-sf-analytics]').innerText().then(t=>t.includes('1/1')));
 assert.ok(await page.locator('[data-sf-analytics]').innerText().then(t=>t.includes('at least 100 words')));
 await page.screenshot({animations:'disabled',path:path.join(__dirname,'after','comic-review.png')});
 await page.addScriptTag({path:path.resolve('node_modules/axe-core/axe.min.js')});
 const accessibility=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('.sf-modal-root'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));});
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(__dirname,'after','comic-results.json'),JSON.stringify({dialogueIncluded:true,vocabularyIncluded:true,reviewUnlocked:true,errors,accessibility},null,2));
 console.log(JSON.stringify({dialogueIncluded:true,vocabularyIncluded:true,errors,accessibility}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
