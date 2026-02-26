"""
Tier 1 Accessibility Fixes:
1. Add prefers-reduced-motion media query
2. Fix clickable divs (modal containers) with role="dialog" 
3. Fix outline-none without focus replacement
"""
import re

FILE = 'AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

count = 0

# ============================================================
# FIX 1: prefers-reduced-motion
# ============================================================
# Find the first main <style> block (AlloBot animations) and append
# a reduced-motion query that disables all animations/transitions.
# The best injection point is after the last @keyframes in the AlloBot block.

REDUCED_MOTION_CSS = """
/* WCAG 2.1 AA: Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
"""

# Find the main style block end - after the AlloBot keyframes (around L20900)
# Look for the closing </style> after the ken-burns keyframe
KEN_BURNS_MARKER = "@keyframes ken-burns {"
idx = content.find(KEN_BURNS_MARKER)
if idx > 0:
    # Find the </style> or `} after this
    end_style = content.find('`}</style>', idx)
    if end_style > 0:
        content = content[:end_style] + REDUCED_MOTION_CSS + content[end_style:]
        print("  ✅ Injected prefers-reduced-motion CSS")
        count += 1
    else:
        print("  ❌ Could not find style closing after ken-burns")
else:
    print("  ❌ Could not find ken-burns keyframe")

# ============================================================
# FIX 2: Clickable divs (modal containers)
# ============================================================
# These are all modal dialogs that use onClick={e => e.stopPropagation()}
# The proper fix is to add role="dialog" to communicate their purpose.
# They don't need tabIndex or keyboard because they're modal containers,
# not buttons. The onClick is just preventing backdrop close propagation.

# Pattern: <div className="...modal classes..." onClick={(e) => e.stopPropagation()
# or onClick={e => e.stopPropagation()
# Add role="dialog" to these

dialog_patterns = [
    # These use onClick={e => e.stopPropagation()} or similar
    ('onClick={(e) => e.stopPropagation()}', 'role="dialog" onClick={(e) => e.stopPropagation()}'),
    ('onClick={e => e.stopPropagation()}', 'role="dialog" onClick={e => e.stopPropagation()}'),
]

for old, new in dialog_patterns:
    n = content.count(old)
    # Only add role= if not already present
    # We need to be careful: only replace where role= is NOT already on the element
    lines = content.split('\n')
    for i, line in enumerate(lines):
        if old in line and 'role=' not in line:
            lines[i] = line.replace(old, new, 1)
            count += 1
    content = '\n'.join(lines)

print(f"  ✅ Added role='dialog' to modal containers")

# ============================================================
# FIX 3: outline-none without focus replacement
# ============================================================
# These lines have outline-none but no focus: styles
# We need to add focus:ring-2 focus:ring-indigo-400 as a replacement

OUTLINE_FIXES = [
    # L2226
    (
        'className="flex-1 p-2 rounded-lg border border-violet-200 text-sm outline-none"',
        'className="flex-1 p-2 rounded-lg border border-violet-200 text-sm outline-none focus:ring-2 focus:ring-violet-400"'
    ),
    # L4371 - word input
    (
        'outline-none transition-all shadow-sm placeholder',
        'outline-none focus:ring-2 focus:ring-indigo-400 transition-all shadow-sm placeholder'
    ),
    # L10666
    (
        'className="bg-violet-800 border border-violet-600 rounded-full pl-8 pr-8 py-1 text-white text-xs cursor-pointer hover:bg-violet-700 outline-none',
        'className="bg-violet-800 border border-violet-600 rounded-full pl-8 pr-8 py-1 text-white text-xs cursor-pointer hover:bg-violet-700 outline-none focus:ring-2 focus:ring-violet-400'
    ),
    # L10700
    (
        'className="bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs cursor-pointer hover:bg-white/30 transition-colors outline-none',
        'className="bg-white/20 border border-white/30 rounded-full px-3 py-1 text-white text-xs cursor-pointer hover:bg-white/30 transition-colors outline-none focus:ring-2 focus:ring-white/50'
    ),
    # L18881
    (
        'className="bg-transparent text-xs font-bold text-slate-600 outline-none cursor-pointer py-1 pr-1 w-24 truncate"',
        'className="bg-transparent text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer py-1 pr-1 w-24 truncate"'
    ),
    # L18940
    (
        'className="text-[10px] bg-transparent outline-none w-20 px-1 text-slate-600 placeholder:text-slate-500"',
        'className="text-[10px] bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 w-20 px-1 text-slate-600 placeholder:text-slate-500"'
    ),
    # L24171 - cloze input
    (
        'text-center border-b-2 px-1 py-0.5 text-sm font-bold transition-all outline-none rounded-t',
        'text-center border-b-2 px-1 py-0.5 text-sm font-bold transition-all outline-none focus:ring-2 focus:ring-indigo-400 rounded-t'
    ),
    # L27288 - word scramble input
    (
        'outline-none transition-all uppercase tracking-widest',
        'outline-none focus:ring-2 focus:ring-indigo-400 transition-all uppercase tracking-widest'
    ),
    # L57171
    (
        'className="w-full bg-transparent outline-none text-orange-900 font-bold resize-none h-full"',
        'className="w-full bg-transparent outline-none focus:ring-2 focus:ring-orange-400 text-orange-900 font-bold resize-none h-full"'
    ),
    # L57454
    (
        'className="text-xs text-slate-500 w-full bg-transparent outline-none border-b border-dashed border-slate-200"',
        'className="text-xs text-slate-500 w-full bg-transparent outline-none focus:ring-2 focus:ring-indigo-400 border-b border-dashed border-slate-200"'
    ),
    # L57483
    (
        'className="w-full bg-white rounded px-2 py-0.5 text-xs text-slate-500 italic outline-none border border-slate-100"',
        'className="w-full bg-white rounded px-2 py-0.5 text-xs text-slate-500 italic outline-none focus:ring-2 focus:ring-indigo-400 border border-slate-100"'
    ),
    # L69262
    (
        'className="bg-transparent text-center font-bold text-white outline-none w-full mb-1"',
        'className="bg-transparent text-center font-bold text-white outline-none focus:ring-2 focus:ring-white/50 w-full mb-1"'
    ),
]

for old, new in OUTLINE_FIXES:
    n = content.count(old)
    if n > 0:
        content = content.replace(old, new)
        count += n
        print(f"  ✅ Fixed outline-none: ...{old[30:60]}...")
    else:
        print(f"  SKIP: ...{old[30:60]}...")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\n✅ Tier 1: Total fixes applied: {count}")
