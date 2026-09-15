const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright'),assert=require('assert/strict');
const base=pathToFileURL(path.join(__dirname,'current-preview.html')).href;
const axe=fs.readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');
async function main(){
 const browser=await chromium.launch({headless:true});const results={layouts:[],checks:[],errors:[]};
 const context=await browser.newContext();
 async function pageFor(width,query=''){const page=await context.newPage();await page.setViewportSize({width,height:900});page.on('pageerror',e=>results.errors.push(e.message));await page.goto(base+query);await page.locator('#applied-challenge-title').waitFor();return page;}
 async function audit(page,name){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),page.viewportSize().width,name+' overflow');await page.addScriptTag({content:axe});const a=await page.evaluate(async()=>{const r=await axe.run(document.querySelector('#root'),{rules:{'region':{enabled:false}}});return r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}));});results.checks.push({name,accessibility:a});assert.equal(a.filter(v=>['serious','critical'].includes(v.impact)).length,0,JSON.stringify(a));}
 for(const width of [1280,390,320]){
  const page=await pageFor(width);await page.evaluate(()=>sessionStorage.clear());await page.reload();await page.locator('#applied-workspace-workingQuestion').waitFor();
  const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,firstFieldTop:document.querySelector('#applied-workspace-workingQuestion').getBoundingClientRect().top+scrollY,visibleFields:[...document.querySelectorAll('textarea')].filter(x=>x.checkVisibility()).length}));
  results.layouts.push(layout);assert.equal(layout.width,width);assert.equal(layout.visibleFields,1);await page.screenshot({path:path.join(__dirname,`implemented-${width}.png`),fullPage:true});await audit(page,'Understand '+width);await page.close();
 }
 const page=await pageFor(390,'?verified');
 await page.getByRole('button',{name:'Use this question',exact:true}).click();
 await page.getByRole('button',{name:'2. Explore',exact:true}).click();
 await page.locator('#applied-workspace-possibilities').fill('Compare watering slowly at soil level with watering quickly from above.');
 const organizer=page.locator('summary').filter({hasText:/Compare the options/});
 if(await organizer.count())await organizer.first().click();else await page.locator('summary').filter({hasText:/Evidence|Decision|comparison|Compare/i}).first().click();
 await page.getByRole('button',{name:'Add evidence row',exact:true}).click();
 await page.getByLabel('Evidence row 1 claim, option, or position',{exact:true}).fill('Try slow watering at soil level.');
 await page.getByLabel('Evidence row 1 evidence or lesson connection',{exact:true}).fill('This gives water time to infiltrate.');
 await page.getByLabel('Evidence row 1 source fact',{exact:true}).selectOption({index:1});
 await audit(page,'Explore with linked evidence 390');await page.getByRole('button',{name:'3. Build',exact:true}).click();
 assert.equal(await page.evaluate(()=>document.activeElement.id),'applied-workspace-response');
 await page.locator('#applied-workspace-response').fill('I recommend a small slow-watering trial. Water can infiltrate the soil, while water that cannot soak in may run off. We need to compare the approaches using the same amount of water and observe the soil before claiming this will help.');
 await page.locator('summary').filter({hasText:/Link|linked|another format|drawing|model/i}).first().click();
 await page.getByLabel('Link to my work',{exact:true}).fill('https://example.org/garden-design');await page.getByLabel('Explanation of my work',{exact:true}).fill('My diagram compares how the two approaches deliver water.');
 await page.getByRole('button',{name:'4. Check',exact:true}).click();
 await page.locator('#applied-workspace-testReflection').fill('The soil absorption rate remains unchecked. We can compare the two approaches in a small trial.');
 await page.locator('summary').filter({hasText:'Ask AI to challenge my reasoning'}).click();await page.getByRole('button',{name:'Get strengths-first AI feedback',exact:true}).click();await page.getByText('Your two options use the lesson ideas.',{exact:true}).waitFor();
 await page.locator('#applied-workspace-revision').fill('I would keep the trial small and record runoff before recommending a larger change.');
 await page.getByText('Feedback for an earlier draft or brief.',{exact:false}).waitFor();await audit(page,'Check and revise 390');await page.screenshot({path:path.join(__dirname,'implemented-check-390.png'),fullPage:true});
 await page.getByRole('button',{name:'5. Reflect',exact:true}).click();await page.locator('#applied-workspace-transferReflection').fill('I can use a controlled comparison when planning drainage for a different garden.');await page.getByRole('button',{name:'Review my response',exact:true}).click();await page.getByRole('heading',{name:'Review my response',exact:true}).waitFor();
 assert(await page.getByRole('link',{name:'Open my linked work'}).isVisible());
 const saved=await page.evaluate(()=>({resource:window.reviewResource,responses:window.reviewResponses,model:window.AlloModules.StudioResponse}));
 assert(!JSON.stringify(saved.resource.data.workspace).includes('I recommend a small'));assert(JSON.stringify(saved.responses).includes('I recommend a small'));
 results.checks.push({name:'Student five-stage flow, artifact, source-linked evidence, retained feedback, template isolation',passed:true});
 for(const preset of ['task','response','teacher','paper']){
  const html=await page.evaluate(preset=>{const response=Object.values(window.reviewResponses)[0]?.studio;return window.AlloModules.AppliedChallenge.renderPreset({...window.reviewResource.data,...(response||{})},preset);},preset);
  assert.equal(html.includes('I recommend a small slow-watering trial.'),['response','teacher'].includes(preset),preset+' response separation');assert(!html.includes('REVIEW_PRIVATE_SOURCE'));fs.writeFileSync(path.join(__dirname,'implemented-export-'+preset+'.html'),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Applied Problem Solving</title><body>'+html+'</body></html>');
 }
 await page.close();
 const compact=await pageFor(320,'?compact&offline');await compact.getByRole('button',{name:'4. Check',exact:true}).click();assert(await compact.locator('#applied-workspace-testReflection').isVisible());assert(await compact.locator('#applied-workspace-revision').isVisible());assert.equal(await compact.getByRole('button',{name:'Get strengths-first AI feedback'}).count(),0);await audit(compact,'Compact local check 320');await compact.close();
 const teacher=await pageFor(390,'?teacher');await teacher.getByRole('button',{name:'Edit challenge brief',exact:true}).click();
 const criteria=teacher.getByLabel('Challenge success criteria',{exact:true});await criteria.fill('Use two lesson ideas.');await criteria.press('End');await criteria.press('Enter');await criteria.pressSequentially('Explain a tradeoff.');assert.equal(await criteria.inputValue(),'Use two lesson ideas.\nExplain a tradeoff.');await criteria.blur();
 await teacher.locator('summary').filter({hasText:'Visual support'}).click();await teacher.getByLabel('What should the illustration help learners understand?',{exact:true}).fill('Show the setting of a school garden.');
 await teacher.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=200;const x=c.getContext('2d');x.fillStyle='#d1fae5';x.fillRect(0,0,400,200);window.mockIllustration=c.toDataURL('image/png');});
 await teacher.getByRole('button',{name:'Generate optional illustration',exact:true}).click();await teacher.getByLabel('Image description',{exact:true}).waitFor();assert.equal(await teacher.evaluate(()=>window.reviewResource.data.visual.reviewed),false);await teacher.getByLabel('Image description',{exact:true}).fill('A school garden setting for discussing how water enters soil.');await teacher.getByRole('button',{name:'Approve description and illustration',exact:true}).click();assert.equal(await teacher.evaluate(()=>window.reviewResource.data.visual.reviewed),true);
 await audit(teacher,'Teacher authoring with reviewed illustration 390');results.checks.push({name:'Teacher multiline editing and illustration review',passed:true});await teacher.screenshot({path:path.join(__dirname,'implemented-teacher-390.png'),fullPage:true});await teacher.close();
 assert.deepEqual(results.errors,[]);fs.writeFileSync(path.join(__dirname,'implementation-browser-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
}
main().catch(e=>{console.error(e);process.exitCode=1;});
