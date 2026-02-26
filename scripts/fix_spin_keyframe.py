"""Add @keyframes spin by finding the exact spinner content."""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the exact spinner div
target = "border:'3px solid rgba(99,102,241,0.2)',borderTopColor:'#6366f1'"
idx = content.find(target)
if idx < 0:
    print("FAILED: Could not find spinner border style")
    exit(1)

print(f"Found spinner at position {idx}")

# Walk back to find the <div that starts this element
# We want to inject a <style> right before this <div>
search_back = content[max(0,idx-200):idx]
div_pos = search_back.rfind('<div style={{')
if div_pos < 0:
    print("FAILED: Could not find <div before spinner")
    exit(1)

abs_div_pos = max(0, idx-200) + div_pos
print(f"Spinner <div> starts at position {abs_div_pos}")

# Inject style element right before the spinner div
# Using dangerouslySetInnerHTML for a <style> tag
style_tag = "<style dangerouslySetInnerHTML={{__html: `@keyframes spin { to { transform: rotate(360deg) } }`}} />\r\n                  "
content = content[:abs_div_pos] + style_tag + content[abs_div_pos:]

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

# Verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()
has_spin = '@keyframes spin' in v
print(f"SUCCESS: @keyframes spin injected: {has_spin}")
print(f"File size: {len(v):,} bytes")
