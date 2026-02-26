filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add transition sound at the start of the pendingAdventureUpdate handler
old = "      const data = pendingAdventureUpdate;\n      setAdventureState(prev => {"
new = "      const data = pendingAdventureUpdate;\n      playAdventureEventSound('transition');\n      setAdventureState(prev => {"

# Try with \r\n 
old_crlf = "      const data = pendingAdventureUpdate;\r\n      setAdventureState(prev => {"
new_crlf = "      const data = pendingAdventureUpdate;\r\n      playAdventureEventSound('transition');\r\n      setAdventureState(prev => {"

if old_crlf in content:
    content = content.replace(old_crlf, new_crlf, 1)
    print("Added transition sound to pendingAdventureUpdate handler")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
elif old in content:
    content = content.replace(old, new, 1)
    print("Added transition sound (LF)")
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
else:
    print("Pattern not found")
