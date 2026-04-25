#!/usr/bin/env python3
"""
TRULY aggressive: strip ALL // comments except license header and lint directives.

Run after _strip_comments_safe.py and _strip_comments_aggressive_v2.py have
already taken the easy wins. This pass eliminates ALL remaining // comments
even ones with reasoning markers — backup at .with_comments.bak preserves
the historical context.

PRESERVES:
  - Line 1-15 (license header + @mode react directive)
  - eslint-disable / @ts-ignore / prettier directives
  - Lines whose stripped content starts with /** (JSDoc) — those go through
    block-comment processing and stay if they have reasoning markers; otherwise
    also stripped

DOES NOT touch:
  - Trailing inline comments on code lines (regex-literal risk)
  - String literals (even if they contain // patterns)
  - Block comments (/* */) — handled separately, kept if reasoning-marked
"""
import os
import re
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
BACKUP = MONOLITH + '.with_comments.bak'

PRESERVE_PATTERNS = [
    re.compile(r'^@mode\s'),
    re.compile(r'eslint-(?:disable|enable|next-line)'),
    re.compile(r'@ts-(?:ignore|expect-error|nocheck|check)'),
    re.compile(r'prettier-(?:ignore|disable)'),
    re.compile(r'@(?:license|copyright|preserve)'),
    re.compile(r'GNU Affero|AGPL'),
]


def should_preserve(text):
    for pat in PRESERVE_PATTERNS:
        if pat.search(text):
            return True
    return False


def main():
    if not os.path.exists(BACKUP):
        shutil.copy2(MONOLITH, BACKUP)
        print(f'[backup] {BACKUP}')

    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # The license header is in lines 1-15 (// @mode + /* AGPL */ block).
    # Walk the file: keep line 1-N as license header (until first non-comment line),
    # then strip aggressively after that.

    new_lines = []
    in_block = False
    block_buffer = []
    stripped_count = 0
    blank_run = 0
    license_phase = True  # We're at the top, preserving everything until first import

    for i, ln in enumerate(lines):
        stripped = ln.strip()

        # End license phase once we hit the first import
        if license_phase:
            if stripped.startswith('import '):
                license_phase = False
            new_lines.append(ln)
            continue

        if in_block:
            block_buffer.append(ln)
            if '*/' in stripped:
                in_block = False
                block_text = ''.join(block_buffer)
                inner = block_text[block_text.find('/*')+2 : block_text.rfind('*/')]
                if should_preserve(inner):
                    new_lines.extend(block_buffer)
                else:
                    stripped_count += len(block_buffer)
                block_buffer = []
            continue

        # Inline block comment standalone
        if stripped.startswith('/*') and '*/' in stripped:
            close_idx = stripped.rfind('*/')
            if close_idx + 2 == len(stripped):
                inner = stripped[2:close_idx]
                if should_preserve(inner):
                    new_lines.append(ln)
                else:
                    stripped_count += 1
                continue
            new_lines.append(ln)
            continue

        # Multi-line block opener
        if stripped.startswith('/*'):
            in_block = True
            block_buffer = [ln]
            continue

        # Pure single-line comment
        if stripped.startswith('//'):
            if should_preserve(stripped):
                new_lines.append(ln)
                continue
            stripped_count += 1
            continue

        # Blank-line collapse (max 1 in a row)
        if stripped == '':
            blank_run += 1
            if blank_run <= 1:
                new_lines.append(ln)
            else:
                stripped_count += 1
            continue
        else:
            blank_run = 0

        new_lines.append(ln)

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[strip] removed {stripped_count} lines')
    print(f'[edit] {len(lines)} -> {len(new_lines)} lines')


if __name__ == '__main__':
    main()
