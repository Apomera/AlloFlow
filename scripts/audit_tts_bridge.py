"""
Critical investigation: Why do audio bridge declarations break word TTS?
Check if these constants are passed as PROPS from the parent component.
"""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\word_sounds_module.js"
with open(FILE, 'r', encoding='utf-8', errors='replace') as f:
    c = f.read()

# 1. Find component props destructuring
print("=== COMPONENT PROPS ===")
idx = c.find("window.AlloModules.WordSoundsModal")
if idx > 0:
    # Get the props destructuring - from ({ to })
    props_start = c.find("({", idx)
    if props_start > 0:
        # Find matching })
        depth = 0
        props_end = props_start
        for i in range(props_start, min(props_start + 5000, len(c))):
            if c[i] == '{': depth += 1
            elif c[i] == '}':
                depth -= 1
                if depth == 0:
                    props_end = i + 1
                    break
        props = c[props_start:props_end]
        print(f"  Props at char {props_start} ({len(props)} chars)")
        
        # Check if audio constants are props
        for name in ['INSTRUCTION_AUDIO', 'ISOLATION_AUDIO', 'PHONEME_AUDIO_BANK',
                      'handleAudio', 'callTTS', 'speakWord', 'playInstructions']:
            if name in props:
                print(f"  ✓ {name} IS a prop")
            else:
                print(f"  ✗ {name} is NOT a prop")

# 2. Check if handleAudio is defined INSIDE the component or outside
print("\n=== handleAudio LOCATION ===")
component_start = c.find("window.AlloModules.WordSoundsModal")
ha_idx = c.find("const handleAudio", component_start)
if ha_idx > 0:
    line = c[:ha_idx].count('\n') + 1
    print(f"  handleAudio defined at L{line} (char {ha_idx})")
    print(f"  Inside component: {ha_idx > component_start}")
    # Show the function signature
    sig_end = c.find('{', ha_idx)
    if sig_end > 0:
        print(f"  Signature: {c[ha_idx:sig_end+1][:200]}")

# 3. Check what handleAudio's useCallback depends on
print("\n=== handleAudio DEPENDENCIES ===")
ha_end = c.find("], [", ha_idx)
if ha_end < 0:
    ha_end = c.find("), [", ha_idx)
if ha_end > 0:
    deps_end = c.find("])", ha_end)
    deps = c[ha_end:deps_end+2]
    print(f"  Deps: {deps[:300]}")

# 4. Check if callTTS is a prop or defined in module
print("\n=== callTTS ===")
for name in ['callTTS', 'speakWord']:
    if name in c:
        # Check if it's a prop
        is_prop = name in c[props_start:props_end] if props_start > 0 else False
        # Check if it's defined in the IIFE (before component)
        is_iife = c.find(f'const {name}', 0, component_start) > 0 or c.find(f'function {name}', 0, component_start) > 0
        # Check if it's defined inside the component
        is_component = c.find(f'const {name}', component_start) > 0
        print(f"  {name}: prop={is_prop}, iife_def={is_iife}, component_def={is_component}, total_refs={c.count(name)}")

# 5. THE KEY CHECK: What's the FIRST thing handleAudio does?
print("\n=== handleAudio BODY (first 500 chars) ===")
if ha_idx > 0:
    body_start = c.find('{', ha_idx)
    print(c[body_start:body_start+500])

print("\n=== DONE ===")
