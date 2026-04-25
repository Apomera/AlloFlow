#!/usr/bin/env python3
"""
DEEPER comment stripping — keeps only comments with REASONING markers.
Discards descriptive/narrative comments that just describe what code
does without explaining why.

Targets the Canvas error 13 source-complexity threshold (~51k lines).
The previous safe-strip only removed pure-noise. This pass also removes
descriptive comments that don't carry reasoning.

Strips (NEW):
  - Single-line `//` comments WITHOUT reasoning markers
  - `/** ... */` JSDoc-style blocks WITHOUT reasoning markers
  - All consecutive blank lines beyond the first

Preserves (load-bearing):
  - License header (// @mode, AGPL block)
  - eslint-disable / @ts-ignore / prettier directives
  - Comments containing reasoning markers:
    * TODO / FIXME / NOTE / WARNING / BUG / FIX / HACK / XXX
    * "Why" / "How" / "Reason" / "Because"
    * "prevents" / "to prevent" / "to handle" / "to ensure"
    * "spec" / "wcag" / "aria" / "pdf/ua" / "MCID" / "RFC"
    * "broken" / "broke" / "issue" / "bug fix"
    * "Gemini quirk" / "edge case" / "race"
    * URLs (http/https)
    * "do not" / "don't" / "must" / "never"
    * "rollback" / "revert"
    * Spec citations (digits in form "§14.x.y")

Doesn't touch trailing inline comments on code lines (no regex-literal
risk).
"""
import os
import re
import shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')
BACKUP = MONOLITH + '.with_comments.bak'

REASONING_PATTERNS = [
    re.compile(r'\b(TODO|FIXME|NOTE|WARNING|BUG|FIX|HACK|XXX|HEADS-?UP)\b', re.IGNORECASE),
    re.compile(r'\b(?:Why|How|Reason|Because|prevents?|avoids?|handles?|ensures?|guards?|fixes?)\b', re.IGNORECASE),
    re.compile(r'\b(?:to prevent|to handle|to ensure|to avoid|to keep|to make|to enable|to support|to allow)\b', re.IGNORECASE),
    re.compile(r'\b(?:spec|wcag|aria|pdf[-/]?ua|mcid|rfc|jsx)\b', re.IGNORECASE),
    re.compile(r'\b(?:broken|broke|issue|edge case|race condition|gemini quirk)\b', re.IGNORECASE),
    re.compile(r'\b(?:do not|don\'t|must not|never|always|cannot|can\'t)\b', re.IGNORECASE),
    re.compile(r'\b(?:rollback|revert|legacy|backwards? compat|backward-compat)\b', re.IGNORECASE),
    re.compile(r'§\s*\d+'),  # Spec citations like §14.8.5
    re.compile(r'https?://'),
    re.compile(r'eslint-(?:disable|enable|next-line)'),
    re.compile(r'@ts-(?:ignore|expect-error|nocheck|check)'),
    re.compile(r'prettier-(?:ignore|disable)'),
    re.compile(r'@(?:license|copyright|preserve|param|returns?|throws?|see|deprecated)'),
    re.compile(r'\bcaller\b|\bcallsites?\b'),
    re.compile(r'\bdepends? (?:on|upon)\b'),
    re.compile(r'\b(?:Stage \d+|Phase [A-Z])\b'),  # Our PDF tagging stages / extraction phases
    re.compile(r'\bAGPL|GNU\b'),
    re.compile(r'@mode\s'),
]


def has_reasoning(text):
    for pat in REASONING_PATTERNS:
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
                inner = block_text[block_text.find('/*')+2 : block_text.rfind('*/')]
                if has_reasoning(inner):
                    new_lines.extend(block_buffer)
                else:
                    stripped_count += len(block_buffer)
                block_buffer = []
            continue

        # Inline-block-comment-only line (`/* foo */` standalone)
        if stripped.startswith('/*') and '*/' in stripped:
            close_idx = stripped.rfind('*/')
            if close_idx + 2 == len(stripped):
                inner = stripped[2:close_idx]
                if has_reasoning(inner):
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
            if has_reasoning(stripped):
                new_lines.append(ln)
                continue
            stripped_count += 1
            continue

        # Aggressive blank-line collapse
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
    print(f'[strip] removed {stripped_count} lines (descriptive comments + blank-line collapse)')
    print(f'[edit] {len(lines)} -> {len(new_lines)} lines')


if __name__ == '__main__':
    main()
