"""
Annotation Persistence: Save drawings, labels, captions, panel order with visual content.
1. Add initialAnnotations + onAnnotationsChange props to VisualPanelGrid
2. Initialize state from saved annotations
3. Add useEffect to push annotation changes to parent  
4. Pass annotations from parent at the call site
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

filepath = 'AlloFlowANTI.txt'
with open(filepath, 'rb') as f:
    content = f.read().decode('utf-8')
lines = content.split('\n')
original_count = len(lines)
fixed = 0

# ============================================================
# FIX 1: Update VisualPanelGrid signature to accept new props
# ============================================================
for i in range(len(lines)):
    if "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, onSpeak, t: tProp })" in lines[i]:
        lines[i] = lines[i].replace(
            "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, onSpeak, t: tProp })",
            "const VisualPanelGrid = React.memo(({ visualPlan, onRefinePanel, onUpdateLabel, onSpeak, t: tProp, initialAnnotations, onAnnotationsChange })"
        )
        fixed += 1
        print(f"  [OK] FIX 1: Updated VisualPanelGrid signature at L{i+1}")
        break

# ============================================================
# FIX 2: Initialize state from saved annotations
# Replace the 5 useState calls with annotation-aware defaults
# ============================================================
replacements = [
    ("const [userLabels, setUserLabels] = React.useState({})",
     "const [userLabels, setUserLabels] = React.useState(initialAnnotations?.userLabels || {})"),
    ("const [drawings, setDrawings] = React.useState({})",
     "const [drawings, setDrawings] = React.useState(initialAnnotations?.drawings || {})"),
    ("const [captionOverrides, setCaptionOverrides] = React.useState({})",
     "const [captionOverrides, setCaptionOverrides] = React.useState(initialAnnotations?.captionOverrides || {})"),
    ("const [aiLabelPositions, setAiLabelPositions] = React.useState({})",
     "const [aiLabelPositions, setAiLabelPositions] = React.useState(initialAnnotations?.aiLabelPositions || {})"),
    ("const [panelOrder, setPanelOrder] = React.useState(null)",
     "const [panelOrder, setPanelOrder] = React.useState(initialAnnotations?.panelOrder || null)"),
]

for old, new in replacements:
    if old in content:
        # Only replace inside the VisualPanelGrid component area (first 2000 lines)
        idx = content.find(old)
        # Convert to line number to verify within range
        line_num = content[:idx].count('\n')
        if line_num < 2000:
            content = content[:idx] + new + content[idx+len(old):]
            fixed += 1
            print(f"  [OK] FIX 2: Updated useState default at L{line_num + 1}")

# Rebuild lines after content changes
lines = content.split('\n')

# ============================================================
# FIX 3: Add useEffect to push annotation changes to parent
# Insert right after the early return guard
# ============================================================
for i in range(len(lines)):
    if '!visualPlan || !visualPlan.panels' in lines[i] and i < 2000:
        print(f"  Found early return guard at L{i+1}")
        # Insert useEffect after the guard (after the next line)
        indent = '    '
        effect_block = [
            '',
            indent + '// Persist annotations to parent on change',
            indent + 'React.useEffect(() => {',
            indent + '    if (onAnnotationsChange) {',
            indent + '        onAnnotationsChange({ userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder });',
            indent + '    }',
            indent + '}, [userLabels, drawings, captionOverrides, aiLabelPositions, panelOrder]);',
            '',
        ]
        # Add \r to each line for consistency
        effect_block = [line + '\r' if line else '\r' for line in effect_block]
        lines[i+1:i+1] = effect_block
        fixed += 1
        print(f"  [OK] FIX 3: Added useEffect for annotation persistence at L{i+2}")
        break

# ============================================================
# FIX 4: Update VisualPanelGrid call site to pass annotations
# ============================================================
for i in range(len(lines)):
    if '<VisualPanelGrid' in lines[i] and i > 60000:
        print(f"  Found VisualPanelGrid call site at L{i+1}")
        # Find the closing />
        for j in range(i, min(i+10, len(lines))):
            if '/>' in lines[j]:
                # Insert new props before />
                indent = ' ' * 36
                new_props = [
                    indent + 'initialAnnotations={generatedContent?.data.annotations}\r',
                    indent + 'onAnnotationsChange={(annotations) => {\r',
                    indent + '    setGeneratedContent(prev => prev ? {\r',
                    indent + '        ...prev,\r',
                    indent + '        data: { ...prev.data, annotations }\r',
                    indent + '    } : prev);\r',
                    indent + '}}\r',
                ]
                lines[j:j] = new_props
                fixed += 1
                print(f"  [OK] FIX 4: Added annotation props at call site L{j+1}")
                break
        break

# Write
content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
