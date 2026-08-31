import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const PAGE_PATH = resolve(process.cwd(), 'it_coach/it_coach.html');
const PAGE_HTML = readFileSync(PAGE_PATH, 'utf8');
const INLINE_START = PAGE_HTML.indexOf('<script>');
const INLINE_END = PAGE_HTML.lastIndexOf('</script>');
const INLINE_SCRIPT = PAGE_HTML.slice(INLINE_START + '<script>'.length, INLINE_END);
const PAGE_WITHOUT_SCRIPTS = PAGE_HTML.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const openDoms = new Set();

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

async function flushMicrotasks(rounds = 8) {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve();
}

function advice(guidance, target = null) {
  return { guidance, target, done: false, kind: 'navigation' };
}

function makeContext() {
  return {
    clearRect: vi.fn(),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text) => ({ width: String(text || '').length * 8 })),
    getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(24 * 14 * 4) })),
    fillStyle: '',
    lineWidth: 0,
    strokeStyle: ''
  };
}

/**
 * Boots the real inline script. Only browser/device boundaries are replaced:
 * screen capture, canvas pixels, speech, the AI provider, and the opener.
 * External script tags are intentionally inert, so this harness cannot make a
 * network request.
 */
function bootCoach(options = {}) {
  const bridgeOrigin = options.bridgeOrigin || 'https://alloflow.example';
  const bridgeToken = 'runtime-test-token';
  const query = options.query !== undefined
    ? options.query
    : (options.bridge
      ? `?posture=learner&allo_bridge=${bridgeToken}&allo_origin=${encodeURIComponent(bridgeOrigin)}`
      : '?posture=learner');
  const dom = new JSDOM(PAGE_WITHOUT_SCRIPTS, {
    url: `https://coach.example/it_coach/it_coach.html${query}`,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  openDoms.add(dom);

  const { window } = dom;
  const { document } = window;
  const confirm = options.confirm || vi.fn(() => true);
  window.confirm = confirm;
  if (options.storedBackend !== undefined) {
    const stored = typeof options.storedBackend === 'string'
      ? options.storedBackend
      : JSON.stringify(options.storedBackend);
    window.localStorage.setItem('allo_it_coach_backend_v1', stored);
  }

  const contexts = new WeakMap();
  let signatureLevel = Number(options.signatureLevel || 0);
  const contextFor = (canvas) => {
    if (!contexts.has(canvas)) contexts.set(canvas, makeContext());
    const context = contexts.get(canvas);
    context.getImageData = vi.fn(() => {
      const data = new Uint8ClampedArray(24 * 14 * 4);
      data.fill(signatureLevel);
      return { data };
    });
    return context;
  };
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: function getContext() { return contextFor(this); }
  });
  Object.defineProperty(window.HTMLCanvasElement.prototype, 'toDataURL', {
    configurable: true,
    value: () => 'data:image/jpeg;base64,RUNTIME_FRAME'
  });
  const downloads = [];
  Object.defineProperty(window.HTMLAnchorElement.prototype, 'click', {
    configurable: true,
    value: vi.fn(function click() {
      downloads.push({ download: this.download, href: this.href });
    })
  });
  window.URL.createObjectURL = vi.fn(() => 'blob:https://coach.example/walkthrough-export');
  window.URL.revokeObjectURL = vi.fn();

  const preview = document.getElementById('previewVideo');
  Object.defineProperties(preview, {
    videoWidth: { configurable: true, value: 1280 },
    videoHeight: { configurable: true, value: 720 },
    clientWidth: { configurable: true, value: 640 },
    clientHeight: { configurable: true, value: 360 },
    offsetLeft: { configurable: true, value: 7 },
    offsetTop: { configurable: true, value: 11 },
    play: { configurable: true, value: vi.fn().mockResolvedValue(undefined) }
  });

  const tracks = [];
  const streams = [];
  const getDisplayMedia = vi.fn(async () => {
    const track = {
      onended: null,
      stopped: false,
      label: options.sourceLabel || '',
      getSettings: () => ({ displaySurface: options.displaySurface || '' }),
      stop: vi.fn(function stop() { track.stopped = true; })
    };
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track]
    };
    tracks.push(track);
    streams.push(stream);
    return stream;
  });
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getDisplayMedia }
  });

  const providerConfigs = [];
  const analyzeImage = options.analyzeImage || vi.fn().mockResolvedValue(
    JSON.stringify(advice('Open the settings menu.'))
  );
  window.AIProvider = vi.fn(function AIProvider(config) {
    providerConfigs.push(config);
    return { analyzeImage };
  });

  const sanitizeAdvice = options.sanitizeAdvice || vi.fn((raw) => {
    if (!raw || typeof raw !== 'object') return null;
    return {
      ...raw,
      guidance: String(raw.guidance || ''),
      target: raw.target || null,
      done: !!raw.done,
      refused: !!raw.refused
    };
  });
  window.AlloModules = {
    VideoStudio: { vsSanitizeCoachAdvice: sanitizeAdvice }
  };

  const speech = {
    cancel: vi.fn(),
    speak: vi.fn()
  };
  window.speechSynthesis = speech;
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(text) {
    this.text = text;
  };
  const recognitions = [];
  if (options.withVoice) {
    window.SpeechRecognition = function SpeechRecognition() {
      this.start = vi.fn();
      this.stop = vi.fn();
      recognitions.push(this);
    };
  }

  const animationFrames = [];
  window.requestAnimationFrame = vi.fn((callback) => {
    animationFrames.push(callback);
    return animationFrames.length;
  });
  window.cancelAnimationFrame = vi.fn();

  const pipContext = makeContext();
  const pipWindow = {
    closed: false,
    document: {
      body: { style: { cssText: '' }, appendChild: vi.fn() },
      createElement: vi.fn((tag) => tag === 'canvas'
        ? { style: { cssText: '' }, width: 0, height: 0, getContext: () => pipContext }
        : { style: { cssText: '' }, textContent: '' })
    },
    addEventListener: vi.fn(),
    close: vi.fn(function close() { pipWindow.closed = true; })
  };
  if (options.withPip) {
    window.documentPictureInPicture = {
      requestWindow: vi.fn().mockResolvedValue(pipWindow)
    };
  }

  const opener = options.bridge
    ? (options.opener || { closed: false, postMessage: vi.fn() })
    : null;
  Object.defineProperty(window, 'opener', {
    configurable: true,
    writable: true,
    value: opener
  });

  window.eval(`${INLINE_SCRIPT}\n//# sourceURL=it-coach-inline-runtime.js`);

  return {
    dom,
    window,
    document,
    opener,
    confirm,
    bridgeOrigin,
    bridgeToken,
    analyzeImage,
    sanitizeAdvice,
    providerConfigs,
    getDisplayMedia,
    tracks,
    streams,
    speech,
    pipContext,
    pipWindow,
    contextFor,
    downloads,
    recognitions,
    setSignatureLevel: (value) => { signatureLevel = Number(value || 0); },
    currentTrack: () => tracks.at(-1),
    privacy: document.getElementById('coachPrivacyAck'),
    watch: document.getElementById('coachWatchBtn'),
    suggest: document.getElementById('coachSuggestBtn'),
    goal: document.getElementById('coachGoal'),
    status: document.getElementById('coachStatus'),
    steps: document.getElementById('coachSteps'),
    overlay: document.getElementById('coachOverlay')
  };
}

async function startShare(coach) {
  coach.watch.click();
  await flushMicrotasks();
}

async function ask(coach) {
  coach.suggest.click();
  await flushMicrotasks();
}

async function pingCoach(coach, coachPosture) {
  coach.window.dispatchEvent(new coach.window.MessageEvent('message', {
    source: coach.opener,
    origin: coach.bridgeOrigin,
    data: {
      type: 'allostudio-ping',
      bridge: coach.bridgeToken,
      coachPosture
    }
  }));
  await flushMicrotasks();
}

afterEach(() => {
  for (const dom of openDoms) dom.window.close();
  openDoms.clear();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('IT Coach runtime backend disclosure', () => {
  it('discloses a remote custom endpoint as remote or unknown', () => {
    const coach = bootCoach({
      storedBackend: {
        backend: 'custom',
        baseUrl: 'https://vision.vendor.example/v1',
        apiKey: '',
        visionModel: 'vision-test'
      }
    });

    expect(coach.document.getElementById('beBackend').value).toBe('custom');
    expect(coach.document.getElementById('beStatus').textContent)
      .toMatch(/remote|unknown|off (?:this|the) device/i);
  });

  it.each([
    'http://localhost:11434/v1',
    'http://127.0.0.1:1234/v1',
    'http://[::1]:8080/v1'
  ])('recognizes loopback custom endpoint %s as local', (baseUrl) => {
    const coach = bootCoach({
      storedBackend: { backend: 'custom', baseUrl, apiKey: '', visionModel: '' }
    });

    expect(coach.document.getElementById('beStatus').textContent)
      .toMatch(/local|on this device|stays? on this device/i);
  });

  it('falls back to Ollama when storage names an unsupported backend', () => {
    let coach;
    expect(() => {
      coach = bootCoach({
        storedBackend: {
          backend: 'not-a-real-backend',
          baseUrl: 'https://unexpected.example',
          apiKey: 'should-not-be-used',
          visionModel: 'unexpected'
        }
      });
    }).not.toThrow();

    expect(coach.document.getElementById('beBackend').value).toBe('ollama');
    expect(coach.document.getElementById('beStatus').textContent)
      .toMatch(/ollama|local|on this device/i);
  });

  it('purges legacy saved keys and never persists a newly entered API key', () => {
    const coach = bootCoach({
      storedBackend: {
        backend: 'openai',
        baseUrl: 'https://api.openai.com',
        apiKey: 'legacy-secret',
        visionModel: 'gpt-vision-test'
      }
    });

    expect(coach.document.getElementById('beApiKey').value).toBe('');
    expect(JSON.parse(coach.window.localStorage.getItem('allo_it_coach_backend_v1')))
      .not.toHaveProperty('apiKey');

    coach.document.getElementById('beApiKey').value = 'new-secret';
    coach.document.getElementById('beSaveBtn').click();
    const saved = JSON.parse(coach.window.localStorage.getItem('allo_it_coach_backend_v1'));
    expect(saved).not.toHaveProperty('apiKey');
    expect(JSON.stringify(saved)).not.toContain('new-secret');
  });
});

describe('IT Coach posture session binding', () => {
  it('stays learner when an unbridged URL is tampered to request educator mode', async () => {
    const coach = bootCoach({ query: '?posture=educator' });

    expect(coach.document.getElementById('postureBadge').textContent).toMatch(/learner/i);
    expect(coach.document.getElementById('posturePledge').hidden).toBe(false);

    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);
    expect(coach.sanitizeAdvice).toHaveBeenLastCalledWith(
      expect.any(Object),
      expect.objectContaining({ posture: 'learner' })
    );
  });

  it.each([
    'https://alloflow-cdn.pages.dev'
  ])('accepts an educator posture from a session ping on trusted app origin %s', async (bridgeOrigin) => {
    const coach = bootCoach({ bridge: true, bridgeOrigin });
    await pingCoach(coach, 'educator');

    expect(coach.document.getElementById('postureBadge').textContent).toMatch(/educator/i);
    expect(coach.document.getElementById('posturePledge').hidden).toBe(true);
  });

  it.each([
    'https://attacker.pages.dev',
    // Retired 2026-08-16: the Firebase hosting origins still answer with a
    // frozen pre-migration bundle, so an opener there must stay learner.
    'https://prismflow-911fe.web.app',
    'https://prismflow-911fe.firebaseapp.com',
    'https://preview.alloflow-cdn.pages.dev',
    'https://student-project.run.app',
    'https://student-project.googleusercontent.com',
    'http://127.0.0.1:32170',
    'http://[::1]:32170',
    'https://example.com'
  ])('keeps an educator ping from unknown opener origin %s in learner mode', async (bridgeOrigin) => {
    const coach = bootCoach({ bridge: true, bridgeOrigin });
    await pingCoach(coach, 'educator');

    expect(coach.document.getElementById('postureBadge').textContent).toMatch(/learner/i);
    expect(coach.document.getElementById('posturePledge').hidden).toBe(false);
  });
});

describe('IT Coach bridge destination consent', () => {
  it('uses an exact first-party bridge without an extra confirmation', async () => {
    const coach = bootCoach({
      bridge: true,
      bridgeOrigin: 'https://alloflow-cdn.pages.dev'
    });
    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);

    expect(coach.confirm).not.toHaveBeenCalled();
    expect(coach.opener.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'allostudio-coach-request', imageBase64: 'RUNTIME_FRAME' }),
      'https://alloflow-cdn.pages.dev'
    );
  });

  it('keeps a late first-party token handoff seamless', async () => {
    const coach = bootCoach({
      bridge: true,
      bridgeOrigin: 'https://alloflow-cdn.pages.dev',
      query: '?posture=learner'
    });
    await pingCoach(coach, 'educator');
    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);

    expect(coach.confirm).not.toHaveBeenCalled();
    expect(coach.opener.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'allostudio-coach-request', imageBase64: 'RUNTIME_FRAME' }),
      'https://alloflow-cdn.pages.dev'
    );
  });

  it('names and confirms a non-first-party bridge before its first screenshot', async () => {
    const confirm = vi.fn(() => true);
    const coach = bootCoach({
      bridge: true,
      bridgeOrigin: 'https://canvas-school.example',
      confirm
    });

    expect(coach.document.getElementById('beStatus').textContent)
      .toContain('https://canvas-school.example');
    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toContain('https://canvas-school.example');
    expect(coach.opener.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'allostudio-coach-request', imageBase64: 'RUNTIME_FRAME' }),
      'https://canvas-school.example'
    );
  });

  it('sends nothing and stays disconnected after destination consent is declined', async () => {
    const confirm = vi.fn(() => false);
    const coach = bootCoach({
      bridge: true,
      bridgeOrigin: 'https://unrecognised-opener.example',
      confirm
    });
    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(coach.opener.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'allostudio-coach-request' }),
      expect.any(String)
    );
    expect(coach.status.textContent).toMatch(/nothing was sent/i);
    expect(coach.document.getElementById('beFields').disabled).toBe(false);
    expect(coach.document.getElementById('postureBadge').textContent).toMatch(/learner/i);

    await pingCoach(coach, 'educator');
    coach.privacy.checked = true;
    await ask(coach);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(coach.opener.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'allostudio-coach-request' }),
      expect.any(String)
    );
  });
});

describe('IT Coach capture-scoped state', () => {
  it('requires a fresh privacy acknowledgement for a new share and after a track ends', async () => {
    const coach = bootCoach();
    coach.privacy.checked = true;

    await startShare(coach);
    expect(coach.privacy.checked).toBe(false);

    coach.privacy.checked = true;
    coach.currentTrack().onended();
    await flushMicrotasks();
    expect(coach.privacy.checked).toBe(false);
    expect(coach.status.textContent).toMatch(/stopped watching/i);
  });

  it('does not carry steps, target, last advice, or model history into a replacement share', async () => {
    const analyzeImage = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(advice('Use the old account menu.', {
        x: 0.7, y: 0.05, w: 0.2, h: 0.15
      })))
      .mockResolvedValueOnce(JSON.stringify(advice('Use the new screen menu.')));
    const coach = bootCoach({ analyzeImage, withPip: true });

    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);
    expect(coach.steps.children).toHaveLength(1);
    expect(coach.overlay.hidden).toBe(false);

    coach.watch.click();
    await flushMicrotasks();
    await startShare(coach);

    expect.soft(coach.privacy.checked).toBe(false);
    expect.soft(coach.steps.children).toHaveLength(0);
    expect.soft(coach.overlay.hidden).toBe(true);

    // Opening PiP before any advice on the replacement share must not redraw
    // the previous share's target. This observes lastAdvice without reaching
    // into the inline script's closure.
    coach.document.getElementById('coachPipBtn').click();
    await flushMicrotasks();
    expect.soft(coach.pipContext.strokeRect).not.toHaveBeenCalled();

    coach.privacy.checked = true;
    await ask(coach);
    expect(analyzeImage).toHaveBeenCalledTimes(2);
    expect(analyzeImage.mock.calls[1][0]).not.toContain('Use the old account menu.');
  });

  it('clears visible guidance, last advice, and model history when the goal changes', async () => {
    const analyzeImage = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(advice('Choose the old goal button.', {
        x: 0.1, y: 0.1, w: 0.25, h: 0.15
      })))
      .mockResolvedValueOnce(JSON.stringify(advice('Choose the new goal button.')));
    const coach = bootCoach({ analyzeImage, withPip: true });

    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);
    expect(coach.steps.children).toHaveLength(1);
    expect(coach.overlay.hidden).toBe(false);

    coach.goal.value = 'A different goal';
    coach.goal.dispatchEvent(new coach.window.Event('change', { bubbles: true }));
    await flushMicrotasks();

    expect.soft(coach.steps.children).toHaveLength(0);
    expect.soft(coach.overlay.hidden).toBe(true);
    coach.document.getElementById('coachPipBtn').click();
    await flushMicrotasks();
    expect.soft(coach.pipContext.strokeRect).not.toHaveBeenCalled();

    await ask(coach);
    expect(analyzeImage).toHaveBeenCalledTimes(2);
    expect(analyzeImage.mock.calls[1][0]).not.toContain('Choose the old goal button.');
  });
});

describe('IT Coach pending-request lifecycle', () => {
  it('keeps the Suggest control focused and operable while a request is pending', async () => {
    const pending = deferred();
    const coach = bootCoach({ analyzeImage: vi.fn(() => pending.promise) });
    await startShare(coach);
    coach.privacy.checked = true;
    coach.suggest.focus();

    coach.suggest.click();
    await flushMicrotasks();

    expect.soft(coach.suggest.disabled).toBe(false);
    expect.soft(coach.suggest.getAttribute('aria-disabled')).toBe('true');
    expect.soft(coach.suggest.getAttribute('aria-busy')).toBe('true');
    expect.soft(coach.document.activeElement).toBe(coach.suggest);

    coach.watch.click();
    pending.resolve(JSON.stringify(advice('This reply is no longer relevant.')));
    await flushMicrotasks();
  });

  it('settles a stopped bridge request promptly and ignores its late response', async () => {
    const coach = bootCoach({ bridge: true });
    await startShare(coach);
    coach.privacy.checked = true;
    coach.suggest.click();
    await flushMicrotasks();

    const request = coach.opener.postMessage.mock.calls
      .map(([message]) => message)
      .find((message) => message.type === 'allostudio-coach-request');
    expect(request).toBeTruthy();

    coach.watch.click();
    await flushMicrotasks();
    const stoppedStatus = coach.status.textContent;
    expect(stoppedStatus).toMatch(/stopped watching/i);
    expect.soft(coach.suggest.getAttribute('aria-busy')).toBeNull();
    expect.soft(coach.suggest.getAttribute('aria-disabled')).not.toBe('true');
    expect.soft(coach.suggest.disabled).toBe(false);
    expect(coach.opener.postMessage.mock.calls.map(([message]) => message))
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          type: 'allostudio-ai-cancel',
          requestId: request.id
        })
      ]));

    coach.window.dispatchEvent(new coach.window.MessageEvent('message', {
      source: coach.opener,
      origin: coach.bridgeOrigin,
      data: {
        type: 'allostudio-coach-response',
        id: request.id,
        bridge: coach.bridgeToken,
        ...advice('Late bridge guidance must be ignored.', {
          x: 0.2, y: 0.2, w: 0.2, h: 0.2
        })
      }
    }));
    await flushMicrotasks();

    expect(coach.status.textContent).toBe(stoppedStatus);
    expect(coach.steps.children).toHaveLength(0);
    expect(coach.overlay.hidden).toBe(true);
    expect(coach.speech.speak).not.toHaveBeenCalled();
  });

  it('settles a stopped local-provider request promptly and ignores its late result', async () => {
    const pending = deferred();
    const analyzeImage = vi.fn(() => pending.promise);
    const coach = bootCoach({ analyzeImage });
    await startShare(coach);
    coach.privacy.checked = true;
    coach.suggest.click();
    await flushMicrotasks();
    expect(analyzeImage).toHaveBeenCalledTimes(1);

    coach.watch.click();
    await flushMicrotasks();
    const stoppedStatus = coach.status.textContent;
    expect(stoppedStatus).toMatch(/stopped watching/i);
    expect.soft(coach.suggest.getAttribute('aria-busy')).toBeNull();
    expect.soft(coach.suggest.getAttribute('aria-disabled')).not.toBe('true');
    expect.soft(coach.suggest.disabled).toBe(false);

    pending.resolve(JSON.stringify(advice('Late local guidance must be ignored.', {
      x: 0.3, y: 0.3, w: 0.2, h: 0.2
    })));
    await flushMicrotasks();

    expect(coach.status.textContent).toBe(stoppedStatus);
    expect(coach.steps.children).toHaveLength(0);
    expect(coach.overlay.hidden).toBe(true);
    expect(coach.speech.speak).not.toHaveBeenCalled();
  });
});

describe('IT Coach guided walkthrough', () => {
  it.each([
    ['monitor', true],
    ['window', true],
    ['browser', false]
  ])('publishes a desktop %s overlay and only forwards trackable targets', async (displaySurface, exact) => {
    vi.useFakeTimers();
    const target = { x: 0.25, y: 0.2, w: 0.3, h: 0.15 };
    const coach = bootCoach({
      bridge: true,
      bridgeOrigin: 'https://alloflow-cdn.pages.dev',
      displaySurface,
      sourceLabel: 'Example Settings'
    });
    await startShare(coach);
    coach.privacy.checked = true;
    coach.document.getElementById('coachDesktopOverlayChk').checked = true;
    coach.suggest.click();
    vi.advanceTimersByTime(160);
    await flushMicrotasks();

    const request = coach.opener.postMessage.mock.calls
      .map(([message]) => message)
      .find((message) => message.type === 'allostudio-coach-request');
    coach.window.dispatchEvent(new coach.window.MessageEvent('message', {
      source: coach.opener,
      origin: coach.bridgeOrigin,
      data: {
        type: 'allostudio-coach-response',
        id: request.id,
        bridge: coach.bridgeToken,
        ...advice('Open the highlighted menu.', target)
      }
    }));
    await flushMicrotasks();

    const update = coach.opener.postMessage.mock.calls
      .map(([message]) => message)
      .findLast((message) => message.type === 'allostudio-coach-overlay' && message.visible);
    expect(update).toEqual(expect.objectContaining({
      displaySurface,
      sourceLabel: 'Example Settings',
      guidance: 'Open the highlighted menu.',
      target: exact ? target : null
    }));
  });

  it('saves a highlighted step and exports explicitly retained walkthrough images locally', async () => {
    const coach = bootCoach({
      analyzeImage: vi.fn().mockResolvedValue(JSON.stringify(advice(
        'Open the captions menu.',
        { x: 0.6, y: 0.1, w: 0.25, h: 0.16 }
      )))
    });
    await startShare(coach);
    coach.privacy.checked = true;
    coach.document.getElementById('coachKeepStepsChk').checked = true;
    await ask(coach);

    const save = coach.document.getElementById('coachSaveBtn');
    const exportButton = coach.document.getElementById('coachExportBtn');
    expect(save.disabled).toBe(false);
    expect(exportButton.disabled).toBe(false);

    save.click();
    exportButton.click();

    expect(coach.downloads.map((item) => item.download)).toEqual([
      'screen-coach-walkthrough-step-1.png',
      'screen-coach-walkthrough.html'
    ]);
    expect(coach.window.URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it('waits for a meaningful screen change before asking for the next guided step', async () => {
    vi.useFakeTimers();
    const analyzeImage = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(advice('Open the profile menu.')))
      .mockResolvedValueOnce(JSON.stringify(advice('Choose account settings.')));
    const coach = bootCoach({ analyzeImage, signatureLevel: 0 });
    await startShare(coach);
    coach.privacy.checked = true;

    const guided = coach.document.getElementById('coachAutoChk');
    guided.click();
    await flushMicrotasks();
    expect(analyzeImage).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    await flushMicrotasks();
    expect(analyzeImage).toHaveBeenCalledTimes(1);

    coach.setSignatureLevel(255);
    vi.advanceTimersByTime(3600);
    await flushMicrotasks();
    expect(analyzeImage).toHaveBeenCalledTimes(2);
    expect(coach.steps.children).toHaveLength(2);
  });

  it('supports explicit hands-free repeat, next, pause, and stop commands', async () => {
    const analyzeImage = vi.fn()
      .mockResolvedValueOnce(JSON.stringify(advice('Open the toolbar.')))
      .mockResolvedValueOnce(JSON.stringify(advice('Choose the captions button.')));
    const coach = bootCoach({ analyzeImage, withVoice: true });
    await startShare(coach);
    coach.privacy.checked = true;
    await ask(coach);

    coach.document.getElementById('coachVoiceBtn').click();
    const recognition = coach.recognitions[0];
    expect(recognition.start).toHaveBeenCalled();
    const say = async (transcript) => {
      const result = [{ transcript }];
      result.isFinal = true;
      recognition.onresult({ resultIndex: 0, results: [result] });
      await flushMicrotasks();
    };

    await say('Coach repeat');
    expect(coach.speech.speak).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'Open the toolbar.' })
    );

    await say('Coach next');
    expect(analyzeImage).toHaveBeenCalledTimes(2);
    await say('Coach pause');
    expect(coach.document.getElementById('coachAutoChk').checked).toBe(false);
    await say('Coach stop');
    expect(recognition.stop).toHaveBeenCalled();
    expect(coach.document.getElementById('coachVoiceBtn').getAttribute('aria-pressed')).toBe('false');
  });
});
