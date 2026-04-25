#!/usr/bin/env python3
"""
Extract handleSendUDLMessage (1,038 lines) from AlloFlowANTI.txt into a
new CDN module: udl_chat_module.js.

Pattern: same as adventure_handlers extraction (args, deps) => with
destructuring at top of function body, byte-identical body code.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'udl_chat_source.jsx')

# Comprehensive deps. Better to over-pass than to miss one.
DEPS = [
    # State VALUES
    'activeBlueprint', 'activeView', 'alloBotRef', 'currentUiLanguage',
    'guidedFlowState', 'isAutoFillMode', 'sourceTopic', 'udlMessages', 'udlInput',
    'leveledTextLanguage', 'persistedLessonDNA',
    # Refs
    'uiDispatch',
    # State setters
    'setActiveBlueprint', 'setActiveView', 'setAdventureInputMode', 'setDokLevel',
    'setExpandedTools', 'setFillInTheBlank', 'setFrameType', 'setFullPackTargetGroup',
    'setGeneratedContent', 'setGradeLevel', 'setGuidedFlowState', 'setIsAutoFillMode',
    'setIsChatProcessing', 'setLeveledTextLanguage', 'setOutlineType', 'setQuizMcqCount',
    'setResourceCount', 'setSelectedLanguages', 'setShowBehaviorLens', 'setShowEducatorHub',
    'setShowReadThisPage', 'setShowReportWriter', 'setShowSelHub', 'setShowSourceGen',
    'setShowStemLab', 'setShowStoryForge', 'setSourceLength', 'setSourceTone',
    'setSourceTopic', 'setSpotlightMessage', 'setStudentInterests', 'setUdlInput',
    'setUdlMessages',
    # Helper functions
    'addToast', 't', 'warnLog', 'callGemini', 'cleanJson',
    'applyAIConfig', 'applyWorkflowModification', 'autoConfigureSettings',
    'captureIntentSnapshot', 'detectWorkflowIntent', 'flyToElement',
    'generateDynamicBridge', 'generateStandardChatResponse', 'getReadableContent',
    'getStageElementId', 'getWorkflowContext', 'handleExecuteBlueprint',
    'handleGenerate', 'handleGenerateFullPack', 'handleGenerateLessonPlan',
    'handleGenerateSource', 'handleSettingsIntent', 'handleShowUiIntent',
    'handleStartAdventure', 'handleUrlFetch', 'modifyBlueprintWithAI',
    'parseUserIntent', 'performHighlight', 'restoreIntentSnapshot',
    'formatLessonDNA',
]


def find_handler(lines, name):
    for i, ln in enumerate(lines):
        if re.match(r'^\s*const\s+' + re.escape(name) + r'\s*=', ln):
            return i + 1
    return None


def brace_size(lines, start_1based):
    """Returns end line (1-based, inclusive)."""
    depth = 0; started = False
    for i in range(start_1based - 1, len(lines)):
        for ch in lines[i]:
            if ch == '{':
                depth += 1; started = True
            elif ch == '}':
                depth -= 1
                if started and depth == 0:
                    return i + 1
    return None


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    start = find_handler(lines, 'handleSendUDLMessage')
    if not start:
        print('FAIL: handleSendUDLMessage not found', file=sys.stderr)
        sys.exit(1)
    end = brace_size(lines, start)
    print(f'[verify] handleSendUDLMessage: lines {start}-{end} ({end - start + 1} lines)')

    body_lines = lines[start - 1:end]
    opener = body_lines[0]
    m = re.match(r'^(\s*)const\s+handleSendUDLMessage\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
    if not m:
        print(f'FAIL: cannot parse opener: {opener.rstrip()}', file=sys.stderr)
        sys.exit(1)
    indent = m.group(1)
    async_kw = (m.group(2) or '').strip()
    orig_args = m.group(3).strip()

    # Build source.jsx
    new_args = orig_args + (', deps' if orig_args else 'deps')
    new_opener = f'const handleSendUDLMessage = {async_kw + " " if async_kw else ""}({new_args}) => {{\n'
    destructure = f'  const {{ {", ".join(DEPS)} }} = deps;\n'
    body_inner = body_lines[1:-1]
    src_parts = [
        '// udl_chat_source.jsx - handleSendUDLMessage extracted from AlloFlowANTI.txt 2026-04-25.\n',
        '// (args, deps) => pattern. Body is byte-identical to original; closure-captured\n',
        '// state and helpers are passed via the deps object and destructured at top.\n',
        '\n',
        new_opener,
        destructure,
    ]
    src_parts.extend(body_inner)
    src_parts.append('};\n\n')
    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.UdlChat = { handleSendUDLMessage };\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    print(f'[extract] wrote {SOURCE_OUT}')

    # Backup
    backup = MONOLITH + '.bak.pre_udl_chat'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    # Replace handler with shim in monolith
    call_args = ', '.join(p.split('=')[0].strip() for p in orig_args.split(',') if p.strip()) if orig_args else ''
    deps_obj = '{\n' + ''.join(f'      {d},\n' for d in DEPS) + f'    {indent}}}'
    shim = [
        f'{indent}const handleSendUDLMessage = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
        f'{indent}  const _m = window.AlloModules && window.AlloModules.UdlChat;\n',
        f'{indent}  if (_m && typeof _m.handleSendUDLMessage === "function") return _m.handleSendUDLMessage({call_args + (", " if call_args else "")}{deps_obj});\n',
        f'{indent}  throw new Error("[handleSendUDLMessage] UdlChat module not loaded - reload the page");\n',
        f'{indent}}};\n',
    ]
    new_lines = lines[:start - 1] + shim + lines[end:]

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines')


if __name__ == '__main__':
    main()
