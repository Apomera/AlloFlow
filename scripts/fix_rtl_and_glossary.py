# -*- coding: utf-8 -*-
"""
Fix two bugs:
1. highlightGlossaryTerms crash: part.toLowerCase() on undefined
2. RTL direction: English translations in non-side-by-side mode lack dir="ltr"
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# ═══════════════════════════════════════════════════════════
# FIX 1: highlightGlossaryTerms - guard against undefined parts
# The regex .split() can produce undefined entries in the array.
# Line ~37970: const lowerPart = part.toLowerCase();
# Fix: add a guard at the start of the .map callback
# ═══════════════════════════════════════════════════════════

old_glossary = """        return parts.map((part, i) => {
           const lowerPart = part.toLowerCase();"""

new_glossary = """        return parts.map((part, i) => {
           if (part == null) return part;
           const lowerPart = part.toLowerCase();"""

if old_glossary in content:
    content = content.replace(old_glossary, new_glossary, 1)
    changes += 1
    print("Fix 1: Added null guard in highlightGlossaryTerms")
else:
    print("WARNING: Could not find highlightGlossaryTerms target pattern")

# ═══════════════════════════════════════════════════════════
# FIX 2: RTL direction for English translations
# In the non-side-by-side rendering path, the English translation
# paragraphs are rendered inside the same dir="rtl" container.
# Wrap them in a dir="ltr" div.
#
# Before: {renderParagraphs(target, 'tgt', true)}
# After:  <div dir="ltr" className="text-left">{renderParagraphs(target, 'tgt', true)}</div>
# ═══════════════════════════════════════════════════════════

old_render_target = '                                                    {renderParagraphs(target, \'tgt\', true)}'
new_render_target = '                                                    <div dir="ltr" className="text-left">{renderParagraphs(target, \'tgt\', true)}</div>'

if old_render_target in content:
    content = content.replace(old_render_target, new_render_target, 1)
    changes += 1
    print("Fix 2: Wrapped English translation paragraphs with dir='ltr'")
else:
    print("WARNING: Could not find renderParagraphs target pattern")
    # Try alternative pattern
    alt_old = "{renderParagraphs(target, 'tgt', true)}"
    count = content.count(alt_old)
    print(f"  Found {count} occurrences of the target pattern (without full indentation)")

# ═══════════════════════════════════════════════════════════
# FIX 3: Also fix formatInteractiveText for the same issue
# The formatInteractiveText function splits text with regex and the
# subParts can also be undefined. Add guard.
# ═══════════════════════════════════════════════════════════

old_format = """           const renderedSubParts = subParts.map((subPart, sIdx) => {"""
new_format = """           const renderedSubParts = subParts.filter(sp => sp != null).map((subPart, sIdx) => {"""

if old_format in content:
    content = content.replace(old_format, new_format, 1)
    changes += 1
    print("Fix 3: Added null filter in formatInteractiveText subParts")
else:
    print("WARNING: Could not find formatInteractiveText target pattern")

print(f"\nTotal fixes: {changes}")

if changes > 0:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("File saved.")
else:
    print("No changes made!")
