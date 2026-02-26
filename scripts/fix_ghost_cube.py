# -*- coding: utf-8 -*-
"""
Enhance freeform cube hover to show a full 3D ghost/phantom cube preview
instead of just a flat colored square.
"""

FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def nl(line):
    return '\r\n' if line.endswith('\r\n') else '\n'

changes = 0

# ═══════════════════════════════════════════════════════════════
# After the freeform grid and stacking code, add a ghost cube
# that appears at cubeHoverPos. This renders a full 3D translucent
# cube at the hover position.
# Insert just before: "let freeformWidth ="
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    if 'let freeformWidth = isSlider' in line and i > 74000:
        n = nl(line)
        ghost_cube = (
            "                // Ghost preview cube at hover position" + n +
            "                if (!isSlider && cubeHoverPos && !cubePositions.has(`${cubeHoverPos.x}-${cubeHoverPos.y}-${cubeHoverPos.z}`)) {" + n +
            "                    const gx = cubeHoverPos.x, gy = cubeHoverPos.y, gz = cubeHoverPos.z;" + n +
            "                    const gHue = 140;" + n +
            "                    labCubeGrid.push(React.createElement('div', { key: 'ghost', style: { position:'absolute', width:cubeUnit+'px', height:cubeUnit+'px', transform:'translate3d('+(gx*cubeUnit)+'px,'+(-(gz)*cubeUnit)+'px,'+(gy*cubeUnit)+'px)', transformStyle:'preserve-3d', pointerEvents:'none', zIndex: 20, animation: 'pulse 1.5s ease-in-out infinite' }}," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',80%,65%,0.4)',border:'2px solid hsla('+gHue+',90%,50%,0.7)',boxSizing:'border-box',borderRadius:'2px'}})," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:'100%',height:'100%',transform:'rotateY(180deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',70%,60%,0.3)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}})," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',60%,55%,0.35)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}})," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:cubeUnit+'px',height:'100%',transform:'rotateY(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',60%,60%,0.35)',border:'2px solid hsla('+gHue+',90%,50%,0.5)',boxSizing:'border-box',borderRadius:'2px'}})," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',85%,70%,0.5)',border:'2px solid hsla('+gHue+',90%,50%,0.7)',boxSizing:'border-box',borderRadius:'2px'}})," + n +
            "                        React.createElement('div',{style:{position:'absolute',width:'100%',height:cubeUnit+'px',transform:'rotateX(-90deg) translateZ('+(cubeUnit/2)+'px)',background:'hsla('+gHue+',50%,45%,0.25)',border:'2px solid hsla('+gHue+',90%,50%,0.4)',boxSizing:'border-box',borderRadius:'2px'}})" + n +
            "                    ));" + n +
            "                }" + n +
            "" + n
        )
        lines.insert(i, ghost_cube)
        changes += 1
        print(f"Added 3D ghost preview cube before L{i+1}")
        break

# ═══════════════════════════════════════════════════════════════
# Also enhance the ground grid cells to have a brighter, more
# visible hover state with a + icon
# ═══════════════════════════════════════════════════════════════
for i, line in enumerate(lines):
    old_ground_bg = "background: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? 'hsla(140,70%,60%,0.5)' : 'hsla(220,10%,50%,0.15)'"
    if old_ground_bg in line:
        new_ground_bg = "background: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? 'hsla(140,80%,55%,0.6)' : 'hsla(220,15%,60%,0.12)'"
        lines[i] = line.replace(old_ground_bg, new_ground_bg)

        # Also change dashed border to solid on hover
        old_border = "border:'1px dashed hsla(220,20%,60%,0.3)'"
        new_border = "border: cubeHoverPos && cubeHoverPos.x===gx && cubeHoverPos.y===gy ? '2px solid hsla(140,80%,50%,0.7)' : '1px dashed hsla(220,20%,60%,0.25)'"
        lines[i] = lines[i].replace(old_border, new_border)
        changes += 1
        print(f"Enhanced ground grid hover style at L{i+1}")
        break

print(f"\nTotal changes: {changes}")

if changes >= 1:
    with open(FILE, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("File saved.")
else:
    print("No changes made!")
