#!/usr/bin/env python3
"""
JSX-aware bare-ref auditor for extracted CDN module sources.

Why this exists:
  Phase G.2 view_renderers_source.jsx hit FOUR runtime ReferenceErrors
  in a row (isEditingOutline, isMapLocked, draggedNodeId,
  connectingSourceId) because the previous regex-based bare-ref
  extractor mis-parsed JSX-attribute curly expressions like
  `<input value={connectingSourceId}>` and skipped past the bare ref.
  Same blindspot would hit any future JSX extraction.

Approach:
  Compile the source.jsx through esbuild (--jsx=transform) FIRST. The
  compiled output replaces every JSX node with `React.createElement(...)`
  calls, so every ${expression} interpolation and `{x}` JSX expression
  becomes a plain JS identifier reference. Run the bare-ref audit on
  THAT — no JSX parsing in regex needed.

What it checks (per extracted function):
  - Bare-ref identifiers in the body
  - Subtract: function params, locals declared in body, deps destructured
    at the top, JS/browser globals, JSX/SVG element tag names
  - Cross with: monolith useState val/setter, useReducer state/dispatch,
    useRef, file-top consts, react-body consts at indent 2, and
    destructured-from-state-object bindings (csState, adventureState, etc.)
  - Report any identifier in the body that's in monolith-state but not in
    deps. Those are missing deps.
  - Also flag identifiers NOT in monolith-state-set with len>=4 as
    "review" — likely property keys or false positives, but worth eyeing.

Usage:
  python _audit_extracted_module.py <source.jsx>

Exit codes:
  0  -- no missing deps detected
  1  -- one or more missing deps (build-fail signal for CI)
"""
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')

if len(sys.argv) < 2:
    print('usage: python _audit_extracted_module.py <source.jsx>', file=sys.stderr)
    sys.exit(2)

SOURCE = os.path.abspath(sys.argv[1])
if not os.path.exists(SOURCE):
    print(f'source not found: {SOURCE}', file=sys.stderr)
    sys.exit(2)

with open(SOURCE, 'r', encoding='utf-8') as f:
    source = f.read()


# ─── Step 1: compile JSX to plain JS via esbuild ─────────────────────────

def compile_jsx(src):
    """Run esbuild --jsx=transform on the source; return compiled JS."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsx', delete=False, encoding='utf-8') as f:
        # Wrap with a global declaration so esbuild doesn't complain about React.
        f.write('/* global React */\n')
        f.write(src)
        tmp_in = f.name
    tmp_out = tmp_in + '.compiled.js'
    try:
        subprocess.run(
            ['npx', 'esbuild', tmp_in, '--bundle=false', '--format=esm',
             '--jsx=transform', '--jsx-factory=React.createElement',
             '--jsx-fragment=React.Fragment',
             f'--outfile={tmp_out}', '--target=es2020'],
            check=True, capture_output=True, cwd=ROOT, shell=True
        )
        with open(tmp_out, 'r', encoding='utf-8') as f:
            return f.read()
    except subprocess.CalledProcessError as e:
        print(f'esbuild failed:\n{e.stderr.decode("utf-8", errors="replace")}', file=sys.stderr)
        sys.exit(2)
    finally:
        for p in (tmp_in, tmp_out):
            try: os.unlink(p)
            except OSError: pass


print(f'[audit] compiling {os.path.basename(SOURCE)} via esbuild...')
compiled = compile_jsx(source)


# ─── Step 2: build the monolith state set ────────────────────────────────

with open(MONOLITH, 'r', encoding='utf-8') as f:
    monolith = f.read()
monolith_lines = monolith.splitlines()

state_set = set()
# useState val/setter
for m in re.finditer(r'\bconst\s*\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*(set[A-Za-z0-9_$]*)\s*\]\s*=\s*useState', monolith):
    state_set.add(m.group(1)); state_set.add(m.group(2))
# useReducer state/dispatch
for m in re.finditer(r'\bconst\s*\[\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\]\s*=\s*useReducer', monolith):
    state_set.add(m.group(1)); state_set.add(m.group(2))
# useRef
for m in re.finditer(r'\bconst\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*useRef', monolith):
    state_set.add(m.group(1))
# Top-level (indent 0) const/let/var/function
for ln in monolith_lines:
    if not ln or ln[0] != ' ':
        m = re.match(r'(?:const|let|var|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)', ln)
        if m: state_set.add(m.group(1))
# React-body consts at indent 2
for m in re.finditer(r'\n  (?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=', monolith):
    state_set.add(m.group(1))
# State-object destructure bindings: `const { X, Y } = csState;` at indent 2
for m in re.finditer(r'\n  const\s*\{\s*([^}]+)\s*\}\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*State)\s*;', monolith):
    for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', m.group(1)):
        state_set.add(nm)


# ─── Step 2.5: phantom-shim-refs check ───────────────────────────────────
#
# Catches the bug class fixed across Phase L+M+N+O hotfixes: SEED_DEPS in
# the extractor script can list names that DON'T exist as App-scope decls,
# which causes ReferenceError at first invocation when the shim builds its
# deps object. The body-level audit doesn't catch this because the body
# may not reference the bad name (just the shim's destructure does).
#
# Build a "monolith_declared" set across all indents (not just top-level),
# subtract DEPS_UNCERTAIN names (those are typeof-guarded in the shim),
# and check what remains in the extractor's SEED_DEPS.

monolith_declared = set()
for m in re.finditer(r'^[ \t]*(?:const|let|var)\s+\[\s*([^\]]+)\s*\]', monolith, re.MULTILINE):
    for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', m.group(1)):
        monolith_declared.add(nm)
for m in re.finditer(r'^[ \t]*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=', monolith, re.MULTILINE):
    monolith_declared.add(m.group(1))
for m in re.finditer(r'^[ \t]*function\s+([A-Za-z_$][A-Za-z0-9_$]*)', monolith, re.MULTILINE):
    monolith_declared.add(m.group(1))
for m in re.finditer(r'^[ \t]*(?:const|let|var)\s+\{\s*([^}]+)\s*\}', monolith, re.MULTILINE):
    for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', m.group(1)):
        monolith_declared.add(nm)

# Locate extractor script for this source by scanning all _extract_*.py
# files for a SOURCE_OUT that references our SOURCE filename.
import glob
extractor_path = None
src_basename = os.path.basename(SOURCE)
for cand in glob.glob(os.path.join(ROOT, '_extract_*.py')):
    try:
        with open(cand, 'r', encoding='utf-8') as f:
            cand_src = f.read()
        if src_basename in cand_src:
            extractor_path = cand
            break
    except Exception:
        continue

phantom_shim_refs = []
if extractor_path:
    with open(extractor_path, 'r', encoding='utf-8') as f:
        extr_src = f.read()
    uncertain = set()
    m_uc = re.search(r'^DEPS_UNCERTAIN\s*=\s*\[(.*?)^\]', extr_src, re.DOTALL | re.MULTILINE)
    if m_uc:
        for nm in re.findall(r"'([A-Za-z_$][A-Za-z0-9_$]*)'", m_uc.group(1)):
            uncertain.add(nm)
    extractor_deps = set()
    for varname in ('SEED_DEPS', 'DEPS_VERIFIED', 'ALL_DEPS', 'DEPS'):
        for m in re.finditer(rf'^{varname}\s*=\s*\[(.*?)^\]', extr_src, re.DOTALL | re.MULTILINE):
            for nm in re.findall(r"'([A-Za-z_$][A-Za-z0-9_$]*)'", m.group(1)):
                extractor_deps.add(nm)
    extractor_deps -= uncertain
    for nm in sorted(extractor_deps):
        if nm not in monolith_declared:
            phantom_shim_refs.append(nm)
    if phantom_shim_refs:
        print(f'[audit] PHANTOM SHIM REFS in {os.path.basename(extractor_path)}:')
        for nm in phantom_shim_refs:
            print(f'    {nm}  (in extractor SEED_DEPS, NOT declared in App scope)')
        print('  These will throw ReferenceError when the shim deps object is built.')
        print('  Fix: remove from SEED_DEPS, OR move to DEPS_UNCERTAIN (typeof guard),')
        print('  OR add a stub at App.jsx phantom-ref block (~line 10498).')
else:
    print(f'[audit] note: no extractor script found referencing {src_basename}; phantom-shim-refs check skipped.')


# ─── Step 3: audit each extracted function ───────────────────────────────

JSX_TAGS = set((
    'div span p button input textarea select option a img svg path circle '
    'rect line polygon polyline g defs marker text foreignObject ul li '
    'h1 h2 h3 h4 h5 h6 details summary table thead tbody tr td th label '
    'nav header footer main section article form linearGradient radialGradient '
    'stop feDropShadow filter pattern feGaussianBlur feMerge feMergeNode '
    'feColorMatrix feFlood feComposite mask use ellipse'
).split())
GLOBALS = set((
    'true false null undefined this new async await return if else const let var '
    'for while do switch case break continue try catch finally throw typeof '
    'instanceof in of delete void function class extends super yield import export '
    'default from as Math Object Array String Number Boolean JSON Date Promise '
    'Map Set WeakMap WeakSet Error TypeError RangeError SyntaxError console window '
    'document setTimeout clearTimeout setInterval clearInterval requestAnimationFrame '
    'fetch URL URLSearchParams Blob File FileReader FormData Headers Request '
    'Response navigator localStorage sessionStorage crypto atob btoa '
    'encodeURIComponent decodeURIComponent isNaN isFinite parseInt parseFloat '
    'Symbol Reflect Proxy RegExp Infinity NaN globalThis React useState useEffect '
    'useCallback useMemo useRef useReducer useContext Fragment Children PropTypes '
    'alert prompt confirm structuredClone Image AbortController performance Intl '
    'HTMLElement ResizeObserver MutationObserver Node Element Event MouseEvent '
    'KeyboardEvent CustomEvent Audio Uint8Array Float32Array Int16Array '
    'ArrayBuffer DataView arguments'
).split())


# Find every extracted function in the COMPILED js. After esbuild, the
# `(args, deps) =>` signature is preserved; the destructure block is the
# first statement inside.
FUNC_RE = re.compile(
    r'(?:const|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>\s*\{\s*\n'
    r'\s*(?:const|var)\s*\{\s*([^}]+)\s*\}\s*=\s*deps;'
)

# Also grab the body. Bracket-match from the opening `{` to the matching `};`.
def extract_body(text, start_idx):
    """Given index of `{` after `=>`, return body text (between braces)."""
    depth = 0
    i = start_idx
    while i < len(text):
        c = text[i]
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return text[start_idx+1:i]
        i += 1
    return text[start_idx+1:]


functions_with_misses = []

for m in FUNC_RE.finditer(compiled):
    fname = m.group(1)
    args = m.group(2)
    deps_str = m.group(3)
    # Find the `{` opening this function's body.
    brace_idx = compiled.rfind('{', 0, m.end())
    # The match ends at `} = deps;`. We want the function's outer body,
    # which started at the `{` BEFORE the match.
    # Find the `=> {` opening this function specifically.
    arrow_idx = compiled.rfind('=>', 0, m.end())
    body_open = compiled.find('{', arrow_idx)
    body = extract_body(compiled, body_open)

    deps = set(re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', deps_str))
    arg_names = set(re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', args))

    # Local declarations in body
    locals_set = set()
    for mm in re.finditer(r'\b(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=', body):
        locals_set.add(mm.group(1))
    for mm in re.finditer(r'\b(?:const|let|var)\s*\{([^}]+)\}', body):
        for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', mm.group(1)):
            locals_set.add(nm)
    for mm in re.finditer(r'\b(?:const|let|var)\s*\[([^\]]+)\]', body):
        for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', mm.group(1)):
            locals_set.add(nm)
    for mm in re.finditer(r'function\s+([A-Za-z_$][A-Za-z0-9_$]*)', body):
        locals_set.add(mm.group(1))
    # Arrow function params: `(a, b) => ...` and `x => ...`
    for mm in re.finditer(r'\(([^()]*?)\)\s*=>', body):
        for nm in re.findall(r'[A-Za-z_$][A-Za-z0-9_$]*', mm.group(1)):
            locals_set.add(nm)
    for mm in re.finditer(r'(?<![.\w$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>', body):
        locals_set.add(mm.group(1))
    for mm in re.finditer(r'\bcatch\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\)', body):
        locals_set.add(mm.group(1))
    for mm in re.finditer(r'\bfor\s*\(\s*(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)', body):
        locals_set.add(mm.group(1))

    # Strip strings/comments (esbuild output uses double-quoted strings +
    # template literals that may NEST: the body of `${...}` interpolation
    # can contain another template literal whose own contents must also be
    # stripped, recursively). Earlier versions kept the outer-template's
    # ${...} contents verbatim but didn't re-strip nested strings inside,
    # so words like "history" appearing inside a nested template were
    # surfacing as bare-ref false positives.
    clean = body
    clean = re.sub(r'//[^\n]*', '', clean)
    clean = re.sub(r'/\*.*?\*/', '', clean, flags=re.DOTALL)
    # Strip regex literals: /pattern/flags. Heuristic: a `/` preceded by
    # one of `=({,!&|;?:` or `return ` starts a regex; bracket-balanced.
    # Simpler heuristic that works for most cases: any /...../ with no
    # newline and trailing flags.
    clean = re.sub(r'(?<![/\w])/(?:\\.|\[[^\]]*\]|[^/\n\\])+/[gimsuy]*', '/X/', clean)
    BACKSLASH = chr(92)

    def strip_with_nesting(text):
        out = []
        i = 0
        n = len(text)
        while i < n:
            c = text[i]
            if c in ("'", '"'):
                quote = c
                out.append(quote+quote); i += 1
                while i < n:
                    if text[i] == BACKSLASH and i+1 < n: i += 2
                    elif text[i] == quote: i += 1; break
                    elif text[i] == '\n': break
                    else: i += 1
            elif c == '`':
                out.append('``'); i += 1
                while i < n:
                    if text[i] == BACKSLASH and i+1 < n:
                        i += 2; continue
                    if text[i] == '$' and i+1 < n and text[i+1] == '{':
                        # Capture the full ${...} expression with brace
                        # matching, then recursively strip its inner strings.
                        i += 2
                        expr_start = i
                        depth = 1
                        while i < n and depth > 0:
                            ch = text[i]
                            if ch == '"' or ch == "'":
                                # Skip past the string entirely so its braces
                                # don't affect depth counting.
                                qq = ch; i += 1
                                while i < n:
                                    if text[i] == BACKSLASH and i+1 < n: i += 2
                                    elif text[i] == qq: i += 1; break
                                    elif text[i] == '\n': break
                                    else: i += 1
                                continue
                            if ch == '`':
                                # Nested template literal — skip past it
                                # (with its own ${...} brace-balanced).
                                i += 1
                                inner_depth = 0
                                while i < n:
                                    if text[i] == BACKSLASH and i+1 < n:
                                        i += 2; continue
                                    if text[i] == '$' and i+1 < n and text[i+1] == '{':
                                        inner_depth += 1; i += 2; continue
                                    if text[i] == '}' and inner_depth > 0:
                                        inner_depth -= 1; i += 1; continue
                                    if text[i] == '`' and inner_depth == 0:
                                        i += 1; break
                                    i += 1
                                continue
                            if ch == '{':
                                depth += 1
                            elif ch == '}':
                                depth -= 1
                                if depth == 0:
                                    break
                            i += 1
                        # Recursively strip the captured expression body.
                        inner = text[expr_start:i]
                        out.append('${'); out.append(strip_with_nesting(inner)); out.append('}')
                        if i < n: i += 1  # consume closing }
                        continue
                    if text[i] == '`':
                        i += 1; break
                    i += 1
            else:
                out.append(c); i += 1
        return ''.join(out)

    clean = strip_with_nesting(clean)

    bare = set()
    for mm in re.finditer(r'(?<![.\w$])([A-Za-z_$][A-Za-z0-9_$]*)\b', clean):
        bare.add(mm.group(1))

    # Filter out identifiers that appear ONLY as object-property keys.
    # Pattern: `id:` (with whitespace) inside object literal context. After
    # esbuild compiles JSX, `<input value={x}>` becomes
    # `React.createElement("input", { value: x })` — `value` is a property
    # name, not a closure ref. Only exclude names that NEVER appear in a
    # non-key position; shorthand `{ value }` (which IS a real ref) keeps
    # the name in.
    candidates = bare - deps - arg_names - locals_set - JSX_TAGS - GLOBALS - {fname}

    pure_property_keys = set()
    for nm in candidates:
        # Real-ref occurrence: name NOT followed by `:` (excluding `::` rare).
        non_key_pattern = r'(?<![.\w$])' + re.escape(nm) + r'\b(?!\s*:[^:])'
        if not re.search(non_key_pattern, clean):
            pure_property_keys.add(nm)
    candidates -= pure_property_keys

    missing_deps = candidates & state_set

    print(f'\n  {fname:40s} deps:{len(deps):3d}  bare:{len(bare):4d}  missing:{len(missing_deps)}')
    if missing_deps:
        functions_with_misses.append((fname, sorted(missing_deps)))
        for nm in sorted(missing_deps):
            print(f'    MISSING: {nm}')


# ─── Step 4: Report + exit ───────────────────────────────────────────────

print()
fail = False
if functions_with_misses:
    print(f'[audit] FAIL — {len(functions_with_misses)} function(s) have missing deps:')
    for fname, missing in functions_with_misses:
        print(f'  {fname}: {", ".join(missing)}')
    print()
    print('Add these to the destructure in source.jsx, the shim deps in')
    print('AlloFlowANTI.txt, AND the DEPS list in the extraction script')
    print('(so re-running extraction-from-backup re-adds them).')
    fail = True
if phantom_shim_refs:
    if fail:
        print()
    print(f'[audit] FAIL — {len(phantom_shim_refs)} phantom shim ref(s) (would throw ReferenceError):')
    print(f'  {", ".join(phantom_shim_refs)}')
    fail = True

if fail:
    sys.exit(1)
print('[audit] PASS — no missing deps detected, no phantom shim refs.')
sys.exit(0)
