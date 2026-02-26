filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# The WordSoundsModal condition is too restrictive.
# When the preview card sets isWordSoundsMode=true, the modal should show
# regardless of generatedContent.type since activeView is already 'word-sounds'.
# Add activeView === 'word-sounds' as an alternative condition.

old_condition = "{isWordSoundsMode && (generatedContent?.type === 'glossary' || generatedContent?.type === 'word-sounds' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && ("
new_condition = "{isWordSoundsMode && (activeView === 'word-sounds' || generatedContent?.type === 'glossary' || generatedContent?.type === 'word-sounds' || (wsPreloadedWords && wsPreloadedWords.length > 0)) && ("

if old_condition in content:
    content = content.replace(old_condition, new_condition, 1)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed: Added activeView === 'word-sounds' to WordSoundsModal render condition")
else:
    print("Pattern not found, searching...")
    idx = content.find("isWordSoundsMode && (generatedContent?.type")
    if idx > 0:
        print(f"  Found at char {idx}")
        print(f"  Context: {content[idx:idx+200]}")
