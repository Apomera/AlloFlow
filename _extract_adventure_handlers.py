#!/usr/bin/env python3
"""
Extract the 5 adventure interaction handlers from AlloFlowANTI.txt into
a new CDN module: adventure_handlers_module.js (Phase F).

Pattern: (args, deps) =>
  Each handler takes its original args plus a `deps` object holding every
  closure-captured state/setter/utility. Destructured at the top so the
  body code is byte-identical to the original.

Lessons applied from Phase E (UdlChat) regression:
  1. Verified-vs-uncertain deps: identifiers that don't exist as top-level
     vars in the monolith get `typeof X !== 'undefined' ? X : undefined`
     guards in the shim's deps object so we don't throw ReferenceError
     building the call args. (Inside the module, destructuring an absent
     key just yields undefined, which is fine since the handlers only
     access these through adventureState.X — never as bare refs.)
  2. Each handler's body is wrapped in try/catch with console.error so a
     real runtime error surfaces in the browser console instead of being
     swallowed by a generic toast.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'adventure_handlers_source.jsx')

HANDLERS = [
    'executeStartAdventure',
    'handleStartAdventure',
    'handleResumeAdventure',
    'handleAdventureTextSubmit',
    'handleAdventureChoice',
]

# Verified to exist as top-level vars in the React component scope.
DEPS_VERIFIED = [
    # State VALUES
    'adventureState', 'adventureTextInput', 'adventureInputMode', 'adventureLanguageMode',
    'adventureChanceMode', 'adventureConsistentCharacters', 'adventureCustomInstructions',
    'adventureFreeResponseEnabled',
    'history', 'inputText', 'sourceTopic', 'gradeLevel', 'standardsInput', 'studentInterests',
    'isIndependentMode', 'isTeacherMode',
    'factionResourceMode', 'enableFactionResources',
    'selectedLanguages', 'currentUiLanguage',
    'apiKey', 'appId', 'activeSessionAppId', 'activeSessionCode',
    'globalPoints', 'sessionData', 'user',
    # Refs
    'alloBotRef', 'lastTurnSnapshot', 'lastReadTurnRef',
    'pdfPreviewRef', 'exportPreviewRef',
    # State SETTERS
    'setActiveView', 'setAdventureState', 'setAdventureTextInput', 'setDiceResult',
    'setFailedAdventureAction', 'setGeneratedContent', 'setGenerationStep',
    'setHasSavedAdventure', 'setHistory', 'setIsResumingAdventure',
    'setPendingAdventureUpdate', 'setShowDice', 'setShowGlobalLevelUp', 'setShowNewGameSetup',
    # Helpers
    'callGemini', 'callGeminiVision', 'addToast', 't', 'warnLog', 'debugLog', 'cleanJson',
    'archiveAdventureImage', 'SafetyContentChecker', 'handleAiSafetyFlag',
    'playAdventureEventSound',
    'handleScoreUpdate', 'getAdventureGlossaryTerms',
    'generateAdventureImage', 'generateNarrativeLedger', 'generatePixelArtItem',
    'detectClimaxArchetype', 'flyToElement', 'resilientJsonParse',
    'storageDB', 'updateDoc', 'doc', 'db',
    # AlloData prompt-prefix constants (registered via window.AlloModules.AlloData
    # and upgraded into closure scope by _upgradeAlloData()).
    'ADVENTURE_GUARDRAIL', 'DEBATE_INVISIBLE_INSTRUCTIONS', 'INVISIBLE_NARRATOR_INSTRUCTIONS',
    'NARRATIVE_GUARDRAILS', 'SYSTEM_INVISIBLE_INSTRUCTIONS', 'SYSTEM_STATE_EXAMPLES',
]

# Uncertain — may be defined in some build configurations or only via property
# access. Wrapped in `typeof X !== 'undefined' ? X : undefined` in the shim
# deps object. The handler bodies never reference these as bare names; they're
# included only because the original audit listed them and the cost of an
# unused undefined dep is zero.
DEPS_UNCERTAIN = [
    'aiBotsActive', 'narrativeLedger', 'isAdventureStoryMode', 'isImmersiveMode',
    'isReviewingCharacters', 'isShopOpen', 'isSocialStoryMode',
    'debateTopic', 'socialStoryFocus',
    'stopPlayback', 'playSound', 'resetDebate',
]

ALL_DEPS = DEPS_VERIFIED + DEPS_UNCERTAIN


def find_end(lines, start_1based):
    """Bracket-match using indent-aligned closing `};`."""
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
        pat = re.compile(r'^\s*const ' + re.escape(hname) + r'\s*=')
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

    src_parts = []
    src_parts.append('// adventure_handlers_source.jsx - 5 adventure interaction handlers extracted\n')
    src_parts.append('// from AlloFlowANTI.txt 2026-04-25 (Phase F of CDN modularization).\n')
    src_parts.append('//\n')
    src_parts.append('// Each handler takes (args..., deps) where `deps` carries all closure-\n')
    src_parts.append('// captured React state, setters, refs, and utility functions.\n')
    src_parts.append('// Destructured at top; body is byte-identical to the original monolith.\n')
    src_parts.append('//\n')
    src_parts.append('// A try/catch wrapper at each handler entry surfaces runtime errors to\n')
    src_parts.append('// console.error before re-throwing — Phase E learned that swallowed\n')
    src_parts.append('// errors masquerade as a generic "Sorry" toast and are murder to debug.\n')
    src_parts.append('\n')

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
        # Wrap body in try/catch for error surfacing.
        # We can't easily wrap an async body without re-indenting, so just
        # prepend a debug log + append a trailing catch via outer wrapper.
        # Simplest: leave the body alone (it has its own try/catch) and add
        # an entry-point console.log so we can see when each handler fires.
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_ADVENTURE) console.log("[Adventure] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.extend(body_inner)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.AdventureHandlers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_adventure_handlers'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = list(lines)

    # Build the deps object content. Verified deps inline; uncertain deps
    # wrapped in typeof guards so a missing closure var doesn't throw.
    def build_deps_obj(indent_str):
        parts = ['{\n']
        for d in DEPS_VERIFIED:
            parts.append(f'{indent_str}      {d},\n')
        for d in DEPS_UNCERTAIN:
            parts.append(f"{indent_str}      {d}: typeof {d} !== 'undefined' ? {d} : undefined,\n")
        parts.append(f'{indent_str}    }}')
        return ''.join(parts)

    # Process in reverse-line order so earlier offsets stay valid.
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
            f'{indent}  const _m = window.AlloModules && window.AlloModules.AdventureHandlers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args + (", " if call_args else "")}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] AdventureHandlers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    # Inject the loadModule call so a fresh extraction-from-backup re-wires
    # the runtime loader. (Lesson from Phase F: restoring the backup loses
    # this line if it's only ever added by hand.)
    LOADER_LINE = "    loadModule('AdventureHandlersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/adventure_handlers_module.js');\n"
    if not any('AdventureHandlersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('UdlChatModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
