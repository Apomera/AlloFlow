import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const PAGE_PATH = resolve(process.cwd(), 'it_coach/it_coach.html');
const PAGE_HTML = readFileSync(PAGE_PATH, 'utf8');
const VS_SOURCE = readFileSync(resolve(process.cwd(), 'video_studio_module.js'), 'utf8');
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
  let signaturePatch = 0;
  const contextFor = (canvas) => {
    if (!contexts.has(canvas)) contexts.set(canvas, makeContext());
    const context = contexts.get(canvas);
    context.drawImage.mockImplementation((source) => {
      canvas._signatureLevel=source._signatureLevel ?? signatureLevel;
      canvas._signaturePatch=source._signaturePatch ?? signaturePatch;
    });
    context.getImageData = vi.fn(() => {
      const data = new Uint8ClampedArray(canvas.width * canvas.height * 4);
      data.fill(canvas._signatureLevel ?? signatureLevel);
      for (let i=0;i<Math.min(canvas._signaturePatch ?? signaturePatch,data.length/4);i++) data.fill(255, i*4, i*4+4);
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
  const generateText = options.generateText || vi.fn().mockResolvedValue(JSON.stringify(advice('Use the settings menu.')));
  window.AIProvider = vi.fn(function AIProvider(config) {
    providerConfigs.push(config);
    return { analyzeImage, generateText, listAvailableModels: options.listAvailableModels };
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
  window.eval(VS_SOURCE);
  window.eval(readFileSync(resolve(process.cwd(), 'it_coach/image_review.js'), 'utf8'));
  window.AlloModules.VideoStudio.vsSanitizeCoachAdvice = sanitizeAdvice;

  const speech = {
    speaking: false, pending: false,
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

  document.getElementById('coachGoal').value = options.goal === undefined ? 'Turn on captions' : options.goal;
  return {
    generateText,
    setSignaturePatch: (pixels) => { signaturePatch = pixels; },
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

async function pingCoach(coach, coachPosture, coachProviderInfo) {
  coach.window.dispatchEvent(new coach.window.MessageEvent('message', {
    source: coach.opener,
    origin: coach.bridgeOrigin,
    data: {
      type: 'allostudio-ping',
      bridge: coach.bridgeToken,
      coachPosture,
      coachProviderInfo
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
      'turn-on-captions-step-1.png',
      'turn-on-captions.html'
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

async function chat(coach, question) {
  coach.document.getElementById('coachChatInput').value = question;
  coach.document.getElementById('coachChatForm').dispatchEvent(new coach.window.Event('submit', { bubbles: true, cancelable: true }));
  await flushMicrotasks(20);
}

describe('IT Coach support enhancements', () => {
  it('offers an operable first action before asking for consent or a goal', async () => {
    const coach = bootCoach({ goal: '' });
    await ask(coach);
    expect(coach.status.textContent).toMatch(/start watching/i);
    expect(coach.document.activeElement).toBe(coach.watch);
    expect(coach.analyzeImage).not.toHaveBeenCalled();
    await startShare(coach);
    await ask(coach);
    expect(coach.document.activeElement).toBe(coach.goal);
    expect(coach.analyzeImage).not.toHaveBeenCalled();
  });

  it('discards a response if the screen changes while inference is pending', async () => {
    const pending = deferred();
    const coach = bootCoach({ analyzeImage: vi.fn(() => pending.promise) });
    await startShare(coach); coach.privacy.checked = true;
    await ask(coach);
    coach.setSignatureLevel(160);
    pending.resolve(JSON.stringify(advice('Open the old menu.', { x: 0.2, y: 0.1, w: 0.2, h: 0.1 })));
    await flushMicrotasks();
    expect(coach.status.textContent).toMatch(/screen changed.*discarded/i);
    expect(coach.steps.children.length).toBe(0);
    expect(coach.overlay.hidden).toBe(true);
    expect(coach.speech.speak).not.toHaveBeenCalled();
  });

  it('annotates the captured canvas rather than recapturing live video', async () => {
    const coach = bootCoach();
    const captures = [];
    const create = coach.document.createElement.bind(coach.document);
    vi.spyOn(coach.document, 'createElement').mockImplementation((tag, ...args) => {
      const el = create(tag, ...args); if (tag === 'canvas') captures.push(el); return el;
    });
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    const analyzedCanvas = captures.find(c => c.width === 1280 && c.height === 720);
    const annotatedCanvas = captures.find(c => c.width === 1280 && c.height > 720);
    expect(analyzedCanvas).toBeTruthy(); expect(annotatedCanvas).toBeTruthy();
    expect(coach.contextFor(annotatedCanvas).drawImage.mock.calls[0][0]).toBe(analyzedCanvas);
  });

  it('hides an existing highlight after a later screen change', async () => {
    vi.useFakeTimers();
    const coach = bootCoach({ analyzeImage: vi.fn().mockResolvedValue(JSON.stringify(advice('Open settings.', { x: .1, y: .1, w: .2, h: .1 }))) });
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    expect(coach.overlay.hidden).toBe(false);
    coach.setSignatureLevel(200); vi.advanceTimersByTime(1300);
    expect(coach.overlay.hidden).toBe(true);
    expect(coach.document.getElementById('currentStepTime').textContent).toMatch(/refresh/i);
  });

  it('exports notes and user-confirmed outcomes after sharing ends, then discards them', async () => {
    const coach = bootCoach();
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    coach.document.getElementById('coachDoneBtn').click();
    coach.currentTrack().onended();
    const exportButton = coach.document.getElementById('coachExportBtn');
    expect(exportButton.disabled).toBe(false);
    expect(coach.document.getElementById('supportSummary').value).toContain('User reports step completed');
    exportButton.click(); expect(coach.downloads.at(-1).download).toBe('turn-on-captions.html');
    coach.document.getElementById('coachDiscardBtn').click();
    expect(exportButton.disabled).toBe(true);
    expect(coach.document.getElementById('supportSummary').value).toBe('');
  });

  it('grounds chat in the current goal and last advice without sending another image', async () => {
    const coach = bootCoach();
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    await chat(coach, 'I cannot find that button.');
    expect(coach.generateText).toHaveBeenCalledTimes(1);
    const prompt = coach.generateText.mock.calls[0][0];
    expect(prompt).toContain('Turn on captions'); expect(prompt).toContain('Open the settings menu.');
    expect(prompt).toContain('not a current screenshot'); expect(prompt).not.toContain('RUNTIME_FRAME');
    expect(coach.analyzeImage).toHaveBeenCalledTimes(1);
    expect(coach.document.getElementById('coachChatLog').textContent).toContain('Use the settings menu.');
    expect(coach.document.getElementById('coachChatStatus').textContent).toMatch(/no web sources.*unverified/i);
  });

  it('does not display or cite academic content returned through text chat', async () => {
    const coach = bootCoach({ generateText: vi.fn().mockResolvedValue({ text: JSON.stringify({ kind: 'content', guidance: 'The answer is 42.' }), sources: [{ url: 'https://example.com' }] }) });
    await chat(coach, 'Which answer should I choose?');
    const log = coach.document.getElementById('coachChatLog');
    expect(log.querySelector('.assistant').textContent).not.toContain('42');
    expect(log.querySelectorAll('a')).toHaveLength(0);
    expect(coach.document.getElementById('coachChatStatus').textContent).toMatch(/learner/i);
  });

  it('ignores a late chat response after the goal changes', async () => {
    const pending = deferred(); const coach = bootCoach({ generateText: vi.fn(() => pending.promise) });
    await chat(coach, 'Explain this step.');
    coach.goal.value = 'Print a page'; coach.goal.dispatchEvent(new coach.window.Event('input'));
    pending.resolve(JSON.stringify(advice('Old reply must disappear.'))); await flushMicrotasks(20);
    expect(coach.document.getElementById('coachChatLog').textContent).not.toContain('Old reply');
    expect(coach.document.getElementById('coachChatSendBtn').getAttribute('aria-busy')).toBe('false');
    expect(coach.generateText.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('cancels text chat while keeping the send control focused', async () => {
    const pending = deferred(); const coach = bootCoach({ generateText: vi.fn(() => pending.promise) });
    const send = coach.document.getElementById('coachChatSendBtn'); send.focus();
    await chat(coach, 'Explain the setting.');
    expect(coach.document.activeElement).toBe(send); expect(send.disabled).toBe(false);
    coach.document.getElementById('coachCancelChatBtn').click();
    pending.resolve(JSON.stringify(advice('Too late.'))); await flushMicrotasks(20);
    expect(coach.document.getElementById('coachChatLog').textContent).not.toContain('Too late.');
    expect(send.getAttribute('aria-busy')).toBe('false');
  });

  it('shows returned web sources and distinguishes answers without search', async () => {
    const generateText = vi.fn().mockResolvedValue({ text: JSON.stringify(advice('Open Settings.')), groundingMetadata: { groundingChunks: [{ web: { uri: 'https://support.example.com/settings', title: 'Settings help' } }] } });
    const coach = bootCoach({ generateText }); await chat(coach, 'Where is Settings?');
    expect(coach.document.querySelector('.chat-sources a').href).toBe('https://support.example.com/settings');
    expect(coach.document.getElementById('coachChatStatus').textContent).toMatch(/with web sources/i);
    generateText.mockResolvedValue(JSON.stringify(advice('Open Settings.')));
    coach.document.getElementById('coachChatSearchChk').checked = false;
    await chat(coach, 'Please explain.');
    expect(coach.document.getElementById('coachChatStatus').textContent).toMatch(/without web search/i);
  });

  it('does not reopen the microphone during a long spoken reply and reads the whole answer', async () => {
    vi.useFakeTimers();
    const answer = 'Open the software settings and review the available controls. '.repeat(15);
    const coach = bootCoach({ withVoice: true, generateText: vi.fn().mockResolvedValue(JSON.stringify(advice(answer))) });
    coach.document.getElementById('coachMicMode').value = 'chat';
    coach.document.getElementById('coachMicMode').dispatchEvent(new coach.window.Event('change'));
    await chat(coach, 'Explain the controls.'); coach.speech.speaking = true;
    expect(coach.recognitions.length).toBe(1);
    vi.advanceTimersByTime(9000); await flushMicrotasks();
    expect(coach.recognitions.length).toBe(1);
    for (let i=0; i<10; i++) { const utterance=coach.speech.speak.mock.calls[i]?.[0]; if (!utterance) break; utterance.onend(); }
    expect(coach.speech.speak.mock.calls.map(([u])=>u.text).join('')).toBe(answer.trim());
    expect(coach.recognitions.length).toBe(2);
  });

  it('tests vision with a synthetic image without requesting screen sharing', async () => {
    const coach = bootCoach({ analyzeImage: vi.fn().mockResolvedValue('COACH READY') });
    coach.document.getElementById('beTestBtn').click(); await flushMicrotasks(20);
    expect(coach.getDisplayMedia).not.toHaveBeenCalled();
    expect(coach.document.getElementById('beTestStatus').textContent).toMatch(/vision check passed/i);
    expect(coach.analyzeImage.mock.calls[0][0]).not.toContain('COACH READY');
  });
});

describe('IT Coach boundary regressions', () => {
  it('detects a small menu change even when average screen brightness barely changes', async () => {
    const pending = deferred(); const coach = bootCoach({ analyzeImage: vi.fn(() => pending.promise) });
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    coach.setSignaturePatch(24);
    pending.resolve(JSON.stringify(advice('Open the former control.'))); await flushMicrotasks(20);
    expect(coach.status.textContent).toMatch(/screen changed/i); expect(coach.steps.children).toHaveLength(0);
  });

  it('does not revive a rejected target in the floating preview', async () => {
    const coach = bootCoach({ withPip: true, analyzeImage: vi.fn().mockResolvedValue(JSON.stringify(advice('Open the menu.', { x: .2, y: .2, w: .2, h: .1 }))) });
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    coach.document.getElementById('coachWrongBtn').click();
    coach.document.getElementById('coachPipBtn').click(); await flushMicrotasks();
    expect(coach.pipContext.strokeRect).not.toHaveBeenCalled();
  });

  it('cancels an in-flight screenshot request when consent is withdrawn', async () => {
    const pending = deferred(); const coach = bootCoach({ analyzeImage: vi.fn(() => pending.promise) });
    await startShare(coach); coach.privacy.checked = true; await ask(coach);
    coach.privacy.click();
    pending.resolve(JSON.stringify(advice('Late private-screen advice.'))); await flushMicrotasks(20);
    expect(coach.analyzeImage.mock.calls[0][2].signal.aborted).toBe(true);
    expect(coach.steps.children).toHaveLength(0); expect(coach.overlay.hidden).toBe(true);
  });

  it('does not send a screenshot after a context change during desktop-overlay preparation', async () => {
    vi.useFakeTimers(); const coach = bootCoach();
    await startShare(coach); coach.privacy.checked = true;
    coach.document.getElementById('coachDesktopOverlayChk').checked = true;
    coach.suggest.click(); coach.suggest.click();
    coach.goal.value = 'New goal'; coach.goal.dispatchEvent(new coach.window.Event('input'));
    vi.advanceTimersByTime(200); await flushMicrotasks(20);
    expect(coach.analyzeImage).not.toHaveBeenCalled();
  });

  it('clears educator notes and rejects a late chat answer on learner downgrade', async () => {
    const coach = bootCoach({ bridge: true, bridgeOrigin: 'https://alloflow-cdn.pages.dev' });
    await pingCoach(coach, 'educator');
    expect(coach.goal.value).toBe('Turn on captions');
    coach.document.getElementById('supportApp').value = 'Private educator context';
    await chat(coach, 'Explain my setting.');
    const request = coach.opener.postMessage.mock.calls.map(([m])=>m).find(m=>m.type==='allostudio-coach-chat-request');
    expect(request.taskContext).toContain('Private educator context');
    await pingCoach(coach, 'learner');
    coach.window.dispatchEvent(new coach.window.MessageEvent('message', { source: coach.opener, origin: coach.bridgeOrigin, data: { type: 'allostudio-coach-chat-response', bridge: coach.bridgeToken, id: request.id, guidance: 'Private answer', kind: 'navigation' } }));
    await flushMicrotasks(20);
    expect(coach.document.getElementById('coachChatLog').textContent).not.toContain('Private');
    expect(coach.document.getElementById('supportApp').value).toBe(''); expect(coach.goal.value).toBe('');
    expect(coach.document.getElementById('coachExportBtn').disabled).toBe(true);
  });

  it('offers discovered models without claiming they support images', async () => {
    const listAvailableModels = vi.fn().mockResolvedValue([{ id: 'text-only' }, { id: 'vision-example' }]);
    const coach = bootCoach({ listAvailableModels });
    coach.document.getElementById('beDiscoverBtn').click(); await flushMicrotasks(20);
    expect(coach.document.getElementById('beModelList').children.length).toBe(2);
    expect(coach.document.getElementById('beTestStatus').textContent).toMatch(/does not verify vision/i);
    expect(coach.analyzeImage).not.toHaveBeenCalled();
  });

  it.each([
    ['unstructured academic output', 'The answer is 42.'],
    ['a mislabeled answer beyond the first 400 characters', { kind: 'navigation', guidance: 'Review the interface. '.repeat(30) + ' The answer is 42.' }],
    ['unknown classification', { guidance: 'Choose option B.', kind: 'unknown' }],
    ['academic classification', { guidance: '42', kind: 'content' }]
  ])('uses the shared chat policy for %s', (_, reply) => {
    const coach = bootCoach();
    const checked = coach.window.AlloModules.VideoStudio.vsSanitizeCoachChat(reply, { posture: 'learner' });
    expect(checked.refused).toBe(true); expect(checked.target).toBeNull(); expect(checked.guidance).not.toContain('42');
  });
});


describe('local screenshot review', () => {
  function control(c,id){return c.document.getElementById(id);}
  function area(c,x,y,w,h){[x,y,w,h].forEach((v,i)=>{control(c,'review'+['X','Y','W','H'][i]).value=String(v);});}
  async function review(c){await startShare(c);control(c,'coachReviewChk').checked=true;await ask(c);}
  async function send(c){c.privacy.checked=true;control(c,'reviewApproveChk').checked=true;control(c,'reviewSendBtn').click();await flushMicrotasks(20);}
  it('opens locally without privacy consent or an AI call and focuses its heading',async()=>{
    const c=bootCoach();await review(c);
    expect(control(c,'screenReview').hidden).toBe(false);
    expect(c.analyzeImage).not.toHaveBeenCalled();
    expect(c.document.activeElement.id).toBe('screenReviewHeading');
    expect(c.privacy.checked).toBe(false);
  });
  it('requires edited-image approval and send consent, preserving the pending image',async()=>{
    const c=bootCoach();await review(c);
    control(c,'reviewSendBtn').click();await flushMicrotasks();
    expect(c.analyzeImage).not.toHaveBeenCalled();
    expect(c.document.activeElement.id).toBe('reviewApproveChk');
    control(c,'reviewApproveChk').checked=true;control(c,'reviewSendBtn').click();await flushMicrotasks();
    expect(c.analyzeImage).not.toHaveBeenCalled();expect(control(c,'screenReview').hidden).toBe(false);
    await send(c);expect(c.analyzeImage).toHaveBeenCalledTimes(1);expect(control(c,'screenReview').hidden).toBe(true);
  });
  it('cancels without sending and erases both visible review canvases',async()=>{
    const c=bootCoach();await review(c);control(c,'reviewCancelBtn').click();await send(c);
    expect(c.analyzeImage).not.toHaveBeenCalled();expect(control(c,'reviewCanvas').width).toBe(1);expect(control(c,'reviewOutput').width).toBe(1);
    expect(c.document.activeElement.id).toBe('coachSuggestBtn');
  });
  it('drops pending review after the goal changes or sharing ends',async()=>{
    const c=bootCoach();await review(c);c.goal.value='Another goal';c.goal.dispatchEvent(new c.window.Event('input'));await send(c);
    expect(c.analyzeImage).not.toHaveBeenCalled();expect(control(c,'screenReview').hidden).toBe(true);
    await ask(c);c.watch.click();await send(c);expect(c.analyzeImage).not.toHaveBeenCalled();
  });
  it('rejects an approved image when the visible screen has changed',async()=>{
    const c=bootCoach();await review(c);c.setSignatureLevel(255);await send(c);
    expect(c.analyzeImage).not.toHaveBeenCalled();expect(c.status.textContent).toContain('screen changed');
  });
  it('crops to the requested dimensions and resets approval on edits',async()=>{
    const c=bootCoach();await review(c);control(c,'reviewApproveChk').checked=true;
    area(c,25,25,50,50);control(c,'reviewCropBtn').click();
    expect(control(c,'reviewOutput').width).toBe(640);expect(control(c,'reviewOutput').height).toBe(360);
    expect(control(c,'reviewApproveChk').checked).toBe(false);
    area(c,0,0,10,10);control(c,'reviewHideBtn').click();expect(control(c,'reviewStatus').textContent).toContain('1 hidden');
    control(c,'reviewUndoBtn').click();expect(control(c,'reviewStatus').textContent).toContain('0 hidden');
    control(c,'reviewResetBtn').click();expect(control(c,'reviewOutput').width).toBe(1280);
  });
  it('does not apply invalid keyboard selections',async()=>{
    const c=bootCoach();await review(c);area(c,0,0,0,50);control(c,'reviewCropBtn').click();
    expect(control(c,'reviewOutput').width).toBe(1280);expect(control(c,'reviewStatus').textContent).toContain('valid area');
  });
});


describe('app-reported coach AI configuration',()=>{
  it('shows only model/provider labels and treats markup as text',async()=>{
    const c=bootCoach({bridge:true});
    await pingCoach(c,'learner',{backend:'cloud',provider:'example',model:'text-model',visionModel:'<b>vision-model</b>',apiKey:'NEVER-DISPLAY',baseUrl:'https://secret.example'});
    const info=c.document.getElementById('coachProviderInfo');
    expect(info.textContent).toContain('example');expect(info.textContent).toContain('<b>vision-model</b>');
    expect(info.querySelector('b')).toBeNull();expect(info.textContent).not.toContain('NEVER-DISPLAY');expect(info.textContent).not.toContain('secret.example');
  });
  it('discards a screenshot review and consent when the configured provider changes',async()=>{
    const c=bootCoach({bridge:true});await pingCoach(c,'learner',{provider:'first',model:'one'});await startShare(c);
    c.document.getElementById('coachReviewChk').checked=true;await ask(c);c.privacy.checked=true;
    await pingCoach(c,'learner',{provider:'second',model:'two'});
    expect(c.privacy.checked).toBe(false);expect(c.document.getElementById('screenReview').hidden).toBe(true);
    expect(c.document.getElementById('coachProviderInfo').textContent).toContain('second');
  });
  it('does not clear consent for repeated identical metadata',async()=>{
    const c=bootCoach({bridge:true});await pingCoach(c,'learner',{provider:'first',model:'one'});await startShare(c);c.privacy.checked=true;
    await pingCoach(c,'learner',{provider:'first',model:'one'});expect(c.privacy.checked).toBe(true);
  });
  it('ignores configuration labels from an unauthenticated sender',async()=>{
    const c=bootCoach({bridge:true});await pingCoach(c,'learner',{provider:'first'});
    c.window.dispatchEvent(new c.window.MessageEvent('message',{source:c.opener,origin:c.bridgeOrigin,data:{type:'allostudio-ping',bridge:'wrong-token',coachProviderInfo:{provider:'imposter'}}}));
    expect(c.document.getElementById('coachProviderInfo').textContent).toContain('first');
    expect(c.document.getElementById('coachProviderInfo').textContent).not.toContain('imposter');
  });
});
