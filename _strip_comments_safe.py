#!/usr/bin/env python3
"""
SAFE aggressive comment stripping for AlloFlowANTI.txt.

Only touches lines whose ENTIRE content is a comment. Never touches
trailing inline comments on code lines (because that requires regex-literal
awareness which got my last parser in trouble).

Saves AlloFlowANTI.txt.with_comments.bak as the historical reference copy.

Strips:
  - Any line whose stripped content starts with `//`
  - Any line that's purely inside a `/* ... */` block (block start to block end)
  - Any line that's purely whitespace AFTER stripping (collapses runs of blank
    lines to a single blank line)

Preserves:
  - Lines containing eslint-disable / @ts-ignore / @license / etc.
  - Lines that have CODE followed by a comment (untouched)
  - Anything that isn't a pure comment line

Net target: ~1,000-1,500 lines (most of the 1,482 comment lines from the
audit) without risk of regex-literal misparse.
"""
import os
import re
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
BACKUP = MONOLITH + '.with_comments.bak'

PRESERVE_PATTERNS = [
    re.compile(r'eslint-(?:disable|enable|next-line)'),
    re.compile(r'@ts-(?:ignore|expect-error|nocheck|check)'),
    re.compile(r'prettier-(?:ignore|disable)'),
    re.compile(r'jshint\s'),
    re.compile(r'jslint\s'),
    re.compile(r'@(?:license|copyright|preserve)'),
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

    new_lines = []
    in_block = False
    block_buffer = []
    stripped_count = 0
    blank_run = 0

    for ln in lines:
        stripped = ln.strip()

        if in_block:
            block_buffer.append(ln)
            if '*/' in stripped:
                in_block = False
                block_text = ''.join(block_buffer)
                if should_preserve(block_text):
                    new_lines.extend(block_buffer)
                else:
                    stripped_count += len(block_buffer)
                block_buffer = []
            continue

        # Block comment that opens AND closes on this line:
        # `/* ... */` standalone or  ` /* ... */ ` with surrounding whitespace
        if stripped.startswith('/*') and '*/' in stripped:
            # Inline block comment as the whole line content
            # E.g., line is `  /* foo */` only
            close_idx = stripped.rfind('*/')
            if close_idx + 2 == len(stripped):
                # Pure block-comment line
                if should_preserve(stripped):
                    new_lines.append(ln)
                else:
                    stripped_count += 1
                continue
            # Otherwise the block is followed by code or the * is mid-line; keep
            new_lines.append(ln)
            continue

        # Multi-line block comment opener
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

        # Blank line collapse
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
    print(f'[strip] removed {stripped_count} comment-only lines')
    print(f'[edit] {len(lines)} -> {len(new_lines)} lines')


if __name__ == '__main__':
    main()
