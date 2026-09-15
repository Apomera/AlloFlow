# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: adventure-visuals.spec.ts >> status header reflows with readable meters and reachable tools in dark
- Location: tests\e2e\adventure-visuals.spec.ts:471:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-adventure-header]').getByText('Water quality', { exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-adventure-header]').getByText('Water quality', { exact: true })

```

```yaml
- main:
  - region "Adventure controls":
    - heading "Adventure" [level=3]
    - group "Story tools":
      - button "Open journey log": Journey log
      - button "Enter immersive view": Immersive view
      - button "Enable automatic reading": "Read aloud: off"
      - button "fluency title": fluency button short
    - group:
      - text: Story status & more tools
      - group "Adventure status":
        - text: system simulation Lvl 3 40/100 XP
        - progressbar "XP"
        - text: Stability 16
        - progressbar "stability"
        - text: Gold 10 Concepts 2
        - region "Resources":
          - term: Water quality
          - definition: 78%
          - term: Community monitoring and long-term habitat restoration budget
          - definition: 1250credits
      - paragraph: Read the scene, review your resources, then choose your next step.
      - button "edit options tooltip"
      - button "maximize tooltip"
      - button "start new adventure": restart
  - region "Current scene":
    - heading "Current scene" [level=4]
    - button "Go to choices ↓"
    - text: Scene image size
    - slider "Scene image size": "200"
    - button "Full illustration"
    - paragraph:
      - 'button "Read aloud: A river crosses the valley below the town. Compare the water measurements before deciding where to restore habitat."': A river crosses the valley below the town. Compare the water measurements before deciding where to restore habitat.
  - region "Available actions":
    - text: Episode progress 2 completed · 4 remaining
    - progressbar "Episode progress"
    - button "Compare the measurements"
    - 'button "Listen: Compare the measurements"'
    - button "Inspect the wetland"
    - 'button "Listen: Inspect the wetland"'
```

# Test source

```ts
  421 |   await mountActiveAdventure(page, 'dark', {
  422 |     state: { isGameOver: true, canStartSequel: false, energy: 0, turnCount: 9, stats: { decisions: 0, conceptsFound: [] } }
  423 |   });
  424 |   const recap = page.getByRole('region', { name: 'Episode recap', exact: true });
  425 |   await expect(recap.locator('dd').first()).toHaveText('0');
  426 |   await expect(recap.getByText(/Out of energy/)).toBeVisible();
  427 |   await expect(recap.getByText('Chapter complete', { exact: true })).toHaveCount(0);
  428 |   await expect(page.locator('[data-fixture-celebration]')).toHaveCount(0);
  429 |   await expect(recap.getByRole('button', { name: 'Start a sequel', exact: true })).toHaveCount(0);
  430 |   await expect(recap.getByRole('button', { name: 'Create a storybook', exact: true })).toBeEnabled();
  431 |   await recap.locator('summary').click();
  432 |   await expect(recap.getByText('Use your journey notebook to choose one idea worth revisiting.', { exact: true })).toBeVisible();
  433 |   const modes = [
  434 |     { mode: 'choice', social: false, prompt: 'Which decision changed the story most? What evidence from the lesson supported it?' },
  435 |     { mode: 'debate', social: false, prompt: 'Which claim had the strongest evidence? How would you respond to a counterargument?' },
  436 |     { mode: 'system', social: false, prompt: 'Which change helped most, and what tradeoff would you plan for next time?' },
  437 |     { mode: 'choice', social: true, prompt: 'Whose perspective did you consider? What could you say or do differently next time?' }
  438 |   ];
  439 |   for (const value of modes) {
  440 |     await page.evaluate(value => (window as any).__updateAdventure({ adventureInputMode: value.mode, isSocialStoryMode: value.social }), value);
  441 |     await expect(recap.getByText(value.prompt, { exact: true })).toBeVisible();
  442 |     if (value.mode === 'system') await expect(recap.getByText(/Stability reached zero/)).toBeVisible();
  443 |     await axe(page, '[data-adventure-recap]');
  444 |   }
  445 |   await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { energy: undefined, stats: undefined, turnCount: 4 } }));
  446 |   await expect(recap.locator('dd').first()).toHaveText('3');
  447 |   await expect(recap.getByText(/Out of energy|Stability reached zero/)).toHaveCount(0);
  448 | });
  449 | 
  450 | test('ended immersive sessions keep class continuation with the teacher and hide old response controls', async ({ page }) => {
  451 |   await load(page, 'light');
  452 |   await mountActiveAdventure(page, 'light', {
  453 |     props: { activeSessionCode: 'CLASS', isTeacherMode: false, immersiveShowChoices: true, adventureFreeResponseEnabled: true },
  454 |     state: { isImmersiveMode: true, isGameOver: true, canStartSequel: true }
  455 |   });
  456 |   const recap = page.getByRole('region', { name: 'Episode recap', exact: true });
  457 |   await expect(recap).toBeVisible();
  458 |   await expect(recap.getByRole('button', { name: 'Start a sequel', exact: true })).toHaveCount(0);
  459 |   await expect(recap.getByText('Your teacher can continue the story with the class.', { exact: true })).toBeVisible();
  460 |   await expect(page.locator('[data-help-key="adventure_input_send"]')).toHaveCount(0);
  461 |   await expect(page.locator('[data-help-key="adventure_choice_btn"]')).toHaveCount(0);
  462 |   await page.evaluate(() => (window as any).__updateAdventure({ isTeacherMode: true, adventureState: { isLoading: true } }));
  463 |   await expect(recap.getByRole('button', { name: 'Start a sequel', exact: true })).toBeDisabled();
  464 |   await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { isLoading: false } }));
  465 |   await recap.getByRole('button', { name: 'Start a sequel', exact: true }).click();
  466 |   expect(await page.evaluate(() => (window as any).__endingCalls.sequels)).toBe(1);
  467 | });
  468 | 
  469 | 
  470 | for (const theme of ['light', 'dark', 'contrast']) {
  471 |   test('status header reflows with readable meters and reachable tools in ' + theme, async ({ page }, info) => {
  472 |     await page.setViewportSize({ width: 1200, height: 1000 });
  473 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  474 |     await load(page, theme);
  475 |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  476 |     await mountActiveAdventure(page, theme, {
  477 |       props: { isTeacherMode: true, adventureFluencyEnabled: true, isZenMode: false, adventureEffects: { xp: null, energy: null, levelUp: null } },
  478 |       state: { level: 3, xp: 40, energy: 72, stats: { decisions: 2, conceptsFound: ['Habitat', 'Water quality'] } }
  479 |     });
  480 |     await page.evaluate(() => {
  481 |       const w = window as any; w.__headerCalls = [];
  482 |       const patch: any = {};
  483 |       for (const name of ['handleSetShowLedgerToTrue', 'handleToggleAdventureImmersive', 'handleStartAdventure', 'handleStartOptionEdit', 'handleSetIsZenModeToTrue', 'setAdventureFluencyOpen', 'stopPlayback']) patch[name] = () => w.__headerCalls.push(name);
  484 |       patch.setAdventureAutoRead = (value: boolean) => { w.__headerCalls.push('autoread:' + value); w.__updateAdventure({ adventureAutoRead: value }); };
  485 |       w.__updateAdventure(patch);
  486 |     });
  487 |     const header = page.locator('[data-adventure-header]');
  488 |     await expect(header).toBeVisible();
  489 |     await expect(header.locator('[data-adventure-meter="xp"]')).toContainText('40/100 XP');
  490 |     await expect(header.locator('[data-adventure-meter="energy"]')).toContainText('Energy');
  491 |     await expect(header.locator('[data-adventure-meter="energy"]')).toContainText('72');
  492 |     for (const width of [1200, 320]) {
  493 |       await page.setViewportSize({ width, height: 1000 });
  494 |       await expect(header.getByRole('heading', { name: 'Adventure', exact: true })).toBeVisible();
  495 |       expect(await header.evaluate((node: HTMLElement) => node.scrollWidth <= node.clientWidth)).toBe(true);
  496 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  497 |       await axe(page, '[data-adventure-header]');
  498 |       for (const button of await header.locator('[data-adventure-toolbar] button').all()) {
  499 |         await button.scrollIntoViewIfNeeded();
  500 |         const box = (await button.boundingBox())!;
  501 |         expect(box.width).toBeGreaterThanOrEqual(44);
  502 |         expect(box.height).toBeGreaterThanOrEqual(44);
  503 |         expect(box.x).toBeGreaterThanOrEqual(0);
  504 |         expect(box.x + box.width).toBeLessThanOrEqual(width);
  505 |       }
  506 |       await header.evaluate((node: HTMLElement) => { node.scrollTop = 0; });
  507 |       await page.screenshot({ path: info.outputPath('header-' + theme + '-' + width + '.png') });
  508 |     }
  509 |     await header.getByRole('button', { name: 'Open journey log', exact: true }).focus();
  510 |     await page.keyboard.press('Enter');
  511 |     await header.getByRole('button', { name: 'Enter immersive view', exact: true }).click();
  512 |     await header.getByRole('button', { name: 'Enable automatic reading', exact: true }).click();
  513 |     await expect(header.getByRole('button', { name: 'Disable automatic reading', exact: true })).toHaveAttribute('aria-pressed', 'true');
  514 |     await header.getByRole('button', { name: 'Disable automatic reading', exact: true }).click();
  515 |     expect(await page.evaluate(() => (window as any).__headerCalls)).toEqual(['handleSetShowLedgerToTrue', 'handleToggleAdventureImmersive', 'autoread:true', 'autoread:false', 'stopPlayback']);
  516 |     expect(await page.evaluate(() => (window as any).__calls.choices)).toEqual([]);
  517 | 
  518 |     await page.evaluate(() => (window as any).__updateAdventure({ adventureInputMode: 'system', enableFactionResources: true,
  519 |       adventureState: { energy: 16, systemResources: [{ name: 'Water quality', quantity: 78, unit: '%' }, { name: 'Community monitoring and long-term habitat restoration budget', quantity: 1250, unit: 'credits' }] } }));
  520 |     await expect(header.locator('[data-adventure-meter="energy"]')).toContainText('Stability');
> 521 |     await expect(header.getByText('Water quality', { exact: true })).toBeVisible();
      |                                                                      ^ Error: expect(locator).toBeVisible() failed
  522 |     await expect(header.getByText('Community monitoring and long-term habitat restoration budget', { exact: true })).toBeVisible();
  523 |     await page.setViewportSize({ width: 320, height: 700 });
  524 |     await page.addStyleTag({ content: 'html { font-size: 20px; }' });
  525 |     expect(await page.getByRole('region', { name: 'Current scene', exact: true }).evaluate(node => node.closest('.custom-scrollbar')!.getBoundingClientRect().height)).toBeGreaterThanOrEqual(100);
  526 |     expect(await header.evaluate((node: HTMLElement) => node.scrollWidth <= node.clientWidth)).toBe(true);
  527 |     await header.getByRole('button', { name: 'Open journey log', exact: true }).focus();
  528 |     await page.keyboard.press('Enter');
  529 |     await axe(page, '[data-adventure-header]');
  530 |     await header.evaluate((node: HTMLElement) => { node.scrollTop = 0; });
  531 |     await page.screenshot({ path: info.outputPath('header-' + theme + '-systems-large-text.png') });
  532 |     expect(errors).toEqual([]);
  533 |   });
  534 | }
  535 | 
  536 | 
  537 | for (const theme of ['light', 'dark', 'contrast']) {
  538 |   test('scene illustration controls preserve reading and reveal full artwork in ' + theme, async ({ page }, info) => {
  539 |     await page.setViewportSize({ width: 1200, height: 1100 });
  540 |     await page.emulateMedia({ reducedMotion: 'reduce' });
  541 |     await load(page, theme);
  542 |     const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  543 |     await mountActiveAdventure(page, theme, { props: { adventureEffects: { xp: null, energy: null, levelUp: null } } });
  544 |     await page.evaluate(() => { const w = window as any; w.__imageSizes = []; w.__updateAdventure({
  545 |       setAdventureImageSize: (value: number) => { w.__imageSizes.push(value); w.__updateAdventure({ adventureImageSize: value }); }
  546 |     }); });
  547 |     const scene = page.getByRole('region', { name: 'Current scene', exact: true });
  548 |     const frame = scene.locator('[data-adventure-illustration]');
  549 |     const art = frame.locator('img');
  550 |     const slider = scene.getByRole('slider', { name: 'Scene image size', exact: true });
  551 |     const fit = scene.getByRole('button', { name: 'Full illustration', exact: true });
  552 |     await expect(fit).toHaveAttribute('aria-pressed', 'false');
  553 |     await expect(art).toHaveCSS('object-fit', 'cover');
  554 |     await slider.focus(); await page.keyboard.press('ArrowRight');
  555 |     await expect(slider).toHaveValue('250');
  556 |     await expect(slider).toHaveAttribute('aria-valuetext', '250 px');
  557 |     await expect(art).toHaveCSS('height', '250px');
  558 |     await fit.focus(); await page.keyboard.press('Space');
  559 |     await expect(fit).toHaveAttribute('aria-pressed', 'true');
  560 |     await expect(art).toHaveCSS('object-fit', 'contain');
  561 |     const color = theme === 'light' ? 'rgb(244, 247, 251)' : theme === 'dark' ? 'rgb(25, 38, 59)' : 'rgb(0, 0, 0)';
  562 |     await expect(page.locator('[data-adventure-canvas]')).toHaveCSS('background-color', color);
  563 |     await expect(scene.locator('[data-adventure-prose]')).toHaveCSS('font-size', '16px');
  564 | 
  565 |     for (const width of [1200, 320]) {
  566 |       await page.setViewportSize({ width, height: 1100 });
  567 |       await scene.getByRole('heading').scrollIntoViewIfNeeded();
  568 |       expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  569 |       expect(await scene.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
  570 |       await axe(page, '[aria-labelledby="adventure-current-scene-heading"]');
  571 |       await page.screenshot({ path: info.outputPath('illustration-' + theme + '-' + width + '.png') });
  572 |     }
  573 |     // Real pointer input exercises React's native range event path.
  574 |     await slider.scrollIntoViewIfNeeded();
  575 |     const track = (await slider.boundingBox())!;
  576 |     await page.mouse.move(track.x + track.width / 2, track.y + track.height / 2);
  577 |     await page.mouse.down(); await page.mouse.move(track.x + track.width - 5, track.y + track.height / 2, { steps: 8 }); await page.mouse.up();
  578 |     expect(Number(await slider.inputValue())).toBeGreaterThanOrEqual(550);
  579 |     await slider.focus(); await page.keyboard.press('Home');
  580 |     await expect(slider).toHaveValue('150');
  581 |     await expect(art).toHaveCSS('height', '150px');
  582 |     await fit.click();
  583 |     await expect(art).toHaveCSS('object-fit', 'cover');
  584 |     const narration = scene.getByRole('button', { name: /^Read aloud:/ }).first();
  585 |     await narration.focus(); await page.keyboard.press('Enter');
  586 |     expect((await page.evaluate(() => (window as any).__calls.speech))[0][1]).toBe('adventure-active');
  587 |     expect(await page.evaluate(() => (window as any).__calls.choices)).toEqual([]);
  588 | 
  589 |     await page.evaluate(() => { const w = window as any; w.__updateAdventure({ adventureState: {
  590 |       sceneImagePreview: w.__adventureProps.adventureState.sceneImage, sceneImage: null, imagePolishStage: 'matching'
  591 |     } }); });
  592 |     await expect(frame.getByRole('status')).toContainText('Matching your cast');
  593 |     await fit.click(); await expect(art).toHaveCSS('object-fit', 'contain');
  594 |     await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { sceneImagePreview: null, isImageLoading: false } }));
  595 |     await expect(scene.getByRole('slider')).toHaveCount(0);
  596 |     await expect(fit).toHaveCount(0);
  597 |     await expect(scene.locator('[data-adventure-prose]')).toBeVisible();
  598 |     await page.evaluate(() => (window as any).__updateAdventure({ adventureState: { isImageLoading: true, loadingStage: 'Drawing the river scene' } }));
  599 |     await expect(frame).toHaveCount(0);
  600 |     await expect(scene.getByRole('status')).toContainText('Drawing the river scene');
  601 |     await expect(scene.getByRole('status')).toContainText('You can start reading now.');
  602 |     await page.addStyleTag({ content: 'html { font-size: 20px; }' });
  603 |     await axe(page, '[aria-labelledby="adventure-current-scene-heading"]');
  604 |     expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  605 |     expect(errors).toEqual([]);
  606 |   });
  607 | }
  608 | 
  609 | 
  610 | for (const immersive of [false, true]) {
  611 |   for (const theme of ['light', 'dark', 'contrast']) {
  612 |     test('turn status and retry remain readable in ' + theme + ' ' + (immersive ? 'immersive' : 'standard'), async ({ page }, info) => {
  613 |       await page.setViewportSize({ width: 1200, height: 1100 });
  614 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  615 |       await load(page, theme);
  616 |       const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  617 |       const pending = 'Compare both water samples before changing the habitat.\nKeep monitoring the river <strong>carefully</strong>. ' + 'LongObservation'.repeat(12);
  618 |       const history = notebookHistory();
  619 |       await mountActiveAdventure(page, theme, { props: { immersiveShowChoices: false, adventureEffects: { xp: null, energy: null, levelUp: null } },
  620 |         state: { isImmersiveMode: immersive, isLoading: true, pendingChoice: pending, loadingStage: 'Considering your evidence', history } });
  621 |       const status = page.locator('[data-adventure-turn-status]');
```