#!/usr/bin/env python3
"""
Phase N: Extract 6 mid-tier helpers spanning glossary, generation, formatting.

Targets (all plain const, no useCallback wrap):
  - handleQuickAddGlossary (~88 lines)
  - handleAddGlossaryTerm (~63 lines)
  - handleGeneratePOSData (~77 lines)
  - handleMasteryGrading (~75 lines)
  - formatInteractiveText (~77 lines)
  - handleCheckLevel (~68 lines)

Mirrors Phase M structure. Auditor will catch missing seed deps.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'phase_n_misc_helpers_source.jsx')

SEED_DEPS = [
    # --- State VALUES ---
    'gradeLevel', 'leveledTextLanguage', 'currentUiLanguage',
    'selectedLanguages', 'studentInterests', 'sourceTopic', 'inputText',
    'history', 'generatedContent', 'apiKey',
    'standardsInput', 'targetStandards', 'dokLevel',
    'isLineFocusMode', 'clozeInstanceSet',
    'glossaryDefinitionLevel', 'glossaryImageStyle',
    'newGlossaryTerm',
    'isAutoFillMode', 'isShowMeMode', 'autoRemoveWords',
    'creativeMode', 'enableEmojiInline', 'useEmojis',
    'isAnalyzingPos', 'focusMode', 'latestGlossary', 'toFocusText',
    # --- Refs ---
    'alloBotRef',
    # --- Setters ---
    'setGeneratedContent', 'setHistory', 'setError',
    'setIsProcessing', 'setGenerationStep',
    'setNewGlossaryTerm', 'setClozeInstanceSet',
    'setGlossaryHealthIssues', 'setIsCheckingGlossaryHealth',
    'setMasteryResult', 'setIsGradingMastery',
    'setIsCheckingLevel', 'setLevelCheckResult',
    'setIsGeneratingPOS', 'setIsAnalyzingPos', 'setIsAddingTerm',
    # --- Helpers ---
    'addToast', 't', 'warnLog', 'debugLog',
    'callGemini', 'callGeminiVision', 'callImagen', 'callGeminiImageEdit',
    'cleanJson', 'safeJsonParse',
    'sanitizeTruncatedCitations', 'normalizeResourceLinks',
    'highlightGlossaryTerms', 'repairGeneratedText',
    'getReadableContent', 'extractSourceTextForProcessing',
    'calculateReadability', 'countWords',
    'playSound', 'handleScoreUpdate', 'getDefaultTitle',
    'parseTaggedContent', 'chunkText', '_stripForImmersive',
    'validateDraftQuality',
    # --- Top-level constants ---
    'RELEVANCE_GATE_PROMPT',
    # --- Components ---
    'ClozeInput', 'MathSymbol',
]

HANDLERS = [
    'handleQuickAddGlossary',
    'handleAddGlossaryTerm',
    'handleGeneratePOSData',
    'handleMasteryGrading',
    'formatInteractiveText',
    'handleCheckLevel',
]

BODY_REWRITES_REGEX = []


def find_indent2_close(lines, start_1based):
    target = '  };'
    for i in range(start_1based, len(lines)):
        if lines[i].rstrip() == target:
            return i + 1
    return None


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    handler_locations = []
    for hname in HANDLERS:
        pat = re.compile(r'^\s*const\s+' + re.escape(hname) + r'\s*=')
        start = None
        for i, ln in enumerate(lines):
            if pat.match(ln):
                start = i + 1
                break
        if start is None:
            print(f'FAIL: cannot find {hname}', file=sys.stderr); sys.exit(1)
        end = find_indent2_close(lines, start)
        if end is None:
            print(f'FAIL: cannot bracket-match {hname} at line {start}', file=sys.stderr); sys.exit(1)
        handler_locations.append((hname, start, end))
        print(f'[verify] {hname}: lines {start}-{end} ({end-start+1} lines)')

    src_parts = [
        '// phase_n_misc_helpers_source.jsx -- Phase N of CDN modularization.\n',
        '// 6 mid-tier helpers: handleQuickAddGlossary, handleAddGlossaryTerm,\n',
        '// handleGeneratePOSData, handleMasteryGrading, formatInteractiveText,\n',
        '// handleCheckLevel.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            print(f'FAIL: {hname} is useCallback - Phase N extractor expects plain const only', file=sys.stderr); sys.exit(1)
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        if not m:
            print(f'FAIL: opener regex did not match for {hname}: {opener.rstrip()}', file=sys.stderr); sys.exit(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        new_args = orig_args + (', deps' if orig_args else 'deps')
        new_opener = f'const {hname} = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'

        destructure = f'  const {{ {", ".join(SEED_DEPS)} }} = deps;\n'
        body_inner = body_lines[1:-1]
        body_joined = ''.join(body_inner)

        for pattern, replacement in BODY_REWRITES_REGEX:
            body_joined = re.sub(pattern, replacement, body_joined)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_PHASE_N) console.log("[PhaseN] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.PhaseNHelpers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_phase_n'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = list(lines)
    indent = '  '
    deps_obj_parts = ['{\n']
    for d in SEED_DEPS:
        deps_obj_parts.append(f'{indent}      {d},\n')
    deps_obj_parts.append(f'{indent}    }}')
    deps_obj = ''.join(deps_obj_parts)

    for hname, start, end in sorted(handler_locations, key=lambda x: -x[1]):
        opener = new_lines[start-1]
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        indent_str = m.group(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
        sep = ', ' if call_args else ''
        shim = [
            f'{indent_str}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent_str}  const _m = window.AlloModules && window.AlloModules.PhaseNHelpers;\n',
            f'{indent_str}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent_str}  throw new Error("[{hname}] PhaseNHelpers module not loaded - reload the page");\n',
            f'{indent_str}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('PhaseNHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/phase_n_misc_helpers_module.js');\n"
    if not any('PhaseNHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('TextUtilityHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
