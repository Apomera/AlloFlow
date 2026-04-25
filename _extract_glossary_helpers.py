#!/usr/bin/env python3
"""
Phase G.1: Extract applyAIConfig + handleGenerateTermEtymology from
AlloFlowANTI.txt into glossary_helpers_module.js.

Both are pure-ish: applyAIConfig reads a config arg + calls 20 setters;
handleGenerateTermEtymology builds a Gemini prompt + parses JSON + writes
generatedContent. No JSX, no React component returns. Same (args, deps)
shim pattern as Phase E/F.

Lessons applied:
  * Inject the loadModule line so a future restore-from-backup is
    self-healing (Phase F lost this on a backup restore).
  * Two-tier deps with typeof guards for any uncertain identifier.
  * Audit script (c:/tmp/audit_glossary_deps.py) verifies zero missing
    bare refs before the module ships.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'glossary_helpers_source.jsx')

HANDLERS = ['applyAIConfig', 'handleGenerateTermEtymology']

DEPS_VERIFIED = [
    # State VALUES read by handlers. NOTE: 'effectiveLanguage' is intentionally
    # NOT here — it's a local const declared inside handleGenerate (line ~20507),
    # NOT a top-level closure var. Including it broke the shim with
    # ReferenceError. Module body now uses leveledTextLanguage directly.
    'inputText', 'selectedLanguages', 'studentInterests', 'generatedContent',
    'gradeLevel', 'leveledTextLanguage',
    # State SETTERS (applyAIConfig)
    'setGradeLevel', 'setSourceTopic', 'setInputText', 'setSelectedLanguages',
    'setLeveledTextLanguage', 'setStudentInterests', 'setLeveledTextCustomInstructions',
    'setSourceTone', 'setSourceLength', 'setTextFormat', 'setDokLevel', 'setVisualStyle',
    'setIncludeSourceCitations', 'setFullPackTargetGroup', 'setDifferentiationRange',
    'setTargetStandards', 'setVoiceSpeed', 'setVoiceVolume', 'setSelectedVoice',
    # State SETTERS (handleGenerateTermEtymology)
    'setIsGeneratingEtymology', 'setGeneratedContent', 'setHistory',
    # Helpers
    'callGemini', 'warnLog', 'addToast', 't',
]

DEPS_UNCERTAIN = []  # All deps verified; nothing uncertain.

# Body rewrites — apply to the extracted source after dumping handler bodies.
# Maps `bare_ref_in_original` -> `replacement_in_module`.
BODY_REWRITES = {
    # effectiveLanguage was a local const inside handleGenerate; in the etymology
    # context (where this rewrite applies), it equals leveledTextLanguage since
    # there's no langOverride arg. Use the top-level state directly.
    'effectiveLanguage': 'leveledTextLanguage',
}

ALL_DEPS = DEPS_VERIFIED + DEPS_UNCERTAIN


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
    for hname in HANDLERS:
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
        handler_locations.append((hname, start, end))
        print(f'[verify] {hname}: lines {start}-{end} ({end-start+1} lines)')

    src_parts = [
        '// glossary_helpers_source.jsx - Phase G.1 of CDN modularization.\n',
        '// applyAIConfig + handleGenerateTermEtymology lifted out of AlloFlowANTI.txt\n',
        '// 2026-04-25 using the (args, deps) shim pattern.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
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
        destructure = f'  const {{ {", ".join(ALL_DEPS)} }} = deps;\n'
        body_inner = body_lines[1:-1]
        # Apply BODY_REWRITES to substitute closure-local refs that aren't
        # in the component-body scope where shims sit.
        rewritten_body = []
        for ln in body_inner:
            new_ln = ln
            for old, new in BODY_REWRITES.items():
                # Word-boundary replace, preserving non-bare uses (e.g.
                # `obj.effectiveLanguage` would still match \b but we don't
                # have any of those in this case).
                new_ln = re.sub(r'\b' + re.escape(old) + r'\b', new, new_ln)
            rewritten_body.append(new_ln)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_GLOSSARY) console.log("[GlossaryHelpers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.extend(rewritten_body)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.GlossaryHelpers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_glossary_helpers'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = list(lines)

    def build_deps_obj(indent_str):
        parts = ['{\n']
        for d in DEPS_VERIFIED:
            parts.append(f'{indent_str}      {d},\n')
        for d in DEPS_UNCERTAIN:
            parts.append(f"{indent_str}      {d}: typeof {d} !== 'undefined' ? {d} : undefined,\n")
        parts.append(f'{indent_str}    }}')
        return ''.join(parts)

    for hname, start, end in sorted(handler_locations, key=lambda x: -x[1]):
        opener = new_lines[start-1]
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        indent = m.group(1)
        async_kw = (m.group(2) or '').strip()
        orig_args = m.group(3).strip()
        call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
        deps_obj = build_deps_obj(indent)
        shim = [
            f'{indent}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent}  const _m = window.AlloModules && window.AlloModules.GlossaryHelpers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args + (", " if call_args else "")}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] GlossaryHelpers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    # Inject loadModule wiring so restore-from-backup is self-healing.
    LOADER_LINE = "    loadModule('GlossaryHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/glossary_helpers_module.js');\n"
    if not any('GlossaryHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('AdventureHandlersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
