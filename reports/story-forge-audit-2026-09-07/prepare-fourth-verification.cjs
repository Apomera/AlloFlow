const fs=require('fs');let script=fs.readFileSync('reports/story-forge-audit-2026-09-07/verify-third-pass.cjs','utf8');script=script.slice(0,script.indexOf(" await page.locator('#sf-title').fill"));script=script.replace("path.join(__dirname,'third-pass')","path.join(__dirname,'fourth-pass')");
script+=`
 await page.evaluate(()=>{window.feedbackRequests=[];window.auditProps.onCallGemini=()=>new Promise((resolve,reject)=>window.feedbackRequests.push({resolve,reject}));window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 const feedback=()=>page.getByRole('button',{name:'Get Feedback',exact:true});
 const retry=()=>page.getByRole('button',{name:'Retry feedback',exact:true});
 const valid={scores:[{criteria:'Story',score:'4/5',comment:'Clear arc'}],totalScore:'999/999',feedback:{glow:'A clear opening',grow:'Add setting detail'}};
 const resolve=async(i,value)=>page.evaluate(({i,value})=>window.feedbackRequests[i].resolve(JSON.stringify(value)),{i,value});
 const notice=()=>page.locator('[data-sf-feedback-notice]');
 await page.locator('#sf-title').fill('Feedback recovery');await go('write');await editors().first().fill('Maya crossed the bridge with her friend. The river rushed beneath their feet.');await go('review');
 await page.getByRole('button',{name:'Skip self-assessment',exact:true}).click();
 await feedback().click();await resolve(0,{scores:{},feedback:{glow:{}}});await notice().waitFor();assert.match(await notice().innerText(),/could not be prepared/);assert.equal(await page.locator('[data-sf-phase-step="illustrate"]').isDisabled(),true);
 await retry().click();await page.evaluate(()=>window.feedbackRequests[1].reject(new Error('Simulated network failure')));await notice().waitFor();assert.match(await notice().innerText(),/writing is safe/);
 await retry().click();await page.locator('[data-sf-cancel-feedback]').click();await notice().waitFor();assert.match(await notice().innerText(),/cancelled/);
 await retry().click();await resolve(2,valid);assert.equal(await page.locator('[data-sf-cancel-feedback]').count(),1);await resolve(3,valid);await page.getByRole('button',{name:'Revise Draft',exact:true}).waitFor();assert.equal(await page.getByText('999/999',{exact:true}).count(),0);
 await page.getByRole('button',{name:'Revise Draft',exact:true}).click();await go('review');await page.getByRole('button',{name:'Skip self-assessment',exact:true}).click();await feedback().click();
 await go('write');await editors().first().fill('An edited draft must keep its own review status.');await resolve(4,valid);await go('review');await notice().waitFor();assert.match(await notice().innerText(),/draft changed/);assert.equal(await page.getByRole('button',{name:'Revise Draft',exact:true}).count(),0);
 await page.setViewportSize({width:390,height:844});await notice().scrollIntoViewIfNeeded();await page.screenshot({animations:'disabled',path:path.join(out,'feedback-recovery-mobile.png')});
 await page.getByRole('button',{name:'Return to self-check',exact:true}).click();await page.getByRole('button',{name:'Submit Self-Assessment',exact:true}).click();assert.equal(await page.getByRole('button',{name:'Continue to Design',exact:true}).isDisabled(),false);
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({malformedRejected:true,networkFailureRecoverable:true,cancelledResponseIgnored:true,newRequestSurvivesOldResponse:true,totalDerived:true,editedDraftRejectsOldFeedback:true,selfCheckRecovery:true,errors},null,2));console.log('Feedback recovery browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
`;
fs.writeFileSync('reports/story-forge-audit-2026-09-07/verify-fourth-pass.cjs',script);
