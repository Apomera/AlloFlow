"""
Patch stem_lab_module.js:
1. Add labToolData/setLabToolData to prop destructuring
2. Add 8 new tool picker entries to the explore grid
"""
from pathlib import Path

SRC = Path(r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js")
txt = SRC.read_text(encoding="utf-8")

# PATCH 1: Add props destructuring
old_props = "    handleGenerateMath\n  } = props;"
new_props = "    handleGenerateMath,\n    labToolData,\n    setLabToolData,\n    gradeLevel\n  } = props;"
if old_props in txt:
    txt = txt.replace(old_props, new_props)
    print("PATCH 1 ✅ Added labToolData props")
else:
    # Try \r\n
    old_props2 = "    handleGenerateMath\r\n  } = props;"
    new_props2 = "    handleGenerateMath,\r\n    labToolData,\r\n    setLabToolData,\r\n    gradeLevel\r\n  } = props;"
    if old_props2 in txt:
        txt = txt.replace(old_props2, new_props2)
        print("PATCH 1 ✅ Added labToolData props (CRLF)")
    else:
        print("PATCH 1 ❌ Could not find props destructuring")

# PATCH 2: Add new tool picker entries after multtable
old_picker = """    id: 'multtable',
    icon: '\\uD83D\\uDD22',
    label: 'Multiplication Table',
    desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
    color: 'pink',
    ready: true
  }]"""

new_picker = """    id: 'multtable',
    icon: '\\uD83D\\uDD22',
    label: 'Multiplication Table',
    desc: 'Interactive times table grid. Spot patterns, practice facts with challenges.',
    color: 'pink',
    ready: true
  }, {
    id: 'funcGrapher',
    icon: '\\uD83D\\uDCC8',
    label: 'Function Grapher',
    desc: 'Plot linear, quadratic, and trig functions. Adjust coefficients in real-time.',
    color: 'indigo',
    ready: true
  }, {
    id: 'physics',
    icon: '\\u26A1',
    label: 'Physics Simulator',
    desc: 'Projectile motion, velocity vectors, and trajectory visualization.',
    color: 'sky',
    ready: true
  }, {
    id: 'chemBalance',
    icon: '\\u2697\\uFE0F',
    label: 'Equation Balancer',
    desc: 'Balance chemical equations with visual atom counting.',
    color: 'lime',
    ready: true
  }, {
    id: 'punnett',
    icon: '\\uD83E\\uDDEC',
    label: 'Punnett Square',
    desc: 'Genetic crosses with alleles. Predict genotype and phenotype ratios.',
    color: 'violet',
    ready: true
  }, {
    id: 'circuit',
    icon: '\\uD83D\\uDD0C',
    label: 'Circuit Builder',
    desc: 'Build circuits with resistors and batteries. Calculate voltage and current.',
    color: 'yellow',
    ready: true
  }, {
    id: 'dataPlot',
    icon: '\\uD83D\\uDCCA',
    label: 'Data Plotter',
    desc: 'Plot data points, fit trend lines, calculate correlation.',
    color: 'teal',
    ready: true
  }, {
    id: 'inequality',
    icon: '\\uD83C\\uDFA8',
    label: 'Inequality Grapher',
    desc: 'Graph inequalities on number lines and coordinate planes.',
    color: 'fuchsia',
    ready: true
  }, {
    id: 'molecule',
    icon: '\\uD83D\\uDD2C',
    label: 'Molecule Builder',
    desc: 'Build molecules with atoms and bonds. Explore molecular geometry.',
    color: 'stone',
    ready: true
  }]"""

if old_picker in txt:
    txt = txt.replace(old_picker, new_picker)
    print("PATCH 2 ✅ Added 8 tool picker entries")
else:
    # Try with unicode chars
    old_p2 = "id: 'multtable'"
    if old_p2 in txt:
        print("PATCH 2 ⚠️ Found multtable but full block didn't match. Trying alternate...")
        # Find the exact line
        lines = txt.split("\n")
        for i, line in enumerate(lines):
            if "id: 'multtable'" in line:
                print(f"  multtable at line {i+1}: {line.strip()[:60]}")
                break
    else:
        print("PATCH 2 ❌ Could not find multtable entry")

SRC.write_text(txt, encoding="utf-8")
print(f"Done. File size: {len(txt)}")
