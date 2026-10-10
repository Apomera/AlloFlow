'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const stage=__dirname,report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/universe-flight-2026-09-29/disk-depth/unit/affected-retry',target=path.join(report,'attempts');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const executionBytes=fs.readFileSync(path.join(report,'execution.json')),execution=JSON.parse(executionBytes),driver=fs.readFileSync(path.join(stage,'run-unit-retry.cjs')),stdout=fs.readFileSync(path.join(report,'stdout.txt'));
assert.equal(execution.completed,true);assert.equal(execution.exitCode,3221226505);assert.equal(execution.inputsUnchanged,true);assert.equal(execution.diagnosticsUnchanged,true);
assert.equal(sha(driver),execution.diagnostics.find(item=>item.path==='run-unit-retry.cjs').sha256);
fs.mkdirSync(target,{recursive:true});
const files=[['01-driver.cjs',driver],['01-execution.json',executionBytes],['01-stdout.txt',stdout]];
for(const [name,bytes] of files){const dest=path.join(target,name);if(fs.existsSync(dest))assert.equal(sha(fs.readFileSync(dest)),sha(bytes));else fs.writeFileSync(dest,bytes);assert.equal(sha(fs.readFileSync(dest)),sha(bytes));}
assert.equal(sha(fs.readFileSync(path.join(stage,'run-unit-retry.cjs'))),sha(driver));assert.equal(sha(fs.readFileSync(path.join(report,'execution.json'))),sha(executionBytes));assert.equal(sha(fs.readFileSync(path.join(report,'stdout.txt'))),sha(stdout));
console.log(JSON.stringify({captured:true,target,files:files.map(([name,bytes])=>({name,sha256:sha(bytes),bytes:bytes.length})),noTestsLaunched:true,originalsUnchanged:true}));
