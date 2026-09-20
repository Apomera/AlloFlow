# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> Enhancements: find tools without shrinking the preview at 1440
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:388:7

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-builder-tool-result]')
Expected: 1
Received: 0
Timeout:  15000ms

Call log:
  - Expect "toHaveCount" with timeout 15000ms
  - waiting for locator('[data-builder-tool-result]')
    33 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open document" [ref=e2] [cursor=pointer]
  - dialog "Document Builder" [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - heading "Document Builder" [level=2] [ref=e6]
        - heading "Classroom handout" [level=3] [ref=e7]
      - generic [ref=e8]:
        - button "Document settings" [ref=e9] [cursor=pointer]
        - button "Focus mode" [ref=e10] [cursor=pointer]:
          - generic [ref=e11]: ↗
          - text: Focus mode
        - group [ref=e12]:
          - generic "Export" [ref=e13] [cursor=pointer]: Export ▾
        - button "Toggle color theme" [ref=e14] [cursor=pointer]: ☀️
        - button "Close Document Builder" [ref=e15] [cursor=pointer]: Close
      - button "Skip to editable preview" [ref=e16] [cursor=pointer]
      - button [ref=e17]
    - generic [ref=e18]:
      - status [ref=e19]
      - generic [ref=e20]:
        - generic [ref=e21]:
          - toolbar "Quick Access" [ref=e22]:
            - button "Save a local version snapshot" [ref=e23] [cursor=pointer]: Save
            - button "Undo" [ref=e24] [cursor=pointer]
            - button "Redo" [ref=e25] [cursor=pointer]
            - group [ref=e26]:
              - generic "Customize Quick Access toolbar" [ref=e27] [cursor=pointer]: +
          - button "Find a tool" [expanded] [ref=e28] [cursor=pointer]
          - group "Quick formatting" [ref=e29]:
            - combobox "Paragraph style" [ref=e30]:
              - option "Normal" [selected]
              - option "Title"
              - option "Subtitle"
              - option "Heading 1"
              - option "Heading 2"
              - option "Heading 3"
              - option "Quote"
              - option "Caption"
              - option "Callout"
            - button "Bold" [ref=e31] [cursor=pointer]: B
            - button "Italic" [ref=e32] [cursor=pointer]: I
            - button "Underline" [ref=e33] [cursor=pointer]: U
          - tablist "Document Builder ribbon" [ref=e34]:
            - tab "Home" [selected] [ref=e35] [cursor=pointer]
            - tab "Insert" [ref=e36] [cursor=pointer]
            - tab "Layout" [ref=e37] [cursor=pointer]
            - tab "Review" [ref=e38] [cursor=pointer]
            - tab "View" [ref=e39] [cursor=pointer]
            - tab "🤖 Expert Workbench" [ref=e40] [cursor=pointer]
            - button "Expand ribbon" [ref=e41] [cursor=pointer]
        - dialog "Find a tool" [ref=e42]:
          - generic [ref=e43]:
            - strong [ref=e44]: Find a tool
            - button "Close tool search" [ref=e45] [cursor=pointer]: Close
          - generic [ref=e46]: Find a document tool
          - searchbox "Find a document tool" [active] [ref=e47]: Table body rows
          - paragraph [ref=e48]: Choose a result to open its controls. Arrow keys move through results.
          - status [ref=e49]: 0 tools shown
          - paragraph [ref=e50]: No matching tools. Try a shorter term, or select an image or table to see its tools.
      - iframe [ref=e53]:
        - main [ref=f1e2]:
          - heading "Classroom handout" [level=1] [ref=f1e3]
          - paragraph [ref=f1e4]: Original lesson text.
          - button "Run lesson action" [ref=f1e5]: Run
      - generic "Document status bar" [ref=e54]:
        - generic [ref=e55]:
          - generic [ref=e56]: Editing enabled
          - status [ref=e57]: No local changes yet
          - 'button "Track: Off · 0 changes" [ref=e59] [cursor=pointer]'
          - 'button "Words: 6" [ref=e61] [cursor=pointer]'
          - generic [ref=e62]: Page 1 of 2
          - group [ref=e63]:
            - generic "Details & shortcuts" [ref=e64] [cursor=pointer]
        - generic [ref=e65]:
          - combobox "Preview zoom mode" [ref=e66]:
            - option "Fit width" [selected]
            - option "Fit page"
            - option "Custom zoom"
          - generic "Editor zoom controls" [ref=e67]:
            - button "Zoom out" [ref=e68] [cursor=pointer]: −
            - slider "Editor zoom" [ref=e69]: "165"
            - button "Zoom in" [ref=e70] [cursor=pointer]: +
            - button "Reset editor zoom to 100 percent" [ref=e71] [cursor=pointer]: 165%
```

# Test source

```ts
  297 |   test('Export keeps all formats reachable and nested Escape contained at ' + width, async ({ page }, testInfo) => {
  298 |     await page.setViewportSize({ width, height: 900 });
  299 |     const errors = await mount(page);
  300 |     await page.locator('#builder-export-menu > summary').click();
  301 |     const panel = page.getByRole('region', { name: 'Export document', exact: true });
  302 |     await expect(panel.getByRole('button', { name: 'Print / Save as PDF', exact: true })).toBeVisible();
  303 |     const more = panel.locator('summary', { hasText: 'More export formats' });
  304 |     await more.click();
  305 |     const formats = panel.getByRole('group', { name: 'Additional export formats' });
  306 |     await expect(formats.getByRole('button', { name: 'Accessible Word (.docx)', exact: true })).toBeVisible();
  307 |     expect(await formats.getByRole('button').count()).toBeGreaterThan(5);
  308 |     const box = await panel.boundingBox();
  309 |     expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  310 |     expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  311 |     await page.screenshot({ path: testInfo.outputPath('export-menu.png') });
  312 |     await formats.getByRole('button').first().focus(); await page.keyboard.press('Escape');
  313 |     await expect(more).toBeFocused(); await expect(formats).not.toBeVisible();
  314 |     await page.keyboard.press('Escape'); await expect(panel).not.toBeVisible();
  315 |     await expect(page.locator('#builder-export-menu > summary')).toBeFocused();
  316 |     expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  317 |     expect(errors).toEqual([]);
  318 |   });
  319 | }
  320 | 
  321 | test('settings and zoom preferences survive reopening and compact defaults can be restored', async ({ page }) => {
  322 |   await page.setViewportSize({ width: 1440, height: 900 });
  323 |   await mount(page);
  324 |   await page.getByRole('button', { name: 'Document settings', exact: true }).click();
  325 |   await page.getByRole('combobox', { name: 'Preview zoom mode', exact: true }).selectOption('fit-page');
  326 |   await page.getByRole('tab', { name: 'Insert', exact: true }).click();
  327 |   await mount(page);
  328 |   await expect(page.getByRole('region', { name: 'Document settings', exact: true })).toBeVisible();
  329 |   await expect(page.getByRole('combobox', { name: 'Preview zoom mode', exact: true })).toHaveValue('fit-page');
  330 |   await expect(page.getByRole('tab', { name: 'Insert', exact: true })).toHaveAttribute('aria-expanded', 'true');
  331 |   await page.getByRole('button', { name: 'Close ribbon tools', exact: true }).click();
  332 |   await page.locator('.builder-status-details > summary').click();
  333 |   await page.getByRole('button', { name: 'Reset Builder view preferences', exact: true }).click();
  334 |   await expect(page.getByRole('region', { name: 'Document settings', exact: true })).not.toBeVisible();
  335 |   await expect(page.getByRole('combobox', { name: 'Preview zoom mode', exact: true })).toHaveValue('fit-width');
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
> 397 |     await expect(page.locator('[data-builder-tool-result]')).toHaveCount(1);
      |                                                              ^ Error: expect(locator).toHaveCount(expected) failed
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
  436 |     await expect(page.locator('#builder-table-context-tools')).toBeVisible();
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