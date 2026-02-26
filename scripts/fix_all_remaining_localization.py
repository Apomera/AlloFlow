"""
fix_all_remaining_localization.py
Fixes ALL remaining hardcoded English strings in AlloFlowANTI.txt:
1. Hardcoded title="X" attributes → title={t('common.x')}
2. Hardcoded addToast("X") and addToast(`X`) → addToast(t('toasts.x'))
3. Hardcoded placeholder="X" → placeholder={t('common.placeholder_x')}
4. Hardcoded heading text <h1-h3>X</h1-h3> → <h1-h3>{t('common.x')}</h1-h3>

Also generates new UI_STRINGS keys to add.

Usage: python scripts/fix_all_remaining_localization.py
"""

import re
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "AlloFlowANTI.txt"
UI_FILE = ROOT / "ui_strings.js"
OUTPUT_KEYS = ROOT / "remaining_keys_to_add.json"

def to_key(label: str) -> str:
    """Convert an English string to a safe key name."""
    key = label.lower().strip()
    key = re.sub(r'[^a-z0-9]+', '_', key)
    key = key.strip('_')
    if len(key) > 50:
        key = key[:50].rstrip('_')
    return key

def main():
    content = SRC.read_text(encoding='utf-8')
    new_keys = defaultdict(dict)  # namespace -> { key: value }
    total_replaced = 0
    
    # =========================================================
    # 1. FIX HARDCODED title="X" ATTRIBUTES
    # =========================================================
    print("=" * 60)
    print("PHASE 1: Hardcoded title attributes")
    print("=" * 60)
    
    title_pattern = re.compile(r'title="([A-Z][^"]*)"')
    title_matches = title_pattern.findall(content)
    title_freq = Counter(title_matches)
    print(f"  Found {len(title_matches)} hardcoded title attrs ({len(title_freq)} unique)")
    
    title_replaced = 0
    def replace_title(match):
        nonlocal title_replaced
        value = match.group(1)
        key = to_key(value)
        if not key:
            return match.group(0)
        new_keys['common'][key] = value
        title_replaced += 1
        return f"title={{t('common.{key}')}}"
    
    content = title_pattern.sub(replace_title, content)
    print(f"  Replaced: {title_replaced}")
    total_replaced += title_replaced
    
    # =========================================================
    # 2. FIX HARDCODED addToast("X") MESSAGES
    # =========================================================
    print("\n" + "=" * 60)
    print("PHASE 2: Hardcoded toast messages")
    print("=" * 60)
    
    # Pattern: addToast("some text") - quoted strings
    toast_quoted = re.compile(r'addToast\("([^"]+)"\)')
    toast_q_matches = toast_quoted.findall(content)
    print(f"  Found {len(toast_q_matches)} hardcoded addToast (quoted)")
    
    toast_replaced = 0
    def replace_toast_quoted(match):
        nonlocal toast_replaced
        value = match.group(1)
        key = to_key(value)
        if not key:
            return match.group(0)
        new_keys['toasts'][key] = value
        toast_replaced += 1
        return f"addToast(t('toasts.{key}'))"
    
    content = toast_quoted.sub(replace_toast_quoted, content)
    print(f"  Replaced (quoted): {toast_replaced}")
    
    # Pattern: addToast(`some ${var} text`) - template literals
    toast_template = re.compile(r'addToast\(`([^`]+)`\)')
    toast_t_matches = toast_template.findall(content)
    print(f"  Found {len(toast_t_matches)} hardcoded addToast (template)")
    
    toast_t_replaced = 0
    def replace_toast_template(match):
        nonlocal toast_t_replaced
        value = match.group(1)
        # Skip if it contains t() already
        if "t('" in value or 't("' in value:
            return match.group(0)
        # For template literals with variables, we keep the template but wrap
        # Only replace simple ones without ${} interpolation
        if '${' in value:
            return match.group(0)  # Skip complex templates for safety
        key = to_key(value)
        if not key:
            return match.group(0)
        new_keys['toasts'][key] = value
        toast_t_replaced += 1
        return f"addToast(t('toasts.{key}'))"
    
    content = toast_template.sub(replace_toast_template, content)
    print(f"  Replaced (template): {toast_t_replaced}")
    total_replaced += toast_replaced + toast_t_replaced
    
    # =========================================================
    # 3. FIX HARDCODED placeholder="X" ATTRIBUTES
    # =========================================================
    print("\n" + "=" * 60)
    print("PHASE 3: Hardcoded placeholder attributes")
    print("=" * 60)
    
    placeholder_pattern = re.compile(r'placeholder="([A-Z][^"]*)"')
    ph_matches = placeholder_pattern.findall(content)
    ph_freq = Counter(ph_matches)
    print(f"  Found {len(ph_matches)} hardcoded placeholders ({len(ph_freq)} unique)")
    
    ph_replaced = 0
    def replace_placeholder(match):
        nonlocal ph_replaced
        value = match.group(1)
        key = 'placeholder_' + to_key(value)
        if not key:
            return match.group(0)
        new_keys['common'][key] = value
        ph_replaced += 1
        return f"placeholder={{t('common.{key}')}}"
    
    content = placeholder_pattern.sub(replace_placeholder, content)
    print(f"  Replaced: {ph_replaced}")
    total_replaced += ph_replaced
    
    # =========================================================
    # 4. FIX HARDCODED HEADING TEXT
    # =========================================================
    print("\n" + "=" * 60)
    print("PHASE 4: Hardcoded heading text (h1-h3)")
    print("=" * 60)
    
    heading_pattern = re.compile(r'(<h([1-3])[^>]*>)([A-Z][^<{]+)(</h\2>)')
    h_matches = heading_pattern.findall(content)
    print(f"  Found {len(h_matches)} hardcoded headings")
    
    h_replaced = 0
    def replace_heading(match):
        nonlocal h_replaced
        open_tag = match.group(1)
        level = match.group(2)
        text = match.group(3).strip()
        close_tag = match.group(4)
        key = to_key(text)
        if not key or len(text) < 3:
            return match.group(0)
        new_keys['common'][key] = text
        h_replaced += 1
        return f"{open_tag}{{t('common.{key}')}}{close_tag}"
    
    content = heading_pattern.sub(replace_heading, content)
    print(f"  Replaced: {h_replaced}")
    total_replaced += h_replaced
    
    # =========================================================
    # SUMMARY
    # =========================================================
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"  Total replacements: {total_replaced}")
    
    total_new_keys = sum(len(v) for v in new_keys.items())
    for ns, keys in sorted(new_keys.items()):
        print(f"  New {ns} keys: {len(keys)}")
    
    # Save modified content
    SRC.write_text(content, encoding='utf-8')
    print(f"\n✅ Saved {SRC.name}")
    
    # Save new keys
    OUTPUT_KEYS.write_text(json.dumps(dict(new_keys), indent=2, ensure_ascii=False), encoding='utf-8')
    print(f"✅ Saved {OUTPUT_KEYS.name}")
    
    # Inject into ui_strings.js
    inject_keys(new_keys)

def inject_keys(new_keys):
    """Inject new keys into ui_strings.js under the appropriate namespaces."""
    content = UI_FILE.read_text(encoding='utf-8')
    
    for namespace, keys in new_keys.items():
        # Find the namespace section
        pattern = re.compile(rf'({namespace}\s*:\s*\{{)')
        match = pattern.search(content)
        if not match:
            print(f"  ⚠️  Namespace '{namespace}' not found in ui_strings.js — skipping")
            continue
        
        insert_pos = match.end()
        
        # Build entries, skip keys that already exist
        new_entries = "\n"
        added = 0
        for key, value in sorted(keys.items()):
            # Check if key already exists in this namespace
            key_check = re.compile(rf'\b{re.escape(key)}\s*:')
            if key_check.search(content[match.start():match.start() + 5000]):
                continue
            escaped = value.replace("'", "\\'")
            new_entries += f"    {key}: '{escaped}',\n"
            added += 1
        
        if added > 0:
            content = content[:insert_pos] + new_entries + content[insert_pos:]
            print(f"  ✅ Injected {added} keys into ui_strings.js → {namespace}")
        else:
            print(f"  ℹ️  All {namespace} keys already exist")
    
    UI_FILE.write_text(content, encoding='utf-8')

if __name__ == "__main__":
    main()
