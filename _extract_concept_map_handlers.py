#!/usr/bin/env python3
"""
Phase I.3: Extract 6 mid-tier handlers into concept_map_handlers_module.js.

  - handleInitializeMap (130) — concept-map init (Venn / Flow / Outline)
  - handleAutoLayout (84) — concept-map auto-layout via Gemini
  - handleBatchGenerateForRoster (83) — batch resource gen across roster groups
  - handleGenerateLessonPlan (73) — lesson-plan generator
  - handleAutoCorrectSource (47) — discrepancy fixer for source text
  - handleRefinePanel (29) — visual-panel image edit

handleInitializeMap calls handleAutoLayout (sibling); BODY_REWRITES_REGEX
threads deps through so the inner destructure doesn't fail.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'concept_map_handlers_source.jsx')

DEPS_HANDLE_INITIALIZE_MAP = [
    'generatedContent', 'conceptMapNodes', 'conceptMapEdges',
    'mapContainerRef', 'hasAutoLayoutRunRef',
    'setConceptMapNodes', 'setConceptMapEdges', 'setIsConceptMapReady',
    'parseFlowChartData', 'handleAutoLayout', 'warnLog',
]
DEPS_HANDLE_AUTO_LAYOUT = [
    'generatedContent', 'conceptMapNodes', 'conceptMapEdges',
    'isFullscreen', 'isTeacherMode',
    'mapContainerRef',
    'setConceptMapNodes', 'setIsProcessing', 'setGenerationStep',
    'calculateFlowLayout', 'callGemini', 'safeJsonParse',
    't', 'addToast', 'playSound', 'warnLog',
]
DEPS_HANDLE_BATCH_GENERATE_FOR_ROSTER = [
    'rosterKey', 'history', 'inputText',
    'gradeLevel', 'leveledTextLanguage', 'studentInterests', 'dokLevel',
    'leveledTextCustomInstructions', 'selectedLanguages', 'targetStandards',
    'useEmojis', 'textFormat',
    'setGradeLevel', 'setLeveledTextLanguage', 'setStudentInterests',
    'setDokLevel', 'setLeveledTextCustomInstructions', 'setSelectedLanguages',
    'setTargetStandards', 'setStandardInputValue', 'setUseEmojis',
    'setTextFormat', 'setIsProcessing', 'setGenerationStep',
    'addToast', 't', 'warnLog',
    'handleGenerate',
]
DEPS_HANDLE_GENERATE_LESSON_PLAN = [
    'inputText', 'gradeLevel', 'isIndependentMode', 'isParentMode',
    'currentUiLanguage', 'lessonCustomAdditions', 'history',
    'alloBotRef',
    'setIsProcessing', 'setGenerationStep', 'setGeneratedContent',
    'setActiveView', 'setHistory', 'setError',
    'addToast', 't', 'callGemini', 'cleanJson', 'safeJsonParse', 'warnLog',
    'getLessonContext', 'getAssetManifest',
    'buildStudyGuidePrompt', 'buildParentGuidePrompt', 'buildLessonPlanPrompt',
    'flyToElement',
]
DEPS_HANDLE_AUTO_CORRECT_SOURCE = [
    'generatedContent', 'selectedDiscrepancies', 'inputText',
    'setIsProcessing', 'setGenerationStep', 'setInputText', 'setError',
    'addToast', 't', 'callGemini', 'warnLog',
    'chunkText', 'handleGenerate',
]
DEPS_HANDLE_REFINE_PANEL = [
    'generatedContent',
    'setIsProcessing', 'setGenerationStep', 'setGeneratedContent', 'setHistory',
    'addToast', 't', 'warnLog',
    'callGeminiImageEdit',
]

HANDLERS_INFO = [
    ('handleInitializeMap', DEPS_HANDLE_INITIALIZE_MAP),
    ('handleAutoLayout', DEPS_HANDLE_AUTO_LAYOUT),
    ('handleBatchGenerateForRoster', DEPS_HANDLE_BATCH_GENERATE_FOR_ROSTER),
    ('handleGenerateLessonPlan', DEPS_HANDLE_GENERATE_LESSON_PLAN),
    ('handleAutoCorrectSource', DEPS_HANDLE_AUTO_CORRECT_SOURCE),
    ('handleRefinePanel', DEPS_HANDLE_REFINE_PANEL),
]

# handleInitializeMap calls handleAutoLayout (sibling). Thread deps through
# so the inner destructure doesn't blow up.
BODY_REWRITES_REGEX = [
    (
        r'\bawait handleAutoLayout\(newNodes, newEdges\)',
        'await handleAutoLayout(newNodes, newEdges, deps)',
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
            print(f'FAIL: cannot find {hname}', file=sys.stderr); sys.exit(1)
        end = find_end(lines, start)
        if end is None:
            print(f'FAIL: cannot bracket-match {hname} at line {start}', file=sys.stderr); sys.exit(1)
        handler_locations.append((hname, start, end, deps))
        print(f'[verify] {hname}: lines {start}-{end} ({end-start+1} lines, {len(deps)} deps)')

    src_parts = [
        '// concept_map_handlers_source.jsx - Phase I.3 of CDN modularization.\n',
        '// 6 mid-tier handlers covering concept-map init/layout, batch roster\n',
        '// generation, lesson plans, source auto-correct, and visual panel refine.\n',
        '\n',
    ]

    for hname, start, end, deps in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        if not m:
            print(f'FAIL: opener regex did not match for {hname}: {opener.rstrip()}', file=sys.stderr); sys.exit(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        new_args = orig_args + (', deps' if orig_args else 'deps')
        new_opener = f'const {hname} = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'
        destructure = f'  const {{ {", ".join(deps)} }} = deps;\n'
        body_inner = body_lines[1:-1]
        body_joined = ''.join(body_inner)
        for pattern, replacement in BODY_REWRITES_REGEX:
            body_joined = re.sub(pattern, replacement, body_joined)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_CMAP_HANDLERS) console.log("[CmapHandlers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.CmapHandlers = {\n')
    for hname, _ in HANDLERS_INFO:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_cmap_handlers'
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
        sep = ', ' if call_args else ''
        shim = [
            f'{indent}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent}  const _m = window.AlloModules && window.AlloModules.CmapHandlers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] CmapHandlers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('CmapHandlersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/concept_map_handlers_module.js');\n"
    if not any('CmapHandlersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('MathHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
