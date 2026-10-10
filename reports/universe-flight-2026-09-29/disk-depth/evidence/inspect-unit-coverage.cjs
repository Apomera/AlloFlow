'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',base=path.join(repo,'reports/universe-flight-2026-09-29/disk-depth/unit'),retry=path.join(base,'affected-retry');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const primary=JSON.parse(fs.readFileSync(path.join(base,'results.json'))),execution=JSON.parse(fs.readFileSync(path.join(base,'execution.json'))),retried=JSON.parse(fs.readFileSync(path.join(retry,'execution.json')));
assert.equal(execution.completed,true);assert.equal(execution.inputsUnchanged,true);assert.equal(execution.diagnosticsUnchanged,true);
assert.equal(sha(path.join(base,'results.json')),retried.primaryResultsHash);assert.equal(sha(path.join(base,'execution.json')),retried.primaryExecutionHash);
const unaffected=primary.testResults.filter(result=>result.status==='passed').map(result=>{
  const relative=path.relative(repo,result.name).replaceAll('\\','/'),pin=execution.inputs.find(input=>input.path===relative);
  assert.ok(pin);assert.equal(sha(path.join(repo,relative)),pin.sha256);
  assert.ok(result.assertionResults.every(assertion=>assertion.status==='passed'));
  return {path:relative,passedAssertions:result.assertionResults.length,currentHash:pin.sha256};
});
const allCurrentInputsMatch=retried.inputs.every(input=>sha(path.join(repo,input.path))===input.sha256);
console.log(JSON.stringify({retryCompleted:retried.completed,exitCode:retried.exitCode,exitCodeHex:retried.exitCode===undefined?null:'0x'+retried.exitCode.toString(16).toUpperCase(),startedAt:retried.startedAt,finishedAt:retried.finishedAt,resultsExist:fs.existsSync(path.join(retry,'results.json')),stdoutBytes:fs.statSync(path.join(retry,'stdout.txt')).size,allCurrentInputsMatch,retainedPrimaryCoverage:unaffected,retainedAssertionCount:unaffected.reduce((sum,file)=>sum+file.passedAssertions,0),newRetryAssertionCoverage:false,reportWrites:false},null,2));
