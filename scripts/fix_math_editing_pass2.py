#!/usr/bin/env python3
"""Fix remaining math editing: answer, steps, realWorld - using line-based approach."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    lines = f.readlines()

changes = 0

# Find exact line numbers for each target
answer_line = step_line = rw_line = None
for i, l in enumerate(lines):
    stripped = l.strip()
    if '<MathSymbol text={problem.answer}' in l and i > 73000:
        answer_line = i
    if 'formatInlineText(step.explanation' in l and i > 73000:
        step_line = i
    if '{problem.realWorld}' in l and 'text-orange-900' in lines[i-1] if i > 0 else False:
        if i > 73000:
            rw_line = i

print(f"Answer line: {answer_line+1 if answer_line else 'NOT FOUND'}")
print(f"Step explanation line: {step_line+1 if step_line else 'NOT FOUND'}")
print(f"RealWorld line: {rw_line+1 if rw_line else 'NOT FOUND'}")

# FIX 4: Answer - replace 3 lines (the div wrapper around MathSymbol)
if answer_line is not None:
    # Lines: <div ...>, <MathSymbol .../>, </div>
    # The div is on line answer_line - 1
    indent = '                                                     '
    old_start = answer_line - 1  # <div className="text-lg...
    old_end = answer_line + 1    # </div>
    new_lines = [
        indent + '{isMathEditing(pIdx) ? (\n',
        indent + '    <input\n',
        indent + '        type="text"\n',
        indent + '        className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 font-serif text-lg font-bold text-green-900"\n',
        indent + '        value={problem.answer || \'\'}\n',
        indent + '        onChange={(e) => handleMathProblemEdit(pIdx, \'answer\', e.target.value)}\n',
        indent + '        placeholder="Enter answer..."\n',
        indent + '    />\n',
        indent + ') : (\n',
        indent + '    <div className="text-lg font-bold text-green-900 font-serif">\n',
        indent + '        <MathSymbol text={problem.answer} />\n',
        indent + '    </div>\n',
        indent + ')}\n',
    ]
    lines[old_start:old_end+1] = new_lines
    changes += 1
    print(f"4: Replaced answer display (L{old_start+1}-{old_end+1}) with editable version")
    # Recalculate offsets
    offset = len(new_lines) - 3  # we replaced 3 lines with more
else:
    offset = 0
    print("4: FAILED - answer line not found")

# Re-find lines after offset change
step_line = rw_line = None
for i, l in enumerate(lines):
    stripped = l.strip()
    if 'formatInlineText(step.explanation' in l and i > 73000:
        step_line = i
    if '{problem.realWorld}' in l and i > 73000:
        if i > 0 and ('text-orange-900' in lines[i-1] or 'orange-900' in lines[i-1]):
            rw_line = i

print(f"Step explanation line (after offset): {step_line+1 if step_line else 'NOT FOUND'}")
print(f"RealWorld line (after offset): {rw_line+1 if rw_line else 'NOT FOUND'}")

# FIX 5: Steps - replace the explanation div and latex block
if step_line is not None:
    indent = '                                                                '
    # The explanation is on step_line, wrapped in a div on step_line-1
    # Then after it, there's the latex block
    # Find the end of the latex block
    latex_end = step_line
    for k in range(step_line + 1, min(step_line + 15, len(lines))):
        if ')}' in lines[k].strip() and lines[k].strip() == ')}':
            latex_end = k
            break

    explanation_div_start = step_line - 1  # <div className="text-slate-700...
    
    new_step_lines = [
        indent + '{isMathEditing(pIdx) ? (\n',
        indent + '    <div className="space-y-2">\n',
        indent + '        <textarea\n',
        indent + '            className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-slate-700 min-h-[40px]"\n',
        indent + '            value={step.explanation || \'\'}\n',
        indent + '            onChange={(e) => handleMathProblemEdit(pIdx, \'step_explanation\', e.target.value, idx)}\n',
        indent + '            placeholder="Step explanation..."\n',
        indent + '        />\n',
        indent + '        <input\n',
        indent + '            type="text"\n',
        indent + '            className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none bg-amber-50/50 text-sm font-mono text-slate-600"\n',
        indent + '            value={step.latex || \'\'}\n',
        indent + '            onChange={(e) => handleMathProblemEdit(pIdx, \'step_latex\', e.target.value, idx)}\n',
        indent + '            placeholder="LaTeX expression (optional)..."\n',
        indent + '        />\n',
        indent + '    </div>\n',
        indent + ') : (\n',
        indent + '    <>\n',
    ]
    # Keep the original lines as the "else" branch
    original_lines = lines[explanation_div_start:latex_end+1]
    close_lines = [
        indent + '    </>\n',
        indent + ')}\n',
    ]
    
    lines[explanation_div_start:latex_end+1] = new_step_lines + original_lines + close_lines
    changes += 1
    print(f"5: Wrapped step explanation (L{explanation_div_start+1}-{latex_end+1}) with edit toggle")

# Re-find realWorld after offset change
rw_line = None
for i, l in enumerate(lines):
    if '{problem.realWorld}' in l and i > 73000:
        if i > 0 and ('orange-900' in lines[i-1] or 'orange' in lines[i-1]):
            rw_line = i

# FIX 6: RealWorld - wrap the <p> tag with conditional
if rw_line is not None:
    indent = '                                                     '
    # The <p> tag is on rw_line - 1, content on rw_line, </p> on rw_line + 1
    p_start = rw_line - 1
    p_end = rw_line + 1
    
    new_rw_lines = [
        indent + '{isMathEditing(pIdx) ? (\n',
        indent + '    <textarea\n',
        indent + '        className="w-full p-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 outline-none resize-y bg-amber-50/50 text-sm text-orange-900 min-h-[40px]"\n',
        indent + '        value={problem.realWorld || \'\'}\n',
        indent + '        onChange={(e) => handleMathProblemEdit(pIdx, \'realWorld\', e.target.value)}\n',
        indent + '        placeholder="Real-world connection..."\n',
        indent + '    />\n',
        indent + ') : (\n',
    ]
    # Keep original <p> lines
    original_p = lines[p_start:p_end+1]
    close_lines = [
        indent + ')}\n',
    ]
    
    lines[p_start:p_end+1] = new_rw_lines + original_p + close_lines
    changes += 1
    print(f"6: Wrapped realWorld (L{p_start+1}-{p_end+1}) with edit toggle")
else:
    print("6: FAILED - realWorld line not found")

# SAVE
with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    f.writelines(l.rstrip('\r\n') + '\n' for l in lines)

print(f"\nDone! {changes} additional changes applied.")
