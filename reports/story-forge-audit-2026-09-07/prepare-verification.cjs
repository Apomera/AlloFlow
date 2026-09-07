const fs=require('fs');let s=fs.readFileSync(__dirname+'/audit.cjs','utf8');
s=s.replace("const out = __dirname;", "const assert = require('node:assert/strict');\nconst out = path.join(__dirname, 'after');fs.mkdirSync(out,{recursive:true});");
s=s.replace(" const measurements=[];", ` async function goPhase(phase) { if(page.viewportSize().width<640) await page.locator('#sf-mobile-step').selectOption(phase); else await page.locator('[data-sf-phase-step="'+phase+'"]').click(); }
 const measurements=[];`);
s=s.replace(/await page\.locator\('\[data-sf-phase-step="(\w+)"\]'\)\.click\(\);/g, (_,phase)=>`await goPhase('${phase}');`);
s=s.replace(" await page.getByRole('button',{name:'Get Feedback',exact:true}).click();", ` assert.equal(await page.getByRole('button',{name:'Get Feedback',exact:true}).isDisabled(), true);
 await page.getByRole('button',{name:'Return to self-check',exact:true}).click();
 await page.getByRole('button',{name:'Submit Self-Assessment',exact:true}).click();`);
s=s.replace(" await page.getByRole('button',{name:'Regenerate Scene Plan',exact:true}).waitFor();", ` await page.getByRole('button',{name:'Apply plan',exact:true}).waitFor();
 assert.equal(await page.locator('textarea[id^="sf-paragraph-text"]').count(),2);
 await capture('desktop-plan-preview');
 await page.getByRole('button',{name:'Apply plan',exact:true}).click();
 await page.getByRole('button',{name:'Regenerate Scene Plan',exact:true}).waitFor();`);
s=s.replace(" fs.writeFileSync(path.join(out,'functional-results.json')", ` assert.equal(regenerationResult.remainingScenes,2);
 assert.equal(regenerationResult.secondScenePresent,true);
 assert.equal(skipResult.designDisabled,false);
 // Late results must not replace edits or keep the loading state stuck.
 await page.evaluate(()=>{window.auditProps.onCallGemini=()=>new Promise(resolve=>window.resolveAuditPlan=resolve);window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 await page.getByRole('button',{name:'Regenerate Scene Plan',exact:true}).click();
 await page.waitForFunction(()=>typeof window.resolveAuditPlan==='function');
 await page.locator('textarea[id^="sf-paragraph-text"]').first().fill('My newest edit during generation must survive.');
 await page.evaluate(()=>window.resolveAuditPlan(JSON.stringify({frames:['Outdated suggestion']})));
 await page.waitForFunction(()=>window.auditToasts.some(t=>t[0].includes('draft changed')));
 assert.equal(await page.getByRole('button',{name:'Apply plan',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Regenerate Scene Plan',exact:true}).isEnabled(),true);
 assert.equal(await page.locator('textarea[id^="sf-paragraph-text"]').first().inputValue(),'My newest edit during generation must survive.');
 assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'functional-results.json')`);
fs.writeFileSync(__dirname+'/verify.cjs',s);
