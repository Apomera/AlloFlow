'use strict';
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {refine,sources}=require('./lib/allopack_body_quality_20260919.cjs');
const read=f=>JSON.parse(fs.readFileSync(f,'utf8').replace(/^\uFEFF/,''));
const slug='body_systems_grade6',files=['allopacks/'+slug+'.allopack.json','allopacks/illustrated/'+slug+'.allopack.json'],packs=files.map(read);
function artwork(p){const values=[];function walk(n,path){if(!n||typeof n!=='object')return;for(const[k,v]of Object.entries(n)){if(typeof v==='string'&&(/^(image|iconUrl|iconAlt)/.test(k)||v.startsWith('data:image/')||/^alt/.test(k)))values.push([path+'.'+k,crypto.createHash('sha256').update(v).digest('hex')]);else if(v&&typeof v==='object')walk(v,path+'.'+k);}}for(const r of p.history)walk(r,r.id);return values;}
const before=packs.map(artwork),ids=packs.map(p=>p.history.map(r=>[r.id,r.type]));
// Bring the original's native lesson content up to the corrected illustrated baseline.
// Keep source identities, metadata, timestamps and non-illustrated directions suffix behavior.
for(const source of packs[0].history){const target=packs[1].history.find(r=>r.id===source.id);assert(target&&target.type===source.type,'Missing corresponding resource '+source.id);const clean=JSON.parse(JSON.stringify(target),(k,v)=>/^(image|iconUrl|iconAlt)/.test(k)?undefined:v);source.data=clean.data;source.title=clean.title;source.meta=clean.meta;if(source.type==='directions')source.data.body=source.data.body.split('\n\nPicture panels:')[0];}
for(const p of packs){refine(p);p.allopack.revisionReviewStatus='2026-09-19: Body Systems source alignment and AI-assisted investigation revision; educator review pending';p.allopack.contentSources=[...(p.allopack.contentSources||[]).filter(s=>!sources.includes(s.url)),...sources.map(url=>({title:'Body Systems revision reference',url}))];}
for(let i=0;i<packs.length;i++){assert.deepEqual(artwork(packs[i]),before[i],'Artwork or image descriptions changed');assert.deepEqual(packs[i].history.map(r=>[r.id,r.type]),ids[i]);fs.writeFileSync(files[i],JSON.stringify(packs[i],null,2)+'\n');}
const r=require('./reconcile_allopack_content_audits.cjs').records(slug);fs.writeFileSync(r.folder+'content-refinements.json',JSON.stringify(r.rows,null,2)+'\n');r.pack.allopack.contentRefinements={...r.pack.allopack.contentRefinements,count:r.rows.length,sourceOnlyResourceIds:r.sourceOnlyResourceIds,updatedAt:'2026-09-19'};fs.writeFileSync(r.file,JSON.stringify(r.pack,null,2)+'\n');
console.log(JSON.stringify({files,resources:packs.map(p=>p.history.length),artworkAndAltPreserved:true,auditRecords:r.rows.length}));
