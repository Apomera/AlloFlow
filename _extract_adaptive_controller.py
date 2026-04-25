#!/usr/bin/env python3
"""
Extracts the global gamepad / adaptive controller code from AlloFlowANTI.txt
into adaptive_controller_source.jsx.

Pattern: side-effect initialization, no callsites. Cleanest possible extraction:
delete from monolith, move to module IIFE. Module's IIFE wrapper runs the init
once loaded. No shim needed — graceful degradation if module fails to load
(gamepad just doesn't work, no app crash).
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
SOURCE_OUT = os.path.join(ROOT, 'adaptive_controller_source.jsx')

# Region marker to identify the block (more robust than line numbers).
REGION_OPEN = '// #region --- GLOBAL GAMEPAD / ADAPTIVE CONTROLLER SUPPORT ---'
REGION_CLOSE = '// #endregion --- GLOBAL GAMEPAD ---'


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Find region boundaries
    open_idx = None
    close_idx = None
    for i, ln in enumerate(lines):
        if ln.rstrip() == REGION_OPEN:
            open_idx = i
        elif ln.rstrip() == REGION_CLOSE and open_idx is not None and close_idx is None:
            close_idx = i
            break

    if open_idx is None or close_idx is None:
        print('FAIL: could not locate gamepad region markers', file=sys.stderr)
        sys.exit(1)
    print(f'[verify] region found: lines {open_idx+1}-{close_idx+1} ({close_idx-open_idx+1} lines)')

    # Extract the body (from after the open marker to before the close marker).
    # This excludes the markers themselves; we re-add them in the source file
    # for documentation.
    body = ''.join(lines[open_idx + 1:close_idx])

    # Write source.jsx
    source_content = (
        '// adaptive_controller_source.jsx - global gamepad / adaptive controller support\n'
        '// Extracted from AlloFlowANTI.txt 2026-04-24 (Phase D-light of CDN modularization).\n'
        '//\n'
        '// Pure side-effect initialization. Maps Xbox Adaptive Controller,\n'
        '// Quadstick, switch interfaces, and standard gamepads to keyboard/mouse\n'
        '// events so existing AlloFlow UI components work without modification.\n'
        '// Includes visible cursor reticle, haptic feedback, context-aware D-pad\n'
        '// routing, L3 read-aloud, R3 speech recognition.\n'
        '//\n'
        '// Self-contained: no React hooks, no closures over component state, only\n'
        '// uses DOM APIs + browser globals + window event dispatch. Init is guarded\n'
        '// by `window._alloGamepadGlobal` so loading twice is safe.\n'
        '//\n'
        '// No factory needed - the IIFE wrapper in the build script runs this code\n'
        '// once the module loads. If the module fails to load, gamepad simply\n'
        '// does not work (graceful degradation, no app crash).\n'
        '\n'
        + body
    )

    with open(SOURCE_OUT, 'w', encoding='utf-8') as f:
        f.write(source_content)
    line_count = source_content.count('\n')
    print(f'[extract] wrote {SOURCE_OUT} ({line_count} lines)')

    # Backup before edit
    backup = MONOLITH + '.bak.pre_adaptive_controller'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    # Delete lines from monolith (region markers + body, all of open_idx..close_idx inclusive)
    # Replace with a brief reference comment so future readers know where it went.
    replacement = [
        '// (Adaptive Controller / global gamepad code extracted to\n',
        '//  adaptive_controller_module.js on 2026-04-24 - see Phase D-light.)\n',
    ]
    new_lines = list(lines)
    new_lines[open_idx:close_idx + 1] = replacement

    # Add loadModule call near the existing module-load block. Anchor on the
    # most recent extraction (TextPipelineHelpersModule from Phase C).
    insert_idx = None
    for i, ln in enumerate(new_lines):
        if "loadModule('TextPipelineHelpersModule'" in ln:
            insert_idx = i + 1
            break
    if insert_idx is None:
        print('FAIL: cannot find TextPipelineHelpersModule loadModule line for anchoring', file=sys.stderr)
        sys.exit(1)

    indent = '    '
    load_block = [
        f"{indent}// AdaptiveController - global gamepad / Xbox Adaptive Controller support.\n",
        f"{indent}// Side-effect init runs in the module's IIFE on load. No factory needed.\n",
        f"{indent}// If module fails to load, gamepad simply does not work (no crash).\n",
        f"{indent}loadModule('AdaptiveControllerModule', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@8944acc/adaptive_controller_module.js');\n",
    ]
    new_lines[insert_idx:insert_idx] = load_block

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

    deleted = close_idx - open_idx + 1
    added = len(replacement) + len(load_block)
    print(f'[edit] AlloFlowANTI.txt: {deleted} lines deleted, {added} added. Net: {added - deleted} lines.')


if __name__ == '__main__':
    main()
