#!/usr/bin/env python3
"""
Strips low-value comment lines from AlloFlowANTI.txt to reduce source-file
complexity for Canvas (which evaluates the source, not the deployed minified
bundle, when generating share links — error 13 correlates with source size).

Strips ONLY:
  1. Empty `//` lines
  2. Pure-symbol divider lines (`// ────────` or `// ====`)
  3. VS Code region markers (`// #region`, `// #endregion`)
  4. Decorative header lines (`// ── Title ──` or `// === Title ===`)
  5. Short trailing comments (<30 chars) that don't contain semantic markers

PRESERVES:
  - All comments with TODO / FIXME / NOTE / WARNING / BUG / FIX / Why: / How:
  - All comments containing URLs (likely spec or doc references)
  - Multi-line block comments (`/* */`)
  - Substantive single-line comments (>=30 chars, not header-decor)
  - JSDoc-style comments
  - Any comment block that's >1 line of context

Also trims trailing inline-comment whitespace on code lines (no line-count
change, but reduces line LENGTH which Canvas also evaluates).

Net expected reduction: ~150-220 lines + various line-length reductions.
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
MONOLITH = os.path.join(ROOT, 'AlloFlowANTI.txt')

# Semantic markers — preserve any comment containing these keywords.
PRESERVE_MARKERS = re.compile(
    r'\b(TODO|FIXME|NOTE|WARNING|BUG|FIX|HACK|XXX|HEADS-?UP|why|How|Reason|Because|prevents?|due to|caused|broke|broken|spec\b|wcag|aria|gemini|mcid|pdf/?ua)',
    re.IGNORECASE
)
URL_RE = re.compile(r'https?://')


def is_pure_divider(body):
    """A comment whose only content is divider symbols (==, ──, ━, --, **, ~~)."""
    return bool(re.fullmatch(r'[=\-_*~\u2500-\u257F\s]+', body))


def is_region_marker(body):
    return bool(re.match(r'#region\b|#endregion\b', body, re.IGNORECASE))


def is_header_decor(body):
    """`── Title ──` or `=== Title ===` style — purely decorative section markers."""
    return bool(re.match(r'^[\u2500-\u257F=\-_*~]{2,}\s.+\s[\u2500-\u257F=\-_*~]{2,}\s*$', body))


def has_semantic_marker(body):
    if PRESERVE_MARKERS.search(body):
        return True
    if URL_RE.search(body):
        return True
    return False


def main():
    with open(MONOLITH, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    # Backup before edit
    backup = MONOLITH + '.bak.pre_comment_strip'
    if not os.path.exists(backup):
        shutil.copy2(MONOLITH, backup)
        print(f'[backup] {backup}')

    new_lines = []
    in_block_comment = False
    stripped_counts = {
        'empty': 0, 'divider': 0, 'region': 0, 'header_decor': 0, 'short_decor': 0,
    }
    trailing_trimmed = 0

    for ln in lines:
        # Block-comment tracking — preserve all block comments untouched.
        if in_block_comment:
            new_lines.append(ln)
            if '*/' in ln:
                in_block_comment = False
            continue
        stripped = ln.strip()
        if stripped.startswith('/*') and '*/' not in stripped:
            in_block_comment = True
            new_lines.append(ln)
            continue

        # Pure-comment line analysis
        if stripped.startswith('//'):
            body = stripped[2:].strip()
            # Preserve any comment with semantic markers
            if has_semantic_marker(body):
                new_lines.append(ln)
                continue
            if not body:
                stripped_counts['empty'] += 1
                continue
            if is_pure_divider(body):
                stripped_counts['divider'] += 1
                continue
            if is_region_marker(body):
                stripped_counts['region'] += 1
                continue
            if is_header_decor(body):
                stripped_counts['header_decor'] += 1
                continue
            if len(body) < 30 and not re.match(r'^[A-Z_][A-Z0-9_]+$', body):
                # Short decorative comments (excluding ALL_CAPS labels which
                # are usually meaningful constant-name references)
                # Also skip anything that looks like inline rationale.
                if not re.search(r'[a-z]{4,}', body):
                    # No real word content (just punctuation / emoji / abbrev)
                    stripped_counts['short_decor'] += 1
                    continue
            new_lines.append(ln)
            continue

        # Code line — trim trailing inline-comment whitespace if applicable
        # (reduces line length, no count reduction). Don't trim the comment
        # itself, just any trailing whitespace BEFORE the comment.
        if '//' in ln:
            # Find the // that's the start of an inline comment (not in a URL)
            # Naive: find first // that isn't preceded by ':' (URL guard)
            m = re.search(r'(\S)\s+//', ln)
            if m:
                # We have `code  // comment` — collapse multiple spaces before //
                # to a single space.
                pos = m.end() - 3  # position of the space before //
                cleaned = re.sub(r'\s{2,}//', ' //', ln, count=1)
                if cleaned != ln:
                    trailing_trimmed += 1
                    ln = cleaned
        new_lines.append(ln)

    # Stats
    total_stripped = sum(stripped_counts.values())
    print(f'[strip] empty //:      {stripped_counts["empty"]}')
    print(f'[strip] pure divider:  {stripped_counts["divider"]}')
    print(f'[strip] region marker: {stripped_counts["region"]}')
    print(f'[strip] header decor:  {stripped_counts["header_decor"]}')
    print(f'[strip] short decor:   {stripped_counts["short_decor"]}')
    print(f'[strip] TOTAL lines:   {total_stripped}')
    print(f'[trim]  trailing-ws collapsed on {trailing_trimmed} code lines')

    if total_stripped == 0 and trailing_trimmed == 0:
        print('No changes to make.')
        return

    with open(MONOLITH, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f'[edit] AlloFlowANTI.txt: {total_stripped} comment lines removed')


if __name__ == '__main__':
    main()
