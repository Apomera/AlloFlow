const fs=require('node:fs'),file='reports/geometry-world-graphics-2026-09-08/verify-workspace-feedback.cjs';
let s=fs.readFileSync(file,'utf8');
s=s.replace("source=source.replaceAll('controls-views-','workspace-feedback-')", "source=source.replace('page.setDefaultTimeout(18000)','page.setDefaultTimeout(45000)').replaceAll('controls-views-','workspace-feedback-')");
s=s.replace('timeout:18000','timeout:45000');
s=s.replace("source=source.replace(\"put(5,1,0,'wood','halfB')\", \"put(5,1,0,'wood')\");", "source=source.replace(\"put(5,1,0,'wood','halfB')\", \"put(5,1,0,'wood')\");\nsource=source.replace('window.__controlsViewsEngine=en;', 'window.__controlsViewsEngine=en;window.__feedbackBadgeKeep=setInterval(()=>{const badge=__ctx.toolData.geometryWorld.lastBadgeNotification;if(badge&&en._badgeDismissTimer)clearTimeout(en._badgeDismissTimer);},30);');");
s=s.replace('results.earnedBadge=await page.evaluate(()=>{const en=__geoWorldEngine;', 'results.earnedBadge=await page.evaluate(()=>{clearInterval(window.__feedbackBadgeKeep);const en=__geoWorldEngine;');
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
