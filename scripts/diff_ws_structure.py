"""
1. Show backup handleRestoreView's setActiveView line
2. Find the EQUIVALENT parent gate in current file
"""
FILE_CUR = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
FILE_BAK = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.bak.txt"

def read(f):
    with open(f, 'r', encoding='utf-8') as fh:
        return fh.readlines()

bak = read(FILE_BAK)
cur = read(FILE_CUR)

# 1. Backup handleRestoreView - show the setActiveView line
print("=== BACKUP: handleRestoreView setActiveView ===")
for i, l in enumerate(bak):
    if 'handleRestoreView' in l and ('const' in l or 'function' in l):
        for j in range(i, min(len(bak), i+20)):
            if 'setActiveView' in bak[j]:
                print("  bL%d: %s" % (j+1, bak[j].strip()[:170]))
        break

# 2. Current handleRestoreView - show the setActiveView line
print("\n=== CURRENT: handleRestoreView setActiveView ===")
for i, l in enumerate(cur):
    if 'handleRestoreView' in l and ('const' in l or 'function' in l):
        for j in range(i, min(len(cur), i+20)):
            if 'setActiveView' in cur[j]:
                print("  cL%d: %s" % (j+1, cur[j].strip()[:170]))
        break

# 3. Find the parent gate in CURRENT file (similar to backup L64040)
print("\n=== CURRENT: Parent gate containing WS modal ===")
ws_line = None
for i, l in enumerate(cur):
    if 'isWordSoundsMode && (generatedContent' in l and 'glossary' in l:
        ws_line = i
        break

if ws_line:
    # Find the nearest conditional at indent < 20
    for i in range(ws_line-1, max(0, ws_line-200), -1):
        l = cur[i]
        indent = len(l) - len(l.lstrip())
        stripped = l.strip()
        if indent == 16 and stripped.startswith('{') and ('activeView' in stripped or '&&' in stripped):
            print("  cL%d (indent=16): %s" % (i+1, stripped[:170]))
            # Show a few lines around it
            for j in range(i-2, min(len(cur), i+4)):
                print("    L%d: %s" % (j+1, cur[j].strip()[:170]))
            break
