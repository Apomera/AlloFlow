"""Fix: Hide AI/teacher labels and leader lines in student challenge mode."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# FIX A: AI labels — change `labelsHidden ? 'none' : 'flex'`
# to `(labelsHidden || isStudentChallenge) ? 'none' : 'flex'`
# Only in the VisualPanelGrid area (< line 2200)
for i in range(len(lines)):
    if i < 2200 and "labelsHidden ? 'none' : 'flex'" in lines[i]:
        lines[i] = lines[i].replace(
            "labelsHidden ? 'none' : 'flex'",
            "(labelsHidden || isStudentChallenge) ? 'none' : 'flex'"
        )
        fixed += 1
        print(f"  [OK] FIX A: Hidden labels in challenge mode at L{i+1}")

# FIX B: Leader lines — {!labelsHidden && renderLeaderLines...}
# Change to {!labelsHidden && !isStudentChallenge && renderLeaderLines...}
for i in range(len(lines)):
    if i < 2200 and '!labelsHidden && renderLeaderLines' in lines[i]:
        lines[i] = lines[i].replace(
            '!labelsHidden && renderLeaderLines',
            '!labelsHidden && !isStudentChallenge && renderLeaderLines'
        )
        fixed += 1
        print(f"  [OK] FIX B: Hidden leader lines in challenge mode at L{i+1}")

# FIX C: Also add a student challenge banner above the grid
# Find the visual-panel-grid div and insert a banner before it
for i in range(len(lines)):
    if "visual-panel-grid layout-" in lines[i] and i < 2200:
        indent = ' ' * 12
        banner = [
            indent + '{isStudentChallenge && !challengeSubmitted && (\r',
            indent + '    <div style={{ textAlign: "center", padding: "10px 16px", background: "linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%)", borderRadius: "10px", border: "1px solid #93c5fd", marginBottom: "8px" }}>\r',
            indent + '        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e40af" }}>🏆 Label Challenge Active</div>\r',
            indent + '        <div style={{ fontSize: "12px", color: "#3b82f6", marginTop: "2px" }}>Click "➕ Add Label" then click on the diagram to place labels. Edit text by typing in the label.</div>\r',
            indent + '    </div>\r',
            indent + ')}\r',
        ]
        lines[i:i] = banner
        fixed += 1
        print(f"  [OK] FIX C: Added challenge banner at L{i+1}")
        break

content = '\n'.join(lines)
new_count = len(content.split('\n'))
print(f"\nLine count: {original_count} -> {new_count} (diff: {new_count - original_count:+d})")
print(f"Fixes applied: {fixed}")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
