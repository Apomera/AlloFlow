"""
Deep dive: Why is the Word Sounds preview card not showing?

The preview card is at line ~60760: {activeView === 'word-sounds' && (...)}
We need to find what PARENT conditionals wrap this section and whether
any of them prevent rendering when activeView is 'word-sounds'.
"""

filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

out = open('ws_debug2.txt', 'w', encoding='utf-8')

# Find the preview card line
target = "activeView === 'word-sounds' && ("
target_line = -1
for i, line in enumerate(lines):
    if target in line and 'space-y-6' in lines[i+1]:
        target_line = i
        break

out.write(f"Preview card found at line {target_line + 1}\n\n")

# Now trace backwards to find the parent conditionals (look for {( patterns)
out.write("=== PARENT CONTEXT (100 lines before preview card) ===\n\n")
start = max(0, target_line - 100)
for j in range(start, target_line + 5):
    line = lines[j].rstrip()
    # Highlight lines with conditionals
    if any(kw in line for kw in ['activeView', 'generatedContent', 'isProcessing', '&&', '? (', ': (']):
        out.write(f">>> {j+1}: {line}\n")
    else:
        out.write(f"    {j+1}: {line}\n")

# Also check: is there a guard like `generatedContent && generatedContent.type !== 'word-sounds'`?
out.write("\n\n=== SEARCH: generatedContent guards near output panel ===\n\n")
for i in range(max(0, target_line - 200), target_line):
    line = lines[i]
    if 'generatedContent' in line and ('type' in line or '&&' in line):
        out.write(f"  {i+1}: {line.rstrip()}\n")

# Check if the preview card is inside a block gated on `generatedContent && !isWordSoundsMode`
# or similar
out.write("\n\n=== SEARCH: isWordSoundsMode near output panel ===\n\n")
for i in range(max(0, target_line - 200), min(len(lines), target_line + 50)):
    line = lines[i]
    if 'isWordSoundsMode' in line:
        out.write(f"  {i+1}: {line.rstrip()}\n")

# Key question: Is the word-sounds card INSIDE a block like:
# {generatedContent && activeView !== 'input' && activeView !== 'analysis' && (
#   ... render output content ...
# )}
# If so, does the condition pass for word-sounds?

out.write("\n\n=== PARENT BLOCK STRUCTURE (wider view) ===\n\n")
# Look for the major JSX conditional block that contains the preview card
# Search backwards for lines with significant indentation changes
for j in range(max(0, target_line - 300), target_line + 5):
    line = lines[j]
    stripped = line.strip()
    # Only show lines that are structural (conditionals, div openings, etc)
    indent = len(line) - len(line.lstrip())
    if indent <= 32 and stripped:  # Less indented = more structural
        out.write(f"  {j+1} (indent {indent}): {stripped[:150]}\n")

out.close()
print(f"Debug output written to ws_debug2.txt")
