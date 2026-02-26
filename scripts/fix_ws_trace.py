"""
Add a useEffect RIGHT AFTER the wsState destructuring to trace isWordSoundsMode changes.
This goes at L34021 (after the setters), placed carefully AFTER isWordSoundsMode is declared.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Add useEffect right after L34020 (the last WS setter)
old = """  const setWordSoundsFeedback = (v) => wsDispatch({ type: 'WS_SET', field: 'wordSoundsFeedback', value: v });
  // REMOVED: Duplicate tracingPhase state (moved to Word Sounds scope at L3313)"""

new = """  const setWordSoundsFeedback = (v) => wsDispatch({ type: 'WS_SET', field: 'wordSoundsFeedback', value: v });
  useEffect(() => { console.error("[WS-DBG] isWordSoundsMode CHANGED to:", isWordSoundsMode, "type:", generatedContent?.type); }, [isWordSoundsMode]);
  // REMOVED: Duplicate tracingPhase state (moved to Word Sounds scope at L3313)"""

if old in content:
    content = content.replace(old, new, 1)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(content)
    print("SUCCESS: Added useEffect to trace isWordSoundsMode changes")
else:
    print("[WARN] Pattern not found")
    # Show what's around L34020
    lines = content.split('\n')
    for i in range(34018, 34024):
        print("L%d: %s" % (i+1, lines[i][:170]))
