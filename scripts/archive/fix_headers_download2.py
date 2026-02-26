"""Fix role badge and download using line-based approach to handle \\r\\n."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Dynamic comparison headers
# Find L1824-1827 pattern and prepend panel.title check
# ============================================================
for i in range(len(lines)):
    if "panel.role === 'before'" in lines[i] and "Before" in lines[i]:
        # Found the role badge line - check the context
        print(f"  Found role badge at L{i+1}: {lines[i].rstrip()[:120]}")
        # Check if panel.title is already there
        if 'panel.title' in lines[i]:
            print("  -> panel.title already present, skipping")
        else:
            # Replace the 3 lines with panel.title || fallback
            indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
            # Build new role text with panel.title priority
            new_role = indent + "{panel.title || (\r"
            lines[i] = new_role
            # Find the closing of the ternary (the line with just panel.role})
            for j in range(i+1, min(i+5, len(lines))):
                if 'panel.role}' in lines[j]:
                    lines[j] = lines[j].replace('panel.role}', 'panel.role)}\r')
                    fixed += 1
                    print(f"  [OK] FIX 1: Added panel.title || wrapper at L{i+1}-L{j+1}")
                    break
        break

# ============================================================
# FIX 2: Enhanced download - replace handleDownloadImage
# Find the function start and end, replace with canvas approach
# ============================================================
start_idx = None
end_idx = None
for i in range(len(lines)):
    if 'const handleDownloadImage = () =>' in lines[i]:
        start_idx = i
        print(f"  Found handleDownloadImage at L{i+1}")
    if start_idx is not None and i > start_idx:
        # Count braces to find function end
        if '  };' == lines[i].rstrip() or lines[i].strip() == '};':
            end_idx = i
            print(f"  Function ends at L{i+1}")
            break

if start_idx is not None and end_idx is not None:
    # Build the new download function
    indent = '  '
    new_fn = [
        indent + "const handleDownloadImage = () => {\r",
        indent + "  if (generatedContent?.type !== 'image' || !generatedContent?.data?.imageUrl) return;\r",
        indent + "  // Helper: render image with labels onto canvas\r",
        indent + "  const downloadWithLabels = (imgUrl, labels, filename) => {\r",
        indent + "      const img = new Image();\r",
        indent + "      img.crossOrigin = 'anonymous';\r",
        indent + "      img.onload = () => {\r",
        indent + "          const canvas = document.createElement('canvas');\r",
        indent + "          canvas.width = img.naturalWidth;\r",
        indent + "          canvas.height = img.naturalHeight;\r",
        indent + "          const ctx = canvas.getContext('2d');\r",
        indent + "          ctx.drawImage(img, 0, 0);\r",
        indent + "          if (labels && labels.length > 0) {\r",
        indent + "              ctx.font = 'bold 14px Inter, Segoe UI, system-ui, sans-serif';\r",
        indent + "              ctx.textAlign = 'center';\r",
        indent + "              labels.forEach(label => {\r",
        indent + "                  const x = (label.x / 100) * canvas.width;\r",
        indent + "                  const y = (label.y / 100) * canvas.height;\r",
        indent + "                  const text = label.text || '';\r",
        indent + "                  const metrics = ctx.measureText(text);\r",
        indent + "                  const pad = 6;\r",
        indent + "                  ctx.fillStyle = 'rgba(30, 27, 75, 0.85)';\r",
        indent + "                  const rx = x - metrics.width / 2 - pad;\r",
        indent + "                  const ry = y - 10;\r",
        indent + "                  const rw = metrics.width + pad * 2;\r",
        indent + "                  const rh = 20;\r",
        indent + "                  ctx.beginPath();\r",
        indent + "                  ctx.roundRect(rx, ry, rw, rh, 4);\r",
        indent + "                  ctx.fill();\r",
        indent + "                  ctx.fillStyle = '#ffffff';\r",
        indent + "                  ctx.fillText(text, x, y + 4);\r",
        indent + "              });\r",
        indent + "          }\r",
        indent + "          canvas.toBlob(blob => {\r",
        indent + "              const url = URL.createObjectURL(blob);\r",
        indent + "              const link = document.createElement('a');\r",
        indent + "              link.href = url;\r",
        indent + "              link.download = filename;\r",
        indent + "              document.body.appendChild(link);\r",
        indent + "              link.click();\r",
        indent + "              document.body.removeChild(link);\r",
        indent + "              URL.revokeObjectURL(url);\r",
        indent + "          }, 'image/png');\r",
        indent + "      };\r",
        indent + "      img.onerror = () => {\r",
        indent + "          const link = document.createElement('a');\r",
        indent + "          link.href = imgUrl;\r",
        indent + "          link.download = filename;\r",
        indent + "          document.body.appendChild(link);\r",
        indent + "          link.click();\r",
        indent + "          document.body.removeChild(link);\r",
        indent + "      };\r",
        indent + "      img.src = imgUrl;\r",
        indent + "  };\r",
        indent + "  // Multi-panel\r",
        indent + "  if (generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1) {\r",
        indent + "      const labelsHidden = document.querySelector('[data-labels-hidden]');\r",
        indent + "      generatedContent?.data.visualPlan.panels.forEach((panel, idx) => {\r",
        indent + "          if (!panel.imageUrl) return;\r",
        indent + "          const labels = !labelsHidden ? (panel.labels || []) : [];\r",
        indent + "          setTimeout(() => {\r",
        indent + "              downloadWithLabels(panel.imageUrl, labels, `udl-visual-panel-${idx + 1}-${Date.now()}.png`);\r",
        indent + "          }, idx * 500);\r",
        indent + "      });\r",
        indent + "      addToast(t('visual_director.panels_downloaded') || `${generatedContent?.data.visualPlan.panels.length} panels downloaded!`, \"success\");\r",
        indent + "  } else {\r",
        indent + "      downloadWithLabels(generatedContent?.data.imageUrl, [], `udl-visual-support-${Date.now()}.png`);\r",
        indent + "      addToast(t('toasts.image_saved'), \"success\");\r",
        indent + "  }\r",
        indent + "};\r",
    ]
    lines[start_idx:end_idx+1] = new_fn
    fixed += 1
    print(f"  [OK] FIX 2: Replaced handleDownloadImage with canvas-based version ({end_idx - start_idx + 1} lines -> {len(new_fn)} lines)")
else:
    print("[WARN] FIX 2: handleDownloadImage boundaries not found")

# Write
content = '\n'.join(lines)
new_count = len(lines)
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
