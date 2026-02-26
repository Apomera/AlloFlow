import re
filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'("voices":\s*\{\s*"[^"]*":\s*"[^"]*"\s*\})'
replacement = r'"characters": [ { "name": "Character Name", "role": "Brief description of their role/appearance" } ], \1'

new_content, count = re.subn(pattern, replacement, content)
if count > 0:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'✅ Modified JSON prompt schema ({count} replacements)')
else:
    print('❌ Failed to find prompt schema')
