"""Verify each a11y audit finding with detailed evidence."""
import re

FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# 1. FOCUS TRAP VERIFICATION
print("=" * 60)
print("1. FOCUS TRAP VERIFICATION")
print("=" * 60)
trap_terms = ['focus-trap', 'FocusTrap', 'focustrap', 'inert', 'aria-modal', 'trapFocus', 'useFocusTrap']
for term in trap_terms:
    hits = [(i+1, lines[i].strip()[:100]) for i, l in enumerate(lines) if term in l]
    if hits:
        print(f"  '{term}' found {len(hits)} times:")
        for ln, snippet in hits[:5]:
            print(f"    L{ln}: {snippet}")
    else:
        print(f"  '{term}': NOT FOUND")

# Also check for full-screen overlays that SHOULD have focus trapping
print("\n  Full-screen overlays (fixed inset-0):")
overlays = [(i+1, lines[i].strip()[:120]) for i, l in enumerate(lines) if 'fixed inset-0' in l and ('z-[' in l or 'z-50' in l)]
print(f"  Found {len(overlays)} overlays:")
for ln, snippet in overlays[:10]:
    print(f"    L{ln}: {snippet}")

# 2. ARIA-DESCRIBEDBY VERIFICATION
print("\n" + "=" * 60)
print("2. ARIA-DESCRIBEDBY VERIFICATION")
print("=" * 60)
desc_hits = [(i+1, lines[i].strip()[:120]) for i, l in enumerate(lines) if 'aria-describedby' in l]
print(f"  Found {len(desc_hits)} instances:")
for ln, snippet in desc_hits:
    print(f"    L{ln}: {snippet}")

# 3. MISSING ALT TEXT VERIFICATION
print("\n" + "=" * 60)
print("3. MISSING ALT TEXT VERIFICATION")
print("=" * 60)
for i, l in enumerate(lines):
    if '<img' in l:
        # Check this line and next 2 lines for alt=
        context = ''.join(lines[i:min(i+3, len(lines))])
        has_alt = 'alt=' in context or 'alt =' in context
        ln = i + 1
        snippet = l.strip()[:140]
        status = "HAS alt" if has_alt else "*** MISSING alt ***"
        print(f"  L{ln}: {status} | {snippet}")

# 4. AUTOFOCUS SAMPLE
print("\n" + "=" * 60)
print("4. AUTOFOCUS USAGE (first 10)")
print("=" * 60)
af_hits = [(i+1, lines[i].strip()[:120]) for i, l in enumerate(lines) if 'autoFocus' in l]
print(f"  Total: {len(af_hits)}")
for ln, snippet in af_hits[:10]:
    print(f"    L{ln}: {snippet}")
