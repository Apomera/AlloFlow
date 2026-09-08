const fs=require('fs');
let p='tests/story_forge_guided_flow.test.js';let s=fs.readFileSync(p,'utf8');s=s.replaceAll("gradingResult: { totalScore: '20/20' }","gradingResult: { scores: [{ criteria: 'Story', score: '5/5' }], feedback: { glow: 'Clear story', grow: 'Add detail' }, totalScore: '5/5' }");fs.writeFileSync(p,s);
let script=fs.readFileSync('reports/story-forge-audit-2026-09-07/verify-third-pass.cjs','utf8');script=script.slice(0,script.indexOf(" await page.locator('#sf-title').fill"));script=script.replace("path.join(__dirname,'third-pass')","path.join(__dirname,'fifth-pass')");
script+=`
 await page.evaluate(()=>{window.coachCalls=[];window.auditProps.onCallGemini=(prompt)=>new Promise((resolve,reject)=>window.coachCalls.push({prompt,resolve,reject}));window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 const respond=async(value)=>page.evaluate(value=>window.coachCalls.at(-1).resolve(JSON.stringify(value)),value);
 await page.locator('#sf-title').fill('Safe comic helpers');await page.locator('[data-sf-artifact-picker] button').filter({hasText:'Comic'}).first().click();await go('write');
 const speech=()=>page.getByRole('textbox',{name:/Panel 1 speech/i});await speech().fill('Maya felt frightened as she crossed the bridge, but her friend promised that they would work together and reach the other side safely.');
 await go('review');await page.getByRole('button',{name:'More review tools',exact:true}).click();await page.getByRole('button',{name:/Show vs Tell/}).click();
 await page.waitForFunction(()=>window.coachCalls.length===1);assert.ok((await page.evaluate(()=>window.coachCalls[0].prompt)).includes('Maya felt frightened'));
 await respond({tellings:{},summary:'Malformed'});await page.locator('[data-sf-coach-notice]').waitFor();assert.equal(await page.locator('.sf-modal-root').count(),1);assert.deepEqual(errors,[]);
 await page.getByRole('button',{name:/Show vs Tell/}).click();await page.waitForFunction(()=>window.coachCalls.length===2);await go('write');await speech().fill('My revised dialogue must stay.');await respond({tellings:[],summary:'OUTDATED COACH RESULT'});await go('review');await page.locator('[data-sf-coach-notice]').waitFor();assert.equal(await page.getByText('OUTDATED COACH RESULT',{exact:true}).count(),0);
 await go('write');await editors().first().fill('Maya and her friend cross the bridge together.');
 await page.getByRole('button',{name:'More tools',exact:true}).click();
 const draft=()=>page.getByRole('button',{name:/Draft All Bubbles/i});
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===3);await respond({panels:[{panel:1,speaker:'Maya',speech:'Proposed dialogue',thought:'',sfx:''}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();assert.equal(await speech().inputValue(),'My revised dialogue must stay.');
 await page.getByRole('button',{name:'Keep my version',exact:true}).click();assert.equal(await speech().inputValue(),'My revised dialogue must stay.');
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===4);await respond({panels:[{panel:1,speech:'Applied dialogue',thought:'',sfx:''}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();await page.locator('[data-sf-apply-comic-edit]').click();await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='Applied dialogue'));
 await page.locator('[data-sf-undo-project-edit]').click();await page.waitForFunction(()=>[...document.querySelectorAll('textarea')].some(e=>e.value==='My revised dialogue must stay.'));
 if(await draft().count()===0)await page.getByRole('button',{name:'More tools',exact:true}).click();
 await draft().click();await page.waitForFunction(()=>window.coachCalls.length===5);await respond({panels:[{panel:1,speech:'STALE REPLACEMENT'}]});await page.locator('[data-sf-comic-edit-preview]').waitFor();await speech().fill('Edited after preview');await page.locator('[data-sf-apply-comic-edit]').click();await page.locator('[data-sf-comic-edit-preview]').waitFor({state:'detached'});assert.equal(await speech().inputValue(),'Edited after preview');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({coachMalformedSafe:true,coachUsesComicSpeech:true,staleCoachRejected:true,comicPreviewPreservesWriting:true,comicDiscard:true,comicApplyUndo:true,staleComicApplyRejected:true,errors},null,2));console.log('Coach and comic replacement checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
`;
fs.writeFileSync('reports/story-forge-audit-2026-09-07/verify-fifth-pass.cjs',script);
