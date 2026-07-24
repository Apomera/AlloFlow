// Video Studio (2026-07-02) — pure-logic coverage + anti-drift sync gate.
//
// The recorder/editor popup (video_studio/video_studio.html) cannot import
// video_studio_module.js, so the shared pure block ([VS_SHARED_BEGIN]…END) is
// duplicated. The sync gate here pins the two copies identical (whitespace-
// normalized, since the module copy is indented inside its IIFE) — the classic
// AlloFlow answer to copy-drift.
//
// Behavioral coverage: WebVTT build/parse round-trip, trim segment math, the
// EBML Duration patcher (built against a hand-assembled minimal WebM header),
// and the pack-reference guard that keeps video BYTES out of pack JSON.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
import { loadAlloModule } from './setup.js';

let VS;
beforeAll(() => {
  loadAlloModule('video_studio_module.js');
  VS = window.AlloModules.VideoStudio;
  if (!VS) throw new Error('VideoStudio failed to register');
});

// ─── Anti-drift: module and popup share the pure block byte-for-byte ────────
describe('shared-block sync gate', () => {
  const extract = (file) => {
    const text = readFileSync(resolve(process.cwd(), file), 'utf-8').replace(/\r\n/g, '\n');
    const begin = text.indexOf('[VS_SHARED_BEGIN]');
    const end = text.indexOf('[VS_SHARED_END]');
    if (begin === -1 || end === -1 || end <= begin) throw new Error('markers missing in ' + file);
    // Whitespace-normalize per line: the module copy sits inside an IIFE
    // (2-space indent), the popup copy is at script top level.
    return text.slice(begin, end).split('\n').map((l) => l.trim()).join('\n');
  };
  it('module and popup copies are identical', () => {
    expect(extract('video_studio_module.js')).toBe(extract('video_studio/video_studio.html'));
  });
  it('deploy mirrors match root copies', () => {
    const read = (f) => readFileSync(resolve(process.cwd(), f), 'utf-8').replace(/\r\n/g, '\n');
    expect(read('prismflow-deploy/public/video_studio_module.js')).toBe(read('video_studio_module.js'));
    expect(read('prismflow-deploy/public/video_studio/video_studio.html')).toBe(read('video_studio/video_studio.html'));
  });
  it('keeps the popup inline script syntactically valid', () => {
    const html = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
    const scriptStart = html.indexOf('<script>');
    const scriptEnd = html.lastIndexOf('</script>');
    expect(scriptStart).toBeGreaterThan(-1);
    expect(scriptEnd).toBeGreaterThan(scriptStart);
    expect(() => new Script(html.slice(scriptStart + '<script>'.length, scriptEnd), { filename: 'video-studio-inline.js' })).not.toThrow();
  });
});

// ─── vsFormatTimestamp ───────────────────────────────────────────────────────
describe('Scene builder popup wiring', () => {
  const popup = () => readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
  it('keeps startup guards and exact privacy framing in the popup', () => {
    const html = popup();
    const moduleText = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
    expect(html).toContain('local by default, AI optional');
    expect(html).toContain('optional AI tools later may send reviewed text, prompts, or sampled frame sheets through AlloFlow');
    expect(moduleText).toContain('Local by default: recording, editing, and captioning run in your browser.');
    expect(moduleText).toContain('Optional AI tools may send reviewed text, prompts, or sampled frame sheets through AlloFlow');
    expect(html).toContain('function currentTake() { return (Array.isArray(takes) ? takes : [])');
  });
  it('starts the editor in lesson-polish focus instead of every tool', () => {
    const html = popup();
    expect(html).toContain('id="editorFocusStatus">Lesson polish tools are visible.');
    expect(html).toContain('<option value="record" selected>Lesson polish</option>');
    expect(html).toContain("var EDITOR_FOCUS_DEFAULT = 'record';");
    expect(html).toContain('setEditorFocusMode(EDITOR_FOCUS_DEFAULT, false);');
    expect(html).not.toContain("setEditorFocusMode('all', false);");
  });
  it('keeps transcript-based editing controls in the transcript workspace', () => {
    const html = popup();
    expect(html).toContain('id="transcriptEditStatus"');
    expect(html).toContain('id="transcriptMuteBtn"');
    expect(html).toContain('id="transcriptTrimBeforeBtn"');
    expect(html).toContain('id="transcriptTrimAfterBtn"');
    expect(html).toContain('id="transcriptClipBtn"');
    expect(html).toContain('id="transcriptChapterBtn"');
    expect(html).toContain('id="transcriptSelectMatchesBtn"');
    expect(html).toContain('id="transcriptCopyPlanBtn"');
    expect(html).toContain('id="transcriptDecisionPanel"');
    expect(html).toContain('id="importWordTimingsBtn"');
    expect(html).toContain('id="importWordTimingsInput"');
    expect(html).toContain('id="downloadWordTimingsBtn"');
    expect(html).toContain('id="wordRipplePanel"');
    expect(html).toContain('id="wordRippleFillersBtn"');
    expect(html).toContain('id="wordRippleRepeatsBtn"');
    expect(html).toContain('id="wordRippleCutBtn"');
    expect(html).toContain('id="wordRippleClearBtn"');
    expect(html).toContain('id="wordCleanupPanel"');
    expect(html).toContain('id="wordCleanupScanBtn"');
    expect(html).toContain('id="wordCleanupApproveAllBtn"');
    expect(html).toContain('id="wordCleanupClearBtn"');
    expect(html).toContain('id="wordCleanupMuteBtn"');
    expect(html).toContain('id="wordCleanupBuildBtn"');
    expect(html).toContain('id="wordCleanupList"');
    expect(html).toContain('function applyTranscriptMuteSelection');
    expect(html).toContain('function selectTranscriptSearchMatches');
    expect(html).toContain('function recordTranscriptDecision');
    expect(html).toContain('function copyTranscriptEditPlan');
    expect(html).toContain('function importTranscriptWordsFile');
    expect(html).toContain('function downloadTranscriptWordsFile');
    expect(html).toContain('function renderWordRipplePanel');
    expect(html).toContain('function selectWordRippleAuto');
    expect(html).toContain('function buildWordRippleCutScene');
    expect(html).toContain('function renderWordCleanupPanel');
    expect(html).toContain('function scanWordCleanupQueue');
    expect(html).toContain('function muteWordCleanupQueue');
    expect(html).toContain('function buildWordCleanupScene');
    expect(html).toContain("source: 'transcript_cleanup'");
    expect(html).toContain('function addClipFromTranscriptSelection');
    expect(html).toContain('Transcript clip added to the scene builder.');
    expect(html).toContain('vsTranscriptSelectionRange');
    expect(html).toContain('vsBuildTranscriptEditDecision');
    expect(html).toContain('vsTranscriptWordsFromCues');
    expect(html).toContain('vsSanitizeTranscriptWords');
    expect(html).toContain('vsTranscriptWordsForTake');
    expect(html).toContain('vsCaptionCuesFromTranscriptWords');
    expect(html).toContain('vsBuildRippleKeepSegments');
    expect(html).toContain('transcript_edits.json');
    expect(html).toContain('transcript_edits.txt');
    expect(html).toContain('transcript_words.json');
    expect(html).toContain('audio_edits.json');
    expect(html).toContain('project_readme.txt');
    expect(html).toContain('vsBuildAudioEditManifest');
    expect(html).toContain('vsBuildProjectBundleReadme');
    expect(html).toContain('vsBuildProjectImportSummary');
    expect(html).toContain('id="importSummaryBox"');
    expect(html).toContain('id="editImportSummaryBox"');
    expect(html).toContain('class="restore-summary import-summary-box"');
    expect(html).toContain('function importSummaryPanelBoxes');
    expect(html).toContain('function clearImportSummaryPanel');
    expect(html).toContain('function renderImportSummaryPanel');
    expect(html).toContain('.restore-chip.warn');
    expect(html).toContain('restore-action-row');
    expect(html).toContain('restore-dismiss');
    expect(html).toContain('aria-label="Project restore summary"');
    expect(html).toContain('Dismiss restored project summary');
    expect(html).toContain('data-import-action');
    expect(html).toContain("addAction('Review transcript'");
    expect(html).toContain("addAction('Review audio'");
    expect(html).toContain("addAction('Review credits'");
    expect(html).toContain("addAction('Finish checklist'");
    expect(html).toContain('mediaCreditCount: mediaCredits.length');
    expect(html).toContain('cleanAudioState(audioState');
    expect(html).toContain('audioEdits: sendAudioEdits');
    expect(html).toContain('function bundleAudioFileName');
    expect(html).toContain("audioMedia[e.name]");
    expect(html).toContain("return 'audio/'");
    expect(html).toContain('segments[].words');
    expect(html).toContain('alloflow_transcript_words');
    expect(html).toContain('Using true word timestamps.');
    expect(html).toContain('source: \'transcript\'');
    const moduleText = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
    expect(moduleText).toContain('vsBuildTranscriptEditDecision');
    expect(moduleText).toContain('vsSanitizeTranscriptEdits');
    expect(moduleText).toContain('vsBuildTranscriptEditText');
    expect(moduleText).toContain('vsTranscriptWordsFromCues');
    expect(moduleText).toContain('vsSanitizeTranscriptWords');
    expect(moduleText).toContain('vsTranscriptWordsForTake');
    expect(moduleText).toContain('vsCaptionCuesFromTranscriptWords');
    expect(moduleText).toContain('vsTranscriptWordAutoSelect');
    expect(moduleText).toContain('vsBuildTranscriptCleanupQueue');
    expect(moduleText).toContain('vsTranscriptWordSelectionRanges');
    expect(moduleText).toContain('vsBuildRippleKeepSegments');
    expect(moduleText).toContain('vsBuildAudioEditManifest');
    expect(moduleText).toContain('vsBuildProjectBundleReadme');
    expect(moduleText).toContain('vsBuildProjectImportSummary');
    expect(moduleText).toContain('transcript_words.json');
    expect(moduleText).toContain('audio_edits.json');
    expect(moduleText).toContain('project_readme.txt');
  });
  it('keeps licensed media credit controls wired into exports', () => {
    const html = popup();
    const moduleText = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
    expect(html).toContain('<h2>Licensed media credits</h2>');
    expect(html).toContain('id="mediaFinderQuery"');
    expect(html).toContain('id="mediaFinderSource"');
    expect(html).toContain('id="mediaFinderSearchBtn"');
    expect(html).toContain('id="mediaFinderUseBtn"');
    expect(html).toContain('id="mediaFinderTargets"');
    expect(html).toContain('id="mediaCreditTitle"');
    expect(html).toContain('id="mediaCreditCreator"');
    expect(html).toContain('id="mediaCreditUrl"');
    expect(html).toContain('id="mediaCreditLicense"');
    expect(html).toContain('id="mediaCreditSource"');
    expect(html).toContain('id="mediaCreditAddBtn"');
    expect(html).toContain('id="mediaCreditCopyBtn"');
    expect(html).toContain('id="mediaCreditCardBtn"');
    expect(html).toContain('id="mediaCreditDownloadBtn"');
    expect(html).toContain('function addMediaCreditFromForm');
    expect(html).toContain('function copyMediaCredits');
    expect(html).toContain('function addMediaCreditsCard');
    expect(html).toContain('function downloadMediaCredits');
    expect(html).toContain('function renderMediaFinderTargets');
    expect(html).toContain('function useMediaFinderAsDraft');
    expect(html).toContain('vsBuildMediaCreditsCard');
    expect(html).toContain('Sending with ');
    expect(html).toContain('media_credits.json');
    expect(html).toContain('media_credits.txt');
    expect(moduleText).toContain('media_credits.json');
    expect(moduleText).toContain('vsBuildMediaCredits');
    expect(moduleText).toContain('vsBuildMediaCreditsCard');
  });
  it('keeps local sound polish presets and permission audit controls visible', () => {
    const html = popup();
    expect(html).toContain('id="audioPolishPreset"');
    expect(html).toContain('id="applyAudioPolishBtn"');
    expect(html).toContain('id="audioPolishStatus"');
    expect(html).toContain('function applyAudioPolishPreset');
    expect(html).toContain('id="permissionAuditCard"');
    expect(html).toContain('id="permissionAuditList"');
    expect(html).toContain('function renderPermissionAudit');
  });
  it('documents optional media-source guardrails in About and notices', () => {
    const source = readFileSync(resolve(process.cwd(), 'view_info_modal_source.jsx'), 'utf-8');
    const notices = readFileSync(resolve(process.cwd(), 'THIRD_PARTY_LICENSES.md'), 'utf-8');
    expect(source).toContain('Open/free media guardrails');
    expect(source).toContain('MEDIA_SOURCE_GUIDE');
    expect(source).toContain('Free stock, not open source');
    expect(notices).toContain('Optional media sources and Video Studio policy');
    expect(notices).toContain('not bundled dependencies unless a specific asset is included');
    expect(notices).toContain('CC BY-NC/noncommercial sounds should not be treated as safe');
    expect(notices).toContain('Pixabay assets as a reusable stock library');
  });
  it('pins the popup bridge to the opener origin and nonce', () => {
    const html = popup();
    const moduleText = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
    expect(html).toContain("bridgeParams.get('allo_bridge')");
    expect(html).toContain("bridgeParams.get('allo_origin')");
    expect(html).toContain('function isOpenerMessage');
    expect(html).toContain('var target = openerTargetOrigin();');
    expect(html).toContain('opener.postMessage(withBridge(msg), target);');
    expect(html).toContain('return true;');
    expect(html).toContain('return false;');
    expect(html).toContain('if (!postToOpener(Object.assign({ type: type, id: id }, payload)))');
    expect(html).toContain('AlloFlow bridge is not connected. Reopen Video Studio from AlloFlow and try again.');
    expect(html).not.toContain("return openerOrigin || '*'");
    expect(html).not.toMatch(/postMessage\([^\n]*['"]\*['"]/);
    expect(moduleText).toContain('var STUDIO_ORIGIN');
    expect(moduleText).toContain('function studioUrlWithBridge');
    expect(moduleText).toContain("u.searchParams.set('allo_origin'");
    expect(moduleText).toContain("u.searchParams.set('allo_bridge'");
    expect(moduleText).toContain('ev.origin && ev.origin !== STUDIO_ORIGIN');
    expect(moduleText).toContain('ev.data.bridge !== bridgeTokenRef.current');
    expect(moduleText).toContain('win.postMessage(payload, STUDIO_ORIGIN)');
    expect(moduleText).toContain('bridgeTokenRef.current = null');
    expect(moduleText).not.toMatch(/postMessage\([^\n]*['"]\*['"]/);
  });
  it('cleans bridge listeners immediately on abort and after timeout', async () => {
    const html = popup();
    const start = html.indexOf('  function bridgeRequest(');
    const end = html.indexOf('  // -- Localization:', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const factory = new Function(
      'opener',
      'window',
      'isOpenerMessage',
      'postToOpener',
      'let aiNarrSeq = 0;\n' + html.slice(start, end) + '\nreturn bridgeRequest;'
    );
    const listeners = new Set();
    const fakeWindow = {
      addEventListener: (type, listener) => { if (type === 'message') listeners.add(listener); },
      removeEventListener: (type, listener) => { if (type === 'message') listeners.delete(listener); },
    };
    const bridgeRequest = factory(
      { closed: false },
      fakeWindow,
      () => false,
      () => true
    );

    const controller = new AbortController();
    const pending = bridgeRequest('fixture-request', {}, 5000, { signal: controller.signal });
    expect(listeners.size).toBe(1);
    controller.abort();
    await expect(pending).resolves.toEqual({ error: 'cancelled', cancelled: true });
    expect(listeners.size).toBe(0);

    let timedOutId = '';
    await expect(bridgeRequest('fixture-request', {}, 5, {
      onTimeout: (id) => { timedOutId = id; },
    })).resolves.toEqual({ error: 'timed out' });
    expect(timedOutId).toMatch(/^nr/);
    expect(listeners.size).toBe(0);

    const disconnected = factory(
      { closed: false },
      fakeWindow,
      () => false,
      () => false
    );
    await expect(disconnected('fixture-request', {}, 5000)).resolves.toEqual({
      error: 'AlloFlow bridge is not connected. Reopen Video Studio from AlloFlow and try again.',
    });
    expect(listeners.size).toBe(0);

    const responding = factory(
      { closed: false },
      fakeWindow,
      (event, responseType, id) => event.data.type === responseType && event.data.id === id,
      (message) => {
        Array.from(listeners).forEach((listener) => listener({
          data: { type: 'fixture-response', id: message.id, ok: true },
        }));
        return true;
      }
    );
    await expect(responding('fixture-request', {}, 5000)).resolves.toEqual({
      type: 'fixture-response',
      id: expect.stringMatching(/^nr/),
      ok: true,
    });
    expect(listeners.size).toBe(0);
  });
  it('keeps the scene assembly controls in the editor', () => {
    const html = popup();
    expect(html).toContain('<h2>Scene builder</h2>');
    expect(html).toContain('id="sceneAddTakeBtn"');
    expect(html).toContain('id="sceneAddAllBtn"');
    expect(html).toContain('id="sceneAddTitleBtn"');
    expect(html).toContain('id="sceneAddPauseBtn"');
    expect(html).toContain('id="sceneDefaultTransition"');
    expect(html).toContain('id="sceneApplyTransitionBtn"');
    expect(html).toContain('id="sceneExportBtn"');
    expect(html).toContain('id="sceneDownloadPlanBtn"');
    expect(html).toContain('id="sceneLoadPlanBtn"');
    expect(html).toContain('id="scenePreviewBtn"');
    expect(html).toContain('id="sceneAudioMode"');
    expect(html).toContain('id="sceneFraming"');
    expect(html).toContain('id="sceneTransitionSpeed"');
    expect(html).toContain('id="sceneStoryboard"');
    expect(html).toContain('id="sceneApplyTemplateBtn"');
    expect(html).toContain('id="sceneUseBundledPlanBtn"');
    expect(html).toContain('id="sceneReadinessList"');
    expect(html).toContain('function exportSceneMontage()');
  });
  it('keeps combined scene metadata wired into exports', () => {
    const html = popup();
    expect(html).toContain('function sceneTimelineData');
    expect(html).toContain('function sceneTakeForExport');
    expect(html).toContain('function renderSceneReadiness');
    expect(html).toContain('function downloadScenePlan');
    expect(html).toContain('function loadSceneDraft');
    expect(html).toContain('function previewSceneBuilder');
    expect(html).toContain('function sceneAudioGainAt');
    expect(html).toContain('function sceneFramingMode');
    expect(html).toContain('function sceneTransitionSeconds');
    expect(html).toContain('function renderSceneStoryboard');
    expect(html).toContain('function reorderSceneItems');
    expect(html).toContain('function duplicateSceneItem');
    expect(html).toContain('function applySceneTemplate');
    expect(html).toContain('function loadBundledScenePlan');
    expect(html).toContain('scenePlan: scenePlan || null');
    expect(html).toContain('scenePlan: take.scenePlan || null');
    expect(html).toContain('sceneCues: sceneCues');
    expect(html).toContain('sceneChapters: sceneChapters');
    expect(html).toContain('scenePlan: scenePlan');
    expect(html).toContain("name: 'scene_plan.json'");
    expect(html).toContain('Project bundle downloaded. It will reopen the assembled scene as one editable take.');
  });
  it('keeps social-size export controls wired into video and scene exports', () => {
    const html = popup();
    expect(html).toContain('id="exportFormat"');
    expect(html).toContain('id="exportFraming"');
    expect(html).toContain('id="exportFormatStatus"');
    expect(html).toContain('id="exportContainer"');
    expect(html).toContain('id="exportContainerStatus"');
    expect(html).toContain('id="exportContainerHelp"');
    expect(html).toContain('id="exportPlan"');
    expect(html).toContain('id="exportPlanSummary"');
    expect(html).toContain('id="exportPlanDetail"');
    expect(html).toContain('id="exportCancelBtn"');
    expect(html).toContain('id="exportProgressDetail"');
    expect(html).toContain('value="vertical_1080"');
    expect(html).toContain('value="square_1080"');
    expect(html).toContain('value="portrait_1080"');
    expect(html).toContain('value="auto"');
    expect(html).toContain('value="mp4"');
    expect(html).toContain('value="mp4_convert"');
    expect(html).toContain('value="webm"');
    expect(html).toContain('Strict MP4 - local converter');
    expect(html).toContain('Strict MP4 runs on this device');
    expect(html).toContain('local MP4 conversion may take several minutes and use more memory');
    expect(html).toContain('value="social_vertical"');
    expect(html).toContain('value="social_square"');
    expect(html).toContain('function exportCanvasSizeFor');
    expect(html).toContain('function drawVideoIntoFrame');
    expect(html).toContain('function exportVideoBitrate');
    expect(html).toContain('function chooseExportMime');
    expect(html).toContain('function finalizeRecordedVideoBlob');
    expect(html).toContain('function convertBlobToMp4');
    expect(html).toContain('function maybeConvertStrictMp4');
    expect(html).toContain('function setMp4ConversionUi');
    expect(html).toContain('function cancelMp4Conversion');
    expect(html).toContain('function mp4ConverterTroubleshootingMessage');
    expect(html).toContain('MP4 conversion ran out of browser memory');
    expect(html).toContain('Local MP4 converter files were unavailable');
    expect(html).toContain('Your video will still export as WebM');
    expect(html).toContain('function exportContainerOutcomeStatus');
    expect(html).toContain('function exportContainerOutcomeDetail');
    expect(html).toContain('Strict MP4 was requested, but WebM stayed available.');
    expect(html).toContain("status: exportContainerOutcomeStatus(lastExport.outputContainer)");
    expect(html).toContain('function exportDownloadFilename');
    expect(html).toContain('function refreshDownloadButtonLabel');
    expect(html).toContain("btn.setAttribute('aria-label', label + ': ' + filename)");
    expect(html).toContain("btn.title = 'Downloads ' + filename");
    expect(html).toContain('Downloaded ');
    expect(html).toContain('function refreshExportDecisionPreview');
    expect(html).toContain('function exportRenderReasonsForTake');
    expect(html).toContain("e.name === 'AbortError'");
    expect(html).toContain('vendor/ffmpeg/ffmpeg/index.js');
    expect(html).toContain('vendor/ffmpeg/core/ffmpeg-core.wasm');
    expect(html).toContain("outputFormat: outputFormat");
    expect(html).toContain("outputFormat: sceneOutputFormat");
    expect(html).toContain("outputContainer: outputContainer");
    expect(html).toContain("outputContainer: sceneContainerInfo");
    expect(html).toContain("outputContainer: lastExport.outputContainer");
    expect(html).toContain('exportFormatFileSuffix');
  });
  it('keeps the strict MP4 converter files available in root and deploy mirrors', () => {
    // The wasm ships as git-tracked .part chunks (Cloudflare rejects >25MiB
    // files — the whole ffmpeg-core.wasm froze the CDN 2026-07-03), stitched
    // at load time by resolveFfmpegWasmUrl() in video_studio.html.
    const pairs = [
      ['video_studio/vendor/ffmpeg/ffmpeg/index.js', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/ffmpeg/index.js'],
      ['video_studio/vendor/ffmpeg/ffmpeg/worker.js', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/ffmpeg/worker.js'],
      ['video_studio/vendor/ffmpeg/core/ffmpeg-core.js', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/core/ffmpeg-core.js'],
      ['video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.part0', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.part0'],
      ['video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.part1', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.part1'],
      ['video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.parts.json', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.parts.json'],
      ['video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md', 'prismflow-deploy/public/video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md'],
    ];
    pairs.forEach(([rootFile, deployFile]) => {
      const rootSize = statSync(resolve(process.cwd(), rootFile)).size;
      const deploySize = statSync(resolve(process.cwd(), deployFile)).size;
      expect(rootSize).toBeGreaterThan(rootFile.includes('.wasm.part0') ? 1_000_000 : 10);
      expect(rootSize).toBeLessThan(25 * 1024 * 1024); // Cloudflare per-file deploy limit
      expect(deploySize).toBe(rootSize);
    });
    const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.parts.json'), 'utf-8'));
    const partTotal = [0, 1].reduce((sum, index) =>
      sum + statSync(resolve(process.cwd(), 'video_studio/vendor/ffmpeg/core/ffmpeg-core.wasm.part' + index)).size, 0);
    expect(manifest.parts).toBe(2);
    expect(partTotal).toBe(manifest.bytes);
    const studioHtml = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
    expect(studioHtml).toContain('resolveFfmpegWasmUrl');
    expect(studioHtml).toContain("FFMPEG_CORE_WASM_URL + '.parts.json'");
    const notice = readFileSync(resolve(process.cwd(), 'video_studio/vendor/ffmpeg/THIRD_PARTY_NOTICES.md'), 'utf-8');
    expect(notice).toContain('@ffmpeg/ffmpeg');
    expect(notice).toContain('@ffmpeg/core');
    expect(notice).toContain('GPL-2.0-or-later');
  });
});

describe('vsFormatTimestamp', () => {
  it('formats zero, sub-second, and hour-scale values', () => {
    expect(VS.vsFormatTimestamp(0)).toBe('00:00:00.000');
    expect(VS.vsFormatTimestamp(1.5)).toBe('00:00:01.500');
    expect(VS.vsFormatTimestamp(3661.25)).toBe('01:01:01.250');
  });
  it('carries a rounded-up 1000ms into the next second', () => {
    expect(VS.vsFormatTimestamp(59.9999)).toBe('00:01:00.000');
  });
  it('clamps negatives and non-numbers to zero', () => {
    expect(VS.vsFormatTimestamp(-4)).toBe('00:00:00.000');
    expect(VS.vsFormatTimestamp('nope')).toBe('00:00:00.000');
  });
});

// ─── vsBuildVtt / vsParseVtt ─────────────────────────────────────────────────
describe('WebVTT build + parse', () => {
  it('builds a valid file and round-trips through the parser', () => {
    const cues = [
      { start: 0, end: 2.5, text: 'Welcome to the fractions demo' },
      { start: 3, end: 6, text: 'Watch the denominator' },
    ];
    const vtt = VS.vsBuildVtt(cues);
    expect(vtt.startsWith('WEBVTT')).toBe(true);
    expect(vtt).toContain('00:00:00.000 --> 00:00:02.500');
    const back = VS.vsParseVtt(vtt);
    expect(back).toHaveLength(2);
    expect(back[1].text).toBe('Watch the denominator');
    expect(back[1].start).toBeCloseTo(3);
  });
  it('drops empty/invalid cues and repairs inverted ranges', () => {
    const vtt = VS.vsBuildVtt([
      { start: 1, end: 0.5, text: 'inverted' },
      { start: 2, end: 3, text: '   ' },
      { start: NaN, end: 3, text: 'bad start' },
    ]);
    const back = VS.vsParseVtt(vtt);
    expect(back).toHaveLength(1);
    expect(back[0].end).toBeGreaterThan(back[0].start);
  });
  it('strips embedded newlines so one cue stays one line', () => {
    const vtt = VS.vsBuildVtt([{ start: 0, end: 1, text: 'line one\nline two' }]);
    expect(vtt).toContain('line one line two');
  });
  it('parser tolerates cue identifiers and CRLF', () => {
    const back = VS.vsParseVtt('WEBVTT\r\n\r\n1\r\n00:00:01.000 --> 00:00:02.000\r\nHello\r\n');
    expect(back).toEqual([{ start: 1, end: 2, text: 'Hello' }]);
  });
  // Wave 2 (import feature): the popup's "Import captions" accepts .srt files
  // through this same parser — comma milliseconds, numeric ids, no WEBVTT header.
  it('parser reads SRT files (comma timestamps, no header)', () => {
    const srt = '1\n00:00:01,000 --> 00:00:02,500\nHola\n\n2\n00:01:03,250 --> 00:01:04,000\nAdiós\n';
    const back = VS.vsParseVtt(srt);
    expect(back).toHaveLength(2);
    expect(back[0]).toEqual({ start: 1, end: 2.5, text: 'Hola' });
    expect(back[1].start).toBeCloseTo(63.25);
  });
  it('parser ignores cue settings after the end timestamp', () => {
    const back = VS.vsParseVtt('WEBVTT\n\n00:00:01.000 --> 00:00:02.000 align:start line:90%\nPositioned cue\n');
    expect(back).toEqual([{ start: 1, end: 2, text: 'Positioned cue' }]);
  });
});

// ─── vsComputeSegments ───────────────────────────────────────────────────────
describe('vsComputeSegments (trim math)', () => {
  it('keeps the middle when trimming both ends', () => {
    const r = VS.vsComputeSegments(60, 5, 10);
    expect(r.segments).toEqual([{ start: 5, end: 50 }]);
    expect(r.duration).toBe(45);
  });
  it('no trim keeps everything', () => {
    expect(VS.vsComputeSegments(30, 0, 0)).toEqual({ segments: [{ start: 0, end: 30 }], duration: 30 });
  });
  it('over-trim collapses to a minimal valid segment instead of inverting', () => {
    const r = VS.vsComputeSegments(10, 8, 8);
    expect(r.segments[0].end).toBeGreaterThan(r.segments[0].start);
    expect(r.duration).toBeGreaterThan(0);
    expect(r.segments[0].start).toBeGreaterThanOrEqual(0);
    expect(r.segments[0].end).toBeLessThanOrEqual(10);
  });
  it('negative and NaN inputs are clamped', () => {
    const r = VS.vsComputeSegments(20, -5, NaN);
    expect(r.segments).toEqual([{ start: 0, end: 20 }]);
  });
});

// ─── vsPatchWebmDuration ─────────────────────────────────────────────────────
// Hand-assembled minimal WebM: EBML header (empty body), unknown-size Segment,
// Info containing only TimestampScale(1e6), then a dummy Cluster-ish element.
function makeWebm({ withDuration = false, knownSegmentSize = false } = {}) {
  const bytes = [];
  // EBML header: ID 1A45DFA3, size 0x80 (0 bytes)
  bytes.push(0x1a, 0x45, 0xdf, 0xa3, 0x80);
  // Segment: ID 18538067
  bytes.push(0x18, 0x53, 0x80, 0x67);
  const segBody = [];
  // Info: ID 1549A966
  const infoChildren = [];
  // TimestampScale: ID 2AD7B1, size 3, value 1_000_000 (0x0F4240)
  infoChildren.push(0x2a, 0xd7, 0xb1, 0x83, 0x0f, 0x42, 0x40);
  if (withDuration) {
    // Duration: ID 4489, size 8, float64 1234ms
    const d = new Uint8Array(8);
    new DataView(d.buffer).setFloat64(0, 1234, false);
    infoChildren.push(0x44, 0x89, 0x88, ...d);
  }
  segBody.push(0x15, 0x49, 0xa9, 0x66, 0x80 | infoChildren.length, ...infoChildren);
  // Dummy trailing element: Cluster ID 1F43B675 with 2-byte body
  segBody.push(0x1f, 0x43, 0xb6, 0x75, 0x82, 0x00, 0x01);
  if (knownSegmentSize) {
    bytes.push(0x80 | segBody.length);
  } else {
    bytes.push(0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff); // unknown size
  }
  bytes.push(...segBody);
  return new Uint8Array(bytes);
}

describe('vsPatchWebmDuration', () => {
  it('splices a Duration element into Info and grows the file by 11 bytes', () => {
    const input = makeWebm();
    const out = VS.vsPatchWebmDuration(input, 5000);
    expect(out.length).toBe(input.length + 11);
    // Duration ID 0x44 0x89 followed by size 0x88 must now appear
    let found = -1;
    for (let i = 0; i < out.length - 10; i++) {
      if (out[i] === 0x44 && out[i + 1] === 0x89 && out[i + 2] === 0x88) { found = i; break; }
    }
    expect(found).toBeGreaterThan(-1);
    const dv = new DataView(out.buffer, out.byteOffset + found + 3, 8);
    expect(dv.getFloat64(0, false)).toBeCloseTo(5000); // scale 1e6 → ms units
    // Info size byte must have grown by 11 (0x87 body → 0x92)
    const infoIdx = out.findIndex((_, i) => out[i] === 0x15 && out[i + 1] === 0x49 && out[i + 2] === 0xa9 && out[i + 3] === 0x66);
    expect(out[infoIdx + 4]).toBe(0x80 | (7 + 11));
    // Trailing bytes (dummy cluster) survive untouched
    expect(Array.from(out.slice(-7))).toEqual([0x1f, 0x43, 0xb6, 0x75, 0x82, 0x00, 0x01]);
  });
  it('returns the input untouched when Duration already exists', () => {
    const input = makeWebm({ withDuration: true });
    const out = VS.vsPatchWebmDuration(input, 5000);
    expect(out).toBe(input);
  });
  it('bails on a known-size Segment rather than desync it', () => {
    const input = makeWebm({ knownSegmentSize: true });
    expect(VS.vsPatchWebmDuration(input, 5000)).toBe(input);
  });
  it('bails on garbage and bad durations without throwing', () => {
    const junk = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(VS.vsPatchWebmDuration(junk, 5000)).toEqual(junk);
    const input = makeWebm();
    expect(VS.vsPatchWebmDuration(input, 0)).toBe(input);
    expect(VS.vsPatchWebmDuration(input, NaN)).toBe(input);
  });
});

// ─── vsCrc32 / vsBuildZip / vsReadZip (.allopack format) ─────────────────────
describe('CRC-32 + ZIP (allopack bundle format)', () => {
  it('vsCrc32 matches the standard test vector', () => {
    const bytes = new TextEncoder().encode('123456789');
    expect(VS.vsCrc32(bytes)).toBe(0xcbf43926);
  });
  it('build → read round-trips text and binary entries', () => {
    const meta = new TextEncoder().encode('{"type":"videoRef"}');
    const fakeVideo = new Uint8Array(2048).map((_, i) => (i * 31) & 0xff);
    const zip = VS.vsBuildZip([
      { name: 'meta.json', data: meta },
      { name: 'demo.webm', data: fakeVideo },
    ]);
    expect(zip[0]).toBe(0x50); // 'PK'
    expect(zip[1]).toBe(0x4b);
    const back = VS.vsReadZip(zip);
    expect(back.map((e) => e.name)).toEqual(['meta.json', 'demo.webm']);
    expect(Array.from(back[0].data)).toEqual(Array.from(meta));
    expect(Array.from(back[1].data)).toEqual(Array.from(fakeVideo));
  });
  it('bundles are deterministic (same input → same bytes)', () => {
    const entry = [{ name: 'a.txt', data: new TextEncoder().encode('hello') }];
    expect(Array.from(VS.vsBuildZip(entry))).toEqual(Array.from(VS.vsBuildZip(entry)));
  });
  it('reader skips entries whose bytes were corrupted (CRC mismatch)', () => {
    const zip = VS.vsBuildZip([{ name: 'a.txt', data: new TextEncoder().encode('hello') }]);
    const corrupted = new Uint8Array(zip);
    corrupted[31] ^= 0xff; // flip a byte inside the file data (local header is 30 bytes + 5-char name)
    corrupted[35] ^= 0xff;
    expect(VS.vsReadZip(corrupted)).toHaveLength(0);
    expect(VS.vsReadZip(zip)).toHaveLength(1); // untouched copy still reads
  });
  it('empty bundle and garbage input degrade to empty lists', () => {
    expect(VS.vsReadZip(VS.vsBuildZip([]))).toEqual([]);
    expect(VS.vsReadZip(new Uint8Array([1, 2, 3]))).toEqual([]);
  });
  it('non-ASCII filename characters are sanitized, not corrupted', () => {
    const zip = VS.vsBuildZip([{ name: 'démo vidéo.webm', data: new Uint8Array([1]) }]);
    const back = VS.vsReadZip(zip);
    expect(back).toHaveLength(1);
    expect(back[0].name).toBe('d_mo vid_o.webm');
  });
});

// ─── vsZoomState (zoom/spotlight keyframes) ──────────────────────────────────
describe('vsZoomState', () => {
  const kf = { t: 10, x: 0.25, y: 0.75, scale: 2, dur: 3 };
  it('identity when no keyframes or outside every window', () => {
    expect(VS.vsZoomState([], 5)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([kf], 5)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([kf], 20)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
  });
  it('fully zoomed during the hold', () => {
    const mid = VS.vsZoomState([kf], 11.5);
    expect(mid.scale).toBeCloseTo(2);
    expect(mid.x).toBeCloseTo(0.25);
    expect(mid.y).toBeCloseTo(0.75);
  });
  it('eases smoothly on the entry ramp (half zoom at ramp midpoint)', () => {
    const half = VS.vsZoomState([kf], 10 - 0.3); // midpoint of the 0.6s ramp
    expect(half.scale).toBeCloseTo(1.5, 5);
    expect(half.x).toBeCloseTo(0.375, 5); // halfway from 0.5 toward 0.25
  });
  it('eases back out after the hold', () => {
    const out = VS.vsZoomState([kf], 13 + 0.3);
    expect(out.scale).toBeGreaterThan(1);
    expect(out.scale).toBeLessThan(2);
    expect(VS.vsZoomState([kf], 13 + 0.61).scale).toBeCloseTo(1, 3);
  });
  it('ignores non-zooming and malformed keyframes, clamps extremes', () => {
    expect(VS.vsZoomState([{ t: 10, scale: 1 }], 10)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    expect(VS.vsZoomState([{ t: NaN, scale: 3 }], 10)).toEqual({ scale: 1, x: 0.5, y: 0.5 });
    const wild = VS.vsZoomState([{ t: 10, x: 9, y: -3, scale: 99, dur: 3 }], 11);
    expect(wild.scale).toBeLessThanOrEqual(4);
    expect(wild.x).toBeLessThanOrEqual(1);
    expect(wild.y).toBeGreaterThanOrEqual(0);
  });
});

// --- Audio mute-span normalization + gain ------------------------------------
describe('vsNormalizeMuteSpans', () => {
  it('sorts, clamps, merges, and labels messy silence spans', () => {
    const out = VS.vsNormalizeMuteSpans([
      { start: 2, end: 1, source: 'manual', note: 'first pass' },
      { start: 1.25, end: 1.6, source: 'transcript_cleanup', note: 'cleanup word' },
      { start: Number.NaN, end: 3 },
      { start: 5, end: 5.01 },
      { start: 9.8, end: 12, source: 'ai_suggestion', note: 'tail' },
    ], 10, 0.06);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ start: 1, end: 2, source: 'mixed' });
    expect(out[0].note).toContain('first pass');
    expect(out[0].note).toContain('cleanup word');
    expect(out[1]).toMatchObject({ start: 9.8, end: 10, source: 'ai_suggestion', note: 'tail' });
  });
  it('keeps adjacent ranges separate when the gap is intentional', () => {
    const out = VS.vsNormalizeMuteSpans([
      { start: 1, end: 1.3 },
      { start: 1.5, end: 1.8 },
    ], 3, 0.05);
    expect(out).toEqual([{ start: 1, end: 1.3 }, { start: 1.5, end: 1.8 }]);
  });
});

describe('vsGainAt', () => {
  const spans = [{ start: 5, end: 8 }, { start: 20, end: 21.5 }];
  it('passes the master volume outside every span', () => {
    expect(VS.vsGainAt(spans, 1, 0)).toBe(1);
    expect(VS.vsGainAt(spans, 0.5, 10)).toBe(0.5);
    expect(VS.vsGainAt([], 1.4, 3)).toBeCloseTo(1.4);
  });
  it('silences inside a span (end-exclusive boundaries)', () => {
    expect(VS.vsGainAt(spans, 1, 5)).toBe(0);
    expect(VS.vsGainAt(spans, 1, 6.5)).toBe(0);
    expect(VS.vsGainAt(spans, 1, 8)).toBe(1); // end is exclusive
    expect(VS.vsGainAt(spans, 2, 21)).toBe(0);
  });
  it('tolerates inverted spans (start > end)', () => {
    expect(VS.vsGainAt([{ start: 8, end: 5 }], 1, 6)).toBe(0);
  });
  it('clamps volume to 0..2 and defaults bad input to 1', () => {
    expect(VS.vsGainAt([], 99, 0)).toBe(2);
    expect(VS.vsGainAt([], -3, 0)).toBe(0);
    expect(VS.vsGainAt([], NaN, 0)).toBe(1);
    expect(VS.vsGainAt(null, undefined, 0)).toBe(1);
  });
  it('skips malformed spans without silencing everything', () => {
    expect(VS.vsGainAt([null, { start: NaN, end: 5 }, { start: 1 }], 1, 2)).toBe(1);
  });
  it('uses normalized overlapping spans for playback checks', () => {
    expect(VS.vsGainAt([{ start: 4, end: 3 }, { start: 3.95, end: 4.5 }], 1, 4.2)).toBe(0);
  });
});

// ─── vsDetectFillerSpans (on-device "um" scrubber) ───────────────────────────
describe('vsBuildAudioEditManifest', () => {
  it('captures source audio edits and mix metadata without embedding audio bytes', () => {
    const manifest = VS.vsBuildAudioEditManifest({
      duration: 12,
      audio: {
        volume: 1.35,
        removeAll: false,
        muteSpans: [
          { start: 3, end: 2, source: 'manual', note: 'pause' },
          { start: 2.9, end: 4, source: 'transcript_cleanup', note: 'repeat' },
        ],
      },
      musicBed: { start: 0, end: 20, volume: 0.4, name: 'Calm loop', blob: { size: 100 } },
      narration: { volume: 0.8, mimeType: 'audio/webm' },
      audioClips: [{ id: 'clip1', name: 'Bell', t: 5, volume: 0.7, type: 'audio/wav', blob: { size: 25 } }],
      applyToSource: true,
    });
    expect(manifest).toMatchObject({
      type: 'alloflow_audio_edits',
      version: 1,
      applyToSource: true,
      bakedIntoVideo: false,
      hasAudioEdits: true,
      hasSourceAudioChanges: true,
      muteSpanCount: 1,
      hasMusicBed: true,
      audioClipCount: 1,
    });
    expect(manifest.sourceAudio.muteSpans[0]).toMatchObject({ start: 2, end: 4, source: 'mixed' });
    expect(manifest.musicBed).not.toHaveProperty('blob');
    expect(manifest.narration).toMatchObject({ present: true, embedded: false, volume: 0.8 });
    expect(manifest.audioClips[0]).toMatchObject({ id: 'clip1', start: 5, embedded: false, mimeType: 'audio/wav' });
  });
  it('can sanitize an imported manifest back into source-audio state', () => {
    const imported = VS.vsBuildAudioEditManifest({
      type: 'alloflow_audio_edits',
      duration: 8,
      applyToSource: true,
      sourceAudio: { volume: 0.9, removeAll: false, muteSpans: [{ start: 1, end: 2 }] },
    });
    expect(imported.applyToSource).toBe(true);
    expect(imported.sourceAudio).toMatchObject({ volume: 0.9, muteSpans: [{ start: 1, end: 2 }] });
  });
  it('marks narration and clip media as embedded only for editable project bundles', () => {
    const manifest = VS.vsBuildAudioEditManifest({
      duration: 9,
      narration: { blob: { size: 12 }, fileName: 'audio/narration.webm', volume: 1 },
      audioClips: [{ blob: { size: 8 }, fileName: 'audio/audio_clip_001_bell.wav', t: 2, volume: 0.6, type: 'audio/wav' }],
      mediaEmbedded: true,
      applyToSource: true,
    });
    expect(manifest.narration).toMatchObject({ embedded: true, fileName: 'audio/narration.webm' });
    expect(manifest.audioClips[0]).toMatchObject({ embedded: true, fileName: 'audio/audio_clip_001_bell.wav' });
    const auditOnly = VS.vsBuildAudioEditManifest(Object.assign({}, manifest, { mediaEmbedded: false, applyToSource: false }));
    expect(auditOnly.narration.embedded).toBe(false);
    expect(auditOnly.audioClips[0].embedded).toBe(false);
  });
});

describe('vsBuildProjectBundleReadme', () => {
  it('explains editable bundle restore behavior and licensing boundaries', () => {
    const audioManifest = VS.vsBuildAudioEditManifest({
      duration: 12,
      audio: { muteSpans: [{ start: 1, end: 2 }] },
      narration: { blob: { size: 12 }, fileName: 'audio/narration.webm' },
      audioClips: [{ blob: { size: 8 }, fileName: 'audio/audio_clip_001_bell.wav', t: 4 }],
      mediaEmbedded: true,
      applyToSource: true,
    });
    const text = VS.vsBuildProjectBundleReadme({
      title: 'Fractions demo',
      entries: [
        'meta.json',
        'fractions_demo.webm',
        'fractions_demo.vtt',
        'audio_edits.json',
        'audio/narration.webm',
        'audio/audio_clip_001_bell.wav',
        'media_credits.json',
      ],
      audioManifest,
      editableSource: true,
      generatedAt: '2026-07-09T10:00:00Z',
    });
    expect(text).toMatch(/Editable source project/);
    expect(text).toMatch(/Source audio volume\/mute edits/);
    expect(text).toMatch(/Narration audio/);
    expect(text).toMatch(/Added audio clips \(1\)/);
    expect(text).toMatch(/AGPL-3\.0/);
    expect(text).toMatch(/Media inside this bundle keeps its own license/);
    expect(text).toMatch(/media_credits\.json/);
  });
  it('marks rendered export bundle audio metadata as audit-only', () => {
    const text = VS.vsBuildProjectBundleReadme({
      title: 'Rendered lesson',
      entries: ['meta.json', 'rendered_lesson.webm', 'audio_edits.json'],
      audioManifest: { duration: 5, sourceAudio: { muteSpans: [{ start: 0, end: 1 }] }, applyToSource: false, bakedIntoVideo: true },
      editableSource: false,
      generatedAt: '2026-07-09T10:00:00Z',
    });
    expect(text).toMatch(/Rendered export bundle/);
    expect(text).toMatch(/audit only for rendered audio/);
    expect(text).not.toMatch(/Source audio volume\/mute edits/);
  });
});

describe('vsBuildProjectImportSummary', () => {
  it('summarizes restored editable bundle contents', () => {
    const summary = VS.vsBuildProjectImportSummary({
      captionCount: 4,
      transcriptEditCount: 2,
      transcriptWordCount: 40,
      chapterCount: 3,
      mediaCreditCount: 2,
      hasMusicBed: true,
      audioManifest: {
        duration: 10,
        applyToSource: true,
        sourceAudio: { muteSpans: [{ start: 1, end: 2 }] },
        narration: { embedded: true, fileName: 'audio/narration.webm' },
        audioClips: [{ embedded: true, fileName: 'audio/audio_clip_001_bell.wav', start: 4 }],
      },
      narrationRestored: true,
      audioClipCount: 1,
    });
    expect(summary.status).toBe('ok');
    expect(summary.text).toMatch(/Restored 4 captions/);
    expect(summary.text).toMatch(/source audio edits/);
    expect(summary.text).toMatch(/narration audio/);
    expect(summary.text).toMatch(/1 audio clip/);
    expect(summary.text).toMatch(/music bed/);
    expect(summary.restored).toContain('2 media credits');
  });
  it('warns when embedded audio referenced by a bundle is missing', () => {
    const summary = VS.vsBuildProjectImportSummary({
      audioManifest: {
        duration: 8,
        applyToSource: true,
        narration: { embedded: true, fileName: 'audio/narration.webm' },
      },
      missingAudioFiles: ['audio/narration.webm'],
    });
    expect(summary.status).toBe('warn');
    expect(summary.text).toMatch(/Missing bundled audio/);
    expect(summary.text).toMatch(/audio\/narration\.webm/);
  });
  it('labels rendered bundle audio metadata as review-only', () => {
    const summary = VS.vsBuildProjectImportSummary({
      audioManifest: {
        duration: 8,
        applyToSource: false,
        sourceAudio: { muteSpans: [{ start: 1, end: 2 }] },
      },
    });
    expect(summary.status).toBe('ok');
    expect(summary.text).toMatch(/audit-only/);
  });
});

describe('vsDetectFillerSpans', () => {
  const w = (word, start, end) => ({ word, start, end });
  it('finds um/uh variants with 50ms padding', () => {
    const spans = VS.vsDetectFillerSpans([w(' So', 0, 0.3), w(' um', 0.4, 0.7), w(' fractions', 0.9, 1.5)]);
    expect(spans).toHaveLength(1);
    expect(spans[0].start).toBeCloseTo(0.35);
    expect(spans[0].end).toBeCloseTo(0.75);
    expect(spans[0].text).toBe('um');
  });
  it('catches stretched fillers (ummm, uhh, erm) case-insensitively', () => {
    const spans = VS.vsDetectFillerSpans([w('Ummm', 1, 1.6), w('UHH', 3, 3.4), w('erm', 5, 5.2), w('hmm', 7, 7.3)]);
    expect(spans).toHaveLength(4);
  });
  it('does NOT flag real words like "like", "so", "well", "a"', () => {
    const spans = VS.vsDetectFillerSpans([w('like', 0, 0.3), w('so', 0.5, 0.7), w('well', 1, 1.3), w('a', 1.5, 1.6)]);
    expect(spans).toHaveLength(0);
  });
  it('flags immediate stutter repeats and silences the FIRST occurrence', () => {
    const spans = VS.vsDetectFillerSpans([w('the', 2.0, 2.2), w('the', 2.3, 2.5), w('graph', 2.6, 3.0)]);
    expect(spans).toHaveLength(1);
    expect(spans[0].start).toBeCloseTo(1.95);
    expect(spans[0].end).toBeCloseTo(2.25);
  });
  it('ignores distant repeats (not stutters) and merges adjacent spans', () => {
    expect(VS.vsDetectFillerSpans([w('go', 0, 0.2), w('go', 5, 5.2)])).toHaveLength(0);
    const merged = VS.vsDetectFillerSpans([w('um', 1, 1.3), w('uh', 1.35, 1.6)]);
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toContain('um');
    expect(merged[0].text).toContain('uh');
  });
  it('selects filler and repeated transcript words for ripple review', () => {
    const words = [
      { index: 10, word: 'So', start: 0, end: 0.2 },
      { index: 11, word: 'um', start: 0.3, end: 0.5 },
      { index: 12, word: 'the', start: 0.8, end: 1.0 },
      { index: 13, word: 'the', start: 1.1, end: 1.25 },
      { index: 14, word: 'lesson', start: 1.4, end: 1.8 },
    ];
    expect(VS.vsTranscriptWordAutoSelect(words, 'fillers')).toEqual([11]);
    expect(VS.vsTranscriptWordAutoSelect(words, 'repeats')).toEqual([12]);
    expect(VS.vsTranscriptWordAutoSelect(words, 'fillers_and_repeats')).toEqual([11, 12]);
    const queue = VS.vsBuildTranscriptCleanupQueue(words, 'fillers_and_repeats');
    expect(queue).toEqual([
      expect.objectContaining({ wordIndex: 11, text: 'um', reason: 'filler', checked: true }),
      expect.objectContaining({ wordIndex: 12, text: 'the', reason: 'repeat', checked: true }),
    ]);
  });
  it('tolerates malformed word entries', () => {
    expect(VS.vsDetectFillerSpans([null, w('', 1, 2), w('um', NaN, 2), w('um', 3, 3)])).toHaveLength(0);
    expect(VS.vsDetectFillerSpans('nope')).toEqual([]);
    expect(VS.vsTranscriptWordAutoSelect('nope', 'fillers')).toEqual([]);
  });
});

describe('vsTranscriptSelectionRange', () => {
  it('builds a padded, sorted time range from selected caption lines', () => {
    const cues = [
      { start: 0, end: 1, text: 'Opening setup.' },
      { start: 2, end: 3, text: 'Student name mentioned.' },
      { start: 3.2, end: 4.4, text: 'Keep going.' },
    ];
    const range = VS.vsTranscriptSelectionRange(cues, [2, 1, 1, 99], 10, 0.1);
    expect(range).toMatchObject({
      indices: [1, 2],
      lineCount: 2,
      text: 'Student name mentioned. Keep going.',
    });
    expect(range.start).toBeCloseTo(1.9);
    expect(range.end).toBeCloseTo(4.5);
    expect(range.duration).toBeCloseTo(2.6);
  });
  it('drops invalid lines and clamps padding to the take duration', () => {
    expect(VS.vsTranscriptSelectionRange([{ start: 4, end: 4, text: 'bad' }], [0], 5, 0.2)).toBeNull();
    const range = VS.vsTranscriptSelectionRange([{ start: 0.05, end: 4.95, text: 'whole take' }], [0], 5, 1);
    expect(range.start).toBe(0);
    expect(range.end).toBe(5);
  });
  it('builds auditable transcript edit decisions for document-style edits', () => {
    const range = VS.vsTranscriptSelectionRange([
      { start: 2, end: 3, text: 'Cut this aside.' },
      { start: 3.1, end: 4, text: 'Return to fractions.' },
    ], [0, 1], 10, 0);
    const silence = VS.vsBuildTranscriptEditDecision('mute', range, { duration: 10 });
    expect(silence).toMatchObject({
      action: 'silence',
      label: 'Silence selected audio',
      targetLayer: 'Silences',
      source: 'transcript',
      lineCount: 2,
      text: 'Cut this aside. Return to fractions.',
    });
    expect(silence.exportImpact).toContain('keeping the video length');
    const trim = VS.vsBuildTranscriptEditDecision('trim_end', range, { duration: 10 });
    expect(trim).toMatchObject({ action: 'trim_after', targetLayer: 'Trim' });
    const safe = VS.vsSanitizeTranscriptEdits([
      Object.assign({}, silence, { id: 'unsafe id<script>', createdAt: '2026-07-08T12:00:00Z' }),
      { action: 'bogus', start: 1, end: 2, text: 'drop' },
    ], 10);
    expect(safe).toHaveLength(1);
    expect(safe[0].id).toBe('unsafe-id-script');
    const text = VS.vsBuildTranscriptEditText(safe, 'Fractions');
    expect(text).toContain('Fractions transcript edit decisions');
    expect(text).toContain('Silence selected audio');
    expect(VS.vsBuildTranscriptEditDecision('bogus', range, { duration: 10 })).toBeNull();
  });
  it('approximates word-level timings and builds ripple keep segments', () => {
    const words = VS.vsTranscriptWordsFromCues([
      { start: 0, end: 2, text: 'Please remove this aside.' },
      { start: 3, end: 5, text: 'Then continue the lesson.' },
    ], 6);
    expect(words.map((w) => w.text)).toEqual(['Please', 'remove', 'this', 'aside.', 'Then', 'continue', 'the', 'lesson.']);
    expect(words[1]).toMatchObject({ cueIndex: 0, wordIndex: 1, normalized: 'remove', source: 'estimated' });
    expect(words[1].start).toBeCloseTo(0.5);
    const selection = VS.vsTranscriptWordSelectionRanges(words, [1, 2, 99], 6, 0);
    expect(selection).toMatchObject({
      wordCount: 2,
      text: 'remove this',
    });
    expect(selection.ranges).toHaveLength(1);
    const keep = VS.vsBuildRippleKeepSegments(6, selection.ranges, 0.1);
    expect(keep).toEqual([
      expect.objectContaining({ start: 0, end: 0.5, outputStart: 0 }),
      expect.objectContaining({ start: 1.5, end: 6 }),
    ]);
    const ripple = VS.vsBuildTranscriptEditDecision('delete_words', selection, { duration: 6 });
    expect(ripple).toMatchObject({ action: 'ripple_cut', targetLayer: 'Scene builder' });
  });
  it('prefers true word timestamps and groups them into readable captions', () => {
    const raw = {
      chunks: [
        { text: ' Please', timestamp: [0.1, 0.32] },
        { word: 'remove', start_time: 0.36, end_time: 0.72 },
        { text: 'this aside.', start: 0.8, end: 1.4 },
        { text: 'ignored', timestamp: [9.2, 9.8] },
      ],
    };
    const words = VS.vsSanitizeTranscriptWords(raw, 2);
    expect(words.map((w) => w.text)).toEqual(['Please', 'remove', 'this', 'aside.']);
    expect(words[0]).toMatchObject({ start: 0.1, end: 0.32, source: 'true', normalized: 'please' });
    expect(words[2].start).toBeCloseTo(0.8);
    expect(words[3].end).toBeCloseTo(1.4);
    const nested = VS.vsSanitizeTranscriptWords({
      segments: [
        { start: 0, end: 1, text: 'segment fallback' },
        { words: [{ word: 'Nested', start: 1.1, end: 1.3 }, { word: 'words', start: 1.35, end: 1.7 }] },
      ],
    }, 2);
    expect(nested.map((w) => w.text)).toEqual(['segment', 'fallback', 'Nested', 'words']);
    expect(nested[2]).toMatchObject({ cueIndex: 1, source: 'true' });
    const picked = VS.vsTranscriptWordsForTake([{ start: 0, end: 2, text: 'Fallback only' }], raw, 2);
    expect(picked[0].source).toBe('true');
    const fallback = VS.vsTranscriptWordsForTake([{ start: 0, end: 2, text: 'Fallback only' }], [], 2);
    expect(fallback[0]).toMatchObject({ text: 'Fallback', source: 'estimated' });
    const cues = VS.vsCaptionCuesFromTranscriptWords(words, 2);
    expect(cues).toEqual([expect.objectContaining({ start: 0.1, end: expect.any(Number), text: 'Please remove this aside.' })]);
  });
});

// ─── vsSanitizeAiSuggestions (untrusted model output → safe proposals) ──────
describe('vsSanitizeAiSuggestions', () => {
  it('passes well-formed suggestions of every type', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'trim_start', seconds: 3.5, reason: 'dead air' },
      { type: 'mute_span', start: 10, end: 12, reason: 'aside' },
      { type: 'zoom', t: 20, x: 0.3, y: 0.4, scale: 2, dur: 4, reason: 'points at graph' },
      { type: 'title', text: 'Equivalent fractions in 3 minutes' },
    ], 60);
    expect(out.map((s) => s.type)).toEqual(['trim_start', 'mute_span', 'zoom', 'title']);
  });
  it('drops unknown types and executable-looking garbage entirely', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'run_script', code: 'alert(1)' },
      { type: 'delete_take' },
      'just a string',
      null,
    ], 60);
    expect(out).toHaveLength(0);
  });
  it('clamps every number into the take duration and legal ranges', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'mute_span', start: -5, end: 900 },
      { type: 'zoom', t: 900, x: 7, y: -2, scale: 99, dur: 500 },
    ], 60);
    expect(out[0]).toMatchObject({ start: 0, end: 60 });
    expect(out[1].t).toBe(60);
    expect(out[1].x).toBe(1);
    expect(out[1].y).toBe(0);
    expect(out[1].scale).toBe(4);
    expect(out[1].dur).toBe(30);
  });
  it('rejects impossible trims and inverted spans', () => {
    const out = VS.vsSanitizeAiSuggestions([
      { type: 'trim_start', seconds: 61 },
      { type: 'trim_end', seconds: 0 },
      { type: 'mute_span', start: 20, end: 20 },
    ], 60);
    expect(out).toHaveLength(0);
  });
  it('accepts the {suggestions:[...]} wrapper shape and caps at 20', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ type: 'mute_span', start: i, end: i + 0.5 }));
    const out = VS.vsSanitizeAiSuggestions({ suggestions: many }, 60);
    expect(out).toHaveLength(20);
    expect(VS.vsSanitizeAiSuggestions('garbage', 60)).toEqual([]);
  });
  it('caps title/reason strings and strips newlines', () => {
    const out = VS.vsSanitizeAiSuggestions([{ type: 'title', text: 'x'.repeat(500) + '\nline2', reason: 'r'.repeat(500) }], 60);
    expect(out[0].text.length).toBeLessThanOrEqual(120);
    expect(out[0].reason.length).toBeLessThanOrEqual(300);
    expect(out[0].text).not.toContain('\n');
  });
});

// ─── vsComputePeaks (waveform timeline) ──────────────────────────────────────
describe('vsComputePeaks', () => {
  it('produces the requested number of buckets, normalized 0..1', () => {
    const samples = new Float32Array(16000).fill(0.5);
    const peaks = VS.vsComputePeaks(samples, 100);
    expect(peaks).toHaveLength(100);
    peaks.forEach((p) => expect(p).toBeCloseTo(0.5));
  });
  it('uses per-bucket PEAK so a brief spike stays visible', () => {
    const samples = new Float32Array(1000);
    samples[500] = 0.9; // single-sample spike
    const peaks = VS.vsComputePeaks(samples, 10);
    expect(Math.max(...peaks)).toBeCloseTo(0.9);
    expect(peaks.filter((p) => p > 0)).toHaveLength(1);
  });
  it('handles negative samples (absolute value) and clips >1 to 1', () => {
    const peaks = VS.vsComputePeaks(Float32Array.from([-0.8, 0.1, 3.5, 0]), 10);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks.some((p) => Math.abs(p - 0.8) < 1e-6)).toBe(true);
  });
  it('empty input gives silent buckets; bucket count is clamped', () => {
    expect(VS.vsComputePeaks(null, 50)).toHaveLength(50);
    expect(VS.vsComputePeaks(new Float32Array(0), 50).every((p) => p === 0)).toBe(true);
    expect(VS.vsComputePeaks(new Float32Array(10), 99999)).toHaveLength(4000);
    expect(VS.vsComputePeaks(new Float32Array(10), -5)).toHaveLength(10);
    expect(VS.vsComputePeaks(new Float32Array(10), NaN)).toHaveLength(600);
  });
  it('works when samples outnumber and undernumber buckets', () => {
    expect(VS.vsComputePeaks(new Float32Array(7).fill(0.3), 20)).toHaveLength(20);
    expect(VS.vsComputePeaks(new Float32Array(100000).fill(0.2), 12)).toHaveLength(12);
  });
});

// ─── vsSanitizeNarrationCues (AI narration scripts) ─────────────────────────
describe('vsSanitizeNarrationCues', () => {
  it('passes well-formed segments and sorts them', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: 10, end: 14, text: 'Now watch the denominator.' },
      { start: 2, end: 5, text: 'This is a fraction wall.' },
    ], 60);
    expect(out.map((s) => s.text)).toEqual(['This is a fraction wall.', 'Now watch the denominator.']);
  });
  it('clamps times, invents a sensible end when missing, drops textless items', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: -5, text: 'clamped start' },
      { start: 20, end: 900, text: 'clamped end' },
      { start: 30, end: 32 },
      { start: NaN, end: 5, text: 'bad start' },
    ], 60);
    expect(out).toHaveLength(2);
    expect(out[0].start).toBe(0);
    expect(out[0].end).toBeGreaterThan(0);
    expect(out[1].end).toBe(60);
  });
  it('pushes overlapping starts apart so TTS clips never stack', () => {
    const out = VS.vsSanitizeNarrationCues([
      { start: 10, end: 12, text: 'a' },
      { start: 10, end: 12, text: 'b' },
      { start: 10.1, end: 12, text: 'c' },
    ], 60);
    expect(out[1].start).toBeCloseTo(10.5);
    expect(out[2].start).toBeCloseTo(11.0);
  });
  it('accepts wrapper shapes, caps at 20, strips newlines, caps text length', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ start: i * 2, end: i * 2 + 1, text: 'line\n' + 'x'.repeat(400) }));
    const out = VS.vsSanitizeNarrationCues({ segments: many }, 120);
    expect(out).toHaveLength(20);
    expect(out[0].text).not.toContain('\n');
    expect(out[0].text.length).toBeLessThanOrEqual(220);
    expect(VS.vsSanitizeNarrationCues('garbage', 60)).toEqual([]);
  });
});

describe('pronunciation glossary helpers', () => {
  it('parses reviewed term mappings and rejects malformed or duplicate entries', () => {
    const entries = VS.vsParsePronunciationGlossary('AlloFlow = AL-oh-flow\nC++ -> see plus plus\nAlloFlow = duplicate\ninvalid');
    expect(entries).toEqual([
      { term: 'AlloFlow', spoken: 'AL-oh-flow' },
      { term: 'C++', spoken: 'see plus plus' },
    ]);
  });

  it('changes only synthesis text, supports punctuation terms, and avoids word substrings', () => {
    const spoken = VS.vsApplyPronunciationGlossary(
      'AlloFlow supports a C++ example, but AlloFlowTools stays written.',
      'AlloFlow = AL-oh-flow\nC++ = see plus plus',
    );
    expect(spoken).toBe('AL-oh-flow supports a see plus plus example, but AlloFlowTools stays written.');
    expect(VS.vsApplyPronunciationGlossary('Keep this.', '')).toBe('Keep this.');
  });
});
describe('vsScriptTextToNarrationCues', () => {
  it('splits freeform scripts into ordered editable cues fitted to the video', () => {
    const cues = VS.vsScriptTextToNarrationCues(
      'Welcome to fractions. Today we will compare halves and fourths.\nWatch how the pieces line up before you try one.',
      45,
      { targetWords: 8 },
    );
    expect(cues.length).toBeGreaterThanOrEqual(3);
    expect(cues[0].text).toContain('Welcome');
    expect(cues.every((cue, index) => cue.start >= 0 && cue.end <= 45 && cue.end > cue.start && (!index || cue.start >= cues[index - 1].start))).toBe(true);
    expect(cues.map((cue) => cue.text).join(' ')).toContain('pieces line up');
  });

  it('sanitizes controls, caps cue and line counts, and handles empty text', () => {
    const script = Array.from({ length: 30 }, (_, i) => 'Section ' + i + ' explains ' + 'word '.repeat(30) + '.').join('\n');
    const cues = VS.vsScriptTextToNarrationCues(script + '\u0000', 180, { targetWords: 12 });
    expect(cues).toHaveLength(20);
    expect(cues.every((cue) => cue.text.length <= 220 && !cue.text.includes('\u0000'))).toBe(true);
    expect(VS.vsScriptTextToNarrationCues('', 60)).toEqual([]);
  });
});

describe('freeform Script Studio wiring', () => {
  it('generates or prepares scripts through the existing narration and TTS workflow', () => {
    const html = readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
    const module = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
    expect(html).toContain('id="scriptStudioPanel"');
    expect(html).toContain('id="scriptStudioInput"');
    expect(html).toContain('id="scriptStudioTone"');
    expect(html).toContain('id="scriptStudioAudience"');
    expect(html).toContain('id="scriptStudioGenerateBtn"');
    expect(html).toContain('id="scriptStudioPrepareBtn"');
    expect(html).toContain('id="scriptStudioPronunciation"');
    expect(html).toContain('Written scripts and captions stay unchanged');
    expect(html).toContain('id="narrAddLineBtn"');
    expect(html).toContain('id="narrRedistributeBtn"');
    expect(html).toContain('function prepareScriptStudioNarration(script, sourceLabel)');
    expect(html).toContain('function redistributeAiNarrationTiming()');
    expect(html).toContain('function splitAiNarrationLine(index)');
    expect(html).toContain('function mergeAiNarrationLine(index)');
    expect(html).toContain('async function rewriteAiNarrationLine(index, button)');
    expect(html).toContain("bridgeRequest('allostudio-script-line-request'");
    expect(html).toContain("vsApplyPronunciationGlossary(s.text, $('scriptStudioPronunciation').value)");
    expect(html).toContain("'End time of narration line ' + (idx + 1)");
    expect(html).toContain("'Voice for narration line ' + (idx + 1)");
    expect(html).toContain("{ text: spokenText, voice: s.voice || voice }");
    expect(html).toContain('vsScriptTextToNarrationCues(clean, t.duration || 0');
    expect(html).toContain("bridgeRequest('allostudio-script-generate-request'");
    expect(html).toContain('The script is likely longer than the video');
    expect(module).toContain("ev.data.type === 'allostudio-script-line-request'");
    expect(module).toContain("type: 'allostudio-script-line-response'");
    expect(module).toContain('Keep glossary terms in their original written spelling');
    expect(module).toContain("ev.data.type === 'allostudio-script-generate-request'");
    expect(module).toContain("type: 'allostudio-script-generate-response'");
    expect(module).toContain('captured pixels and audio stay local');
    expect(module).toContain('Hard maximum:');
    expect(module).toContain('Do not invent quotations, people, student data');
  });
});
// ─── vsSanitizeVisualDescriptions (AI visual-description scripts) ───────────
describe('vsSanitizeVisualDescriptions', () => {
  it('passes well-formed descriptions, sorts them, and normalizes labels', () => {
    const out = VS.vsSanitizeVisualDescriptions([
      { start: 12, end: 16, description: 'The seedling bends toward the light.', basis: 'observed', confidence: 'high' },
      { start: 2, end: 5, text: 'A title card introduces plant growth.', basis: 'source', confidence: 0.5 },
    ], 60);
    expect(out.map((s) => s.description)).toEqual([
      'A title card introduces plant growth.',
      'The seedling bends toward the light.',
    ]);
    expect(out[0]).toMatchObject({ basis: 'source-supported', confidence: 'medium' });
    expect(out[1]).toMatchObject({ basis: 'observed', confidence: 'high' });
  });
  it('clamps times, repairs missing ends, and marks unknown basis for review', () => {
    const out = VS.vsSanitizeVisualDescriptions({ descriptions: [
      { start: -3, description: 'The camera pans across the pond.', basis: 'maybe', confidence: 0.2 },
      { start: 58, end: 999, description: 'A close-up shows ripples.' },
      { start: NaN, end: 4, description: 'bad start' },
      { start: 6, end: 8 },
    ] }, 60);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ start: 0, basis: 'needs-review', confidence: 'low' });
    expect(out[1].end).toBe(60);
  });
  it('caps count and text, strips newlines, and rejects garbage', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ start: i, end: i + 1, description: 'x'.repeat(400) + '\nline' }));
    const out = VS.vsSanitizeVisualDescriptions({ segments: many }, 120);
    expect(out).toHaveLength(24);
    expect(out[0].description.length).toBeLessThanOrEqual(280);
    expect(out[0].description).not.toContain('\n');
    expect(VS.vsSanitizeVisualDescriptions('garbage', 60)).toEqual([]);
  });
});

// ─── vsPcmToWav ──────────────────────────────────────────────────────────────
describe('caption polish, chapters, and teaching inserts', () => {
  it('cleans caption text and merges tight splits safely', () => {
    const out = VS.vsPolishCaptions([
      { start: 0, end: 1, text: '  i notice  ' },
      { start: 1.1, end: 2, text: 'the denominator' },
      { start: 5, end: 6, text: 'next idea?' },
    ], 20);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ start: 0, end: 2, text: 'I notice the denominator.' });
    expect(out[1].text).toBe('Next idea?');
  });
  it('normalizes caption style presets and preview line wrapping', () => {
    expect(VS.vsCaptionStylePreset('lower third')).toMatchObject({
      key: 'lower-third',
      className: 'caption-style-lower-third',
      position: 'lower-left',
    });
    expect(VS.vsCaptionStylePreset('unknown')).toMatchObject({ key: 'clean-card' });
    const lines = VS.vsCaptionPreviewLines('This is a longer caption that should wrap cleanly without overflowing the preview overlay.', 28, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]).toMatch(/\.\.\.$/);
    expect(lines.every(line => line.length <= 31)).toBe(true);
    expect(VS.vsCaptionDisplayOptions({ size: 'giant', position: 'side' }, 'high contrast')).toMatchObject({
      styleKey: 'high-contrast',
      size: 'medium',
      position: 'preset',
    });
    expect(VS.vsResolveCaptionStyle('clean-card', { size: 'large', font: 'legible', position: 'top', background: 'none' })).toMatchObject({
      position: 'top',
      box: false,
      fontWeight: 800,
      contrastNote: 'Outline added for readability.',
    });
    expect(VS.vsResolveCaptionStyle('lower third', { background: 'soft', opacity: 'strong' })).toMatchObject({
      position: 'lower-left',
      background: 'rgba(30,64,175,0.92)',
    });
    expect(VS.vsTitleCardPreset('calm family')).toMatchObject({
      key: 'calm-family',
      footer: 'Student and family explainer',
      align: 'left',
    });
    expect(VS.vsTitleCardPreset('unknown')).toMatchObject({ key: 'clean-classroom' });
    expect(VS.vsPipFramePreset('teacher label')).toMatchObject({
      key: 'teacher-label',
      shape: 'rounded',
      labelText: 'Teacher',
    });
    expect(VS.vsPipFramePreset('unknown')).toMatchObject({ key: 'clean-circle', shape: 'circle' });
    expect(VS.vsInsertCardLayout('lower banner')).toMatchObject({
      key: 'lower-banner',
      placement: 'bottom',
      align: 'left',
    });
    expect(VS.vsInsertCardLayout('unknown')).toMatchObject({ key: 'center-card' });
  });
  it('builds lesson chapters from caption gaps and transition language', () => {
    const chapters = VS.vsBuildChapters([
      { start: 0, end: 4, text: 'welcome to equivalent fractions' },
      { start: 12, end: 18, text: 'we model one half' },
      { start: 62, end: 68, text: 'next compare the two denominators' },
      { start: 122, end: 128, text: 'finally try one on your own' },
    ], 150);
    expect(chapters.map(c => c.start)).toEqual([0, 62, 122]);
    expect(chapters[0].title).toMatch(/Welcome/i);
    expect(chapters[1].title).toMatch(/Next compare/i);
  });
  it('sanitizes teaching inserts for editable video overlays', () => {
    const inserts = VS.vsSanitizeTeachingInserts([
      { type: 'pause', start: -5, duration: 999, text: 'try it', theme: 'amber', layout: 'lower banner' },
      { type: 'gif', t: 10, text: '', x: 9, y: -2, animation: 'bounce' },
      { type: 'callout', start: 12, duration: 3, text: 'focus here', style: 'spotlight' },
      { type: 'generated_image', start: 20, imageSrc: 'javascript:bad', text: 'visual' },
      { type: 'run_script', start: 1, text: 'bad' },
    ], 30);
    expect(inserts.map(i => i.type)).toEqual(['pause_prompt', 'sticker', 'callout', 'visual_card']);
    expect(inserts[0]).toMatchObject({ start: 0, end: 15, theme: 'amber', layout: 'lower-banner' });
    expect(inserts[1].x).toBe(1);
    expect(inserts[1].y).toBe(0);
    expect(inserts[2]).toMatchObject({ type: 'callout', style: 'spotlight' });
    expect(inserts[3].imageSrc).toBe('');
  });
  it('accepts safe generated image data URIs for visual cards', () => {
    const inserts = VS.vsSanitizeTeachingInserts({ inserts: [{ type: 'visual_card', start: 4, duration: 3, text: 'Fraction wall', imageSrc: 'data:image/png;base64,abc' }] }, 20);
    expect(inserts).toHaveLength(1);
    expect(inserts[0]).toMatchObject({ type: 'visual_card', imageSrc: 'data:image/png;base64,abc' });
  });
  it('sanitizes timed image overlays with motion controls', () => {
    const inserts = VS.vsSanitizeTeachingInserts([
      { type: 'image_overlay', start: 6, duration: 8, text: 'Cell diagram', imageSrc: 'data:image/png;base64,abc', x: 2, y: -1, width: 2, motion: 'slide-left', source: 'resource', resourceId: 'gloss-1' },
      { type: 'image_overlay', start: 9, duration: 5, text: 'Frame capture', imageSrc: 'data:image/png;base64,frame', source: 'frame-capture', width: 0.36 },
      { type: 'image_overlay', start: 2, imageSrc: 'https://example.com/unsafe.png' },
    ], 30);
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({ type: 'image_overlay', x: 1, y: 0, width: 0.9, motion: 'slide_left', source: 'resource', resourceId: 'gloss-1' });
    expect(inserts[1]).toMatchObject({ type: 'image_overlay', source: 'frame-capture', width: 0.36 });
  });
  it('computes overlay motion state for scripted movement', () => {
    const start = VS.vsOverlayFrameState({ start: 10, end: 20, x: 0.5, y: 0.5, width: 0.25, motion: 'slide_left' }, 10.5);
    const later = VS.vsOverlayFrameState({ start: 10, end: 20, x: 0.5, y: 0.5, width: 0.25, motion: 'slide_left' }, 18);
    expect(start.x).toBeGreaterThan(later.x);
    expect(start.width).toBe(0.25);
    expect(start.alpha).toBeGreaterThan(0);
  });
  it('sanitizes and applies music bed fades plus ducking', () => {
    const music = VS.vsSanitizeMusicBed({ start: -5, end: 500, volume: 9, fadeIn: 2, fadeOut: 4, duck: true, name: '  Calm loop  ' }, 60);
    expect(music).toMatchObject({ start: 0, end: 60, volume: 1.5, fadeIn: 2, fadeOut: 4, duck: true, name: 'Calm loop' });
    expect(VS.vsMusicGainAt(music, 0.5, false)).toBeCloseTo(0.375, 3);
    expect(VS.vsMusicGainAt(music, 30, true)).toBeCloseTo(0.57, 3);
    expect(VS.vsMusicGainAt(music, 61, false)).toBe(0);
    const preset = VS.vsAudioPolishPreset('quiet voice');
    expect(preset).toMatchObject({ key: 'quiet_voice', audio: { volume: 1.25, removeAll: false } });
    const applied = VS.vsApplyAudioPolishPreset({
      audio: { volume: 0.9, removeAll: false, muteSpans: [{ start: 2, end: 1 }, { start: 1.8, end: 2.4 }] },
      musicBed: { start: 0, end: 60, volume: 0.8, fadeIn: 0, fadeOut: 0, duck: false, name: 'Loop' },
      duration: 60,
    }, 'music_under');
    expect(applied.audio).toMatchObject({ volume: 1, removeAll: false });
    expect(applied.audio.muteSpans).toHaveLength(1);
    expect(applied.audio.muteSpans[0]).toMatchObject({ start: 1, end: 2.4 });
    expect(applied.musicBed).toMatchObject({ volume: 0.16, fadeIn: 2, fadeOut: 3, duck: true });
    expect(VS.vsApplyAudioPolishPreset({ audio: {}, duration: 20 }, 'voiceover_replace').audio.removeAll).toBe(true);
  });
  it('normalizes licensed media credits conservatively for AGPL sharing', () => {
    expect(VS.vsMediaLicenseProfile('CC0 1.0')).toMatchObject({
      status: 'ok',
      openContent: true,
      agplFriendly: true,
      attributionRequired: false,
    });
    expect(VS.vsMediaLicenseProfile('CC BY 4.0')).toMatchObject({
      status: 'ok',
      openContent: true,
      agplFriendly: true,
      attributionRequired: true,
    });
    expect(VS.vsMediaLicenseProfile('CC BY-NC 4.0')).toMatchObject({
      status: 'warn',
      openContent: false,
      agplFriendly: false,
    });
    expect(VS.vsMediaLicenseProfile('Pixabay Content License')).toMatchObject({
      status: 'warn',
      openContent: false,
      agplFriendly: false,
    });
    const credits = VS.vsSanitizeMediaCredits([
      {
        title: 'Calm bell',
        creator: 'A. Teacher',
        url: 'https://freesound.org/s/123/',
        source: 'Freesound',
        license: 'CC BY 4.0',
        role: 'sound effect',
        modified: true,
      },
      {},
    ]);
    expect(credits).toHaveLength(1);
    expect(credits[0]).toMatchObject({
      title: 'Calm bell',
      creator: 'A. Teacher',
      source: 'Freesound',
      license: 'CC BY 4.0',
      role: 'sound effect',
      modified: true,
      status: 'ok',
      agplFriendly: true,
    });
    expect(credits[0].id).toMatch(/^credit-calm-bell-a-teacher-https-freesound-org-s-123/);
    expect(credits[0].attribution).toContain('"Calm bell" by A. Teacher');
    expect(credits[0].attribution).toContain('CC BY 4.0');
    const text = VS.vsBuildMediaCredits(credits, 'Bell demo');
    expect(text).toContain('Bell demo media credits');
    expect(text).toContain('Role: sound effect');
    const card = VS.vsBuildMediaCreditsCard(credits, 60);
    expect(card).toMatchObject({
      id: 'media-credits-card',
      type: 'title_card',
      start: 54,
      end: 60,
      text: 'Media credits',
      theme: 'slate',
      layout: 'center-card',
      source: 'media_credits',
    });
    expect(card.note).toContain('Calm bell - A. Teacher (CC BY 4.0)');
    expect(VS.vsBuildMediaCreditsCard([], 60)).toBeNull();
    const targets = VS.vsMediaSearchTargets('calm bell', '');
    expect(targets.map(t => t.id)).toEqual(['openverse', 'commons', 'freesound', 'pixabay']);
    expect(targets[0].url).toContain('calm%20bell');
    expect(VS.vsMediaSearchTargets('fraction wall', 'Freesound')).toEqual([
      expect.objectContaining({ id: 'freesound', defaultLicense: 'CC BY 4.0' }),
    ]);
    const audit = VS.vsBuildPermissionAudit({
      captionCount: 0,
      privacyFlagCount: 1,
      mediaCreditCount: 2,
      mediaCreditWarningCount: 1,
      localizationWarningCount: 1,
    });
    expect(audit.find(i => i.id === 'privacy')).toMatchObject({ status: 'warn', targetId: 'transcriptSearch' });
    expect(audit.find(i => i.id === 'captions')).toMatchObject({ status: 'warn', targetId: 'autoCapBtn' });
    expect(audit.find(i => i.id === 'media')).toMatchObject({ status: 'warn', targetId: 'mediaCreditTitle' });
    expect(audit.find(i => i.id === 'localization')).toMatchObject({ status: 'warn', targetId: 'localizeBtn' });
  });
  it('builds searchable resource cues from pack history', () => {
    const cues = VS.vsBuildResourceCues([
      { id: 'g1', type: 'glossary', title: 'Photosynthesis terms', data: [{ term: 'Chlorophyll', definition: 'Green pigment', image: 'data:image/png;base64,abc' }] },
      { id: 'img1', type: 'image', title: 'Leaf cross-section', data: { imageUrl: 'data:image/png;base64,def', prompt: 'leaf diagram' } },
      { id: 'q1', type: 'quiz', title: 'Exit ticket', data: { questions: [{ question: 'What enters the leaf?' }] } },
    ]);
    expect(cues.map(c => c.kind)).toEqual(['glossary', 'image', 'question']);
    expect(cues[0]).toMatchObject({ label: 'Chlorophyll', imageSrc: 'data:image/png;base64,abc', sourceTitle: 'Photosynthesis terms' });
    expect(cues[2].text).toMatch(/leaf/);
  });
  it('sanitizes frame-aware lesson assistant plans into safe editable primitives', () => {
    const plan = VS.vsSanitizeLessonPlan({
      plan: [
        { type: 'chapter', start: 6, label: 'What equivalent means' },
        { type: 'pause_question', start: 18, duration: 5, text: 'Pause: which model shows one half?', style: 'box' },
        { type: 'zoom', start: 22, x: 9, y: -2, scale: 9, duration: 99 },
        { type: 'image_prompt', start: 28, label: 'Clean diagram', prompt: 'Create a simple fraction wall still.' },
        { type: 'motion_sticker', start: 32, label: 'Key idea', prompt: 'A short sparkle around the correct denominator.' },
        { type: 'run_code', start: 1, text: 'bad' },
      ],
    }, 40);
    expect(plan.map(p => p.type)).toEqual(['chapter', 'pause_question', 'zoom', 'image_prompt', 'motion_sticker']);
    expect(plan[1]).toMatchObject({ style: 'box', start: 18 });
    expect(plan[2]).toMatchObject({ x: 1, y: 0, scale: 4, dur: 30 });
    expect(plan[3].prompt).toMatch(/fraction wall/);
  });
  it('caps lesson assistant plan count/text and rejects garbage', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ type: 'callout', start: i, duration: 2, text: 'x'.repeat(500), style: 'spotlight' }));
    const out = VS.vsSanitizeLessonPlan(many, 120);
    expect(out).toHaveLength(16);
    expect(out[0].text.length).toBeLessThanOrEqual(280);
    expect(out[0].style).toBe('spotlight');
    expect(VS.vsSanitizeLessonPlan('garbage', 60)).toEqual([]);
  });
  it('sanitizes localized video drafts for translated versions and interpreter audio', () => {
    const draft = VS.vsSanitizeLocalizedDraft({
      targetLanguage: 'Spanish',
      style: 'Interpreter',
      localizedTitle: 'Fracciones equivalentes',
      speakerMap: { Teacher: 'Maestra' },
      captions: [
        { start: 3, end: 5, speaker: 'Teacher', originalText: 'Watch the denominator.', translation: 'Miren el denominador.' },
        { start: -4, end: 1, text: 'Hola.' },
        { start: 8, text: '' },
      ],
      chapters: [{ start: 3, title: 'Modelo visual' }],
      inserts: [{ type: 'pause_prompt', start: 6, duration: 4, text: 'Pausa y prueba.', theme: 'amber' }],
      visualDescriptions: [{ start: 2, end: 4, description: 'Aparece un modelo de fracciones.', checked: true }],
      interpreterScript: [
        { start: 3, end: 6, speaker: 'Interpreter', text: 'Miren cómo cambia el denominador.' },
        { start: 3.1, end: 6, speaker: 'Student', text: 'Yo veo dos partes.' },
      ],
      reviewNotes: ['Teacher should verify math vocabulary.'],
    }, 20);
    expect(draft).toMatchObject({ targetLanguage: 'Spanish', style: 'interpreter', title: 'Fracciones equivalentes' });
    expect(draft.captions.map(c => c.text)).toEqual(['Hola.', 'Miren el denominador.']);
    expect(draft.captions[1]).toMatchObject({ speaker: 'Teacher', originalText: 'Watch the denominator.' });
    expect(draft.inserts[0]).toMatchObject({ type: 'pause_prompt', text: 'Pausa y prueba.', source: 'localization' });
    expect(draft.visualDescriptions[0]).toMatchObject({ checked: true });
    expect(draft.narration[1].start).toBeGreaterThan(draft.narration[0].start);
    expect(draft.speakerMap[0]).toMatchObject({ speaker: 'Teacher', translatedLabel: 'Maestra' });
    expect(draft.reviewNotes[0]).toMatch(/vocabulary/);
  });
  it('caps localized drafts and drops unsafe empty localization output', () => {
    const many = Array.from({ length: 340 }, (_, i) => ({ start: i, end: i + 1, text: 'caption ' + i }));
    const draft = VS.vsSanitizeLocalizedDraft({
      language: 'Haitian Creole',
      style: 'unknown',
      captions: many,
      overlays: [{ type: 'image_overlay', start: 2, imageSrc: 'https://example.com/not-safe.png', text: 'bad' }],
      narration: Array.from({ length: 50 }, (_, i) => ({ start: i * 0.1, text: 'line ' + i })),
      warnings: Array.from({ length: 20 }, (_, i) => 'note ' + i),
    }, 60);
    expect(draft.style).toBe('natural');
    expect(draft.captions).toHaveLength(300);
    expect(draft.inserts).toEqual([]);
    expect(draft.narration).toHaveLength(40);
    expect(draft.reviewNotes).toHaveLength(12);
    expect(VS.vsSanitizeLocalizedDraft('garbage', 10).captions).toEqual([]);
  });
  it('analyzes localized drafts for review risks before sharing', () => {
    const qa = VS.vsAnalyzeLocalizationDraft({
      targetLanguage: 'Spanish',
      captions: [
        { start: 8, end: 11, text: 'Una linea traducida muy larga '.repeat(12), speaker: 'Teacher' },
        { start: 10, end: 12, text: 'Otra linea traducida.', speaker: 'Teacher' },
        { start: 12, end: 14, text: 'Tercera linea traducida.', speaker: 'Teacher' },
        { start: 14, end: 16, text: 'Cuarta linea traducida.', speaker: 'Teacher' },
      ],
      narration: [{ start: 2, end: 3, text: 'Esta interpretacion tiene demasiadas palabras para caber comodamente en un segundo.' }],
    }, [
      { start: 0, end: 2, text: 'First source caption.' },
      { start: 3, end: 5, text: 'Second source caption.' },
      { start: 6, end: 8, text: 'Third source caption.' },
      { start: 9, end: 11, text: 'denominator example.' },
      { start: 12, end: 13, text: 'Fifth source caption.' },
      { start: 14, end: 15, text: 'Sixth source caption.' },
      { start: 16, end: 17, text: 'Seventh source caption.' },
    ], { duration: 20, glossary: 'denominator' });
    expect(qa.ok).toBe(false);
    expect(qa.warnings.map(w => w.label)).toEqual(expect.arrayContaining([
      'Caption count changed',
      'Caption timing drift',
      'Long subtitle lines',
      'Speaker labels need review',
      'Glossary locks',
      'Interpreter pacing',
      'Teacher review',
    ]));
  });
  it('clears the teacher-review localization warning once reviewed', () => {
    const qa = VS.vsAnalyzeLocalizationDraft({
      targetLanguage: 'Spanish',
      reviewed: true,
      captions: [{ start: 0, end: 2, text: 'Fracciones equivalentes', originalText: 'Equivalent fractions' }],
    }, [
      { start: 0, end: 2, text: 'Equivalent fractions' },
    ], { duration: 8 });
    expect(qa.ok).toBe(true);
    expect(qa.reviewed).toBe(true);
    expect(qa.warnings.map(w => w.label)).not.toContain('Teacher review');
  });
  it('flags caption readability and timing issues for final review', () => {
    const qa = VS.vsAnalyzeCaptionQuality([
      { start: 0, end: 1, text: 'This caption is far too dense and long to read comfortably in one second '.repeat(3) },
      { start: 0.8, end: 2, text: 'Overlaps the previous caption.' },
      { start: 20, end: 22, text: 'Returns after a long gap.' },
    ], 30);
    expect(qa.ok).toBe(false);
    expect(qa.captionCount).toBe(3);
    expect(qa.warnings.map(w => w.label)).toEqual(expect.arrayContaining([
      'Long caption lines',
      'Fast captions',
      'Caption gaps',
      'Overlapping captions',
    ]));
    expect(qa.issues.map(i => i.kind)).toEqual(expect.arrayContaining([
      'long_line',
      'fast_line',
      'gap',
      'overlap',
    ]));
    expect(qa.issues.find(i => i.kind === 'overlap')).toMatchObject({ index: 1, start: 0.8 });
  });
  it('builds a calm finish checklist from video review state', () => {
    const items = VS.vsBuildFinishChecklist({
      hasVideo: true,
      captionCount: 8,
      privacyFlagCount: 0,
      hasAudioChanges: true,
      localizationCount: 1,
      localizationWarningCount: 0,
      mediaCreditCount: 1,
      mediaCreditWarningCount: 0,
      exported: false,
      review: { captions: true, privacy: true, audio: false, localization: true },
    });
    expect(items.find(i => i.id === 'captions')).toMatchObject({ status: 'complete' });
    expect(items.find(i => i.id === 'audio')).toMatchObject({ status: 'review' });
    expect(items.find(i => i.id === 'localization')).toMatchObject({ status: 'complete' });
    expect(items.find(i => i.id === 'media')).toMatchObject({ status: 'complete', targetTab: 'tabEdit', targetId: 'mediaCreditTitle', action: 'Review' });
    expect(items.find(i => i.id === 'privacy')).toMatchObject({ targetTab: 'tabEdit', targetId: 'transcriptSearch', action: 'Review' });
    expect(items.find(i => i.id === 'export')).toMatchObject({ status: 'pending', targetTab: 'tabExport', targetId: 'exportBtn', action: 'Prepare' });
  });
  it('elevates caption checklist status when caption QA finds issues', () => {
    const items = VS.vsBuildFinishChecklist({
      hasVideo: true,
      captionCount: 6,
      captionWarningCount: 2,
      privacyFlagCount: 0,
      hasAudioChanges: false,
      localizationCount: 0,
      exported: false,
      review: { captions: true, privacy: true, audio: true },
    });
    expect(items.find(i => i.id === 'captions')).toMatchObject({ status: 'warn' });
  });
  it('flags risky media-credit licenses before sharing', () => {
    const items = VS.vsBuildFinishChecklist({
      hasVideo: true,
      captionCount: 6,
      privacyFlagCount: 0,
      hasAudioChanges: false,
      mediaCreditCount: 2,
      mediaCreditWarningCount: 1,
      exported: false,
      review: { captions: true, privacy: true, audio: true },
    });
    expect(items.find(i => i.id === 'media')).toMatchObject({
      status: 'warn',
      targetTab: 'tabEdit',
      targetId: 'mediaCreditTitle',
    });
    const summary = VS.vsBuildExportReadinessSummary({
      hasExport: true,
      duration: 30,
      mediaCreditCount: 2,
      mediaCreditWarningCount: 1,
    });
    expect(summary.find(i => i.id === 'media')).toMatchObject({ status: 'warn' });
  });
  it('chooses the next actionable finish item by severity and workflow order', () => {
    const next = VS.vsPickNextFinishItem([
      { id: 'audio', status: 'review' },
      { id: 'export', status: 'pending' },
      { id: 'captions', status: 'warn' },
      { id: 'privacy', status: 'warn' },
    ]);
    expect(next).toMatchObject({ id: 'captions', status: 'warn' });
    expect(VS.vsPickNextFinishItem([
      { id: 'audio', status: 'review' },
      { id: 'export', status: 'pending' },
    ])).toMatchObject({ id: 'audio' });
    expect(VS.vsPickNextFinishItem([
      { id: 'video', status: 'pending' },
      { id: 'captions', status: 'warn' },
    ])).toMatchObject({ id: 'video' });
    expect(VS.vsPickNextFinishItem([
      { id: 'export', status: 'pending' },
      { id: 'media', status: 'warn' },
    ])).toMatchObject({ id: 'media' });
    expect(VS.vsPickNextFinishItem([{ id: 'video', status: 'complete' }])).toBeNull();
  });
  it('keeps localization in review until teacher review is marked complete', () => {
    const items = VS.vsBuildFinishChecklist({
      hasVideo: true,
      captionCount: 3,
      privacyFlagCount: 0,
      hasAudioChanges: false,
      localizationCount: 1,
      localizationWarningCount: 0,
      exported: true,
      review: { captions: true, privacy: true, audio: true, localization: false },
    });
    expect(items.find(i => i.id === 'localization')).toMatchObject({ status: 'review' });
    expect(items.find(i => i.id === 'export')).toMatchObject({ status: 'complete' });
  });
  it('summarizes finished exports for sharing readiness', () => {
    const items = VS.vsBuildExportReadinessSummary({
      hasExport: true,
      duration: 92,
      capMode: 'burn',
      captionCount: 14,
      captionWarningCount: 0,
      privacyFlagCount: 1,
      visualDescriptionCount: 2,
      chapterCount: 3,
      teachingInsertCount: 4,
      visualOverlayCount: 1,
      localizationCount: 1,
      mediaCreditCount: 1,
      mediaCreditWarningCount: 0,
      preset: 'student_family',
    });
    expect(items.find(i => i.id === 'video')).toMatchObject({ status: 'complete' });
    expect(items.find(i => i.id === 'captions').detail).toMatch(/Burned/);
    expect(items.find(i => i.id === 'privacy')).toMatchObject({ status: 'warn' });
    expect(items.find(i => i.id === 'media')).toMatchObject({ status: 'complete' });
    expect(items.find(i => i.id === 'audience')).toMatchObject({ status: 'complete' });
  });
  it('builds a transcript resource that can feed the main AlloFlow source flow', () => {
    const resource = VS.vsBuildTranscriptResource({
      title: 'Fractions demo',
      cues: [
        { start: 0, end: 2, text: 'One half equals two fourths.' },
        { start: 2, end: 4, text: 'Watch the denominator.' },
      ],
      chapters: [{ start: 0, title: 'Equivalent fractions' }],
      duration: 4,
    });
    expect(resource).toMatchObject({
      type: 'video-transcript',
      kind: 'transcript',
      title: 'Fractions demo transcript',
      source: 'video_studio',
    });
    expect(resource.text).toMatch(/One half equals two fourths/);
    expect(resource.data.cues).toHaveLength(2);
    expect(resource.data.chapters[0]).toMatchObject({ title: 'Equivalent fractions' });
  });
  it('creates plain student and family packet notes', () => {
    const note = VS.vsBuildStudentFamilyShareNote({
      title: 'Fractions demo',
      captionCount: 12,
      chapterCount: 2,
      localizationCount: 1,
      privacyFlagCount: 1,
    });
    expect(note).toMatch(/Student\/family video packet/);
    expect(note).toMatch(/captions/);
    expect(note).toMatch(/chapter markers/);
    expect(note).toMatch(/translated materials are drafts/);
    expect(note).toMatch(/possible private detail/);
  });
});

describe('vsPcmToWav', () => {
  it('produces a valid 44-byte-header mono 16-bit WAV', () => {
    const pcm = new Uint8Array([1, 2, 3, 4]);
    const wav = VS.vsPcmToWav(pcm, 24000);
    expect(wav.length).toBe(48);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe('RIFF');
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe('WAVE');
    const dv = new DataView(wav.buffer);
    expect(dv.getUint32(24, true)).toBe(24000);   // sample rate
    expect(dv.getUint16(22, true)).toBe(1);       // mono
    expect(dv.getUint16(34, true)).toBe(16);      // bit depth
    expect(dv.getUint32(40, true)).toBe(4);       // data length
    expect(Array.from(wav.slice(44))).toEqual([1, 2, 3, 4]);
  });
  it('defaults bad sample rates to 24000 and tolerates empty input', () => {
    const wav = VS.vsPcmToWav(null, -1);
    expect(wav.length).toBe(44);
    expect(new DataView(wav.buffer).getUint32(24, true)).toBe(24000);
  });
});

// ─── vsMakePackReference ─────────────────────────────────────────────────────
describe('vsMakePackReference (pack-size guard)', () => {
  it('produces metadata only — never video bytes', () => {
    const ref = VS.vsMakePackReference({
      title: 'Fractions demo', duration: 93.6, size: 14680064,
      sha256: 'A'.repeat(64).toLowerCase(), fileName: 'fractions_demo.webm',
      hasCaptions: true, hasTranscriptEdits: true, transcriptEditCount: 3, hasTranscriptWords: true, transcriptWordCount: 120, hasAudioEdits: true, audioEditsApplyToSource: true, muteSpanCount: 7, hasVisualDescriptions: true, hasVisualPrompts: true, hasLocalizations: true, localizationCount: 2, hasVisualOverlays: true, hasMusicBed: true, hasMediaCredits: true, mediaCreditCount: 2, mediaCreditWarningCount: 1, resourceCueCount: 3, thumb: 'data:image/jpeg;base64,abc', createdAt: '2026-07-02T12:00:00Z',
    });
    expect(ref.type).toBe('videoRef');
    expect(ref.durationSec).toBe(94);
    expect(ref.sizeBytes).toBe(14680064);
    expect(ref.hasCaptions).toBe(true);
    expect(ref.hasTranscriptEdits).toBe(true);
    expect(ref.transcriptEditCount).toBe(3);
    expect(ref.hasTranscriptWords).toBe(true);
    expect(ref.transcriptWordCount).toBe(120);
    expect(ref.hasAudioEdits).toBe(true);
    expect(ref.audioEditsApplyToSource).toBe(true);
    expect(ref.muteSpanCount).toBe(7);
    expect(ref.hasVisualDescriptions).toBe(true);
    expect(ref.hasVisualPrompts).toBe(true);
    expect(ref.hasLocalizations).toBe(true);
    expect(ref.localizationCount).toBe(2);
    expect(ref.hasVisualOverlays).toBe(true);
    expect(ref.hasMusicBed).toBe(true);
    expect(ref.hasMediaCredits).toBe(true);
    expect(ref.mediaCreditCount).toBe(2);
    expect(ref.mediaCreditWarningCount).toBe(1);
    expect(ref.resourceCueCount).toBe(3);
    expect(Object.keys(ref)).not.toContain('blob');
    expect(Object.keys(ref)).not.toContain('bytes');
    // Whole reference stays tiny (pack-JSON safe)
    expect(JSON.stringify(ref).length).toBeLessThan(1500);
  });
  it('drops oversized thumbnails and malformed hashes', () => {
    const ref = VS.vsMakePackReference({ thumb: 'data:image/jpeg;base64,' + 'x'.repeat(50000), sha256: 'not-a-hash' });
    expect(ref.thumb).toBeNull();
    expect(ref.sha256).toBeNull();
  });
  it('rejects non-image thumbs (no data-URI smuggling)', () => {
    const ref = VS.vsMakePackReference({ thumb: 'data:text/html;base64,PHNjcmlwdD4=' });
    expect(ref.thumb).toBeNull();
  });
  it('defaults are safe on empty input', () => {
    const ref = VS.vsMakePackReference();
    expect(ref.title).toBe('Teacher video');
    expect(ref.durationSec).toBe(0);
    expect(ref.thumb).toBeNull();
  });
  it('accepts only a single https hosted link (batch 3)', () => {
    expect(VS.vsMakePackReference({ hostedUrl: 'https://youtu.be/abc123' }).hostedUrl).toBe('https://youtu.be/abc123');
    expect(VS.vsMakePackReference({ hostedUrl: '  https://drive.google.com/file/d/x/view  ' }).hostedUrl).toBe('https://drive.google.com/file/d/x/view');
    // http, javascript:, data:, whitespace smuggling, and oversized all drop.
    expect(VS.vsMakePackReference({ hostedUrl: 'http://example.com/v' }).hostedUrl).toBeNull();
    expect(VS.vsMakePackReference({ hostedUrl: 'javascript:alert(1)' }).hostedUrl).toBeNull();
    expect(VS.vsMakePackReference({ hostedUrl: 'data:text/html;base64,x' }).hostedUrl).toBeNull();
    expect(VS.vsMakePackReference({ hostedUrl: 'https://a.com/x y' }).hostedUrl).toBeNull();
    expect(VS.vsMakePackReference({ hostedUrl: 'https://a.com/' + 'x'.repeat(600) }).hostedUrl).toBeNull();
    expect(VS.vsMakePackReference({}).hostedUrl).toBeNull();
  });
});

// ─── vsBuildStudioTakeRecord (take persistence, 2026-07-09) ──────────────────
describe('vsBuildStudioTakeRecord', () => {
  it('normalizes an allostudio-video payload into a storable record', () => {
    const blob = new Blob(['fake-webm-bytes'], { type: 'video/webm' });
    const rec = VS.vsBuildStudioTakeRecord({
      blob,
      title: 'Fractions demo',
      duration: 93.6,
      vtt: 'WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHi',
      thumb: 'data:image/jpeg;base64,abc',
      chapters: [{ start: 5, title: 'Intro' }, { start: 'bad' }, { title: '   ' }],
      musicBed: { blob: new Blob(['audio']), start: 0, end: 10, volume: 0.4 },
      visualDescriptions: [{ start: 1, end: 3, description: 'A graph appears', checked: true }],
    });
    expect(rec.blob).toBe(blob);
    expect(rec.size).toBe(blob.size);
    expect(rec.title).toBe('Fractions demo');
    expect(rec.duration).toBe(93.6);
    expect(rec.vtt).toContain('WEBVTT');
    expect(rec.chapters).toEqual([{ start: 5, title: 'Intro' }]);
    // Object URLs are per-mount, never stored; music blobs never persist.
    expect(Object.keys(rec)).not.toContain('url');
    expect(rec.musicBed.blob).toBeNull();
    expect(rec.sha256).toBeNull();
    expect(rec.id).toMatch(/^v/);
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rec.visualDescriptions.length).toBe(1);
    expect(rec.visualDescriptions[0].checked).toBe(true);
  });
  it('rejects payloads without a real Blob', () => {
    expect(VS.vsBuildStudioTakeRecord(null)).toBeNull();
    expect(VS.vsBuildStudioTakeRecord({})).toBeNull();
    expect(VS.vsBuildStudioTakeRecord({ blob: 'not-a-blob' })).toBeNull();
  });
});

// ─── vsMuxWebm (WebCodecs fast-export container, 2026-07-10) ─────────────────
describe('vsMuxWebm', () => {
  const chunk = (t, key, bytes) => ({ timestampMs: t, keyframe: key, data: new Uint8Array(bytes) });
  const hexOf = (u8) => Array.from(u8).map((b) => b.toString(16).padStart(2, '0')).join('');
  it('produces a well-formed WebM: EBML magic, doctype, both tracks, clusters', () => {
    const out = VS.vsMuxWebm({
      durationMs: 2000,
      video: { codec: 'vp8', width: 640, height: 360, chunks: [chunk(0, true, [1, 2, 3]), chunk(33, false, [4, 5]), chunk(66, false, [6])] },
      audio: { codec: 'opus', sampleRate: 48000, channels: 2, chunks: [{ timestampMs: 0, data: new Uint8Array([9]) }, { timestampMs: 20, data: new Uint8Array([8]) }] },
    });
    expect(out.length).toBeGreaterThan(100);
    expect(Array.from(out.slice(0, 4))).toEqual([0x1a, 0x45, 0xdf, 0xa3]); // EBML
    const ascii = Array.from(out).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
    expect(ascii).toContain('webm');
    expect(ascii).toContain('V_VP8');
    expect(ascii).toContain('A_OPUS');
    expect(ascii).toContain('OpusHead');
    const hex = hexOf(out);
    expect(hex).toContain('18538067'); // Segment
    expect(hex).toContain('1654ae6b'); // Tracks
    expect(hex).toContain('1f43b675'); // Cluster
  });
  it('splits clusters on spaced keyframes / 30s spans', () => {
    const out = VS.vsMuxWebm({
      durationMs: 40000,
      video: { codec: 'vp8', width: 64, height: 64, chunks: [chunk(0, true, [1]), chunk(5000, true, [2]), chunk(39000, true, [3])] },
    });
    expect(hexOf(out).split('1f43b675').length - 1).toBe(3);
  });
  it('writes a known-size Segment with Duration, which the patcher leaves alone', () => {
    const out = VS.vsMuxWebm({ durationMs: 1234, video: { codec: 'vp8', width: 64, height: 64, chunks: [chunk(0, true, [1])] } });
    const patched = VS.vsPatchWebmDuration(out, 99999);
    expect(Array.from(patched)).toEqual(Array.from(out));
  });
  it('returns empty output without video chunks', () => {
    expect(VS.vsMuxWebm({}).length).toBe(0);
    expect(VS.vsMuxWebm({ video: { chunks: [] } }).length).toBe(0);
  });
});

// ─── Demo Autopilot capture validation ───────────────────────────────────────
describe('vsValidateDemoCapture', () => {
  it('accepts browser-tab captures identified as AlloFlow', () => {
    expect(VS.vsValidateDemoCapture('browser', 'AlloFlow — Universal Design for Learning')).toEqual({
      ok: true,
      label: 'AlloFlow — Universal Design for Learning'
    });
    expect(VS.vsValidateDemoCapture('monitor', 'Entire screen').ok).toBe(false);
    expect(VS.vsValidateDemoCapture('window', 'AlloFlow').ok).toBe(false);
    expect(VS.vsValidateDemoCapture('browser', 'Student records').ok).toBe(false);
    expect(VS.vsValidateDemoCapture('browser', '').ok).toBe(false);
  });

  it('accepts Gemini Canvas internal tab labels only with the AlloFlow bridge', () => {
    var label = 'web-contents-media-stream://3DD175FA0272FB669EFA6736B50578CF';
    expect(VS.vsValidateDemoCapture('browser', label, { openerConnected: true })).toMatchObject({
      ok: true,
      label: 'AlloFlow tab through Gemini Canvas',
      inferred: true
    });
    expect(VS.vsValidateDemoCapture('browser', label, { openerConnected: false }).ok).toBe(false);
  });
});

// ─── Automatic narration placement ───────────────────────────────────────────
describe('Demo Autopilot preflight and quality analysis', () => {
  it('blocks missing plan/connection/capture and passes a ready automatic-voice setup', () => {
    const blocked = VS.vsBuildDemoPreflight({ planCount: 0, openerConnected: false, captureSupported: false, audioMode: 'auto-Kore' });
    expect(blocked.ok).toBe(false);
    expect(blocked.blockingCount).toBeGreaterThanOrEqual(3);
    const ready = VS.vsBuildDemoPreflight({ planCount: 2, commandReadinessKnown: true, commandReady: true, openerConnected: true, captureSupported: true, micSupported: true, audioMode: 'auto-Kore', storageKnown: true, availableBytes: 1024 * 1024 * 1024 });
    expect(ready.ok).toBe(true);
    expect(ready.items.find(item => item.id === 'audio').status).toBe('ready');
  });

  it('warns for limited storage and blocks an unavailable requested microphone', () => {
    const report = VS.vsBuildDemoPreflight({ planCount: 1, commandReadinessKnown: true, commandReady: true, openerConnected: true, captureSupported: true, micSupported: false, audioMode: 'mic', storageKnown: true, availableBytes: 100 * 1024 * 1024 });
    expect(report.ok).toBe(false);
    expect(report.warningCount).toBe(1);
    expect(report.items.find(item => item.id === 'audio').status).toBe('block');
  });

  it('blocks an unvalidated command plan and trusts the release-matched official tutorial', () => {
    const unknown = VS.vsBuildDemoPreflight({ planCount: 1, openerConnected: true, captureSupported: true, audioMode: 'captions' });
    expect(unknown.ok).toBe(false);
    expect(unknown.items.find(item => item.id === 'commands').status).toBe('block');
    const official = VS.vsBuildDemoPreflight({ planCount: 2, officialPlan: true, openerConnected: true, captureSupported: true, audioMode: 'captions' });
    expect(official.items.find(item => item.id === 'commands').status).toBe('ready');
  });

  it('warns without blocking when narration may overrun its recorded step', () => {
    const report = VS.vsBuildDemoPreflight({ planCount: 2, commandReadinessKnown: true, commandReady: true, openerConnected: true, captureSupported: true, micSupported: true, audioMode: 'captions', scriptWarningCount: 2, scriptTooLongCount: 1 });
    const pacing = report.items.find(item => item.id === 'pacing');
    expect(report.ok).toBe(true);
    expect(report.warningCount).toBe(1);
    expect(pacing.status).toBe('warn');
    expect(pacing.detail).toContain('maximum result hold');
  });
  it('scores a complete narrated demo and flags incomplete output', () => {
    const good = VS.vsAnalyzeDemoTakeQuality({
      duration: 10,
      captions: [{ start: 0.5, end: 3, text: 'Add the source passage.' }, { start: 4, end: 8, text: 'Review the adapted text.' }],
      audioClips: [{ demoNarrationCue: { text: 'one' } }, { demoNarrationCue: { text: 'two' } }],
      demoExpectedNarrationCount: 2,
      demoNarrationFailed: [],
      demoNarrationPending: false
    });
    expect(good.ok).toBe(true);
    expect(good.score).toBe(100);
    const bad = VS.vsAnalyzeDemoTakeQuality({ duration: 1, captions: [], audioClips: [], demoExpectedNarrationCount: 2, demoNarrationFailed: [{ text: 'missing' }] });
    expect(bad.ok).toBe(false);
    expect(bad.failCount).toBeGreaterThanOrEqual(2);
    expect(bad.score).toBeLessThan(50);
  });
});
describe('vsDemoContinuationPlan', () => {
  it('keeps the exact unfinished sequence after an ordinary stop', () => {
    const steps = [
      { commandId: 'one' },
      { commandId: 'two' },
      { commandId: 'three' },
    ];
    const stopped = VS.vsDemoContinuationPlan(steps, { ok: false, stopped: true, completed: 1 });
    expect(stopped.completed).toBe(1);
    expect(stopped.nextIndex).toBe(1);
    expect(stopped.remainingSteps).toEqual(steps.slice(1));
  });

  it('never retries a timed-out command that is still running in the background', () => {
    const steps = [{ commandId: 'one' }, { commandId: 'two' }, { commandId: 'three' }];
    const timedOut = VS.vsDemoContinuationPlan(steps, { ok: false, timedOut: true, completed: 1 });
    expect(timedOut.nextIndex).toBe(2);
    expect(timedOut.remainingSteps).toEqual([steps[2]]);
    expect(VS.vsDemoContinuationPlan(steps, { ok: true }).remainingSteps).toEqual([]);
  });
});

describe('vsScheduleDemoNarrationClip', () => {
  it('uses PCM duration and shifts later clips so narration never overlaps', () => {
    const first = VS.vsScheduleDemoNarrationClip({ start: 1 }, 48000, 24000, 0, 10, 0.12);
    expect(first).toEqual({ start: 1, duration: 1, end: 2, shifted: false, clipped: false });

    const second = VS.vsScheduleDemoNarrationClip({ start: 1.5 }, 48000, 24000, first.end, 10, 0.12);
    expect(second).toEqual({ start: 2.12, duration: 1, end: 3.12, shifted: true, clipped: false });
  });

  it('flags end clipping and rejects empty or out-of-range clips', () => {
    expect(VS.vsScheduleDemoNarrationClip({ start: 2 }, 48000, 24000, 0, 2.5, 0.12)).toMatchObject({
      start: 2,
      end: 3,
      clipped: true
    });
    expect(VS.vsScheduleDemoNarrationClip({ start: 0 }, 0, 24000, 0, 10, 0.12)).toBeNull();
    expect(VS.vsScheduleDemoNarrationClip({ start: 10 }, 48000, 24000, 0, 10, 0.12)).toBeNull();
  });
});

// ─── vsBuildDemoCaptionCues (Demo Autopilot, 2026-07-10) ─────────────────────
describe('vsBuildDemoCaptionCues', () => {
  it('pairs start/done events into non-overlapping step cues', () => {
    const cues = VS.vsBuildDemoCaptionCues([
      { t: 2, index: 0, phase: 'start', label: 'Create a lesson' },
      { t: 9.5, index: 0, phase: 'done', label: 'Create a lesson', narration: 'The lesson is ready for review.' },
      { t: 12, index: 1, phase: 'start', label: 'Generate a quiz' },
      { t: 20, index: 1, phase: 'done', label: 'Generate a quiz', narration: 'The quiz now uses the lesson content.' },
    ], 30);
    expect(cues).toEqual([
      { start: 2, end: 9.5, text: 'Step 1: Create a lesson. The lesson is ready for review.' },
      { start: 12, end: 20, text: 'Step 2: Generate a quiz. The quiz now uses the lesson content.' },
    ]);
  });
  it('uses an approved script verbatim instead of app-generated narration', () => {
    const cues = VS.vsBuildDemoCaptionCues([
      { t: 1, index: 0, phase: 'start', label: 'Open library', narration: 'Opening.', script: 'First, open the reading library.' },
      { t: 5, index: 0, phase: 'done', label: 'Open library', narration: 'The library is open.', script: 'First, open the reading library.' },
    ], 8);
    expect(cues).toEqual([{ start: 1, end: 5, text: 'First, open the reading library.' }]);
  });
  it('caps orphan cues at 8s, clips at the next cue and the take end', () => {
    const cues = VS.vsBuildDemoCaptionCues([
      { t: 0, index: 0, phase: 'start', label: 'A' },   // no done → 8s cap…
      { t: 3, index: 1, phase: 'start', label: 'B' },   // …but next cue clips it to 3
      { t: 3, index: 1, phase: 'done', label: 'B' },    // done before start+0.8 → floor
    ], 4);
    expect(cues[0].end).toBe(3);
    expect(cues[1].start).toBe(3);
    expect(cues[1].end).toBeCloseTo(3.8, 5); // start+0.8 floor, still under dur? no: dur=4 clip → 3.8
  });
  it('ignores junk events and returns [] on empty input', () => {
    expect(VS.vsBuildDemoCaptionCues(null, 10)).toEqual([]);
    expect(VS.vsBuildDemoCaptionCues([{ t: -5, label: 'x' }, { t: 'NaN', label: 'y' }, { t: 1, label: '   ' }], 10)).toEqual([]);
  });
});

// ─── Batch-1 hardening wiring (2026-07-09) ───────────────────────────────────
// Take persistence + always-on bridge receiver in the module; export cleanup,
// cancel, and honest real-time ETA in the popup. Structural pins: these prove
// the wiring exists in the shipped source (the runtime paths need a browser).
describe('take persistence + export hardening wiring', () => {
  const moduleText = () => readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf-8');
  const popup = () => readFileSync(resolve(process.cwd(), 'video_studio/video_studio.html'), 'utf-8');
  it('module keeps takes at module scope, mirrored into IndexedDB, with a per-tab bridge token', () => {
    const m = moduleText();
    expect(m).toContain("var VS_TOKEN_KEY = 'allo_vs_bridge_token';");
    expect(m).toContain("var VS_TAKE_DB = 'alloflow_video_studio';");
    expect(m).toContain('function vsTakeDb(op, arg)');
    expect(m).toContain('var vsTakeStore = {');
    expect(m).toContain('function vsBackgroundBridgeReceiver(ev)');
    expect(m).toContain("window.addEventListener('message', vsBackgroundBridgeReceiver);");
    // The background receiver is the SOLE video ingester and still acks.
    expect(m).toContain("replyTo.postMessage({ bridge: vsTakeStore.token, type: 'allostudio-video-ack' }, STUDIO_ORIGIN);");
    expect(m).toContain('vsTakeStore.setToken(bridgeToken);');
    // The component no longer ingests videos directly.
    expect(m).not.toContain("ev.data.type === 'allostudio-video' && ev.data.payload");
  });
  it('module gallery gains remove + persistence note', () => {
    const m = moduleText();
    expect(m).toContain("T('video_studio.remove', '🗑 Remove')");
    expect(m).toContain("T('video_studio.remove_confirm'");
    expect(m).toContain("T('video_studio.gallery_note'");
    expect(m).toContain('removeTake: function (id)');
  });
  it('frame-sending AI tools are consent-gated like localization (batch 2)', () => {
    const html = popup();
    // One opt-in checkbox per card, mirroring localizePrivacyAck.
    expect(html).toContain('id="insertsPrivacyAck"');
    expect(html).toContain('id="narratePrivacyAck"');
    expect(html).toContain('id="describePrivacyAck"');
    expect(html).toContain('function framePrivacyOk(ackId, statusEl, what)');
    // All four frame senders pass through the gate.
    expect(html).toContain("framePrivacyOk('insertsPrivacyAck', $('insertStatus'))");
    expect(html).toContain("framePrivacyOk('insertsPrivacyAck', $('insertStatus'), 'the current video frame')");
    expect(html).toContain("framePrivacyOk('narratePrivacyAck', $('aiNarrStatus'))");
    expect(html).toContain("framePrivacyOk('describePrivacyAck', $('visualStatus'))");
  });
  it('popup tablist follows the WAI-ARIA keyboard pattern (batch 2)', () => {
    const html = popup();
    expect(html).toContain('$(t[0]).tabIndex = on ? 0 : -1;');
    expect(html).toContain("document.querySelector('.tabs').addEventListener('keydown'");
    expect(html).toContain("showTab('tabRecord');");
  });
  it('popup take deletion asks for confirmation (batch 2)', () => {
    const html = popup();
    expect(html).toContain('This removes the take and its saved draft from this device.');
  });
  it('module reads live props via propsRef and reports a stalled popup honestly (batch 2)', () => {
    const m = moduleText();
    expect(m).toContain('propsRef.current = props;');
    expect(m).toContain('propsRef.current.callGemini');
    expect(m).toContain('Array.isArray(propsRef.current.history)');
    // The never-assigned fallback is gone.
    expect(m).not.toContain('window.__alloflowHistory');
    // Watchdog no longer flips 'opening' straight to 'open'.
    expect(m).not.toContain("return cur === 'opening' ? 'open' : cur;");
    expect(m).toContain("return 'stalled';");
    expect(m).toContain("T('video_studio.status_stalled'");
  });
  it('videoRef pipeline is wired end-to-end (batch 3)', () => {
    const m = moduleText();
    // Gallery: hosted-link input + save-to-history, both flowing through the
    // shared reference builder.
    expect(m).toContain('function vsPackReferenceForTake(v)');
    expect(m).toContain('hostedUrl: v.hostedUrl || null');
    expect(m).toContain("T('video_studio.ref_history', '🎞 Save to Resource History')");
    expect(m).toContain('propsRef.current.onSendVideoRefToFlow');
    expect(m).toContain("T('video_studio.hosted_link_label', 'Hosted video link (optional)')");
    // App side: the reference finally has a renderer (dead-data gap closed).
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(anti).toContain('onSendVideoRefToFlow: (ref) => {');
    expect(anti).toContain('const VideoRefPlayerOverlay = ({ item, onClose, addToast, t }) => {');
    expect(anti).toContain("case 'video-ref': return <MonitorPlay size={16} />;");
    expect(anti).toContain("if (item && item.type === 'video-ref') {");
    // Teacher-only + excluded from document export until those surfaces exist.
    expect(anti).toMatch(/TEACHER_ONLY_TYPES = \[[^\]]*'video-ref'/);
    expect(anti).toMatch(/NON_EXPORTABLE_TYPES = new Set\(\[[^\]]*'video-ref'/);
  });
  it('batch 4 polish is wired: shortcuts, export prefs memory, resend dedupe', () => {
    const html = popup();
    // Editor shortcuts beyond Space, with typing guards.
    expect(html).toContain("if (key === 'i') {");
    expect(html).toContain("if (key === 'o') {");
    expect(html).toContain("$('addCueBtn').click();");
    expect(html).toContain("ev.key === '['");
    expect(html).toContain('active.isContentEditable');
    // Export settings persist and restore with option validation.
    expect(html).toContain("var VS_EXPORT_PREFS_KEY = 'vs_export_prefs_v1';");
    expect(html).toContain("$('panelExport').addEventListener('change', saveExportPrefs);");
    expect(html).toContain('restoreExportPrefs();');
    expect(html).toContain("return o.value === prefs[el.id];");
    // Resent takes dedupe by content hash instead of piling up.
    const m = moduleText();
    expect(m).toContain('var dupe = hex ? vsTakeStore.takes.filter(function (t) { return t.sha256 === hex; })[0] : null;');
    expect(m).toContain('id: dupe.id, createdAt: dupe.createdAt');
  });
  it('WebCodecs fast export is capability-gated with real-time fallback', () => {
    const html = popup();
    expect(html).toContain('id="fastExportChk"');
    expect(html).toContain("VideoEncoder.isConfigSupported({ codec: 'vp8'");
    expect(html).toContain("AudioEncoder.isConfigSupported({ codec: 'opus'");
    expect(html).toContain('HTMLVideoElement.prototype.requestVideoFrameCallback');
    expect(html).toContain('function reencodeFast(');
    expect(html).toContain('async function renderExportAudioOffline(');
    // Frames stamped with MEDIA time so drops never desync.
    expect(html).toContain('meta.mediaTime');
    // Encoder backpressure pauses decode instead of ballooning the queue.
    expect(html).toContain('venc.encodeQueueSize > 24');
    // doExport: fast path is opt-in and ALWAYS falls back on non-abort errors.
    expect(html).toContain("fastExportSupported && $('fastExportChk') && $('fastExportChk').checked");
    expect(html).toContain('using the standard real-time encoder instead');
    expect(html).toContain('if (!res) res = await reencode(');
    // Both paths burn captions through the single shared renderer.
    expect(html).toContain('function drawBurnCaption(ctx, w, hgt, cues, tSec, captionStyle)');
    expect((html.match(/drawBurnCaption\(ctx, w, hgt, cues/g) || []).length).toBeGreaterThanOrEqual(3);
  });
  it('Demo Autopilot is wired end-to-end with plan review and guarded execution', () => {
    const html = popup();
    // Popup: card, plan review, start/stop, step events on the recording clock.
    expect(html).toContain('id="demoAutopilotCard"');
    expect(html).toContain('id="demoGoal"');
    expect(html).toContain('id="demoGoalHelp"');
    expect(html).toContain('aria-keyshortcuts="Control+Enter Meta+Enter"');
    expect(html).toContain('Generate demo plan</button>');
    expect(html).toContain('id="demoPlanCancelBtn"');
    expect(html).toContain('var demoPlanRequestGeneration = 0');
    expect(html).toContain("setAttribute('aria-busy', planning ? 'true' : 'false')");
    expect(html).toContain("setAttribute('aria-busy', loadingOfficial ? 'true' : 'false')");
    expect(html).toContain('Planning cancelled. Nothing ran, and AlloFlow was asked to stop the AI request.');
    expect(html).toContain('if (generation !== demoPlanRequestGeneration) return;');
    expect(html).toContain('var demoPlanBridgeRequestId = null');
    expect(html).toContain('var demoPlanBridgeController = null');
    expect(html).toContain("var demoPlanSourceKind = '';");
    expect(html).toContain("postToOpener({ type: 'allostudio-demoplan-cancel'");
    expect(html).toContain("typeof options.onRequestId === 'function'");
    expect(html).toContain("signal.addEventListener('abort', onAbort, { once: true })");
    expect(html).toContain("signal.removeEventListener('abort', onAbort)");
    expect(html).toContain("typeof options.onTimeout === 'function'");
    expect(html).toContain('demoPlanBridgeController.abort()');
    expect(html).toContain("onTimeout: function (id) { if (generation === demoPlanRequestGeneration) postToOpener({ type: 'allostudio-demoplan-cancel'");
    expect(html).toContain('var demoPreflightController = null');
    expect(html).toContain('demoPreflightController.abort()');
    expect(html).toContain("{ signal: preflightController ? preflightController.signal : null }");
    expect(html).toContain('var demoPlanSourceBusy = false');
    expect(html).toContain('function syncDemoPlanSourceControls()');
    expect(html).toContain('function syncDemoExecutionControls()');
    expect(html).toContain('var demoStartPending = false');
    expect(html).toContain('var demoRehearsePending = false');
    expect(html).toContain('var demoManualPreflightPending = false');
    expect(html).toContain('async function runManualDemoPreflight()');
    expect(html).toContain("$('demoPreflightBtn').setAttribute('aria-busy', 'true')");
    expect(html).toContain("$('demoPreflightBtn').addEventListener('click', runManualDemoPreflight)");
    expect(html).toContain("setDemoPlanningBusy(true, 'official')");
    expect(html).toContain("Official tutorial loading cancelled. Nothing ran, and the current plan was left unchanged.");
    expect(html).toContain("bridgeRequest('allostudio-official-tutorial-request', { tutorialId: 'text-adaptation' }, 30000, { signal:");
    expect(html).toContain('demoState.running || demoStartPending || demoRehearsePending');
    expect(html).toContain("if (e.key !== 'Enter' || (!e.ctrlKey && !e.metaKey)");
    expect(html).toContain("if (!$('demoPlanBtn').disabled) $('demoPlanBtn').click();");
    expect(html).toContain('id="demoPlanList"');
    expect(html).toContain('id="demoAudioMode"');
    expect(html).toContain('id="demoStatus" role="status" aria-live="polite"');
    expect(html).toContain("bridgeRequest('allostudio-demoplan-request'");
    const replacementHandlerStart = html.indexOf("$('demoPlanBtn').addEventListener('click'");
    const replacementHandlerEnd = html.indexOf("$('demoOfficialTextBtn').addEventListener('click'", replacementHandlerStart);
    const replacementHandler = html.slice(replacementHandlerStart, replacementHandlerEnd);
    const replacementCleanup = replacementHandler.indexOf('cleanupOfficialTutorial();');
    expect(replacementCleanup).toBeGreaterThan(replacementHandler.lastIndexOf('} else {'));
    expect(replacementCleanup).toBeLessThan(replacementHandler.indexOf('clearDemoContinuation();'));
    expect(replacementHandler.split('cleanupOfficialTutorial();')).toHaveLength(2);
    expect(html).toContain("'allostudio-official-tutorial-run-request' : 'allostudio-demorun-request'");
    expect(html).toContain("isOpenerMessage(ev, 'allostudio-demostep')");
    expect(html).toContain("postToOpener({ type: 'allostudio-demostop' });");
    expect(html).toContain('t: Math.max(0, elapsed)');
    expect(html).toContain('narration: d.narration');
    expect(html).toContain('vsBuildDemoCaptionCues(demoState.events, dur)');
    expect(html).toContain("bridgeRequest('allostudio-tts-request', { text: cue.text, voice: job.voice }");
    expect(html).toContain("take.name = 'Demo · ' + take.name;");
    expect(html).toMatch(/function finalizeTake\(\)[\s\S]{0,500}syncDemoPlanSourceControls\(\);[\s\S]{0,120}syncDemoExecutionControls\(\);/);
    // Module: relays with param clamping and single-flight.
    const m = moduleText();
    expect(m).toContain("ev.data.type === 'allostudio-demoplan-request'");
    expect(m).toContain("ev.data.type === 'allostudio-demoplan-cancel'");
    expect(m).toContain('var demoPlanRef = useRef(');
    expect(m).toContain("typeof AbortController === 'function' ? new AbortController() : null");
    expect(m).toContain("planFn(String(dpReq.goal || '').slice(0, 300), { signal:");
    expect(m).toContain("ev.data.type === 'allostudio-demorun-request'");
    expect(m).toContain("ev.data.type === 'allostudio-demostop'");
    expect(m).toContain('propsRef.current.onRunDemoPlan');
    expect(m).toContain("{ error: 'a demo is already running' }");
    // ANTI: props reuse AlloBot's planner/runner + shared single-flight guard.
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(anti).toContain('onPlanDemo: async (goal, options = {}) => {');
    expect(anti).toContain('signal: options.signal || null');
    expect(anti).toContain('onRunDemoPlan: async (steps, hooks, options) => {');
    expect(anti).toContain('AC.planUtterance(_alloCmdCtx()');
    expect(anti).toContain('AC.runPlan(() => _alloCmdCtx(), [list[i]]');
    expect(anti).toContain("throw new Error('AlloBot is already running a plan — stop it first.');");
    expect(anti).toContain("document.visibilityState !== 'visible'");
    expect(anti).toContain('The AlloFlow tab never became visible, so no automatic actions were run.');
  });
  it('Demo Autopilot hardening: every stop path halts the app, no stuck states', () => {
    const html = popup();
    // Ordinary Stop / browser "Stop sharing" also halts the app's self-driving.
    expect(html).toMatch(/function stopRecording\(\) \{[\s\S]{0,700}allostudio-demostop/);
    // Empty takes consume demo state instead of contaminating the next take.
    expect(html).toContain('leaking demoState.active past this');
    // App-death watchdog + unconfirmed-stop grace recover the panel locally.
    expect(html).toContain('function demoRecoverLocal(reason)');
    expect(html).toContain('var aliveTimer = setInterval(');
    expect(html).toContain('if (demoState.abandoned) { demoState.abandoned = false; return; }');
    expect(html).toContain("setTimeout(function () { demoRecoverLocal('AlloFlow did not confirm the stop'); }, 8000);");
    expect(html).toContain('vsValidateDemoCapture(captureSurface, captureTrackLabel, { openerConnected: !!(opener && !opener.closed) })');
    expect(html).toContain('demoState.captureValidation = validation');
    expect(html).toContain('demoState.captureValidation && demoState.captureValidation.label');
    expect(html).toContain("surface !== 'browser'");
    expect(html).toContain('canvasStreamLabel && hasAlloBridge');
    expect(html).toContain("displaySurface: 'browser'");
    expect(html).toContain("setMicEnabled(audioMode === 'mic')");
    expect(html).toContain('vsScheduleDemoNarrationClip(cue, pcm.byteLength');
    expect(html).toContain('take.demoNarrationPending = true');
    expect(html).toContain("if (t.demoNarrationPending) { setStatus($('exportStatus')");
    expect(html).toContain('Automatic narration is still being generated for a scene clip.');
    expect(html).toContain('Wait for it to finish before saving the project bundle.');
    // Module clamp drops non-finite numbers.
    const m = moduleText();
    expect(m).toContain("(typeof pv === 'number' && isFinite(pv)) || typeof pv === 'boolean'");
    // Single-step demos plan via the single-command router fallback.
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(anti).toContain('AC.routeUtterance(_alloCmdCtx(), cleanGoal, { allowAi: true, preview: true, signal: options.signal || null })');
    expect(anti).toContain('The command planner is still loading — wait a moment and try again.');
  });
  it('ships the fixture-safe official Text Adaptation tutorial and narration recovery controls', () => {
    const html = popup();
    expect(html).toContain('id="demoOfficialTextBtn"');
    expect(html).toContain('id="demoPreflightBtn"');
    expect(html).toContain('id="demoRehearseBtn"');
    expect(html).toContain('id="demoPlanSummary"');
    expect(html).toContain('id="demoPlanResetBtn"');
    expect(html).toContain('id="demoPrivacyIndicator"');
    expect(html).toContain('function moveDemoStep(index, direction)');
    expect(html).toContain('function estimateDemoPlanSeconds()');
    expect(html).toContain("review.setAttribute('aria-label', 'Review ' + check.label)");
    expect(html).toContain('id="demoQualityCard"');
    expect(html).toContain('function runDemoPreflight()');
    expect(html).toContain('function renderDemoQuality(take)');
    expect(html).toContain('2 · Check readiness');
    expect(html).toContain('Readiness check passed. No app actions ran');
    expect(html).toContain("bridgeRequest('allostudio-demovalidate-request'");
    expect(html).toContain('Command readiness');
    expect(moduleText()).toContain("type === 'allostudio-demovalidate-request'");
    expect(html).toContain('id="demoRepairBtn"');
    expect(html).toContain('id="demoContinueBtn"');
    expect(html).toContain('id="demoContinueEditBtn"');
    expect(html).toContain('id="demoContinuationDismissBtn"');
    expect(html).toContain('id="demoContinuationDismissEditBtn"');
    expect(html).toContain('function offerDemoContinuation(steps, response)');
    expect(html).toContain('function dismissDemoContinuation()');
    expect(html).toContain("var progressText = ' (' + completed + '/' + total + ' complete)'");
    expect(html).toContain('id="demoStitchRow"');
    expect(html).toContain('id="demoStitchBtn"');
    expect(html).toContain('id="demoStitchStatus"');
    expect(html).toContain('function demoContinuationSeriesTakes(take)');
    expect(html).toContain('function restoreSavedDemoSeriesTakes(seriesId)');
    expect(html).toContain('function stitchDemoContinuationTakes()');
    expect(html).toContain("item.transition = 'cut'");
    expect(html).toContain('demoSeriesId: String(take.demoSeriesId ||');
    expect(html).toContain('demoSeriesPart: Math.max(0, Math.round(Number(take.demoSeriesPart)');
    expect(html).toContain('id="demoDraftClearBtn"');
    expect(html).toContain('id="demoScriptReviewBtn"');
    expect(html).toContain('id="demoScriptCopyBtn"');
    expect(html).toContain('id="demoPacingFitBtn"');
    expect(html).toContain('id="demoScriptStyle"');
    expect(html).toContain('id="demoScriptDetail"');
    expect(html).toContain('id="demoScriptDraftBtn"');
    expect(html).toContain('id="demoScriptDraftReview"');
    expect(html).toContain('id="demoScriptApplySelectedBtn"');
    expect(html).toContain('id="demoScriptApplyAllBtn"');
    expect(html).toContain('id="demoScriptDiscardBtn"');
    expect(html).toContain('id="demoScriptUndoBtn"');
    expect(html).toContain('id="demoScriptRedoBtn"');
    expect(html).toContain('var demoScriptDraftReviewItems = []');
    expect(html).toContain('function renderDemoScriptDraftReview()');
    expect(html).toContain('function applyDemoScriptDraftReview(applyAll)');
    expect(html).toContain('function requestDemoScriptSuggestions(steps, focusIndex)');
    expect(html).toContain('async function regenerateDemoScriptReviewItem(item, button)');
    expect(html).toContain("regenerate.textContent = 'Regenerate line'");
    expect(html).toContain('var focusIndex = approved.indexOf(item.step);');
    expect(html).toContain('requestDemoScriptSuggestions(approved, focusIndex)');
    expect(html).toContain("item.text = line; item.selected = true;");
    expect(html).toContain('Nothing changes until you apply one.');
    expect(html).toContain('step: target, stepNumber:');
    expect(html).toContain('item.step.script = line; changedSteps.push(item.step);');
    expect(html).toContain('applyDemoPacingFit(changedSteps)');
    expect(html).toContain('var demoScriptHistory = []');
    expect(html).toContain('function recordDemoScriptRevision(changes)');
    expect(html).toContain('function applyDemoScriptRevision(direction)');
    expect(html).toContain('demoScriptHistory = demoScriptHistory.slice(0, demoScriptHistoryIndex + 1)');
    expect(html).toContain('if (demoScriptHistory.length > 10) demoScriptHistory.shift()');
    expect(html).toContain("String(change.step.script || '') !== expectedScript");
    expect(html).toContain('manually adjusted hold time');
    expect(html).toContain('refreshDemoPlanSummary(); syncDemoScriptHistoryControls();');
    expect(html).toContain('recordDemoScriptRevision(revisionChanges)');
    expect(html).toContain('if (demoScriptDraftReviewItems.length) renderDemoScriptDraftReview();');
    expect(html).toContain('Nothing changed yet.');
    expect(html).toContain('id="demoScriptDraftStatus"');
    expect(html).toContain("bridgeRequest('allostudio-demoscript-request'");
    expect(html).toContain('No video or audio is sent.');
    expect(html).toContain('applyDemoPacingFit(steps);');
    expect(html).toContain('id="demoPacingStatus"');
    expect(html).toContain('id="demoScriptReviewText"');
    expect(html).toContain('function demoStepPacing(step)');
    expect(html).toContain('function demoPacingAudit(steps)');
    expect(html).toContain('function applyDemoPacingFit(steps)');
    expect(html).toContain('var autoPacingChanged = applyDemoPacingFit(steps);');
    expect(html).toContain('report.autoPacingChanged = autoPacingChanged');
    expect(html).toContain('Preflight auto-fitted pacing');
    expect(html).toContain('var changed = applyDemoPacingFit(demoState.steps || []);');
    expect(html).toContain('data-demo-step-pacing');
    expect(html).toContain('function defaultDemoStepScript(step)');
    expect(html).toContain('function demoScriptText()');
    expect(moduleText()).toContain("ev.data.type === 'allostudio-demoscript-request'");
    expect(moduleText()).toContain("type: 'allostudio-demoscript-response'");
    expect(moduleText()).toContain('reviewed goal and step metadata, never captured video or audio');
    expect(moduleText()).toContain('Return exactly one item for every supplied step');
    expect(moduleText()).toContain('var dsFocus = Math.round(Number(dsReq.focusIndex));');
    expect(moduleText()).toContain("Return exactly one item for index ' + dsFocus");
    expect(moduleText()).toContain('(dsFocus < 0 || item.index === dsFocus)');
    expect(html).toContain("'Step ' + (i + 1) + ' narration'");
    expect(html).toContain("'Step ' + (i + 1) + ' result hold seconds'");
    expect(html).toContain('demoState.activeSteps = steps.map(cleanDemoDraftStep)');
    expect(html).toContain("var DEMO_DRAFT_KEY = 'vs_demo_draft_v1'");
    expect(html).toContain('function restoreDemoDraft()');
    expect(html).toContain("var DEMO_CONTINUATION_KEY = 'vs_demo_continuation_v1'");
    expect(html).toContain('function saveDemoContinuation()');
    expect(html).toContain('function restoreDemoContinuation()');
    expect(html).toContain('restoreDemoDraft();\n  restoreDemoContinuation();');
    expect(html).toContain('function updateDemoStepReadinessUI()');
    expect(html).toContain('data-demo-step-readiness');
    expect(html).toContain('version !== demoState.preflightVersion');
    expect(html).toContain('Open the Educator Hub, then show the Document Builder');
    expect(html).not.toContain('Create a 5th-grade lesson about volcanoes');
    expect(html).toContain("typeof demoState !== 'undefined' && demoState && demoState.running");
    expect(html).toContain('if (renderDemoQuality(take) && take) saveDraft(take)');
    expect(html).toContain("minutes === 1 ? '' : 's'");
    expect(html).toContain("bridgeRequest('allostudio-official-tutorial-request'");
    expect(html).toContain("type: 'allostudio-official-tutorial-cleanup'");
    expect(html).toContain('id="demoNarrCancelBtn"');
    expect(html).toContain('id="demoNarrRetryBtn"');
    expect(html).toContain('id="demoNarrCancelEditBtn"');
    expect(html).toContain('id="demoNarrRetryEditBtn"');
    expect(html).toContain("setEditorFocusMode('narrate', false)");
    expect(html).toContain('demoNarrationJob.cancelRequested = true');
    expect(html).toContain('demoNarrationFailed = failedCues.concat(remainingCues)');
    expect(html).toContain('id="demoOpeningCardChk"');
    expect(html).toContain('id="demoClosingCardChk"');
    expect(html).toContain('id="demoTransitionStyle"');
    expect(html).toContain('id="demoCursorEmphasisChk"');
    expect(html).toContain('id="demoTemplateSelect"');
    expect(html).toContain('id="demoDuplicateBtn"');
    expect(html).toContain('id="demoTemplateSafety"');
    expect(html).toContain('id="demoTemplateUndoDeleteBtn"');
    expect(html).toContain('var deletedDemoTemplate = null');
    expect(html).toContain('undoDelete.disabled = locked || !canUndoDelete;');
    expect(html).toContain('deletedDemoTemplate = { item: deleted, index: index };');
    expect(html).toContain('The browser could not delete that tutorial template. Nothing changed.');
    expect(html).toContain("$('demoTemplateUndoDeleteBtn').addEventListener('click'");
    expect(html).toContain('demoTemplates.splice(restoreAt, 0, restored);');
    expect(html).toContain('The browser could not restore that tutorial template. Undo is still available.');
    expect(html).toContain('Restored tutorial template: ');
    expect(html).toContain('Saved templates are independent, editable copies.');
    expect(html).toContain('officialId: null,');
    expect(html).not.toContain("officialId: String(t.officialId");
    expect(html).toContain('Copy of\\s+');
    expect(html).toContain('function demoTemplateMutationLocked()');
    expect(html).toContain('function syncDemoTemplateControls()');
    expect(html).toContain('select.disabled = locked');
    expect(html).toContain('var DEMO_PLAN_EDITOR_STATIC_IDS');
    expect(html).toContain('function demoPlanEditorMutationLocked()');
    expect(html).toContain('function setDemoPlanEditorBaseDisabled(control, disabled)');
    expect(html).toContain('function syncDemoPlanEditorControls()');
    expect(html).toContain("querySelectorAll('input, textarea, select, button')");
    expect(html).toContain("control.getAttribute('data-demo-editor-base-disabled')");
    expect(html).toContain('syncDemoPlanEditorControls();');
    expect(html).toContain('if (demoPlanEditorMutationLocked() || demoState.officialId || !demoState.steps) return;');
    expect(html).toContain("if (!demoPlanEditorMutationLocked()) clearDemoDraft(true);");
    expect(html).toContain('if (demoPlanEditorMutationLocked() || !demoState.continuation || !demoState.continuation.steps.length) return;');
    expect(html).toContain('if (!template || demoTemplateMutationLocked()) return false;');
    expect(html).toContain('if (demoTemplateMutationLocked() || !demoState.steps || !demoState.steps.length) return null;');
    expect(html).toContain("var DEMO_TEMPLATE_KEY = 'vs_demo_templates_v1'");
    expect(html).toContain('function cleanDemoPolish(value)');
    expect(html).toContain('function loadDemoTemplate(item)');
    expect(html).toContain('function saveCurrentDemoTemplate(name, copyPrefix)');
    expect(html).toContain('function drawDemoStepTransition(ctx, w, hgt, cues, tSec, key)');
    expect(html).toContain('var closingDur = closingCard ? 2.5 : 0');
    expect(html).toContain('var vttOffset = wantTitleCard ? 2.5 : 0');
    expect(html).toContain('take.demoPolish = cleanDemoPolish(demoState.activePolish)');
    expect(html).toContain('function regenerateDemoNarrationClip(take, clip)');
    expect(html).toContain('demoNarrationCue: { start: Number(cue.start)');
    const m = moduleText();
    expect(m).toContain("ev.data.type === 'allostudio-official-tutorial-request'");
    expect(m).toContain("ev.data.type === 'allostudio-official-tutorial-run-request'");
    expect(m).toContain('propsRef.current.onCleanupOfficialTutorial');
    expect(m).toContain("kind: 'official', cleanupAfterStop: false");
    expect(m).toContain("kind: 'generic', cleanupAfterStop: false");
    expect(m).toContain('demoRunRef.current.stop = true');
    expect(m).toContain("demoRunRef.current.kind === 'official'");
    expect(m).toContain('cleanupAfterStop = true');
    expect(m).toContain('{ rehearsal: !!drReq.rehearsal, cursorEmphasis: !(drReq.polish && drReq.polish.cursorEmphasis === false) }');
    expect(m).toContain('timedOut: !!(result && result.timedOut)');
    const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf-8');
    expect(m).toContain('pauseAfter: Math.round(Math.max(0.5, Math.min(8');
    expect(m).toContain("script: String((s && s.script) || '').slice(0, 400)");
    expect(anti).toContain("only: ['source-input', 'simplified']");
    expect(anti).toContain('onRunOfficialTutorial: async (tutorialId, steps, hooks) => {');
    expect(anti).toContain("source: 'official-tutorial'");
    expect(anti).toContain('setInputText(snapshot.inputText)');
    expect(anti).toContain('setGeneratedContent(snapshot.generatedContent)');
    expect(anti).toContain('onRunDemoPlan: async (steps, hooks, options) => {');
    expect(anti).toContain('const rehearsal = !!(options && options.rehearsal)');
    expect(anti).toContain('const emphasizeCursorTarget = (cmd, label) => {');
    expect(anti).toContain("cursorMarker.setAttribute('aria-hidden', 'true')");
    expect(anti).toContain('return { ok: true, completed: previewCompleted, rehearsal: true }');
    expect(anti).toContain('timedOut: !!(r && r.timedOut)');
    expect(anti).toContain('Number(step.pauseAfter) || 2.2');
    expect(anti).toContain('Number(list[i].pauseAfter) || 2.2');
    expect(anti).toContain('let completionEvent = null;');
    expect(anti).not.toContain('setTimeout(r2, 2200)');
  });
  it('versions the popup from the loaded controller module instead of a stale fixed pin', () => {
    const m = moduleText();
    expect(m).toContain('document.currentScript && document.currentScript.src');
    expect(m).toContain("searchParams.get('v') || 'dev'");
    expect(m).not.toContain("video_studio/video_studio.html?v=1'");
  });
  it('popup re-encode cleans up on every exit and is cancelable', () => {
    const html = popup();
    expect(html).toContain('function exportAbortError(message)');
    expect(html).toContain('function cancelActiveExport()');
    expect(html).toContain("addEventListener('click', cancelActiveExport)");
    expect(html).toContain('var activeReencodeCancel = null;');
    expect(html).toContain('var settled = false, canceled = false, cleanupFns = [];');
    // Blob URLs for narration/clips/music are tracked and revoked.
    expect(html).toContain('mixUrls.push(el.src);');
    expect(html).toContain("mixUrls.splice(0).forEach(function (u) { try { URL.revokeObjectURL(u); } catch (_) {} });");
    // A failed original-audio tap warns instead of shipping a silent file.
    expect(html).toContain('the original audio could not be captured for this export');
    // Honest real-time ETA + stage-aware cancel label.
    expect(html).toContain('the export plays your video through in real time');
    expect(html).toContain("$('exportCancelBtn').textContent = active ? 'Cancel export' : 'Cancel MP4 conversion';");
  });
});
