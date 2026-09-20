const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'doc_pipeline_source.jsx'), 'utf8');
const block = source.slice(source.indexOf('var _GEMINI_MAX_CONCURRENT = 3;'), source.indexOf('var _pulsePipelineWatchdog'));
let now = 1000;
let timers = [];
const factory = new Function('warnLog', '_pipelineStats', '_pipeLog', 'setTimeout', 'clearTimeout', 'Date', '_usesLocalTextBackend', '_hostTransportProfile', block + `
return { reset: _resetGeminiBreaker, pace: _applyGeminiPacing, acquire: _acquireGeminiSlot, release: _releaseGeminiSlot, pump: _geminiPump, info: _geminiThrottleInfo, budget: _geminiStormBudget,
heldFail: function(){ _geminiLastAuthAttemptMs = 60000; _geminiNoteAuthFail({}); },
state: function(){return {inFlight:_geminiInFlight, queued:_geminiWaiters.length, starts:_geminiRecentStarts.length, cooldownTotal:_throttleCooldownMsTotal};}};`);
const gate = factory(()=>{}, {}, ()=>{}, fn=>{timers.push(fn);return timers.length;}, ()=>{}, {now:()=>now}, ()=>false, ()=>null);
gate.reset();
for(let i=0;i<3;i++){gate.heldFail();now+=400000;}
const beforeReset=gate.info();
gate.reset();
const afterReset=gate.info();
gate.pace(true);
for(let i=0;i<5;i++){gate.acquire();gate.release();now+=1000;}
gate.acquire();
const queuedAtFive=gate.state();
now+=120000;gate.pump();
const queuedTwoMinutesLater=gate.state();
const budgetAfterQueue=gate.budget();
const result={beforeReset,afterReset,queuedAtFive,queuedTwoMinutesLater,budgetAfterQueue};
fs.writeFileSync(path.join(__dirname,'gate-review.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
