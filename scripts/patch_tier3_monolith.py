"""
Add 3 Tier 3 tools to AlloFlowANTI.txt:
1. labToolData state: add calculus, wave, cell slices
2. AI prompt: add new tool descriptions
3. Grading: add grading branches
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt")
txt = SRC.read_text(encoding="utf-8")

# PATCH 1: Add Tier 3 state slices to labToolData
old_mol = "    molecule: { atoms: [], bonds: [], formula: '', challenge: null, feedback: null }\n  });"
new_mol = """    molecule: { atoms: [], bonds: [], formula: '', challenge: null, feedback: null },
    calculus: { func: 'x^2', a: 1, b: 0, c: 0, xMin: 0, xMax: 4, n: 8, mode: 'riemann', showDerivative: false, challenge: null, feedback: null },
    wave: { amplitude: 1, frequency: 1, wavelength: 2, phase: 0, wave2: false, amp2: 0.5, freq2: 1.5, challenge: null, feedback: null },
    cell: { selectedOrganelle: null, labels: true, type: 'animal', challenge: null, feedback: null }
  });"""

if old_mol in txt:
    txt = txt.replace(old_mol, new_mol)
    print("PATCH 1 ✅ Added calculus, wave, cell to labToolData")
else:
    print("PATCH 1 ❌ Could not find molecule state closing")

# PATCH 2: Add to AI prompt
old_mol_prompt = '''- "molecule": for molecular structure, chemistry. State: {"formula":"H2O","atoms":[{"element":"O","x":0,"y":0}]}'''
new_mol_prompt = '''- "molecule": for molecular structure, chemistry. State: {"formula":"H2O","atoms":[{"element":"O","x":0,"y":0}]}
                - "calculus": for integrals, derivatives, area under curve, Riemann sums. State: {"func":"x^2","a":1,"b":0,"c":0,"xMin":0,"xMax":4,"n":8,"mode":"riemann"}
                - "wave": for wave physics, sound, light, interference patterns. State: {"amplitude":1,"frequency":1,"wavelength":2}
                - "cell": for biology cell diagrams, organelle identification. State: {"type":"animal","selectedOrganelle":"nucleus"}'''

if old_mol_prompt in txt:
    txt = txt.replace(old_mol_prompt, new_mol_prompt)
    print("PATCH 2 ✅ Added Tier 3 tools to AI prompt")
else:
    print("PATCH 2 ❌ Could not find molecule prompt line")

# PATCH 3: Add grading for Tier 3 tools (after molecule grading)
old_mol_grade = "isCorrect = lm.formula.replace(/\\\\s/g,'').toLowerCase() === (target.formula || '').replace(/\\\\s/g,'').toLowerCase();"
new_mol_grade = """isCorrect = lm.formula.replace(/\\\\s/g,'').toLowerCase() === (target.formula || '').replace(/\\\\s/g,'').toLowerCase();
                                                            } else if (problem.manipulativeResponse.tool === 'calculus') {
                                                                const lcl = labToolData.calculus;
                                                                isCorrect = lcl.mode === (target.mode || 'riemann') && Math.abs(lcl.xMin - (target.xMin || 0)) < 0.1 && Math.abs(lcl.xMax - (target.xMax || 4)) < 0.1 && lcl.n === (target.n || 8);
                                                            } else if (problem.manipulativeResponse.tool === 'wave') {
                                                                const lw = labToolData.wave;
                                                                isCorrect = Math.abs(lw.amplitude - (target.amplitude || 1)) < 0.1 && Math.abs(lw.frequency - (target.frequency || 1)) < 0.1;
                                                            } else if (problem.manipulativeResponse.tool === 'cell') {
                                                                const lce = labToolData.cell;
                                                                isCorrect = lce.selectedOrganelle === (target.selectedOrganelle || null);"""

count = txt.count(old_mol_grade)
if count > 0:
    txt = txt.replace(old_mol_grade, new_mol_grade, 1)
    print(f"PATCH 3 ✅ Added Tier 3 grading ({count} matches, replaced 1)")
else:
    print("PATCH 3 ❌ Could not find molecule grading line")

SRC.write_text(txt, encoding="utf-8")
print(f"Done. Lines: {len(txt.split(chr(10)))}")
