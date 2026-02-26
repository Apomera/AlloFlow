"""
Line-targeted grading block replacement. Reads the exact lines from the file
rather than trying to match whitespace strings.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
lines = SRC.read_text(encoding="utf-8").split("\n")

# Find the grading block by key marker
start_idx = None
end_idx = None
for i, line in enumerate(lines):
    if "let isCorrect = false;" in line and i > 60000:
        start_idx = i
    if start_idx and "handleStudentInput(generatedContent.id, pIdx" in line:
        end_idx = i
        break

if start_idx is None or end_idx is None:
    print(f"❌ Could not locate grading block. start={start_idx}, end={end_idx}")
else:
    print(f"Found grading block at lines {start_idx+1}-{end_idx+1}")
    # Get the indent from the first line
    indent = lines[start_idx][:len(lines[start_idx]) - len(lines[start_idx].lstrip())]
    # Replace lines[start_idx:end_idx] with new grading logic
    new_block = [
        f"{indent}let isCorrect = false;",
        f"{indent} const target = problem.manipulativeResponse.state || {{}};",
        f"{indent} if (problem.manipulativeResponse.tool === 'coordinate') {{",
        f"{indent}     const targetPts = (target.points || []).map(p => `${{p.x}},${{p.y}}`).sort();",
        f"{indent}     const studentPts = gridPoints.map(p => `${{p.x}},${{p.y}}`).sort();",
        f"{indent}     isCorrect = targetPts.length === studentPts.length && targetPts.every((v, i) => v === studentPts[i]);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'base10') {{",
        f"{indent}     isCorrect = base10Value.hundreds === (target.hundreds || 0) &&",
        f"{indent}                 base10Value.tens === (target.tens || 0) &&",
        f"{indent}                 base10Value.ones === (target.ones || 0);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'numberline') {{",
        f"{indent}     const targetMarkers = (target.markers || []).map(m => m.value).sort((a,b) => a-b);",
        f"{indent}     const studentMarkers = numberLineMarkers.map(m => m.value).sort((a,b) => a-b);",
        f"{indent}     isCorrect = targetMarkers.length === studentMarkers.length && targetMarkers.every((v, i) => Math.abs(v - studentMarkers[i]) < 0.01);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'fractions') {{",
        f"{indent}     isCorrect = fractionPieces.numerator === (target.numerator || 0) && fractionPieces.denominator === (target.denominator || 1);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'volume') {{",
        f"{indent}     const td = target.dims || {{}};",
        f"{indent}     isCorrect = cubeDims.l === (td.l || 1) && cubeDims.w === (td.w || 1) && cubeDims.h === (td.h || 1);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'protractor') {{",
        f"{indent}     isCorrect = Math.abs(angleValue - (target.angle || 0)) <= 2;",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'funcGrapher') {{",
        f"{indent}     const lt = labToolData.funcGrapher;",
        f"{indent}     isCorrect = lt.type === (target.type || 'quadratic') && Math.abs(lt.a - (target.a || 0)) < 0.1 && Math.abs(lt.b - (target.b || 0)) < 0.1 && Math.abs(lt.c - (target.c || 0)) < 0.1;",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'physics') {{",
        f"{indent}     const lp = labToolData.physics;",
        f"{indent}     isCorrect = Math.abs(lp.angle - (target.angle || 45)) <= 2 && Math.abs(lp.velocity - (target.velocity || 20)) <= 1;",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'chemBalance') {{",
        f"{indent}     const lc = labToolData.chemBalance;",
        f"{indent}     const tc = target.coefficients || [];",
        f"{indent}     isCorrect = tc.length > 0 && lc.coefficients.length === tc.length && lc.coefficients.every((v, i) => v === tc[i]);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'punnett') {{",
        f"{indent}     const lpn = labToolData.punnett;",
        f"{indent}     isCorrect = JSON.stringify(lpn.parent1.sort()) === JSON.stringify((target.parent1 || []).sort()) && JSON.stringify(lpn.parent2.sort()) === JSON.stringify((target.parent2 || []).sort());",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'circuit') {{",
        f"{indent}     const lcr = labToolData.circuit;",
        f"{indent}     isCorrect = Math.abs(lcr.voltage - (target.voltage || 9)) < 0.5;",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'dataPlot') {{",
        f"{indent}     const ldp = labToolData.dataPlot;",
        f"{indent}     const tPts = (target.points || []).map(p => `${{Math.round(p.x)}},${{Math.round(p.y)}}`).sort();",
        f"{indent}     const sPts = ldp.points.map(p => `${{Math.round(p.x)}},${{Math.round(p.y)}}`).sort();",
        f"{indent}     isCorrect = tPts.length === sPts.length && tPts.every((v, i) => v === sPts[i]);",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'inequality') {{",
        f"{indent}     const li = labToolData.inequality;",
        f"{indent}     isCorrect = li.expr.replace(/\\s/g,'') === (target.expr || '').replace(/\\s/g,'');",
        f"{indent} }} else if (problem.manipulativeResponse.tool === 'molecule') {{",
        f"{indent}     const lm = labToolData.molecule;",
        f"{indent}     isCorrect = lm.formula.replace(/\\s/g,'').toLowerCase() === (target.formula || '').replace(/\\s/g,'').toLowerCase();",
        f"{indent} }}",
    ]
    
    lines[start_idx:end_idx] = new_block
    
    SRC.write_text("\n".join(lines), encoding="utf-8")
    print(f"✅ Replaced grading: {end_idx - start_idx} old lines → {len(new_block)} new lines")
    print(f"Total lines: {len(lines)}")
