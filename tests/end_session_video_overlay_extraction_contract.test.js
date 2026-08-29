import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = file => readFileSync(resolve(ROOT, file), 'utf8');
const host = read('AlloFlowANTI.txt');
const videoSource = read('view_video_ref_player_source.jsx');
const videoModule = read('view_video_ref_player_module.js');
const endSource = read('view_end_session_preview_source.jsx');
const endModule = read('view_end_session_preview_module.js');
const build = read('build.js');

function loadApi(code, key) {
  const window = { AlloModules: {}, React: {} };
  vm.runInNewContext(code, { window, console }, { filename: `${key}.js` });
  return window.AlloModules[key];
}

describe('End Session and VideoRef safe view extraction', () => {
  it('registers exactly the intended presentation APIs', () => {
    const videoApi = loadApi(videoModule, 'VideoRefPlayer');
    const endApi = loadApi(endModule, 'EndSessionPreview');
    expect(Object.keys(videoApi)).toEqual(['VideoRefPlayerOverlay']);
    expect(Object.keys(endApi)).toEqual(['EndSessionPreview']);
    expect(typeof videoApi.VideoRefPlayerOverlay).toBe('function');
    expect(typeof endApi.EndSessionPreview).toBe('function');
  });

  it('removes both large view bodies while retaining their stateful host controllers', () => {
    for (const shell of [
      host,
      read('desktop/web-app/src/AlloFlowANTI.txt'),
      read('desktop/web-app/src/App.jsx'),
    ]) {
      expect(shell).not.toContain('function VideoRefPlayerOverlay({ item, onClose, addToast, t })');
      expect(shell).not.toContain('Review the privacy-limited roster summary before temporary live-session data is deleted.');
      expect(shell).toContain('<VideoRefPlayerOverlay item={videoRefPlayerItem}');
      expect(shell).toContain('{endSessionPreview && <EndSessionPreview');
      expect(shell).toContain('useFocusTrap(endSessionPreviewRef, Boolean(endSessionPreview)');
      expect(shell).toContain('const completeLiveSessionEnd = async');
    }
  });

  it('loads lazily, preloads the end review with SessionModal, and retries safely', () => {
    expect(host).toContain("loadModule('VideoRefPlayer', 'https://alloflow-cdn.pages.dev/view_video_ref_player_module.js");
    expect(host).toContain("loadModule('EndSessionPreview', 'https://alloflow-cdn.pages.dev/view_end_session_preview_module.js");
    expect(host).toContain('try { window.__alloLazyEndSessionPreview(); } catch (_) {}');
    expect(host).toContain('loaderName="__alloLazyVideoRefPlayer"');
    expect(host).toContain('const loader = window[props.loaderName]');
    expect(host).toContain('The review tools could not load. Your live session is still open.');
    expect(host).toContain('Your saved video reference is unchanged.');
    expect(host).toContain('Retry loading');
    expect(host).toContain('closeLabel="Keep session open"');
    expect(host).toContain("/^https?:\\/\\//i.test(props.hostedUrl)");
    const core = host.match(/const CORE_BOOT_MODULES = \[([^\]]+)\]/)?.[1] || '';
    expect(core).not.toContain('VideoRefPlayer');
    expect(core).not.toContain('EndSessionPreview');
  });

  it('keeps the end-session module presentation-only and privacy-minimized', () => {
    for (const prop of [
      'canSaveSummary',
      'groupNamesById',
      'getConnectedCount',
      'onFollowUpResourceChange',
      'onSendCohort',
      'onKeepOpen',
      'onComplete',
    ]) expect(endSource).toContain(prop);
    expect(endSource).not.toMatch(/updateDoc\(|deleteDoc\(|setDoc\(|endMailboxLiveSession|handleSetStudentsResource/);
    expect(endSource).toContain('disabled={endSessionPreview.busy || !!endSessionPreview.followUpBusy}');
    expect(endSource).toContain('Save summary & end anyway');
    expect(endSource).toContain('event.target.value.slice(0, 500)');
  });

  it('preserves local-only VideoRef verification and cleanup behavior', () => {
    expect(videoSource).toContain("window.crypto.subtle.digest('SHA-256', bytes)");
    expect(videoSource).toContain('URL.revokeObjectURL(url)');
    expect(videoSource).toContain('URL.createObjectURL(new Blob([bytes]');
    expect(videoSource).toContain('/\\.allopack$/i.test(file.name)');
    expect(videoSource).toContain('nothing is uploaded.');
    expect(videoSource).toContain('rel="noopener noreferrer"');
  });

  it('is build-managed and keeps generated deploy mirrors byte-identical', () => {
    expect(build).toContain("name: 'VideoRefPlayer'");
    expect(build).toContain("filename: 'view_video_ref_player_module.js'");
    expect(build).toContain("buildVideoRefPlayerModule(src)");
    expect(build).toContain("name: 'EndSessionPreview'");
    expect(build).toContain("filename: 'view_end_session_preview_module.js'");
    expect(build).toContain("buildEndSessionPreviewModule(src)");
    expect(read('desktop/web-app/public/view_video_ref_player_module.js')).toBe(videoModule);
    expect(read('desktop/web-app/public/view_end_session_preview_module.js')).toBe(endModule);
  });
});
