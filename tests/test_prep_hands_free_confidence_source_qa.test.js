import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const source = fs.readFileSync(resolve(process.cwd(), 'test_prep_hub_source.jsx'), 'utf8');

function loadConfidenceDecision() {
  const constantsStart = source.indexOf('const TEST_PREP_HANDS_FREE_ACTION_CONFIDENCE_MIN');
  const constantsEnd = source.indexOf('\nconst TEST_PREP_CDN_BASE', constantsStart);
  const functionStart = source.indexOf('function testPrepHandsFreeConfidenceDecision(');
  const functionEnd = source.indexOf('\nfunction testPrepParseHandsFreeCommand(', functionStart);
  expect(constantsStart).toBeGreaterThanOrEqual(0);
  expect(constantsEnd).toBeGreaterThan(constantsStart);
  expect(functionStart).toBeGreaterThanOrEqual(0);
  expect(functionEnd).toBeGreaterThan(functionStart);
  const executable = source.slice(constantsStart, constantsEnd) + '\n' + source.slice(functionStart, functionEnd);
  return Function(executable + '\nreturn testPrepHandsFreeConfidenceDecision;')();
}

describe('Test Prep hands-free confidence and lifecycle source QA', () => {
  it('confirms low-confidence answer choices while rejecting other consequential commands', () => {
    const decide = loadConfidenceDecision();
    expect(decide({ type: 'choose' }, 0.59)).toMatchObject({
      reject: false,
      confirm: true,
      consequential: true,
      confidenceAvailable: true,
      minimum: 0.6,
    });
    expect(decide({ type: 'choose' }, 0.6)).toMatchObject({ reject: false, confirm: false });
    for (const type of ['submit', 'next', 'save-review', 'remove-review', 'confidence', 'add-time']) {
      expect(decide({ type }, 0.59), type).toMatchObject({
        reject: true,
        confirm: false,
        consequential: true,
        confidenceAvailable: true,
        minimum: 0.6,
      });
      expect(decide({ type }, 0.6).reject, type + ' at threshold').toBe(false);
    }
  });

  it('always honors the exact stop command, including at low or unavailable confidence', () => {
    const decide = loadConfidenceDecision();
    for (const confidence of [0.01, 0.59, 0, undefined]) {
      expect(decide({ type: 'stop' }, confidence), String(confidence)).toMatchObject({
        reject: false,
        consequential: false,
      });
    }
  });

  it('does not mistake zero, missing, invalid, or out-of-range confidence for a low score', () => {
    const decide = loadConfidenceDecision();
    for (const confidence of [0, undefined, null, Number.NaN, -0.2, 1.2]) {
      expect(decide({ type: 'choose' }, confidence)).toMatchObject({
        reject: false,
        consequential: true,
        confidenceAvailable: false,
        confidence: null,
      });
    }
  });

  it('allows nonconsequential commands even when reported confidence is low', () => {
    const decide = loadConfidenceDecision();
    for (const type of ['repeat-question', 'repeat-choices', 'repeat-choice', 'repeat-feedback', 'status', 'help', 'clarify', 'slower', 'faster', 'unknown']) {
      expect(decide({ type }, 0.2), type).toMatchObject({
        reject: false,
        consequential: false,
        confidenceAvailable: true,
      });
    }
  });

  it('provides an accessible narrated repeat prompt and documents the current language boundary', () => {
    expect(source).toContain("const message = 'For safety, that state-changing command was not carried out because speech-recognition confidence was below '");
    expect(source).toContain("'I heard ' + choiceLabel + '. Say yes to confirm.'");
    expect(source).toContain("command.type === 'confirm-yes'");
    expect(source).toContain('setHandsFreeError(message);');
    expect(source).toContain('speakTestPrepText(message);');
    expect(source).toContain('role="alert">{handsFreeError}');
    expect(source).toContain('answer choices below 60 percent confidence wait for a yes or no confirmation');
    expect(source).toContain('other state-changing commands below 60 percent are not carried out');
    expect(source).toContain('When the browser supplies a meaningful score');
    expect(source).toContain('Whisper and Gemini do not supply a calibrated confidence score');
    expect(source).toContain("recognition.lang = 'en-US'");
    expect(source).toContain("utterance.lang = 'en-US'");
    expect(source).toContain("language: 'English'");
  });

  it('retains permission denial, bounded retry shutdown, and complete teardown cancellation paths', () => {
    expect(source).toContain("code === 'not-allowed' || code === 'service-not-allowed'");
    expect(source).toContain('Microphone permission is required for hands-free commands.');
    expect(source).toContain('if (failures >= 3 || (detail && detail.fatal))');
    expect(source).toContain("setHandsFreeError('Voice recognition paused. Retry ' + failures + ' of 2 will start automatically.')");
    expect(source).toContain('Math.min(2000, 250 * Math.pow(2, handsFreeRecognitionErrorStreakRef.current))');
    expect(source).toContain('disableHandsFree(false, false);');
    expect(source).toMatch(/function disableHandsFree[\s\S]{0,500}stopHandsFreeRecognition\(true\);[\s\S]{0,200}stopReadAloud\(updateState\);[\s\S]{0,200}clearHandsFreeAudioCache\(\);/);
    expect(source).toMatch(/function clearHandsFreeAudioCache[\s\S]{0,400}entry\.controller\.abort\(\)/);
  });
});
