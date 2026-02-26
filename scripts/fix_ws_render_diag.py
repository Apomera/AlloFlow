"""
Add inline JSX diagnostic to check if the guard passes and if ErrorBoundary catches.
Also add an onError handler to the ErrorBoundary.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

changes = []

# Add a console.error that fires inside the JSX render when the guard is checked
# Replace the existing comment + guard with one that logs
old_guard = """{/* WS-DBG: isWordSoundsMode is checked here */}
                    {isWordSoundsMode && (generatedContent?.type === 'glossary' || generatedContent?.type === 'word-sounds' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && (
                        <ErrorBoundary fallbackMessage="Word Sounds encountered an error.\""""

new_guard = """{(() => { if (isWordSoundsMode) { console.error("[WS-DBG] RENDER CHECK: isWordSoundsMode=true, type=" + (generatedContent?.type) + ", wsWords=" + (wsPreloadedWords?.length || 0) + ", GUARD=" + !!(generatedContent?.type === 'glossary' || generatedContent?.type === 'word-sounds' || (wsPreloadedWords && wsPreloadedWords.length > 0))); } return null; })()}
                    {isWordSoundsMode && (generatedContent?.type === 'glossary' || generatedContent?.type === 'word-sounds' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && (
                        <ErrorBoundary fallbackMessage="Word Sounds encountered an error." onError={(error) => console.error("[WS-DBG] ErrorBoundary CAUGHT:", error?.message || error)}\""""

if old_guard in content:
    content = content.replace(old_guard, new_guard, 1)
    changes.append("Added inline render diagnostics and ErrorBoundary onError handler")
else:
    print("[WARN] Guard pattern not found, trying variant...")
    # Check if the comment is there
    if '{/* WS-DBG: isWordSoundsMode is checked here */}' in content:
        print("Comment is there, checking next line match...")
        idx = content.index('{/* WS-DBG: isWordSoundsMode is checked here */}')
        snippet = content[idx:idx+500]
        print(repr(snippet[:300]))
    else:
        print("WS-DBG comment not found at all")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("\nApplied %d changes:" % len(changes))
for c in changes:
    print("  + %s" % c)
