"""
Expand undo/redo to cover ALL visual actions:
1. Replace pushLabelSnapshot with pushVisualSnapshot (captures all state)
2. Update handleUndo/handleRedo to restore all state
3. Add pushVisualSnapshot calls to: drawings, captions, AI label drags, panel reorder, label text edits
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Replace pushLabelSnapshot + handleUndo + handleRedo
# with a unified visual snapshot system
# ============================================================
for i in range(len(lines)):
    if '// === F7: Undo/Redo for Labels ===' in lines[i]:
        print(f"  Found F7 undo/redo block at L{i+1}")
        # Find the end of handleRedo (the }; after setLabelHistoryIndex)
        end_i = None
        for j in range(i, min(i+25, len(lines))):
            if 'handleRedo' in lines[j]:
                # Find the closing };
                for k in range(j, min(j+10, len(lines))):
                    if lines[k].strip() == '};':
                        end_i = k
                        break
                break
        
        if end_i:
            indent = '    '
            new_block = [
                indent + "// === F7: Undo/Redo for ALL Visual Actions ===\r",
                indent + "const pushVisualSnapshot = () => {\r",
                indent + "    const snapshot = JSON.stringify({\r",
                indent + "        userLabels,\r",
                indent + "        drawings,\r",
                indent + "        captionOverrides,\r",
                indent + "        aiLabelPositions,\r",
                indent + "        panelOrder\r",
                indent + "    });\r",
                indent + "    const newHistory = labelHistory.slice(0, labelHistoryIndex + 1);\r",
                indent + "    newHistory.push(snapshot);\r",
                indent + "    if (newHistory.length > 50) newHistory.shift();\r",
                indent + "    setLabelHistory(newHistory);\r",
                indent + "    setLabelHistoryIndex(newHistory.length - 1);\r",
                indent + "};\r",
                indent + "const handleUndo = () => {\r",
                indent + "    if (labelHistoryIndex <= 0) return;\r",
                indent + "    const prevIdx = labelHistoryIndex - 1;\r",
                indent + "    try {\r",
                indent + "        const snap = JSON.parse(labelHistory[prevIdx]);\r",
                indent + "        if (snap.userLabels !== undefined) setUserLabels(snap.userLabels);\r",
                indent + "        if (snap.drawings !== undefined) setDrawings(snap.drawings);\r",
                indent + "        if (snap.captionOverrides !== undefined) setCaptionOverrides(snap.captionOverrides);\r",
                indent + "        if (snap.aiLabelPositions !== undefined) setAiLabelPositions(snap.aiLabelPositions);\r",
                indent + "        if (snap.panelOrder !== undefined) setPanelOrder(snap.panelOrder);\r",
                indent + "    } catch(e) {\r",
                indent + "        // Legacy: old snapshots were just userLabels\r",
                indent + "        setUserLabels(JSON.parse(labelHistory[prevIdx]));\r",
                indent + "    }\r",
                indent + "    setLabelHistoryIndex(prevIdx);\r",
                indent + "};\r",
                indent + "const handleRedo = () => {\r",
                indent + "    if (labelHistoryIndex >= labelHistory.length - 1) return;\r",
                indent + "    const nextIdx = labelHistoryIndex + 1;\r",
                indent + "    try {\r",
                indent + "        const snap = JSON.parse(labelHistory[nextIdx]);\r",
                indent + "        if (snap.userLabels !== undefined) setUserLabels(snap.userLabels);\r",
                indent + "        if (snap.drawings !== undefined) setDrawings(snap.drawings);\r",
                indent + "        if (snap.captionOverrides !== undefined) setCaptionOverrides(snap.captionOverrides);\r",
                indent + "        if (snap.aiLabelPositions !== undefined) setAiLabelPositions(snap.aiLabelPositions);\r",
                indent + "        if (snap.panelOrder !== undefined) setPanelOrder(snap.panelOrder);\r",
                indent + "    } catch(e) {\r",
                indent + "        setUserLabels(JSON.parse(labelHistory[nextIdx]));\r",
                indent + "    }\r",
                indent + "    setLabelHistoryIndex(nextIdx);\r",
                indent + "};\r",
            ]
            lines[i:end_i+1] = new_block
            fixed += 1
            print(f"  [OK] FIX 1: Replaced F7 block ({end_i-i+1} -> {len(new_block)} lines)")

# ============================================================
# FIX 2: Replace all pushLabelSnapshot() calls with pushVisualSnapshot()
# ============================================================
count = 0
for i in range(len(lines)):
    if 'pushLabelSnapshot()' in lines[i]:
        lines[i] = lines[i].replace('pushLabelSnapshot()', 'pushVisualSnapshot()')
        count += 1
if count > 0:
    fixed += 1
    print(f"  [OK] FIX 2: Replaced {count} pushLabelSnapshot() -> pushVisualSnapshot()")

# ============================================================
# FIX 3: Add pushVisualSnapshot() to user label text edits
# handleUserLabelTextChange currently doesn't push a snapshot
# ============================================================
for i in range(len(lines)):
    if 'const handleUserLabelTextChange' in lines[i]:
        print(f"  Found handleUserLabelTextChange at L{i+1}")
        # Add pushVisualSnapshot() at start of function body
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        # Insert after the opening line
        for j in range(i, min(i+3, len(lines))):
            if 'setUserLabels' in lines[j]:
                lines.insert(j, indent + '    pushVisualSnapshot();\r')
                fixed += 1
                print(f"  [OK] FIX 3: Added pushVisualSnapshot to handleUserLabelTextChange")
                break
        break

# ============================================================
# FIX 4: Add pushVisualSnapshot() to caption edits
# Find where captionOverrides is set (on blur/save)
# ============================================================
for i in range(len(lines)):
    if 'setCaptionOverrides' in lines[i] and 'prev' in lines[i] and 'pushVisualSnapshot' not in lines[i-1]:
        # Only add if not already there
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines.insert(i, indent + 'pushVisualSnapshot();\r')
        fixed += 1
        print(f"  [OK] FIX 4: Added pushVisualSnapshot before setCaptionOverrides at L{i+1}")
        break

# ============================================================
# FIX 5: Add pushVisualSnapshot() to panel reorder (handlePanelDrop)
# ============================================================
for i in range(len(lines)):
    if 'setPanelOrder(newOrder)' in lines[i]:
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        lines.insert(i, indent + 'pushVisualSnapshot();\r')
        fixed += 1
        print(f"  [OK] FIX 5: Added pushVisualSnapshot before setPanelOrder")
        break

# ============================================================
# FIX 6: Add pushVisualSnapshot() to AI label drag end
# ============================================================
for i in range(len(lines)):
    if 'setAiLabelPositions' in lines[i] and 'panelIdx' in lines[i] and 'labelIdx' in lines[i]:
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        if 'pushVisualSnapshot' not in lines[i-1]:
            lines.insert(i, indent + 'pushVisualSnapshot();\r')
            fixed += 1
            print(f"  [OK] FIX 6: Added pushVisualSnapshot before setAiLabelPositions")
        break

# ============================================================
# FIX 7: Add pushVisualSnapshot() to drawing end (setDrawings)
# Find where drawings are committed (not currentPath)
# ============================================================
drawing_snapshot_added = 0
for i in range(len(lines)):
    if 'setDrawings(prev' in lines[i] and drawing_snapshot_added < 2:
        indent = lines[i][:len(lines[i]) - len(lines[i].lstrip())]
        if i > 0 and 'pushVisualSnapshot' not in lines[i-1]:
            lines.insert(i, indent + 'pushVisualSnapshot();\r')
            drawing_snapshot_added += 1
            print(f"  [OK] FIX 7.{drawing_snapshot_added}: Added pushVisualSnapshot before setDrawings at L{i+1}")

if drawing_snapshot_added > 0:
    fixed += 1

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
