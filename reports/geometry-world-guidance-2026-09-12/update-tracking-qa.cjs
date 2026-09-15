'use strict';
const fs=require('node:fs'),path=require('node:path');
const target=path.join(__dirname,'verify-activity-tracking.cjs');
const input=fs.readFileSync(target,'utf8');
const from="__geoWorldEngine._currentLesson.activities.map(a=>({id:a.id,title:a.title,npcName:a.npcName}))";
const to="StemLab.geometryWorldBuilderPure.activityGuideModel(__geoWorldEngine._currentLesson).activities.map(a=>({id:a.id,title:a.title,npcName:a.npcName}))";
if(!input.includes(from))throw Error('Missing authored activity fixture anchor.');
const next=input.replace(from,to),fd=fs.openSync(target,'r+');try{fs.writeFileSync(fd,next,'utf8');fs.ftruncateSync(fd,Buffer.byteLength(next));}finally{fs.closeSync(fd);}
console.log('Tracking QA now uses stable public journal IDs rather than raw authored IDs.');
