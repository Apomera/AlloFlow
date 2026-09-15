'use strict';
const fs=require('node:fs'),path=require('node:path');
require('./summarize-browser-checks.cjs');
const summary=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-verification-summary.json'),'utf8'));
if(!summary.pass)throw Error('Browser summary has failures');
const file=path.join(__dirname,'write-final-browser-review.cjs');let s=fs.readFileSync(file,'utf8');
s=s.replace('The broad screenshots precede the last crosshair and feedback-stack corrections. The final Aim and compact-desktop screenshots record those corrections.','The broad selection and material-preview screenshots precede the last Aim, crosshair, feedback, and toolbar-recovery corrections. The latest native-entry, Aim, compact-desktop, and toolbar-recovery screenshots record the final implementation.');
s=s.replace('- [Native desktop entry](final-01-desktop-native-entry.png)','- [Final native desktop entry](final-native-entry-latest.png)\n- [Final native first B](final-native-first-b-latest.png)');
s=s.replace('- [Final compact desktop feedback](final-feedback-wide-550.png)','- [Final compact desktop feedback](final-feedback-wide-550.png)\n- [390px toolbar recovery](final-toolbar-recovery-390.png)\n- [320px toolbar recovery](final-toolbar-recovery-320.png)\n- [320px recovery with Position expanded](final-toolbar-recovery-320-expanded.png)');
const anchor='## Evidence';
s=s.replace(anchor,'- At 390px and 320px, World home and Show game bar are separate, reachable 44px controls. Expanding Position leaves them accessible. Native World home → Continue your workspace → Show game bar completes successfully.\n\n'+anchor);
const fd=fs.openSync(file,'r+');try{fs.writeFileSync(fd,s);fs.ftruncateSync(fd,Buffer.byteLength(s));}finally{fs.closeSync(fd);}
require('./write-final-browser-review.cjs');
console.log('Wrote FREE-BUILD-BROWSER-REVIEW.md');
