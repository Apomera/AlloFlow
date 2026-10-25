'use strict';
module.exports = async function ({page, result, settle, capture, source, assert}) {
  const r = result.supplemental = {checks: [], narrow: []};
  const check = (name, ok, evidence) => {r.checks.push({name, ok, evidence}); console.log('CHECK ' + name + ' ' + ok); assert(ok, name);};
  const client = await page.context().newCDPSession(page);
  async function ax(selector) {
    const document = await client.send('DOM.getDocument'), {nodeId} = await client.send('DOM.querySelector', {nodeId: document.root.nodeId, selector});
    assert(nodeId); return (await client.send('Accessibility.getPartialAXTree', {nodeId, fetchRelatives: true})).nodes;
  }
  async function narrow(label) {
    await page.setViewportSize({width: 320, height: 900}); await settle();
    const row = await page.evaluate(label => {
      const e = document.querySelector('.wc-pilot-buoy'), stage = document.querySelector('.wc-pilot-stage'), r = e.getBoundingClientRect(), s = stage.getBoundingClientRect(), style = getComputedStyle(e);
      return {label, text: e.textContent, state: e.dataset.state, pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, stage: {x: s.x, width: s.width, client: stage.clientWidth, scroll: stage.scrollWidth}, badge: {x: r.x, width: r.width, height: r.height, client: e.clientWidth, scroll: e.scrollWidth, clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, whiteSpace: style.whiteSpace, overflow: style.overflow, display: style.display, fontSize: style.fontSize, lineHeight: style.lineHeight}};
    }, label);
    r.narrow.push(row);
    check(label + ' expanded HUD wraps without clipping at320CSS pixels', row.pageWidth <= 320 && row.stage.scroll <= row.stage.client && row.badge.scroll <= row.badge.client + 1 && row.badge.scrollHeight <= row.badge.clientHeight + 1 && row.badge.x >= row.stage.x && row.badge.x + row.badge.width <= row.stage.x + row.stage.width + 1 && row.badge.display !== 'none', row);
    await capture(label + '-320-expanded');
  }
  await page.evaluate(() => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true, hudCompact: false, pauseAtChanges: true, navigationAssist: false}}, 'light'));
  await page.waitForFunction(() => waterReviewData.pilot.snapshot?.form === 'liquid'); await settle(); await narrow('surface');
  await page.locator('#wcPilotPractice').evaluate(e => {for (let p = e.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;});
  await page.locator('#wcPilotPractice').selectOption('snow'); await page.locator('#wcPilotPracticeStart').focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => waterReviewData.pilot.snapshot?.form === 'snow' && waterReviewData.pilot.snapshot?.practiceOrigin === 'snow'); await settle(); await narrow('falling-snow');
  r.snowStart = await page.evaluate(() => ({snapshot: waterReviewData.pilot.snapshot, paused: waterReviewData.pilot.paused}));
  await page.setViewportSize({width: 1280, height: 1000}); await settle(); await page.locator('[data-control=pause]').click();
  await page.waitForFunction(() => waterReviewData.pilot.paused && waterReviewData.pilot.snapshot?.form === 'snowpack' && waterReviewData.pilot.lastChange?.from === 'snow', null, {timeout: 90000}); await settle();
  r.stored = await page.evaluate(() => ({snapshot: waterReviewData.pilot.snapshot, lastChange: waterReviewData.pilot.lastChange, badge: {text: document.querySelector('.wc-pilot-buoy').textContent, state: document.querySelector('.wc-pilot-buoy').dataset.state}, description: document.querySelector('#wcPilotSceneDescription').textContent}));
  r.storedAx = await ax('#wcPilotCanvas');
  check('Genuine snow practice lands and shows stored-snow HUD text', r.snowStart.snapshot.altitudeM === 80 && r.snowStart.paused && r.stored.snapshot.form === 'snowpack' && r.stored.snapshot.altitudeM === 0 && r.stored.lastChange.from === 'snow' && r.stored.lastChange.to === 'snowpack' && r.stored.badge.state === 'stored' && /stored/i.test(r.stored.badge.text) && !/rising|falling|needs lift/i.test(r.stored.badge.text), r.stored.badge);
  const scene = r.storedAx.find(n => !n.ignored && n.role?.value === 'application');
  check('Stored-snow description is available in the actual accessibility tree', /stored.*snow|snow.*stored/i.test(r.stored.description) && scene?.description?.value.includes(r.stored.description));
  r.review = await page.locator('.wc-pilot-notebook-trail .wc-pilot-review-btn').evaluateAll(buttons => buttons.map(e => ({text: e.textContent.trim(), name: e.getAttribute('aria-label')})));
  r.reviewAx = await ax('.wc-pilot-notebook-trail .wc-pilot-review-btn');
  check('Populated notebook review name includes its visible Review in scene label', r.review.length > 0 && r.review.every(e => e.name && e.name.toLowerCase().includes(e.text.toLowerCase())) && r.reviewAx.some(n => !n.ignored && n.role?.value === 'button' && n.name?.value === r.review[0].name), r.review);
  r.notebookAx = await ax('.wc-pilot-notebook-trail');
  check('Populated notebook remains a named group with heading and list', r.notebookAx.some(n => !n.ignored && n.role?.value === 'group' && n.name?.value === 'Recent transition evidence') && r.notebookAx.some(n => !n.ignored && n.role?.value === 'heading' && n.name?.value === 'Recent transition evidence') && r.notebookAx.some(n => !n.ignored && n.role?.value === 'list'));
  await capture('stored-snow-state'); await client.detach();
  r.scope = 'Supported keyboard snow practice starts paused at80m, then genuine production kernel and renderer run until snow lands and automatically pauses as stored snow. No model state, phase or receipt is forged. Actual Chromium accessibility tree and320CSS-pixel expanded HUD measurements; no screen-reader speech test.';
};
