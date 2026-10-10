'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),report='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/reports/universe-flight-2026-09-29/close-disk';
const browserBytes=fs.readFileSync(path.join(report,'vista-browser-check.json')),executionBytes=fs.readFileSync(path.join(report,'browser-execution.json')),result=JSON.parse(browserBytes),execution=JSON.parse(executionBytes);
assert.equal(result.completed,true);assert.equal(execution.completed,true);assert.equal(execution.exitCode,0);assert.equal(execution.driverFrozen,true);assert.equal(execution.wrapperFrozen,true);
assert.equal(result.harnessHash,execution.driverHash);assert.equal(hash(fs.readFileSync(path.join(__dirname,'browser-check.cjs'))),result.harnessHash);assert.equal(hash(fs.readFileSync(path.join(__dirname,'run-browser.cjs'))),execution.wrapperHash);
assert.equal(result.checks.length,4);assert.equal(result.accessibility.length,6);assert.equal(result.captures.length,4);assert.equal(result.poses.length,4);
for(const audit of result.accessibility)assert.deepEqual(audit.violations,[]);
for(const capture of result.captures)assert.equal(hash(fs.readFileSync(path.join(report,capture.file))),capture.hash);
for(const [file,pin]of Object.entries(result.pins)){const served=result.served.filter(item=>item.path==='/'+file);assert.ok(served.length);assert.ok(served.every(item=>item.hash===pin));assert.equal(pin,execution.inputs[file]);}
assert.deepEqual(result.errors,[]);assert.deepEqual(result.sourceReadErrors,[]);assert.deepEqual(result.loaderRetries,[]);
assert.equal(hash(fs.readFileSync(path.join(report,'browser-stdout.log'))),execution.stdoutHash);assert.equal(hash(fs.readFileSync(path.join(report,'browser-stderr.log'))),execution.stderrHash);
const validation={completed:true,actualVerificationDriverHash:hash(fs.readFileSync(__filename)),browserReportHash:hash(browserBytes),executionReportHash:hash(executionBytes),driverHash:execution.driverHash,wrapperHash:execution.wrapperHash,workflowGroups:result.checks.length,scopedAccessibilityAudits:result.accessibility.length,captures:result.captures,served:result.served,pageErrors:0,sourceReadErrors:0,loaderRetries:0,exitCode:execution.exitCode};
fs.writeFileSync(path.join(__dirname,'browser-validation.json'),JSON.stringify(validation,null,2));console.log(JSON.stringify(validation,null,2));
