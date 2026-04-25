#!/usr/bin/env python3
"""
Extracts pure text/citation/source helpers + DOM_TO_TOOL_ID_MAP from
AlloFlowANTI.txt into text_pipeline_helpers_source.jsx, then writes shim
replacements back to AlloFlowANTI.txt. Idempotent: aborts if any expected
opener line doesn't match (signal that the file has drifted since
extraction was planned).

Per the monolith-extraction-pattern memory:
  1. Verify opener lines match expectations
  2. Extract ranges to source.jsx with header + factory wrapper
  3. Backup before edit
  4. Replace ranges with shims (in reverse order so earlier offsets stay valid)
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'text_pipeline_helpers_source.jsx')

# Each entry: (start_line_1based, end_line_1based, expected_opener_substring, name, kind)
# kind: 'fn' = const NAME = (...) => {...}; 'data' = const NAME = {...};
TARGETS = [
    (3038, 3077, 'const generateBilingualText',         'generateBilingualText',         'fn'),
    (3081, 3097, 'const extractSourceTextForProcessing','extractSourceTextForProcessing','fn'),
    (3103, 3115, 'const scrambleWord',                  'scrambleWord',                  'fn'),
    (3116, 3122, 'const toSuperscript',                 'toSuperscript',                 'fn'),
    (3123, 3130, 'const fixCitationPlacement',          'fixCitationPlacement',          'fn'),
    (3131, 3239, 'const processMathHTML',               'processMathHTML',               'fn'),
    (3304, 3344, 'const sanitizeTruncatedCitations',    'sanitizeTruncatedCitations',    'fn'),
    (3345, 3390, 'const normalizeCitationPlacement',    'normalizeCitationPlacement',    'fn'),
    (3392, 3403, 'const filterEducationalSources',      'filterEducationalSources',      'fn'),
    (3404, 3416, 'const generateBibliographyString',    'generateBibliographyString',    'fn'),
    (14048, 14131, 'const parseTaggedContent',          'parseTaggedContent',            'fn'),
    (7777, 8011,  'const DOM_TO_TOOL_ID_MAP',           'DOM_TO_TOOL_ID_MAP',            'data'),
]


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Step 1 — verify opener lines match expectations.
    for start, end, expected, name, kind in TARGETS:
        actual = lines[start - 1]
        if expected not in actual:
            print(f'FAIL: line {start} expected "{expected}", got: {actual.rstrip()}', file=sys.stderr)
            sys.exit(1)
    print('[verify] all opener lines match expectations.')

    # Step 2 — extract bodies.
    bodies = {}
    for start, end, expected, name, kind in TARGETS:
        bodies[name] = ''.join(lines[start - 1:end])

    # Step 3 — write source.jsx.
    parts = []
    parts.append('// text_pipeline_helpers_source.jsx — pure text/citation/source helpers + DOM_TO_TOOL_ID_MAP\n')
    parts.append('// Extracted from AlloFlowANTI.txt 2026-04-24 (Phase C of CDN modularization).\n')
    parts.append('// All functions are pure (no React state-setter calls, no closure captures of\n')
    parts.append('// component state). DOM_TO_TOOL_ID_MAP is a static lookup that was previously\n')
    parts.append('// re-created on every React render — exporting it as module data fixes that perf bug.\n//\n')
    parts.append('// Note: generateBibliographyString depends on filterEducationalSources (within-module).\n')
    parts.append('\n')

    for start, end, expected, name, kind in TARGETS:
        body = bodies[name]
        # The body already starts with `const NAME = ...` and ends with `};`.
        parts.append(body)
        if not body.endswith('\n'):
            parts.append('\n')
        parts.append('\n')

    parts.append('// Factory: takes no parameters (all helpers are pure). Returns the registry.\n')
    parts.append('const createTextPipelineHelpers = () => ({\n')
    for start, end, expected, name, kind in TARGETS:
        parts.append(f'  {name},\n')
    parts.append('});\n\n')
    parts.append('// Window registration; the build script wraps this in an IIFE so the\n')
    parts.append('// registration only fires once per page load.\n')
    parts.append('window.AlloModules = window.AlloModules || {};\n')
    parts.append('window.AlloModules.createTextPipelineHelpers = createTextPipelineHelpers;\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(parts)
    print(f'[extract] wrote {SOURCE_OUT} ({sum(1 for _ in open(SOURCE_OUT,encoding="utf-8"))} lines)')

    # Step 4 — backup AlloFlowANTI.txt before edit.
    backup = MONOLITH + '.bak.pre_text_pipeline_helpers'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    # Step 5 — splice shim replacements (in REVERSE order so earlier offsets stay valid).
    new_lines = list(lines)
    for start, end, expected, name, kind in sorted(TARGETS, reverse=True):
        # Capture indent of the original line for shim formatting.
        original = lines[start - 1]
        indent = original[:len(original) - len(original.lstrip())]

        if kind == 'fn':
            # Build a shim that delegates to the module with inline-fallback.
            # The shim preserves the original signature; we re-use the original
            # body as the fallback to guarantee byte-identical behavior on race.
            #
            # The signature: extract `(args)` from the original opener.
            sig_match = re.search(r'=\s*(async\s+)?(\([^)]*\))\s*=>', original)
            if not sig_match:
                print(f'FAIL: cannot parse signature on line {start}: {original}', file=sys.stderr)
                sys.exit(1)
            async_kw = (sig_match.group(1) or '').strip()
            sig = sig_match.group(2)
            args_inner = sig.strip('()').strip()
            # `args_inner` is the parameter list (possibly with destructuring/defaults).
            # For the delegating call, strip default values so we pass the raw refs.
            #   "x, y = 1" -> "x, y"
            call_args = ', '.join(p.strip().split('=')[0].strip().lstrip('{').rstrip('}').split(':')[0].strip() for p in args_inner.split(','))
            # Build the shim — the fallback inline body is the original lines
            # (start+1 .. end-1) so anything other than the opener and closer.
            shim_open = f'{indent}const {name} = {async_kw + " " if async_kw else ""}{sig} => {{\n'
            shim_call = f'{indent}    const _m = window.AlloModules && window.AlloModules.TextPipelineHelpers;\n'
            shim_call += f'{indent}    if (_m && typeof _m.{name} === \'function\') return _m.{name}({call_args});\n'
            shim_call += f'{indent}    // Fallback inline body if TextPipelineHelpers failed to load.\n'
            # Inline fallback = original body lines without opener/closer.
            inner_body_lines = lines[start:end - 1]
            shim_close = f'{indent}}};\n'
            replacement = [shim_open, shim_call] + inner_body_lines + [shim_close]
        else:  # data
            # DOM_TO_TOOL_ID_MAP — replace with module lookup, preserve fallback.
            shim = (
                f'{indent}// Lifted to text_pipeline_helpers_module.js. Re-created at module-level\n'
                f'{indent}// instead of per-render, fixing a perf bug. Inline fallback for race-safety.\n'
                f'{indent}const {name} = (window.AlloModules && window.AlloModules.TextPipelineHelpers && window.AlloModules.TextPipelineHelpers.{name}) || '
            )
            inner_body_lines = lines[start:end - 1]
            # The closing `};` becomes the close of an inline-fallback object literal.
            replacement = [shim + '{\n'] + inner_body_lines + [f'{indent}}};\n']

        # Splice in.
        new_lines[start - 1:end] = replacement

    # Add loadModule entry next to other module loads. Search for the
    # PromptsLibraryModule line to anchor the insertion (it was the most
    # recent extraction Phase A added).
    insert_idx = None
    for i, ln in enumerate(new_lines):
        if "loadModule('PromptsLibraryModule'" in ln:
            insert_idx = i + 1
            break
    if insert_idx is None:
        print('FAIL: cannot find PromptsLibraryModule loadModule line for anchoring', file=sys.stderr)
        sys.exit(1)

    indent = '    '
    load_block = [
        f"{indent}// TextPipelineHelpers — pure citation/text/source helpers + DOM_TO_TOOL_ID_MAP.\n",
        f"{indent}// Module self-instantiates; the inline shims above delegate to\n",
        f"{indent}// window.AlloModules.TextPipelineHelpers if loaded, fall back inline if not.\n",
        f"{indent}loadModule('TextPipelineHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@8944acc/text_pipeline_helpers_module.js');\n",
    ]
    new_lines[insert_idx:insert_idx] = load_block

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    deleted = sum(end - start + 1 for start, end, *_ in TARGETS)
    added = (
        sum(4 + (end - start + 1) for start, end, _, _, kind in TARGETS if kind == 'fn')
        + sum(3 + (end - start + 1) for start, end, _, _, kind in TARGETS if kind == 'data')
        + len(load_block)
    )
    print(f'[edit] AlloFlowANTI.txt: ~{deleted} lines deleted, ~{added} added.')
    print('[edit] Net delta: ~{} lines.'.format(added - deleted))

if __name__ == '__main__':
    main()
