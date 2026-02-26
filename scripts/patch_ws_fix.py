"""
Fix word sounds module:
1. Add getWordSoundsString as a prop to WordSoundsModal
2. Update word_sounds_module.js CDN URL to @master
"""
from pathlib import Path
import re

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

# PATCH 1: Add getWordSoundsString as a prop
# Find the props block - add after the last prop before onProbeComplete
old_prop_line = "                            isProbeMode, probeGradeLevel,"
new_prop_line = "                            isProbeMode, probeGradeLevel, getWordSoundsString,"

count1 = txt.count(old_prop_line)
if count1 > 0:
    txt = txt.replace(old_prop_line, new_prop_line, 1)
    print(f"PATCH 1 ✅ Added getWordSoundsString prop ({count1} matches, replaced 1)")
else:
    print("PATCH 1 ❌ Could not find isProbeMode prop line")

# PATCH 2: Update word_sounds_module.js CDN URL to @master
old_ws_pattern = r"https://cdn\.jsdelivr\.net/gh/Apomera/AlloFlow@[a-f0-9]+/word_sounds_module\.js"
new_ws_url = "https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@master/word_sounds_module.js"

matches = re.findall(old_ws_pattern, txt)
if matches:
    txt = re.sub(old_ws_pattern, new_ws_url, txt)
    print(f"PATCH 2 ✅ Updated word_sounds CDN URL to @master ({len(matches)} matches)")
else:
    if "@master/word_sounds_module.js" in txt:
        print("PATCH 2 ℹ️ Already using @master")
    else:
        print("PATCH 2 ❌ Could not find word_sounds CDN URL")

SRC.write_text(txt, encoding="utf-8")
print("Done.")
