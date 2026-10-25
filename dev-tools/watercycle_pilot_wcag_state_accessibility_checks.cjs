'use strict';
module.exports = async function ({page, result, settle, warm, audit, capture, source, assert}) {
  const verify = process.argv.includes('--verify'), r = result.stateAccessibility = {checks: [], semantics: [], practices: []};
  const check = (name, ok, evidence) => {r.checks.push({name, ok, evidence}); console.log('CHECK ' + name + ' ' + ok); if (verify) assert(ok, name);};
  const client = await page.context().newCDPSession(page);
  async function ax(selector) {
    const document = await client.send('DOM.getDocument'), {nodeId} = await client.send('DOM.querySelector', {nodeId: document.root.nodeId, selector});
    assert(nodeId, 'AX target exists: ' + selector);
    return (await client.send('Accessibility.getPartialAXTree', {nodeId, fetchRelatives: true})).nodes;
  }
  async function sample(label) {
    const dom = await page.evaluate(label => {
      const canvas = document.querySelector('#wcPilotCanvas'), badge = document.querySelector('.wc-pilot-buoy'), description = document.querySelector('#wcPilotSceneDescription');
      return {label, snapshot: waterReviewData.pilot.snapshot, paused: waterReviewData.pilot.paused, badge: {text: badge?.textContent.trim(), state: badge?.dataset.state, display: badge ? getComputedStyle(badge).display : null}, description: description?.textContent, lastChange: waterReviewData.pilot.lastChange, canvasName: canvas.getAttribute('aria-label')};
    }, label);
    dom.ax = await ax('#wcPilotCanvas');
    return dom;
  }
  await page.locator('.wc-pilot-hud-toggle').click(); await settle();
  for (const selector of ['.wc-pilot-sky-cooling-equation', '.wc-pilot-notebook-trail']) {
    await page.locator(selector).evaluate(e => {for (let p = e.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;});
    await settle();
    const dom = await page.locator(selector).evaluate(e => ({role: e.getAttribute('role'), label: e.getAttribute('aria-label'), labelledby: e.getAttribute('aria-labelledby'), expectedName: e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' '), text: e.textContent.trim()}));
    const nodes = await ax(selector), target = nodes.find(n => n.backendDOMNodeId && !n.ignored);
    r.semantics.push({selector, dom, nodes});
    check(selector + ' has a meaningful named accessibility role', !!target && !['generic', 'none', 'presentation'].includes(target.role?.value) && target.name?.value === dom.expectedName, {role: target?.role?.value, name: target?.name?.value, expectedName: dom.expectedName});
  }
  await audit('expanded-named-content');
  check('Equation and notebook trail have no prohibited-name audit findings', result.audits.at(-1).violations.concat(result.audits.at(-1).incomplete).filter(v => v.id === 'aria-prohibited-attr').every(v => v.nodes.every(n => !n.target.some(t => /sky-cooling-equation|notebook-trail/.test(t)))));
  r.surface = await sample('surface-liquid');
  check('Surface liquid HUD does not claim airborne buoyant ascent', !/rising on your own|needs lift/i.test(r.surface.badge.text || ''), r.surface.badge);
  for (const [practice, form] of [['cloud', 'vapor'], ['rain', 'rain'], ['soil', 'soil'], ['plant', 'plant'], ['snow', 'snow']]) {
    await page.locator('#wcPilotPractice').evaluate(e => {for (let p = e.parentElement; p; p = p.parentElement) if (p.tagName === 'DETAILS') p.open = true;});
    await page.locator('#wcPilotPractice').selectOption(practice); await page.locator('#wcPilotPracticeStart').focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(({practice, form}) => waterReviewData.pilot.snapshot?.form === form && waterReviewData.pilot.snapshot?.practiceOrigin === practice, {practice, form}); await settle();
    const row = await sample(practice); r.practices.push(row);
    check(practice + ' starts paused through the supported keyboard practice control', row.paused && row.snapshot.form === form && row.snapshot.practiceOrigin === practice);
    if (form === 'rain' || form === 'snow') check(form + ' HUD and scene description both describe falling precipitation', /fall|precip/i.test(row.badge.text || '') && /fall|precip/i.test(row.description || '') && !/rising on your own|needs lift/i.test(row.badge.text || ''), row.badge);
    if (form === 'soil' || form === 'plant') check(form + ' HUD does not claim airborne lift', !/rising on your own|needs lift/i.test(row.badge.text || ''), row.badge);
    if (form === 'vapor' && Math.abs(row.snapshot.vy || 0) < .01) check('Stationary vapor HUD distinguishes buoyancy from actual ascent', !/rising on your own/i.test(row.badge.text || ''), row.badge);
    const sceneNode = row.ax.find(n => !n.ignored && n.role?.value === 'application');
    check(practice + ' current description is exposed by the browser accessibility tree', !!sceneNode?.description?.value && sceneNode.description.value.includes(row.description), {description: sceneNode?.description?.value});
  }
  const fixture = require('./watercycle_pilot_rain_landing_motion_checks.cjs').fixture(source); r.fixtureScope = fixture.scope;
  await page.evaluate(checkpoint => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true, hudCompact: false, pauseAtChanges: true, navigationAssist: false, resumeCheckpoint: checkpoint, resumeToken: 'wcag-state-rain'}}, 'light'), fixture.checkpoint);
  await page.waitForFunction(() => waterReviewData.pilot.snapshot?.form === 'rain'); await settle(); r.genuineRain = await sample('genuine-rain'); await capture('rain-hud');
  await page.locator('[data-control=pause]').click(); await page.waitForFunction(() => waterReviewData.pilot.paused && waterReviewData.pilot.lastChange?.from === 'rain' && waterReviewData.pilot.lastChange?.to === 'liquid', null, {timeout: 90000}); await settle();
  r.collection = await sample('genuine-collection');
  check('Actual rain collection updates HUD and accessible state to surface water', r.collection.snapshot.form === 'liquid' && !/rising on your own|needs lift|falling/i.test(r.collection.badge.text || '') && /surface/i.test(r.collection.description || ''), r.collection.badge);
  r.populatedTrail = await ax('.wc-pilot-notebook-trail');
  check('Named notebook evidence container keeps its ordered list exposed', r.populatedTrail.some(n => !n.ignored && n.role?.value === 'list'));
  r.reviewButtonNames = await page.locator('.wc-pilot-notebook-trail .wc-pilot-review-btn').evaluateAll(buttons => buttons.map(e => ({text: e.textContent.trim(), name: e.getAttribute('aria-label')})));
  check('Notebook review buttons include their visible words in accessible names', r.reviewButtonNames.length > 0 && r.reviewButtonNames.every(e => e.name && e.name.toLowerCase().includes(e.text.toLowerCase())), r.reviewButtonNames);
  await capture('collection-state');
  await page.evaluate(() => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true, hudCompact: false, showLookControls: true}}, 'light'));
  await page.waitForFunction(() => document.querySelector('#wcPilotLookPanel') && waterReviewData.pilot.snapshot); await settle();
  r.zoomFeedback = [];
  async function zoomAction(name, expected, repeats = 1) {
    await page.evaluate(() => {window.pilotAnnouncement = null;});
    const button = page.getByRole('button', {name, exact: true}); await button.focus();
    for (let i = 0; i < repeats; i++) {await page.keyboard.press('Enter'); await settle();}
    const evidence = await page.evaluate(() => ({announcement: window.pilotAnnouncement, distance: Number(document.querySelector('#wcPilotCanvas').dataset.pilotZoom)}));
    r.zoomFeedback.push({name, expected, repeats, ...evidence});
    check(name + ' announces its deliberate result: ' + expected, evidence.announcement === expected, evidence);
  }
  await zoomAction('Zoom in', 'Zoomed in.'); await zoomAction('Zoom out', 'Zoomed out.'); await zoomAction('Reset zoom', 'Default zoom restored.');
  await zoomAction('Zoom in', 'Closest view reached.', 6); await zoomAction('Zoom out', 'Farthest view reached.', 18);
  await page.locator('#wcPilotLookPanel button').last().click(); await page.locator('#wcPilotCanvas').hover();
  await page.evaluate(() => {window.pilotAnnouncement = null;}); await page.mouse.wheel(0,-120); await settle();
  r.wheelAnnouncement = await page.evaluate(() => window.pilotAnnouncement);
  check('Continuous wheel zoom does not flood status announcements', r.wheelAnnouncement === null);
  await page.emulateMedia({forcedColors: 'active', reducedMotion: 'reduce'});
  await page.evaluate(() => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true, hudCompact: false, showLookControls: true}}, 'light'));
  await page.waitForFunction(() => document.querySelector('#wcPilotLookPanel') && waterReviewData.pilot.snapshot); await settle();
  await page.locator('#wcPilotLookPanel button').first().focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await settle();
  r.forcedColors = await page.evaluate(() => {
    const badge = document.querySelector('.wc-pilot-buoy'), active = document.activeElement, style = getComputedStyle(active), b = getComputedStyle(badge), hitRect = active.getBoundingClientRect();
    const audited = [...document.querySelectorAll('.wc-pilot-readouts dt,.wc-pilot-buoy,.wc-pilot-gauge span,.wc-pilot-gauge small,.wc-pilot-micro span,.wc-pilot-micro strong')].map(e=>{const s=getComputedStyle(e);return {text:e.textContent,color:s.color,textFillColor:s.webkitTextFillColor,background:s.backgroundColor,forcedColorAdjust:s.forcedColorAdjust};});
    return {audited, forcedColors: matchMedia('(forced-colors: active)').matches, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, badge: {text: badge.textContent, color: b.color, background: b.backgroundColor}, focus: {text: active.textContent, outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor, color: style.color, background: style.backgroundColor, hit: active.contains(document.elementFromPoint(hitRect.x + hitRect.width / 2, hitRect.y + hitRect.height / 2))}};
  });
  check('Forced colors keeps textual state and keyboard focus visible', r.forcedColors.forcedColors && r.forcedColors.reducedMotion && !!r.forcedColors.badge.text && r.forcedColors.focus.outlineStyle !== 'none' && parseFloat(r.forcedColors.focus.outlineWidth) > 0 && r.forcedColors.focus.hit, r.forcedColors);
  await audit('forced-colors-state-and-look'); await capture('forced-colors-look');
  await client.detach();
  r.scope = 'Actual browser AX roles, names and descriptions, supported keyboard practice starts, genuine original-kernel rain collection, and forced-colors/reduced-motion CSS behavior. No screen-reader speech testing or full WCAG conformance claim.';
};
