#!/usr/bin/env python3
"""Add 3 new Allobot accessories: hard hat (blueprint), sleep cap (sleeping), lab goggles (STEM)."""
import sys
sys.stdout.reconfigure(encoding='utf-8')

FILE = r'C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

changes = 0

# ====================================================================
# 1. Add SVG accessories after the 'artist' accessory block
# ====================================================================
artist_closing = """{accessory === 'artist' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                <path 
                                    d="M 25 28 Q 15 28 15 20 Q 15 5 45 2 Q 85 -2 90 10 Q 95 22 80 26 Q 70 29 55 27" 
                                    fill="#374151" 
                                    stroke="#1F2937" 
                                    strokeWidth="1.5" 
                                    transform="rotate(-10 50 20)" 
                                />
                                <path 
                                    d="M 58 4 L 62 0" 
                                    stroke="#374151" 
                                    strokeWidth="3" 
                                    strokeLinecap="round" 
                                    transform="rotate(-10 50 20)"
                                />
                            </g>
                        )}"""

new_accessories = """{accessory === 'artist' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                <path 
                                    d="M 25 28 Q 15 28 15 20 Q 15 5 45 2 Q 85 -2 90 10 Q 95 22 80 26 Q 70 29 55 27" 
                                    fill="#374151" 
                                    stroke="#1F2937" 
                                    strokeWidth="1.5" 
                                    transform="rotate(-10 50 20)" 
                                />
                                <path 
                                    d="M 58 4 L 62 0" 
                                    stroke="#374151" 
                                    strokeWidth="3" 
                                    strokeLinecap="round" 
                                    transform="rotate(-10 50 20)"
                                />
                            </g>
                        )}
                        {accessory === 'hard-hat' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                {/* Hard hat dome */}
                                <path d="M25 26 Q25 6 50 4 Q75 6 75 26 Z" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                                {/* Brim */}
                                <path d="M18 26 Q50 32 82 26 Q80 28 50 33 Q20 28 18 26 Z" fill="#D97706" stroke="#B45309" strokeWidth="1" />
                                {/* Ridge line */}
                                <path d="M38 8 Q50 5 62 8" stroke="#FCD34D" strokeWidth="2" fill="none" opacity="0.6" />
                                {/* Headlamp */}
                                <circle cx="50" cy="18" r="5" fill="#374151" stroke="#1F2937" strokeWidth="1" />
                                <circle cx="50" cy="18" r="3" fill="#FEF3C7" opacity="0.9" />
                                {/* Lamp glow */}
                                <circle cx="50" cy="18" r="7" fill="#FEF3C7" opacity="0.15" />
                            </g>
                        )}
                        {accessory === 'sleep-cap' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-700 origin-center">
                                {/* Cap body - drooping nightcap */}
                                <path d="M30 24 Q28 12 40 6 Q55 0 70 10 Q85 22 80 40 Q78 48 74 52" fill="#6366F1" stroke="#4F46E5" strokeWidth="1.5" />
                                {/* Stripes */}
                                <path d="M35 18 Q50 12 65 18" stroke="#818CF8" strokeWidth="2.5" fill="none" opacity="0.5" />
                                <path d="M40 12 Q52 7 64 14" stroke="#818CF8" strokeWidth="2" fill="none" opacity="0.4" />
                                {/* Pompom at tip */}
                                <circle cx="74" cy="52" r="6" fill="#C4B5FD" stroke="#A78BFA" strokeWidth="1" />
                                <circle cx="72" cy="50" r="2" fill="white" opacity="0.4" />
                                {/* Brim fold */}
                                <path d="M28 24 Q50 28 72 22" stroke="#4338CA" strokeWidth="2.5" fill="none" />
                            </g>
                        )}
                        {accessory === 'lab-goggles' && (
                            <g className="animate-in fade-in slide-in-from-top-2 duration-500 origin-center">
                                {/* Strap */}
                                <path d="M20 42 Q15 36 18 30 Q22 24 30 26" stroke="#64748B" strokeWidth="2" fill="none" />
                                <path d="M80 42 Q85 36 82 30 Q78 24 70 26" stroke="#64748B" strokeWidth="2" fill="none" />
                                <path d="M30 26 Q50 22 70 26" stroke="#94A3B8" strokeWidth="3" fill="none" />
                                {/* Left lens */}
                                <ellipse cx="38" cy="38" rx="12" ry="10" fill="rgba(147, 197, 253, 0.25)" stroke="#475569" strokeWidth="2" />
                                <ellipse cx="36" cy="36" rx="4" ry="3" fill="white" opacity="0.3" transform="rotate(-15 36 36)" />
                                {/* Right lens */}
                                <ellipse cx="62" cy="38" rx="12" ry="10" fill="rgba(167, 243, 208, 0.25)" stroke="#475569" strokeWidth="2" />
                                <ellipse cx="60" cy="36" rx="4" ry="3" fill="white" opacity="0.3" transform="rotate(-15 60 36)" />
                                {/* Bridge */}
                                <path d="M50 38 Q50 33 50 38" stroke="#475569" strokeWidth="2.5" />
                                <rect x="47" y="34" width="6" height="4" rx="1" fill="#475569" />
                            </g>
                        )}"""

if artist_closing in content:
    content = content.replace(artist_closing, new_accessories, 1)
    changes += 1
    print("1: Added hard-hat, sleep-cap, lab-goggles SVGs")
else:
    print("1: FAILED - could not find artist accessory block")


# ====================================================================
# 2. Update getBotAccessoryInternal to map views to new accessories
# ====================================================================
old_mapping = """case 'image':
            return 'artist';
        case 'persona':
            return null;
        case 'analysis':
             return null; 
        default:
            return null;"""

new_mapping = """case 'image':
            return 'artist';
        case 'math':
        case 'stem':
            return 'lab-goggles';
        case 'persona':
            return null;
        case 'analysis':
             return null; 
        default:
            return null;"""

if old_mapping in content:
    content = content.replace(old_mapping, new_mapping, 1)
    changes += 1
    print("2: Added lab-goggles mapping for math/stem views")
else:
    print("2: FAILED - could not find view mapping block")


# ====================================================================
# 3. Add isSleeping-aware accessory override
# The AlloBot component receives isSleeping — we need to override
# the accessory to 'sleep-cap' when sleeping.
# Find where botAccessory is passed and add override logic.
# ====================================================================
old_memo = "const botAccessory = useMemo(() => getBotAccessoryInternal(), [activeView, isInteractiveFlashcards]);"
new_memo = """const botAccessoryBase = useMemo(() => getBotAccessoryInternal(), [activeView, isInteractiveFlashcards]);
  const botAccessory = useMemo(() => {
    if (isBlueprintMode) return 'hard-hat';
    return botAccessoryBase;
  }, [botAccessoryBase, isBlueprintMode]);"""

if old_memo in content:
    content = content.replace(old_memo, new_memo, 1)
    changes += 1
    print("3: Added hard-hat override for blueprint mode")
else:
    print("3: FAILED - could not find botAccessory memo line")


# ====================================================================
# 4. Add sleep-cap to the AlloBot component itself
# The AlloBot already has isSleeping — add accessory override inside it
# ====================================================================
# Find where effectiveMood is computed and check for isSleeping
old_sleeping_check = "const base = moodConfig[effectiveMood] || moodConfig.idle;"
# We need to find the accessory usage inside AlloBot and override for sleeping
# Actually, AlloBot receives `accessory` as a prop. The override should happen
# where botAccessory is computed. Let's update our memo to also check for sleep:
# Already done above for blueprint. Now add sleep cap to the AlloBot memo:

# Let's find isSleeping in the AlloBot component to understand prop flow
# The AlloBot receives isSleeping as part of its own internal state

# Actually, the simplest approach: the parent passes botAccessory. Add sleep check there.
# Find where the AlloBot is rendered and check if isSleeping is accessible
old_bot_render_accessory = "accessory={botAccessory}"
# We'll add the sleep-cap logic at the render site
new_bot_render_accessory = 'accessory={alloBotSleeping ? "sleep-cap" : botAccessory}'

# First check if alloBotSleeping exists
if 'alloBotSleeping' in content:
    if old_bot_render_accessory in content:
        content = content.replace(old_bot_render_accessory, new_bot_render_accessory, 1)
        changes += 1
        print("4: Added sleep-cap override at AlloBot render using alloBotSleeping")
    else:
        print("4: FAILED - could not find accessory={botAccessory}")
else:
    # Check what the sleeping variable is called at the render level
    # It might be passed directly. Let's check the AlloBot render for isSleeping
    # The AlloBot component manages its own isSleeping internally
    # So we need to handle sleep-cap INSIDE the AlloBot component
    # The cleanest approach: inside AlloBot, override accessory when sleeping
    
    # Find where accessory is destructured in AlloBot props
    old_accessory_use = """accessory && (
                    <g id="accessories">"""
    new_accessory_use = """(isSleeping ? 'sleep-cap' : accessory) && (
                    <g id="accessories">"""
    
    # Also need to update each accessory check to use the overridden value
    # Actually simpler: just add the sleep-cap check at the top of the accessories section
    # But we need to change the variable. Let's do it differently.
    
    # Inside AlloBot, add a derived variable:
    old_derive = "const base = moodConfig[effectiveMood] || moodConfig.idle;"
    new_derive = """const effectiveAccessory = isSleeping ? 'sleep-cap' : accessory;
      const base = moodConfig[effectiveMood] || moodConfig.idle;"""
    
    if old_derive in content:
        content = content.replace(old_derive, new_derive, 1)
        # Now replace all `accessory ===` with `effectiveAccessory ===` 
        # and `accessory &&` in the accessories section with `effectiveAccessory &&`
        # But we need to be careful to only do this inside the AlloBot component
        
        # Replace the accessories rendering guard
        content = content.replace(
            "{accessory && (\n                    <g id=\"accessories\">",
            "{effectiveAccessory && (\n                    <g id=\"accessories\">",
            1
        )
        
        # Replace each accessory check
        for acc_name in ['grad-cap', 'explorer-hat', 'magnifying-glass', 'artist', 'hard-hat', 'sleep-cap', 'lab-goggles']:
            old_check = f"{{accessory === '{acc_name}'"
            new_check = f"{{effectiveAccessory === '{acc_name}'"
            content = content.replace(old_check, new_check)
        
        changes += 1
        print("4: Added effectiveAccessory with sleep-cap override inside AlloBot")
    else:
        print("4: FAILED - could not find moodConfig line")


# ====================================================================
# 5. Add isBlueprintMode to the useMemo dependency (if not already tracked)
# ====================================================================
# Check if isBlueprintMode exists
if 'isBlueprintMode' not in content:
    # It might be called something else. Let's check for blueprint-related state
    if 'blueprintMode' in content or 'isBlueprint' in content:
        print("5: NOTE - blueprint variable exists with different name, may need manual fix")
    else:
        # Blueprint mode might not exist yet. Add a simple check in the memo instead
        # Use a simpler heuristic: check if activeView is a blueprint-related value
        old_blueprint_memo = """const botAccessoryBase = useMemo(() => getBotAccessoryInternal(), [activeView, isInteractiveFlashcards]);
  const botAccessory = useMemo(() => {
    if (isBlueprintMode) return 'hard-hat';
    return botAccessoryBase;
  }, [botAccessoryBase, isBlueprintMode]);"""
        
        new_blueprint_memo = """const botAccessoryBase = useMemo(() => getBotAccessoryInternal(), [activeView, isInteractiveFlashcards]);
  const botAccessory = botAccessoryBase;"""
        
        # Revert the blueprint check since the variable doesn't exist
        content = content.replace(old_blueprint_memo, new_blueprint_memo, 1)
        print("5: Reverted blueprint check (isBlueprintMode not found), hard-hat will be mapped via view switch")
        
        # Instead, add 'blueprint' to the view switch
        old_switch_default = """case 'analysis':
             return null; 
        default:
            return null;"""
        new_switch_default = """case 'analysis':
             return null;
        case 'blueprint':
        case 'report-blueprint':
            return 'hard-hat';
        default:
            return null;"""
        if old_switch_default in content:
            content = content.replace(old_switch_default, new_switch_default, 1)
            print("5b: Added hard-hat mapping for blueprint views")
else:
    print("5: isBlueprintMode already exists")


# ====================================================================
# SAVE
# ====================================================================
with open(FILE, 'w', encoding='utf-8', newline='\r\n') as f:
    f.write(content)

print(f"\nDone! {changes} changes applied.")
