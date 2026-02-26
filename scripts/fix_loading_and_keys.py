"""
Combined fixes:
1. Loading screen: Title first, rainbow-book below, larger (120px), centered, full acronym
2. STEM Lab: Fix duplicate 'fractions' key  
3. Update StemLab CDN hash
"""

# ===== FIX 1: Loading screen layout =====
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

OLD_LOADING = """          <div style={{ textAlign: 'center', animation: 'pulse 2s ease-in-out infinite' }}>
            <img src={"https://raw.githubusercontent.com/Apomera/AlloFlow/main/rainbow-book.jpg"} alt="AlloFlow" style={{ width: '80px', height: '80px', marginBottom: '16px', filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.5))', borderRadius: '16px' }} />
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>AlloFlow</h1>
            <p style={{ fontSize: '14px', color: 'rgba(165,180,252,0.8)', margin: '0 0 32px', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Universal Design for Learning</p>
          </div>"""

NEW_LOADING = """          <div style={{ textAlign: 'center', animation: 'pulse 2s ease-in-out infinite', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '36px', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.5px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>AlloFlow</h1>
            <img src={"https://raw.githubusercontent.com/Apomera/AlloFlow/main/rainbow-book.jpg"} alt="AlloFlow" style={{ width: '120px', height: '120px', marginBottom: '16px', filter: 'drop-shadow(0 0 24px rgba(99,102,241,0.5))', borderRadius: '20px', objectFit: 'cover' }} />
            <p style={{ fontSize: '13px', color: 'rgba(165,180,252,0.8)', margin: '0 0 32px', fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase' }}>Universal Design for Learning Platform</p>
          </div>"""

if OLD_LOADING in c:
    c = c.replace(OLD_LOADING, NEW_LOADING)
    print('Fix 1: Loading screen restructured (title > logo > acronym)')
else:
    print('Fix 1 SKIPPED: old loading pattern not found')

# ===== FIX 3: Update StemLab CDN hash =====
import re
old_stem = re.findall(r'AlloFlow@[a-f0-9]+/stem_lab_module\.js', c)
print(f'Current StemLab CDN refs: {old_stem}')
c = re.sub(r'AlloFlow@[a-f0-9]+/stem_lab_module\.js', 'AlloFlow@01210aa/stem_lab_module.js', c)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(c)
print('Fix 3: StemLab CDN updated')

# ===== FIX 2: Duplicate fractions key in stem_lab_module.js =====
FILE2 = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"
with open(FILE2, 'r', encoding='utf-8') as f:
    s = f.read()

# The original tool at L311 uses id: 'fractions' (manipulatives section)  
# The new tool at L614 also uses id: 'fractions' (explore section)
# Rename the new one to 'fractionViz' to avoid collision
# But actually, let me check which section each is in
lines = s.split('\n')
for i, l in enumerate(lines):
    if "'fractions'" in l and 'id:' in l:
        print(f'  L{i+1}: {l.strip()[:120]}')

# The new fraction visualizer tool should use 'fractionViz' as its id
# Find the second occurrence and rename it
count = 0
idx = 0
while True:
    idx = s.find("id: 'fractions'", idx)
    if idx < 0:
        break
    count += 1
    if count == 2:
        # This is the new tool - rename to fractionViz
        s = s[:idx] + "id: 'fractionViz'" + s[idx + len("id: 'fractions'"):]
        print(f'Fix 2: Renamed second fractions to fractionViz at char {idx}')
        break
    idx += 1

# Also fix the stemLabTool === 'fractions' check in the new tool UI
s = s.replace("stemLabTool === 'fractions' && (() => {", "stemLabTool === 'fractionViz' && (() => {")
# And the labToolData.fractions references in the fraction viz tool
# These should stay as 'fractions' since they reference the state key which is fine
# Actually wait - the tool grid click sets stemLabTool to the id, and the UI checks stemLabTool
# So the UI check needs to match the grid id. The state key can stay 'fractions'.

with open(FILE2, 'w', encoding='utf-8') as f:
    f.write(s)

print('\nDone!')
