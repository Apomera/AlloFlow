"""Fix the outer container constraints and inline styles causing spacing issues"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
content = open(filepath, 'r', encoding='utf-8').read()
fixed = 0

# Fix 1: The VisualPanelGrid sits inside a container with min-h-[300px] which
# forces excess height. Remove it or reduce it.
old_container = 'className="w-full max-w-2xl bg-slate-100 rounded-lg border border-slate-300 shadow-md p-2 mb-6 relative overflow-hidden min-h-[300px] flex flex-col justify-center"'
new_container = 'className="w-full max-w-2xl bg-slate-100 rounded-lg border border-slate-300 shadow-md p-2 mb-4 relative overflow-hidden"'
if old_container in content:
    content = content.replace(old_container, new_container)
    fixed += 1
    print("[OK] Removed min-h-[300px] and flex justify-center from visual container")

# Fix 2: The VisualPanelGrid parent div at L68964 also has spacing:
# <div className="flex flex-col items-center">
# This centers the visual panel grid — fine, but check for extra margins
old_parent = '<div className="flex flex-col items-center">'
# Check if this is the visual parent (near the VisualPanelGrid usage ~68964)
count = content.count(old_parent)
print(f"  Found {count} instances of '{old_parent[:50]}'")

# Fix 3: The UDL Goal info box has mb-6 creating 24px margin below it
old_info = 'className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-6"'
new_info = 'className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3"'
if old_info in content:
    content = content.replace(old_info, new_info)
    fixed += 1
    print("[OK] Reduced UDL Goal info box padding and margin (p-4/mb-6 -> p-3/mb-3)")

# Fix 4: The "Step X" role badge shouldn't add extra vertical space
# Convert the badge to smaller text
old_step = "panel.role === 'step' ? `Step ${panelIdx + 1}` :"
new_step = "panel.role === 'step' ? `\u2116 ${panelIdx + 1}` :"
if old_step in content:
    content = content.replace(old_step, new_step)
    fixed += 1
    print("[OK] Made step badge more compact")

# Fix 5: The parent container has space-y-6 which adds 24px between ALL children
old_spacer = """<div className="space-y-6">
                    <div className="bg-purple-50"""
new_spacer = """<div className="space-y-3">
                    <div className="bg-purple-50"""
if old_spacer in content:
    content = content.replace(old_spacer, new_spacer)
    fixed += 1
    print("[OK] Reduced space-y-6 to space-y-3 in visual support layout")

open(filepath, 'w', encoding='utf-8').write(content)
print(f"\nDone! {fixed} fixes applied.")
