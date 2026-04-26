#!/usr/bin/env python3
"""
Phase L: Extract 3 useCallback adventure-session helpers into
adventure_session_handlers_module.js.

Targets:
  - handleDiceRollComplete (~444 lines, calls generateAdventureImage + generateNarrativeLedger)
  - generateAdventureImage (~210 lines)
  - generateNarrativeLedger (~150 lines)

All three are useCallback-wrapped — the extractor unwraps and the shim becomes
a plain const (drops the useCallback). React-memoization concern: these are
not passed as memo deps to other components; only invoked from event handlers
and from each other (handleDiceRollComplete calls the other two). Re-creation
per render is harmless.

Sibling calls inside the module (handleDiceRollComplete -> generateAdventureImage
and -> generateNarrativeLedger) are rewritten via BODY_REWRITES_REGEX to thread
deps through. Pattern proven in Phase K (handleSpeak -> playSequence).
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'adventure_session_handlers_source.jsx')

# Seed deps — generous; auditor catches misses. Body destructures harmlessly
# yield undefined for any deps that aren't actually referenced.
SEED_DEPS = [
    # --- State VALUES ---
    'adventureState', 'pendingAdventureUpdate', 'adventureChanceMode',
    'adventureDifficulty', 'adventureCustomInstructions',
    'adventureLanguageMode', 'adventureInputMode',
    'adventureFreeResponseEnabled', 'adventureConsistentCharacters',
    'isAdventureStoryMode', 'isImmersiveMode', 'isSocialStoryMode',
    'aiBotsActive', 'narrativeLedger',
    'currentUiLanguage', 'selectedLanguages', 'gradeLevel',
    'studentInterests', 'sourceTopic', 'inputText', 'history',
    'isIndependentMode', 'isTeacherMode',
    'apiKey', 'appId', 'activeSessionAppId', 'activeSessionCode',
    'globalPoints', 'sessionData', 'user',
    'adventureArtStyle', 'adventureCustomArtStyle',
    'imageGenerationStyle', 'imageAspectRatio',
    # --- Refs ---
    'alloBotRef', 'lastTurnSnapshot', 'lastReadTurnRef',
    # --- State setters ---
    'setAdventureState', 'setPendingAdventureUpdate', 'setShowDice',
    'setShowGlobalLevelUp', 'setActiveView', 'setGenerationStep',
    'setError', 'setHistory', 'setGeneratedContent',
    'setHasSavedAdventure', 'setIsResumingAdventure',
    'setDiceResult', 'setFailedAdventureAction',
    'setAdventureEffects', 'setIsProcessing',
    'useLowQualityVisuals', 'adventureImageDB',
    # --- Helpers ---
    'addToast', 't', 'warnLog', 'debugLog', 'cleanJson',
    'safeJsonParse', 'callGemini', 'callGeminiVision', 'callImagen',
    'callGeminiImageEdit',
    'archiveAdventureImage', 'SafetyContentChecker', 'handleAiSafetyFlag',
    'playAdventureEventSound', 'playSound',
    'handleScoreUpdate', 'getAdventureGlossaryTerms',
    'generatePixelArtItem',
    # Sibling calls — handleDiceRollComplete invokes these. Including them
    # in deps means a "fresh deps" pass-through to the sibling shim. The
    # BODY_REWRITES_REGEX below threads `deps` into the call so the sibling
    # gets its own deps object.
    'generateAdventureImage', 'generateNarrativeLedger',
    'detectClimaxArchetype', 'flyToElement',
    'resilientJsonParse', 'storageDB', 'updateDoc', 'doc', 'db',
    # AlloData prompt-prefix constants
    'ADVENTURE_GUARDRAIL', 'NARRATIVE_GUARDRAILS',
    'INVISIBLE_NARRATOR_INSTRUCTIONS', 'SYSTEM_INVISIBLE_INSTRUCTIONS',
    'SYSTEM_STATE_EXAMPLES',
]

HANDLERS = [
    'handleDiceRollComplete',
    'generateAdventureImage',
    'generateNarrativeLedger',
]

# handleDiceRollComplete calls generateAdventureImage and generateNarrativeLedger.
# Both are now in this module — thread deps through their call sites.
BODY_REWRITES_REGEX = [
    (
        r'\bgenerateAdventureImage\s*\(([^()]*)\)',
        r'generateAdventureImage(\1, deps)',
    ),
    (
        r'\bgenerateNarrativeLedger\s*\(([^()]*)\)',
        r'generateNarrativeLedger(\1, deps)',
    ),
]


def find_indent2_close(lines, start_1based):
    """For plain consts, body ends at indent-2 `};`. For useCallbacks, the
    real close is `}, [...]);` — handled separately in main()."""
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
        print(f'[verify] {hname}: lines {start}-{end} (~{end-start+1} lines, useCallback re-scan in extract step)')

    src_parts = [
        '// adventure_session_handlers_source.jsx — Phase L of CDN modularization.\n',
        '// 3 useCallback adventure-session helpers: handleDiceRollComplete,\n',
        '// generateAdventureImage, generateNarrativeLedger.\n',
        '//\n',
        '// useCallback wrapper dropped in shim; functions called from event\n',
        '// handlers and each other, never passed as memo deps.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            m_uc = re.match(
                r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(?:React\.)?useCallback\(\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{',
                opener
            )
            if not m_uc:
                print(f'FAIL: useCallback opener regex did not match for {hname}: {opener.rstrip()}', file=sys.stderr); sys.exit(1)
            async_kw = (m_uc.group(2) or '').strip()
            orig_args = m_uc.group(3).strip()
            new_args = orig_args + (', deps' if orig_args else 'deps')
            new_opener = f'const {hname} = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'
        else:
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

        if is_useCallback:
            uc_close = None
            for i in range(start, len(lines)):
                if lines[i].startswith('  }, ['):
                    uc_close = i + 1
                    break
            if uc_close is None:
                print(f'FAIL: cannot find useCallback close for {hname}', file=sys.stderr); sys.exit(1)
            body_lines = lines[start-1:uc_close]
            body_inner = body_lines[1:-1]
            body_joined = ''.join(body_inner)
            print(f'  [useCallback unwrap] {hname}: body now {len(body_inner)} lines (close at {uc_close})')

        for pattern, replacement in BODY_REWRITES_REGEX:
            body_joined = re.sub(pattern, replacement, body_joined)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_PHASE_L) console.log("[PhaseL] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.AdventureSessionHandlers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_phase_l'
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
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            uc_close = None
            for j in range(start, len(new_lines)):
                if new_lines[j].startswith('  }, ['):
                    uc_close = j + 1
                    break
            if uc_close is None:
                print(f'FAIL: useCallback close missing for {hname} during shim insertion', file=sys.stderr); sys.exit(1)
            actual_end = uc_close
            m_uc = re.match(
                r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(?:React\.)?useCallback\(\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{',
                opener
            )
            indent_str = m_uc.group(1)
            async_kw = (m_uc.group(2) or '').strip()
            orig_args = m_uc.group(3).strip()
        else:
            actual_end = end
            m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
            indent_str = m.group(1)
            async_kw = (m.group(2) or '').strip()
            orig_args = m.group(3).strip()

        call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
        sep = ', ' if call_args else ''
        shim = [
            f'{indent_str}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent_str}  const _m = window.AlloModules && window.AlloModules.AdventureSessionHandlers;\n',
            f'{indent_str}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent_str}  throw new Error("[{hname}] AdventureSessionHandlers module not loaded - reload the page");\n',
            f'{indent_str}}};\n',
        ]
        new_lines[start-1:actual_end] = shim

    LOADER_LINE = "    loadModule('AdventureSessionHandlersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/adventure_session_handlers_module.js');\n"
    if not any('AdventureSessionHandlersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('PhaseKHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
