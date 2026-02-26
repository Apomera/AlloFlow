# -*- coding: utf-8 -*-
import re, subprocess, sys

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

fixes = 0

# FIX 1: Wave Simulator velocity label
old_ws = "v = ${(d.frequency * 2 * Math.PI / d.frequency).toFixed(2)} units/s`"
new_ws = "A = ${Number(d.amplitude).toFixed(1)}`"
if old_ws in content:
    content = content.replace(old_ws, new_ws)
    fixes += 1
    print("Fix 1: Wave velocity label fixed")
else:
    print("Fix 1 SKIP: wave stats not found")

# FIX 2: Function Grapher range defaults
old_fg = "const xR = d.range, yR = d.range;"
new_fg = "const xR = { xMin: (d.range && d.range.xMin) || -10, xMax: (d.range && d.range.xMax) || 10 }; const yR = { yMin: (d.range && d.range.yMin) || -10, yMax: (d.range && d.range.yMax) || 10 };"
if content.count(old_fg) == 1:
    content = content.replace(old_fg, new_fg)
    fixes += 1
    print("Fix 2: Function Grapher range defaults fixed")
else:
    print(f"Fix 2 SKIP: fg range found {content.count(old_fg)} times")

# FIX 3: Grade-level filtering for advanced tools
advanced = ['calculus', 'chemBalance', 'punnett', 'circuit', 'inequality']
for tool in advanced:
    marker = f"stemLabTool === '{tool}' && (() => " + "{"
    if marker in content:
        idx = content.index(marker)
        # Find "const upd" near this tool
        search_end = min(idx + 500, len(content))
        upd_pos = content.find("const upd", idx)
        if upd_pos > 0 and upd_pos < search_end:
            eol = content.find("\n", upd_pos)
            if eol > 0:
                grade_line = "\n          const gl = parseInt(gradeLevel) || 5; if (gl <= 5) return null;"
                content = content[:eol] + grade_line + content[eol:]
                fixes += 1
                print(f"Fix 3: Grade filter for {tool}")
    else:
        print(f"Fix 3 SKIP: {tool} not found")

# FIX 4: Tool descriptions (inserted after each tool's h3 header)
descs = [
    ("Calculus Visualizer", "Explore Riemann sums and approximate the area under a curve."),
    ("Wave Simulator", "Visualize sine waves. Toggle Interference Mode for superposition."),
    ("Cell Diagram", "Explore cell organelles. Click any organelle to learn its function."),
    ("Function Grapher", "Graph linear, quadratic, and trig functions with adjustable coefficients."),
    ("Physics Simulator", "Projectile motion: adjust angle, velocity, and gravity."),
    ("Equation Balancer", "Balance chemical equations by adjusting coefficients."),
    ("Punnett Square", "Predict offspring genotypes. Select alleles for each parent."),
    ("Circuit Builder", "Build series circuits. V = IR. See current/power update live."),
    ("Data Plotter", "Click to plot points. Auto-calculates linear regression and R-squared."),
    ("Inequality Grapher", "Type an inequality like x > 3 to visualize it on a number line."),
    ("Molecule Builder", "Explore molecular structures with preset molecules."),
]

for title, desc in descs:
    # Find the h3 containing the title
    pattern = f'"{title}")'
    if pattern in content:
        idx = content.index(pattern)
        # Find the end of the header row's closing ),\n
        # The header is wrapped in a flex div. After the h3, there might be
        # more elements (buttons), then a closing ),\n
        # Find the NEXT React.createElement after the header complex
        # Strategy: find "),\n" that comes after the header and before the next main element
        
        # Find closing of the header flex container. Look for the pattern:
        # ),\n  followed by React.createElement for the main content
        search_start = idx + len(pattern)
        # Find the next major createElement that starts the tool's body content
        # This is typically an SVG, div with grid, or similar
        next_svg = content.find('React.createElement("svg"', search_start)
        next_div = content.find('React.createElement("div", { className: "bg-', search_start)
        next_div2 = content.find('React.createElement("div", { className: "flex gap-', search_start)
        next_div3 = content.find('React.createElement("div", { className: "flex items-center gap-2 mb-3"', search_start)
        
        candidates = [x for x in [next_svg, next_div, next_div2, next_div3] if x > 0 and x < search_start + 800]
        if candidates:
            target = min(candidates)
            # Go back to find the last newline before this target
            prev_nl = content.rfind("\n", search_start, target)
            if prev_nl > 0:
                indent = "            "
                desc_el = f'\n{indent}React.createElement("p", {{ className: "text-xs text-slate-400 italic -mt-2 mb-3" }}, "{desc}"),'
                content = content[:prev_nl] + "," + desc_el + content[prev_nl:]
                fixes += 1
                print(f"Fix 4: Description for {title}")
            else:
                print(f"Fix 4 SKIP: no newline for {title}")
        else:
            print(f"Fix 4 SKIP: no body element for {title}")
    else:
        print(f"Fix 4 SKIP: title not found: {title}")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"\nTotal fixes: {fixes}")

# Syntax check
r = subprocess.run(
    ['node', '-e', 'try{new Function(require("fs").readFileSync("stem_lab_module.js","utf8"));console.log("SYNTAX OK");}catch(e){console.log("SYNTAX ERROR:",e.message);}'],
    capture_output=True, text=True,
    cwd=r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated"
)
print(r.stdout.strip())

# Paren balance
r2 = subprocess.run(
    ['node', '-e', 'var c=require("fs").readFileSync("stem_lab_module.js","utf8");var p=0;for(var i=0;i<c.length;i++){if(c[i]==="(")p++;if(c[i]===")")p--;}console.log("Paren balance:",p);'],
    capture_output=True, text=True,
    cwd=r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated"
)
print(r2.stdout.strip())
