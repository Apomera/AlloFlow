"""Add onSpeak={handleSpeak} at VisualPanelGrid call site + comparison headers + download labels setup."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
original_lines = len(content.split('\n'))
fixed = 0

# ============================================================
# FIX 1: Add onSpeak={handleSpeak} at call site
# The current call site is missing onSpeak prop
# ============================================================

old_vg = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    t={t}
                                />"""

new_vg = """<VisualPanelGrid
                                    visualPlan={generatedContent?.data.visualPlan}
                                    onRefinePanel={handleRefinePanel}
                                    onUpdateLabel={handleUpdateVisualLabel}
                                    onSpeak={handleSpeak}
                                    t={t}
                                />"""

if old_vg in content:
    content = content.replace(old_vg, new_vg)
    fixed += 1
    print("[OK] FIX 1: Added onSpeak={handleSpeak} at VisualPanelGrid call site")
else:
    print("[WARN] FIX 1: Call site not found, trying with different whitespace...")
    # Try with \r\n
    old_vg_rn = old_vg.replace('\n', '\r\n')
    if old_vg_rn in content:
        new_vg_rn = new_vg.replace('\n', '\r\n')
        content = content.replace(old_vg_rn, new_vg_rn)
        fixed += 1
        print("[OK] FIX 1 (\\r\\n): Added onSpeak={handleSpeak}")
    else:
        print("[WARN] FIX 1: Still not found")

# ============================================================
# FIX 2: Fix comparison view headers (Left/Right -> dynamic)
# Find where "Left" and "Right" are used in comparison layout
# ============================================================

# Search for comparison layout headers
lines = content.split('\n')
print("\n=== Comparison layout header patterns ===")
for i, line in enumerate(lines):
    if ('comparison' in line.lower() or 'left' in line.lower() or 'right' in line.lower()) and \
       ('panel' in line.lower() or 'role' in line.lower() or 'header' in line.lower()):
        if i > 1400 and i < 2000:  # In VisualPanelGrid
            print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find where panel.role or panel.title is set
print("\n=== Panel role/title rendering (L1400-2000) ===")
for i in range(1400, min(2000, len(lines))):
    line = lines[i]
    if 'panel.role' in line or 'panel.title' in line or 'panel-role' in line:
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# Find the comparison layout header text
print("\n=== Step/Left/Right badge text (L1400-2000) ===")
for i in range(1400, min(2000, len(lines))):
    line = lines[i]
    if 'Step ' in line or "'Left'" in line or "'Right'" in line or '"Left"' in line or '"Right"' in line:
        print(f"  L{i+1}: {line.rstrip()[:160]}")

# ============================================================
# Write
# ============================================================
new_lines = len(content.split('\n'))
diff = new_lines - original_lines
print(f"\nLine count: {original_lines} -> {new_lines} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
