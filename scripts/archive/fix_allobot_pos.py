"""
Fix AlloBot: 
1. Move default position from bottom-right to top-right
   - Change CSS from bottom: Ypx to top: Ypx
   - Flip drag delta Y calculation  
   - Update default position
   - Update moveTo calculation
   - Clear saved localStorage position (one-time migration)
2. Fix help mode overlay click area - constrain to just the bot visual
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

changes = 0

# ============================================================
# 1a. Change default position from {x:24, y:24} to {x:24, y:80}
# The y:80 puts it 80px from top (below header bars)
# ============================================================
# In the useState initializer (around L17636)
old_default = "return saved ? JSON.parse(saved) : { x: 24, y: 24 };"
new_default = "return saved ? JSON.parse(saved) : { x: 24, y: 80 };"
if old_default in content:
    content = content.replace(old_default, new_default, 1)
    changes += 1
    print("[1a] Changed default position to {x:24, y:80}")

# In the catch fallback (around L17638)
old_fallback = "return { x: 24, y: 24 };\n"
new_fallback = "return { x: 24, y: 80 };\n"
if old_fallback in content:
    content = content.replace(old_fallback, new_fallback, 1)
    changes += 1
    print("[1a] Changed fallback position to {x:24, y:80}")

# Reset position on summon/wakeup (around L18071)
old_reset = "setPosition({ x: 24, y: 24 });"
new_reset = "setPosition({ x: 24, y: 80 });"
count = content.count(old_reset)
if count > 0:
    content = content.replace(old_reset, new_reset)
    changes += count
    print(f"[1a] Changed {count} reset positions to {{x:24, y:80}}")

# ============================================================
# 1b. Change CSS positioning from bottom to top
# Line ~18847: bottom: `${position.y}px`,  →  top: `${position.y}px`,
# ============================================================
old_bottom = "bottom: `${position.y}px`,"
new_top = "top: `${position.y}px`,"
if old_bottom in content:
    content = content.replace(old_bottom, new_top, 1)
    changes += 1
    print("[1b] Changed bottom: to top: in style")

# ============================================================
# 1c. Fix drag delta Y — when using top:, moving mouse DOWN should INCREASE y
# Currently (bottom positioning): deltaY = dragStart.y - clientY (inverted)
# For top positioning: deltaY = clientY - dragStart.y (natural)
# Line ~18386: const deltaY = dragStartRef.current.y - clientY;
#           →  const deltaY = clientY - dragStartRef.current.y;
# ============================================================
old_delta = "const deltaY = dragStartRef.current.y - clientY;"
new_delta = "const deltaY = clientY - dragStartRef.current.y;"
if old_delta in content:
    content = content.replace(old_delta, new_delta, 1)
    changes += 1
    print("[1c] Flipped drag deltaY for top positioning")

# Also fix the drag position setter to use + instead of + (it already does, but deltaY is now flipped)
# Line ~18393: y: Math.max(10, startPosRef.current.y + deltaY)
# This is already correct! Adding a positive deltaY moves down = top increases. ✓

# ============================================================
# 1d. Fix moveTo calculation — it uses window.innerHeight for bottom
# Old: const newBottom = window.innerHeight - targetY - 32;
# New: const newTop = targetY; (targetY is already the Y from top)
# ============================================================
old_moveto = "const newBottom = window.innerHeight - targetY - 32;"
new_moveto = "const newTop = Math.max(10, targetY);"
if old_moveto in content:
    content = content.replace(old_moveto, new_moveto, 1)
    changes += 1
    print("[1d] Fixed moveTo calculation for top positioning")

# Also fix the setPosition call in moveTo that uses newBottom
old_moveto_set = "y: Math.max(10, newBottom)"
new_moveto_set = "y: newTop"
if old_moveto_set in content:
    content = content.replace(old_moveto_set, new_moveto_set, 1)
    changes += 1
    print("[1d] Fixed moveTo setPosition for top positioning")

# ============================================================ 
# 1e. Fix the transition property to use 'top' instead of 'bottom'
# Line ~18853: `bottom ${moveDuration}ms, right ${moveDuration}ms, ...`
# ============================================================
old_transition = "`bottom ${moveDuration}ms, right ${moveDuration}ms"
new_transition = "`top ${moveDuration}ms, right ${moveDuration}ms"
if old_transition in content:
    content = content.replace(old_transition, new_transition, 1)
    changes += 1
    print("[1e] Fixed transition property from bottom to top")

# ============================================================
# 1f. Clear saved localStorage on first load after this change
# Add a migration comment and version check near the position useState
# Actually, simpler: just change the localStorage key name so old positions are ignored
# ============================================================
old_ls_key = "localStorage.getItem('allo_bot_pos')"
new_ls_key = "localStorage.getItem('allo_bot_pos_v2')"
if old_ls_key in content:
    content = content.replace(old_ls_key, new_ls_key, 1)
    changes += 1
    print("[1f] Migrated localStorage key to allo_bot_pos_v2 (fresh start)")

old_ls_save = "localStorage.setItem('allo_bot_pos'"
new_ls_save = "localStorage.setItem('allo_bot_pos_v2'"
if old_ls_save in content:
    content = content.replace(old_ls_save, new_ls_save, 1)
    changes += 1
    print("[1f] Updated save key to allo_bot_pos_v2")

# ============================================================
# 2. Fix help mode overlay — constrain click area to bot visual only
# The data-help-key="bot_avatar" is on the outer container which includes
# speech bubbles, reactions, etc. In help mode, this makes the click area huge.
# Fix: In help mode CSS, set pointer-events: none on the outer container
# and pointer-events: auto only on the inner visual div
# ============================================================
old_helpmode_css = """        /* FIX: Ensure AlloBot stays visible and interactive in Help Mode */
        .help-mode-active [data-help-key="bot_avatar"] {
            z-index: 10999 !important; /* Above help mode backdrop (z-10998) */
            pointer-events: auto !important;
        }
        /* FIX: AlloBot buttons also need interactivity */
        .help-mode-active [data-help-key="bot_avatar"] button {
            pointer-events: auto !important;
            cursor: pointer !important;
        }"""

new_helpmode_css = """        /* FIX: AlloBot help mode — constrain click area to just the bot visual */
        .help-mode-active [data-help-key="bot_avatar"] {
            z-index: 10999 !important; /* Above help mode backdrop (z-10998) */
            pointer-events: none !important; /* Container is transparent to clicks */
        }
        /* Only the inner bot visual (the SVG area) is clickable in help mode */
        .help-mode-active [data-help-key="bot_avatar"] > div > div:last-child {
            pointer-events: auto !important;
            cursor: help !important;
            border-radius: 50%;
        }
        /* Bot sub-buttons stay clickable */
        .help-mode-active [data-help-key="bot_avatar"] button[data-help-key] {
            pointer-events: auto !important;
            cursor: help !important;
        }"""

if old_helpmode_css in content:
    content = content.replace(old_helpmode_css, new_helpmode_css, 1)
    changes += 1
    print("[2] Fixed help mode overlay — constrained click area to bot visual")
else:
    print("[2] WARNING: Could not find help mode CSS block to replace")
    # Try a more flexible match
    if '.help-mode-active [data-help-key="bot_avatar"]' in content:
        print("  (The CSS block exists but exact text didn't match — check manually)")

# Also update the hover effect rule for bot_avatar
old_hover_css = """        /* FIX: Limit AlloBot highlight to a fixed size circle, not the container bounds */
        /* This hides the box-shadow from the container and adds it only to an inner element */
        .help-mode-active [data-help-key="bot_avatar"]:hover {
          /* Override the default large glow that covers the whole container */
          box-shadow: none !important;
          background-color: transparent !important;
          transform: none !important;
        }"""

new_hover_css = """        /* FIX: Limit AlloBot highlight to just the bot avatar circle */
        .help-mode-active [data-help-key="bot_avatar"]:hover {
          box-shadow: none !important;
          background-color: transparent !important;
          transform: none !important;
        }
        .help-mode-active [data-help-key="bot_avatar"] > div > div:last-child:hover {
          box-shadow: 0 0 0 3px #8b5cf6, 0 0 20px rgba(139, 92, 246, 0.6) !important;
          border-radius: 50%;
        }"""

if old_hover_css in content:
    content = content.replace(old_hover_css, new_hover_css, 1)
    changes += 1
    print("[2] Fixed help mode hover glow — now only on bot visual circle")

# Save
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal changes: {changes}")
print("DONE")
