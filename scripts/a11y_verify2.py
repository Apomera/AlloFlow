"""Quick targeted verification of just focus-trap and alt text."""
FILE = r"C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\prismflow-deploy\src\App.jsx"
with open(FILE, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Focus trap / inert / aria-modal
print("FOCUS TRAP CHECK:")
for term in ['focus-trap', 'FocusTrap', 'inert', 'aria-modal', 'trapFocus']:
    count = sum(1 for l in lines if term in l)
    print(f"  {term}: {count}")

# Count full-screen overlays
overlays = sum(1 for l in lines if 'fixed inset-0' in l and ('z-[' in l or 'z-50' in l))
print(f"  Full-screen overlays: {overlays}")

# Alt text
print("\nALT TEXT CHECK:")
missing = 0
for i, l in enumerate(lines):
    if '<img' in l:
        ctx = ''.join(lines[i:min(i+3, len(lines))])
        if 'alt=' not in ctx:
            missing += 1
            print(f"  MISSING at L{i+1}: {l.strip()[:120]}")
print(f"  Total missing: {missing}")

# aria-describedby
print("\nARIA-DESCRIBEDBY:")
for i, l in enumerate(lines):
    if 'aria-describedby' in l:
        print(f"  L{i+1}: {l.strip()[:120]}")
