filepath = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Add pendingChoice: null after every "currentScene: data.scene," in AlloFlowANTI.txt
old = "currentScene: data.scene,"
new = "currentScene: data.scene, pendingChoice: null,"
count = content.count(old)
content = content.replace(old, new)
print(f"Added pendingChoice: null at {count} locations")

# Also clear it when isLoading is set to false on errors
old_err = "isLoading: false,"
# Only add pendingChoice: null if it's not already right after
content_fixed = content.replace("isLoading: false, pendingChoice: null,", "isLoading: false, pendingChoice: null,")  # no-op, just to check
# Actually let's be more targeted - only add to the adventure error handlers
# The simplest approach: clear pendingChoice whenever isLoading becomes false in adventure context
# But that's risky since isLoading is used elsewhere. Let's just target the scene updates.

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
