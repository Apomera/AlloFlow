filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old = """(generatedContent?.data || '').split(/\n{2,}/); return ps.flatMap"""
new = """(generatedContent?.data || '').split(new RegExp('\\n{2,}')); return ps.flatMap"""

if old in content:
    content = content.replace(old, new, 1)
    # Also join the lines
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed: replaced regex literal with new RegExp() to avoid line-split issue")
else:
    # The split may have already caused the regex to break across lines differently
    # Try finding by parts
    lines = content.split('\n')
    for i in range(62310, min(len(lines), 62320)):
        print(f"  Line {i+1}: {lines[i].rstrip()[:150]}")
    
    # Try joining lines 62313 and 62314
    if len(lines) > 62313:
        combined = lines[62312].rstrip() + lines[62313].lstrip()
        if '.split(/' in combined:
            # Replace the two lines with the fixed version
            lines[62312] = lines[62312].rstrip('\r\n').rstrip() + ' ' + lines[62313].lstrip()
            # Fix the regex
            lines[62312] = lines[62312].replace(".split(/\n{2,}/)", ".split(new RegExp('\\\\n{2,}'))")
            lines.pop(62313)
            content = '\n'.join(lines)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Fixed by joining lines and replacing regex")
        else:
            print("Could not find the pattern to fix")
