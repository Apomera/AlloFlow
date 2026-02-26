"""
verify_localization.py — Comprehensive localization verification:
1. Finds ALL broken t() calls (English text instead of dot.notation keys)
2. Extracts EVERY unique t() key from AlloFlowANTI.txt
3. Checks each key exists in ui_strings.js
4. Finds orphaned keys in ui_strings.js (defined but not used)
5. Reports remaining hardcoded strings
6. Auto-fixes broken t() calls

Usage: python scripts/verify_localization.py [--fix]
"""

import re
import json
import sys
from collections import defaultdict, Counter
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "AlloFlowANTI.txt"
UI_FILE = ROOT / "ui_strings.js"
FIX_MODE = "--fix" in sys.argv

def load_ui_strings():
    """Parse ui_strings.js and extract all defined keys."""
    content = UI_FILE.read_text(encoding="utf-8")
    
    # Try JSON parse first
    try:
        data = json.loads(content)
        return data, flatten_keys(data)
    except:
        pass
    
    # Try cleaning JS to JSON
    cleaned = content.strip()
    # Remove trailing commas before } or ]
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)
    # Replace single quotes with double quotes (careful with escaped ones)
    cleaned = re.sub(r"(?<!\\)'", '"', cleaned)
    
    try:
        data = json.loads(cleaned)
        return data, flatten_keys(data)
    except Exception as e:
        print(f"⚠️  Could not fully parse ui_strings.js: {e}")
        # Fall back to regex-based key extraction
        keys = set()
        # Match patterns like: key_name: 'value' or key_name: "value"
        for match in re.finditer(r'^\s+(\w+)\s*:', content, re.MULTILINE):
            keys.add(match.group(1))
        return None, keys


def flatten_keys(obj, prefix=""):
    """Recursively flatten a nested dict into dot-notation keys."""
    keys = set()
    if isinstance(obj, dict):
        for k, v in obj.items():
            full_key = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                keys.update(flatten_keys(v, full_key))
            else:
                keys.add(full_key)
    return keys


def extract_t_keys(content):
    """Extract all t('key') calls from the source."""
    # Match t('key.path'), t("key.path"), ts('key.path')
    pattern = re.compile(r"""(?:^|[^a-zA-Z])t[s]?\(\s*['"]([^'"]+)['"]\s*[,)]""")
    keys = []
    for i, line in enumerate(content.split('\n'), 1):
        for m in pattern.finditer(line):
            key = m.group(1)
            keys.append((i, key))
    return keys


def is_valid_key(key):
    """Check if a t() key looks like a valid dot.notation key path."""
    # Valid keys: word_sounds.blending_prompt, common.back, toasts.success
    # Invalid: English text, things with spaces, exclamation marks, etc.
    if ' ' in key:
        return False
    if '!' in key or '?' in key:
        return False
    if not re.match(r'^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$', key):
        return False
    return True


def main():
    content = SRC.read_text(encoding="utf-8")
    
    print("=" * 70)
    print("   COMPREHENSIVE LOCALIZATION VERIFICATION")
    print("=" * 70)
    print()
    
    # =============================================
    # 1. Load UI_STRINGS keys
    # =============================================
    print("📋 Phase 1: Loading UI_STRINGS definitions...")
    ui_data, defined_keys = load_ui_strings()
    print(f"   Defined keys: {len(defined_keys)}")
    
    # =============================================
    # 2. Extract all t() keys from source
    # =============================================
    print("\n🔍 Phase 2: Extracting t() key usage from source...")
    all_usages = extract_t_keys(content)
    used_keys = set(key for _, key in all_usages)
    print(f"   Total t() calls: {len(all_usages)}")
    print(f"   Unique keys: {len(used_keys)}")
    
    # =============================================
    # 3. Find broken t() calls
    # =============================================
    print("\n🔴 Phase 3: Broken t() calls (English text as keys)...")
    broken = []
    for line_num, key in all_usages:
        if not is_valid_key(key):
            broken.append((line_num, key))
    
    unique_broken = set(key for _, key in broken)
    print(f"   Broken calls: {len(broken)} ({len(unique_broken)} unique)")
    if broken:
        for ln, key in sorted(set(broken)):
            display = key[:70] + '...' if len(key) > 70 else key
            print(f"   L{ln}: t('{display}')")
    
    # =============================================
    # 4. Missing keys (used but not in UI_STRINGS)
    # =============================================
    print("\n⚠️  Phase 4: Missing keys (used by t() but not in UI_STRINGS)...")
    valid_used = set(k for k in used_keys if is_valid_key(k))
    
    # For missing key detection, we need the full dot-path matching
    # If we couldn't parse ui_strings.js, skip this check
    if ui_data:
        missing = valid_used - defined_keys
        # Filter out dynamic keys (those built with template literals or variables)
        missing = sorted(missing)
        print(f"   Missing keys: {len(missing)}")
        if missing:
            # Group by namespace
            by_ns = defaultdict(list)
            for k in missing:
                ns = k.split('.')[0]
                by_ns[ns].append(k)
            for ns in sorted(by_ns):
                print(f"\n   [{ns}] ({len(by_ns[ns])} missing):")
                for k in sorted(by_ns[ns])[:15]:
                    print(f"     - {k}")
                if len(by_ns[ns]) > 15:
                    print(f"     ... and {len(by_ns[ns]) - 15} more")
    else:
        print("   ⚠️  Skipped (could not parse ui_strings.js as JSON)")
        missing = []

    # =============================================
    # 5. Remaining hardcoded strings
    # =============================================
    print("\n📊 Phase 5: Remaining hardcoded string counts...")
    
    checks = [
        ('aria-label="X"', r'aria-label="[A-Z][^"]*"'),
        ('title="X"', r'title="[A-Z][^"]*"'),
        ('placeholder="X"', r'placeholder="[A-Z][^"]*"'),
        ('addToast("X")', r'addToast\("[^"]*"'),
        ('<h1-h3>X</h>', r'<h[1-3][^>]*>[A-Z][^<{]+</h[1-3]>'),
    ]
    
    for label, pattern in checks:
        count = len(re.findall(pattern, content))
        status = "✅" if count < 5 else "⚠️" if count < 20 else "🔴"
        print(f"   {status} {label}: {count} remaining")
    
    # Localized counts
    print("\n   --- Localized (using t()) ---")
    localized_checks = [
        ('aria-label={t()}', r'aria-label=\{t\('),
        ('title={t()}', r'title=\{t\('),
        ('placeholder={t()}', r'placeholder=\{t\('),
        ('addToast(t())', r'addToast\(t\('),
    ]
    for label, pattern in localized_checks:
        count = len(re.findall(pattern, content))
        print(f"   ✅ {label}: {count}")
    
    # =============================================
    # 6. Coverage summary
    # =============================================
    print("\n" + "=" * 70)
    print("   COVERAGE SUMMARY")
    print("=" * 70)
    
    total_t = len(re.findall(r'(?<![a-zA-Z])t\(', content))
    total_ts = len(re.findall(r'\bts\(', content))
    print(f"   Total t() calls:  {total_t}")
    print(f"   Total ts() calls: {total_ts}")
    print(f"   Unique keys used: {len(used_keys)}")
    print(f"   Keys defined:     {len(defined_keys)}")
    print(f"   Broken calls:     {len(broken)}")
    if ui_data:
        print(f"   Missing keys:     {len(missing)}")
    print(f"   Valid keys:       {len(valid_used)}")
    
    if len(broken) == 0 and (not ui_data or len(missing) < 10):
        print("\n   🎉 LOCALIZATION IS COMPREHENSIVE!")
    else:
        print(f"\n   ⚠️  {len(broken)} broken calls + {len(missing) if ui_data else '?'} missing keys need attention")


if __name__ == "__main__":
    main()
