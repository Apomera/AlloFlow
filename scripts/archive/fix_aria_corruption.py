"""
Fix corrupted arrow functions where aria-label was injected into () => 
Pattern: onClick={() = aria-label="Label">  → onClick={() =>  with aria-label on the <button tag
"""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8-sig') as f:
    content = f.read()

# Pattern: () = aria-label="SomeLabel">  should be () =>
# We need to:
# 1. Remove the injected ` aria-label="..."` from inside the arrow function
# 2. Restore the => 
# 3. Move the aria-label to the <button tag

pattern = re.compile(r'\(\)\s*=\s*aria-label="([^"]+)">')
matches = list(pattern.finditer(content))
print(f"Found {len(matches)} corrupted arrow functions")

# Process in reverse to preserve positions
for m in reversed(matches):
    label = m.group(1)
    # Replace the corrupted part with the correct arrow function
    old = m.group(0)
    new = '() =>'
    
    # Find the start of the line to locate the <button tag
    line_start = content.rfind('\n', 0, m.start()) + 1
    line_end = content.find('\n', m.end())
    full_line = content[line_start:line_end]
    
    # Fix the arrow function
    fixed_line = full_line.replace(old, new, 1)
    
    # Check if this line already has aria-label elsewhere (from correct insertion)
    if fixed_line.count('aria-label') == 0:
        # Add aria-label to the <button tag
        fixed_line = fixed_line.replace('<button ', f'<button aria-label="{label}" ', 1)
    
    content = content[:line_start] + fixed_line + content[line_end:]

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed {len(matches)} corrupted lines")
print("DONE")
