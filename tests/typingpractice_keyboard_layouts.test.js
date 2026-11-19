import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Keyboard layouts in Typing Practice (SECTION 2b physical model, SECTION 2d
// layout lessons, one-hand track, keyboard fade, layout detection, posture):
// lessons follow each layout's key positions and fingers, every character a
// layout can type has a key guide with the Shift on the other hand, one-hand
// lessons stay on one hand, fade rules are reversible, and detection only
// suggests. Everything runs through the tool's real functions.
const source = fs.readFileSync(path.join(process.cwd(), 'stem_lab/stem_tool_typingpractice.js'), 'utf8');

function extractFunction(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < source.length; i += 1) {
    const char = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error('Unterminated function: ' + name);
}

function loadKeyboardCore() {
  const start = source.indexOf('  // SECTION 2b: KEYBOARD LAYOUT');
  const end = source.indexOf('  // SECTION 2c: AUDIO CUES');
  if (start < 0 || end < start) throw new Error('Keyboard sections not found');
  const body = source.slice(start, end);
  const extra = ['fingerLabel', 'typingPracticeKeyName', 'typingPracticeNormalizeText', 'typingPracticeGraphemes',
    'typingPracticeTargetCue', 'typingPracticeMistakeFingerCue', 'analyzeErrorPatterns', 'typingPracticeApplyStickyShift']
    .map((n) => extractFunction(n)).join('\n');
  const names = [...(body + '\n' + extra).matchAll(/^  (?:function|var) ([A-Za-z_][A-Za-z0-9_]*)/gm)].map((m) => m[1])
    .concat(['fingerLabel', 'typingPracticeKeyName', 'typingPracticeTargetCue', 'typingPracticeMistakeFingerCue', 'analyzeErrorPatterns', 'typingPracticeApplyStickyShift']);
  const unique = [...new Set(names)];
  return Function('__alloTPT', body + '\n' + extra + '\nreturn { ' + unique.map((n) => n + ': ' + n).join(', ') + ' };')((key, fallback) => fallback);
}

const core = loadKeyboardCore();
const LAYOUTS = core.KEYBOARD_LAYOUTS;
const IDS = Object.keys(LAYOUTS);
const LENGTHS = ['short', 'medium', 'long', null];
const POSITION_TIERS = ['home-row', 'top-row', 'bottom-row'];
const guide = (ch, id, hand) => core.typingPracticeKeyGuide(ch, id, hand ? { hand } : null);

function letterKeys(id) {
  const out = [];
  LAYOUTS[id].rows.slice(0, 4).forEach((row) => row.forEach((k) => { if (core.typingPracticeIsLowerLetter(k.k)) out.push(k.k); }));
  return out;
}

describe('Typing Practice keyboard model', () => {
  it('offers seven layouts, including the Windows one-handed Dvorak layouts', () => {
    expect(IDS).toEqual(['qwerty-us', 'qwertz-de', 'azerty-fr', 'dvorak', 'colemak', 'dvorak-left', 'dvorak-right']);
    expect(LAYOUTS['dvorak-left'].oneHand).toBe('left');
    expect(LAYOUTS['dvorak-right'].oneHand).toBe('right');
  });

  it('builds US QWERTY with the same keys and fingers as KB_LAYOUT (plus backslash)', () => {
    const us = LAYOUTS['qwerty-us'];
    core.KB_LAYOUT.forEach((row, r) => row.forEach((key, c) => {
      expect(us.rows[r][c].k).toBe(key.k);
      expect(us.rows[r][c].f).toBe(key.f);
    }));
    expect(us.rows[1][12].k).toBe('\\');
    const a = core.typingPracticeKeyPositions(core.KB_LAYOUT);
    const b = core.typingPracticeKeyPositions(us.rows);
    Object.keys(a).forEach((k) => expect([k, b[k].x, b[k].row, b[k].f]).toEqual([k, a[k].x, a[k].row, a[k].f]));
  });

  it('uses touch-typing fingers and home keys that match the real layouts', () => {
    expect(LAYOUTS.dvorak.home).toEqual(['a', 'o', 'e', 'u', 'h', 't', 'n', 's']);
    expect(LAYOUTS.colemak.home).toEqual(['a', 'r', 's', 't', 'n', 'e', 'i', 'o']);
    expect(LAYOUTS.dvorak.bumps).toEqual(['u', 'h']);
    expect(guide('c', 'dvorak').f).toBe('RM');
    expect(guide('z', 'dvorak').f).toBe('RP');
    expect(guide('o', 'colemak').code).toBe('Semicolon');
    expect(guide('z', 'qwertz-de').code).toBe('KeyY');
    expect(guide('#', 'qwertz-de').code).toBe('Backslash');
    expect(guide('m', 'azerty-fr').code).toBe('Semicolon');
    // One-handed Dvorak: index finger on E, pinky on D.
    expect([guide('e', 'dvorak-left').f, guide('d', 'dvorak-left').f]).toEqual(['LI', 'LP']);
    expect([guide('e', 'dvorak-right').f, guide('d', 'dvorak-right').f]).toEqual(['RI', 'RP']);
  });
});

describe('Typing Practice Shift and symbol guides', () => {
  it('guides every character each layout can type, with Shift on the other hand', () => {
    const problems = [];
    IDS.forEach((id) => {
      const layout = LAYOUTS[id];
      core.typingPracticeLayoutChars(id).forEach((ch) => {
        const g = guide(ch, id);
        if (!g) { problems.push([id, ch, 'no guide']); return; }
        if (g.shift && !layout.oneHand && !((g.hand === 'L' && g.shift === 'right') || (g.hand === 'R' && g.shift === 'left'))) problems.push([id, ch, 'shift side']);
        if (g.shift && layout.oneHand && !(g.shift === layout.oneHand && g.stickyAdvised)) problems.push([id, ch, 'one-hand shift']);
        const meta = core.findKeyMeta(ch, id);
        if (!meta || !layout.rows.some((row) => row.some((k) => k.k === meta.k))) problems.push([id, ch, 'key not drawn']);
        if (core.typingPracticeGuideSentence(g).length < 10) problems.push([id, ch, 'no sentence']);
      });
      for (let c = 32; c < 127; c += 1) if (!guide(String.fromCharCode(c), id)) problems.push([id, String.fromCharCode(c), 'ASCII missing']);
    });
    expect(problems).toEqual([]);
  });

  it('knows the real Shift and AltGr keys of each layout', () => {
    expect(guide('!', 'qwerty-us')).toMatchObject({ code: 'Digit1', shift: 'right', k: '1' });
    expect(guide('?', 'qwerty-us')).toMatchObject({ code: 'Slash', shift: 'left' });
    expect(guide('A', 'qwerty-us')).toMatchObject({ k: 'a', shift: 'right' });
    expect(guide('"', 'qwertz-de')).toMatchObject({ code: 'Digit2', shift: 'right' });
    expect(guide('@', 'qwertz-de')).toMatchObject({ code: 'KeyQ', altGr: true });
    expect(guide('?', 'qwertz-de')).toMatchObject({ code: 'Minus', shift: 'left' });
    expect(guide('1', 'azerty-fr')).toMatchObject({ code: 'Digit1', shift: 'right' });
    expect(guide('@', 'azerty-fr')).toMatchObject({ code: 'Digit0', altGr: true });
    expect(guide('^', 'azerty-fr')).toMatchObject({ altGr: true, dead: false });
    expect(guide('É', 'azerty-fr')).toBeNull();
  });

  it('findKeyMeta keeps case and uses the layout; cues name the Shift side', () => {
    expect(core.findKeyMeta('A', 'qwerty-us')).toMatchObject({ k: 'a', f: 'LP', shift: 'right', ch: 'A' });
    expect(core.findKeyMeta('!', 'qwerty-us')).toMatchObject({ k: '1', shift: 'right' });
    expect(core.findKeyMeta('f', 'dvorak')).toMatchObject({ k: 'f', f: 'RI', code: 'KeyY' });
    expect(core.typingPracticeTargetCue('Hi', 0, 'qwerty-us')).toBe('Next key: H. Character 1 of 2. Use your right index finger. Hold the left Shift with your left pinky.');
    expect(core.typingPracticeTargetCue('ui', 0, 'dvorak')).toBe('Next key: U. Character 1 of 2. Use your left index finger.');
    expect(core.typingPracticeTargetCue('a', 0)).toBe('Next key: A. Character 1 of 1. Use your left pinky.');
    expect(core.typingPracticeMistakeFingerCue({ expected: '@', attempt: 3, advanced: false, layoutId: 'qwerty-us' }))
      .toBe(' Finger guide: use your left ring finger. Hold the right Shift with your right pinky.');
    expect(core.typingPracticeMistakeFingerCue({ expected: 'f', attempt: 3, advanced: false, layoutId: 'dvorak' }))
      .toBe(' Finger guide: use your right index finger.');
  });

  it('applies Sticky Shift as the real layout does', () => {
    const ss = core.typingPracticeApplyStickyShift;
    expect([ss('a', 'qwerty-us'), ss('1', 'qwerty-us'), ss(';', 'dvorak'), ss(' ', 'qwerty-us')]).toEqual(['A', '!', ':', ' ']);
    expect([ss('&', 'azerty-fr'), ss('é', 'azerty-fr'), ss('1', 'azerty-fr')]).toEqual(['1', '2', '1']);
    expect([ss('7', 'qwertz-de'), ss('ü', 'qwertz-de'), ss('#', 'qwertz-de')]).toEqual(['/', 'Ü', "'"]);
  });
});

describe('Typing Practice layout-aware lessons', () => {
  it('keeps US QWERTY lessons exactly as they were', () => {
    expect(core.typingPracticeLessonsForLayout('qwerty-us')).toBe(core.TYPING_PRACTICE_LESSONS);
    expect(core.typingPracticeLessonsForLayout()).toBe(core.TYPING_PRACTICE_LESSONS);
  });

  it('teaches each layout\'s keys in the same positions with the same fingers, using only that layout\'s keys', () => {
    const problems = [];
    IDS.filter((id) => !LAYOUTS[id].oneHand).forEach((id) => {
      const layout = LAYOUTS[id];
      const typeable = new Set(core.typingPracticeLayoutChars(id));
      const lessons = core.typingPracticeLessonsForLayout(id);
      expect(lessons.map((l) => l.id)).toEqual(core.TYPING_PRACTICE_LESSONS.map((l) => l.id));
      lessons.forEach((lesson, i) => {
        const us = core.TYPING_PRACTICE_LESSONS[i];
        lesson.allowedKeys.forEach((k) => { if (!typeable.has(k)) problems.push([id, lesson.id, 'untypeable ' + k]); });
        if (POSITION_TIERS.includes(lesson.tierId)) {
          if (!lesson.newKeys.length) problems.push([id, lesson.id, 'empty']);
          us.newKeys.forEach((usKey) => {
            const usGuide = guide(usKey, 'qwerty-us');
            const here = layout.byCode[usGuide.code].base;
            if (!core.typingPracticeIsLowerLetter(here) && !";,.'-/".includes(here)) return;
            if (!lesson.newKeys.includes(here)) problems.push([id, lesson.id, 'position ' + usGuide.code]);
            if (guide(here, id).f !== usGuide.f) problems.push([id, lesson.id, 'finger ' + usGuide.code]);
          });
        }
        for (let seed = 0; seed < 6; seed += 1) {
          LENGTHS.forEach((len) => {
            const text = core.typingPracticeLessonRunText(lesson, seed, len);
            const check = core.typingPracticeCheckTextKeys(text, lesson.allowedKeys);
            if (!text || !check.ok) problems.push([id, lesson.id, seed, len, 'text keys ' + check.bad.join('')]);
          });
        }
      });
      const lastLetterLesson = lessons.filter((l) => POSITION_TIERS.includes(l.tierId)).pop();
      const untaught = letterKeys(id).filter((k) => !lastLetterLesson.allowedKeys.includes(k));
      if (untaught.length) problems.push([id, 'letters never taught', untaught.join('')]);
    });
    expect(problems).toEqual([]);
  });

  it('starts Dvorak on U and H, Colemak on T and N, and describes the keys on that layout', () => {
    const dvorak = core.typingPracticeLessonsForLayout('dvorak');
    expect(dvorak.slice(0, 5).map((l) => l.newKeys.join(''))).toEqual(['uh', 'et', 'on', 'as', 'id']);
    expect(core.typingPracticeLessonsForLayout('colemak')[0].newKeys).toEqual(['t', 'n']);
    expect(core.typingPracticeLessonName(dvorak[0])).toBe('U and H');
    expect(core.typingPracticeLessonIntro(dvorak[0])).toContain('Feel the small bumps on U and H.');
    expect(core.typingPracticeLessonIntro(dvorak[0])).toContain('Press U with your left index finger.');
    // German QWERTZ keeps the written US copy where it is still true.
    expect(core.typingPracticeLessonName(core.typingPracticeLessonsForLayout('qwertz-de')[0])).toBe('F and J');
    // AZERTY numbers need Shift, and the lesson records it.
    const azertyNumbers = core.typingPracticeLessonsForLayout('azerty-fr').find((l) => l.id === 'lesson-numbers-left');
    expect(azertyNumbers.shiftFor['1']).toBe('right');
  });

  it('uses the layout in tier text and in the keys a student has met', () => {
    for (let seed = 0; seed < 10; seed += 1) {
      expect(core.typingPracticeTierText('home-row', seed, 'medium', 'dvorak')).toMatch(/^[aoeuidhtns\- ]+$/);
      expect(core.typingPracticeTierText('home-row', seed, 'medium')).toMatch(/^[asdfghjkl; ]+$/);
    }
    expect(core.typingPracticeStateUnlockedKeys({ masteryLevel: 0, keyboardLayout: 'dvorak' }).join('')).toBe('uh');
    expect(core.typingPracticeStateUnlockedKeys({ masteryLevel: 0 }).join('')).toBe('fj');
    expect(core.typingPracticeActiveLesson({ masteryLevel: 0, keyboardLayout: 'colemak' })).toMatchObject({ id: 'lesson-fj', newKeys: ['t', 'n'] });
  });
});

describe('Typing Practice one-hand track', () => {
  it('teaches every letter with one hand, centre home first, only that hand\'s fingers', () => {
    const problems = [];
    IDS.forEach((id) => {
      const hands = LAYOUTS[id].oneHand ? [LAYOUTS[id].oneHand] : ['left', 'right'];
      hands.forEach((hand) => {
        const lessons = core.typingPracticeLessonsForLayout(id, hand);
        const typeable = new Set(core.typingPracticeLayoutChars(id));
        lessons.forEach((lesson) => {
          if (POSITION_TIERS.includes(lesson.tierId) && !lesson.newKeys.length) problems.push([id, hand, lesson.id, 'empty']);
          lesson.newKeys.forEach((k) => {
            const g = guide(k, id, hand);
            if (g.f.charAt(0) !== hand.charAt(0).toUpperCase()) problems.push([id, hand, lesson.id, k, g.f]);
            if (lesson.fingers[k] !== g.f) problems.push([id, hand, lesson.id, k, 'finger record']);
          });
          lesson.allowedKeys.forEach((k) => { if (!typeable.has(k)) problems.push([id, hand, lesson.id, 'untypeable ' + k]); });
          for (let seed = 0; seed < 4; seed += 1) {
            const text = core.typingPracticeLessonRunText(lesson, seed, null);
            if (!text || !core.typingPracticeCheckTextKeys(text, lesson.allowedKeys).ok) problems.push([id, hand, lesson.id, seed, text]);
          }
        });
        const last = lessons.filter((l) => POSITION_TIERS.includes(l.tierId)).pop();
        const untaught = letterKeys(id).filter((k) => !last.allowedKeys.includes(k));
        if (untaught.length) problems.push([id, hand, 'never taught', untaught.join('')]);
      });
    });
    expect(problems).toEqual([]);
    expect(core.typingPracticeLessonsForLayout('qwerty-us', 'left')[0].newKeys).toEqual(['f', 'j']);
    expect(core.typingPracticeLessonsForLayout('qwerty-us', 'right')[0].newKeys).toEqual(['g', 'k']);
    expect(core.typingPracticeLessonsForLayout('dvorak-left')[0].newKeys).toEqual(['d', 'e']);
  });

  it('keeps Shift on the typing hand, suggests Sticky Shift, and says when to slide the hand', () => {
    const g = guide('Q', 'qwerty-us', 'left');
    expect(g).toMatchObject({ f: 'LP', shift: 'left', stickyAdvised: true });
    expect(g.move).toBeLessThan(0);
    expect(core.typingPracticeGuideSentence(g)).toBe('Press Shift first (Sticky Shift makes this a single press). Press Q with your left pinky. Slide your hand left to reach it, then come back.');
    expect(guide('p', 'qwerty-us', 'right')).toMatchObject({ f: 'RP', move: 1 });
  });

  it('picks the next unfinished stage, honours a chosen stage, and keeps the classic drill', () => {
    const stage = (state, hand = 'left') => core.typingPracticeOneHandStage(state, hand);
    expect(stage({}).id).toBe('lesson-fj');
    expect(stage({ oneHandDone: { left: { 'lesson-fj': { date: 'd', accuracy: 95 } } } }).id).toBe('lesson-dk');
    expect(stage({ oneHandLesson: { left: 'lesson-ei' } }).id).toBe('lesson-ei');
    expect(stage({ oneHandLesson: { left: 'classic' } })).toBeNull();
    expect(core.typingPracticeOneHandClassicText({}, 'left', 3, null)).toBe(core.typingPracticeOneHandText('left', 3, null));
    for (let seed = 0; seed < 10; seed += 1) {
      const text = core.typingPracticeOneHandClassicText({ keyboardLayout: 'dvorak' }, 'left', seed, null);
      expect(core.typingPracticeCheckTextKeys(text, "',.pyaoeuiqjkx;").ok).toBe(true);
    }
  });

  it('normalises saved one-hand and layout fields', () => {
    const state = core.typingPracticeNormalizeLayoutFields({ keyboardLayout: 'nope' }, {
      oneHandLesson: { left: 'lesson-zz', right: 'classic' },
      oneHandDone: { left: { 'lesson-fj': { accuracy: 140 }, bogus: {} }, right: [] },
      layoutSuggestDismissed: ['dvorak', 'dvorak', 'nope', 5]
    });
    expect(state).toEqual({
      keyboardLayout: 'qwerty-us',
      oneHandLesson: { left: null, right: 'classic' },
      oneHandDone: { left: { 'lesson-fj': { date: '', accuracy: 100 } }, right: {} },
      layoutSuggestDismissed: ['dvorak']
    });
    expect(core.typingPracticeNormalizeLayoutFields({ keyboardLayout: 'dvorak-left' }, {}).keyboardLayout).toBe('dvorak-left');
  });
});

describe('Typing Practice keyboard fade', () => {
  const now = Date.UTC(2026, 10, 17);
  const day = 864e5;
  const stats = { keys: {
    a: { attempts: 200, errors: 2, ewmaErrRate: 0.01, lastSeen: now - day, box: 3, nextReviewAt: now + day },
    s: { attempts: 50, errors: 1, ewmaErrRate: 0.04, lastSeen: now - day, box: 1, nextReviewAt: 0 },
    d: { attempts: 200, errors: 40, ewmaErrRate: 0.2, lastSeen: now - day, box: 0, nextReviewAt: 0 },
    f: { attempts: 200, errors: 2, ewmaErrRate: 0.01, lastSeen: now - 40 * day, box: 3, nextReviewAt: 0 },
    g: { attempts: 10, errors: 0, ewmaErrRate: 0, lastSeen: now, box: 1, nextReviewAt: 0 }
  } };
  const level = (k, o) => core.typingPracticeFadeLevel(stats, k, Object.assign({ enabled: true, now }, o || {}));

  it('is off by default and dims, then hides, keys with sustained accuracy', () => {
    expect(core.typingPracticeFadeLevel(stats, 'a', { now })).toBe('full');
    expect([level('a'), level('s'), level('d'), level('g'), level(' ')]).toEqual(['hidden', 'dim', 'full', 'full', 'full']);
    expect(core.typingPracticeFadeSummary(stats, 'qwerty-us', { enabled: true, now })).toMatchObject({ dim: 1, hidden: 1 });
  });

  it('always comes back: stale keys, intro, new keys, stuck, show again, and new errors', () => {
    expect(level('f')).toBe('full');
    expect([level('a', { intro: true }), level('a', { newKeys: ['A'] }), level('a', { stuck: true }), level('a', { revealAll: true })]).toEqual(['full', 'full', 'full', 'full']);
    const worse = core.typingPracticeUpdateKeyStats(stats, {
      text: 'aaaaaaaaaa', typedLength: 10, now,
      mistakes: [0, 1, 2, 3, 4].map((index) => ({ index, expected: 'a', actual: 's' }))
    });
    expect(core.typingPracticeFadeLevel(worse, 'a', { enabled: true, now })).toBe('full');
  });
});

describe('Typing Practice layout detection', () => {
  function events(text, layoutId) {
    const layout = LAYOUTS[layoutId];
    return Array.from(text).map((ch) => {
      const hit = layout.byChar[ch];
      if (!hit || hit.layer === 'altgr') return null;
      return { code: hit.code, key: ch, shiftKey: hit.layer === 'shift', ctrlKey: false, altKey: false, metaKey: false };
    }).filter(Boolean).map(core.typingPracticeLayoutSample).filter(Boolean);
  }

  it('suggests the layout the keys match, and never the current one', () => {
    IDS.forEach((id) => {
      const samples = events('the quick brown fox jumps over the lazy dog', id);
      const other = id === 'qwerty-us' ? 'dvorak' : 'qwerty-us';
      expect([id, core.typingPracticeDetectLayout(samples, other).suggestion]).toEqual([id, id]);
      expect(core.typingPracticeDetectLayout(samples, id).suggestion).toBeNull();
    });
  });

  it('waits for enough evidence, tolerates Caps Lock, and ignores modifier presses', () => {
    expect(core.typingPracticeDetectLayout(events('as', 'colemak'), 'qwerty-us').suggestion).toBeNull();
    const capsLock = events('hello world quick', 'colemak').map((s) => Object.assign({}, s, { key: s.key.toUpperCase() }));
    expect(core.typingPracticeDetectLayout(capsLock, 'qwerty-us').suggestion).toBe('colemak');
    expect(core.typingPracticeLayoutSample({ code: 'KeyA', key: 'a', ctrlKey: true })).toBeNull();
    expect(core.typingPracticeLayoutSample({ code: 'ShiftLeft', key: 'Shift' })).toBeNull();
    expect(core.typingPracticeLayoutSample({ code: 'KeyA', key: 'Dead' })).toBeNull();
    const noise = [['KeyQ', 'x'], ['KeyW', 'y'], ['KeyE', 'z'], ['KeyR', 'k']].map(([code, key]) => ({ code, key, shift: false }));
    expect(core.typingPracticeDetectLayout(noise, 'qwerty-us').suggestion).toBeNull();
  });

  it('only suggests in the UI: switching needs a button press, and "Not now" is remembered', () => {
    expect(source).toContain('typingPracticeDetectLayout(layoutSamplesRef.current, state.keyboardLayout)');
    expect(source).toContain("__alloT('stem.typingpractice.layout_suggest_switch', 'Switch to {layout}')");
    expect(source).toContain("upd('layoutSuggestDismissed', (state.layoutSuggestDismissed || []).concat([suggested.id]).slice(-20))");
  });
});

describe('Typing Practice posture card and coaching', () => {
  it('names the layout\'s bump keys and the one-hand resting place', () => {
    const card = core.typingPracticePostureCard('dvorak');
    expect(card.map((t) => t.id)).toEqual(['feet', 'sit', 'arms', 'home', 'eyes', 'touch', 'breaks', 'own-way']);
    expect(card.find((t) => t.id === 'home').text).toContain('bumps on U and H');
    expect(core.typingPracticePostureCard('qwerty-us').find((t) => t.id === 'home').text).toContain('bumps on F and J');
    expect(core.typingPracticePostureCard('qwerty-us', 'left').find((t) => t.id === 'home').text).toContain('pinky on F');
  });

  it('keeps US coaching hints word for word and names the layout\'s keys elsewhere', () => {
    const top = { q: 5, w: 5, e: 5, r: 5, t: 5 };
    expect(core.analyzeErrorPatterns(top, null).hints).toContain('A lot of your errors are on the top row (q-p). After reaching up, let your fingers come back to home row (asdf jkl;) before the next keystroke. Anchoring helps accuracy.');
    expect(core.analyzeErrorPatterns(top, null).recommendedDrill.reason).toBe('Top-row errors dominate — drill q-p reach stability.');
    const dvorakTop = { p: 5, y: 5, f: 5, g: 5, c: 5 };
    const hints = core.analyzeErrorPatterns(dvorakTop, null, 'dvorak').hints;
    expect(hints).toContain("A lot of your errors are on the top row ('-l). After reaching up, let your fingers come back to home row (aoeu htns) before the next keystroke. Anchoring helps accuracy.");
    expect(core.analyzeErrorPatterns({ a: 9, o: 9, e: 9 }, null, 'dvorak').fingerCounts).toMatchObject({ LP: 9, LR: 9, LM: 9 });
  });
});

describe('Typing Practice keyboard screens render', () => {
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

  it('shows Dvorak lessons on the lesson path, with the posture card', () => {
    const html = render({ view: 'lessons', keyboardLayout: 'dvorak' });
    expect(html).toContain('U and H');
    expect(html).toContain('Lessons follow your Dvorak keyboard');
    expect(html).toContain('How to sit and place your hands');
  });

  it('introduces a one-hand stage with a stage picker and the classic option', () => {
    const html = render({ view: 'drill-intro', currentDrill: 'one-hand-left', drillRunId: 2 });
    expect(html).toContain('One-hand track, stage 1 of 24:');
    expect(html).toContain('Choose a stage');
    expect(html).toContain('Own-side keys only (classic)');
    expect(html).toContain('pinky on F');
  });

  it('draws both Shift keys and a "Show the keyboard again" control when keys have faded', () => {
    const seen = Date.parse('2025-12-31T00:00:00Z');
    const strong = { attempts: 200, errors: 1, ewmaErrRate: 0.01, lastSeen: seen, box: 3, nextReviewAt: seen };
    const html = render({
      view: 'drill', currentDrill: 'home-row', drillRunId: 4, keyboardLayout: 'dvorak',
      accommodations: { showKeyboard: true, keyboardFade: true },
      keyStats: { v: 1, sessions: 5, updatedAt: seen, keys: { a: strong, o: strong }, bigrams: {}, kinds: {} }
    });
    expect(html).toContain('Show the keyboard again');
    expect(html).toContain('data-fade="hidden"');
    expect((html.match(/>Shift</g) || []).length).toBeGreaterThanOrEqual(2);
    expect(html).toContain('Home row · Dvorak');
  });

  it('runs a one-hand stage in the drill with that hand\'s resting keys', () => {
    const html = render({ view: 'drill', currentDrill: 'one-hand-left', drillRunId: 5, oneHandLesson: { left: 'lesson-fj', right: null }, accommodations: { showKeyboard: true } });
    expect(html).toContain('Home row · US QWERTY');
    expect(html).toMatch(/Next key: [FJ] · use your left (pinky|index finger)/);
  });

  it('offers the fade setting and the one-handed Dvorak layouts in Settings', () => {
    const html = render({ view: 'settings' });
    expect(html).toContain('Fade keys I know');
    expect(html).toContain('Dvorak, left hand');
    expect(html).toContain('Dvorak, right hand');
  });
});
