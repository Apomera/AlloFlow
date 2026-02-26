"""
Patch AlloFlowANTI.txt to add:
1. labToolData state variable (single object for all 8 new tools)
2. Pass labToolData+setLabToolData as props to StemLab component
3. Update the AI prompt to know about new tools
4. Add grading logic for new tools
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

# ─────────────────────────────────────────────────────────────────────
# PATCH 1: Add labToolData state after autoSnapshotManipulatives
# ─────────────────────────────────────────────────────────────────────
old_ast = "const [autoSnapshotManipulatives, setAutoSnapshotManipulatives] = useState(true);"
new_ast = """const [autoSnapshotManipulatives, setAutoSnapshotManipulatives] = useState(true);
  const [labToolData, setLabToolData] = useState({
    funcGrapher: { eq: 'x^2', a: 1, b: 0, c: 0, type: 'quadratic', range: { xMin: -10, xMax: 10, yMin: -10, yMax: 10 }, challenge: null, feedback: null },
    physics: { angle: 45, velocity: 20, gravity: 9.8, trajectory: [], running: false, challenge: null, feedback: null },
    chemBalance: { equation: '', coefficients: [1,1,1,1], target: null, challenge: null, feedback: null },
    punnett: { parent1: ['A','a'], parent2: ['A','a'], trait: 'Trait', challenge: null, feedback: null },
    circuit: { components: [], voltage: 9, challenge: null, feedback: null },
    dataPlot: { points: [], trendLine: null, equation: '', challenge: null, feedback: null },
    inequality: { expr: 'x > 3', variable: 'x', range: { min: -10, max: 10 }, shaded: [], challenge: null, feedback: null },
    molecule: { atoms: [], bonds: [], formula: '', challenge: null, feedback: null }
  });"""

if old_ast in txt:
    txt = txt.replace(old_ast, new_ast)
    print("PATCH 1 ✅ Added labToolData state")
else:
    print("PATCH 1 ❌ Could not find autoSnapshotManipulatives state")

# ─────────────────────────────────────────────────────────────────────
# PATCH 2: Pass labToolData to StemLab component
# ─────────────────────────────────────────────────────────────────────
old_props = "handleGenerateMath});"
new_props = "handleGenerateMath, labToolData, setLabToolData, gradeLevel});"

count2 = txt.count(old_props)
if count2 > 0:
    txt = txt.replace(old_props, new_props, 1)
    print(f"PATCH 2 ✅ Added labToolData props ({count2} matches, replaced 1)")
else:
    print("PATCH 2 ❌ Could not find handleGenerateMath}) prop ending")

# ─────────────────────────────────────────────────────────────────────
# PATCH 3: Update AI prompt with new tool types
# ─────────────────────────────────────────────────────────────────────
old_protractor_line = '''- "protractor": for angle measurement, classification. State: {"angle":N}'''
new_protractor_line = '''- "protractor": for angle measurement, classification. State: {"angle":N}
                - "funcGrapher": for algebra, functions, graphing. State: {"eq":"f(x)","type":"linear|quadratic|trig","a":N,"b":N,"c":N}
                - "physics": for projectile motion, kinematics. State: {"angle":N,"velocity":N,"gravity":9.8}
                - "chemBalance": for balancing chemical equations. State: {"equation":"H2+O2->H2O","coefficients":[2,1,2]}
                - "punnett": for genetics, Punnett squares. State: {"parent1":["A","a"],"parent2":["A","a"]}
                - "circuit": for electrical circuits, Ohm's law. State: {"components":[{"type":"resistor","value":100}],"voltage":9}
                - "dataPlot": for scatter plots, trend lines, statistics. State: {"points":[{"x":N,"y":N}]}
                - "inequality": for graphing inequalities. State: {"expr":"x>3","variable":"x"}
                - "molecule": for molecular structure, chemistry. State: {"formula":"H2O","atoms":[{"element":"O","x":0,"y":0}]}'''

if old_protractor_line in txt:
    txt = txt.replace(old_protractor_line, new_protractor_line)
    print("PATCH 3 ✅ Added new tool types to AI prompt")
else:
    print("PATCH 3 ❌ Could not find protractor prompt line")

# ─────────────────────────────────────────────────────────────────────
# PATCH 4: Add grading logic for new tools
# ─────────────────────────────────────────────────────────────────────
old_protractor_grade = """} else if (problem.manipulativeResponse.tool === 'protractor') {
                                                                isCorrect = Math.abs(angleValue - (target.angle || 0)) <= 2;
                                                            }"""

new_protractor_grade = """} else if (problem.manipulativeResponse.tool === 'protractor') {
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
                                                                const targetPts = (target.points || []).map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
                                                                const studentPts = ldp.points.map(p => `${Math.round(p.x)},${Math.round(p.y)}`).sort();
                                                                isCorrect = targetPts.length === studentPts.length && targetPts.every((v, i) => v === studentPts[i]);
                                                            } else if (problem.manipulativeResponse.tool === 'inequality') {
                                                                const li = labToolData.inequality;
                                                                isCorrect = li.expr.replace(/\\s/g,'') === (target.expr || '').replace(/\\s/g,'');
                                                            } else if (problem.manipulativeResponse.tool === 'molecule') {
                                                                const lm = labToolData.molecule;
                                                                isCorrect = lm.formula.replace(/\\s/g,'').toLowerCase() === (target.formula || '').replace(/\\s/g,'').toLowerCase();
                                                            }"""

if old_protractor_grade in txt:
    txt = txt.replace(old_protractor_grade, new_protractor_grade)
    print("PATCH 4 ✅ Added grading for 8 new tools")
else:
    print("PATCH 4 ❌ Could not find protractor grading block")

# Write back
SRC.write_text(txt, encoding="utf-8")
lines = txt.split("\n")
print(f"\nDone. Lines: {len(lines)}")
