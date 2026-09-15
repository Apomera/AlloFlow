const fs=require('fs');let source=fs.readFileSync(__dirname+'/browser.cjs','utf8');
source=source.replace("await page.getByRole('searchbox').press('Escape');check('Escape returns", "await page.getByRole('searchbox').press('Escape');await page.waitForFunction(()=>document.activeElement===document.querySelector('.gwe-tool-finder-toggle'));check('Escape returns");
source=source.replace("await page.getByRole('button',{name:'Back to tools',exact:true}).click();check('Returning to tools", "await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();check('Opening Build tools exits world review',await page.locator('.gwe-preview-review').count()===0);check('Returning to tools");
source=source.replace("Math.abs(projected[0])<.8&&Math.abs(projected[1])<.8&&projected[2]<1,projected", "Math.abs(projected[0])<.8&&Math.abs(projected[1])<.8&&projected[2]<1,projected");
source=source.replace("path.join(out,'browser.json')", "path.join(out,'browser-final.json')");
new Function('require','__dirname',source)(require,__dirname);
