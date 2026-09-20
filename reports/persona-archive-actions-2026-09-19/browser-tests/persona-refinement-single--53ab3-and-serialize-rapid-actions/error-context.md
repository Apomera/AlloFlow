# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: persona-refinement.spec.ts >> single saved session downloads recover and serialize rapid actions
- Location: tests\e2e\persona-refinement.spec.ts:285:7

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  getByRole('button', { name: 'Saved sessions', exact: true })
Expected: focused
Received: inactive
Timeout:  5000ms

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Saved sessions', exact: true })
    14 × locator resolved to <button type="button" title="Saved sessions" aria-label="Saved sessions" class="p-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-all motion-reduce:transition-none flex items-center gap-2">…</button>
       - unexpected value "inactive"

```

```yaml
- button "Saved sessions"
```

# Test source

```ts
  212 |   await load(page, 'chat', { props: { showPersonaHints: true }, state: { suggestions: [question] } });
  213 |   const hint = page.getByRole('button', { name: question.trim(), exact: true });
  214 |   expect(await hint.evaluate((el: HTMLElement) => el.getBoundingClientRect().width <= innerWidth)).toBe(true);
  215 | });
  216 | 
  217 | 
  218 | for (const mode of ['single', 'panel']) {
  219 |   for (const width of [375, 1100]) {
  220 |     test(mode + ' preserves reading position and returns to the latest reply at ' + width, async ({ page }, info) => {
  221 |       await page.setViewportSize({ width, height: 850 });
  222 |       const history = Array.from({ length: 16 }, (_, i) => ({ role: i % 2 ? 'model' : 'user', speakerName: i % 2 ? 'Ada Lovelace' : undefined, text: 'Conversation turn ' + i + '. ' + 'Compare the evidence and explain how it supports this perspective. '.repeat(3) }));
  223 |       const errors = await load(page, 'chat', { state: { mode, chatHistory: history } });
  224 |       const log = page.getByRole('log');
  225 |       await expect.poll(() => log.evaluate((node: HTMLElement) => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(3);
  226 |       await log.evaluate((node: HTMLElement) => { node.scrollTop = 30; node.dispatchEvent(new Event('scroll')); });
  227 |       const control = page.locator('[data-persona-latest-control]');
  228 |       await expect(control.getByRole('button', { name: 'Jump to latest', exact: true })).toBeVisible();
  229 |       await expect(control.getByRole('button')).toBeInViewport();
  230 |       await expect(page.locator('[data-persona-composer] textarea')).toBeInViewport();
  231 |       expect(await log.evaluate((node: HTMLElement) => node.clientHeight)).toBeGreaterThanOrEqual(180);
  232 |       if (mode === 'single' && width === 375) {
  233 |         const details = page.locator('[data-persona-character-details]');
  234 |         await expect(details).toHaveAttribute('aria-expanded', 'false');
  235 |         await details.click();
  236 |         await expect(details).toHaveAttribute('aria-expanded', 'true');
  237 |         await expect(page.locator('#persona-character-profile')).toBeInViewport();
  238 |         await expect(control.getByRole('button')).toBeInViewport();
  239 |         await details.click();
  240 |         await expect(page.locator('#persona-character-profile')).toBeHidden();
  241 |       }
  242 |       const before = await log.evaluate((node: HTMLElement) => node.scrollTop);
  243 |       const updated = [...history, { role: 'model', speakerName: 'Ada Lovelace', text: 'A new reply arrived while you were reading earlier messages.' }];
  244 |       await page.evaluate(history => (window as any).__update({ personaState: { chatHistory: history } }), updated);
  245 |       await expect(control).toContainText('New reply');
  246 |       expect(await log.evaluate((node: HTMLElement) => node.scrollTop)).toBe(before);
  247 |       await axe(page);
  248 |       await page.screenshot({ path: info.outputPath(mode + '-new-reply-' + width + '.png'), fullPage: true });
  249 |       await control.getByRole('button').click();
  250 |       await expect(log).toBeFocused();
  251 |       await expect(control).toHaveCount(0);
  252 |       await expect(log.getByText(updated.at(-1)!.text, { exact: false }).first()).toBeInViewport();
  253 |       await page.evaluate(history => (window as any).__update({ personaState: { chatHistory: history } }), [...updated, { role: 'model', speakerName: 'Ada Lovelace', text: 'The next reply follows normally.' }]);
  254 |       await expect.poll(() => log.evaluate((node: HTMLElement) => node.scrollHeight - node.scrollTop - node.clientHeight)).toBeLessThan(3);
  255 |       expect(errors).toEqual([]);
  256 |     });
  257 |   }
  258 |   test(mode + ' saved sessions restore focus and retry a failed load', async ({ page }, info) => {
  259 |     await page.setViewportSize({ width: 375, height: 850 });
  260 |     const errors = await load(page, 'chat', { state: { mode }, archiveFailures: 1 });
  261 |     const trigger = page.getByRole('button', { name: strings.persona.archive_button, exact: true });
  262 |     // Some browsers do not focus buttons on pointer activation.
  263 |     await page.getByRole('textbox').focus();
  264 |     await trigger.evaluate((node: HTMLElement) => node.click());
  265 |     const archive = page.locator('[data-persona-archive-dialog]');
  266 |     await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
  267 |     await expect(archive.getByRole('alert')).toContainText(strings.persona.archive_list_failed);
  268 |     await archive.getByRole('button', { name: 'Retry loading saved sessions', exact: true }).click();
  269 |     await expect(archive).toContainText(strings.persona.archive_empty);
  270 |     await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
  271 |     expect(await page.evaluate(() => (window as any).__calls.archiveLoads)).toBe(2);
  272 |     await axe(page);
  273 |     await page.screenshot({ path: info.outputPath(mode + '-saved-sessions.png'), fullPage: true });
  274 |     await page.keyboard.press('Escape');
  275 |     await expect(archive).toHaveCount(0);
  276 |     await expect(trigger).toBeFocused();
  277 |     await trigger.click();
  278 |     await archive.getByRole('button', { name: strings.common.close, exact: true }).click();
  279 |     await expect(trigger).toBeFocused();
  280 |     expect(errors).toEqual([]);
  281 |   });
  282 | }
  283 | 
  284 | for (const mode of ['single', 'panel']) {
  285 |   test(mode + ' saved session downloads recover and serialize rapid actions', async ({ page }, info) => {
  286 |     await page.setViewportSize({ width: 375, height: 850 });
  287 |     const rows = [
  288 |       { key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2, language: 'English' },
  289 |       { key: 'two', title: 'Grace Hopper: exploring compilers', messageCount: 4, audioClips: 0 }
  290 |     ];
  291 |     const errors = await load(page, 'chat', { state: { mode }, archiveRows: rows, archiveDownloadFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDownload: true });
  292 |     const trigger = page.getByRole('button', { name: strings.persona.archive_button, exact: true });
  293 |     await trigger.click();
  294 |     const archive = page.locator('[data-persona-archive-dialog]');
  295 |     const row = archive.getByRole('listitem').nth(0), otherRow = archive.getByRole('listitem').nth(1);
  296 |     const download = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) });
  297 |     await download.click();
  298 |     await expect(row.getByRole('alert')).toContainText('could not be downloaded');
  299 |     await expect(download).toBeEnabled();
  300 |     expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toEqual([{ key: 'one', format: 'html' }]);
  301 |     await download.evaluate((node: HTMLElement) => { node.click(); node.click(); });
  302 |     await expect(row.getByRole('status')).toHaveText('Preparing download…');
  303 |     await expect(row.getByRole('alert')).toHaveCount(0);
  304 |     for (const button of await archive.getByRole('listitem').getByRole('button').all()) await expect(button).toBeDisabled();
  305 |     await otherRow.getByRole('button').first().evaluate((node: HTMLElement) => node.click());
  306 |     expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toHaveLength(2);
  307 |     await expect(download).toHaveAttribute('aria-busy', 'true');
  308 |     await axe(page);
  309 |     await page.screenshot({ path: info.outputPath(mode + '-archive-download-pending.png'), fullPage: true });
  310 |     // Closing and reopening must preserve the pending lock and useful progress.
  311 |     await page.keyboard.press('Escape');
> 312 |     await expect(trigger).toBeFocused();
      |                           ^ Error: expect(locator).toBeFocused() failed
  313 |     await trigger.click();
  314 |     await expect(download).toBeDisabled();
  315 |     await expect(row.getByRole('status')).toHaveText('Preparing download…');
  316 |     await page.evaluate(() => (window as any).__finishArchiveDownload(true));
  317 |     await expect(row.getByRole('status')).toHaveText('Download started.');
  318 |     await expect(download).toBeEnabled();
  319 |     await expect(otherRow.getByRole('button').first()).toBeEnabled();
  320 |     await expect(row.getByRole('alert')).toHaveCount(0);
  321 |     // The file action uses the JSON format and participates in the same lock.
  322 |     await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_file) }).click();
  323 |     await expect.poll(() => page.evaluate(() => (window as any).__calls.archiveDownloads.at(-1))).toEqual({ key: 'one', format: 'json' });
  324 |     await page.evaluate(() => (window as any).__finishArchiveDownload(true));
  325 |     await expect(download).toBeEnabled();
  326 |     expect(errors).toEqual([]);
  327 |   });
  328 |   test(mode + ' saved session deletion can cancel and recover with focus intact', async ({ page }, info) => {
  329 |     await page.setViewportSize({ width: 320, height: 800 });
  330 |     const errors = await load(page, 'chat', { state: { mode }, archiveRows: [{ key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2 }], archiveDeleteFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDelete: true });
  331 |     await page.getByRole('button', { name: strings.persona.archive_button, exact: true }).click();
  332 |     const archive = page.locator('[data-persona-archive-dialog]'), row = archive.getByRole('listitem');
  333 |     const remove = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete + ':') });
  334 |     const confirm = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete_confirm) });
  335 |     await remove.click();
  336 |     await expect(row).toContainText('This cannot be undone.');
  337 |     await expect(confirm).toBeVisible();
  338 |     expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual([]);
  339 |     await axe(page);
  340 |     await page.screenshot({ path: info.outputPath(mode + '-archive-delete-confirm.png'), fullPage: true });
  341 |     await row.getByRole('button', { name: 'Cancel deletion', exact: true }).click();
  342 |     await expect(remove).toBeFocused();
  343 |     await expect(confirm).toHaveCount(0);
  344 |     await remove.click();
  345 |     await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) }).click();
  346 |     await expect(confirm).toHaveCount(0);
  347 |     await expect(row.getByRole('status')).toHaveText('Download started.');
  348 |     await remove.click();
  349 |     await confirm.click();
  350 |     await expect(row.getByRole('alert')).toContainText('could not be deleted');
  351 |     await expect(row).toHaveCount(1);
  352 |     await expect(confirm).toHaveCount(0);
  353 |     await expect(remove).toBeEnabled();
  354 |     await axe(page);
  355 |     await page.screenshot({ path: info.outputPath(mode + '-archive-delete-failed.png'), fullPage: true });
  356 |     await remove.click();
  357 |     await confirm.evaluate((node: HTMLElement) => { node.click(); node.click(); });
  358 |     await expect(row.getByRole('status')).toHaveText('Deleting session…');
  359 |     await expect(row.getByRole('alert')).toHaveCount(0);
  360 |     for (const button of await row.getByRole('button').all()) await expect(button).toBeDisabled();
  361 |     expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual(['one', 'one']);
  362 |     await page.evaluate(() => (window as any).__finishArchiveDelete(true));
  363 |     await expect(archive).toContainText(strings.persona.archive_empty);
  364 |     await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
  365 |     expect(await page.evaluate(() => (window as any).__calls.archiveLoads)).toBe(2);
  366 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  367 |     await axe(page);
  368 |     expect(errors).toEqual([]);
  369 |   });
  370 | }
  371 | 
```