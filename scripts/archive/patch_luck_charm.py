"""
Fix: Inject activeRollModifier into adventure dice roll prompts.
The Luck Charm (+5 modifier) currently sets state but the value is never
used in the dice roll calculation or AI prompt.
"""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = 'AlloFlowANTI.txt'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
changes = 0

# ================================================================
# FIX: Inject modifier into BOTH choice and text submission paths
# Pattern: Add modifier calculation after chanceRoll, update prompt
# ================================================================

# The pattern appears twice (choice path ~L46393, text path ~L46701)
old_chance_block = """const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
          const mechanicsInstruction = adventureChanceMode 
            ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}. 
               1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
               2. Calculate Total = ${chanceRoll} (Roll) + Strategy Rating.
               3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
               4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`"""

new_chance_block = """const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
          const rollModifier = adventureState.activeRollModifier || 0;
          const effectiveRoll = chanceRoll ? chanceRoll + rollModifier : null;
          const mechanicsInstruction = adventureChanceMode 
            ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}${rollModifier > 0 ? ` + ${rollModifier} Luck Bonus = ${effectiveRoll}` : ''}. 
               1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
               2. Calculate Total = ${effectiveRoll || chanceRoll} (Roll${rollModifier > 0 ? ' + Luck Bonus' : ''}) + Strategy Rating.
               3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
               4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`"""

# Path 1: Choice submission (10-space indent)
if old_chance_block in content:
    content = content.replace(old_chance_block, new_chance_block, 1)
    changes += 1
    print("1. ✅ Fixed choice submission path: modifier injected into dice roll prompt")
else:
    print("1. ❌ Choice submission path pattern not found")

# Path 2: Text submission (6-space indent) 
old_text_block = """const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
      const mechanicsInstruction = adventureChanceMode 
        ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}. 
           1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
           2. Calculate Total = ${chanceRoll} (Roll) + Strategy Rating.
           3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
           4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`"""

new_text_block = """const chanceRoll = adventureChanceMode ? Math.floor(Math.random() * 20) + 1 : null;
      const rollModifier = adventureState.activeRollModifier || 0;
      const effectiveRoll = chanceRoll ? chanceRoll + rollModifier : null;
      const mechanicsInstruction = adventureChanceMode 
        ? `SYSTEM: CHANCE MODE ACTIVE. Raw D20 Roll: ${chanceRoll}${rollModifier > 0 ? ` + ${rollModifier} Luck Bonus = ${effectiveRoll}` : ''}. 
           1. Analyze the strategy of the action on a scale of 1 (Terrible) to 20 (Genius).
           2. Calculate Total = ${effectiveRoll || chanceRoll} (Roll${rollModifier > 0 ? ' + Luck Bonus' : ''}) + Strategy Rating.
           3. Compare Total against DCs: < 16 (Fail), 16-21 (Partial), 22-27 (Success), 28+ (Critical).
           4. Return "d20": ${chanceRoll} and "total": [Calculated Sum] in the JSON.`"""

if old_text_block in content:
    content = content.replace(old_text_block, new_text_block, 1)
    changes += 1
    print("2. ✅ Fixed text submission path: modifier injected into dice roll prompt")
else:
    print("2. ❌ Text submission path pattern not found")

# Save
content = content.replace('\n', '\r\n')
with open(FILE, 'w', encoding='utf-8', newline='') as f:
    f.write(content)
print(f"\n✨ Total changes: {changes}")
