#!/usr/bin/env node
'use strict';
// Read-only catalog image and authoring-subset audit. Run from the repository root.
// Optional first argument: report date (YYYY-MM-DD). No model calls.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const service=require('../agent_core_resource_pack_module.js');
const date=process.argv[2]||new Date().toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Use a YYYY-MM-DD report date');
const output=path.join('docs','allopack-quality-'+date);fs.mkdirSync(output,{recursive:true});
const rows=[];
for(const dir of ['allopacks','allopacks/illustrated']) for(const file of fs.readdirSync(dir).filter(f=>f.endsWith('.allopack.json')).sort()) {
 const p=JSON.parse(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,''));
 const row={file:dir+'/'+file,resources:p.history.length,embeddedImagePlacements:0,uniqueImages:0,missingAlt:[],unknownImageFields:[],coverage:{},draftValidator:{}};const hashes=new Set();
 function walk(n,at){if(Array.isArray(n)){n.forEach((v,i)=>walk(v,at+'['+i+']'));return;}if(!n||typeof n!=='object')return;for(const [k,v] of Object.entries(n)){if(typeof v==='string'&&v.startsWith('data:image/')){row.embeddedImagePlacements++;hashes.add(crypto.createHash('sha256').update(v).digest('hex'));const altKey={image:'imageAlt',imageUrl:'alt',iconUrl:'iconAlt'}[k];if(!altKey)row.unknownImageFields.push(at+'.'+k);else if(!(typeof n[altKey]==='string'&&n[altKey].trim())&&!n.decorative&&!n.imageDecorative)row.missingAlt.push(at+'.'+altKey);}else walk(v,at+'.'+k);}}
 walk(p.history,'history');row.uniqueImages=hashes.size;
 for(const [type,key,imageKey] of [['glossary',null,'image'],['anchor-chart','sections','iconUrl'],['concept-sort','items','image']]) {
  const entries=p.history.filter(r=>r.type===type).flatMap(r=>key?r.data[key]||[]:r.data||[]);row.coverage[type]={slots:entries.length,withImage:entries.filter(e=>typeof e[imageKey]==='string'&&e[imageKey].trim()).length};
 }
 try{const r=service.validatePack(p);row.draftValidator={ok:r.ok,errorCodes:[...new Set((r.errors||[]).map(e=>e.code))]};}catch(e){row.draftValidator={crash:e.message};}
 rows.push(row);
}
const report={date,scope:'Image presence and nonempty alt-text fields, not visual accuracy or full accessibility certification. Draft validator compatibility is diagnostic, not an app import gate.',files:rows.length,embeddedImagePlacements:rows.reduce((s,r)=>s+r.embeddedImagePlacements,0),missingAlt:rows.reduce((s,r)=>s+r.missingAlt.length,0),unknownImageFields:rows.reduce((s,r)=>s+r.unknownImageFields.length,0),rows};
fs.writeFileSync(path.join(output,'image-and-draft-coverage.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,rows:undefined}));console.log('Draft valid',rows.filter(r=>r.draftValidator.ok).length,'crashes',rows.filter(r=>r.draftValidator.crash).length);console.log('Illustrated gaps',JSON.stringify(rows.filter(r=>r.file.includes('/illustrated/')).filter(r=>r.missingAlt.length||r.unknownImageFields.length||Object.values(r.coverage).some(v=>v.withImage<v.slots))));
console.log('Draft error counts',JSON.stringify(rows.reduce((acc,r)=>{for(const c of r.draftValidator.errorCodes||[])acc[c]=(acc[c]||0)+1;return acc;},{})));
