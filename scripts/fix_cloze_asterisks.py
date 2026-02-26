#!/usr/bin/env python3
"""Fix cloze mode: add ***bold italic*** rendering logic to formatInteractiveText.

The regex already splits on ***...*** (added by previous fix), but the
detection/rendering code doesn't handle it — it falls through to isBold/isItalic
incorrectly.
"""
import sys

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# Fix 1: Update detection logic to handle *** before ** and *
# The file uses \r\n line endings
OLD_DETECT = (
    "          const isBold = part.startsWith('**') && part.endsWith('**');\r\n"
    "          const isItalic = part.startsWith('*') && part.endsWith('*');\r\n"
    "          let content = part;\r\n"
    "          if (isBold) content = part.slice(2, -2);\r\n"
    "          if (isItalic) content = part.slice(1, -1);"
)

NEW_DETECT = (
    "          const isBoldItalic = part.startsWith('***') && part.endsWith('***');\r\n"
    "          const isBold = !isBoldItalic && part.startsWith('**') && part.endsWith('**');\r\n"
    "          const isItalic = !isBoldItalic && !isBold && part.startsWith('*') && part.endsWith('*');\r\n"
    "          let content = part;\r\n"
    "          if (isBoldItalic) content = part.slice(3, -3);\r\n"
    "          else if (isBold) content = part.slice(2, -2);\r\n"
    "          else if (isItalic) content = part.slice(1, -1);"
)

count = content.count(OLD_DETECT)
if count == 0:
    print("ERROR: Could not find isBold/isItalic detection pattern")
    # Try without \r
    OLD_DETECT_LF = OLD_DETECT.replace('\r\n', '\n')
    count_lf = content.count(OLD_DETECT_LF)
    if count_lf > 0:
        print(f"Found {count_lf} instances with LF line endings instead")
        content = content.replace(OLD_DETECT_LF, NEW_DETECT.replace('\r\n', '\n'), 1)
        print("[OK] Fixed detection with LF")
    else:
        print("Could not find pattern with either line ending style")
        sys.exit(1)
else:
    content = content.replace(OLD_DETECT, NEW_DETECT, 1)
    print(f"[OK] Updated bold/italic detection (replaced 1 of {count})")

# Fix 2: Add rendering for isBoldItalic before isBold
OLD_RENDER = (
    "          if (isBold) {\r\n"
    "              return <strong key={i} className={`font-bold ${isDarkBg ? 'text-white' : 'text-indigo-900'}`}>{renderedSubParts}</strong>;\r\n"
    "          }\r\n"
    "          if (isItalic) {\r\n"
    "              return <em key={i} className={`italic ${isDarkBg ? 'text-indigo-200' : 'text-indigo-800'}`}>{renderedSubParts}</em>;\r\n"
    "          }"
)

NEW_RENDER = (
    "          if (isBoldItalic) {\r\n"
    "              return <strong key={i} className={`font-bold italic ${isDarkBg ? 'text-white' : 'text-indigo-900'}`}>{renderedSubParts}</strong>;\r\n"
    "          }\r\n"
    "          if (isBold) {\r\n"
    "              return <strong key={i} className={`font-bold ${isDarkBg ? 'text-white' : 'text-indigo-900'}`}>{renderedSubParts}</strong>;\r\n"
    "          }\r\n"
    "          if (isItalic) {\r\n"
    "              return <em key={i} className={`italic ${isDarkBg ? 'text-indigo-200' : 'text-indigo-800'}`}>{renderedSubParts}</em>;\r\n"
    "          }"
)

count2 = content.count(OLD_RENDER)
if count2 == 0:
    OLD_RENDER_LF = OLD_RENDER.replace('\r\n', '\n')
    count2_lf = content.count(OLD_RENDER_LF)
    if count2_lf > 0:
        content = content.replace(OLD_RENDER_LF, NEW_RENDER.replace('\r\n', '\n'), 1)
        print(f"[OK] Added isBoldItalic rendering (LF, replaced 1 of {count2_lf})")
    else:
        print("ERROR: Could not find isBold rendering pattern")
        sys.exit(1)
else:
    content = content.replace(OLD_RENDER, NEW_RENDER, 1)
    print(f"[OK] Added isBoldItalic rendering (replaced 1 of {count2})")

# Write result
if content == original:
    print("ERROR: No changes were made!")
    sys.exit(1)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nDone! Cloze mode ***word*** bold-italic rendering applied.")
