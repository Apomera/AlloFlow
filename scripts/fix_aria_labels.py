"""
fix_aria_labels.py — Bulk-replace hardcoded aria-label="X" with aria-label={t('common.X')}
in AlloFlowANTI.txt. Also generates the new UI_STRINGS keys to add to ui_strings.js.

Usage: python scripts/fix_aria_labels.py
"""

import re
import json
from collections import Counter
from pathlib import Path

SRC = Path(__file__).parent.parent / "AlloFlowANTI.txt"
UI_STRINGS_FILE = Path(__file__).parent.parent / "ui_strings.js"

def to_key(label: str) -> str:
    """Convert an aria-label string to a UI_STRINGS key name."""
    # Lowercase, replace spaces/special chars with underscores
    key = label.lower().strip()
    key = re.sub(r'[^a-z0-9]+', '_', key)
    key = key.strip('_')
    # Truncate very long keys
    if len(key) > 40:
        key = key[:40].rstrip('_')
    return key

def main():
    content = SRC.read_text(encoding='utf-8')
    
    # Phase 1: Find all hardcoded aria-label="X" (not already using {t(...)})
    pattern = re.compile(r'aria-label="([^"]*)"')
    matches = pattern.findall(content)
    
    # Count frequencies
    freq = Counter(matches)
    total = len(matches)
    unique = len(freq)
    
    print(f"Found {total} hardcoded aria-label instances ({unique} unique values)")
    print()
    
    # Phase 2: Build mapping of label -> t() key
    # Group into categories:
    # - Generic actions (Refresh, Edit, Close, etc.) -> common.*
    # - Already existing t() keys that we can reuse
    
    key_map = {}  # label -> full t() key path
    new_strings = {}  # keys to add to UI_STRINGS.common
    
    for label, count in freq.most_common():
        if not label.strip():
            continue  # Skip empty labels
            
        key_name = to_key(label)
        if not key_name:
            continue
            
        t_key = f"common.{key_name}"
        key_map[label] = t_key
        new_strings[key_name] = label
    
    print(f"Generated {len(key_map)} key mappings")
    print(f"Top 20 by frequency:")
    for label, count in freq.most_common(20):
        if label in key_map:
            print(f"  [{count:3d}x] aria-label=\"{label}\" -> {{t('{key_map[label]}')}}")
    print()
    
    # Phase 3: Replace in content
    replaced = 0
    skipped = 0
    
    def replace_aria(match):
        nonlocal replaced, skipped
        label = match.group(1)
        if label in key_map:
            replaced += 1
            return f"aria-label={{t('{key_map[label]}')}}"
        else:
            skipped += 1
            return match.group(0)  # Leave as-is
    
    new_content = pattern.sub(replace_aria, content)
    
    print(f"Replaced: {replaced}")
    print(f"Skipped: {skipped}")
    
    # Phase 4: Write results
    if replaced > 0:
        SRC.write_text(new_content, encoding='utf-8')
        print(f"\n✅ Saved {SRC.name}")
    
    # Phase 5: Generate the new keys JSON for UI_STRINGS
    # Format as a JS object snippet to paste into ui_strings.js
    keys_output = Path(__file__).parent.parent / "aria_keys_to_add.json"
    keys_output.write_text(json.dumps(new_strings, indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"✅ Saved {keys_output.name} ({len(new_strings)} keys)")
    
    # Also print the JS snippet
    print("\n=== ADD TO UI_STRINGS.common ===")
    for key, value in sorted(new_strings.items()):
        print(f"    {key}: '{value}',")

if __name__ == "__main__":
    main()
