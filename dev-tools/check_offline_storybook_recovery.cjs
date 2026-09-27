// Actual Storybook export + actual host preparation wrapper, disposable data only.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const modules = ['karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'read_aloud_artifact_audio_module.js', 'read_aloud_artifact_contract_module.js', 'export_module.js'];
const html = '<!doctype html><meta charset="utf-8"><title>Disposable Storybook author</title>' + modules.map(name => '<script>' + read(name).replace(/<\/script/gi, '<\\/script') + '</script>').join('');
const host = read('AlloFlowANTI.txt'), hostStart = host.indexOf('const artifactAudioRecoveryRef = useRef(null);');
const hostWrapper = host.slice(hostStart, host.indexOf('  const _getPrivatePersonaArtifactStorage', hostStart));
const utils = read('utils_pure_source.jsx'), writeStart = utils.indexOf('const writeVerifiedStorageSnapshot =');
const writer = utils.slice(writeStart, utils.indexOf('\n};', writeStart) + 3);
if (hostStart < 0 || !writer) throw Error('Recovery integration anchors missing');
function wave() {
  const frames = 800, data = Buffer.alloc(44 + frames * 2);
  data.write('RIFF'); data.writeUInt32LE(data.length - 8, 4); data.write('WAVEfmt ', 8); data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22); data.writeUInt32LE(8000, 24); data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34); data.write('data', 36); data.writeUInt32LE(frames * 2, 40);
  for (let n = 0; n < frames; n++) data.writeInt16LE(Math.round(2000 * Math.sin(n * Math.PI * 440 / 4000)), 44 + n * 2);
  return data.toString('base64');
}
async function exportFixture(page, failScene, offlineProviders = false) {
  return page.evaluate(async ({ hostWrapper, writer, wave, failScene, offlineProviders }) => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open('disposable-storybook', 1); request.onupgradeneeded = () => request.result.createObjectStore('checkpoints');
      request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
    });
    const storage = {
      get: key => new Promise((resolve, reject) => { const request = database.transaction('checkpoints').objectStore('checkpoints').get(key); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }),
      set: (key, value) => new Promise((resolve, reject) => { const tx = database.transaction('checkpoints', 'readwrite'); tx.objectStore('checkpoints').put(value, key); tx.oncomplete = () => resolve(true); tx.onerror = () => reject(tx.error); }),
    };
    window.AlloModules.UtilsPure = { writeVerifiedStorageSnapshot: new Function(writer + '; return writeVerifiedStorageSnapshot;')() };
    const synthesis = [], summaries = [], batches = [], warnings = [], downloads = [], urls = new Map();
    const originalCreate = URL.createObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = originalCreate(blob); urls.set(url, blob); return url; };
    HTMLAnchorElement.prototype.click = function () { downloads.push({ filename: this.download, blob: urls.get(this.href) }); };
    const prepare = new Function('useRef', 'callTTS', 'storageDB', 'selectedVoice', 'leveledTextLanguage', 'currentUiLanguage', 'voiceSpeed',
      hostWrapper + '; return { audio: prepareReadAloudArtifactAudio, summary: prepareStorybookSummary };')(() => ({ current: null }), async text => {
        synthesis.push(text); if (offlineProviders || (failScene && text === 'First scene.')) throw new Error('Simulated network loss');
        return { b64: wave, mime: 'audio/wav' };
      }, storage, 'Kore', 'English', 'English', 1);
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32; const paint = canvas.getContext('2d'); paint.fillStyle = '#15803d'; paint.fillRect(0, 0, 32, 32);
    const escape = text => String(text || '').replace(/[<>&"]/g, char => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[char]));
    window.callGemini = async prompt => { summaries.push(prompt); if (offlineProviders) throw new Error('Summary provider offline'); return 'You completed the journey.'; };
    const live = { adventureState: { history: [{ type: 'scene', text: 'First scene.', image: canvas.toDataURL('image/png') }], level: 3 },
      generatedContent: { id: 'disposable-story' }, sourceTopic: 'A Safe Journey', selectedVoice: 'Kore', voiceSpeed: 1, currentUiLanguage: 'English',
      setShowStorybookExportModal() {}, setIsProcessing() {}, rehydrateHistoryWithImages: async values => values,
      parseMarkdownToHTML: text => '<p>' + escape(text) + '</p>', addToast: (text, tone) => { if (tone === 'warning') warnings.push(text); },
      prepareStorybookSummary: prepare.summary,
      prepareReadAloudArtifactAudio: async options => { const batch = await prepare.audio(options); batches.push({ available: batch.available, skipped: batch.skipped, recovery: batch.recovery }); return batch; },
      t: key => ({ 'export.storybook.page_title': 'A Safe Journey', 'export.storybook.epilogue_badge': 'Epilogue', 'export.storybook.log_header': 'Your journey', 'export.storybook.print_button': 'Print Storybook' }[key] || '') };
    const api = window.AlloModules.createExport({ liveRef: { current: live }, warnLog: (...args) => warnings.push(args.map(value => value?.message || String(value)).join(' ')), debugLog() {}, escapeXml: escape, generateUUID: () => 'disposable-story' });
    const ok = await api.handleExportStorybook({ includeImages: true, includeNarration: true, keepModalOpen: true });
    const files = await Promise.all(downloads.map(async item => ({ filename: item.filename, contents: await item.blob.text() })));
    database.close();
    return { ok, synthesis, summaries: summaries.length, batches, warnings, files };
  }, { hostWrapper, writer, wave: wave(), failScene, offlineProviders });
}
async function verifyRecipient(page) {
  await page.locator('.scene-img').scrollIntoViewIfNeeded();
  return page.evaluate(async () => {
    const context = new AudioContext(), durations = [];
    for (const source of document.querySelectorAll('audio source')) durations.push((await context.decodeAudioData(await (await fetch(source.src)).arrayBuffer())).duration);
    await context.close();
    const images = Array.from(document.querySelectorAll('.scene-img')); await Promise.all(images.map(image => image.decode()));
    const artifact = JSON.parse(document.querySelector('#alloflow-read-aloud-artifact').textContent);
    return { durations, pictureWidths: images.map(image => image.naturalWidth), mediaSummary: document.querySelector('.media-availability').textContent,
      artifactSegments: artifact.scenes.flatMap(scene => scene.segments).length };
  });
}
(async () => {
  let browser, server;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-storybook-offline-'));
  try {
    server = http.createServer((_request, response) => { response.setHeader('Content-Type', 'text/html'); response.end(html); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    browser = await chromium.launch({ headless: true });
    const authorContext = await browser.newContext(), author = await authorContext.newPage();
    author.on('pageerror', error => console.error('Author fixture error: ' + error.message));
    await author.goto(`http://127.0.0.1:${server.address().port}/`);
    const interrupted = await exportFixture(author, true);
    if (!interrupted.ok || interrupted.batches[0]?.available !== 1 || interrupted.batches[0]?.recovery.state !== 'saved') throw Error('Partial checkpoint was not saved: ' + JSON.stringify({ ok: interrupted.ok, batches: interrupted.batches, warnings: interrupted.warnings }));
    await author.reload();
    const resumed = await exportFixture(author, false);
    if (!resumed.ok || resumed.summaries !== 0 || resumed.synthesis.join('|') !== 'First scene.' || resumed.batches[0].available !== 2 || resumed.batches[0].skipped !== 1) throw Error('Reload did not reuse current accepted epilogue and narration');
    await author.reload(); // Destroy all in-memory recovery, but retain disposable device storage.
    const authorNetworkRequests = [];
    author.on('request', request => { if (/^https?:/.test(request.url())) authorNetworkRequests.push(request.url()); });
    await authorContext.setOffline(true);
    const offlineExport = await exportFixture(author, false, true);
    if (!offlineExport.ok || offlineExport.summaries || offlineExport.synthesis.length || offlineExport.batches[0]?.available !== 2 || authorNetworkRequests.length) throw Error('Prepared Storybook could not export offline after reload: ' + JSON.stringify({ ...offlineExport, files: undefined }));
    const portable = path.join(temporary, 'actual-storybook.html');
    fs.writeFileSync(portable, offlineExport.files.find(file => file.filename.endsWith('.html')).contents);
    await authorContext.close();
    const recipientContext = await browser.newContext({ offline: true, viewport: { width: 390, height: 844 } }), recipient = await recipientContext.newPage();
    const networkRequests = [], errors = [];
    recipient.on('request', request => { if (/^https?:/.test(request.url())) networkRequests.push(request.url()); }); recipient.on('pageerror', error => errors.push(error.message));
    await recipient.goto(pathToFileURL(portable).href);
    const received = await verifyRecipient(recipient);
    await recipient.evaluate(() => { const button = document.createElement('button'); button.id = 'fixture-play'; button.textContent = 'Verify narration playback'; button.onclick = async () => { const audio = document.querySelector('audio'); audio.onended = () => window.fixturePlayed = true; await audio.play(); }; document.body.prepend(button); });
    await recipient.click('#fixture-play'); await recipient.waitForFunction(() => window.fixturePlayed === true);
    await recipient.reload(); const reloaded = await verifyRecipient(recipient);
    if ([received, reloaded].some(value => value.durations.length !== 2 || value.durations.some(time => time <= 0) || value.pictureWidths[0] !== 32) || networkRequests.length || errors.length) throw Error('Actual exported Storybook failed offline verification');
    const output = path.join(root, 'reports/offline-media-recovery');
    await recipient.screenshot({ path: path.join(output, 'storybook-offline-390.png'), fullPage: true });
    const report = { status: 'passed', initial: { summaries: interrupted.summaries, synthesis: interrupted.synthesis.length, available: interrupted.batches[0].available }, resumed: { summaries: resumed.summaries, synthesis: resumed.synthesis.length, ...resumed.batches[0] },
      offlineAuthor: { summaries: offlineExport.summaries, synthesis: offlineExport.synthesis.length, ...offlineExport.batches[0], networkRequests: authorNetworkRequests },
      received, reloaded, actualPlayback: true, networkRequests, errors, scope: 'Actual Storybook export and host recovery wrapper, real disposable IndexedDB reload, export offline with both providers unavailable, then a fresh offline recipient; no deployed app data.' };
    fs.writeFileSync(path.join(output, 'storybook-browser-verification.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2));
    await recipientContext.close();
  } finally {
    if (browser) await browser.close(); if (server) await new Promise(resolve => server.close(resolve));
    if (path.dirname(temporary) === os.tmpdir() && path.basename(temporary).startsWith('alloflow-storybook-offline-')) fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
