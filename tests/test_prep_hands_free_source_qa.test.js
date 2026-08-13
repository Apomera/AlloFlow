import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const source = fs.readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf8');

function sourceFunctionBlock(startName, nextName, prelude = '') {
  const start = source.indexOf('function ' + startName + '(');
  const end = source.indexOf('\nfunction ' + nextName + '(', start + 1);
  expect(start, 'Missing source function ' + startName).toBeGreaterThanOrEqual(0);
  expect(end, 'Missing source boundary ' + nextName).toBeGreaterThan(start);
  return prelude + source.slice(start, end);
}

function loadFeedbackSpeech() {
  const block = sourceFunctionBlock(
    'testPrepSpeechExcerpt',
    'testPrepChoicesSpeechText',
    'function testPrepFinite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }\n',
  );
  return Function(block + '\nreturn testPrepFeedbackSpeechText;')();
}

function loadHandsFreeCompatibility() {
  const block = sourceFunctionBlock('testPrepHandsFreeCompatibility', 'testPrepParseHandsFreeCommand');
  return Function(block + '\nreturn testPrepHandsFreeCompatibility;')();
}

function loadPlaybackTimeout() {
  const constantsStart = source.indexOf('const TEST_PREP_HANDS_FREE_PLAYBACK_MIN_TIMEOUT_MS');
  const constantsEnd = source.indexOf('\nconst TEST_PREP_HANDS_FREE_CONSEQUENTIAL_COMMANDS', constantsStart);
  expect(constantsStart).toBeGreaterThanOrEqual(0);
  expect(constantsEnd).toBeGreaterThan(constantsStart);
  const block = sourceFunctionBlock(
    'testPrepHandsFreePlaybackTimeoutMs',
    'testPrepHandsFreeConfidenceDecision',
    'function testPrepFinite(value, fallback) { const number = Number(value); return Number.isFinite(number) ? number : fallback; }\n',
  );
  return Function(source.slice(constantsStart, constantsEnd) + '\n' + block + '\nreturn testPrepHandsFreePlaybackTimeoutMs;')();
}

describe('Test Prep hands-free source QA', () => {
  it('narrates the general rationale, selected-option feedback, and bounded distractor feedback', () => {
    const feedbackSpeechText = loadFeedbackSpeech();
    const item = {
      answerIndex: 1,
      choices: ['A choice', 'B choice', 'C choice', 'D choice', 'E choice', 'F choice', 'G choice'],
      rationale: 'The general supported rationale remains intact.',
      choiceRationales: [
        'Selected A misses the controlling condition.',
        'B satisfies the controlling condition.',
        'C relies on an unsupported exception.',
        'D changes the population.',
        'E reverses the relevant sequence.',
        'F adds a fact that is not present.',
        'G uses the wrong decision rule.',
      ],
    };

    const speech = feedbackSpeechText(item, 0);
    expect(speech).toContain('The general supported rationale remains intact.');
    expect(speech).toContain('Feedback for your selected option A. Selected A misses the controlling condition.');
    expect(speech).toContain('Other option feedback.');
    expect(speech).toContain('Option C. C relies on an unsupported exception.');
    expect(speech).not.toContain('B satisfies the controlling condition.');
    expect(speech).toContain('1 additional option note remains available on screen.');
    expect(speech.length).toBeLessThan(2_500);
  });

  it('treats explicit pack/item incompatibility and undeclared essential visuals as voice blockers', () => {
    const compatibility = loadHandsFreeCompatibility();
    expect(compatibility({}, {})).toMatchObject({ allowed: true, reason: 'compatible' });
    expect(compatibility({ capabilities: { handsFreeContentCompatible: false } }, {}))
      .toMatchObject({ allowed: false, reason: 'pack-incompatible' });
    expect(compatibility({}, { accessibility: { handsFreeContentCompatible: false } }))
      .toMatchObject({ allowed: false, reason: 'item-incompatible' });
    expect(compatibility({}, { accessibility: { essentialVisual: true } }))
      .toMatchObject({ allowed: false, reason: 'essential-visual-without-voice-equivalent' });
    expect(compatibility({}, { accessibility: { essentialVisual: true, handsFreeContentCompatible: true } }))
      .toMatchObject({ allowed: true, reason: 'compatible' });
  });

  it('enforces compatibility at activation and item transitions while leaving on-screen controls available', () => {
    expect(source.match(/testPrepHandsFreeCompatibility\(activePack \|\| selectedPack, currentItem\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('The on-screen practice controls remain available.');
    expect(source).toContain('role="status" aria-live="polite">{currentHandsFreeCompatibility.message}');
    expect(source).toContain('handsFreeStatus === \'unavailable\' ? \'unavailable\' : \'off\'');
    expect(source).toContain('role="alert">{handsFreeError}');
  });

  it('discloses provider boundaries, PII risk, and fail-safe command confidence behavior', () => {
    expect(source).toContain('<strong>Hands-free privacy:</strong>');
    expect(source).toContain("browser's speech-recognition service may process what you say");
    expect(source).toContain('configured text-to-speech provider may process the current and next three question texts');
    expect(source).toContain('configured AI provider may process clarification requests');
    expect(source).toContain('Processing may be local or remote depending on the AlloFlow setup.');
    expect(source).toContain('Do not speak or enter personally identifiable information.');
    expect(source).toContain('answer choices below 60 percent confidence wait for a yes or no confirmation');
    expect(source).toContain('other state-changing commands below 60 percent are not carried out');
  });

  it('offers persisted quick prompts, direct answer aliases, and visible pending confirmation', () => {
    expect(source).toContain("TEST_PREP_HANDS_FREE_PROMPT_MODE_KEY = 'alloflow_test_prep_hands_free_prompt_mode_v1'");
    expect(source).toContain("if (promptMode === 'quick') return base;");
    expect(source).toContain("window.localStorage.setItem(TEST_PREP_HANDS_FREE_PROMPT_MODE_KEY, next)");
    expect(source).toContain("aria-pressed={handsFreePromptMode === 'quick'}");
    expect(source).toContain('Say a letter such as B or a number such as 2');
    expect(source).toContain('Waiting for confirmation: option');
    expect(source).toContain("command.type === 'confirm-yes'");
  });

  it('limits speculative audio to eligible visible, online, unconstrained upcoming items', () => {
    const prewarmStart = source.indexOf('function prewarmUpcomingQuestionAudio()');
    const hiddenGuard = source.indexOf("document.visibilityState === 'hidden'", prewarmStart);
    const offlineGuard = source.indexOf('navigator.onLine === false', prewarmStart);
    const saveDataGuard = source.indexOf('connection.saveData', prewarmStart);
    const constrainedNetworkGuard = source.indexOf("/^(?:slow-)?2g$/i.test(String(connection.effectiveType || ''))", prewarmStart);
    const prewarmLoop = source.indexOf('for (let offset = 1; offset <= 3; offset += 1)', prewarmStart);
    const itemLookup = source.indexOf('const item = activePack.items[questionIndex + offset]', prewarmLoop);
    const compatibilityGuard = source.indexOf('testPrepHandsFreeCompatibility(activePack, item).allowed', itemLookup);
    const synthesisCall = source.indexOf('Promise.resolve(callTTS(text', compatibilityGuard);
    expect(prewarmStart).toBeGreaterThanOrEqual(0);
    expect(hiddenGuard).toBeGreaterThan(prewarmStart);
    expect(offlineGuard).toBeGreaterThan(hiddenGuard);
    expect(saveDataGuard).toBeGreaterThan(offlineGuard);
    expect(constrainedNetworkGuard).toBeGreaterThan(saveDataGuard);
    expect(prewarmLoop).toBeGreaterThan(constrainedNetworkGuard);
    expect(itemLookup).toBeGreaterThan(prewarmLoop);
    expect(compatibilityGuard).toBeGreaterThan(itemLookup);
    expect(synthesisCall).toBeGreaterThan(compatibilityGuard);
  });

  it('uses bounded duration-aware playback watchdogs and cleans every lifecycle timer', () => {
    const playbackTimeout = loadPlaybackTimeout();
    expect(playbackTimeout('', 1)).toBe(30_000);
    expect(playbackTimeout(Array(110).fill('word').join(' '), 1)).toBe(75_000);
    expect(playbackTimeout(Array(110).fill('word').join(' '), 2)).toBe(45_000);
    expect(playbackTimeout(Array(10_000).fill('word').join(' '), 1)).toBe(240_000);

    expect(source).toContain('TEST_PREP_HANDS_FREE_SYNTHESIS_TIMEOUT_MS = 15000');
    expect(source).toContain('readAloudSynthesisTimerRef');
    expect(source).toContain('readAloudPlaybackTimerRef');
    expect(source).toContain('Promise.race([synthesis, timeout])');
    expect(source.match(/armReadAloudPlaybackWatchdog\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toMatch(/function stopStalledSpeech[\s\S]{0,900}audio\.pause\(\)[\s\S]{0,900}finishSpokenRequest\(requestId, 'unavailable'\)/);
    expect(source).toMatch(/function finishSpokenRequest[\s\S]{0,700}clearReadAloudWatchdogs\(\)[\s\S]{0,700}startHandsFreeListening\(\)/);
    expect(source).toMatch(/function stopReadAloud[\s\S]{0,300}clearReadAloudWatchdogs\(\)/);
  });

  it('suspends voice, foreground audio, and speculative work when closed or hidden', () => {
    expect(source).toContain("document.addEventListener('visibilitychange', handleVisibilityChange)");
    expect(source).toContain("document.removeEventListener('visibilitychange', handleVisibilityChange)");
    expect(source).toContain("document.visibilityState !== 'hidden'");
    expect(source).toContain('Hands-free mode stopped for privacy when this page moved to the background.');
    expect(source).toMatch(/React\.useEffect\(\(\) => \{[\s\S]{0,120}if \(isOpen\) return undefined;[\s\S]{0,500}disableHandsFree\(\);[\s\S]{0,300}\}, \[isOpen\]\);/);
  });
});
