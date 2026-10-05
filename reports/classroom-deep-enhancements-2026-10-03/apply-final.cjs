'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),hash=v=>crypto.createHash('sha256').update(v).digest('hex');
assert(!fs.existsSync(path.join(__dirname,'applied.json')),'Apply exactly once');const plan=JSON.parse(fs.readFileSync(path.join(__dirname,'prepared-final.json')));
// Check every shared target and candidate before the first write.
for(const row of plan.files){assert.equal(hash(fs.readFileSync(path.join(root,row.file))),row.beforeSha256,'Current target '+row.file);assert.equal(hash(fs.readFileSync(path.join(__dirname,'final-candidate',row.file))),row.afterSha256,'Tested candidate '+row.file);}
for(const row of plan.files)fs.writeFileSync(path.join(root,row.file),fs.readFileSync(path.join(__dirname,'final-candidate',row.file)));
fs.writeFileSync(path.join(__dirname,'applied.json'),JSON.stringify({...plan,appliedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({applied:true,files:plan.files.length,studioPin:plan.studioPin}));
