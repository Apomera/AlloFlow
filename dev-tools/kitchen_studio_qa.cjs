const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'reports/kitchen-lab-enhancement');
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, data) => { if (err) res.writeHead(404).end(); else { res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream'); res.end(data); } });
});
(async () => {
  fs.mkdirSync(out, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/stem_lab/kitchen_studio/index.html`;
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  const results = { errors: [], checks: [], accessibility: [], screenshots: [] };
  const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', e => results.errors.push(e.message));
  const action = id => page.locator(`[data-action="${id}"]`).click();
  const station = id => page.locator(`[data-station="${id}"]`).click();
  const record = async (answer) => { await page.locator(`input[name="reason"][value="${answer}"]`).check(); await page.locator('#submit').click(); };
  const shot = async name => { await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true }); results.screenshots.push(name + '.png'); };
  try {
    await page.goto(url); await page.locator('#missionTitle').waitFor();
    assert.equal(await page.locator('#scene canvas').count(), 1, 'WebGL canvas mounted');
    assert.equal(await page.locator('#fallback').isVisible(), false);
    await shot('studio-desktop');
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') });
    const audit = async label => { const issues = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } })).violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) }))); results.accessibility.push({ label, issues }); assert.deepEqual(issues, [], label + ' accessibility'); };
    await audit('desktop initial');
    await page.locator('[data-station=prep]').hover();await audit('selected station hover');
    await page.locator('#mode').selectOption('demonstrate');
    await action('prepare'); assert.match(await page.locator('#feedback').innerText(), /only after/);
    await action('wash'); await action('board'); await action('prepare');
    assert.equal(await page.locator('#reasoning').isVisible(), true);
    await page.locator('#reflection').fill('With one board I would wash and sanitize it and clean the utensils between raw poultry and vegetables.');
    await record(1); assert.match(await page.locator('#result').innerText(), /Completed with support/);
    results.checks.push('Unsafe prep blocked; corrected attempt and reflection recorded.');
    await station('probe'); await page.locator('#mode').selectOption('demonstrate'); await action('surface'); await action('read'); await action('serve');
    assert.match(await page.locator('#feedback').innerText(), /Do not serve/);
    await action('thick'); for (let i=0;i<3;i++) await action('cook'); await action('read'); await action('serve'); await record(1);
    await station('heat'); await action('dry'); await action('spread'); await action('medium'); for(let i=0;i<3;i++) await action('advance');
    await page.locator('#focusView').click(); await page.locator('#rotateLeft').click(); await shot('studio-browning'); await page.locator('#resetView').click(); await action('plate'); await record(0);
    await station('measure'); await page.locator('#mode').selectOption('demonstrate'); for(let i=0;i<3;i++) await action('add150'); await action('check'); await record(2);
    assert.match(await page.locator('#result').innerText(), /Completed independently/);
    await station('knife'); await page.locator('[data-action="secure"]').focus(); await page.keyboard.press('Enter'); await page.locator('[data-action="claw"]').focus(); await page.keyboard.press('Space'); await page.locator('[data-action="dice"]').focus(); await page.keyboard.press('Enter'); await record(2);
    await station('chill'); await action('shallow'); await action('label'); await action('chill'); await record(0);
    assert.equal(await page.locator('#progressCount').innerText(), '6 of 6 stations');
    await page.locator('#reviewToggle').click(); assert.equal(await page.locator('#portfolio article').count(), 6);
    await audit('completed evidence'); results.checks.push('All six stations complete; keyboard actions, reasoning, and evidence portfolio verified.');
    const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click(); const download = await downloadPromise; await download.saveAs(path.join(out, download.suggestedFilename()));
    const report = JSON.parse(fs.readFileSync(path.join(out, download.suggestedFilename()), 'utf8')); assert.equal(report.attempts.length, 6); assert.equal(report.attempts[0].corrections, 1); assert.ok(report.attempts[0].reflection.includes('sanitize'));
    await page.reload(); await page.locator('#missionTitle').waitFor(); assert.equal(await page.locator('#progressCount').innerText(), '6 of 6 stations');
    await station('measure'); assert.equal(await page.locator('#result').isVisible(), true); results.checks.push('Export contains full evidence; state and submitted results survive reload.');
    await page.locator('#retry').click(); await action('add150'); await station('prep'); await station('measure'); assert.match(await page.locator('#sceneDescription').innerText(), /150 mL/);
    await page.locator('#viewToggle').click(); assert.equal(await page.locator('#fallback').isVisible(), true); await shot('studio-text-view');
    for(const width of [390,320]) { await page.setViewportSize({width,height:844}); await shot('studio-mobile-'+width); assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow at '+width); }
    await page.addScriptTag({ path: path.join(root, 'node_modules/axe-core/axe.min.js') }); await audit('320px text view');
    await page.locator('#viewToggle').click(); await shot('studio-mobile-3d');
    const fallback = await browser.newPage({ viewport: {width:390,height:844} });
    await fallback.route('**/three.min.js', route => route.abort()); await fallback.goto(url); await fallback.locator('#missionTitle').waitFor(); assert.equal(await fallback.locator('#fallback').isVisible(), true); await fallback.locator('[data-action="wash"]').click(); assert.match(await fallback.locator('#sceneDescription').innerText(), /washed with soap/); await fallback.close();
    results.checks.push('Small screens, optional text view, and missing-3D fallback retain working practice.');
    const storage = await browser.newPage(); await storage.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage unavailable'); } }); }); await storage.goto(url); await storage.locator('#missionTitle').waitFor(); assert.match(await storage.locator('#storageStatus').innerText(), /unavailable/); await storage.locator('[data-action="wash"]').click(); await storage.close();
    // Exercise every alternate task through its real controls.
    await page.setViewportSize({width:1360,height:1000});
    const alternatives=[['prep','shared-board',['board','sanitize','wash','prepare'],1],['knife','stew',['secure','claw','largeDice'],2],['heat','hot-pan',['medium','advance','plate'],0],['probe','ready',['thick','read','serve'],1],['measure','four',['add150','add150','check'],2],['chill','picnic',['discard'],0]];
    for(const [id,variant,actions,answer] of alternatives){
      await station(id);await page.locator('#newChallenge').click();assert.equal(await page.locator('#scenario').inputValue(),variant);
      await page.locator('#mode').selectOption('demonstrate');
      await page.locator('.plan-card summary').click();await page.locator('#plan').fill('I will use the evidence in this '+variant+' challenge before deciding.');
      if(id==='measure')assert.ok(!(await page.locator('#goal').innerText()).includes('300'));
      for(const a of actions)await action(a);
      assert.equal(await page.locator('#plan').isDisabled(),true);assert.equal(await page.locator('#scenario').isDisabled(),true);
      await page.locator('.plan-card summary').click();
      await record(answer);assert.match(await page.locator('#result').innerText(),/Completed independently/);
      assert.equal(await page.locator('#actionButtons').isVisible(),false);assert.equal(await page.locator('#reasoning').isVisible(),false);
    }
    assert.match(await page.locator('#masteryCount').innerText(),/6 of 6 skills demonstrated independently/);
    assert.match(await page.locator('#masteryCount').innerText(),/7 of 12 challenges/);
    await page.locator('#focusView').click();await shot('studio-picnic-evidence');await audit('alternate task evidence');
    await station('measure');await shot('studio-measurement-transfer');
    const extendedDownload=page.waitForEvent('download');await page.locator('#export').click();const extended=await extendedDownload;await extended.saveAs(path.join(out,'kitchen-enhanced-evidence.json'));
    const extendedReport=JSON.parse(fs.readFileSync(path.join(out,'kitchen-enhanced-evidence.json'),'utf8'));
    assert.equal(extendedReport.bestDemonstrations.length,7);assert.equal(extendedReport.attempts.filter(a=>a.scenario!=='standard').length,6);assert.ok(extendedReport.attempts.some(a=>a.plan.includes('shared-board')));
    const readableDownload=page.waitForEvent('download');await page.locator('#exportReadable').click();const readable=await readableDownload;await readable.saveAs(path.join(out,readable.suggestedFilename()));
    const readableText=fs.readFileSync(path.join(out,readable.suggestedFilename()),'utf8');assert.ok(readableText.includes('After a hot picnic')&&readableText.includes('Plan:')&&readableText.includes('SKILL PASSPORT'));
    await page.reload();await page.locator('#missionTitle').waitFor();assert.equal(await page.locator('#scenario').inputValue(),'four');assert.match(await page.locator('#sceneDescription').innerText(),/300 mL/);assert.match(await page.locator('#masteryCount').innerText(),/7 of 12 challenges/);
    // The best evidence survives trimming the recent-history list.
    await page.evaluate(()=>{const key='alloflow-kitchen-studio-v1',saved=JSON.parse(localStorage.getItem(key));saved.attempts=Array.from({length:60},()=>saved.attempts.find(s=>s.id==='heat'));localStorage.setItem(key,JSON.stringify(saved));});
    await page.reload();await page.locator('#missionTitle').waitFor();assert.match(await page.locator('#masteryCount').innerText(),/7 of 12 challenges/);
    await page.setViewportSize({width:320,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('studio-challenge-mobile');await page.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});await audit('320px alternate task');
    results.checks.push('All six alternate tasks, prospective plans, independent passport, readable export, and retained best evidence verified.');
    // A prior-version attempt has no scenario field: replay it as the foundation task.
    const legacy=await browser.newPage();await legacy.addInitScript(()=>{localStorage.setItem('alloflow-kitchen-studio-v1',JSON.stringify({version:1,current:'measure',drafts:{measure:{id:'measure',mode:'demonstrate',log:[{action:'add150'},{action:'add150'},{action:'add150'},{action:'check'}],answer:2,submitted:true,reflection:'Earlier learner work'}},attempts:[]}));});
    await legacy.goto(url);await legacy.locator('#missionTitle').waitFor();assert.equal(await legacy.locator('#scenario').inputValue(),'standard');assert.match(await legacy.locator('#result').innerText(),/Completed independently/);assert.match(await legacy.locator('#result').innerText(),/Earlier learner work/);await legacy.close();
    results.checks.push('Saved attempts without scenario fields migrate without losing completion or reflection.');


    // Fresh rehearsal work is separate from station drafts; retries remain in evidence.
    const dinner=await browser.newPage({viewport:{width:1360,height:1000}});dinner.on('pageerror',e=>results.errors.push(e.message));await dinner.goto(url);
    const move=async a=>dinner.locator('[data-action="'+a+'"]').click();
    const explain=async n=>{await dinner.locator('input[name=reason][value="'+n+'"]').check();await dinner.locator('#submit').click();};
    const menu=[['prep',['wash','board','prepare'],1],['knife',['secure','claw','dice'],2],['measure',['add150','add150','check'],2],['heat',['dry','spread','medium','advance','advance','advance','plate'],0],['probe',['thick','cook','cook','cook','read','serve'],1],['chill',['shallow','label','chill'],0]];
    await move('wash');await dinner.locator('#serviceCard>summary').click();await dinner.locator('#serviceStart').click();
    assert.match(await dinner.locator('#sceneDescription').innerText(),/need washing/);assert.equal(await dinner.locator('#mode').isDisabled(),true);
    await move('wash');await dinner.locator('#servicePause').click();assert.match(await dinner.locator('#sceneDescription').innerText(),/washed with soap/);
    await dinner.locator('#serviceResume').click();await dinner.reload();await dinner.locator('#missionTitle').waitFor();
    assert.match(await dinner.locator('#stationNumber').innerText(),/DINNER FOR FOUR/);assert.match(await dinner.locator('#sceneDescription').innerText(),/washed with soap/);
    await move('board');await move('prepare');await explain(0);assert.equal(await dinner.locator('#serviceNext').count(),0);await dinner.locator('#serviceRetry').click();
    for(const [id,actions,answer] of menu){assert.match(await dinner.locator('#stationNumber').innerText(),/CHECKPOINT/);for(const a of actions)await move(a);await explain(answer);await dinner.locator('#serviceNext').click();}
    assert.match(await dinner.locator('#result').innerText(),/Rehearsal completed with support/);
    assert.match(await dinner.locator('#serviceSummary').innerText(),/completed with support/);
    await dinner.screenshot({path:path.join(out,'studio-rehearsal-completed.png'),fullPage:true});results.screenshots.push('studio-rehearsal-completed.png');
    await dinner.locator('#reviewToggle').click();assert.equal(await dinner.locator('.rehearsal-record').count(),1);await dinner.locator('.rehearsal-record>details>summary').click();await dinner.locator('.rehearsal-record>details>details>summary').first().click();await dinner.locator('.rehearsal-record ol li').first().waitFor();assert.equal(await dinner.locator('.rehearsal-record ol li').count(),3);
    const mealDownload=dinner.waitForEvent('download');await dinner.locator('#export').click();const mealFile=await mealDownload;await mealFile.saveAs(path.join(out,'kitchen-rehearsal-evidence.json'));
    const meal=JSON.parse(fs.readFileSync(path.join(out,'kitchen-rehearsal-evidence.json'),'utf8'));
    assert.equal(meal.rehearsals[0].entries.length,7);assert.equal(meal.rehearsals[0].entries[0].evidence.reasoningCorrect,false);assert.equal(meal.attempts[0].actionCount,1);
    await dinner.reload();assert.match(await dinner.locator('#result').innerText(),/Rehearsal completed with support/);
    await dinner.locator('#serviceStart').click();await dinner.locator('#focusView').click();
    await dinner.screenshot({path:path.join(out,'studio-rehearsal-desktop.png'),fullPage:true});results.screenshots.push('studio-rehearsal-desktop.png');
    for(const [id,actions,answer] of menu){for(const a of actions)await move(a);await explain(answer);await dinner.locator('#serviceNext').click();}
    assert.match(await dinner.locator('#serviceSummary').innerText(),/completed independently/);
    const mealTextDownload=dinner.waitForEvent('download');await dinner.locator('#exportReadable').click();const mealText=await mealTextDownload;await mealText.saveAs(path.join(out,'kitchen-rehearsal-report.txt'));
    const mealTextContent=fs.readFileSync(path.join(out,'kitchen-rehearsal-report.txt'),'utf8');assert.ok(mealTextContent.includes('Rehearsal completed with support')&&mealTextContent.includes('Rehearsal completed independently')&&mealTextContent.includes('Checkpoint 6'));
    await dinner.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const mealAudit=async label=>{const issues=await dinner.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));results.accessibility.push({label,issues});assert.deepEqual(issues,[],label);};
    await mealAudit('completed meal rehearsal');
    await dinner.setViewportSize({width:320,height:844});await dinner.locator('#serviceStart').click();await dinner.locator('#viewToggle').click();assert.ok(await dinner.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mealAudit('320px active rehearsal');
    await dinner.screenshot({path:path.join(out,'studio-rehearsal-mobile.png'),fullPage:true});results.screenshots.push('studio-rehearsal-mobile.png');
    await dinner.locator('#servicePause').click();await dinner.locator('#nextPractice').click();assert.equal(await dinner.locator('#scenario').inputValue(),'standard');assert.equal(await dinner.locator('[data-station=measure]').getAttribute('aria-pressed'),'true');
    await dinner.close();results.checks.push('Two complete meal rehearsals verify fresh checkpoints, wrong-reasoning retry, support retention, independent completion, pause/resume, reload, exports, next practice, and mobile accessibility.');

    const coached=await browser.newPage();await coached.goto(url);await coached.locator('#serviceCard>summary').click();await coached.locator('#serviceMode').selectOption('practice');await coached.locator('#serviceStart').click();await coached.reload();assert.equal(await coached.locator('#serviceMode').inputValue(),'practice');assert.equal(await coached.locator('#mode').inputValue(),'practice');
    for(const a of ['wash','board','prepare'])await coached.locator('[data-action="'+a+'"]').click();await coached.locator('input[name=reason][value="1"]').check();await coached.locator('#submit').click();await coached.locator('#serviceNext').click();assert.equal(await coached.locator('#progressCount').innerText(),'1 of 6 stations');assert.match(await coached.locator('#masteryCount').innerText(),/0 of 6 skills/);await coached.close();results.checks.push('Coached rehearsal restores its mode and counts recorded checkpoints without awarding independent skill credit.');

    // Read-only replay, contextual navigation, and observations beside the actions.
    const replay=await browser.newPage({viewport:{width:1360,height:1000}});replay.on('pageerror',e=>results.errors.push(e.message));await replay.goto(url);
    await replay.locator('#goTask').click();assert.equal(await replay.evaluate(()=>document.activeElement.id),'actions');
    for(const a of ['prepare','wash','board','prepare'])await replay.locator('[data-action="'+a+'"]').click();
    assert.equal(await replay.locator('#goTask').innerText(),'Explain decision');await replay.locator('#goTask').click();assert.equal(await replay.evaluate(()=>document.activeElement.id),'question');
    await replay.locator('input[name=reason][value="1"]').check();await replay.locator('#submit').click();assert.equal(await replay.locator('#goTask').innerText(),'Review result');
    const savedReplay=await replay.evaluate(()=>localStorage.getItem('alloflow-kitchen-studio-v1'));
    await replay.locator('#replayPanel>summary').click();await replay.locator('#replayBanner').waitFor();assert.match(await replay.locator('#sceneDescription').innerText(),/Replay:.*need washing/);
    assert.equal(await replay.locator('#replayPrevious').isDisabled(),true);await replay.locator('#replayNext').click();assert.match(await replay.locator('#replayAction').innerText(),/Correction needed/);
    await replay.locator('#replayStep').focus();await replay.keyboard.press('ArrowRight');assert.match(await replay.locator('#sceneDescription').innerText(),/washed with soap/);
    await replay.locator('#replayKitchen').click();assert.equal(await replay.evaluate(()=>document.activeElement.id),'kitchenHeading');assert.equal(await replay.locator('#replayBanner').isVisible(),true);
    await replay.locator('#replaySceneNext').click();assert.match(await replay.locator('#sceneDescription').innerText(),/clean and ready/);await replay.locator('#replayScenePrevious').click();assert.match(await replay.locator('#sceneDescription').innerText(),/not yet ready/);await replay.screenshot({path:path.join(out,'studio-action-replay.png'),fullPage:true});results.screenshots.push('studio-action-replay.png');
    assert.equal(await replay.evaluate(()=>localStorage.getItem('alloflow-kitchen-studio-v1')),savedReplay);
    await replay.locator('#returnLatest').click();assert.equal(await replay.locator('#replayBanner').isVisible(),false);assert.match(await replay.locator('#sceneDescription').innerText(),/clean and ready/);
    assert.equal(await replay.locator('#workObservation').innerText(),await replay.locator('#sceneDescription').innerText());
    await replay.locator('#goTask').click();assert.equal(await replay.evaluate(()=>document.activeElement.id),'result');await replay.locator('.skip').focus();await replay.keyboard.press('Enter');assert.equal(await replay.evaluate(()=>document.activeElement.id),'result');
    await replay.setViewportSize({width:320,height:844});await replay.locator('#replayPanel>summary').click();await replay.locator('#replayBanner').waitFor();await replay.locator('#viewToggle').click();await replay.locator('#replayNext').click();await replay.locator('#replayNext').click();assert.match(await replay.locator('#replayWorkspace').innerText(),/washed with soap/);
    assert.ok(await replay.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await replay.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});
    const replayAudit=async label=>{const issues=await replay.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));results.accessibility.push({label,issues});assert.deepEqual(issues,[],label);};
    await replayAudit('320px keyboard replay');await replay.screenshot({path:path.join(out,'studio-replay-mobile.png'),fullPage:true});results.screenshots.push('studio-replay-mobile.png');
    await replay.locator('#replayClose').click();await replay.locator('#retry').click();await replay.locator('#goTask').click();
    const position=await replay.locator('#actions').boundingBox(),bar=await replay.locator('.taskbar').boundingBox();assert.ok(position.y>=bar.y+bar.height,'Task heading is not obscured by sticky controls');
    await replay.screenshot({path:path.join(out,'studio-task-focus-mobile.png'),fullPage:true});results.screenshots.push('studio-task-focus-mobile.png');
    await replay.setViewportSize({width:1360,height:1000});await replay.locator('#serviceCard>summary').click();await replay.locator('#serviceStart').click();for(const a of ['wash','board','prepare'])await replay.locator('[data-action="'+a+'"]').click();await replay.locator('input[name=reason][value="1"]').check();await replay.locator('#submit').click();await replay.locator('#replayPanel>summary').click();await replay.locator('#replayBanner').waitFor();await replay.locator('#replayStep').focus();await replay.keyboard.press('Home');
    await replay.locator('#serviceNext').click();assert.equal(await replay.locator('#replayPanel').isVisible(),false);assert.equal(await replay.locator('#replayBanner').isVisible(),false);assert.match(await replay.locator('#stationNumber').innerText(),/CHECKPOINT 2/);await replay.locator('#goPlan').click();assert.equal(await replay.locator('#serviceCard').getAttribute('open'),'');
    await replayAudit('desktop contextual task controls');await replay.close();results.checks.push('Replay reconstructs actions in 3D and text, preserves stored evidence, supports keyboard stepping, resets at checkpoint transitions, and works with contextual task shortcuts at 320px.');

    // Context-aware practice and explicit, durable support in Demonstrate mode.
    const coach=await browser.newPage({viewport:{width:1360,height:1000}});coach.on('pageerror',e=>results.errors.push(e.message));await coach.goto(url);
    assert.match(await coach.locator('#coachNext').innerText(),/Wash hands/);await coach.locator('[data-action=wash]').click();assert.match(await coach.locator('#coachNext').innerText(),/clean board/);
    await coach.locator('[data-station=measure]').click();await coach.locator('#mode').selectOption('demonstrate');assert.equal(await coach.locator('#hintText').isVisible(),false);
    await coach.locator('#hint').click();assert.equal(await coach.locator('#coachNext').isVisible(),false);assert.ok(!(await coach.locator('#hintText').innerText()).includes('450'));
    await coach.locator('#hintMore').click();assert.match(await coach.locator('#coachWhy').innerText(),/450 mL/);assert.equal(await coach.evaluate(()=>document.activeElement.id),'coachHeading');
    await coach.locator('#hint').click();await coach.locator('#hint').click();await coach.locator('#hintMore').click();
    let coachingSaved=await coach.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-studio-v1')));assert.equal(coachingSaved.drafts.measure.hints,2);assert.equal(coachingSaved.drafts.measure.hintLog.length,2);
    await coach.screenshot({path:path.join(out,'studio-specific-coaching.png'),fullPage:true});results.screenshots.push('studio-specific-coaching.png');
    await coach.locator('[data-action=add150]').click();assert.equal(await coach.locator('#hintText').isVisible(),false);await coach.locator('#hint').click();
    await coach.reload();assert.equal(await coach.locator('#hintText').isVisible(),false);await coach.locator('#hint').click();coachingSaved=await coach.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-studio-v1')));assert.equal(coachingSaved.drafts.measure.hints,3);
    for(const a of ['add150','add150','check'])await coach.locator('[data-action="'+a+'"]').click();await coach.locator('input[name=reason][value="2"]').check();await coach.locator('#submit').click();assert.match(await coach.locator('#result').innerText(),/Completed with support/);
    await coach.locator('.hint-review>summary').click();assert.equal(await coach.locator('.hint-review li').count(),3);
    const coachingDownload=coach.waitForEvent('download');await coach.locator('#export').click();const coachingFile=await coachingDownload;await coachingFile.saveAs(path.join(out,'kitchen-coaching-evidence.json'));const coachingReport=JSON.parse(fs.readFileSync(path.join(out,'kitchen-coaching-evidence.json'),'utf8'));assert.equal(coachingReport.attempts.find(a=>a.mission==='measure').hintLog.length,3);
    const coachingTextDownload=coach.waitForEvent('download');await coach.locator('#exportReadable').click();const coachingTextFile=await coachingTextDownload;await coachingTextFile.saveAs(path.join(out,'kitchen-coaching-report.txt'));assert.ok(fs.readFileSync(path.join(out,'kitchen-coaching-report.txt'),'utf8').includes('Coaching after 1 actions (level 1)'));
    // A hint-only attempt must remain in the archive after retry.
    await coach.locator('[data-station=knife]').click();await coach.locator('#mode').selectOption('demonstrate');await coach.locator('#hint').click();await coach.locator('#retry').click();coachingSaved=await coach.evaluate(()=>JSON.parse(localStorage.getItem('alloflow-kitchen-studio-v1')));assert.ok(coachingSaved.attempts.some(a=>a.id==='knife'&&a.log.length===0&&a.hints===1));
    await coach.locator('[data-station=heat]').click();for(const a of ['dry','spread','high','advance','advance','advance'])await coach.locator('[data-action="'+a+'"]').click();assert.equal(await coach.locator('#coachRetry').isVisible(),true);assert.match(await coach.locator('#coachWhy').innerText(),/already burned/);await coach.locator('#coachRetry').click();assert.match(await coach.locator('#sceneDescription').innerText(),/pale/);
    await coach.addScriptTag({path:path.join(root,'node_modules/axe-core/axe.min.js')});const coachingAudit=async label=>{const issues=await coach.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','best-practice']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));results.accessibility.push({label,issues});assert.deepEqual(issues,[],label);};await coachingAudit('desktop adaptive coaching');
    await coach.setViewportSize({width:320,height:844});await coach.locator('[data-station=probe]').click();await coach.locator('#mode').selectOption('demonstrate');await coach.locator('#hint').click();await coach.locator('#hintMore').click();assert.ok(await coach.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await coachingAudit('320px two-level hints');await coach.screenshot({path:path.join(out,'studio-coaching-mobile.png'),fullPage:true});results.screenshots.push('studio-coaching-mobile.png');await coach.close();
    results.checks.push('Adaptive coaching follows actual state; two-level hints retain context through reload and export, avoid duplicate counts, archive hint-only attempts, and offer recovery after burning.');

    // Render the real host plugin, then enter the studio through its navigation.
    const host = await browser.newPage({viewport:{width:1280,height:900}}); host.on('pageerror', e=>results.errors.push(e.message)); await host.goto(url);
    await host.setContent('<!doctype html><html lang="en"><head><title>Kitchen Lab integration</title></head><body style="margin:0;font-family:system-ui"><main id="root"></main></body></html>');
    await host.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react/umd/react.development.js')}); await host.addScriptTag({path:path.join(root,'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js')}); await host.addScriptTag({path:path.join(root,'stem_lab/stem_tool_kitchenlab.js')});
    await host.evaluate((origin)=>{const base=document.createElement('base');base.href=origin+'/';document.head.append(base);function App(){const [data,setData]=React.useState({});return StemLab._registry.kitchenLab.render({React,toolData:data,setToolData:setData,t:(_,f)=>f,awardXP:()=>{},setStemLabTool:()=>{}});}ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));}, new URL(url).origin);
    await host.getByRole('heading',{name:'Build confidence, one kitchen skill at a time.'}).waitFor(); await host.screenshot({path:path.join(out,'kitchen-start.png'),fullPage:true});
    await host.getByRole('tab',{name:'3D Skills Studio'}).click(); await host.frameLocator('iframe').getByRole('heading',{name:'The practice kitchen'}).waitFor(); await host.frameLocator('iframe').locator('[data-action="wash"]').click(); await host.close();
    results.checks.push('Real Kitchen Lab plugin landing page and embedded studio load and respond.');
    assert.deepEqual(results.errors, []); results.pass = true;
  } finally { fs.writeFileSync(path.join(out,'qa-results.json'),JSON.stringify(results,null,2)); await browser.close(); await new Promise(resolve=>server.close(resolve)); }
  console.log(JSON.stringify(results,null,2));
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
