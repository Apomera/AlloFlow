import re
from pathlib import Path

index_path = Path(r'c:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated\index.html')
content = index_path.read_text(encoding='utf-8')

# The current structure:
# <div class="grid-2">
#   <div class="card" ... > ... </div>
#   <style> ... </style>
#   <div id="slider-container"> ... </div>
# </div>

parts = content.split('<!-- Integrated Architecture Slider -->')
if len(parts) == 2:
    # Close the grid-2 div right after the audio card
    parts[0] = parts[0] + '</div>\n\n                    <!-- Integrated Architecture Slider -->\n<div style="margin-top: 4rem; display: flex; justify-content: center;">\n'
    
    # In parts[1], we need to remove the closing </div> that originally closed grid-2.
    # The slider ends with </script>\n    </div>
    m = re.search(r'(</script>\s*</div>)', parts[1], re.DOTALL)
    if m:
        slider_end_idx = m.end()
        remainder = parts[1][slider_end_idx:]
        # Remove the first </div> which was originally closing grid-2
        remainder = remainder.replace('</div>', '', 1)
        
        new_content = parts[0] + parts[1][:slider_end_idx] + '\n</div>' + remainder
        index_path.write_text(new_content, encoding='utf-8')
        print('✅ Fixed layout')
    else:
        print('❌ Could not find slider end')
else:
    print('❌ Could not find split point')
