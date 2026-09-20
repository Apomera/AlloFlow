# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: remediation_continuity.spec.ts >> results lead with accurate static-scope verification and optional repair tools use native disclosure
- Location: tests\e2e\remediation_continuity.spec.ts:730:5

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  locator('.pdf-workspace-primary')
Expected: "Review tested scope"
Received: "Review verification →"
Timeout:  15000ms

Call log:
  - Expect "toHaveText" with timeout 15000ms
  - waiting for locator('.pdf-workspace-primary')
    33 × locator resolved to <button type="button" class="pdf-workspace-primary">…</button>
       - unexpected value "Review verification →"

```

```yaml
- button "Review verification"
```

# Test source

```ts
  637 |     score: 91, fileName: 'new-result.docx', fileSize: 100, pageCount: 1,
  638 |     critical: [], serious: [], moderate: [], minor: [], _auditFinalized: true,
  639 |   }));
  640 |   await expect(page.locator('[data-help-key="pdf_audit_results_score_badge"]')).toContainText('91');
  641 |   await expect(page.locator('[data-help-key="pdf_audit_view_close_btn"]')).toBeEnabled();
  642 |   await page.evaluate(async () => {
  643 |     (window as any).__visibleAudits[0].resolve({ score: 37, fileName: 'late-old-result.docx' });
  644 |     await new Promise(resolve => setTimeout(resolve, 350));
  645 |   });
  646 |   await expect(page.locator('[data-help-key="pdf_audit_results_score_badge"]')).toContainText('91');
  647 |   expect(await page.evaluate(() => {
  648 |     const w = window as any;
  649 |     return { name: w.__modalState.pdfAuditResult.fileName, loading: w.__modalState.pdfAuditLoading, fixes: w.__visibleAuditFixes };
  650 |   })).toEqual({ name: 'new-result.docx', loading: false, fixes: 0 });
  651 |   expect(errors).toEqual([]);
  652 | });
  653 | 
  654 | test('initial audit wait explanations and countdown remain readable on a phone in dark and contrast themes', async ({ page }) => {
  655 |   await page.setViewportSize({ width: 390, height: 900 });
  656 |   const { errors } = await mountWorkspace(page);
  657 |   await deferVisibleAudits(page);
  658 |   await page.clock.install();
  659 |   await page.evaluate(() => {
  660 |     const w = window as any;
  661 |     w.__auditWaitSnapshot = { reason: 'pacing', until: Date.now() + 3000 };
  662 |     w.__auditWaitEpochs = [];
  663 |     w.__setModalState({ theme: 'dark', _docPipeline: Object.assign({}, w.__modalState._docPipeline, {
  664 |       getPdfAuditWait: (epoch: number) => {
  665 |         w.__auditWaitEpochs.push(epoch);
  666 |         const current = w.__auditWaitSnapshot;
  667 |         return { reason: current.reason, remainingMs: current.until ? Math.max(0, current.until - Date.now()) : null,
  668 |           pacingMs: 0, recoveryMs: 0, queueMs: 0, extraRequestPacing: true };
  669 |       },
  670 |     }) });
  671 |   });
  672 |   await page.locator('[data-help-key="pdf_audit_view_make_accessible_btn"]').click();
  673 |   const wait = page.locator('[data-audit-wait]');
  674 |   const status = page.getByTestId('pdf-workspace-header').getByRole('status');
  675 |   await expect(wait).toHaveAttribute('data-audit-wait', 'pacing');
  676 |   await expect(wait.getByRole('status')).toContainText('Spacing out AI requests');
  677 |   await expect(status).toHaveText('Audit: spacing AI requests');
  678 |   await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 3s.');
  679 |   await page.clock.runFor(1000);
  680 |   await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 2s.');
  681 |   await page.evaluate(() => { (window as any).__auditWaitSnapshot = { reason: 'queue', until: null }; });
  682 |   await page.clock.runFor(1000);
  683 |   await expect(wait.getByRole('status')).toContainText('Waiting for another AI request to finish');
  684 |   await expect(status).toHaveText('Audit: AI request queued');
  685 |   await expect(wait.locator('[aria-hidden="true"]')).toHaveCount(0);
  686 |   await page.evaluate(() => { (window as any).__auditWaitSnapshot = { reason: 'recovery', until: Date.now() + 6000 }; });
  687 |   await page.clock.runFor(1000);
  688 |   await expect(wait.getByRole('status')).toContainText('Waiting before retrying the AI service');
  689 |   await expect(status).toHaveText('Audit: waiting for AI service');
  690 |   await expect(wait.locator('[aria-hidden="true"]')).toHaveText('Next request in about 5s.');
  691 |   await page.addScriptTag({ path: path.join(ROOT, 'node_modules/axe-core/axe.min.js') });
  692 |   await page.clock.resume();
  693 |   for (const theme of ['dark', 'contrast']) {
  694 |     await page.evaluate(theme => (window as any).__setModalState({ theme }), theme);
  695 |     const shell = page.locator('.pdf-workspace-shell');
  696 |     await expect.poll(() => shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  697 |     const violations = await page.evaluate(async () => (await (window as any).axe.run({ include: [
  698 |       ['.pdf-workspace-header'], ['[data-audit-wait]'], ['[data-help-key="pdf_audit_stop"]'],
  699 |     ] })).violations);
  700 |     expect(violations, theme).toEqual([]);
  701 |   }
  702 |   expect(await page.evaluate(() => [...new Set((window as any).__auditWaitEpochs)])).toEqual([4]);
  703 |   await page.getByRole('button', { name: 'Stop audit', exact: true }).click();
  704 |   await expect(wait).toHaveCount(0);
  705 |   expect(errors).toEqual([]);
  706 | });
  707 | 
  708 | 
  709 | // Bind completed result fixtures to their exact HTML, as finalization does.
  710 | async function completeResult(page: Page, patch: any = {}) {
  711 |   await setResult(page, {
  712 |     verificationState: 'complete', verificationReasons: [], _aiVerificationIncomplete: false,
  713 |     verificationCoverage: { standard: 'WCAG 2.2 AA', ai: 'complete', axe: 'complete', equalAccess: 'complete' },
  714 |     verificationAudit: { score: 100, issues: [], critical: [], serious: [], moderate: [], minor: [] },
  715 |     axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 0, incomplete: [], critical: [], serious: [], moderate: [], minor: [], passes: [] },
  716 |     secondEngineAudit: { score: 100, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0, fails: [], potentialFindings: [], manualFindings: [] },
  717 |     ...patch,
  718 |   });
  719 |   const html = await page.evaluate(() => (window as any).__modalState.pdfFixResult.accessibleHtml);
  720 |   const crypto = await import('node:crypto');
  721 |   const binding = { version: 1, algorithm: 'SHA-256', digest: crypto.createHash('sha256').update(html).digest('hex'), utf8ByteLength: Buffer.byteLength(html) };
  722 |   await page.evaluate(binding => {
  723 |     const w = window as any; const result = { ...w.__modalState.pdfFixResult, verificationHtmlBinding: binding };
  724 |     Object.defineProperty(result, '_verificationHtmlSnapshot', { value: result.accessibleHtml, enumerable: false });
  725 |     Object.defineProperty(result, '_verificationHtmlBindingDigest', { value: binding.digest, enumerable: false });
  726 |     w.__setModalState({ pdfFixResult: result });
  727 |   }, binding);
  728 | }
  729 | 
  730 | test('results lead with accurate static-scope verification and optional repair tools use native disclosure', async ({ page }) => {
  731 |   const { errors } = await mountWorkspace(page);
  732 |   await completeResult(page, { verificationState: 'complete-for-tested-scope', verificationReasons: ['static-source-audit'] });
  733 |   const verification = page.locator('#pdf-verification-status');
  734 |   const repairs = page.locator('#pdf-additional-repairs');
  735 |   await expect(verification.getByRole('heading')).toHaveText('WCAG verification: Complete for static source');
  736 |   await expect(verification).toContainText('Review keyboard navigation and live interactions');
> 737 |   await expect(page.locator('.pdf-workspace-primary')).toHaveText('Review tested scope');
      |                                                        ^ Error: expect(locator).toHaveText(expected) failed
  738 |   expect(await verification.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('#pdf-additional-repairs')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  739 |   await expect(repairs).not.toHaveAttribute('open');
  740 |   const summary = repairs.locator('summary'); await summary.focus(); await page.keyboard.press('Enter');
  741 |   await expect(repairs).toHaveAttribute('open', '');
  742 |   await page.keyboard.press('Tab'); await expect(repairs.getByRole('button').first()).toBeFocused();
  743 |   await summary.focus(); await page.keyboard.press('Space'); await expect(repairs).not.toHaveAttribute('open');
  744 |   await page.locator('.pdf-workspace-primary').click(); await expect(verification).toBeFocused();
  745 |   expect(errors).toEqual([]);
  746 | });
  747 | 
  748 | test('results next action follows incomplete checks, manual review, repair findings and preservation concerns', async ({ page }) => {
  749 |   const { errors } = await mountWorkspace(page);
  750 |   await setResult(page); const primary = page.locator('.pdf-workspace-primary');
  751 |   await expect(primary).toHaveText('Review verification');
  752 |   await primary.click(); await expect(page.locator('#pdf-verification-status')).toBeFocused();
  753 |   await completeResult(page, {
  754 |     verificationState: 'review-required',
  755 |     axeAudit: { score: 100, totalViolations: 0, totalIncomplete: 1, critical: [], serious: [], moderate: [], minor: [], incomplete: [{ id: 'color-contrast', description: 'Check the contrast against the image background.', nodes: [] }] },
  756 |   });
  757 |   await expect(primary).toHaveText('Review findings'); await primary.click();
  758 |   await expect(page.locator('#pdf-review-findings')).toBeFocused();
  759 |   await expect(page.locator('#pdf-review-findings')).toContainText('Check the contrast against the image background.');
  760 |   await completeResult(page, { verificationState: 'review-required', verificationAudit: { score: 90, issues: [{ id: 'link-name', severity: 'serious', issue: 'Name the link' }], critical: [], serious: [], moderate: [], minor: [] } });
  761 |   await expect(primary).toHaveText('Review repair options'); await primary.click();
  762 |   await expect(page.locator('#pdf-additional-repairs')).toHaveAttribute('open', '');
  763 |   await expect(page.locator('#pdf-additional-repairs > summary')).toBeFocused();
  764 |   await completeResult(page, { fidelityLimited: true, fidelityNotes: ['Compare the table wording with the source.'] });
  765 |   await expect(primary).toHaveText('Review document preservation'); await primary.click();
  766 |   await expect(page.locator('#pdf-content-fidelity-review')).toBeFocused();
  767 |   await expect(page.locator('#pdf-content-fidelity-review')).toContainText('Compare the table wording with the source.');
  768 |   expect(errors).toEqual([]);
  769 | });
  770 | 
  771 | test('export formats use native tab order and preserve focus after forwarding a download', async ({ page }) => {
  772 |   const { errors } = await mountWorkspace(page); await setResult(page);
  773 |   await page.evaluate(() => (window as any).__setModalState({ pendingPdfFile: { name: 'sample.pdf', type: 'application/pdf', size: 100 } }));
  774 |   await page.getByTestId('pdf-workspace-header').getByRole('button', { name: 'Downloads', exact: true }).click();
  775 |   const formats = page.getByRole('group', { name: 'Export formats', exact: true });
  776 |   await expect(formats).toBeVisible(); await expect(formats.getByRole('menuitem')).toHaveCount(0);
  777 |   await expect(formats.getByRole('button', { name: /Tagged PDF/ })).toHaveText(/Tagged PDF \(\.pdf\)/);
  778 |   await page.keyboard.press('Tab'); await expect(formats.getByRole('button', { name: /Tagged PDF/ })).toBeFocused();
  779 |   await page.keyboard.press('Tab'); const word = formats.getByRole('button', { name: /Word/ }); await expect(word).toBeFocused();
  780 |   await page.evaluate(() => {
  781 |     const w = window as any; w.__forwardedWordExports = 0;
  782 |     document.querySelector('#allo-export-docx')!.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); w.__forwardedWordExports++; }, true);
  783 |   });
  784 |   await page.keyboard.press('Enter');
  785 |   expect(await page.evaluate(() => (window as any).__forwardedWordExports)).toBe(1);
  786 |   await expect(word).toBeFocused(); await expect(formats).toBeVisible();
  787 |   expect(errors).toEqual([]);
  788 | });
  789 | 
```