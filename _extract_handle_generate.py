#!/usr/bin/env python3
"""
Phase J: Extract handleGenerate (lines 18727-21012, 2,286 lines) into
generate_dispatcher_module.js.

handleGenerate is the resource-generation dispatcher — switch-on-type
that routes to per-resource generation logic for simplified text,
glossary, quiz, outline, image, timeline, persona, concept-sort,
brainstorm, faq, sentence-frames, lesson-plan, adventure, analysis,
udl-advice, alignment-report, math, etc.

Strategy:
  1. The DEPS list below is the seed — comprehensive but not exhaustive.
     The auditor is run after extraction to surface anything missed.
  2. Recursive calls inside the body (4 of them) are rewritten to thread
     deps through via BODY_REWRITES_REGEX.
  3. Empty destructure on missing deps fails fast at runtime, so the
     auditor pass is the gate before deploy.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'generate_dispatcher_source.jsx')

# DEPS — start with what we know from the first 100 lines + common patterns
# from prior handler audits. Auditor will catch anything missed.
DEPS = [
    # ── State VALUES ───────────────────────────────────────────────────
    'gradeLevel', 'outlineType', 'visualStyle', 'quizMcqCount',
    'persistedLessonDNA',
    'leveledTextCustomInstructions', 'quizCustomInstructions',
    'glossaryCustomInstructions', 'frameCustomInstructions',
    'adventureCustomInstructions', 'brainstormCustomInstructions',
    'faqCustomInstructions', 'outlineCustomInstructions',
    'visualCustomInstructions', 'lessonCustomAdditions', 'timelineTopic',
    'sourceTopic', 'history', 'inputText', 'differentiationRange',
    'leveledTextLanguage', 'selectedLanguages', 'studentInterests',
    'guidedMode', 'guidedStep',
    'standardsInput', 'targetStandards', 'dokLevel', 'sourceLength',
    'sourceTone', 'textFormat', 'useEmojis', 'fullPackTargetGroup',
    'rosterKey', 'imageGenerationStyle', 'imageAspectRatio',
    'enableEmojiInline', 'cellGameDifficulty',
    'includeSourceCitations', 'includeBibliography',
    'currentUiLanguage', 'sourceCustomInstructions', 'sourceVocabulary',
    'sourceLevel', 'generatedContent',
    'mathSubject', 'mathMode', 'mathInput', 'mathQuantity',
    'isAutoConfigEnabled', 'resourceCount', 'isParentMode',
    'isIndependentMode', 'isTeacherMode',
    'frameType', 'fillInTheBlank', 'vocabularyType',
    'enableFactionResources', 'factionResourceMode',
    'isAdventureStoryMode', 'isSocialStoryMode', 'isImmersiveMode',
    'adventureChanceMode', 'adventureConsistentCharacters',
    'adventureFreeResponseEnabled', 'adventureLanguageMode',
    'adventureInputMode', 'apiKey',
    # ── State SETTERS ──────────────────────────────────────────────────
    'setIsMapLocked', 'setIsProcessing', 'setGenerationStep',
    'setInteractionMode', 'setDefinitionData', 'setSelectionMenu',
    'setRevisionData', 'setIsReviewGame', 'setReviewGameState',
    'setGuidedStep', 'setGeneratedContent', 'setActiveView',
    'setHistory', 'setError', 'setShowKokoroOfferModal',
    # ── Refs ───────────────────────────────────────────────────────────
    'alloBotRef', 'pdfFixResult',
    # ── Helpers ────────────────────────────────────────────────────────
    'addToast', 't', 'warnLog', 'debugLog', 'callGemini', 'cleanJson',
    'safeJsonParse', 'callImagen',
    'extractSourceTextForProcessing', 'formatLessonDNA',
    'getDifferentiationGrades', 'getGroupDifferentiationContext',
    'flyToElement', 'fisherYatesShuffle',
    'sanitizeTruncatedCitations', 'normalizeCitationPlacement',
    'fixCitationPlacement', 'generateBibliographyString',
    'processGrounding', 'parseFlowChartData',
    'verifyMathProblems', 'normalizeResourceLinks',
    'detectClimaxArchetype',
    # ── Cross-module shims (called from inside handleGenerate body) ────
    'handleGenerateLessonPlan', 'handleGenerateMath', 'handleGenerateSource',
    'autoConfigureSettings', 'applyDetailedAutoConfig',
    'getAssetManifest', 'getLessonContext',
    'buildLessonPlanPrompt', 'buildStudyGuidePrompt',
    'buildParentGuidePrompt',
    # ── Top-level data constants ───────────────────────────────────────
    'GUIDED_STEPS', 'LENGTH_THRESHOLDS', 'TIMELINE_MODE_DEFINITIONS',
    # ── Round-2 deps from audit ────────────────────────────────────────
    'audioRef', 'autoRemoveWords', 'bridgeSimType', 'bridgeStepCount',
    'conceptImageMode', 'conceptItemCount', 'conceptSortImageStyle',
    'creativeMode', 'faqCount', 'glossaryDefinitionLevel',
    'glossaryImageStyle', 'glossaryTier2Count', 'glossaryTier3Count',
    'includeCharts', 'includeEtymology', 'includeTimelineVisuals',
    'isBotVisible', 'isMathGraphEnabled', 'keepCitations',
    'leveledTextLength', 'noText', 'passAnalysisToQuiz',
    'quizReflectionCount', 'selectedConcepts', 'standardsPromptString',
    'timelineImageStyle', 'timelineItemCount', 'timelineMode',
    'useLowQualityVisuals',
    # Round-2 setters
    'setGameMode', 'setGlossarySearchTerm', 'setIsConceptMapReady',
    'setIsEditingAnalysis', 'setIsEditingBrainstorm', 'setIsEditingFaq',
    'setIsEditingGlossary', 'setIsEditingLeveledText', 'setIsEditingOutline',
    'setIsEditingQuiz', 'setIsEditingScaffolds', 'setIsGeneratingPersona',
    'setIsInteractiveVenn', 'setIsMatchingGame', 'setIsMemoryGame',
    'setIsPlaying', 'setIsPresentationMode', 'setIsSideBySide',
    'setIsStudentBingoGame', 'setIsVennPlaying', 'setPersonaState',
    'setPresentationState', 'setProcessingProgress', 'setShowQuizAnswers',
    'setStickers',
    # Round-2 helpers
    'calculateReadability', 'callGeminiImageEdit', 'checkAccuracyWithSearch',
    'chunkText', 'countWords', 'executeVisualPlan', 'filterEducationalSources',
    'formatMathQuestion', 'generateHelpfulHint', 'generateVisualPlan',
    'getDefaultTitle', 'performDeepVerification', 'repairGeneratedText',
    'resetPersonaInterviewState', 'validateSequenceStructure',
]

# Recursive self-calls inside the body need deps threaded through.
# All 4 use single-line `await handleGenerate(...)` form.
BODY_REWRITES_REGEX = [
    (
        r'\bawait handleGenerate\(([^)]+)\)',
        r'await handleGenerate(\1, deps)',
    ),
]


def find_end(lines, start_1based):
    """Indent-2 `};` closer."""
    target = '  };'
    for i in range(start_1based, len(lines)):
        if lines[i].rstrip() == target:
            return i + 1
    return None


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find handleGenerate
    start = None
    for i, ln in enumerate(lines):
        if re.match(r'^\s*const\s+handleGenerate\s*=', ln):
            start = i + 1
            break
    if start is None:
        print('FAIL: cannot find handleGenerate', file=sys.stderr); sys.exit(1)
    end = find_end(lines, start)
    if end is None:
        print('FAIL: cannot bracket-match handleGenerate', file=sys.stderr); sys.exit(1)
    print(f'[verify] handleGenerate: lines {start}-{end} ({end-start+1} lines, {len(DEPS)} seed deps)')

    body_lines = lines[start-1:end]
    opener = body_lines[0]
    m = re.match(r'^(\s*)const\s+handleGenerate\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
    if not m:
        print(f'FAIL: opener regex did not match: {opener.rstrip()}', file=sys.stderr); sys.exit(1)
    async_kw = (m.group(2) or '').strip()
    orig_args = m.group(3).strip()
    new_args = orig_args + (', deps' if orig_args else 'deps')
    new_opener = f'const handleGenerate = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'
    destructure = f'  const {{ {", ".join(DEPS)} }} = deps;\n'
    body_inner = body_lines[1:-1]
    body_joined = ''.join(body_inner)
    for pattern, replacement in BODY_REWRITES_REGEX:
        body_joined = re.sub(pattern, replacement, body_joined)

    src_parts = [
        '// generate_dispatcher_source.jsx - Phase J of CDN modularization.\n',
        '// handleGenerate (2,286 lines) — the resource-generation dispatcher.\n',
        '// Switch-on-type router for simplified/glossary/quiz/outline/image/etc.\n',
        '\n',
        new_opener,
        destructure,
        '  try { if (window._DEBUG_GEN_DISPATCHER) console.log("[GenDispatcher] handleGenerate fired:", type); } catch(_) {}\n',
        body_joined,
        '};\n\n',
        'window.AlloModules = window.AlloModules || {};\n',
        'window.AlloModules.GenDispatcher = { handleGenerate };\n',
    ]

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_handle_generate'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = list(lines)

    indent = '  '
    deps_obj_parts = ['{\n']
    for d in DEPS:
        deps_obj_parts.append(f'{indent}      {d},\n')
    deps_obj_parts.append(f'{indent}    }}')
    deps_obj = ''.join(deps_obj_parts)

    call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
    sep = ', ' if call_args else ''
    shim = [
        f'{indent}const handleGenerate = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
        f'{indent}  const _m = window.AlloModules && window.AlloModules.GenDispatcher;\n',
        f'{indent}  if (_m && typeof _m.handleGenerate === "function") return _m.handleGenerate({call_args}{sep}{deps_obj});\n',
        f'{indent}  throw new Error("[handleGenerate] GenDispatcher module not loaded - reload the page");\n',
        f'{indent}}};\n',
    ]
    new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('GenDispatcherModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/generate_dispatcher_module.js');\n"
    if not any('GenDispatcherModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('CmapHandlersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
