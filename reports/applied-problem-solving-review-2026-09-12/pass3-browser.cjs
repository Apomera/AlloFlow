const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
const base=pathToFileURL(path.join(__dirname,'current-preview.html')).href;
async function main(){const browser=await chromium.launch({headless:true});try{
 const results={layouts:[],checks:[],errors:[]};
 async function open(width,query=''){const page=await browser.newPage({viewport:{width,height:900}});page.setDefaultTimeout(10000);page.on('pageerror',error=>results.errors.push(error.message));await page.goto(base+query);await page.locator('#applied-challenge-title').waitFor();return page;}
 async function audit(page,name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),page.viewportSize().width,name+' overflow');await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});const issues=await page.evaluate(async()=>{const result=await axe.run(document.querySelector('#root'),{rules:{region:{enabled:false}}});return result.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});results.checks.push({name,issues});assert.deepEqual(issues,[]);}
 for(const width of [1280,390,320]){const page=await open(width);const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,firstFieldTop:document.querySelector('#applied-workspace-workingQuestion').getBoundingClientRect().top+scrollY,visibleFields:[...document.querySelectorAll('textarea')].filter(x=>x.checkVisibility()).length}));results.layouts.push(layout);assert.equal(layout.visibleFields,1);await audit(page,'Initial '+width);await page.screenshot({path:path.join(__dirname,'pass3-'+width+'.png'),fullPage:true});await page.close();}
 const page=await open(390,'?verified');await page.getByRole('button',{name:'Use this question',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'applied-workspace-workingQuestion');await page.getByRole('button',{name:'2. Explore',exact:true}).click();await page.locator('#applied-workspace-possibilities').fill('Compare a slow watering trial with a faster watering approach.');await page.locator('summary').filter({hasText:'Connect a lesson idea'}).click();await page.getByRole('button',{name:'Connect lesson fact 1 to my evidence',exact:true}).click();assert((await page.evaluate(()=>document.activeElement.id)).startsWith('aps-ledger-claim-'));await page.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).fill('Try a small slow-watering comparison.');await page.getByLabel('Evidence row 1 evidence or lesson connection',{exact:true}).fill('Water can infiltrate soil. We need to observe how quickly this soil absorbs water.');await audit(page,'Quick evidence connection');
 await page.getByRole('button',{name:'3. Build',exact:true}).click();await page.locator('summary').filter({hasText:'Add a sketch, model, or recorded explanation'}).click();await page.getByLabel('Link to my work',{exact:true}).fill('https://example.org/my-garden-model');await page.getByLabel('Explanation of my work',{exact:true}).fill('My model compares slow and fast watering. It connects infiltration to runoff and marks the soil absorption rate as unknown. It proposes a small comparison before making a larger recommendation.');await page.getByRole('button',{name:'4. Check',exact:true}).click();assert(await page.getByText('AI can comment on the explanation you wrote here.',{exact:false}).isVisible());await page.locator('#applied-workspace-testReflection').fill('A peer noticed that the soil condition needs checking. The model has not yet been tested.');await page.locator('summary').filter({hasText:'Ask AI to challenge my reasoning'}).click();await page.getByRole('button',{name:'Get strengths-first AI feedback',exact:true}).click();await page.getByText('Your two options use the lesson ideas.',{exact:true}).waitFor();await page.locator('#applied-workspace-revision').fill('Keep the small comparison as the next step and avoid claiming water savings yet.');await page.getByRole('button',{name:'5. Reflect',exact:true}).click();await page.locator('#applied-workspace-transferReflection').fill('I could compare drainage approaches using the same lesson ideas in another garden.');await page.getByRole('button',{name:'Review my response',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'aps-review-heading');assert(await page.getByRole('region',{name:'My evidence connections'}).isVisible());assert(await page.getByRole('link',{name:'Open my linked work'}).isVisible());assert.equal(await page.getByText('Add a written response, or a link',{exact:false}).count(),0);await page.getByRole('button',{name:'My response Recorded',exact:true}).waitFor();await audit(page,'Complete linked-work review');await page.screenshot({path:path.join(__dirname,'pass3-review-390.png'),fullPage:true});
 const ownership=await page.evaluate(()=>({template:window.reviewResource.data.workspace,response:Object.values(window.reviewResponses)[0].studio.workspace}));assert(!ownership.template.artifactDescription);assert(ownership.response.artifactDescription.includes('My model compares'));assert.equal(ownership.response.response,'');
 await page.getByRole('button',{name:'Edit Build',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'applied-workspace-response');results.checks.push({name:'Linked-work coaching, review, edit focus, and template isolation',passed:true});await page.close();

 const recovery=await open(390);
 await recovery.locator('#applied-workspace-workingQuestion').fill('My custom garden question?');
 await recovery.getByRole('button',{name:'Replace with suggested question',exact:true}).click();
 await recovery.getByRole('button',{name:'Undo last change',exact:true}).click();
 assert.equal(await recovery.locator('#applied-workspace-workingQuestion').inputValue(),'My custom garden question?');
 await recovery.getByRole('button',{name:'2. Explore',exact:true}).click();
 await recovery.locator('summary').filter({hasText:'Connect a lesson idea'}).click();
 await recovery.getByRole('button',{name:'Connect lesson fact 1 to my evidence',exact:true}).click();
 await recovery.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).fill('My recoverable option');
 await recovery.getByRole('button',{name:'Remove evidence row 1',exact:true}).click();
 assert.equal(await recovery.evaluate(()=>document.activeElement.id),'aps-undo');
 await audit(recovery,'Recovery banner 390');await recovery.screenshot({path:path.join(__dirname,'pass3-recovery-390.png'),fullPage:true});
 await recovery.getByRole('button',{name:'Undo last change',exact:true}).click();
 assert.equal(await recovery.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).inputValue(),'My recoverable option');
 results.checks.push({name:'Browser recovery preserves custom questions, evidence and focus',passed:true});await recovery.close();
 const teacher=await open(320,'?teacher');
 await teacher.locator('summary').filter({hasText:'Review source connections'}).click();
 assert(await teacher.getByText('Quotation found in the available excerpt',{exact:true}).isVisible());
 assert(await teacher.getByText('Quotation not found in the available excerpt',{exact:true}).isVisible());
 assert(await teacher.getByText('Add a supporting quotation',{exact:true}).isVisible());
 assert.equal(await teacher.evaluate(()=>window.reviewResource.data.brief.factVerified),false);
 await teacher.locator('summary').filter({hasText:'Review task quality'}).click();
 await teacher.getByRole('button',{name:'Get AI task review',exact:true}).click();
 await teacher.getByText('Task review saved. Review the suggestions before editing the challenge.',{exact:true}).waitFor();
 assert.equal(await teacher.evaluate(()=>window.reviewResource.data.qualityReview.checks.feasibility.status),'revise');
 assert.deepEqual(await teacher.evaluate(()=>window.reviewResponses),{});
 await audit(teacher,'Teacher source and task quality review 320');await teacher.screenshot({path:path.join(__dirname,'pass3-teacher-320.png'),fullPage:true});
 await teacher.locator('summary').filter({hasText:'Learning target and task settings'}).click();
 await teacher.getByRole('textbox',{name:'Available time',exact:true}).fill('10 minutes');
 assert(await teacher.getByText('This review is for an earlier task.',{exact:false}).isVisible());
 await teacher.getByRole('button',{name:'Preview as student',exact:true}).click();
 assert.equal(await teacher.getByRole('button',{name:'Get AI task review',exact:true}).count(),0);
 results.checks.push({name:'Source status, teacher quality review, stale marking and preview isolation',passed:true});await teacher.close();
 const offline=await open(390,'?teacher&offline');await offline.locator('summary').filter({hasText:'Review task quality'}).click();
 assert(await offline.getByRole('button',{name:'Get AI task review',exact:true}).isDisabled());
 assert(await offline.getByText('AI review is unavailable. You can review the task with the questions below.',{exact:true}).isVisible());
 await audit(offline,'Offline teacher quality questions');await offline.close();
 assert.deepEqual(results.errors,[]);fs.writeFileSync(path.join(__dirname,'pass3-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
}finally{await browser.close();}}
main().catch(error=>{console.error(error);process.exitCode=1});
