#!/usr/bin/env python3
"""
Phase H.2: Extract handleGenerateMath + handleGenerateFullPack +
handleComplexityAdjustment into generation_helpers_module.js.

Three non-JSX async handlers (~630 lines total):
  - handleGenerateMath (267) — STEM/math problem-set generator with
    Freeform Builder, Problem Set Generator, and Tutor modes.
  - handleGenerateFullPack (226) — batch resource generator that calls
    handleGenerate per resource type. Has a self-recursive branch for
    multi-group roster runs (one call per group).
  - handleComplexityAdjustment (137) — slider-driven content rewriter
    that re-runs Gemini at a different complexity level.

Lessons applied:
  * Per-handler deps lists, comprehensive.
  * Self-recursive call rewrite — handleGenerateFullPack calls itself
    inside the module; recursive-call site rewritten to pass deps so
    the inner destructure doesn't blow up on undefined.
  * Self-injecting loadModule wiring.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'generation_helpers_source.jsx')

DEPS_HANDLE_GENERATE_MATH = [
    # State VALUES
    'mathInput', 'history', 'inputText', 'useMathSourceContext',
    'studentInterests', 'gradeLevel', 'mathMode', 'mathSubject', 'mathQuantity',
    'autoAttachManipulatives', 'leveledTextLanguage', 'isMathGraphEnabled',
    'autoSnapshotManipulatives',
    # State SETTERS
    'setIsProcessing', 'setGenerationStep', 'setError', 'setGeneratedContent',
    'setActiveView', 'setShowMathAnswers', 'setHistory', 'setToolSnapshots',
    # Helpers
    'addToast', 't', 'callGemini', 'cleanJson', 'safeJsonParse', 'warnLog',
    'verifyMathProblems', 'flyToElement',
]

DEPS_HANDLE_GENERATE_FULL_PACK = [
    # State VALUES
    'isProcessing', 'fullPackTargetGroup', 'rosterKey',
    'gradeLevel', 'leveledTextLanguage', 'studentInterests', 'dokLevel',
    'leveledTextCustomInstructions', 'selectedLanguages', 'targetStandards',
    'useEmojis', 'textFormat', 'history', 'inputText', 'sourceTopic',
    'standardsInput', 'resourceCount', 'isAutoConfigEnabled',
    'quizCustomInstructions', 'adventureCustomInstructions',
    'frameCustomInstructions', 'brainstormCustomInstructions',
    'faqCustomInstructions', 'outlineCustomInstructions',
    'visualCustomInstructions', 'timelineTopic', 'lessonCustomAdditions',
    'conceptInput',
    # State SETTERS
    'setIsProcessing', 'setGenerationStep', 'setFullPackTargetGroup',
    'setGradeLevel', 'setLeveledTextLanguage', 'setStudentInterests',
    'setDokLevel', 'setLeveledTextCustomInstructions', 'setSelectedLanguages',
    'setTargetStandards', 'setUseEmojis', 'setTextFormat',
    'setPersistedLessonDNA', 'setError',
    # Helpers
    'addToast', 't', 'warnLog',
    'handleApplyRosterGroup', 'handleGenerate', 'autoConfigureSettings',
    'applyDetailedAutoConfig', 'getGroupDifferentiationContext',
    'getAssetManifest',
]

DEPS_HANDLE_COMPLEXITY_ADJUSTMENT = [
    # State VALUES
    'complexityLevel', 'generatedContent', 'gradeLevel', 'leveledTextLanguage',
    'saveOriginalOnAdjust', 'generatedTerms',
    # State SETTERS
    'setIsProcessing', 'setGeneratedContent', 'setHistory', 'setError',
    'setComplexityLevel', 'setWordSoundsCustomTerms', 'setWsPreloadedWords',
    # Helpers
    'callGemini', 'cleanJson', 'addToast', 't', 'warnLog',
    'extractSourceTextForProcessing', 'generateBilingualText', 'getDefaultTitle',
]

HANDLERS_INFO = [
    ('handleGenerateMath', DEPS_HANDLE_GENERATE_MATH),
    ('handleGenerateFullPack', DEPS_HANDLE_GENERATE_FULL_PACK),
    ('handleComplexityAdjustment', DEPS_HANDLE_COMPLEXITY_ADJUSTMENT),
]

# Body rewrites — applied to extracted source bodies before write.
# Use (regex_pattern, replacement) tuples. Word-boundary handling is up
# to the caller's pattern.
BODY_REWRITES_REGEX = [
    # handleGenerateFullPack recursive self-call: needs to thread deps
    # through so the inner destructure doesn't fail on `const { ... } = undefined`.
    (
        r'\bhandleGenerateFullPack\(chatContextOverride\)',
        'handleGenerateFullPack(chatContextOverride, deps)',
    ),
]


def find_end(lines, start_1based):
    indent = lines[start_1based-1][:len(lines[start_1based-1]) - len(lines[start_1based-1].lstrip())]
    for i in range(start_1based, len(lines)):
        if lines[i].rstrip() == indent + '};':
            return i + 1
    return None


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    handler_locations = []
    for hname, deps in HANDLERS_INFO:
        pat = re.compile(r'^\s*const\s+' + re.escape(hname) + r'\s*=')
        start = None
        for i, ln in enumerate(lines):
            if pat.match(ln):
                start = i + 1
                break
        if start is None:
            print(f'FAIL: cannot find {hname}', file=sys.stderr)
            sys.exit(1)
        end = find_end(lines, start)
        if end is None:
            print(f'FAIL: cannot bracket-match {hname} at line {start}', file=sys.stderr)
            sys.exit(1)
        handler_locations.append((hname, start, end, deps))
        print(f'[verify] {hname}: lines {start}-{end} ({end-start+1} lines, {len(deps)} deps)')

    src_parts = [
        '// generation_helpers_source.jsx - Phase H.2 of CDN modularization.\n',
        '// handleGenerateMath + handleGenerateFullPack + handleComplexityAdjustment\n',
        '// extracted from AlloFlowANTI.txt 2026-04-25.\n',
        '\n',
    ]

    for hname, start, end, deps in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        if not m:
            print(f'FAIL: opener regex did not match for {hname}: {opener.rstrip()}', file=sys.stderr)
            sys.exit(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        new_args = orig_args + (', deps' if orig_args else 'deps')
        new_opener = f'const {hname} = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'
        destructure = f'  const {{ {", ".join(deps)} }} = deps;\n'
        body_inner = body_lines[1:-1]
        rewritten_body = []
        for ln in body_inner:
            new_ln = ln
            for pattern, replacement in BODY_REWRITES_REGEX:
                new_ln = re.sub(pattern, replacement, new_ln)
            rewritten_body.append(new_ln)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_GEN_HELPERS) console.log("[GenerationHelpers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.extend(rewritten_body)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.GenerationHelpers = {\n')
    for hname, _ in HANDLERS_INFO:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_generation_helpers'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = list(lines)

    def build_deps_obj(indent_str, deps):
        parts = ['{\n']
        for d in deps:
            parts.append(f'{indent_str}      {d},\n')
        parts.append(f'{indent_str}    }}')
        return ''.join(parts)

    for hname, start, end, deps in sorted(handler_locations, key=lambda x: -x[1]):
        opener = new_lines[start-1]
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        indent = m.group(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
        deps_obj = build_deps_obj(indent, deps)
        shim = [
            f'{indent}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent}  const _m = window.AlloModules && window.AlloModules.GenerationHelpers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args + (", " if call_args else "")}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] GenerationHelpers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('GenerationHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/generation_helpers_module.js');\n"
    if not any('GenerationHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('AudioHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
