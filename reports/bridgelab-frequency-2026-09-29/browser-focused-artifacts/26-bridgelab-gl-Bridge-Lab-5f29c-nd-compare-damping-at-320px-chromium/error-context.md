# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 26-bridgelab-gl.spec.ts >> Bridge Lab — real WebGL >> earthquake frequency investigation >> scan, select, inspect and compare damping at 320px
- Location: tests\e2e\26-bridgelab-gl.spec.ts:792:11

# Error details

```
TimeoutError: locator.click: Timeout 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: 'Try 20% damping', exact: true })

```

# Test source

```ts
  744 |       await expect(timeline.locator('[data-seismic-comparison-curves] polyline')).toHaveCount(2);
  745 |       await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-motion.png', COMPARISON_REPORT);
  746 |       await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('acceleration');
  747 |       await expect(page.locator('[data-seismic-comparison-curves]')).toHaveAttribute('data-seismic-comparison-curves', 'acceleration');
  748 |       await expect(page.locator('[data-seismic-compare-frame]')).toContainText(' g');
  749 |       await page.getByRole('combobox', { name: 'Comparison measure', exact: true }).selectOption('stored');
  750 |       await expect(page.locator('[data-seismic-compare-frame]')).toContainText('J/kg');
  751 |       await captureImmersiveRegion(page, timeline, 'bridge-' + width + '-comparison-energy.png', COMPARISON_REPORT);
  752 |       await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Added damping: 20%');
  753 |       await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
  754 |       await page.getByRole('combobox', { name: 'Earthquake reference trial', exact: true }).selectOption('1');
  755 |       await expect(page.getByRole('combobox', { name: 'Timeline reference trial', exact: true })).toHaveValue('1');
  756 |       const identical = await timeline.locator('[data-seismic-comparison-curves] polyline').evaluateAll(lines => lines.map(line => line.getAttribute('points')));
  757 |       expect(identical[0]).toBe(identical[1]);
  758 |       await page.getByRole('button', { name: 'Restore earthquake trial 1: Reference: 5% damping', exact: true }).click();
  759 |       const frequency = page.getByRole('slider', { name: 'Ground shaking frequency (Hz)', exact: true });
  760 |       await frequency.press('End');
  761 |       await expect(comparison).toContainText('The ground motion differs');
  762 |       await page.getByRole('button', { name: 'Use reference shaking', exact: true }).click();
  763 |       await expect(comparison).toContainText('Changed settings: Damping ratio (%)');
  764 |       await expect(comparison).toContainText('Both trials use the same ground motion');
  765 |       await captureImmersiveRegion(page, comparison, 'bridge-' + width + '-comparison-table.png', COMPARISON_REPORT);
  766 |       if (width === 320) {
  767 |         const tableRegion = page.getByRole('region', { name: 'Saved earthquake trial comparison table', exact: true });
  768 |         await expect(tableRegion.locator('[data-seismic-cell-label]').first()).toBeVisible();
  769 |         expect(await tableRegion.evaluate(element => {
  770 |           const bounds = element.getBoundingClientRect();
  771 |           return [...element.querySelectorAll('[data-seismic-cell-value]')].every(value => {
  772 |             const box = value.getBoundingClientRect();
  773 |             return box.left >= bounds.left && box.right <= bounds.right;
  774 |           });
  775 |         })).toBe(true);
  776 |       }
  777 |       await checkWorkflowHealth(page);
  778 |       const expectedRows = await comparison.locator('tbody').textContent();
  779 |       await page.getByRole('button', { name: 'Open earthquake evidence report', exact: true }).click();
  780 |       const printed = page.locator('[data-bridge-print-seismic]');
  781 |       await expect(printed.locator('[data-seismic-trial-comparison]')).toContainText('Reference: Added damping: 20%');
  782 |       expect(await printed.locator('[data-seismic-trial-comparison] tbody').textContent()).toBe(expectedRows);
  783 |       await expect(printed.locator('button,input,select,textarea')).toHaveCount(0);
  784 |       await captureImmersiveRegion(page, printed, 'bridge-' + width + '-comparison-report.png', COMPARISON_REPORT);
  785 |       await checkWorkflowHealth(page);
  786 |     });
  787 |   }
  788 | 
  789 |   test.describe('earthquake frequency investigation', () => {
  790 |     test.use({ hasTouch: true });
  791 |     for (const width of [1000, 320]) {
  792 |       test('scan, select, inspect and compare damping at ' + width + 'px', async ({ page }) => {
  793 |         await mkdir(FREQUENCY_REPORT, { recursive: true });
  794 |         await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true,
  795 |           seismicTime: 6, seismicFrequencyHz: 2, seismicDampingRatio: 0.05 });
  796 |         const stage = page.locator('[data-allo-fs-stage]');
  797 |         const before = await page.evaluate(() => (window as any).__gl());
  798 |         const scan = page.locator('[data-bridge-seismic-scan]');
  799 |         await scan.locator('summary').click();
  800 |         await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'idle');
  801 |         await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
  802 |         await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
  803 |         const points = (await scan.locator('[data-seismic-scan-curve]').getAttribute('points'))!.split(' ');
  804 |         expect(points.length).toBe(57);
  805 |         expect(points.join(' ')).not.toMatch(/NaN|Infinity/);
  806 |         expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(6);
  807 |         const slider = page.getByRole('slider', { name: 'Select scanned frequency (Hz)', exact: true });
  808 |         await slider.scrollIntoViewIfNeeded();
  809 |         const box = await slider.boundingBox();
  810 |         if (!box) throw new Error('Frequency curve is not visible');
  811 |         if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  812 |         else {
  813 |           await page.mouse.move(box.x + box.width / 4, box.y + box.height / 2);
  814 |           await page.mouse.down();
  815 |           await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 4 });
  816 |           await page.mouse.up();
  817 |         }
  818 |         await expect(slider).toHaveAttribute('aria-valuenow', '1.6');
  819 |         await expect(slider).toBeFocused();
  820 |         await slider.press('Home');
  821 |         await expect(page.getByRole('button', { name: 'Previous frequency', exact: true })).toBeDisabled();
  822 |         await slider.press('PageUp');
  823 |         await expect(slider).toHaveAttribute('aria-valuenow', '0.45');
  824 |         await slider.press('End');
  825 |         await expect(page.getByRole('button', { name: 'Next frequency', exact: true })).toBeDisabled();
  826 |         await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
  827 |         const selected = Number(await slider.getAttribute('aria-valuenow'));
  828 |         expect(selected).toBeGreaterThanOrEqual(1);
  829 |         expect(selected).toBeLessThanOrEqual(1.2);
  830 |         expect(await page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(2);
  831 |         const baselinePeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
  832 |         await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-motion.png', FREQUENCY_REPORT);
  833 |         await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
  834 |         await expect(page.locator('[aria-describedby="bridge-gl-description"]')).toBeFocused();
  835 |         await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicFrequencyHz)).toBe(selected);
  836 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  837 |         await stage.scrollIntoViewIfNeeded();
  838 |         await expect.poll(() => page.evaluate(() => (window as any).__gl().relativeOffsetM)).not.toBe(before.relativeOffsetM);
  839 |         expect(await page.evaluate(() => (window as any).__gl().sceneBuilds)).toBe(before.sceneBuilds);
  840 |         await captureImmersiveRegion(page, stage, 'bridge-' + width + '-frequency-inspection.png', FREQUENCY_REPORT);
  841 |         await page.getByRole('textbox', { name: 'Earthquake trial name', exact: true }).fill('Largest scanned motion: 5% damping');
  842 |         await page.getByRole('button', { name: 'Save earthquake trial', exact: true }).click();
  843 |         expect(await page.evaluate(() => (window as any).__bucket().seismicTrials[0].inputs.groundFrequencyHz)).toBe(selected);
> 844 |         await page.getByRole('button', { name: 'Try 20% damping', exact: true }).click();
      |                                                                                  ^ TimeoutError: locator.click: Timeout 30000ms exceeded.
  845 |         await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'stale');
  846 |         await expect(scan.locator('[data-seismic-scan-results]')).toHaveCount(0);
  847 |         await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
  848 |         await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
  849 |         await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
  850 |         const dampedPeak = await scan.locator('[data-seismic-scan-selected]').evaluate(element => parseFloat(element.children[1].textContent!.split(': ')[1]));
  851 |         expect(dampedPeak).toBeLessThan(baselinePeak);
  852 |         await page.getByRole('combobox', { name: 'Frequency scan measure', exact: true }).selectOption('acceleration');
  853 |         await expect(slider).toHaveAttribute('aria-valuetext', / g$/);
  854 |         await page.getByRole('button', { name: 'Select largest response', exact: true }).click();
  855 |         await captureImmersiveRegion(page, scan, 'bridge-' + width + '-frequency-acceleration.png', FREQUENCY_REPORT);
  856 |         await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
  857 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  858 |         await checkWorkflowHealth(page);
  859 |       });
  860 |     }
  861 |     test('zero-input scan remains usable in reduced-motion 2D mode', async ({ page }) => {
  862 |       await page.emulateMedia({ reducedMotion: 'reduce' });
  863 |       await mountWorkflow(page, 320, { seismicEnabled: true, seismicIntensityG: 0 });
  864 |       await page.getByRole('button', { name: 'Labelled 2D view', exact: true }).click();
  865 |       const scan = page.locator('[data-bridge-seismic-scan]');
  866 |       await scan.locator('summary').click();
  867 |       await page.getByRole('button', { name: 'Run frequency scan', exact: true }).click();
  868 |       await expect(scan.locator('[data-seismic-scan-status]')).toHaveAttribute('data-seismic-scan-status', 'complete', { timeout: 60000 });
  869 |       await expect(scan).toContainText('All responses are zero');
  870 |       await expect(page.getByRole('button', { name: 'Select largest response', exact: true })).toBeDisabled();
  871 |       await page.getByRole('button', { name: 'Next frequency', exact: true }).click();
  872 |       await page.getByRole('button', { name: 'Inspect this frequency', exact: true }).click();
  873 |       await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  874 |       expect(await page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0);
  875 |       expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  876 |       await checkWorkflowHealth(page);
  877 |     });
  878 |   });
  879 | 
  880 |   test.describe('earthquake replay', () => {
  881 |     test.use({ hasTouch: true });
  882 |     for (const fallback of [false, true]) {
  883 |       test('WebGL loss exits ' + (fallback ? 'fill-frame' : 'native fullscreen') + ' and preserves a usable focused fallback', async ({ page }) => {
  884 |         await mountWorkflow(page, 1000, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  885 |         const stage = page.locator('[data-allo-fs-stage]');
  886 |         if (fallback) await stage.evaluate(element => {
  887 |           Object.defineProperty(element, 'requestFullscreen', { configurable: true, value: () => Promise.reject(new Error('Exercise fill-frame fallback')) });
  888 |         });
  889 |         await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  890 |         await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  891 |         await expect.poll(() => stage.evaluate(element => (element as any).__alloFsOn === true || document.fullscreenElement === element)).toBe(true);
  892 |         await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  893 |         await page.getByRole('button', { name: 'Pause scene replay', exact: true }).focus();
  894 |         await page.evaluate(() => {
  895 |           const canvas = document.querySelector('canvas[data-bridge-gl]') as HTMLCanvasElement;
  896 |           const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
  897 |           const extension = context?.getExtension('WEBGL_lose_context');
  898 |           if (!extension) throw new Error('WebGL loss extension unavailable');
  899 |           extension.loseContext();
  900 |         });
  901 |         await expect(page.locator('[data-bridge-elevation]')).toBeFocused();
  902 |         await expect(page.locator('[data-bridge-elevation]')).toBeVisible();
  903 |         await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  904 |         expect(await stage.evaluate(element => !!(element as any).__alloFsOn)).toBe(false);
  905 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  906 |         const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
  907 |         await chart.press('End');
  908 |         await expect(chart).toHaveAttribute('aria-valuenow', '24');
  909 |         if (fallback) expect(await page.evaluate(() => document.body.style.overflow)).not.toBe('hidden');
  910 |         await checkWorkflowHealth(page);
  911 |       });
  912 |     }
  913 |     for (const width of [1000, 320]) {
  914 |       test('scene controls, fullscreen and synchronized timeline at ' + width + 'px', async ({ page }) => {
  915 |         await mkdir(REPLAY_REPORT, { recursive: true });
  916 |         await mountWorkflow(page, width, { bridgeView: 'immersive', seismicEnabled: true, seismicTime: 7.2 });
  917 |         const stage = page.locator('[data-allo-fs-stage]');
  918 |         const scene = page.getByRole('group', { name: 'Earthquake scene replay', exact: true });
  919 |         await expect(scene).toBeVisible();
  920 |         await page.getByLabel('Scene replay speed', { exact: true }).selectOption('0.25');
  921 |         await expect(page.getByLabel('Replay speed', { exact: true })).toHaveValue('0.25');
  922 |         await stage.scrollIntoViewIfNeeded();
  923 |         const before = await page.evaluate(() => (window as any).__gl());
  924 |         await captureImmersiveRegion(page, stage, 'bridge-' + width + '-scene-replay.png', REPLAY_REPORT);
  925 |         await page.getByRole('button', { name: 'View the 3D bridge fullscreen', exact: true }).click();
  926 |         await expect(page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true })).toBeVisible();
  927 |         await expect(scene).toBeVisible();
  928 |         await page.getByRole('button', { name: 'Replay scene', exact: true }).click();
  929 |         await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBeGreaterThan(7.2);
  930 |         await page.getByRole('button', { name: 'Pause scene replay', exact: true }).click();
  931 |         const sceneTime = page.getByRole('slider', { name: 'Scene replay time (s)', exact: true });
  932 |         await sceneTime.press('Home');
  933 |         await sceneTime.press('ArrowRight');
  934 |         await expect.poll(() => page.evaluate(() => (window as any).__bucket().seismicTime)).toBe(0.05);
  935 |         expect(await page.evaluate(() => (window as any).__bucket().seismicPlaying)).toBe(false);
  936 |         await page.getByRole('button', { name: 'Exit fullscreen 3D bridge (Escape)', exact: true }).click();
  937 | 
  938 |         const timeline = page.locator('[data-bridge-seismic-timeline]');
  939 |         const chart = page.getByRole('slider', { name: 'Inspect earthquake timeline (s)', exact: true });
  940 |         await chart.scrollIntoViewIfNeeded();
  941 |         const box = await chart.boundingBox();
  942 |         if (!box) throw new Error('Timeline chart is not visible');
  943 |         if (width === 320) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  944 |         else {
```