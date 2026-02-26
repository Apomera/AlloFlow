FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find canPlayBotIntro line dynamically
target = None
for i, line in enumerate(lines):
    if 'canPlayBotIntro, setCanPlayBotIntro' in line:
        target = i
        break

if target is not None:
    # Insert isBotFlying state right after the canPlayBotIntro line
    fly_lines = (
        "  const [isBotFlying, setIsBotFlying] = useState(true);\r\n"
        "  useEffect(() => { const ft = setTimeout(() => setIsBotFlying(false), 2500); return () => clearTimeout(ft); }, []);\r\n"
    )
    lines.insert(target + 1, fly_lines)
    print(f'Added isBotFlying state after L{target + 1}')
else:
    print('ERROR: canPlayBotIntro not found')

# Also find the AlloBot component's isFlying prop handling and add animation
# Search for the bot's wrapper div inside AlloBot component (L10001-10200 area)
for i, line in enumerate(lines):
    if i < 10000 or i > 10900:
        continue
    stripped = line.strip()
    if 'isFlying' in stripped and ('className' in stripped or 'style' in stripped or 'animate' in stripped):
        print(f'FLY RENDER L{i+1}: {stripped[:200]}')

# The AlloBot component already accepts isFlying as a prop (L10001)
# Let me check what it does with isFlying
for i, line in enumerate(lines):
    if i < 10000 or i > 10900:
        continue
    if 'isFlying' in line and 'flying' in line.lower():
        print(f'FLY LOGIC L{i+1}: {line.strip()[:200]}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print('Done!')
