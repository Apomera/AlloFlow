const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, 'preview.html')).href);
    await page.getByRole('button', { name: 'Close BehaviorLens', exact: true }).waitFor();
    await page.waitForTimeout(700);
    await page.addStyleTag({ content: '*,*::before,*::after { animation: none !important; transition: none !important; }' });
    async function capture(state) {
      const metrics = await page.evaluate(() => {
        const visible = e => e.getClientRects().length > 0;
        const bounds = e => { const r = e.getBoundingClientRect(); return { text: e.textContent.trim(), y: Math.round(r.y), height: Math.round(r.height) }; };
        const scrolls = [...document.querySelectorAll('*')].filter(e => e.scrollHeight > e.clientHeight + 100 && /auto|scroll/.test(getComputedStyle(e).overflowY));
        return { headings: [...document.querySelectorAll('h2,h3')].filter(visible).map(bounds), tools: document.querySelectorAll('article[aria-labelledby^="bl-tool-"]').length, buttons: [...document.querySelectorAll('button')].filter(visible).length, scrolls: scrolls.map(e => ({ height: e.clientHeight, content: e.scrollHeight })), text: document.body.innerText };
      });
      await page.screenshot({ path: path.join(__dirname, `${state}-${width}.png`) });
      results.push({ width, state, errors: [...errors], ...metrics });
    }
    await capture('initial');
    try {
      await page.getByRole('button', { name: 'Dismiss Welcome', exact: true }).click({ timeout: 1500 });
      results.push({ width, state: 'welcome-dismiss', pointerWorks: true });
    } catch (error) {
      results.push({ width, state: 'welcome-dismiss', pointerWorks: false, error: error.message });
      await page.getByRole('button', { name: 'Dismiss Welcome', exact: true }).focus();
      await page.keyboard.press('Enter');
    }
    await capture('returning');
    await page.getByRole('button', { name: '2. Define the behavior clearly', exact: true }).click();
    await capture('definition');
    const fields = await page.locator('textarea').evaluateAll(es => es.map(e => ({ label: e.getAttribute('aria-label'), placeholder: e.placeholder })));
    results.push({ width, state: 'definition-fields', fields });
    await page.getByRole('textbox', { name: 'Describe the behavior in everyday language', exact: true }).fill('Leaves chair during independent writing');
    await page.getByRole('button', { name: 'Back to BehaviorLens tools', exact: true }).click();
    await page.getByRole('button', { name: '2. Define the behavior clearly', exact: true }).click();
    results.push({ width, state: 'definition-draft-return', draftText: await page.getByRole('textbox', { name: 'Describe the behavior in everyday language', exact: true }).inputValue() });
    await page.getByRole('button', { name: 'Back to BehaviorLens tools', exact: true }).click();
    await page.getByRole('button', { name: 'Family Mode', exact: true }).click();
    await capture('family');
    await page.close();
  }
  await browser.close();
  fs.writeFileSync(path.join(__dirname, 'flow-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results.map(({ text, headings, ...r }) => ({ ...r, headings: headings?.slice(0, 7) })), null, 2));
})().catch(error => { console.error(error); process.exit(1); });

