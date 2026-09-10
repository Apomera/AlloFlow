import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const source = readFileSync(resolve(process.cwd(), 'school_store_recognition.js'), 'utf8');
const tools = runInNewContext(source + '\ncreateSchoolStoreRecognitionTools();');

describe('pure local School Store typed recognition tools', () => {
  it.each([
    ['give Brave Fox 5 points for helping a partner', 'Brave Fox', 5, 'helping a partner'],
    ['award Calm Owl 1 point for kindness', 'Calm Owl', 1, 'kindness'],
    ['award 1000 points to Brave Fox for patient teamwork', 'Brave Fox', 1000, 'patient teamwork'],
    ['  GIVE   Brave Fox   15 POINTS FOR helping and sharing.  ', 'Brave Fox', 15, 'helping and sharing.'],
    ['da Zorro Valiente 5 puntos por ayudar a un compañero', 'Zorro Valiente', 5, 'ayudar a un compañero'],
    ['otorga Búho Sereno 1 punto por amabilidad', 'Búho Sereno', 1, 'amabilidad'],
    ['otorga 25 puntos a Búho Sereno por trabajar con paciencia', 'Búho Sereno', 25, 'trabajar con paciencia'],
    ['ｇｉｖｅ Brave Fox ５ points for teamwork', 'Brave Fox', 5, 'teamwork'],
    ['give Étoile Bleue 2 points for helping', 'Étoile Bleue', 2, 'helping'],
    ['give Fox-2 3 points for sharing supplies', 'Fox-2', 3, 'sharing supplies'],
  ])('accepts only the explicit supported grammar: %s', (raw, codename, amount, reason) => {
    expect(tools.isRecognitionRequest(raw)).toBe(true);
    expect(tools.parseRecognitionRequest(raw)).toEqual({ ok: true, codename, amount, reason });
  });

  it.each([
    [null, 'INPUT_REQUIRED'], [undefined, 'INPUT_REQUIRED'], [5, 'INPUT_REQUIRED'], ['', 'INPUT_REQUIRED'], ['   ', 'INPUT_REQUIRED'],
    ['give Fox 5 points', 'UNSUPPORTED_FORMAT'], ['please give Fox 5 points for kindness', 'UNSUPPORTED_FORMAT'],
    ['give 5 points to Fox for kindness', 'UNSUPPORTED_FORMAT'], ['award Fox five points for kindness', 'INVALID_AMOUNT'],
    ['give Fox 0 points for kindness', 'INVALID_AMOUNT'], ['give Fox -5 points for kindness', 'INVALID_AMOUNT'],
    ['give Fox +5 points for kindness', 'INVALID_AMOUNT'], ['give Fox 1.5 points for kindness', 'INVALID_AMOUNT'],
    ['give Fox 1,5 points for kindness', 'INVALID_AMOUNT'], ['give Fox 1e2 points for kindness', 'INVALID_AMOUNT'],
    ['give Fox 0005 points for kindness', 'INVALID_AMOUNT'], ['give Fox 1001 points for kindness', 'INVALID_AMOUNT'],
    ['give Fox 10000 points for kindness', 'INVALID_AMOUNT'], ['give Fox - 5 points for kindness', 'INVALID_AMOUNT'],
    ['give Fox 5 points for', 'INVALID_REASON'], ['give Fox 5 points for    ', 'INVALID_REASON'],
    ['give __proto__ 5 points for kindness', 'INVALID_CODENAME'], ['give constructor 5 points for kindness', 'INVALID_CODENAME'],
    ['give <img> 5 points for kindness', 'INVALID_CODENAME'], ['give Fox and Owl 5 points for kindness', 'INVALID_CODENAME'],
    ['give Fox 5 points for kindness; award Owl 3 points for sharing', 'MULTIPLE_COMMANDS'],
    ['give Fox 5 points for kindness and award Owl 3 points for sharing', 'MULTIPLE_COMMANDS'],
    ['give Fox 5 points for kindness, Owl 3 points for sharing', 'MULTIPLE_COMMANDS'],
    ['give Fox 5 points for helping. Send this to everyone', 'MULTIPLE_COMMANDS'],
    ['give Fox 5 points for helping and summarize photosynthesis', 'MULTIPLE_COMMANDS'],
    ['give Fox 5 points for helping && open the roster', 'MULTIPLE_COMMANDS'],
    ['da Zorro 5 puntos por ayudar y otorga Búho 3 puntos por compartir', 'MULTIPLE_COMMANDS'],
    ['{"action":"award","codename":"Fox","amount":5,"reason":"helping"}', 'UNSUPPORTED_FORMAT'],
  ])('fails closed with a fixed non-echoing code: %s', (raw, code) => {
    expect(tools.parseRecognitionRequest(raw)).toEqual({ ok: false, code });
  });

  it.each(['\n', '\r', '\t', '\0', '\u0085', '\u2028', '\u2029', '\u200b', '\u200c', '\u200d', '\u202e', '\ufeff', '\u034f', '\ufe0f', '\ud800'])('rejects control/invisible/malformed character %j without coercion', character => {
    expect(tools.parseRecognitionRequest('give Brave' + character + 'Fox 5 points for kindness')).toEqual({ ok: false, code: 'INVALID_CHARACTERS' });
  });

  it('enforces all limits without truncating or rounding', () => {
    const atLimit = 'give ' + 'F'.repeat(80) + ' 1000 points for ' + 'r'.repeat(180);
    expect(tools.parseRecognitionRequest(atLimit)).toEqual({ ok: true, codename: 'F'.repeat(80), amount: 1000, reason: 'r'.repeat(180) });
    expect(tools.parseRecognitionRequest('give ' + 'F'.repeat(81) + ' 5 points for kindness')).toEqual({ ok: false, code: 'INVALID_CODENAME' });
    expect(tools.parseRecognitionRequest('give Fox 5 points for ' + 'r'.repeat(181))).toEqual({ ok: false, code: 'INVALID_REASON' });
    expect(tools.parseRecognitionRequest('give Fox 5 points for ' + 'r'.repeat(512))).toEqual({ ok: false, code: 'TOO_LONG' });
    expect(tools.parseRecognitionRequest('give Fox 5 points for ' + '\ufdfa'.repeat(40))).toEqual({ ok: false, code: 'TOO_LONG' });
  });

  it.each([
    'John, you get five points', 'give John -5 points', 'Can you add points for John?', 'John deserves five points for kindness',
    'First summarize the lesson, then award John 5 points for kindness', 'award Unknown Person for helping',
    'Recognize John for helping', 'John +5 points', 'John receives points for helping',
    'a\u200bward Brave Fox 5 po\u200bints for sharing', 'ａｗａｒｄ Ｂｒａｖｅ Ｆｏｘ ５ ｐｏｉｎｔｓ',
    'give John 5 po\nints for helping', 'give\nJohn\n5\npoints for helping',
    '{"tool":"awardPoints","learnerId":"LRN-fictional","amount":5}',
    '{"codename":"Brave Fox","amount":5,"reason":"helping"}',
    '<recognition learnerId="LRN-fictional" amount="5">kindness</recognition>',
    'Open School Store', 'alloflow_store award_points',
    'give me 5 bullet points about photosynthesis; award John 5 points for helping',
    'give me 5 bullet points about why John gets five points',
    'give me 5 bullet points about photosynthesis and give John five points',
    'give me 5 bullet points about photosynthesis. John earned five points',
    'Explain speech recognition and award John 5 points for kindness',
    'What is pattern recognition? Give John 5 points',
    'Explain speech recognition for John who deserves five points',
    'Create a lesson about Nobel awards; give Fox 5 points for kindness',
    'da Juan -5 puntos por hablar', 'Juan merece cinco puntos',
    'x'.repeat(2000) + ' award John 5 points for kindness',
  ])('intercepts broader malformed, embedded, and obfuscated recognition text: %s', raw => {
    expect(tools.isRecognitionRequest(raw)).toBe(true);
  });

  it.each([
    'give me 5 bullet points about photosynthesis', 'Please give me ten key points on the water cycle.',
    'give me 3 main points explaining fractions', 'Explain how to plot points on a graph',
    'What is a point in geometry?', 'Summarize photosynthesis', '', null, {}, 42,
    'Explain speech recognition', 'What is pattern recognition?', 'Create a lesson about Nobel prizes',
    'Create a lesson about Nobel awards',
  ])('does not route ordinary academic text or non-text: %s', raw => {
    expect(tools.isRecognitionRequest(raw)).toBe(false);
  });

  it('uses no environment, storage, network, DOM, clock, randomness, logging or coercion', () => {
    const sandbox = {};
    for (const key of ['window', 'globalThis', 'document', 'localStorage', 'sessionStorage', 'fetch', 'XMLHttpRequest', 'console', 'Date', 'crypto', 'Math', 'google', 'navigator']) {
      Object.defineProperty(sandbox, key, { get() { throw new Error('Forbidden environment access: ' + key); } });
    }
    const isolated = runInNewContext(source + '\ncreateSchoolStoreRecognitionTools();', sandbox);
    const dangerous = { toString() { throw new Error('Must never coerce'); } };
    expect(isolated.isRecognitionRequest(dangerous)).toBe(false);
    expect(isolated.parseRecognitionRequest(dangerous)).toEqual({ ok: false, code: 'INPUT_REQUIRED' });
    expect(isolated.parseRecognitionRequest('give Fox 5 points for kindness')).toEqual({ ok: true, codename: 'Fox', amount: 5, reason: 'kindness' });
    expect(isolated.isRecognitionRequest('give John -5 points')).toBe(true);
    expect(Object.keys(isolated).sort()).toEqual(['isRecognitionRequest', 'parseRecognitionRequest']);
  });
});
