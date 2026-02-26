"""
Fix 1: Move onBotIntroSeen() inside the setTimeout, after speak()
Fix 2: Add useEffect in AlloBot to trigger flyTo() when isFlying prop becomes true
"""
FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt"

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

changes = 0

# ===== FIX 1: Move onBotIntroSeen inside setTimeout =====
# Current structure (L10458-10478):
#   setTimeout(() => {
#     speak(t('bot_events.intro_greeting'));
#     setIdleAnimation('wave-hello'); ...
#   }, 2000);
#   if (onBotIntroSeen) onBotIntroSeen();  <-- THIS IS OUTSIDE, MUST MOVE INSIDE
#
# Find the line with onBotIntroSeen that's outside the setTimeout
for i in range(10460, 10480):
    if i < len(lines) and 'if (onBotIntroSeen) onBotIntroSeen();' in lines[i]:
        # Check if this is AFTER the setTimeout closing
        # The setTimeout should close with }, 2000); above this line
        for j in range(i-3, i):
            if '}, 2000);' in lines[j] or '}, 5000);' in lines[j]:
                # Found the pattern: onBotIntroSeen is AFTER setTimeout
                # Remove it from here
                old_line = lines[i]
                lines[i] = '\r\n'  # Replace with empty line
                print(f'Fix 1a: Removed onBotIntroSeen from L{i+1}')
                
                # Now insert it INSIDE the setTimeout, after speak()
                for k in range(i-10, i):
                    if "speak(t('bot_events.intro_greeting'));" in lines[k]:
                        # Add onBotIntroSeen after the animation line
                        for m in range(k+1, k+5):
                            if 'setIdleAnimation' in lines[m]:
                                lines[m] = lines[m].rstrip('\r\n') + '\r\n            if (onBotIntroSeen) onBotIntroSeen();\r\n'
                                changes += 1
                                print(f'Fix 1b: Added onBotIntroSeen inside setTimeout after L{m+1}')
                                break
                        break
                break
        break

# ===== FIX 2: Add useEffect for flyTo when isFlying prop becomes true =====
# Find a good insertion point inside AlloBot - after isFlightActive (L10100)
for i in range(10098, 10110):
    if 'isFlightActive' in lines[i] and 'isFlying' in lines[i]:
        # Insert a useEffect right after this line
        fly_effect = (
            "  useEffect(() => {\r\n"
            "    if (isFlying && !isSleeping) {\r\n"
            "      // Fly from bottom-left to resting position over 2s\r\n"
            "      const startX = 5;\r\n"
            "      const startY = 90;\r\n"
            "      const endX = position.x || 24;\r\n"
            "      const endY = position.y || 20;\r\n"
            "      setPosition({ x: startX, y: startY });\r\n"
            "      setLocalIsFlying(true);\r\n"
            "      setMoveDuration(2000);\r\n"
            "      const flyTimer = setTimeout(() => {\r\n"
            "        setPosition({ x: endX, y: endY });\r\n"
            "        setTimeout(() => {\r\n"
            "          setLocalIsFlying(false);\r\n"
            "          setIsLanding(true);\r\n"
            "          setTimeout(() => setIsLanding(false), 600);\r\n"
            "        }, 2000);\r\n"
            "      }, 100);\r\n"
            "      return () => clearTimeout(flyTimer);\r\n"
            "    }\r\n"
            "  }, [isFlying]);\r\n"
        )
        lines.insert(i + 1, fly_effect)
        changes += 1
        print(f'Fix 2: Added flyTo useEffect after L{i+1}')
        break

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'\nTotal changes: {changes}')
