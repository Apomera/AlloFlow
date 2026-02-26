"""
Implement 3 bingo enhancements:
1. Default includeImages to true
2. Add image support to StudentBingoGame grid generation + rendering
3. Lock bingo card in student view (don't regenerate)
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# 1. Default includeImages to true
old1 = "includeImages: false"
new1 = "includeImages: true"
if old1 in content:
    content = content.replace(old1, new1, 1)
    fixes += 1
    print("1. Changed includeImages default to true")
else:
    print("1. SKIP: includeImages: false not found")

# 2. Add imageUrl to grid cell generation in StudentBingoGame
old2 = "row.push({ type: 'term', text: shuffled[termIdx] });"
new2 = """const matchingEntry = data.find(d => d.term === shuffled[termIdx]);
                  row.push({ type: 'term', text: shuffled[termIdx], imageUrl: matchingEntry?.imageUrl || null });"""
count2 = content.count(old2)
if count2 >= 1:
    # Only replace the first occurrence (in StudentBingoGame)
    content = content.replace(old2, new2, 1)
    fixes += 1
    print(f"2. Added imageUrl to StudentBingoGame cell generation (found {count2} occurrences, replaced 1st)")
else:
    print("2. SKIP: cell push pattern not found")

# 3. Add image rendering in StudentBingoGame cells
old3 = '<span className={`text-[10px] sm:text-xs font-bold leading-tight break-words ${isMarked && cell.type !== \'free\' ? \'opacity-40\' : \'\'}`}>'
new3 = """{cell.imageUrl && (
                                        <img src={cell.imageUrl} alt={cell.text} className={`w-8 h-8 sm:w-10 sm:h-10 object-contain rounded mb-0.5 ${isMarked && cell.type !== 'free' ? 'opacity-40' : ''}`} />
                                    )}
                                    <span className={`text-[10px] sm:text-xs font-bold leading-tight break-words ${isMarked && cell.type !== 'free' ? 'opacity-40' : ''}`}>"""
count3 = content.count(old3)
if count3 >= 1:
    # Replace only the first occurrence (StudentBingoGame)
    content = content.replace(old3, new3, 1)
    fixes += 1
    print(f"3. Added image rendering to StudentBingoGame cells (found {count3}, replaced 1st)")
else:
    print("3. SKIP: span pattern not found")

# 4. Lock bingo card in student view - add guard at start of useEffect
old4 = """  useEffect(() => {
      if (!data || !Array.isArray(data) || data.length === 0) return;
      const terms = data
          .map(d => d.term)"""
new4 = """  useEffect(() => {
      if (grid.length > 0) return; // Lock: don't regenerate if card already exists this session
      if (!data || !Array.isArray(data) || data.length === 0) return;
      const terms = data
          .map(d => d.term)"""
count4 = content.count(old4)
if count4 >= 1:
    content = content.replace(old4, new4, 1)
    fixes += 1
    print(f"4. Added student card lock guard (found {count4}, replaced 1st)")
else:
    print("4. SKIP: useEffect pattern not found")

if fixes > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"\nSUCCESS: Applied {fixes}/4 fixes to AlloFlowANTI.txt")
else:
    print("\nFAILED: No fixes applied")
