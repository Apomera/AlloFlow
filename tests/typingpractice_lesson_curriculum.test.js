import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Curriculum invariants for the Typing Practice lesson path (SECTION 2d of
// stem_lab/stem_tool_typingpractice.js): every generated text uses only the
// keys a lesson allows, lessons build up in order, and tier drills / one-hand
// drills draw from the same generator.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function loadLessonCore() {
  const kbStart = source.indexOf('  var KB_LAYOUT = [');
  const kb = source.slice(kbStart, source.indexOf('];', kbStart) + 2);
  const start = source.indexOf('  // SECTION 2d: LESSON PATH');
  const end = source.indexOf('  // SECTION 2c: AUDIO CUES');
  if (kbStart < 0 || start < 0 || end < start) throw new Error('Lesson section not found');
  const body = source.slice(start, end);
  const names = [...body.matchAll(/^  (?:function|var) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1]);
  return Function(
    '__alloTPT',
    kb + '\n' + body + '\nreturn { KB_LAYOUT: KB_LAYOUT, ' + names.map((n) => n + ': ' + n).join(', ') + ' };'
  )((key, fallback) => fallback);
}

const core = loadLessonCore();
const LESSONS = core.TYPING_PRACTICE_LESSONS;
const TIER_ORDER = /var TIER_ORDER = \[([^\]]*)\]/.exec(source)[1].split(',').map((s) => s.trim().replace(/'/g, ''));
const LENGTHS = ['short', 'medium', 'long', null];

function outOfSet(text, keys) {
  return core.typingPracticeCheckTextKeys(text, keys).bad;
}

describe('Typing Practice lesson curriculum', () => {
  it('defines 20-25 ordered lessons that start on the home row and map onto the mastery tiers', () => {
    expect(LESSONS.length).toBeGreaterThanOrEqual(20);
    expect(LESSONS.length).toBeLessThanOrEqual(25);
    expect(LESSONS[0].newKeys).toEqual(['f', 'j']);
    let previousTier = 0;
    LESSONS.forEach((lesson) => {
      expect(TIER_ORDER.indexOf(lesson.tierId)).toBe(lesson.tier);
      expect(lesson.tier).toBeGreaterThanOrEqual(previousTier);
      previousTier = lesson.tier;
    });
    TIER_ORDER.filter((id) => id !== 'passage').forEach((tierId) => {
      expect(core.typingPracticeLessonsForTier(tierId).length).toBeGreaterThan(0);
    });
  });

  it('adds keys cumulatively, one or two letters at a time, each with a finger and guidance', () => {
    const cumulative = [];
    LESSONS.forEach((lesson) => {
      lesson.newKeys.forEach((k) => { if (!cumulative.includes(k)) cumulative.push(k); });
      expect(lesson.allowedKeys).toEqual(cumulative);
      if (/^[a-z;]+$/.test(lesson.newKeys.join(''))) expect(lesson.newKeys.length).toBeLessThanOrEqual(2);
      lesson.newKeys.forEach((k) => expect(lesson.fingers[k]).toMatch(/^(L|R)[PRMI]$/));
      expect(lesson.pos.every((p) => Array.isArray(p) && p.length === 2)).toBe(true);
      expect(lesson.intro.length).toBeGreaterThan(20);
      expect(lesson.steps[lesson.steps.length - 1]).toBe('sentence');
    });
    const finalKeys = LESSONS[LESSONS.length - 1].allowedKeys;
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;?!:()-@#%&\'"'.split('').forEach((k) => {
      expect(finalKeys).toContain(k);
    });
  });

  it('never generates a key outside the lesson set, for every lesson, step, length and many seeds', () => {
    const bad = [];
    for (let seed = 0; seed < 40; seed += 1) {
      LESSONS.forEach((lesson) => {
        LENGTHS.forEach((len) => {
          const run = core.typingPracticeLessonRunText(lesson, seed, len);
          if (!run || outOfSet(run, lesson.allowedKeys).length) bad.push([lesson.id, 'run', len, seed, run]);
          lesson.steps.forEach((step) => {
            const text = core.typingPracticeLessonStepText(lesson, step, seed, len || undefined);
            if (!text || outOfSet(text, lesson.allowedKeys).length) bad.push([lesson.id, step, len, seed, text]);
          });
        });
      });
    }
    expect(bad).toEqual([]);
    expect(core.typingPracticeGenerateLessonText.safetyNetUses || 0).toBe(0);
  });

  it('keeps tier drills inside their tier and one-hand drills inside one hand', () => {
    const bad = [];
    for (let seed = 0; seed < 40; seed += 1) {
      TIER_ORDER.filter((id) => id !== 'passage').forEach((tierId) => {
        const lessons = core.typingPracticeLessonsForTier(tierId);
        LENGTHS.forEach((len) => {
          const text = core.typingPracticeTierText(tierId, seed, len);
          if (!text || outOfSet(text, lessons[lessons.length - 1].allowedKeys).length) bad.push([tierId, len, seed, text]);
        });
      });
      LENGTHS.forEach((len) => {
        const left = core.typingPracticeOneHandText('left', seed, len);
        const right = core.typingPracticeOneHandText('right', seed, len);
        if (outOfSet(left, 'qwertasdfgzxcvb').length) bad.push(['left', len, seed, left]);
        if (outOfSet(right, 'yuiophjklnm;,.').length) bad.push(['right', len, seed, right]);
      });
    }
    expect(bad).toEqual([]);
  });

  it('home row stays on the home row and the Top Row tier never reaches the bottom row', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      expect(core.typingPracticeTierText('home-row', seed, 'medium')).toMatch(/^[asdfghjkl; ]+$/);
      expect(core.typingPracticeTierText('top-row', seed, 'medium')).not.toMatch(/[zxcvbnm,./]/);
    }
  });

  it('is deterministic per seed so a retry repeats the same text', () => {
    LESSONS.forEach((lesson) => {
      expect(core.typingPracticeLessonRunText(lesson, 7, null)).toBe(core.typingPracticeLessonRunText(lesson, 7, null));
    });
    const texts = new Set();
    for (let seed = 0; seed < 20; seed += 1) texts.add(core.typingPracticeTierText('bottom-row', seed, null));
    expect(texts.size).toBeGreaterThanOrEqual(18);
  });

  it('honours the sample length setting: short 3-5 words, standard 40-64, long 120-180 characters', () => {
    const lesson = core.typingPracticeLessonById('lesson-all-letters');
    for (let seed = 0; seed < 40; seed += 1) {
      const allowed = lesson.allowedKeys;
      const short = core.typingPracticeGenerateLessonText({ allowedKeys: allowed, seed, length: 'short' });
      const medium = core.typingPracticeGenerateLessonText({ allowedKeys: allowed, seed, length: 'medium' });
      const long = core.typingPracticeGenerateLessonText({ allowedKeys: allowed, seed, length: 'long' });
      expect(short.split(' ').length).toBeGreaterThanOrEqual(3);
      expect(short.split(' ').length).toBeLessThanOrEqual(5);
      expect(medium.length).toBeGreaterThanOrEqual(40);
      expect(medium.length).toBeLessThanOrEqual(64);
      expect(long.length).toBeGreaterThanOrEqual(120);
      expect(long.length).toBeLessThanOrEqual(180);
    }
  });

  it('weights the new keys: most words in a lesson words step use a new key', () => {
    LESSONS.filter((l) => /^[a-z]+$/.test(l.newKeys.join('')) && l.newKeys.length).forEach((lesson) => {
      let tokens = 0;
      let hits = 0;
      for (let seed = 0; seed < 30; seed += 1) {
        core.typingPracticeLessonStepText(lesson, 'words', seed, 'medium').split(' ').forEach((t) => {
          tokens += 1;
          if (lesson.newKeys.some((k) => t.includes(k))) hits += 1;
        });
      }
      expect(hits / tokens).toBeGreaterThanOrEqual(0.55);
    });
  });

  it('uses real words from the embedded vetted list once enough letters are known', () => {
    const words = new Set(core.TYPING_PRACTICE_WORDS);
    expect(words.size).toBeGreaterThan(2900);
    expect(core.TYPING_PRACTICE_WORDS.every((w) => /^[a-z]+$/.test(w) && (w.length > 1 || w === 'a'))).toBe(true);
    expect(source).toContain('  // Words: word_sounds_wordlist_en.js');
    LESSONS.slice(5).forEach((lesson) => {
      for (let seed = 0; seed < 10; seed += 1) {
        core.typingPracticeLessonStepText(lesson, 'sentence', seed).split(/[^A-Za-z]+/).filter(Boolean).forEach((w) => {
          expect(words.has(w.toLowerCase())).toBe(true);
        });
      }
    });
  });

  it('never repeats the same word twice in a row', () => {
    LESSONS.forEach((lesson) => {
      for (let seed = 0; seed < 20; seed += 1) {
        const tokens = core.typingPracticeLessonRunText(lesson, seed, 'long').split(' ').map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
        for (let i = 1; i < tokens.length; i += 1) {
          if (tokens[i]) expect(tokens[i]).not.toBe(tokens[i - 1]);
        }
      }
    });
  });

  it('replaces the fixed sample pools with generated text in the drill catalog', () => {
    const catalog = source.slice(source.indexOf('  var DRILLS = {'), source.indexOf('  var TIER_ORDER = ['));
    expect(catalog).not.toMatch(/samples: \[/);
    expect(catalog).toContain("'lesson': {");
    expect(source).toContain('function typingPracticeDrillText(state, drill)');
    expect(source).not.toContain('function buildFocusedPracticeText(');
  });

  it('opens lessons by tier and tracks the next lesson and the keys a student has met', () => {
    expect(core.typingPracticeNextLesson(0, []).id).toBe('lesson-fj');
    expect(core.typingPracticeNextLesson(0, ['lesson-fj']).id).toBe('lesson-dk');
    expect(core.typingPracticeNextLesson(1, []).id).toBe('lesson-ei');
    const homeRowIds = core.typingPracticeLessonsForTier('home-row').map((l) => l.id);
    expect(core.typingPracticeNextLesson(0, homeRowIds)).toBeNull();
    expect(core.typingPracticeUnlockedKeys(0, []).join('')).toBe('fj');
    expect(core.typingPracticeUnlockedKeys(1, []).join('')).toBe('fjdksla;ghei');
    // An older save that practised the current tier drill opens that tier's keys.
    const unlocked = core.typingPracticeStateUnlockedKeys({ masteryLevel: 0, sessions: [{ drillId: 'home-row' }] });
    expect(unlocked.join('')).toBe('fjdksla;gh');
    expect(core.typingPracticeActiveLesson({ masteryLevel: 0, currentLesson: 'lesson-ei' }).id).toBe('lesson-fj');
    expect(core.typingPracticeActiveLesson({ masteryLevel: 1, currentLesson: 'lesson-ei' }).id).toBe('lesson-ei');
    expect(core.typingPracticeNormalizeLessonsDone(JSON.parse('{"lesson-fj":{"date":"d","accuracy":140},"nope":{},"__proto__":{"x":1}}')))
      .toEqual({ 'lesson-fj': { date: 'd', accuracy: 100 } });
  });
});

describe('Typing Practice lesson screens render', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterAll(() => {
    vi.useRealTimers();
  });
  beforeEach(() => resetStemLab());

  const render = (state) => {
    loadTool('stem_lab/stem_tool_typingpractice.js', 'typingPractice');
    return renderTool('typingPractice', { typingPractice: state });
  };

  it('renders the lesson path grouped by tier with start buttons for open lessons', () => {
    const html = render({ view: 'lessons', masteryLevel: 1, lessonsDone: { 'lesson-fj': { date: '2025-12-30T10:00:00.000Z', accuracy: 96 } } });
    expect(html).toContain('Lesson path');
    expect(html).toContain('F and J');
    expect(html).toContain('Practice again');
    expect(html).toContain('Suggested next');
    expect(html).toContain('Start lesson');
    expect(html).toContain('Tier check');
  });

  it('introduces a lesson with its new keys, fingers and the keyboard highlight', () => {
    const html = render({ view: 'drill-intro', currentDrill: 'lesson', currentLesson: 'lesson-dk', drillRunId: 3 });
    expect(html).toContain('New keys and the finger for each');
    expect(html).toContain('left middle finger');
    expect(html).toContain('right middle finger');
    expect(html).toContain('The new keys are highlighted in their finger colors.');
  });

  it('explains which keys Focused Practice is built around', () => {
    let keyStats = null;
    for (let i = 0; i < 3; i += 1) {
      keyStats = core.typingPracticeUpdateKeyStats(keyStats, {
        text: 'q z q z q z q z q z e t a o', typedLength: 27, now: Date.UTC(2025, 11, 31, 12) + i * 1000,
        mistakes: [0, 2, 4, 6, 8, 1, 3].map((index) => ({ index, expected: 'x', actual: 'x' }))
      });
    }
    const html = render({ view: 'drill-intro', currentDrill: 'focus-errors', masteryLevel: 3, keyStats, drillRunId: 2 });
    expect(html).toContain('Built around keys you are still learning');
    expect(html).toMatch(/Q, Z|Z, Q/);
  });

  it('suggests the first lesson to a new student and shows the Lesson path button', () => {
    const html = render({});
    expect(html).toContain('Lesson: F and J');
    expect(html).toContain('Lesson path');
  });
});
