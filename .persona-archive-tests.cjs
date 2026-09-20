const fs = require('node:fs');
function write(path, data) { for(let attempt=0;;attempt++){try{fs.writeFileSync(path,data);return;}catch(error){if(attempt===7)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,300);}} }
const path='tests/e2e/persona-refinement.spec.ts', original=fs.readFileSync(path,'utf8');
let source=original.replace(/\r\n/g,'\n');
function replace(from,to){if(!source.includes(from))throw Error('Missing test anchor: '+from.slice(0,60));source=source.replace(from,to);}
replace('w.__calls = { sent: [], selected: [], started: 0, retries: 0, archiveLoads: 0 };', `w.__calls = { sent: [], selected: [], started: 0, retries: 0, archiveLoads: 0, archiveDownloads: [], archiveDeletes: [] };
    let archiveRows = config.archiveRows || [];`);
replace('return { sessions: [], unreadable: [] };\n        },', `return { sessions: archiveRows.slice(), unreadable: [] };
        },
        handleDownloadPersonaSessionArchive: async (key: string, format: string) => {
          w.__calls.archiveDownloads.push({ key, format });
          if (w.__calls.archiveDownloads.length <= (config.archiveDownloadFailures || 0)) {
            if (config.archiveActionRejects) throw new Error('Download failed');
            return null;
          }
          if (config.deferArchiveDownload) return await new Promise(resolve => { w.__finishArchiveDownload = resolve; });
          return true;
        },
        handleDeletePersonaSessionArchive: async (key: string) => {
          w.__calls.archiveDeletes.push(key);
          if (w.__calls.archiveDeletes.length <= (config.archiveDeleteFailures || 0)) {
            if (config.archiveActionRejects) throw new Error('Delete failed');
            return null;
          }
          const ok = config.deferArchiveDelete ? await new Promise(resolve => { w.__finishArchiveDelete = resolve; }) : true;
          if (ok === true) archiveRows = archiveRows.filter((row: any) => row.key !== key);
          return ok;
        },`);
source += `
for (const mode of ['single', 'panel']) {
  test(mode + ' saved session downloads recover and serialize rapid actions', async ({ page }, info) => {
    await page.setViewportSize({ width: 375, height: 850 });
    const rows = [
      { key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2, language: 'English' },
      { key: 'two', title: 'Grace Hopper: exploring compilers', messageCount: 4, audioClips: 0 }
    ];
    const errors = await load(page, 'chat', { state: { mode }, archiveRows: rows, archiveDownloadFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDownload: true });
    const trigger = page.getByRole('button', { name: strings.persona.archive_button, exact: true });
    await trigger.click();
    const archive = page.locator('[data-persona-archive-dialog]');
    const row = archive.getByRole('listitem').nth(0), otherRow = archive.getByRole('listitem').nth(1);
    const download = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) });
    await download.click();
    await expect(row.getByRole('alert')).toContainText('could not be downloaded');
    await expect(download).toBeEnabled();
    expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toEqual([{ key: 'one', format: 'html' }]);
    await download.evaluate((node: HTMLElement) => { node.click(); node.click(); });
    await expect(row.getByRole('status')).toHaveText('Preparing download…');
    await expect(row.getByRole('alert')).toHaveCount(0);
    for (const button of await archive.getByRole('listitem').getByRole('button').all()) await expect(button).toBeDisabled();
    await otherRow.getByRole('button').first().evaluate((node: HTMLElement) => node.click());
    expect(await page.evaluate(() => (window as any).__calls.archiveDownloads)).toHaveLength(2);
    await expect(download).toHaveAttribute('aria-busy', 'true');
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-download-pending.png'), fullPage: true });
    // Closing and reopening must preserve the pending lock and useful progress.
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await trigger.click();
    await expect(download).toBeDisabled();
    await expect(row.getByRole('status')).toHaveText('Preparing download…');
    await page.evaluate(() => (window as any).__finishArchiveDownload(true));
    await expect(row.getByRole('status')).toHaveText('Download started.');
    await expect(download).toBeEnabled();
    await expect(otherRow.getByRole('button').first()).toBeEnabled();
    await expect(row.getByRole('alert')).toHaveCount(0);
    // The file action uses the JSON format and participates in the same lock.
    await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_file) }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__calls.archiveDownloads.at(-1))).toEqual({ key: 'one', format: 'json' });
    await page.evaluate(() => (window as any).__finishArchiveDownload(true));
    await expect(download).toBeEnabled();
    expect(errors).toEqual([]);
  });
  test(mode + ' saved session deletion can cancel and recover with focus intact', async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const errors = await load(page, 'chat', { state: { mode }, archiveRows: [{ key: 'one', title: 'Ada Lovelace: evidence and imagination', messageCount: 8, audioClips: 2 }], archiveDeleteFailures: 1, archiveActionRejects: mode === 'panel', deferArchiveDelete: true });
    await page.getByRole('button', { name: strings.persona.archive_button, exact: true }).click();
    const archive = page.locator('[data-persona-archive-dialog]'), row = archive.getByRole('listitem');
    const remove = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete + ':') });
    const confirm = row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_delete_confirm) });
    await remove.click();
    await expect(row).toContainText('This cannot be undone.');
    await expect(confirm).toBeVisible();
    expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual([]);
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-delete-confirm.png'), fullPage: true });
    await row.getByRole('button', { name: 'Cancel deletion', exact: true }).click();
    await expect(remove).toBeFocused();
    await expect(confirm).toHaveCount(0);
    await remove.click();
    await row.getByRole('button', { name: new RegExp('^' + strings.persona.archive_download_page) }).click();
    await expect(confirm).toHaveCount(0);
    await expect(row.getByRole('status')).toHaveText('Download started.');
    await remove.click();
    await confirm.click();
    await expect(row.getByRole('alert')).toContainText('could not be deleted');
    await expect(row).toHaveCount(1);
    await expect(confirm).toHaveCount(0);
    await expect(remove).toBeEnabled();
    await axe(page);
    await page.screenshot({ path: info.outputPath(mode + '-archive-delete-failed.png'), fullPage: true });
    await remove.click();
    await confirm.evaluate((node: HTMLElement) => { node.click(); node.click(); });
    await expect(row.getByRole('status')).toHaveText('Deleting session…');
    await expect(row.getByRole('alert')).toHaveCount(0);
    for (const button of await row.getByRole('button').all()) await expect(button).toBeDisabled();
    expect(await page.evaluate(() => (window as any).__calls.archiveDeletes)).toEqual(['one', 'one']);
    await page.evaluate(() => (window as any).__finishArchiveDelete(true));
    await expect(archive).toContainText(strings.persona.archive_empty);
    await expect(archive.getByRole('button', { name: strings.common.close, exact: true })).toBeFocused();
    expect(await page.evaluate(() => (window as any).__calls.archiveLoads)).toBe(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await axe(page);
    expect(errors).toEqual([]);
  });
}
`;
write(path,original.includes('\r\n')?source.replace(/\n/g,'\r\n'):source);
const dir='reports/persona-archive-actions-2026-09-19';fs.mkdirSync(dir,{recursive:true});
write(dir+'/playwright.config.cjs', "const path=require('node:path');\nmodule.exports={...require('../persona-mode-refinement-2026-09-12/playwright.config.cjs'),outputDir:path.join(__dirname,'browser-tests')};\n");
console.log('Added archive action regression scenarios.');
