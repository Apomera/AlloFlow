"""Fix rhyming audio key from 'rhyming' to 'inst_rhyming'"""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    c = f.read()

old = """INSTRUCTION_AUDIO['rhyming']) {
                    // Play instruction audio then chain target word
                    await handleAudio(INSTRUCTION_AUDIO['rhyming']);"""

new = """INSTRUCTION_AUDIO['inst_rhyming']) {
                    // Play pre-recorded "Which word rhymes with..." then chain target word
                    await handleAudio(INSTRUCTION_AUDIO['inst_rhyming']);"""

if old in c:
    c = c.replace(old, new)
    print("Fixed rhyming key to inst_rhyming")
else:
    print("WARNING: rhyming key block not found (may already be fixed)")

with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
    f.write(c)
print("Saved")
