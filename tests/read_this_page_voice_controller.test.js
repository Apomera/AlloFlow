import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync('AlloFlowANTI.txt', 'utf8');

const section = (start, end) => {
  const from = app.indexOf(start);
  const to = app.indexOf(end, from);
  expect(from, 'section start exists').toBeGreaterThanOrEqual(0);
  expect(to, 'section end exists').toBeGreaterThan(from);
  return app.slice(from, to);
};

describe('Read This Page hands-free controller', () => {
  it('exposes one shared reader lifecycle to command routing', () => {
    const ctx = section('const _alloCmdCtx = () => {', '// The chat\'s delivery path');
    for (const capability of [
      'startReadThisPage',
      'stopReadThisPage',
      'pauseReadThisPage',
      'resumeReadThisPage',
      'nextReadThisPageItem',
      'previousReadThisPageItem',
      'repeatReadThisPageItem',
      'closeReadThisPage',
      'readThisPageIsOpen',
      'readThisPagePlaybackState',
    ]) {
      expect(ctx, capability).toContain(capability);
    }
    expect(ctx).toContain('openReadThisPage: openReadThisPagePanel');
  });

  it('starts narration for assignment read-aloud instead of only opening the panel', () => {
    expect(app).toContain('setTimeout(() => startReadThisPage(), 80)');
    expect(app).not.toContain('setTimeout(() => setShowReadThisPage(true), 80)');
    expect(app).toContain('if (controller && typeof controller.readAll === \'function\') controller.readAll()');
  });

  it('makes central stop playback stop the page reader audio too', () => {
    const stop = section('function stopPlayback(', 'const togglePause');
    expect(stop).toContain('stopReadThisPage()');

    const readerStop = section('function stopReadThisPage(', 'function pauseReadThisPage');
    expect(readerStop).toContain('_finishReadThisPageAudio()');
    expect(readerStop).toContain('_settleReadThisPagePauseWaiters()');
    expect(readerStop).toContain("window.speechSynthesis.cancel()");
  });

  it('supports pause, resume, item navigation, and repeat against one current index', () => {
    expect(app).toContain('function pauseReadThisPage(options = {})');
    expect(app).toContain('function resumeReadThisPage()');
    expect(app).toContain('function nextReadThisPageItem()');
    expect(app).toContain('function previousReadThisPageItem()');
    expect(app).toContain('function repeatReadThisPageItem()');
    expect(app).toContain('rtpCurrentIndexRef.current = index');
    expect(app).toContain("setRtpPlaybackState('paused')");
    expect(app).toContain("setRtpPlaybackState('reading')");
    expect(app).toContain('await _waitForReadThisPageResume()');
  });

  it('cleans up audio and restores meaningful focus when the panel closes', () => {
    const close = section('function closeReadThisPage()', 'rtpControllerRef.current =');
    expect(close).toContain('stopReadThisPage({ resetIndex: true })');
    expect(close).toContain('setFocusNarrationEnabled(false)');
    expect(close).toContain('setShowReadThisPage(false)');
    expect(close).toContain("[data-help-key=\"read_this_page_toggle\"]");
    expect(close).toContain('target.focus');

    const panel = section('{/* @section READ_THIS_PAGE_PANEL', '{/* Footer Stats */}');
    expect(panel).toContain('ref={rtpPanelRef} tabIndex={-1}');
    expect(panel).toContain("aria-busy={rtpPlaybackState === 'reading'}");
    expect(panel).toContain('onClick={closeReadThisPage}');
    expect(panel).toContain("aria-label={(t('common.close') || 'Close')");
  });

  it('routes panel controls and item activation through the shared controller', () => {
    const panel = section('{/* @section READ_THIS_PAGE_PANEL', '{/* Footer Stats */}');
    expect(panel).toContain('const handleReadAll = () => readAllReadThisPage()');
    expect(panel).toContain('const handleStop = () => stopReadThisPage()');
    expect(panel).toContain('const handleItemClick = (idx) => _readThisPageItemAt(idx)');
    expect(panel).not.toContain('handleReadAllLegacy');
    expect(panel).not.toContain('handleStopLegacy');
    expect(panel).not.toContain('handleItemClickLegacy');
  });

  it('fails safe on mute, aborts pending TTS, and bounds browser speech completion', () => {
    const reader = section('// @section READ_THIS_PAGE_VOICE_CONTROLLER', '// @endsection READ_THIS_PAGE_VOICE_CONTROLLER');
    expect(app).toContain('const rtpTtsAbortRef = useRef(null)');
    expect(reader).toContain('pendingTts.abort()');
    expect(reader).toContain('signal: abortController ? abortController.signal : undefined');
    expect(reader).toContain("window.addEventListener('alloflow-mute-changed', handleReadThisPageMute)");
    expect(reader).toContain("window.removeEventListener('alloflow-mute-changed', handleReadThisPageMute)");
    expect(reader).toContain("if (typeof isGlobalMuted === 'function' && isGlobalMuted())");
    expect(reader).toContain('watchdogId = setTimeout(finish, watchdogMs)');
    expect(reader).toContain('if (watchdogId != null) clearTimeout(watchdogId)');
    expect(reader).toContain('Number(voiceVolume) <= 0');
    expect(reader).toContain("audio.addEventListener('playing', markStarted)");
    expect(reader).toContain('playPromise.then(markStarted).catch(finish)');
    expect(reader).toContain('if (playbackStarted) return;');
    expect(reader).toContain('utterance.onstart = () =>');
    expect(reader).toContain('voiceSpeechLease.start()');
    expect(reader).toContain('startWatchdogId = setTimeout(failBeforeStart, 8000)');
    expect(reader).toContain("I couldn't start spoken playback.");
  });

  it('uses canonical per-item speech locales and tracks media read-all progress', () => {
    const reader = section('// @section READ_THIS_PAGE_VOICE_CONTROLLER', '// @endsection READ_THIS_PAGE_VOICE_CONTROLLER');
    expect(reader).toContain("const speechLocale = typeof getSpeechLangCode === 'function'");
    expect(reader).toContain('locale: speechLocale');
    expect(reader).toContain("utterance.lang = speechLocale || 'en-US'");
    expect(reader).toContain('rtpCurrentIndexRef.current = media[index].index');
    expect(reader).toContain('setRtpCurrentIndex(media[index].index)');
    expect(reader).toContain('media[index].item.language');
  });
});
