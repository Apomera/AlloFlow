"""
Update CDN URL to use @master instead of pinned commit hash.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

# Find the current CDN URL pattern and replace with @master
import re

# Match any jsdelivr URL for stem_lab_module.js with any hash
old_pattern = r"https://cdn\.jsdelivr\.net/gh/Apomera/AlloFlow@[a-f0-9]+/stem_lab_module\.js"
new_url = "https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@master/stem_lab_module.js"

matches = re.findall(old_pattern, txt)
if matches:
    txt = re.sub(old_pattern, new_url, txt)
    print(f"✅ Updated {len(matches)} CDN URL(s) to @master")
    for m in matches:
        print(f"   Old: {m}")
    print(f"   New: {new_url}")
else:
    # Try @master already
    if "@master/stem_lab_module.js" in txt:
        print("Already using @master")
    else:
        print("❌ Could not find CDN URL pattern")

SRC.write_text(txt, encoding="utf-8")
print("Done.")
