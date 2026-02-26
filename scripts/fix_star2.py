"""Line-based: Add 'mark as correct' star to RhymeView edit mode"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the RhymeView edit mode div (the one with border-amber-200)
target_line = None
for i, l in enumerate(lines):
    if 'border-amber-200' in l and 'p-4 rounded-2xl' in l and 'shadow-md' in l:
        if i > 5300 and i < 5500:
            target_line = i
            print("Found target at L%d: %s" % (i+1, l.strip()[:120]))
            break

if target_line is not None:
    # Replace the border-amber-200 div with conditional green border
    old_line = lines[target_line]
    indent = old_line[:len(old_line) - len(old_line.lstrip())]
    
    # Replace the div line with conditional styling
    new_div = indent + '<div key={i} className={`p-4 rounded-2xl bg-white border-2 shadow-md flex items-center gap-2 relative ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? \'border-green-400 ring-2 ring-green-200\' : \'border-amber-200\'}`}>\r\n'
    lines[target_line] = new_div
    
    # Find the <input> line after this and insert star button before it
    for j in range(target_line+1, min(len(lines), target_line+5)):
        if '<input' in lines[j] and 'Enter Opt' in lines[j]:
            # Insert star button before the input
            star_lines = [
                indent + '                 {/* Mark as Correct */}\r\n',
                indent + '                 <button\r\n',
                indent + '                     aria-label={opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "Correct answer" : "Set as correct"}\r\n',
                indent + '                     onClick={(e) => { e.stopPropagation(); onUpdateOption && onUpdateOption(i, opt, \'set_correct\'); }}\r\n',
                indent + '                     className={`p-1 rounded-full transition-colors flex-shrink-0 ${opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? \'text-green-500\' : \'text-slate-300 hover:text-green-400\'}`}\r\n',
                indent + '                     title={opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? "✓ Correct answer" : "Click to set as correct answer"}\r\n',
                indent + '                 >\r\n',
                indent + '                     {opt?.toLowerCase() === data.rhymeWord?.toLowerCase() ? <Check size={20} /> : <Star size={18} />}\r\n',
                indent + '                 </button>\r\n',
            ]
            for k, sl in enumerate(star_lines):
                lines.insert(j + k, sl)
            print("Inserted star button at L%d" % (j+1))
            break

    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("FIXED: Added star button to RhymeView edit mode")
else:
    print("[WARN] Could not find RhymeView edit mode div")
