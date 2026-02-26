"""Add set+defineProperty traps to INSTRUCTION_AUDIO and ISOLATION_AUDIO proxies."""
FILE = r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\AlloFlowANTI.txt'

with open(FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

fixes = 0

# Strategy: Find each proxy's closing "});" and insert set+defineProperty traps before it
# We search for the pattern: "  }\n});" preceded by getOwnPropertyDescriptor content

i = 0
while i < len(lines):
    line = lines[i].rstrip('\r\n')
    
    # Look for closing of a proxy that has our getOwnPropertyDescriptor fix
    # Pattern: line ending with "return desc;" followed by "  }" followed by "});"
    if line.strip() == '});':
        # Check if previous line is "  }" (closing getOwnPropertyDescriptor)
        if i > 0 and lines[i-1].strip() == '}':
            # Check if there's already a set trap
            has_set = False
            for j in range(max(0, i-20), i):
                if 'set: function(target, prop, value)' in lines[j]:
                    has_set = True
                    break
            
            if not has_set:
                # Find which cache variable this proxy uses
                cache_var = None
                for j in range(max(0, i-30), i):
                    if '_CACHE_PHONEME_AUDIO_BANK' in lines[j] and 'getOwnPropertyDescriptor' not in lines[j-1] if j > 0 else True:
                        cache_var = '_CACHE_PHONEME_AUDIO_BANK'
                        load_fn = '_LOAD_PHONEME_AUDIO_BANK_RAW'
                        break
                    elif '_CACHE_INSTRUCTION_AUDIO' in lines[j]:
                        cache_var = '_CACHE_INSTRUCTION_AUDIO'
                        load_fn = '_LOAD_INSTRUCTION_AUDIO_RAW'
                        break
                    elif '_CACHE_ISOLATION_AUDIO' in lines[j]:
                        cache_var = '_CACHE_ISOLATION_AUDIO'
                        load_fn = '_LOAD_ISOLATION_AUDIO_RAW'
                        break
                
                if cache_var and cache_var != '_CACHE_PHONEME_AUDIO_BANK':  # PHONEME already fixed
                    # Insert set and defineProperty traps
                    # Replace "  }\n});" with "  },\n  set: ...,\n  defineProperty: ...\n});"
                    trap_code = f"""  }},
  set: function(target, prop, value) {{
    if (!{cache_var}) {cache_var} = {load_fn}();
    {cache_var}[prop] = value;
    return true;
  }},
  defineProperty: function(target, prop, descriptor) {{
    if (!{cache_var}) {cache_var} = {load_fn}();
    Object.defineProperty({cache_var}, prop, descriptor);
    return true;
  }}
}});
"""
                    # Replace lines[i-1] and lines[i] with the new code
                    lines[i-1:i+1] = [trap_code]
                    fixes += 1
                    print(f"Fixed {cache_var} Proxy (inserted at line {i})")
    i += 1

with open(FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f"\nDone! {fixes} additional Proxies fixed")
