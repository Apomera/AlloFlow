import { expect, Page, test } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

type VoiceWindow = Window & {
  __alloLastCommandNarration?: string;
  __alloVoiceLoop?: {
    getState?: () => { confirmation?: { commandId?: string } | null };
  };
  AlloFlowVoice?: {
    getActiveVoiceSessionStatus?: () => { owner?: string | null; state?: string } | null;
  };
  __voiceE2E?: {
    afterBootstrap: boolean;
    emit: (text: string, confidence?: number) => boolean;
    canSpeak: () => boolean;
    inputEvents: Array<{ type: string; key: string }>;
    semanticEvents: Array<{ type: string; action: string; surface: string; state: string }>;
    spoken: string[];
    transcripts: string[];
  };
};

async function installDeterministicVoiceBrowser(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type RecognitionHandler = ((event?: any) => void) | null;

    class MockSpeechRecognition {
      static instances: MockSpeechRecognition[] = [];
      continuous = false;
      interimResults = false;
      lang = 'en-US';
      onstart: RecognitionHandler = null;
      onend: RecognitionHandler = null;
      onerror: RecognitionHandler = null;
      onresult: RecognitionHandler = null;
      onspeechstart: RecognitionHandler = null;
      onspeechend: RecognitionHandler = null;
      private started = false;

      constructor() {
        MockSpeechRecognition.instances.push(this);
      }

      start() {
        if (this.started) return;
        this.started = true;
        queueMicrotask(() => {
          if (this.started && typeof this.onstart === 'function') this.onstart({ type: 'start' });
        });
      }

      stop() {
        const shouldEnd = this.started;
        this.started = false;
        if (shouldEnd) queueMicrotask(() => this.onend?.({ type: 'end' }));
      }

      abort() {
        this.stop();
      }

      isStarted() {
        return this.started;
      }

      emit(text: string, confidence: number) {
        if (!this.started || typeof this.onresult !== 'function') return false;
        const alternative = { transcript: text, confidence };
        const result: any = [alternative];
        result.isFinal = true;
        const results: any = [result];
        results.item = (index: number) => results[index];
        this.onspeechstart?.({ type: 'speechstart' });
        this.onresult({ results, resultIndex: 0 });
        this.onspeechend?.({ type: 'speechend' });
        return true;
      }

      static active() {
        return [...MockSpeechRecognition.instances].reverse().find((instance) => instance.isStarted()) || null;
      }
    }

    class MockSpeechSynthesisUtterance {
      text: string;
      lang = '';
      rate = 1;
      pitch = 1;
      volume = 1;
      voice: SpeechSynthesisVoice | null = null;
      onend: ((event?: any) => void) | null = null;
      onerror: ((event?: any) => void) | null = null;
      onstart: ((event?: any) => void) | null = null;

      constructor(text = '') {
        this.text = String(text);
      }
    }

    const harness = {
      afterBootstrap: false,
      inputEvents: [] as Array<{ type: string; key: string }>,
      semanticEvents: [] as Array<{ type: string; action: string; surface: string; state: string }>,
      spoken: [] as string[],
      transcripts: [] as string[],
      canSpeak: () => Boolean(MockSpeechRecognition.active()),
      emit: (text: string, confidence = 0.99) => {
        const active = MockSpeechRecognition.active();
        if (!active) return false;
        harness.transcripts.push(String(text));
        return active.emit(String(text), confidence);
      },
    };

    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, writable: true, value: MockSpeechRecognition });
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, writable: true, value: MockSpeechRecognition });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, writable: true, value: MockSpeechSynthesisUtterance });

    let currentUtterance: MockSpeechSynthesisUtterance | null = null;
    let utteranceTimer: number | null = null;
    const finishUtterance = () => {
      if (utteranceTimer != null) window.clearTimeout(utteranceTimer);
      utteranceTimer = null;
      const utterance = currentUtterance;
      currentUtterance = null;
      if (utterance && typeof utterance.onend === 'function') utterance.onend({ type: 'end', utterance });
    };
    const synthesis = {
      get paused() { return false; },
      get pending() { return currentUtterance != null; },
      get speaking() { return currentUtterance != null; },
      onvoiceschanged: null,
      getVoices: () => [],
      pause: () => {},
      resume: () => {},
      cancel: () => finishUtterance(),
      speak: (utterance: MockSpeechSynthesisUtterance) => {
        finishUtterance();
        currentUtterance = utterance;
        harness.spoken.push(String(utterance.text || ''));
        if (typeof utterance.onstart === 'function') utterance.onstart({ type: 'start', utterance });
        utteranceTimer = window.setTimeout(finishUtterance, 20);
      },
    };
    try {
      Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synthesis });
    } catch (_) {
      Object.assign(window.speechSynthesis, synthesis);
    }

    try {
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: () => Promise.reject(new DOMException('No real microphone in deterministic test.', 'NotAllowedError')),
        },
      });
    } catch (_) {}

    for (const type of ['pointerdown', 'mousedown', 'click', 'keydown', 'keyup']) {
      document.addEventListener(type, (event) => {
        if (!harness.afterBootstrap || !event.isTrusted) return;
        harness.inputEvents.push({ type, key: event instanceof KeyboardEvent ? event.key : '' });
      }, true);
    }

    window.addEventListener('alloflow:test-prep-voice-control', (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      harness.semanticEvents.push({ type: 'control', action: String(detail.action || ''), surface: '', state: '' });
    });
    window.addEventListener('alloflow:test-prep-voice-status', (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      harness.semanticEvents.push({
        type: 'status',
        action: String(detail.action || ''),
        surface: String(detail.surface || ''),
        state: String(detail.state || ''),
      });
    });

    (window as unknown as VoiceWindow).__voiceE2E = harness;
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('allo_voice_engine', 'webspeech');
      localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', ttsProvider: 'browser' }));
    } catch (_) {}
  });
}

async function routeTestPrepAssetsLocally(page: Page): Promise<void> {
  const publicRoot = path.join(process.cwd(), 'desktop', 'web-app', 'public');

  // The production-shaped host intentionally references the deployment CDN.
  // Fulfill every generated module that exists in this workspace from the
  // public mirror so the journey tests the current code, not a prior deploy.
  await page.route(/^https:\/\/alloflow-cdn\.pages\.dev\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const relative = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const candidate = path.resolve(publicRoot, relative.replaceAll('/', path.sep));
    const safeRoot = path.resolve(publicRoot) + path.sep;
    if (!candidate.startsWith(safeRoot) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
      return route.continue();
    }
    const extension = path.extname(candidate).toLowerCase();
    const contentType = extension === '.js' || extension === '.mjs'
      ? 'application/javascript'
      : extension === '.json'
        ? 'application/json'
        : 'application/octet-stream';
    return route.fulfill({
      status: 200,
      contentType,
      headers: { 'access-control-allow-origin': '*' },
      body: fs.readFileSync(candidate),
    });
  });

  await page.route(/https:\/\/(?:alloflow-cdn\.pages\.dev|raw\.githubusercontent\.com)\/.*\/test_prep\/.*|https:\/\/alloflow-cdn\.pages\.dev\/test_prep\/.*|https:\/\/raw\.githubusercontent\.com\/Apomera\/AlloFlow\/main\/test_prep\/.*/, async (route) => {
    const url = new URL(route.request().url());
    const marker = '/test_prep/';
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex < 0) return route.abort('failed');
    const relative = decodeURIComponent(url.pathname.slice(markerIndex + 1));
    const candidate = path.resolve(publicRoot, relative.replaceAll('/', path.sep));
    if (!candidate.startsWith(path.resolve(publicRoot) + path.sep) || !fs.existsSync(candidate)) return route.abort('failed');
    return route.fulfill({
      status: 200,
      contentType: candidate.endsWith('.json') ? 'application/json' : 'application/octet-stream',
      body: fs.readFileSync(candidate),
    });
  });
}

async function waitForAgentListening(page: Page): Promise<void> {
  await expect.poll(() => page.evaluate(() => {
    const voiceWindow = window as unknown as VoiceWindow;
    const status = voiceWindow.AlloFlowVoice?.getActiveVoiceSessionStatus?.();
    return status?.owner === 'agent-command' && status.state === 'listening' && voiceWindow.__voiceE2E?.canSpeak() === true;
  }), { timeout: 30_000, message: 'global voice session should own the live mocked recognizer' }).toBe(true);
}

async function speak(page: Page, text: string): Promise<void> {
  await waitForAgentListening(page);
  const emitted = await page.evaluate((utterance) => {
    const harness = (window as unknown as VoiceWindow).__voiceE2E;
    return harness?.emit(utterance, 0.99) === true;
  }, text);
  expect(emitted, `mock recognizer did not accept: ${text}`).toBe(true);
}

async function lastNarration(page: Page): Promise<string> {
  return page.evaluate(() => String((window as unknown as VoiceWindow).__alloLastCommandNarration || ''));
}

test.describe('local voice-only navigation journey', () => {
  test('uses no pointer or keyboard after voice bootstrap', async ({ page }) => {
    const startupErrors: string[] = [];
    page.on('pageerror', (error) => startupErrors.push('page error: ' + error.message));
    page.on('console', (message) => {
      const value = message.text();
      if (message.type() === 'error' && /(?:Fatal error|ReferenceError|TypeError|SyntaxError|before initialization)/i.test(value)) {
        startupErrors.push('console error: ' + value);
      }
    });
    await installDeterministicVoiceBrowser(page);
    await routeTestPrepAssetsLocally(page);
    await page.goto('./', { waitUntil: 'domcontentloaded', timeout: 120_000 });

    const launchPad = page.getByRole('region', { name: 'Choose how to use AlloFlow' });
    await expect.poll(async () => {
      if (startupErrors.length) return startupErrors.join(' | ').slice(0, 2000);
      return await launchPad.isVisible() ? 'visible' : 'waiting';
    }, { timeout: 180_000, message: 'launch pad should render without a browser runtime error' }).toBe('visible');
    const enableVoice = launchPad.getByRole('button', { name: /Enable Voice Access|Retry Voice Access/i });

    // The one allowed bootstrap action. Browser microphone consent is itself a
    // user-activation boundary; everything after this point is speech only.
    await enableVoice.click();
    await waitForAgentListening(page);
    await page.evaluate(() => { (window as unknown as VoiceWindow).__voiceE2E!.afterBootstrap = true; });

    await speak(page, 'where am I');
    await expect.poll(() => lastNarration(page)).toMatch(/AlloFlow launch pad/i);

    await speak(page, 'full platform');
    const roleDialog = page.locator('[data-allo-ui-modal="role-selection"]');
    await expect(roleDialog).toBeVisible();

    await speak(page, 'student');
    await expect(roleDialog).toBeHidden();
    const studentEntry = page.getByRole('dialog', { name: /Pick Your Codename/i });
    await expect(studentEntry).toBeVisible();

    await speak(page, 'where am I');
    await expect.poll(() => lastNarration(page)).toMatch(/Student setup is open/i);

    await speak(page, 'start new work');
    await expect.poll(() => page.evaluate(() => {
      return (window as unknown as VoiceWindow).__alloVoiceLoop?.getState?.().confirmation?.commandId || '';
    })).toBe('student_entry_start_new_work');
    await expect.poll(() => lastNarration(page)).toMatch(/say yes to confirm/i);

    await speak(page, 'yes');
    await expect(studentEntry).toBeHidden();
    await expect.poll(() => lastNarration(page)).toMatch(/New learner workspace started/i);

    await speak(page, 'read this page');
    const reader = page.getByRole('complementary', { name: /Read This Page/i });
    await expect(reader).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      return (window as unknown as VoiceWindow).__voiceE2E?.spoken.some((text) => /Source material panel|No content loaded/i.test(text)) || false;
    })).toBe(true);
    await waitForAgentListening(page);

    await speak(page, 'close page reader');
    await expect(page.getByText('Read This Page', { exact: true })).toHaveCount(0);

    await speak(page, 'submit my work');
    const submitDialog = page.getByRole('dialog', { name: /Submit Work/i });
    await expect(submitDialog).toBeVisible();

    await speak(page, 'where am I');
    await expect.poll(() => lastNarration(page)).toMatch(/Submit work dialog/i);

    await speak(page, 'read work summary');
    await expect.poll(() => lastNarration(page)).toMatch(/Work summary:/i);

    await speak(page, 'submit my work');
    await expect.poll(() => page.evaluate(() => {
      return (window as unknown as VoiceWindow).__alloVoiceLoop?.getState?.().confirmation?.commandId || '';
    })).toBe('student_submit_confirm');
    await expect.poll(() => lastNarration(page)).toMatch(/say yes to (?:submit|download)/i);

    await speak(page, 'no');
    await expect(submitDialog).toBeVisible();
    await expect.poll(() => lastNarration(page)).toMatch(/cancelled|not submitted|keep reviewing/i);

    await speak(page, 'close this dialog');
    await expect(submitDialog).toBeHidden();

    await speak(page, 'open test prep hub');
    const testPrep = page.getByRole('dialog', { name: 'Test Prep Hub' });
    await expect(testPrep).toBeVisible({ timeout: 120_000 });
    await waitForAgentListening(page);

    await speak(page, 'test prep voice status');
    await expect.poll(() => page.evaluate(() => {
      return (window as unknown as VoiceWindow).__voiceE2E?.semanticEvents.some((event) => (
        event.type === 'status' && event.action === 'status' && event.surface === 'test-prep'
      )) || false;
    })).toBe(true);

    await speak(page, 'close this screen');
    await expect(testPrep).toBeHidden();
    await expect.poll(() => lastNarration(page)).toMatch(/Test Prep Hub closed/i);
    await waitForAgentListening(page);

    await speak(page, 'stop listening');
    await expect.poll(() => page.evaluate(() => {
      const status = (window as unknown as VoiceWindow).AlloFlowVoice?.getActiveVoiceSessionStatus?.();
      return !status?.owner || status.state === 'idle' || status.state === 'stopped';
    })).toBe(true);

    const evidence = await page.evaluate(() => {
      const harness = (window as unknown as VoiceWindow).__voiceE2E!;
      return { inputEvents: harness.inputEvents, transcripts: harness.transcripts, semanticEvents: harness.semanticEvents };
    });
    expect(evidence.inputEvents).toEqual([]);
    expect(evidence.transcripts).toEqual([
      'where am I',
      'full platform',
      'student',
      'where am I',
      'start new work',
      'yes',
      'read this page',
      'close page reader',
      'submit my work',
      'where am I',
      'read work summary',
      'submit my work',
      'no',
      'close this dialog',
      'open test prep hub',
      'test prep voice status',
      'close this screen',
      'stop listening',
    ]);
  });
});
