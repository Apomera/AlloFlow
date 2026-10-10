const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'preview.json'), 'utf8')).url;
async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const observations = {}, errors = [], unexpected = [];
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (route.request().url().startsWith(base + '/')) return route.continue();
    unexpected.push(route.request().url()); return route.abort();
  });
  const review = () => page.getByRole('dialog', { name: 'Review research sources', exact: true });
  const active = () => page.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent, label: document.activeElement.getAttribute('aria-label'), disabled: document.activeElement.disabled, inReview: !!document.activeElement.closest('[data-research-review]') }));
  try {
    await page.goto(base);
    await page.getByRole('button', { name: 'Research settings', exact: true }).click();
    const settings = page.getByRole('dialog', { name: 'Research settings', exact: true });
    await settings.getByRole('checkbox', { name: 'Review sources before writing' }).check();
    await settings.getByRole('button', { name: 'Apply settings', exact: true }).click();
    await page.getByRole('button', { name: 'Review sources', exact: true }).click();
    observations.initialFocus = await active();
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    observations.emptyReviewAxe = await page.evaluate(async () => (await axe.run('[role="dialog"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
    await review().getByText('Add a link or your own text', { exact: true }).click();
    observations.pasteVisibleWithLink = await review().getByRole('textbox', { name: 'Paste source text', exact: true }).isVisible();
    await review().getByRole('textbox', { name: 'Source URL (optional for pasted text)', exact: true }).fill('https://youtu.be/AbCdEfGhI_1?t=40');
    await review().getByRole('button', { name: 'Use linked start time', exact: true }).click();
    await review().getByRole('textbox', { name: 'End time', exact: true }).fill('0:30');
    observations.clipFields = await review().getByRole('textbox').evaluateAll(nodes => nodes.filter(node => node.closest('fieldset')).map(node => ({ placeholder: node.placeholder, invalid: node.getAttribute('aria-invalid'), describedBy: node.getAttribute('aria-describedby') })));
    observations.clipAxe = await page.evaluate(async () => (await axe.run('[role="dialog"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
    await review().getByRole('textbox', { name: 'End time', exact: true }).fill('1:20');
    await review().getByRole('button', { name: 'Read clip', exact: true }).click();
    const chooser = review().locator('[data-transcript-chooser]');
    await chooser.locator('summary').click();
    await chooser.getByRole('button', { name: 'Next excerpts', exact: true }).click();
    await chooser.getByRole('button', { name: 'Next excerpts', exact: true }).press('Enter');
    observations.paginationFocus = await active();
    observations.paginationStatuses = await chooser.getByRole('status').allTextContents();
    observations.populatedAxe = await page.evaluate(async () => (await axe.run('[role="dialog"]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } })).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })));
    await review().getByRole('button', { name: 'Generate from included passages', exact: true }).focus();
    await page.keyboard.press('Tab'); observations.wrapFocus = await active();
    await page.keyboard.press('Escape'); observations.escapeFocus = await active();
  } finally {
    const hash = crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../..', 'view_misc_panels_module.js'))).digest('hex');
    fs.writeFileSync(path.join(__dirname, 'browser-baseline.json'), JSON.stringify({ base, hash, observations, errors, unexpected }, null, 2) + '\n');
    await browser.close();
  }
  console.log(JSON.stringify({ observations, errors, unexpected }));
}
run().catch(error => { console.error(error); process.exitCode = 1; });
