"""
Fix grading block: replace lines 63069-63076 in AlloFlowANTI.txt with correct coordinate grading
and all 8 new tool grading branches. Uses exact line-targeted replacement.
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

old_grading = """                                                           let isCorrect = false;
                                                            if (problem.manipulativeResponse.tool === 'coordinate') {
                                                                isCorrect = gridPoints.length === (problem.manipulativeResponse.state?.points?.length || 0);
                                                            } else if (problem.manipulativeResponse.tool === 'base10') {
                                                                isCorrect = base10Value.hundreds === (problem.manipulativeResponse.state?.hundreds || 0) &&
                                                                            base10Value.tens === (problem.manipulativeResponse.state?.tens || 0) &&
                                                                            base10Value.ones === (problem.manipulativeResponse.state?.ones || 0);
                                                            }"""

new_grading = """                                                           let isCorrect = false;
                                                            const target = problem.manipulativeResponse.state || {};
                                                            if (problem.manipulativeResponse.tool === 'coordinate') {
                                                                const targetPts = (target.points || []).map(p => `${p.x},${p.y}`).sort();
                                                                const studentPts = gridPoints.map(p => `${p.x},${p.y}`).sort();
                                                                isCorrect = targetPts.length === studentPts.length && targetPts.every((v, i) => v === studentPts[i]);
                                                            } else if (problem.manipulativeResponse.tool === 'base10') {
                                                                isCorrect = base10Value.hundreds === (target.hundreds || 0) &&
                                                                            base10Value.tens === (target.tens || 0) &&
                                                                            base10Value.ones === (target.ones || 0);
                                                            } else if (problem.manipulativeResponse.tool === 'numberline') {
                                                                const targetMarkers = (target.markers || []).map(m => m.value).sort((a,b) => a-b);
                                                                const studentMarkers = numberLineMarkers.map(m => m.value).sort((a,b) => a-b);
                                                                isCorrect = targetMarkers.length === studentMarkers.length && targetMarkers.every((v, i) => Math.abs(v - studentMarkers[i]) < 0.01);
                                                            } else if (problem.manipulativeResponse.tool === 'fractions') {
                                                                isCorrect = fractionPieces.numerator === (target.numerator || 0) && fractionPieces.denominator === (target.denominator || 1);
                                                            } else if (problem.manipulativeResponse.tool === 'volume') {
                                                                const td = target.dims || {};
                                                                isCorrect = cubeDims.l === (td.l || 1) && cubeDims.w === (td.w || 1) && cubeDims.h === (td.h || 1);
                                                            } else if (problem.manipulativeResponse.tool === 'protractor') {
                                                                isCorrect = Math.abs(angleValue - (target.angle || 0)) <= 2;
                                                            } else if (problem.manipulativeResponse.tool === 'funcGrapher') {
                                                                const lt = labToolData.funcGrapher;
                                                                isCorrect = lt.type === (target.type || 'quadratic') && Math.abs(lt.a - (target.a || 0)) < 0.1 && Math.abs(lt.b - (target.b || 0)) < 0.1 && Math.abs(lt.c - (target.c || 0)) < 0.1;
                                                            } else if (problem.manipulativeResponse.tool === 'physics') {
                                                                const lp = labToolData.physics;
                                                                isCorrect = Math.abs(lp.angle - (target.angle || 45)) <= 2 && Math.abs(lp.velocity - (target.velocity || 20)) <= 1;
                                                            } else if (problem.manipulativeResponse.tool === 'chemBalance') {
                                                                const lc = labToolData.chemBalance;
                                                                const tc = target.coefficients || [];
                                                                isCorrect = tc.length > 0 && lc.coefficients.length === tc.length && lc.coefficients.every((v, i) => v === tc[i]);
                                                            } else if (problem.manipulativeResponse.tool === 'punnett') {
                                                                const lpn = labToolData.punnett;
                                                                isCorrect = JSON.stringify(lpn.parent1.sort()) === JSON.stringify((target.parent1 || []).sort()) && JSON.stringify(lpn.parent2.sort()) === JSON.stringify((target.parent2 || []).sort());
                                                            } else if (problem.manipulativeResponse.tool === 'circuit') {
                                                                const lcr = labToolData.circuit;
                                                                isCorrect = Math.abs(lcr.voltage - (target.voltage || 9)) < 0.5;
                                                            } else if (problem.manipulativeResponse.tool === 'dataPlot') {
                                                                const ldp = labToolData.dataPlot;
                                                                const tPts = (target.points || []).map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
                                                                const sPts = ldp.points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
                                                                isCorrect = tPts.length === sPts.length && tPts.every((v, i) => v === sPts[i]);
                                                            } else if (problem.manipulativeResponse.tool === 'inequality') {
                                                                const li = labToolData.inequality;
                                                                isCorrect = li.expr.replace(/\\s/g,'') === (target.expr || '').replace(/\\s/g,'');
                                                            } else if (problem.manipulativeResponse.tool === 'molecule') {
                                                                const lm = labToolData.molecule;
                                                                isCorrect = lm.formula.replace(/\\s/g,'').toLowerCase() === (target.formula || '').replace(/\\s/g,'').toLowerCase();
                                                            }"""

count = txt.count(old_grading)
if count > 0:
    txt = txt.replace(old_grading, new_grading)
    print(f"✅ Replaced grading block ({count} matches)")
else:
    # Try to find the key line and report
    if "gridPoints.length === (problem.manipulativeResponse.state?.points?.length" in txt:
        print("Found the target line but whitespace doesn't match exactly. Trying line-level approach...")
        lines = txt.split("\n")
        for i, line in enumerate(lines):
            if "gridPoints.length === (problem.manipulativeResponse.state?.points?.length" in line:
                print(f"  Found at line {i+1}: {line[:80]}...")
                break
    else:
        print("❌ Could not find old grading block at all")

SRC.write_text(txt, encoding="utf-8")
print(f"Done. Lines: {len(txt.split(chr(10)))}")
