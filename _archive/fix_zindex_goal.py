"""Apply two fixes:
1. Lower z-index for select elements from 9999 to 50 (below modal z-60)
2. Find and fix wordSoundsSessionGoal ReferenceError
"""
FILE = 'AlloFlowANTI.txt'
f = open(FILE, 'r', encoding='utf-8-sig')
content = f.read()
f.close()

changes = []

# ══════════════════════════════════════════
# FIX 1: Z-INDEX - Lower from 9999 to 50
# ══════════════════════════════════════════
# The CSS at L11040 gives ALL select elements z-index: 9999 !important on mobile
# This makes them appear above the Word Sounds modal (z-[60])
# Fix: change to z-index: 50 (still above normal content but below modals at z-[60]+)

OLD_ZFIX = '''      /* Ensure dropdown menus and select elements appear above other content on mobile */
      select, [role="listbox"], [role="menu"], [role="combobox"] {
        z-index: 9999 !important;
        position: relative;
      }'''

NEW_ZFIX = '''      /* Ensure dropdown menus and select elements appear above other content on mobile */
      /* FIX: Lowered from 9999 to 50 — was appearing ABOVE modals (z-60+) */
      select, [role="listbox"], [role="menu"], [role="combobox"] {
        z-index: 50 !important;
        position: relative;
      }'''

if OLD_ZFIX in content:
    content = content.replace(OLD_ZFIX, NEW_ZFIX)
    changes.append("FIX 1: Lowered select z-index from 9999 to 50 (L11040)")
else:
    print("WARNING: Could not find z-index CSS to fix")

# ══════════════════════════════════════════
# FIX 2: wordSoundsSessionGoal 
# ══════════════════════════════════════════
# Check if there's a usage in AlloFlowContent (L31382+) that's NOT through props
# The error says "at AlloFlowContent" — meaning the parent component
# But L32370 declares the state, so it SHOULD be in scope...
# unless the error blob line 78195 points to somewhere ELSE

# Let's check: does AlloFlowContent use wordSoundsSessionGoal directly?
lines = content.split('\n')

# Find AlloFlowContent start (L31382)
alloflow_start = None
for i, line in enumerate(lines):
    if 'const AlloFlowContent = () =>' in line:
        alloflow_start = i
        break

# Find all usages in AlloFlowContent 
if alloflow_start:
    # wordSoundsSessionGoal state declaration line
    goal_decl = None
    goal_uses_before_decl = []
    
    for i in range(alloflow_start, len(lines)):
        if 'wordSoundsSessionGoal' in lines[i]:
            if 'useState' in lines[i]:
                goal_decl = i
            elif goal_decl is None:
                goal_uses_before_decl.append((i, lines[i].strip()[:150]))
    
    if goal_uses_before_decl:
        print(f"FOUND: wordSoundsSessionGoal used BEFORE declaration at L{goal_decl+1 if goal_decl else '?'}:")
        for ln, txt in goal_uses_before_decl:
            print(f"  L{ln+1}: {txt}")
    elif goal_decl:
        print(f"wordSoundsSessionGoal declared at L{goal_decl+1}, no uses before declaration in AlloFlowContent")
    
    # But wait - the usage at L7936 is inside WordSoundsContent (component defined starting around L3070)
    # WordSoundsContent is a SEPARATE component, so AlloFlowContent doesn't reference it directly
    # The error "at AlloFlowContent" means the entire app is wrapped in AlloFlowContent
    # Let's look at where WordSoundsContent is rendered and whether the prop is passed properly
    
    # Check if wordSoundsSessionGoal is in scope at the render site
    print("\nChecking prop pass at render site...")
    for i, line in enumerate(lines):
        if 'wordSoundsSessionGoal={' in line:
            print(f"  L{i+1}: {line.strip()[:150]}")

# Write results
f = open(FILE, 'w', encoding='utf-8')
f.write(content)
f.close()

# Verify
f = open(FILE, 'r', encoding='utf-8-sig')
verify = f.read()
f.close()

if 'z-index: 50 !important;' in verify:
    changes.append("VERIFIED: z-index now 50")

print(f"\nApplied {len(changes)} changes:")
for c in changes:
    print(f"  ✅ {c}")
