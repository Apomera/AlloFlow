"""
Replace diagnostic toasts with console.warn and add missing DIAG 1.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Replace all addToast("[WS-DBG]...  with console.warn
# Pattern: addToast("[WS-DBG] ...", "info");  ->  console.warn("[WS-DBG] ...");
def replace_toast(match):
    msg = match.group(1)
    return 'console.warn(' + msg + ')'

content_new = re.sub(
    r'addToast\(("[^"]*\[WS-DBG\][^"]*")\s*,\s*"info"\)',
    replace_toast,
    content
)
n = len(re.findall(r'addToast\("[^"]*\[WS-DBG\]', content))
if content_new != content:
    content = content_new
    changes.append("Replaced %d addToast([WS-DBG]) calls with console.warn" % n)

# Also fix the concatenated addToast in the useEffect
old_concat = 'addToast("[WS-DBG] Modal gate: mode=true, type=" + gcType + ", wsWords=" + wsLen, "info")'
new_concat = 'console.warn("[WS-DBG] Modal gate: mode=true, type=" + gcType + ", wsWords=" + wsLen)'
if old_concat in content:
    content = content.replace(old_concat, new_concat, 1)
    changes.append("Replaced modal gate useEffect addToast with console.warn")

old_concat2 = 'addToast("[WS-DBG] Auto-open: " + wsPreloadedWords.length + " words loaded, setting isWordSoundsMode=true", "info")'
new_concat2 = 'console.warn("[WS-DBG] Auto-open: " + wsPreloadedWords.length + " words loaded, setting isWordSoundsMode=true")'
if old_concat2 in content:
    content = content.replace(old_concat2, new_concat2, 1)
    changes.append("Replaced auto-open addToast with console.warn")

# Add DIAG 1 to handleRestoreView if not already there
if "[WS-DBG] handleRestoreView" not in content:
    old_hrv = """if (item.type === 'word-sounds') {
          setIsWordSoundsMode(true);"""
    new_hrv = """if (item.type === 'word-sounds') {
          console.warn("[WS-DBG] handleRestoreView: word-sounds detected, isWordSoundsMode->true");
          setIsWordSoundsMode(true);"""
    if old_hrv in content:
        content = content.replace(old_hrv, new_hrv, 1)
        changes.append("Added DIAG 1 console.warn in handleRestoreView")
    else:
        print("[WARN] handleRestoreView pattern not found, trying variant...")
        # Check with different indent
        idx = content.find("if (item.type === 'word-sounds') {")
        if idx > 0:
            # Find the next line
            nl = content.index('\n', idx)
            next_line = content[nl+1:content.index('\n', nl+1)]
            print("Next line after if: %s" % repr(next_line[:80]))

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nApplied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    v = f.read()
print("\nVerification:")
print("  addToast([WS-DBG]) remaining:", len(re.findall(r'addToast\("[^"]*WS-DBG', v)))
print("  console.warn([WS-DBG]) count:", v.count('console.warn("[WS-DBG]'))
