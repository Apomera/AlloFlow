const fs=require('fs'),path=require('path'),crypto=require('crypto'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(__dirname,'dissection-scenario-clarity.spec.ts'),before=fs.readFileSync(file,'utf8');
if(sha(before)!=='b85da15cd722bdef8f884c81f88863502fba1322e403ab04b0b8ab1bdec0ec6e')throw Error('Browser fixture input guard');
const edits=[
  {
    name:'Record computed control styles for manual native dropdown contrast review',
    old:"      controls: Array.from(el.querySelectorAll('button,select')).filter(visible).map(node => ({ name: node.getAttribute('aria-label') || node.textContent, ...box(node), font: parseFloat(getComputedStyle(node).fontSize), clipped: node.scrollWidth > node.clientWidth + 1 })),",
    new:"      controls: Array.from(el.querySelectorAll('button,select')).filter(visible).map(node => { const style = getComputedStyle(node); return { name: node.getAttribute('aria-label') || node.textContent, ...box(node), font: parseFloat(style.fontSize), clipped: node.scrollWidth > node.clientWidth + 1, color: style.color, backgroundColor: style.backgroundColor, backgroundImage: style.backgroundImage, backgroundPosition: style.backgroundPosition, backgroundSize: style.backgroundSize }; }),"
  },
  {
    name:'Flush native render-dependent focus timer before first Keep focus assertion',
    old:"  await restart(page).focus(); await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await expect(keep(page)).toBeFocused();",
    new:"  await restart(page).focus(); await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused();"
  },
  {
    name:'Use the imported native STEM module layer name in restart scope disclosure',
    old:"toContainText('resets the technique attempt for External Anatomy')",
    new:"toContainText('resets the technique attempt for Skin')"
  },
  {
    name:'Flush native return-focus timer after Escape before reopening review',
    old:"  await page.keyboard.press('Escape'); await expect(review(page)).toHaveCount(0); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);",
    new:"  await page.keyboard.press('Escape'); await expect(review(page)).toHaveCount(0); await page.clock.runFor(1); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);"
  },
  {
    name:'Flush Keep focus and cancellation return-focus callbacks under the paused clock',
    old:"  await page.keyboard.press('Space'); await expect(keep(page)).toBeFocused(); await page.keyboard.press('Enter'); await expect(review(page)).toHaveCount(0); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);",
    new:"  await page.keyboard.press('Space'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused(); await page.keyboard.press('Enter'); await expect(review(page)).toHaveCount(0); await page.clock.runFor(1); await expect(restart(page)).toBeFocused(); expect(await proof(page)).toEqual(before);"
  },
  {
    name:'Flush the final review request and retain Keep-first focus before confirmation',
    old:"  await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await confirm(page).focus(); await consolePanel(page).screenshot",
    new:"  await page.keyboard.press('Enter'); await expect(review(page)).toBeVisible(); await page.clock.runFor(1); await expect(keep(page)).toBeFocused(); await confirm(page).focus(); await consolePanel(page).screenshot"
  },
  {
    name:'Assert native hidden challenge display pauses while its absolute deadline stays fixed',
    old:"  await page.clock.runFor(2200); const running = await state(page); expect(running.practicalTimer).toBeLessThan(120); expect(running.scenarioTimeRemaining).toBeLessThan(240); expect(running.practicalEndsAt).toBe(active.practicalEndsAt); expect(running.scenarioStartedAt).toBe(challenge.scenarioStartedAt);",
    new:"  await page.clock.runFor(2200); const running = await state(page); expect(running.practicalTimer).toBeLessThan(120); expect(running.scenarioTimeRemaining).toBe(240); expect(running.practicalEndsAt).toBe(active.practicalEndsAt); expect(running.scenarioStartedAt).toBe(challenge.scenarioStartedAt);\n  // Native scenario display writes pause while the specimen is hidden in quiz.\n  // Its four-minute absolute deadline continues independently of the two-minute identification clock.\n  expect(await page.evaluate(() => Date.now())).toBeGreaterThan(challenge.scenarioStartedAt + 2000); expect(challenge.scenarioStartedAt + 240000).toBeGreaterThan(active.practicalEndsAt);"
  },
  {
    name:'Verify resumed native challenge counter catches up to elapsed deadline after End and panel reopening',
    old:"  await expect(consolePanel(page)).toBeVisible();\n  const afterTimed = await proof(page); await harness.unmount(page);",
    new:"  await expect(consolePanel(page)).toBeVisible(); await page.clock.runFor(2200); const resumed = await state(page);\n  expect(resumed.scenarioStartedAt).toBe(challenge.scenarioStartedAt); expect(resumed.scenarioTimeRemaining).toBeLessThan(240);\n  const expectedRemaining = Math.max(0, 240 - Math.round(((await page.evaluate(() => Date.now())) - challenge.scenarioStartedAt) / 1000)); expect(Math.abs(resumed.scenarioTimeRemaining - expectedRemaining)).toBeLessThanOrEqual(1);\n  await expect(time(page)).toHaveAttribute('aria-live', 'off'); expect(await proof(page)).toEqual({ ...before, selected: null, scores: [0, 0], comparingAttempts: false });\n  const afterTimed = await proof(page); await harness.unmount(page);"
  },
  {
    name:'Record hidden and resumed challenge display values alongside unchanged deadlines and saved work',
    old:"runningSeconds: { technique: running.scenarioTimeRemaining, identification: running.practicalTimer }, before, afterTimed",
    new:"runningSeconds: { hiddenTechniqueDisplay: running.scenarioTimeRemaining, identification: running.practicalTimer, resumedTechniqueDisplay: resumed.scenarioTimeRemaining }, challengeDeadline: challenge.scenarioStartedAt + 240000, before, afterTimed"
  }
];
let after=before;for(const e of edits){if(after.split(e.old).length!==2)throw Error('Unique anchor: '+e.name);after=after.replace(e.old,e.new);}
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(after,{loader:'ts',format:'esm'});
let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.new).length!==2)throw Error('Inverse anchor: '+e.name);inverse=inverse.replace(e.new,e.old);}if(inverse!==before)throw Error('Exact reversal');
fs.writeFileSync(file,after);fs.writeFileSync(path.join(__dirname,'browser-native-fixture-edits.json'),JSON.stringify({scope:'Honor paused-clock native focus callbacks, imported layer name and hidden-canvas timer display semantics; record manual contrast inputs',beforeSha256:sha(before),afterSha256:sha(after),syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false,edits},null,2));
console.log(JSON.stringify({file,beforeSha256:sha(before),afterSha256:sha(after),edits:edits.length,syntax:'passed',exactReversal:true,repositoryWrites:false,suitesRun:false}));
