# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> Enhancements: table and image controls follow selection at 390
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:419:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('#builder-table-context-tools')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for locator('#builder-table-context-tools')

```

```yaml
- button "Open document"
- dialog "Document Builder":
  - banner:
    - heading "Document Builder" [level=2]
    - heading "Classroom handout" [level=3]
    - button "Document settings"
    - button "Focus mode"
    - group: Export
    - button "Toggle color theme"
    - button "Close Document Builder": Close
    - button "Skip to editable preview"
  - status
  - toolbar "Quick Access":
    - button "Save a local version snapshot": Save
    - button "Undo"
    - button "Redo"
    - group: +
  - button "Find a tool"
  - group "Selected table tools":
    - text: Table
    - button "Add table row": + Row
    - button "Add table column": + Column
    - button "More table tools": More
  - tablist "Document Builder ribbon":
    - tab "Home" [selected]
    - tab "Insert"
    - tab "Layout"
    - tab "Review"
    - tab "View"
    - tab "🤖 Expert Workbench"
  - iframe
  - text: Editing enabled
  - status: Saved on this device · 08:39 PM
  - 'button "Track: Off · 0 changes"'
  - 'button "Words: 10"'
  - text: Page 1 of 2
  - group: Details & shortcuts
  - combobox "Preview zoom mode":
    - option "Fit width" [selected]
    - option "Fit page"
    - option "Custom zoom"
  - button "Zoom out": −
  - slider "Editor zoom": "50"
  - button "Zoom in": +
  - button "Reset editor zoom to 100 percent": 50%
```

# Test source

```ts
  336 |   await expect(page.locator('#builder-tool-tray')).not.toBeVisible();
  337 | });
  338 | 
  339 | for (const theme of ['light', 'dark', 'contrast']) {
  340 |   test('roomier workspace and tool panels render with application ' + theme + ' theme', async ({ page }, testInfo) => {
  341 |     await page.setViewportSize({ width: 1280, height: 900 });
  342 |     const errors = await mount(page);
  343 |     await page.addScriptTag({ path: path.join(root, 'app_styles_module.js') });
  344 |     await page.evaluate((theme) => {
  345 |       const w = window as any;
  346 |       document.documentElement.classList.add('theme-' + theme);
  347 |       const styles = document.createElement('div'); document.body.appendChild(styles);
  348 |       w.ReactDOM.createRoot(styles).render(w.React.createElement(w.AlloModules.AppStyles.AppStyles));
  349 |     }, theme);
  350 |     await page.getByRole('tab', { name: 'Review', exact: true }).click();
  351 |     await expect(page.getByRole('button', { name: 'Run export preflight checks', exact: true })).toBeVisible();
  352 |     await page.screenshot({ path: testInfo.outputPath('review-' + theme + '.png') });
  353 |     const tray = await page.locator('#builder-tool-tray').boundingBox();
  354 |     expect(tray!.x).toBeGreaterThanOrEqual(0); expect(tray!.x + tray!.width).toBeLessThanOrEqual(1280);
  355 |     expect(tray!.y + tray!.height).toBeLessThanOrEqual(900);
  356 |     await page.getByRole('button', { name: 'Close ribbon tools', exact: true }).click();
  357 |     await page.getByRole('button', { name: 'Document settings', exact: true }).click();
  358 |     await page.screenshot({ path: testInfo.outputPath('settings-' + theme + '.png') });
  359 |     expect(errors).toEqual([]);
  360 |   });
  361 | }
  362 | 
  363 | test('Escape inside the document dismisses tools and in-app Focus mode without closing the builder', async ({ page }) => {
  364 |   await page.setViewportSize({ width: 1440, height: 900 });
  365 |   const errors = await mount(page);
  366 |   await page.evaluate(() => { (document.documentElement as any).requestFullscreen = undefined; });
  367 |   const focusDocument = () => page.evaluate(() => (window as any).builderProps.exportPreviewRef.current.contentDocument.body.focus());
  368 |   await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  369 |   await focusDocument(); await page.keyboard.press('Escape');
  370 |   await expect(page.getByRole('button', { name: 'Focus mode', exact: true })).toBeVisible();
  371 |   const review = page.getByRole('tab', { name: 'Review', exact: true });
  372 |   await review.click(); await focusDocument(); await page.keyboard.press('Escape');
  373 |   await expect(page.locator('#builder-tool-tray')).not.toBeVisible(); await expect(review).toBeFocused();
  374 |   const exportMenu = page.locator('#builder-export-menu > summary');
  375 |   await exportMenu.click(); await focusDocument(); await page.keyboard.press('Escape');
  376 |   await expect(page.getByRole('region', { name: 'Export document', exact: true })).not.toBeVisible();
  377 |   await expect(exportMenu).toBeFocused();
  378 |   await exportMenu.click();
  379 |   await page.frameLocator('#document-builder-preview').locator('#editable').click();
  380 |   await expect(page.getByRole('region', { name: 'Export document', exact: true })).not.toBeVisible();
  381 |   expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  382 |   expect(errors).toEqual([]);
  383 | });
  384 | 
  385 | const enhancementEvidence = path.join(root, 'reports/document-builder-enhancements-2026-09-19');
  386 | fs.mkdirSync(enhancementEvidence, { recursive: true });
  387 | for (const width of [1440, 390]) {
  388 |   test('Enhancements: find tools without shrinking the preview at ' + width, async ({ page }) => {
  389 |     await page.setViewportSize({ width, height: 900 });
  390 |     const errors = await mount(page);
  391 |     const frame = page.frameLocator('#document-builder-preview');
  392 |     await frame.locator('#editable').click();
  393 |     const before = await geometry(page);
  394 |     await page.keyboard.press('Alt+q');
  395 |     await expect(page.getByRole('searchbox', { name: 'Find a document tool' })).toBeFocused();
  396 |     await page.getByRole('searchbox').fill('Table body rows');
  397 |     await expect(page.locator('[data-builder-tool-result]')).toHaveCount(1);
  398 |     const during = await geometry(page);
  399 |     expect(during.frame.height).toBe(before.frame.height);
  400 |     expect(during.frame.width).toBe(before.frame.width);
  401 |     await page.screenshot({ path: path.join(enhancementEvidence, 'tool-search-' + width + '.png') });
  402 |     await page.keyboard.press('ArrowDown');
  403 |     await expect(page.locator('[data-builder-tool-result]')).toBeFocused();
  404 |     await page.keyboard.press('Enter');
  405 |     await expect(page.getByRole('spinbutton', { name: 'Table body rows' })).toBeFocused();
  406 |     await expect(page.getByRole('tabpanel', { name: 'Insert', exact: true })).toBeVisible();
  407 |     await expect(frame.locator('#editable')).toHaveText('Original lesson text.');
  408 |     expect((await geometry(page)).frame.height).toBe(before.frame.height);
  409 |     await page.getByRole('button', { name: 'Find a tool', exact: true }).click();
  410 |     await page.getByRole('searchbox').fill('no-such-command');
  411 |     await expect(page.getByText('No matching tools.', { exact: false })).toBeVisible();
  412 |     await page.keyboard.press('Escape');
  413 |     await expect(page.getByRole('button', { name: 'Find a tool', exact: true })).toBeFocused();
  414 |     expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  415 |     expect((await geometry(page)).documentWidth).toBeLessThanOrEqual(width);
  416 |     expect(errors).toEqual([]);
  417 |   });
  418 | 
  419 |   test('Enhancements: table and image controls follow selection at ' + width, async ({ page }) => {
  420 |     await page.setViewportSize({ width, height: 900 });
  421 |     const errors = await mount(page);
  422 |     const frame = page.frameLocator('#document-builder-preview');
  423 |     await page.evaluate(() => {
  424 |       const doc = (window as any).builderProps.exportPreviewRef.current.contentDocument;
  425 |       const canvas = document.createElement('canvas'); canvas.width = 160; canvas.height = 100;
  426 |       const context = canvas.getContext('2d')!; context.fillStyle = '#4338ca'; context.fillRect(0, 0, 160, 100);
  427 |       doc.querySelector('main').insertAdjacentHTML('beforeend', '<table id="context-table"><tbody><tr><td>First cell</td><td>Second cell</td></tr></tbody></table><img id="context-image" width="160" height="100" alt="Lesson diagram" src="' + canvas.toDataURL() + '">');
  428 |     });
  429 |     await frame.locator('#context-table td').first().click();
  430 |     await expect(page.getByRole('group', { name: 'Selected table tools' })).toBeVisible();
  431 |     await page.getByRole('button', { name: 'Add table row', exact: true }).click();
  432 |     await expect(frame.locator('#context-table tr')).toHaveCount(2);
  433 |     await page.getByRole('button', { name: 'Add table column', exact: true }).click();
  434 |     await expect(frame.locator('#context-table tr').first().locator('td')).toHaveCount(3);
  435 |     await page.getByRole('button', { name: 'More table tools' }).click();
> 436 |     await expect(page.locator('#builder-table-context-tools')).toBeVisible();
      |                                                                ^ Error: expect(locator).toBeVisible() failed
  437 |     await page.getByRole('button', { name: 'Close ribbon tools' }).click();
  438 |     await frame.locator('#context-image').click();
  439 |     await expect(page.getByRole('group', { name: 'Selected image tools' })).toBeVisible();
  440 |     await expect(page.getByRole('button', { name: 'Alt text', exact: true })).toBeVisible();
  441 |     await page.screenshot({ path: path.join(enhancementEvidence, 'image-tools-' + width + '.png') });
  442 |     await page.getByRole('button', { name: 'Crop selected image' }).click();
  443 |     await expect(frame.getByRole('dialog', { name: 'Crop image', exact: true })).toBeVisible();
  444 |     await page.keyboard.press('Escape');
  445 |     await expect(frame.getByRole('dialog', { name: 'Crop image', exact: true })).not.toBeVisible();
  446 |     await frame.locator('#editable').click();
  447 |     await expect(page.getByRole('group', { name: 'Quick formatting' })).toBeVisible();
  448 |     expect((await geometry(page)).documentWidth).toBeLessThanOrEqual(width);
  449 |     expect(errors).toEqual([]);
  450 |   });
  451 | }
  452 | 
  453 | test('Enhancements: storage failure exposes a current HTML backup', async ({ page }) => {
  454 |   await page.setViewportSize({ width: 1440, height: 900 });
  455 |   await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  456 |   const errors = await mount(page);
  457 |   const frame = page.frameLocator('#document-builder-preview');
  458 |   await frame.locator('#editable').click();
  459 |   await page.keyboard.press('End');
  460 |   await page.keyboard.type(' Backup-current-text.');
  461 |   await expect(page.locator('[data-builder-save-status]')).toContainText('Session only');
  462 |   await expect(page.getByRole('button', { name: 'Download backup', exact: true })).toBeVisible();
  463 |   const downloaded = page.waitForEvent('download');
  464 |   await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  465 |   const download = await downloaded;
  466 |   expect(download.suggestedFilename()).toMatch(/-backup\.html$/);
  467 |   const backupPath = path.join(enhancementEvidence, 'verified-backup.html');
  468 |   await download.saveAs(backupPath);
  469 |   const backup = fs.readFileSync(backupPath, 'utf8');
  470 |   expect(backup).toContain('Backup-current-text.');
  471 |   expect(backup).not.toContain('allo-builder-edit-css');
  472 |   expect(backup).not.toContain('allo-block-controls');
  473 |   await expect(page.locator('[data-builder-save-status]')).toContainText('Session only');
  474 |   await page.screenshot({ path: path.join(enhancementEvidence, 'save-warning.png') });
  475 |   expect(errors).toEqual([]);
  476 | });
  477 | 
```