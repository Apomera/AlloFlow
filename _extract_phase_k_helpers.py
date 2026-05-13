#!/usr/bin/env python3
"""
Phase K: Extract 12 mid-tier helpers into phase_k_helpers_module.js.

Seed deps are conservative; the auditor will surface anything missed
(same iterative pattern as Phase J, which surfaced 73 round-2 deps).

syncProgressToFirestore is a useCallback in the original. The shim is
intentionally a plain const (drops the useCallback wrapper) since the
function is invoked from event handlers, not passed as a memo dep.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'phase_k_helpers_source.jsx')

# Seed deps — auditor will catch missing ones.
SEED_DEPS = [
    # --- State VALUES ---
    'isPlaying', 'isPaused', 'isMuted', 'selectedVoice', 'voiceSpeed',
    'voiceVolume', 'currentUiLanguage', 'leveledTextLanguage',
    # NOTE: 'voiceMap' is a parameter in playSequence, not a closure ref.
    # Excluded from deps to avoid 'already declared' collisions.
    'selectedLanguages', 'gradeLevel', 'studentInterests', 'sourceTopic',
    'sourceLength', 'sourceTone', 'textFormat', 'inputText',
    'leveledTextCustomInstructions', 'standardsInput', 'targetStandards',
    'dokLevel', 'history', 'generatedContent', 'pdfFixResult',
    'fluencyAssessments', 'currentFluencyText',
    'isFluencyRecording', 'fluencyAudioBlob',
    'studentNickname', 'activeSessionCode', 'activeSessionAppId', 'appId',
    'apiKey', 'studentResponses', 'studentReflections',
    'socraticMessages', 'socraticInput', 'isSocraticThinking',
    'socraticChatHistory', 'studentProjectSettings',
    'persistedLessonDNA', 'isAutoConfigEnabled', 'resourceCount',
    'fullPackTargetGroup', 'rosterKey', 'enableEmojiInline',
    'isShowMeMode', 'flashcardIndex', 'flashcardLang', 'flashcardMode',
    'standardDeckLang',
    # NOTE: 'isDarkBg' is a parameter in formatInlineText, not a closure ref.
    # Excluded to avoid 'already declared' collisions.
    # --- Refs ---
    'playbackSessionRef', 'audioRef', 'isPlayingRef', 'playbackRateRef',
    'persistentVoiceMapRef', 'lastReadTurnRef', 'projectFileInputRef',
    'fluencyRecorderRef', 'fluencyChunksRef', 'fluencyStreamRef',
    # --- State setters ---
    'setIsPlaying', 'setIsPaused', 'setPlayingContentId', 'setError',
    'setSocraticMessages', 'setSocraticInput', 'setIsSocraticThinking',
    'setSocraticChatHistory', 'setIsFluencyRecording',
    'setFluencyAssessments', 'setFluencyAudioBlob', 'setCurrentFluencyText',
    'setStudentReflections', 'setInputText', 'setIsExtracting',
    'setGenerationStep', 'setIsProcessing', 'setActiveView',
    'setGeneratedContent', 'setHistory', 'setSelectedLanguages',
    # --- Helpers ---
    'addToast', 't', 'warnLog', 'debugLog', 'callGemini',
    'callGeminiVision', 'callTTS', 'cleanJson', 'safeJsonParse',
    'fetchTTSBytes', 'addBlobUrl', 'stopPlayback', 'splitTextToSentences',
    'sanitizeTruncatedCitations', 'normalizeResourceLinks',
    'extractSourceTextForProcessing', 'getReadableContent',
    'handleGenerate', 'handleScoreUpdate', 'flyToElement',
    'getStageElementId', 'detectClimaxArchetype',
    'pcmToWav', 'pcmToMp3', 'storageDB',
    # --- Top-level constants ---
    'AVAILABLE_VOICES', 'SOCRATIC_SYSTEM_PROMPT',
    # --- Round-2 deps from audit ---
    # State vals
    '_isCanvasEnv', '_ttsState', 'personaState', 'adventureState',
    'glossaryAudioCache', 'playingContentId', 'aiSafetyFlags',
    'focusData', 'gameCompletions', 'globalPoints', 'isCanvas',
    'labelChallengeResults', 'pasteEvents', 'wordSoundsHistory',
    'adventureChanceMode', 'adventureCustomInstructions',
    'adventureDifficulty', 'adventureFreeResponseEnabled',
    'adventureInputMode', 'adventureLanguageMode', 'completedActivities',
    'escapeRoomState', 'externalCBMScores', 'fidelityLog',
    'flashcardEngagement', 'interventionLogs', 'isIndependentMode',
    'phonemeMastery', 'pointHistory', 'probeHistory', 'saveFileName',
    'saveType', 'studentProgressLog', 'surveyResponses', 'timeOnTask',
    'wordSoundsAudioLibrary', 'wordSoundsBadges',
    'wordSoundsConfusionPatterns', 'wordSoundsDailyProgress',
    'wordSoundsFamilies', 'wordSoundsScore',
    'focusMode', 'latestGlossary', 'toFocusText',
    'personaReflectionInput', 'fluencyStatus', 'fluencyTimeLimit',
    'selectedGrammarErrors',
    # Refs
    'audioBufferRef', 'activeBlobUrlsRef', 'alloBotRef',
    'isSystemAudioActiveRef', 'lastHandleSpeakRef', 'playbackTimeoutRef',
    'recognitionRef', 'fluencyStartTimeRef',
    # Setters
    'setIsGeneratingAudio', 'setPlaybackState',
    'setDoc', 'setIsProgressSyncing', 'setLastProgressSync',
    'setIsSaveActionPulsing', 'setLastJsonFileSave', 'setShowSaveModal',
    'setStudentProgressLog',
    'setIsGradingReflection', 'setIsPersonaReflectionOpen',
    'setPersonaReflectionInput', 'setPersonaState', 'setReflectionFeedback',
    'setShowReadThisPage',
    'setFluencyFeedback', 'setFluencyResult', 'setFluencyStatus',
    'setFluencyTimeRemaining', 'setFluencyTranscript',
    'setShowFluencyConfetti', 'setSelectedGrammarErrors',
    # Helpers / cross-handler refs.
    # 'playSequence' is a sibling handler in this same module. Including
    # it in deps is benign: handleSpeak's destructure shadows the local
    # module-level version, the shadowed shim re-enters _m.playSequence
    # with fresh deps. BODY_REWRITES_REGEX already threads deps through
    # the call site so either path works.
    'releaseBlob', 'getSideBySideContent', 'playSequence',
    'sessionCounter',
    'SafetyContentChecker', 'db', 'doc', 'getFocusRatio',
    'MathSymbol', 'getDefaultTitle', 'handleRestoreView',
    'highlightGlossaryTerms', 'playSound', 'handleAiSafetyFlag',
    'analyzeFluencyWithGemini', 'calculateLocalFluencyMetrics',
    'applyGlobalCitations', 'chunkText',
]

HANDLERS = [
    'playSequence',
    'handleSpeak',
    'syncProgressToFirestore',
    'executeSaveFile',
    'formatInlineText',
    'autoConfigureSettings',
    'translateResourceItem',
    'handleSaveReflection',
    'handleSocraticSubmit',
    'toggleFluencyRecording',
    'handleFixGrammarErrors',
    'performDeepVerification',
]

BODY_REWRITES_REGEX = [
    # Sibling call: handleSpeak (and possibly others) calls playSequence,
    # which is also extracted into this module. The local playSequence
    # function expects (args, deps); thread deps through.
    # Pattern matches `playSequence(...)` whose closing `)` is at the same
    # nesting level. We don't try multi-line — all known invocations are
    # single-line. Auditor will flag if any multi-line call survives.
    (
        r'\bplaySequence\s*\(([^()]*)\)',
        r'playSequence(\1, deps)',
    ),
]


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
        '// phase_k_helpers_source.jsx — Phase K of CDN modularization.\n',
        '// 12 mid-tier helpers spanning TTS playback, file save, AI config,\n',
        '// translation, Firestore sync, Socratic chat, fluency recording,\n',
        '// reflection saving, grammar fixing, accuracy verification.\n',
        '\n',
    ]

    for hname, start, end in handler_locations:
        body_lines = lines[start-1:end]
        opener = body_lines[0]
        # syncProgressToFirestore is `const X = useCallback(async (args) => { ... }, [deps]);`
        # Detect useCallback wrapping and unwrap so we can extract the inner fn.
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            # Find the inner function signature: useCallback(async (args) => {  or  useCallback((args) => {
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
        # For useCallback variants, the LAST line of the body is `}, [deps]);` — strip it.
        # The bracket-matcher gave us the indent-2 `};` for plain consts, which is the same line.
        # For useCallbacks the closer is `}, [...]);` at indent 2 — need different handling.
        # For SIMPLICITY: the find_indent2_close already finds `  };` only. For useCallbacks it
        # finds the `};` of the callback body — but the actual callback wrap closes with `}, [deps]);`
        # at indent 2. Let me handle this case below.
        if is_useCallback:
            # The body ends just before `  }, [deps]);`. find_indent2_close found a `  };` line —
            # which is actually inside the callback (a nested scope). Need to bracket-match by
            # depth instead.
            # Simpler: re-scan from start to find `  }, [` at indent 2 (the useCallback close).
            uc_close = None
            for i in range(start, len(lines)):
                if lines[i].startswith('  }, ['):
                    uc_close = i + 1
                    break
            if uc_close is None:
                print(f'FAIL: cannot find useCallback close for {hname}', file=sys.stderr); sys.exit(1)
            # Override: body is from start+1 to uc_close-1, and the close line itself is dropped
            body_lines = lines[start-1:uc_close]
            body_inner = body_lines[1:-1]  # drop opener AND the `}, [deps]);` line
            body_joined = ''.join(body_inner)
            print(f'  [useCallback unwrap] {hname}: body now {len(body_inner)} lines (was {end-start-1})')

        for pattern, replacement in BODY_REWRITES_REGEX:
            body_joined = re.sub(pattern, replacement, body_joined)
        src_parts.append(new_opener)
        src_parts.append(destructure)
        src_parts.append(f'  try {{ if (window._DEBUG_PHASE_K) console.log("[PhaseK] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.append(body_joined)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.PhaseKHelpers = {\n')
    for hname in HANDLERS:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_phase_k'
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

    # For each handler, replace the original block with a shim. Process in
    # reverse-line order so earlier offsets stay valid.
    for hname, start, end in sorted(handler_locations, key=lambda x: -x[1]):
        opener = new_lines[start-1]
        is_useCallback = re.search(r'\b(?:React\.)?useCallback\(', opener) is not None
        if is_useCallback:
            # Find the actual close line (`  }, [...]);` at indent 2).
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
            f'{indent_str}  const _m = window.AlloModules && window.AlloModules.PhaseKHelpers;\n',
            f'{indent_str}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args}{sep}{deps_obj});\n',
            f'{indent_str}  throw new Error("[{hname}] PhaseKHelpers module not loaded - reload the page");\n',
            f'{indent_str}}};\n',
        ]
        new_lines[start-1:actual_end] = shim

    LOADER_LINE = "    loadModule('PhaseKHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/phase_k_helpers_module.js');\n"
    if not any('PhaseKHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('GenDispatcherModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
