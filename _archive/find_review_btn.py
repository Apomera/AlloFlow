"""Find the Review Words button and trace navigation"""
import sys
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

out = open('_review_btn.txt', 'w', encoding='utf-8')

out.write("=== 'Review' text near buttons ===\n")
for i, line in enumerate(lines):
    if 'Review' in line and ('Word' in line or 'word' in line):
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

out.write("\n=== setShowReviewPanel with context ===\n")
for i, line in enumerate(lines):
    if 'setShowReviewPanel' in line:
        for j in range(max(0, i-2), min(len(lines), i+3)):
            out.write(f"  L{j+1}: {lines[j].strip()[:160]}\n")
        out.write("  ---\n")

out.write("\n=== word-sounds-generator activeView ===\n")
for i, line in enumerate(lines):
    if 'word-sounds-generator' in line:
        out.write(f"  L{i+1}: {line.strip()[:160]}\n")

out.write("\n=== onClose in L10095-10350 ===\n")
for i in range(10095, min(10350, len(lines))):
    if 'onClose' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:160]}\n")

out.write("\n=== Close buttons in toolbar L10260-10330 ===\n")
for i in range(10260, min(10330, len(lines))):
    if 'onClick' in lines[i] or 'button' in lines[i].lower() or 'close' in lines[i].lower() or 'Close' in lines[i]:
        out.write(f"  L{i+1}: {lines[i].strip()[:160]}\n")

# Check parent-level: AlloFlowContent where 'review words' type button lives
out.write("\n=== Parent-level review button (AlloFlowContent L60000-73000) ===\n")
for i in range(60000, min(73000, len(lines))):
    if 'Review' in lines[i] and ('Word' in lines[i] or 'word' in lines[i]):
        out.write(f"  L{i+1}: {lines[i].strip()[:160]}\n")

out.close()
print("Done -> _review_btn.txt")
