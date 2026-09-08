const fs=require('fs');let script=fs.readFileSync('reports/story-forge-audit-2026-09-07/verify-third-pass.cjs','utf8');script=script.slice(0,script.indexOf(" await page.locator('#sf-title').fill"));script=script.replace("path.join(__dirname,'third-pass')","path.join(__dirname,'followup-review')");
script+=`
 await page.evaluate(()=>{window.auditProps.onCallGemini=async()=>JSON.stringify({tellings:{unexpected:'object'},summary:'Try adding sensory detail.'});window.auditRoot.render(React.createElement(window.AlloModules.StoryForge,window.auditProps));});
 await page.locator('#sf-title').fill('Coach validation audit');await go('write');await editors().first().fill('Maya felt scared as she crossed the bridge. She was cold and tired, but she wanted to help her friend find a safe way home.');await go('review');await page.getByRole('button',{name:'More review tools',exact:true}).click();await page.getByRole('button',{name:/Show vs Tell/}).click();
 await page.waitForFunction(()=>!document.querySelector('.sf-modal-root'));
 fs.writeFileSync(path.join(out,'coach-malformed-response.json'),JSON.stringify({scenario:'Show vs Tell returns a valid JSON object with tellings as an object',componentStillMounted:await page.locator('.sf-modal-root').count()>0,errors},null,2));console.log(JSON.stringify({componentStillMounted:await page.locator('.sf-modal-root').count()>0,errors}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
`;
fs.writeFileSync('reports/story-forge-audit-2026-09-07/audit-followup.cjs',script);
