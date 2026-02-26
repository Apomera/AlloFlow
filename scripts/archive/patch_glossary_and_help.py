"""
Two fixes:
1. Remove 'word-sounds' from glossary panel render condition (L60385)
2. Add floating help toggle pinned to left edge, always accessible above modals
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

lines = content.split('\n')
# Fix line endings for matching
original_content = content

changes = 0

# ===================================================================
# FIX 1: Remove 'word-sounds' from glossary render condition
# Before: {(activeView === 'glossary' || activeView === 'word-sounds') && (
# After:  {activeView === 'glossary' && (
# ===================================================================
old_glossary = "(activeView === 'glossary' || activeView === 'word-sounds') && ("
new_glossary = "activeView === 'glossary' && ("

if old_glossary in content:
    content = content.replace(old_glossary, new_glossary)
    print("[1] Fixed glossary leak: removed 'word-sounds' from render condition")
    changes += 1
else:
    print("[1] SKIP: glossary condition not found (may already be fixed)")

# ===================================================================
# FIX 2: Add floating help toggle FAB
# Insert near the existing FAB area (around L68382 area) 
# The floating help toggle:
# - Pinned to LEFT edge, vertically centered
# - z-[10999] - above all modals, below spotlight
# - Small ? icon, semi-transparent until hovered
# - Uses data-help-ignore so it doesn't trigger help text lookup
# ===================================================================

# Find the existing FAB container to insert our floating help toggle nearby
# The main fab is at: <div className={`fixed bottom-24 md:bottom-8 z-[10000]
# We'll insert before it

fab_marker = 'fixed bottom-24 md:bottom-8 z-[10000] flex flex-col items-end gap-4 no-print'
fab_idx = content.find(fab_marker)

if fab_idx >= 0:
    # Find the start of this <div> tag
    # Go backwards to find the opening <div
    search_back = content.rfind('<div', 0, fab_idx)
    
    # Insert our floating help toggle just before this line
    floating_help_toggle = '''
      {/* Floating Help Toggle — accessible above all modals */}
      <button
        data-help-ignore="true"
        onClick={handleToggleIsHelpMode}
        aria-label={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        title={isHelpMode ? t('help_mode.deactivate') : t('help_mode.activate')}
        className={`fixed left-3 top-1/2 -translate-y-1/2 z-[10999] w-9 h-9 rounded-full flex items-center justify-center shadow-lg border-2 transition-all duration-300 no-print ${
          isHelpMode 
            ? 'bg-yellow-400 border-yellow-500 text-slate-900 scale-110 animate-pulse shadow-yellow-400/50' 
            : 'bg-white/60 border-slate-300/50 text-slate-400 hover:bg-white hover:border-indigo-400 hover:text-indigo-600 hover:scale-110 hover:shadow-xl backdrop-blur-sm'
        }`}
        style={{ fontSize: '16px', fontWeight: 900, lineHeight: 1 }}
      >
        {isHelpMode ? <X size={16}/> : '?'}
      </button>
'''
    
    content = content[:search_back] + floating_help_toggle + '\n      ' + content[search_back:]
    print("[2] Added floating help toggle (left edge, z-10999)")
    changes += 1
else:
    print("[2] SKIP: FAB container not found")

# ===================================================================
# Write changes
# ===================================================================
if changes > 0:
    # Fix double CRs
    content_bytes = content.encode('utf-8')
    content_bytes = content_bytes.replace(b'\r\r\n', b'\r\n')
    
    with open(FILE, 'wb') as f:
        f.write(content_bytes)
    
    final_lines = content_bytes.count(b'\n')
    print(f"\n{changes} changes applied. ~{final_lines} lines.")
else:
    print("\nNo changes applied.")
