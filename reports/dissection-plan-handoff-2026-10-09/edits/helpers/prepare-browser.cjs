const fs=require('fs'),path=require('path'),crypto=require('crypto');const repo='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated',report=path.join(repo,'reports/dissection-plan-handoff-2026-10-09'),file=path.join(repo,'tests/e2e/dissection-checkpoint-clarity.spec.ts'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const old=fs.readFileSync(file);if(hash(old)!=='d061637349ae3dd8e1c0825eeb396ac88ba1292efebec9c25be07e8a16e40c77')throw Error('Browser baseline drift');const eol=old.includes(Buffer.from('\r\n'))?'\r\n':'\n';let text=old.toString(),edits=[];
function edit(a,b,name){a=a.replaceAll('\n',eol);b=b.replaceAll('\n',eol);if(text.split(a).length!==2)throw Error('Browser match '+name);text=text.replace(a,()=>b);edits.push({name,before:a,after:b});}
edit("const out = 'reports/dissection-checkpoint-clarity-2026-09-30';","const referenceOut = 'reports/dissection-checkpoint-clarity-2026-09-30';\nconst out = process.env.DISSECTION_CHECKPOINT_OUTPUT || referenceOut;",'Keep prior captures immutable on follow-up runs');
edit('readFile(`${out}/before-${name}-names.json`','readFile(`${referenceOut}/before-${name}-names.json`','Read existing accessible-name baseline');
edit('.diss-learning-check__feedback, .diss-learning-check__perform, .diss-learning-check__action\')).map','.diss-learning-check__feedback, .diss-learning-check__perform, .diss-learning-check__action, .diss-learning-check__plan p\')).map','Measure new recap text');
edit('await panel.screenshot({ path: `${out}/before-${name}.png`, style: captureStyle }); return;',`await panel.screenshot({ path: out + '/before-' + name + '.png', style: captureStyle });
      await choices.first().click();
      await expect(panel).toHaveAttribute('data-phase', 'perform');
      await panel.screenshot({ path: out + '/before-' + name + '-perform.png', style: captureStyle });
      await writeFile(out + '/before-' + name + '-handoff.json', JSON.stringify({ focused: await page.evaluate(() => document.activeElement?.id), evidence: await evidence(page) }, null, 2)); return;`,'Capture actual pre-change preparation and focus');
edit('expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);',`expect(await evidence(page)).toEqual(before); expect(errors).toEqual([]);
    const chosen = await choices.first().locator('.diss-learning-check__answer').innerText();
    await choices.first().focus(); await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('data-phase', 'perform');
    const heading = page.locator('#diss-learning-check-title');
    await expect(heading).toBeFocused();
    await expect(page.locator('#diss-learning-confirmed-plan')).toHaveText(chosen);
    await expect(heading).toHaveAccessibleDescription((await page.locator('#diss-learning-check-prompt').innerText()) + ' ' + chosen);
    const confirmed = await evidence(page);
    expect({ ...confirmed, checks: before.checks }).toEqual(before);
    expect(confirmed.checks.inspect).toMatchObject({ predictionChoice: 'confirm-route', predictionCorrect: true, predictionAttempts: 1 });
    await checkReadable(page, '#diss-learning-checkpoint', name + '-confirmed-plan', available, !!large);
    const recapFonts = await panel.locator('.diss-learning-check__plan p').evaluateAll(nodes => nodes.map(node => parseFloat(getComputedStyle(node).fontSize)));
    expect(recapFonts).toHaveLength(3); for (const size of recapFonts) expect(size).toBeGreaterThanOrEqual(large ? 18 : 16);
    await heading.focus(); await page.keyboard.press('Tab');
    await expect(panel.getByRole('button', { name: 'Prepare Probe', exact: true })).toBeFocused();
    expect(await evidence(page)).toEqual(confirmed); expect(errors).toEqual([]);`,'Validate the new plan handoff at every existing viewport');
edit("await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-learning-check-feedback');", "await expect(choices.nth(1)).toHaveAttribute('aria-describedby', 'diss-learning-check-feedback');\n  await expect(choices.nth(1)).toBeFocused();",'Keep wrong-answer coaching focus');
edit("await expect(panel).toHaveAttribute('data-phase', 'perform');\n  await expect(page.locator('#diss-canvas')).toBeFocused();", "await expect(panel).toHaveAttribute('data-phase', 'perform');\n  await expect(page.locator('#diss-learning-check-title')).toBeFocused();\n  await page.keyboard.press('Tab');\n  await expect(panel.getByRole('button', { name: 'Prepare Probe', exact: true })).toBeFocused();",'Intentionally replace canvas jump with explicit preparation focus');
const added=`
for (const c of [
  { name: 'legacy record without a choice', entry: { predictionCorrect: true } },
  { name: 'unrecognized saved choice', entry: { predictionCorrect: true, predictionChoice: 'retired-choice' } },
  { name: 'inconsistent saved choice', entry: { predictionCorrect: true, predictionChoice: 'deep-view' } },
]) test('preparation does not invent a confirmed response for ' + c.name, async ({ page }) => {
  test.skip(baseline);
  await mount(page, { procedureByLayer: { skin: { learningChecks: { inspect: c.entry } } } });
  const before = await evidence(page), panel = page.locator('#diss-learning-checkpoint');
  await expect(panel).toHaveAttribute('data-phase', 'perform');
  await expect(page.locator('#diss-learning-confirmed-plan')).toHaveCount(0);
  await expect(page.locator('#diss-learning-check-title')).toHaveAttribute('aria-describedby', 'diss-learning-check-prompt');
  await expect(panel.getByRole('button', { name: 'Prepare Probe', exact: true })).toBeVisible();
  expect(await evidence(page)).toEqual(before);
});

test('confirmed plan follows the current technique without performing the next action', async ({ page }) => {
  test.skip(baseline);
  await mount(page);
  const panel = page.locator('#diss-learning-checkpoint');
  await panel.locator('.diss-learning-check__option').first().click();
  const firstPlan = await page.locator('#diss-learning-confirmed-plan').innerText();
  await panel.getByRole('button', { name: 'Prepare Probe', exact: true }).click();
  await page.locator('#diss-instrument-probe').click();
  await page.locator('#diss-procedure-panel .diss-procedure__next').click();
  await expect(panel).toHaveAttribute('data-phase', 'reflect');
  await expect(page.locator('#diss-learning-confirmed-plan')).toHaveCount(0);
  await panel.locator('.diss-learning-check__option').nth(1).click();
  await expect(panel).toHaveAttribute('data-learning-action', 'scalpel');
  await expect(page.locator('#diss-learning-confirmed-plan')).toHaveCount(0);
  const before = await evidence(page);
  const secondPlan = await panel.locator('.diss-learning-check__answer').nth(1).innerText();
  await panel.locator('.diss-learning-check__option').nth(1).click();
  await expect(page.locator('#diss-learning-check-title')).toBeFocused();
  await expect(page.locator('#diss-learning-confirmed-plan')).toHaveText(secondPlan);
  expect(secondPlan).not.toBe(firstPlan);
  const after = await evidence(page);
  expect({ ...after, checks: before.checks }).toEqual(before);
  expect(after.physical.incisionStarted).toBe(false);
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('button', { name: 'Prepare Scalpel', exact: true })).toBeFocused();
});
`;
text+=added.replaceAll('\n',eol);edits.push({name:'Exercise legacy saved responses and current-technique changes',before:'',after:added.replaceAll('\n',eol)});
let inverse=text;for(const e of edits.slice().reverse()){if(inverse.split(e.after).length!==2)throw Error('Test inverse');inverse=inverse.replace(e.after,()=>e.before);}if(inverse!==old.toString())throw Error('Original test preservation');
fs.writeFileSync(file,text);fs.writeFileSync(path.join(report,'edits/browser-edits.json'),JSON.stringify({before:hash(old),after:hash(text),edits},null,2));console.log(JSON.stringify({browser:hash(text),edits:edits.length}));
