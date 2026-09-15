const fs=require('node:fs'),file=__dirname+'/browser.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace("await page.locator('[data-anatomy-tour-diagram]').click();assert.equal", "await page.locator('[data-anatomy-tour-diagram]').click();await page.waitForFunction(()=>document.activeElement.dataset.anatomyModelShell==='true');assert.equal");
s=s.replace("await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.dataset.anatomyTourStep),'4')", "await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.dataset.anatomyTourStep==='4');assert.equal(await page.evaluate(()=>document.activeElement.dataset.anatomyTourStep),'4')");
fs.writeFileSync(file,s);
