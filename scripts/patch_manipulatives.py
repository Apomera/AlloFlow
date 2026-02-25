"""
Patch AlloFlowANTI.txt with three manipulative enhancements:
1. Add auto-attach toggle state variable
2. Strengthen the AI prompt when toggle is ON
3. Fix coordinate grading + expand to more tools
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")
lines = txt.split("\n")
original_count = len(lines)

# ─────────────────────────────────────────────────────────────────────
# PATCH 1: Add auto-attach toggle state variable after showStemLab
# ─────────────────────────────────────────────────────────────────────
target1 = "const [showStemLab, setShowStemLab] = useState(false);"
idx1 = None
for i, line in enumerate(lines):
    if target1 in line:
        idx1 = i
        break

if idx1 is not None:
    new_line = "  const [autoAttachManipulatives, setAutoAttachManipulatives] = useState(true);"
    lines.insert(idx1 + 1, new_line)
    print(f"PATCH 1 ✅ Inserted autoAttachManipulatives state at line {idx1 + 2}")
else:
    print("PATCH 1 ❌ Could not find showStemLab state declaration")

# ─────────────────────────────────────────────────────────────────────
# PATCH 2: Strengthen the Freeform Builder AI prompt
# ─────────────────────────────────────────────────────────────────────
old_prompt = 'Optionally, you can enable STEM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student\'s physical configuration instead of typed text). Supported tools are "coordinate" and "base10". Example state for base10: {"hundreds":1, "tens":5, "ones":0}.'

new_prompt = '''${autoAttachManipulatives ? `
                MANIPULATIVE INTEGRATION (REQUIRED when toggle is ON):
                You MUST include "manipulativeSupport" and/or "manipulativeResponse" objects for problems where a visual manipulative would aid understanding. Use your judgment on which tool fits best:
                - "base10": for place value, addition/subtraction, regrouping. State: {"hundreds":N, "tens":N, "ones":N}
                - "coordinate": for graphing, plotting, geometry. State: {"points":[{"x":N,"y":N,"label":"A"}]}
                - "numberline": for addition, subtraction, fractions, number sense. State: {"markers":[{"value":N,"label":"..."}], "range":{"min":N,"max":N}}
                - "fractions": for fraction comparison, operations. State: {"numerator":N, "denominator":N}
                - "volume": for 3D geometry, volume calculation. State: {"dims":{"l":N,"w":N,"h":N}}
                - "protractor": for angle measurement, classification. State: {"angle":N}
                "manipulativeSupport" pre-loads the tool as a visual scaffold alongside the problem.
                "manipulativeResponse" replaces the text input — the student must configure the manipulative correctly to answer.
                ` : 'Optionally, you can enable STEM Lab manipulatives by returning objects in "manipulativeSupport" (to pre-load scaffolding) or "manipulativeResponse" (to grade the student\\'s physical configuration instead of typed text). Supported tools are "coordinate", "base10", "numberline", "fractions", "volume", and "protractor".'}'''

count2 = txt.count(old_prompt)
if count2 > 0:
    # Re-join after patch 1, then do the replacement
    txt_patched = "\n".join(lines)
    txt_patched = txt_patched.replace(old_prompt, new_prompt)
    lines = txt_patched.split("\n")
    print(f"PATCH 2 ✅ Replaced AI prompt ({count2} occurrences)")
else:
    print("PATCH 2 ❌ Could not find the old prompt text")

# ─────────────────────────────────────────────────────────────────────
# PATCH 3: Fix coordinate grading + expand to more tools
# ─────────────────────────────────────────────────────────────────────
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
                                                            }"""

txt_patched2 = "\n".join(lines)
count3 = txt_patched2.count(old_grading)
if count3 > 0:
    txt_patched2 = txt_patched2.replace(old_grading, new_grading)
    lines = txt_patched2.split("\n")
    print(f"PATCH 3 ✅ Replaced grading logic ({count3} occurrences)")
else:
    print("PATCH 3 ❌ Could not find old grading block — trying line-by-line")
    # Fallback: search for the key identifier line
    for i, line in enumerate(lines):
        if "isCorrect = gridPoints.length === (problem.manipulativeResponse.state?.points?.length || 0)" in line:
            print(f"  Found coordinate grading at line {i+1}")
            break

# ─────────────────────────────────────────────────────────────────────
# PATCH 4: Also expand the 'Open [tool]' button to support more tools
# ─────────────────────────────────────────────────────────────────────
old_open = """setStemLabTool(problem.manipulativeResponse.tool); setShowStemLab(true); setStemLabTab('explore');"""
new_open = """setStemLabTool(problem.manipulativeResponse.tool);
                                                            if (problem.manipulativeResponse.tool === 'numberline' && problem.manipulativeResponse.state?.range) {
                                                                setNumberLineRange(problem.manipulativeResponse.state.range);
                                                            } else if (problem.manipulativeResponse.tool === 'fractions' && problem.manipulativeResponse.state) {
                                                                setFractionPieces({ numerator: 0, denominator: problem.manipulativeResponse.state.denominator || 8 });
                                                            } else if (problem.manipulativeResponse.tool === 'volume' && problem.manipulativeResponse.state?.dims) {
                                                                setCubeDims({ l: 1, w: 1, h: 1 });
                                                            } else if (problem.manipulativeResponse.tool === 'protractor') {
                                                                setAngleValue(0);
                                                            }
                                                            setShowStemLab(true); setStemLabTab('explore');"""

txt_patched3 = "\n".join(lines)
count4 = txt_patched3.count(old_open)
if count4 > 0:
    txt_patched3 = txt_patched3.replace(old_open, new_open, 1)  # Only first occurrence (the response one)
    lines = txt_patched3.split("\n")
    print(f"PATCH 4 ✅ Expanded 'Open tool' button ({count4} occurrences, replaced 1)")
else:
    print("PATCH 4 ⚠️ Could not find 'Open tool' button inline")

# ─────────────────────────────────────────────────────────────────────
# Write back
# ─────────────────────────────────────────────────────────────────────
final = "\n".join(lines)
SRC.write_text(final, encoding="utf-8")
new_count = len(lines)
print(f"\nDone. Lines: {original_count} → {new_count} (delta: {new_count - original_count})")
