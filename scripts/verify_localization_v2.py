"""
verify_localization_v2.py - outputs results to a text file
"""
import re
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
SRC = ROOT / "AlloFlowANTI.txt"
UI_FILE = ROOT / "ui_strings.js"
OUTPUT = ROOT / "localization_verification_report.txt"

def is_valid_key(key):
    if ' ' in key or '!' in key or '?' in key:
        return False
    if not re.match(r'^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$', key):
        return False
    return True

def main():
    content = SRC.read_text(encoding="utf-8")
    lines = content.split('\n')
    report = []
    
    def p(s=""):
        report.append(s)
    
    p("=" * 70)
    p("   COMPREHENSIVE LOCALIZATION VERIFICATION REPORT")
    p("   Generated: February 20, 2026")
    p("=" * 70)
    
    # Extract t() keys
    pattern = re.compile(r"""(?:^|[^a-zA-Z])t[s]?\(\s*['"]([^'"]+)['"]\s*[,)]""")
    all_usages = []
    for i, line in enumerate(lines, 1):
        for m in pattern.finditer(line):
            all_usages.append((i, m.group(1)))
    
    used_keys = set(k for _, k in all_usages)
    
    p(f"\nTotal t()/ts() calls: {len(all_usages)}")
    p(f"Unique keys used: {len(used_keys)}")
    
    # Broken calls
    broken = []
    for ln, key in all_usages:
        if not is_valid_key(key):
            broken.append((ln, key))
    
    p(f"\n--- BROKEN t() CALLS ({len(broken)}) ---")
    for ln, key in sorted(set(broken)):
        display = key[:80] + '...' if len(key) > 80 else key
        p(f"  L{ln}: t('{display}')")
    
    # Remaining hardcoded strings
    p("\n--- REMAINING HARDCODED STRINGS ---")
    checks = [
        ('aria-label="X"', r'aria-label="[A-Z][^"]*"'),
        ('title="X"', r'title="[A-Z][^"]*"'),
        ('placeholder="X"', r'placeholder="[A-Z][^"]*"'),
        ('addToast("X")', r'addToast\("[^"]*"'),
        ('<h1-h3>X</h>', r'<h[1-3][^>]*>[A-Z][^<{]+</h[1-3]>'),
    ]
    
    for label, pat in checks:
        count = len(re.findall(pat, content))
        status = "PASS" if count < 5 else "WARN" if count < 20 else "FAIL"
        p(f"  [{status}] {label}: {count} remaining")
    
    p("\n--- LOCALIZED COUNTS ---")
    loc_checks = [
        ('aria-label={t()}', r'aria-label=\{t\('),
        ('title={t()}', r'title=\{t\('),
        ('placeholder={t()}', r'placeholder=\{t\('),
        ('addToast(t())', r'addToast\(t\('),
    ]
    for label, pat in loc_checks:
        count = len(re.findall(pat, content))
        p(f"  {label}: {count}")
    
    # Overall stats
    total_t = len(re.findall(r'(?<![a-zA-Z])t\(', content))
    total_ts = len(re.findall(r'\bts\(', content))
    p(f"\n--- OVERALL ---")
    p(f"  Total t() calls:  {total_t}")
    p(f"  Total ts() calls: {total_ts}")
    p(f"  Unique keys:      {len(used_keys)}")
    p(f"  Broken calls:     {len(broken)}")
    valid_keys = len([k for k in used_keys if is_valid_key(k)])
    p(f"  Valid keys:       {valid_keys}")
    
    # Write report
    OUTPUT.write_text('\n'.join(report), encoding='utf-8')
    print(f"Report saved to: {OUTPUT}")

if __name__ == "__main__":
    main()
