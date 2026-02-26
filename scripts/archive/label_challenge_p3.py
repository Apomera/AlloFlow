"""Add student label rendering after user labels (FIX 8 recovery)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)

# Find the closing of userLabels map, right before "Per-panel edit button"
for i in range(len(lines)):
    if '{/* Per-panel edit button */}' in lines[i] and i < 2200:
        print(f"  Found per-panel edit button at L{i+1}")
        indent = ' ' * 28
        student_jsx = [
            indent + '{/* Student Challenge Labels */}\r',
            indent + '{isStudentChallenge && (studentLabels[panelIdx] || []).map((sLabel) => (\r',
            indent + '    <div key={`student-${sLabel.id}`}\r',
            indent + '        style={{ position: "absolute", display: "flex", alignItems: "center", gap: "4px",\r',
            indent + '            left: `${sLabel.x}%`, top: `${sLabel.y}%`, zIndex: 5,\r',
            indent + '            background: challengeSubmitted\r',
            indent + '                ? (challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" ? "rgba(220,252,231,0.95)"\r',
            indent + '                    : challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" ? "rgba(254,249,195,0.95)"\r',
            indent + '                    : "rgba(254,226,226,0.95)")\r',
            indent + '                : "rgba(219,234,254,0.95)",\r',
            indent + '            border: challengeSubmitted\r',
            indent + '                ? (challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" ? "2px solid #16a34a"\r',
            indent + '                    : challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" ? "2px solid #f59e0b"\r',
            indent + '                    : "2px solid #ef4444")\r',
            indent + '                : "2px solid #3b82f6",\r',
            indent + '            padding: "4px 10px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, color: "#1e1b4b" }}\r',
            indent + '    >\r',
            indent + '        {!challengeSubmitted && (\r',
            indent + '            <button onClick={() => handleDeleteStudentLabel(panelIdx, sLabel.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "10px", padding: 0, color: "#94a3b8" }}>✕</button>\r',
            indent + '        )}\r',
            indent + '        {!challengeSubmitted ? (\r',
            indent + '            <input type="text" value={sLabel.text}\r',
            indent + '                onChange={(e) => handleStudentLabelTextChange(panelIdx, sLabel.id, e.target.value)}\r',
            indent + '                style={{ background: "transparent", border: "none", outline: "none", fontWeight: 700, fontSize: "13px", color: "#1e1b4b", width: Math.max(60, sLabel.text.length * 9) + "px", textAlign: "center" }} />\r',
            indent + '        ) : (\r',
            indent + '            <span>{sLabel.text}</span>\r',
            indent + '        )}\r',
            indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "correct" && <span>✅</span>}\r',
            indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "close" && <span>🟡</span>}\r',
            indent + '        {challengeSubmitted && challengeResult?.labelResults?.find(r => r.studentLabel === sLabel.text)?.verdict === "incorrect" && <span>❌</span>}\r',
            indent + '    </div>\r',
            indent + '))}\r',
        ]
        lines[i:i] = student_jsx
        print(f"  [OK] Added student labels rendering ({len(student_jsx)} lines) at L{i+1}")
        break

content = '\n'.join(lines)
new_count = len(content.split('\n'))
print(f"\nLine count: {original_count} -> {new_count} (diff: {new_count - original_count:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print("Done!")
