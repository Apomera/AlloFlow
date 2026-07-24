#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const root=path.resolve(__dirname,'..');
const sourceDir=path.join(root,'test_prep');
const deployDir=path.join(root,'desktop/web-app','public','test_prep');
const auditName='test_prep_assistant_review_2026-07-16.json';
const mdName='test_prep_assistant_review_2026-07-16.md';
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const sourceAuditPath=path.join(sourceDir,auditName),deployAuditPath=path.join(deployDir,auditName);
for(const file of[sourceAuditPath,deployAuditPath,path.join(sourceDir,mdName),path.join(deployDir,mdName)])if(!fs.existsSync(file))throw Error(`Assistant audit artifact missing: ${file}`);
if(fs.readFileSync(sourceAuditPath,'utf8')!==fs.readFileSync(deployAuditPath,'utf8'))throw Error('Assistant audit JSON mirror differs');
if(fs.readFileSync(path.join(sourceDir,mdName),'utf8')!==fs.readFileSync(path.join(deployDir,mdName),'utf8'))throw Error('Assistant audit Markdown mirror differs');
const audit=JSON.parse(fs.readFileSync(sourceAuditPath,'utf8'));
if(audit.status!=='reviewed-target-not-met'||audit.perPack?.length!==22)throw Error('Assistant audit verdict or pack inventory is invalid');
const snapshotParts=[];
for(const row of audit.perPack){
  const packName=row.stem+'_pack.json',itemsName=row.stem+'_items.json';
  const packBytes=fs.readFileSync(path.join(sourceDir,packName)),itemsBytes=fs.readFileSync(path.join(sourceDir,itemsName));
  if(sha(packBytes)!==row.packSha256||sha(itemsBytes)!==row.itemsSha256)throw Error(`${row.stem}: assistant audit hash is stale`);
  if(!fs.readFileSync(path.join(sourceDir,packName)).equals(fs.readFileSync(path.join(deployDir,packName))))throw Error(`${row.stem}: pack mirror differs`);
  if(!fs.readFileSync(path.join(sourceDir,itemsName)).equals(fs.readFileSync(path.join(deployDir,itemsName))))throw Error(`${row.stem}: items mirror differs`);
  snapshotParts.push(`${row.stem}:${row.packSha256}:${row.itemsSha256}`);
}
if(audit.snapshot?.algorithm!=='sha256'||audit.snapshot.hash!==sha(snapshotParts.join('\n')))throw Error('Assistant audit aggregate snapshot hash is invalid');
console.log(`Verified assistant audit hashes and source/deploy mirrors for ${audit.perPack.length} packs.`);
