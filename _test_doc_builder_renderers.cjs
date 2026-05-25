// _test_doc_builder_renderers.cjs — Test suite for the testable subset of
// Document Builder's generateResourceHTML function.
//
// CONTEXT: generateResourceHTML is a 2,377-line function with 18 type-branches
// and heavy closure dependencies (parseMarkdownToHTML, getDefaultTitle,
// isRtlLang, exportConfig, leveledTextLanguage, isIndependentMode, t(),
// getResource). Comprehensive coverage of every branch would require a Node
// harness with mocked deps — separate ~2-session project.
//
// THIS FILE covers the parts that ARE testable in isolation today:
//   1. Gating logic (shouldRenderResource) — which types render for which
//      audience under which config. Highest-regression-risk subset because
//      getting it wrong silently drops or duplicates resources.
//   2. Worksheet-mode pure helpers (ruledLines, fillableCircle, fillableBlank).
//   3. Type-visual lookup (getResourceTypeVisuals) — icon/color/label per type.
//
// All helpers are COPIED from doc_pipeline_source.jsx (~line 13796 onward).
// Keep in sync with the originals until/unless we extract them. Source line
// references appear with each helper.
//
// Run: node --test _test_doc_builder_renderers.cjs

const { test, describe } = require('node:test');
const assert = require('node:assert');

// ═══════════════════════════════════════════════════════════════════════════
// Subjects under test (copies from doc_pipeline_source.jsx)
// ═══════════════════════════════════════════════════════════════════════════

// Source: doc_pipeline_source.jsx ~line 13806
const ruledLines = (numLines = 4, label = '') => {
  const lines = Array.from({length: Math.max(1, numLines)}, () =>
    '<div style="border-bottom: 1px solid #94a3b8; height: 28px; margin-bottom: 4px; break-inside: avoid;"></div>'
  ).join('');
  return `<div style="margin-top: 8px; break-inside: avoid;">${label ? `<div style="font-size: 0.85em; color: #64748b; margin-bottom: 6px; font-weight: 600;">${label}</div>` : ''}${lines}</div>`;
};

// Source: doc_pipeline_source.jsx ~line 13812
const fillableCircle = () =>
  '<span aria-hidden="true" style="display: inline-block; width: 14px; height: 14px; border: 2px solid #475569; border-radius: 50%; vertical-align: middle; margin-right: 6px; background: white;"></span>';

// Source: doc_pipeline_source.jsx ~line 13814
const fillableBlank = (widthPx = 150) =>
  `<span aria-hidden="true" style="display: inline-block; width: ${widthPx}px; border-bottom: 1.5px solid #475569; height: 1.4em; vertical-align: middle; margin: 0 4px;"></span>`;

// Source: doc_pipeline_source.jsx ~line 13846
// Extracted to a pure helper for testing — original is inline in generateResourceHTML.
const getResourceTypeVisuals = (type) => {
  const typeVisuals = {
    'simplified': { icon: '📖', color: '#2563eb', bg: '#eff6ff', label: 'Leveled Text' },
    'analysis': { icon: '📊', color: '#7c3aed', bg: '#f5f3ff', label: 'Source Analysis' },
    'glossary': { icon: '📚', color: '#059669', bg: '#ecfdf5', label: 'Glossary' },
    'quiz': { icon: '❓', color: '#dc2626', bg: '#fef2f2', label: 'Quiz' },
    'outline': { icon: '🗂️', color: '#d97706', bg: '#fffbeb', label: 'Graphic Organizer' },
    'faq': { icon: '💬', color: '#0891b2', bg: '#ecfeff', label: 'FAQ' },
    'sentence-frames': { icon: '✍️', color: '#4f46e5', bg: '#eef2ff', label: 'Sentence Frames' },
    'image': { icon: '🎨', color: '#be185d', bg: '#fdf2f8', label: 'Visual Support' },
    'math': { icon: '🔢', color: '#ea580c', bg: '#fff7ed', label: 'Math' },
    'dbq': { icon: '📜', color: '#92400e', bg: '#fefce8', label: 'Document-Based Question' },
    'lesson-plan': { icon: '📋', color: '#166534', bg: '#f0fdf4', label: 'Lesson Plan' },
    'udl-advice': { icon: '🧩', color: '#7c3aed', bg: '#faf5ff', label: 'UDL Strategies' },
    'brainstorm': { icon: '💡', color: '#ca8a04', bg: '#fefce8', label: 'Brainstorm' },
    'fluency-record': { icon: '🎙️', color: '#0d9488', bg: '#f0fdfa', label: 'Fluency Record' },
    'timeline': { icon: '📅', color: '#4338ca', bg: '#eef2ff', label: 'Timeline' },
    'concept-sort': { icon: '🧩', color: '#6d28d9', bg: '#f5f3ff', label: 'Concept Sort' },
  };
  return typeVisuals[type] || { icon: '📄', color: '#475569', bg: '#f8fafc', label: '' };
};

// Source: doc_pipeline_source.jsx ~line 13819-13841
// Extracted from generateResourceHTML's early-return gating logic into a pure
// decision function. Returns true if the resource should render given the
// inputs, false if it should be filtered out.
//
// The gating rules (mirrored from the source order):
//   1. Toggleable types: if its corresponding includeX config is explicitly
//      false, filter it out. (includeQuiz=false → quiz never renders.)
//   2. Teacher-only-by-default types (analysis, udl-advice, brainstorm):
//      always render for teacher copy. For student copy, gated by the same
//      includeX config — opt-in to include in student copy.
//   3. Teacher copy hides student-facing types (simplified, outline, image,
//      faq, sentence-frames) to avoid duplication of student-only content.
//   4. Unknown/uncategorized types render unconditionally.
const shouldRenderResource = (item, isTeacher, config) => {
  const typeToggleMap = {
    'lesson-plan': 'includeLessonPlan',
    'simplified': 'includeSimplified',
    'outline': 'includeOutline',
    'glossary': 'includeGlossary',
    'quiz': 'includeQuiz',
    'faq': 'includeFaq',
    'sentence-frames': 'includeSentenceFrames',
    'image': 'includeImage',
    'math': 'includeMath',
    'dbq': 'includeDbq',
  };
  const toggleKey = typeToggleMap[item.type];
  if (toggleKey && config[toggleKey] === false) return false;

  // Teacher-only-by-default types: opt-in to student copy.
  if (item.type === 'analysis' || item.type === 'udl-advice' || item.type === 'brainstorm') {
    const studentToggleKey = item.type === 'analysis' ? 'includeAnalysis'
                            : item.type === 'udl-advice' ? 'includeUdlAdvice'
                            : 'includeBrainstorm';
    if (!isTeacher && config[studentToggleKey] === false) return false;
    return true; // teacher copy always renders these
  }

  // Teacher copy hides student-facing types
  if (isTeacher) {
    if (item.type === 'simplified') return false;
    if (item.type === 'outline') return false;
    if (item.type === 'image') return false;
    if (item.type === 'faq') return false;
    if (item.type === 'sentence-frames') return false;
  }

  return true;
};

// ═══════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════

describe('ruledLines (worksheet handwriting helper)', () => {
  test('default 4 lines when no count given', () => {
    const html = ruledLines();
    const lineMatches = html.match(/border-bottom: 1px solid/g) || [];
    assert.strictEqual(lineMatches.length, 4);
  });

  test('custom line count respected', () => {
    const html = ruledLines(7);
    const lineMatches = html.match(/border-bottom: 1px solid/g) || [];
    assert.strictEqual(lineMatches.length, 7);
  });

  test('zero lines clamped to minimum 1', () => {
    const html = ruledLines(0);
    const lineMatches = html.match(/border-bottom: 1px solid/g) || [];
    assert.strictEqual(lineMatches.length, 1);
  });

  test('negative line count clamped to minimum 1', () => {
    const html = ruledLines(-5);
    const lineMatches = html.match(/border-bottom: 1px solid/g) || [];
    assert.strictEqual(lineMatches.length, 1);
  });

  test('label rendered when provided', () => {
    const html = ruledLines(4, 'Show your work:');
    assert.ok(html.includes('Show your work:'));
  });

  test('no label markup when label empty', () => {
    const html = ruledLines(4, '');
    assert.ok(!html.includes('font-size: 0.85em; color: #64748b'), 'label-specific styling absent');
  });

  test('break-inside: avoid present for print safety', () => {
    const html = ruledLines(4);
    assert.ok(html.includes('break-inside: avoid'));
  });
});

describe('fillableCircle (worksheet MCQ helper)', () => {
  test('returns a single span element', () => {
    const html = fillableCircle();
    assert.ok(html.startsWith('<span'));
    assert.ok(html.endsWith('</span>'));
  });

  test('aria-hidden for screen-reader politeness', () => {
    assert.ok(fillableCircle().includes('aria-hidden="true"'));
  });

  test('circle dimensions are fixed (14x14)', () => {
    const html = fillableCircle();
    assert.ok(html.includes('width: 14px'));
    assert.ok(html.includes('height: 14px'));
  });

  test('white background (so pen ink visible)', () => {
    assert.ok(fillableCircle().includes('background: white'));
  });
});

describe('fillableBlank (worksheet short-answer helper)', () => {
  test('default width is 150px', () => {
    const html = fillableBlank();
    assert.ok(html.includes('width: 150px'));
  });

  test('custom width respected', () => {
    const html = fillableBlank(300);
    assert.ok(html.includes('width: 300px'));
  });

  test('aria-hidden for screen-reader politeness', () => {
    assert.ok(fillableBlank().includes('aria-hidden="true"'));
  });

  test('bottom border simulates handwriting line', () => {
    assert.ok(fillableBlank().includes('border-bottom: 1.5px solid'));
  });

  test('zero width still produces valid markup (degenerate)', () => {
    const html = fillableBlank(0);
    assert.ok(html.includes('width: 0px'));
    assert.ok(html.startsWith('<span'));
  });
});

describe('getResourceTypeVisuals', () => {
  test('returns icon/color/bg/label for each known resource type', () => {
    const knownTypes = [
      'simplified', 'analysis', 'glossary', 'quiz', 'outline', 'faq',
      'sentence-frames', 'image', 'math', 'dbq', 'lesson-plan',
      'udl-advice', 'brainstorm', 'fluency-record', 'timeline', 'concept-sort',
    ];
    for (const type of knownTypes) {
      const v = getResourceTypeVisuals(type);
      assert.ok(v.icon, `${type} has icon`);
      assert.ok(v.color, `${type} has color`);
      assert.ok(v.bg, `${type} has bg`);
      assert.ok(v.label, `${type} has label`);
      assert.ok(v.color.startsWith('#'), `${type} color is hex`);
      assert.ok(v.bg.startsWith('#'), `${type} bg is hex`);
    }
  });

  test('unknown type falls back to default visuals', () => {
    const v = getResourceTypeVisuals('totally-made-up-type');
    assert.strictEqual(v.icon, '📄');
    assert.strictEqual(v.color, '#475569');
    assert.strictEqual(v.bg, '#f8fafc');
    assert.strictEqual(v.label, '');
  });

  test('quiz icon is ❓ (sanity check on a specific mapping)', () => {
    assert.strictEqual(getResourceTypeVisuals('quiz').icon, '❓');
  });

  test('lesson-plan color is forest green (sanity check)', () => {
    assert.strictEqual(getResourceTypeVisuals('lesson-plan').color, '#166534');
  });

  test('bg colors are pastels paired with the accent color', () => {
    // Quick smoke: the bg should be a light tint, the color a darker accent.
    // Test via simple "bg is lighter than color" heuristic (sum of channels).
    const sumChannels = (hex) => {
      const h = hex.slice(1);
      return parseInt(h.slice(0, 2), 16) + parseInt(h.slice(2, 4), 16) + parseInt(h.slice(4), 16);
    };
    const knownTypes = ['simplified', 'analysis', 'glossary', 'quiz', 'outline', 'faq', 'math', 'dbq', 'lesson-plan'];
    for (const type of knownTypes) {
      const v = getResourceTypeVisuals(type);
      assert.ok(sumChannels(v.bg) > sumChannels(v.color), `${type}: bg should be lighter than color`);
    }
  });
});

describe('shouldRenderResource — gating logic', () => {

  const baseConfig = {
    includeAnalysis: true,
    includeUdlAdvice: true,
    includeBrainstorm: true,
    includeLessonPlan: true,
    includeSimplified: true,
    includeOutline: true,
    includeGlossary: true,
    includeQuiz: true,
    includeFaq: true,
    includeSentenceFrames: true,
    includeImage: true,
    includeMath: true,
    includeDbq: true,
  };

  describe('Toggleable types — config gates rendering', () => {
    const toggleable = [
      ['lesson-plan', 'includeLessonPlan'],
      ['simplified', 'includeSimplified'],
      ['outline', 'includeOutline'],
      ['glossary', 'includeGlossary'],
      ['quiz', 'includeQuiz'],
      ['faq', 'includeFaq'],
      ['sentence-frames', 'includeSentenceFrames'],
      ['image', 'includeImage'],
      ['math', 'includeMath'],
      ['dbq', 'includeDbq'],
    ];
    for (const [type, toggle] of toggleable) {
      test(`${type} renders when ${toggle}=true (student copy)`, () => {
        // Note: simplified/outline/image/faq/sentence-frames are hidden from
        // teacher copy regardless of toggle. Test student copy here.
        assert.strictEqual(shouldRenderResource({ type }, false, baseConfig), true);
      });
      test(`${type} skipped when ${toggle}=false`, () => {
        const cfg = { ...baseConfig, [toggle]: false };
        assert.strictEqual(shouldRenderResource({ type }, false, cfg), false);
      });
    }
  });

  describe('Teacher-only-by-default types (analysis, udl-advice, brainstorm)', () => {
    test('analysis renders in teacher copy regardless of toggle', () => {
      const cfg = { ...baseConfig, includeAnalysis: false };
      assert.strictEqual(shouldRenderResource({ type: 'analysis' }, true, cfg), true);
    });

    test('udl-advice renders in teacher copy regardless of toggle', () => {
      const cfg = { ...baseConfig, includeUdlAdvice: false };
      assert.strictEqual(shouldRenderResource({ type: 'udl-advice' }, true, cfg), true);
    });

    test('brainstorm renders in teacher copy regardless of toggle', () => {
      const cfg = { ...baseConfig, includeBrainstorm: false };
      assert.strictEqual(shouldRenderResource({ type: 'brainstorm' }, true, cfg), true);
    });

    test('analysis hidden from student copy when toggle off', () => {
      const cfg = { ...baseConfig, includeAnalysis: false };
      assert.strictEqual(shouldRenderResource({ type: 'analysis' }, false, cfg), false);
    });

    test('analysis shown in student copy when toggle on', () => {
      assert.strictEqual(shouldRenderResource({ type: 'analysis' }, false, baseConfig), true);
    });

    test('udl-advice hidden from student copy when toggle off', () => {
      const cfg = { ...baseConfig, includeUdlAdvice: false };
      assert.strictEqual(shouldRenderResource({ type: 'udl-advice' }, false, cfg), false);
    });

    test('brainstorm hidden from student copy when toggle off', () => {
      const cfg = { ...baseConfig, includeBrainstorm: false };
      assert.strictEqual(shouldRenderResource({ type: 'brainstorm' }, false, cfg), false);
    });
  });

  describe('Teacher copy hides student-facing types', () => {
    const hiddenInTeacher = ['simplified', 'outline', 'image', 'faq', 'sentence-frames'];
    for (const type of hiddenInTeacher) {
      test(`${type} hidden from teacher copy (avoids student/teacher duplication)`, () => {
        assert.strictEqual(shouldRenderResource({ type }, true, baseConfig), false);
      });
      test(`${type} shown in student copy when toggle on`, () => {
        assert.strictEqual(shouldRenderResource({ type }, false, baseConfig), true);
      });
    }
  });

  describe('Unknown / unhandled types', () => {
    test('unknown type renders by default (no gating rules match)', () => {
      assert.strictEqual(shouldRenderResource({ type: 'totally-new-type' }, false, baseConfig), true);
    });

    test('unknown type also renders in teacher copy', () => {
      assert.strictEqual(shouldRenderResource({ type: 'totally-new-type' }, true, baseConfig), true);
    });

    test('timeline (no toggle map entry yet) renders by default', () => {
      // timeline + concept-sort are listed in typeVisuals but not yet in
      // typeToggleMap. They render unless someone adds a toggle entry later.
      assert.strictEqual(shouldRenderResource({ type: 'timeline' }, false, baseConfig), true);
      assert.strictEqual(shouldRenderResource({ type: 'concept-sort' }, false, baseConfig), true);
    });

    test('fluency-record renders for teacher (not on hide list)', () => {
      assert.strictEqual(shouldRenderResource({ type: 'fluency-record' }, true, baseConfig), true);
    });
  });

  describe('Interaction matrix — toggle off + teacher vs student', () => {
    test('teacher copy: lesson-plan respects includeLessonPlan toggle', () => {
      const cfg = { ...baseConfig, includeLessonPlan: false };
      assert.strictEqual(shouldRenderResource({ type: 'lesson-plan' }, true, cfg), false);
    });

    test('teacher copy: quiz still respects includeQuiz toggle', () => {
      const cfg = { ...baseConfig, includeQuiz: false };
      assert.strictEqual(shouldRenderResource({ type: 'quiz' }, true, cfg), false);
    });

    test('teacher copy: math respects includeMath toggle', () => {
      const cfg = { ...baseConfig, includeMath: false };
      assert.strictEqual(shouldRenderResource({ type: 'math' }, true, cfg), false);
    });

    test('teacher copy: simplified is hidden even if includeSimplified=true', () => {
      // Hide-in-teacher rule wins over toggle (no duplication)
      assert.strictEqual(shouldRenderResource({ type: 'simplified' }, true, baseConfig), false);
    });
  });

  describe('Edge cases', () => {
    test('missing config field treated as enabled (not strictly false)', () => {
      const cfg = {}; // no toggles set at all
      // Toggles check `=== false` so absence is treated as not-set, renders by default
      assert.strictEqual(shouldRenderResource({ type: 'quiz' }, false, cfg), true);
    });

    test('config field set to true explicitly works', () => {
      const cfg = { includeQuiz: true };
      assert.strictEqual(shouldRenderResource({ type: 'quiz' }, false, cfg), true);
    });

    test('item with no type field defaults through', () => {
      // No typeToggleMap entry → not gated by toggle. Not a teacher-only type.
      // Not in hide-from-teacher list. Should render.
      assert.strictEqual(shouldRenderResource({ type: undefined }, false, baseConfig), true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Coverage note
// ═══════════════════════════════════════════════════════════════════════════
//
// This file does NOT test the per-type HTML output of generateResourceHTML
// directly. Each branch (simplified, glossary, quiz, etc.) is a large block
// of templated HTML with closure dependencies (parseMarkdownToHTML,
// getDefaultTitle, isRtlLang, leveledTextLanguage, t(), isIndependentMode,
// pdfFixResult.docStyle). Testing those branches requires either:
//
//   (a) A Node test harness that loads doc_pipeline_module.js with a window
//       shim + mocked deps + a state-proxy stub. Sets up ~2 sessions worth
//       of mocking before tests can run.
//
//   (b) Refactoring generateResourceHTML to accept its deps as parameters
//       (currently they're all closure-captured). Substantial change to the
//       function signature. ~1-2 sessions.
//
// Neither is in scope for the current session. The pieces tested here are:
//
//   1. Pure sub-helpers (ruledLines, fillableCircle, fillableBlank) — these
//      have no closure deps and produce deterministic HTML strings.
//   2. Gating logic (shouldRenderResource) — extracted from the
//      early-return conditions at the top of generateResourceHTML.
//      Highest-regression-risk slice: getting it wrong silently drops or
//      duplicates entire resources in exports.
//   3. Type-visual lookup (getResourceTypeVisuals) — pure data map.
//
// Future work: write the test harness (option a above) so the 18 branches
// can each be regression-tested against snapshot fixtures.
