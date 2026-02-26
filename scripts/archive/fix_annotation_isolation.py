"""
Fix annotation isolation + persistence:
1. Add key={generatedContent?.id} to VisualPanelGrid to force remount on resource switch
2. Add setHistory() sync in onAnnotationsChange to persist to history array
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
# FIX 1: Add key prop to VisualPanelGrid for resource isolation
# ============================================================
for i in range(len(lines)):
    if '<VisualPanelGrid' in lines[i] and i > 60000:
        print(f"  Found <VisualPanelGrid at L{i+1}")
        # Check if key already exists
        if 'key=' not in lines[i]:
            # Find the next line (first prop) and add key before it
            for j in range(i+1, min(i+10, len(lines))):
                if 'visualPlan=' in lines[j]:
                    indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                    key_line = indent + 'key={generatedContent?.id || "default"}\r'
                    lines.insert(j, key_line)
                    fixed += 1
                    print(f"  [OK] FIX 1: Added key prop at L{j+1}")
                    break
        break

# ============================================================
# FIX 2: Update onAnnotationsChange to also sync to history
# Replace the simple setGeneratedContent with one that also
# updates the history array
# ============================================================
for i in range(len(lines)):
    if 'onAnnotationsChange={(annotations)' in lines[i] and i > 60000:
        print(f"  Found onAnnotationsChange at L{i+1}")
        # Find the closing of this callback (the "}}" line)
        for j in range(i, min(i+10, len(lines))):
            if '}}' in lines[j] and 'prev' not in lines[j]:
                # This is the closing }}
                # Insert history sync before closing
                indent = lines[j][:len(lines[j]) - len(lines[j].lstrip())]
                inner_indent = indent + '    '
                sync_lines = [
                    inner_indent + '// Also sync to history array for persistence\r',
                    inner_indent + 'setHistory(prev => prev.map(item =>\r',
                    inner_indent + '    item.id === generatedContent?.id\r',
                    inner_indent + '        ? { ...item, data: { ...item.data, annotations } }\r',
                    inner_indent + '        : item\r',
                    inner_indent + '));\r',
                ]
                lines[j:j] = sync_lines
                fixed += 1
                print(f"  [OK] FIX 2: Added history sync at L{j+1}")
                break
        break

content = '\n'.join(lines)
new_count = len(content.split('\n'))
diff = new_count - original_count
print(f"\nLine count: {original_count} -> {new_count} (diff: {diff:+d})")

with open(filepath, 'wb') as f:
    f.write(content.encode('utf-8'))
print(f"\nDone! {fixed} fixes applied.")
