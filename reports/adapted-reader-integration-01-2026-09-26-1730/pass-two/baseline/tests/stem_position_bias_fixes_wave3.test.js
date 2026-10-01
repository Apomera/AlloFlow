import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// Distribution tests for the third wave of answer-position-bias fixes:
// renewables, swimlab, learning_lab, and pets — surfaced by the scanner's
// `choices:`-key rescan. Source-extraction throughout. (geometryworld,
// the worst bank at 99% slot 1, is the concurrent session's in-flight
// fix — gwRotateQuestionTree — and carries its own coverage.)

const read = (p) => fs.readFileSync('stem_lab/' + p, 'utf8');
const alloTStub = (key, fallback) => fallback;

function extract(src, startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')(alloTStub);
}

function extractArray(src, marker, name) {
  const start = src.indexOf(marker);
  expect(start, marker).toBeGreaterThan(-1);
  const end = src.indexOf('];', start);
  // eslint-disable-next-line no-new-func
  return new Function('__alloT', src.slice(start, end + 2) + '\nreturn ' + name + ';')(alloTStub);
}

// Run a tool's own rotation IIFE (located by its unique comment) against a
// bank array, mutating it the way the module does at load.
function applyRotation(src, commentMarker, bankName, bank) {
  const start = src.indexOf(commentMarker);
  expect(start, commentMarker).toBeGreaterThan(-1);
  const end = src.indexOf('})();', start);
  expect(end, commentMarker + ' IIFE close').toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  new Function(bankName, src.slice(start, end + 5))(bank);
  return bank;
}

function slotCounts(questions, getIdx) {
  const counts = [0, 0, 0, 0];
  for (const q of questions) counts[getIdx(q)]++;
  return counts;
}

function assertSpread(counts, total, label, maxShare) {
  const used = counts.filter((c) => c > 0).length;
  expect(used, label + ' distinct slots (' + counts.join('/') + ')').toBeGreaterThanOrEqual(3);
  expect(Math.max(...counts) / total, label + ' max share (' + counts.join('/') + ')').toBeLessThanOrEqual(maxShare || 0.5);
}

// Deep-copy question banks so raw stays authored while processed rotates.
const clone = (v) => JSON.parse(JSON.stringify(v));

describe('renewables quiz (was 1/13/4/0)', () => {
  const src = read('stem_tool_renewables.js');
  const raw = extractArray(src, 'var QUIZ = [', 'QUIZ');
  const processed = applyRotation(src, '// The authored bank put 72%', 'QUIZ', clone(raw));

  it('answers preserved and spread', () => {
    raw.forEach((q, qi) => {
      expect(processed[qi].choices[processed[qi].correct], q.id || 'Q' + qi).toBe(q.choices[q.correct]);
    });
    assertSpread(slotCounts(processed, (q) => q.correct), processed.length, 'renewables', 0.5);
  });
});

describe('learning_lab quiz (was 2/54/5/3)', () => {
  const src = read('stem_tool_learning_lab.js');
  const raw = extractArray(src, 'var QUIZ = [', 'QUIZ');
  const processed = applyRotation(src, '// The authored bank put 84%', 'QUIZ', clone(raw));

  it('answers preserved and spread', () => {
    expect(raw.length).toBeGreaterThanOrEqual(40);
    raw.forEach((q, qi) => {
      expect(processed[qi].choices[processed[qi].correct], q.id || 'Q' + qi).toBe(q.choices[q.correct]);
    });
    assertSpread(slotCounts(processed, (q) => q.correct), processed.length, 'learning_lab');
  });
});

describe('pets quiz (was 0/11/4/0)', () => {
  const src = read('stem_tool_pets.js');
  const raw = extractArray(src, 'var QUIZ = [', 'QUIZ');
  const processed = applyRotation(src, '// The authored bank put 73%', 'QUIZ', clone(raw));

  it('answers preserved and spread', () => {
    expect(raw.length).toBeGreaterThanOrEqual(12);
    raw.forEach((q, qi) => {
      expect(processed[qi].choices[processed[qi].correct], q.id || 'Q' + qi).toBe(q.choices[q.correct]);
    });
    assertSpread(slotCounts(processed, (q) => q.correct), processed.length, 'pets');
  });
});

describe('swimlab scenario cards (was 0/17/1/0)', () => {
  const src = read('stem_tool_swimlab.js');

  // Parse every inline scenarioCard('mod', idx, {...}) config with a
  // balanced-brace scan, then replicate the card-key hash rotation the
  // renderer applies, and measure what students actually see.
  function parseScenarioCalls() {
    const calls = [];
    const re = /scenarioCard\('([A-Za-z0-9_]+)',\s*(\d+),\s*\{/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const openIdx = re.lastIndex - 1;
      let depth = 0;
      let i = openIdx;
      for (; i < src.length; i++) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') { depth--; if (depth === 0) break; }
      }
      const objText = src.slice(openIdx, i + 1);
      // eslint-disable-next-line no-new-func
      const cfg = new Function('__alloT', 'h', 'T', 'return (' + objText + ');')(alloTStub, () => null, {});
      if (cfg && Array.isArray(cfg.choices) && typeof cfg.correct === 'number') {
        calls.push({ key: m[1] + '-scn-' + m[2], cfg });
      }
    }
    return calls;
  }

  function rotatedSlot(key, cfg) {
    const n = cfg.choices.length;
    let seed = 0;
    for (let si = 0; si < key.length; si++) seed = (seed * 31 + key.charCodeAt(si)) % 997;
    const shift = ((seed * 7) + 3) % n;
    return (cfg.correct + shift) % n;
  }

  it('every inline scenario parses, and the card-key rotation spreads the slots', () => {
    const calls = parseScenarioCalls();
    expect(calls.length).toBeGreaterThanOrEqual(12);
    const counts = [0, 0, 0, 0];
    for (const { key, cfg } of calls) counts[rotatedSlot(key, cfg)]++;
    assertSpread(counts, calls.length, 'swimlab', 0.6);
  });

  it('the renderer applies exactly this rotation (regression pins)', () => {
    expect(src).toContain("_seed = (_seed * 31 + key.charCodeAt(_si)) % 997;");
    expect(src).toContain('correct: (scenario.correct + _shift) % _n');
  });
});

describe('deployment copies', () => {
  for (const name of ['geometryworld', 'renewables', 'swimlab', 'learning_lab', 'pets']) {
    it(name + ' public mirror is byte-identical to the root copy', () => {
      expect(fs.readFileSync('desktop/web-app/public/stem_lab/stem_tool_' + name + '.js', 'utf8'))
        .toBe(read('stem_tool_' + name + '.js'));
    });
  }
});
