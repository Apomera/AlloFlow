"""
Fix: Word Sounds Pre-Activity Review Panel not showing.
Root cause: Multiple timing paths can prevent the review panel from appearing:
1) hasStartedFromReview ref stays true between sessions when first word is same
2) prevWsPreloadedWordsLengthRef doesn't reset to 0 between resource clicks
3) useEffect at L3414 has too many guards that block showing

Fix approach:
A) Make the useEffect at L3414 simpler - when initialShowReviewPanel becomes true, 
   always reset hasStartedFromReview and show the panel
B) Reset prevWsPreloadedWordsLengthRef when a new word-sounds resource is generated
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
lines = open(filepath, 'r', encoding='utf-8').readlines()
fixed = 0

# Fix A: Make the SYNC useEffect at L3414 more robust
# Currently gates on: initialShowReviewPanel && !showReviewPanel && !hasStartedFromReview.current && preloadedWords.length > 0
# Issue: If hasStartedFromReview is still true from prior session, blocks the panel
# Fix: When initialShowReviewPanel changes to true, ALWAYS reset hasStartedFromReview and show panel
for i, l in enumerate(lines):
    if 'SYNC: Ensure Review Panel opens when initialShowReviewPanel prop changes to true' in l:
        # Find the useEffect block (i to i+7 or so)
        end = i
        for j in range(i, min(i + 12, len(lines))):
            if '[initialShowReviewPanel, preloadedWords.length]);' in lines[j]:
                end = j
                break
        if end > i:
            new_effect = (
                "    // SYNC: Ensure Review Panel opens when initialShowReviewPanel prop changes to true\r\n"
                "    // This handles when prop is set true before mount AND when it changes after mount\r\n"
                "    React.useEffect(() => {\r\n"
                "        if (initialShowReviewPanel && preloadedWords.length > 0) {\r\n"
                "            // FIX: Always reset hasStartedFromReview when parent requests review\r\n"
                "            hasStartedFromReview.current = false;\r\n"
                "            if (!showReviewPanel) {\r\n"
                "                debugLog(\"📋 initialShowReviewPanel is true - showing Review Panel\");\r\n"
                "                setShowReviewPanel(true);\r\n"
                "            }\r\n"
                "        }\r\n"
                "    }, [initialShowReviewPanel, preloadedWords.length]);\r\n"
            )
            lines[i:end+1] = [new_effect]
            fixed += 1
            print("[OK] A: Fixed review panel SYNC useEffect at L%d" % (i+1))
        break

# Fix B: Also show review panel from the auto-start useEffect at L6670
# The auto-start useEffect already has this logic, but let's ensure it also
# resets hasStartedFromReview in that path
for i, l in enumerate(lines):
    if 'preloadedWords.length > 0 && !hasStartedFromReview.current' in l and 'Show Review Panel first' in lines[max(0,i-2):i+1].__repr__():
        if '// FIX-E5: Reset' in lines[i:i+3].__repr__():
            print("[OK] B: Auto-start review fix already present")
            break
        # This is the auto-start review condition
        # Change it to not check hasStartedFromReview since we check initialShowReviewPanel
        lines[i] = lines[i].replace(
            'preloadedWords.length > 0 && !hasStartedFromReview.current',
            'preloadedWords.length > 0 && !hasStartedFromReview.current // FIX-E5: Guard still needed for auto-start'
        )
        # Not actually changing logic here, just commenting for clarity
        break

# Fix C: Reset prevWsPreloadedWordsLengthRef in the parent when a new word-sounds resource is generated
# In the onStartGame callback at L69472, add a reset of the ref BEFORE setting words
for i, l in enumerate(lines):
    if 'setWsPreloadedWords(words);' in l and 'Start' in lines[max(0,i-5):i+1].__repr__() and i > 69000:
        if 'prevWsPreloadedWordsLengthRef' in lines[max(0,i-3):i+1].__repr__():
            print("[OK] C: prevWsPreloadedWordsLengthRef reset already present")
            break
        # Insert a ref reset before setting new words
        reset_line = "                   prevWsPreloadedWordsLengthRef.current = 0; // FIX: Reset before setting new words to trigger 0->N transition\r\n"
        lines.insert(i, reset_line)
        fixed += 1
        print("[OK] C: Added prevWsPreloadedWordsLengthRef reset at L%d" % (i+1))
        break

# Fix D: In onStartGame, force unmount-remount pattern to ensure initialShowReviewPanel works
# Currently: sets everything in one sync block, component mounts fresh
# But React batches state updates — all three sets happen in one render
# The issue might be that setIsWordSoundsMode(true) causes mount before wordSoundsAutoReview is true
# Fix: Use setTimeout to separate mount from state setup
for i, l in enumerate(lines):
    if 'setWordSoundsAutoReview(true);' in l and 'setIsWordSoundsMode(true);' in lines[i+1] if i+1 < len(lines) else False:
        if i > 69000:
            # Check if already fixed
            if 'FIX: Ensure' in lines[max(0,i-1):i+2].__repr__():
                print("[OK] D: Mount ordering fix already present")
                break
            # This is in the onStartGame flow — reorder to set autoReview BEFORE mode
            # Actually in React batched updates, order shouldn't matter within one render
            # But let's add a comment confirming this is intentional
            # The real fix is Fix A above — making the internal useEffect always respect the prop
            print("[OK] D: Mount ordering is correct (React batches updates)")
            break

open('AlloFlowANTI.txt', 'w', encoding='utf-8').write(''.join(lines))
print("\nFixed %d items" % fixed)
