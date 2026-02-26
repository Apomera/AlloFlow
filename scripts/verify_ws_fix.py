"""
Trace every parent container above L65778. Show ALL lines at decreasing
indent levels, not just activeView ones.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

ws_line = 65777  # 0-indexed (L65778)
ws_indent = len(lines[ws_line]) - len(lines[ws_line].lstrip())
print("WS modal at L%d indent=%d" % (ws_line+1, ws_indent))
print("Content: %s" % lines[ws_line].strip()[:150])

# Trace upward showing every meaningful line at decreasing indentation
last_indent = ws_indent
count = 0
for i in range(ws_line-1, max(0, ws_line-2000), -1):
    l = lines[i]
    stripped = l.strip()
    if not stripped:
        continue
    indent = len(l) - len(l.lstrip())
    if indent < last_indent:
        last_indent = indent
        count += 1
        print("  indent=%2d L%5d: %s" % (indent, i+1, stripped[:180]))
        if indent <= 4 or count > 25:
            break
