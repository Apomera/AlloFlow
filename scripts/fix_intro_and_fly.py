FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# ===== FIX 1: Add 2s delay back to intro speak() call =====
# Current L10458-10466 fires speak() immediately. Add a setTimeout wrapper.
# L10461: introFiredGlobal = true; window.__introFiredAt = Date.now();
# L10462: speak(t('bot_events.intro_greeting'));
# L10463: setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 1500);
# L10464: if (onBotIntroSeen) onBotIntroSeen();
# L10465: }

for i in range(10457, 10470):
    if 'introFiredGlobal = true; window.__introFiredAt' in lines[i]:
        # Replace the block: wrap speak in a setTimeout
        old_block = lines[i]
        old_speak = lines[i+1]
        old_anim = lines[i+2]
        old_seen = lines[i+3]
        old_close = lines[i+4]
        
        new_block = (
            "        introFiredGlobal = true; window.__introFiredAt = Date.now();\r\n"
            "        setTimeout(() => {\r\n"
            "          if (!isMountedRef || (isMountedRef && isMountedRef.current !== false)) {\r\n"
            "            speak(t('bot_events.intro_greeting'));\r\n"
            "            setIdleAnimation('wave-hello'); setTimeout(() => setIdleAnimation(null), 2500);\r\n"
            "          }\r\n"
            "        }, 2000);\r\n"
            "        if (onBotIntroSeen) onBotIntroSeen();\r\n"
            "      }\r\n"
        )
        
        lines[i:i+5] = [new_block]
        changes += 1
        print(f'Fix 1 applied: Intro speak() wrapped in 2s setTimeout at L{i+1}')
        break

# ===== FIX 2: Add isFlying prop to AlloBot and fly-in animation =====
# Add isFlying state near canPlayBotIntro (L24585)
for i in range(24584, 24590):
    if 'const [canPlayBotIntro, setCanPlayBotIntro]' in lines[i]:
        # Add isFlying state right after
        fly_state = (
            "  const [isBotFlying, setIsBotFlying] = useState(false);\r\n"
            "  useEffect(() => {\r\n"
            "    if (!hasSeenBotIntro) {\r\n"
            "      setIsBotFlying(true);\r\n"
            "      const flyTimer = setTimeout(() => setIsBotFlying(false), 2500);\r\n"
            "      return () => clearTimeout(flyTimer);\r\n"
            "    }\r\n"
            "  }, []);\r\n"
        )
        lines.insert(i + 1, fly_state)
        changes += 1
        print(f'Fix 2a applied: Added isBotFlying state after L{i+1}')
        break

# Pass isFlying prop to AlloBot component
for i in range(len(lines)):
    if 'isFlying={isFlying}' in lines[i]:
        # Already has isFlying prop - replace with our state
        lines[i] = lines[i].replace('isFlying={isFlying}', 'isFlying={isBotFlying}')
        changes += 1
        print(f'Fix 2b applied: Updated isFlying prop at L{i+1}')
        break
    elif '<AlloBot' in lines[i] and 'ref={alloBotRef}' in lines[i+1] if i+1 < len(lines) else False:
        # Found AlloBot JSX - need to add isFlying prop
        # Find where the props end
        for j in range(i+1, min(i+30, len(lines))):
            if 'onBotIntroSeen={' in lines[j]:
                # Add isFlying right after this line
                lines.insert(j+1, "            isFlying={isBotFlying}\r\n")
                changes += 1
                print(f'Fix 2b applied: Added isFlying prop after L{j+1}')
                break
        break

# ===== FIX 3: Add fly animation CSS keyframes =====
# Find existing CSS keyframes section and add fly animation
# Search for @keyframes in the file
added_css = False
for i in range(len(lines)):
    if '@keyframes' in lines[i] and 'wave-hello' in lines[i]:
        # We found a keyframes definition - add fly animation nearby
        # Actually let's add it in the AlloBot component's style section
        break

# Better approach: Add fly animation to the AlloBot component itself
# Find where AlloBot renders its main wrapper div and add the animation style
# Search for the bot's positioned wrapper inside AlloBot component
for i in range(10000, 10200):
    if 'fixed bottom' in lines[i] and 'z-[' in lines[i] and ('allobot' in lines[i].lower() or 'bot-container' in lines[i].lower()):
        print(f'BOT CONTAINER L{i+1}: {lines[i].strip()[:120]}')
        break

# The fly animation should be on the bot's main container:
# It should transition from bottom-left to wherever it normally sits.
# Since the bot positioning is likely in the AlloBot component, 
# let's check AlloBot's render for the main wrapper with fixed positioning
for i in range(10100, 10250):
    stripped = lines[i].strip()
    if ('fixed' in stripped and 'bottom' in stripped and 'right' in stripped) or \
       ('position' in stripped and 'fixed' in stripped):
        print(f'FIXED L{i+1}: {stripped[:200]}')

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal changes: {changes}')
