#!/usr/bin/env python3
"""Fix markdown rendering in leveled text interaction modes.

Adds a cleanTextForInteraction helper and applies it to all 9 locations
where raw markdown was being shown instead of clean text.
"""
import sys

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ── Helper: Add cleanTextForInteraction before formatInlineText ──────────
ANCHOR = "  const formatInlineText = (text, enableGlossary = true, isDarkBg = false) => {"
HELPER = """  const cleanTextForInteraction = (text) => {
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
    print("ERROR: Could not find formatInlineText anchor")
    sys.exit(1)
content = content.replace(ANCHOR, HELPER + ANCHOR, 1)
print("[OK] Added cleanTextForInteraction helper")

# ── Fix 1 & 2: Explain/Revise monolingual + bilingual ───────────────────
# These both have: const cleanText = para.replace(/\*\*|\*/g, '');
# Inside if (interactionMode === 'explain' || interactionMode === 'revise'...)
# There are multiple instances, so we replace ALL of them
OLD_CLEAN = "const cleanText = para.replace(/\\*\\*|\\*/g, '');"
NEW_CLEAN = "const cleanText = cleanTextForInteraction(para);"
count = content.count(OLD_CLEAN)
if count == 0:
    print("ERROR: Could not find explain/revise cleanText lines")
    sys.exit(1)
content = content.replace(OLD_CLEAN, NEW_CLEAN)
print(f"[OK] Fix 1+2: Replaced {count} explain/revise cleanText instances")

# ── Fix 3: Side-by-side renderTextContent explain/revise ─────────────────
OLD_SBS = "const cleanText = sentences.join(' ').replace(/\\*\\*|\\*/g, '').replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1');"
NEW_SBS = "const cleanText = cleanTextForInteraction(sentences.join(' '));"
if OLD_SBS not in content:
    print("WARNING: Fix 3 target not found (side-by-side renderTextContent)")
else:
    content = content.replace(OLD_SBS, NEW_SBS, 1)
    print("[OK] Fix 3: Replaced side-by-side renderTextContent cleanText")

# ── Fix 5 & 8: Bilingual side-by-side define/phonics + add-glossary ─────
OLD_TEXTBLOCK = "const textBlock = sentences.join(' ').replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1').replace(/https?:\\/\\/[^\\s]+/g, '');"
NEW_TEXTBLOCK = "const textBlock = cleanTextForInteraction(sentences.join(' '));"
count_tb = content.count(OLD_TEXTBLOCK)
if count_tb == 0:
    print("WARNING: Fix 5+8 target not found (textBlock in side-by-side)")
else:
    content = content.replace(OLD_TEXTBLOCK, NEW_TEXTBLOCK)
    print(f"[OK] Fix 5+8: Replaced {count_tb} textBlock instances")

# ── Fix 7: Add-Glossary monolingual ──────────────────────────────────────
OLD_CLEANPARA = "const cleanPara = para.replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1').replace(/https?:\\/\\/[^\\s]+/g, '');"
NEW_CLEANPARA = "const cleanPara = cleanTextForInteraction(para);"
if OLD_CLEANPARA not in content:
    print("WARNING: Fix 7 target not found (add-glossary monolingual)")
else:
    content = content.replace(OLD_CLEANPARA, NEW_CLEANPARA, 1)
    print("[OK] Fix 7: Replaced add-glossary monolingual cleanPara")

# ── Fix 4 & 6: Define/Phonics monolingual + bilingual renderParagraphs ───
# These use: para.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/https?:\/\/[^\s]+/g, '').split
# and also para.replace(...).replace(...).split at other locations
OLD_PARA_SPLIT = "para.replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1').replace(/https?:\\/\\/[^\\s]+/g, '').split(/(\\s+)/)"
NEW_PARA_SPLIT = "cleanTextForInteraction(para).split(/(\\s+)/)"
count_ps = content.count(OLD_PARA_SPLIT)
if count_ps == 0:
    print("WARNING: Fix 4+6 target not found (para.replace...split)")
else:
    content = content.replace(OLD_PARA_SPLIT, NEW_PARA_SPLIT)
    print(f"[OK] Fix 4+6: Replaced {count_ps} para.replace...split instances")

# ── Fix 9: Compare mode ─────────────────────────────────────────────────
OLD_COMPARE1 = "let originalText = sourceContent.replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1');"
NEW_COMPARE1 = "let originalText = cleanTextForInteraction(sourceContent);"
if OLD_COMPARE1 not in content:
    print("WARNING: Fix 9a target not found (compare originalText)")
else:
    content = content.replace(OLD_COMPARE1, NEW_COMPARE1, 1)
    print("[OK] Fix 9a: Replaced compare originalText")

OLD_COMPARE2 = "adaptedText = adaptedText.replace(/\\[([^\\]]+)\\]\\([^\\)]+\\)/g, '$1');"
NEW_COMPARE2 = "adaptedText = cleanTextForInteraction(adaptedText);"
if OLD_COMPARE2 not in content:
    print("WARNING: Fix 9b target not found (compare adaptedText)")
else:
    content = content.replace(OLD_COMPARE2, NEW_COMPARE2, 1)
    print("[OK] Fix 9b: Replaced compare adaptedText")

# ── Write result ─────────────────────────────────────────────────────────
if content == original:
    print("ERROR: No changes were made!")
    sys.exit(1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nDone! All fixes applied.")
