#!/usr/bin/env python3
"""
Phase M: Extract 5 text utility helpers into text_utility_helpers_module.js.

Targets (all plain const, no useCallback wrap):
  - highlightGlossaryTerms (~95 lines, pure)
  - repairGeneratedText (~95 lines, async, callGemini)
  - getReadableContent (~88 lines, pure HTML/text extraction)
  - generateHelpfulHint (~99 lines, async helper)
  - generateWordSearch (~99 lines, glossary game generator)

All 5 are already referenced as deps in 3 existing modules (Phase K, udl_chat,
generate_dispatcher), which keep working unchanged: their destructure pulls
the shim, the shim forwards to the new module.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'text_utility_helpers_source.jsx')

SEED_DEPS = [
    # --- State VALUES ---
    'gradeLevel', 'leveledTextLanguage', 'currentUiLanguage',
    'selectedLanguages', 'studentInterests', 'sourceTopic', 'inputText',
    'history', 'generatedContent', 'apiKey',
    'glossaryDefinitionLevel', 'wordSearchLang',
    'creativeMode', 'standardsInput', 'targetStandards', 'dokLevel',
    # --- Refs ---
    'alloBotRef',
    'isLineFocusMode', 'clozeInstanceSet',
    # --- Setters ---
    'setGeneratedContent', 'setHistory', 'setError',
    'setIsProcessing', 'setGenerationStep',
    'setHelpfulHint', 'setHintHistory',
    'setClozeInstanceSet',
    'setFoundWords', 'setGameData', 'setGameMode',
    'setSelectedLetters', 'setShowWordSearchAnswers',
    # --- Helpers ---
    'addToast', 't', 'warnLog', 'debugLog',
    'callGemini', 'cleanJson', 'safeJsonParse',
    'sanitizeTruncatedCitations', 'normalizeResourceLinks',
    'fetchTTSBytes', 'callTTS',
    'playSound', 'handleScoreUpdate', 'getDefaultTitle',
    # --- Components used inside JSX ---
    'ClozeInput',
    # Possible sibling calls (auditor will tell us)
    'highlightGlossaryTerms', 'repairGeneratedText', 'getReadableContent',
    'generateHelpfulHint',
]

HANDLERS = [
    'highlightGlossaryTerms',
    'repairGeneratedText',
    # 'getReadableContent',  # is useCallback; defer to a future phase
    'generateHelpfulHint',
    'generateWordSearch',
]

# Sibling calls within the module — thread deps through if any handler
# invokes another from this same set. Auditor will surface need.
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
        '// text_utility_helpers_source.jsx -- Phase M of CDN modularization.\n',
        '// 5 text/glossary helpers: highlightGlossaryTerms, repairGeneratedText,\n',
        '// getReadableContent, generateHelpfulHint, generateWordSearch.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            print(f'FAIL: {hname} is useCallback - Phase M extractor expects plain const only', file=sys.stderr); sys.exit(1)
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
        src_parts.append(f'  try {{ if (window._DEBUG_PHASE_M) console.log("[PhaseM] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.TextUtilityHelpers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_phase_m'
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
            f'{indent_str}  const _m = window.AlloModules && window.AlloModules.TextUtilityHelpers;\n',
            f'{indent_str}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent_str}  throw new Error("[{hname}] TextUtilityHelpers module not loaded - reload the page");\n',
            f'{indent_str}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('TextUtilityHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/text_utility_helpers_module.js');\n"
    if not any('TextUtilityHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('AdventureSessionHandlersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
