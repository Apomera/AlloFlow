"""
Focused investigation:
1. Header help mode toggle - find it, check its z-index vs modal overlays
2. Word Sounds -> glossary view coupling - find why glossary opens when WS activates
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

lines = open('AlloFlowANTI.txt', 'r', encoding='utf-8-sig').readlines()
out = []

# ===================================================================
# 1. Find the HEADER help mode toggle 
# ===================================================================
out.append("=== HEADER HELP MODE TOGGLE ===")
for i, l in enumerate(lines):
    if 'setIsHelpMode' in l:
        # Skip wizard ones (L27xxx area)
        if i > 27800 and i < 28200:
            continue
        # Show context
        out.append(f"L{i+1}: {l.strip()[:200]}")
        # Check if this is in the header area
        for j in range(max(0, i-10), i):
            if 'header' in lines[j].lower() or 'tour-header' in lines[j] or 'data-help-toggle' in lines[j]:
                out.append(f"  CONTEXT L{j+1}: {lines[j].strip()[:150]}")

# Find the header help mode button specifically
out.append("\n=== data-help-toggle BUTTON ===")
for i, l in enumerate(lines):
    if 'data-help-toggle' in l:
        out.append(f"L{i+1}: {l.strip()[:200]}")
        for j in range(max(0, i-3), min(len(lines), i+5)):
            out.append(f"  L{j+1}: {lines[j].strip()[:200]}")

# Find the header's z-index
out.append("\n=== HEADER Z-INDEX ===")
for i, l in enumerate(lines):
    if ('tour-header' in l or '<header' in l) and ('z-' in l or 'zIndex' in l):
        out.append(f"L{i+1}: {l.strip()[:200]}")

# ===================================================================
# 2. Word Sounds -> Glossary coupling
# ===================================================================
out.append("\n=== WORD SOUNDS + GLOSSARY COUPLING ===")

# Find what happens when Word Sounds mode activates
for i, l in enumerate(lines):
    s = l.strip()
    if 'wordSounds' in s and 'gloss' in s.lower():
        out.append(f"L{i+1}: {s[:200]}")
    if 'setActiveWordSounds' in s and 'gloss' in ''.join(lines[max(0,i-3):i+5]).lower():
        out.append(f"ACTIVATE L{i+1}: {s[:200]}")

# Find showGlossary or glossary visibility state
out.append("\n=== GLOSSARY VISIBILITY STATE ===")
for i, l in enumerate(lines):
    s = l.strip()
    if ('showGlossary' in s or 'isGlossaryOpen' in s or 'glossaryVisible' in s) and ('useState' in s or 'set' in s):
        out.append(f"L{i+1}: {s[:200]}")
    if 'activeView' in s and ('glossary' in s.lower() or 'word_sounds' in s.lower() or 'wordSounds' in s):
        if 'useState' in s or 'set' in s.lower() or '===' in s:
            out.append(f"  ACTIVE_VIEW L{i+1}: {s[:200]}")

# Find activeWordSoundsActivity and its relationship to toolView/activeView
out.append("\n=== WORD SOUNDS ACTIVATION ===")
for i, l in enumerate(lines):
    s = l.strip()
    if 'activeWordSoundsActivity' in s and ('useState' in s or 'setActive' in s) and 'const' in s:
        out.append(f"STATE L{i+1}: {s[:200]}")

# Find where Word Sounds modal/overlay is rendered
for i, l in enumerate(lines):
    s = l.strip()
    if ('WordSoundsStudio' in s or 'wordSoundsStudio' in s or 'word_sounds_studio' in s) and ('<' in s or 'return' in s or 'render' in s.lower()):
        out.append(f"RENDER L{i+1}: {s[:200]}")

# Check if launching Word Sounds also opens/sets a glossary-related state
out.append("\n=== LAUNCH WORD SOUNDS LOGIC ===")
for i, l in enumerate(lines):
    if 'launchWordSounds' in l or 'handleLaunchWordSounds' in l or 'openWordSounds' in l:
        out.append(f"L{i+1}: {l.strip()[:200]}")
        for j in range(i, min(len(lines), i + 20)):
            out.append(f"  L{j+1}: {lines[j].strip()[:200]}")
            if lines[j].strip().startswith('};') or lines[j].strip().startswith('}'):
                break

# Find glossary panel rendering condition
out.append("\n=== GLOSSARY PANEL RENDER CONDITION ===")
for i, l in enumerate(lines):
    if 'GlossaryPanel' in l or 'glossary_panel' in l or 'GlossaryView' in l:
        if '<' in l or 'return' in l or '{' in l:
            out.append(f"L{i+1}: {l.strip()[:200]}")

result = '\n'.join(out)
with open('focused_audit.txt', 'w', encoding='utf-8') as f:
    f.write(result)
print(f"{len(out)} findings")
