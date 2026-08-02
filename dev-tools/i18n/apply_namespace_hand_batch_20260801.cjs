#!/usr/bin/env node
'use strict';
const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..','..');
const LANG_DIR=path.join(ROOT,'lang');
const DEPLOY_DIR=path.join(ROOT,'desktop','web-app','public','lang');
const [namespace,payloadFile]=process.argv.slice(2);
if(!namespace||!payloadFile)throw new Error('Usage: node apply_namespace_hand_batch_20260801.cjs <namespace> <payload.cjs>');
const translations=require(path.resolve(payloadFile));
function saveAtomic(file,value){const tmp=file+'.codex-tmp';const raw=JSON.stringify(value,null,2)+String.fromCharCode(10);fs.writeFileSync(tmp,raw,'utf8');try{fs.renameSync(tmp,file);}catch(_){fs.copyFileSync(tmp,file);try{fs.unlinkSync(tmp);}catch(__){}}}
let added=0,preserved=0,changed=0;
for(const [slug,values] of Object.entries(translations)){
  const canonicalFile=path.join(LANG_DIR,slug+'.js'),deployedFile=path.join(DEPLOY_DIR,slug+'.js');
  if(!fs.existsSync(canonicalFile)||!fs.existsSync(deployedFile))throw new Error('Missing mirror for '+slug);
  const canonical=JSON.parse(fs.readFileSync(canonicalFile,'utf8'));canonical[namespace]??={};let packAdded=0;
  for(const [key,value] of Object.entries(values)){if(typeof value!=='string'||!value)continue;if(!(key in canonical[namespace])){canonical[namespace][key]=value;packAdded++;}else preserved++;}
  if(packAdded){saveAtomic(canonicalFile,canonical);const deployed=JSON.parse(fs.readFileSync(deployedFile,'utf8'));deployed[namespace]=canonical[namespace];saveAtomic(deployedFile,deployed);changed++;}
  added+=packAdded;console.log(`${slug}: +${packAdded}, preserved ${Object.keys(values).length-packAdded}`);
}
console.log(`Applied ${added} ${namespace} value(s) across ${changed} pack(s); preserved ${preserved} existing value(s).`);
