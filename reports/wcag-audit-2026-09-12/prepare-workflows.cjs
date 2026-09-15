const fs=require('fs');const dir=__dirname;let s=fs.readFileSync(dir+'/run-browser.cjs','utf8');
s=s.replace("['/app/','/catalog.html','/video_studio/video_studio.html']","['/app/']").replaceAll("browser-audit.json","browser-workflows.json");
s=s.replace("await audit(id+'-1280');",`await page.getByRole('button',{name:/Full Platform Complete access/}).click();
   await page.waitForTimeout(2000);
   await audit('full-platform-1280');
   const backend=page.getByRole('button',{name:'AI Backend Settings',exact:true});
   if(await backend.count()){
    await backend.focus();await page.keyboard.press('Enter');await page.waitForTimeout(500);await audit('backend-dialog-1280');
    results.dialogKeyboard=[];
    for(let i=0;i<35;i++){results.dialogKeyboard.push(await page.evaluate(()=>({tag:document.activeElement.tagName,name:document.activeElement.getAttribute('aria-label')||document.activeElement.innerText?.slice(0,100),inDialog:!!document.activeElement.closest('[role=dialog],[role=alertdialog]')})));await page.keyboard.press('Tab');}
    await page.keyboard.press('Escape');await page.waitForTimeout(300);results.dialogAfterEscape=await page.evaluate(()=>({remaining:document.querySelectorAll('[role=dialog]').length,focus:document.activeElement.getAttribute('aria-label')}));
   }
   await audit('full-platform-after-dialog');`);
s=s.replace("await audit(id+'-320');","await audit('full-platform-320');").replace("await audit(id+'-320-spacing');","await audit('full-platform-320-spacing');");
fs.writeFileSync(dir+'/run-workflows.cjs',s);
