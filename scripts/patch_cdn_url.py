"""
Update the jsdelivr CDN URL for stem_lab_module.js to point to the latest commit.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

old_hash = "b7cad97b5a257ca011f81bd2c42ef3445eede6a9"
new_hash = "f9a0da97b5e6b03d4b29bf66ef58e789b67b29eed"

# Replace ONLY in the stem_lab_module.js CDN line, not word_sounds
old_url = f"https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@{old_hash}/stem_lab_module.js"
new_url = f"https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@{new_hash}/stem_lab_module.js"

count = txt.count(old_url)
if count > 0:
    txt = txt.replace(old_url, new_url)
    print(f"✅ Updated stem_lab_module.js CDN URL ({count} occurrences)")
    print(f"   Old: {old_url}")
    print(f"   New: {new_url}")
else:
    print("❌ Old CDN URL not found")
    # Check if the hash exists at all
    if old_hash in txt:
        print(f"   Hash {old_hash} found {txt.count(old_hash)} times")
    else:
        print(f"   Hash {old_hash} not found at all!")

SRC.write_text(txt, encoding="utf-8")
print("Done.")
