const fs=require('fs'),path=require('path'),crypto=require('crypto');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(__dirname,'dissection-view-chooser.spec.ts'),before=fs.readFileSync(file,'utf8');
if(sha(before)!=='0f7ca84e8bdf75cdc462e63cba49eff481f4920a7219133b004e2eed51c1f102')throw Error('Browser fixture guard');
const edits=[
  {
    name:'Respect native View closing at practical start and reopen Accessibility',
    old:"  await start.focus(); await page.keyboard.press('Enter'); const active = await state(page); expect(active.practicalMode).toBe(true); expect(active.quizMode).toBe(true); expect(active.labelMode).toBe('hidden');\n  await expect(button(page, 'Organ name labels hidden during assessment')).toBeDisabled();",
    new:"  await start.focus(); await page.keyboard.press('Enter'); const active = await state(page); expect(active.practicalMode).toBe(true); expect(active.quizMode).toBe(true); expect(active.labelMode).toBe('hidden');\n  // Native Start closes View. Reopen its assessment controls through the real toggle.\n  await expect(chooser(page)).toHaveCount(0); expect(active.toolbarViewOpen).toBe(false);\n  await page.getByRole('button', { name: 'Accessibility options', exact: true }).click(); await expect(chooser(page)).toBeVisible();\n  await expect(button(page, 'Organ name labels hidden during assessment')).toBeDisabled();"
  },
  {
    name:'Reopen Study through the native route before ending the practical',
    old:"  await chooser(page).screenshot({ path: `${out}/native-practical-view.png`, style: screenshotStyle });\n  await study.getByRole('button', { name: 'End timed practical', exact: true }).click();",
    new:"  await chooser(page).screenshot({ path: `${out}/native-practical-view.png`, style: screenshotStyle });\n  // Accessibility closes Study; its existing route keeps the practical active and exposes End.\n  await page.locator('#diss-route-study').click(); await expect(chooser(page)).toHaveCount(0);\n  expect((await state(page)).practicalMode).toBe(true); expect(await proof(page)).toEqual({ ...before, scores: [0, 0] });\n  await study.getByRole('button', { name: 'End timed practical', exact: true }).click();"
  },
  {
    name:'Reopen restored View through its native toggle after End',
    old:"  await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); const ended = await state(page); expect(ended.practicalMode).toBe(false); expect(ended.quizMode).toBe(false); expect(ended.labelMode).toBe('show');\n  await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(4);",
    new:"  await study.getByRole('button', { name: 'End timed practical', exact: true }).click(); const ended = await state(page); expect(ended.practicalMode).toBe(false); expect(ended.quizMode).toBe(false); expect(ended.labelMode).toBe('show');\n  await page.getByRole('button', { name: 'View and accessibility options', exact: true }).click(); await expect(chooser(page)).toBeVisible();\n  await expect(chooser(page).locator('[data-diss-view-subgroup]')).toHaveCount(4);"
  }
];
let after=before;for(const e of edits){if(after.split(e.old).length!==2)throw Error('Unique anchor: '+e.name);after=after.replace(e.old,e.new);}
require('C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated/node_modules/esbuild').transformSync(after,{loader:'ts',format:'esm'});
let inverse=after;for(const e of edits.slice().reverse()){if(inverse.split(e.new).length!==2)throw Error('Inverse anchor: '+e.name);inverse=inverse.replace(e.new,e.old);}if(inverse!==before)throw Error('Exact reversal');
fs.writeFileSync(file,after);fs.writeFileSync(path.join(__dirname,'browser-fixture-edits.json'),JSON.stringify({scope:'Native practical browser interaction assumptions only; no runtime changes',beforeSha256:sha(before),afterSha256:sha(after),exactReversal:true,syntax:'passed',repositoryWrites:false,suitesRun:false,edits},null,2));
console.log(JSON.stringify({file,beforeSha256:sha(before),afterSha256:sha(after),edits:edits.length,syntax:'passed',repositoryWrites:false,suitesRun:false}));
