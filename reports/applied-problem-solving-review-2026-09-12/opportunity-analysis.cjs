const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
const base = pathToFileURL(path.join(__dirname, 'current-preview.html')).href;
async function main() {
  const browser = await chromium.launch({ headless: true });
  const result = { purpose: 'Read-only UI and completion-rule analysis of pass 7; authored fixture, mocked AI and search.', states: [], errors: [] };
  try {
    for (const [width, query] of [[1280, ''], [390, ''], [320, ''], [390, 'compact'], [1280, 'setup'], [390, 'setup']]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      page.on('pageerror', e => result.errors.push(e.message));
      await page.goto(base + '?' + query);
      await page.locator('#root').locator('textarea').first().waitFor();
      const inspect = async label => {
        await page.evaluate(() => window.scrollTo(0, 0));
        const state = await page.evaluate(() => {
          const visible = e => {
            if (!(e.offsetWidth || e.offsetHeight || e.getClientRects().length) || e.closest('[hidden]')) return false;
            for (let parent = e.parentElement; parent; parent = parent.parentElement) {
              if (parent.tagName === 'DETAILS' && !parent.open && !parent.querySelector(':scope > summary')?.contains(e)) return false;
            }
            return true;
          };
          const all = selector => [...document.querySelectorAll(selector)].filter(visible);
          const first = all('textarea')[0];
          return {
            pageHeight: document.documentElement.scrollHeight,
            width: document.documentElement.scrollWidth,
            firstTextareaTop: first ? Math.round(first.getBoundingClientRect().top) : null,
            firstTextareaId: first?.id || '',
            visibleTextareas: all('textarea').map(e => ({ id: e.id, label: e.getAttribute('aria-label') || e.labels?.[0]?.innerText || '' })),
            visibleSelects: all('select').map(e => ({ label: e.getAttribute('aria-label') || e.labels?.[0]?.innerText || '', value: e.value })),
            disclosures: all('summary').map(e => e.innerText),
            buttons: all('button').map(e => e.innerText || e.getAttribute('aria-label')),
            text: document.querySelector('#root').innerText
          };
        });
        result.states.push({ label, viewport: width, query, ...state });
      };
      await inspect(query === 'setup' ? 'Teacher setup' : 'Understand');
      if (width === 390 && !query) {
        await page.screenshot({ path: path.join(__dirname, 'analysis-understand-390.png'), fullPage: true });
        for (const [name, label] of [['2. Explore', 'Explore'], ['3. Build', 'Build'], ['4. Check', 'Check'], ['5. Reflect', 'Reflect']]) {
          await page.getByRole('button', { name, exact: true }).click();
          await inspect(label);
          if (['Explore', 'Check'].includes(label)) await page.screenshot({ path: path.join(__dirname, 'analysis-' + label.toLowerCase() + '-390.png'), fullPage: true });
        }
        result.singleResponseCoverage = await page.evaluate(() => {
          const AC = window.AlloModules.AppliedChallenge;
          const data = AC.normalize({ ...window.reviewResource.data, workspace: {
            workingQuestion: 'Which watering approach should the garden try?', questionAccepted: true,
            response: 'I recommend comparing slow watering and faster watering. The lesson connects infiltration and runoff: if water arrives faster than it soaks in, more may run off. Slow watering takes more time. No local trial has happened; this remains an assumption about our soil. Keep the comparison as the next step because local conditions are unknown. The same idea could help choose drainage approaches for a sports field.'
          } });
          return { response: data.workspace.response, review: AC._testing.appliedChallengeReviewItems(data), followups: AC._testing.appliedChallengeReviewFollowups(data) };
        });
        result.calls = await page.evaluate(() => ({ ai: window.reviewAiPrompts.length, search: window.reviewSearchQueries.length }));
      }
      if (width === 390 && query === 'setup') await page.screenshot({ path: path.join(__dirname, 'analysis-setup-390.png'), fullPage: true });
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname, 'opportunity-analysis.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ states: result.states.map(({ label, viewport, query, pageHeight, firstTextareaTop, visibleTextareas, visibleSelects, disclosures }) => ({ label, viewport, query, pageHeight, firstTextareaTop, textareas: visibleTextareas.length, selects: visibleSelects.length, disclosures: disclosures.length })), singleResponseCoverage: result.singleResponseCoverage, errors: result.errors, calls: result.calls }, null, 2));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
