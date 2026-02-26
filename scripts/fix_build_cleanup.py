"""Final cleanup of bridge spinner build errors."""

with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

changes = 0

# 1. Remove fragment opening
old_frag = 'bridgeSending && (<>'
new_frag = 'bridgeSending && ('
if old_frag in content:
    content = content.replace(old_frag, new_frag)
    changes += 1
    print("1. Removed fragment opening")

# 2. Remove stray </> near the spinner
gen_idx = content.find('Generating your Bridge message')
if gen_idx > 0:
    area = content[gen_idx:gen_idx+500]
    if '</>' in area:
        frag_pos = gen_idx + area.find('</>')
        content = content[:frag_pos] + content[frag_pos+3:]
        changes += 1
        print("2. Removed stray </> fragment close")

# 3. Replace spin animation with pulse
old_anim = "animation:'spin 0.8s linear infinite'"
new_anim = "animation:'pulse 1.5s ease-in-out infinite'"
if old_anim in content:
    content = content.replace(old_anim, new_anim)
    changes += 1
    print("3. Changed spin to pulse animation")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done: " + str(changes) + " changes applied")

# Verify
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()
print("Fragment <>: " + str('<>' in v[gen_idx-200:gen_idx+500] if gen_idx > 0 else 'N/A'))
print("spin anim: " + str("'spin " in v))
print("Has spinner: " + str('Generating your Bridge' in v))
