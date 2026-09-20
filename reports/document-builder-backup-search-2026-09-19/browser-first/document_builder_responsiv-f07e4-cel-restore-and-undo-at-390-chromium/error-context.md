# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> Backup search: preview, cancel, restore and undo at 390
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:508:7

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#document-builder-preview').contentFrame().locator('#restored-editable')
    - locator resolved to <p id="restored-editable">Backup lesson text.</p>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
    - retrying click action
    - waiting 20ms
    - waiting for element to be visible, enabled and stable
    - element is visible, enabled and stable
    - scrolling into view if needed
    - done scrolling
    - <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
  2 × retrying click action
      - waiting 100ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <div class="builder-tray-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
  10 × retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="builder-tray-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
     - retrying click action
       - waiting 500ms
       - waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <div class="builder-tray-heading flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">…</div> from <div class="builder-controls">…</div> subtree intercepts pointer events
  - retrying click action
    - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - button "Open document" [ref=e2] [cursor=pointer]
  - dialog "Document Builder" [ref=e3]:
    - banner [ref=e4]:
      - generic [ref=e5]:
        - heading "Document Builder" [level=2] [ref=e6]
        - heading "Recovered lesson" [level=3] [ref=e7]
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
          - button "Find a tool" [ref=e28] [cursor=pointer]
          - group "Quick formatting" [ref=e29]:
            - combobox "Paragraph style" [ref=e30]:
              - option "Normal"
              - option "Title"
              - option "Subtitle"
              - option "Heading 1" [selected]
              - option "Heading 2"
              - option "Heading 3"
              - option "Quote"
              - option "Caption"
              - option "Callout"
            - button "Bold" [pressed] [ref=e31] [cursor=pointer]: B
            - button "Italic" [ref=e32] [cursor=pointer]: I
            - button "Underline" [ref=e33] [cursor=pointer]: U
          - tablist "Document Builder ribbon" [ref=e34]:
            - tab "Home" [ref=e35] [cursor=pointer]
            - tab "Insert" [ref=e36] [cursor=pointer]
            - tab "Layout" [ref=e37] [cursor=pointer]
            - tab "Review" [expanded] [selected] [ref=e38] [cursor=pointer]
            - tab "View" [ref=e39] [cursor=pointer]
            - tab "🤖 Expert Workbench" [ref=e40] [cursor=pointer]
        - generic [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]: Review
            - button "Close ribbon tools" [ref=e44] [cursor=pointer]: Close
          - tabpanel "Review" [ref=e45]:
            - generic [ref=e46]:
              - button "♿ A11y Inspect" [ref=e47] [cursor=pointer]
              - button "Run export preflight checks" [ref=e48] [cursor=pointer]: Preflight
            - button "Accessibility audit & results" [ref=e49] [cursor=pointer]
            - group "Review tools" [ref=e50]:
              - 'button "Track Changes: Off" [ref=e51] [cursor=pointer]'
              - button "Changes (0)" [ref=e52] [cursor=pointer]
              - generic [ref=e53]: Markup view
              - combobox "Markup view" [ref=e54]:
                - option "Simple Markup"
                - option "All Markup" [selected]
                - option "No Markup"
                - option "Original"
              - button "Accept" [disabled] [ref=e55]
              - button "Reject" [disabled] [ref=e56]
              - button "New Comment" [ref=e58] [cursor=pointer]
              - button "Comments (0)" [ref=e59] [cursor=pointer]
              - button "Word Count" [ref=e60] [cursor=pointer]
              - generic [ref=e61]: 7 words · 1 min reading time
              - generic [ref=e62]: Ctrl+Shift+E track · Ctrl+Alt+M comment · Ctrl+Alt+F footnote · Ctrl+Shift+G word count
            - group [ref=e63]:
              - generic "Find / Replace | Heading Outline (1) No matches | Ctrl+F / Ctrl+H" [ref=e64] [cursor=pointer]:
                - text: Find / Replace | Heading Outline (1)
                - generic [ref=e65]: No matches | Ctrl+F / Ctrl+H
            - group [ref=e66]:
              - generic "Version History (2) Stored on this device" [ref=e67] [cursor=pointer]
              - generic [ref=e68]:
                - generic [ref=e69]:
                  - generic [ref=e70]: Recent restore points stay on this device.
                  - generic [ref=e71]:
                    - button "Open HTML backup" [active] [ref=e72] [cursor=pointer]
                    - button "Download HTML backup" [ref=e73] [cursor=pointer]
                    - button "Save snapshot" [ref=e74] [cursor=pointer]
                - generic [ref=e75]:
                  - paragraph [ref=e76]: Your previous document was saved as a restore point.
                  - generic [ref=e77]:
                    - button "Undo backup restore" [ref=e78] [cursor=pointer]
                    - button "Download previous document" [ref=e79] [cursor=pointer]
                - generic [ref=e80]:
                  - generic [ref=e81]:
                    - generic [ref=e82]:
                      - generic [ref=e83]: Restored draft
                      - time [ref=e84]: 9/19/2026, 9:51:18 PM
                    - button "Compare" [ref=e85] [cursor=pointer]
                    - button "Restore" [ref=e86] [cursor=pointer]
                  - generic [ref=e87]:
                    - generic [ref=e88]:
                      - generic [ref=e89]: Auto-save
                      - time [ref=e90]: 9/19/2026, 9:51:16 PM
                    - button "Compare" [ref=e91] [cursor=pointer]
                    - button "Restore" [ref=e92] [cursor=pointer]
      - iframe [ref=e95]:
        - main [ref=f1e2]:
          - heading "Recovered lesson" [level=1] [ref=f1e3]
          - paragraph [ref=f1e4]: Backup lesson text.
          - img "Recovered diagram" [ref=f1e5]
          - paragraph [ref=f1e6]: Safe text
      - generic "Document status bar" [ref=e96]:
        - generic [ref=e97]:
          - generic [ref=e98]: Editing enabled
          - status [ref=e99]: Saved on this device · 09:51 PM
          - 'button "Track: Off · 0 changes" [ref=e101] [cursor=pointer]'
          - 'button "Words: 7" [ref=e103] [cursor=pointer]'
          - generic [ref=e104]: Page 1 of 2
          - group [ref=e105]:
            - generic "Details & shortcuts" [ref=e106] [cursor=pointer]
        - generic [ref=e107]:
          - combobox "Preview zoom mode" [ref=e108]:
            - option "Fit width" [selected]
            - option "Fit page"
            - option "Custom zoom"
          - generic "Editor zoom controls" [ref=e109]:
            - button "Zoom out" [ref=e110] [cursor=pointer]: −
            - slider "Editor zoom" [ref=e111]: "50"
            - button "Zoom in" [ref=e112] [cursor=pointer]: +
            - button "Reset editor zoom to 100 percent" [ref=e113] [cursor=pointer]: 50%
```

# Test source

```ts
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
  478 | const backupSearchEvidence = path.join(root, 'reports/document-builder-backup-search-2026-09-19');
  479 | fs.mkdirSync(backupSearchEvidence, { recursive: true });
  480 | const importedLesson = '<!doctype html><html lang="en"><head><title>Recovered lesson</title><style>h1{color:#4338ca}p{font-size:18px}</style></head><body><main><h1>Recovered lesson</h1><p id="restored-editable">Backup lesson text.</p><img alt="Recovered diagram" width="40" height="40" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jf1sAAAAASUVORK5CYII="><script>parent.__backupScriptRan=true</script><p onclick="parent.__backupScriptRan=true">Safe text</p></main></body></html>';
  481 | async function openBackupFile(page: Page, content = importedLesson, name = 'lesson-backup.html') {
  482 |   await page.addScriptTag({ path: path.join(root, 'dompurify/3.1.7/purify.min.js') });
  483 |   await page.locator('#builder-backup-file').setInputFiles({ name, mimeType: 'text/html', buffer: Buffer.from(content) });
  484 | }
  485 | for (const width of [1440, 390]) {
  486 |   test('Backup search: everyday terms and disabled explanations at ' + width, async ({ page }) => {
  487 |     await page.setViewportSize({ width, height: 900 });
  488 |     const errors = await mount(page);
  489 |     const before = await geometry(page);
  490 |     await page.getByRole('button', { name: 'Find a tool', exact: true }).click();
  491 |     const query = page.getByRole('searchbox');
  492 |     await query.fill('picture');
  493 |     await expect(page.locator('[data-builder-tool-result]').filter({ hasText: 'Add an image' })).toBeVisible();
  494 |     await query.fill('bibliography');
  495 |     const unavailable = page.locator('[data-builder-tool-result]').filter({ hasText: 'Bibliography' }).first();
  496 |     await expect(unavailable).toHaveAttribute('aria-disabled', 'true');
  497 |     await expect(unavailable).toContainText('Add and select a source');
  498 |     await page.keyboard.press('ArrowDown');
  499 |     await page.keyboard.press('Enter');
  500 |     await expect(query).toBeVisible();
  501 |     expect((await geometry(page)).frame).toEqual(before.frame);
  502 |     await page.screenshot({ path: path.join(backupSearchEvidence, 'unavailable-tool-' + width + '.png') });
  503 |     await page.keyboard.press('Escape');
  504 |     await expect(page.getByRole('button', { name: 'Find a tool', exact: true })).toBeFocused();
  505 |     expect(errors).toEqual([]);
  506 |   });
  507 | 
  508 |   test('Backup search: preview, cancel, restore and undo at ' + width, async ({ page }) => {
  509 |     await page.setViewportSize({ width, height: 900 });
  510 |     const errors = await mount(page);
  511 |     const frame = page.frameLocator('#document-builder-preview');
  512 |     await frame.locator('#editable').click(); await page.keyboard.press('End'); await page.keyboard.type(' Latest live edit.');
  513 |     await page.getByRole('button', { name: 'Find a tool', exact: true }).click();
  514 |     await page.getByRole('searchbox').fill('Open HTML backup');
  515 |     await page.locator('[data-builder-tool-result]').click();
  516 |     await expect(page.getByRole('button', { name: 'Open HTML backup', exact: true })).toBeFocused();
  517 |     await openBackupFile(page);
  518 |     const modal = page.getByRole('dialog', { name: 'Restore an HTML backup', exact: true });
  519 |     await expect(modal.getByRole('button', { name: 'Restore backup', exact: true })).toBeVisible();
  520 |     await expect(frame.locator('#editable')).toContainText('Latest live edit.');
  521 |     await expect(modal.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  522 |     await page.keyboard.press('Shift+Tab');
  523 |     await expect(modal.getByRole('button', { name: 'Restore backup', exact: true })).toBeFocused();
  524 |     await page.screenshot({ path: path.join(backupSearchEvidence, 'restore-preview-' + width + '.png') });
  525 |     await page.keyboard.press('Escape');
  526 |     await expect(modal).not.toBeVisible();
  527 |     await expect(page.getByRole('button', { name: 'Open HTML backup', exact: true })).toBeFocused();
  528 |     expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  529 |     await openBackupFile(page);
  530 |     await modal.getByRole('button', { name: 'Restore backup', exact: true }).click();
  531 |     await expect(modal).not.toBeVisible();
  532 |     await expect(frame.locator('#restored-editable')).toHaveText('Backup lesson text.');
  533 |     await expect(page.getByRole('button', { name: 'Undo backup restore', exact: true })).toBeVisible();
  534 |     expect(await page.evaluate(() => (window as any).__backupScriptRan)).toBeUndefined();
  535 |     expect(await frame.locator('[onclick]').count()).toBe(0);
> 536 |     await frame.locator('#restored-editable').click(); await page.keyboard.press('End'); await page.keyboard.type(' Still editable.');
      |                                               ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  537 |     await expect(frame.locator('#restored-editable')).toContainText('Still editable.');
  538 |     await page.keyboard.press('Alt+q'); await expect(page.getByRole('searchbox')).toBeFocused(); await page.keyboard.press('Escape');
  539 |     await page.getByRole('tab', { name: 'Review', exact: true }).click();
  540 |     const history = page.locator('#builder-version-history');
  541 |     if ((await history.getAttribute('open')) === null) await history.locator('summary').click();
  542 |     await page.getByRole('button', { name: 'Undo backup restore', exact: true }).click();
  543 |     await expect(frame.locator('#editable')).toContainText('Latest live edit.');
  544 |     expect((await geometry(page)).documentWidth).toBeLessThanOrEqual(width);
  545 |     expect(errors).toEqual([]);
  546 |   });
  547 | }
  548 | 
  549 | test('Backup search: storage failure retains downloadable previous document', async ({ page }) => {
  550 |   await page.setViewportSize({ width: 1440, height: 900 });
  551 |   await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  552 |   const errors = await mount(page);
  553 |   await openBackupFile(page);
  554 |   await page.getByRole('button', { name: 'Restore backup', exact: true }).click();
  555 |   await expect(page.getByText('Your previous document is kept for this session only.', { exact: false })).toBeVisible();
  556 |   await expect(page.locator('[data-builder-save-status]')).toContainText('Session only');
  557 |   const downloaded = page.waitForEvent('download');
  558 |   await page.getByRole('button', { name: 'Download previous document', exact: true }).click();
  559 |   const download = await downloaded;
  560 |   const output = path.join(backupSearchEvidence, 'previous-document.html'); await download.saveAs(output);
  561 |   expect(fs.readFileSync(output, 'utf8')).toContain('Original lesson text.');
  562 |   expect(fs.readFileSync(output, 'utf8')).not.toContain('Backup lesson text.');
  563 |   await page.screenshot({ path: path.join(backupSearchEvidence, 'session-recovery.png') });
  564 |   await page.getByRole('button', { name: 'Undo backup restore', exact: true }).click();
  565 |   await expect(page.frameLocator('#document-builder-preview').locator('#editable')).toContainText('Original lesson text.');
  566 |   await expect(page.locator('[data-builder-save-status]')).toContainText('Session only');
  567 |   expect(errors).toEqual([]);
  568 | });
  569 | 
  570 | test('Backup search: invalid file leaves current document untouched', async ({ page }) => {
  571 |   const errors = await mount(page);
  572 |   await openBackupFile(page, 'not an HTML document', 'bad-backup.html');
  573 |   await expect(page.getByRole('alert')).toContainText('HTML document backup');
  574 |   await expect(page.getByRole('button', { name: 'Restore backup', exact: true })).not.toBeVisible();
  575 |   await expect(page.frameLocator('#document-builder-preview').locator('#editable')).toHaveText('Original lesson text.');
  576 |   await page.keyboard.press('Escape');
  577 |   await expect(page.getByRole('dialog', { name: 'Restore an HTML backup', exact: true })).not.toBeVisible();
  578 |   expect(errors).toEqual([]);
  579 | });
  580 | 
```