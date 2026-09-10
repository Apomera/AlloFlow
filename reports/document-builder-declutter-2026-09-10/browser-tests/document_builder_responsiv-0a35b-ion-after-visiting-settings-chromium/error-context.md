# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> compact formatting restores the selection after visiting settings
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:276:5

# Error details

```
TimeoutError: page.waitForEvent: Timeout 30000ms exceeded while waiting for event "filechooser"
=========================== logs ===========================
waiting for event "filechooser"
============================================================
```

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('tabpanel').getByRole('button', { name: /Insert image/i })

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
          - group "Quick formatting" [ref=e28]:
            - combobox "Paragraph style" [ref=e29]:
              - option "Normal" [selected]
              - option "Title"
              - option "Subtitle"
              - option "Heading 1"
              - option "Heading 2"
              - option "Heading 3"
              - option "Quote"
              - option "Caption"
              - option "Callout"
            - button "Bold" [pressed] [ref=e30] [cursor=pointer]: B
            - button "Italic" [ref=e31] [cursor=pointer]: I
            - button "Underline" [ref=e32] [cursor=pointer]: U
          - tablist "Document Builder ribbon" [ref=e33]:
            - tab "Home" [expanded] [active] [selected] [ref=e34] [cursor=pointer]
            - tab "Insert" [ref=e35] [cursor=pointer]
            - tab "Layout" [ref=e36] [cursor=pointer]
            - tab "Review" [ref=e37] [cursor=pointer]
            - tab "View" [ref=e38] [cursor=pointer]
            - tab "🤖 Expert Workbench" [ref=e39] [cursor=pointer]
            - button "Collapse ribbon" [expanded] [ref=e40] [cursor=pointer]
        - generic [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e43]: Formatting
            - button "Close ribbon tools" [ref=e44] [cursor=pointer]: Close
          - tabpanel "Home" [ref=e45]:
            - generic "Styles and Format Painter" [ref=e46]:
              - generic [ref=e47]: Styles
              - toolbar "Document styles" [ref=e48]:
                - button "Normal" [pressed] [ref=e49] [cursor=pointer]
                - button "Title" [ref=e50] [cursor=pointer]
                - button "Subtitle" [ref=e51] [cursor=pointer]
                - button "Heading 1" [ref=e52] [cursor=pointer]
                - button "Heading 2" [ref=e53] [cursor=pointer]
                - button "Heading 3" [ref=e54] [cursor=pointer]
                - button "Quote" [ref=e55] [cursor=pointer]
                - button "Caption" [ref=e56] [cursor=pointer]
                - button "Callout" [ref=e57] [cursor=pointer]
              - button "Format Painter" [ref=e59] [cursor=pointer]
              - group [ref=e60]:
                - generic "Manage styles" [ref=e61] [cursor=pointer]
            - toolbar [ref=e62]:
              - button "Bold" [pressed] [ref=e63] [cursor=pointer]: B
              - button "Italic" [ref=e64] [cursor=pointer]: I
              - button "Underline" [ref=e65] [cursor=pointer]: U
              - button "Strikethrough" [ref=e66] [cursor=pointer]: S̶
              - button "Subscript" [ref=e67] [cursor=pointer]: x₂
              - button "Superscript" [ref=e68] [cursor=pointer]: x²
              - generic [ref=e69]:
                - generic [ref=e70]: Text size
                - combobox "Text size" [ref=e71]:
                  - option "10 pt"
                  - option "12 pt"
                  - option "14 pt" [selected]
                  - option "18 pt"
                  - option "24 pt"
                  - option "32 pt"
                  - option "48 pt"
              - button "Heading 1" [ref=e73] [cursor=pointer]: H1
              - button "Heading 2" [ref=e74] [cursor=pointer]: H2
              - button "Heading 3" [ref=e75] [cursor=pointer]: H3
              - button "Paragraph" [pressed] [ref=e76] [cursor=pointer]: ¶
              - button "•" [ref=e78] [cursor=pointer]
              - button "Numbered list" [ref=e79] [cursor=pointer]: "1."
              - button "Align left" [pressed] [ref=e81] [cursor=pointer]: ←
              - button "Center align" [ref=e82] [cursor=pointer]: ↔
              - button "Align right" [ref=e83] [cursor=pointer]: →
              - button "Justify text" [ref=e84] [cursor=pointer]: ☰
              - button "Insert link" [ref=e86] [cursor=pointer]: 🔗
              - button "Insert an equation (accessible math)" [ref=e88] [cursor=pointer]: ∑
              - button "Clear formatting" [ref=e90] [cursor=pointer]: ✕
              - button "Undo" [ref=e91] [cursor=pointer]: ↩
              - button "Redo" [ref=e92] [cursor=pointer]: ↪
              - combobox "Text color" [ref=e93]:
                - option "Color" [disabled] [selected]
                - option "⬛ Black"
                - option "🟦 Navy"
                - option "🟥 Red"
                - option "🟩 Green"
                - option "🟪 Purple"
              - combobox "Text highlight color" [ref=e94]:
                - option "Highlight" [disabled] [selected]
                - option "Yellow"
                - option "Green"
                - option "Blue"
                - option "Pink"
                - option "No highlight"
      - iframe [ref=e97]:
        - main [ref=f1e2]:
          - heading "Classroom handout" [level=1] [ref=f1e3]
          - paragraph [ref=f1e4]: Original lesson text.
          - button "Run lesson action" [ref=f1e5]: Run
      - generic "Document status bar" [ref=e98]:
        - generic [ref=e99]:
          - generic [ref=e100]: Editing enabled
          - status [ref=e101]: Saved on this device · 06:23 PM
          - 'button "Track: Off · 0 changes" [ref=e103] [cursor=pointer]'
          - 'button "Words: 3 of 6" [ref=e105] [cursor=pointer]'
          - generic [ref=e106]: Page 1 of 2
          - group [ref=e107]:
            - generic "Details & shortcuts" [ref=e108] [cursor=pointer]
        - generic [ref=e109]:
          - combobox "Preview zoom mode" [ref=e110]:
            - option "Fit width" [selected]
            - option "Fit page"
            - option "Custom zoom"
          - generic "Editor zoom controls" [ref=e111]:
            - button "Zoom out" [ref=e112] [cursor=pointer]: −
            - slider "Editor zoom" [ref=e113]: "145"
            - button "Zoom in" [ref=e114] [cursor=pointer]: +
            - button "Reset editor zoom to 100 percent" [ref=e115] [cursor=pointer]: 145%
```

# Test source

```ts
  192 |     doc.body.innerHTML = '<main><h1>Classroom handout</h1><table><tr><td id="active-cell"><button aria-label="Run lesson action">Run</button></td></tr></table></main>';
  193 |     w.AlloModules.ExportHandlers.applyA11yInspector({ exportPreviewRef: w.builderProps.exportPreviewRef, enabled: true });
  194 |     const range = doc.createRange();
  195 |     range.selectNodeContents(doc.getElementById('active-cell')); range.collapse(true);
  196 |     doc.getSelection().removeAllRanges(); doc.getSelection().addRange(range);
  197 |   });
  198 |   const frame = page.frameLocator('#document-builder-preview');
  199 |   const nativeControl = frame.getByRole('button', { name: 'Run lesson action', exact: true });
  200 |   const badge = frame.getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true });
  201 |   await nativeControl.focus();
  202 |   await page.keyboard.press('Tab');
  203 |   await expect(badge).toBeFocused();
  204 |   await expect(frame.locator('table tr')).toHaveCount(1);
  205 |   await page.keyboard.press('Shift+Tab');
  206 |   await expect(nativeControl).toBeFocused();
  207 |   expect(errors).toEqual([]);
  208 | });
  209 | 
  210 | 
  211 | test('current document heading and timestamped save context follow real edits', async ({ page }) => {
  212 |   await page.setViewportSize({ width: 1440, height: 900 });
  213 |   const errors = await mount(page);
  214 |   await expect(page.locator('#builder-current-document-title')).toHaveText('Classroom handout');
  215 |   await expect(page.locator('[data-builder-save-status]')).toHaveText('No local changes yet');
  216 |   const heading = page.frameLocator('#document-builder-preview').getByRole('heading', { name: 'Classroom handout', exact: true });
  217 |   await heading.click();
  218 |   await page.keyboard.press('Home'); await page.keyboard.press('Shift+End');
  219 |   await page.keyboard.type('Revised classroom handout');
  220 |   await expect(heading).toHaveCount(0);
  221 |   await expect(page.locator('#builder-current-document-title')).toHaveText('Revised classroom handout');
  222 |   await expect(page.locator('[data-builder-document-context]')).toContainText('History selection');
  223 |   await expect(page.locator('[data-builder-save-status]')).toHaveText(/^Saved (?:for this session|on this device) · .+/);
  224 |   expect(errors).toEqual([]);
  225 | });
  226 | 
  227 | test('remediation settings omit History assembly options while retaining the editable document', async ({ page }) => {
  228 |   await page.setViewportSize({ width: 1440, height: 900 });
  229 |   const errors = await mount(page, 'remediation');
  230 |   await page.getByRole('button', { name: 'Document settings', exact: true }).click();
  231 |   const settings = page.getByRole('region', { name: 'Document settings', exact: true });
  232 |   await expect(settings).toBeVisible();
  233 |   await expect(page.getByRole('radiogroup', { name: 'Export format' })).toBeVisible();
  234 |   await expect(settings.getByText('Include Resources', { exact: true })).toHaveCount(0);
  235 |   await expect(settings.getByText('Presets', { exact: true })).toHaveCount(0);
  236 |   await expect(settings.getByRole('radio', { name: /Worksheet/ })).toHaveCount(0);
  237 |   await expect(page.locator('[data-builder-document-context]')).toContainText('Remediated');
  238 |   await expect(page.frameLocator('#document-builder-preview').getByRole('heading', { name: 'Classroom handout', exact: true })).toBeVisible();
  239 |   expect(await page.evaluate(() => (window as any).builderProps.exportPreviewRef.current.contentDocument.designMode)).toBe('on');
  240 |   expect(errors).toEqual([]);
  241 | });
  242 | 
  243 | test('desktop settings, ribbon, and Focus mode preserve the live document and undo history', async ({ page }, testInfo) => {
  244 |   await page.setViewportSize({ width: 1440, height: 900 });
  245 |   const errors = await mount(page);
  246 |   const original = await geometry(page);
  247 |   const paragraph = page.frameLocator('#document-builder-preview').locator('#editable');
  248 |   await paragraph.click(); await page.keyboard.press('End'); await page.keyboard.type(' Preserved edit.');
  249 |   await page.evaluate(() => { (window as any).__layoutDocument = (window as any).builderProps.exportPreviewRef.current.contentDocument; });
  250 |   const settingsButton = page.getByRole('button', { name: 'Document settings', exact: true });
  251 |   await settingsButton.click();
  252 |   await expect(page.getByRole('region', { name: 'Document settings', exact: true })).toBeVisible();
  253 |   await expect(paragraph).toBeVisible();
  254 |   expect((await geometry(page)).frame.width).toBeLessThan(original.frame.width);
  255 |   await page.getByRole('button', { name: 'Back to document', exact: true }).click();
  256 |   await expect(settingsButton).toBeFocused();
  257 |   expect((await geometry(page)).frame.width).toBe(original.frame.width);
  258 |   for (const name of ['Home', 'Insert', 'Layout', 'Review', 'View', '🤖 Expert Workbench']) {
  259 |     await page.getByRole('tab', { name, exact: true }).click();
  260 |     await expect(page.locator('#builder-tool-tray')).toBeVisible();
  261 |     expect((await geometry(page)).frame.height).toBe(original.frame.height);
  262 |     await page.getByRole('button', { name: 'Close ribbon tools', exact: true }).click();
  263 |   }
  264 |   await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  265 |   await expect(page.locator('.builder-controls')).not.toBeVisible();
  266 |   expect((await geometry(page)).frame.height).toBeGreaterThan(original.frame.height);
  267 |   await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  268 |   await expect(paragraph).toContainText('Preserved edit.');
  269 |   expect(await page.evaluate(() => (window as any).__layoutDocument === (window as any).builderProps.exportPreviewRef.current.contentDocument)).toBe(true);
  270 |   await page.getByRole('button', { name: 'Undo', exact: true }).click();
  271 |   await expect(paragraph).toHaveText('Original lesson text.');
  272 |   await page.screenshot({ path: testInfo.outputPath('roomier-desktop.png') });
  273 |   expect(errors).toEqual([]);
  274 | });
  275 | 
  276 | test('compact formatting restores the selection after visiting settings', async ({ page }) => {
  277 |   await page.setViewportSize({ width: 1280, height: 900 });
  278 |   const errors = await mount(page);
  279 |   await page.evaluate(() => {
  280 |     const doc = (window as any).builderProps.exportPreviewRef.current.contentDocument;
  281 |     const range = doc.createRange(); range.selectNodeContents(doc.getElementById('editable'));
  282 |     doc.getSelection().removeAllRanges(); doc.getSelection().addRange(range);
  283 |     doc.dispatchEvent(new Event('selectionchange'));
  284 |   });
  285 |   await page.getByRole('button', { name: 'Document settings', exact: true }).click();
  286 |   await page.getByRole('button', { name: 'Back to document', exact: true }).click();
  287 |   await page.getByRole('group', { name: 'Quick formatting' }).getByRole('button', { name: 'Bold', exact: true }).click();
  288 |   const paragraph = page.frameLocator('#document-builder-preview').locator('#editable');
  289 |   await expect(paragraph.locator('b,strong')).toHaveText('Original lesson text.');
  290 |   await page.getByRole('tab', { name: 'Home', exact: true }).click();
  291 |   const chooser = page.waitForEvent('filechooser');
> 292 |   await page.getByRole('tab', { name: 'Insert', exact: true }).click();
      |                                                                                   ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  293 |   await page.getByRole('tabpanel').getByRole('button', { name: 'Insert image with alternative text', exact: true }).click();
  294 |   await chooser;
  295 |   expect(errors).toEqual([]);
  296 | });
  297 | 
  298 | for (const width of [1440, 390]) {
  299 |   test('Export keeps all formats reachable and nested Escape contained at ' + width, async ({ page }, testInfo) => {
  300 |     await page.setViewportSize({ width, height: 900 });
  301 |     const errors = await mount(page);
  302 |     await page.locator('#builder-export-menu > summary').click();
  303 |     const panel = page.getByRole('region', { name: 'Export document', exact: true });
  304 |     await expect(panel.getByRole('button', { name: 'Print / Save as PDF', exact: true })).toBeVisible();
  305 |     const more = panel.locator('summary', { hasText: 'More export formats' });
  306 |     await more.click();
  307 |     const formats = panel.getByRole('group', { name: 'Additional export formats' });
  308 |     await expect(formats.getByRole('button', { name: 'Accessible Word (.docx)', exact: true })).toBeVisible();
  309 |     expect(await formats.getByRole('button').count()).toBeGreaterThan(5);
  310 |     const box = await panel.boundingBox();
  311 |     expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
  312 |     expect(box!.y + box!.height).toBeLessThanOrEqual(900);
  313 |     await page.screenshot({ path: testInfo.outputPath('export-menu.png') });
  314 |     await formats.getByRole('button').first().focus(); await page.keyboard.press('Escape');
  315 |     await expect(more).toBeFocused(); await expect(formats).not.toBeVisible();
  316 |     await page.keyboard.press('Escape'); await expect(panel).not.toBeVisible();
  317 |     await expect(page.locator('#builder-export-menu > summary')).toBeFocused();
  318 |     expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  319 |     expect(errors).toEqual([]);
  320 |   });
  321 | }
  322 | 
  323 | test('settings and zoom preferences survive reopening and compact defaults can be restored', async ({ page }) => {
  324 |   await page.setViewportSize({ width: 1440, height: 900 });
  325 |   await mount(page);
  326 |   await page.getByRole('button', { name: 'Document settings', exact: true }).click();
  327 |   await page.getByRole('combobox', { name: 'Preview zoom mode', exact: true }).selectOption('fit-page');
  328 |   await page.getByRole('tab', { name: 'Insert', exact: true }).click();
  329 |   await mount(page);
  330 |   await expect(page.getByRole('region', { name: 'Document settings', exact: true })).toBeVisible();
  331 |   await expect(page.getByRole('combobox', { name: 'Preview zoom mode', exact: true })).toHaveValue('fit-page');
  332 |   await expect(page.getByRole('tab', { name: 'Insert', exact: true })).toHaveAttribute('aria-expanded', 'true');
  333 |   await page.getByRole('button', { name: 'Close ribbon tools', exact: true }).click();
  334 |   await page.locator('.builder-status-details > summary').click();
  335 |   await page.getByRole('button', { name: 'Reset Builder view preferences', exact: true }).click();
  336 |   await expect(page.getByRole('region', { name: 'Document settings', exact: true })).not.toBeVisible();
  337 |   await expect(page.getByRole('combobox', { name: 'Preview zoom mode', exact: true })).toHaveValue('fit-width');
  338 |   await expect(page.locator('#builder-tool-tray')).not.toBeVisible();
  339 | });
  340 | 
```