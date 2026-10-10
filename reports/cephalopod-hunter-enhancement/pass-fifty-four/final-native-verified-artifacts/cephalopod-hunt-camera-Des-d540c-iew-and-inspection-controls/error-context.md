# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cephalopod-hunt-camera.spec.ts >> Desktop Hunt view >> frames real capture, pause, resize and turns with working view and inspection controls
- Location: tests\e2e\cephalopod-hunt-camera.spec.ts:53:7

# Error details

```
Test timeout of 240000ms exceeded.
```

```
Error: locator.click: Test timeout of 240000ms exceeded.
Call log:
  - waiting for locator('.cl-hunt-stage').getByRole('button', { name: 'Help / settings', exact: true })

```

# Test source

```ts
  1  | import { expect, Page } from '@playwright/test';
  2  | 
  3  | // The same real secondary buttons move into Tools in compact layouts.
  4  | // Follow the visible UI without changing viewport, game state or keyboard rules.
  5  | export async function clickCephalopodControl(page: Page, name: 'Inspect' | 'Help / settings' | 'Observe') {
  6  |   const stage = page.locator('.cl-hunt-stage');
  7  |   const label = name === 'Inspect' ? /^Inspect(?: \[F\])?$/ : name;
  8  |   const button = stage.getByRole('button', { name: label, exact: true });
  9  |   if (!await button.isVisible()) {
  10 |     const tools = stage.getByRole('button', { name: 'Tools', exact: true });
  11 |     await expect(tools).toBeVisible();
  12 |     await tools.click();
  13 |   }
  14 |   await expect(button).toBeVisible();
> 15 |   await button.click();
     |                ^ Error: locator.click: Test timeout of 240000ms exceeded.
  16 | }
  17 | 
```