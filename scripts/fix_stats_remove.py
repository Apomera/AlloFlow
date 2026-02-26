"""Remove the bad stats block, verify syntax, then skip stats for this batch."""
import re

FILE = r"c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\stem_lab_module.js"

with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

# Find and remove the entire stats block
# Pattern: starts with comma+newline+d.points.length  ends with ...toFixed(2))\n              )\n            )
start_marker = 'd.points.length >= 2 && React.createElement("div", { className: "mt-2 grid grid-cols-3 gap-2" }'
end_marker = 'Std Dev'

start_idx = content.find(start_marker)
if start_idx >= 0:
    # Find the very end of the stats block - after the last closing paren
    end_search = content.find(end_marker, start_idx)
    if end_search >= 0:
        # Find the closing of the entire stats createElement section
        # It ends with )  (three closing parens for div > div > div)
        # Look for the pattern: .toFixed(2))\n              )\n            )
        toFixed_after = content.find('.toFixed(2))', end_search)
        if toFixed_after >= 0:
            # Find the closing of the outer divs
            close_search = toFixed_after + len('.toFixed(2))')
            # Count closing parens - need to close the 3 nested divs and the outer conditional
            depth = 0
            cursor = close_search
            while cursor < len(content) and cursor < close_search + 100:
                if content[cursor] == ')':
                    depth += 1
                    if depth >= 2:  # Close the rest of the createElement chain
                        cursor += 1
                        break
                elif content[cursor] not in ' \t\r\n':
                    break
                cursor += 1
            
            # Now find the start including any leading comma/whitespace
            lead = start_idx
            while lead > 0 and content[lead-1] in ' \t\r\n,':
                lead -= 1
            # Keep the newline that was there before
            if content[lead] in '\r\n':
                lead += 1
            if content[lead] == '\n':
                lead += 1
            
            removed = content[lead:cursor]
            print(f"Removing {len(removed)} chars")
            print(f"First 60: {repr(removed[:60])}")
            print(f"Last 60: {repr(removed[-60:])}")
            
            content = content[:lead] + content[cursor:]
            print("Stats block removed")

with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

# Verify syntax by checking with Node
import subprocess
result = subprocess.run(['node', '-e', 'try{new Function(require("fs").readFileSync("stem_lab_module.js","utf8"));console.log("SYNTAX OK");}catch(e){console.log("ERROR: "+e.message);}'], 
                       capture_output=True, text=True, cwd=r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated', timeout=60)
print(result.stdout.strip())
print("Done!")
