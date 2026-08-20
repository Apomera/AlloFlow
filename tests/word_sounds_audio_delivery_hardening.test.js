import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const anti = readFileSync('AlloFlowANTI.txt', 'utf8');
const app = readFileSync('desktop/web-app/src/App.jsx', 'utf8');
const mailbox = readFileSync('apps_script/session_mailbox/Code.gs', 'utf8');
const player = readFileSync('word_sounds_module.js', 'utf8');

function loadCoverageHelper(source) {
  const start = source.indexOf('const getWordSoundsPortableAudioCoverage = (resource) => {');
  const end = source.indexOf('\nconst WS_INITIAL_STATE', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return new Function(`${source.slice(start, end)}\nreturn getWordSoundsPortableAudioCoverage;`)();
}

function loadAudioDeliveryHelper(source) {
  const start = source.indexOf('const resolveWordSoundsAudioDeliveryState =');
  const end = source.indexOf('\nconst WS_INITIAL_STATE', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return new Function(`${source.slice(start, end)}\nreturn resolveWordSoundsAudioDeliveryState;`)();
}

describe('Word Sounds live audio delivery hardening', () => {
  it('reports coverage from actual portable clips instead of optimistic readiness flags', () => {
    const coverage = loadCoverageHelper(anti);
    const resource = {
      id: 'ws-audio-1',
      type: 'word-sounds',
      data: [
        { targetWord: 'Cat', ttsReady: false, _ttsAssets: { cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' } } },
        { targetWord: 'Dog', ttsReady: true, _ttsAssets: {} },
      ],
    };
    expect(coverage(resource)).toEqual({
      ready: 1,
      total: 2,
      missing: 1,
      missingWords: ['dog'],
      missingLabels: ['dog'],
      coverageScope: 'words',
      complete: false,
    });
  });

  it('uses the declared full-activity clip manifest when one is available', () => {
    const coverage = loadCoverageHelper(anti);
    const resource = {
      type: 'word-sounds',
      data: [{
        targetWord: 'cat',
        _ttsRequiredKeys: ['cat', 'which word did you hear?', 'bat'],
        _ttsAssets: {
          cat: { mime: 'audio/mpeg', base64: 'QUJDRA==' },
          'which word did you hear?': { mime: 'audio/mpeg', base64: 'RUZHSA==' },
        },
      }],
    };
    expect(coverage(resource)).toMatchObject({
      ready: 2,
      total: 3,
      missing: 1,
      missingWords: [],
      missingLabels: ['bat'],
      coverageScope: 'activity',
      complete: false,
    });
  });

  it('rejects a late audio receipt from an older assignment and expires a stalled resend', () => {
    const resolveDelivery = loadAudioDeliveryHelper(anti);
    expect(resolveDelivery({
      progress: { audioStatus: 'ready', audioDeliveryAt: 100, at: 110 },
      targetAt: 200,
      now: 205,
    })).toMatchObject({ status: 'resending', deliveryMismatch: true, stalled: false, busy: true });
    expect(resolveDelivery({
      progress: { audioStatus: 'resending', audioDeliveryAt: 200, at: 200 },
      targetAt: 200,
      now: 30201,
    })).toMatchObject({ status: 'resending', deliveryMismatch: false, stalled: true, busy: false });
    expect(resolveDelivery({
      progress: { audioStatus: 'ready', audioDeliveryAt: 200, at: 250 },
      targetAt: 200,
      now: 999999,
    })).toMatchObject({ status: 'ready', deliveryMismatch: false, stalled: false, busy: false });
  });

  it('gates teacher launch and every live push boundary when audio is incomplete', () => {
    for (const source of [anti, app]) {
      expect(source).toContain("title: 'Some activity audio is not ready'");
      expect(source).toContain('const safePortableTtsAssets = (value) => {');
      expect(source).toContain('if (safeAssets) packedWord._ttsAssets = safeAssets;');
      expect(source).toContain('if (requiredKeys) packedWord._ttsRequiredKeys = requiredKeys;');
      expect(source).toContain("confirmText: actionLabel === 'send' ? 'Send anyway' : 'Start anyway'");
      expect(source).toContain("detail: `Missing audio: ${missingPreview.join(', ')}");
      expect(source).toContain("cancelText: 'Review audio'");
      expect(source).toContain('onCancel: reviewAudio');
      expect(source).toContain("const reviewAudio = typeof onReview === 'function' ? onReview : () => {");
      expect(source).toContain('requestIncompleteAudioConfirmation: (_coverage, onConfirm)');
      expect(source).toContain('setWordSoundsAutoReview(true);');
      expect(source).toContain('!opts.allowIncompleteAudio && requestWordSoundsAudioConfirmation(');
      expect(source).toContain('!options.allowIncompleteAudio && requestWordSoundsAudioConfirmation(');
      expect(source).toContain('allowIncompleteAudio: true');
    }
  });

  it('keeps the deployed app copies on the same coverage contract', () => {
    const antiCoverage = loadCoverageHelper(anti);
    const appCoverage = loadCoverageHelper(app);
    const resource = {
      type: 'word-sounds',
      data: [{ word: 'sun', _ttsAssets: { sun: { mime: 'audio/wav', base64: 'UklGRg==' } } }],
    };
    expect(appCoverage(resource)).toEqual(antiCoverage(resource));
    expect(appCoverage(resource).complete).toBe(true);
    expect(appCoverage(resource).missingWords).toEqual([]);
  });

  it('reports last-mile audio readiness through the bounded live progress leaf', () => {
    for (const source of [anti, app]) {
    expect(source).toContain("structuralAudioStatus === 'missing'");
      expect(source).toContain("wsAudioStatus === 'requested' ? 'Resend requested'");
      expect(source).toContain("handleRestoreView(resource, { suppressLiveFollow: true });");
      expect(source).toContain("addToast('Open the Word Sounds resource, then review its missing audio.', 'info');");
      expect(source).toContain('wordSoundsPreparedAudioStatus.ready');
      expect(source).toContain('mailboxVersion >= 14');
      expect(source).toContain('payload.audioStatus, payload.audioReady, payload.audioTotal');
      expect(source).toContain('audioRequestAt: requestedAt');
      expect(source).toContain('audioDeliveryAt: wordSoundsAudioDeliveryAt');
      expect(source).toContain('onPreparedAudioRetry: handleWordSoundsPreparedAudioRetry');
      expect(source).toContain('preparedAudioDeliveryAt: wordSoundsAudioDeliveryAt');
      expect(source).toContain("wsAudioStalled ? 'No audio response — resend'");
      expect(source).toContain('audioDeliveryAt: resendAt');
    }

    const start = mailbox.indexOf('function validWsMetricNumber');
    const end = mailbox.indexOf('function validWsProbeResultValue', start);
    const validate = new Function(`${mailbox.slice(start, end)}\nreturn validWsProgressValue;`)();
    expect(validate({
      kind: 'practice', activity: 'counting', correct: 0, total: 0, goal: 10, done: false,
      audioStatus: 'missing', audioReady: 2, audioTotal: 5, at: Date.now(),
    })).toBe(true);
    expect(validate({ audioStatus: 'missing', audioReady: 2, audioTotal: 5, audioRequestAt: Date.now() })).toBe(true);
    expect(validate({ audioStatus: 'checking', audioReady: 0, audioTotal: 5 })).toBe(true);
    expect(validate({ audioStatus: 'unsupported', audioReady: 4, audioTotal: 5 })).toBe(true);
    expect(validate({ audioStatus: 'damaged', audioReady: 4, audioTotal: 5 })).toBe(true);
    expect(validate({ audioStatus: 'blocked', audioReady: 4, audioTotal: 5, audioDeliveryAt: Date.now() })).toBe(true);
    expect(validate({ audioStatus: 'requested', audioReady: 4, audioTotal: 5, audioRequestAt: Date.now() })).toBe(true);
    expect(validate({ audioStatus: 'resending', audioReady: 4, audioTotal: 5 })).toBe(true);
    expect(validate({ audioStatus: 'ready', audioDeliveryAt: 'student-secret' })).toBe(false);
    expect(validate({ audioStatus: 'private-recording', audioReady: 2, audioTotal: 5 })).toBe(false);
    expect(validate({ audioStatus: 'missing', missingWords: ['student-secret'] })).toBe(false);
  });

  it('silently verifies browser playback before a pack-only learner begins', () => {
    expect(player).toContain('const verifyOne = (key) => new Promise((resolve) => {');
    expect(player).toContain('probe.canPlayType(descriptor.mime) === ""');
    expect(player).toContain('probe.onloadedmetadata = () => finish("ready")');
    expect(player).toContain('probe.onerror = () => finish("damaged")');
    expect(player).toContain('const status = unsupported > 0 ? "unsupported" : (damaged > 0 ? "damaged" : "ready")');
    expect(player).toContain('disabled: preparedAudioPlayback.status !== "blocked" && preparedAudioRetryRequested');
    expect(player).toContain('setTimeout(() => setPreparedAudioRetryRequested(false), 15000)');
    expect(player).toContain('publishPreparedAudioStatus({ status: "checking", ready, total: preparedAudioTargets.length, failed: progressFailed })');
    expect(player).toContain('reportPreparedRuntimePlayback(outcome.status)');
    expect(player).toContain('? "Try sound again"');
  });
});
