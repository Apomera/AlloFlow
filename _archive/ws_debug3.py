"""
Add temporary diagnostic console.error statements to trace EXACTLY
what's happening when the word-sounds preview card should render.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Add diagnostic right at the word-sounds preview card opening
old1 = "{activeView === 'word-sounds' && (\n                  <div className=\"space-y-6\">"
new1 = """{activeView === 'word-sounds' && console.error("[WS-DBG] Preview card branch ENTERED! activeView:", activeView, "isWordSoundsMode:", isWordSoundsMode, "generatedContent type:", generatedContent?.type) && false}
                {activeView === 'word-sounds' && (
                  <div className=\"space-y-6\">"""

if old1 in content:
    content = content.replace(old1, new1, 1)
    fixes += 1
    print("1. Added preview card diagnostic")
else:
    # Try alternate: maybe different whitespace
    print("1. SKIP: exact pattern not found, trying broader search")
    # Let's check what the actual text looks like
    idx = content.find("activeView === 'word-sounds' && (")
    if idx >= 0:
        print(f"   Found at char {idx}: {repr(content[idx:idx+100])}")

# 2. Add diagnostic in handleRestoreView AFTER the teacher/student branch
old2 = """          if (isTeacherMode) {
              // Teacher: Show the preview card with Review/Launch buttons. Don't auto-enter the modal.
              setIsWordSoundsMode(false);
              setWordSoundsAutoReview(false);
          }"""
new2 = """          if (isTeacherMode) {
              // Teacher: Show the preview card with Review/Launch buttons. Don't auto-enter the modal.
              setIsWordSoundsMode(false);
              setWordSoundsAutoReview(false);
              console.error("[WS-DBG] Teacher path complete. activeView should now be 'word-sounds'. generatedContent set to:", JSON.stringify({type: item.type, dataLen: item.data?.length, title: item.title}).substring(0, 200));
          }"""

if old2 in content:
    content = content.replace(old2, new2, 1)
    fixes += 1
    print("2. Added teacher path diagnostic")
else:
    print("2. SKIP: teacher path pattern not found")

# 3. Check: Is there maybe a `generatedContent && (activeView === 'analysis' || activeView === 'output')` 
# guard ABOVE the preview card that excludes 'word-sounds'?
# Let's search for any reference to activeView between lines 60335 and 60765
lines = content.split('\n')
print("\n=== activeView references between lines 60335 and 60770 ===")
for i in range(min(60334, len(lines)), min(60770, len(lines))):
    line = lines[i]
    if 'activeView' in line:
        print(f"  Line {i+1}: {line.strip()[:120]}")

# 4. Also check: is there a `generatedContent?.data?.originalText` reference
# that could crash (return undefined) for word-sounds data?
print("\n=== generatedContent?.data references between 60335-60770 ===")
for i in range(min(60334, len(lines)), min(60770, len(lines))):
    line = lines[i]
    if 'generatedContent?.data' in line and 'activeView' not in line:
        print(f"  Line {i+1}: {line.strip()[:120]}")

if fixes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nApplied {fixes} diagnostics")
else:
    print("\nNo diagnostics applied - patterns not found")
