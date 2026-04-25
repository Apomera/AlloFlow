#!/usr/bin/env python3
"""
Phase I.2: Extract 5 math handlers into math_helpers_module.js.
Standalone module (does NOT touch existing generation_helpers_module).

  - handleCheckMathWork (89) — Gemini-scored answer eval + XP award
  - handleGetMathHint (37) — progressive 3-tier hint generator
  - handleMathEdit (91) — edit problem set via Gemini (preserves taskType)
  - handleGenerateSimilar (22) — variation problem generator
  - handleGenerateOutcome (39) — outline-mode outcome predictor
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'math_helpers_source.jsx')

DEPS_HANDLE_CHECK_MATH_WORK = [
    'mathCheckResults', 'mathHintData',
    'setMathCheckResults',
    'addToast', 't', 'callGemini', 'warnLog', 'handleScoreUpdate',
]
DEPS_HANDLE_GET_MATH_HINT = [
    'mathHintData', 'studentResponses',
    'setMathHintData',
    'addToast', 'callGemini', 'warnLog',
]
DEPS_HANDLE_MATH_EDIT = [
    'generatedContent', 'leveledTextLanguage', 'gradeLevel', 'mathSubject',
    'setIsMathEditingChat', 'setGeneratedContent', 'setMathEditInput',
    'callGemini', 'cleanJson', 'safeJsonParse', 'addToast', 'warnLog',
]
DEPS_HANDLE_GENERATE_SIMILAR = [
    'generatedContent',
    'setIsProcessing', 'setMathInput',
    'addToast', 't', 'callGemini', 'warnLog', 'handleGenerateMath',
]
DEPS_HANDLE_GENERATE_OUTCOME = [
    'generatedContent',
    'setIsProcessing', 'setGenerationStep', 'setError',
    'addToast', 't', 'callGemini', 'warnLog', 'handleAddToMapList',
]

HANDLERS_INFO = [
    ('handleCheckMathWork', DEPS_HANDLE_CHECK_MATH_WORK),
    ('handleGetMathHint', DEPS_HANDLE_GET_MATH_HINT),
    ('handleMathEdit', DEPS_HANDLE_MATH_EDIT),
    ('handleGenerateSimilar', DEPS_HANDLE_GENERATE_SIMILAR),
    ('handleGenerateOutcome', DEPS_HANDLE_GENERATE_OUTCOME),
]

BODY_REWRITES_REGEX = []


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
        '// math_helpers_source.jsx - Phase I.2 of CDN modularization.\n',
        '// 5 math-related handlers extracted as a standalone module.\n',
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
        src_parts.append(f'  try {{ if (window._DEBUG_MATH_HELPERS) console.log("[MathHelpers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.MathHelpers = {\n')
    for hname, _ in HANDLERS_INFO:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_math_helpers'
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
            f'{indent}  const _m = window.AlloModules && window.AlloModules.MathHelpers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] MathHelpers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('MathHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/math_helpers_module.js');\n"
    if not any('MathHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('PureHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
