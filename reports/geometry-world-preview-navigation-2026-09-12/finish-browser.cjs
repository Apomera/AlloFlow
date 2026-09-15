const fs=require('node:fs');
const file='reports/geometry-world-preview-navigation-2026-09-12/browser.cjs';
const s=fs.readFileSync(file,'utf8');
const from="await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Preview starter',exact:true}).click();";
const to="await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'Find a tool',exact:true}).click();await page.getByRole('searchbox').fill('arch');await page.getByRole('searchbox').press('Enter');await page.getByRole('button',{name:'Preview starter',exact:true}).click();";
if(s.split(from).length!==2)throw Error('Expected exactly one final starter navigation');
const b=Buffer.from(s.replace(from,to));const fd=fs.openSync(file,'r+');fs.writeSync(fd,b);fs.ftruncateSync(fd,b.length);fs.closeSync(fd);
const r=JSON.parse(fs.readFileSync('reports/geometry-world-preview-navigation-2026-09-12/navigation-tests.json','utf8'));for(const suite of r.testResults||[])for(const a of suite.assertionResults||[])if(a.status==='failed')console.log(JSON.stringify(a,null,2));
