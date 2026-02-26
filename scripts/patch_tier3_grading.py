"""
Line-level patch to add Tier 3 grading branches after molecule grading in AlloFlowANTI.txt
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
lines = SRC.read_text(encoding="utf-8").split("\n")

# Find the molecule closing brace (the } after toLowerCase())
target_idx = None
for i, line in enumerate(lines):
    if "molecule" in line and i > 60000:
        # Check if this is the grading block: next line should have formula.replace
        if i+1 < len(lines) and "formula" in lines[i+1]:
            # The } closing molecule should be 2 lines after
            if i+2 < len(lines) and lines[i+2].strip().startswith("}"):
                target_idx = i+2
                break

if target_idx is None:
    print("❌ Could not find molecule grading close")
else:
    print(f"Found molecule close at line {target_idx+1}")
    indent = lines[target_idx][:len(lines[target_idx]) - len(lines[target_idx].lstrip())]
    
    new_lines = [
        f"{indent}}} else if (problem.manipulativeResponse.tool === 'calculus') {{",
        f"{indent}    const lcl = labToolData.calculus;",
        f"{indent}    isCorrect = lcl.mode === (target.mode || 'riemann') && Math.abs(lcl.xMin - (target.xMin || 0)) < 0.1 && Math.abs(lcl.xMax - (target.xMax || 4)) < 0.1 && lcl.n === (target.n || 8);",
        f"{indent}}} else if (problem.manipulativeResponse.tool === 'wave') {{",
        f"{indent}    const lw = labToolData.wave;",
        f"{indent}    isCorrect = Math.abs(lw.amplitude - (target.amplitude || 1)) < 0.1 && Math.abs(lw.frequency - (target.frequency || 1)) < 0.1;",
        f"{indent}}} else if (problem.manipulativeResponse.tool === 'cell') {{",
        f"{indent}    const lce = labToolData.cell;",
        f"{indent}    isCorrect = lce.selectedOrganelle === (target.selectedOrganelle || null);",
    ]
    
    # Replace the closing } with new branches + closing }
    lines[target_idx:target_idx+1] = new_lines
    
    SRC.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ Added 3 Tier 3 grading branches ({len(new_lines)} lines)")
    print(f"Total lines: {len(lines)}")
