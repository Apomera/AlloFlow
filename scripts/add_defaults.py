"""Add 7 new tool defaults to labToolData in AlloFlowANTI.txt"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    c = f.read()

OLD = "cell: { selectedOrganelle: null, labels: true, type: 'animal', challenge: null, feedback: null }\r\n  });"
NEW = """cell: { selectedOrganelle: null, labels: true, type: 'animal', challenge: null, feedback: null },
    solarSystem: { selectedPlanet: null },
    waterCycle: { selectedStage: null },
    rockCycle: { selectedRock: null, selectedProcess: null },
    ecosystem: { preyBirth: 0.1, preyDeath: 0.01, predBirth: 0.01, predDeath: 0.1, prey0: 100, pred0: 20, steps: 0, data: [] },
    fractions: { num1: 1, den1: 2, num2: 2, den2: 4, mode: 'bar' },
    unitConvert: { category: 'length', value: 1, fromUnit: 'm', toUnit: 'ft' },
    probability: { mode: 'coin', trials: 0, results: [], running: false }
  });"""

if OLD in c:
    c = c.replace(OLD, NEW)
    with open(FILE, 'w', encoding='utf-8') as f:
        f.write(c)
    print('SUCCESS: Added 7 new tool defaults')
else:
    print('FAIL: old pattern not found')
