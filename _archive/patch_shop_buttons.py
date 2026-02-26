"""
Fix: Make adventure shop buy buttons more visible on small screens.
- Reduce vertical padding in header and gold bar
- Make item cards more compact on small screens
- Ensure buy button is always prominently visible
- Use responsive sizing
"""

import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# Fix 1: Reduce header padding on small screens (p-6 → p-3 sm:p-6)
old_header = '<div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">'
new_header = '<div className="bg-indigo-600 p-3 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-lg relative z-10">'

if old_header in content:
    content = content.replace(old_header, new_header, 1)
    fixes += 1
    print("1. Reduced header padding on small screens")
else:
    print("1. SKIP - header not found")

# Fix 2: Reduce gold bar padding (p-4 → p-2 sm:p-4) and make it more compact
old_gold_bar = '<div className="bg-slate-800 p-4 flex justify-between items-center border-b border-slate-700 shrink-0 gap-4 flex-wrap sm:flex-nowrap">'
new_gold_bar = '<div className="bg-slate-800 p-2 sm:p-4 flex justify-between items-center border-b border-slate-700 shrink-0 gap-2 sm:gap-4 flex-wrap sm:flex-nowrap">'

if old_gold_bar in content:
    content = content.replace(old_gold_bar, new_gold_bar, 1)
    fixes += 1
    print("2. Reduced gold bar padding on small screens")
else:
    print("2. SKIP - gold bar not found")

# Fix 3: Reduce grid area padding and gap (p-6 gap-4 → p-3 sm:p-6 gap-3 sm:gap-4)
old_grid = '<div className="p-6 overflow-y-auto custom-scrollbar bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-0">'
new_grid = '<div className="p-3 sm:p-6 overflow-y-auto custom-scrollbar bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0">'

if old_grid in content:
    content = content.replace(old_grid, new_grid, 1)
    fixes += 1
    print("3. Reduced grid padding and gap on small screens")
else:
    print("3. SKIP - grid not found")

# Fix 4: Make item cards more compact (p-4 → p-3 sm:p-4)
old_item_card = '<div key={item.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-4 flex flex-col hover:border-indigo-500 transition-colors group relative overflow-hidden">'
new_item_card = '<div key={item.id} className="bg-slate-800 border-2 border-slate-700 rounded-2xl p-3 sm:p-4 flex flex-col hover:border-indigo-500 transition-colors group relative overflow-hidden">'

if old_item_card in content:
    content = content.replace(old_item_card, new_item_card, 1)
    fixes += 1
    print("4. Made item cards more compact on small screens")
else:
    print("4. SKIP - item card not found")

# Fix 5: Make icon smaller on small screens and reduce margin
old_icon = '<div className="text-4xl bg-slate-700 w-16 h-16 rounded-xl flex items-center justify-center shadow-inner border border-slate-600">'
new_icon = '<div className="text-2xl sm:text-4xl bg-slate-700 w-10 h-10 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shadow-inner border border-slate-600">'

if old_icon in content:
    content = content.replace(old_icon, new_icon, 1)
    fixes += 1
    print("5. Made item icons responsive")
else:
    print("5. SKIP - icon not found")

# Fix 6: Reduce description bottom margin and make buy button more prominent
old_desc = '<p className="text-slate-500 text-xs leading-relaxed mb-4 min-h-[2.5em] flex-1 overflow-y-auto custom-scrollbar">'
new_desc = '<p className="text-slate-500 text-xs leading-relaxed mb-2 sm:mb-4 min-h-[2em] flex-1 overflow-y-auto custom-scrollbar">'

if old_desc in content:
    content = content.replace(old_desc, new_desc, 1)
    fixes += 1
    print("6. Reduced description bottom margin")
else:
    print("6. SKIP - description not found")

# Fix 7: Make buy button taller and more visible with a min-height
old_buy_btn = '''`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 ${'''
new_buy_btn = '''`w-full py-2 sm:py-2.5 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0 min-h-[40px] ${'''

if old_buy_btn in content:
    content = content.replace(old_buy_btn, new_buy_btn, 1)
    fixes += 1
    print("7. Made buy button taller and more visible")
else:
    print("7. SKIP - buy button not found")

# Fix 8: Make affordable buy button colors more prominent with a border
old_affordable = "'bg-yellow-500 hover:bg-yellow-400 text-indigo-900 shadow-lg shadow-yellow-500/20'"
new_affordable = "'bg-yellow-500 hover:bg-yellow-400 text-indigo-900 shadow-lg shadow-yellow-500/30 border-2 border-yellow-300 ring-1 ring-yellow-400/50'"

if old_affordable in content:
    content = content.replace(old_affordable, new_affordable, 1)
    fixes += 1
    print("8. Made affordable buy button more prominent with border and ring")
else:
    print("8. SKIP - affordable button style not found")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nApplied {fixes}/8 fixes")
