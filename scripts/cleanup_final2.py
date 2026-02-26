"""Clean remaining WS-DBG references"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove review panel diagnostic
old1 = 'console.error("[WS-DBG] Review panel: showing, words=" + preloadedWords?.length);'
new1 = '// Review panel showing'
content = content.replace(old1, new1, 1)

# Clean ErrorBoundary tag  
old2 = '[WS-DBG] ErrorBoundary CAUGHT:'
new2 = 'ErrorBoundary CAUGHT:'
content = content.replace(old2, new2)

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)
print("Cleaned remaining WS-DBG refs")
