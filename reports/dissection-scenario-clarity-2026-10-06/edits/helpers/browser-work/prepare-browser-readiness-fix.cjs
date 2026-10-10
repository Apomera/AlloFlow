const fs=require('fs'),path=require('path'),crypto=require('crypto'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(__dirname,'dissection-scenario-clarity.spec.ts'),before=fs.readFileSync(file,'utf8');
if(sha(before)!=='c8f137ac82785d93be027ffb0cd750a12f48507786d0e30ca2b32ef16c2d97bc')throw Error('Browser fixture input guard');
const edits=[
  {
    name:'Wait for the actual native canvas snapshot before advancing the resumed challenge clock; poll unchanged precision at a fixed Date',
    old:"  await expect(consolePanel(page)).toBeVisible(); await page.clock.runFor(2200); const resumed = await state(page);\n  expect(resumed.scenarioStartedAt).toBe(challenge.scenarioStartedAt); expect(resumed.scenarioTimeRemaining).toBeLessThan(240);\n  const expectedRemaining = Math.max(0, 240 - Math.round(((await page.evaluate(() => Date.now())) - challenge.scenarioStartedAt) / 1000)); expect(Math.abs(resumed.scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);",
    new:"  await expect(consolePanel(page)).toBeVisible(); await page.clock.runFor(17);\n  const nativeCanvas = page.locator('[data-diss-canvas]');\n  const nativeReadiness = () => nativeCanvas.evaluate((canvas: any) => ({ connected: canvas.isConnected, documentHidden: document.hidden, quiz: !!canvas._drawD?.quizMode, practical: !!canvas._drawD?.practicalMode, workspace: canvas._drawD?.workspaceMode, scenario: canvas._drawD?.procedureScenario, startedAt: canvas._drawD?.scenarioStartedAt }));\n  await expect.poll(nativeReadiness).toEqual({ connected: true, documentHidden: false, quiz: false, practical: false, workspace: 'advanced', scenario: 'timed-practical', startedAt: challenge.scenarioStartedAt });\n  const renderReadiness = await nativeReadiness(); await page.clock.runFor(2200); const sampledAt = await page.evaluate(() => Date.now());\n  const expectedRemaining = Math.max(0, 240 - Math.round((sampledAt - challenge.scenarioStartedAt) / 1000));\n  // Poll pending React commits while browser time stays fixed; preserve the native one-second precision.\n  await expect.poll(async () => Math.abs((await state(page)).scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);\n  const resumed = await state(page); expect(resumed.scenarioStartedAt).toBe(challenge.scenarioStartedAt); expect(resumed.scenarioTimeRemaining).toBeLessThan(240); expect(Math.abs(resumed.scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);"
  },
  {
    name:'Archive native canvas readiness, fixed sampling time and precise expected remaining alongside saved work',
    old:"challengeDeadline: challenge.scenarioStartedAt + 240000, before, afterTimed",
    new:"challengeDeadline: challenge.scenarioStartedAt + 240000, renderReadiness, sampledAt, expectedRemaining, before, afterTimed"
  },
  {
    name:'Describe the observed native quiz display pause without attributing it to a different source guard',
    old:"  // Native scenario display writes pause while the specimen is hidden in quiz.",
    new:"  // The native challenge display field stays unchanged during this quiz activity."
  }
];
let after=before;for(const e of edits){if(after.split(e.old).length!==2)throw Error('Unique anchor: '+e.name);after=after.replace(e.old,e.new);}
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(after,{loader:'ts',format:'esm'});
let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.new).length!==2)throw Error('Inverse anchor: '+e.name);inverse=inverse.replace(e.new,e.old);}if(inverse!==before)throw Error('Exact reversal');
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'browser-axe-clock-fixture-edits.json'),'utf8'));
if(prior.afterSha256!==sha(before)||prior.beforeSha256!=='4e499f53af25c029d8447fed342edacfb1593cd22e22dec24b1a66bae56ff487')throw Error('Prior receipt guard');
let original=before;for(const e of prior.edits.slice().reverse()){if(original.split(e.new).length!==2)throw Error('Prior inverse guard');original=original.replace(e.new,e.old);}if(sha(original)!==prior.beforeSha256)throw Error('Combined before hash');
const cumulative=[...prior.edits,...edits];let combined=after;for(const e of cumulative.slice().reverse()){if(combined.split(e.new).length!==2)throw Error('Combined inverse guard');combined=combined.replace(e.new,e.old);}if(combined!==original)throw Error('Combined exact reversal');
fs.writeFileSync(file,after);fs.writeFileSync(path.join(__dirname,'browser-readiness-fixture-edits.json'),JSON.stringify({scope:'Honor native canvas readiness and settle queued renders at fixed browser time without relaxing timer precision',beforeSha256:sha(before),afterSha256:sha(after),syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false,edits},null,2));
fs.writeFileSync(path.join(__dirname,'browser-audit-study-fixture-edits.json'),JSON.stringify({scope:'Full audit clock correction plus native resumed Study canvas readiness and timing proof',beforeSha256:prior.beforeSha256,afterSha256:sha(after),syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false,edits:cumulative},null,2));
console.log(JSON.stringify({file,beforeSha256:sha(before),afterSha256:sha(after),incrementalEdits:edits.length,cumulativeBeforeSha256:prior.beforeSha256,cumulativeEdits:cumulative.length,syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false}));
