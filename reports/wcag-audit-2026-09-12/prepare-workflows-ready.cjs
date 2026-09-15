const fs=require('fs');let s=fs.readFileSync(__dirname+'/run-workflows.cjs','utf8');
s=s.replaceAll('browser-workflows.json','browser-workflows-ready.json');
s=s.replace("await page.locator('button').filter({hasText:'Full Platform'}).first().click();",`const initialBackend=page.getByRole('button',{name:'AI Backend Settings',exact:true});
   await initialBackend.focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);await audit('backend-initial-1280');
   results.backendKeyboard=[];
   for(let i=0;i<45;i++){results.backendKeyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,name:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText?.slice(0,70),inDialog:!!document.activeElement.closest('[role=dialog],[role=alertdialog]')})));await page.keyboard.press('Tab');}
   await page.keyboard.press('Escape');await page.waitForTimeout(300);results.backendAfterEscape=await page.evaluate(()=>({dialogCount:document.querySelectorAll('[role=dialog]').length,focus:document.activeElement.getAttribute('aria-label')}));
   await page.locator('button').filter({hasText:'Full Platform'}).first().click();
   await page.getByRole('button',{name:'Teacher',exact:true}).click();
   await page.waitForTimeout(15000);`);
s=s.replaceAll("'full-platform-", "'teacher-workspace-");
fs.writeFileSync(__dirname+'/run-workflows-ready.cjs',s);
