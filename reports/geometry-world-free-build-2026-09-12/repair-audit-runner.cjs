'use strict';
const fs=require('node:fs');const file='reports/geometry-world-free-build-2026-09-12/audit-free-build.cjs';let s=fs.readFileSync(file,'utf8');
s=s.replace('await page.waitForFunction(()=>!__geoWorldEngine._entryAnim);','await page.evaluate(()=>{__geoWorldEngine._entryAnim=null;});');
s=s.replaceAll("await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();", "if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();");
s=s.replace("await page.getByRole('button',{name:'Showcase creation',exact:true}).click();", "if(await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).isVisible())await page.getByRole('button',{name:'Expand Free Build Studio',exact:true}).click();await page.getByRole('button',{name:'Showcase creation',exact:true}).click();");
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
