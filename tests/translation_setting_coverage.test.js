import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// A translation setting that half the generators ignore is worse than none,
// because the teacher will trust it. This file is the standing proof that the
// setting reaches every path the 2026-08-16 audit found, and the tripwire that
// fires when a new prompt reintroduces a hardcoded English gloss.

const read = (p) => readFileSync(p, 'utf8');
const dispatcher = read('generate_dispatcher_source.jsx');
const promptsLib = read('prompts_library_source.jsx');
const pipeline = read('text_pipeline_helpers_source.jsx');
const genHelpers = read('generation_helpers_source.jsx');
const mathHelpers = read('math_helpers_source.jsx');
const personas = read('personas_source.jsx');
const cmap = read('concept_map_handlers_source.jsx');
const panel = read('view_sidebar_panels_source.jsx');
const anti = read('AlloFlowANTI.txt');

describe('the setting reaches every emitting path in the audit', () => {
  // Each entry: audit row -> a fragment that only exists because that path now
  // reads the resolved policy. Asserting the gate, not the prose.
  const DISPATCHER_PATHS = {
    'glossary (translation language list)': `if (!_xlate.enabled) {`,
    'adapted text (per-chunk gloss round trip)': `if (_xlate.enabled) {\n              if (isMultiChunk) setGenerationStep(\`Translating section`,
    'adapted text (bilingual compose)': `_xlate.enabled && bilingualTranslationValid`,
    'adapted text (length-repair gloss)': `if (_xlate.enabled) {\n                  setGenerationStep(t('status_steps.translating')`,
    'outline / graphic organizer': `_xlate.enabled ? \`"main_en"`,
    'quiz (json example fields)': `if (_xlate.enabled) {\n                example.question_en =`,
    'quiz (reflection field)': `_xlate.enabled ? { text: 'Reflection prompt', text_en:`,
    'quiz (translation field directive)': `_xlate.enabled ? \`For every question, option, and reflection`,
    'quiz (answer explanation)': `_xlate.enabled ? \`- After the explanation`,
    'analysis': `const isTranslatedAnalysis = _xlate.enabled && !usesLocalTextBackend;`,
    'faq': `_xlate.enabled ? \`Provide \${glossLang} translations for every question and answer.\``,
    'brainstorm': `_xlate.enabled ? \`Provide \${glossLang} translations for all text.\``,
    'timeline': `_xlate.enabled ? \`Provide \${glossLang} translations for all labels`,
    'math (two prompt variants)': `(_xlate.enabled ? ' After each text field, include a ' + glossLang + ' translation in parentheses.'`,
  };

  for (const [label, fragment] of Object.entries(DISPATCHER_PATHS)) {
    it(`dispatcher: ${label} honours the setting`, () => {
      expect(dispatcher).toContain(fragment);
    });
  }

  it('the dispatcher resolves the policy exactly once, from the threaded resolver', () => {
    expect(dispatcher).toContain('const _xlate = _resolveXlate(translationMode, effectiveLanguage, currentUiLanguage, _xlateChoices);');
    expect(dispatcher).toContain('deps.resolveTranslationPolicy');
    // Both must arrive through deps, or the resolve above reads undefined.
    const depsLine = dispatcher.split('\n').find((l) => l.includes('} = deps;') && l.includes('leveledTextLanguage'));
    expect(depsLine, 'dispatcher deps destructure found').toBeTruthy();
    expect(depsLine).toContain('translationMode');
    expect(depsLine).toContain('resolveTranslationPolicy');
  });

  it('lesson plan, family guide and study guide all take a translationPolicy', () => {
    for (const fn of ['buildLessonPlanPrompt', 'buildParentGuidePrompt', 'buildStudyGuidePrompt']) {
      const sig = promptsLib.slice(promptsLib.indexOf(`const ${fn} = ({`));
      expect(sig.slice(0, 300), `${fn} accepts translationPolicy`).toContain('translationPolicy');
      expect(sig.slice(0, 400), `${fn} resolves it`).toContain('_xlateFor(translationPolicy, language)');
    }
    // ...and none of the three still gates on the language string.
    expect(promptsLib).not.toContain("${language !== 'English' ? `");
  });

  it('both lesson-plan entry points send the OUTPUT language, not the UI language', () => {
    // The split that made lesson plans look inconsistent (audit row 17/18).
    expect(cmap).toContain('const planLanguage = leveledTextLanguage || currentUiLanguage');
    for (const fn of ['buildStudyGuidePrompt', 'buildParentGuidePrompt', 'buildLessonPlanPrompt']) {
      expect(cmap, `${fn} no longer passes currentUiLanguage`).not.toContain(`${fn}(context, currentUiLanguage`);
      expect(cmap).not.toContain(`${fn}(context, assetManifest, currentUiLanguage`);
    }
    expect(dispatcher).toContain('buildLessonPlanPrompt(context, assetManifest, effectiveLanguage');
  });

  it('the analysis path no longer reads the app UI language', () => {
    // Audit row 10: the leak Aaron suspected.
    expect(dispatcher).not.toContain("const targetUiLang = currentUiLanguage || 'English';");
    expect(dispatcher).toContain('const targetUiLang = _xlate.target || effectiveLanguage;');
  });

  it('the shared bilingual pipeline spends no second call when translations are off', () => {
    expect(pipeline).toContain('if (!policy.enabled) return targetResult;');
    expect(anti).toContain('const getBilingualPromptInstruction = (targetLang, policy)');
    expect(anti).toContain('SINGLE LANGUAGE OUTPUT REQUIRED');
  });

  it('the math and quiz helper copies honour it too', () => {
    for (const [name, src] of [['generation_helpers', genHelpers], ['math_helpers', mathHelpers]]) {
      expect(src, `${name} resolves a policy`).toContain('const _xlate = (typeof resolveTranslationPolicy === \'function\')');
      expect(src, `${name} uses the resolved target`).toContain("_xlate.target + ' translation in parentheses.'");
    }
    expect(genHelpers).toContain('generateBilingualText(prompt, leveledTextLanguage, callGemini, _xlate)');
  });

  it('persona dialogue turns honour it', () => {
    expect(personas).toContain('const personaTranslationPolicy = (targetLang) =>');
    expect(personas).toContain('const _panelXlate = personaTranslationPolicy(targetLang);');
    expect(personas).toContain('const _replyXlate = personaTranslationPolicy(targetLang);');
  });
});

describe('nothing reads the multi-state setting by string comparison', () => {
  // The lockout class: a multi-state setting compared with `!== 'off'` or a
  // truthiness check. Consumers must go through the resolver and read the
  // struct. The resolver itself is the ONE place allowed to compare.
  const CONSUMERS = {
    'generate_dispatcher_source.jsx': dispatcher,
    'view_sidebar_panels_source.jsx': panel,
    'generation_helpers_source.jsx': genHelpers,
    'math_helpers_source.jsx': mathHelpers,
    'personas_source.jsx': personas,
    'prompts_library_source.jsx': promptsLib,
  };
  for (const [file, src] of Object.entries(CONSUMERS)) {
    it(`${file} never compares translationMode directly`, () => {
      const bad = [
        /translationMode\s*!==\s*['"]off['"]/,
        /translationMode\s*===\s*['"]off['"]/,
        /translationMode\s*!==\s*['"]auto['"]/,
        /!\s*translationMode\b/,
        /translationMode\s*\?\s/,
        /if\s*\(\s*translationMode\s*\)/,
      ];
      for (const re of bad) {
        expect(re.test(src), `${file} matches forbidden read ${re}`).toBe(false);
      }
    });
  }

  it('the resolver is the only place that knows the literal mode strings', () => {
    expect(pipeline).toContain("const TRANSLATION_MODE_OFF = 'off';");
    // Rejected by type before coercion, so 42 never becomes a language.
    expect(pipeline).toContain("let raw = typeof mode === 'string' ? mode.trim() : '';");
    // Disabled policies carry '' so a prompt interpolation cannot print
    // "undefined" at the model.
    expect(pipeline).toContain("const off = (resolvedMode) => ({ enabled: false, target: '', mode: resolvedMode });");
  });
});

describe('no generator reintroduces a hardcoded English gloss', () => {
  // Tripwire. The audit found 25 sites that asked for an "English translation"
  // regardless of what the teacher wanted. These are the phrasings they used.
  // A new one appearing here means someone wrote a prompt without the policy.
  const FORBIDDEN = [
    'Provide English translations',
    'provide an English translation field',
    'English translation of the label',
    "include an English translation in parentheses",
  ];
  const SCANNED = {
    'generate_dispatcher_source.jsx': dispatcher,
    'prompts_library_source.jsx': promptsLib,
    'generation_helpers_source.jsx': genHelpers,
    'math_helpers_source.jsx': mathHelpers,
  };
  for (const [file, src] of Object.entries(SCANNED)) {
    for (const phrase of FORBIDDEN) {
      it(`${file} does not ask for "${phrase}"`, () => {
        expect(src.includes(phrase), `${file} still contains: ${phrase}`).toBe(false);
      });
    }
  }

  it('the delimiter itself is deliberately left as a fixed machine token', () => {
    // Not a miss. '--- ENGLISH TRANSLATION ---' is parsed by
    // extractSourceTextForProcessing, BilingualFieldRenderer,
    // ENGLISH_TRANSLATION_DELIMITER_RE, phase_k's cloze repair and
    // content_engine's edit pipeline. Renaming it per language would break
    // every one of those parsers. The visible LABEL is localized instead.
    expect(pipeline).toContain('--- ENGLISH TRANSLATION ---');
    expect(pipeline).toContain('It is a MACHINE TOKEN, not user-facing copy');
    expect(anti).toContain("t('output.translation_into')");
  });
});

describe('the control is wired end to end', () => {
  it('the host declares the state and defaults it to auto', () => {
    expect(anti).toContain('const [translationMode, setTranslationMode] = useState(TRANSLATION_MODE_AUTO);');
  });

  it('the host persists and restores it wherever it persists the output language', () => {
    expect(anti).toContain("if (typeof parsed.translationMode === 'string') setTranslationMode(parsed.translationMode);");
    expect(anti).toContain("setTranslationMode(typeof profile.config.translationMode === 'string' ? profile.config.translationMode : TRANSLATION_MODE_AUTO);");
    expect(anti).toContain("if (typeof p.translationMode === 'string') setTranslationMode(p.translationMode);");
    // Saved in the same payloads as leveledTextLanguage, or a restore has
    // nothing to read back.
    const payloads = anti.split('\n').filter((l) => /^\s*translationMode,\s*$/.test(l));
    expect(payloads.length, 'translationMode travels with leveledTextLanguage').toBeGreaterThanOrEqual(10);
  });

  it('the panel renders the control, binds to the resolved mode, and hides when irrelevant', () => {
    expect(panel).toContain('const showTranslationControl =');
    expect(panel).toContain('isTranslationControlRelevant(translationMode, leveledTextLanguage, currentUiLanguage, translationChoices)');
    expect(panel).toContain('{showTranslationControl && (');
    // Binding to the RAW stored value would draw the select blank on a stale
    // language, which is the DoK "Mixed" failure this panel already had.
    expect(panel).toContain('value={translationPolicy.mode}');
    expect(panel).not.toContain('value={translationMode}');
    // Off must be reachable from the same list, or it is not turn-off-able.
    expect(panel).toContain('<option value="off">');
    expect(panel).toContain('<option value="auto">');
  });

  it('the host passes the panel the same resolver the generators use', () => {
    expect(anti).toContain('translationMode, setTranslationMode, currentUiLanguage,');
    expect(anti).toContain('resolveTranslationPolicy, isTranslationControlRelevant, translationTargetChoices');
  });

  it('every new user-facing string goes through ui_strings, in both copies', () => {
    for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const u = JSON.parse(read(f));
      for (const k of ['translations', 'translations_auto', 'translations_auto_plain', 'translations_none', 'translations_on_hint', 'translations_off_hint']) {
        expect(u.universal[k], `${f}: universal.${k}`).toBeTruthy();
      }
      for (const k of ['translation_block', 'translation_into']) {
        expect(u.output[k], `${f}: output.${k}`).toBeTruthy();
      }
      expect(u.universal.translations_auto).toContain('{language}');
      expect(u.output.translation_into).toContain('{language}');
    }
  });

  it('no new user-facing string uses an em dash or en dash', () => {
    for (const f of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const u = JSON.parse(read(f));
      const mine = [
        ...Object.entries(u.universal).filter(([k]) => k.startsWith('translations')),
        ...Object.entries(u.output).filter(([k]) => k.startsWith('translation_')),
      ];
      for (const [k, v] of mine) {
        expect(/[–—]/.test(String(v)), `${f}: ${k} contains a dash character`).toBe(false);
      }
    }
  });
});
