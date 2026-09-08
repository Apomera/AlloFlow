# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dissection-reference-workbench.spec.ts >> changing layers clears recall drafts, self-ratings, and revealed answers
- Location: tests\e2e\dissection-reference-workbench.spec.ts:189:5

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for locator('[data-layer-search-result="tympanum"] button')

```

# Test source

```ts
  95  |   await harness.mount(page, { dissection: { ...state, compareMode: false, selectedOrgan: null, organNotes: { 'frog|heart': 'The heart sits between the lungs.' }, organConfidence: { 'frog|heart': 2 } } }, undefined, { expectCanvas: false });
  96  |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  97  |   const notesFilter = page.locator('[data-directory-filter="needs-record"]');
  98  |   await notesFilter.focus();
  99  |   await page.keyboard.press('Enter');
  100 |   await expect(notesFilter).toBeFocused();
  101 |   await expect(notesFilter).toHaveAttribute('aria-pressed', 'true');
  102 |   await expect(page.locator('#diss-directory-results > button')).toHaveCount(1);
  103 |   await expect(page.locator('#diss-organ-lungs')).toBeVisible();
  104 |   const search = page.locator('#diss-organ-search');
  105 |   await search.fill('heart');
  106 |   await expect(page.locator('.diss-directory-empty')).toContainText('progress filter');
  107 |   await page.getByRole('button', { name: 'Clear search and filters', exact: true }).click();
  108 |   await expect(search).toBeFocused();
  109 |   await expect(page.locator('[data-directory-filter="all"]')).toHaveAttribute('aria-pressed', 'true');
  110 |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection.organNotes['frog|heart'])).toBe('The heart sits between the lungs.');
  111 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  112 |   const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['[data-dissection-directory]'], ['.diss-mission-shortcuts']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  113 |   expect(audit.violations.map((v: any) => v.id)).toEqual([]);
  114 |   const overflow = await page.locator('[data-dissection-directory]').evaluate(el => el.scrollWidth - el.clientWidth);
  115 |   expect(overflow).toBeLessThanOrEqual(1);
  116 |   await page.locator('[data-dissection-directory]').screenshot({ path: out + '/discovery-mobile.png' });
  117 |   await page.locator('[data-dissection-mission]').screenshot({ path: out + '/workspace-shortcuts-mobile.png' });
  118 | });
  119 | 
  120 | 
  121 | test('recall practice supports keyboard review rounds without changing evidence or scores', async ({ page }) => {
  122 |   const errors: string[] = [];
  123 |   page.on('pageerror', error => errors.push(error.message));
  124 |   await page.setViewportSize({ width: 1180, height: 900 });
  125 |   const evidence = { 'frog|heart': true };
  126 |   const notes = { 'frog|heart': 'Observed between the lungs.' };
  127 |   await harness.mount(page, { dissection: { ...state, compareMode: false, flashcardMode: true, selectedOrgan: null,
  128 |     exploredOrgans: evidence, organNotes: notes, organConfidence: { 'frog|heart': 2 },
  129 |     verifiedIdentifications: { 'frog|heart': true }, quizScore: 2, quizTotal: 3, quizReviewQueue: ['lungs'] } }, undefined, { expectCanvas: false });
  130 |   const panel = page.locator('#diss-flashcard-panel');
  131 |   const prompt = panel.locator('#diss-flashcard-prompt');
  132 |   const draft = panel.locator('#diss-flashcard-draft');
  133 |   await draft.fill('It pumps blood around the body.');
  134 |   await panel.locator('.diss-flashcard').focus();
  135 |   await page.keyboard.press('Enter');
  136 |   await expect(panel.locator('#diss-flashcard-answer')).toBeVisible();
  137 |   await panel.getByRole('button', { name: 'Review again', exact: true }).click();
  138 |   await expect(prompt).toHaveText('Lungs');
  139 |   await expect(prompt).toBeFocused();
  140 |   await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  141 |   await panel.getByRole('button', { name: 'Previous flashcard' }).click();
  142 |   await expect(draft).toHaveValue('It pumps blood around the body.');
  143 |   await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  144 |   await panel.getByRole('button', { name: 'Next without rating', exact: true }).click();
  145 |   await panel.locator('.diss-flashcard').click();
  146 |   await panel.getByRole('button', { name: 'Recalled it', exact: true }).click();
  147 |   for (let i = 0; i < 9; i++) await panel.getByRole('button', { name: 'Next without rating', exact: true }).click();
  148 |   await panel.getByRole('button', { name: 'Finish round without rating', exact: true }).click();
  149 |   await expect(panel.locator('#diss-flashcard-summary')).toBeFocused();
  150 |   await expect(panel.getByRole('button', { name: 'Review marked cards (1)', exact: true })).toBeVisible();
  151 |   await expect(panel.getByRole('button', { name: 'Try unrated cards (10)', exact: true })).toBeVisible();
  152 |   await panel.screenshot({ path: out + '/recall-summary-desktop.png' });
  153 |   await panel.getByRole('button', { name: 'Review marked cards (1)', exact: true }).click();
  154 |   await expect(prompt).toHaveText('Heart (3-chamber)');
  155 |   await expect(panel.locator('[data-flashcard-counter]')).toHaveText('1 / 1');
  156 |   await expect(draft).toHaveValue('It pumps blood around the body.');
  157 |   await panel.locator('.diss-flashcard').click();
  158 |   await panel.getByRole('button', { name: 'Recalled it', exact: true }).click();
  159 |   await expect(panel.getByRole('button', { name: /Review marked cards/ })).toHaveCount(0);
  160 |   await expect(panel.locator('[data-recall-stat="recalled"] dd')).toHaveText('2');
  161 |   const actual = await page.evaluate(() => {
  162 |     const d = (window as any).__ctx.toolData.dissection;
  163 |     return { explored: d.exploredOrgans, notes: d.organNotes, confidence: d.organConfidence, verified: d.verifiedIdentifications, score: d.quizScore, total: d.quizTotal, queue: d.quizReviewQueue };
  164 |   });
  165 |   expect(actual).toEqual({ explored: evidence, notes, confidence: { 'frog|heart': 2 }, verified: { 'frog|heart': true }, score: 2, total: 3, queue: ['lungs'] });
  166 |   await panel.getByRole('button', { name: 'Return to specimen', exact: true }).click();
  167 |   await expect(page.locator('#diss-canvas')).toBeFocused();
  168 |   await expect(panel).toHaveCount(0);
  169 |   expect(errors).toEqual([]);
  170 | });
  171 | 
  172 | test('phone recall prompt and revealed reference reflow and pass accessibility checks', async ({ page }) => {
  173 |   await page.setViewportSize({ width: 390, height: 844 });
  174 |   await harness.mount(page, { dissection: { ...state, compareMode: false, flashcardMode: true, selectedOrgan: null } }, undefined, { expectCanvas: false });
  175 |   await page.addStyleTag({ content: '#wrap { width: 100% !important; max-width: 1180px; }' });
  176 |   const panel = page.locator('#diss-flashcard-panel');
  177 |   await page.addScriptTag({ path: 'node_modules/axe-core/axe.min.js' });
  178 |   for (const revealed of [false, true]) {
  179 |     if (revealed) await panel.locator('.diss-flashcard').click();
  180 |     const audit = await page.evaluate(async () => (window as any).axe.run({ include: [['#diss-flashcard-panel']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }));
  181 |     expect(audit.violations.map((v: any) => ({ id: v.id, targets: v.nodes.map((n: any) => n.target) }))).toEqual([]);
  182 |     const bounds = await panel.evaluate(el => ({ overflow: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right }));
  183 |     expect(bounds.overflow).toBeLessThanOrEqual(1);
  184 |     expect(bounds.right).toBeLessThanOrEqual(390);
  185 |     await panel.screenshot({ path: out + (revealed ? '/recall-answer-mobile.png' : '/recall-prompt-mobile.png') });
  186 |   }
  187 | });
  188 | 
  189 | test('changing layers clears recall drafts, self-ratings, and revealed answers', async ({ page }) => {
  190 |   await harness.mount(page, { dissection: { ...state, compareMode: false, flashcardMode: true, selectedOrgan: null,
  191 |     revealedLayers: { skin: true, muscle: true }, _flashcardPractice: { scope: 'frog|organs', index: 11, revealed: true, drafts: { heart: 'Old draft' }, ratings: { heart: 'again' } } } }, undefined, { expectCanvas: false });
  192 |   // Use the ordinary directory route into another available layer.
  193 |   await page.getByRole('button', { name: 'Structures and notes', exact: true }).click();
  194 |   await page.locator('#diss-organ-search').fill('tympanum');
> 195 |   await page.locator('[data-layer-search-result="tympanum"] button').click();
      |                                                                      ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  196 |   const panel = page.locator('#diss-flashcard-panel');
  197 |   await expect(panel.locator('[data-flashcard-counter]')).toContainText('1 /');
  198 |   await expect(panel.locator('#diss-flashcard-answer')).toBeHidden();
  199 |   await expect(panel.locator('[data-recall-stat="again"] dd')).toHaveText('0');
  200 |   await expect(panel.locator('#diss-flashcard-draft')).toHaveValue('');
  201 |   expect(await page.evaluate(() => (window as any).__ctx.toolData.dissection._flashcardPractice)).toBeNull();
  202 | });
  203 | 
  204 | 
```