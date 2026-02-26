#!/usr/bin/env python3
"""Fix PPTX export markdown rendering.

Adds a cleanTextForPptx helper and applies it to all text-cleaning
locations in handleExportSlides.
"""
import sys

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ── Step 1: Add cleanTextForPptx helper before handleExportSlides ────────
ANCHOR = "  const handleExportSlides = () => {"
HELPER = """  const cleanTextForPptx = (text) => {
      if (!text) return '';
      return text
          .replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1')   // [text](url) -> text
          .replace(/https?:\\/\\/[^\\s]+/g, '')              // bare URLs -> removed
          .replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '$1')          // ***bold italic*** -> text
          .replace(/\\*\\*(.+?)\\*\\*/g, '$1')               // **bold** -> text
          .replace(/(?<![*])\\*([^*]+)\\*(?![*])/g, '$1')  // *italic* -> text
          .replace(/^#{1,6}\\s+/gm, '')                    // ## headers -> text
          .replace(/<\\/?h[1-6][^>]*>/gi, '');              // HTML headers -> text
  };
"""

if ANCHOR not in content:
    print("ERROR: Could not find handleExportSlides anchor")
    sys.exit(1)
content = content.replace(ANCHOR, HELPER + ANCHOR, 1)
print("[OK] Added cleanTextForPptx helper")

# ── Step 2: Fix simplified text rawText (L48763 area) ────────────────────
# Original: const rawText = para.replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\*\*/g, '').replace(/\*/g, '');
OLD_RAW = "const rawText = para.replace(/\\[(.*?)\\]\\(.*?\\)/g, '$1').replace(/\\*\\*/g, '').replace(/\\*/g, '');"
NEW_RAW = "const rawText = cleanTextForPptx(para);"
count = content.count(OLD_RAW)
if count == 0:
    print("WARNING: Fix 2 target not found (rawText)")
else:
    content = content.replace(OLD_RAW, NEW_RAW, 1)
    print(f"[OK] Fix 2: Replaced rawText calculation")

# ── Step 3: Fix simplified text non-link part cleaning (L48792 area) ─────
# Original: text: part.replace(/\*\*/g, '').replace(/\*/g, '')
# This is inside the link-splitting logic, so we only clean non-link parts
OLD_PART = "text: part.replace(/\\*\\*/g, '').replace(/\\*/g, '')"
NEW_PART = "text: cleanTextForPptx(part)"
count3 = content.count(OLD_PART)
if count3 == 0:
    print("WARNING: Fix 3 target not found (part cleaning)")
else:
    content = content.replace(OLD_PART, NEW_PART, 1)
    print(f"[OK] Fix 3: Replaced simplified text part cleaning")

# ── Step 4: Fix FAQ answers (L48986 area) ────────────────────────────────
# Original: (faq.answer || '').replace(/\*\*/g, '').replace(/\*/g, '')
OLD_FAQ = "(faq.answer || '').replace(/\\*\\*/g, '').replace(/\\*/g, '')"
NEW_FAQ = "cleanTextForPptx(faq.answer || '')"
count4 = content.count(OLD_FAQ)
if count4 == 0:
    print("WARNING: Fix 4 target not found (FAQ answers)")
else:
    content = content.replace(OLD_FAQ, NEW_FAQ, 1)
    print(f"[OK] Fix 4: Replaced FAQ answer cleaning")

# ── Step 5: Fix brainstorm title (L49001 area) ──────────────────────────
# Original: richText.push({ text: title.replace(/\*\*/g, '').replace(/\*/g, ''), options: { fontSize: 14, bold: true, color: themeColor, breakLine: true, bullet: { type: 'number', color: themeColor } } });
OLD_BRAIN_TITLE = "text: title.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 14, bold: true, color: themeColor, breakLine: true, bullet: { type: 'number', color: themeColor } }"
NEW_BRAIN_TITLE = "text: cleanTextForPptx(title), options: { fontSize: 14, bold: true, color: themeColor, breakLine: true, bullet: { type: 'number', color: themeColor } }"
count5 = content.count(OLD_BRAIN_TITLE)
if count5 == 0:
    print("WARNING: Fix 5 target not found (brainstorm title)")
else:
    content = content.replace(OLD_BRAIN_TITLE, NEW_BRAIN_TITLE, 1)
    print(f"[OK] Fix 5: Replaced brainstorm title cleaning")

# ── Step 6: Fix brainstorm description (L49002 area) ────────────────────
OLD_BRAIN_DESC = "text: desc.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 12, color: darkText, breakLine: true, indentLevel: 1, paraSpaceAfter: 8 }"
NEW_BRAIN_DESC = "text: cleanTextForPptx(desc), options: { fontSize: 12, color: darkText, breakLine: true, indentLevel: 1, paraSpaceAfter: 8 }"
count6 = content.count(OLD_BRAIN_DESC)
if count6 == 0:
    print("WARNING: Fix 6 target not found (brainstorm desc)")
else:
    content = content.replace(OLD_BRAIN_DESC, NEW_BRAIN_DESC, 1)
    print(f"[OK] Fix 6: Replaced brainstorm description cleaning")

# ── Step 7: Fix sentence frames list items (L49013 area) ────────────────
OLD_SF_LIST = "text: frameText.replace(/\\*\\*/g, '').replace(/\\*/g, ''), options: { fontSize: 13, color: darkText, breakLine: true, bullet: { type: 'number', color: themeColor }, paraSpaceAfter: 6 }"
NEW_SF_LIST = "text: cleanTextForPptx(frameText), options: { fontSize: 13, color: darkText, breakLine: true, bullet: { type: 'number', color: themeColor }, paraSpaceAfter: 6 }"
count7 = content.count(OLD_SF_LIST)
if count7 == 0:
    print("WARNING: Fix 7 target not found (sentence frames list)")
else:
    content = content.replace(OLD_SF_LIST, NEW_SF_LIST, 1)
    print(f"[OK] Fix 7: Replaced sentence frames list cleaning")

# ── Step 8: Fix sentence frames text (L49017 area) ──────────────────────
OLD_SF_TEXT = "slide.addText(item.data.text.replace(/\\*\\*/g, '').replace(/\\*/g, ''),"
NEW_SF_TEXT = "slide.addText(cleanTextForPptx(item.data.text),"
count8 = content.count(OLD_SF_TEXT)
if count8 == 0:
    print("WARNING: Fix 8 target not found (sentence frames text)")
else:
    content = content.replace(OLD_SF_TEXT, NEW_SF_TEXT, 1)
    print(f"[OK] Fix 8: Replaced sentence frames text cleaning")

# ── Step 9: Fix math content (L49026 area) ──────────────────────────────
OLD_MATH = "const raw = para.replace(/\\*\\*/g, '').replace(/\\*/g, '').replace(/\\$\\$/g, '').replace(/\\$/g, '');"
NEW_MATH = "const raw = cleanTextForPptx(para).replace(/\\$\\$/g, '').replace(/\\$/g, '');"
count9 = content.count(OLD_MATH)
if count9 == 0:
    print("WARNING: Fix 9 target not found (math content)")
else:
    content = content.replace(OLD_MATH, NEW_MATH, 1)
    print(f"[OK] Fix 9: Replaced math content cleaning")

# ── Write result ─────────────────────────────────────────────────────────
if content == original:
    print("ERROR: No changes were made!")
    sys.exit(1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone! All PPTX export fixes applied.")
