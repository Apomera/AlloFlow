"""
Patch script: Fix stray # symbol and add Title: heading detection

Changes:
1. Anchor header normalization regex to line boundaries (prevents matching # inside text)
2. Add Title: line detection in renderFormattedText to render as heading
"""

import sys

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# ============================================================
# PATCH 1: Fix stray # symbol - anchor regexes to line boundaries
# ============================================================
old_normalization = """    // Fix compact markdown: ensure headers are always on their own line with blank-line separators
    // 1. Any ## directly after non-newline text -> force line break before it
    normalizedText = normalizedText.replace(/([^\\n])(#{1,6}\\s)/g, '$1\\n\\n$2');
    // 2. Header followed by text on next line without blank separator -> add blank line after header
    normalizedText = normalizedText.replace(/(#{1,6}\\s[^\\n]+)\\n(?!\\n|#{1,6}\\s|$)/g, '$1\\n\\n');
    // 3. Collapse triple+ newlines back to double to prevent excessive spacing
    normalizedText = normalizedText.replace(/\\n{3,}/g, '\\n\\n');"""

new_normalization = """    // Fix compact markdown: ensure headers are always on their own line with blank-line separators
    // 1. Header on same line as preceding text (e.g. "...text ## Header") -> break before it
    normalizedText = normalizedText.replace(/([^\\n])\\s*(#{2,6}\\s)/g, '$1\\n\\n$2');
    // 2. Single # header on same line as text, only if followed by uppercase (title-like)
    normalizedText = normalizedText.replace(/([^\\n])\\s+(#\\s+[A-Z])/g, '$1\\n\\n$2');
    // 3. Header at start of line followed by text without blank separator -> add blank line after
    normalizedText = normalizedText.replace(/^(#{1,6}\\s[^\\n]+)\\n(?!\\n|#{1,6}\\s|$)/gm, '$1\\n\\n');
    // 4. Collapse triple+ newlines back to double to prevent excessive spacing
    normalizedText = normalizedText.replace(/\\n{3,}/g, '\\n\\n');
    // 5. Convert "Title: XYZ" at the very start of text to markdown heading
    normalizedText = normalizedText.replace(/^Title:\\s*(.+)/m, '# $1');"""

if old_normalization in content:
    content = content.replace(old_normalization, new_normalization, 1)
    changes.append("PATCH 1: Fixed header regex anchoring + added Title: heading conversion")
else:
    print("ERROR: Could not find normalization pattern")
    sys.exit(1)

# Write the patched file
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nAll {len(changes)} patches applied successfully:")
for c in changes:
    print(f"  ✓ {c}")
print(f"\nFile size: {len(content):,} bytes")
