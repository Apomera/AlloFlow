# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: microbiology-notebook-recovery.spec.ts >> Mystery history compares saved citation membership and reasoning independently of working notes across restoration and reload
- Location: tests\e2e\microbiology-notebook-recovery.spec.ts:134:5

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 1

  Object {
    "claim": "bacterium",
    "evidence": Array [
-     "structure",
      "size",
+     "structure",
    ],
    "limitation": "bounded",
    "reasoning": "Current recorded explanation.",
  }
```

# Test source

```ts
  50  | const evidence = { dose: 30, duration: 3, initRes: 10, prediction: 'increase', notes: 'Original saved counts and prediction.',
  51  |   history: [{ day: 0, sensitive: 72, resistant: 8 }, { day: 1, sensitive: 60, resistant: 8 }] };
  52  | const context = { version: 1, specimen: 'ecoli', method: 'lightbright', mag: 1000, zoom: 20, fieldUm: 9, scaleUm: 2, referenceUm: 2 };
  53  | 
  54  | test('removed Resistance evidence resumes from Home and restores its identity and reflection without reviving comparison membership', async ({ page }) => {
  55  |   await mount(page, { tab: 'resistance', resistanceInvestigation: { ...evidence, dose: 60, notes: 'Independent live culture.' },
  56  |     resistanceNotebook: { records: [{ id: 3, evidence }, { id: 7, evidence, reviewNote: 'A later reflection on the original counts.' }], selectedId: 7, nextId: 12 },
  57  |     resistanceComparison: { aId: 3, bId: 7 } });
  58  |   const live = (await state(page)).resistanceInvestigation;
  59  |   await open(page.locator('.micro-resistance-saved'));
  60  |   await page.getByRole('button', { name: 'Remove selected evidence', exact: true }).press('Enter');
  61  |   await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  62  |   const removed = (await state(page)).resistanceNotebook.removed;
  63  |   expect(removed.record.id).toBe(7); expect(removed.index).toBe(1); expect(removed.record.reviewNote).toContain('later reflection');
  64  |   expect((await state(page)).resistanceComparison).toEqual({ aId: 3, bId: null });
  65  |   const exported = csv(await download(page, page.getByRole('button', { name: 'Download resistance CSV', exact: true }), 'resistance-active-after-removal.csv'));
  66  |   expect(exported.every(row => row.evidence_id === '3')).toBe(true);
  67  |   await page.locator('#micro-tab-home').press('Enter'); await phone(page);
  68  |   const panel = page.locator('#micro-content[role="tabpanel"]');
  69  |   await expect(panel).toHaveAttribute('aria-labelledby', 'micro-tab-home'); await expect(panel.locator('[data-work-card]')).toHaveCount(6);
  70  |   await expect(panel.locator('[data-work-recovery="resistance"]')).toContainText('Removed evidence 7');
  71  |   await panel.locator('[data-work-card="resistance"]').screenshot({ path: path.join(out, 'resistance-recovery-home-phone.png') });
  72  |   const bookBefore = (await state(page)).resistanceNotebook;
  73  |   await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  74  |   expect((await state(page)).resistanceNotebook).toEqual(bookBefore);
  75  |   await open(page.locator('#micro-resistance-removed-evidence details'));
  76  |   await page.locator('#micro-resistance-removed-evidence').screenshot({ path: path.join(out, 'resistance-removed-evidence-phone.png') });
  77  |   await reload(page); await expect(page.locator('#micro-resistance-removed-evidence')).toBeVisible();
  78  |   await page.locator('#micro-resistance-restore-removed').press('Enter'); await expect(page.locator('#micro-resistance-evidence-7')).toBeFocused();
  79  |   const saved = await state(page); expect(saved.resistanceNotebook.records.map((row: any) => row.id)).toEqual([3, 7]);
  80  |   expect(saved.resistanceNotebook.records[1]).toEqual(removed.record); expect(saved.resistanceNotebook.removed).toBeUndefined();
  81  |   expect(saved.resistanceComparison).toEqual({ aId: 3, bId: null }); expect(saved.resistanceInvestigation).toEqual(live);
  82  | });
  83  | 
  84  | test('removed-only and full imported Resistance notebooks offer explicit recovery without counting or evicting snapshots', async ({ page }) => {
  85  |   await mount(page, { tab: 'home', resistanceNotebook: { records: [], removed: { record: { id: 9, evidence, reviewNote: 'Keep this reflection.' }, index: 0 } } });
  86  |   await expect(page.locator('[data-work-card="resistance"] strong')).toHaveText('0');
  87  |   await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-restore-removed')).toBeFocused();
  88  |   await expect(page.getByRole('button', { name: 'Download resistance CSV', exact: true })).toBeDisabled();
  89  |   await page.locator('#micro-resistance-keep-removal').press('Enter'); await expect(page.locator('#micro-resistance-notebook-title')).toBeFocused();
  90  |   expect((await state(page)).resistanceNotebook.removed).toBeUndefined();
  91  |   await harness.unmount(page);
  92  |   const records = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, evidence }));
  93  |   await mount(page, { tab: 'home', resistanceNotebook: { records, removed: { record: { id: 9, evidence }, index: 7 } } });
  94  |   const before = (await state(page)).resistanceNotebook;
  95  |   await page.locator('[data-work-next="resistance"]').press('Enter'); await expect(page.locator('#micro-resistance-removed-evidence')).toBeFocused();
  96  |   await expect(page.locator('#micro-resistance-restore-removed')).toBeDisabled(); expect((await state(page)).resistanceNotebook).toEqual(before);
  97  |   await expect(page.locator('#micro-resistance-recovery-full')).toContainText('eight saved snapshots');
  98  | });
  99  | 
  100 | test('microscope CSV separates saved checks and unscored invalid drafts with their original calibration', async ({ page }) => {
  101 |   const draft = '=SUM(1,2)\n"unfinished"';
  102 |   await mount(page, { tab: 'microscope', scopeOrganism: 'phage', selectedScope: 'em', magnification: 10000, microscopeZoom: 4, microscopeFocus: 15,
  103 |     microscopeMeasurements: { ecoli: { result: { value: 2, unit: 'um', context }, previousResult: { value: 4000, unit: 'nm', context }, draft: { value: draft, unit: 'nm', context } },
  104 |       strep: { draft: { value: '1.2', unit: 'um', context: { ...context, specimen: 'strep', referenceUm: 1 } } } } });
  105 |   await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  106 |   const before = await state(page), button = page.locator('#micro-measurement-download-csv');
  107 |   const text = await download(page, button, 'microscope-checks-and-drafts.csv'), rows = csv(text);
  108 |   expect(rows.map(row => [row.specimen_id, row.record_kind])).toEqual([['ecoli', 'current_checked'], ['ecoli', 'previous_checked'], ['ecoli', 'pending_draft'], ['strep', 'pending_draft']]);
  109 |   expect(rows[1].estimate_um).toBe('4'); expect(rows[1].absolute_error_pct).toBe('100'); expect(rows[1].within_practice_band).toBe('false');
  110 |   expect(rows[2].original_value_text).toBe("'" + draft); expect(rows[2].estimate_um).toBe(''); expect(rows[2].value_status).toBe('invalid_numeric');
  111 |   for (const row of rows.slice(2)) { expect(row.reference_um).toBe(''); expect(row.absolute_error_pct).toBe(''); expect(row.within_practice_band).toBe(''); }
  112 |   expect(rows.every(row => row.viewing_method === 'lightbright' && row.magnification_x === '1000' && row.display_zoom_x === '20')).toBe(true);
  113 |   expect(await state(page)).toEqual(before); await expect(page.locator('#micro-measurement-csv-status')).toContainText('download has started');
  114 |   await phone(page); await page.locator('#micro-measurement-notebook-ecoli').screenshot({ path: path.join(out, 'microscope-csv-drafts-phone.png') });
  115 |   await reload(page); await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  116 |   await expect(page.locator('#micro-measurement-csv-status')).toHaveText('');
  117 |   expect(await download(page, button, 'microscope-checks-and-drafts-restored.csv')).toBe(text);
  118 | });
  119 | 
  120 | test('unchecked-only microscope evidence downloads as unscored CSV and failure remains retryable', async ({ page }) => {
  121 |   await mount(page, { tab: 'microscope', microscopeMeasurements: { ecoli: { draft: { value: '2.5', unit: 'um', context } } } });
  122 |   await page.getByRole('button', { name: /^Open measurement notebook/ }).click();
  123 |   await expect(page.getByRole('button', { name: 'Download measurement notebook', exact: true })).toBeDisabled();
  124 |   const button = page.locator('#micro-measurement-download-csv'), before = await state(page);
  125 |   await page.evaluate(() => { (window as any).__originalObjectURL = URL.createObjectURL; URL.createObjectURL = () => { throw new Error('Simulated download failure'); }; });
  126 |   await button.press('Enter'); await expect(page.locator('#micro-measurement-csv-status')).toContainText('try again'); await expect(button).toBeFocused();
  127 |   expect(await state(page)).toEqual(before);
  128 |   await page.evaluate(() => { URL.createObjectURL = (window as any).__originalObjectURL; delete (window as any).__originalObjectURL; });
  129 |   const rows = csv(await download(page, button, 'microscope-pending-only.csv'));
  130 |   expect(rows).toHaveLength(1); expect(rows[0].record_kind).toBe('pending_draft'); expect(rows[0].estimate_um).toBe('2.5'); expect(rows[0].absolute_error_pct).toBe('');
  131 |   expect(await state(page)).toEqual(before);
  132 | });
  133 | 
  134 | test('Mystery history compares saved citation membership and reasoning independently of working notes across restoration and reload', async ({ page }) => {
  135 |   const previous = { claim: 'bacterium', evidence: ['structure', 'behavior'], reasoning: 'First recorded explanation.', limitation: 'bounded' };
  136 |   const current = { ...previous, evidence: ['structure', 'size'], reasoning: 'Current recorded explanation.' };
  137 |   const draft = { ...current, reasoning: 'Independent unfinished working notes.', revealed: ['context', 'structure', 'size', 'behavior'], collapsed: ['behavior'], checked: true, reportView: 'recorded', record: current, previousRecord: previous };
  138 |   await mount(page, { tab: 'mystery', mysteryLab: { active: 'wall', cases: { wall: draft } } });
  139 |   const before = await state(page), history = page.locator('[data-mystery-history="wall"]'); await open(history);
  140 |   const comparison = page.locator('[data-mystery-history-comparison="wall"]');
  141 |   await expect(comparison.locator('[data-mystery-history-fields]')).toHaveText('Fields that differ: Cited observations; Written reasoning.');
  142 |   await expect(comparison.locator('[data-history-citations="previous"]')).toContainText('Behavior and reproduction');
  143 |   await expect(comparison.locator('[data-history-citations="current"]')).toContainText('Size and shape');
  144 |   await expect(comparison.locator('[data-mystery-history-change="reasoning"] [data-history-version="previous"]')).toContainText(previous.reasoning);
  145 |   await expect(comparison.locator('[data-mystery-history-change="reasoning"] [data-history-version="current"]')).toContainText(current.reasoning);
  146 |   await expect(comparison).not.toContainText(draft.reasoning); expect(await state(page)).toEqual(before);
  147 |   await phone(page); await history.screenshot({ path: path.join(out, 'mystery-history-comparison-phone.png') });
  148 |   await history.getByRole('button', { name: 'Restore previous report', exact: true }).press('Enter'); await expect(page.locator('#micro-mystery-report-heading')).toBeFocused();
  149 |   let saved = (await state(page)).mysteryLab.cases.wall;
> 150 |   expect(saved.record).toEqual(previous); expect(saved.previousRecord).toEqual(current);
      |                                                                        ^ Error: expect(received).toEqual(expected) // deep equality
  151 |   for (const key of ['reasoning', 'collapsed', 'revealed', 'checked', 'reportView']) expect(saved[key]).toEqual(draft[key as keyof typeof draft]);
  152 |   await expect(comparison.locator('[data-history-citations="current"]')).toContainText('Behavior and reproduction');
  153 |   await reload(page); await open(history); await history.getByRole('button', { name: 'Restore previous report', exact: true }).press('Enter');
  154 |   saved = (await state(page)).mysteryLab.cases.wall; expect(saved.record).toEqual(current); expect(saved.previousRecord).toEqual(previous); expect(saved.reasoning).toBe(draft.reasoning);
  155 | });
  156 | 
```