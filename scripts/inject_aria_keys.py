"""
inject_aria_keys.py — Inject the generated aria keys into ui_strings.js common section.
Usage: python scripts/inject_aria_keys.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent

# Load the new aria keys
aria_keys = json.loads((ROOT / "aria_keys_to_add.json").read_text(encoding="utf-8"))
print(f"Keys to add: {len(aria_keys)}")

# Load ui_strings.js
ui_file = ROOT / "ui_strings.js"
content = ui_file.read_text(encoding="utf-8")

# Find the 'common:' section
match = re.search(r"(common\s*:\s*\{)", content)
if not match:
    print("ERROR: common section not found")
    exit(1)

insert_pos = match.end()
print(f"Found common section at char position {match.start()}")

# Build the new keys as JS object entries
new_entries = "\n"
for key, value in sorted(aria_keys.items()):
    escaped = value.replace("'", "\\'")
    new_entries += f"    {key}: '{escaped}',\n"

# Insert after 'common: {'
new_content = content[:insert_pos] + new_entries + content[insert_pos:]
ui_file.write_text(new_content, encoding="utf-8")
print(f"✅ Inserted {len(aria_keys)} keys into ui_strings.js")
print("Done!")
