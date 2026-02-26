"""
Patch: Word Sounds Preload Guard
Prevents resource history navigation from killing the WordSoundsGenerator's handleStart loop.

Changes:
1. Add isWordSoundsProcessing state near wsPreloadedWords (L32344)
2. Pass setIsWordSoundsProcessing to WordSoundsGenerator (L71868)
3. Wire handleStart to set processing flag (L1483)
4. Guard handleRestoreView (L45602)
"""

import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ============================================================
# PATCH 1: Add isWordSoundsProcessing state near wsPreloadedWords
# ============================================================
target1 = "const [wsPreloadedWords, setWsPreloadedWords] = useState([]);"
replace1 = """const [wsPreloadedWords, setWsPreloadedWords] = useState([]);
  const [isWordSoundsProcessing, setIsWordSoundsProcessing] = useState(false); // True while WordSoundsGenerator.handleStart is running"""

if 'isWordSoundsProcessing' not in content:
    if target1 in content:
        content = content.replace(target1, replace1, 1)
        changes += 1
        print("PATCH 1: Added isWordSoundsProcessing state ✓")
    else:
        print("PATCH 1 ERROR: Target not found!")
        exit(1)
else:
    print("PATCH 1: Already present, skipping")

# ============================================================
# PATCH 2: Guard handleRestoreView
# ============================================================
target2 = """const handleRestoreView = (item) => {
      setGeneratedContent({ type: item.type, data: item.data, id: item.id });"""

replace2 = """const handleRestoreView = (item) => {
      // Guard: Don't navigate away if Word Sounds is actively processing words
      if (isWordSoundsProcessing) {
          addToast("⏳ Word Sounds is still loading words. Please wait for processing to complete.", "warning");
          return;
      }
      setGeneratedContent({ type: item.type, data: item.data, id: item.id });"""

if "Word Sounds is still loading words" not in content:
    if target2 in content:
        content = content.replace(target2, replace2, 1)
        changes += 1
        print("PATCH 2: Guarded handleRestoreView ✓")
    else:
        print("PATCH 2 ERROR: Target not found!")
        # Try alternate whitespace
        alt = "const handleRestoreView = (item) =>"
        if alt in content:
            print("  Found alternate target, trying flexible match...")
            # Use a regex approach
            pattern = r'(const handleRestoreView = \(item\) => \{)\s*\n(\s*setGeneratedContent\(\{ type: item\.type, data: item\.data, id: item\.id \}\);)'
            replacement = r"""\1
      // Guard: Don't navigate away if Word Sounds is actively processing words
      if (isWordSoundsProcessing) {
          addToast("⏳ Word Sounds is still loading words. Please wait for processing to complete.", "warning");
          return;
      }
\2"""
            new_content = re.sub(pattern, replacement, content, count=1)
            if new_content != content:
                content = new_content
                changes += 1
                print("PATCH 2: Guarded handleRestoreView (via regex) ✓")
            else:
                print("PATCH 2 ERROR: Regex also failed!")
                exit(1)
        else:
            print("PATCH 2 ERROR: Function not found at all!")
            exit(1)
else:
    print("PATCH 2: Already present, skipping")

# ============================================================
# PATCH 3: Pass setIsWordSoundsProcessing to WordSoundsGenerator
# ============================================================
target3 = """<WordSoundsGenerator 
              glossaryTerms={generatedContent?.type === 'glossary' ? (generatedContent?.data || []) : (latestGlossary || [])}
              t={t}
              gradeLevel={gradeLevel || 'K-2'}"""

replace3 = """<WordSoundsGenerator 
              glossaryTerms={generatedContent?.type === 'glossary' ? (generatedContent?.data || []) : (latestGlossary || [])}
              t={t}
              gradeLevel={gradeLevel || 'K-2'}
              setIsWordSoundsProcessing={setIsWordSoundsProcessing}"""

# Check for alternate target (sometimes indentation varies)
if 'setIsWordSoundsProcessing={setIsWordSoundsProcessing}' not in content:
    if target3 in content:
        content = content.replace(target3, replace3, 1)
        changes += 1
        print("PATCH 3: Passed setIsWordSoundsProcessing prop ✓")
    else:
        # Try finding any <WordSoundsGenerator that has gradeLevel
        pattern3 = r'(<WordSoundsGenerator\s*\n\s*glossaryTerms=\{[^}]+\}\s*\n\s*t=\{t\}\s*\n\s*gradeLevel=\{gradeLevel \|\| \'K-2\'\})'
        match3 = re.search(pattern3, content)
        if match3:
            old = match3.group(1)
            new = old + '\n              setIsWordSoundsProcessing={setIsWordSoundsProcessing}'
            content = content.replace(old, new, 1)
            changes += 1
            print("PATCH 3: Passed setIsWordSoundsProcessing prop (via regex) ✓")
        else:
            print("PATCH 3 ERROR: WordSoundsGenerator JSX not found!")
            exit(1)
else:
    print("PATCH 3: Already present, skipping")

# ============================================================
# PATCH 4: Accept prop in WordSoundsGenerator component
# ============================================================
target4_old = "const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview }) => {"
target4_new = "const WordSoundsGenerator = ({ glossaryTerms, onStartGame, onClose, callGemini, callImagen, callTTS, gradeLevel, t: tProp, preloadedWords = [], onShowReview, setIsWordSoundsProcessing }) => {"

if 'setIsWordSoundsProcessing' not in content.split('WordSoundsGenerator')[1].split('=>')[0] if 'WordSoundsGenerator' in content else '':
    if target4_old in content:
        content = content.replace(target4_old, target4_new, 1)
        changes += 1
        print("PATCH 4: Added prop to WordSoundsGenerator signature ✓")
    else:
        print("PATCH 4 ERROR: WordSoundsGenerator function signature not found!")
        exit(1)
else:
    print("PATCH 4: Already present, skipping")

# ============================================================
# PATCH 5: Wire handleStart to set processing flag
# ============================================================
target5 = """const handleStart = async () => {
             const wordsToProcess = previewList.filter((_, i) => selectedIndices.has(i));
             if (wordsToProcess.length === 0) return;
             
             setIsProcessing(true);"""

replace5 = """const handleStart = async () => {
             const wordsToProcess = previewList.filter((_, i) => selectedIndices.has(i));
             if (wordsToProcess.length === 0) return;
             
             setIsProcessing(true);
             // Signal parent that word processing is active (prevents resource navigation)
             if (setIsWordSoundsProcessing) setIsWordSoundsProcessing(true);"""

if "setIsWordSoundsProcessing) setIsWordSoundsProcessing(true)" not in content:
    if target5 in content:
        content = content.replace(target5, replace5, 1)
        changes += 1
        print("PATCH 5: Set processing flag at start ✓")
    else:
        print("PATCH 5 ERROR: handleStart function not found!")
        exit(1)
else:
    print("PATCH 5: Already present, skipping")

# ============================================================
# PATCH 6: Clear processing flag when handleStart completes
# Find the end of handleStart — look for setIsProcessing(false) after the loop
# ============================================================
# The handleStart function ends with setIsProcessing(false) followed by onStartGame call
# Let me find the pattern
target6_pattern = r'(setIsProcessing\(false\);\s*\n\s*)(onStartGame\(processed)'
if "setIsWordSoundsProcessing) setIsWordSoundsProcessing(false)" not in content:
    match6 = re.search(target6_pattern, content)
    if match6:
        old6 = match6.group(0)
        new6 = match6.group(1) + "// Signal parent that processing is complete\n             if (setIsWordSoundsProcessing) setIsWordSoundsProcessing(false);\n             " + match6.group(2)
        content = content.replace(old6, new6, 1)
        changes += 1
        print("PATCH 6: Clear processing flag on completion ✓")
    else:
        print("PATCH 6 WARNING: Could not find setIsProcessing(false) before onStartGame")
        # Try alternate search
        alt6 = "setIsProcessing(false);"
        idx = content.find(alt6)
        if idx > 0 and idx < content.find('onStartGame(processed'):
            # There might be multiple setIsProcessing(false) - find the one in handleStart
            # handleStart is at ~L1483. Let's search in that area
            start_area = content.find('const handleStart = async () =>')
            if start_area > 0:
                end_area = start_area + 5000  # handleStart is a big function
                area = content[start_area:end_area]
                local_idx = area.find('setIsProcessing(false);')
                if local_idx > 0:
                    insert_pos = start_area + local_idx + len('setIsProcessing(false);')
                    content = content[:insert_pos] + '\n             if (setIsWordSoundsProcessing) setIsWordSoundsProcessing(false);' + content[insert_pos:]
                    changes += 1
                    print("PATCH 6: Clear processing flag on completion (alt method) ✓")
                else:
                    print("PATCH 6 ERROR: setIsProcessing(false) not found in handleStart area")
                    exit(1)
else:
    print("PATCH 6: Already present, skipping")

# Write result
with open('AlloFlowANTI.txt', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\n=== {changes} patches applied ===")

# Verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()

checks = {
    "isWordSoundsProcessing state": "const [isWordSoundsProcessing, setIsWordSoundsProcessing] = useState(false)" in v,
    "handleRestoreView guard": "Word Sounds is still loading words" in v,
    "Prop passed to WSGenerator": "setIsWordSoundsProcessing={setIsWordSoundsProcessing}" in v,
    "Prop in WSGenerator signature": "setIsWordSoundsProcessing" in v.split("WordSoundsGenerator = ({")[1].split("=> {")[0] if "WordSoundsGenerator = ({" in v else False,
    "Flag set in handleStart": "setIsWordSoundsProcessing) setIsWordSoundsProcessing(true)" in v,
    "Flag cleared after processing": "setIsWordSoundsProcessing) setIsWordSoundsProcessing(false)" in v,
}

all_pass = True
for label, ok in checks.items():
    print(f"  {'PASS' if ok else 'FAIL'}: {label}")
    if not ok: all_pass = False

if all_pass:
    print("\n✅ ALL CHECKS PASSED")
else:
    print("\n❌ SOME CHECKS FAILED")
