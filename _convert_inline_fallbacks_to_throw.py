#!/usr/bin/env python3
"""
Converts the 14 inline-fallback shims in AlloFlowANTI.txt (introduced by
Phase A + Phase C extractions) to the minimal-stub pattern used elsewhere
in the codebase. Each shim's "// Fallback inline body if X failed to load."
marker through its closing `};` is replaced with a single throw line.

Saves ~15-20 KB gzipped on the deployed bundle by removing duplicate body
bytes that were never useful (CDN failure is rare; throw gives clearer
feedback than silent degraded output).
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')

FALLBACK_PATTERN = re.compile(
    r'^(\s*)// Fallback inline body if (\w+) failed to load\.\s*$'
)


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Backup before touching the file.
    backup = MONOLITH + '.bak.pre_inline_fallback_cleanup'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    # Find each fallback marker. For each, scan backward to find the function
    # name (from the `const NAME = ...` opener) and the indent of the function
    # opener — the closing `};` lives at that indent level.
    conversions = []  # list of (start_marker_idx, end_idx_inclusive, replacement_lines)

    i = 0
    while i < len(lines):
        m = FALLBACK_PATTERN.match(lines[i])
        if not m:
            i += 1
            continue
        marker_indent = m.group(1)
        module_name = m.group(2)

        # Scan backward for the function/data opener at indent < len(marker_indent).
        # The opener line is `const NAME = (...) => {` or `const NAME = (...) || {`.
        opener_indent = None
        opener_name = None
        for j in range(i - 1, max(i - 50, -1), -1):
            ln = lines[j]
            stripped = ln.rstrip('\n')
            indent_len = len(ln) - len(ln.lstrip(' '))
            indent = ln[:indent_len]
            if indent_len < len(marker_indent) and 'const ' in ln:
                cm = re.match(r'^(\s*)const\s+([A-Za-z_][A-Za-z_0-9]*)\s*=', ln)
                if cm:
                    opener_indent = cm.group(1)
                    opener_name = cm.group(2)
                    break
        if opener_indent is None:
            print(f'WARN: could not find opener for marker at line {i+1}', file=sys.stderr)
            i += 1
            continue

        # Scan forward from the marker to find the closing `};` at opener_indent.
        end_idx = None
        for k in range(i + 1, min(i + 600, len(lines))):
            if lines[k].rstrip('\n') == opener_indent + '};':
                end_idx = k
                break
        if end_idx is None:
            print(f'WARN: could not find closing }}; for {opener_name} at line {i+1}', file=sys.stderr)
            i += 1
            continue

        # Build replacement: throw line + closer.
        # For DOM_TO_TOOL_ID_MAP (data fallback), the marker isn't applicable —
        # let me detect that case. The DOM_TO_TOOL_ID_MAP shim doesn't HAVE
        # a // Fallback inline body marker; it uses `... || {` followed by data.
        # So this script only touches function shims.
        replacement = [
            f"{marker_indent}throw new Error('[{opener_name}] {module_name} module not loaded — reload the page');\n",
            f"{opener_indent}}};\n",
        ]
        conversions.append((i, end_idx, replacement, opener_name, module_name))
        i = end_idx + 1

    if not conversions:
        print('No conversions to make.')
        sys.exit(0)

    print(f'[plan] {len(conversions)} shim conversions:')
    for start, end, rep, name, mod in conversions:
        print(f'  {name} ({mod}) - lines {start+1}-{end+1} ({end-start+1} lines) -> {len(rep)} lines')

    # Apply in reverse order so earlier indices stay valid.
    for start, end, rep, name, mod in sorted(conversions, key=lambda x: -x[0]):
        lines[start:end + 1] = rep

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(lines)

    deleted = sum(end - start + 1 for start, end, *_ in conversions)
    added = sum(len(r) for _, _, r, *_ in conversions)
    print(f'[edit] {deleted} lines removed, {added} added. Net: {added - deleted} lines.')

if __name__ == '__main__':
    main()
