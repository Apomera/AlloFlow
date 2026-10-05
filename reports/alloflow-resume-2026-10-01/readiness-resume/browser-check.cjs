const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { chromium } = require('@playwright/test');
const root = path.resolve(__dirname, '../../..');
const runLabel = process.argv[2] || 'initial';
process.chdir(root);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const inputFiles = ['word_sounds_readiness_contract.js', 'view_word_sounds_preview_source.jsx', 'view_word_sounds_preview_module.js', 'host_handlers_module.js', 'module_scope_extras_module.js', 'ui_strings.js'];
const hashes = inputFiles.map(file => ({ file, sha256: sha(fs.readFileSync(file)) }));
const free = () => Number(fs.statfsSync('.').bavail) * Number(fs.statfsSync('.').bsize);
const wav = Buffer.alloc(44 + 3200);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const damaged = Buffer.from(wav); damaged.writeUInt16LE(0, 22);
const result = { startedAt: new Date().toISOString(), scope: 'isolated Chromium fixture; native local decode and actual generated Preview; no cloud/service calls', hashes, freeBefore: free(), checks: [], networkRequests: [] };
let browser;
async function check(name, run) {
  try { const detail = await run(); result.checks.push({ name, passed: true, detail }); }
  catch (error) { result.checks.push({ name, passed: false, error: String(error.message).slice(0, 1200) }); }
}
(async () => {
  assert(result.freeBefore > 1024 * 1024 * 1024, 'Below1GiB: do not launch Chromium');
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
  page.setDefaultTimeout(5000);
  await page.route(/^https?:\/\//, route => { result.networkRequests.push(route.request().url().split('?')[0]); return route.abort(); });
  await page.setContent('<html lang="en"><head><title>Word Sounds fixture</title></head><body style="margin:0"><main><div id="root"></div><button id="outside">Outside fixture</button></main></body></html>');
  await page.addStyleTag({ path: path.resolve('desktop/web-app/build/static/css/main.11e7c75d.css') });
  await page.addScriptTag({ path: path.resolve('desktop/web-app/node_modules/react/umd/react.production.min.js') });
  await page.addScriptTag({ path: path.resolve('desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js') });
  await page.addScriptTag({ path: path.resolve('view_word_sounds_preview_module.js') });
  await page.evaluate(() => { window.__firstReady = window.AlloModules.WordSoundsReadiness; });
  await page.addScriptTag({ path: path.resolve('host_handlers_module.js') });
  await page.addScriptTag({ path: path.resolve('module_scope_extras_module.js') });
  await check('Generated loaders share the same readiness API and receipts', async () => {
    assert.equal(await page.evaluate(() => window.__firstReady === window.AlloModules.WordSoundsReadiness && typeof window.uploadSessionAssets === 'function' && typeof window.AlloModules.createHostHandlers === 'function'), true);
  });
  const registry = JSON.parse(fs.readFileSync('ui_strings.js', 'utf8').replace(/^\uFEFF/, ''));
  await page.evaluate(({ base64, registry }) => {
    window.__playCalls = 0; window.__nativeAudio = window.Audio;
    HTMLMediaElement.prototype.play = function () { window.__playCalls++; return Promise.resolve(); };
    window.__strings = registry; window.__calls = []; window.__cancelLoads = 0;
    window.__resource = { type: 'word-sounds', id: 'browser-fixture', title: 'Pond word practice', lessonPlanSequence: ['counting'], sessionConfig: { language: 'en' }, progress: { score: 3, response: 'learner evidence' }, data: [{ word: 'cat', phonemes: ['k', 'a', 't'], _ttsAssets: { cat: { mime: 'audio/wav', base64 } } }] };
    window.__original = JSON.stringify(window.__resource);
    window.__root = ReactDOM.createRoot(document.getElementById('root'));
    window.__render = (teacher = true) => window.__root.render(React.createElement(window.AlloModules.WordSoundsPreviewView, {
      generatedContent: window.__resource, wsActivitySequence: ['counting'], isTeacherMode: teacher,
      t: key => window.__strings.word_sounds[key.slice(12)] || key,
      prepareWordSoundsSession: value => window.__calls.push(['prepare', value]),
      setWordSoundsActivity: value => window.__calls.push(['activity', value]),
      setIsWordSoundsMode: value => window.__calls.push(['open', value]),
      setWordSoundsAutoReview: value => window.__calls.push(['review', value]),
      requestIncompleteAudioConfirmation: () => window.__calls.push(['confirm']),
    }));
    window.__render();
  }, { base64: wav.toString('base64'), registry });
  const checkButton = () => page.getByRole('button', { name: 'Check prepared audio', exact: true });
  await check('Native silent WAV decode checks embedded clip without certifying app banks', async () => {
    await checkButton().click();
    await page.waitForFunction(() => window.AlloModules.WordSoundsReadiness.inspect(window.__resource, { route: 'student-pack' }).checkedAt && !document.querySelector('section[aria-busy="true"]'));
    const report = await page.evaluate(() => window.AlloModules.WordSoundsReadiness.inspect(window.__resource, { route: 'student-pack' }));
    result.nativeReceipt = { checkedAt: report.checkedAt, ready: report.ready, total: report.total, wordClips: report.clips.filter(clip => clip.category === 'speech').map(clip => ({ key: clip.key, status: clip.status, checked: clip.checked })) };
    assert.equal(report.clips.find(clip => clip.category === 'speech' && clip.key === 'cat').checked, true, 'Native word clip not checked: ' + JSON.stringify(result.nativeReceipt));
    assert.equal(report.complete, false); assert(report.dependencies.length > 0);
    assert.equal(await page.evaluate(() => window.__playCalls), 0);
    await page.waitForFunction(() => document.activeElement && document.activeElement.textContent.includes('Check prepared audio') && !document.activeElement.disabled);
    assert.equal(await checkButton().evaluate(element => element === document.activeElement), true, 'Focus not restored after completion');
    return { ready: report.ready, total: report.total, dependencies: report.dependencies.length, complete: report.complete };
  });
  await check('Native decoder rejects a damaged WAV with a valid container signature', async () => {
    const report = await page.evaluate(async base64 => {
      const resource = JSON.parse(JSON.stringify(window.__resource)); resource.id = 'damaged'; resource.data[0]._ttsAssets.cat.base64 = base64;
      return window.AlloModules.WordSoundsReadiness.check(resource, { route: 'student-pack', totalTimeoutMs: 5000 });
    }, damaged.toString('base64'));
    assert.equal(report.clips.find(clip => clip.category === 'speech' && clip.key === 'cat').status, 'damaged'); assert.equal(report.complete, false);
  });
  await check('Controlled unsupported codec cannot produce a ready receipt', async () => {
    const report = await page.evaluate(async () => {
      const resource = JSON.parse(JSON.stringify(window.__resource)); resource.id = 'unsupported';
      return window.AlloModules.WordSoundsReadiness.check(resource, { audioFactory: () => ({ canPlayType: () => '', removeAttribute() {}, load() {} }) });
    });
    assert.equal(report.clips.find(clip => clip.key === 'cat').status, 'unsupported'); assert.equal(report.complete, false);
  });
  await check('Keyboard pending check: Escape cancels and restores focus', async () => {
    await page.evaluate(() => {
      window.Audio = class { canPlayType() { return 'probably'; } load() { window.__cancelLoads++; } pause() {} removeAttribute() {} };
    });
    await checkButton().focus(); await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('section[aria-busy="true"]'));
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.includes('cancelled'));
    assert.equal(await checkButton().evaluate(element => element === document.activeElement), true);
    assert.equal(await page.evaluate(() => window.__playCalls), 0);
  });
  await check('Repeated pending click is bounded; resource change cancels old readiness', async () => {
    await page.getByRole('button', { name: 'Cancel check', exact: true }).click().catch(() => {});
    await checkButton().click();
    await page.waitForFunction(() => document.querySelector('section[aria-busy="true"]'));
    await checkButton().evaluate(element => { element.click(); element.click(); });
    await page.evaluate(() => { document.getElementById('outside').focus(); window.__resource = { ...window.__resource, id: 'edited', selectedVoice: 'new voice' }; window.__render(); });
    await page.waitForFunction(() => !document.querySelector('section[aria-busy="true"]'));
    assert.equal(await page.evaluate(() => document.activeElement.id), 'outside');
    const report = await page.evaluate(() => window.AlloModules.WordSoundsReadiness.inspect(window.__resource, { route: 'student-pack' }));
    assert.equal(report.ready, 0); assert.equal(report.complete, false);
  });
  await check('Readiness checking preserves lesson content and existing progress', async () => {
    assert.equal(await page.evaluate(() => window.__resource.progress.score), 3);
    assert.equal(await page.evaluate(() => window.__resource.progress.response), 'learner evidence');
    assert.equal(await page.evaluate(() => window.__resource.data[0].word), 'cat');
    assert.equal(await page.evaluate(() => window.__calls.filter(row => row[0] === 'prepare' || row[0] === 'open').length), 0);
  });
  await check('320 CSSpx reflow and doubled root font have no horizontal overflow', async () => {
    await page.setViewportSize({ width: 320, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= 320), true);
    assert(await checkButton().isVisible());
    try {
      await page.screenshot({ path: path.join(__dirname, 'preview-320-' + runLabel + '.png'), fullPage: true, timeout: 15000, animations: 'disabled', caret: 'hide' });
      result.screenshotCaptured = true;
    } catch (error) { result.screenshotCaptured = false; result.screenshotError = String(error.message).slice(0, 600); }
    await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
  });
  await check('Scoped automated names, contrast, and focus rules', async () => {
    const axePath = path.resolve('node_modules/axe-core/axe.min.js'); assert(fs.existsSync(axePath), 'axe-core unavailable; keep evidence gap');
    await page.addScriptTag({ path: axePath });
    const report = await page.evaluate(() => axe.run(document.getElementById('root'), { runOnly: { type: 'rule', values: ['button-name', 'color-contrast', 'aria-allowed-attr', 'aria-valid-attr-value', 'tabindex'] } }));
    assert.equal(report.violations.length, 0, JSON.stringify(report.violations.map(row => ({ id: row.id, nodes: row.nodes.length }))));
    return { scopedRules: 5, violations: 0 };
  });
  await check('Learner preview keeps educator checks and review controls out of the learner route', async () => {
    await page.evaluate(() => window.__render(false));
    await page.getByRole('button', { name: /^Start Activity/i }).waitFor();
    assert.equal(await page.locator('section').count(), 0);
    assert.equal(await page.getByRole('button', { name: /Teacher:/ }).count(), 0);
  });
  assert.equal(result.networkRequests.length, 0, 'Unexpected network attempt');
  for (const input of hashes) assert.equal(sha(fs.readFileSync(input.file)), input.sha256, 'Candidate drift: ' + input.file);
})().catch(error => { result.fatal = String(error.stack).slice(0, 2000); }).finally(async () => {
  if (browser) await browser.close();
  result.finishedAt = new Date().toISOString(); result.freeAfter = free();
  fs.writeFileSync(path.join(__dirname, 'browser-' + runLabel + '.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify({ passed: result.checks.filter(row => row.passed).length, failed: result.checks.filter(row => !row.passed), fatal: result.fatal, networkRequests: result.networkRequests.length, freeBefore: result.freeBefore, freeAfter: result.freeAfter }));
  if (result.fatal || result.checks.some(row => !row.passed)) process.exitCode = 1;
});
