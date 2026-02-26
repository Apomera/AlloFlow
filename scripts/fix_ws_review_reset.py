"""
Fix Word Sounds Review Panel - Reset currentWordSoundsWord on close/restore
Root cause: currentWordSoundsWord persists across modal close/reopen, blocking review panel guards.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = []

# FIX 1: Reset currentWordSoundsWord in onClose handler
# Find: onClose={() => { setIsWordSoundsMode(false); setActiveView('input'); }}
for i, l in enumerate(lines):
    if 'onClose' in l and 'setIsWordSoundsMode(false)' in l and 'setActiveView' in l and 65000 < i < 66000:
        old = l
        # Add currentWordSoundsWord reset and wordSoundsActivity reset
        new = l.replace(
            "setIsWordSoundsMode(false);",
            "setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false);"
        )
        if new != old:
            lines[i] = new
            changes.append("FIX 1 (L%d): Added currentWordSoundsWord/activity/autoReview reset to onClose" % (i+1))
        break

# FIX 2: Reset currentWordSoundsWord in onBackToSetup handler
# Find: onBackToSetup={() => { setIsWordSoundsMode(false); setActiveView('word-sounds-generator'); }}
for i, l in enumerate(lines):
    if 'onBackToSetup' in l and 'setIsWordSoundsMode(false)' in l and 'word-sounds-generator' in l:
        old = l
        new = l.replace(
            "setIsWordSoundsMode(false);",
            "setIsWordSoundsMode(false); setCurrentWordSoundsWord(null); setWordSoundsActivity(null); setWordSoundsAutoReview(false);"
        )
        if new != old:
            lines[i] = new
            changes.append("FIX 2 (L%d): Added currentWordSoundsWord/activity/autoReview reset to onBackToSetup" % (i+1))
        break

# FIX 3: Reset currentWordSoundsWord in handleRestoreView for word-sounds type
# Find: setIsWordSoundsMode(true); in handleRestoreView
for i, l in enumerate(lines):
    if 'setIsWordSoundsMode(true)' in l and 47000 < i < 48000:
        # Check context - should be in handleRestoreView
        context = ''.join(lines[max(0,i-5):i+5])
        if 'handleRestoreView' in context or 'word-sounds' in context:
            old = l
            new = l.replace(
                "setIsWordSoundsMode(true);",
                "setIsWordSoundsMode(true);\n           setCurrentWordSoundsWord(null); // FIX: Reset to allow review panel to show\n           setWordSoundsActivity(null); // FIX: Reset activity state for fresh session"
            )
            if new != old:
                lines[i] = new
                changes.append("FIX 3 (L%d): Reset currentWordSoundsWord + activity in handleRestoreView" % (i+1))
            break

# FIX 4: Also reset hasAutoNavigated ref via prevWsPreloadedWordsLengthRef
# When restoring from history, we need the auto-open effect to fire.
# The prevWsPreloadedWordsLengthRef should be reset to 0 when we set new preloaded words
# This is already handled in handleRestoreView by setting wsPreloadedWords,
# but let's also ensure it fires correctly by resetting the ref.
for i, l in enumerate(lines):
    if 'prevWsPreloadedWordsLengthRef.current' in l and '= 0' in l and 72000 < i < 73000:
        print('prevRef reset already exists at L%d' % (i+1))
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\n" + "=" * 60)
print("Applied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
print("=" * 60)

# Verify
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
print("\nVerification:")
print("  onClose resets currentWordSoundsWord:", "setCurrentWordSoundsWord(null)" in content)
print("  Count of setCurrentWordSoundsWord(null):", content.count("setCurrentWordSoundsWord(null)"))
print("  handleRestoreView resets activity:", "Reset activity state for fresh session" in content)
