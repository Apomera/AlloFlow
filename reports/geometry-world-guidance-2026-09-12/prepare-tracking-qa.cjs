'use strict';
const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'verify-activity-tracking.cjs'),input=fs.readFileSync(target,'utf8');
const from="id=>window.__geoWorldEngine&&__ctx.toolData.geometryWorld.activeLesson===id,id);await page.evaluate";
const to="id=>window.__geoWorldEngine&&__ctx.toolData.geometryWorld.activeLesson===id,id);const skip=page.getByRole('button',{name:'Skip tutorial',exact:true});if(await skip.isVisible())await skip.click();await page.evaluate";
if(!input.includes(from))throw Error('Missing native lesson startup fixture anchor.');
const next=input.replace(from,to),fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,next,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(next));}finally{fs.closeSync(fd);}
console.log('Tracking QA dismisses first-run onboarding through the native Skip tutorial control.');
