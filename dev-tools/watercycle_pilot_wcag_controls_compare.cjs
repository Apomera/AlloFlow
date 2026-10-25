'use strict';
module.exports = async function ({page, result, settle, assert}) {
  const r = result.supplemental = {checks: [], comparison: []};
  const check = (name, ok) => {r.checks.push({name, ok}); assert(ok, name); console.log('CHECK ' + name + ' ' + ok);};
  const lum = values => values.map(x => {x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;}).reduce((sum, x, i) => sum + x * [.2126, .7152, .0722][i], 0);
  const contrast = (a, b) => (Math.max(lum(a), lum(b)) + .05) / (Math.min(lum(a), lum(b)) + .05);
  const inspect = async (button, theme, state) => {
    const row = await button.evaluate((e, context) => {
      const s = getComputedStyle(e), canvas = document.createElement('canvas'), c = canvas.getContext('2d');
      const rgba = color => {c.clearRect(0, 0, 1, 1); c.fillStyle = color; c.fillRect(0, 0, 1, 1); return Array.from(c.getImageData(0, 0, 1, 1).data);};
      return {...context, scenario: e.closest('[data-scenario]').dataset.scenario, text: e.textContent, hover: e.matches(':hover'), disabled: e.disabled, foreground: s.color, background: s.backgroundColor, backgroundImage: s.backgroundImage, foregroundRgba: rgba(s.color), backgroundRgba: rgba(s.backgroundColor), fontSize: s.fontSize};
    }, {theme, state});
    row.ratio = contrast(row.foregroundRgba.slice(0, 3), row.backgroundRgba.slice(0, 3));
    r.comparison.push(row);
  };
  for (const theme of ['light', 'dark']) {
    await page.evaluate(theme => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true}}, theme), theme);
    await page.waitForFunction(() => document.querySelector('.wc-pilot-compare-run') && waterReviewData.pilot.snapshot);
    const buttons = page.locator('.wc-pilot-compare-run:not(:disabled)');
    for (let i = 0; i < await buttons.count(); i++) {
      const b = buttons.nth(i);
      await b.scrollIntoViewIfNeeded(); await page.mouse.move(0, 0); await settle();
      await inspect(b, theme, 'normal');
      await b.hover(); await settle(); await inspect(b, theme, 'hover');
    }
  }
  check('Comparison run buttons have opaque resolvable backgrounds', r.comparison.length >= 8 && r.comparison.every(v => v.foregroundRgba[3] === 255 && v.backgroundRgba[3] === 255 && v.backgroundImage === 'none'));
  check('All enabled comparison run buttons meet4.5to1 in light and dark normal and hover states', r.comparison.every(v => v.ratio >= 4.5));
  check('Frozen Highlands is measured in both themes and states', r.comparison.filter(v => v.scenario === 'frozenHighlands').length === 4);
  await page.evaluate(() => mountWater({wcMode: 'pilot', pilot: {onboardingComplete: true, paused: true}}, 'light'));
  await page.waitForFunction(() => document.querySelector('#wcPilotCanvas') && waterReviewData.pilot.snapshot); await settle();
  r.descriptionDom = await page.locator('#wcPilotCanvas').evaluate(e => {
    const refs = (e.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean).map(id => {const node = document.getElementById(id), details = node?.closest('details'); if (details) details.open = false; return {id, text: node?.textContent.trim(), detailsClosed: details ? !details.open : null};});
    return {name: e.getAttribute('aria-label'), refs};
  });
  await settle();
  const client = await page.context().newCDPSession(page), document = await client.send('DOM.getDocument');
  const {nodeId} = await client.send('DOM.querySelector', {nodeId: document.root.nodeId, selector: '#wcPilotCanvas'});
  const ax = await client.send('Accessibility.getPartialAXTree', {nodeId, fetchRelatives: false});
  r.canvasAx = ax.nodes; await client.detach();
  const node = ax.nodes.find(n => !n.ignored);
  check('Browser accessibility tree exposes the stable scene name', node?.name?.value === r.descriptionDom.name);
  check('Browser accessibility description includes every referenced instruction and current state', !!node?.description?.value && r.descriptionDom.refs.length >= 2 && r.descriptionDom.refs.every(ref => node.description.value.replace(/\s+/g, ' ').includes(ref.text.replace(/\s+/g, ' '))));
  r.scope = 'Computed browser styles and Chromium accessibility tree, including descriptions referenced from collapsed details where present. This is not a screen-reader speech test.';
};
