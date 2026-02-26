"""
Replace green bar + Review Words button with inline word list
AND remove onShowReview prop and auto-navigation useEffect
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
lines = f.readlines()
f.close()

le = '\r\n' if lines[0].endswith('\r\n') else '\n'
changes = []
original = len(lines)

# ====================================================================
# 1. Replace the green banner (L1676-1699) with inline word list
# ====================================================================
# Find: {/* Pre-loaded Words Banner */}
banner_start = None
banner_end = None
for i in range(1670, 1710):
    if 'Pre-loaded Words Banner' in lines[i]:
        banner_start = i
    if banner_start and ')}\n' in lines[i] or (banner_start and lines[i].strip() == ')}'):
        banner_end = i
        break

if banner_start and banner_end:
    new_banner = [
        '                    {/* Pre-loaded Words Panel */}' + le,
        '                    {preloadedWords && preloadedWords.length > 0 && (' + le,
        '                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-200 px-4 py-2">' + le,
        '                            <div className="flex items-center gap-2 mb-2">' + le,
        '                                <div className="bg-emerald-100 rounded-full p-1">' + le,
        '                                    <CheckCircle2 size={14} className="text-emerald-600" />' + le,
        '                                </div>' + le,
        '                                <span className="font-bold text-emerald-800 text-sm">{preloadedWords.length} words ready</span>' + le,
        '                            </div>' + le,
        '                            <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto pr-1">' + le,
        '                                {preloadedWords.map((w, idx) => {' + le,
        '                                    const word = w.targetWord || w.word || w;' + le,
        '                                    const isReady = w.ttsReady;' + le,
        '                                    return (' + le,
        '                                        <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-emerald-200 text-emerald-800 shadow-sm">' + le,
        '                                            <span className={`w-1.5 h-1.5 rounded-full ${isReady ? \'bg-emerald-400\' : \'bg-amber-400 animate-pulse\'}`} title={isReady ? "Audio ready" : "Loading audio..."} />' + le,
        '                                            {word}' + le,
        '                                            {w.image && <span className="text-emerald-400" title="Image available">🖼</span>}' + le,
        '                                        </span>' + le,
        '                                    );' + le,
        '                                })}' + le,
        '                            </div>' + le,
        '                        </div>' + le,
        '                    )}' + le,
    ]
    lines[banner_start:banner_end+1] = new_banner
    changes.append(f"1. Replaced green banner (L{banner_start+1}-{banner_end+1}) with inline word list ({len(new_banner)} lines)")
else:
    print(f"WARNING: Could not find banner (start={banner_start}, end={banner_end})")

# ====================================================================
# 2. Remove onShowReview auto-navigation useEffect (L1341-1351)
# ====================================================================
# Find: "AUTO-NAVIGATION: Automatically open Review Panel when words are ready"
auto_nav_start = None
auto_nav_end = None
for i in range(1330, 1360):
    if i >= len(lines):
        break
    if 'AUTO-NAVIGATION' in lines[i]:
        auto_nav_start = i
    if auto_nav_start and 'onShowReview' in lines[i] and ']);' in lines[i]:
        auto_nav_end = i
        break

if auto_nav_start and auto_nav_end:
    # Remove from the comment above (hasAutoNavigated ref too)
    # Find hasAutoNavigated ref declaration
    ref_line = None
    for i in range(auto_nav_start - 5, auto_nav_start):
        if 'hasAutoNavigated' in lines[i] and 'useRef' in lines[i]:
            ref_line = i
            break
    
    start = ref_line if ref_line else auto_nav_start
    # Also remove the comment lines above
    while start > 0 and ('Track if we already' in lines[start-1] or 'FIX: If words' in lines[start-1] or 'skip auto-navigation' in lines[start-1]):
        start -= 1
    
    # Remove blank lines before too
    while start > 0 and lines[start-1].strip() == '':
        start -= 1
    start = max(start, 0)
    
    removed = auto_nav_end - start + 1
    del lines[start:auto_nav_end + 1]
    changes.append(f"2. Removed auto-navigation useEffect + hasAutoNavigated ref ({removed} lines)")
else:
    print(f"WARNING: Could not find auto-navigation useEffect")

# ====================================================================
# 3. Remove onShowReview from component signature
# ====================================================================
for i in range(len(lines)):
    if 'WordSoundsGenerator' in lines[i] and 'onShowReview' in lines[i]:
        lines[i] = lines[i].replace(', onShowReview', '')
        lines[i] = lines[i].replace(',onShowReview', '')
        changes.append(f"3. Removed onShowReview from component signature at L{i+1}")
        break

# ====================================================================
# 4. Remove onShowReview prop from parent call site (~L71176)
# ====================================================================
for i in range(len(lines)):
    if 'onShowReview={() => {' in lines[i]:
        # Find the closing }}
        j = i
        while j < min(i + 15, len(lines)):
            if '}}' in lines[j] and j > i:
                # Delete from i to j (inclusive)
                del lines[i:j+1]
                changes.append(f"4. Removed onShowReview prop from parent call site (L{i+1}-{j+1})")
                break
            j += 1
        break

# Write
f = open(FILE, 'w', encoding='utf-8')
f.write(''.join(lines))
f.close()

print(f"\nApplied {len(changes)} changes:")
for c in changes:
    print(f"  ✅ {c}")
print(f"\nLines: {original} -> {len(lines)} (delta: {len(lines) - original})")
