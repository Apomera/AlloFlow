filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix: Add !isWordSoundsMode to the preview card guard
# so it hides when the modal takes over

old = "activeView === 'word-sounds' && console.error"
new = "activeView === 'word-sounds' && !isWordSoundsMode && console.error"

if old in content:
    content = content.replace(old, new, 1)
    print("1. Added !isWordSoundsMode to diagnostic line")
else:
    print("1. SKIP: diagnostic line not found")

old2 = "{activeView === 'word-sounds' && (\n                  <div className=\"space-y-6\">"
new2 = "{activeView === 'word-sounds' && !isWordSoundsMode && (\n                  <div className=\"space-y-6\">"

if old2 in content:
    content = content.replace(old2, new2, 1)
    print("2. Added !isWordSoundsMode guard to preview card")
else:
    print("2. SKIP: preview card pattern not found, trying alternate...")
    # Try to find exact
    idx = content.find("activeView === 'word-sounds' && (")
    if idx > 0:
        # Check it's at the right location (around line 60765)
        line_num = content[:idx].count('\n') + 1
        print(f"   Found at line {line_num}")
        # Simple replace
        content = content.replace("activeView === 'word-sounds' && (\n                  <div className=\"space-y-6\">", "activeView === 'word-sounds' && !isWordSoundsMode && (\n                  <div className=\"space-y-6\">", 1)
        if "!isWordSoundsMode" in content[idx:idx+200]:
            print("   Applied fix via alternate method")
        else:
            print("   FAILED alternate method")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
