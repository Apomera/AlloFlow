#!/usr/bin/env python3
"""
Phase G.2: Extract three JSX renderers from AlloFlowANTI.txt into
view_renderers_module.js.

  - renderOutlineContent (~625 lines)
  - renderInteractiveMap (~412 lines)
  - renderFormattedText (~178 lines)

Differences from earlier extractions:
  * JSX-bearing — module is compiled by _build_view_renderers_module.js
    (esbuild --jsx=transform --jsx-factory=React.createElement) before
    being wrapped in an IIFE.
  * Per-handler deps — each renderer has its own destructured deps list,
    not a shared one. Keeps the deps interface honest about what each
    renderer actually reads.
  * Icons resolved via _lazyIcon('Name') in the build wrapper
    (window.AlloIcons). Components passed through deps.

Lessons applied (G.1 effectiveLanguage trap):
  * Strict deps classifier — only useState values/setters, useRef,
    file-top consts, and react-body consts are admitted. Inside-function
    locals are explicitly rejected.
  * BODY_REWRITES dict for any closure-local ref that isn't a closure
    var (none needed for these three renderers per audit).
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'view_renderers_source.jsx')

# Per-renderer deps — verified by c:/tmp/audit_g2_deps.py against monolith
# decls. Only useState val/setter, useRef, top_const, react_body_const.
# Inside-function locals (e.g. `effectiveLanguage`) explicitly excluded.

DEPS_RENDER_FORMATTED_TEXT = [
    # Top-level helpers (file-top)
    'sanitizeTruncatedCitations', 'warnLog',
    # File-top component shims (delegate to TeacherModule)
    'SimpleBarChart', 'SimpleDonutChart',
    # React-body helpers
    'formatInlineText', 'normalizeResourceLinks',
]

DEPS_RENDER_OUTLINE_CONTENT = [
    # Top-level components (file-top)
    'KeyConceptMapView', 'VennGame',
    # useState values
    'generatedContent', 'isInteractiveVenn', 'isProcessing', 'isTeacherMode',
    'isVennPlaying', 'leveledTextLanguage', 'outlineTranslationMode',
    'vennGameData', 'vennInputs',
    # useState setters
    'setOutlineTranslationMode', 'setVennInputs',
    # React-body helpers (handlers + utilities + i18n)
    'closeVenn', 'handleAddVennItem', 'handleGameCompletion',
    'handleGameScoreUpdate', 'handleGenerateOutcome', 'handleInitializeVenn',
    'handleOutlineChange', 'handleRemoveVennItem', 'handleSetIsVennPlayingToTrue',
    'playSound', 't',
]

DEPS_RENDER_INTERACTIVE_MAP = [
    # Top-level (file-top)
    'ConfettiExplosion', 'STYLE_TEXT_SHADOW_WHITE', 'VENN_ZONES',
    # useState values
    'activeChallengeMode', 'challengeFeedback', 'challengeModeType',
    'generatedContent', 'isChallengeActive', 'isCheckingChallenge',
    'isProcessing', 'isTeacherMode', 'letterSpacing', 'nodeInputText',
    # useReducer-derived bindings (destructured from csState at L3775,
    # in scope in the React component body — manually added since the
    # audit classifier doesn't trace destructure patterns).
    'conceptMapNodes', 'conceptMapEdges',
    # useState setters
    'setChallengeModeType', 'setConnectingSourceId',
    'setIsInteractiveMap', 'setIsInteractiveVenn', 'setNodeInputText',
    # useRef
    'mapContainerRef',
    # React-body helpers
    'addToast', 'getElbowPath', 'handleAddManualNode', 'handleAutoLayout',
    'handleCheckChallengeRouter', 'handleClearEdges', 'handleCreateChallenge',
    'handleDeleteEdge', 'handleDeleteNode', 'handleExitChallenge',
    'handleNodeClick', 'handleNodeMouseDown', 'handleResetLayout',
    'handleRetryChallenge', 'handleSetIsConceptMapReadyToFalse',
    'handleToggleIsMapLocked', 'renderFlowShape', 'setConceptMapNodes',
    't',
]

HANDLERS_INFO = [
    ('renderFormattedText', DEPS_RENDER_FORMATTED_TEXT),
    ('renderOutlineContent', DEPS_RENDER_OUTLINE_CONTENT),
    ('renderInteractiveMap', DEPS_RENDER_INTERACTIVE_MAP),
]

BODY_REWRITES = {}  # None needed — audit clean.


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
        '// view_renderers_source.jsx — Phase G.2 of CDN modularization.\n',
        '// renderFormattedText + renderOutlineContent + renderInteractiveMap\n',
        '// extracted from AlloFlowANTI.txt 2026-04-25.\n',
        '//\n',
        '// JSX returned by these renderers is compiled to React.createElement\n',
        '// by _build_view_renderers_module.js (esbuild --jsx=transform).\n',
        '// Icons (lucide) are aliased at module level via _lazyIcon, components\n',
        '// and helpers come through the per-renderer deps interface.\n',
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
            for old, new in BODY_REWRITES.items():
                new_ln = re.sub(r'\b' + re.escape(old) + r'\b', new, new_ln)
            rewritten_body.append(new_ln)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_VIEW_RENDERERS) console.log("[ViewRenderers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.extend(rewritten_body)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.ViewRenderers = {\n')
    for hname, _ in HANDLERS_INFO:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_view_renderers'
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

    # Process in reverse-line order so earlier offsets stay valid.
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
            f'{indent}  const _m = window.AlloModules && window.AlloModules.ViewRenderers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args + (", " if call_args else "")}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] ViewRenderers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('ViewRenderersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/view_renderers_module.js');\n"
    if not any('ViewRenderersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('GlossaryHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
