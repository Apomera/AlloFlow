import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Video Studio's narration pickers mirror AlloFlow's own "Spoken-output voice" picker: the app
// sends its voice catalog and the studio shows the same groups, starts from the app's voice, and
// treats picking an on-device voice as the consent to download it. This runs the REAL popup
// against a stub app window that answers the way the real host does.
const studioHtml = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf8');

const OPENER = `<!doctype html><title>AlloFlow fixture</title><main>app</main>
<script>
  window.log = [];
  window.catalog = {
    gemini: [{ id: 'Kore', label: 'Kore — Bright, energetic female' }, { id: 'Puck', label: 'Puck — Energetic, expressive male' },
             { id: 'Fenrir', label: 'Fenrir — Friendly, clear male' }, { id: 'Aoede', label: 'Aoede — Warm, articulate female' }],
    kokoro: [{ id: 'af_heart', label: 'Heart — Warm female (English US)' }, { id: 'bm_george', label: 'George — British male' }],
    selected: 'Fenrir', kokoroCapable: true, kokoroReady: false, kokoroSaved: false, kokoroDownloading: false
  };
  window.prepareDelayMs = 400;
  window.answerVoices = true;
  window.voicesDelayMs = 0;
  const reply = (source, request, type, payload) => source.postMessage(Object.assign({ type, id: request.id, bridge: request.bridge }, payload), location.origin);
  addEventListener('message', (event) => {
    const request = event.data || {};
    if (request.type === 'allostudio-voices-request') {
      window.log.push('voices');
      if (window.answerVoices) setTimeout(() => reply(event.source, request, 'allostudio-voices-response', window.catalog), window.voicesDelayMs);
    }
    if (request.type === 'allostudio-kokoro-prepare-request') {
      window.log.push('prepare');
      setTimeout(() => { window.catalog.kokoroReady = true; reply(event.source, request, 'allostudio-kokoro-prepare-response', { ready: true }); }, window.prepareDelayMs);
    }
  });
</script>`;

async function openStudio(page: any, context: any, { answerVoices = true, voicesDelayMs = 0 } = {}) {
  await context.route('http://alloflow.test/**', async (route: any) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/studio') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: studioHtml });
    if (url.pathname === '/opener') return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: OPENER });
    return route.fulfill({ status: 404, body: 'not found' });
  });
  await page.goto('http://alloflow.test/opener');
  await page.evaluate((o: any) => { (window as any).answerVoices = o.answerVoices; (window as any).voicesDelayMs = o.voicesDelayMs; }, { answerVoices, voicesDelayMs });
  const popupPromise = page.waitForEvent('popup');
  await page.evaluate(() => { window.open('/studio?allo_origin=' + encodeURIComponent(location.origin), 'studio-voices'); });
  const studio = await popupPromise;
  await studio.waitForLoadState('domcontentloaded');
  return studio;
}

const optionValues = (studio: any, id: string) => studio.evaluate((sel: string) =>
  Array.from((document.getElementById(sel) as HTMLSelectElement).options).map((o) => o.value), id);

test('the studio voice pickers show the app\'s catalog, groups and starting voice', async ({ page, context }) => {
  test.setTimeout(120_000);
  const studio = await openStudio(page, context);

  // Same groups as the app's picker; Gemini names beyond the old five; Kokoro marked as a download.
  await expect.poll(() => optionValues(studio, 'ttsVoice'), { timeout: 40_000 }).toContain('Fenrir');
  const groups = await studio.evaluate(() => Array.from(document.querySelectorAll('#ttsVoice optgroup')).map((g: any) => g.label));
  expect(groups).toEqual([
    '✨ Cloud voice (Gemini): most natural, needs the internet',
    '🎤 On-device voice (Kokoro): 88 MB download, then works offline',
  ]);
  expect(await optionValues(studio, 'ttsVoice')).toEqual(['Kore', 'Puck', 'Fenrir', 'Aoede', 'af_heart', 'bm_george']);
  const kokoroLabels = await studio.evaluate(() => Array.from(document.querySelectorAll('#ttsVoice optgroup:nth-of-type(2) option')).map((o: any) => o.textContent));
  expect(kokoroLabels.every((text: string) => text.endsWith('⬇'))).toBe(true);

  // Every picker starts from the app's own voice, not the studio's old default.
  await expect(studio.locator('#ttsVoice')).toHaveValue('Fenrir');
  await expect(studio.locator('#localizeVoice')).toHaveValue('Fenrir');
  await expect(studio.locator('#demoAudioMode')).toHaveValue('auto-Fenrir');
  // The Autopilot picker keeps its two non-voice choices.
  expect(await optionValues(studio, 'demoAudioMode')).toEqual(['auto-Kore', 'auto-Puck', 'auto-Fenrir', 'auto-Aoede', 'auto-af_heart', 'auto-bm_george', 'mic', 'captions']);
  // The browser "Device voice" cannot be recorded into a video, so it is not offered.
  expect(await optionValues(studio, 'ttsVoice')).not.toContain('browser');
});

test('picking an on-device voice is the consent to download it, and every picker updates', async ({ page, context }) => {
  test.setTimeout(120_000);
  const studio = await openStudio(page, context);
  await expect.poll(() => optionValues(studio, 'ttsVoice'), { timeout: 40_000 }).toContain('af_heart');

  await studio.locator('#ttsVoice').selectOption('af_heart', { force: true });
  await expect(studio.locator('#aiNarrStatus')).toContainText('Getting the on-device voice');
  await expect.poll(() => page.evaluate(() => (window as any).log.filter((x: string) => x === 'prepare').length)).toBe(1);
  // A second pick while it downloads must not start a second download.
  await studio.locator('#demoAudioMode').selectOption('auto-bm_george', { force: true });
  await expect(studio.locator('#aiNarrStatus')).toContainText('On-device voice ready');
  expect(await page.evaluate(() => (window as any).log.filter((x: string) => x === 'prepare').length)).toBe(1);

  const groups = await studio.evaluate(() => Array.from(document.querySelectorAll('#ttsVoice optgroup')).map((g: any) => g.label));
  expect(groups[1]).toBe('🎤 On-device voice (Kokoro): ready, works offline');
  const kokoroLabels = await studio.evaluate(() => Array.from(document.querySelectorAll('#ttsVoice optgroup:nth-of-type(2) option')).map((o: any) => o.textContent));
  expect(kokoroLabels.some((text: string) => text.includes('⬇'))).toBe(false);
  // The choices the person made survive the rebuild.
  await expect(studio.locator('#ttsVoice')).toHaveValue('af_heart');
  await expect(studio.locator('#demoAudioMode')).toHaveValue('auto-bm_george');
});

test('on-device voices are disabled for a non-English localization and a person\'s choice is not overridden by the app voice', async ({ page, context }) => {
  test.setTimeout(120_000);
  const studio = await openStudio(page, context);
  await expect.poll(() => optionValues(studio, 'localizeVoice'), { timeout: 40_000 }).toContain('af_heart');

  // Spanish is the default target: Kokoro speaks English only.
  const spanish = await studio.evaluate(() => ({
    label: (document.querySelectorAll('#localizeVoice optgroup')[1] as any).label,
    disabled: Array.from(document.querySelectorAll('#localizeVoice optgroup:nth-of-type(2) option')).every((o: any) => o.disabled),
  }));
  expect(spanish.label).toBe('🎤 On-device voice (Kokoro) (English only)');
  expect(spanish.disabled).toBe(true);

  // A choice made by the person stays when the catalog refreshes (language change rebuilds the list).
  // Puck is the studio's own default: picking it must still count as a choice, not be replaced by the app's voice.
  await studio.locator('#localizeVoice').selectOption('Puck', { force: true });
  await studio.locator('#localizeLang').selectOption('Arabic', { force: true });
  await expect(studio.locator('#localizeVoice')).toHaveValue('Puck');

  // A custom English target turns them back on.
  await studio.locator('#localizeLang').selectOption('custom', { force: true });
  await studio.evaluate(() => { const el = document.getElementById('localizeCustomLang') as HTMLInputElement; el.value = 'English'; el.dispatchEvent(new Event('change', { bubbles: true })); });
  await expect.poll(() => studio.evaluate(() => Array.from(document.querySelectorAll('#localizeVoice optgroup:nth-of-type(2) option')).some((o: any) => !o.disabled))).toBe(true);
});

test('without an answer from the app, the five built-in voices stay and still work', async ({ page, context }) => {
  test.setTimeout(120_000);
  const studio = await openStudio(page, context, { answerVoices: false });
  await page.waitForTimeout(1500);
  expect(await optionValues(studio, 'ttsVoice')).toEqual(['Puck', 'Kore', 'Charon', 'Aoede', 'Leda']);
  expect(await optionValues(studio, 'localizeVoice')).toEqual(['Puck', 'Kore', 'Charon', 'Aoede', 'Leda']);
  expect(await optionValues(studio, 'demoAudioMode')).toEqual(['auto-Kore', 'auto-Puck', 'mic', 'captions']);
  // The studio still works without the catalog: picking a built-in voice is still a normal choice.
  await studio.locator('#ttsVoice').selectOption('Leda', { force: true });
  await expect(studio.locator('#ttsVoice')).toHaveValue('Leda');
  expect(await page.evaluate(() => (window as any).log.filter((x: string) => x === 'prepare').length)).toBe(0);
});

test('a slow answer from the app keeps whatever the person picked in the meantime', async ({ page, context }) => {
  test.setTimeout(120_000);
  // The app answers after 4 s (a slow or busy machine). Before then the person picks a voice and the
  // studio's saved Autopilot voice is one the catalog does not list.
  const studio = await openStudio(page, context, { voicesDelayMs: 4000 });
  await studio.locator('#ttsVoice').selectOption('Leda', { force: true });
  await studio.evaluate(() => {
    const select = document.getElementById('demoAudioMode') as HTMLSelectElement;
    const option = document.createElement('option'); option.value = 'auto-Zephyr'; option.textContent = 'Automatic voice: Zephyr';
    select.insertBefore(option, select.querySelector('option[value="mic"]')); select.value = 'auto-Zephyr';
  });
  await expect.poll(() => optionValues(studio, 'ttsVoice'), { timeout: 40_000 }).toContain('Fenrir');
  // 'Leda' is not in this stub catalog: it is still there, still selected.
  await expect(studio.locator('#ttsVoice')).toHaveValue('Leda');
  await expect(studio.locator('#demoAudioMode')).toHaveValue('auto-Zephyr');
  // The studio asked once, not once per retry.
  expect(await page.evaluate(() => (window as any).log.filter((x: string) => x === 'voices').length)).toBe(1);
});
