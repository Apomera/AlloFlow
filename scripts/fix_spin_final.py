"""Fix pre-existing spin animation in send button at L70037."""
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    content = f.read()

old = "animation:'spin 1s linear infinite'"
new = "animation:'pulse 1.5s ease-in-out infinite'"

count = content.count(old)
if count > 0:
    content = content.replace(old, new)
    with open('AlloFlowANTI.txt', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Replaced " + str(count) + " instance(s) of spin animation with pulse")
else:
    print("No spin 1s animation found (already fixed)")

# Final verification
with open('AlloFlowANTI.txt', 'r', encoding='utf-8') as f:
    v = f.read()
print("spin animation remaining: " + str("animation:'spin" in v))
print("animate-spin (Tailwind): " + str("animate-spin" in v))
print("Generation indicator: " + str("Generating your Bridge" in v))
print("File size: " + str(len(v)))
