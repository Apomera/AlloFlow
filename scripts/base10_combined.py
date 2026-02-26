# -*- coding: utf-8 -*-
"""
Add combined block display to Base-10 tool.
Shows all blocks together in one visual row:
  347 = [purple cubes][blue flats][green rods][amber units]
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the total value display and add combined view after it
# Current: <span className="text-4xl font-bold text-orange-800 font-mono">{totalValue.toLocaleString()}</span>
# Then: </div>  (closing text-center div)
# Then: <div className="grid grid-cols-4 gap-3">

old_section = """<span className="text-4xl font-bold text-orange-800 font-mono">{totalValue.toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3">"""

new_section = """<span className="text-4xl font-bold text-orange-800 font-mono">{totalValue.toLocaleString()}</span>
                        <span className="text-2xl text-slate-400 mx-3">=</span>
                        <div className="flex items-end gap-1 flex-wrap">
                            {renderBlock('#a855f7', 28, 28, base10Value.thousands)}
                            {base10Value.thousands > 0 && base10Value.hundreds > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#3b82f6', 24, 24, base10Value.hundreds)}
                            {(base10Value.thousands > 0 || base10Value.hundreds > 0) && base10Value.tens > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#22c55e', 8, 36, base10Value.tens)}
                            {(base10Value.thousands > 0 || base10Value.hundreds > 0 || base10Value.tens > 0) && base10Value.ones > 0 && <span className="w-px h-6 bg-slate-200 mx-0.5"></span>}
                            {renderBlock('#f59e0b', 10, 10, base10Value.ones)}
                            {totalValue === 0 && <span className="text-sm text-slate-300 italic">no blocks</span>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3">"""

if old_section in content:
    content = content.replace(old_section, new_section, 1)
    print("Added combined block display")
elif old_section.replace('\n', '\r\n') in content:
    content = content.replace(old_section.replace('\n', '\r\n'), new_section.replace('\n', '\r\n'), 1)
    print("Added combined block display (CRLF)")
else:
    print("FAIL: Could not find insertion point")

# Also make the total display row flex so it flows horizontally
old_total_div = '<div className="text-center mb-4">'
new_total_div = '<div className="flex items-center justify-center mb-4 flex-wrap">'

if new_total_div not in content:
    content = content.replace(old_total_div, new_total_div, 1)
    print("Made total row flex for horizontal layout")
else:
    print("Already flex")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("File saved.")
