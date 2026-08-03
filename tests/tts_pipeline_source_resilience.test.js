import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const { transformSync } = require(resolve(modulesDir, '@babel/core'));
const transformReactJsx = require(resolve(modulesDir, '@babel/plugin-transform-react-jsx'));

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');

function loadSourceModule(file) {
  const compiled = transformSync(read(file), {
    babelrc: false,
    configFile: false,
    sourceType: 'script',
    plugins: [transformReactJsx],
  }).code;
  const ReactStub = { createElement: () => null };
  new Function('window', 'React', 'SpeechSynthesisUtterance', compiled)(
    window,
    ReactStub,
    window.SpeechSynthesisUtterance,
  );
}

let PhaseK;
let Pure;

beforeAll(() => {
  window.AlloModules = window.AlloModules || {};
  loadSourceModule('phase_k_helpers_source.jsx');
  loadSourceModule('pure_helpers_source.jsx');
  PhaseK = window.AlloModules.PhaseKHelpers;
  Pure = window.AlloModules.PureHelpers;
});

describe('ordinary Leveled Text TTS identity', () => {
  it('tracks duplicate occurrences across bilingual lanes without losing lane language', () => {
    const occurrenceByText = new Map();
    const source = PhaseK.createReadAloudDescriptors(
      ['Repeated sentence.', 'Different sentence.', 'Repeated sentence.'],
      { language: 'Spanish', scope: 'source', occurrenceByText },
    );
    const target = PhaseK.createReadAloudDescriptors(
      ['Repeated sentence.', 'repeated sentence.'],
      { language: 'English', scope: 'target', occurrenceByText },
    );

    expect(source.map(({ occurrence, language }) => ({ occurrence, language }))).toEqual([
      { occurrence: 0, language: 'Spanish' },
      { occurrence: 0, language: 'Spanish' },
      { occurrence: 1, language: 'Spanish' },
    ]);
    expect(target.map(({ occurrence, language }) => ({ occurrence, language }))).toEqual([
      { occurrence: 2, language: 'English' },
      { occurrence: 0, language: 'English' },
    ]);
  });

  it('includes language in sequence-buffer identity and maps browser speech language', () => {
    expect(PhaseK.sequenceBufferKey(0, 'Kore', 'Hola.', '1\u241fSpanish'))
      .not.toBe(PhaseK.sequenceBufferKey(0, 'Kore', 'Hola.', '1\u241fEnglish'));
    expect(PhaseK.browserLanguageTag('Spanish')).toBe('es-ES');
    expect(PhaseK.browserLanguageTag('fr-CA')).toBe('fr-CA');
  });
});

describe('citation-safe sentence boundaries', () => {
  it('keeps abbreviations intact and attaches comma-separated trailing citations to the claim', () => {
    const units = Pure.splitTextToSentences(
      'The U.S. team uses e.g. one method. Evidence. ' +
      '[⁽¹⁾](https://example.org/Function_(mathematics)), ' +
      '[⁽²⁾](https://example.org/evidence) Next claim.',
    );

    expect(units).toEqual([
      'The U.S. team uses e.g. one method.',
      'Evidence. [⁽¹⁾](https://example.org/Function_(mathematics)) [⁽²⁾](https://example.org/evidence)',
      'Next claim.',
    ]);
  });
});

describe('source resilience contracts', () => {
  it('owns cancellation, typed browser fallback, stored corruption, volume, and monotonic tokens', () => {
    const phase = read('phase_k_helpers_source.jsx');
    expect(phase).toContain("signal: sessionSignal");
    expect(phase).toContain("errorCode === 'browser-tts-required'");
    expect(phase).toContain('err && err.useBrowserTts');
    expect(phase).toContain('playbackRuntime.corruptStoredKeys.add(corruptKey)');
    expect(phase).toContain('audio.volume = _pkClampVolume(voiceVolume)');
    expect(phase).toContain('Math.max(playbackRuntime.sessionCounter, Number(playbackSessionRef.current) || 0) + 1');
  });

  it('pins the multilingual resilience contracts (2026-08-03 hard deadline + promotion)', () => {
    const tts = read('tts_source.jsx');
    // Both cloud fetch sites race the request against a REAL rejecting
    // deadline: a host fetch that ignores AbortSignal cannot hold a lane.
    expect(tts).toContain('const awaitTtsHardDeadline');
    expect(tts.match(/awaitTtsHardDeadline\(fetch\(url, \{/g) || []).toHaveLength(2);
    expect(tts).toContain('TTS_FETCH_TIMEOUT_INTERACTIVE_MS = 12000');
    expect(tts).toContain('TTS_FETCH_TIMEOUT_MS = 25000');

    const phase = read('phase_k_helpers_source.jsx');
    expect(phase).toContain('READ_ALOUD_PRELOAD_PROMOTION_MS = 2000');
    // The active fresh request must outlast callTTS's interactive retry
    // ladder even when a host/user config supplies a shorter audio wait.
    expect(phase).toContain('READ_ALOUD_FRESH_SYNTHESIS_WAIT_MS = 30000');
    expect(phase).toContain('Math.max(_pkAudioLoadTimeoutMs(), READ_ALOUD_FRESH_SYNTHESIS_WAIT_MS)');
    expect(phase).toContain("'pk:preload-promoted'");
    // Caller cancellation terminates; it must never masquerade as a promotion.
    expect(phase).toContain("String(e && e.name || '') !== 'AbortError'");
    // Speculative look-aheads carry no retry budget.
    expect(phase).toMatch(/reason: 'read-aloud-preload',[\s\S]{0,120}maxRetries: 0,/);
    // Terminal no-audio failure stops playback instead of silently advancing.
    expect(phase).toContain("terminatePlayback('tts-refused', err)");
    expect(phase).toContain("terminatePlayback('tts-unavailable', err)");

    const service = read('read_aloud_audio_service_source.jsx');
    // The legacy bridge honors the caller's per-entry descriptors.
    expect(service).toContain('Array.isArray(options.entries) && options.entries.length');
    expect(service).toContain('function descriptorSynthesisProfile');

    const host = read('AlloFlowANTI.txt');
    // Host enumerator labels lanes: adapted language for source/body/FAQ,
    // explicit English for the side-by-side translation lane.
    expect(host).toContain("leveledTextLanguage || currentUiLanguage || 'English'");
    expect(host).toContain("addPart(part, 'target/' + paragraphIndex, 'English')");
    // Host default must match the fresh-path floor; 15000 stranded playback
    // mid-retry (field log 2026-08-03, French).
    expect(host).toContain('audioLoadMs: 30000');
  });

  it('keeps Leveled Text download cancellation and sentence accessibility available', () => {
    const view = read('view_simplified_source.jsx');
    expect(view).toContain('window.__alloCancelAudioDownload?.()');
    expect(view).toContain("role=\"status\" aria-live=\"polite\"");
    expect(view.match(/aria-current=\{isActive \? \"true\" : undefined\}/g) || []).toHaveLength(3);
    expect(view).toContain('EDIT_AUDIO_MAX_RECORDING_MS = 120000');
    expect(view).toContain('{ durationMs: durationMs }');
    expect(view).toContain('occurrence: entry && Number.isInteger');
  });
});
