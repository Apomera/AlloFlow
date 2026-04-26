#!/usr/bin/env python3
"""
Phase O: Extract 6 mid-tier misc handlers into phase_o_misc_handlers_module.js.

Targets (all plain const):
  - startClassSession (~115)
  - handleRefineImage (~92)
  - handleFindStandards (~90)
  - handleWizardComplete (~73)
  - handleWizardStandardLookup (~72)
  - handleExecuteBlueprint (~69)
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'phase_o_misc_handlers_source.jsx')

SEED_DEPS = [
    # State VALUES
    'gradeLevel', 'leveledTextLanguage', 'currentUiLanguage',
    'selectedLanguages', 'studentInterests', 'sourceTopic', 'inputText',
    'history', 'generatedContent', 'apiKey',
    'standardsInput', 'targetStandards', 'dokLevel',
    'rosterKey', 'sessionData', 'user', 'appId',
    'activeSessionAppId', 'activeSessionCode',
    'studentNickname', 'sourceLength', 'sourceTone', 'textFormat',
    'fullPackTargetGroup', 'isAutoConfigEnabled', 'resourceCount',
    'creativeMode', 'noText', 'fillInTheBlank',
    'imageGenerationStyle', 'imageAspectRatio', 'useLowQualityVisuals',
    'autoRemoveWords', 'globalPoints',
    'wizardData', 'isWizardOpen',
    'standardsLookupRegion', 'standardsLookupGoal',
    'pdfFixResult', 'showExportPreview',
    'aiStandardQuery', 'aiStandardRegion',
    'imageRefinementInput',
    'activeBlueprint',
    'ai',
    # Refs
    'alloBotRef', 'pdfPreviewRef', 'exportPreviewRef',
    # Setters
    'setError', 'setIsProcessing', 'setGenerationStep',
    'setGeneratedContent', 'setHistory',
    'setActiveView', 'setActiveSessionCode', 'setActiveSessionAppId',
    'setStudentNickname',
    'setIsWizardOpen', 'setShowSourceGen',
    'setSourceTopic', 'setSourceCustomInstructions',
    'setSourceLength', 'setSourceTone', 'setTextFormat',
    'setSelectedLanguages', 'setGradeLevel', 'setStandardsInput',
    'setTargetStandards', 'setDokLevel', 'setStudentInterests',
    'setSuggestedStandards', 'setIsLookingUpStandards',
    'setStandardsLookupGoal', 'setStandardsLookupRegion',
    'setExpandedTools', 'setShowUDLGuide',
    'setUdlMessages', 'setGuidedFlowState',
    'setIsRefiningImage', 'setShowImageRefineModal',
    'setIsExecutingBlueprint',
    'setBlueprintExecutionResult',
    'setShowExportPreview',
    'setInputText',
    'setIsTeacherMode', 'setIsParentMode', 'setIsIndependentMode',
    'setActiveSidebarTab', 'setDoc', 'setSessionData', 'setShowSessionModal',
    'setImageRefinementInput',
    'setIsFindingStandards',
    'setShowWizard', 'setSourceLevel', 'setSourceVocabulary',
    'setIncludeSourceCitations', 'setLeveledTextLanguage',
    'setActiveBlueprint', 'setPersistedLessonDNA',
    # Helpers
    'addToast', 't', 'warnLog', 'debugLog',
    'callGemini', 'callGeminiVision', 'callImagen', 'callGeminiImageEdit',
    'cleanJson', 'safeJsonParse',
    'sanitizeTruncatedCitations', 'normalizeResourceLinks',
    'flyToElement', 'getDefaultTitle',
    'storageDB', 'updateDoc', 'doc', 'db',
    'playSound', 'playAdventureEventSound',
    'generateSessionCode', 'stripUndefined', 'uploadSessionAssets',
    'safeSetItem', 'handleGenerateSource',
    'applyDetailedAutoConfig', 'handleGenerate',
    # Refs
    'fileInputRef',
]

HANDLERS = [
    'startClassSession',
    'handleRefineImage',
    'handleFindStandards',
    'handleWizardComplete',
    'handleWizardStandardLookup',
    'handleExecuteBlueprint',
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
        '// phase_o_misc_handlers_source.jsx -- Phase O of CDN modularization.\n',
        '// 6 misc handlers across class sessions, image refinement, standards\n',
        '// lookup, wizard flow, blueprint execution.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            print(f'FAIL: {hname} is useCallback', file=sys.stderr); sys.exit(1)
        m = re.match(r'^(\s*)const\s+' + re.escape(hname) + r'\s*=\s*(async\s+)?\(([^)]*)\)\s*=>\s*\{', opener)
        if not m:
            print(f'FAIL: opener regex for {hname}: {opener.rstrip()}', file=sys.stderr); sys.exit(1)
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
        src_parts.append(f'  try {{ if (window._DEBUG_PHASE_O) console.log("[PhaseO] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.PhaseOHandlers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_phase_o'
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
            f'{indent_str}  const _m = window.AlloModules && window.AlloModules.PhaseOHandlers;\n',
            f'{indent_str}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent_str}  throw new Error("[{hname}] PhaseOHandlers module not loaded - reload the page");\n',
            f'{indent_str}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('PhaseOHandlersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/phase_o_misc_handlers_module.js');\n"
    if not any('PhaseOHandlersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('PhaseNHelpersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
