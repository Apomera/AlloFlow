"""Add 'mark as correct' star to IsolationView edit mode options.

IsolationView edit mode at L5283-5291 has options but no way to designate correct.
data.correctAnswer tells us which option is currently correct.
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find isolation edit mode div at L5284:
# <div key={idx} className="relative group">
# and replace with styled version + star button
target_line = None
for i, l in enumerate(lines):
    if 'isEditing ? (' in l and i > 5280 and i < 5295:
        target_line = i
        print("Found isEditing at L%d: %s" % (i+1, l.strip()[:120]))
        break

if target_line is None:
    print("[WARN] Could not find isolation isEditing block")
    exit()

# View the lines we're replacing
for j in range(target_line, target_line + 10):
    print("  L%d: %s" % (j+1, lines[j].rstrip()[:120]))

# Find the closing of edit mode block (</div>) then ) : (
# Replace L5283-5291 (isEditing block)
# New block should have conditional border + star button + input

indent = '                            '
new_edit_block = [
    indent + "isEditing ? (\r\n",
    indent + '    <div key={idx} className={`relative group flex items-center gap-2 ${opt?.toLowerCase() === data.correctAnswer?.toLowerCase() ? \'ring-2 ring-green-400 rounded-2xl\' : \'\'}`}>\r\n',
    indent + '        {/* Mark as Correct */}\r\n',
    indent + '        <button\r\n',
    indent + '            aria-label={opt?.toLowerCase() === data.correctAnswer?.toLowerCase() ? "Correct answer" : "Set as correct"}\r\n',
    indent + '            onClick={(e) => { e.stopPropagation(); onUpdateOption && onUpdateOption(idx, opt, \'set_correct\'); }}\r\n',
    indent + '            className={`p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.correctAnswer?.toLowerCase() ? \'text-green-500\' : \'text-slate-300 hover:text-green-400\'}`}\r\n',
    indent + '            title={opt?.toLowerCase() === data.correctAnswer?.toLowerCase() ? "✓ Correct answer" : "Click to set as correct"}\r\n',
    indent + '        >\r\n',
    indent + '            {opt?.toLowerCase() === data.correctAnswer?.toLowerCase() ? <Check size={20} /> : <Star size={18} />}\r\n',
    indent + '        </button>\r\n',
    indent + '        <input aria-label="Enter Opt"\r\n',
    indent + '            className="w-full h-32 rounded-2xl border-4 border-amber-300 bg-white text-center text-4xl font-bold outline-none focus:ring-4 focus:ring-amber-500 text-slate-700"\r\n',
    indent + '            value={opt}\r\n',
    indent + '            onChange={(e) => onUpdateOption && onUpdateOption(idx, e.target.value)}\r\n',
    indent + '            onKeyDown={(e) => e.stopPropagation()}\r\n',
    indent + '        />\r\n',
    indent + '    </div>\r\n',
]

# Find the end of the old edit block
# isEditing ? (...) : (
# Old block is L5283-5291
old_start = target_line   # isEditing ? (
old_end = None
for j in range(target_line + 1, target_line + 15):
    if ') : (' in lines[j]:
        old_end = j
        break
    if lines[j].strip() == ') : (':
        old_end = j
        break

if old_end is None:
    print("[WARN] Could not find end of isEditing block")
    exit()

print("Replacing L%d-L%d" % (old_start+1, old_end+1))

# Replace the old block
lines[old_start:old_end] = new_edit_block

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)
print("FIXED: Added star button to IsolationView edit mode")
