"""
Fix the gappy highlighting in immersive reader.

Problem: Each ImmersiveWord gets individual bg-yellow-300, rounded, mx-0.5, px-1
creating visible gaps between words in a highlighted sentence.

Solution: 
1. Move the highlight background to the sentence-level <span> wrapper
2. Keep ImmersiveWord isActive only for font weight/color, not background
3. The span wrapper already exists (added for chunk reader)
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Update ImmersiveWord (line 37060) - simplify isActive styling
# Remove background, rounded, padding, margin, shadow, transform from active state
# Keep only font-weight/color changes for active words
old_active = """    if (isActive) {
        if (!wordData.text.trim()) {
           className += "bg-yellow-300 ";
        } else {
           className += "bg-yellow-300 text-black rounded px-1 mx-0.5 shadow-sm transform scale-105 ";
        }
    }"""

new_active = """    if (isActive) {
        className += "font-semibold ";
    }"""

# Find this in the SECOND ImmersiveWord (line 37060+)
# Need to replace only the one at ~37085, not the first one at ~29065
idx1 = content.find(old_active)
if idx1 > 0:
    idx2 = content.find(old_active, idx1 + 1)
    if idx2 > 0:
        # Replace the second one (main immersive reader ImmersiveWord)
        content = content[:idx2] + new_active + content[idx2 + len(old_active):]
        fixes += 1
        print("1. Simplified ImmersiveWord active styling (removed bg/padding/margin)")
    else:
        # Only one instance, replace it
        content = content.replace(old_active, new_active, 1)
        fixes += 1
        print("1. Simplified ImmersiveWord active styling (single instance)")
else:
    print("1. SKIP: active styling pattern not found")

# 2. Update the sentence-level <span> wrapper to apply highlight background
# Current span wrapper (for chunk reader):
old_span = """<span key={wordData.id || i} data-sentence-idx={assignedIdx} style={isChunkDimmed ? { opacity: 0.2, transition: 'opacity 0.3s' } : isChunkHighlight ? { opacity: 1, transition: 'opacity 0.3s' } : {}}>"""

new_span = """<span key={wordData.id || i} data-sentence-idx={assignedIdx} style={{
                                                    ...(isChunkDimmed ? { opacity: 0.2 } : {}),
                                                    transition: 'all 0.3s ease',
                                                    ...(isChunkHighlight || (isPlaying && playbackState.currentIdx === assignedIdx) ? {
                                                        backgroundColor: 'rgba(250, 204, 21, 0.35)',
                                                        borderRadius: '4px',
                                                        boxDecorationBreak: 'clone',
                                                        WebkitBoxDecorationBreak: 'clone',
                                                    } : {}),
                                                }}>"""

if old_span in content:
    content = content.replace(old_span, new_span, 1)
    fixes += 1
    print("2. Updated span wrapper with sentence-level highlight background")
else:
    print("2. SKIP: span wrapper not found")

# 3. Also fix the first ImmersiveWord (line 29065) which is used in a different context
# Check if the first one has similar issues
idx_first = content.find(old_active)
if idx_first > 0 and idx_first < 35000:
    # First ImmersiveWord still has the old gappy style
    content = content[:idx_first] + new_active + content[idx_first + len(old_active):]
    fixes += 1
    print("3. Also simplified first ImmersiveWord active styling")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes} fixes")
