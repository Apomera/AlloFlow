# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-annotation-integrity.spec.ts >> literal keyboard annotations retain state at 320 pixels and 2×/4× CSS zoom without internal overflow
- Location: tests\e2e\microbiology-annotation-integrity.spec.ts:272:5

# Error details

```
TimeoutError: locator.pressSequentially: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('#gl-explanation')
    - locator resolved to <textarea rows="3" maxlength="1200" id="gl-explanation" aria-describedby="gl-explanation-hint">Growth annotation original.</textarea>
  - elementHandle.type("<img src=x onerror="window.__annotationInjected=true"> Literal learner text.")

```

# Test source

```ts
  176 |   await mount(page, 'growth'); await selectSaved(page, 'growth', 139); await selectSaved(page, 'growth', selected.growth); const before = await state(page);
  177 |   expect(before.microbiology.growthInvestigation.trials.length).toBeGreaterThan(12);
  178 |   await caretInsert(page, 'growth', 'Growth '.length, 'new ');
  179 |   const text = 'Growth new annotation original.';
  180 |   await expect(editor(page, 'growth')).toHaveValue(text); expect(await state(page)).toEqual(noteChanged(before, 'growth', text));
  181 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  182 |   await editor(page, 'growth').locator('..').screenshot({ path: path.join(out, 'annotation-growth-desktop.png') });
  183 |   const saved = await roundTrip(page, 'growth'); await expect(editor(page, 'growth')).toHaveValue(text);
  184 |   writeFileSync(path.join(out, 'growth-annotation-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  185 | });
  186 | 
  187 | test('Resistance reflection preserves overflow imports, original snapshots, comparison choices, recovery, and focused caret', async ({ page }) => {
  188 |   await mount(page, 'resistance'); await selectSaved(page, 'resistance', 227); await selectSaved(page, 'resistance', selected.resistance); const before = await state(page);
  189 |   expect(before.microbiology.resistanceNotebook.records.length).toBeGreaterThan(8);
  190 |   await caretInsert(page, 'resistance', 'Resistance '.length, 'refined ');
  191 |   const text = 'Resistance refined annotation original.';
  192 |   await expect(editor(page, 'resistance')).toHaveValue(text); expect(await state(page)).toEqual(noteChanged(before, 'resistance', text));
  193 |   await expect(page.locator('[data-resistance-evidence="230"] blockquote')).toHaveText(before.microbiology.resistanceNotebook.records.find((row: any) => row && row.id === 230).evidence.notes);
  194 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  195 |   const saved = await roundTrip(page, 'resistance'); await expect(editor(page, 'resistance')).toHaveValue(text);
  196 |   writeFileSync(path.join(out, 'resistance-annotation-restored-state.json'), JSON.stringify(saved, null, 2) + '\n');
  197 | });
  198 | 
  199 | test('both annotation updaters read the newest raw state and retain concurrent unrelated edits', async ({ page }) => {
  200 |   for (const lab of ['growth', 'resistance'] as Lab[]) {
  201 |     await mount(page, lab);
  202 |     await race(page, lab, 'unrelated', 'Later reasoning belongs to this original saved owner.');
  203 |     await expect(editor(page, lab)).toHaveValue('Later reasoning belongs to this original saved owner.');
  204 |     await harness.unmount(page);
  205 |   }
  206 | });
  207 | 
  208 | test('replaced owners, later selections, other tabs, and generated repair IDs reject stale implicit annotation writes', async ({ page }) => {
  209 |   for (const lab of ['growth', 'resistance'] as Lab[]) {
  210 |     for (const mode of ['replace', 'selection', 'tab'] as const) {
  211 |       await mount(page, lab); await race(page, lab, mode, 'This stale event must be discarded.'); await harness.unmount(page);
  212 |     }
  213 |     const data = seed(lab);
  214 |     data[field[lab]] = { [rows[lab]]: lab === 'growth' ? [trial('invalid-id', 1), trial(1, 2)] : [record('invalid-id', 1), record(1, 2)], selectedId: 2, nextId: 20, rawMarker: true };
  215 |     await mount(page, lab, data, false); if (lab === 'resistance') await open(page.locator('.micro-resistance-saved'));
  216 |     const before = await state(page);
  217 |     await expect(page.locator(lab === 'growth' ? '#gl-trial-2' : '#micro-resistance-evidence-2')).toBeVisible();
  218 |     await expect(page.locator(lab === 'growth' ? '#gl-explanation' : '[data-resistance-reflection]')).toHaveCount(0);
  219 |     expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  220 |   }
  221 | });
  222 | 
  223 | test('completed restored Resistance runs report four actual outcomes without inventing an original prediction', async ({ page }) => {
  224 |   const cases = [
  225 |     { name: 'increase', history: [[72, 8], [60, 8], [50, 8], [40, 8]], finalPct: 17, text: 'The resistant share increased by 7 percentage points.' },
  226 |     { name: 'similar', history: [[72, 8], [70, 8], [68, 8], [66, 8]], finalPct: 11, text: 'The resistant share stayed about the same (a 1-point change; changes within 5 points count as similar).' },
  227 |     { name: 'decrease', history: [[72, 8], [70, 6], [70, 4], [70, 2]], finalPct: 3, text: 'The resistant share decreased by 7 percentage points.' },
  228 |     { name: 'extinct', history: [[72, 8], [36, 4], [0, 0]], finalPct: null, text: 'The population died out. There is no surviving population from which to calculate a resistant share.' }
  229 |   ];
  230 |   for (const scenario of cases) {
  231 |     const data = seed('resistance'); data.resistanceInvestigation = { ...fullRun(scenario.history.map(([sensitive, resistant], day) => ({ day, sensitive, resistant }))), dose: 30 };
  232 |     await mount(page, 'resistance', data); const before = await state(page);
  233 |     const summary = page.locator('#micro-resistance-outcome-summary');
  234 |     await expect(summary).toHaveText('Observation summary. ' + scenario.text);
  235 |     await expect(summary).not.toContainText('was not classified'); await expect(summary).not.toContainText('Prediction');
  236 |     await expect(workspace(page, 'resistance')).toContainText('No prediction was saved for this restored run. Its observed outcome is shown without a prediction comparison.');
  237 |     await expect(page.locator('input[name="micro-resistance-prediction"]:checked')).toHaveCount(0);
  238 |     expect(before.microbiology.resistanceInvestigation.prediction).toBeNull();
  239 |     const last = before.microbiology.resistanceInvestigation.history.at(-1), total = last.sensitive + last.resistant;
  240 |     expect(total ? Math.round(last.resistant / total * 100) : null).toBe(scenario.finalPct);
  241 |     expect(await state(page)).toEqual(before); expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  242 |   }
  243 | });
  244 | 
  245 | test('a partial run without prediction resumes to a real outcome while annotations never advance or regrade it', async ({ page }) => {
  246 |   const data = seed('resistance'); data.resistanceInvestigation = { ...fullRun([0, 1].map(day => ({ day, sensitive: 72, resistant: 8 }))), runAwarded: false };
  247 |   await mount(page, 'resistance', data); const before = await state(page), originalBook = clone(before.microbiology.resistanceNotebook);
  248 |   await expect(page.locator('#micro-resistance-outcome-summary')).toHaveCount(0);
  249 |   await editor(page, 'resistance').fill('Reflection before resuming the original live observations.');
  250 |   expect(await state(page)).toEqual(noteChanged(before, 'resistance', 'Reflection before resuming the original live observations.'));
  251 |   expect(await counters(page)).toEqual({ xp: [], random: 0 });
  252 |   const step = page.getByRole('button', { name: 'Step round', exact: true });
  253 |   await step.focus(); await step.press('Enter');
  254 |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(2);
  255 |   await expect(page.locator('#micro-resistance-outcome-summary')).toHaveCount(0);
  256 |   await step.press('Enter');
  257 |   await expect.poll(async () => (await state(page)).microbiology.resistanceInvestigation.day).toBe(3);
  258 |   await expect(step).toBeDisabled();
  259 |   await expect(page.locator('#micro-resistance-outcome-summary')).toHaveText('Observation summary. The resistant share stayed about the same (a 0-point change; changes within 5 points count as similar).');
  260 |   const completed = await state(page), steppedCounters = await counters(page);
  261 |   expect(completed.microbiology.resistanceInvestigation.prediction).toBeNull();
  262 |   expect(completed.microbiology.resistanceInvestigation.history).toEqual([0, 1, 2, 3].map(day => ({ day, sensitive: 72, resistant: 8 })));
  263 |   expect(steppedCounters.random).toBeGreaterThan(0);
  264 |   const expectedBook = clone(originalBook); expectedBook.records.find((row: any) => row && row.id === 230).reviewNote = 'Reflection before resuming the original live observations.';
  265 |   expect(completed.microbiology.resistanceNotebook).toEqual(expectedBook);
  266 |   await editor(page, 'resistance').fill('Reflection after observing the same zero-exposure full dish.');
  267 |   expect(await state(page)).toEqual(noteChanged(completed, 'resistance', 'Reflection after observing the same zero-exposure full dish.'));
  268 |   expect(await counters(page)).toEqual(steppedCounters);
  269 |   await page.locator('#micro-resistance-outcome-summary').locator('..').screenshot({ path: path.join(out, 'annotation-outcome-resume.png') });
  270 | });
  271 | 
  272 | test('literal keyboard annotations retain state at 320 pixels and 2×/4× CSS zoom without internal overflow', async ({ page }) => {
  273 |   for (const lab of ['growth', 'resistance'] as Lab[]) {
  274 |     await mount(page, lab); await page.setViewportSize({ width: 320, height: 844 });
  275 |     const before = await state(page), note = editor(page, lab), text = '<img src=x onerror="window.__annotationInjected=true"> Literal learner text.';
> 276 |     await note.focus(); await note.press('Control+A'); await note.pressSequentially(text);
      |                                                                   ^ TimeoutError: locator.pressSequentially: Timeout 30000ms exceeded.
  277 |     await expect(note).toHaveValue(text); await expect(note).toBeFocused();
  278 |     const expected = noteChanged(before, lab, text); expect(await state(page)).toEqual(expected);
  279 |     expect(await page.evaluate(() => (window as any).__annotationInjected)).toBeUndefined();
  280 |     await expect(workspace(page, lab).locator('img[src="x"]')).toHaveCount(0); await noOverflow(page, lab);
  281 |     if (lab === 'resistance') await note.locator('..').screenshot({ path: path.join(out, 'annotation-resistance-phone.png') });
  282 |     await page.setViewportSize({ width: 1280, height: 960 });
  283 |     for (const zoom of [2, 4]) {
  284 |       await page.evaluate(value => { document.body.style.zoom = String(value); }, zoom);
  285 |       await note.focus(); await expect(note).toBeFocused(); await noOverflow(page, lab); expect(await state(page)).toEqual(expected);
  286 |     }
  287 |     if (lab === 'growth') await note.locator('..').screenshot({ path: path.join(out, 'annotation-zoom.png') });
  288 |     expect(await counters(page)).toEqual({ xp: [], random: 0 }); await harness.unmount(page);
  289 |   }
  290 | });
  291 | 
```