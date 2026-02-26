import re

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    text = f.read()

# Fix Block 6: Lines ~9043 to make letter tracing more forgiving and prevent trapping
old_block_6 = """             const coverage = hits / (totalTarget || 1);
             const messiness = outsideInk / (totalTarget || 1);
             debugLog("Trace Score:", coverage, messiness);
             if (coverage > 0.40) {
                 setFeedback({ type: 'success', emoji: '🌟', size: 'lg' });
                 setTimeout(() => { if (localMountedRef.current) onComplete(true); }, 800);
             } else if (coverage > 0.1) {"""

new_block_6 = """             const coverage = hits / (totalTarget || 1);
             const messiness = outsideInk / (totalTarget || 1);
             debugLog("Trace Score:", coverage, messiness, "Hits:", hits, "Target:", totalTarget);
             // Make tracing significantly more forgiving for young kids to prevent trapping
             if (coverage > 0.20 || (hits > 300 && messiness < 2.0)) {
                 setFeedback({ type: 'success', emoji: '🌟', size: 'lg' });
                 setTimeout(() => { if (localMountedRef.current) onComplete(true); }, 800);
             } else if (coverage > 0.05) {"""

if old_block_6 in text:
    text = text.replace(old_block_6, new_block_6)
    print("Patched Letter Tracing threshold logic")
else:
    print("Could not find the target text block for Letter Tracing.")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(text)
