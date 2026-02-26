#!/usr/bin/env python3
"""Fix dropdown option text visibility in bridge panel."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# Fix all three bridge selectors: target, language, grade
# They all share this same style pattern - add option styling
old_select_style = "fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto'}}"
new_select_style = "fontWeight:600,outline:'none',cursor:'pointer',appearance:'auto',WebkitAppearance:'menulist'}}"

# Instead of fixing the style, let's fix the <option> elements by adding inline styles
# Find all bridge select option patterns and add color/background

# 1. Target selector - "All Groups" option
old1 = '<option value="all">\U0001f3af All Groups</option>'
new1 = '<option value="all" style={{background:"#1e293b",color:"#e2e8f0"}}>\U0001f3af All Groups</option>'
if old1 in content:
    content = content.replace(old1, new1, 1)
    changes += 1
    print("1: Fixed All Groups option visibility")

# 2. Target selector - group options
old2 = '<option key={gId} value={gId}>{g.name}</option>'
new2 = '<option key={gId} value={gId} style={{background:"#1e293b",color:"#e2e8f0"}}>{g.name}</option>'
if old2 in content:
    content = content.replace(old2, new2, 1)
    changes += 1
    print("2: Fixed group options visibility")

# 3. Language selector options  
old3 = "<option key={l.v} value={l.v}>{l.f} {l.v}</option>"
new3 = '<option key={l.v} value={l.v} style={{background:"#1e293b",color:"#e2e8f0"}}>{l.f} {l.v}</option>'
if old3 in content:
    content = content.replace(old3, new3, 1)
    changes += 1
    print("3: Fixed language options visibility")

# 4. Custom language option
old4 = """<option value="__custom__">\u270f\ufe0f Custom language...</option>"""
new4 = """<option value="__custom__" style={{background:"#1e293b",color:"#e2e8f0"}}>\u270f\ufe0f Custom language...</option>"""
if old4 in content:
    content = content.replace(old4, new4, 1)
    changes += 1
    print("4: Fixed custom language option visibility")

# 5. Grade selector options
old5 = "<option key={g} value={g}>{g}</option>"
new5 = '<option key={g} value={g} style={{background:"#1e293b",color:"#e2e8f0"}}>{g}</option>'
if old5 in content:
    content = content.replace(old5, new5, 1)
    changes += 1
    print("5: Fixed grade options visibility")

with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
