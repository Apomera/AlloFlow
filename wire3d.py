"""Wire 3D rendering into the canvas draw loop + fix canvas onClick for coordinate picker"""

with open('stem_lab/stem_tool_coding.js', encoding='utf-8') as f:
    src = f.read()

# ═══════════════════════════════════════════
# 1. ADD a 3D DRAW ROUTINE that hooks into the canvas after normal rendering
#    This runs via setTimeout after each state change when show3D is true
# ═══════════════════════════════════════════
draw_3d_hook = """
          // ── 3D Canvas Overlay Rendering ──
          // When show3D is true, this runs after the normal 2D draw pass
          // and overlays the 3D grid, axes, and re-renders all lines with perspective
          function draw3DOverlay() {
            if (!show3D || !canvasRef || !canvasRef.current) return;
            var canvas = canvasRef.current;
            var ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Clear canvas completely for 3D render
            ctx.clearRect(0, 0, 500, 500);

            // Dark background
            ctx.fillStyle = '#0a0e1a';
            ctx.fillRect(0, 0, 500, 500);

            // 3D Ground Grid
            if (show3DGrid) {
              render3DGrid(ctx);
            }

            // 3D Axes indicator
            if (show3DAxes) {
              render3DAxes(ctx);
            }

            // Render 3D lines with depth sorting and perspective
            if (lines3D.length > 0) {
              render3DLines(ctx, lines3D);
            } else if (drawnLines.length > 0) {
              // Fallback: render 2D lines through the perspective engine (treat z=0)
              var fake3D = drawnLines.map(function(l) {
                return { x1: l.x1, y1: l.y1, z1: 0, x2: l.x2, y2: l.y2, z2: 0, color: l.color, width: l.width };
              });
              render3DLines(ctx, fake3D);
            }

            // Draw turtle cursor in 3D projected position
            if (showTurtle) {
              var tp = project3D(turtleState.x - 250, turtleState.y - 250, turtleZ);
              ctx.save();
              ctx.translate(tp.x, tp.y);
              ctx.rotate((turtleState.angle + 90) * Math.PI / 180);
              ctx.font = (18 * tp.scale).toFixed(0) + 'px sans-serif';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.globalAlpha = Math.max(0.3, tp.scale);
              ctx.fillText(turtleSkin || '\\u{1F422}', 0, 0);
              ctx.restore();
            }

            // 3D HUD
            ctx.globalAlpha = 0.7;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(4, 4, 110, 48);
            ctx.fillStyle = '#5eead4';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('3D MODE', 8, 7);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '8px monospace';
            ctx.fillText('cam: ' + Math.round(cameraRotX) + '\\u00b0/' + Math.round(cameraRotZ) + '\\u00b0', 8, 19);
            ctx.fillText('zoom: ' + (cameraZoom * 100).toFixed(0) + '%', 8, 29);
            ctx.fillText('lines: ' + lines3D.length + ' | z: ' + Math.round(turtleZ), 8, 39);
            ctx.globalAlpha = 1.0;
          }

          // Auto-trigger 3D render on state changes
          if (show3D && canvasRef && canvasRef.current) {
            setTimeout(draw3DOverlay, 50);
          }
"""

src = src.replace(
    "          // ── Render ──",
    draw_3d_hook + "\n          // ── Render ──"
)

# ═══════════════════════════════════════════
# 2. ADD onClick to the canvas element for coordinate picker
# ═══════════════════════════════════════════
src = src.replace(
    """                React.createElement("canvas", {
                  ref: canvasRef, width: 500, height: 500,
                  className: "w-full rounded-lg",
                  style: { maxWidth: '500px', aspectRatio: '1/1', imageRendering: 'auto' }
                })""",
    """                React.createElement("canvas", {
                  ref: canvasRef, width: 500, height: 500,
                  onClick: canvasClickHandler,
                  className: "w-full rounded-lg" + (showCoordPicker ? " cursor-crosshair" : ""),
                  style: { maxWidth: '500px', aspectRatio: '1/1', imageRendering: 'auto' }
                })"""
)

# ═══════════════════════════════════════════
# 3. RE-TRIGGER 3D draw when camera controls change  
#    The draw3DOverlay is called via setTimeout on render, but camera slider changes
#    update state which re-renders, so the setTimeout will fire again. This should work.
# ═══════════════════════════════════════════

with open('stem_lab/stem_tool_coding.js', 'w', encoding='utf-8') as f:
    f.write(src)

print("3D rendering wired in!")
print(f"New file size: {len(src)} chars, {len(src.splitlines())} lines")
