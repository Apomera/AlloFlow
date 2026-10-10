const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {runMountWithWaitWindow}=require('./arm-mount-window.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
  const calls=[],sentinel={},page={waitForFunction:function(predicate,arg,options){calls.push({receiver:this,predicate,arg,options});return Promise.resolve(sentinel);}},original=page.waitForFunction;
  const predicate=()=>true,arg={exact:'argument'},options={timeout:30000,polling:27},other={timeout:15000,polling:'raf'};
  const value=await runMountWithWaitWindow(page,async()=>{
    assert.equal(await page.waitForFunction(predicate,arg,options),sentinel);
    assert.equal(await page.waitForFunction('true',arg,other),sentinel);
    assert.equal(await page.waitForFunction(predicate,arg,undefined),sentinel);
  });
  assert.equal(page.waitForFunction,original);assert.equal(value.adjustedWaits,1);
  assert.equal(calls[0].receiver,page);assert.equal(calls[0].predicate,predicate);assert.equal(calls[0].arg,arg);assert.deepEqual(calls[0].options,{timeout:120000,polling:27});assert.deepEqual(options,{timeout:30000,polling:27});
  assert.equal(calls[1].predicate,'true');assert.equal(calls[1].options,other);assert.equal(calls[2].options,undefined);
  const failure=new Error('deliberate mount rejection');let caught;
  try{await runMountWithWaitWindow(page,()=>Promise.reject(failure));}catch(error){caught=error;}
  assert.equal(caught,failure);assert.equal(page.waitForFunction,original);
  const waitFailure=new Error('deliberate wait rejection'),rejecting={waitForFunction:function(){return Promise.reject(waitFailure);}},rejectOriginal=rejecting.waitForFunction;
  await assert.rejects(runMountWithWaitWindow(rejecting,()=>rejecting.waitForFunction(predicate,arg,options)),error=>error===waitFailure);assert.equal(rejecting.waitForFunction,rejectOriginal);
  const result={passed:true,browserLaunched:false,helperSHA256:sha(fs.readFileSync(path.join(__dirname,'arm-mount-window.cjs'))),waitPredicateUnchanged:true,argumentsUnchanged:true,otherOptionsUnchanged:true,originalOptionsUnmutated:true,returnValuePreserved:true,restoredOnSuccess:true,restoredOnMountRejection:true,restoredOnWaitRejection:true,rejectionsPropagated:true};
  fs.writeFileSync(path.join(__dirname,'mount-window-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
})().catch(error=>{console.error(error);process.exitCode=1;});
