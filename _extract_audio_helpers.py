#!/usr/bin/env python3
"""
Phase H.1: Extract handleDownloadAudio + handleCardAudioSequence from
AlloFlowANTI.txt into audio_helpers_module.js.

Two non-JSX async handlers, ~253 lines total:
  - handleDownloadAudio (145 lines) — TTS pipeline that splits text into
    speaker segments, voices each via fetchTTSBytes, encodes to MP3/WAV,
    and triggers a browser download.
  - handleCardAudioSequence (108 lines) — flashcard audio playback
    sequencer with retry-on-Gemini-failure logic.

Lessons applied:
  * Per-handler deps lists.
  * Self-injecting loadModule line (re-runnable on backup restore).
  * Fast audit: dump source bare-refs after extraction with the strict
    classifier; any miss appears as a runtime ReferenceError, fix by
    appending to the relevant DEPS list.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'audio_helpers_source.jsx')

# handleDownloadAudio: TTS-to-download pipeline.
DEPS_HANDLE_DOWNLOAD_AUDIO = [
    # Top-level constants
    'AVAILABLE_VOICES',            # top_const  L2380
    # Top-level let (TTS module shim, upgraded at runtime by GeminiAPI module)
    'fetchTTSBytes',               # top_let    L197
    # useState values
    'downloadingContentId',        # useState   L10141
    'selectedVoice',               # useState   L4018
    'textFormat',                  # useState   L9158
    # useState setters
    'setDownloadingContentId',     # useState_setter
    # useRef
    'persistentVoiceMapRef',       # useRef     L10143
    # File-top + react-body helpers
    'addToast',                    # react_body_const  L7242
    't',                           # react_body_const  L1981
    'warnLog',                     # top_const  L365
    'pcmToMp3',                    # react_body_const  L12022
    'pcmToWav',                    # react_body_const  L11994
]

# handleCardAudioSequence: flashcard audio sequencer.
DEPS_HANDLE_CARD_AUDIO_SEQUENCE = [
    # useState values
    'generatedContent',
    'selectedVoice',
    # useState setters
    'setIsPlaying',
    'setPlayingContentId',
    # useRef
    'audioRef',
    'isPlayingRef',
    'playbackSessionRef',
    'playbackRateRef',
    # State-object destructure bindings (from csState / settingsState)
    'flashcardIndex',
    'flashcardLang',
    'flashcardMode',
    'standardDeckLang',
    # Helpers
    'addBlobUrl',
    'callTTS',
    'stopPlayback',
    't',
    'warnLog',
]

HANDLERS_INFO = [
    ('handleDownloadAudio', DEPS_HANDLE_DOWNLOAD_AUDIO),
    ('handleCardAudioSequence', DEPS_HANDLE_CARD_AUDIO_SEQUENCE),
]

BODY_REWRITES = {}  # None needed.


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
        '// audio_helpers_source.jsx - Phase H.1 of CDN modularization.\n',
        '// handleDownloadAudio + handleCardAudioSequence extracted from\n',
        '// AlloFlowANTI.txt 2026-04-25 using the (args, deps) shim pattern.\n',
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
        src_parts.append(f'  try {{ if (window._DEBUG_AUDIO_HELPERS) console.log("[AudioHelpers] {hname} fired"); }} catch(_) {{}}\n')
        src_parts.extend(rewritten_body)
        src_parts.append('};\n\n')

    src_parts.append('window.AlloModules = window.AlloModules || {};\n')
    src_parts.append('window.AlloModules.AudioHelpers = {\n')
    for hname, _ in HANDLERS_INFO:
        src_parts.append(f'  {hname},\n')
    src_parts.append('};\n')

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.writelines(src_parts)
    out_lines = sum(1 for _ in open(SOURCE_OUT, encoding='utf-8'))
    print(f'[extract] wrote {SOURCE_OUT} ({out_lines} lines)')

    backup = MONOLITH + '.bak.pre_audio_helpers'
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
        shim = [
            f'{indent}const {hname} = {async_kw + " " if async_kw else ""}({orig_args}) => {{\n',
            f'{indent}  const _m = window.AlloModules && window.AlloModules.AudioHelpers;\n',
            f'{indent}  if (_m && typeof _m.{hname} === "function") return _m.{hname}({call_args + (", " if call_args else "")}{deps_obj});\n',
            f'{indent}  throw new Error("[{hname}] AudioHelpers module not loaded - reload the page");\n',
            f'{indent}}};\n',
        ]
        new_lines[start-1:end] = shim

    LOADER_LINE = "    loadModule('AudioHelpersModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@MAIN/audio_helpers_module.js');\n"
    if not any('AudioHelpersModule' in ln and 'loadModule' in ln for ln in new_lines):
        for i, ln in enumerate(new_lines):
            if "loadModule('ViewRenderersModule'" in ln:
                new_lines.insert(i + 1, LOADER_LINE)
                print(f'[wire] inserted loadModule call after line {i+1}')
                break

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {len(lines)} -> {len(new_lines)} lines  (delta {len(new_lines) - len(lines)})')


if __name__ == '__main__':
    main()
