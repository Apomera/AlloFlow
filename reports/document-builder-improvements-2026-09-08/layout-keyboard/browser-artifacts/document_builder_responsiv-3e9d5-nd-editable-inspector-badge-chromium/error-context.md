# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: document_builder_responsive_keyboard.spec.ts >> Tab from editor entry reaches its native control and editable inspector badge
- Location: tests\e2e\document_builder_responsive_keyboard.spec.ts:156:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator:  locator('#document-builder-preview').contentFrame().getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true })
Expected: focused
Received: inactive
Timeout:  15000ms

Call log:
  - Expect "toBeFocused" with timeout 15000ms
  - waiting for locator('#document-builder-preview').contentFrame().getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true })
    21 × locator resolved to <span tabindex="0" role="button" title="Select to edit aria-label" class="a11y-inspect-badge a11y-badge-aria" aria-label="Edit aria-label: Run lesson action">ARIA: Run lesson action</span>
       - unexpected value "inactive"

```

```yaml
- 'button "Edit aria-label: Run lesson action"': "ARIA: Run lesson action"
```

# Test source

```ts
  69  |       frame: { x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom },
  70  |       visibleHeight: Math.max(0, Math.min(box.bottom, pane.bottom, innerHeight) - Math.max(box.top, pane.top, 0)),
  71  |       documentWidth: document.documentElement.scrollWidth };
  72  |   });
  73  | }
  74  | 
  75  | for (const [width, height] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  76  |   test('Builder has a usable initial editing surface at ' + width + 'x' + height, async ({ page }, testInfo) => {
  77  |     await page.setViewportSize({ width, height });
  78  |     const errors = await mount(page);
  79  |     const facts = await geometry(page);
  80  |     await testInfo.attach('layout.json', { body: JSON.stringify(facts, null, 2), contentType: 'application/json' });
  81  |     await page.screenshot({ path: testInfo.outputPath('initial.png') });
  82  |     expect(facts.frame.height).toBeGreaterThanOrEqual(width < 1024 ? 280 : 200);
  83  |     expect(facts.visibleHeight).toBeGreaterThanOrEqual(width < 1024 ? 220 : 180);
  84  |     expect(facts.frame.x).toBeGreaterThanOrEqual(0);
  85  |     expect(facts.frame.right).toBeLessThanOrEqual(width);
  86  |     expect(facts.documentWidth).toBeLessThanOrEqual(width);
  87  |     if (width < 1024) {
  88  |       await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toHaveAttribute('aria-expanded', 'false');
  89  |       await expect(page.getByRole('region', { name: 'Document settings', exact: true })).not.toBeVisible();
  90  |       await expect(page.getByRole('button', { name: 'Expand ribbon', exact: true })).toBeVisible();
  91  |     }
  92  |     expect(errors).toEqual([]);
  93  |   });
  94  | }
  95  | 
  96  | test('mobile settings are reachable, Escape restores focus, and toggling preserves live edits', async ({ page }) => {
  97  |   await page.setViewportSize({ width: 390, height: 844 });
  98  |   const errors = await mount(page);
  99  |   const paragraph = page.frameLocator('#document-builder-preview').locator('#editable');
  100 |   await paragraph.click();
  101 |   await page.keyboard.press('End');
  102 |   await page.keyboard.type(' Teacher note.');
  103 |   await expect(paragraph).toContainText('Teacher note.');
  104 |   await page.evaluate(() => { (window as any).__originalFrameDocument = (window as any).builderProps.exportPreviewRef.current.contentDocument; });
  105 |   await page.getByRole('button', { name: 'Document settings', exact: true }).focus();
  106 |   await page.keyboard.press('Enter');
  107 |   const settings = page.getByRole('region', { name: 'Document settings', exact: true });
  108 |   await expect(settings).toBeVisible();
  109 |   await expect(page.locator('#document-builder-preview')).not.toBeVisible();
  110 |   await settings.getByRole('button').first().focus();
  111 |   await page.keyboard.press('Escape');
  112 |   await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toBeFocused();
  113 |   await expect(paragraph).toContainText('Teacher note.');
  114 |   expect(await page.evaluate(() => (window as any).__originalFrameDocument === (window as any).builderProps.exportPreviewRef.current.contentDocument)).toBe(true);
  115 |   // Escape from the still-focused switch also closes only the settings surface.
  116 |   await page.keyboard.press('Enter');
  117 |   await expect(page.getByRole('button', { name: 'Back to document', exact: true })).toBeFocused();
  118 |   await page.keyboard.press('Escape');
  119 |   await expect(page.getByRole('button', { name: 'Document settings', exact: true })).toBeFocused();
  120 |   expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  121 |   expect(errors).toEqual([]);
  122 | });
  123 | 
  124 | test('phone Focus mode preserves a usable preview and returns to standard view', async ({ page }, testInfo) => {
  125 |   await page.setViewportSize({ width: 390, height: 844 });
  126 |   const errors = await mount(page);
  127 |   await page.getByRole('button', { name: 'Focus mode', exact: true }).focus();
  128 |   await page.keyboard.press('Enter');
  129 |   await expect(page.getByRole('button', { name: 'Exit focus', exact: true })).toBeVisible();
  130 |   const facts = await geometry(page);
  131 |   await testInfo.attach('focus-layout.json', { body: JSON.stringify(facts, null, 2), contentType: 'application/json' });
  132 |   await page.screenshot({ path: testInfo.outputPath('focus.png') });
  133 |   expect(facts.frame.height).toBeGreaterThanOrEqual(280);
  134 |   expect(facts.visibleHeight).toBeGreaterThanOrEqual(220);
  135 |   await page.getByRole('button', { name: 'Exit focus', exact: true }).click();
  136 |   await expect(page.getByRole('button', { name: 'Focus mode', exact: true })).toBeVisible();
  137 |   expect((await geometry(page)).frame.height).toBeGreaterThanOrEqual(280);
  138 |   expect(errors).toEqual([]);
  139 | });
  140 | 
  141 | test('Quick Access Escape closes its own menu and restores focus before Builder close', async ({ page }) => {
  142 |   await page.setViewportSize({ width: 1440, height: 900 });
  143 |   const errors = await mount(page);
  144 |   const summary = page.getByLabel('Customize Quick Access toolbar', { exact: true });
  145 |   await summary.focus(); await page.keyboard.press('Enter');
  146 |   await page.locator('#builder-quick-access-customize input[type="checkbox"]').first().focus();
  147 |   await page.keyboard.press('Escape');
  148 |   expect(await page.locator('#builder-quick-access-customize').evaluate((details: HTMLDetailsElement) => details.open)).toBe(false);
  149 |   await expect(summary).toBeFocused();
  150 |   expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  151 |   await page.keyboard.press('Escape');
  152 |   expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(1);
  153 |   expect(errors).toEqual([]);
  154 | });
  155 | 
  156 | test('Tab from editor entry reaches its native control and editable inspector badge', async ({ page }) => {
  157 |   await page.setViewportSize({ width: 1440, height: 900 });
  158 |   const errors = await mount(page);
  159 |   await page.evaluate(() => {
  160 |     const w = window as any;
  161 |     w.AlloModules.ExportHandlers.applyA11yInspector({ exportPreviewRef: w.builderProps.exportPreviewRef, enabled: true });
  162 |   });
  163 |   const frame = page.frameLocator('#document-builder-preview');
  164 |   const nativeControl = frame.getByRole('button', { name: 'Run lesson action', exact: true });
  165 |   const badge = frame.getByRole('button', { name: 'Edit aria-label: Run lesson action', exact: true });
  166 |   await page.getByRole('button', { name: 'Skip to editable preview', exact: true }).focus();
  167 |   await page.keyboard.press('Enter'); await page.keyboard.press('Tab');
  168 |   await expect(nativeControl).toBeFocused();
> 169 |   await page.keyboard.press('Tab'); await expect(badge).toBeFocused();
      |                                                         ^ Error: expect(locator).toBeFocused() failed
  170 |   await page.keyboard.press('Enter');
  171 |   await expect(frame.locator('#a11y-inspect-editor-value')).toHaveValue('Run lesson action');
  172 |   await page.keyboard.press('Escape'); await expect(badge).toBeFocused();
  173 |   await page.keyboard.press('Shift+Tab'); await expect(nativeControl).toBeFocused();
  174 |   await page.keyboard.press('Shift+Tab');
  175 |   expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('IFRAME');
  176 |   expect(await page.evaluate(() => (window as any).__builderCloseRequests)).toBe(0);
  177 |   expect(errors).toEqual([]);
  178 | });
  179 | 
```